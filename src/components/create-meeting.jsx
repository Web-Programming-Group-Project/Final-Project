import React from "react";  
import {
  Dialog,
  Classes,
  Button,
  FormGroup,
  InputGroup,
} from "@blueprintjs/core";
import { useState } from "react";


export default function CreateMeeting({ onCreate, isOpen, onClose }) {
    const [name, setName] = useState("");
    const [isOpenMeeting, setIsOpenMeeting] = useState(true); // true=open, false=closed
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");

    const reset = () => {
        setName("");
        setIsOpenMeeting(true);
    }

    const handleClose = () => {
        if (loading) return;
        reset();
        onClose();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onCreate(name.trim(), isOpenMeeting);
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
                <h4>Create Meeting</h4>
                <Button alignText="end" icon="cross" onClick={handleClose} disabled={loading} />
            </div>
            <div className={Classes.DIALOG_BODY}>
                <form onSubmit={handleSubmit}>
                    <FormGroup label="Meeting Name" labelFor="name-input">
                        <InputGroup
                            id="name-input"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </FormGroup>
                    <FormGroup label="Meeting Type" labelFor="open-toggle">
                        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                            <Button
                                active={isOpenMeeting}
                                intent={isOpenMeeting ? "primary" : "none"}
                                onClick={() => setIsOpenMeeting(true)}
                                type="button"
                                disabled={loading}
                            >
                                Open
                            </Button>
                            <Button
                                active={!isOpenMeeting}
                                intent={!isOpenMeeting ? "primary" : "none"}
                                onClick={() => setIsOpenMeeting(false)}
                                type="button"
                                disabled={loading}
                            >
                                Closed
                            </Button>
                        </div>
                    </FormGroup>
                    {err && <p className="text-sm text-red-600 mb-2">{err}</p>}
                    <div className={`${Classes.DIALOG_FOOTER} flex justify-end gap-2`}>
                        <Button onClick={handleClose} disabled={loading}>Cancel</Button>
                        <Button type="submit" intent="primary" loading={loading} disabled={loading || !name}>
                            Create Meeting
                        </Button>
                    </div>
                </form>
            </div>
        </Dialog>
    );
}
