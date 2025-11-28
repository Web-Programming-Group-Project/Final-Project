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
export async function updateUser({ username, firstName, lastName }) {
  const res = await fetch(`${API_BASE}/update`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, firstName, lastName }),
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

export async function createMeeting({ title, username, displayName }) {
  const res = await fetch(`${API_BASE}/meetings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, username, displayName }),
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

export async function joinMeeting({ code, username, displayName }) {
  const res = await fetch(`${API_BASE}/meetings/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, username, displayName }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Failed to join");
  return data;
}

export async function raiseMotion({
  code,
  username,
  title,
  description,
  text,
  type = "standard",
  votingMode = "named",
  subType = "none",
  parentMotionId,
  postponeUntil,
  motionCategory,
  specialMotionType,
}) {
  const res = await fetch(`${API_BASE}/meetings/${code}/motions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username,
      motionTitle: title ?? text,
      motionDescription: description ?? "",
      motionText: text ?? title ?? "",
      motionType: type,
      votingMode,
      subType,
      parentMotionId,
      postponeUntil,
      motionCategory,
      specialMotionType,
    }),
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

export async function updateParticipantRole({ meetingId, participantUsername, newRole, username }) {
  const res = await fetch(
    `${API_BASE}/meetings/${meetingId}/participants/${encodeURIComponent(participantUsername)}/role`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newRole, username }),
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Failed to update role");
  return data.meeting;
}

export async function closeMotion({ code, motionId, username, decisionSummary, prosSummary, consSummary }) {
  const res = await fetch(`${API_BASE}/meetings/${code}/motions/${motionId}/close`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, decisionSummary, prosSummary, consSummary }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Failed to close motion");
  return data.meeting;
}

export async function addReplyToMotion({ meetingId, motionId, text, stance, displayName, username }) {
  const res = await fetch(`${API_BASE}/meetings/${meetingId}/motions/${motionId}/replies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, stance, displayName, username }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Failed to add reply");
  return data.motion;
}

export async function updateMeetingSummary({ code, username, meetingSummary }) {
  const res = await fetch(`${API_BASE}/meetings/${code}/summary`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, meetingSummary }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Failed to update meeting summary");
  return data.meeting;
}

export async function downloadMeetingMinutes({ code }) {
  const res = await fetch(`${API_BASE}/meetings/${code}/export`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to export meeting minutes");
  }
  return res.blob();
}

export async function createOverturnMotion({
  meetingId,
  username,
  targetMotionId,
  title,
  description,
  motionType = "procedure",
  votingMode = "named",
}) {
  const res = await fetch(`${API_BASE}/meetings/${meetingId}/motions/overturn`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username,
      targetMotionId,
      title,
      description,
      motionType,
      votingMode,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Failed to raise overturn motion");
  return data;
}

export async function recordChairDecision({ meetingId, motionId, username, decision }) {
  const res = await fetch(`${API_BASE}/meetings/${meetingId}/motions/${motionId}/chair-decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, decision }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Failed to record chair decision");
  return data.meeting;
}
