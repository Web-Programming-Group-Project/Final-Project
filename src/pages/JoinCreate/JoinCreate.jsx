import React from "react";
import { useEffect, useMemo, useState } from 'react';
import { useAppContext } from "../../AppContext";
import Header from "../../components/Header";
import { useNavigate } from "react-router-dom";
import CreateMeeting from "../../components/create-meeting";

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

  async function testJoin(){
    navigate("/Meetings");
    console.log(meetingList);
  }

  async function testAdd(meetingName, listMembers){
    setMeetingList(
        [
            ...meetingList,
            { id: meetingList.length, name: meetingName, members: listMembers } // The id will be the number next available, the name can be anything
        ]
        );
    //navigate("/MeetingSettings");
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
            </tr>
          </thead>
          <tbody id="meeting-list">
            {meetingList.map((meeting) => (
            <tr key={meeting.id} >
              <td>{meeting.name}</td>
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
