import { useState, useContext, useEffect, useRef } from 'react';
import { ChatContext } from '../context/ChatContext'
import {
  updateDoc, collection, query, setDoc, getDocs, where, doc, getDoc
} from "firebase/firestore";
import { db } from "../firebase";
import { AuthContext } from '../context/AuthContext';

const Search = () => {
  const [username, setUsername] = useState("");
  const [users, setUsers] = useState([]);
  const [err, setErr] = useState(false);
  const { currentUser } = useContext(AuthContext);
  const searchRef = useRef();
  const {data} = useContext(ChatContext) 

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

  const fetchAllUsers = async () => {
    try {
      // Fetch users already in current user's chats
      const userChatsDoc = await getDoc(doc(db, "userChats", currentUser.uid));
      const existingChatUsers = userChatsDoc.exists()
        ? Object.values(userChatsDoc.data()).map(chat => chat.userInfo.uid)
        : [];

      const allUsersSnapshot = await getDocs(collection(db, "users"));
      const allUsers = [];

      allUsersSnapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (
          data.uid !== currentUser.uid &&
          !existingChatUsers.includes(data.uid)
        ) {
          allUsers.push(data);
        }
      });

      console.log("📥 Fetched all users excluding current user and chat members");
      setUsers(allUsers);
    } catch (error) {
      console.error("❌ Error fetching all users:", error);
      setErr(true);
    }
  };

  const handleSearch = async (value) => {
    const searchValue = value.trim().toLowerCase();
    if (searchValue === "") {
      // If input is empty, show all users not in chat yet
      await fetchAllUsers();
      return;
    }

    try {
      const usersRef = collection(db, "users");
      const allUsersSnapshot = await getDocs(usersRef);
      const matches = [];

      const userChatsDoc = await getDoc(doc(db, "userChats", currentUser.uid));
      const existingChatUsers = userChatsDoc.exists()
        ? Object.values(userChatsDoc.data()).map(chat => chat.userInfo.uid)
        : [];

      allUsersSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const displayNameLower = data.displayName.toLowerCase();

        if (
          displayNameLower.includes(searchValue) &&
          data.uid !== currentUser.uid &&
          !existingChatUsers.includes(data.uid)
        ) {
          matches.push(data);
        }
      });

      console.log(`🔍 Found ${matches.length} matching users for: "${searchValue}"`);
      setUsers(matches);
    } catch (error) {
      console.error("❌ Search error:", error);
      setErr(true);
    }
  };

  const coId = (uid1, uid2) => {
    return uid1 > uid2 ? uid1 + uid2 : uid2 + uid1;
  };

  const handleSelect = async (user) => {
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
            photoURL: user.photoURL || null
          },
          date: d,
        },
      });

      await updateDoc(doc(db, "userChats", user.uid), {
        [combinedId]: {
          userInfo: {
            uid: currentUser.uid,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL || null
          },
          date: d,
        },
      });

      console.log(`✅ New chat created or selected with ${user.displayName}`);
      emptySearch();
    } catch (err) {
      console.error("❌ Error creating chat:", err);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setUsername(value);
    handleSearch(value);
  };

  const emptySearch = () => {
    setUsername("");
    setUsers([]);
  };

  return (
    <div className='search' ref={searchRef}>
      <div className='searchbox'>
        <input
          type='text'
          placeholder='Add new language'
          onChange={handleInputChange}
          value={username}
          onClick={() => {
            if (username.trim() === "") {
              fetchAllUsers();
            }
          }}
        />
      </div>

      {users.length > 0 && users.map((user) => (
        <div className="userChat" key={user.uid} onClick={() => handleSelect(user)}>
          <img className="img" src={data.user.photoURL} alt="" />
          <div className="userChatInfo">
            <div className="userID">
              <span>{user.displayName}</span>
            </div>
          </div>
        </div>
      ))}

      {err && <span style={{ color: 'red' }}>Something went wrong</span>}
    </div>
  );
};

export default Search;
