// src/models/Meeting.js
const mongoose = require("mongoose");

const MeetingSchema = new mongoose.Schema(
  {
    title:   { type: String, required: true },
    code:    { type: String, required: true, unique: true }, // e.g., join code
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    open:    { type: Boolean, default: true },
    // add fields later as needed: participants, agendaItems, status, etc.
  },
  { timestamps: true } // adds createdAt, updatedAt
);

// serverless/Hot-reload safe export
const Meeting =
  mongoose.models.Meeting || mongoose.model("Meeting", MeetingSchema);

module.exports = Meeting;

