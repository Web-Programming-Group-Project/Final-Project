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
    const [name, setName] = useState(""); //Stores the name of the meeting
    const [members, setMembers] = useState([]); //Stores an array of the members of the meeting
    const [loading, setLoading] = useState(false); //Present to account for loading list of users, and other connections to MongoDB
    const [err, setErr] = useState(""); //Used for returning specific error messages

    const reset = () => {
        setName("");
        setMembers([]);
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
            await onCreate(name.trim(), members);
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
                    <FormGroup label="Add Members" labelFor="members-input">
                        <InputGroup
                            id="members-input"
                            //type="password"
                            value={members}
                            //onChange={(e) => dropdown-checkbox, or option for multiple inputs, this needs to be a list}
                            //required
                            disabled={loading}
                        />
                    </FormGroup>
                    {err && <p className="text-sm text-red-600 mb-2">{err}</p>}
                    <div className={`${Classes.DIALOG_FOOTER} flex justify-end gap-2`}>
                        <Button onClick={handleClose} disabled={loading}>Cancel</Button>
                        <Button type="submit" intent="primary" loading={loading} disabled={loading || !name || !members}>
                            Create Meeting
                        </Button>
                    </div>
                </form>
            </div>
        </Dialog>
    );
}
