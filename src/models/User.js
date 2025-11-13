// src/models/User.js
const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, unique: true, required: true },
    email:    { type: String, unique: true, required: true },
    password: { type: String, required: true },
    firstName:{ type: String, required: true },
    lastName: { type: String, required: true },
  },
  { timestamps: true }
);

// Export the model itself (CJS), not an object and not ESM default.
const User = mongoose.models.User || mongoose.model("User", UserSchema);
module.exports = User;

