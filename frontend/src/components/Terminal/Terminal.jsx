import "./terminal.css";
function Terminal(props) {
  function pressedEnter(even) {
    if (even.key == "Enter") props.runCommand();
  }
  function acceptCommand(event) {
    props.changeTerminalInput(event.target.value);
  }
  return (
    <div className="main-content">
      <textarea
        id="terminalOutput"
        value={props.terminalText}
        disabled
      ></textarea>
      <input
        value={props.terminalInput}
        onChange={acceptCommand}
        onKeyDown={pressedEnter}
      />
      <button id="voiceInput">Use Voice</button>
      <button id="logout"> LOGOUT </button>
    </div>
  );
}
export default Terminal;
