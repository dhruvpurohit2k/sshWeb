import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import "./App.css";
import LoginForm from "./components/LoginForm/LoginForm";
import Terminal from "./components/Terminal/Terminal";

const SERVER_URL = "http://localhost:8000";

function App() {
  //STATES

  const [isConnected, setConnected] = useState(false);
  const [credentials, setCredentials] = useState({
    host: "",
    user: "",
    password: "",
  });
  const [terminalText, setTerminalText] = useState([]);
  const [terminalOutputText, setTerminalOutputText] = useState("");
  const [terminalInput, setTerminalInput] = useState("");

  //FUNCTIONS

  function onSubmit() {
    const serverResponse = true;
    if (serverResponse) {
      setConnected(!isConnected);
    }
  }
  function runCommand() {
    console.log("EXECUTING COMMAND " + terminalInput);
  }
  //RETURN

  return (
    <>
      {isConnected ? (
        <Terminal
          terminalText={terminalOutputText}
          terminalInput={terminalInput}
          changeTerminalInput={setTerminalInput}
          runCommand={runCommand}
        />
      ) : (
        <LoginForm
          credentials={credentials}
          updateCredentials={setCredentials}
          onSubmit={onSubmit}
        />
      )}
    </>
  );
}

export default App;
