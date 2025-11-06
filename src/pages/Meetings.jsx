//Page where the actual meeting is
//Could have a data structure for holding motions
//Could have a data structure for holding participants (with different classes of participant (chair/secretary/member)

import { useLocation, useNavigate } from "react-router-dom";

import React, { useState, useRef, useEffect } from "react";
import Header from "../components/Header";

export default function Meetings() {
	const location = useLocation();
	const navigate = useNavigate();
	const meeting = location.state?.meeting;

	// Simple local chat state. messages can be either { type: 'chat', text, time }
	// or a motion: { type: 'motion', text, time, votes: { up: Set, down: Set } }
	const [messages, setMessages] = useState([]);
	const [input, setInput] = useState("");
	const [selectedMotionIndex, setSelectedMotionIndex] = useState(null);
	const chatEndRef = useRef(null);

	useEffect(() => {
		if (chatEndRef.current) {
			chatEndRef.current.scrollIntoView({ behavior: "smooth" });
		}
	}, [messages]);

	if (!meeting) {
		// If no meeting info, redirect back to join/create
		navigate("/JoinCreate");
		return null;
	}

	function sendMessage(e) {
		e.preventDefault();
		if (!input.trim()) return;
		setMessages([...messages, { type: 'chat', text: input, time: new Date().toLocaleTimeString() }]);
		setInput("");
	}

	function raiseMotion(e) {
		e.preventDefault();
		if (!input.trim()) return;
		const motion = {
			type: 'motion',
			text: input,
			time: new Date().toLocaleTimeString(),
			votes: { up: [], down: [] },
			replies: []
		};
		setMessages([...messages, motion]);
		setInput("");
	}

	function getCurrentUserId() {
		try {
			const u = JSON.parse(localStorage.getItem('user'));
			return u?.username || u?.email || 'anon';
		} catch (e) {
			return 'anon';
		}
	}

	function toggleVote(index, side) {
		// side = 'up' or 'down'
		const userId = getCurrentUserId();
		setMessages(prev => {
			return prev.map((m, i) => {
				if (i !== index) return m;
				if (m.type !== 'motion') return m;
				const up = new Set(m.votes.up);
				const down = new Set(m.votes.down);
				// remove from both then add to chosen (toggle behaviour)
				if (side === 'up') {
					if (up.has(userId)) {
						up.delete(userId);
					} else {
						up.add(userId);
						down.delete(userId);
					}
				} else {
					if (down.has(userId)) {
						down.delete(userId);
					} else {
						down.add(userId);
						up.delete(userId);
					}
				}
				return { ...m, votes: { up: Array.from(up), down: Array.from(down) } };
			});
		});
	}

	function replyToMotion(index) {
		if (selectedMotionIndex === null || selectedMotionIndex !== index) return;
		if (!input.trim()) return;
		const userId = getCurrentUserId();
		setMessages(prev => prev.map((m, i) => {
			if (i !== index) return m;
			if (m.type !== 'motion') return m;
			const replies = Array.isArray(m.replies) ? [...m.replies] : [];
			replies.push({ author: userId, text: input, time: new Date().toLocaleTimeString() });
			return { ...m, replies };
		}));
		setInput("");
	}

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
							<div style={{ display: "flex", gap: 32 }}>
						<div style={{ flex: 1, background: "#f8fbff", borderRadius: 12, padding: 24 }}>
							<h2 style={{ fontSize: "2.5rem", marginBottom: 8 }}>{meeting.name}</h2>
							<div style={{ fontSize: "1.3rem", marginBottom: 16 }}>
								<b>Meeting Code:</b> <code>{meeting.code}</code>
							</div>
							<div>
								<b>Members:</b>
								<ul style={{ marginTop: 8 }}>
									{meeting.members && meeting.members.length > 0 ? (
										meeting.members.map((m, i) => <li key={i}>{m}</li>)
									) : (
										<li>No members listed</li>
									)}
								</ul>
							</div>
						</div>
						<div style={{ width: 455, background: "#e5ecf5", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", height: 520 }}>
							<div style={{ fontWeight: 600, fontSize: "1.2rem", marginBottom: 8 }}>Chat</div>
							<div style={{ flex: 1, overflowY: "auto", marginBottom: 8, background: "#fff", borderRadius: 8, padding: 8, border: "1px solid #c0d3e7" }}>
								{messages.length === 0 && <div style={{ color: "#888" }}>No messages yet.</div>}
								{messages.map((msg, i) => {
									if (msg.type === 'motion') {
										const upCount = msg.votes?.up?.length || 0;
										const downCount = msg.votes?.down?.length || 0;
										const userId = getCurrentUserId();
										const userUp = (msg.votes?.up || []).includes(userId);
										const userDown = (msg.votes?.down || []).includes(userId);
										const selected = selectedMotionIndex === i;
										return (
											<div
												key={i}
												onClick={() => setSelectedMotionIndex(i)}
												style={{
													marginBottom: 12,
													padding: 8,
													borderRadius: 6,
													background: selected ? '#fff0f0' : '#fff8f8',
													border: selected ? '2px solid #f28b8b' : '1px solid #f1d0d0',
													cursor: 'pointer'
												}}
											>
												<div style={{ marginBottom: 6 }}><span style={{ color: "#0582CA", fontWeight: 500 }}>{msg.time}:</span> <b>Motion:</b> {msg.text}</div>
												<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
													<button onClick={(e) => { e.stopPropagation(); toggleVote(i, 'up'); }} style={{ background: userUp ? '#0b8457' : '#e0f1ea', color: userUp ? '#fff' : '#000', border: 'none', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }}>👍 {upCount}</button>
													<button onClick={(e) => { e.stopPropagation(); toggleVote(i, 'down'); }} style={{ background: userDown ? '#b71c1c' : '#fdecea', color: userDown ? '#fff' : '#000', border: 'none', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }}>👎 {downCount}</button>
												</div>
												{/* replies */}
												{msg.replies && msg.replies.length > 0 && (
													<div style={{ marginTop: 8, marginLeft: 12 }}>
														{msg.replies.map((r, ri) => (
															<div key={ri} style={{ marginBottom: 6, padding: 6, borderRadius: 6, background: '#fff5f5', marginLeft: 12 }}>
																<div style={{ color: '#666', fontSize: '0.9rem' }}>{r.time} — <b>{r.author}</b></div>
																<div style={{ marginTop: 4 }}>{r.text}</div>
															</div>
														))}
													</div>
												)}
											</div>
										);
									}
									return (
										<div key={i} style={{ marginBottom: 6 }}>
											<span style={{ color: "#0582CA", fontWeight: 500 }}>{msg.time}:</span> {msg.text}
										</div>
									);
								})}
								<div ref={chatEndRef} />
							</div>
							<form style={{ display: "flex", gap: 4 }}>
								<input
									type="text"
									value={input}
									onChange={e => setInput(e.target.value)}
									placeholder="Type a message or motion..."
									style={{ flex: 1, borderRadius: 6, border: "1px solid #b0b0b0", padding: 6 }}
								/>
								<button
									onClick={raiseMotion}
									style={{
										borderRadius: 6,
										background: "#e53935",
										color: "#fff",
										border: "none",
										padding: "6px 14px",
										fontWeight: 600,
										cursor: 'pointer'
									}}
								>
									Raise a Motion
								</button>
								<button
									onClick={() => replyToMotion(selectedMotionIndex)}
									disabled={selectedMotionIndex === null || !input.trim()}
									style={{
										borderRadius: 6,
										background: selectedMotionIndex === null || !input.trim() ? '#9fbfdc' : '#0077cc',
										color: "#fff",
										border: "none",
										padding: "6px 14px",
										fontWeight: 600,
										cursor: selectedMotionIndex === null || !input.trim() ? 'not-allowed' : 'pointer'
									}}
								>
									Reply
								</button>
							</form>
						</div>
					</div>
				</div>
			</>
		);
}