// netlify/functions/api.js
const serverless = require("serverless-http");
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const User = require("../../src/models/User"); 

dotenv.config();

const app = express();
app.use(express.json());

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
}));

// ----- Reuse a single Mongo connection -----
let conn = null;
async function connectDB() {
  if (conn) return conn;
  conn = mongoose.connect(process.env.MONGODB_URI)
    .then((m) => {
      console.log("Mongo connected");
      return m;
    })
    .catch((err) => {
      console.error("Mongo connection error:", err);
      throw err;
    });
  return conn;
}

app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (e) {
    res.status(500).json({ message: "DB connection failed", error: e.message });
  }
});

// Routes
app.get("/ping", (req, res) => res.send("pong"));

app.post("/register", async (req, res) => {
  const { username, email, password, firstName, lastName } = req.body;

  if (!username || !email || !password || !firstName || !lastName) {
    return res.status(400).json({ message: "Username, email, password, first name, and last name are required" });
  }

  try {
    const user = new User({ username, email, password, firstName, lastName });
    await user.save();
    res.json({ message: "User registered successfully", user });
  } catch (err) {
    if (err.code === 11000) {
      const duplicateField = Object.keys(err.keyPattern)[0];
      return res.status(400).json({ message: `${duplicateField} already exists` });
    }
    res.status(500).json({ message: "Error registering user", error: err.message });
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ message: "Username and password are required" });

  const user = await User.findOne({ username });
  if (!user || user.password !== password)
    return res.status(401).json({ message: "Invalid username or password" });

  res.json({ message: "Login successful", user });
});

// PUT /update
app.put("/update", async (req, res) => {
  const { username, firstName, lastName } = req.body;

  if (!firstName || !lastName) {
    return res.status(400).json({ message: "Both first name and last name are required" });
  }

  const user = await User.findOne({ username });
  user.firstName = firstName;
  user.lastName = lastName;
  await user.save();
  res.json({ message: "Name change successful", user});
});

// PUT /update/bio
app.put("/update/bio", async (req, res) => {
  const { username, bio} = req.body;

  const user = await User.findOne({ username });
  user.bio = bio;
  await user.save();
  res.json({ message: "Bio updated successfully", user});
});

// PUT /update/meetings
app.put("/update/meetings", async (req, res) => {
  const { username, meeting} = req.body;

  const user = await User.findOne({ username });
  user.meetings.push(meeting);
  await user.save();
  res.json({ message: "Meeting added successfully", user});
  console.log("MEETING ADDED");
});

module.exports.handler = serverless(app, {
  basePath: "/.netlify/functions/api",
});
