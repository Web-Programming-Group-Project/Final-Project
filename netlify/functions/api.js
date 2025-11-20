// netlify/functions/api.js
const serverless = require("serverless-http");
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const User = require("../../src/models/User"); 
const Meeting = require("../../src/models/Meeting");

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

function makeCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

async function getMeetingByCode(code) {
  return Meeting.findOne({ code: (code || "").toUpperCase() });
}

app.get("/meetings", async (_req, res) => {
  const meetings = await Meeting.find({}, { title: 1, code: 1, createdAt: 1 }).sort({ createdAt: -1 });
  res.json({ meetings });
});

app.post("/meetings", async (req, res) => {
  const { title, username } = req.body || {};
  if (!title || !username) return res.status(400).json({ message: "title and username are required" });

  let code = makeCode();
  for (let i = 0; i < 5; i++) {
    const exists = await Meeting.findOne({ code });
    if (!exists) break;
    code = makeCode();
  }

  const meeting = new Meeting({
    title,
    code,
    participants: [{ username, role: "chair" }],
  });

  await meeting.save();
  res.json({ meeting });
});

app.get("/meetings/:code", async (req, res) => {
  const mtg = await getMeetingByCode(req.params.code);
  if (!mtg) return res.status(404).json({ message: "Meeting not found" });
  res.json({ meeting: mtg });
});

app.post("/meetings/:code/join", async (req, res) => {
  const { username } = req.body || {};
  if (!username) return res.status(400).json({ message: "username required" });

  const mtg = await getMeetingByCode(req.params.code);
  if (!mtg) return res.status(404).json({ message: "Meeting not found" });

  const already = mtg.participants.find(p => p.username === username);
  if (!already) mtg.participants.push({ username, role: "member" });

  await mtg.save();
  res.json({ meeting: mtg });
});

app.post("/meetings/:code/motions", async (req, res) => {
  const { username, text } = req.body || {};
  if (!username || !text) return res.status(400).json({ message: "username and text required" });

  const mtg = await getMeetingByCode(req.params.code);
  if (!mtg) return res.status(404).json({ message: "Meeting not found" });

  mtg.motions.push({ proposer: username, text });
  await mtg.save();
  const motion = mtg.motions[mtg.motions.length - 1];
  res.json({ motion });
});

app.post("/meetings/:code/motions/:motionId/vote", async (req, res) => {
  const { username, vote } = req.body || {};
  if (!username || !["up", "down"].includes(vote)) {
    return res.status(400).json({ message: "username and vote ('up'|'down') required" });
  }

  const mtg = await getMeetingByCode(req.params.code);
  if (!mtg) return res.status(404).json({ message: "Meeting not found" });

  const motion = mtg.motions.id(req.params.motionId);
  if (!motion) return res.status(404).json({ message: "Motion not found" });

  const prev = motion.voterMap.get(username);
  if (prev !== vote) {
    if (prev === "up")   motion.votes.up--;
    if (prev === "down") motion.votes.down--;
    motion.voterMap.set(username, vote);
    if (vote === "up")   motion.votes.up++;
    if (vote === "down") motion.votes.down++;
  }

  await mtg.save();
  res.json({ motion });
});

app.post("/meetings/:code/messages", async (req, res) => {
  const { username, text, motionId } = req.body || {};
  if (!username || !text) return res.status(400).json({ message: "username and text required" });

  const mtg = await getMeetingByCode(req.params.code);
  if (!mtg) return res.status(404).json({ message: "Meeting not found" });

  mtg.messages.push({ author: username, text, motionId: motionId || null });
  await mtg.save();

  const message = mtg.messages[mtg.messages.length - 1];
  res.json({ message });
});

module.exports.handler = serverless(app, {
  basePath: "/.netlify/functions/api",
});
