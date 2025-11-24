import React from "react";
import { useEffect, useState } from 'react';
import { useAppContext } from "../../AppContext";
import Header from "../../components/Header";
import { useNavigate } from "react-router-dom";
import CreateMeeting from "../../components/create-meeting";
import {
  listMeetings,
  createMeeting as apiCreateMeeting,
  joinMeeting as apiJoinMeeting,
} from "../../api";

//Page with join and create meeting functionality
//Accesses the list of meetings (for join functionality) Data structure for weekly report
//Accesses the MeetingSettings page (for create functionality)

export default function JoinCreate() {
  const [meetingList, setMeetingList] = useState([]);
  const [showCreate, setShowCreate] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState("");
  const [copiedCode, setCopiedCode] = useState(null);
  const { user } = useAppContext();
  const navigate = useNavigate();
  const username = user?.username || user?.email || "";
  
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!username) {
        setMeetingList([]);
        setLoadingList(false);
        return;
      }
      setLoadingList(true);
      setListError("");
      try {
        const data = await listMeetings({ username });
        if (!cancelled) {
          setMeetingList(data.meetings || []);
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
  }, [username]);

  async function refreshMeetings() {
    if (!username) return;
    try {
      setListError("");
      const data = await listMeetings({ username });
      setMeetingList(data.meetings || []);
    } catch (err) {
      console.error("Failed to refresh meetings", err);
      setListError(err.message || "Failed to refresh meetings");
    }
  }

  async function handleJoin() {
    const code = window.prompt("Enter meeting code to join:");
    if (!code) return;
    if (!username) {
      window.alert("You must be logged in to join a meeting.");
      return;
    }
    try {
      const meeting = await apiJoinMeeting({ code: code.trim(), username });
      await refreshMeetings();
      navigate("/Meetings", { state: { meeting, code: meeting?.code } });
    } catch (err) {
      console.error("Failed to join meeting", err);
      window.alert(err.message || "Failed to join meeting");
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
    const meeting = await apiCreateMeeting({ title, username });
    await refreshMeetings();
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
  
  return (
    <>
      <Header />
      <div className="panel-header">
        <h2 id="meeting-heading">My Meetings</h2>
        <h2 id="convo-heading">Convo</h2>
      </div>
      <div className="page-divider">
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
            {!loadingList && meetingList.length === 0 && (
              <tr>
                <td colSpan={3} style={{ textAlign: "center", padding: "1rem", color: "#666" }}>
                  No meetings yet.
                </td>
              </tr>
            )}
            {meetingList.map((meeting) => (
              <tr key={meeting._id || meeting.title}>
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
            onClick={handleJoin}
          >
          Join Meeting
          </button>
        </div>
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
