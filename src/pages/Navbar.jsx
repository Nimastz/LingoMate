import React, { useContext } from 'react';
import photo from '../img/shutdown.png';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { AuthContext } from '../context/AuthContext';
import { ChatContext } from '../context/ChatContext';
import { doc, updateDoc } from 'firebase/firestore';

const Navbar = () => {
  const { currentUser } = useContext(AuthContext);
  const { dispatch } = useContext(ChatContext);

  const signOutHandler = async () => {
    let d = new Date();
    await updateDoc(doc(db, "users", currentUser.uid), {
      lastActivity: d,
    });
    console.log("user: " + currentUser.displayName + " is logout on " + d);
    signOut(auth);
    dispatch({ type: "INITIAL_STATE" });
  };

  // Capitalize first letter, lowercase rest
  const formatDisplayName = (name) => {
    if (!name) return "";
    const lower = name.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  };

  return (
    <div className='navbar'>
      <div className="username">
        <p>{formatDisplayName(currentUser.displayName)}</p>
        <img onClick={signOutHandler} className="img" src={photo} alt="" />
      </div>
    </div>
  );
};

export default Navbar;
