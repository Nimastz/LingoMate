import { useContext, useEffect, useState } from 'react'

import { doc, getDoc, onSnapshot} from 'firebase/firestore'
import { db } from '../firebase'
import { AuthContext } from '../context/AuthContext'
import { ChatContext } from '../context/ChatContext'


const Chats = () => {

    const [chats,setChats] =useState([])
    const {currentUser} = useContext(AuthContext);
    const {dispatch} = useContext(ChatContext);
    const [selectedChatId, setSelectedChatId] = useState(null);
useEffect(() => {
  if (!currentUser?.uid) return;

  const unsub = onSnapshot(doc(db, "userChats", currentUser.uid), async (docSnap) => {
    const chatsData = docSnap.data();

    if (!chatsData) {
      setChats([]);
      return;
    }

    // Fetch full userInfo for each chat user asynchronously
    const chatsWithFullUserInfo = await Promise.all(
      Object.entries(chatsData).map(async ([chatId, chat]) => {
        try {
          const userDocRef = doc(db, "users", chat.userInfo.uid);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            const fullUser = userSnap.data();
            return [
              chatId,
              {
                ...chat,
                userInfo: {
                  ...chat.userInfo,
                  photoURL: fullUser.photoURL || "",
                  email: fullUser.email || "",
                  level: fullUser.level || "",
                },
              },
            ];
          } else {
            return [chatId, chat];
          }
        } catch (e) {
          console.error("Error fetching full user info:", e);
          return [chatId, chat];
        }
      })
    );

    setChats(Object.fromEntries(chatsWithFullUserInfo));
  });

  return () => unsub();
}, [currentUser.uid]);
    
    const handleSelect= async(userInfo, chatId)=>{
    setSelectedChatId(chatId);
    const userDocRef = doc(db, "users", userInfo.uid);
    const userSnap = await getDoc(userDocRef);

    if (userSnap.exists()) {
      const fullUserData = userSnap.data();
      dispatch({
        type: "CHANGE_USER",
        payload: {
          uid: userInfo.uid,
          displayName: userInfo.displayName || fullUserData.displayName,
          photoURL: fullUserData.photoURL || "",
        },
      });
        } else {
      dispatch({ type: "CHANGE_USER", payload: userInfo }); // fallback
      console.warn("User document not found, using fallback");
    }
    }
    const toDate =(sec) =>{
      var date = new Date(Date.UTC(1970, 0, 1)); // Epoch
      date.setUTCSeconds(sec);
      const formattedDate = `${date.getDate()}/${date.getMonth() + 1}`;
      return formattedDate;
    }
    const toTime =(sec) =>{
      var date = new Date(Date.UTC(1970, 0, 1)); // Epoch
      date.setUTCSeconds(sec);
      const formatter = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' });
      const formattedTime = formatter.format(date);
      return formattedTime;
    }
    
    return (
      <div className='chats'>
        {chats && Object.entries(chats).length > 0 ? (
          Object.entries(chats)
            .sort((a, b) => b[1].date - a[1].date)
            .map((chat) => (
              <div
                className='userChat'
                key={chat[0]}
                onClick={() => handleSelect(chat[1].userInfo, chat[0])}
                style={ chat[0] === selectedChatId ? {
                backgroundColor: 'rgb(62, 61, 59)',
                borderRadius: '10px',
                } : {} }
              >
                <div className='left'>
                  <img src={chat[1].userInfo?.photoURL} alt='' />
                </div>
                <div     className='userChatInfo'
                style={ chat[0] === selectedChatId ? { backgroundColor: 'rgb(107, 105, 103)' } : {} }>
                  <div className='userID'>
                    <span>{chat[1].userInfo?.displayName}</span>
                  </div>
                  <div className='shortmessage'>
                    <span>{chat[1].lastMessage?.text}</span>
    
                    <div
                      className='new_message'
                      style={{
                        display: chat[1].lastMessage?.newNum ? 'block' : 'none',
                      }}
                    >
                      <p align='center'>{chat[1].lastMessage?.newNum}</p>
                    </div>
                  </div>
                  <div className='time'>
                    <span>
                      {toDate(chat[1].date.seconds) +
                        ' ' +
                        toTime(chat[1].date.seconds)}
                    </span>
                  </div>
                </div>
              </div>
            ))
        ) : (
          <p>No chats available</p>
        )}
      </div>
    );
}

export default Chats