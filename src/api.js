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

//For allowing the meetings to be associated with users
export async function updateMeeting({ username, meeting }) {
  const res = await fetch(`${API_BASE}/update/meetings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, meeting }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Meeting add failed");
  return data;
}
