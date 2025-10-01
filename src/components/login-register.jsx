import React from "react";  
import {
  Dialog,
  Classes,
  Button,
  FormGroup,
  InputGroup,
} from "@blueprintjs/core";
import { useState } from "react";

export default function LoginRegister({ authenticationType, onLogin, onRegister, isOpen, onClose }) {
    const [active, setActive] = useState(authenticationType);
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");

    const reset = () => {
        setUsername("");
        setEmail("");
        setPassword("");
        setErr("");
    }

    const handleClose = () => {
        if (loading) return;
        resetFields();
        onClose();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (active === "login") {
                await onLogin(username.trim(), password);
            } else {
                await onRegister(username.trim(), email.trim(), password);
            }
            reset();
            requestAnimationFrame(() => onClose());
        } catch (error) {
            setErr(error?.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog isOpen={isOpen} onClose={handleClose}>
            <div className={`${Classes.DIALOG_HEADER} flex items-center justify-between`}>
                <h4>{active === "login" ? "Login" : "Register"}</h4>
                <Button alignText="end" icon="cross" onClick={() => { handleClose }} disabled={loading} />
            </div>
            <div className={Classes.DIALOG_BODY}>
                <form onSubmit={handleSubmit}>
                    <FormGroup label="Username" labelFor="username-input">
                        <InputGroup
                            id="username-input"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </FormGroup>
                    {active === "register" && (
                        <FormGroup label="Email" labelFor="email-input">
                            <InputGroup
                                id="email-input"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={loading}
                            />
                        </FormGroup>
                    )}
                    <FormGroup label="Password" labelFor="password-input">
                        <InputGroup
                            id="password-input"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </FormGroup>
                    {err && <p className="text-sm text-red-600 mb-2">{err}</p>}
                    <div className={`${Classes.DIALOG_FOOTER} flex justify-end gap-2`}>
                        <Button onClick={handleClose} disabled={loading}>Cancel</Button>
                        <Button type="submit" intent="primary" loading={loading} disabled={loading || !username || !password || (active === "register" && !email)}>
                            {active === "login" ? "Login" : "Register"}
                        </Button>
                    </div>
                </form>
            </div>
        </Dialog>
    );
}