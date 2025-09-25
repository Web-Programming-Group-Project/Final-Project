import React from "react";
import { Link } from "react-router-dom";
import { useState } from "react";
import LoginRegister from "../components/login-register";

export default function Home() {
    const [showAuth, setShowAuth] = useState(null);

    function handleLogin(username, password) {
        // Implement login logic here
        console.log("Logging in", { username, password });
    }

    function handleRegister(username, email, password) {
        // Implement registration logic here
        console.log("Registering", { username, email, password });
    }

    return (
        <div className="min-h-screen flex flex-col">
        <div className="h-10 bg-sky-700" />
        <main className="flex-1 flex items-center justify-center">
            <div className="text-center px-4">
            <h1 className="text-6xl md:text-8xl font-semibold text-slate-900 leading-tight">
                Welcome To Convo!
            </h1>
            <div className="mt-12 space-y-6 w-full max-w-md mx-auto">
                <button
                    onClick={() => setShowAuth("register")}
                    className="block w-full rounded-md bg-sky-500 py-4 text-2xl font-medium text-white hover:bg-sky-600"
                >
                    Register
                </button>
                <button
                    onClick={() => setShowAuth("login")}
                    className="block w-full rounded-md bg-sky-500 py-4 text-2xl font-medium text-white hover:bg-sky-600"
                >
                    Login
                </button>
            </div>
            </div>
        </main>
        <div className="h-2 border-t border-sky-500" />
        {showAuth && (
            <LoginRegister
                authenticationType={showAuth}
                isOpen
                onClose={() => setShowAuth(null)}
                onLogin={handleLogin}
                onRegister={handleRegister}
            />
        )}
        </div>
    );
}