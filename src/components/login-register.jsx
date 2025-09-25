import React from "react";  
import {
  Dialog,
  Classes,
  Button,
  FormGroup,
  InputGroup,
  Tabs,
  Tab,
} from "@blueprintjs/core";

export default function LoginRegister({ authenticationType, onLogin, onRegister, isOpen, onClose }) {
    const [active, setActive] = useState<"login" | "register">(authenticationType);
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const reset = () => {
        setUsername("");
        setEmail("");
        setPassword("");
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
            <div className={Classes.DIALOG_HEADER}>
                <h4>{active === "login" ? "Login" : "Register"}</h4>
                <Button minimal icon="cross" onClick={() => { onClose(); reset(); }} />
            </div>
            <div className={Classes.DIALOG_BODY}>
                <Tabs
                    id="LoginRegisterTabs"
                    selectedTabId={active}
                    onChange={setActive}
                >
                    <Tab id="login" title="Login" />
                    <Tab id="register" title="Register" />
                </Tabs>
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