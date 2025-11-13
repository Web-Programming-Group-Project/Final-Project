//Page for displaying user information
//If this page matches the logged in user, than also allows for changing that information

import React from "react";
import { useEffect, useMemo, useState } from 'react';
import { useAppContext } from "../AppContext";
import Header from "../components/Header";
import { updateUser } from "../api";
import { useNavigate } from "react-router-dom";
import ChangeName from "../components/change-name";
import ChangeBio from "../components/change-bio"
import ChangePronouns from "../components/change-pronouns"

export default function User() {
  const { user, setUser } = useAppContext();
  const [ username, setUsername ] = useState("");
  const navigate = useNavigate();
  const [showChange, setShowChange] = useState(null);
  const [showBio, setShowBio] = useState(null);  
  const [showPronouns, setShowPronouns] = useState(null); 
  const [biography, setBiography] = useState("");//TEMPORARY, UNTIL WE CAN STORE BIOS WITH USERS
  const [pronouns, setPronouns] = useState("");//TEMPORARY, UNTIL WE CAN STORE BIOS, PRONOUNS AND MEETINGS WITH USERS
  
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
  //Function to change bio
  async function handleBioChange(bio) {
        //const data = await updateUser({ username, firstName, lastName });
        //if (!data?.user) throw new Error(data?.message || "User update failed");
        //setUser(data.user);
        setBiography(bio);
        setShowBio(null);
  }
  //Function to change pronouns
  async function handlePronounChange(pronoun) {
        //const data = await updateUser({ username, firstName, lastName });
        //if (!data?.user) throw new Error(data?.message || "User update failed");
        //setUser(data.user);
        setPronouns(pronoun);
        setShowPronouns(null);
  }
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
        <p onClick={() => {
                      setShowPronouns("active");
                      setUsername(user.username);
          }}>{pronouns} (Should be stored with the user, like firstname, etc)
        </p>
        <p>User's list of meetings (Should be stored with the user, like firstname, etc)</p>
        <p onClick={() => {
                      setShowBio("active");
                      setUsername(user.username);
        }}>
          {biography} (Should be stored with the user, like firstname, etc)
        </p>
        <button
              className="MediumButton"
              id = "CreateJoin"
              onClick={goToCreateJoin}
            >
            Create/Join Meeting
        </button>
      </span>
      {showChange && ( <ChangeName isOpen onClose={() => setShowChange(null)} onChange={handleNameChange} />) }
      {showBio && ( <ChangeBio isOpen onClose={() => setShowBio(null)} onChange={handleBioChange} />) }
      {showPronouns && ( <ChangePronouns isOpen onClose={() => setShowPronouns(null)} onChange={handlePronounChange} />) }
    </>
  );
}
