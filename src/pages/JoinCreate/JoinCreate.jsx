import React from "react";
import { useEffect, useState } from 'react';
import { useAppContext } from "../../AppContext";
import Header from "../../components/Header";
import { useNavigate } from "react-router-dom";
import CreateMeeting from "../../components/create-meeting";
import {
  Dialog,
  Classes,
  Button as BPButton,
  FormGroup,
  InputGroup,
} from "@blueprintjs/core";
import {
  listMeetings,
  createMeeting as apiCreateMeeting,
  joinMeeting as apiJoinMeeting,
} from "../../api";

//Page with join and create meeting functionality
//Accesses the list of meetings (for join functionality) Data structure for weekly report
//Accesses the MeetingSettings page (for create functionality)

export default function JoinCreate() {
  const [meetings, setMeetings] = useState([]);
  const [showCreate, setShowCreate] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState("");
  const [copiedCode, setCopiedCode] = useState(null);
  const [activeTab, setActiveTab] = useState("my");
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinDisplayName, setJoinDisplayName] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joining, setJoining] = useState(false);
  const { user } = useAppContext();
  const navigate = useNavigate();
  const username = user?.username || user?.email || "";

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!username) {
        setMeetings([]);
        setLoadingList(false);
        return;
      }
      setLoadingList(true);
      setListError("");
      try {
        const data = await listMeetings({ username, view: activeTab });
        if (!cancelled) {
          setMeetings(data.meetings || []);
        }
      } catch (err) {
        console.error("Failed to load meetings", err);
        if (!cancelled) {
          setListError(err.message || "Failed to load meetings");
        }
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [username, activeTab]);

  useEffect(() => {
    setCopiedCode(null);
  }, [activeTab]);

  async function refreshMeetings(view = activeTab) {
    if (!username) return;
    const targetView = view;
    const affectsCurrentView = targetView === activeTab;
    if (affectsCurrentView) {
      setLoadingList(true);
      setListError("");
    }
    try {
      const data = await listMeetings({ username, view: targetView });
      if (targetView === activeTab) {
        setMeetings(data.meetings || []);
      }
    } catch (err) {
      console.error("Failed to refresh meetings", err);
      if (targetView === activeTab) {
        setListError(err.message || "Failed to refresh meetings");
      }
    } finally {
      if (targetView === activeTab) {
        setLoadingList(false);
      }
    }
  }

  useEffect(() => {
    if (showJoinForm) {
      setJoinDisplayName(username);
    }
  }, [showJoinForm, username]);

  function openJoinForm() {
    if (!username) {
      window.alert("You must be logged in to join a meeting.");
      return;
    }
    setJoinCode("");
    setJoinDisplayName(username);
    setJoinError("");
    setShowJoinForm(true);
  }

  async function handleJoinSubmit(e) {
    e?.preventDefault();
    if (!username) {
      setJoinError("You must be logged in to join a meeting.");
      return;
    }
    if (!joinCode.trim()) {
      setJoinError("Meeting code is required.");
      return;
    }
    setJoining(true);
    setJoinError("");
    try {
      const data = await apiJoinMeeting({
        code: joinCode.trim(),
        username,
        displayName: joinDisplayName?.trim(),
      });
      await refreshMeetings(activeTab);
      setShowJoinForm(false);
      navigate("/Meetings", { state: { meeting: data.meeting, code: data.meeting?.code } });
    } catch (err) {
      console.error("Failed to join meeting", err);
      setJoinError(err.message || "Failed to join meeting");
    } finally {
      setJoining(false);
    }
  }

  async function handleCreate(meetingName) {
    if (!username) {
      throw new Error("You must be logged in to create a meeting");
    }
    const title = meetingName?.trim();
    if (!title) {
      throw new Error("Title is required");
    }
    const meeting = await apiCreateMeeting({ title, username, displayName: username });
    if (activeTab === "my") {
      await refreshMeetings("my");
    } else {
      setActiveTab("my");
    }
    return meeting;
  }

  async function handleCopyCode(code) {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 1500);
    } catch (err) {
      console.error("Failed to copy code", err);
      window.alert("Failed to copy code. Please copy it manually.");
    }
  }

  function handleRejoinMeeting(meeting) {
    if (!meeting?.code) {
      window.alert("Meeting code unavailable. Please join with the code manually.");
      return;
    }
    navigate("/Meetings", { state: { meeting, code: meeting.code } });
  }
  
  return (
    <>
      <Header />
      <div className="panel-header" style={{ alignItems: "center", gap: "1rem" }}>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            type="button"
            style={{
              padding: "6px 16px",
              fontSize: "1rem",
              background: activeTab === "my" ? "#0582CA" : "#f0f4f8",
              color: activeTab === "my" ? "#fff" : "#0582CA",
              border: "1px solid #0582CA",
              borderRadius: 999,
            }}
            onClick={() => setActiveTab("my")}
          >
            My Meetings
          </button>
          <button
            type="button"
            style={{
              padding: "6px 16px",
              fontSize: "1rem",
              background: activeTab === "recent" ? "#0582CA" : "#f0f4f8",
              color: activeTab === "recent" ? "#fff" : "#0582CA",
              border: "1px solid #0582CA",
              borderRadius: 999,
            }}
            onClick={() => setActiveTab("recent")}
          >
            Recent Meetings
          </button>
        </div>
        <h2 id="convo-heading">Convo</h2>
      </div>
      <div className="page-divider">
        {activeTab === "my" && (
          <table className="meeting-table" id="meetingTable">
            <thead>
              <tr>
                <th scope="col">Meeting Name</th>
                <th scope="col">Code</th>
                <th scope="col">Copy</th>
              </tr>
            </thead>
            <tbody id="meeting-list">
              {loadingList && (
                <tr>
                  <td colSpan={3} style={{ textAlign: "center", padding: "1rem" }}>
                    Loading meetings...
                  </td>
                </tr>
              )}
              {!loadingList && meetings.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ textAlign: "center", padding: "1rem", color: "#666" }}>
                    No meetings yet.
                  </td>
                </tr>
              )}
              {!loadingList && meetings.map((meeting) => (
                <tr key={meeting._id || meeting.code || meeting.title}>
                  <td>{meeting.title || meeting.name}</td>
                  <td><code>{meeting.code || "—"}</code></td>
                  <td>
                    <button
                      type="button"
                      className="copy-code-button"
                      style={{
                        padding: "4px 10px",
                        fontSize: "0.85rem",
                        borderRadius: 6,
                        border: "1px solid #0582CA",
                        background: copiedCode === meeting.code ? "#0582CA" : "#fff",
                        color: copiedCode === meeting.code ? "#fff" : "#0582CA",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                      onClick={() => handleCopyCode(meeting.code)}
                    >
                      {copiedCode === meeting.code ? "Copied!" : "Copy Code"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === "recent" && (
          <table className="meeting-table" id="recentMeetingTable">
            <thead>
              <tr>
                <th scope="col">Meeting Name</th>
                <th scope="col">Owner</th>
                <th scope="col">Rejoin</th>
              </tr>
            </thead>
            <tbody>
              {loadingList && (
                <tr>
                  <td colSpan={3} style={{ textAlign: "center", padding: "1rem" }}>
                    Loading meetings...
                  </td>
                </tr>
              )}
              {!loadingList && meetings.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ textAlign: "center", padding: "1rem", color: "#666" }}>
                    No recent meetings found.
                  </td>
                </tr>
              )}
              {!loadingList && meetings.map((meeting) => (
                <tr key={meeting._id || meeting.code || meeting.title}>
                  <td>{meeting.title || meeting.name}</td>
                  <td>{meeting.owner || meeting.createdBy || "Unknown"}</td>
                  <td>
                    <button
                      type="button"
                      className="copy-code-button"
                      style={{
                        padding: "4px 12px",
                        fontSize: "0.85rem",
                        borderRadius: 6,
                        border: "1px solid #0582CA",
                        background: "#0582CA",
                        color: "#fff",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                      onClick={() => handleRejoinMeeting(meeting)}
                    >
                      Rejoin
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="button-section">
          <button
            className="LargeButton"
            id = "Creator"
            onClick={() => setShowCreate("active")}
          >
          Create Meeting
          </button>
          <button
            className="LargeButton"
            id = "Joiner"
            onClick={openJoinForm}
          >
          Join Meeting
          </button>
        </div>
        <Dialog
          isOpen={showJoinForm}
          onClose={() => {
            if (joining) return;
            setShowJoinForm(false);
            setJoinError("");
          }}
        >
          <div className={`${Classes.DIALOG_HEADER} flex items-center justify-between`}>
            <h4>Join Meeting</h4>
            <BPButton icon="cross" minimal onClick={() => { if (!joining) { setShowJoinForm(false); setJoinError(""); } }} />
          </div>
          <div className={Classes.DIALOG_BODY}>
            <form onSubmit={handleJoinSubmit} className="flex flex-col gap-4">
              <FormGroup label="Meeting Code" labelFor="meeting-code-input">
                <InputGroup
                  id="meeting-code-input"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="e.g. ABC123"
                  required
                  disabled={joining}
                />
              </FormGroup>
              <FormGroup label="Display Name" labelFor="display-name-input">
                <InputGroup
                  id="display-name-input"
                  value={joinDisplayName}
                  onChange={(e) => setJoinDisplayName(e.target.value)}
                  placeholder="How other participants will see you"
                  disabled={joining}
                />
              </FormGroup>
              {joinError && (
                <p className="text-sm text-red-600">{joinError}</p>
              )}
              <div className={`${Classes.DIALOG_FOOTER} flex justify-end gap-2`}>
                <BPButton onClick={() => { if (!joining) { setShowJoinForm(false); setJoinError(""); } }} disabled={joining}>
                  Cancel
                </BPButton>
                <BPButton intent="primary" type="submit" loading={joining}>
                  Join Meeting
                </BPButton>
              </div>
            </form>
          </div>
        </Dialog>
        {listError && (
          <div style={{ marginTop: "1rem", color: "red", textAlign: "center" }}>
            {listError}
          </div>
        )}
      </div>
      {showCreate && (
        <CreateMeeting
          isOpen
          onClose={() => setShowCreate(null)}
          onCreate={handleCreate}
        />
      )}
    </>
  );
}
