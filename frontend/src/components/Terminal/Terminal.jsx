import { useEffect, useRef } from "react";
import "./terminal.css";

function Terminal(props) {
  const terminalOutputRef = useRef(null);

  // Auto-scroll to bottom when new output arrives
  useEffect(() => {
    if (terminalOutputRef.current) {
      terminalOutputRef.current.scrollTop =
        terminalOutputRef.current.scrollHeight;
    }
  }, [props.terminalText]);

  function pressedEnter(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      props.runCommand();
    }
  }

  function acceptCommand(event) {
    props.changeTerminalInput(event.target.value);
  }

  return (
    <div className="terminal-window">
      <div className="terminal-header">
        <div className="terminal-info">
          {props.userInfo && (
            <span className="connection-info">
              {props.userInfo.name}@{props.userInfo.ip}
            </span>
          )}
        </div>
        <button id="logout" onClick={props.logout}>
          LOGOUT
        </button>
      </div>
      <textarea
        ref={terminalOutputRef}
        id="terminalOutput"
        value={props.terminalText}
        readOnly
      ></textarea>
      <div className="input-area">
        <span className="prompt">$</span>
        <input
          value={props.terminalInput}
          onChange={acceptCommand}
          onKeyDown={pressedEnter}
          autoFocus
          placeholder="Enter command..."
        />
      </div>
    </div>
  );
}

export default Terminal;
