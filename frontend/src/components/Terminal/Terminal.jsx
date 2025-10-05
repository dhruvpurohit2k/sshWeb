// Suggested update for Terminal.jsx

import "./terminal.css";
function Terminal(props) {
  function pressedEnter(even) {
    if (even.key === "Enter") {
      props.runCommand();
    }
  }
  function acceptCommand(event) {
    props.changeTerminalInput(event.target.value);
  }
  return (
    <div className="terminal-window">
      <div className="terminal-header">
        <button id="logout" onClick={props.logout}>
          LOGOUT
        </button>
      </div>
      <textarea
        id="terminalOutput"
        value={props.terminalText}
        readOnly /* Use readOnly for textareas instead of disabled */
      ></textarea>
      <div className="input-area">
        <span className="prompt">{">"}</span>
        <input
          value={props.terminalInput}
          onChange={acceptCommand}
          onKeyDown={pressedEnter}
          autoFocus /* Automatically focus the input */
        />
        <button id="voiceInput">Use Voice</button>
      </div>
    </div>
  );
}
export default Terminal;
