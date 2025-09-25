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

    const reset = () => {
        setUsername("");
        setEmail("");
        setPassword("");
        onClose();
    }

    const handleSubmit = (e) => {
        e.preventDefault();
        if (active === "login") {
        onLogin(username.trim(), password);
        } else {
        onRegister(username.trim(), email.trim(), password);
        }
    }

    return (
        <Dialog isOpen={isOpen} onClose={onClose}>
            <div className={`${Classes.DIALOG_HEADER} flex items-center justify-between`}>
                <h4>{active === "login" ? "Login" : "Register"}</h4>
                <Button alignText="end" icon="cross" onClick={() => { reset() }} />
            </div>
            <div className={Classes.DIALOG_BODY}>
                <form onSubmit={handleSubmit}>
                    <FormGroup label="Username" labelFor="username-input">
                        <InputGroup
                            id="username-input"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </FormGroup>
                    {active === "register" && (
                        <FormGroup label="Email" labelFor="email-input">
                            <InputGroup
                                id="email-input"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </FormGroup>
                    )}
                    <FormGroup label="Password" labelFor="password-input">
                        <InputGroup
                            id="password-input"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </FormGroup>
                    <div className={Classes.DIALOG_FOOTER}>
                        <Button type="submit" intent="primary">
                            {active === "login" ? "Login" : "Register"}
                        </Button>
                    </div>
                </form>
            </div>
        </Dialog>
    );
}