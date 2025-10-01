import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import JoinCreate from "./pages/JoinCreate/JoinCreate";
import { AppProvider } from "./AppContext";
import ProtectedRoute from "./components/protected-route";

export default function App() {
  return (
    <AppProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/JoinCreate" element={<ProtectedRoute> <JoinCreate /> </ProtectedRoute>} />
        </Routes>
      </Router>
    </AppProvider>
  );
}