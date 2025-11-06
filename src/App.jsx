
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import JoinCreate from "./pages/JoinCreate/JoinCreate";
import Meetings from "./pages/Meetings";
import User from "./pages/User"
import { AppProvider } from "./AppContext";
import ProtectedRoute from "./components/protected-route";

export default function App() {
  return (
    <AppProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/JoinCreate" element={<ProtectedRoute> <JoinCreate /> </ProtectedRoute>} />
          <Route path="/JoinCreate" element={<ProtectedRoute> <JoinCreate /> </ProtectedRoute>} />
          <Route path="/Meetings" element={<ProtectedRoute> <Meetings /> </ProtectedRoute>} />
          <Route path="/User" element={<ProtectedRoute> <User /> </ProtectedRoute>} />
        </Routes>
      </Router>
    </AppProvider>
  );
}
