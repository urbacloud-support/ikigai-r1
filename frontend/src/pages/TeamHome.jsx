import React, { useState, useEffect } from "react";
import HackathonCountdown from "../components/HackathonCountdown.jsx";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Calendar,
  AlignJustify,
  IndianRupee,
  QrCode,
  Upload,
  CheckCircle,
  Clock
} from "lucide-react";
import QRCode from "react-qr-code";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

function SortableTrackItem({ id, track, index, disabled }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(disabled ? {} : attributes)}
      {...(disabled ? {} : listeners)}
      className={`bg-white border border-gray-200 rounded-lg p-4 flex gap-4 items-center shadow-sm mb-3 z-50 relative ${disabled ? "" : "hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing select-none touch-none"}`}
    >
      <div className="w-10 h-10 rounded-full bg-green-600 text-white font-black text-lg flex items-center justify-center shrink-0 shadow-sm">
        {index + 1}
      </div>
      <div className="text-gray-400 shrink-0">
        <AlignJustify size={20} />
      </div>
      <div className="flex-1 text-left">
        <h3 className="font-bold text-gray-900 mb-1.5 leading-tight">
          {track.name}
        </h3>
        <p className="text-sm text-gray-600 leading-relaxed text-justify">
          {track.location}
        </p>
      </div>
    </div>
  );
}

