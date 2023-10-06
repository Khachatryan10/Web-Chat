import Navbar from "./components/Navbar";
import RegisterForm from "./components/RegisterForm";
import LoginForm from "./components/LoginForm";
import { Route, Routes } from "react-router-dom";
import ChatForm from "./components/ChatForm";
import { useSelector } from "react-redux";
import { RootState } from "./app/store";
import { userDataI } from "./interfaces/interfaces";
import { useEffect, useState } from "react";
import WelcomeToChat from "./components/WelcomeToChat";

function App():JSX.Element {
    const userData:userDataI = useSelector((state:RootState) => state.userData)
    
  return (
    <div className="App">
    <Navbar />
      <Routes>
          <Route path="/login" element={!userData.authenticated && <LoginForm />}/>
          <Route path="/register" element={!userData.authenticated && <RegisterForm/>}/>
          <Route path="/user/:user_id/" element={userData.authenticated && <ChatForm/>}/>
          <Route path="/chat/:chat_id/" element={userData.authenticated && <ChatForm/>}/>
          <Route path="" element={userData.authenticated && <WelcomeToChat/>}/>
      </Routes>
    </div>
  
  );
}

export default App;
