// src/models/User.js
const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    type: { type: String, default: "generic" },
    message: { type: String, required: true },
    meetingCode: { type: String, default: "" },
    meetingTitle: { type: String, default: "" },
    role: { type: String, default: "" },
    addedBy: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
    read: { type: Boolean, default: false },
  },
  { _id: true }
);

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, unique: true, required: true },
    email:    { type: String, unique: true, required: true },
    password: { type: String, required: true },
    firstName:{ type: String, required: true },
    lastName: { type: String, required: true },
    notifications: { type: [NotificationSchema], default: [] },
  },
  { timestamps: true }
);

// Export the model itself (CJS), not an object and not ESM default.
const User = mongoose.models.User || mongoose.model("User", UserSchema);
module.exports = User;
