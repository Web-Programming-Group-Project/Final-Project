//Page for displaying user information
//If this page matches the logged in user, than also allows for changing that information

import React from "react";
import { useEffect, useMemo, useState } from 'react';
import { useAppContext } from "../AppContext";
import Header from "../components/Header";
import { updateUser } from "../api";
import { useNavigate } from "react-router-dom";
import ChangeName from "../components/change-name";

export default function User() {
  const { user, setUser } = useAppContext();
  const [ username, setUsername ] = useState("");
  const navigate = useNavigate();
  const [showChange, setShowChange] = useState(null); 
  
  async function goToCreateJoin() { //This (and the button )should always be active
        navigate("/JoinCreate");
    }

    //Function to change name
  async function handleNameChange( firstName, lastName) {
        const data = await updateUser({ username, firstName, lastName });
        if (!data?.user) throw new Error(data?.message || "User update failed");
        setUser(data.user);
        setShowChange(null);
    }
    //Function to change profile picture

  return (
    <>
      <Header />
      <div className="panel-header">
        <h2 id="meeting-heading">Convo</h2>
        <div className="user-section">
            <span className="name-section">
                <h2 id="convo-heading">{user.firstName} {user.lastName}</h2>
                <p id="username">{user.username}</p>
                  <button
                    className="SmallButton"
                    id = "ChangeName"
                    onClick={() => {
                      setShowChange("active");
                      setUsername(user.username);
                    }}
                  >
                  Change Name
                </button>
            </span>
            <span className="picture-section">
                <img src="https://notion-emojis.s3-us-west-2.amazonaws.com/prod/svg-twitter/1f310.svg" alt="Profile Picture"/>
                <button
                    className="SmallButton"
                    id = "ChangeProfile"
                >
                Change Profile Picture
                </button>
            </span>
        </div>
      </div>
      <div className="page-divider">
        
      </div>
      <span className="profile-section">
        <p>User's pronouns (This can be removed if we can't implement this')</p>
        <p>User's list of meetings (This can be removed if we can't implement this')</p>
        <p>User's bio (This can be removed if we can't implement this')</p>
        <button
              className="MediumButton"
              id = "CreateJoin"
              onClick={goToCreateJoin}
            >
            Create/Join Meeting
        </button>
      </span>
      {showChange && ( <ChangeName isOpen onClose={() => setShowChange(null)} onChange={handleNameChange} />) }
    </>
  );
}
