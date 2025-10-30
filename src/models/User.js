// src/models/User.js
import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
}, { timestamps: true });

// Avoid OverwriteModelError in serverless / hot reload
const User = mongoose.models.User || mongoose.model("User", UserSchema);

export default User;
