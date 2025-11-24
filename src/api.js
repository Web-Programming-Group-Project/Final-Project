const API_BASE = import.meta.env.VITE_API_BASE ?? "/.netlify/functions/api";

export async function registerUser({ username, email, password, firstName, lastName }) {
  const res = await fetch(`${API_BASE}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password, firstName, lastName }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Registration failed");
  return data;
}

export async function loginUser({ username, password }) {
  const res = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Login failed");
  return data;
}
//For allowing the user to update their name
export async function updateUser({ firstName, lastName }) {
  const res = await fetch(`${API_BASE}/update`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ firstName, lastName }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Name update failed");
  return data;
}

export async function listMeetings({ username, view = "my" }) {
  const params = new URLSearchParams({ username });
  if (view && view !== "my") params.set("view", view);
  const res = await fetch(`${API_BASE}/meetings?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to list meetings");
  return res.json(); // { meetings }
}

export async function createMeeting({ title, username }) {
  const res = await fetch(`${API_BASE}/meetings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, username }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Failed to create meeting");
  return data.meeting;
}

export async function getMeeting({ code }) {
  const res = await fetch(`${API_BASE}/meetings/${code}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Meeting not found");
  return data.meeting || data; // normalize
}

export async function joinMeeting({ code, username }) {
  const res = await fetch(`${API_BASE}/meetings/${code}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Failed to join");
  return data.meeting;
}

export async function raiseMotion({ code, username, text }) {
  const res = await fetch(`${API_BASE}/meetings/${code}/motions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, text }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Failed to raise motion");
  return data.motion;
}

export async function voteMotion({ code, motionId, username, vote }) {
  const res = await fetch(`${API_BASE}/meetings/${code}/motions/${motionId}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, vote }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Failed to vote");
  return data.motion;
}

export async function postMessage({ code, username, text, motionId }) {
  const res = await fetch(`${API_BASE}/meetings/${code}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, text, motionId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Failed to send message");
  return data.message;
}
