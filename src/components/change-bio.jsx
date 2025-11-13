import React from "react";  
import {
  Dialog,
  Classes,
  Button,
  FormGroup,
  InputGroup,
} from "@blueprintjs/core";
import { useState } from "react";

export default function ChangeBio({ onChange, isOpen, onClose }) {
    const [bio, setBio] = useState(""); //Stores the bio
    const [loading, setLoading] = useState(false); //Present to account for loading list of users, and other connections to MongoDB
    const [err, setErr] = useState(""); //Used for returning specific error messages

    const handleClose = () => {
        if (loading) return;
        onClose();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onChange(bio);
            //reset();
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
                <h4>Change Bio</h4>
                <Button alignText="end" icon="cross" onClick={handleClose} disabled={loading} />
            </div>
            <div className={Classes.DIALOG_BODY}>
                <form onSubmit={handleSubmit}>
                    <FormGroup label="Bio" labelFor="bio-input">
                        <InputGroup
                            id="bio-input"
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </FormGroup>
                    {err && <p className="text-sm text-red-600 mb-2">{err}</p>}
                    <div className={`${Classes.DIALOG_FOOTER} flex justify-end gap-2`}>
                        <Button onClick={handleClose} disabled={loading}>Cancel</Button>
                        <Button type="submit" intent="primary" loading={loading} disabled={loading || !bio}>
                            Change Bio
                        </Button>
                    </div>
                </form>
            </div>
        </Dialog>
    );
}
