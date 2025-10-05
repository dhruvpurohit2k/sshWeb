// server.js

require("dotenv").config();
const express = require("express");
const path = require("path");
const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");
const http = require("http");
const { Server } = require("socket.io");
const { Client } = require("ssh2");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for simplicity
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 8080;
const saltRounds = 10;
const buildPath = path.join(__dirname, "..", "frontend", "dist");
const dbPool = mysql.createPool({
  host: "localhost",
  user: process.env.MYSQL_USERNAME,
  password: process.env.MYSQL_PASSWORD,
  database: "sshweb",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Store active SSH connections, mapping socket.id to the connection
const activeSessions = new Map();

app.use(express.static(buildPath));
app.use(express.json());

app.get("/", (req, res) => {
  res.sendFile(path.join(buildPath, "index.html"));
});

// --- YOUR EXISTING /createUser and /login ROUTES GO HERE ---
// (No changes needed for these routes)

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

// =================================================================
// ===== NEW: SOCKET.IO AND SSH CONNECTION HANDLING ================
// =================================================================

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // 1. Listen for the client to request an SSH session
  socket.on("start-ssh", (config) => {
    const conn = new Client();

    conn
      .on("ready", () => {
        // SSH connection successful, open a shell
        conn.shell((err, stream) => {
          if (err) {
            return socket.emit("ssh-error", { error: err.message });
          }

          // Store the connection and its stream
          activeSessions.set(socket.id, { conn, stream });

          // Notify the client that SSH is ready
          socket.emit("ssh-ready", { sessionId: socket.id });

          // Bridge SSH output to the WebSocket
          stream.on("data", (data) => {
            socket.emit("terminal-output", data.toString("utf-8"));
          });

          // Handle SSH stream closure
          stream.on("close", () => {
            console.log(`SSH Stream for ${socket.id} closed.`);
            socket.emit("ssh-closed");
            conn.end();
          });
        });
      })
      .on("error", (err) => {
        console.error(`SSH Error for ${socket.id}:`, err.message);
        socket.emit("ssh-error", { error: err.message });
      })
      .connect({
        host: config.host,
        username: config.username,
        privateKey: config.sshkey,
        port: 22,
      });
  });

  // 2. Listen for input from the client's terminal
  socket.on("terminal-input", ({ command }) => {
    const session = activeSessions.get(socket.id);
    if (session && session.stream) {
      session.stream.write(command);
    }
  });

  // 3. Handle disconnection (triggered by logout or closing the browser)
  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);
    const session = activeSessions.get(socket.id);
    if (session) {
      session.conn.end(); // Close the SSH connection
      activeSessions.delete(socket.id); // Clean up the map
      console.log(`Cleaned up SSH session for ${socket.id}`);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