export default function TeamHome() {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tracks, setTracks] = useState([]);
  const [transactionId, setTransactionId] = useState("");
  const [receiptFile, setReceiptFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [regStatus, setRegStatus] = useState("Pending");
  const [reopenAccess, setReopenAccess] = useState(null);
  const [timeLeft, setTimeLeft] = useState("");
  const [savingSequence, setSavingSequence] = useState(false);
  const [sequenceMessage, setSequenceMessage] = useState("");
  const [isSequenceSaved, setIsSequenceSaved] = useState(false);
  const [trackPrefChecked, setTrackPrefChecked] = useState(false);
  const [paymentChecked, setPaymentChecked] = useState(false);
  const [rulesScrolled, setRulesScrolled] = useState(false);
  const [rulesChecked, setRulesChecked] = useState(false);
  const [consentDownloaded, setConsentDownloaded] = useState(false);

  const [tshirtSizes, setTshirtSizes] = useState({});
  const [savingTshirts, setSavingTshirts] = useState(false);
  const [tshirtsSaved, setTshirtsSaved] = useState(false);

  const [assignedTrack, setAssignedTrack] = useState("");
  const [assignedProblemStatement, setAssignedProblemStatement] = useState("");
  const [publishProblemStatements, setPublishProblemStatements] = useState(false);
  const [availableProblemStatements, setAvailableProblemStatements] = useState([]);
  const [selectedPS, setSelectedPS] = useState("");
  const [submittingPS, setSubmittingPS] = useState(false);
  const [sponsorDescription, setSponsorDescription] = useState("");

  const handleSaveSequence = async () => {
    if (!teamInfo) {
      alert("Team info not found. Please log in again.");
      return;
    }
    setSavingSequence(true);
    try {
      const payload = {
        participantId: teamInfo.participantId,
        teamName: teamInfo.teamName,
        leaderEmail: sessionStorage.getItem("care_email"),
        eventId: event._id,
        trackPreferences: tracks.map((t) => t.title || t.name),
      };

      const res = await fetch(`${API_BASE}/api/round2/save-sequence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setSequenceMessage("✅ Sequence Saved.");
        setIsSequenceSaved(true);
      } else {
        alert(data.message || "Failed to save sequence.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while saving the sequence.");
    } finally {
      setSavingSequence(false);
    }
  };

  const isReopened = submitted && reopenAccess && reopenAccess.open;

  const [teamInfo, setTeamInfo] = useState(null);
  const [qrData, setQrData] = useState(null);

  useEffect(() => {
    const fetchRound2 = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/admin/events`);
        const data = await res.json();
        if (data.success) {
          const round2 = data.events.find((e) => {
            const t = (e.title || e.name || "").toLowerCase();
            return t.includes("round 2") || t.includes("round-2");
          });
          if (round2) {
            setEvent(round2);
            setTracks(round2.tracks || []);
            if (round2.publishProblemStatements) setPublishProblemStatements(true);
          }
        }

        const email = sessionStorage.getItem("care_email");
        if (email) {
          const teamRes = await fetch(
            `${API_BASE}/api/team/my-details?email=${encodeURIComponent(email)}`,
          );
          const teamData = await teamRes.json();
          if (teamData.success) {
            setTeamInfo(teamData.team);
          }

          const myRes = await fetch(
            `${API_BASE}/api/round2/my-status?email=${encodeURIComponent(email)}`,
          );
          const myData = await myRes.json();
          if (myRes.ok) {
            if (
              myData.trackPreferences &&
              myData.trackPreferences.length > 0 &&
              data &&
              data.success
            ) {
              const round2 = data.events.find((e) => {
                const t = (e.title || e.name || "").toLowerCase();
                return t.includes("round 2") || t.includes("round-2");
              });
              if (round2) {
                const savedPrefs = myData.trackPreferences;
                const defaultTracks = round2.tracks || [];

                const orderedTracks = [];
                savedPrefs.forEach((prefName) => {
                  const found = defaultTracks.find(
                    (t) => (t.title || t.name) === prefName,
                  );
                  if (found) orderedTracks.push(found);
                });

                defaultTracks.forEach((t) => {
                  if (!savedPrefs.includes(t.title || t.name)) {
                    orderedTracks.push(t);
                  }
                });

                setTracks(orderedTracks);
                setIsSequenceSaved(true);
                setSequenceMessage("✅ Sequence Saved.");
                setTrackPrefChecked(true);
              }
            }

            if (myData.registered) {
              setSubmitted(true);
              setRegStatus(myData.status);
              setReopenAccess(myData.reopenAccess);
              if (myData.transactionId) setTransactionId(myData.transactionId);
              if (myData.tshirtSizes) {
                setTshirtSizes(myData.tshirtSizes);
              }
              if (myData.assignedTrack) {
                setAssignedTrack(myData.assignedTrack);
                // Fetch problem statements for this track
                if (data.success) {
                  const round2Event = data.events.find((e) => {
                    const t = (e.title || e.name || "").toLowerCase();
                    return t.includes("round 2") || t.includes("round-2");
                  });
                  if (round2Event && round2Event.publishProblemStatements) {
                    try {
                      const psRes = await fetch(`${API_BASE}/api/round2/available-statements?eventId=${round2Event._id}&trackId=${myData.assignedTrack}`);
                      const psData = await psRes.json();
                      if (psData.success) {
                        setAvailableProblemStatements(psData.statements.filter(s => s.left > 0));
                        if (psData.sponsorDescription) {
                          setSponsorDescription(psData.sponsorDescription);
                        }
                      }
                    } catch (e) {
                      console.error(e);
                    }
                  }
                }
              }
              if (myData.assignedProblemStatement) {
                setAssignedProblemStatement(myData.assignedProblemStatement);
                setSelectedPS(myData.assignedProblemStatement);
              }
            }
          }

          const qrRes = await fetch(`${API_BASE}/api/round2/team-qr/${encodeURIComponent(email)}`);
          const qrJson = await qrRes.json();
          if (qrJson.success && qrJson.qrToken) {
            setQrData({ token: qrJson.qrToken, status: qrJson.verificationStatus });
          }
        }
      } catch (err) {
        console.error("Error fetching data", err);
      }
      setLoading(false);
    };
    fetchRound2();
  }, []);

  
  const submitProblemStatement = async () => {
    if (!selectedPS) return;
    setSubmittingPS(true);
    try {
      const res = await fetch(`${API_BASE}/api/round2/choose-problem-statement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: teamInfo.participantId,
          leaderEmail: sessionStorage.getItem("care_email"),
          eventId: event._id,
          trackId: assignedTrack,
          statementId: selectedPS
        })
      });
      const data = await res.json();
      if (data.success) {
        setAssignedProblemStatement(selectedPS);
        alert("Problem statement successfully assigned!");
      } else {
        alert(data.message || "Failed to assign problem statement. It may be fully booked.");
        // Refresh available
        window.location.reload();
      }
    } catch (err) {
      alert("Error assigning problem statement");
    }
    setSubmittingPS(false);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      setTracks((items) => {
        const oldIndex = items.findIndex(
          (item) => item.id === active.id || item._id === active.id,
        );
        const newIndex = items.findIndex(
          (item) => item.id === over.id || item._id === over.id,
        );
        return arrayMove(items, oldIndex, newIndex);
      });
      setIsSequenceSaved(false);
      setSequenceMessage("");
    }
  };

  const handleSubmit = async () => {
    if (!isSequenceSaved) {
      alert(
        "Please save your track sequence before submitting the registration form.",
      );
      return;
    }

    if (!isReopened && (!transactionId || !receiptFile)) {
      alert("Please enter transaction ID and upload receipt");
      return;
    }
    if (!isReopened && !paymentChecked) {
      alert("Please confirm the payment instructions checkbox.");
      return;
    }
    if (!isReopened && !consentDownloaded) {
      alert("Please download the consent letter before submitting.");
      return;
    }
    if (!isReopened && !rulesChecked) {
      alert("Please accept the rules and regulations before submitting.");
      return;
    }
    if (isReopened) {
      if (!transactionId) return alert("Transaction ID required");
    }

    if (!teamInfo) {
      alert("Team info not found. Please log in again.");
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("participantId", teamInfo.participantId);
      formData.append("teamName", teamInfo.teamName);
      formData.append("leaderEmail", sessionStorage.getItem("care_email"));
      formData.append("eventId", event._id);

      formData.append("transactionId", transactionId);
      if (receiptFile) {
        formData.append("receiptFile", receiptFile);
      }
      formData.append(
        "trackPreferences",
        JSON.stringify(tracks.map((t) => t.title || t.name)),
      );

      const res = await fetch(`${API_BASE}/api/round2/register`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
        if (isReopened) {
          setRegStatus("Pending");
          setReopenAccess(null);
        }
      } else {
        alert(data.message || "Failed to register");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred");
    }
    setSubmitting(false);
  };

  if (loading)
    return (
      <div className="p-8 text-center text-gray-600">
        Loading Round 2 details...
      </div>
    );

  if (!event)
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="bg-white p-6 rounded-xl shadow border border-gray-200 text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Round 2 Registration
          </h2>
          <p className="text-gray-600">
            The Round 2 event is not yet active. Please check back later.
          </p>
        </div>
      </div>
    );

  return (
    <div className="p-6 max-w-5xl mx-auto w-full space-y-6">
      {/* Hackathon Countdown Banner — server-authoritative, cheat-proof */}
      <HackathonCountdown />

      {/* Timeline UI */}
      <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-200 mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 md:mb-6">Your Progress</h2>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center relative pt-4 pb-2 w-full gap-8 md:gap-0">
          
          {/* Connecting Line (Desktop) */}
          <div className="hidden md:block absolute top-[41px] left-[10%] right-[10%] h-1.5 bg-gray-200 z-0 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-500 ease-in-out"
              style={{
                width:
                  regStatus === "Approved" && assignedTrack && publishProblemStatements
                    ? "75%"
                    : regStatus === "Approved"
                      ? "50%"
                      : submitted && !isReopened
                        ? "25%"
                        : "0%",
              }}
            ></div>
          </div>

          {/* Connecting Line (Mobile Vertical) */}
          <div className="md:hidden absolute top-8 bottom-8 left-[35px] w-1.5 bg-gray-200 z-0 rounded-full overflow-hidden">
            <div
              className="w-full bg-green-500 transition-all duration-500 ease-in-out"
              style={{
                height:
                  regStatus === "Approved" && assignedTrack && publishProblemStatements
                    ? "75%"
                    : regStatus === "Approved"
                      ? "50%"
                      : submitted && !isReopened
                        ? "25%"
                        : "0%",
              }}
            ></div>
          </div>

          {/* Step 1: Round 1 */}
          <div className="flex flex-row md:flex-col items-center md:items-center flex-1 md:text-center z-10 px-2 relative group w-full md:w-auto gap-4 md:gap-0">
            <div className="w-14 h-14 shrink-0 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-lg md:mb-3 shadow-[0_0_15px_rgba(34,197,94,0.4)] ring-4 ring-white transition-all">
              1
            </div>
            <div className="flex flex-col text-left md:text-center flex-1">
              <p className="text-sm font-extrabold text-gray-900">Round 1</p>
              <p className="text-xs text-green-600 font-bold md:mt-1">Shortlisted</p>
            </div>
          </div>

          {/* Step 2: Registration */}
          <div className="flex flex-row md:flex-col items-center md:items-center flex-1 md:text-center z-10 px-2 relative group w-full md:w-auto gap-4 md:gap-0">
            <div
              className={`w-14 h-14 shrink-0 rounded-full flex items-center justify-center font-bold text-lg md:mb-3 ring-4 ring-white transition-all ${
                submitted && !isReopened
                  ? "bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.4)]"
                  : "bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.6)] md:scale-110"
              }`}
            >
              2
            </div>
            <div className="flex flex-col text-left md:text-center flex-1">
              <p className="text-sm font-extrabold text-gray-900">Registration</p>
              <p
                className={`text-xs font-bold md:mt-1 ${submitted && !isReopened ? "text-green-600" : "text-purple-600"}`}
              >
                {submitted && !isReopened
                  ? "Completed"
                  : isReopened
                    ? "Correction Required"
                    : "Action Required"}
              </p>
            </div>
          </div>

          {/* Step 3: Verification */}
          <div className="flex flex-row md:flex-col items-center md:items-center flex-1 md:text-center z-10 px-2 relative group w-full md:w-auto gap-4 md:gap-0">
            <div
              className={`w-14 h-14 shrink-0 rounded-full flex items-center justify-center font-bold text-lg md:mb-3 ring-4 ring-white transition-all ${
                regStatus === "Approved"
                  ? "bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.4)]"
                  : submitted && !isReopened && regStatus === "Contact"
                    ? "bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.6)] md:scale-110"
                    : submitted && !isReopened
                      ? "bg-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.6)] md:scale-110"
                      : "bg-gray-100 text-gray-400 border-2 border-gray-200"
              }`}
            >
              3
            </div>
            <div className="flex flex-col text-left md:text-center flex-1">
              <p className="text-sm font-extrabold text-gray-900">Verification</p>
              <p
                className={`text-xs font-bold md:mt-1 ${
                  regStatus === "Approved"
                    ? "text-green-600"
                    : submitted && !isReopened && regStatus === "Contact"
                      ? "text-red-600"
                      : submitted && !isReopened
                        ? "text-amber-600"
                        : "text-gray-400"
                }`}
              >
                {regStatus === "Approved"
                  ? "Verified"
                  : submitted && !isReopened && regStatus === "Contact"
                    ? "Contact Admin"
                    : submitted && !isReopened
                      ? "Pending Review"
                      : "Awaiting Details"}
              </p>
            </div>
          </div>

          {/* Step 4: Problem Statement */}
          <div className="flex flex-row md:flex-col items-center md:items-center flex-1 md:text-center z-10 px-2 relative group w-full md:w-auto gap-4 md:gap-0">
            <div
              className={`w-14 h-14 shrink-0 rounded-full flex items-center justify-center font-bold text-lg md:mb-3 ring-4 ring-white transition-all ${
                regStatus === "Approved" && assignedTrack && publishProblemStatements
                  ? assignedProblemStatement 
                    ? "bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.4)]"
                    : "bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.6)] md:scale-110"
                  : "bg-gray-100 text-gray-400 border-2 border-gray-200"
              }`}
            >
              4
            </div>
            <div className="flex flex-col text-left md:text-center flex-1">
              <p className="text-sm font-extrabold text-gray-900">
                Problem Statement
              </p>
              <p
                className={`text-xs font-bold md:mt-1 ${
                  regStatus === "Approved" && assignedTrack && publishProblemStatements 
                    ? assignedProblemStatement ? "text-green-600" : "text-purple-600" 
                    : "text-gray-400"
                }`}
              >
                {regStatus === "Approved" && assignedTrack && publishProblemStatements
                  ? assignedProblemStatement
                    ? "Locked In"
                    : "Released"
                  : "Awaiting Release"}
              </p>
            </div>
          </div>

          {/* Step 5: Round 2 */}
          <div className="flex flex-row md:flex-col items-center md:items-center flex-1 md:text-center z-10 px-2 relative group w-full md:w-auto gap-4 md:gap-0">
            <div className="w-14 h-14 shrink-0 rounded-full flex items-center justify-center font-bold text-lg md:mb-3 ring-4 ring-white transition-all bg-gray-100 text-gray-400 border-2 border-gray-200">
              5
            </div>
            <div className="flex flex-col text-left md:text-center flex-1">
              <p className="text-sm font-extrabold text-gray-900">Round 2</p>
              <p className="text-xs text-gray-500 font-bold md:mt-1">
                Hackathon (Aug 21)
              </p>
            </div>
          </div>
        </div>
      </div>

      {submitted && !isReopened ? (
        regStatus === "Approved" && assignedTrack && publishProblemStatements ? (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-purple-200">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Congratulations, you have been assigned {assignedTrack} - {tracks.find(t => t.id === assignedTrack || t._id === assignedTrack)?.title || assignedTrack}.
            </h2>
            
            {assignedProblemStatement ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Upload size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Problem Statement Selected!</h3>
                <p className="text-gray-600 mb-4">You have successfully locked in your problem statement.</p>
                <div className="inline-block bg-white border border-gray-200 rounded-lg p-4 text-left shadow-sm max-w-2xl w-full">
                  <div className="flex gap-4 items-center">
                    <div className="text-3xl font-black text-green-600 opacity-50">{assignedProblemStatement}</div>
                    <div className="text-gray-800 font-semibold text-lg">{availableProblemStatements.find(p => p.id === assignedProblemStatement)?.text || "Your problem statement"}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                {sponsorDescription && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6 text-purple-800 font-medium whitespace-pre-wrap">
                    {sponsorDescription}
                  </div>
                )}
                <p className="text-gray-600 mb-6 text-lg">Choose one of the following problem statements:</p>
                <div className="space-y-4">
                  {availableProblemStatements.length > 0 ? availableProblemStatements.map((ps) => (
                    <div 
                      key={ps.id}
                      onClick={() => setSelectedPS(ps.id)}
                      className={`cursor-pointer border-2 rounded-xl p-5 flex gap-5 items-center transition-all ${selectedPS === ps.id ? 'border-purple-600 bg-purple-50 shadow-md transform scale-[1.02]' : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'}`}
                    >
                      <div className={`text-4xl font-black ${selectedPS === ps.id ? 'text-purple-600' : 'text-gray-300'}`}>
                        {ps.id}
                      </div>
                      <div className="flex-1 text-gray-800 font-medium text-lg leading-snug">
                        {ps.text}
                      </div>
                      <div className="text-sm font-bold text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200">
                        {ps.left} left
                      </div>
                    </div>
                  )) : (
                    <p className="text-red-500 font-bold p-4 bg-red-50 rounded-lg text-center border border-red-200">No problem statements are currently available. They may be fully booked.</p>
                  )}
                </div>
                
                <div className="mt-8 flex justify-end">
                  <button
                    onClick={submitProblemStatement}
                    disabled={!selectedPS || submittingPS}
                    className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {submittingPS ? "Locking in..." : "Confirm Selection"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white p-10 rounded-2xl shadow-sm border border-green-200 text-center">
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${regStatus === "Approved" ? "bg-green-100 text-green-600" : regStatus === "Contact" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"}`}
            >
              <Upload size={40} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {regStatus === "Approved" && assignedTrack
                ? "Track Assigned. Awaiting Problem Statements!"
                : regStatus === "Approved"
                  ? "Registration Verified!"
                  : regStatus === "Contact"
                    ? "Action Required"
                    : "Registration Verification Pending"}
            </h2>
            <p className="text-gray-600">
              {regStatus === "Approved" && assignedTrack
                ? "Your final track has been allotted. Problem statements will be released soon. Keep checking back!"
                : regStatus === "Approved"
                  ? "Your registration has been approved. The Admin is currently reviewing your preferences to allot your final track and problem statement. Please check back soon."
                  : regStatus === "Contact"
                    ? "There is an issue with your registration. Please contact the organizers immediately."
                    : "Your Round 2 preferences and payment receipt have been received and are pending verification."}
            </p>
          </div>
        )
      ) : (
        <>
          {isReopened && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-center justify-between shadow-sm animate-pulse">
              <div>
                <h3 className="font-bold text-blue-800 text-lg">
                  Action Required: Update Registration
                </h3>
                <p className="text-sm text-blue-600 mt-1">
                  The admin has re-opened specific sections for you to correct.
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-blue-500 uppercase tracking-widest">
                  Time Remaining
                </p>
                <p className="text-2xl font-black text-blue-700 font-mono">
                  {timeLeft}
                </p>
              </div>
            </div>
          )}

          {(!submitted || isReopened) && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-6">
              <h1 className="text-2xl font-black text-gray-900">
                Registration: {event.name || event.title}
              </h1>
              <div className="flex items-center gap-2 mt-2 text-gray-600">
                <Calendar size={18} />
                <span>
                  {new Date(event.startDate || event.date).toLocaleDateString()}
                </span>
              </div>
              <p className="mt-4 text-gray-700 leading-relaxed">
                {event.description ||
                  "Register for the second round of IKIGAI Hackathon."}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {(!submitted || isReopened) && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">
                  1. Choose Track Preference
                </h2>

                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-4 text-sm font-semibold flex flex-col gap-1">
                  <span>
                    ⚠️ Please do the sequencing properly before submitting the
                    registration form.
                  </span>
                  <span className="text-yellow-700">
                    👉 Use drag and drop for the sequencing (click anywhere on
                    the card to drag).
                  </span>
                </div>

                {tracks.length > 0 ? (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={tracks.map((t) => t.id || t._id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {tracks.map((track, index) => (
                        <SortableTrackItem
                          key={track.id || track._id}
                          id={track.id || track._id}
                          track={{
                            name: track.title || track.name,
                            location: track.description,
                          }}
                          index={index}
                          disabled={isSequenceSaved}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                ) : (
                  <p className="text-gray-400 italic">No tracks available.</p>
                )}

                {(!submitted || isReopened) && (
                  <div className="mt-4">
                    <div className="mb-4 text-red-600 font-semibold text-sm">
                      <p className="mb-2">
                        Note: Selecting a preferred domain during registration
                        does not guarantee its allocation. Domain allotment will
                        be based on first-come, first-registration and
                        successful Round 1 solution submission, subject to
                        availability.
                      </p>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4"
                          checked={trackPrefChecked}
                          onChange={(e) =>
                            setTrackPrefChecked(e.target.checked)
                          }
                        />
                        <span>Okay, I understand</span>
                      </label>
                    </div>
                    {isSequenceSaved ? (
                      <button
                        onClick={() => {
                          setIsSequenceSaved(false);
                          setSequenceMessage("");
                        }}
                        className="w-full py-3 bg-blue-50 text-blue-700 font-bold rounded-lg border border-blue-200 hover:bg-blue-100 transition mt-2"
                      >
                        Edit Sequence
                      </button>
                    ) : (
                      <button
                        onClick={handleSaveSequence}
                        disabled={savingSequence || !trackPrefChecked}
                        className="w-full py-3 bg-green-50 text-green-700 font-bold rounded-lg border border-green-200 hover:bg-green-100 transition disabled:opacity-50"
                      >
                        {savingSequence ? "Saving..." : "Save Sequence"}
                      </button>
                    )}
                    {sequenceMessage && (
                      <p className="text-center text-green-600 font-bold mt-2 text-sm animate-pulse">
                        {sequenceMessage}
                      </p>
                    )}
                  </div>
                )}

                {(!submitted || isReopened) && (
                  <div className="mt-8 pt-6 border-t border-gray-100">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b">
                      2. T-Shirt Sizes
                    </h2>
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-4">
                      <p className="text-sm text-gray-700 mb-4">
                        Please select the T-Shirt sizes for each team member.
                        This information is required for the hackathon goodies.
                      </p>

                      {teamInfo?.members?.map((member, idx) => (
                        <div
                          key={idx}
                          className="flex flex-col md:flex-row md:items-center justify-between mb-4 pb-3 border-b border-gray-200 last:border-0 last:mb-0 last:pb-0"
                        >
                          <div className="mb-2 md:mb-0">
                            <p className="font-semibold text-gray-800">
                              {member.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {member.email}
                            </p>
                          </div>
                          <select
                            className="px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500 bg-white min-w-[120px]"
                            value={tshirtSizes[member.email] || ""}
                            onChange={(e) => {
                              setTshirtSizes((prev) => ({
                                ...prev,
                                [member.email]: e.target.value,
                              }));
                              setTshirtsSaved(false);
                            }}
                          >
                            <option value="" disabled>
                              Select Size
                            </option>
                            <option value="S">Small (S)</option>
                            <option value="M">Medium (M)</option>
                            <option value="L">Large (L)</option>
                            <option value="XL">Extra Large (XL)</option>
                            <option value="XXL">Double XL (XXL)</option>
                          </select>
                        </div>
                      ))}

                      <div className="mt-4 flex items-center justify-between">
                        <button
                          onClick={async () => {
                            setSavingTshirts(true);
                            try {
                              const res = await fetch(
                                `${API_BASE}/api/round2/save-tshirts`,
                                {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({
                                    participantId: teamInfo.participantId,
                                    leaderEmail:
                                      sessionStorage.getItem("care_email"),
                                    tshirtSizes,
                                  }),
                                },
                              );
                              const data = await res.json();
                              if (data.success) {
                                setTshirtsSaved(true);
                              } else {
                                alert(
                                  data.message ||
                                    "Failed to save T-shirt sizes.",
                                );
                              }
                            } catch (err) {
                              alert("Error saving T-shirt sizes");
                            }
                            setSavingTshirts(false);
                          }}
                          disabled={
                            savingTshirts ||
                            teamInfo?.members?.some(
                              (m) => !tshirtSizes[m.email],
                            )
                          }
                          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
                        >
                          {savingTshirts ? "Saving..." : "Save T-Shirt Sizes"}
                        </button>
                        {tshirtsSaved && (
                          <span className="text-green-600 font-bold text-sm">
                            ✓ Saved
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {(!submitted || isReopened) && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col h-full">
                <h2 className="text-lg font-bold text-gray-800 mb-6 border-b pb-2">
                  3. Fees Payment
                </h2>

                <div className="flex flex-col items-center justify-center flex-1">
                  <div className="text-center mb-4">
                    <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest mt-1">
                      Ikigai 2026 Event Registration
                    </h3>
                  </div>

                  <div className="flex flex-col items-center justify-center mb-5">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-extrabold text-gray-900 text-lg">
                        Scan
                      </span>
                      <QrCode size={20} className="text-blue-500" />
                      <span className="font-extrabold text-gray-900 text-lg">
                        & pay
                      </span>
                    </div>
                    <p className="text-[10px] font-bold text-gray-500 tracking-wide">
                      VIA UPI / RUPAY / VISA / PAYTM
                    </p>
                  </div>

                  <div className="w-56 h-56 mx-auto bg-white rounded-lg border-2 border-dashed border-gray-200 p-2 flex items-center justify-center shadow-sm mb-8">
                    <QRCode
                      value="https://pay.jodo.in/pages/eXYpWC8NcCEZm6ZA"
                      size={180}
                    />
                  </div>

                  <div className="w-full mb-8">
                    <h4 className="font-bold text-gray-800 text-sm mb-3">
                      Payment Instructions:
                    </h4>
                    <ol className="space-y-3 text-xs text-gray-600 list-decimal pl-5 marker:font-bold marker:text-gray-400">
                      <li className="pl-1 leading-relaxed">
                        Finalize your Problem Domain (Track) preferences before
                        proceeding to payment. Changes may not be allowed after
                        registration is submitted.
                      </li>
                      <li className="pl-1 leading-relaxed">
                        On the Jodo payment page, enter the Team Leader's email
                        address. The payment receipt will be sent to this email.
                      </li>
                      <li className="pl-1 leading-relaxed">
                        From the Event dropdown, select{" "}
                        <strong className="font-bold text-gray-900">
                          "IKIGAI"
                        </strong>
                        .
                      </li>
                      <li className="pl-1 leading-relaxed">
                        Enter the registration amount as{" "}
                        <strong className="font-bold text-green-700 text-sm">
                          ₹501
                        </strong>{" "}
                        <span className="text-red-500 ml-1 font-medium">
                          (Do NOT change this amount)
                        </span>
                        .
                      </li>
                      <li className="pl-1 leading-relaxed">
                        After successful payment, download the payment receipt
                        immediately or retrieve it later from the Team Leader's
                        registered email. You will be required to upload this
                        receipt in the registration portal.
                      </li>
                    </ol>
                  </div>

                  <div className="w-full space-y-5 pt-6 border-t border-gray-100">
                    {(!submitted || isReopened) && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                          Transaction ID
                        </label>
                        <input
                          type="text"
                          className="w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-green-500 bg-gray-50/50"
                          placeholder="e.g. UTR1234567890"
                          value={transactionId}
                          onChange={(e) => setTransactionId(e.target.value)}
                        />
                      </div>
                    )}
                    {(!submitted || isReopened) && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                          Upload Receipt
                        </label>
                        <label className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100 transition">
                          <Upload size={18} className="text-gray-500" />
                          <span className="text-sm text-gray-600 truncate max-w-[200px]">
                            {receiptFile ? receiptFile.name : "Choose File"}
                          </span>
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => setReceiptFile(e.target.files[0])}
                            accept="image/*,.pdf"
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {(!submitted || isReopened) && (
                  <div className="mt-4">
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-gray-700">
                      <input
                        type="checkbox"
                        className="w-4 h-4"
                        checked={paymentChecked}
                        onChange={(e) => setPaymentChecked(e.target.checked)}
                      />
                      <span>
                        I have read and followed the payment instructions.
                      </span>
                    </label>
                  </div>
                )}

                {(!submitted || isReopened) && (
                  <div className="mt-8 pt-6 border-t border-gray-100">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b">
                      4. Consent and Rules & Regulations
                    </h2>

                    <div className="mb-6">
                      <p className="text-sm text-gray-700 mb-3">
                        Please download the consent letter, which has to be
                        filled physically and brought on the grand finale date.
                        The letter must be printed on the institute / department's letter head.
                      </p>
                      <a
                        href="https://res.cloudinary.com/dixdw1mus/image/upload/fl_attachment/v1785948573/ConsentLetter_zsnami.pdf"
                        download="ConsentLetter_IKIGAI.pdf"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setConsentDownloaded(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 font-semibold rounded-lg border border-blue-200 hover:bg-blue-100 transition"
                      >
                        Download Consent Letter
                      </a>
                      {consentDownloaded && (
                        <span className="ml-3 text-sm text-green-600 font-bold">
                          ✓ Downloaded
                        </span>
                      )}
                    </div>

                    <div className="mb-4">
                      <h3 className="font-bold text-gray-800 text-sm mb-2">
                        Rules and Regulations
                      </h3>
                      <div
                        className="h-48 overflow-y-auto bg-gray-50 border border-gray-200 p-4 rounded-lg text-xs text-gray-700 mb-3"
                        onScroll={(e) => {
                          const bottom =
                            e.target.scrollHeight - e.target.scrollTop <=
                            e.target.clientHeight + 5;
                          if (bottom) setRulesScrolled(true);
                        }}
                      >
                        <p className="font-bold mb-2">
                          36-Hour Hackathon – Team Participation Rules
                        </p>
                        <p className="font-bold mt-2">1. Eligibility</p>
                        <ul className="list-disc pl-4 mb-2">
                          <li>
                            Only teams shortlisted from the preliminary round
                            are eligible for pre-final round.
                          </li>
                          <li>
                            All Team must complete registration before the
                            deadline.
                          </li>
                          <li>
                            All team members should be present physically to
                            venue for Pre-final round.
                          </li>
                          <li>
                            Each participant should be member of only one team.
                          </li>
                        </ul>
                        <p className="font-bold mt-2">2. Team Size</p>
                        <ul className="list-disc pl-4 mb-2">
                          <li>Each team must consist of 2–4 members.</li>
                          <li>
                            Team composition cannot be changed after
                            registration closes unless approved by the
                            organizers.
                          </li>
                          <li>
                            Bring a hard copy of the Team Leader’s bank account
                            details (with College ID, cancelled cheque).
                          </li>
                          <li>
                            Govt. Id (such as Aadhar Card / PAN card/ Driving
                            License etc.) of all members is required.
                          </li>
                        </ul>
                        <p className="font-bold mt-2">
                          3. Travel and Registration
                        </p>
                        <ul className="list-disc pl-4 mb-2">
                          <li>
                            Travel arrangements (to and fro) must be made by
                            participants. Any kind of travelling allowance will
                            not be provided by host institute.
                          </li>
                          <li>
                            Registration fees are non-refundable under any
                            circumstances.
                          </li>
                          <li>
                            Registration Fee includes registration kit to team,
                            Free meals will be provided: Day 1: Early Dinner,
                            Day 2: Breakfast, Lunch, Dinner, Day 3:
                            Breakfast/Lunch.
                          </li>
                          <li>Free Accommodation 21 and 22 August.</li>
                        </ul>
                        <p className="font-bold mt-2">
                          4. Accommodation & Facilities
                        </p>
                        <ul className="list-disc pl-4 mb-2">
                          <li>
                            Free common hall accommodation will be provided from
                            Day 1 evening (5:00 PM) until the formal conclusion
                            of Day 3, with separate arrangements for boys and
                            girls.
                          </li>
                          <li>
                            Participants are advised to carry light luggage and
                            bring seasonal essentials.
                          </li>
                          <li>
                            Locker facility is available—bring your own lock.
                          </li>
                          <li>
                            (Optional) Paid food stalls may also be available
                            for 24*7.
                          </li>
                          <li>
                            First aid facilities will be available on-site.
                          </li>
                        </ul>
                        <p className="font-bold mt-2">5. Attendance</p>
                        <ul className="list-disc pl-4 mb-2">
                          <li>
                            All team members must be present during registration
                            process, check-in, check-out, mentoring and judgment
                            session till completion of event.
                          </li>
                          <li>
                            At least one team member must be present at allotted
                            desk for during the hackathon.
                          </li>
                          <li>
                            Teams are expected to participate throughout the
                            full 36-hour duration.
                          </li>
                        </ul>
                        <p className="font-bold mt-2">6. Code of Conduct</p>
                        <ul className="list-disc pl-4 mb-2">
                          <li>
                            Treat all participants, mentors, judges, volunteers,
                            and organizers with respect.
                          </li>
                          <li>
                            Unauthorized exit from the venue will lead to
                            immediate disqualification.
                          </li>
                          <li>
                            Harassment, discrimination, or disruptive behavior
                            will not be tolerated.
                          </li>
                        </ul>
                        <p className="font-bold mt-2">7. Project Development</p>
                        <ul className="list-disc pl-4 mb-2">
                          <li>
                            Projects must be developed primarily during the
                            hackathon.
                          </li>
                          <li>
                            Existing open-source libraries, frameworks, and APIs
                            may be used with proper attribution.
                          </li>
                          <li>
                            Pre-built templates or boilerplate code are allowed
                            only if disclosed.
                          </li>
                          <li>
                            Students need to bring necessary hardware required
                            for the hackathon.
                          </li>
                          <li>
                            No hardware / laptops/ desktops shall be issued from
                            host institute in any case.
                          </li>
                        </ul>
                        <p className="font-bold mt-2">8. Resource Usage</p>
                        <ul className="list-disc pl-4 mb-2">
                          <li>
                            Participants may use their own laptops chargers,
                            extension cords, converters, and approved hardware.
                          </li>
                          <li>
                            Any specialized hardware must comply with event
                            guidelines.
                          </li>
                          <li>Any coding environment is allowed.</li>
                          <li>
                            Wi-Fi will be provided, but participants are advised
                            to keep offline backups.
                          </li>
                        </ul>
                        <p className="font-bold mt-2">9. Internet & AI Tools</p>
                        <ul className="list-disc pl-4 mb-2">
                          <li>Internet access is permitted at the venue.</li>
                          <li>
                            AI tools may be used unless otherwise restricted.
                            Teams should disclose significant AI-generated
                            content if required.
                          </li>
                        </ul>
                        <p className="font-bold mt-2">
                          10. Submission Requirements
                        </p>
                        <ul className="list-disc pl-4 mb-2">
                          <li>
                            Submit the project before the stated deadline.
                          </li>
                          <li>
                            Required deliverables may include: GitHub
                            repository, Presentation, Demo video, Project
                            description.
                          </li>
                        </ul>
                        <p className="font-bold mt-2">11. Originality</p>
                        <ul className="list-disc pl-4 mb-2">
                          <li>Submissions must be original work.</li>
                          <li>
                            Previously completed projects are not eligible
                            unless significant new features are built.
                          </li>
                        </ul>
                        <p className="font-bold mt-2">12. Fair Play</p>
                        <ul className="list-disc pl-4 mb-2">
                          <li>
                            Cheating, plagiarism, or violating rules may result
                            in immediate disqualification.
                          </li>
                        </ul>
                        <p className="font-bold mt-2">13. Safety & Venue</p>
                        <ul className="list-disc pl-4 mb-2">
                          <li>
                            Participants must follow venue safety guidelines.
                          </li>
                          <li>
                            Keep workspaces clean and respect event facilities.
                          </li>
                        </ul>
                        <p className="font-bold mt-2">
                          14. Organizer Decisions
                        </p>
                        <ul className="list-disc pl-4 mb-2">
                          <li>
                            The organizers reserve the right to modify schedules
                            or rules if necessary.
                          </li>
                          <li>
                            All decisions made by the organizers and judges are
                            final.
                          </li>
                        </ul>
                      </div>

                      <label
                        className={`flex items-center gap-2 text-sm font-semibold ${rulesScrolled ? "text-gray-700 cursor-pointer" : "text-gray-400 cursor-not-allowed"}`}
                      >
                        <input
                          type="checkbox"
                          className="w-4 h-4"
                          checked={rulesChecked}
                          onChange={(e) => setRulesChecked(e.target.checked)}
                          disabled={!rulesScrolled}
                        />
                        <span>
                          I have gone through the rules and regulations. (Read
                          complete rules and regulations to unlock)
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                <div className="mt-8 pt-4 border-t border-gray-100">
                  <button
                    onClick={handleSubmit}
                    disabled={
                      submitting ||
                      (!isReopened &&
                        (!trackPrefChecked ||
                          !paymentChecked ||
                          !rulesChecked ||
                          !consentDownloaded ||
                          !tshirtsSaved))
                    }
                    className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow transition disabled:opacity-50"
                  >
                    {submitting
                      ? "Submitting..."
                      : isReopened
                        ? "Submit Correction"
                        : "Submit Registration"}
                  </button>
                </div>
              </div>
            )}
            
          </div>
        </>
      )}

    </div>
  );
}
