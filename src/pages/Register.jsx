import React, { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate, Link } from 'react-router-dom';

export const Register = () => {
  const [err, setErr] = useState(false);
  const navigate = useNavigate();

  const [new_displayName, setID] = useState("");
  const [new_email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Capitalize function
  const capitalize = (str) => {
    if (!str) return "";
    const lower = str.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const displayName = capitalize(new_displayName);
    const email = new_email.toLowerCase();
    const profile = "New user,No name or info is available";

    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      let d = new Date();

      await setDoc(doc(db, "users", res.user.uid), {
        uid: res.user.uid,
        displayName,
        email,
        password,
        level: "C",
        lastActivity: d,
        profile,
        photoURL: "",
      });

      await setDoc(doc(db, 'userProgress', res.user.uid), {
        vocab: [],
        grammar: [],
        scenarios: [],
        topics: [],
      });

      await updateProfile(res.user, {
        displayName,
      });

      navigate("/Login");

    } catch (err) {
      console.error("Registration error:", err);
      setErr(true);
    }
  };

  return (
    <div className="formContainer">
      <div className="formWrapper">
        <span className="logo">LingoMate</span>
        <form autoComplete="off" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="username"
            value={new_displayName}
            onChange={(e) => setID(e.target.value)}
          />
          <input
            type="email"
            placeholder="email"
            value={new_email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            type="password"
            placeholder="repeat password"
          />
          <button>Sign up</button>
          {err && <span className="errorText">Something went wrong!</span>}
        </form>
        <p>You have an account? <Link className="link" to="/Login">Login</Link></p>
      </div>
    </div>
  );
};
