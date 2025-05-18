import { useContext, useEffect, useState } from 'react'

import { doc, onSnapshot} from 'firebase/firestore'
import { db } from '../firebase'
import { AuthContext } from '../context/AuthContext'
import { ChatContext } from '../context/ChatContext'


const Chats = () => {

    const [chats,setChats] =useState([])
    const {currentUser} = useContext(AuthContext);
    const {dispatch} = useContext(ChatContext);

    useEffect(()=>{
      const getChats = () =>{
      const unsub = onSnapshot(doc(db,"userChats",currentUser.uid),(doc)=>{
        setChats(doc.data());
      });
        
      return()=>{
        unsub()
        };
    };
    currentUser.uid && getChats()
    },[currentUser.uid]);
    
    const handleSelect= async(userInfo)=>{
        dispatch({type:"CHANGE_USER",payload:userInfo})
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
                onClick={() => handleSelect(chat[1].userInfo)}
              >
                <div className='left'>
                  <img src={chat[1].userInfo?.photoURL} alt='' />
                </div>
                <div className='userChatInfo'>
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