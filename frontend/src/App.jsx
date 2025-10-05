import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import "./App.css";
import LoginForm from "./components/LoginForm/LoginForm";
import Terminal from "./components/Terminal/Terminal";

const ipCheck = new RegExp(
  /^((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])$/,
);

function App() {
  //STATES
  const [isConnected, setConnected] = useState(false);
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
  });
  const [userInfo, setUserInfo] = useState(null);
  const [terminalOutput, setTerminalOutput] = useState("");
  const [terminalInput, setTerminalInput] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [socket, setSocket] = useState(null);

  const socketRef = useRef(null);

  // Initialize socket connection only when user logs in
  useEffect(() => {
    if (!isConnected) return;

    const newSocket = io("http://localhost:8080");
    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Socket connected");
    });

    newSocket.on("ssh-ready", (data) => {
      console.log("SSH Ready:", data);
      setSessionId(data.sessionId);
    });

    newSocket.on("terminal-output", (data) => {
      setTerminalOutput((prev) => prev + data);
    });

    newSocket.on("ssh-error", (data) => {
      alert(`SSH Error: ${data.error}`);
      setTerminalOutput((prev) => prev + `\n\n[ERROR] ${data.error}\n\n`);
    });

    newSocket.on("ssh-closed", () => {
      alert("SSH connection closed");
      setConnected(false);
    });

    return () => {
      // Cleanup on unmount or logout
      if (newSocket) {
        newSocket.close();
      }
    };
  }, [isConnected]);

  //FUNCTIONS
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
          return;
        } else {
          throw new Error(`ERROR : ${response.status}, ${data.message}`);
        }
      }
      if (data.message === "USER_CREATED") {
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
          return;
        } else if (result.message === "INVALID_PASSWORD") {
          alert("WRONG PASSWORD");
          return;
        }
        throw new Error(
          `Response status : ${response.status}, ${result.message}`,
        );
      } else {
        console.log("Login successful:", result);
        setUserInfo(result.user);
        setConnected(true);
      }
    } catch (error) {
      console.error(error.message);
      return;
    }
  }

  // Start SSH connection after socket is ready and user is logged in
  useEffect(() => {
    if (socket && userInfo && isConnected) {
      console.log("Starting SSH with:", userInfo);
      socket.emit("start-ssh", {
        username: userInfo.name,
        host: userInfo.ip,
        sshkey: userInfo.sshkey,
      });
    }
  }, [socket, userInfo, isConnected]);

  function runCommand() {
    if (!terminalInput.trim()) return;

    if (socketRef.current && sessionId) {
      const commandToSend = terminalInput + "\n";
      socketRef.current.emit("terminal-input", {
        command: commandToSend,
        sessionId: sessionId,
      });
      setTerminalInput("");
    }
  }

  function logout() {
    // Close socket connection
    if (socketRef.current) {
      socketRef.current.close();
    }

    // Reset state
    setConnected(false);
    setUserInfo(null);
    setSessionId(null);
    setTerminalOutput("");
    setTerminalInput("");
    setSocket(null);
  }

  //RETURN
  return (
    <>
      {isConnected ? (
        <Terminal
          terminalText={terminalOutput}
          terminalInput={terminalInput}
          changeTerminalInput={setTerminalInput}
          runCommand={runCommand}
          logout={logout}
          userInfo={userInfo}
        />
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
