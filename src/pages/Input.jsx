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
const genAI = new GoogleGenerativeAI("AIzaSyDWpFANtQ8o83LJg2kN2N_jyzAsuCHDxEc");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const speakText = (text) => {
  if (!window.speechSynthesis) return;

  window.speechSynthesis.cancel();

  const sentences = text.match(/[^.!?]+[.!?]+[\])'"`’”]*|.+/g); // split by sentence
  if (!sentences) return;

  const speakNext = (index) => {
    if (index >= sentences.length) return;

    const utterance = new SpeechSynthesisUtterance(sentences[index].trim());
    utterance.lang = 'de';
    utterance.pitch = 1;
    utterance.rate = 0.95;
    utterance.volume = 1;

    utterance.onend = () => {
      speakNext(index + 1); // speak next sentence
    };

    window.speechSynthesis.speak(utterance);
  };

  speakNext(0);
};

const Input = () => {
  const [text, setText] = useState("");
  const { currentUser } = useContext(AuthContext);
  const { data } = useContext(ChatContext);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  // Check if currentUser is loaded
  if (!currentUser) {
    console.error("User data is not loaded yet.");
    return null; // Return early or render loading state
  }
  const createSessionInfo = async (sessionUID, userLevel = currentUser.level) => {
    const sessionRef = doc(db, "sessionInfo", currentUser.uid);
    const progressRef = doc(db, "userProgress", currentUser.uid); 
    const d = new Date();
    try {
      const progressSnap = await getDoc(progressRef);
      const progressData = progressSnap.exists() ? progressSnap.data() : {
        vocabList: [],
        grammarList: [],
        scenarioList: [],
        topicList: []
      };
      // 1. Extract level-specific data
      const levelVocab = vocabData.filter(v => v.level === userLevel);
      const grammarLevels = Object.keys(grammarData).sort();
  
      // Filter scenarios by user level
      const scenarioList = scenarioData.filter(scenario => scenario.level === userLevel);
      
      const getRandom = (arr, n) => {
        const shuffled = [...arr].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, n);
      };
      // Filter out previously used vocab
      const usedVocabList = Array.isArray(progressData.vocabList) ? progressData.vocabList : [];
      const unusedVocab = levelVocab.filter(v => !usedVocabList.includes(v));
      const vocabList = unusedVocab.length >= 3
        ? getRandom(unusedVocab, 3)
        : getRandom(levelVocab, 3); // fallback to reuse

      // Pick new grammar
      let grammar = "";

      // Ensure grammarData[userLevel] exists and is an array
      if (grammarData[userLevel]) {
        // Sort grammar list by UID if not already sorted
        const sortedGrammarList = [...grammarData[userLevel]].sort((a, b) => a.uid - b.uid);

        // Loop through the sorted grammar list
        for (const g of sortedGrammarList) {
          // Check if grammar UID is not in progressData.grammarList
          const usedGrammarList = Array.isArray(progressData.grammarList) ? progressData.grammarList : [];
          if (!usedGrammarList.includes(g.uid)) {
            grammar = g;
            break;
          }
        }
      

            // Fallback: if all grammars already taught, pick a random one
      if (!grammar && sortedGrammarList.length > 0) {
        const randomIndex = Math.floor(Math.random() * sortedGrammarList.length);
        grammar = sortedGrammarList[randomIndex];
      }
    }
      // Get 1 random scenario
      const scenario = getRandom(scenarioList, 1)[0];
        
      // 3. Generate topic with Gemini
      const topicPrompt = `
        Vocabulary: ${vocabList.join(", ")}
        Grammar: ${grammar}
        Scenario: ${scenario.name} - ${scenario.description}
        Generate a one-sentence statement or general question and ask user's opponion.
         you statement or question should be just one or two short sentence(s). 
        ask user to respond in 200 to 300 words.you may choice topic related to senario
         or something that help user to practice gramer and words he learned while respond to you. 
      `;
      const result = await model.generateContent(topicPrompt);
      const topic = result.response.text().trim();

      const sessionMaterial= `
        -Session Material:
        - Vocabulary: ${vocabList.map(v => v.word).join(", ")}
        - Grammar: ${grammar.topic} - ${grammar.explanation}
        - Scenario: ${scenario.name} - ${scenario.description}
        - Topic: ${topic.trim()}
        `;
      // 4. Create the session object
      const session = {
        sessionID: sessionUID,
        VocabList: vocabList.map(v => v.word),
        Grammar: grammar,
        scenario:`${scenario.name}: ${scenario.description}`,
        topic,
        Summaries: sessionMaterial,
        status: "incomplete",
        date: d,
      };
  
   
      // 5. Save the session info 
      const docSnap = await getDoc(sessionRef);
      if (!docSnap.exists()) {
        await setDoc(sessionRef, { sessions: [session] });  // Create with first session
      } else {
        await updateDoc(sessionRef, {
          sessions: arrayUnion(session)
        });
        await updateDoc(progressRef, {
          vocabList: arrayUnion(...vocabList.map(v => v.word)),
          grammarList: arrayUnion(grammar.topic),
          scenarioList: arrayUnion(scenario.name),
          topicList: arrayUnion(topic),
        });
      }
  
    } catch (error) {
      console.error("Error creating session info:", error);
    }
  };
  
  

  const addSummaryToSession = async (sessionUID, summary) => {
    const userRef = doc(db, "sessionInfo", currentUser.uid);
    
    // Retrieve the current user document
    const userDocSnap = await getDoc(userRef);
    const userData = userDocSnap.data();
  
    if (userData && userData.sessions) {
      // Find the session by sessionUID and update it
      const updatedSessions = userData.sessions.map(session => {
        if (session.sessionID === sessionUID) {
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

  
    // Update user profile field
  const updateUserProfile = async (currentUser, text) => {
    if (!currentUser || !currentUser.uid) {
      console.error("No user is logged in.");
      return;
    }

    const userRef = doc(db, "users", currentUser.uid);

    try {
      await updateDoc(userRef, {
        profile: text,
      });
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };


  const getCurrentSessionSummary = async (sessionUID) => {
    const userRef = doc(db, "sessionInfo", currentUser.uid);
    const userDocSnap = await getDoc(userRef);
    const userData = userDocSnap.data();
  
    if (userData && userData.sessions) {
      // Find the session by sessionUID
      const session = userData.sessions.find(session => session.sessionID === sessionUID);
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

      const sessionInfoSnap = await getDoc(doc(db, "sessionInfo", currentUser.uid));
      const sessionInfoData = sessionInfoSnap.exists() ? sessionInfoSnap.data() : { sessions: [] };
      
      if (messages.length === 0 || sessionInfoData.sessions.length === 0)  {
        sessionUID = uuid();
        isNewSession = true;
      } else {
        const lastMsg = messages[messages.length - 1];
        const lastTime = lastMsg.date?.toDate ? lastMsg.date.toDate() : new Date(lastMsg.date);
        const minutesDiff = (now - lastTime) / (1000 * 60);
        
        if (minutesDiff > 20) {
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
      setText("");
      await updateDoc(doc(db, "chats", data.chatId), {
        messages: arrayUnion(userMsg),
      });

      await updateDoc(doc(db, "userChats", currentUser.uid), {
        [`${data.chatId}.lastMessage`]: { text },
        [`${data.chatId}.date`]: now,
      });

      // AI response
      // Load the rule files
      const [mainRes, sumRes, sessionRes,sessionTemp, profileRes,profileTemp] = await Promise.all([
        fetch('/mainRules.txt'),
        fetch('/sumRules.txt'),
        fetch('/sessionRules.txt'),
        fetch('/sessionTemplate.txt'),
        fetch('/profileRules.txt'),
        fetch('/profileTemplate.txt')
      ]);

      const [mainRules, sumRules, sessionRules, SessionSumTemp, profileRules, profileSumTemp] = await Promise.all([
        mainRes.text(),
        sumRes.text(),
        sessionRes.text(),
        sessionTemp.text(),
        profileRes.text(),
        profileTemp.text()
      ]);
      
      // Fetch the current user's profile from Firestore
      const userRef = doc(db, "users", currentUser.uid);
      const userDocSnap = await getDoc(userRef);
      const userData = userDocSnap.data();

      const userProfile = userData.profile;

      const aiMessages = messages.filter(msg => msg.senderId !== currentUser.uid)
      .sort((a, b) => {
        const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
        const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
        return dateB - dateA;
      });
      const lastAiMessage = aiMessages[0]?.text || "";
      // Construct the full profile summary prompt
      const recentSummary = await getCurrentSessionSummary(sessionUID);

      // Combine profile data with current session and message
      const profileSummaryPrompt = `
        ${profileSumTemp}
        print above profile summary fields and fill each field in respect of following info:
        Session ID: ${sessionUID}
        ${mainRules}
        ${profileRules}
        ${userProfile} 
        ${recentSummary}
        lingoMate: ${lastAiMessage};
        User's message: ${text}
      `;
      console.log(profileSummaryPrompt);
      // Send the prompt to Gemini to generate the updated profile
      const profileResult = await model.generateContent(profileSummaryPrompt);
      const newProfileSummary = profileResult.response.text().trim();
      // Save the updated profile to the user's profile field in Firestore
      await updateUserProfile(currentUser, newProfileSummary); 
            
      const combineText = `
      ${text}
      answer above user text very brifly in respect of following info:
      ${mainRules}
      ${sessionRules}
      ${profileRules}
      ${userProfile}
      ${recentSummary}
      `;
   
      const result = await model.generateContent(combineText);
      const aiResponse = result.response.text().trim();
      if (voiceEnabled) speakText(aiResponse);
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
    ${SessionSumTemp}
    print above session summary and fill all fields according to following info:
    Session ID: ${sessionUID}
    main rules:${mainRules}
    pofile rules:${profileResult}
    User pofile ${profileResult}
    summary rules:${sumRules}
    session rules:${sessionRules}
    current summary: ${currentSummary}
    lingoMate: ${lastAiMessage}
    User: ${text}
    `;
    // Send prompt to Gemini and get summary
    const summaryResult = await model.generateContent(summaryPrompt);
    const summary = summaryResult.response.text();
    console.log(summary);
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
