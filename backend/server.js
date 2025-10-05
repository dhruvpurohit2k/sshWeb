require("dotenv").config();
const express = require("express");
const path = require("path");
const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");

const app = express();
const json = express.json();

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
app.use(express.static(buildPath));
app.use(express.json());

app.get("/", (req, res) => {
  res.sendFile(path.join(buildPath, "index.html"));
});

app.post("/createUser", async (req, res) => {
  const {
    "new-user": username,
    "new-host": host,
    password,
    ssh: sshkey,
  } = req.body;
  try {
    // 3. Securely hash the password
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 4. Prepare and execute the SQL INSERT query
    // We use placeholders (?) to prevent SQL injection attacks.
    const sqlQuery = `
      INSERT INTO users (name, ip, password, sshkey) 
      VALUES (?, ?, ?, ?);
    `;

    const values = [username, host, hashedPassword, sshkey];

    // Get a connection from the pool and execute the query
    const [result] = await dbPool.execute(sqlQuery, values);

    console.log(`User created with ID: ${result.insertId}`);

    // 5. Send a success response
    // Status 201 means "Created"
    return res.status(201).json({
      message: "USER_CREATED",
      userId: result.insertId,
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      console.log(`Failed attempt to create existing user: ${username}`);
      // Status 409 means "Conflict". This matches your frontend logic.
      return res.status(409).json({ message: "USERNAME_TAKEN" });
    }

    // For any other errors, log them and send a generic server error response.
    console.error("Database error:", error);
    return res
      .status(500)
      .json({ message: "An error occurred on the server." });
  }
});

app.post("/login", async (req, res) => {
  // 1. Extract username and password from the request body
  const { username, password } = req.body;
  // 2. Server-side validation
  if (!username || !password) {
    return res.status(400).json({ message: "FIELD_INCOMPLETE" });
  }
  try {
    // 3. Find the user in the database by their username (the 'name' column)
    const findUserQuery = "SELECT * FROM users WHERE name = ?";
    const [rows] = await dbPool.execute(findUserQuery, [username]);
    // 4. Check if a user was found
    if (rows.length === 0) {
      console.log(`Login failed for user (not found): ${username}`);
      return res.status(401).json({ message: "INVALID_USERNAME" });
    }

    const user = rows[0]; // The user record from the database

    // 5. Compare the provided password with the stored hash
    // bcrypt.compare handles everything securely.
    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      // Password does not match
      console.log(`Login failed for user (wrong password): ${username}`);
      return res.status(401).json({ message: "INVALID_PASSWORD" });
    }

    console.log(`User logged in successfully: ${username}`);

    // For a real app, you would generate a session token (like a JWT) here.
    // For now, we'll send a success message and the user's data (without the password).
    return res.status(200).json({
      message: "Login successful!",
      user: {
        uid: user.uID,
        name: user.name,
        ip: user.ip,
        // DO NOT send the password hash back to the client
      },
    });
  } catch (error) {
    console.error("Login database error:", error);
    return res
      .status(500)
      .json({ message: "An error occurred on the server." });
  }
});

app.listen(PORT, () => {
  console.log("NODE SERVER RUNNING");
});
