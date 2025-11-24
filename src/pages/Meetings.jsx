import { useLocation, useNavigate } from "react-router-dom";
import React, { useState, useRef, useEffect, useMemo } from "react";
import Header from "../components/Header";
import {
  Dialog,
  Classes,
  FormGroup,
  RadioGroup,
  Radio,
  Button as BPButton,
} from "@blueprintjs/core";
import { useAppContext } from "../AppContext";
import {
  getMeeting,
  raiseMotion as apiRaiseMotion,
  voteMotion as apiVoteMotion,
  postMessage as apiPostMessage,
  updateParticipantRole,
  closeMotion as apiCloseMotion,
  addReplyToMotion,
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
  const [messageText, setMessageText] = useState("");
  const [selectedMotionId, setSelectedMotionId] = useState(null);
  const [roleUpdating, setRoleUpdating] = useState(null);
  const [roleError, setRoleError] = useState("");
  const [motionType, setMotionType] = useState("standard");
  const [motionVotingMode, setMotionVotingMode] = useState("named");
  const [raiseModalOpen, setRaiseModalOpen] = useState(false);
  const [motionTitleInput, setMotionTitleInput] = useState("");
  const [motionDescriptionInput, setMotionDescriptionInput] = useState("");
  const [motionError, setMotionError] = useState("");
  const [raisingMotion, setRaisingMotion] = useState(false);
  const [voterListExpanded, setVoterListExpanded] = useState({});
  const [replyTextMap, setReplyTextMap] = useState({});
  const [replyStanceMap, setReplyStanceMap] = useState({});
  const [replyErrorMap, setReplyErrorMap] = useState({});
  const [replySubmittingMap, setReplySubmittingMap] = useState({});
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

  const timeline = useMemo(() => {
    const entries = [
      ...generalMessages.map((msg) => ({ type: "chat", createdAt: msg.createdAt, item: msg })),
      ...(meeting?.motions || []).map((motion) => ({ type: "motion", createdAt: motion.createdAt, item: motion })),
    ];
    return entries.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  }, [generalMessages, meeting?.motions]);

  const myRole =
    meeting?.participants?.find((p) => p.username === username)?.role || "member";
  const canManageMotions = ["owner", "chair"].includes(myRole);
  const canRaiseMotion = ["owner", "chair"].includes(myRole);
  const showRaiseButton = myRole !== "observer";
  const canSend = Boolean(username);

  async function sendMessage(e) {
    e.preventDefault();
    const text = messageText.trim();
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
      setMessageText("");
    } catch (err) {
      console.error("Failed to send message", err);
      window.alert(err.message || "Failed to send message");
    }
  }

  function openRaiseMotionModal() {
    if (!canRaiseMotion) return;
    setMotionTitleInput("");
    setMotionDescriptionInput("");
    setMotionError("");
    setMotionType("standard");
    setMotionVotingMode("named");
    setRaiseModalOpen(true);
  }

  function closeRaiseMotionModal() {
    if (raisingMotion) return;
    setRaiseModalOpen(false);
  }

  async function submitMotion(e) {
    e.preventDefault();
    if (!canRaiseMotion) return;
    const title = motionTitleInput.trim();
    const description = motionDescriptionInput.trim();
    if (!title || !meeting || !code) {
      setMotionError("Motion title is required.");
      return;
    }
    if (!username) {
      setMotionError("You must be logged in to raise a motion.");
      return;
    }
    setRaisingMotion(true);
    setMotionError("");
    try {
      const motion = await apiRaiseMotion({
        code,
        username,
        title,
        description,
        type: motionType,
        votingMode: motionVotingMode,
      });
      setMeeting((prev) => {
        if (!prev) return prev;
        return { ...prev, motions: [...(prev.motions || []), motion] };
      });
      setSelectedMotionId(String(motion._id));
      setMotionTitleInput("");
      setMotionDescriptionInput("");
      setMotionType("standard");
      setMotionVotingMode("named");
      setRaiseModalOpen(false);
    } catch (err) {
      console.error("Failed to raise motion", err);
      setMotionError(err.message || "Failed to raise motion");
    } finally {
      setRaisingMotion(false);
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

  async function handleRoleChange(participantUsername, newRole) {
    if (!meeting?._id || !username) return;
    setRoleError("");
    setRoleUpdating(`${participantUsername}-${newRole}`);
    try {
      const updated = await updateParticipantRole({
        meetingId: meeting._id,
        participantUsername,
        newRole,
        username,
      });
      setMeeting(updated);
    } catch (err) {
      console.error("Failed to update role", err);
      setRoleError(err.message || "Failed to update role");
    } finally {
      setRoleUpdating(null);
    }
  }

  async function handleCloseVoting(motionId) {
    if (!meeting || !code || !username) return;
    try {
      await apiCloseMotion({ code, motionId, username });
      const refreshed = await getMeeting({ code });
      setMeeting(refreshed);
    } catch (err) {
      console.error("Failed to close voting", err);
      window.alert(err.message || "Failed to close voting");
    }
  }

  async function submitReply(motionId) {
    if (!meeting?._id) {
      setReplyErrorMap((prev) => ({ ...prev, [motionId]: "Meeting not loaded." }));
      return;
    }
    if (!username) {
      setReplyErrorMap((prev) => ({ ...prev, [motionId]: "You must be logged in to reply." }));
      return;
    }
    const text = (replyTextMap[motionId] || "").trim();
    if (!text) {
      setReplyErrorMap((prev) => ({ ...prev, [motionId]: "Reply text is required." }));
      return;
    }
    const stance = replyStanceMap[motionId] || "neutral";
    setReplySubmittingMap((prev) => ({ ...prev, [motionId]: true }));
    setReplyErrorMap((prev) => ({ ...prev, [motionId]: "" }));
    try {
      const displayName =
        [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
        user?.username ||
        user?.email ||
        "User";
      const updatedMotion = await addReplyToMotion({
        meetingId: meeting._id,
        motionId,
        text,
        stance,
        displayName,
        username,
      });
      setMeeting((prev) => {
        if (!prev) return prev;
        const motions = (prev.motions || []).map((m) =>
          String(m._id) === String(updatedMotion._id) ? updatedMotion : m
        );
        return { ...prev, motions };
      });
      setReplyTextMap((prev) => ({ ...prev, [motionId]: "" }));
      setReplyStanceMap((prev) => ({ ...prev, [motionId]: "neutral" }));
    } catch (err) {
      setReplyErrorMap((prev) => ({ ...prev, [motionId]: err.message || "Failed to add reply" }));
    } finally {
      setReplySubmittingMap((prev) => ({ ...prev, [motionId]: false }));
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
              <div style={{ fontSize: "0.95rem", color: "#555", marginBottom: 12 }}>
                Your role in this meeting: <strong>{myRole}</strong>
              </div>
              <div>
                <b>Members:</b>
                {roleError && <div style={{ color: "red", fontSize: "0.85rem", marginTop: 4 }}>{roleError}</div>}
                <ul style={{ marginTop: 8, paddingLeft: 16 }}>
                  {meeting.participants && meeting.participants.length > 0 ? (
                    meeting.participants.map((p) => {
                      const label = p.displayName || p.username;
                      const showRoleTag = p.role && p.role !== "member";
                      const canEdit = myRole === "owner" && p.username !== username;
                      return (
                        <li key={p.username} style={{ marginBottom: 6 }}>
                          <span>
                            {label} {showRoleTag ? `(${p.role})` : ""}
                          </span>
                          {canEdit && (
                            <select
                              value={p.role}
                              onChange={(e) => handleRoleChange(p.username, e.target.value)}
                              disabled={Boolean(roleUpdating)}
                              style={{ marginLeft: 12, padding: "2px 6px", borderRadius: 4 }}
                            >
                              <option value="chair">chair</option>
                              <option value="member">member</option>
                              <option value="observer">observer</option>
                            </select>
                          )}
                        </li>
                      );
                    })
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
                    const replies = motion.replies || [];
                    const selected = selectedMotionId === motionId;
                    const isClosed = motion.status === "closed";
                    const resultLabel =
                      motion.outcome && motion.outcome !== "pending"
                        ? motion.outcome.toUpperCase()
                        : "PENDING";
                    const votingMode = motion.votingMode || "named";
                    const anonymousVoters = motion.anonymousVotedUsers || [];
                    const userVote = votingMode === "named" ? getVoteChoice(motion.voterMap, username) : null;
                    const userVotedAnonymous =
                      votingMode === "anonymous" && username
                        ? anonymousVoters.includes(username)
                        : false;
                    const typeLabel =
                      motion.type === "procedure"
                        ? `Procedural motion · requires ${motion.requiredPercentage || 66}%`
                        : `Standard motion · requires ${motion.requiredPercentage || 50}%`;
                    const votingModeLabel = votingMode === "anonymous" ? "Anonymous" : "Named";
                    const displayTitle = motion.title || motion.text || "Untitled motion";
                    const replyText = replyTextMap[motionId] || "";
                    const replyStance = replyStanceMap[motionId] || "neutral";
                    const replyError = replyErrorMap[motionId];
                    const replySubmitting = Boolean(replySubmittingMap[motionId]);
                    const showVoterList = Boolean(voterListExpanded[motionId]);
                    const voteButtonsDisabled =
                      !username ||
                      isClosed ||
                      (votingMode === "anonymous" && userVotedAnonymous);
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
                          <b>Motion:</b> {displayTitle} — <i>{motion.proposer}</i>
                        </div>
                        {votingMode === "anonymous" && (
                          <div style={{ marginTop: 4, fontSize: "0.85rem", color: "#555" }}>
                            Total voters: {anonymousVoters.length}
                          </div>
                        )}
                        {votingMode === "anonymous" && userVotedAnonymous && !isClosed && (
                          <div style={{ marginTop: 4, fontSize: "0.85rem", color: "#b00020" }}>
                            You have already voted on this motion (anonymous).
                          </div>
                        )}
                        {motion.description && (
                          <div style={{ marginBottom: 6, color: "#333" }}>
                            {motion.description}
                          </div>
                        )}
                        <div style={{ fontSize: "0.85rem", color: "#555", marginBottom: 6 }}>
                          {typeLabel} · Voting mode: {votingModeLabel}
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <button
                            type="button"
                            disabled={voteButtonsDisabled}
                            onClick={(e) => { e.stopPropagation(); if (!voteButtonsDisabled) toggleVote(motionId, "up"); }}
                            style={{
                              background: userVote === "up" ? "#0b8457" : "#e0f1ea",
                              color: userVote === "up" ? "#fff" : "#000",
                              border: "none",
                              padding: "6px 10px",
                              borderRadius: 6,
                              cursor: voteButtonsDisabled ? "not-allowed" : "pointer",
                              opacity: voteButtonsDisabled ? 0.6 : 1,
                            }}
                          >
                            👍 {motion.votes?.up ?? 0}
                          </button>
                          <button
                            type="button"
                            disabled={voteButtonsDisabled}
                            onClick={(e) => { e.stopPropagation(); if (!voteButtonsDisabled) toggleVote(motionId, "down"); }}
                            style={{
                              background: userVote === "down" ? "#b71c1c" : "#fdecea",
                              color: userVote === "down" ? "#fff" : "#000",
                              border: "none",
                              padding: "6px 10px",
                              borderRadius: 6,
                              cursor: voteButtonsDisabled ? "not-allowed" : "pointer",
                              opacity: voteButtonsDisabled ? 0.6 : 1,
                            }}
                          >
                            👎 {motion.votes?.down ?? 0}
                          </button>
                          {canManageMotions && !isClosed && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleCloseVoting(motionId); }}
                              style={{
                                borderRadius: 6,
                                border: "1px solid #b71c1c",
                                background: "#fff",
                                color: "#b71c1c",
                                padding: "6px 10px",
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              Close Voting
                            </button>
                          )}
                          <span
                            style={{
                              marginLeft: "auto",
                              fontWeight: 600,
                              color: isClosed ? "#b71c1c" : "#0b8457",
                            }}
                          >
                            {isClosed ? `Voting closed — ${resultLabel}` : "Voting open"}
                          </span>
                        </div>
                        {isClosed && (
                          <div style={{ marginTop: 6, fontSize: "0.9rem", color: "#555" }}>
                            Final tally: 👍 {motion.votes?.up ?? 0} / 👎 {motion.votes?.down ?? 0}
                          </div>
                        )}
                        {isClosed && votingMode === "named" && (
                          <div style={{ marginTop: 6 }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setVoterListExpanded((prev) => ({
                                  ...prev,
                                  [motionId]: !prev[motionId],
                                }));
                              }}
                              style={{
                                border: "none",
                                background: "transparent",
                                color: "#0582CA",
                                cursor: "pointer",
                                fontWeight: 600,
                                padding: 0,
                              }}
                            >
                              {showVoterList ? "Hide voter list" : "Show voter list"}
                            </button>
                            {showVoterList && (
                              <ul style={{ marginTop: 6, paddingLeft: 18 }}>
                                {(() => {
                                  const entries = motion.voterMap
                                    ? typeof motion.voterMap.entries === "function"
                                      ? Array.from(motion.voterMap.entries())
                                      : Object.entries(motion.voterMap)
                                    : [];
                                  if (entries.length === 0) {
                                    return <li>No votes recorded.</li>;
                                  }
                                  return entries.map(([name, choice]) => (
                                    <li key={`${motionId}-${name}`}>
                                      {name} — {choice === "up" ? "👍" : "👎"}
                                    </li>
                                  ));
                                })()}
                              </ul>
                            )}
                          </div>
                        )}
                        <div
                          className="motion-reply-section"
                          style={{ marginTop: 12, borderTop: "1px solid #f1c7c7", paddingTop: 8 }}
                        >
                          {replies.length > 0 && (
                            <div className="motion-reply-list" style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 6 }}>
                              {replies.map((reply) => {
                                const stanceLabel =
                                  reply.stance === "pro" ? "Pro" : reply.stance === "con" ? "Con" : "Neutral";
                                const stanceStyles = {
                                  pro: { background: "#e6ffed", color: "#137333" },
                                  con: { background: "#ffe6e6", color: "#b00020" },
                                  neutral: { background: "#f3f3f3", color: "#555" },
                                };
                                const stanceStyle = stanceStyles[reply.stance] || stanceStyles.neutral;
                                const replyAuthor =
                                  reply.authorDisplayName ||
                                  reply.authorUsername ||
                                  reply.author ||
                                  "Unknown";
                                return (
                                  <div
                                    key={reply._id || reply.createdAt}
                                    className={`motion-reply motion-reply--${reply.stance}`}
                                    style={{ padding: 6, borderRadius: 6, background: "#fff5f5" }}
                                  >
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.85rem", marginBottom: 4 }}>
                                      <span style={{ fontWeight: 600 }}>{replyAuthor}</span>
                                      <span
                                        className="motion-reply-stance-tag"
                                        style={{
                                          padding: "0.1rem 0.5rem",
                                          borderRadius: 999,
                                          fontSize: "0.75rem",
                                          ...stanceStyle,
                                        }}
                                      >
                                        {stanceLabel}
                                      </span>
                                      <span style={{ marginLeft: "auto", color: "#666" }}>
                                        {reply.createdAt ? new Date(reply.createdAt).toLocaleTimeString() : ""}
                                      </span>
                                    </div>
                                    <div style={{ color: "#333" }}>{reply.text}</div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          <div
                            className="motion-reply-input-row"
                            style={{ display: "flex", gap: 8, alignItems: "center" }}
                          >
                            <input
                              type="text"
                              className="motion-reply-input"
                              placeholder="Reply to this motion..."
                              value={replyText}
                              onChange={(e) =>
                                setReplyTextMap((prev) => ({ ...prev, [motionId]: e.target.value }))
                              }
                              style={{ flex: 1, borderRadius: 6, border: "1px solid #b0b0b0", padding: 6 }}
                            />
                            <select
                              className="motion-reply-stance-select"
                              value={replyStance}
                              onChange={(e) =>
                                setReplyStanceMap((prev) => ({ ...prev, [motionId]: e.target.value }))
                              }
                              style={{ borderRadius: 6, border: "1px solid #b0b0b0", padding: "6px 8px" }}
                            >
                              <option value="neutral">Neutral</option>
                              <option value="pro">Pro</option>
                              <option value="con">Con</option>
                            </select>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                submitReply(motionId);
                              }}
                              disabled={replySubmitting || !replyText.trim()}
                              style={{
                                borderRadius: 6,
                                background: !replyText.trim() ? "#9fbfdc" : "#0582CA",
                                color: "#fff",
                                border: "none",
                                padding: "6px 12px",
                                fontWeight: 600,
                                cursor: !replyText.trim() ? "not-allowed" : "pointer",
                                opacity: replySubmitting ? 0.6 : 1,
                              }}
                            >
                              {replySubmitting ? "Replying..." : "Reply"}
                            </button>
                          </div>
                          {replyError && (
                            <div style={{ color: "red", fontSize: "0.85rem", marginTop: 4 }}>{replyError}</div>
                          )}
                        </div>
                      </div>
                    );
                  }
                  const msg = entry.item;
                  const isSystem = (msg.author || "").toLowerCase() === "system";
                  return (
                    <div
                      key={`msg-${msg._id || i}`}
                      style={{
                        marginBottom: 6,
                        fontStyle: isSystem ? "italic" : "normal",
                        color: isSystem ? "#555" : "#000",
                      }}
                    >
                      <span style={{ color: "#0582CA", fontWeight: 500 }}>
                        {new Date(msg.createdAt).toLocaleTimeString()}
                      </span>{" "}
                      <b>{isSystem ? "System" : msg.author || "Anon"}:</b> {msg.text}
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>
              <div
                className="chat-footer"
                style={{ borderTop: "1px solid #d0d7e5", paddingTop: 8, marginTop: 4 }}
              >
                <form
                  className="chat-main-row"
                  style={{ display: "flex", gap: 8 }}
                  onSubmit={sendMessage}
                >
                  <input
                    type="text"
                    value={messageText}
                    onChange={e => setMessageText(e.target.value)}
                    placeholder="Type a message..."
                    style={{ flex: 1, borderRadius: 6, border: "1px solid #b0b0b0", padding: 6 }}
                  />
                  <button
                    type="submit"
                    disabled={!canSend || !messageText.trim()}
                    style={{
                      borderRadius: 6,
                      background: !messageText.trim() ? "#9fbfdc" : "#0582CA",
                      color: "#fff",
                      border: "none",
                      padding: "6px 14px",
                      fontWeight: 600,
                      cursor: !messageText.trim() ? "not-allowed" : "pointer"
                    }}
                  >
                    Send
                  </button>
                </form>
                <div
                  className="chat-secondary-row"
                  style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 6, fontSize: "0.9rem" }}
                >
                  {showRaiseButton && (
                    <button
                      type="button"
                      onClick={openRaiseMotionModal}
                      disabled={!canRaiseMotion}
                      title={!canRaiseMotion ? "Only the chair or owner can raise motions." : undefined}
                      style={{
                        borderRadius: 6,
                        background: !canRaiseMotion ? "#f4c8c8" : "#e53935",
                        color: "#fff",
                        border: "none",
                        padding: "6px 12px",
                        fontWeight: 600,
                        cursor: !canRaiseMotion ? "not-allowed" : "pointer",
                      }}
                    >
                      Raise Motion
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <Dialog
        isOpen={raiseModalOpen}
        onClose={closeRaiseMotionModal}
      >
        <div className={Classes.DIALOG_HEADER}>
          <h4>Raise Motion</h4>
        </div>
        <form onSubmit={submitMotion} id="raise-motion-form">
          <div className={Classes.DIALOG_BODY}>
            <FormGroup label="Motion title" labelFor="motion-title-input">
              <input
                id="motion-title-input"
                className="bp4-input"
                type="text"
                value={motionTitleInput}
                onChange={(e) => setMotionTitleInput(e.target.value)}
                disabled={raisingMotion}
                required
                placeholder="e.g., Approve the budget for Q2"
              />
            </FormGroup>
            <FormGroup label="Motion description (optional)" labelFor="motion-description-input">
              <textarea
                id="motion-description-input"
                className="bp4-input"
                rows={4}
                value={motionDescriptionInput}
                onChange={(e) => setMotionDescriptionInput(e.target.value)}
                disabled={raisingMotion}
                placeholder="Provide details, rationale, or conditions for this motion."
              />
            </FormGroup>
            <FormGroup label="Motion type">
              <RadioGroup
                onChange={(e) => setMotionType(e.target.value)}
                selectedValue={motionType}
                inline
              >
                <Radio value="standard" label="Standard (50%)" />
                <Radio value="procedure" label="Procedural (66%)" />
              </RadioGroup>
              <p style={{ marginTop: 4, color: "#555" }}>
                Standard motions pass with &gt; 50% in favor. Procedural motions typically require at least two-thirds.
              </p>
            </FormGroup>
            <FormGroup label="Voting style">
              <RadioGroup
                onChange={(e) => setMotionVotingMode(e.target.value)}
                selectedValue={motionVotingMode}
                inline
              >
                <Radio value="named" label="Named (record each vote)" />
                <Radio value="anonymous" label="Anonymous (only show totals)" />
              </RadioGroup>
            </FormGroup>
            {motionError && (
              <p style={{ color: "red", marginTop: 8 }}>{motionError}</p>
            )}
          </div>
          <div className={Classes.DIALOG_FOOTER}>
            <div className={Classes.DIALOG_FOOTER_ACTIONS}>
              <BPButton onClick={closeRaiseMotionModal} disabled={raisingMotion}>
                Cancel
              </BPButton>
              <BPButton intent="primary" type="submit" loading={raisingMotion}>
                Submit Motion
              </BPButton>
            </div>
          </div>
        </form>
      </Dialog>
    </>
  );
}
