import React, { useState, useContext, useEffect, useRef } from 'react';
import add from '../img/add.png';
import { updateDoc, collection, query, setDoc, getDocs, where, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { AuthContext } from '../context/AuthContext';

const Search = () => {
  const [username, setUsername] = useState("");
  const [user, setUser] = useState(null);
  const [err, setErr] = useState(false);
  const { currentUser } = useContext(AuthContext);
  const searchRef = useRef();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        emptySearch();
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        emptySearch();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleSearch = async () => {
    try {
      const q = query(collection(db, "users"), where("displayName", "==", username));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        setUser(doc.data());
      });
      const res = await getDoc(doc(db, "chats", coId(currentUser.uid, user.uid)));
      if (res.exists()) {
        setUser(null);
      }
    } catch (err) {
      setErr(true);
    }
  };

  const handleKey = (e) => {
    if (e.code === "Enter") {
      if (currentUser.displayName !== e.target.value && handleSearch()) {
        // optional logic
      }
      e.target.value = null;
      emptySearch();
    }
  };

  const emptySearch = () => {
    setUsername("");
    setUser(null);
  };

  const coId = (currentUser_uid, user_uid) => {
    return currentUser_uid > user_uid
      ? currentUser_uid + user_uid
      : user_uid + currentUser_uid;
  };

  const handleSelect = async () => {
    const combinedId = coId(currentUser.uid, user.uid);
    try {
      const res = await getDoc(doc(db, "chats", combinedId));

      if (!res.exists()) {
        await setDoc(doc(db, "chats", combinedId), { messages: [] });
      }

      const d = new Date();

      await setDoc(doc(db, "userChats", currentUser.uid), {}, { merge: true });
      await setDoc(doc(db, "userChats", user.uid), {}, { merge: true });

      await updateDoc(doc(db, "userChats", currentUser.uid), {
        [combinedId]: {
          userInfo: {
            uid: user.uid,
            displayName: user.displayName,
          },
          date: d,
        },
      });

      await updateDoc(doc(db, "userChats", user.uid), {
        [combinedId]: {
          userInfo: {
            uid: currentUser.uid,
            displayName: currentUser.displayName,
          },
          date: d,
        },
      });

      setUser(null);
      setUsername("");
    } catch (err) {
      console.error("Error creating chat:", err);
    }
  };

  return (
    <div className='search' ref={searchRef}>
      <div className='searchbox'>
        <input
          type='text'
          placeholder='Add new language'
          onKeyDown={handleKey}
          onChange={e => setUsername(e.target.value)}
          value={username}
        />
      </div>
      {user && (
        <div className="userChat" onClick={handleSelect}>
          <img className="img" src={user.photoURL || add} alt="user profile" />
          <div className="userChatInfo">
            <div className="userID">
              <span>{user.displayName}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Search;
