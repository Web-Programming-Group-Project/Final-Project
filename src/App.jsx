import React from "react";
import Home from "./pages/Home";
import Meetings from "./pages/Meetings";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/meetings" element={<Meetings />} />
        <Route path="/join" element={<JoinCreate />} />
        <Route path="/settings" element={<MeetingSettings />} />
      </Routes>
    </BrowserRouter>
  );
}