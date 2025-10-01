//Page with join and create meeting functionality
//Accesses the list of meetings (for join functionality) Data structure for weekly report
//Accesses the MeetingSettings page (for create functionality)

//let meetingList = []; //Data structure (connect with MongoDB at some point)
//Fill the meeting list with data from the database

//Hardcoded test data
//meetingList[0] = "MeetingID1";
//meetingList[1] = "MeetingID2";
//meetingList[2] = "MeetingID3";

//Topbar section =================================================================================
//has button that links to signin page

//Create New Meeting section =====================================================================
//links to meeting settings page

//Join Meeting section ===========================================================================
//displays the list of meetings
//allows the user to select a meeting to join

//Meeting display
/*
<div class="meetingDisplay">
//Create a new div for each meeting, it should function as a button to join that specific meeting, and display some information about each meeting stored in the meetingList
</div>

function displayMeetings(){
	
}
*/

import React from "react";
import { useAppContext } from "../../AppContext";

export default function JoinCreate() {
  const { user } = useAppContext();

  return (
    <div>Hello {user?.username}</div>
  );
}
