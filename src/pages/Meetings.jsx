import { useLocation, useNavigate } from "react-router-dom";
import React, { useState, useRef, useEffect, useMemo } from "react";
import Header from "../components/Header";
import { useAppContext } from "../AppContext";
import {
  getMeeting,
  raiseMotion as apiRaiseMotion,
  voteMotion as apiVoteMotion,
  postMessage as apiPostMessage,
} from "../api";

function getVoteChoice(voterMap, username) {
  if (!voterMap || !username) return null;
  if (typeof voterMap.get === "function") return voterMap.get(username);
  if (typeof voterMap === "object") return voterMap[username] || null;
  return null;
}

export default function Meetings() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAppContext();

  const initialMeeting = location.state?.meeting || null;
  const initialCode = location.state?.meeting?.code || location.state?.code || location.state?.meetingCode || null;

  const [meeting, setMeeting] = useState(initialMeeting);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [input, setInput] = useState("");
  const [selectedMotionId, setSelectedMotionId] = useState(null);
  const chatEndRef = useRef(null);

  const code = meeting?.code || initialCode;
  const username = user?.username || user?.email;

  useEffect(() => {
    if (!code) {
      navigate("/JoinCreate");
    }
  }, [code, navigate]);

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    async function loadMeeting() {
      setLoading(true);
      setError("");
      try {
        const data = await getMeeting({ code });
        if (!cancelled) {
          setMeeting(data);
        }
      } catch (err) {
        console.error("Failed to load meeting", err);
        if (!cancelled) setError(err.message || "Failed to load meeting");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadMeeting();
    return () => { cancelled = true; };
  }, [code]);

  useEffect(() => {
    if (!selectedMotionId) return;
    const exists = meeting?.motions?.some((motion) => String(motion._id) === selectedMotionId);
    if (!exists) {
      setSelectedMotionId(null);
    }
  }, [meeting, selectedMotionId]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [meeting?.messages, meeting?.motions]);

  const generalMessages = useMemo(() => {
    return (meeting?.messages || [])
      .filter((msg) => !msg.motionId)
      .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  }, [meeting?.messages]);

  const repliesByMotion = useMemo(() => {
    const grouped = {};
    (meeting?.messages || []).forEach((msg) => {
      if (!msg.motionId) return;
      const id = String(msg.motionId);
      if (!grouped[id]) grouped[id] = [];
      grouped[id].push(msg);
    });
    Object.values(grouped).forEach((list) => {
      list.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    });
    return grouped;
  }, [meeting?.messages]);

  const timeline = useMemo(() => {
    const entries = [
      ...generalMessages.map((msg) => ({ type: "chat", createdAt: msg.createdAt, item: msg })),
      ...(meeting?.motions || []).map((motion) => ({ type: "motion", createdAt: motion.createdAt, item: motion })),
    ];
    return entries.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  }, [generalMessages, meeting?.motions]);

  async function sendMessage(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || !meeting || !code) return;
    if (!username) {
      window.alert("You must be logged in to chat.");
      return;
    }
    try {
      const message = await apiPostMessage({ code, username, text });
      setMeeting((prev) => {
        if (!prev) return prev;
        return { ...prev, messages: [...(prev.messages || []), message] };
      });
      setInput("");
    } catch (err) {
      console.error("Failed to send message", err);
      window.alert(err.message || "Failed to send message");
    }
  }

  async function raiseMotion(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || !meeting || !code) return;
    if (!username) {
      window.alert("You must be logged in to raise a motion.");
      return;
    }
    try {
      const motion = await apiRaiseMotion({ code, username, text });
      setMeeting((prev) => {
        if (!prev) return prev;
        return { ...prev, motions: [...(prev.motions || []), motion] };
      });
      setInput("");
      setSelectedMotionId(String(motion._id));
    } catch (err) {
      console.error("Failed to raise motion", err);
      window.alert(err.message || "Failed to raise motion");
    }
  }

  async function toggleVote(motionId, vote) {
    if (!meeting || !code) return;
    if (!username) {
      window.alert("You must be logged in to vote.");
      return;
    }
    try {
      const updated = await apiVoteMotion({ code, motionId, username, vote });
      setMeeting((prev) => {
        if (!prev) return prev;
        const motions = (prev.motions || []).map((m) =>
          String(m._id) === String(updated._id) ? updated : m
        );
        return { ...prev, motions };
      });
    } catch (err) {
      console.error("Failed to vote", err);
      window.alert(err.message || "Failed to submit vote");
    }
  }

  async function replyToMotion() {
    if (!selectedMotionId) return;
    const text = input.trim();
    if (!text || !meeting || !code) return;
    if (!username) {
      window.alert("You must be logged in to reply.");
      return;
    }
    try {
      const message = await apiPostMessage({ code, username, text, motionId: selectedMotionId });
      setMeeting((prev) => {
        if (!prev) return prev;
        return { ...prev, messages: [...(prev.messages || []), message] };
      });
      setInput("");
    } catch (err) {
      console.error("Failed to reply", err);
      window.alert(err.message || "Failed to reply to motion");
    }
  }

  if (!code) return null;

  return (
    <>
      <Header />
      <div style={{ maxWidth: 1100, margin: "2rem auto 0 auto" }}>
        <div style={{ display: "flex", alignItems: "flex-start" }}>
          <div style={{ minWidth: 180 }}>
            <button
              onClick={() => navigate("/JoinCreate")}
              style={{
                marginTop: 16,
                marginLeft: 24,
                background: "#0582CA",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "8px 18px",
                fontWeight: 600,
                fontSize: "1.1rem",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(0,0,0,0.07)"
              }}
            >
              ← Leave
            </button>
          </div>
          <div style={{ flex: 1 }} />
        </div>
        {loading && !meeting && (
          <div style={{ textAlign: "center", marginTop: "2rem" }}>Loading meeting...</div>
        )}
        {error && !loading && !meeting && (
          <div style={{ textAlign: "center", marginTop: "2rem", color: "red" }}>
            {error}
          </div>
        )}
        {meeting && (
          <div style={{ display: "flex", gap: 32 }}>
            <div style={{ flex: 1, background: "#f8fbff", borderRadius: 12, padding: 24 }}>
              <h2 style={{ fontSize: "2.5rem", marginBottom: 8 }}>{meeting.title}</h2>
              <div style={{ fontSize: "1.3rem", marginBottom: 16 }}>
                <b>Meeting Code:</b> <code>{meeting.code}</code>
              </div>
              <div>
                <b>Members:</b>
                <ul style={{ marginTop: 8 }}>
                  {meeting.participants && meeting.participants.length > 0 ? (
                    meeting.participants.map((p, i) => (
                      <li key={i}>{p.username} {p.role && p.role !== "member" ? `(${p.role})` : ""}</li>
                    ))
                  ) : (
                    <li>No participants yet</li>
                  )}
                </ul>
              </div>
            </div>
            <div style={{ width: 455, background: "#e5ecf5", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", height: 520 }}>
              <div style={{ fontWeight: 600, fontSize: "1.2rem", marginBottom: 8 }}>Chat</div>
              <div style={{ flex: 1, overflowY: "auto", marginBottom: 8, background: "#fff", borderRadius: 8, padding: 8, border: "1px solid #c0d3e7" }}>
                {timeline.length === 0 && (
                  <div style={{ color: "#888" }}>No messages yet.</div>
                )}
                {timeline.map((entry, i) => {
                  if (entry.type === "motion") {
                    const motion = entry.item;
                    const motionId = String(motion._id);
                    const replies = repliesByMotion[motionId] || [];
                    const userVote = getVoteChoice(motion.voterMap, username);
                    const selected = selectedMotionId === motionId;
                    return (
                      <div
                        key={`motion-${motionId}-${i}`}
                        onClick={() => setSelectedMotionId(motionId)}
                        style={{
                          marginBottom: 12,
                          padding: 8,
                          borderRadius: 6,
                          background: selected ? "#fff0f0" : "#fff8f8",
                          border: selected ? "2px solid #f28b8b" : "1px solid #f1d0d0",
                          cursor: "pointer"
                        }}
                      >
                        <div style={{ marginBottom: 6 }}>
                          <span style={{ color: "#0582CA", fontWeight: 500 }}>
                            {new Date(motion.createdAt).toLocaleTimeString()}
                          </span>{" "}
                          <b>Motion:</b> {motion.text} — <i>{motion.proposer}</i>
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); toggleVote(motionId, "up"); }}
                            style={{
                              background: userVote === "up" ? "#0b8457" : "#e0f1ea",
                              color: userVote === "up" ? "#fff" : "#000",
                              border: "none",
                              padding: "6px 10px",
                              borderRadius: 6,
                              cursor: "pointer"
                            }}
                          >
                            👍 {motion.votes?.up ?? 0}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); toggleVote(motionId, "down"); }}
                            style={{
                              background: userVote === "down" ? "#b71c1c" : "#fdecea",
                              color: userVote === "down" ? "#fff" : "#000",
                              border: "none",
                              padding: "6px 10px",
                              borderRadius: 6,
                              cursor: "pointer"
                            }}
                          >
                            👎 {motion.votes?.down ?? 0}
                          </button>
                        </div>
                        {replies.length > 0 && (
                          <div style={{ marginTop: 8, marginLeft: 12 }}>
                            {replies.map((reply) => (
                              <div key={reply._id} style={{ marginBottom: 6, padding: 6, borderRadius: 6, background: "#fff5f5", marginLeft: 12 }}>
                                <div style={{ color: "#666", fontSize: "0.9rem" }}>
                                  {new Date(reply.createdAt).toLocaleTimeString()} — <b>{reply.author}</b>
                                </div>
                                <div style={{ marginTop: 4 }}>{reply.text}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }
                  const msg = entry.item;
                  return (
                    <div key={`msg-${msg._id || i}`} style={{ marginBottom: 6 }}>
                      <span style={{ color: "#0582CA", fontWeight: 500 }}>
                        {new Date(msg.createdAt).toLocaleTimeString()}
                      </span>{" "}
                      <b>{msg.author || "Anon"}:</b> {msg.text}
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>
              <form style={{ display: "flex", gap: 4 }} onSubmit={sendMessage}>
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Type a message or motion..."
                  style={{ flex: 1, borderRadius: 6, border: "1px solid #b0b0b0", padding: 6 }}
                />
                <button
                  type="submit"
                  style={{
                    borderRadius: 6,
                    background: "#0582CA",
                    color: "#fff",
                    border: "none",
                    padding: "6px 14px",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  Send
                </button>
                <button
                  type="button"
                  onClick={raiseMotion}
                  style={{
                    borderRadius: 6,
                    background: "#e53935",
                    color: "#fff",
                    border: "none",
                    padding: "6px 14px",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  Raise a Motion
                </button>
                <button
                  type="button"
                  onClick={replyToMotion}
                  disabled={!selectedMotionId || !input.trim()}
                  style={{
                    borderRadius: 6,
                    background: !selectedMotionId || !input.trim() ? "#9fbfdc" : "#0077cc",
                    color: "#fff",
                    border: "none",
                    padding: "6px 14px",
                    fontWeight: 600,
                    cursor: !selectedMotionId || !input.trim() ? "not-allowed" : "pointer"
                  }}
                >
                  Reply
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
