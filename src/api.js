import jsPDF from "jspdf";

const API_BASE = import.meta.env.VITE_API_BASE ?? "/.netlify/functions/api";

let authToken = null;

export function setAuthToken(token) {
  authToken = token || null;
}

function buildHeaders({ json = false, skipAuth = false } = {}) {
  const headers = {};
  if (json) headers["Content-Type"] = "application/json";
  if (!skipAuth && authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }
  return headers;
}

export async function registerUser({ username, email, password, firstName, lastName }) {
  const res = await fetch(`${API_BASE}/register`, {
    method: "POST",
    headers: buildHeaders({ json: true, skipAuth: true }),
    body: JSON.stringify({ username, email, password, firstName, lastName }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Registration failed");
  return data;
}

export async function loginUser({ username, password }) {
  const res = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: buildHeaders({ json: true, skipAuth: true }),
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Login failed");
  return data;
}
export async function getUserProfile({ username }) {
  const res = await fetch(`${API_BASE}/users/${encodeURIComponent(username)}`, {
    headers: buildHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Failed to load profile");
  return data.user;
}

export async function updateUserProfile({ currentUsername, firstName, lastName, username, email, password }) {
  const payload = { firstName, lastName, username, email };
  if (typeof password === "string" && password.trim()) {
    payload.password = password;
  }
  const res = await fetch(`${API_BASE}/users/${encodeURIComponent(currentUsername)}`, {
    method: "PATCH",
    headers: buildHeaders({ json: true }),
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Failed to update profile");
  return data.user;
}

export async function listMeetings({ username, view = "my" }) {
  const params = new URLSearchParams({ username });
  if (view && view !== "my") params.set("view", view);
  const res = await fetch(`${API_BASE}/meetings?${params.toString()}`, {
    headers: buildHeaders(),
  });
  if (!res.ok) throw new Error("Failed to list meetings");
  return res.json(); // { meetings }
}

export async function createMeeting({ title, username, displayName }) {
  const res = await fetch(`${API_BASE}/meetings`, {
    method: "POST",
    headers: buildHeaders({ json: true }),
    body: JSON.stringify({ title, username, displayName }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Failed to create meeting");
  return data.meeting;
}

export async function getMeeting({ code }) {
  const res = await fetch(`${API_BASE}/meetings/${code}`, {
    headers: buildHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Meeting not found");
  return data.meeting || data; // normalize
}

export async function joinMeeting({ code, username, displayName }) {
  const res = await fetch(`${API_BASE}/meetings/join`, {
    method: "POST",
    headers: buildHeaders({ json: true }),
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
    headers: buildHeaders({ json: true }),
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
    headers: buildHeaders({ json: true }),
    body: JSON.stringify({ username, vote }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Failed to vote");
  return data.motion;
}

export async function postMessage({ code, username, text, motionId }) {
  const res = await fetch(`${API_BASE}/meetings/${code}/messages`, {
    method: "POST",
    headers: buildHeaders({ json: true }),
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
      headers: buildHeaders({ json: true }),
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
    headers: buildHeaders({ json: true }),
    body: JSON.stringify({ username, decisionSummary, prosSummary, consSummary }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Failed to close motion");
  return data.meeting;
}

export async function addReplyToMotion({ meetingId, motionId, text, stance, displayName, username }) {
  const res = await fetch(`${API_BASE}/meetings/${meetingId}/motions/${motionId}/replies`, {
    method: "POST",
    headers: buildHeaders({ json: true }),
    body: JSON.stringify({ text, stance, displayName, username }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Failed to add reply");
  return data.motion;
}

export async function updateMeetingSummary({ code, username, meetingSummary }) {
  const res = await fetch(`${API_BASE}/meetings/${code}/summary`, {
    method: "PUT",
    headers: buildHeaders({ json: true }),
    body: JSON.stringify({ username, meetingSummary }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Failed to update meeting summary");
  return data.meeting;
}

export async function fetchMeetingMinutesText({ code }) {
  const res = await fetch(`${API_BASE}/meetings/${code}/export`, {
    headers: buildHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to export meeting minutes");
  }
  return await res.text();
}

export async function downloadMeetingMinutesTxt({ code, filename }) {
  const minutesText = await fetchMeetingMinutesText({ code });
  const blob = new Blob([minutesText], { type: "text/plain;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || "meeting-minutes.txt";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export async function downloadMeetingMinutesPdf({ code, filename, meeting }) {
  if (!meeting) {
    const minutesText = await fetchMeetingMinutesText({ code });
    const docFallback = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "letter",
    });
    const marginFallback = 40;
    const maxWidthFallback = docFallback.internal.pageSize.getWidth() - marginFallback * 2;
    const fallbackLines = docFallback.splitTextToSize(minutesText, maxWidthFallback);
    const lineHeightFallback = 14;
    const pageHeightFallback = docFallback.internal.pageSize.getHeight();
    let cursor = marginFallback;
    fallbackLines.forEach((line) => {
      if (cursor + lineHeightFallback > pageHeightFallback - marginFallback) {
        docFallback.addPage();
        cursor = marginFallback;
      }
      docFallback.text(line, marginFallback, cursor);
      cursor += lineHeightFallback;
    });
    docFallback.save(filename || "meeting-minutes.pdf");
    return;
  }

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "letter",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;
  let cursorY = margin;

  const setFont = (size, style = "normal") => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
  };

  const ensureSpace = (lines = 1, lineHeight = 16) => {
    if (cursorY + lines * lineHeight > pageHeight - margin) {
      doc.addPage();
      cursorY = margin;
    }
  };

  const addSpacing = (amount = 10) => {
    cursorY += amount;
  };

  const addTextBlock = ({ text, size = 11, style = "normal", indent = 0, spacing = 6 }) => {
    if (!text && text !== 0) return;
    const usableWidth = contentWidth - indent;
    const lines = doc.splitTextToSize(String(text), usableWidth);
    lines.forEach((line) => {
      ensureSpace(1, size + 2);
      setFont(size, style);
      doc.text(line, margin + indent, cursorY);
      cursorY += size + 2;
    });
    cursorY += Math.max(spacing - 2, 0);
  };

  const addCenteredTitle = (text, size = 20) => {
    ensureSpace(1, size + 6);
    setFont(size, "bold");
    doc.text(text, pageWidth / 2, cursorY, { align: "center" });
    cursorY += size + 6;
  };

  const addHeading = (text, size = 14) => {
    ensureSpace(1, size + 4);
    setFont(size, "bold");
    doc.text(text, margin, cursorY);
    cursorY += size + 4;
  };

  const addBulletList = (items, { indent = 16 } = {}) => {
    if (!items || items.length === 0) {
      addTextBlock({ text: "• None recorded.", indent });
      return;
    }
    items.forEach((text) => {
      addTextBlock({ text: `• ${text}`, indent });
    });
  };

  const formatDate = (value) => {
    if (!value) return "Unknown date";
    const date = typeof value === "string" ? new Date(value) : value;
    return date.toLocaleString();
  };

  const motionMap = new Map((meeting.motions || []).map((motion) => [String(motion._id), motion]));
  const motionById = (id) => motionMap.get(String(id));

  addCenteredTitle("Convo – Meeting Minutes");

  setFont(12, "bold");
  doc.text(`Meeting: ${meeting.title || meeting.code || "Untitled meeting"}`, margin, cursorY);
  cursorY += 16;
  setFont(11);
  doc.text(`Code: ${meeting.code || "Unknown"}`, margin, cursorY);
  cursorY += 14;
  doc.text(`Created: ${formatDate(meeting.createdAt)}`, margin, cursorY);
  cursorY += 14;
  const status = meeting.adjourned
    ? `Meeting adjourned on ${formatDate(meeting.adjournedAt)}.`
    : "Meeting still open at time of export.";
  doc.text(`Status: ${status}`, margin, cursorY);
  cursorY += 18;

  addHeading("Participants", 13);
  const participants = (meeting.participants || []).map((p) => {
    const name = p.displayName || p.username || "Unknown";
    return `${name}${p.role ? ` (${p.role})` : ""}`;
  });
  addBulletList(participants);
  addSpacing(6);

  addHeading("Overall Summary", 13);
  const overallSummary = (meeting.meetingSummary || "").trim() || "No overall summary provided.";
  addTextBlock({ text: overallSummary });
  addSpacing(6);

  addHeading("Motions and Decisions", 13);

  const motions = [...(meeting.motions || [])].sort(
    (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
  );

  motions.forEach((motion, index) => {
    const title = motion.title || motion.text || "Untitled motion";
    const outcome = (motion.outcome || "pending").toUpperCase();
    const typeLabel =
      motion.motionCategory === "special"
        ? `Special motion — ${motion.specialMotionType || "Special"}`
        : motion.type === "procedure"
        ? "Procedural motion"
        : "Standard motion";
    const requiredPct =
      typeof motion.requiredPercentage === "number"
        ? `${motion.requiredPercentage}%`
        : motion.type === "procedure"
        ? "66%"
        : "50%";
    const votingMode = (motion.votingMode || "named").toLowerCase();
    const tally = `${motion.votes?.up ?? 0} in favor, ${motion.votes?.down ?? 0} against`;
    const decisionSummary =
      (motion.decisionSummary || "").trim() || "None provided.";

    addTextBlock({
      text: `${index + 1}. ${title} — ${outcome}`,
      size: 13,
      style: "bold",
      spacing: 4,
    });
    addTextBlock({
      text: `Type: ${typeLabel} (requires ${requiredPct})`,
      indent: 12,
    });
    addTextBlock({
      text: `Voting mode: ${votingMode === "anonymous" ? "Anonymous" : "Named"}`,
      indent: 12,
    });
    addTextBlock({
      text: `Final tally: ${tally}.`,
      indent: 12,
    });
    addTextBlock({
      text: `Decision summary: ${decisionSummary}`,
      indent: 12,
    });

    if (motion.isOverturn && motion.targetMotionId) {
      const targetMotion = motionById(motion.targetMotionId);
      const targetTitle = targetMotion?.title || targetMotion?.text || "previous motion";
      addTextBlock({
        text: `Overturns decision on: ${targetTitle}.`,
        indent: 12,
      });
    }

    if (motion.overturned && motion.overturnedByMotionId) {
      const overturner = motionById(motion.overturnedByMotionId);
      const overturnTitle = overturner?.title || overturner?.text || "Unknown motion";
      addTextBlock({
        text: `Note: This decision was later OVERTURNED by "${overturnTitle}".`,
        indent: 12,
      });
    }

    if ((motion.subType || motion.subMotionType || "").toLowerCase() === "revise") {
      const parent = motionById(motion.parentMotionId || motion.targetMotionId);
      const parentTitle = parent?.title || parent?.text || "Original motion";
      addTextBlock({
        text: `Revises: ${parentTitle}.`,
        indent: 12,
      });
      if ((motion.title || "").trim()) {
        addTextBlock({
          text: `Proposed new title: ${motion.title}.`,
          indent: 12,
        });
      }
      if ((motion.description || "").trim()) {
        addTextBlock({
          text: `Proposed description: ${motion.description}.`,
          indent: 12,
        });
      }
    } else if ((motion.subType || motion.subMotionType || "").toLowerCase() === "postpone") {
      const parent = motionById(motion.parentMotionId || motion.targetMotionId);
      const parentTitle = parent?.title || parent?.text || "Original motion";
      addTextBlock({
        text: `Postpones decision on: ${parentTitle}.`,
        indent: 12,
      });
      if (motion.postponeUntil) {
        addTextBlock({
          text: `Postponed until: ${motion.postponeUntil}.`,
          indent: 12,
        });
      }
    } else if ((motion.outcome || "").toLowerCase() === "postponed") {
      addTextBlock({
        text: `Note: Decision on this motion was POSTPONED.`,
        indent: 12,
      });
    }

    if ((motion.motionCategory || "").toLowerCase() === "special") {
      const effectMap = {
        adjourn: "Effect: Adjourns the current meeting.",
        closeDebate: "Effect: Closes discussion on current motion.",
        pointOfOrder: "Effect: Chair must rule on the procedural question.",
      };
      const effect = effectMap[(motion.specialMotionType || "").toLowerCase()];
      if (effect) {
        addTextBlock({ text: effect, indent: 12 });
      }
    }

    addTextBlock({ text: "Pros:", indent: 12, style: "bold", spacing: 2 });
    const pros = (motion.replies || []).filter(
      (reply) => (reply.stance || "").toLowerCase() === "pro"
    );
    addBulletList(
      pros.map((reply) => `${reply.authorDisplayName || reply.authorUsername || "Unknown"}: ${reply.text}`),
      { indent: 24 }
    );

    addTextBlock({ text: "Cons:", indent: 12, style: "bold", spacing: 2 });
    const cons = (motion.replies || []).filter(
      (reply) => (reply.stance || "").toLowerCase() === "con"
    );
    addBulletList(
      cons.map((reply) => `${reply.authorDisplayName || reply.authorUsername || "Unknown"}: ${reply.text}`),
      { indent: 24 }
    );

    addTextBlock({ text: "Discussion:", indent: 12, style: "bold", spacing: 2 });
    const discussionMessages = (meeting.messages || []).filter(
      (msg) => msg.motionId && String(msg.motionId) === String(motion._id)
    );
    const replyEntries = (motion.replies || []).map((reply) => ({
      type: "reply",
      createdAt: reply.createdAt || motion.updatedAt || motion.createdAt,
      author: reply.authorDisplayName || reply.authorUsername || "Unknown",
      stance: reply.stance || "neutral",
      text: reply.text,
    }));
    const messageEntries = discussionMessages.map((msg) => ({
      type: "message",
      createdAt: msg.createdAt || new Date(),
      author: msg.author || "System",
      text: msg.text,
    }));
    const discussionEntries = [...replyEntries, ...messageEntries].sort(
      (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
    );
    if (discussionEntries.length === 0) {
      addTextBlock({ text: "• None recorded.", indent: 24 });
    } else {
      discussionEntries.forEach((entry) => {
        const stanceSuffix =
          entry.type === "reply" ? ` (${entry.stance || "neutral"})` : "";
        addTextBlock({
          text: `• [${formatDate(entry.createdAt)} — ${entry.author}]${stanceSuffix}: ${entry.text}`,
          indent: 24,
        });
      });
    }

    addSpacing(6);
  });

  doc.save(filename || "meeting-minutes.pdf");
}

export async function addParticipant({ code, username, role, currentUsername }) {
  const res = await fetch(`${API_BASE}/meetings/${encodeURIComponent(code)}/add-participant`, {
    method: "POST",
    headers: buildHeaders({ json: true }),
    body: JSON.stringify({ username, role, currentUsername }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Failed to add participant");
  return data.meeting || data;
}

export async function getNotifications({ username }) {
  const params = new URLSearchParams({ username });
  const res = await fetch(`${API_BASE}/notifications?${params.toString()}`, {
    headers: buildHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Failed to load notifications");
  return data;
}

export async function markNotificationRead({ username, notificationId }) {
  const res = await fetch(`${API_BASE}/notifications/mark-read`, {
    method: "POST",
    headers: buildHeaders({ json: true }),
    body: JSON.stringify({ username, notificationId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Failed to update notification");
  return data;
}

export async function markAllNotificationsRead({ username }) {
  const res = await fetch(`${API_BASE}/notifications/mark-read`, {
    method: "POST",
    headers: buildHeaders({ json: true }),
    body: JSON.stringify({ username, all: true }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Failed to update notifications");
  return data;
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
    headers: buildHeaders({ json: true }),
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
    headers: buildHeaders({ json: true }),
    body: JSON.stringify({ username, decision }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Failed to record chair decision");
  return data.meeting;
}
