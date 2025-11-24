const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    author: { type: String, required: true },        // username
    text:   { type: String, required: true },
    motionId: { type: mongoose.Schema.Types.ObjectId, ref: "Motion", default: null },
  },
  { _id: true, timestamps: true }
);

const ReplySchema = new mongoose.Schema(
  {
    authorUsername: { type: String, required: true },
    authorDisplayName: { type: String, required: true },
    stance: {
      type: String,
      enum: ["pro", "con", "neutral"],
      default: "neutral",
      required: true,
    },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const MotionSchema = new mongoose.Schema(
  {
    proposer: { type: String, required: true },       // username
    title:    { type: String, required: false },      // new primary title
    description: { type: String, required: false },   // optional description/details
    text:     { type: String, required: false },      // legacy field, kept for backward compatibility
    type: {
      type: String,
      enum: ["standard", "procedure"],
      default: "standard",
    },
    requiredPercentage: { type: Number, default: 50 },
    votes:    {
      up:   { type: Number, default: 0 },
      down: { type: Number, default: 0 },
    },
    voterMap: { type: Map, of: String, default: {} }, // username -> 'up' | 'down'
    votingMode: {
      type: String,
      enum: ["named", "anonymous"],
      default: "named",
    },
    anonymousVotedUsers: {
      type: [String],
      default: [],
    },
    status: { type: String, enum: ["open", "closed"], default: "open" },
    outcome: { type: String, enum: ["pending", "passed", "failed"], default: "pending" },
    closedAt: { type: Date, default: null },
    replies: { type: [ReplySchema], default: [] },
  },
  { _id: true, timestamps: true }
);

const ParticipantSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },
    role: {
      type: String,
      enum: ["owner", "chair", "member", "observer"],
      default: "member",
    },
    joinedAt: { type: Date, default: Date.now },
    displayName: { type: String },
  },
  { _id: false }
);

const MeetingSchema = new mongoose.Schema(
  {
    title:   { type: String, required: true },
    code:    { type: String, required: true, unique: true },
    open:    { type: Boolean, default: true },
    creator: { type: String, required: true, alias: "createdBy" }, // username of creator
    visibility: { type: String, enum: ["private"], default: "private" },

    participants: {
      type: [ParticipantSchema],
      default: [],
    },
    motions:      [MotionSchema],
    messages:     [MessageSchema],
  },
  { timestamps: true }
);

const Meeting =
  mongoose.models.Meeting || mongoose.model("Meeting", MeetingSchema);

module.exports = Meeting;
