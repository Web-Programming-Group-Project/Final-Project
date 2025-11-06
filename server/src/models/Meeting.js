const mongoose = require('mongoose');

const MeetingSchema = new mongoose.Schema({
  title: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  open: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  // Add more fields as needed (e.g., members, chat, etc.)
});

module.exports = mongoose.model('Meeting', MeetingSchema);
