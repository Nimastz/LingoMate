import React, { useContext, useEffect, useState } from 'react'
import Message from './Message'
import { ChatContext } from '../context/ChatContext'
import { db } from '../firebase'
import { doc, onSnapshot } from 'firebase/firestore'
const Messages = () => {
  const [messages,setMessages] = useState([]);
  const {data} = useContext(ChatContext); 

  useEffect(() =>{
    const unsub = onSnapshot(doc(db,"chats",data.chatId),(doc)=>{
      doc.exists() && setMessages(doc.data().messages); 
    });

    return ()=>{
      unsub()
    };
  },[data.chatId])

  
        return (
    <div className='messages'> 
        {messages?.sort((a,b)=>a.date-b.date).map((m)=>(
        <Message message ={m} key={m.id}/>
      ))}
    </div>
    )
}

export default Messages