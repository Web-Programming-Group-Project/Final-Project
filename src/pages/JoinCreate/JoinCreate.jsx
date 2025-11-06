import React from "react";
import { useEffect, useMemo, useState } from 'react';
import { useAppContext } from "../../AppContext";
import Header from "../../components/Header";
import { useNavigate } from "react-router-dom";
import CreateMeeting from "../../components/create-meeting";

// Helper to generate a short random code (6 alphanumeric chars)
function generateMeetingCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

//Page with join and create meeting functionality
//Accesses the list of meetings (for join functionality) Data structure for weekly report
//Accesses the MeetingSettings page (for create functionality)

export default function JoinCreate() {
  const [meetingList, setMeetingList] = useState([]);
  const [showCreate, setShowCreate] = useState(null);
  const { user } = useAppContext();
  const navigate = useNavigate();
  
  //take data from the database
  //use setMeetingList to update with the list of meetings in the database


  async function testJoin() {
    const code = window.prompt("Enter meeting code to join:");
    if (!code) return;
    const found = meetingList.find(m => m.code === code.trim().toUpperCase());
    if (found) {
      navigate("/Meetings", { state: { meeting: found } });
    } else {
      window.alert("No meeting found with that code.");
    }
  }

  async function testAdd(meetingName, isOpenMeeting) {
    const code = generateMeetingCode();
    const userId = user?.username || user?.email || "anon";
    // Remove any previous meeting by this user
    const filtered = meetingList.filter(m => m.creatorId !== userId);
    const newMeeting = {
      id: filtered.length, // id should be the next index
      name: meetingName,
      code,
      isOpen: isOpenMeeting,
      creatorId: userId
    };
    const updatedList = [...filtered, newMeeting];
    // Reassign ids to ensure uniqueness and order
    const reIdList = updatedList.map((m, idx) => ({ ...m, id: idx }));
    setMeetingList(reIdList);
    setShowCreate(null);
    // No auto-navigation; creator must join via code like others
  }
  
  return (
    <>
      <Header />
      <div className="panel-header">
        <h2 id="meeting-heading">Current Meetings</h2>
        <h2 id="convo-heading">Convo</h2>
      </div>
      <div className="page-divider">
        <table className="meeting-table" id="meetingTable">
          <thead>
            <tr>
              <th scope="col">Meeting Name</th>
              <th scope="col">Code</th>
            </tr>
          </thead>
          <tbody id="meeting-list">
            {meetingList.map((meeting) => {
              const isCreator = meeting.creatorId === (user?.username || user?.email || "anon");
              return (
                <tr
                  key={meeting.id}
                  style={isCreator ? { cursor: "pointer", background: "#e0f3ff" } : {}}
                  title={isCreator ? "Click to join your meeting" : undefined}
                  onClick={isCreator ? () => navigate("/Meetings", { state: { meeting } }) : undefined}
                >
                  <td>{meeting.name}</td>
                  <td>
                    {meeting.isOpen
                      ? <code>{meeting.code}</code>
                      : <span style={{ color: '#888', fontStyle: 'italic' }}>Closed</span>
                    }
                  </td>
                </tr>
              );
            })}
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
            onClick={testJoin}
          >
          Join Meeting
          </button>
        </div>
      </div>
      {showCreate && ( <CreateMeeting isOpen onClose={() => setShowCreate(null)} onCreate={testAdd} />) }
    </>
  );
}
