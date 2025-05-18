import { useContext } from 'react'
import Messages from './Messages'
import Input from './Input'
import { ChatContext } from '../context/ChatContext'

export const Chat = () => {
  const {data} = useContext(ChatContext) 
  return (
    <div className='chat'>
      <div className='chatInfo'>
      <img className="img" src={data.user?.photoURL} alt="" />
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