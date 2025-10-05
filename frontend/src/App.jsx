// src/App.jsx

import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import "./App.css";
import LoginForm from "./components/LoginForm/LoginForm";
import Terminal from "./components/Terminal/Terminal";

const ipCheck = new RegExp(
  /^((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])$/,
);

function App() {
  // STATES
  const [isConnected, setConnected] = useState(false);
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
  });
  const [userInfo, setUserInfo] = useState(null);
  const [socket, setSocket] = useState(null);

  // Initialize socket connection only when user logs in
  useEffect(() => {
    if (!isConnected) return;

    const newSocket = io("http://localhost:8080");
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Socket connected");
    });

    newSocket.on("ssh-error", (data) => {
      alert(`SSH Error: ${data.error}`);
    });

    newSocket.on("ssh-closed", () => {
      alert("SSH connection closed by server.");
      logout();
    });

    return () => {
      if (newSocket) {
        newSocket.close();
      }
    };
  }, [isConnected]);

  // FUNCTIONS
  async function createNewUser(newUserDetails) {
    if (newUserDetails.password !== newUserDetails.repassword) {
      alert("PASSWORDS DONT MATCH");
      return;
    }
    if (!ipCheck.test(newUserDetails["new-host"])) {
      alert("INVALID HOST IP");
      return;
    }
    try {
      const response = await fetch("/createUser", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newUserDetails),
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.message === "USERNAME_TAKEN") {
          alert("Username taken.");
        } else {
          throw new Error(`ERROR : ${response.status}, ${data.message}`);
        }
      } else if (data.message === "USER_CREATED") {
        alert("USER CREATED");
      }
    } catch (error) {
      console.error(error);
    }
  }

  async function onSubmit() {
    try {
      const response = await fetch("/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      });
      const result = await response.json();
      if (!response.ok) {
        if (result.message === "INVALID_USERNAME") {
          alert("USERNAME DOESN'T EXIST");
        } else if (result.message === "INVALID_PASSWORD") {
          alert("WRONG PASSWORD");
        } else {
          throw new Error(
            `Response status : ${response.status}, ${result.message}`,
          );
        }
      } else {
        console.log("Login successful:", result);
        setUserInfo(result.user);
        setConnected(true);
      }
    } catch (error) {
      console.error(error.message);
    }
  }

  function logout() {
    if (socket) {
      socket.close();
    }
    setConnected(false);
    setUserInfo(null);
    setSocket(null);
  }

  //RETURN
  return (
    <>
      {isConnected && socket ? (
        <Terminal socket={socket} userInfo={userInfo} logout={logout} />
      ) : (
        <LoginForm
          credentials={credentials}
          updateCredentials={setCredentials}
          onSubmit={onSubmit}
          createNewUser={createNewUser}
        />
      )}
    </>
  );
}

export default App;
