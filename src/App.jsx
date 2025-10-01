import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import JoinCreate from "./pages/JoinCreate/JoinCreate";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/JoinCreate" element={<JoinCreate />} />
      </Routes>
    </Router>
  );
}