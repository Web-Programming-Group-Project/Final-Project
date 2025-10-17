import React from "react";
import { useEffect, useMemo, useState } from 'react';
import { useAppContext } from "../../AppContext";
import Header from "../../components/Header";
import { useNavigate } from "react-router-dom";

//Page with join and create meeting functionality
//Accesses the list of meetings (for join functionality) Data structure for weekly report
//Accesses the MeetingSettings page (for create functionality)

//Fill the meeting list with data from the database

/*
function displayMeetings(){
	
}
*/

export default function JoinCreate() {
  const [meetingList, setMeetingList] = useState([]);

  const { user } = useAppContext();
  const navigate = useNavigate(); 
  const activeMeetings = 0;//Stores the number of active meetings

  function testJoin(){
    //navigate("/Meetings");
    console.log(meetingList);
  }

  function testAdd(){
    setMeetingList(
        [
            ...meetingList,
            { id: meetingList.length, name: "Test" } // The id will be the number next available, the name can be anything
        ]
        );
    //navigate("/MeetingSeetings");
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
              <td>Meeting Number {meeting.id} {meeting.name}</td>
            </tr>
          ))}
          </tbody>
        </table>
        <div className="button-section">
          <button
            className="LargeButton"
            id = "Creator"
            onClick={testAdd}
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
    </>
  );
}
