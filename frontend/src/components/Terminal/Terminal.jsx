import React, { useEffect, useRef, useState } from "react";
import { Terminal as XTerminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";
import "./terminal.css";

// Microphone Icon SVG Component
const MicIcon = ({ isRecording }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke={isRecording ? "#e64539" : "currentColor"}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="mic-icon"
  >
    {isRecording && (
      <circle cx="12" cy="12" r="10" fill="#e64539" stroke="none" />
    )}
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
    <line x1="12" y1="19" x2="12" y2="23"></line>
  </svg>
);

// --- NEW: Loading Icon SVG Component ---
const LoadingIcon = () => (
  <svg
    className="loading-icon"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,19a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z"
      opacity=".25"
    />
    <path d="M10.72,19.9a8,8,0,0,1-6.5-9.79A7.77,7.77,0,0,1,10.4,4.16a8,8,0,0,1,9.49,6.52A1.54,1.54,0,0,0,21.38,12h.13a1.37,1.37,0,0,0,1.38-1.54,11,11,0,1,0-12.7,12.39A1.54,1.54,0,0,0,12,21.34h0A1.47,1.47,0,0,0,10.72,19.9Z" />
  </svg>
);

function Terminal(props) {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const { socket, userInfo, logout } = props;

  // State for voice recording
  const [isRecording, setIsRecording] = useState(false);
  // --- NEW: State for voice processing ---
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Initialize Terminal on mount
  useEffect(() => {
    if (terminalRef.current && !xtermRef.current) {
      const term = new XTerminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        theme: {
          background: "#1e1e1e",
          foreground: "#d4d4d4",
          cursor: "#ffffff",
        },
      });
      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(terminalRef.current);
      fitAddon.fit();
      xtermRef.current = term;

      const handleResize = () => fitAddon.fit();
      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
        term.dispose();
      };
    }
  }, []);

  // Handle SSH connection and socket events
  useEffect(() => {
    if (!socket || !xtermRef.current || !userInfo) return;

    const terminal = xtermRef.current;
    terminal.focus();

    socket.emit("start-ssh", {
      username: userInfo.name,
      host: userInfo.ip,
      sshkey: userInfo.sshkey,
    });

    const onServerData = (data) => terminal.write(data);
    const onCommandFromVoice = ({ command }) => {
      setIsProcessingVoice(false); // --- NEW: Stop loading
      if (command) socket.emit("terminal-input", { command });
    };
    const onVoiceError = ({ message }) => {
      setIsProcessingVoice(false); // --- NEW: Stop loading
      terminal.write(`\r\n\x1b[31mVoice Error: ${message}\x1b[0m\r\n> `);
    };

    socket.on("terminal-output", onServerData);
    socket.on("command-from-voice", onCommandFromVoice);
    socket.on("voice-error", onVoiceError);

    const disposable = terminal.onData((data) => {
      socket.emit("terminal-input", { command: data });
    });

    return () => {
      socket.off("terminal-output", onServerData);
      socket.off("command-from-voice", onCommandFromVoice);
      socket.off("voice-error", onVoiceError);
      disposable.dispose();
    };
  }, [socket, userInfo]);

  const handleMicClick = async () => {
    if (isRecording) {
      mediaRecorderRef.current.stop();
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        mediaRecorderRef.current = new MediaRecorder(stream, {
          mimeType: "audio/webm",
        });
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
          audioChunksRef.current.push(event.data);
        };

        mediaRecorderRef.current.onstop = () => {
          setIsRecording(false);
          const audioBlob = new Blob(audioChunksRef.current, {
            type: "audio/webm",
          });
          sendAudioToServer(audioBlob);
          stream.getTracks().forEach((track) => track.stop());
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Microphone access error:", err);
        alert(
          "Could not access microphone. Please grant permission and try again.",
        );
      }
    }
  };

  const sendAudioToServer = (audioBlob) => {
    setIsProcessingVoice(true); // --- NEW: Start loading
    const formData = new FormData();
    formData.append("audio", audioBlob, "voice-command.webm");
    formData.append("socketId", socket.id);

    fetch("/upload-audio", { method: "POST", body: formData }).catch((err) => {
      console.error("Error uploading audio:", err);
      setIsProcessingVoice(false); // --- NEW: Stop loading on fetch error
    });
  };

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

        <div className="header-controls">
          {/* --- NEW: Conditional rendering for mic/loader --- */}
          {isProcessingVoice ? (
            <LoadingIcon />
          ) : (
            <button
              onClick={handleMicClick}
              className="mic-button"
              title="Record Voice Command"
              disabled={isProcessingVoice}
            >
              <MicIcon isRecording={isRecording} />
            </button>
          )}
          <button id="logout" onClick={logout}>
            LOGOUT
          </button>
        </div>
      </div>
      <div className="terminal-container" ref={terminalRef}></div>
    </div>
  );
}

export default Terminal;
