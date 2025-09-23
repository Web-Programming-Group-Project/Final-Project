const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const User = require("./models/User");

// Gets the .env variables
dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("Sucessfully connected to MongoDB"))
  .catch(err => console.error("Connection error", err));

// POST /api/register
app.post("/api/register", async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: "Username, email, and password are required" });
  }

  try {
    const user = new User({ username, email, password }); 
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

// POST /api/login
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required" });
  }

  const user = await User.findOne({ username });
  if (!user || user.password !== password) {
    return res.status(400).json({ message: "Invalid username or password" });
  }

  res.json({ message: "Login successful", user });
});

// start server
const PORT = process.env.PORT;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
