import React from "react";
import { Navigate } from "react-router-dom";
import { useAppContext } from "../AppContext";

export default function ProtectedRoute({ children }) {
  const { user } = useAppContext();

  // If the user is not logged in, redirect to the home page
  if (!user) {
    return <Navigate to="/" replace />;
  }

  return children;
}