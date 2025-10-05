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
  const [terminalText, setTerminalText] = useState([]);
  const [terminalOutputText, setTerminalOutputText] = useState("");
  const [terminalInput, setTerminalInput] = useState("");

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
    console.log(credentials);
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
          throw new Error(`ERROR : ${response.status()}, ${data.message}`);
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
          alert("USERNAME DOESN'T EXSIST");
          return;
        } else if (result.message === "INVALID_PASSWORD") {
          alert("WRONG PASSWORD");
          return;
        }
        throw new Error(
          `Response status : ${response.status}, ${result.message}`,
        );
      } else {
        alert("LOGGED IN");
        console.log(result);
        setConnected(!isConnected);
      }
    } catch (error) {
      console.error(error.message);
      return;
    }
  }
  function runCommand() {
    console.log("EXECUTING COMMAND " + terminalInput);
  }
  function logout() {
    setConnected(!isConnected);
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
          logout={logout}
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
