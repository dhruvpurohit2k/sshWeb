require("dotenv").config();
const express = require("express");
const path = require("path");
const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");
const http = require("http");
const { Server } = require("socket.io");
const { Client } = require("ssh2");
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 8080;
const PYTHON_SERVER_URL = "http://localhost:8000/voice-to-command"; // Your FastAPI URL
const saltRounds = 10;
const buildPath = path.join(__dirname, "..", "frontend", "dist");

// Setup for temporary audio file storage in a dedicated folder
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
const upload = multer({ dest: uploadDir });

const dbPool = mysql.createPool({
  host: "localhost",
  user: process.env.MYSQL_USERNAME,
  password: process.env.MYSQL_PASSWORD,
  database: "sshweb",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const activeSessions = new Map();

app.use(express.static(buildPath));
app.use(express.json());

app.get("/", (req, res) => {
  res.sendFile(path.join(buildPath, "index.html"));
});

// --- Existing User and Login Routes (no changes) ---
app.post("/createUser", async (req, res) => {
  const {
    "new-user": username,
    "new-host": host,
    password,
    ssh: sshkey,
  } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const sqlQuery = `
      INSERT INTO users (name, ip, password, sshkey) 
      VALUES (?, ?, ?, ?);
    `;
    const values = [username, host, hashedPassword, sshkey];
    const [result] = await dbPool.execute(sqlQuery, values);
    console.log(`User created with ID: ${result.insertId}`);
    return res.status(201).json({
      message: "USER_CREATED",
      userId: result.insertId,
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      console.log(`Failed attempt to create existing user: ${username}`);
      return res.status(409).json({ message: "USERNAME_TAKEN" });
    }
    console.error("Database error:", error);
    return res
      .status(500)
      .json({ message: "An error occurred on the server." });
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "FIELD_INCOMPLETE" });
  }
  try {
    const findUserQuery = "SELECT * FROM users WHERE name = ?";
    const [rows] = await dbPool.execute(findUserQuery, [username]);
    if (rows.length === 0) {
      console.log(`Login failed for user (not found): ${username}`);
      return res.status(401).json({ message: "INVALID_USERNAME" });
    }

    const user = rows[0];
    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      console.log(`Login failed for user (wrong password): ${username}`);
      return res.status(401).json({ message: "INVALID_PASSWORD" });
    }

    console.log(`User logged in successfully: ${username}`);
    return res.status(200).json({
      message: "Login successful!",
      user: {
        uid: user.uID,
        name: user.name,
        ip: user.ip,
        sshkey: user.sshkey,
      },
    });
  } catch (error) {
    console.error("Login database error:", error);
    return res
      .status(500)
      .json({ message: "An error occurred on the server." });
  }
});

app.post("/upload-audio", upload.single("audio"), async (req, res) => {
  const socketId = req.body.socketId;
  if (!req.file) {
    return res.status(400).send({ message: "No audio file uploaded." });
  }
  if (!socketId || !io.sockets.sockets.has(socketId)) {
    return res.status(400).send({ message: "Client session not found." });
  }

  const filePath = req.file.path;

  try {
    const form = new FormData();
    form.append("file", fs.createReadStream(filePath), req.file.originalname);

    const response = await axios.post(PYTHON_SERVER_URL, form, {
      headers: form.getHeaders(),
    });

    const { command } = response.data;
    io.to(socketId).emit("command-from-voice", { command });

    res.status(200).json({ message: "Command processed." });
  } catch (error) {
    console.error("Error forwarding audio to Python:", error.message);
    io.to(socketId).emit("voice-error", {
      message: "Failed to process voice command.",
    });
    res.status(500).send({ message: "Error processing audio." });
  } finally {
    fs.unlink(filePath, (err) => {
      if (err) console.error("Failed to delete temp audio file:", err);
    });
  }
});

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on("start-ssh", (config) => {
    const conn = new Client();
    conn
      .on("ready", () => {
        conn.shell((err, stream) => {
          if (err) return socket.emit("ssh-error", { error: err.message });
          activeSessions.set(socket.id, { conn, stream });
          socket.emit("ssh-ready", { sessionId: socket.id });
          stream.on("data", (data) => {
            socket.emit("terminal-output", data.toString("utf-8"));
          });
          stream.on("close", () => {
            socket.emit("ssh-closed");
            conn.end();
          });
        });
      })
      .on("error", (err) => {
        socket.emit("ssh-error", { error: err.message });
      })
      .connect({
        host: config.host,
        username: config.username,
        privateKey: config.sshkey,
        port: 22,
      });
  });

  socket.on("terminal-input", ({ command }) => {
    const session = activeSessions.get(socket.id);
    if (session && session.stream) {
      session.stream.write(command);
    }
  });

  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);
    const session = activeSessions.get(socket.id);
    if (session) {
      session.conn.end();
      activeSessions.delete(socket.id);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
