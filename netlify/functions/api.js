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

function getUserRole(meeting, username) {
  const participant = meeting?.participants?.find((p) => p.username === username);
  return participant ? participant.role : null;
}

async function addOrUpdateParticipant({ code, username, displayName, defaultRole = "member" }) {
  const normalizedCode = (code || "").toUpperCase();
  if (!normalizedCode) throw new Error("Meeting code required");

  const mtg = await getMeetingByCode(normalizedCode);
  if (!mtg) return { meeting: null, participant: null };

  const normalizedDisplay = (displayName || "").trim() || username;
  let participant = mtg.participants.find((p) => p.username === username);

  if (!participant) {
    participant = {
      username,
      role: defaultRole,
      displayName: normalizedDisplay,
    };
    mtg.participants.push(participant);
  } else if (normalizedDisplay && participant.displayName !== normalizedDisplay) {
    participant.displayName = normalizedDisplay;
  }

  await mtg.save();
  return { meeting: mtg, participant };
}

app.post("/meetings", async (req, res) => {
  const { title, username } = req.body || {};
  if (!title || !username) {
    return res.status(400).json({ message: "title and username are required" });
  }

  try {
    const creatorDisplayName = (req.body.displayName || "").trim() || username;
    let code = makeCode();
    for (let i = 0; i < 5; i++) {
      const exists = await Meeting.findOne({ code });
      if (!exists) break;
      code = makeCode();
    }

    const meeting = new Meeting({
      title,
      code,
      open: true,
      creator: username,
      participants: [{ username, role: "owner", displayName: creatorDisplayName }],
    });

    await meeting.save();
    res.status(201).json({ message: "Meeting created", meeting });
  } catch (err) {
    console.error("Error creating meeting", err);
    res.status(500).json({ message: "Error creating meeting", error: err.message });
  }
});

app.get("/meetings", async (req, res) => {
  const username = (req.query.username || "").trim();
  const view = (req.query.view || "my").toLowerCase();
  if (!username) return res.status(400).json({ message: "username required" });

  try {
    const baseQuery = { "participants.username": username };
    const projection = "title code createdAt updatedAt participants creator";
    if (view === "recent") {
      const meetings = await Meeting.find(baseQuery)
        .sort({ updatedAt: -1 })
        .limit(10)
        .select(projection)
        .lean();

      const withOwner = meetings.map((meeting) => ({
        ...meeting,
        owner:
          meeting.creator ||
          (meeting.participants || []).find((p) => p.role === "owner" || p.role === "chair")?.username ||
          "Unknown",
      }));

      return res.json({ meetings: withOwner });
    }

    const meetings = await Meeting.find(baseQuery)
      .sort({ createdAt: -1 })
      .select(projection)
      .lean();
    res.json({ meetings });
  } catch (err) {
    console.error("Error fetching meetings", err);
    res.status(500).json({ message: "Error fetching meetings", error: err.message });
  }
});

app.get("/meetings/:code", async (req, res) => {
  const mtg = await getMeetingByCode(req.params.code);
  if (!mtg) return res.status(404).json({ message: "Meeting not found" });
  res.json({ meeting: mtg });
});

app.post("/meetings/join", async (req, res) => {
  const { code, displayName, username } = req.body || {};
  if (!code || !username) {
    return res.status(400).json({ message: "code and username are required" });
  }

  try {
    const { meeting, participant } = await addOrUpdateParticipant({
      code,
      username,
      displayName,
      defaultRole: "member",
    });
    if (!meeting) return res.status(404).json({ message: "Meeting not found" });

    const role = participant?.role || "member";
    const name = participant?.displayName || username;
    res.json({ meeting, role, displayName: name });
  } catch (err) {
    console.error("Error joining meeting", err);
    res.status(500).json({ message: "Error joining meeting", error: err.message });
  }
});

