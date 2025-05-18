import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, updateDoc, getDocs, where, query, collection } from 'firebase/firestore';

export const Login = () => {
  const [err, setErr] = useState(false);
  const navigate = useNavigate();

  // Helper to normalize username input
  const normalizeUsername = (username) => {
    if (!username) return "";
    const lower = username.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr(false);

    const rawUsername = e.target[0].value.trim();
    const password = e.target[1].value;

    const username = normalizeUsername(rawUsername);
    console.log("Normalized Username:", username);

    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("displayName", "==", username));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        const email = userData.email;

        console.log("User found, trying login with email:", email);

        const res = await signInWithEmailAndPassword(auth, email, password);
        const d = new Date();

        await updateDoc(doc(db, "users", res.user.uid), {
          lastActivity: d,
        });

        console.log("✅ Login successful for", res.user.displayName, "at", d.toLocaleString());
        navigate("/");
      } else {
        console.error("❌ No user found with username:", username);
        setErr(true);
      }
    } catch (error) {
      console.error("❌ Error during login:", error.message);
      setErr(true);
    }
  };

  return (
    <div className="formContainer">
      <div className="formWrapper">
        <span className="logo">LingoMate</span>
        <form onSubmit={handleSubmit}>
          <input type="text" placeholder='username' />
          <input type="password" placeholder='password' />
          <button>Sign in</button>
        </form>
        {err && <span style={{ color: 'red' }}>Login failed. Check your username and password.</span>}
        <p>
          Don't have an account? <Link className='link' to="/Register">Register</Link>
        </p>
      </div>
    </div>
  );
};
