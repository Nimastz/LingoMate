import React, { useContext } from 'react'
import Messages from './Messages'
import Input from './Input'
import { ChatContext } from '../context/ChatContext'
import photo from '../img/en.png'

export const Chat = () => {
  const {data} = useContext(ChatContext) 

  return (
    <div className='chat'>
      <div className='chatInfo'>
      <img className="img" src={data.user?.photoURL || photo} alt="" />
        <span>{data.user?.displayName}</span>
        <div className='chatIcon'>
      </div>
      </div>
      <Messages/>
      <Input/>
    </div>
  )
}

export default Chat