app.post("/meetings/:code/join", async (req, res) => {
  const { username, displayName, code: bodyCode } = req.body || {};
  if (!username) return res.status(400).json({ message: "username required" });

  const code = req.params.code || bodyCode;
  if (!code) return res.status(400).json({ message: "meeting code required" });

  try {
    const { meeting, participant } = await addOrUpdateParticipant({
      code,
      username,
      displayName,
      defaultRole: "member",
    });
    if (!meeting) return res.status(404).json({ message: "Meeting not found" });

    res.json({
      message: "Joined meeting",
      meeting,
      role: participant?.role || "member",
      displayName: participant?.displayName || username,
    });
  } catch (err) {
    console.error("Error joining meeting", err);
    res.status(500).json({ message: "Error joining meeting", error: err.message });
  }
});

app.post("/meetings/:code/motions", async (req, res) => {
  const { username } = req.body || {};
  const rawTitle = (req.body?.motionTitle ?? req.body?.title ?? "").trim();
  const rawDescription = (req.body?.motionDescription ?? req.body?.description ?? "").trim();
  const rawLegacyText = (req.body?.motionText ?? req.body?.text ?? "").trim();
  const motionTypeInput = req.body?.motionType ?? req.body?.type;
  const votingModeInput = (req.body?.votingMode || "").toLowerCase();

  const motionType = motionTypeInput === "procedural" || motionTypeInput === "procedure" ? "procedure" : "standard";
  const requiredPercentage = motionType === "procedure" ? 66 : 50;
  const title = rawTitle || rawLegacyText;
  const votingMode = votingModeInput === "anonymous" ? "anonymous" : "named";

  if (!username || !title) return res.status(400).json({ message: "username and motion title are required" });

  const mtg = await getMeetingByCode(req.params.code);
  if (!mtg) return res.status(404).json({ message: "Meeting not found" });

  mtg.motions.push({
    proposer: username,
    title,
    description: rawDescription || undefined,
    text: rawLegacyText || title,
    type: motionType,
    requiredPercentage,
    status: "open",
    outcome: "pending",
    votes: { up: 0, down: 0 },
    votingMode,
    anonymousVotedUsers: [],
  });

  const motion = mtg.motions[mtg.motions.length - 1];

  await mtg.save();
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
  if (motion.status === "closed") {
    return res.status(400).json({ message: "Voting is closed for this motion." });
  }

  const votingMode = motion.votingMode || "named";
  if (votingMode === "anonymous") {
    motion.anonymousVotedUsers = motion.anonymousVotedUsers || [];
    if (motion.anonymousVotedUsers.includes(username)) {
      return res.status(400).json({ message: "You have already voted on this motion." });
    }
    motion.anonymousVotedUsers.push(username);
    if (vote === "up") {
      motion.votes.up = (motion.votes?.up || 0) + 1;
    } else if (vote === "down") {
      motion.votes.down = (motion.votes?.down || 0) + 1;
    }
  } else {
    if (!motion.voterMap) {
      motion.voterMap = new Map();
    }
    const prev = motion.voterMap.get(username);
    if (prev !== vote) {
      if (prev === "up") motion.votes.up--;
      if (prev === "down") motion.votes.down--;
      motion.voterMap.set(username, vote);
      if (vote === "up") motion.votes.up++;
      if (vote === "down") motion.votes.down++;
    }
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

async function closeMotionRoute(req, res) {
  const { username } = req.body || {};
  if (!username) return res.status(400).json({ message: "username required" });

  const mtg = await getMeetingByCode(req.params.code);
  if (!mtg) return res.status(404).json({ message: "Meeting not found" });

  const role = getUserRole(mtg, username);
  if (!["owner", "chair"].includes(role)) {
    return res.status(403).json({ message: "Only the chair/owner can close a motion" });
  }

  const motion = mtg.motions.id(req.params.motionId);
  if (!motion) return res.status(404).json({ message: "Motion not found" });
  if (motion.status === "closed") {
    return res.json({ message: "Motion already closed", motion });
  }

  const up = motion.votes?.up || 0;
  const down = motion.votes?.down || 0;
  const total = up + down;
  const required = motion.requiredPercentage || (motion.type === "procedure" ? 66 : 50);
  const yesPercentage = total === 0 ? 0 : (up / total) * 100;
  const passed = yesPercentage >= required;

  motion.status = "closed";
  motion.outcome = passed ? "passed" : "failed";
  motion.closedAt = new Date();
  motion.updatedAt = new Date();

  const displayTitle = motion.title || motion.text || "Untitled motion";
  const summary = `${motion.type === "procedure" ? "Procedural motion" : "Motion"} "${displayTitle}" ${passed ? "PASSED" : "FAILED"} (${up} in favor, ${down} against; required ${required}%, got ${Math.round(yesPercentage)}% — ${ (motion.votingMode || "named") === "anonymous" ? "anonymous vote" : "named vote" }).`;

  mtg.messages.push({
    author: "System",
    text: summary,
    motionId: motion._id,
  });

  await mtg.save();
  res.json({ message: "Motion voting closed", motion });
}

app.post("/meetings/:code/motions/:motionId/close", closeMotionRoute);
app.patch("/meetings/:code/motions/:motionId/close", closeMotionRoute);

async function openMotionRoute(req, res) {
  const { username } = req.body || {};
  if (!username) return res.status(400).json({ message: "username required" });

  const mtg = await getMeetingByCode(req.params.code);
  if (!mtg) return res.status(404).json({ message: "Meeting not found" });

  const role = getUserRole(mtg, username);
  if (!["owner", "chair"].includes(role)) {
    return res.status(403).json({ message: "Only owners or chairs can reopen voting." });
  }

  const motion = mtg.motions.id(req.params.motionId);
  if (!motion) return res.status(404).json({ message: "Motion not found" });

  motion.status = "open";
  motion.outcome = "pending";
  motion.closedAt = null;
  motion.updatedAt = new Date();
  await mtg.save();
  res.json({ motion });
}

app.post("/meetings/:code/motions/:motionId/open", openMotionRoute);
app.patch("/meetings/:code/motions/:motionId/open", openMotionRoute);

app.post("/meetings/:meetingId/motions/:motionId/replies", async (req, res) => {
  const { meetingId, motionId } = req.params;
  const { text, stance, username, displayName } = req.body || {};

  if (!username) return res.status(400).json({ message: "username is required" });
  const trimmed = (text || "").trim();
  if (!trimmed) return res.status(400).json({ message: "Reply text is required" });

  const allowedStances = ["pro", "con", "neutral"];
  const normalizedStance = allowedStances.includes(stance) ? stance : "neutral";

  try {
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) return res.status(404).json({ message: "Meeting not found" });

    const motion = meeting.motions.id(motionId);
    if (!motion) return res.status(404).json({ message: "Motion not found" });

    motion.replies.push({
      authorUsername: username,
      authorDisplayName: displayName || username,
      stance: normalizedStance,
      text: trimmed,
      createdAt: new Date(),
    });

    await meeting.save();
    res.json({ motion });
  } catch (err) {
    console.error("Error adding motion reply", err);
    res.status(500).json({ message: "Error adding reply", error: err.message });
  }
});

app.patch("/meetings/:meetingId/participants/:participantUsername/role", async (req, res) => {
  const { meetingId, participantUsername } = req.params;
  const { newRole, username } = req.body || {};
  const allowedRoles = ["owner", "chair", "member", "observer"];

  if (!username || !participantUsername || !meetingId || !newRole) {
    return res.status(400).json({ message: "meetingId, participantUsername, username, and newRole are required" });
  }
  if (!allowedRoles.includes(newRole)) {
    return res.status(400).json({ message: "Invalid role" });
  }

  try {
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) return res.status(404).json({ message: "Meeting not found" });

    const actor = meeting.participants.find((p) => p.username === username);
    if (!actor || actor.role !== "owner") {
      return res.status(403).json({ message: "Only owners can change roles" });
    }

    const target = meeting.participants.find((p) => p.username === participantUsername);
    if (!target) return res.status(404).json({ message: "Participant not found" });

    if (target.username === username && newRole !== "owner") {
      return res.status(400).json({ message: "Owner cannot change their own role" });
    }

    target.role = newRole;
    await meeting.save();
    res.json({ meeting });
  } catch (err) {
    console.error("Error updating role", err);
    res.status(500).json({ message: "Error updating role", error: err.message });
  }
});

module.exports.handler = serverless(app, {
  basePath: "/.netlify/functions/api",
});
