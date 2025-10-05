import React, { useEffect, useRef } from "react";
import { Terminal as XTerminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";
import "./terminal.css";

function Terminal(props) {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);
  const { socket, userInfo, logout } = props;

  useEffect(() => {
    if (!terminalRef.current) return;

    // Create terminal instance
    const terminal = new XTerminal({
      cursorBlink: true,
      fontSize: 18,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: "#1e1e1e",
        foreground: "#d4d4d4",
        cursor: "#ffffff",
        selection: "#264f78",
      },
      rows: 30,
      cols: 100,
    });

    // Create fit addon
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);

    // Open terminal in the DOM
    terminal.open(terminalRef.current);
    fitAddon.fit();

    // Store references
    xtermRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Focus terminal
    terminal.focus();

    // Handle window resize
    const handleResize = () => {
      fitAddon.fit();
    };
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      terminal.dispose();
    };
  }, []);

  // Handle SSH connection and data flow
  useEffect(() => {
    if (!socket || !xtermRef.current || !userInfo) return;

    const terminal = xtermRef.current;

    // Start SSH session
    socket.emit("start-ssh", {
      username: userInfo.name,
      host: userInfo.ip,
      sshkey: userInfo.sshkey,
    });
    // Handle incoming data from server
    const onServerData = (data) => {
      terminal.write(data);
    };
    socket.on("terminal-output", onServerData);

    // Handle SSH ready
    const onSSHReady = (data) => {
      console.log("SSH Ready:", data);
      terminal.write("\r\n✓ SSH Connection established\r\n\r\n");
    };
    socket.on("ssh-ready", onSSHReady);

    // Handle SSH errors
    const onSSHError = (data) => {
      terminal.write(`\r\n\x1b[31m✗ SSH Error: ${data.error}\x1b[0m\r\n`);
    };
    socket.on("ssh-error", onSSHError);

    // Handle SSH closed
    const onSSHClosed = () => {
      terminal.write("\r\n\x1b[33m✗ SSH Connection closed\x1b[0m\r\n");
    };
    socket.on("ssh-closed", onSSHClosed);

    // Handle user input from terminal
    const disposable = terminal.onData((data) => {
      socket.emit("terminal-input", {
        command: data,
        sessionId: socket.id,
      });
    });

    // Cleanup
    return () => {
      socket.off("terminal-output", onServerData);
      socket.off("ssh-ready", onSSHReady);
      socket.off("ssh-error", onSSHError);
      socket.off("ssh-closed", onSSHClosed);
      disposable.dispose();
    };
  }, [socket, userInfo]);

  return (
    <div className="terminal-window">
      <div className="terminal-header">
        <div className="terminal-info">
          {userInfo && (
            <span className="connection-info">
              {userInfo.name}@{userInfo.ip}
            </span>
          )}
        </div>
        <button id="logout" onClick={logout}>
          LOGOUT
        </button>
      </div>
      <div className="terminal-container" ref={terminalRef}></div>
    </div>
  );
}

export default Terminal;
