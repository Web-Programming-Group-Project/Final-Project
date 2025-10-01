import React from "react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import LoginRegister from "../components/login-register";
import { loginUser, registerUser } from "../Api";
import { useAppContext } from "../AppContext";
import Header from "../components/Header";

export default function Home() {
    const [showAuth, setShowAuth] = useState(null);
    const { user, setUser } = useAppContext();
    const navigate = useNavigate();

    async function handleLogin(username, password) {
        const data = await loginUser({ username, password });
        if (!data?.user) throw new Error(data?.message || "Login failed");
        setUser(data.user);
        setShowAuth(null);
        navigate("/JoinCreate");
    }

    async function handleRegister(username, email, password) {
        const data = await registerUser({ username, email, password });
        if (!data?.user) throw new Error(data?.message || "Registration failed");
        setUser(data.user);
        setShowAuth(null);
        navigate("/JoinCreate");
    }

    return (
        <div className="min-h-screen flex flex-col">
        <Header />
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