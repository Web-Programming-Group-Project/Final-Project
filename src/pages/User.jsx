//Page for displaying user information
//If this page matches the logged in user, than also allows for changing that information

import React from "react";
import { useEffect, useMemo, useState } from 'react';
import { useAppContext } from "../AppContext";
import Header from "../components/Header";
import { useNavigate } from "react-router-dom";

export default function User() {
  const { user } = useAppContext();
  const navigate = useNavigate(); 
  
  async function goToCreateJoin() {
        navigate("/JoinCreate");
    }

  return (
    <>
      <Header />
      <div className="panel-header">
        <h2 id="meeting-heading">Convo</h2>
        <div className="user-section">
            <h2 id="convo-heading">[USERS NAME]</h2>
            <img src="" alt="Profile Picture"/>
        </div>
      </div>
      <button
            className="SmallButton"
            id = "ChangeName"
          >
          Change Name
        </button>
      <div className="page-divider">
        
      </div>
 
      <p>User's pronouns (This can be removed if we can't implement this')</p>
      <p>User's bio (This can be removed if we can't implement this')</p>
      <p>User's list of meetings (This can be removed if we can't implement this')</p>
      <button
            className="SmallButton"
            id = "CreateJoin"
            onClick={goToCreateJoin}
          >
          Create/Join Meeting
      </button>
    </>
  );
}
