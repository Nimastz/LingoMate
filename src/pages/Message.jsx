import React, { useContext, useEffect, useRef, useState } from 'react';
import lingo from '../img/account_Logo.png';
import icon from '../img/cancel_black.png';
import edit from '../img/edit.png';
import { AuthContext } from '../context/AuthContext';
import { ChatContext } from '../context/ChatContext';
import { doc, getDoc, updateDoc, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase';

const Message = ({ message }) => {
  const { currentUser } = useContext(AuthContext);
  const { data } = useContext(ChatContext);
  const ref = useRef();

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);

  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: "auto" });
  }, [message]);

  const toDate = (sec) => {
    const date = new Date(sec * 1000);
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  };

  const toTime = (sec) => {
    const date = new Date(sec * 1000);
    const formatter = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return formatter.format(date);
  };

  const handleCancel = async () => {
    const docRef = doc(db, "chats", data.chatId);
    const docSnap = await getDoc(docRef);
    const targetMsg = docSnap.data().messages.find(m => m.id === message.id);
    if (!targetMsg) return;

    await updateDoc(docRef, {
      messages: arrayRemove(targetMsg),
    });
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (editText.trim() === "") return;

    const docRef = doc(db, "chats", data.chatId);
    const docSnap = await getDoc(docRef);

    const messages = docSnap.data().messages;
    const updatedMessages = messages.map((m) =>
      m.id === message.id ? { ...m, text: editText } : m
    );

    await updateDoc(docRef, {
      messages: updatedMessages,
    });

    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsEditing(false);
      setEditText(message.text);
    } else if (e.key === 'Enter') {
      handleSaveEdit();
    }
  };

  return (
    <div ref={ref} className={`message ${message.senderId === currentUser.uid ? "owner" : ""}`}>
      <div className="messageInfo">
        <img src={lingo} alt="" />
        <span>{toDate(message.date.seconds)}</span>
      </div>
      <div className="messageContant">
        {isEditing ? (
          <input
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{ 
              backgroundColor: message.senderId === currentUser.uid ? 'rgb(109, 172, 145)' : 'rgb(194, 185, 153)', 
              padding: '10px', 
              fontSize: '12px', 
              borderRadius: '3px', 
              minWidth: '50px',
              maxWidth: '100%',
              width: 'fit-content',
              height: 'auto',
              resize: 'none'
            }}
            autoFocus
          />
        ) : (
          <p>{message.text}</p>
        )}
        <span className="t">{toTime(message.date.seconds)}</span>
      </div>
      {message.senderId === currentUser.uid && !isEditing && (
        <div className="option">
          <img className="cancel" src={icon} onClick={handleCancel} alt="delete" />
          <img className="edit" src={edit} onClick={handleEdit} alt="edit" />
        </div>
      )}
    </div>
  );
};

export default Message;
