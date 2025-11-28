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

function sanitizeForFilename(value) {
  const safe = (value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return safe || "meeting";
}

function getMotionSubTypeValue(motion) {
  const raw =
    motion?.subMotionType ||
    motion?.subType ||
    (motion?.isOverturn ? "overturn" : "none");
  return (raw || "none").toLowerCase();
}

const SPECIAL_MOTION_RULES = {
  adjourn: {
    label: "Adjourn meeting",
    needsVote: true,
    threshold: 0.5,
    allowDiscussion: false,
  },
  closeDebate: {
    label: "Close debate (Previous Question)",
    needsVote: true,
    threshold: 2 / 3,
    allowDiscussion: false,
  },
};

function thresholdToPercentage(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  const percent = value <= 1 ? value * 100 : value;
  return Math.round(percent * 100) / 100;
}

function isMeetingAdjourned(meeting) {
  if (!meeting) return false;
  return Boolean(meeting.adjourned || meeting.open === false);
}

const MEETING_ADJOURNED_MESSAGE = "Meeting has been adjourned. No further changes are allowed.";

function guardAdjournedMeeting(meeting, res) {
  if (isMeetingAdjourned(meeting)) {
    res.status(400).json({ message: MEETING_ADJOURNED_MESSAGE });
    return true;
  }
  return false;
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
    if (guardAdjournedMeeting(meeting, res)) return;
    if (guardAdjournedMeeting(meeting, res)) return;

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
  const motionTypeInput = (req.body?.motionType ?? req.body?.type ?? "").toLowerCase();
  const votingModeInput = (req.body?.votingMode || "").toLowerCase();
  const subTypeInput = (req.body?.subType || req.body?.motionSubType || "none").toLowerCase();
  const motionCategoryInput = (req.body?.motionCategory || "").toLowerCase();
  const specialMotionTypeInputRaw = (req.body?.specialMotionType || "").trim();
  const specialMotionTypeInput = Object.keys(SPECIAL_MOTION_RULES).find(
    (key) => key.toLowerCase() === specialMotionTypeInputRaw.toLowerCase()
  );
  const parentMotionId = req.body?.parentMotionId || req.body?.targetMotionId || null;
  const postponeUntil = (req.body?.postponeUntil || "").trim();

  const isSpecialMotion = motionCategoryInput === "special";
  const specialRule = isSpecialMotion ? SPECIAL_MOTION_RULES[specialMotionTypeInput] : null;
  const allowedSubTypes = ["none", "overturn", "revise", "postpone"];
  const normalizedSubType = allowedSubTypes.includes(subTypeInput) ? subTypeInput : "none";
  const isSubMotion = normalizedSubType !== "none";
  if (isSpecialMotion && isSubMotion) {
    return res.status(400).json({ message: "Special motions cannot be raised as sub-motions." });
  }
  const motionTypeIsProcedural =
    isSubMotion || motionTypeInput === "procedural" || motionTypeInput === "procedure";
  let motionType = motionTypeIsProcedural ? "procedure" : "standard";
  if (isSpecialMotion) {
    motionType = "procedure";
  }
  let requiredPercentage = motionType === "procedure" ? 66 : 50;
  if (isSpecialMotion) {
    if (!specialRule) {
      return res.status(400).json({ message: "Invalid special motion type." });
    }
    requiredPercentage = specialRule.needsVote
      ? thresholdToPercentage(specialRule.threshold) ?? 50
      : 0;
  }
  let title = rawTitle || rawLegacyText;
  if (isSpecialMotion && !title) {
    title = specialRule.label;
  }
  const votingMode = isSpecialMotion
    ? "named"
    : votingModeInput === "anonymous"
    ? "anonymous"
    : "named";

  if (!username || !title) return res.status(400).json({ message: "username and motion title are required" });

  const mtg = await getMeetingByCode(req.params.code);
  if (!mtg) return res.status(404).json({ message: "Meeting not found" });
  if (guardAdjournedMeeting(mtg, res)) return;
  const participantRole = getUserRole(mtg, username);
  if (!participantRole) {
    return res.status(403).json({ message: "You must be a participant of this meeting to raise motions." });
  }

  let parentMotion = null;
  if (["revise", "postpone"].includes(normalizedSubType)) {
    if (!parentMotionId) {
      return res
        .status(400)
        .json({ message: "parentMotionId is required for revise/postpone sub-motions." });
    }
    parentMotion = mtg.motions.id(parentMotionId);
    if (!parentMotion) {
      return res.status(404).json({ message: "Parent motion not found" });
    }
    if ((parentMotion.outcome || "").toLowerCase() === "postponed") {
      return res.status(400).json({ message: "Cannot revise or postpone an already postponed motion." });
    }
  }

  const isOverturn = normalizedSubType === "overturn";
  let motionCategory = "standard";
  if (isSpecialMotion) {
    motionCategory = "special";
  } else if (isSubMotion) {
    motionCategory = "submotion";
  } else if (motionType === "procedure") {
    motionCategory = "procedural";
  }
  const motionPayload = {
    proposer: username,
    title,
    description: rawDescription || undefined,
    text: rawLegacyText || title,
    type: motionType,
    motionCategory,
    specialMotionType: isSpecialMotion ? specialMotionTypeInput : undefined,
    requiredPercentage,
    status: "open",
    outcome: "pending",
    votes: { up: 0, down: 0 },
    votingMode,
    anonymousVotedUsers: [],
    allowDiscussion: isSpecialMotion ? specialRule.allowDiscussion !== false : true,
    isOverturn,
    subType: normalizedSubType,
    subMotionType: normalizedSubType,
    parentMotionId: parentMotion ? parentMotion._id : null,
    postponeUntil: normalizedSubType === "postpone" ? postponeUntil : "",
  };

  mtg.motions.push(motionPayload);

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
  const motionCategory = (motion.motionCategory || "").toLowerCase();
  if (motionCategory === "special") {
    const specialRule = SPECIAL_MOTION_RULES[motion.specialMotionType] || null;
    if (!specialRule || specialRule.needsVote === false) {
      return res.status(400).json({ message: "This special motion is decided by the chair and does not accept votes." });
    }
  }
  if (motion.status === "closed") {
    return res.status(400).json({ message: "Voting is closed for this motion." });
  }
  if ((motion.outcome || "").toLowerCase() === "postponed") {
    return res.status(400).json({ message: "Voting is postponed for this motion." });
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
function getNamedVote(motion, username) {
  if (!motion || !username) return null;
  const voterMap = motion.voterMap;
  if (!voterMap) return null;
  if (typeof voterMap.get === "function") {
    return voterMap.get(username);
  }
  return voterMap[username] || null;
}

app.post("/meetings/:meetingId/motions/overturn", async (req, res) => {
  const { meetingId } = req.params;
  const { username, targetMotionId, title, description, motionType, votingMode } = req.body || {};
  if (!meetingId || !username || !targetMotionId || !title) {
    return res.status(400).json({ message: "meetingId, username, title, and targetMotionId are required" });
  }

  const meeting = await Meeting.findById(meetingId);
  if (!meeting) return res.status(404).json({ message: "Meeting not found" });
  if (guardAdjournedMeeting(meeting, res)) return;

  const targetMotion = meeting.motions.id(targetMotionId);
  if (!targetMotion) {
    return res.status(404).json({ message: "Target motion not found" });
  }
  if (targetMotion.status !== "closed" || (targetMotion.outcome || "").toLowerCase() !== "passed") {
    return res.status(403).json({ message: "Only previously passed motions can be overturned." });
  }
  if ((targetMotion.votingMode || "named") !== "named") {
    return res.status(403).json({ message: "Only motions with named voting can be overturned." });
  }
  const voteChoice = getNamedVote(targetMotion, username);
  if (voteChoice !== "up") {
    return res.status(403).json({ message: "Only members who voted in favor can move to overturn this decision." });
  }
  if (targetMotion.overturnedByMotionId) {
    return res.status(403).json({ message: "This decision has already been overturned." });
  }

  const normalizedType =
    motionType === "procedure" || motionType === "procedural" ? "procedure" : "standard";
  const overturnMotion = {
    proposer: username,
    title: title.trim(),
    description: (description || "").trim(),
    text: (description || title || "").trim() || title.trim(),
    type: normalizedType,
    requiredPercentage: normalizedType === "procedure" ? 66 : 50,
    votes: { up: 0, down: 0 },
    voterMap: {},
    votingMode: (votingMode || targetMotion.votingMode || "named").toLowerCase() === "anonymous" ? "anonymous" : "named",
    anonymousVotedUsers: [],
    status: "open",
    outcome: "pending",
    isOverturn: true,
    targetMotionId: targetMotion._id,
    overturnedByMotionId: null,
    subType: "overturn",
    subMotionType: "overturn",
    parentMotionId: targetMotion._id,
    postponeUntil: "",
  };

  meeting.motions.push(overturnMotion);
  const newMotion = meeting.motions[meeting.motions.length - 1];

  meeting.messages.push({
    author: "System",
    text: `${username} raised a motion to overturn the decision on "${targetMotion.title || targetMotion.text || "Untitled motion"}".`,
    motionId: newMotion._id,
  });

  await meeting.save();
  res.json({ meeting, motion: newMotion });
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
  const { username, decisionSummary, prosSummary, consSummary } = req.body || {};
  if (!username) return res.status(400).json({ message: "username required" });
  if (!decisionSummary || !decisionSummary.trim()) {
    return res.status(400).json({ message: "decisionSummary is required to close voting." });
  }

  const mtg = await getMeetingByCode(req.params.code);
  if (!mtg) return res.status(404).json({ message: "Meeting not found" });

  const role = getUserRole(mtg, username);
  if (!["owner", "chair"].includes(role)) {
    return res.status(403).json({ message: "Only the chair/owner can close a motion" });
  }

  const motion = mtg.motions.id(req.params.motionId);
  if (!motion) return res.status(404).json({ message: "Motion not found" });
  const closingMotionCategory = (motion.motionCategory || "").toLowerCase();
  const motionSpecialType = (motion.specialMotionType || "").toLowerCase();
  const isLegacyPointOfOrder =
    closingMotionCategory === "special" && motionSpecialType === "pointoforder";
  const closingSpecialRule =
    closingMotionCategory === "special" ? SPECIAL_MOTION_RULES[motion.specialMotionType] || null : null;
  if (isLegacyPointOfOrder || (closingSpecialRule && closingSpecialRule.needsVote === false)) {
    return res.status(400).json({ message: "This special motion is decided directly by the chair." });
  }
  if (motion.status === "closed") {
    return res.json({ message: "Motion already closed", motion });
  }

  const up = motion.votes?.up || 0;
  const down = motion.votes?.down || 0;
  const total = up + down;
  const required = motion.requiredPercentage || (motion.type === "procedure" ? 66 : 50);
  const yesPercentage = total === 0 ? 0 : (up / total) * 100;
  const passed = yesPercentage >= required;

  const closedTimestamp = new Date();
  motion.status = "closed";
  motion.outcome = passed ? "passed" : "failed";
  motion.closedAt = closedTimestamp;
  motion.updatedAt = closedTimestamp;
  motion.decisionSummary = decisionSummary || "";
  motion.prosSummary = prosSummary || "";
  motion.consSummary = consSummary || "";

  const displayTitle = motion.title || motion.text || "Untitled motion";
  const motionKindLabel = closingSpecialRule
    ? `Special motion (${closingSpecialRule.label || "Special"})`
    : motion.type === "procedure"
    ? "Procedural motion"
    : "Motion";
  let summary = `${motionKindLabel} "${displayTitle}" ${passed ? "PASSED" : "FAILED"} (${up} in favor, ${down} against; required ${required}%, got ${Math.round(yesPercentage)}% — ${ (motion.votingMode || "named") === "anonymous" ? "anonymous vote" : "named vote" }).`;
  if ((motion.decisionSummary || "").trim()) {
    summary += `\nSummary: ${motion.decisionSummary.trim()}`;
  }

  mtg.messages.push({
    author: "System",
    text: summary,
    motionId: motion._id,
  });

  const motionIsAdjournSpecial =
    (motion.motionCategory || "").toLowerCase() === "special" &&
    motion.specialMotionType === "adjourn";
  if (motionIsAdjournSpecial && passed && !mtg.adjourned) {
    mtg.adjourned = true;
    mtg.open = false;
    mtg.adjournedAt = closedTimestamp;
    mtg.messages.push({
      author: "System",
      text: `System: Meeting adjourned by motion "${displayTitle}".`,
      motionId: motion._id,
    });
  }

  const normalizedSubType = (motion.subType || motion.subMotionType || (motion.isOverturn ? "overturn" : "none")).toLowerCase();
  motion.subType = normalizedSubType;
  motion.subMotionType = normalizedSubType;

  if (normalizedSubType === "revise" && passed) {
    const parentMotion =
      motion.parentMotionId
        ? mtg.motions.id(motion.parentMotionId)
        : motion.targetMotionId
        ? mtg.motions.id(motion.targetMotionId)
        : null;
    if (parentMotion) {
      const oldTitle = parentMotion.title || parentMotion.text || "Untitled motion";
      const oldDescription = parentMotion.description || parentMotion.text || "";
      parentMotion.revisionHistory = parentMotion.revisionHistory || [];
      parentMotion.revisionHistory.push({
        at: new Date(),
        byMotionId: motion._id,
        oldTitle,
        oldDescription,
        newTitle: motion.title,
        newDescription: motion.description,
      });
      parentMotion.title = motion.title;
      parentMotion.description = motion.description;
      parentMotion.text = motion.text;
      parentMotion.updatedAt = new Date();
      parentMotion.wasRevised = true;
      parentMotion.revisedByMotionId = motion._id;
      const reviseMsg = `Motion "${oldTitle}" was REVISED by "${displayTitle}" (${up} in favor, ${down} against; required ${required}%).`;
      mtg.messages.push({
        author: "System",
        text: reviseMsg,
        motionId: motion._id,
      });
    }
  } else if (normalizedSubType === "postpone" && passed) {
    const parentMotion =
      motion.parentMotionId
        ? mtg.motions.id(motion.parentMotionId)
        : motion.targetMotionId
        ? mtg.motions.id(motion.targetMotionId)
        : null;
    if (parentMotion) {
      parentMotion.outcome = "postponed";
      parentMotion.status = "closed";
      parentMotion.postponeUntil = motion.postponeUntil || "";
      parentMotion.closedAt = new Date();
      parentMotion.updatedAt = new Date();
      const reasonText = motion.postponeUntil ? ` Reason: "${motion.postponeUntil}".` : "";
      const postponeMsg = `Decision on motion "${parentMotion.title || parentMotion.text || "Untitled motion"}" was POSTPONED (${up} in favor, ${down} against; required ${required}%).${reasonText}`;
      mtg.messages.push({
        author: "System",
        text: postponeMsg,
        motionId: motion._id,
      });
    }
  }

  if (motion.isOverturn && passed) {
    const targetMotion = mtg.motions.id(motion.targetMotionId);
    if (targetMotion) {
      const previousOutcome =
        targetMotion.originalOutcome ||
        targetMotion.outcome ||
        (targetMotion.status === "closed" ? targetMotion.outcome : "pending") ||
        "pending";
      if (!targetMotion.originalOutcome) {
        targetMotion.originalOutcome = previousOutcome;
      }
      targetMotion.outcome = "overturned";
      targetMotion.overturned = true;
      targetMotion.updatedAt = new Date();
      targetMotion.overturnedByMotionId = motion._id;
      const targetTitle = targetMotion.title || targetMotion.text || "Untitled motion";
      const overturnMsg = `The decision on "${targetTitle}" was OVERTURNED by motion "${displayTitle}" (${up} in favor, ${down} against).`;
      mtg.messages.push({
        author: "System",
        text: overturnMsg,
        motionId: motion._id,
      });
    }
  }

  await mtg.save();
  res.json({ message: "Motion voting closed", meeting: mtg, motion });
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

app.put("/meetings/:code/summary", async (req, res) => {
  const { username, meetingSummary } = req.body || {};
  if (!username) return res.status(400).json({ message: "username required" });

  const mtg = await getMeetingByCode(req.params.code);
  if (!mtg) return res.status(404).json({ message: "Meeting not found" });

  const role = getUserRole(mtg, username);
  if (!["owner", "chair"].includes(role)) {
    return res.status(403).json({ message: "Only the chair/owner can edit the meeting summary." });
  }

  mtg.meetingSummary = (meetingSummary || "").trim();
  await mtg.save();
  res.json({ meeting: mtg });
});

app.get("/meetings/:code/export", async (req, res) => {
  const mtg = await getMeetingByCode(req.params.code);
  if (!mtg) return res.status(404).json({ message: "Meeting not found" });

  const created = new Date(mtg.createdAt || Date.now()).toLocaleString();
  const summary = (mtg.meetingSummary || "").trim() || "No summary provided.";
  const participantLines = (mtg.participants || []).map(
    (p) => `- ${p.displayName || p.username} (${p.role})`
  );
  const safeName = sanitizeForFilename(mtg.title || mtg.code || "meeting");
  const minutesFilename = `${safeName}-minutes.txt`;

  const motions = mtg.motions || [];
  const motionMap = new Map(motions.map((motion) => [String(motion._id), motion]));
  const childrenByParent = new Map();
  const topLevelMotions = [];

  motions.forEach((motion) => {
    const subType = getMotionSubTypeValue(motion);
    const parentId = motion.parentMotionId || (subType === "overturn" ? motion.targetMotionId : null);
    if (subType !== "none" && parentId) {
      const key = String(parentId);
      if (!childrenByParent.has(key)) childrenByParent.set(key, []);
      childrenByParent.get(key).push(motion);
    } else {
      topLevelMotions.push(motion);
    }
  });

  const orphanChildren = [];
  childrenByParent.forEach((children, parentId) => {
    const parentExists = topLevelMotions.some((motion) => String(motion._id) === parentId);
    if (!parentExists) {
      orphanChildren.push(...children);
    }
  });

  function formatMainMotion(motion, idx) {
    const motionTitle = motion.title || motion.text || "Untitled motion";
    const required = motion.requiredPercentage || (motion.type === "procedure" ? 66 : 50);
    const up = motion.votes?.up || 0;
    const down = motion.votes?.down || 0;
    const motionCategory = (motion.motionCategory || "").toLowerCase();
    const specialRule =
      motionCategory === "special" ? SPECIAL_MOTION_RULES[motion.specialMotionType] || null : null;
    const motionSubType = getMotionSubTypeValue(motion);
    const isPostponed = (motion.outcome || "").toLowerCase() === "postponed";
    const overturnedByMotion =
      motion.overturnedByMotionId &&
      motionMap.get(String(motion.overturnedByMotionId));
    let outcomeDescription =
      motion.status === "closed"
        ? (motion.outcome || "pending").toUpperCase()
        : "PENDING";
    if (isPostponed) {
      outcomeDescription = `POSTPONED${
        motion.postponeUntil ? ` (until "${motion.postponeUntil}")` : ""
      }`;
    } else if (
      motion.overturned ||
      (motion.outcome || "").toLowerCase() === "overturned" ||
      overturnedByMotion
    ) {
      const previousOutcome = (motion.originalOutcome || outcomeDescription).toUpperCase();
      const overTitle = overturnedByMotion?.title || overturnedByMotion?.text || "Overturn motion";
      outcomeDescription = `${previousOutcome} (later OVERTURNED by "${overTitle}")`;
    }
    const decisionSummary = (motion.decisionSummary || "").trim();
    const revisionHistory = motion.revisionHistory || [];
    const lastRevision =
      revisionHistory.length > 0 ? revisionHistory[revisionHistory.length - 1] : null;

    const primaryLine =
      specialRule && specialRule.needsVote === false
        ? `${idx + 1}. ${motionTitle} — ${outcomeDescription}.`
        : `${idx + 1}. ${motionTitle} — ${outcomeDescription}. Final tally: ${up} in favor, ${down} against.`;
    const lines = [primaryLine];
    if (specialRule) {
      lines.push(`   • Type: Special motion — ${specialRule.label}`);
      if (specialRule.needsVote !== false) {
        lines.push(`   • Requires ${required}%.`);
      } else {
        const decisionLabel = motion.chairDecision
          ? motion.chairDecision === "sustained"
            ? "Sustained"
            : "Denied"
          : "Pending chair ruling";
        lines.push(`   • Chair ruling: ${decisionLabel}.`);
      }
      if ((motion.description || "").trim()) {
        lines.push(`   • Description: ${motion.description.trim()}`);
      }
    } else {
      lines.push(`   • Type: ${motion.type || "standard"} (requires ${required}%)`);
    }
    if (decisionSummary) {
      lines.push(`   • Decision summary: ${decisionSummary}`);
    }
    if (motion.wasRevised && lastRevision) {
      lines.push(
        `   • Revised via procedural motion on ${new Date(
          lastRevision.at || Date.now()
        ).toLocaleString()}.`
      );
    }
    if ((motion.outcome || "").toLowerCase() === "overturned" && overturnedByMotion) {
      const overTitle = overturnedByMotion.title || overturnedByMotion.text || "Overturn motion";
      lines.push(`   • Overturned by: ${overTitle}`);
    }

    const childEntries = (childrenByParent.get(String(motion._id)) || []).sort(
      (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
    );
    if (childEntries.length > 0) {
      lines.push("   • Related procedural motions:");
      childEntries.forEach((child) => {
        const childSubType = getMotionSubTypeValue(child);
        const childOutcome = (child.outcome || "pending").toUpperCase();
        const childUp = child.votes?.up || 0;
        const childDown = child.votes?.down || 0;
        let detail = "";
        if (childSubType === "revise") {
          detail = `Proposed new title: ${child.title}.`;
          if (child.description) {
            detail += ` Description: ${child.description}`;
          }
        } else if (childSubType === "postpone") {
          detail = `Voting ${childOutcome === "PASSED" ? "postponed" : "not postponed"}.`;
          if (child.postponeUntil) {
            detail += ` Until: "${child.postponeUntil}".`;
          }
        } else if (childSubType === "overturn") {
          const targetTitle =
            motionMap.get(String(child.targetMotionId))?.title || "Prior motion";
          detail = `Targeted "${targetTitle}".`;
        }
        lines.push(
          `     - ${childSubType === "revise" ? "Revision motion" : childSubType === "postpone" ? "Postpone motion" : "Overturn motion"} (${childOutcome}) — ${childUp} in favor, ${childDown} against. ${detail}`
        );
      });
    }

    const replies = motion.replies || [];
    const prosReplies = replies.filter((reply) => (reply.stance || "").toLowerCase() === "pro");
    const consReplies = replies.filter((reply) => (reply.stance || "").toLowerCase() === "con");
    const repliesLog = replies.map(
      (reply) =>
        `  - [${new Date(reply.createdAt || motion.updatedAt || Date.now()).toLocaleString()} — ${
          reply.authorDisplayName || reply.authorUsername || "Unknown"
        }] (${reply.stance || "neutral"}): ${reply.text}`
    );
    const discussionMessages = (mtg.messages || [])
      .filter((msg) => msg.motionId && String(msg.motionId) === String(motion._id))
      .map(
        (msg) =>
          `  - [${new Date(msg.createdAt || Date.now()).toLocaleString()} — ${msg.author || "Unknown"}]: ${
            msg.text
          }`
      );
    const discussionBlock = [...repliesLog, ...discussionMessages];

    lines.push("   • Pros:");
    if (prosReplies.length === 0) {
      lines.push("     - None recorded.");
    } else {
      prosReplies.forEach((reply) => {
        const author = reply.authorDisplayName || reply.authorUsername || "Unknown";
        lines.push(`     - ${author}: ${reply.text}`);
      });
    }
    lines.push("   • Cons:");
    if (consReplies.length === 0) {
      lines.push("     - None recorded.");
    } else {
      consReplies.forEach((reply) => {
        const author = reply.authorDisplayName || reply.authorUsername || "Unknown";
        lines.push(`     - ${author}: ${reply.text}`);
      });
    }
    if (discussionBlock.length > 0) {
      lines.push("   • Discussion:");
      discussionBlock.forEach((entry) => lines.push(entry));
    }
    return lines.join("\n");
  }

  const motionLines = topLevelMotions.map((motion, idx) =>
    formatMainMotion(motion, idx)
  );

  if (orphanChildren.length > 0) {
    motionLines.push("Procedural motions awaiting parent decisions:");
    orphanChildren.forEach((child) => {
      const childSubType = getMotionSubTypeValue(child);
      const label =
        childSubType === "revise"
          ? "Revision motion"
          : childSubType === "postpone"
          ? "Postpone motion"
          : "Overturn motion";
      const childOutcome = (child.outcome || "pending").toUpperCase();
      const childUp = child.votes?.up || 0;
      const childDown = child.votes?.down || 0;
      motionLines.push(
        `- ${label} for motion ID ${
          child.parentMotionId || child.targetMotionId || "unknown"
        } — ${childOutcome} (👍 ${childUp} / 👎 ${childDown}).`
      );
    });
  }
  const exportText = [
    `Meeting: ${mtg.title}`,
    `Code: ${mtg.code}`,
    `Created: ${created}`,
    "",
    "Participants:",
    participantLines.length ? participantLines.join("\n") : "- None recorded",
    "",
    "Overall Summary:",
    summary,
    "",
    mtg.adjourned
      ? `Status: Meeting adjourned${mtg.adjournedAt ? ` on ${new Date(mtg.adjournedAt).toLocaleString()}` : ""}.`
      : "Status: Meeting active.",
    "",
    "Motions and Decisions:",
    motionLines.length ? motionLines.join("\n\n") : "No motions recorded.",
    "",
  ].join("\n");

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${minutesFilename}"`
  );
  res.send(exportText);
});

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
    if (motion.allowDiscussion === false) {
      return res.status(400).json({ message: "Discussion is not allowed for this motion." });
    }

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

app.post("/meetings/:meetingId/motions/:motionId/chair-decision", async (req, res) => {
  const { meetingId, motionId } = req.params;
  const { username, decision } = req.body || {};
  const allowedDecisions = ["sustained", "denied"];
  if (!username || !allowedDecisions.includes(decision)) {
    return res.status(400).json({ message: "username and a valid decision are required" });
  }

  try {
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) return res.status(404).json({ message: "Meeting not found" });

    const role = getUserRole(meeting, username);
    if (!["owner", "chair"].includes(role)) {
      return res.status(403).json({ message: "Only the chair/owner can rule on a point of order." });
    }

    const motion = meeting.motions.id(motionId);
    if (!motion) return res.status(404).json({ message: "Motion not found" });
    const motionCategory = (motion.motionCategory || "").toLowerCase();
    if (motionCategory !== "special" || motion.specialMotionType !== "pointOfOrder") {
      return res.status(400).json({ message: "Chair decisions can only be recorded for point of order motions." });
    }
    if (motion.chairDecision) {
      return res.status(400).json({ message: "This point of order has already been decided." });
    }

    motion.chairDecision = decision;
    motion.status = "closed";
    motion.outcome = decision === "sustained" ? "passed" : "failed";
    motion.closedAt = new Date();
    motion.updatedAt = new Date();
    motion.decisionSummary = `Chair ruling: ${decision === "sustained" ? "Sustained" : "Denied"}.`;

    const displayTitle = motion.title || motion.text || "Special motion";
    const systemText = `System: Chair ruled on point of order "${displayTitle}" — ${decision}.`;
    meeting.messages.push({
      author: "System",
      text: systemText,
      motionId: motion._id,
    });

    await meeting.save();
    res.json({ meeting });
  } catch (err) {
    console.error("Error recording chair decision", err);
    res.status(500).json({ message: "Failed to record chair decision", error: err.message });
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
