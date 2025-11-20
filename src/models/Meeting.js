const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    author: { type: String, required: true },        // username
    text:   { type: String, required: true },
    motionId: { type: mongoose.Schema.Types.ObjectId, ref: "Motion", default: null },
  },
  { _id: true, timestamps: true }
);

const MotionSchema = new mongoose.Schema(
  {
    proposer: { type: String, required: true },       // username
    text:     { type: String, required: true },
    votes:    {
      up:   { type: Number, default: 0 },
      down: { type: Number, default: 0 },
    },
    voterMap: { type: Map, of: String, default: {} }, // username -> 'up' | 'down'
  },
  { _id: true, timestamps: true }
);

const ParticipantSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },
    role:     { type: String, default: "member" },
  },
  { _id: false }
);

const MeetingSchema = new mongoose.Schema(
  {
    title:   { type: String, required: true },
    code:    { type: String, required: true, unique: true },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
    open:    { type: Boolean, default: true },

    participants: [ParticipantSchema],
    motions:      [MotionSchema],
    messages:     [MessageSchema],
  },
  { timestamps: true }
);

const Meeting =
  mongoose.models.Meeting || mongoose.model("Meeting", MeetingSchema);

module.exports = Meeting;
