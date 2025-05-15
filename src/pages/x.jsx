import React, { useState, useContext } from 'react';
import send from '../img/send.png';
import { AuthContext } from '../context/AuthContext';
import { ChatContext } from '../context/ChatContext';
import { arrayUnion, doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { v4 as uuid } from "uuid";
import { GoogleGenerativeAI } from "@google/generative-ai";
import vocabData from '../data/vocab.json';
import grammarData from '../data/grammar.json';
import scenarioData from '../data/scenario.json';

// Initialize Gemini API
const genAI = new GoogleGenerativeAI("AIzaSyACJx9vVjh2rQsdwbyuGBOCOp98-d30eSQ");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Helper function to convert numeric level to alphabetic
const getLevelLetter = (userLevel) => {
  switch (userLevel) {
    case 0: return 'X';  // Numeric level 0 corresponds to 'X'
    case 1: return 'C';  // Numeric level 1 corresponds to 'C'
    case 2: return 'B';  // Numeric level 2 corresponds to 'B'
    case 3: return 'A';  // Numeric level 3 corresponds to 'A'
    default: return 'X'; // Default to 'X' if something goes wrong
  }
};

const Input = () => {
  const [text, setText] = useState("");
  const { currentUser } = useContext(AuthContext);
  const { data } = useContext(ChatContext);
  // Check if currentUser is loaded
  if (!currentUser) {
    console.error("User data is not loaded yet.");
    return null; // Return early or render loading state
  }
  const createSessionInfo = async (sessionUID, numLevel = currentUser.level) => {
    const sessionRef = doc(db, "sessionInfo", sessionUID);
    const d = new Date();
    const userLevel = getLevelLetter(numLevel);
    console.error("num Level:", numLevel);
    try {
      // Ensure there are scenarios for this level, and select one
      
      console.error("user level:", userLevel);
      
      // 1. Extract level-specific data
      const levelVocab = vocabData[userLevel] || [];
      const grammarLevels = Object.keys(grammarData).sort();
  
      // Filter scenarios by user level
      const scenarioList = scenarioData.filter(scenario => scenario.level === userLevel);
    
      // 2. Random selection function
      const getRandom = (arr, count) => 
        [...arr].sort(() => 0.5 - Math.random()).slice(0, count);
  
      const vocabList = getRandom(levelVocab, 3);
  
      // Get first available grammar rule from lowest level <= user level
      let grammar = "";
      for (const level of grammarLevels) {
        if (level <= userLevel && grammarData[level]?.length > 0) {
          grammar = grammarData[level][0];
          break;
        }
      }
  
      const scenario = getRandom(scenarioList, 1)[0];
  
      // 3. Generate topic with Gemini
      const topicPrompt = `
        Vocabulary: ${vocabList.join(", ")}
        Grammar: ${grammar}
        Scenario: ${scenario.name}
        Generate a one-sentence opinion or writing topic based on the information above.
      `;
      const result = await model.generateContent(topicPrompt);
      const topic = result.response.text();
    
      // 4. Create the session object
      const session = {
        sessionID: sessionUID,
        VocabularyList: vocabList,
        Grammar: grammar,
        scenario: scenario.name, // Store the scenario name
        topic,
        Summaries: "",
        status: "incomplete",
        date: d,
      };
  
      // Check for undefined properties
      Object.keys(session).forEach(key => {
        if (session[key] === undefined) {
          console.error(`Undefined value found for key: ${key}`);
        }
      });
  
      // 5. Save the session info 
      await updateDoc(sessionRef, {
        sessions: arrayUnion(session), 
      });
  
    } catch (error) {
      console.error("Error creating session info:", error);
    }
  };
  
  

  const addSummaryToSession = async (sessionUID, summary) => {
    const userRef = doc(db, "users", currentUser.uid);
    
    // Retrieve the current user document
    const userDocSnap = await getDoc(userRef);
    const userData = userDocSnap.data();
  
    if (userData && userData.sessions) {
      // Find the session by sessionUID and update it
      const updatedSessions = userData.sessions.map(session => {
        if (session.sessionid === sessionUID) {
          return { ...session, Summaries: summary }; // Update the session summary
        }
        return session;
      });
  
      // Update the sessions array with the modified session
      await updateDoc(userRef, {
        sessions: updatedSessions,
      });
    }
  };
  
  const getCurrentSessionSummary = async (sessionUID) => {
    const userRef = doc(db, "users", currentUser.uid);
    const userDocSnap = await getDoc(userRef);
    const userData = userDocSnap.data();
  
    if (userData && userData.sessions) {
      // Find the session by sessionUID
      const session = userData.sessions.find(session => session.sessionid === sessionUID);
      return session ? session.Summaries : "";
    }
    return "";
  };

  const handleSend = async () => {
    if (text.trim() === "") return;

    const now = new Date();
    let sessionUID;
    let isNewSession = false;

    try {
      const chatSnap = await getDoc(doc(db, "chats", data.chatId));
      const chatData = chatSnap.data();
      const messages = chatData?.messages || [];

      if (messages.length === 0) {
        sessionUID = uuid();
        isNewSession = true;
      } else {
        const lastMsg = messages[messages.length - 1];
        const lastTime = lastMsg.date?.toDate ? lastMsg.date.toDate() : new Date(lastMsg.date);
        const minutesDiff = (now - lastTime) / (1000 * 60);

        if (minutesDiff > 1) {
          sessionUID = uuid();
          isNewSession = true;
        } else {
          sessionUID = lastMsg.sessionUID || uuid();
        }
      }

      if (isNewSession) {
        await createSessionInfo(sessionUID);
      }

      // Save user message
      const userMsg = {
        id: uuid(),
        text,
        senderId: currentUser.uid,
        date: now,
        sessionUID,
      };

      await updateDoc(doc(db, "chats", data.chatId), {
        messages: arrayUnion(userMsg),
      });

      await updateDoc(doc(db, "userChats", currentUser.uid), {
        [`${data.chatId}.lastMessage`]: { text },
        [`${data.chatId}.date`]: now,
      });

      // AI response
      // Load the 3 rule files
      const [mainRes, sumRes, sessionRes] = await Promise.all([
        fetch('/mainRules.txt'),
        fetch('/sumRules.txt'),
        fetch('/sessionRules.txt'),
      ]);

      const [mainRules, sumRules, sessionRules] = await Promise.all([
        mainRes.text(),
        sumRes.text(),
        sessionRes.text(),
      ]);
      const combineText = `
      ${mainRules}
      ${sessionRules}
      answer following user text in respect to above rules:
      User: ${text}
      `;
      const result = await model.generateContent(combineText);
      const aiResponse = result.response.text();
      const otherUserId = data.chatId.replace(currentUser.uid, "");
      const aiMsg = {
        id: uuid(),
        text: aiResponse,
        senderId: otherUserId,
        date: now,
        sessionUID,
      };

      await updateDoc(doc(db, "chats", data.chatId), {
        messages: arrayUnion(aiMsg),
      });
      
      await updateDoc(doc(db, "userChats", otherUserId), {
        [`${data.chatId}.lastMessage`]: { text: aiResponse },
        [`${data.chatId}.date`]: now,
      });

    // Get the current session summary
    const currentSummary = await getCurrentSessionSummary(sessionUID);
        // Construct the full summary prompt
    const summaryPrompt = `
    ${sumRules}
    Summarize based on the instructions from this point on:
    current summary: ${currentSummary}
    User: ${text}
    Bot: ${aiResponse}
    `;
    // Send prompt to Gemini and get summary
    const summaryResult = await model.generateContent(summaryPrompt);
    const summary = summaryResult.response.text();
    // Save summary to sessionInfo
    await addSummaryToSession(sessionUID, summary);


    } catch (err) {
      console.error("Send failed:", err);
    } finally {
      setText("");
    }
  };

  const handleKey = (e) => {
    if (e.code === "Enter" && text.trim() !== "") {
      handleSend();
    }
  };

  return (
    <div className='inputtext'>
      <input
        type="text"
        placeholder='type message ...'
        onKeyDown={handleKey}
        onChange={(e) => setText(e.target.value)}
        value={text}
      />
      <div className='send'>
        <img onClick={handleSend} className="sendIcon" src={send} alt="send" />
      </div>
    </div>
  );
};

export default Input;
