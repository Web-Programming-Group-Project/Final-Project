import React, { useEffect, useState } from "react";
import { useAppContext } from "../AppContext";
import Header from "../components/Header";
import { getUserProfile, updateUserProfile } from "../api";
import { useNavigate } from "react-router-dom";

export default function User() {
  const { user, setUser } = useAppContext();
  const navigate = useNavigate();

  const [formValues, setFormValues] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
  });
  const [currentUsername, setCurrentUsername] = useState(user?.username || "");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!user?.username) {
      setLoading(false);
      setLoadError("You must be signed in to view your profile.");
      return;
    }

    let ignore = false;
    async function loadProfile() {
      setLoading(true);
      setLoadError("");
      try {
        const result = await getUserProfile({ username: user.username });
        if (ignore) return;
        setFormValues({
          firstName: result?.firstName || "",
          lastName: result?.lastName || "",
          username: result?.username || "",
          email: result?.email || "",
          password: "",
        });
        setCurrentUsername(result?.username || user.username);
      } catch (err) {
        if (ignore) return;
        setLoadError(err.message || "Failed to load profile.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    loadProfile();
    return () => {
      ignore = true;
    };
  }, [user?.username, reloadToken]);

  const fullName = [formValues.firstName || user?.firstName, formValues.lastName || user?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  function handleInputChange(e) {
    const { name, value } = e.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    setSaveError("");
    setSuccessMessage("");
  }

  function validateForm() {
    const errors = {};
    if (!formValues.firstName.trim()) errors.firstName = "First name is required.";
    if (!formValues.lastName.trim()) errors.lastName = "Last name is required.";
    if (!formValues.username.trim()) errors.username = "Username is required.";
    if (!formValues.email.trim()) errors.email = "Email is required.";
    return errors;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setSaveError("Please fix the highlighted fields.");
      setSuccessMessage("");
      return;
    }

    setSaving(true);
    setSaveError("");
    setSuccessMessage("");
    setFieldErrors({});

    try {
      const updated = await updateUserProfile({
        currentUsername,
        firstName: formValues.firstName.trim(),
        lastName: formValues.lastName.trim(),
        username: formValues.username.trim(),
        email: formValues.email.trim(),
        password: formValues.password,
      });
      setUser((prev) => ({ ...prev, ...updated }));
      setCurrentUsername(updated.username);
      setFormValues({
        firstName: updated.firstName || "",
        lastName: updated.lastName || "",
        username: updated.username || "",
        email: updated.email || "",
        password: "",
      });
      setSuccessMessage("Profile updated.");
    } catch (err) {
      const message = err.message || "Failed to update profile.";
      setSaveError(message);
      if (message.toLowerCase().includes("username")) {
        setFieldErrors((prev) => ({ ...prev, username: message }));
      }
    } finally {
      setSaving(false);
    }
  }

  function handleBackToDashboard() {
    navigate("/JoinCreate");
  }

  if (!user) {
    return (
      <>
        <Header />
        <div style={{ maxWidth: 640, margin: "3rem auto", padding: "0 1rem", textAlign: "center" }}>
          <h2>Please sign in to view your profile.</h2>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div style={{ maxWidth: 720, margin: "2rem auto 3rem", padding: "0 1rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
          <h1 style={{ fontSize: "2.5rem", margin: 0 }}>{fullName.trim() || "Your Profile"}</h1>
          <p style={{ color: "#555", fontSize: "1.05rem", margin: 0 }}>{formValues.email || user.email}</p>
        </div>

        {loadError && (
          <div
            style={{
              background: "#fdecea",
              color: "#b71c1c",
              padding: "0.85rem 1rem",
              borderRadius: 8,
              marginBottom: "1rem",
              border: "1px solid #f5c2c0",
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              gap: "0.5rem",
            }}
          >
            <span>{loadError}</span>
            <button
              type="button"
              onClick={() => setReloadToken((count) => count + 1)}
              style={{
                background: "#fff",
                color: "#b71c1c",
                border: "1px solid #f5c2c0",
                borderRadius: 6,
                padding: "0.25rem 0.75rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Retry
            </button>
          </div>
        )}

        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            padding: "1.5rem",
            boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
            border: "1px solid #e2e8f0",
          }}
        >
          {loading ? (
            <div>Loading profile…</div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <ProfileField
                label="First name"
                name="firstName"
                value={formValues.firstName}
                onChange={handleInputChange}
                error={fieldErrors.firstName}
              />
              <ProfileField
                label="Last name"
                name="lastName"
                value={formValues.lastName}
                onChange={handleInputChange}
                error={fieldErrors.lastName}
              />
              <ProfileField
                label="Username"
                name="username"
                value={formValues.username}
                onChange={handleInputChange}
                error={fieldErrors.username}
              />
              <ProfileField
                label="Email"
                name="email"
                type="email"
                value={formValues.email}
                onChange={handleInputChange}
                error={fieldErrors.email}
              />
              <ProfileField
                label="New password"
                name="password"
                type="password"
                placeholder="Leave blank to keep current password"
                value={formValues.password}
                onChange={handleInputChange}
              />

              {saveError && (
                <div style={{ color: "#b71c1c", fontWeight: 500, fontSize: "0.95rem" }}>{saveError}</div>
              )}
              {successMessage && (
                <div style={{ color: "#1b5e20", fontWeight: 500, fontSize: "0.95rem" }}>{successMessage}</div>
              )}

              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    background: saving ? "#9fbfdc" : "#0582CA",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    padding: "0.65rem 1.5rem",
                    fontWeight: 600,
                    cursor: saving ? "not-allowed" : "pointer",
                  }}
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
                <button
                  type="button"
                  onClick={handleBackToDashboard}
                  style={{
                    background: "#fff",
                    color: "#0582CA",
                    border: "1px solid #0582CA",
                    borderRadius: 8,
                    padding: "0.65rem 1.3rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Back to dashboard
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}

function ProfileField({ label, name, value, onChange, type = "text", error, placeholder }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontWeight: 600 }}>
      {label}
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{
          borderRadius: 8,
          border: `1px solid ${error ? "#f44336" : "#cbd5f5"}`,
          padding: "0.5rem 0.75rem",
          fontSize: "1rem",
        }}
      />
      {error && <span style={{ color: "#c62828", fontWeight: 500, fontSize: "0.85rem" }}>{error}</span>}
    </label>
  );
}
