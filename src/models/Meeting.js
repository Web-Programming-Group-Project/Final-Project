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
    motionCategory: {
      type: String,
      enum: ["standard", "procedural", "submotion", "special"],
      default: "standard",
    },
    specialMotionType: {
      type: String,
      enum: ["adjourn", "closeDebate", "pointOfOrder"],
      default: null,
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
    allowDiscussion: { type: Boolean, default: true },
    chairDecision: { type: String, enum: ['sustained', 'denied'], default: null },
    status: { type: String, enum: ["open", "closed"], default: "open" },
    outcome: {
      type: String,
      enum: ["pending", "passed", "failed", "overturned", "postponed"],
      default: "pending",
    },
    closedAt: { type: Date, default: null },
    replies: { type: [ReplySchema], default: [] },
    decisionSummary: { type: String, default: "" },
    prosSummary: { type: String, default: "" },
    consSummary: { type: String, default: "" },
    isOverturn: { type: Boolean, default: false },
    targetMotionId: { type: mongoose.Schema.Types.ObjectId, default: null },
    overturnedByMotionId: { type: mongoose.Schema.Types.ObjectId, default: null },
    overturned: { type: Boolean, default: false },
    originalOutcome: { type: String, default: "" },
    subType: {
      type: String,
      enum: ["none", "overturn", "revise", "postpone"],
      default: "none",
    },
    subMotionType: {
      type: String,
      enum: ["none", "overturn", "revise", "postpone"],
      default: "none",
    },
    parentMotionId: { type: mongoose.Schema.Types.ObjectId, default: null },
    postponeUntil: { type: String, default: "" },
    wasRevised: { type: Boolean, default: false },
    revisedByMotionId: { type: mongoose.Schema.Types.ObjectId, default: null },
    revisionHistory: {
      type: [
        {
          at: { type: Date, default: Date.now },
          byMotionId: { type: mongoose.Schema.Types.ObjectId, required: true },
          oldTitle: { type: String },
          oldDescription: { type: String },
          newTitle: { type: String },
          newDescription: { type: String },
        },
      ],
      default: [],
    },
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
    meetingSummary: { type: String, default: "" },
  },
  { timestamps: true }
);

const Meeting =
  mongoose.models.Meeting || mongoose.model("Meeting", MeetingSchema);

module.exports = Meeting;
