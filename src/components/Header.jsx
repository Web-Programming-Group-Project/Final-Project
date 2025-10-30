import React from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../AppContext";

export default function Header() {
  const { user, setUser } = useAppContext();
  const navigate = useNavigate();

  function handleSignOut() {
    setUser(null);
    navigate("/");
  }

  function goToUserPage() {
    navigate("/User");
  } 
  return (
    <div className="h-10 bg-sky-700 flex items-center justify-between px-4 text-white">
        {user ? <span className="font-semibold">Convo</span> : null}

        {user ? (
            <div className="flex items-center gap-4">
            <button className="bg-sky-700 hover:bg-sky-600 text-white px-3 py-1 rounded-md text-sm transition-colors" onClick={goToUserPage}>{user.firstName} {user.lastName}</button>
            <button
                onClick={handleSignOut}
                className="bg-sky-700 hover:bg-sky-600 text-white px-3 py-1 rounded-md text-sm transition-colors"
            >
                Sign Out
            </button>
            </div>
        ) : null}
        </div>
  );
}
