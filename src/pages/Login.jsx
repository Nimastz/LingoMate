import React from 'react'
import { useState } from 'react';
import { useNavigate,Link } from 'react-router-dom';
import {signInWithEmailAndPassword} from "firebase/auth";
import {auth, db} from "../firebase"
import { doc, updateDoc, getDocs, where, query, collection } from 'firebase/firestore';

export const Login = () => {
  const [err,setErr] = useState(false);
  const navigate = useNavigate();
  
    const handleSubmit =  async(e) =>{
        e.preventDefault() 
        const username = e.target[0].value.toLowerCase();
        const password = e.target[1].value;
      try{
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("displayName", "==", username));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0].data();
          const email = userDoc.email;
          const res = await signInWithEmailAndPassword(auth, email, password);
          
          let d = new Date();
          await updateDoc(doc(db,"users",res.user.uid),{
            lastActivity: d,
            },
          );
          console.log("user: "+ res.user.displayName + " is login on "+d);
          navigate ("/");
        }
      }catch(err) {
        setErr(true);
        // ..
      }
    };
  return (
        
    <div className="formContainer">
        <div className="formWrapper">
            <span className="logo"> LingoMate</span>
            <form onSubmit = {handleSubmit}>
                <input type="text" placeholder='username'/>               
                <input type="password" placeholder='password'/>
                
                <button> Sign in</button>
            </form>
            <p>Don't have an account? <Link className='link' to="/Register">Register</Link> </p>
        </div> 
    </div>
  )
}

