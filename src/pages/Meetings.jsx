import { useLocation, useNavigate } from "react-router-dom";
import React, { useState, useRef, useEffect, useMemo } from "react";
import Header from "../components/Header";
import {
  Dialog,
  Classes,
  FormGroup,
  RadioGroup,
  Radio,
  Button as BPButton,
} from "@blueprintjs/core";
import { useAppContext } from "../AppContext";
import {
  getMeeting,
  raiseMotion as apiRaiseMotion,
  voteMotion as apiVoteMotion,
  postMessage as apiPostMessage,
  updateParticipantRole,
  closeMotion as apiCloseMotion,
  addReplyToMotion,
  updateMeetingSummary as apiUpdateMeetingSummary,
  downloadMeetingMinutesPdf as apiDownloadMeetingMinutesPdf,
  downloadMeetingMinutesTxt as apiDownloadMeetingMinutesTxt,
  createOverturnMotion as apiCreateOverturnMotion,
  recordChairDecision as apiRecordChairDecision,
} from "../api";

function resolveSubMotionType(motion) {
  if (!motion) return "none";
  const raw =
    motion.subMotionType ||
    motion.subType ||
    (motion.isOverturn ? "overturn" : "none");
  return (raw || "none").toLowerCase();
}

function sanitizeTitleForFilename(value) {
  return (value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildMinutesFilename(meeting) {
  const slug =
    sanitizeTitleForFilename(meeting?.title) ||
    sanitizeTitleForFilename(meeting?.code) ||
    "meeting";
  return `${slug}-minutes.txt`;
}

function getVoteChoice(voterMap, username) {
  if (!voterMap || !username) return null;
  if (typeof voterMap.get === "function") return voterMap.get(username);
  if (typeof voterMap === "object") return voterMap[username] || null;
  return null;
}

const SPECIAL_MOTION_RULES = {
  adjourn: {
    label: "Adjourn meeting",
    summary: "Not debatable · requires simple majority (50%) vote.",
    needsVote: true,
    requiredPercentage: 50,
    allowDiscussion: false,
  },
  closeDebate: {
    label: "Close debate (Previous Question)",
    summary: "Not debatable · requires 2/3 vote (66%).",
    needsVote: true,
    requiredPercentage: 66,
    allowDiscussion: false,
  },
};
const SPECIAL_MOTION_TYPES = [
  { value: "adjourn", label: SPECIAL_MOTION_RULES.adjourn.label },
  { value: "closeDebate", label: SPECIAL_MOTION_RULES.closeDebate.label },
];
const DEFAULT_SPECIAL_MOTION_TYPE = SPECIAL_MOTION_TYPES[0].value;

export default function Meetings() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAppContext();

  const initialMeeting = location.state?.meeting || null;
  const initialCode = location.state?.meeting?.code || location.state?.code || location.state?.meetingCode || null;

  const [meeting, setMeeting] = useState(initialMeeting);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [messageText, setMessageText] = useState("");
  const [selectedMotionId, setSelectedMotionId] = useState(null);
  const [roleUpdating, setRoleUpdating] = useState(null);
  const [roleError, setRoleError] = useState("");
  const [motionType, setMotionType] = useState("standard");
  const [specialMotionType, setSpecialMotionType] = useState(DEFAULT_SPECIAL_MOTION_TYPE);
  const [motionVotingMode, setMotionVotingMode] = useState("named");
  const [raiseModalOpen, setRaiseModalOpen] = useState(false);
  const [motionTitleInput, setMotionTitleInput] = useState("");
  const [motionDescriptionInput, setMotionDescriptionInput] = useState("");
  const [motionError, setMotionError] = useState("");
  const [raisingMotion, setRaisingMotion] = useState(false);
  const [voterListExpanded, setVoterListExpanded] = useState({});
  const [replyTextMap, setReplyTextMap] = useState({});
  const [replyStanceMap, setReplyStanceMap] = useState({});
  const [replyErrorMap, setReplyErrorMap] = useState({});
  const [replySubmittingMap, setReplySubmittingMap] = useState({});
  const [chairDecisionSubmittingMap, setChairDecisionSubmittingMap] = useState({});
  const [chairDecisionErrorMap, setChairDecisionErrorMap] = useState({});
  const [closeVotingModalMotion, setCloseVotingModalMotion] = useState(null);
  const [closeDecisionSummary, setCloseDecisionSummary] = useState("");
  const [closeProsSummary, setCloseProsSummary] = useState("");
  const [closeConsSummary, setCloseConsSummary] = useState("");
  const [closeVotingError, setCloseVotingError] = useState("");
  const [closingVoting, setClosingVoting] = useState(false);
  const [meetingSummaryModalOpen, setMeetingSummaryModalOpen] = useState(false);
  const [meetingSummaryInput, setMeetingSummaryInput] = useState("");
  const [meetingSummarySaving, setMeetingSummarySaving] = useState(false);
  const [meetingSummaryError, setMeetingSummaryError] = useState("");
  const [previousDetailsExpanded, setPreviousDetailsExpanded] = useState({});
  const [downloadingMinutesTxt, setDownloadingMinutesTxt] = useState(false);
  const [downloadingMinutesPdf, setDownloadingMinutesPdf] = useState(false);
  const [subMotionMode, setSubMotionMode] = useState("none"); // none | overturn | revise | postpone
  const [subMotionParentId, setSubMotionParentId] = useState(null);
  const [postponeUntilInput, setPostponeUntilInput] = useState("");
  const chatEndRef = useRef(null);

  const code = meeting?.code || initialCode;
  const username = user?.username || user?.email;
  const meetingAdjournedMessage = "Meeting has been adjourned. No further changes are allowed.";
  const isAdjourned = Boolean((meeting?.adjourned ?? false) || meeting?.open === false);
  const adjournedAt = meeting?.adjournedAt ? new Date(meeting.adjournedAt) : null;

  useEffect(() => {
    if (!code) {
      navigate("/JoinCreate");
    }
  }, [code, navigate]);

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    async function loadMeeting() {
      setLoading(true);
      setError("");
      try {
        const data = await getMeeting({ code });
        if (!cancelled) {
          setMeeting(data);
        }
      } catch (err) {
        console.error("Failed to load meeting", err);
        if (!cancelled) setError(err.message || "Failed to load meeting");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadMeeting();
    return () => { cancelled = true; };
  }, [code]);

  useEffect(() => {
    if (!selectedMotionId) return;
    const exists = meeting?.motions?.some((motion) => String(motion._id) === selectedMotionId);
    if (!exists) {
      setSelectedMotionId(null);
    }
  }, [meeting, selectedMotionId]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [meeting?.messages, meeting?.motions]);

  useEffect(() => {
    if (!subMotionParentId) return;
    const exists = (meeting?.motions || []).some(
      (motion) => String(motion._id) === String(subMotionParentId)
    );
    if (!exists) {
      setSubMotionParentId(null);
      setSubMotionMode("none");
    }
  }, [meeting?.motions, subMotionParentId]);

  const generalMessages = useMemo(() => {
    return (meeting?.messages || [])
      .filter((msg) => !msg.motionId)
      .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  }, [meeting?.messages]);

  const timeline = useMemo(() => {
    const entries = [
      ...generalMessages.map((msg) => ({ type: "chat", createdAt: msg.createdAt, item: msg })),
      ...(meeting?.motions || []).map((motion) => ({ type: "motion", createdAt: motion.createdAt, item: motion })),
    ];
    return entries.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  }, [generalMessages, meeting?.motions]);

  const motionsById = useMemo(() => {
    const map = new Map();
    (meeting?.motions || []).forEach((motion) => {
      map.set(String(motion._id), motion);
    });
    return map;
  }, [meeting?.motions]);

  const childMotionsByParent = useMemo(() => {
    const map = new Map();
    (meeting?.motions || []).forEach((motion) => {
      const subType = resolveSubMotionType(motion);
      if (subType === "none") return;
      const parentId = motion.parentMotionId || (subType === "overturn" ? motion.targetMotionId : null);
      if (!parentId) return;
      const key = String(parentId);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(motion);
    });
    return map;
  }, [meeting?.motions]);

  const pendingRevisionParents = useMemo(() => {
    const set = new Set();
    (meeting?.motions || []).forEach((motion) => {
      const subType = resolveSubMotionType(motion);
      if (subType !== "revise") return;
      const isPending =
        motion.status === "open" || (motion.outcome || "pending").toLowerCase() === "pending";
      if (!isPending) return;
      const parentId = motion.parentMotionId || motion.targetMotionId;
      if (parentId) set.add(String(parentId));
    });
    return set;
  }, [meeting?.motions]);

  const meetingSummaryText = (meeting?.meetingSummary || "").trim();
  const meetingSummaryButtonLabel = meetingSummaryText ? "Edit Meeting Summary" : "Add Meeting Summary";

  const previousDecisions = useMemo(() => {
    return (meeting?.motions || [])
      .filter(
        (motion) =>
          motion.status === "closed" ||
          Boolean((motion.decisionSummary || "").trim())
      )
      .sort(
        (a, b) =>
          new Date(b.closedAt || b.updatedAt || 0) -
          new Date(a.closedAt || a.updatedAt || 0)
      );
  }, [meeting?.motions]);

  const previousDecisionIds = useMemo(() => {
    return new Set(previousDecisions.map((motion) => String(motion._id)));
  }, [previousDecisions]);

  const mainDecisions = useMemo(() => {
    return previousDecisions.filter((motion) => {
      const subType = resolveSubMotionType(motion);
      return subType === "none" || !motion.parentMotionId;
    });
  }, [previousDecisions]);

  const orphanSubDecisions = useMemo(() => {
    return previousDecisions.filter((motion) => {
      const subType = resolveSubMotionType(motion);
      if (subType === "none") return false;
      const parentId = motion.parentMotionId || motion.targetMotionId;
      if (!parentId) return true;
      return !previousDecisionIds.has(String(parentId));
    });
  }, [previousDecisions, previousDecisionIds]);

  const subMotionParent = subMotionParentId
    ? motionsById.get(String(subMotionParentId))
    : null;
  const isOverturnMode = subMotionMode === "overturn";
  const isReviseMode = subMotionMode === "revise";
  const isPostponeMode = subMotionMode === "postpone";
  const isSubMotionMode = subMotionMode !== "none";
  const closeVotingModalOpen = Boolean(closeVotingModalMotion);
  const closingMotion = closeVotingModalMotion;
  const raiseDialogTitle = isOverturnMode
    ? "Overturn Decision"
    : isReviseMode
    ? "Revise Motion"
    : isPostponeMode
    ? "Postpone Decision"
    : "Raise Motion";
  const raiseSubmitLabel = isSubMotionMode
    ? "Submit Procedural Motion"
    : motionType === "special"
    ? "Submit Special Motion"
    : "Submit Motion";

  const participants = meeting?.participants || [];
  const myRole = participants.find((p) => p.username === username)?.role || "member";
  const normalizedRole = (myRole || "").toLowerCase();
  const otherChairExists = participants.some(
    (p) => (p.role || "").toLowerCase() === "chair" && p.username !== username
  );
  const canManageMotions = ["owner", "chair"].includes(normalizedRole);
  const canRaiseMotionBase = ["owner", "chair", "member"].includes(normalizedRole);
  const canRaiseMotion = canRaiseMotionBase && !isAdjourned;
  const showRaiseButton = normalizedRole !== "observer";
  const canCloseVotingRole = normalizedRole === "chair" || (normalizedRole === "owner" && !otherChairExists);
  const canSend = Boolean(username) && !isAdjourned;
  const chatInputPlaceholder = isAdjourned
    ? "Meeting adjourned — chat is closed."
    : "Type a message...";
  const raiseButtonDisabled = !canRaiseMotion;
  const raiseButtonTitle = !canRaiseMotionBase
    ? "You do not have permission to raise motions."
    : isAdjourned
    ? meetingAdjournedMessage
    : undefined;
  function isAdjournedErrorMessage(message) {
    if (!message) return false;
    return message.toLowerCase().includes("adjourn");
  }

  async function refreshMeetingState() {
    if (!code) return;
    try {
      const latest = await getMeeting({ code });
      setMeeting(latest);
    } catch (err) {
      console.error("Failed to refresh meeting", err);
    }
  }

  function userCanOverturnMotion(motion) {
    if (!motion || !username) return false;
    if (resolveSubMotionType(motion) === "overturn") return false;
    if (motion.overturned || motion.overturnedByMotionId) return false;
    if ((motion.votingMode || "named") !== "named") return false;
    if (motion.status !== "closed") return false;
    const normalizedOutcome = (motion.outcome || "pending").toLowerCase();
    if (normalizedOutcome !== "passed") return false;
    const voteChoice = getVoteChoice(motion.voterMap, username);
    return voteChoice === "up";
  }

  async function sendMessage(e) {
    e.preventDefault();
    if (isAdjourned) {
      window.alert(meetingAdjournedMessage);
      return;
    }
    const text = messageText.trim();
    if (!text || !meeting || !code) return;
    if (!username) {
      window.alert("You must be logged in to chat.");
      return;
    }
    try {
      const message = await apiPostMessage({ code, username, text });
      setMeeting((prev) => {
        if (!prev) return prev;
        return { ...prev, messages: [...(prev.messages || []), message] };
      });
      setMessageText("");
    } catch (err) {
      console.error("Failed to send message", err);
      const errorMessage = err.message || "Failed to send message";
      if (isAdjournedErrorMessage(errorMessage)) {
        window.alert(errorMessage);
        refreshMeetingState();
      } else {
        window.alert(errorMessage);
      }
    }
  }

  function openRaiseMotionModal() {
    if (!canRaiseMotionBase) return;
    if (isAdjourned) {
      window.alert(meetingAdjournedMessage);
      return;
    }
    setMotionTitleInput("");
    setMotionDescriptionInput("");
    setMotionError("");
    setMotionType("standard");
    setSpecialMotionType(DEFAULT_SPECIAL_MOTION_TYPE);
    setMotionVotingMode("named");
    setSubMotionMode("none");
    setSubMotionParentId(null);
    setPostponeUntilInput("");
    setRaiseModalOpen(true);
  }

  function openOverturnMotionModal(motion) {
    if (!motion) return;
    if (isAdjourned) {
      window.alert(meetingAdjournedMessage);
      return;
    }
    const baseTitle = motion.title || motion.text || "Untitled motion";
    setSubMotionMode("overturn");
    setSubMotionParentId(String(motion._id));
    setMotionTitleInput(`Overturn: ${baseTitle}`);
    setMotionDescriptionInput(`Motion to overturn the previous decision on "${baseTitle}".`);
    setMotionError("");
    setMotionType("procedure");
    setMotionVotingMode("named");
    setPostponeUntilInput("");
    setRaiseModalOpen(true);
  }

  function openReviseMotionModal(motion) {
    if (!motion) return;
    if (isAdjourned) {
      window.alert(meetingAdjournedMessage);
      return;
    }
    const baseTitle = motion.title || motion.text || "Untitled motion";
    setSubMotionMode("revise");
    setSubMotionParentId(String(motion._id));
    setMotionTitleInput(baseTitle);
    setMotionDescriptionInput(motion.description || "");
    setMotionError("");
    setMotionType("procedure");
    setMotionVotingMode("named");
    setPostponeUntilInput("");
    setRaiseModalOpen(true);
  }

  function openPostponeMotionModal(motion) {
    if (!motion) return;
    if (isAdjourned) {
      window.alert(meetingAdjournedMessage);
      return;
    }
    const baseTitle = motion.title || motion.text || "Untitled motion";
    setSubMotionMode("postpone");
    setSubMotionParentId(String(motion._id));
    setMotionTitleInput(`Postpone: ${baseTitle}`);
    setMotionDescriptionInput(`Motion to postpone decision on "${baseTitle}".`);
    setMotionError("");
    setMotionType("procedure");
    setMotionVotingMode("named");
    setPostponeUntilInput("");
    setRaiseModalOpen(true);
  }

  function handleMotionTypeChange(nextType) {
    setMotionType(nextType);
    if (nextType === "special") {
      setMotionVotingMode("named");
      setMotionTitleInput((prev) =>
        prev && prev.trim()
          ? prev
          : SPECIAL_MOTION_RULES[specialMotionType]?.label || "Special motion"
      );
    }
  }

  function handleSpecialMotionTypeChange(nextType) {
    setSpecialMotionType(nextType);
    setMotionTitleInput((prev) =>
      prev && prev.trim()
        ? prev
        : SPECIAL_MOTION_RULES[nextType]?.label || "Special motion"
    );
  }

  function closeRaiseMotionModal() {
    if (raisingMotion) return;
    setRaiseModalOpen(false);
    setSubMotionMode("none");
    setSubMotionParentId(null);
    setPostponeUntilInput("");
    setMotionType("standard");
    setSpecialMotionType(DEFAULT_SPECIAL_MOTION_TYPE);
  }

  async function submitMotion(e) {
    e.preventDefault();
    const isOverturn = isOverturnMode;
    const isRevise = isReviseMode;
    const isPostpone = isPostponeMode;
    const isSpecialMotion = !isSubMotionMode && motionType === "special";
    const specialRule = isSpecialMotion ? SPECIAL_MOTION_RULES[specialMotionType] : null;
    const parentMotion = subMotionParent;
    if (!meeting || !code) {
      setMotionError("Meeting not loaded.");
      return;
    }
    if (isAdjourned) {
      setMotionError(meetingAdjournedMessage);
      return;
    }
    if (!isOverturn && !canRaiseMotion && !isRevise && !isPostpone) return;
    if ((isRevise || isPostpone) && !canManageMotions) {
      setMotionError("Only the chair/owner can raise this procedural motion.");
      return;
    }
    if (isSpecialMotion && !specialRule) {
      setMotionError("Select a valid special motion type.");
      return;
    }
    let title = motionTitleInput.trim();
    if (isSpecialMotion && !title && specialRule) {
      title = specialRule.label;
    }
    const description = motionDescriptionInput.trim();
    if (!title) {
      setMotionError("Motion title is required.");
      return;
    }
    if (!username) {
      setMotionError("You must be logged in to raise a motion.");
      return;
    }
    if (isOverturn && !parentMotion) {
      setMotionError("Target motion not found.");
      return;
    }
    if ((isRevise || isPostpone) && !parentMotion) {
      setMotionError("Parent motion not found.");
      return;
    }
    setRaisingMotion(true);
    setMotionError("");
    try {
      if (isOverturn) {
        const response = await apiCreateOverturnMotion({
          meetingId: meeting._id,
          username,
          targetMotionId: parentMotion._id,
          title,
          description,
          motionType,
          votingMode: motionVotingMode,
        });
        const updatedMeeting = response.meeting || response;
        setMeeting(updatedMeeting);
        if (response.motion?._id) {
          setSelectedMotionId(String(response.motion._id));
        }
      } else {
        const motion = await apiRaiseMotion({
          code,
          username,
          title,
          description,
          type: isSubMotionMode ? "procedure" : isSpecialMotion ? "procedure" : motionType,
          votingMode: isSpecialMotion ? "named" : motionVotingMode,
          subType: isRevise ? "revise" : isPostpone ? "postpone" : "none",
          parentMotionId: parentMotion ? parentMotion._id : undefined,
          postponeUntil: isPostpone ? postponeUntilInput.trim() : undefined,
          motionCategory: isSpecialMotion ? "special" : undefined,
          specialMotionType: isSpecialMotion ? specialMotionType : undefined,
        });
        setMeeting((prev) => {
          if (!prev) return prev;
          return { ...prev, motions: [...(prev.motions || []), motion] };
        });
        setSelectedMotionId(String(motion._id));
      }
      setMotionTitleInput("");
      setMotionDescriptionInput("");
      setMotionType("standard");
      setSpecialMotionType(DEFAULT_SPECIAL_MOTION_TYPE);
      setMotionVotingMode("named");
      setSubMotionMode("none");
      setSubMotionParentId(null);
      setPostponeUntilInput("");
      setRaiseModalOpen(false);
    } catch (err) {
      console.error("Failed to raise motion", err);
      const errorMessage = err.message || "Failed to raise motion";
      setMotionError(errorMessage);
      if (isAdjournedErrorMessage(errorMessage)) {
        refreshMeetingState();
      }
    } finally {
      setRaisingMotion(false);
    }
  }

  async function toggleVote(motionId, vote) {
    if (!meeting || !code) return;
    if (isAdjourned) {
      window.alert(meetingAdjournedMessage);
      return;
    }
    if (!username) {
      window.alert("You must be logged in to vote.");
      return;
    }
    try {
      const updated = await apiVoteMotion({ code, motionId, username, vote });
      setMeeting((prev) => {
        if (!prev) return prev;
        const motions = (prev.motions || []).map((m) =>
          String(m._id) === String(updated._id) ? updated : m
        );
        return { ...prev, motions };
      });
    } catch (err) {
      console.error("Failed to vote", err);
      const errorMessage = err.message || "Failed to submit vote";
      if (isAdjournedErrorMessage(errorMessage)) {
        window.alert(errorMessage);
        refreshMeetingState();
      } else {
        window.alert(errorMessage);
      }
    }
  }

  async function handleRoleChange(participantUsername, newRole) {
    if (!meeting?._id || !username) return;
    setRoleError("");
    setRoleUpdating(`${participantUsername}-${newRole}`);
    try {
      const updated = await updateParticipantRole({
        meetingId: meeting._id,
        participantUsername,
        newRole,
        username,
      });
      setMeeting(updated);
    } catch (err) {
      console.error("Failed to update role", err);
      setRoleError(err.message || "Failed to update role");
    } finally {
      setRoleUpdating(null);
    }
  }

  function openCloseVotingModalForMotion(motion) {
    if (!canCloseVotingRole) return;
    if (isAdjourned) {
      window.alert(meetingAdjournedMessage);
      return;
    }
    setCloseVotingModalMotion(motion);
    setCloseDecisionSummary(motion?.decisionSummary || "");
    setCloseProsSummary(motion?.prosSummary || "");
    setCloseConsSummary(motion?.consSummary || "");
    setCloseVotingError("");
  }

  function dismissCloseVotingModal(force = false) {
    if (closingVoting && !force) return;
    setCloseVotingModalMotion(null);
    setCloseDecisionSummary("");
    setCloseProsSummary("");
    setCloseConsSummary("");
  }

  async function submitCloseVoting(e) {
    e.preventDefault();
    if (!meeting || !code || !username || !closeVotingModalMotion) return;
    if (isAdjourned) {
      window.alert(meetingAdjournedMessage);
      dismissCloseVotingModal(true);
      return;
    }
    const decision = closeDecisionSummary.trim();
    if (!decision) {
      setCloseVotingError("Decision summary is required.");
      return;
    }
    setClosingVoting(true);
    setCloseVotingError("");
    try {
      const updatedMeeting = await apiCloseMotion({
        code,
        motionId: closeVotingModalMotion._id,
        username,
        decisionSummary: decision,
        prosSummary: closeProsSummary.trim(),
        consSummary: closeConsSummary.trim(),
      });
      setMeeting(updatedMeeting);
      dismissCloseVotingModal(true);
    } catch (err) {
      console.error("Failed to close voting", err);
      setCloseVotingError(err.message || "Failed to close voting");
    } finally {
      setClosingVoting(false);
    }
  }

  function openMeetingSummaryModal() {
    if (!canManageMotions) return;
    setMeetingSummaryInput(meeting?.meetingSummary || "");
    setMeetingSummaryError("");
    setMeetingSummaryModalOpen(true);
  }

  function closeMeetingSummaryModal() {
    if (meetingSummarySaving) return;
    setMeetingSummaryModalOpen(false);
  }

  async function handleMeetingSummarySave(e) {
    e.preventDefault();
    if (!code || !username || !canManageMotions) return;
    setMeetingSummarySaving(true);
    setMeetingSummaryError("");
    try {
      const updatedMeeting = await apiUpdateMeetingSummary({
        code,
        username,
        meetingSummary: meetingSummaryInput.trim(),
      });
      setMeeting(updatedMeeting);
      setMeetingSummaryModalOpen(false);
    } catch (err) {
      console.error("Failed to update meeting summary", err);
      setMeetingSummaryError(err.message || "Failed to update meeting summary");
    } finally {
      setMeetingSummarySaving(false);
    }
  }

  async function handleDownloadMinutesTxt() {
    if (!code) return;
    setDownloadingMinutesTxt(true);
    const filename = buildMinutesFilename({
      title: meeting?.title,
      code: meeting?.code || code,
    });
    try {
      await apiDownloadMeetingMinutesTxt({ code, filename });
    } catch (err) {
      console.error("Failed to download minutes", err);
      window.alert(err.message || "Failed to download minutes");
    } finally {
      setDownloadingMinutesTxt(false);
    }
  }

  async function handleDownloadMinutesPdf() {
    if (!code) return;
    setDownloadingMinutesPdf(true);
    const slug =
      sanitizeTitleForFilename(meeting?.title) ||
      sanitizeTitleForFilename(meeting?.code || code) ||
      "meeting";
    const filename = `${slug}-minutes.pdf`;
    try {
      await apiDownloadMeetingMinutesPdf({ code, filename, meeting });
    } catch (err) {
      console.error("Failed to download minutes as PDF", err);
      window.alert(err.message || "Failed to download minutes as PDF");
    } finally {
      setDownloadingMinutesPdf(false);
    }
  }

  function toggleProsCons(motionId) {
    setPreviousDetailsExpanded((prev) => ({
      ...prev,
      [motionId]: !prev[motionId],
    }));
  }

  async function handleChairDecision(motionId, decision) {
    if (!meeting?._id) {
      setChairDecisionErrorMap((prev) => ({
        ...prev,
        [motionId]: "Meeting not loaded.",
      }));
      return;
    }
    if (isAdjourned) {
      setChairDecisionErrorMap((prev) => ({
        ...prev,
        [motionId]: meetingAdjournedMessage,
      }));
      return;
    }
    if (!username) {
      setChairDecisionErrorMap((prev) => ({
        ...prev,
        [motionId]: "You must be logged in to record a ruling.",
      }));
      return;
    }
    setChairDecisionSubmittingMap((prev) => ({ ...prev, [motionId]: true }));
    setChairDecisionErrorMap((prev) => ({ ...prev, [motionId]: "" }));
    try {
      const updatedMeeting = await apiRecordChairDecision({
        meetingId: meeting._id,
        motionId,
        username,
        decision,
      });
      setMeeting(updatedMeeting);
    } catch (err) {
      const errorMessage = err.message || "Failed to record chair decision";
      setChairDecisionErrorMap((prev) => ({
        ...prev,
        [motionId]: errorMessage,
      }));
      if (isAdjournedErrorMessage(errorMessage)) {
        refreshMeetingState();
      }
    } finally {
      setChairDecisionSubmittingMap((prev) => ({ ...prev, [motionId]: false }));
    }
  }

  async function submitReply(motionId) {
    if (!meeting?._id) {
      setReplyErrorMap((prev) => ({ ...prev, [motionId]: "Meeting not loaded." }));
      return;
    }
    if (isAdjourned) {
      setReplyErrorMap((prev) => ({
        ...prev,
        [motionId]: meetingAdjournedMessage,
      }));
      return;
    }
    const replyMotion = motionsById.get(String(motionId));
    if (replyMotion && replyMotion.allowDiscussion === false) {
      setReplyErrorMap((prev) => ({
        ...prev,
        [motionId]: "Discussion is disabled for this motion.",
      }));
      return;
    }
    if (!username) {
      setReplyErrorMap((prev) => ({ ...prev, [motionId]: "You must be logged in to reply." }));
      return;
    }
    const text = (replyTextMap[motionId] || "").trim();
    if (!text) {
      setReplyErrorMap((prev) => ({ ...prev, [motionId]: "Reply text is required." }));
      return;
    }
    const stance = replyStanceMap[motionId] || "neutral";
    setReplySubmittingMap((prev) => ({ ...prev, [motionId]: true }));
    setReplyErrorMap((prev) => ({ ...prev, [motionId]: "" }));
    try {
      const displayName =
        [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
        user?.username ||
        user?.email ||
        "User";
      const updatedMotion = await addReplyToMotion({
        meetingId: meeting._id,
        motionId,
        text,
        stance,
        displayName,
        username,
      });
      setMeeting((prev) => {
        if (!prev) return prev;
        const motions = (prev.motions || []).map((m) =>
          String(m._id) === String(updatedMotion._id) ? updatedMotion : m
        );
        return { ...prev, motions };
      });
      setReplyTextMap((prev) => ({ ...prev, [motionId]: "" }));
      setReplyStanceMap((prev) => ({ ...prev, [motionId]: "neutral" }));
    } catch (err) {
      const errorMessage = err.message || "Failed to add reply";
      setReplyErrorMap((prev) => ({ ...prev, [motionId]: errorMessage }));
      if (isAdjournedErrorMessage(errorMessage)) {
        refreshMeetingState();
      }
    } finally {
      setReplySubmittingMap((prev) => ({ ...prev, [motionId]: false }));
    }
  }

  if (!code) return null;

  return (
    <>
      <Header />
      <div style={{ maxWidth: 1100, margin: "2rem auto 0 auto" }}>
        <div style={{ display: "flex", alignItems: "flex-start" }}>
          <div style={{ minWidth: 180 }}>
            <button
              onClick={() => navigate("/JoinCreate")}
              style={{
                marginTop: 16,
                marginLeft: 24,
                background: "#0582CA",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "8px 18px",
                fontWeight: 600,
                fontSize: "1.1rem",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(0,0,0,0.07)"
              }}
            >
              ← Leave
            </button>
          </div>
          <div style={{ flex: 1 }} />
        </div>
        {loading && !meeting && (
          <div style={{ textAlign: "center", marginTop: "2rem" }}>Loading meeting...</div>
        )}
        {error && !loading && !meeting && (
          <div style={{ textAlign: "center", marginTop: "2rem", color: "red" }}>
            {error}
          </div>
        )}
        {meeting && (
          <div style={{ display: "flex", gap: 32 }}>
            <div style={{ flex: 1, background: "#f8fbff", borderRadius: 12, padding: 24 }}>
              <h2 style={{ fontSize: "2.5rem", marginBottom: 8 }}>{meeting.title}</h2>
              <div style={{ fontSize: "1.3rem", marginBottom: 16 }}>
                <b>Meeting Code:</b> <code>{meeting.code}</code>
              </div>
              <div style={{ fontSize: "0.95rem", color: "#555", marginBottom: 12 }}>
                Your role in this meeting: <strong>{myRole}</strong>
              </div>
              {isAdjourned && (
                <div
                  style={{
                    background: "#fff4e5",
                    border: "1px solid #ffb74d",
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 16,
                    color: "#6c3a00",
                    fontWeight: 600,
                  }}
                >
                  This meeting has been adjourned{adjournedAt ? ` as of ${adjournedAt.toLocaleString()}` : ""}.
                  You can review motions and messages, but no further changes are allowed.
                </div>
              )}
              <div style={{ background: "#eef5ff", borderRadius: 10, padding: 16, marginBottom: 16, border: "1px solid #c7ddff" }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Overall Meeting Summary</div>
                <div style={{ fontSize: "0.95rem", color: "#333", whiteSpace: "pre-line" }}>
                  {meetingSummaryText || "No summary provided yet."}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
                  {canManageMotions && (
                    <button
                      type="button"
                      onClick={openMeetingSummaryModal}
                      style={{
                        borderRadius: 6,
                        border: "1px solid #0582CA",
                        background: "#fff",
                        color: "#0582CA",
                        padding: "6px 12px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {meetingSummaryButtonLabel}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleDownloadMinutesTxt}
                    disabled={downloadingMinutesTxt}
                    style={{
                      borderRadius: 6,
                      border: "none",
                      background: downloadingMinutesTxt ? "#9fbfdc" : "#0582CA",
                      color: "#fff",
                      padding: "6px 12px",
                      fontWeight: 600,
                      cursor: downloadingMinutesTxt ? "not-allowed" : "pointer",
                      opacity: downloadingMinutesTxt ? 0.8 : 1,
                    }}
                  >
                    {downloadingMinutesTxt ? "Downloading..." : "Download minutes (.txt)"}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadMinutesPdf}
                    disabled={downloadingMinutesPdf}
                    style={{
                      borderRadius: 6,
                      border: "1px solid #0582CA",
                      background: "#fff",
                      color: downloadingMinutesPdf ? "#7fa8c7" : "#0582CA",
                      padding: "6px 12px",
                      fontWeight: 600,
                      cursor: downloadingMinutesPdf ? "not-allowed" : "pointer",
                      opacity: downloadingMinutesPdf ? 0.8 : 1,
                    }}
                  >
                    {downloadingMinutesPdf ? "Preparing PDF..." : "Download as PDF"}
                  </button>
                </div>
              </div>
              <div>
                <b>Members:</b>
                {roleError && <div style={{ color: "red", fontSize: "0.85rem", marginTop: 4 }}>{roleError}</div>}
                <ul style={{ marginTop: 8, paddingLeft: 16 }}>
                  {meeting.participants && meeting.participants.length > 0 ? (
                    meeting.participants.map((p) => {
                      const label = p.displayName || p.username;
                      const showRoleTag = p.role && p.role !== "member";
                      const canEdit = myRole === "owner" && p.username !== username;
                      return (
                        <li key={p.username} style={{ marginBottom: 6 }}>
                          <span>
                            {label} {showRoleTag ? `(${p.role})` : ""}
                          </span>
                          {canEdit && (
                            <select
                              value={p.role}
                              onChange={(e) => handleRoleChange(p.username, e.target.value)}
                              disabled={Boolean(roleUpdating)}
                              style={{ marginLeft: 12, padding: "2px 6px", borderRadius: 4 }}
                            >
                              <option value="chair">chair</option>
                              <option value="member">member</option>
                              <option value="observer">observer</option>
                            </select>
                          )}
                        </li>
                      );
                    })
                  ) : (
                    <li>No participants yet</li>
                  )}
                </ul>
              </div>
              <div
                style={{
                  marginTop: 16,
                  background: "#fff",
                  borderRadius: 8,
                  padding: 10,
                  border: "1px solid #c0d3e7",
                  maxHeight: 220,
                  overflowY: "auto",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: "1.05rem", marginBottom: 8 }}>
                  Previous Decisions {isAdjourned ? "(Meeting adjourned)" : ""}
                </div>
                {previousDecisions.length === 0 ? (
                  <div style={{ color: "#666", fontSize: "0.85rem" }}>
                    No previous decisions recorded yet.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {mainDecisions.map((motion) => {
                      const motionId = String(motion._id);
                      const summaryText = (motion.decisionSummary || "").trim();
                      const hasSummary = Boolean(summaryText);
                      const hasProsCons =
                        Boolean((motion.prosSummary || "").trim()) ||
                        Boolean((motion.consSummary || "").trim());
                      const expanded = Boolean(previousDetailsExpanded[motionId]);
                      const up = motion.votes?.up ?? 0;
                      const down = motion.votes?.down ?? 0;
                      const motionSubType = resolveSubMotionType(motion);
                      const overturnedByMotion = motion.overturnedByMotionId
                        ? motionsById.get(String(motion.overturnedByMotionId))
                        : null;
                      const isPostponed = (motion.outcome || "").toLowerCase() === "postponed";
                      const isOverturned =
                        Boolean(
                          motion.overturned ||
                            (motion.outcome || "").toLowerCase() === "overturned" ||
                            overturnedByMotion
                        ) && motionSubType !== "overturn";
                      const motionCategory = (motion.motionCategory || "").toLowerCase();
                      const isSpecialDecision = motionCategory === "special";
                      const specialRule =
                        isSpecialDecision
                          ? SPECIAL_MOTION_RULES[motion.specialMotionType] || null
                          : null;
                      const isLegacyPointOfOrder =
                        isSpecialDecision && motion.specialMotionType === "pointOfOrder";
                      const chairDecides = Boolean(specialRule?.chairDecides || isLegacyPointOfOrder);
                      const specialSummary =
                        specialRule?.summary ||
                        (isLegacyPointOfOrder ? "Special motion · Chair decides · No vote." : null);
                      const showVoteTotals =
                        !chairDecides && (!specialRule || specialRule.needsVote !== false);
                      let baseOutcomeLabel = (
                        motion.originalOutcome || motion.outcome || "pending"
                      ).toUpperCase();
                      if (isPostponed) {
                        baseOutcomeLabel = "POSTPONED";
                      }
                      let outcomeLabel = baseOutcomeLabel;
                      if (isOverturned) {
                        outcomeLabel = `${outcomeLabel} (OVERTURNED)`;
                      } else if (
                        motionSubType === "overturn" &&
                        motion.targetMotionId &&
                        outcomeLabel !== "PENDING"
                      ) {
                        outcomeLabel = `${outcomeLabel} (Overturn)`;
                      }
                      let displayedOutcome = outcomeLabel;
                      if (chairDecides) {
                        displayedOutcome = motion.chairDecision
                          ? `Chair ruled: ${motion.chairDecision === "sustained" ? "Sustained" : "Denied"}`
                          : "Chair ruling pending";
                      }
                      const hasRevisions =
                        Array.isArray(motion.revisionHistory) && motion.revisionHistory.length > 0;
                      const lastRevisionEntry = hasRevisions
                        ? motion.revisionHistory[motion.revisionHistory.length - 1]
                        : null;
                      const childEntries = (childMotionsByParent.get(motionId) || [])
                        .filter((child) => previousDecisionIds.has(String(child._id)))
                        .sort(
                          (a, b) =>
                            new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
                        );
                      const canOverturnFromList = userCanOverturnMotion(motion);
                      return (
                        <div
                          key={`decision-${motionId}`}
                          style={{
                            border: "1px solid #e0e7f1",
                            borderRadius: 6,
                            padding: 8,
                            background: "#fdfdff",
                            fontSize: "0.9rem",
                            lineHeight: 1.4,
                          }}
                        >
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <div style={{ fontWeight: 600, color: "#1f2a44" }}>
                              {motion.title || motion.text || "Untitled motion"}
                            </div>
                            <span style={{ color: "#5a637d" }}>
                              Outcome: {displayedOutcome}
                            </span>
                          </div>
                          {isSpecialDecision && (
                            <>
                              <div style={{ color: "#5a637d", fontSize: "0.8rem", marginTop: 2 }}>
                                {`Special motion${specialRule?.label ? ` — ${specialRule.label}` : ""}`}
                              </div>
                              {specialSummary && (
                                <div style={{ color: "#5a637d", fontSize: "0.8rem" }}>
                                  {specialSummary}
                                </div>
                              )}
                            </>
                          )}
                          {showVoteTotals ? (
                            <div style={{ color: "#5a637d", fontSize: "0.85rem" }}>
                              Final tally: 👍 {up} / 👎 {down}
                            </div>
                          ) : (
                            <div style={{ color: "#5a637d", fontSize: "0.85rem" }}>
                              Chair ruling:{" "}
                              {motion.chairDecision
                                ? motion.chairDecision === "sustained"
                                  ? "Sustained"
                                  : "Denied"
                                : "Pending"}
                            </div>
                          )}
                          {isPostponed && (
                            <div style={{ marginTop: 4, color: "#b00020", fontSize: "0.85rem" }}>
                              Decision postponed
                              {motion.postponeUntil ? ` (until "${motion.postponeUntil}")` : ""}.
                            </div>
                          )}
                          {isOverturned && motionSubType !== "overturn" && (
                            <div style={{ marginTop: 4, color: "#b00020", fontSize: "0.85rem" }}>
                              Overturned by:{" "}
                              {overturnedByMotion?.title ||
                                overturnedByMotion?.text ||
                                "Overturn motion"}
                            </div>
                          )}
                          {hasRevisions && lastRevisionEntry && (
                            <div style={{ marginTop: 4, color: "#2f3b61", fontSize: "0.85rem" }}>
                              Revised via procedural motion on{" "}
                              {new Date(lastRevisionEntry.at || motion.updatedAt || Date.now()).toLocaleString()}.
                            </div>
                          )}
                          {hasSummary && (
                            <div style={{ marginTop: 4, color: "#2f3b61" }}>
                              <strong>Summary:</strong> {summaryText}
                            </div>
                          )}
                          {canOverturnFromList && (
                            <button
                              type="button"
                              onClick={() => openOverturnMotionModal(motion)}
                              style={{
                                marginTop: 8,
                                borderRadius: 6,
                                border: "1px solid #174ea6",
                                background: "#fff",
                                color: "#174ea6",
                                padding: "4px 10px",
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              Overturn decision
                            </button>
                          )}
                          {hasProsCons && (
                            <button
                              type="button"
                              onClick={() => toggleProsCons(motionId)}
                              style={{
                                border: "none",
                                background: "transparent",
                                color: "#0582CA",
                                fontWeight: 600,
                                cursor: "pointer",
                                padding: 0,
                                marginTop: 6,
                              }}
                            >
                              {expanded ? "Hide pros/cons" : "Show pros/cons"}
                            </button>
                          )}
                          {hasProsCons && expanded && (
                            <div
                              style={{
                                marginTop: 6,
                                fontSize: "0.85rem",
                                color: "#333",
                                background: "#f5f8ff",
                                borderRadius: 6,
                                padding: 8,
                              }}
                            >
                              <div>
                                <strong>Pros:</strong>{" "}
                                {(motion.prosSummary || "").trim() || "No pros recorded."}
                              </div>
                              <div style={{ marginTop: 4 }}>
                                <strong>Cons:</strong>{" "}
                                {(motion.consSummary || "").trim() || "No cons recorded."}
                              </div>
                            </div>
                          )}
                          {childEntries.length > 0 && (
                            <div
                              style={{
                                marginTop: 8,
                                paddingLeft: 12,
                                borderLeft: "2px solid #d1daeb",
                                display: "flex",
                                flexDirection: "column",
                                gap: 6,
                              }}
                            >
                              {childEntries.map((child) => {
                                const childId = String(child._id);
                                const childSubType = resolveSubMotionType(child);
                                const childOutcome = (child.outcome || "pending").toUpperCase();
                                const childUp = child.votes?.up ?? 0;
                                const childDown = child.votes?.down ?? 0;
                                const childLabel =
                                  childSubType === "revise"
                                    ? "Revision motion"
                                    : childSubType === "postpone"
                                    ? "Postpone motion"
                                    : "Overturn motion";
                                return (
                                  <div key={`child-${childId}`} style={{ fontSize: "0.85rem", color: "#3b4252" }}>
                                    <div style={{ fontWeight: 600 }}>
                                      {childLabel}: {childOutcome} (👍 {childUp} / 👎 {childDown})
                                    </div>
                                    {childSubType === "revise" && (
                                      <div>
                                        Updated title: {child.title}.{" "}
                                        {child.description
                                          ? `New description: ${child.description}`
                                          : "No description provided."}
                                      </div>
                                    )}
                                    {childSubType === "postpone" && (
                                      <div>
                                        Voting {childOutcome === "PASSED" ? "postponed" : "not postponed"}.
                                        {child.postponeUntil ? ` Until: "${child.postponeUntil}".` : ""}
                                      </div>
                                    )}
                                    {childSubType === "overturn" && (
                                      <div>
                                        Targeted:{" "}
                                        {motionsById.get(String(child.targetMotionId))?.title ||
                                          "Prior motion"}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {orphanSubDecisions.length > 0 && (
                      <div
                        style={{
                          border: "1px solid #f0d9ff",
                          borderRadius: 6,
                          padding: 8,
                          background: "#faf5ff",
                          fontSize: "0.85rem",
                          color: "#5b3c78",
                        }}
                      >
                        <div style={{ fontWeight: 600, marginBottom: 6 }}>
                          Procedural motions awaiting parent decision
                        </div>
                        {orphanSubDecisions.map((child) => {
                          const childSubType = resolveSubMotionType(child);
                          const childOutcome = (child.outcome || "pending").toUpperCase();
                          const parentId = child.parentMotionId || child.targetMotionId;
                          const childUp = child.votes?.up ?? 0;
                          const childDown = child.votes?.down ?? 0;
                          return (
                            <div key={`orphan-${child._id}`} style={{ marginBottom: 6 }}>
                              <div style={{ fontWeight: 600 }}>
                                {childSubType === "revise"
                                  ? "Revision motion"
                                  : childSubType === "postpone"
                                  ? "Postpone motion"
                                  : "Overturn motion"}{" "}
                                for motion ID {parentId ? String(parentId) : "Unknown"} — {childOutcome}
                              </div>
                              <div>Votes: 👍 {childUp} / 👎 {childDown}</div>
                              {childSubType === "postpone" && child.postponeUntil && (
                                <div>Until: "{child.postponeUntil}"</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div
              style={{
                width: 455,
                background: "#e5ecf5",
                borderRadius: 12,
                padding: 16,
                display: "flex",
                flexDirection: "column",
                minHeight: 520,
                maxHeight: "85vh",
              }}
            >
              <div style={{ fontWeight: 600, fontSize: "1.2rem", marginBottom: 8 }}>Chat</div>
              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: "auto",
                  marginBottom: 12,
                  background: "#fff",
                  borderRadius: 8,
                  padding: 8,
                  border: "1px solid #c0d3e7",
                }}
              >
                {timeline.length === 0 && (
                  <div style={{ color: "#888" }}>No messages yet.</div>
                )}
                {timeline.map((entry, i) => {
                  if (entry.type === "motion") {
                    const motion = entry.item;
                    const motionId = String(motion._id);
                    const replies = motion.replies || [];
                    const selected = selectedMotionId === motionId;
                    const isClosed = motion.status === "closed";
                    const normalizedOutcome = (motion.outcome || "pending").toLowerCase();
                    const motionSubType = resolveSubMotionType(motion);
                    let resultLabel =
                      motion.outcome && normalizedOutcome !== "pending"
                        ? motion.outcome.toUpperCase()
                        : "PENDING";
                    let resultSuffix = "";
                    const votingMode = motion.votingMode || "named";
                    const anonymousVoters = motion.anonymousVotedUsers || [];
                    const userVote = votingMode === "named" ? getVoteChoice(motion.voterMap, username) : null;
                    const userVotedAnonymous =
                      votingMode === "anonymous" && username
                        ? anonymousVoters.includes(username)
                        : false;
                    const motionCategoryValue = (motion.motionCategory || "").toLowerCase();
                    const isSpecialMotionCard = motionCategoryValue === "special";
                    const specialRule = isSpecialMotionCard
                      ? SPECIAL_MOTION_RULES[motion.specialMotionType] || null
                      : null;
                    const isLegacyPointOfOrder =
                      isSpecialMotionCard && motion.specialMotionType === "pointOfOrder";
                    const specialSummary =
                      specialRule?.summary ||
                      (isLegacyPointOfOrder ? "Special motion · Chair decides · No vote." : null);
                    const typeDescription = specialSummary
                      ? specialSummary
                      : motion.type === "procedure"
                      ? `Procedural motion · requires ${motion.requiredPercentage || 66}%`
                      : `Standard motion · requires ${motion.requiredPercentage || 50}%`;
                    const votingModeLabel = votingMode === "anonymous" ? "Anonymous" : "Named";
                    const displayTitle = motion.title || motion.text || "Untitled motion";
                    const replyText = replyTextMap[motionId] || "";
                    const replyStance = replyStanceMap[motionId] || "neutral";
                    const replyError = replyErrorMap[motionId];
                    const replySubmitting = Boolean(replySubmittingMap[motionId]);
                    const showVoterList = Boolean(voterListExpanded[motionId]);
                    const motionIsPostponed = (motion.outcome || "").toLowerCase() === "postponed";
                    const chairDecidesMotion = Boolean(specialRule?.chairDecides || isLegacyPointOfOrder);
                    const disallowVoting =
                      chairDecidesMotion || (specialRule && specialRule.needsVote === false);
                    const showVoteControls = !disallowVoting;
                    const voteButtonsDisabled =
                      !username ||
                      isClosed ||
                      motionIsPostponed ||
                      isAdjourned ||
                      !showVoteControls ||
                      (votingMode === "anonymous" && userVotedAnonymous);
                    const overturnedByMotion = motion.overturnedByMotionId
                      ? motionsById.get(String(motion.overturnedByMotionId))
                      : null;
                    const isMotionOverturned =
                      Boolean(
                        motion.overturned ||
                          (motion.outcome || "").toLowerCase() === "overturned" ||
                          overturnedByMotion
                      ) && motionSubType !== "overturn";
                    const canOverturnThisMotion = !isAdjourned && userCanOverturnMotion(motion);
                    const parentReferenceId =
                      motion.parentMotionId || (motionSubType === "overturn" ? motion.targetMotionId : null);
                    const parentMotionDetails = parentReferenceId
                      ? motionsById.get(String(parentReferenceId))
                      : null;
                    if (isMotionOverturned) {
                      resultLabel = "OVERTURNED";
                      const prevOutcomeLabel = (motion.originalOutcome || "passed").toUpperCase();
                      resultSuffix = ` (was ${prevOutcomeLabel})`;
                    } else if (motion.overturnedByMotionId) {
                      resultSuffix = " — OVERTURNED";
                    } else if (motionSubType === "overturn" && normalizedOutcome !== "pending") {
                    	resultSuffix = " (Overturn)";
                    }
                    const hasRevisions =
                      Array.isArray(motion.revisionHistory) && motion.revisionHistory.length > 0;
                    const lastRevisionEntry = hasRevisions
                      ? motion.revisionHistory[motion.revisionHistory.length - 1]
                      : null;
                    const pendingRevision = pendingRevisionParents.has(motionId);
                    const discussionAllowed = motion.allowDiscussion !== false;
                    const canReply = discussionAllowed && !isAdjourned;
                    const canChairDecide =
                      chairDecidesMotion && ["owner", "chair"].includes(myRole);
                    const chairDecisionSubmitting = Boolean(chairDecisionSubmittingMap[motionId]);
                    const chairDecisionError = chairDecisionErrorMap[motionId];
                    const statusText = chairDecidesMotion
                      ? motion.chairDecision
                        ? `Chair ruling: ${motion.chairDecision === "sustained" ? "Sustained" : "Denied"}`
                        : "Awaiting chair decision"
                      : specialRule
                      ? isClosed
                        ? `Voting closed — ${resultLabel}${resultSuffix}`
                        : "Voting open — SPECIAL MOTION"
                      : isClosed
                      ? `Voting closed — ${resultLabel}${resultSuffix}`
                      : "Voting open";
                    const statusColor = chairDecidesMotion
                      ? motion.chairDecision
                        ? "#0b8457"
                        : "#5d4037"
                      : isClosed
                      ? "#b71c1c"
                      : "#0b8457";
                    const canShowSubActions =
                      canManageMotions &&
                      motionSubType === "none" &&
                      normalizedOutcome === "pending" &&
                      motion.status === "open" &&
                      !isMotionOverturned &&
                      !motionIsPostponed &&
                      !pendingRevision &&
                      !isSpecialMotionCard &&
                      !isAdjourned;
                    return (
                      <div
                        key={`motion-${motionId}-${i}`}
                        onClick={() => setSelectedMotionId(motionId)}
                        style={{
                          marginBottom: 12,
                          padding: 8,
                          borderRadius: 6,
                          background: selected ? "#fff0f0" : "#fff8f8",
                          border: selected ? "2px solid #f28b8b" : "1px solid #f1d0d0",
                          cursor: "pointer"
                        }}
                      >
                        <div style={{ marginBottom: 6 }}>
                          <span style={{ color: "#0582CA", fontWeight: 500 }}>
                            {new Date(motion.createdAt).toLocaleTimeString()}
                          </span>{" "}
                          <b>Motion:</b> {displayTitle} — <i>{motion.proposer}</i>
                        </div>
                        {isSpecialMotionCard && (
                          <div style={{ marginBottom: 6 }}>
                            <span
                              style={{
                                display: "inline-block",
                                background: "#fdecea",
                                color: "#b3261e",
                                borderRadius: 999,
                                padding: "2px 10px",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                textTransform: "uppercase",
                              }}
                            >
                              {`Special motion${specialRule?.label ? ` — ${specialRule.label}` : ""}`}
                            </span>
                          </div>
                        )}
                        {showVoteControls && votingMode === "anonymous" && (
                          <div style={{ marginTop: 4, fontSize: "0.85rem", color: "#555" }}>
                            Total voters: {anonymousVoters.length}
                          </div>
                        )}
                        {showVoteControls && votingMode === "anonymous" && userVotedAnonymous && !isClosed && (
                          <div style={{ marginTop: 4, fontSize: "0.85rem", color: "#b00020" }}>
                            You have already voted on this motion (anonymous).
                          </div>
                        )}
                        {motion.description && (
                          <div style={{ marginBottom: 6, color: "#333" }}>
                            {motion.description}
                          </div>
                        )}
                        <div style={{ fontSize: "0.85rem", color: "#555", marginBottom: 6 }}>
                          {typeDescription}
                          {showVoteControls ? ` · Voting mode: ${votingModeLabel}` : ""}
                        </div>
                        {pendingRevision && motionSubType === "none" && (
                          <div style={{ marginBottom: 6, fontSize: "0.85rem", color: "#8c3700" }}>
                            Revision proposed via procedural motion (vote pending).
                          </div>
                        )}
                        {lastRevisionEntry && motionSubType === "none" && (
                          <div style={{ marginBottom: 6, fontSize: "0.85rem", color: "#174ea6" }}>
                            Note: text revised via procedural motion on{" "}
                            {new Date(lastRevisionEntry.at || motion.updatedAt || Date.now()).toLocaleString()}.
                          </div>
                        )}
                        {motionSubType === "revise" && parentMotionDetails && (
                          <div style={{ marginBottom: 6, fontSize: "0.85rem", color: "#444" }}>
                            Revises: {parentMotionDetails.title || parentMotionDetails.text || "Untitled motion"}
                          </div>
                        )}
                        {motionSubType === "postpone" && parentMotionDetails && (
                          <div style={{ marginBottom: 6, fontSize: "0.85rem", color: "#444" }}>
                            Postpone decision on:{" "}
                            {parentMotionDetails.title || parentMotionDetails.text || "Untitled motion"}
                          </div>
                        )}
                        {motionSubType === "postpone" && (
                          <div style={{ marginBottom: 6, fontSize: "0.85rem", color: "#444" }}>
                            Proposed postponement:{" "}
                            {motion.postponeUntil ? `"${motion.postponeUntil}"` : "Not specified"}
                          </div>
                        )}
                        {motionSubType === "revise" && (
                          <div style={{ marginBottom: 6, fontSize: "0.85rem", color: "#444" }}>
                            Proposed new title/description shown above.
                          </div>
                        )}
                        {motionSubType === "revise" && normalizedOutcome === "failed" && (
                          <div style={{ marginBottom: 6, fontSize: "0.85rem", color: "#8c1d18" }}>
                            Revision failed; original text kept.
                          </div>
                        )}
                        {motionSubType === "revise" && normalizedOutcome === "passed" && (
                          <div style={{ marginBottom: 6, fontSize: "0.85rem", color: "#0f5132" }}>
                            Revision approved; parent motion updated.
                          </div>
                        )}
                        {motionSubType === "postpone" && normalizedOutcome === "passed" && (
                          <div style={{ marginBottom: 6, fontSize: "0.85rem", color: "#5d4037" }}>
                            Parent motion voting postponed.
                          </div>
                        )}
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          {showVoteControls && (
                            <>
                              <button
                                type="button"
                                disabled={voteButtonsDisabled}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!voteButtonsDisabled) toggleVote(motionId, "up");
                                }}
                                style={{
                                  background: userVote === "up" ? "#0b8457" : "#e0f1ea",
                                  color: userVote === "up" ? "#fff" : "#000",
                                  border: "none",
                                  padding: "6px 10px",
                                  borderRadius: 6,
                                  cursor: voteButtonsDisabled ? "not-allowed" : "pointer",
                                  opacity: voteButtonsDisabled ? 0.6 : 1,
                                }}
                              >
                                👍 {motion.votes?.up ?? 0}
                              </button>
                              <button
                                type="button"
                                disabled={voteButtonsDisabled}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!voteButtonsDisabled) toggleVote(motionId, "down");
                                }}
                                style={{
                                  background: userVote === "down" ? "#b71c1c" : "#fdecea",
                                  color: userVote === "down" ? "#fff" : "#000",
                                  border: "none",
                                  padding: "6px 10px",
                                  borderRadius: 6,
                                  cursor: voteButtonsDisabled ? "not-allowed" : "pointer",
                                  opacity: voteButtonsDisabled ? 0.6 : 1,
                                }}
                              >
                                👎 {motion.votes?.down ?? 0}
                              </button>
                          {canCloseVotingRole && !isClosed && !motionIsPostponed && !isAdjourned && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openCloseVotingModalForMotion(motion);
                                  }}
                                  style={{
                                    borderRadius: 6,
                                    border: "1px solid #b71c1c",
                                    background: "#fff",
                                    color: "#b71c1c",
                                    padding: "6px 10px",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                  }}
                                >
                                  Close Voting
                                </button>
                              )}
                            </>
                          )}
                          <span
                            style={{
                              marginLeft: "auto",
                              fontWeight: 600,
                              color: statusColor,
                            }}
                          >
                            {statusText}
                          </span>
                        </div>
                        {isClosed && showVoteControls && (
                          <div style={{ marginTop: 6, fontSize: "0.9rem", color: "#555" }}>
                            Final tally: 👍 {motion.votes?.up ?? 0} / 👎 {motion.votes?.down ?? 0}
                          </div>
                        )}
                        {chairDecidesMotion && (
                          <div
                            style={{
                              marginTop: 8,
                              padding: "8px 10px",
                              borderRadius: 6,
                              border: "1px solid #ffd7a8",
                              background: "#fff9ef",
                            }}
                          >
                            {motion.chairDecision ? (
                              <div style={{ fontWeight: 600, color: "#5d4037" }}>
                                Chair ruling:{" "}
                                {motion.chairDecision === "sustained" ? "Sustained" : "Denied"}
                              </div>
                            ) : canChairDecide ? (
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleChairDecision(motionId, "sustained");
                                  }}
                                  disabled={chairDecisionSubmitting}
                                  style={{
                                    borderRadius: 6,
                                    border: "1px solid #0b8457",
                                    background: chairDecisionSubmitting ? "#9acfb8" : "#e0f1ea",
                                    color: "#0b8457",
                                    padding: "6px 10px",
                                    fontWeight: 600,
                                    cursor: chairDecisionSubmitting ? "not-allowed" : "pointer",
                                  }}
                                >
                                  Rule in favor
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleChairDecision(motionId, "denied");
                                  }}
                                  disabled={chairDecisionSubmitting}
                                  style={{
                                    borderRadius: 6,
                                    border: "1px solid #b71c1c",
                                    background: chairDecisionSubmitting ? "#f6cac6" : "#fdecea",
                                    color: "#b71c1c",
                                    padding: "6px 10px",
                                    fontWeight: 600,
                                    cursor: chairDecisionSubmitting ? "not-allowed" : "pointer",
                                  }}
                                >
                                  Deny
                                </button>
                              </div>
                            ) : (
                              <div style={{ color: "#5d4037" }}>
                                Awaiting chair decision.
                              </div>
                            )}
                            {chairDecisionError && (
                              <div style={{ marginTop: 6, color: "#b00020", fontSize: "0.85rem" }}>
                                {chairDecisionError}
                              </div>
                            )}
                          </div>
                        )}
                        {motionIsPostponed && (
                          <div style={{ marginTop: 6, fontSize: "0.9rem", color: "#b00020" }}>
                            Decision postponed
                            {motion.postponeUntil ? ` (until "${motion.postponeUntil}")` : ""}.
                          </div>
                        )}
                        {canShowSubActions && (
                          <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openReviseMotionModal(motion);
                              }}
                              style={{
                                borderRadius: 6,
                                border: "1px solid #0d47a1",
                                background: "#fff",
                                color: "#0d47a1",
                                padding: "4px 10px",
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              Revise motion
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openPostponeMotionModal(motion);
                              }}
                              style={{
                                borderRadius: 6,
                                border: "1px solid #5d4037",
                                background: "#fff",
                                color: "#5d4037",
                                padding: "4px 10px",
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              Postpone decision
                            </button>
                          </div>
                        )}
                        {canOverturnThisMotion && (
                          <div style={{ marginTop: 8 }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openOverturnMotionModal(motion);
                              }}
                              style={{
                                borderRadius: 6,
                                border: "1px solid #174ea6",
                                background: "#fff",
                                color: "#174ea6",
                                padding: "6px 12px",
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              Overturn decision
                            </button>
                          </div>
                        )}
                        {isMotionOverturned && overturnedByMotion && (
                          <div style={{ marginTop: 8, fontSize: "0.85rem", color: "#b00020" }}>
                            Overturned by:{" "}
                            {overturnedByMotion?.title ||
                              overturnedByMotion?.text ||
                              "Overturn motion"}
                          </div>
                        )}
                        {motionSubType === "overturn" && parentMotionDetails && (
                          <div style={{ marginTop: 8, fontSize: "0.85rem", color: "#333" }}>
                            Targeting: {parentMotionDetails.title || parentMotionDetails.text || "Untitled motion"}
                          </div>
                        )}
                        {motionSubType === "revise" && parentMotionDetails && (
                          <div style={{ marginTop: 8, fontSize: "0.85rem", color: "#333" }}>
                            Revises: {parentMotionDetails.title || parentMotionDetails.text || "Untitled motion"}
                          </div>
                        )}
                        {motionSubType === "postpone" && parentMotionDetails && (
                          <div style={{ marginTop: 8, fontSize: "0.85rem", color: "#333" }}>
                            Postpones: {parentMotionDetails.title || parentMotionDetails.text || "Untitled motion"}
                          </div>
                        )}
                        {hasRevisions && motionSubType === "none" && (
                          <div style={{ marginTop: 8, fontSize: "0.85rem", color: "#333" }}>
                            Note: Motion text revised via procedural motion.
                          </div>
                        )}
                        {!discussionAllowed && (
                          <div style={{ marginTop: 12, fontSize: "0.85rem", color: "#7c4a00" }}>
                            Discussion is not allowed for this motion.
                          </div>
                        )}
                        {isClosed && votingMode === "named" && showVoteControls && (
                          <div style={{ marginTop: 6 }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setVoterListExpanded((prev) => ({
                                  ...prev,
                                  [motionId]: !prev[motionId],
                                }));
                              }}
                              style={{
                                border: "none",
                                background: "transparent",
                                color: "#0582CA",
                                cursor: "pointer",
                                fontWeight: 600,
                                padding: 0,
                              }}
                            >
                              {showVoterList ? "Hide voter list" : "Show voter list"}
                            </button>
                            {showVoterList && (
                              <ul style={{ marginTop: 6, paddingLeft: 18 }}>
                                {(() => {
                                  const entries = motion.voterMap
                                    ? typeof motion.voterMap.entries === "function"
                                      ? Array.from(motion.voterMap.entries())
                                      : Object.entries(motion.voterMap)
                                    : [];
                                  if (entries.length === 0) {
                                    return <li>No votes recorded.</li>;
                                  }
                                  return entries.map(([name, choice]) => (
                                    <li key={`${motionId}-${name}`}>
                                      {name} — {choice === "up" ? "👍" : "👎"}
                                    </li>
                                  ));
                                })()}
                              </ul>
                            )}
                          </div>
                        )}
                        {(discussionAllowed || replies.length > 0) && (
                          <div
                            className="motion-reply-section"
                            style={{ marginTop: 12, borderTop: "1px solid #f1c7c7", paddingTop: 8 }}
                          >
                            {replies.length > 0 && (
                              <div className="motion-reply-list" style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 6 }}>
                                {replies.map((reply) => {
                                  const stanceLabel =
                                    reply.stance === "pro" ? "Pro" : reply.stance === "con" ? "Con" : "Neutral";
                                  const stanceStyles = {
                                    pro: { background: "#e6ffed", color: "#137333" },
                                    con: { background: "#ffe6e6", color: "#b00020" },
                                    neutral: { background: "#f3f3f3", color: "#555" },
                                  };
                                  const stanceStyle = stanceStyles[reply.stance] || stanceStyles.neutral;
                                  const replyAuthor =
                                    reply.authorDisplayName ||
                                    reply.authorUsername ||
                                    reply.author ||
                                    "Unknown";
                                  return (
                                    <div
                                      key={reply._id || reply.createdAt}
                                      className={`motion-reply motion-reply--${reply.stance}`}
                                      style={{ padding: 6, borderRadius: 6, background: "#fff5f5" }}
                                    >
                                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.85rem", marginBottom: 4 }}>
                                        <span style={{ fontWeight: 600 }}>{replyAuthor}</span>
                                        <span
                                          className="motion-reply-stance-tag"
                                          style={{
                                            padding: "0.1rem 0.5rem",
                                            borderRadius: 999,
                                            fontSize: "0.75rem",
                                            ...stanceStyle,
                                          }}
                                        >
                                          {stanceLabel}
                                        </span>
                                        <span style={{ marginLeft: "auto", color: "#666" }}>
                                          {reply.createdAt ? new Date(reply.createdAt).toLocaleTimeString() : ""}
                                        </span>
                                      </div>
                                      <div style={{ color: "#333" }}>{reply.text}</div>
                                    </div>
                                  );
                              })}
                            </div>
                          )}
                          {discussionAllowed && (
                            <>
                              <div
                                className="motion-reply-input-row"
                                style={{ display: "flex", gap: 8, alignItems: "center" }}
                              >
                                <input
                                  type="text"
                                  className="motion-reply-input"
                                  placeholder={
                                    canReply ? "Reply to this motion..." : "Meeting adjourned — replies closed."
                                  }
                                  value={replyText}
                                  onChange={(e) =>
                                    setReplyTextMap((prev) => ({ ...prev, [motionId]: e.target.value }))
                                  }
                                  disabled={!canReply}
                                  style={{
                                    flex: 1,
                                    borderRadius: 6,
                                    border: "1px solid #b0b0b0",
                                    padding: 6,
                                    background: !canReply ? "#f1f1f1" : "#fff",
                                    color: !canReply ? "#777" : "#000",
                                  }}
                                />
                                <select
                                  className="motion-reply-stance-select"
                                  value={replyStance}
                                  onChange={(e) =>
                                    setReplyStanceMap((prev) => ({ ...prev, [motionId]: e.target.value }))
                                  }
                                  disabled={!canReply}
                                  style={{
                                    borderRadius: 6,
                                    border: "1px solid #b0b0b0",
                                    padding: "6px 8px",
                                    background: !canReply ? "#f1f1f1" : "#fff",
                                    color: !canReply ? "#777" : "#000",
                                  }}
                                >
                                  <option value="neutral">Neutral</option>
                                  <option value="pro">Pro</option>
                                  <option value="con">Con</option>
                                </select>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    submitReply(motionId);
                                  }}
                                  disabled={!canReply || replySubmitting || !replyText.trim()}
                                  style={{
                                    borderRadius: 6,
                                    background:
                                      !canReply || !replyText.trim() ? "#9fbfdc" : "#0582CA",
                                    color: "#fff",
                                    border: "none",
                                    padding: "6px 12px",
                                    fontWeight: 600,
                                    cursor:
                                      !canReply || !replyText.trim() ? "not-allowed" : "pointer",
                                    opacity: replySubmitting ? 0.6 : 1,
                                  }}
                                >
                                  {replySubmitting ? "Replying..." : "Reply"}
                                </button>
                              </div>
                              {!canReply && (
                                <div style={{ color: "#7c4a00", fontSize: "0.85rem", marginTop: 6 }}>
                                  {meetingAdjournedMessage}
                                </div>
                              )}
                            </>
                          )}
                          {replyError && (
                            <div style={{ color: "red", fontSize: "0.85rem", marginTop: 4 }}>{replyError}</div>
                          )}
                        </div>
                      )}
                      </div>
                    );
                  }
                  const msg = entry.item;
                  const isSystem = (msg.author || "").toLowerCase() === "system";
                  return (
                    <div
                      key={`msg-${msg._id || i}`}
                      style={{
                        marginBottom: 6,
                        fontStyle: isSystem ? "italic" : "normal",
                        color: isSystem ? "#555" : "#000",
                      }}
                    >
                      <span style={{ color: "#0582CA", fontWeight: 500 }}>
                        {new Date(msg.createdAt).toLocaleTimeString()}
                      </span>{" "}
                      <b>{isSystem ? "System" : msg.author || "Anon"}:</b> {msg.text}
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>
              <div
                className="chat-footer"
                style={{
                  borderTop: "1px solid #d0d7e5",
                  background: "#f5f8ff",
                  padding: "10px 12px",
                  borderRadius: 10,
                  borderTopLeftRadius: 6,
                  borderTopRightRadius: 6,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <form
                  className="chat-main-row"
                  style={{ display: "flex", gap: 8, alignItems: "center" }}
                  onSubmit={sendMessage}
                >
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder={chatInputPlaceholder}
                    disabled={isAdjourned}
                    style={{
                      flex: 1,
                      borderRadius: 6,
                      border: "1px solid #b0b0b0",
                      padding: 8,
                      fontSize: "0.95rem",
                      background: isAdjourned ? "#f1f1f1" : "#fff",
                      color: isAdjourned ? "#777" : "#000",
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!canSend || !messageText.trim()}
                    title={!canSend ? (isAdjourned ? meetingAdjournedMessage : "Log in to send messages.") : undefined}
                    style={{
                      borderRadius: 6,
                      background:
                        !messageText.trim() || !canSend ? "#9fbfdc" : "#0582CA",
                      color: "#fff",
                      border: "none",
                      padding: "8px 16px",
                      fontWeight: 600,
                      cursor: !messageText.trim() || !canSend ? "not-allowed" : "pointer",
                    }}
                  >
                    Send
                  </button>
                </form>
                {showRaiseButton && (
                  <div className="chat-secondary-row" style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      onClick={openRaiseMotionModal}
                      disabled={raiseButtonDisabled}
                      title={raiseButtonTitle}
                      style={{
                        borderRadius: 6,
                        background: raiseButtonDisabled ? "#f4c8c8" : "#e53935",
                        color: "#fff",
                        border: "none",
                        padding: "6px 12px",
                        fontWeight: 600,
                        cursor: raiseButtonDisabled ? "not-allowed" : "pointer",
                      }}
                    >
                      Raise Motion
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      <Dialog
        isOpen={closeVotingModalOpen}
        onClose={() => dismissCloseVotingModal()}
        title="Close Voting & Record Decision"
      >
        <form onSubmit={submitCloseVoting}>
          <div className={Classes.DIALOG_BODY}>
            {closingMotion ? (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 600, fontSize: "1.1rem" }}>
                  {closingMotion.title || closingMotion.text || "Untitled motion"}
                </div>
                <div style={{ fontSize: "0.9rem", color: "#555", marginTop: 4 }}>
                  Type: {closingMotion.type === "procedure" ? "Procedural" : "Standard"} · Requires{" "}
                  {closingMotion.requiredPercentage || (closingMotion.type === "procedure" ? 66 : 50)}%
                </div>
                <div style={{ fontSize: "0.9rem", color: "#555" }}>
                  Current tally: 👍 {closingMotion.votes?.up ?? 0} / 👎 {closingMotion.votes?.down ?? 0}
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: 12 }}>Select a motion to close voting.</div>
            )}
            <FormGroup
              label="Decision summary"
              labelFor="decision-summary-input"
              helperText="Capture the key outcome or rationale."
            >
              <textarea
                id="decision-summary-input"
                className="bp4-input"
                rows={4}
                required
                value={closeDecisionSummary}
                onChange={(e) => setCloseDecisionSummary(e.target.value)}
              />
            </FormGroup>
            <FormGroup label="Pros (optional)" labelFor="decision-pros-input">
              <textarea
                id="decision-pros-input"
                className="bp4-input"
                rows={3}
                value={closeProsSummary}
                onChange={(e) => setCloseProsSummary(e.target.value)}
                placeholder="Key supporting points"
              />
            </FormGroup>
            <FormGroup label="Cons (optional)" labelFor="decision-cons-input">
              <textarea
                id="decision-cons-input"
                className="bp4-input"
                rows={3}
                value={closeConsSummary}
                onChange={(e) => setCloseConsSummary(e.target.value)}
                placeholder="Key opposing points"
              />
            </FormGroup>
            {closeVotingError && (
              <p style={{ color: "red", marginTop: 4 }}>{closeVotingError}</p>
            )}
          </div>
          <div className={Classes.DIALOG_FOOTER}>
            <div className={Classes.DIALOG_FOOTER_ACTIONS}>
              <BPButton onClick={() => dismissCloseVotingModal()} disabled={closingVoting}>
                Cancel
              </BPButton>
              <BPButton intent="primary" type="submit" loading={closingVoting}>
                Confirm &amp; Close Voting
              </BPButton>
            </div>
          </div>
        </form>
      </Dialog>
      <Dialog
        isOpen={meetingSummaryModalOpen}
        onClose={closeMeetingSummaryModal}
        title="Meeting Summary"
      >
        <form onSubmit={handleMeetingSummarySave}>
          <div className={Classes.DIALOG_BODY}>
            <FormGroup
              label="Overall meeting summary (context, key outcomes, follow-ups)"
              labelFor="meeting-summary-input"
            >
              <textarea
                id="meeting-summary-input"
                className="bp4-input"
                rows={6}
                value={meetingSummaryInput}
                onChange={(e) => setMeetingSummaryInput(e.target.value)}
                placeholder="Document context, major decisions, and follow-up actions for future reference."
              />
            </FormGroup>
            {meetingSummaryError && (
              <p style={{ color: "red", marginTop: 4 }}>{meetingSummaryError}</p>
            )}
          </div>
          <div className={Classes.DIALOG_FOOTER}>
            <div className={Classes.DIALOG_FOOTER_ACTIONS}>
              <BPButton onClick={closeMeetingSummaryModal} disabled={meetingSummarySaving}>
                Cancel
              </BPButton>
              <BPButton intent="primary" type="submit" loading={meetingSummarySaving}>
                Save Summary
              </BPButton>
            </div>
          </div>
        </form>
      </Dialog>
      <Dialog
        isOpen={raiseModalOpen}
        onClose={closeRaiseMotionModal}
      >
        <div className={Classes.DIALOG_HEADER}>
          <h4>{raiseDialogTitle}</h4>
        </div>
        <form onSubmit={submitMotion} id="raise-motion-form">
          <div className={Classes.DIALOG_BODY}>
            {isOverturnMode && (
              <div
                style={{
                  background: "#fff4e5",
                  border: "1px solid #ffc46b",
                  borderRadius: 6,
                  padding: 10,
                  marginBottom: 16,
                  color: "#5f370e",
                  fontSize: "0.9rem",
                }}
              >
                This motion will overturn the previous decision on{" "}
                <strong>{subMotionParent?.title || subMotionParent?.text || "Untitled motion"}</strong>. Only members
                who voted in favor can initiate this action.
              </div>
            )}
            {isReviseMode && (
              <div
                style={{
                  background: "#e8f0fe",
                  border: "1px solid #8ab4f8",
                  borderRadius: 6,
                  padding: 10,
                  marginBottom: 16,
                  color: "#174ea6",
                  fontSize: "0.9rem",
                }}
              >
                Propose revised wording for{" "}
                <strong>{subMotionParent?.title || subMotionParent?.text || "Untitled motion"}</strong>. The
                updated title/description below will replace the original if this passes.
              </div>
            )}
            {isPostponeMode && (
              <div
                style={{
                  background: "#ede7f6",
                  border: "1px solid #c5a4ff",
                  borderRadius: 6,
                  padding: 10,
                  marginBottom: 16,
                  color: "#4a148c",
                  fontSize: "0.9rem",
                }}
              >
                Postpone the decision on{" "}
                <strong>{subMotionParent?.title || subMotionParent?.text || "Untitled motion"}</strong>. Provide an
                optional note for when/why the decision is delayed.
              </div>
            )}
            <FormGroup label="Motion title" labelFor="motion-title-input">
              <input
                id="motion-title-input"
                className="bp4-input"
                type="text"
                value={motionTitleInput}
                onChange={(e) => setMotionTitleInput(e.target.value)}
                disabled={raisingMotion}
                required
                placeholder="e.g., Approve the budget for Q2"
              />
            </FormGroup>
            <FormGroup label="Motion description (optional)" labelFor="motion-description-input">
              <textarea
                id="motion-description-input"
                className="bp4-input"
                rows={4}
                value={motionDescriptionInput}
                onChange={(e) => setMotionDescriptionInput(e.target.value)}
                disabled={raisingMotion}
                placeholder="Provide details, rationale, or conditions for this motion."
              />
            </FormGroup>
            <FormGroup label="Motion type">
              <RadioGroup
                onChange={(e) => handleMotionTypeChange(e.target.value)}
                selectedValue={motionType}
                inline
                disabled={isSubMotionMode}
              >
                <Radio value="standard" label="Standard (50%)" />
                <Radio value="procedure" label="Procedural (66%)" />
                <Radio value="special" label="Special motion" />
              </RadioGroup>
              {motionType !== "special" ? (
                <p style={{ marginTop: 4, color: "#555" }}>
                  Standard motions pass with &gt; 50% in favor. Procedural motions typically require at
                  least two-thirds.
                </p>
              ) : (
                <p style={{ marginTop: 4, color: "#555" }}>
                  Special motions have fixed rules and thresholds based on parliamentary procedure.
                </p>
              )}
            </FormGroup>
            {motionType === "special" && (
              <FormGroup label="Special motion type">
                <select
                  className="bp4-input"
                  value={specialMotionType}
                  onChange={(e) => handleSpecialMotionTypeChange(e.target.value)}
                >
                  {SPECIAL_MOTION_TYPES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p style={{ marginTop: 4, color: "#555" }}>
                  {SPECIAL_MOTION_RULES[specialMotionType]?.summary || "Special motion"}
                </p>
              </FormGroup>
            )}
            {motionType !== "special" && (
              <FormGroup label="Voting style">
                <RadioGroup
                  onChange={(e) => setMotionVotingMode(e.target.value)}
                  selectedValue={motionVotingMode}
                  inline
                >
                  <Radio value="named" label="Named (record each vote)" />
                  <Radio value="anonymous" label="Anonymous (only show totals)" />
                </RadioGroup>
              </FormGroup>
            )}
            {motionError && (
              <p style={{ color: "red", marginTop: 8 }}>{motionError}</p>
            )}
            {isPostponeMode && (
              <FormGroup label="Postpone until (optional)" labelFor="postpone-until-input">
                <input
                  id="postpone-until-input"
                  className="bp4-input"
                  type="text"
                  value={postponeUntilInput}
                  onChange={(e) => setPostponeUntilInput(e.target.value)}
                  placeholder='e.g., "Next meeting", "April 10"'
                />
              </FormGroup>
            )}
          </div>
          <div className={Classes.DIALOG_FOOTER}>
            <div className={Classes.DIALOG_FOOTER_ACTIONS}>
              <BPButton onClick={closeRaiseMotionModal} disabled={raisingMotion}>
                Cancel
              </BPButton>
              <BPButton intent="primary" type="submit" loading={raisingMotion}>
                {raiseSubmitLabel}
              </BPButton>
            </div>
          </div>
        </form>
      </Dialog>
    </>
  );
}
