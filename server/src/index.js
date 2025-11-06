const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const User = require("./models/User");


// Gets the .env variables
dotenv.config();

const app = express();
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  // More origins will be needed, such as the Netlify URL in prod when we deploy this 
];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json());

// Checks connection to server - run curl -i http://localhost:8080/ping when serving is running to test connection
app.get("/ping", (req, res) => {
  res.send("pong");
});


// connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("Sucessfully connected to MongoDB"))
  .catch(err => console.error("Connection error", err));

// POST /api/register
app.post("/api/register", async (req, res) => {
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

// POST /api/login
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required" });
  }

  const user = await User.findOne({ username });
  if (!user || user.password !== password) {
    return res.status(401).json({ message: "Invalid username or password" });
  }

  res.json({ message: "Login successful", user });
});



// start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
