import React, { useState, useEffect } from "react";
import { Routes, Route, useNavigate, Navigate, useLocation, Link } from "react-router-dom";
import { QrCode, ClipboardList, LogOut, CheckCircle, Clock, AlertTriangle, ChevronRight, X, User, Circle, Search, ArrowDownUp, Calendar, Users, Award, ListChecks, Package, FileText, Check, Camera, Image as ImageIcon, StopCircle, Upload } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import jsQR from "jsqr";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

function VolunteerScanner({ onScanSuccess }) {
  const [isScanning, setIsScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [cameraLoading, setCameraLoading] = useState(false);
  const html5QrCodeRef = React.useRef(null);
  const fileInputRef = React.useRef(null);

  useEffect(() => {
    html5QrCodeRef.current = new Html5Qrcode("reader");
    
    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.getState() === 2) {
        html5QrCodeRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      setErrorMsg("");
      setCameraLoading(true);
      await html5QrCodeRef.current.start(
        { facingMode: "environment" },
        { fps: 10 },
        (decodedText) => {
          html5QrCodeRef.current.stop();
          setIsScanning(false);
          onScanSuccess(decodedText);
        },
        () => {
          // Ignore background scanning errors
        }
      );
      setIsScanning(true);
      setCameraLoading(false);
    } catch (err) {
      setCameraLoading(false);
      setErrorMsg("Failed to start camera. Please check browser permissions.");
      console.error(err);
    }
  };

  const stopCamera = async () => {
    try {
      if (html5QrCodeRef.current && html5QrCodeRef.current.getState() === 2) {
        await html5QrCodeRef.current.stop();
        setIsScanning(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setErrorMsg("");
    
    if (html5QrCodeRef.current && html5QrCodeRef.current.getState() === 2) {
      stopCamera().catch(console.error);
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        
        // Scale down huge images to prevent freezing, especially on older mobile devices
        const MAX_DIM = 1000;
        let width = img.width;
        let height = img.height;
        if (width > MAX_DIM || height > MAX_DIM) {
          const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        try {
          const imageData = ctx.getImageData(0, 0, width, height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });
          
          if (code && code.data) {
            onScanSuccess(code.data);
          } else {
            // Fallback to Html5Qrcode if jsQR fails
            html5QrCodeRef.current.scanFileV2(file, false)
              .then(decodedText => onScanSuccess(decodedText.decodedText || decodedText))
              .catch(err => {
                setErrorMsg("Could not detect a valid QR code in that image. Try a clearer image or use the camera.");
                console.error("Both jsQR and html5-qrcode failed", err);
              });
          }
        } catch (err) {
          setErrorMsg("Error processing image.");
          console.error(err);
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = ""; // reset input
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 h-full md:p-8">
      <div className="bg-white rounded-3xl p-6 shadow-xl border border-indigo-100 w-full max-w-sm md:max-w-md mb-6 transition-all hover:shadow-2xl">
        <h2 className="text-xl font-black text-center text-indigo-900 mb-4 flex items-center justify-center gap-2">
          <QrCode className="text-indigo-600" /> Entry Verification
        </h2>
        
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm font-medium rounded-xl border border-red-100 flex items-start gap-2">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <p>{errorMsg}</p>
          </div>
        )}

        {/* Video feed container */}
        <div 
          id="reader" 
          className={`w-full overflow-hidden rounded-2xl border-2 ${isScanning ? 'border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.3)]' : 'border-indigo-100 bg-slate-50'} transition-all duration-300 ${isScanning ? 'min-h-[250px]' : 'min-h-0'}`}
        ></div>

        <div className="mt-6 flex flex-col gap-3">
          {!isScanning ? (
            <button
              onClick={startCamera}
              disabled={cameraLoading}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all active:scale-[0.98] disabled:opacity-70"
            >
              {cameraLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Camera size={20} />
              )}
              {cameraLoading ? "Starting Camera..." : "Scan with Camera"}
            </button>
          ) : (
            <button
              onClick={stopCamera}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl transition-all active:scale-[0.98] border border-red-200"
            >
              <StopCircle size={20} />
              Stop Camera
            </button>
          )}

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="shrink-0 px-4 text-slate-400 text-sm font-semibold uppercase">Or</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white hover:bg-slate-50 text-indigo-700 font-bold rounded-xl transition-all active:scale-[0.98] border border-indigo-200 shadow-sm"
          >
            <ImageIcon size={20} className="text-indigo-500" />
            Upload Image File
          </button>
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
        </div>
        
        <p className="text-center text-xs font-medium text-slate-400 mt-6 px-4">
          Point your camera directly at the QR code, or upload a clear screenshot of the pass.
        </p>
      </div>
    </div>
  );
}

// --- VERIFICATION COMPONENT ---
function VolunteerVerification({ qrToken, onBack, onComplete, buttonText = "Scan Next Team" }) {
  const [teamData, setTeamData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [memberVerifications, setMemberVerifications] = useState({});

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/volunteer/scan`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: qrToken }) // Fixed: send 'token'
        });
        const data = await res.json();

        if (data.success) {
          setTeamData(data); // Fixed: set data directly, not data.data
          // Initialize member verification states
          const initialVerifications = {};
          if (data.verification && data.verification.memberVerifications) {
            data.verification.memberVerifications.forEach(mv => {
              initialVerifications[mv.memberEmail] = {
                identityVerified: mv.identityVerified || false,
                governmentIdVerified: mv.governmentIdVerified || false,
                consentVerified: mv.consentVerified || false,
                isPresent: mv.isPresent !== undefined ? mv.isPresent : true,
              };
            });
          }
          setMemberVerifications(initialVerifications);
        } else {
          setError(data.message || "Invalid QR Code or Team not found.");
        }
      } catch (err) {
        setError("Error connecting to server. Please try again.");
      }
      setLoading(false);
    };

    fetchTeam();
  }, [qrToken]);

  const [isEditing, setIsEditing] = useState(false);
  const handleSaveChanges = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/volunteer/bulk-update-members`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verificationId: teamData.verification._id,
          volunteerEmail: sessionStorage.getItem("care_email"),
          volunteerName: sessionStorage.getItem("care_name"),
          members: memberVerifications
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsEditing(false);
        alert("Changes saved successfully!");
      } else {
        alert("Failed to save changes.");
      }
    } catch (err) {
      alert("Error saving changes.");
    }
    setSubmitting(false);
  };

  const handleToggleMember = async (email, field, checked) => {
    let previousState;
    setMemberVerifications(prev => {
      previousState = prev[email];
      const updatedMember = { ...prev[email], [field]: checked };
      if (field === 'isPresent' && !checked) {
        updatedMember.identityVerified = false;
        updatedMember.governmentIdVerified = false;
        updatedMember.consentVerified = false;
      }
      return { ...prev, [email]: updatedMember };
    });

    // Only call individual API if we are checking in for the first time
    if (!isCheckedIn) {
      try {
        await fetch(`${API_BASE}/api/volunteer/verify-member`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            verificationId: teamData.verification._id,
            memberEmail: email,
            field,
            value: checked
          })
        });
      } catch (err) {
        setMemberVerifications(prev => ({ ...prev, [email]: previousState }));
        alert("Failed to save verification status");
      }
    }
  };

  const handleApproveTeam = async () => {
    const membersList = Object.values(memberVerifications);

    let presentCount = 0;
    for (const mv of membersList) {
      if (mv.isPresent) {
        presentCount++;
      }
    }

    if (presentCount === 0) {
      alert("At least one member must be marked Present to approve entry.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/volunteer/approve-team`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verificationId: teamData.verification._id,
          volunteerEmail: sessionStorage.getItem("care_email"),
          volunteerName: sessionStorage.getItem("care_name")
        })
      });
      const data = await res.json();

      if (data.success) {
        alert("Team successfully CHECKED IN!");
        onComplete();
      } else {
        alert(data.message || "Failed to approve team");
      }
    } catch (err) {
      alert("Error approving team");
    }
    setSubmitting(false);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-12 h-full">
      <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
      <p className="text-indigo-600 font-medium animate-pulse">Fetching Team Details...</p>
    </div>
  );

  if (error) return (
    <div className="p-6 h-full flex flex-col items-center justify-center">
      <div className="bg-red-50 text-red-700 p-6 rounded-2xl shadow-sm border border-red-200 text-center max-w-sm w-full">
        <AlertTriangle className="mx-auto w-12 h-12 mb-3 text-red-500" />
        <h3 className="text-lg font-bold mb-2">Scan Failed</h3>
        <p className="text-sm mb-6">{error}</p>
        <button onClick={onBack} className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition">
          Scan Again
        </button>
      </div>
    </div>
  );

  const { team, verification } = teamData;
  const isCheckedIn = verification.status === "CHECKED_IN";

  const membersList = Object.values(memberVerifications);
  let presentCount = 0;
  for (const mv of membersList) {
    if (mv.isPresent) {
      presentCount++;
    }
  }
  const isReadyToApprove = presentCount > 0;

  return (
    <div className="p-4 md:p-8 max-w-md md:max-w-4xl mx-auto w-full pb-24 md:pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="p-2 bg-indigo-50 text-indigo-700 rounded-full hover:bg-indigo-100">
          <X size={20} />
        </button>
        <h2 className="text-lg font-black text-slate-800">Team Verification</h2>
        <div className="w-9"></div>
      </div>

      {/* Team Info Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
        <div className={`p-4 text-white font-bold text-lg flex items-center justify-between ${isCheckedIn ? 'bg-emerald-500' : 'bg-indigo-600'}`}>
          <div className="flex items-center gap-2">
            {isCheckedIn ? <CheckCircle size={20} /> : <User size={20} />}
            {team.teamName}
          </div>
          {isCheckedIn && <span className="bg-white/20 px-2 py-1 rounded text-xs">CHECKED IN</span>}
        </div>
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 font-medium">Team Leader</p>
              <p className="text-sm font-semibold text-slate-800 break-all">{team.leaderEmail}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Track</p>
              <p className="text-sm font-semibold text-slate-800 truncate">{team.assignedTrack || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Verification Checklist */}
        <div className="p-4">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <ClipboardList className="text-indigo-500" size={18} /> Physical Verification Checklist
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {verification.memberVerifications.map((member, idx) => {
              const mv = memberVerifications[member.memberEmail] || {};
              const isPresent = mv.isPresent;
              const memberFullyVerified = isPresent && mv.identityVerified && mv.governmentIdVerified && mv.consentVerified;

              return (
                <div key={idx} className={`rounded-2xl border-2 transition-all duration-300 overflow-hidden ${!isPresent ? 'border-red-500 bg-red-50 shadow-md' : memberFullyVerified ? 'border-emerald-500 bg-emerald-50 shadow-md' : 'border-slate-200 bg-white shadow-sm'}`}>
                  <div className="flex flex-col p-5">
                    {/* Header: Photo and Info */}
                    <div className="flex items-start gap-4 mb-4 pb-4 border-b border-slate-200/60">
                      <div className={`w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 shadow-inner border-2 ${!isPresent ? 'border-red-400 bg-red-200 opacity-80' : memberFullyVerified ? 'border-emerald-400' : 'border-slate-200 bg-slate-200'}`}>
                        {member.photoUrl ? (
                          <img src={member.photoUrl} alt={member.name} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-full h-full p-4 text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pt-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className={`font-black text-lg truncate ${!isPresent ? 'text-red-900 opacity-80' : memberFullyVerified ? 'text-emerald-900' : 'text-slate-900'}`}>{member.name}</p>
                            <p className="text-sm font-medium text-slate-500 truncate mb-1.5">{member.memberEmail}</p>
                            <span className={`inline-block px-2.5 py-0.5 font-bold text-[10px] rounded-md uppercase tracking-wider ${!isPresent ? 'bg-red-200 text-red-800' : memberFullyVerified ? 'bg-emerald-200 text-emerald-800' : 'bg-indigo-100 text-indigo-700'}`}>{member.role}</span>
                          </div>
                          {memberFullyVerified && <CheckCircle className="text-emerald-600 drop-shadow-sm" size={32} strokeWidth={2.5} />}
                        </div>
                      </div>
                    </div>

                    <div className="flex rounded-xl bg-slate-200/70 p-1.5 mb-5 shadow-inner">
                      <button
                        onClick={() => handleToggleMember(member.memberEmail, 'isPresent', true)}
                        disabled={submitting || (isCheckedIn && !isEditing)}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${isPresent ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-900/5' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Present
                      </button>
                      <button
                        onClick={() => handleToggleMember(member.memberEmail, 'isPresent', false)}
                        disabled={submitting || (isCheckedIn && !isEditing)}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${!isPresent ? 'bg-white text-red-600 shadow-sm ring-1 ring-slate-900/5' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Absent
                      </button>
                    </div>

                    {/* Interactive Checklist */}
                    {isPresent ? (
                      <div className="space-y-3">
                        {[
                          { field: 'identityVerified', label: "Identity Verified (Matches Photo)" },
                          { field: 'governmentIdVerified', label: "Government ID Physically Seen" },
                          { field: 'consentVerified', label: "Consent Letter Submitted" }
                        ].map(({ field, label }) => {
                          const checked = mv[field] || false;
                          return (
                            <div
                              key={field}
                              onClick={() => {
                                if (!submitting) {
                                  handleToggleMember(member.memberEmail, field, !checked);
                                }
                              }}
                              className={`flex items-center gap-3.5 p-3.5 rounded-xl cursor-pointer transition-all border-2 ${checked ? 'bg-emerald-100 border-emerald-500 shadow-sm' : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100'}`}
                            >
                              <div className={`transition-colors flex-shrink-0 ${checked ? 'text-emerald-600' : 'text-slate-400'}`}>
                                {checked ? <CheckCircle size={24} strokeWidth={2.5} className="fill-emerald-100" /> : <Circle size={24} strokeWidth={2} />}
                              </div>
                              <span className={`text-sm font-bold ${checked ? 'text-emerald-800' : 'text-slate-700'}`}>{label}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-6 text-center rounded-xl border-2 border-dashed border-red-300 bg-red-100/50">
                        <User className="w-10 h-10 mx-auto text-red-400 mb-2" />
                        <p className="text-sm font-bold text-red-600">Member marked as absent.</p>
                        <p className="text-xs font-medium text-red-500 mt-1">No verification required.</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Actions */}
      {!isCheckedIn && (
        <button
          onClick={handleApproveTeam}
          disabled={submitting || !isReadyToApprove}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black text-lg rounded-2xl shadow-lg transition flex justify-center items-center gap-2"
        >
          {submitting ? "Approving..." : "APPROVE ENTRY"} <ChevronRight size={20} />
        </button>
      )}

      {isCheckedIn && !isEditing && (
        <div className="flex flex-col gap-3">
          <button onClick={() => setIsEditing(true)} className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white font-black text-lg rounded-2xl shadow-lg transition">
            Edit Verification
          </button>
          <button onClick={onComplete} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg rounded-2xl shadow-lg transition">
            {buttonText}
          </button>
        </div>
      )}

      {isCheckedIn && isEditing && (
        <div className="flex flex-col gap-3">
          <button onClick={handleSaveChanges} disabled={submitting} className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg rounded-2xl shadow-lg transition">
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
          <button onClick={() => setIsEditing(false)} disabled={submitting} className="w-full py-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black text-lg rounded-2xl shadow-lg transition">
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

// --- HISTORY COMPONENT ---
function VolunteerHistory({ onSelectToken }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("newest"); // newest, oldest

  useEffect(() => {
    const fetchHistory = async () => {
      const email = sessionStorage.getItem("care_email");
      if (!email) {
        setError("Session expired. Please log in again.");
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/api/volunteer/history?email=${email}`);
        const data = await res.json();
        if (data.success) {
          setHistory(data.history);
        } else {
          setError(data.message || "Failed to fetch history.");
        }
      } catch (err) {
        setError("Error connecting to server.");
      }
      setLoading(false);
    };
    fetchHistory();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 h-full">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <p className="text-indigo-600 font-medium animate-pulse">Loading History...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 h-full flex flex-col items-center justify-center">
        <div className="bg-red-50 text-red-700 p-6 rounded-2xl shadow-sm border border-red-200 text-center max-w-sm w-full">
          <AlertTriangle className="mx-auto w-12 h-12 mb-3 text-red-500" />
          <h3 className="text-lg font-bold mb-2">Error</h3>
          <p className="text-sm mb-6">{error}</p>
        </div>
      </div>
    );
  }

  // Filter & Sort
  const filteredAndSorted = history
    .filter((item) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      const teamNameMatch = item.teamId?.teamName?.toLowerCase().includes(q);
      const trackMatch = item.teamId?.assignedTrack?.toLowerCase().includes(q);
      return teamNameMatch || trackMatch;
    })
    .sort((a, b) => {
      const dateA = new Date(a.checkedInAt).getTime();
      const dateB = new Date(b.checkedInAt).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

  return (
    <div className="p-4 md:p-8 max-w-md md:max-w-6xl mx-auto w-full pb-24 md:pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-black text-slate-800">Scan History</h2>
        <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold">
          {history.length} Teams
        </span>
      </div>

      {/* Search and Sort Controls */}
      <div className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search by Team or Track..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm text-sm"
          />
        </div>
        <button
          onClick={() => setSortOrder(prev => prev === "newest" ? "oldest" : "newest")}
          className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition shadow-sm flex items-center justify-center text-slate-600"
          title={`Sort: ${sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}`}
        >
          <ArrowDownUp size={18} />
        </button>
      </div>

      {/* List */}
      {filteredAndSorted.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50">
          <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No teams found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAndSorted.map((item) => {
            const date = new Date(item.checkedInAt);
            const formattedDate = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
            const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            // Count verified present members
            let verifiedCount = 0;
            let presentCount = 0;
            let absentCount = 0;
            if (item.memberVerifications) {
              item.memberVerifications.forEach(mv => {
                if (mv.isPresent) {
                  presentCount++;
                  if (mv.identityVerified && mv.governmentIdVerified && mv.consentVerified) {
                    verifiedCount++;
                  }
                } else {
                  absentCount++;
                }
              });
            }

            return (
              <div
                key={item._id}
                onClick={() => onSelectToken(item.qrToken)}
                className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 cursor-pointer hover:border-emerald-300 hover:shadow-md transition-all group"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg group-hover:text-indigo-600 transition-colors">
                      {item.teamId?.teamName || "Unknown Team"}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md">
                        {item.teamId?.assignedTrack || "No Track"}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <div className="flex items-center gap-1 text-xs font-medium text-slate-500 mb-1">
                      <Calendar size={12} />
                      {formattedDate}
                    </div>
                    <div className="flex items-center gap-1 text-xs font-medium text-slate-500">
                      <Clock size={12} />
                      {formattedTime}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Users size={16} className="text-slate-400" />
                    <span className="font-medium">{verifiedCount}/{presentCount} Verified</span>
                    {absentCount > 0 && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span className="font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-md text-xs">{absentCount} Absent</span>
                      </>
                    )}
                  </div>
                  <div className="text-indigo-600 flex items-center gap-1 text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity translate-x-[-10px] group-hover:translate-x-0 duration-300">
                    Details <ChevronRight size={16} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- ATTENDANCE COMPONENT ---
function VolunteerAttendance() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTeam, setExpandedTeam] = useState(null);
  const [editingTeam, setEditingTeam] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchTeams(); }, []);

  const fetchTeams = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/volunteer/all-checked-in-teams`);
      const data = await res.json();
      if (data.success) { setTeams(data.teams); } else { setError("Failed to fetch teams."); }
    } catch (err) { setError("Error connecting."); }
    setLoading(false);
  };

  const handleCancelAttendance = () => {
    setEditingTeam(null);
    fetchTeams();
  };

  const handleToggleAttendance = (teamId, memberEmail, day, value) => {
    setTeams(prev => prev.map(t => {
      if (t._id === teamId) {
        const newMv = t.memberVerifications.map(m => m.memberEmail === memberEmail ? { ...m, attendance: { ...m.attendance, [day]: value } } : m);
        return { ...t, memberVerifications: newMv, isEdited: true };
      }
      return t;
    }));
  };

  const handleToggleAllDay = (teamId, day, value) => {
    setTeams(prev => prev.map(t => {
      if (t._id === teamId) {
        const newMv = t.memberVerifications.map(m => m.isPresent ? { ...m, attendance: { ...m.attendance, [day]: value } } : m);
        return { ...t, memberVerifications: newMv, isEdited: true };
      }
      return t;
    }));
  };

  const handleSaveAttendance = async (teamId) => {
    setSubmitting(true);
    const team = teams.find(t => t._id === teamId);
    const membersMap = {};
    team.memberVerifications.forEach(m => { membersMap[m.memberEmail] = m; });
    try {
      const res = await fetch(`${API_BASE}/api/volunteer/bulk-update-members`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          verificationId: teamId, 
          volunteerEmail: sessionStorage.getItem("care_email"),
          volunteerName: sessionStorage.getItem("care_name"),
          members: membersMap 
        })
      });
      if (res.ok) {
        setTeams(prev => prev.map(t => t._id === teamId ? { ...t, isEdited: false } : t));
        setEditingTeam(null);
        alert("Attendance saved!");
      }
    } catch (err) { alert("Failed to save."); }
    setSubmitting(false);
  };

  if (loading) return <div className="p-12 text-center text-indigo-600 font-bold">Loading...</div>;
  if (error) return <div className="p-12 text-center text-red-600 font-bold">{error}</div>;

  const filteredTeams = teams.filter(t => t.teamId?.teamName?.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="p-4 md:p-8 max-w-md md:max-w-6xl mx-auto w-full pb-24 md:pb-8">
      <h2 className="text-2xl font-black text-slate-800 mb-6">Attendance Tracker</h2>
      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input type="text" placeholder="Search Teams..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500" />
      </div>
      <div className="space-y-4">
        {filteredTeams.map(item => (
          <div key={item._id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-colors ${item.isEdited ? 'border-amber-400 ring-2 ring-amber-400/20' : 'border-slate-200'}`}>
            <div 
              onClick={() => {
                setExpandedTeam(expandedTeam === item._id ? null : item._id);
                if (expandedTeam !== item._id) setEditingTeam(null);
              }} 
              className="p-4 bg-slate-50 cursor-pointer flex justify-between items-center hover:bg-slate-100 transition"
            >
              <div>
                <h3 className="font-bold text-slate-800 text-lg">{item.teamId?.teamName || "Unknown Team"}</h3>
                <p className="text-xs text-slate-500">{item.teamId?.assignedTrack || "No Track"}</p>
              </div>
              <ChevronRight size={20} className={`text-slate-400 transition-transform ${expandedTeam === item._id ? 'rotate-90' : ''}`} />
            </div>
            {expandedTeam === item._id && (
              <div className="p-4">
                {editingTeam === item._id && (
                  <div className="flex gap-2 mb-4 p-3 bg-indigo-50 rounded-xl border border-indigo-100 items-center justify-between flex-wrap">
                    <span className="text-sm font-bold text-indigo-900 flex items-center gap-2"><CheckCircle size={16} /> Quick Actions</span>
                    <div className="flex gap-2">
                      {['day1', 'day2', 'day3'].map(day => {
                        const presentMembers = item.memberVerifications.filter(m => m.isPresent);
                        const isAllDayPresent = presentMembers.length > 0 && presentMembers.every(m => m.attendance?.[day]);
                        const shortLabels = { day1: 'Day 1 (Aug 21)', day2: 'Day 2 (Aug 22)', day3: 'Day 3 (Aug 23)' };
                        return (
                          <button
                            key={`markall-${day}`}
                            onClick={() => handleToggleAllDay(item._id, day, !isAllDayPresent)}
                            disabled={submitting}
                            className={`px-3 py-1.5 text-xs font-bold rounded shadow-sm transition-all border ${isAllDayPresent ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'}`}
                          >
                            All {shortLabels[day]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="divide-y divide-slate-100">
                  {item.memberVerifications.map((member, idx) => {
                    if (!member.isPresent) return null;
                    return (
                      <div key={idx} className="py-4">
                        <p className="font-bold text-slate-800 flex items-center gap-2">
                          <User className="text-slate-400" size={16} />
                          {member.name}
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ml-1 ${member.role === 'Team Leader' || member.role === 'Leader' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                            {member.role || 'Member'}
                          </span>
                        </p>
                        <div className="flex gap-2 mt-2">
                          {['day1', 'day2', 'day3'].map(day => {
                            const isPresent = member.attendance?.[day] || false;
                            const labels = { day1: 'Day 1 (Aug 21)', day2: 'Day 2 (Aug 22)', day3: 'Day 3 (Aug 23)' };
                            
                            if (editingTeam === item._id) {
                              return (
                                <button key={day} disabled={submitting} onClick={() => handleToggleAttendance(item._id, member.memberEmail, day, !isPresent)} className={`flex-1 py-2 rounded-lg text-sm font-bold border-2 transition-all ${isPresent ? 'bg-emerald-100 border-emerald-500 text-emerald-800' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                                  {labels[day]}
                                </button>
                              );
                            } else {
                              return (
                                <div key={day} className={`flex-1 py-2 rounded-lg text-sm font-bold border-2 text-center flex items-center justify-center ${isPresent ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                                  {labels[day]}
                                </div>
                              );
                            }
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-3">
                  {editingTeam === item._id ? (
                    <>
                      <button onClick={() => handleSaveAttendance(item._id)} disabled={submitting || !item.isEdited} className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-black text-lg rounded-2xl shadow-md transition">
                        {submitting ? 'Saving...' : 'Save Attendance'}
                      </button>
                      <button onClick={handleCancelAttendance} disabled={submitting} className="w-full py-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black text-lg rounded-2xl shadow-md transition">
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setEditingTeam(item._id)} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg rounded-2xl shadow-md transition">
                      Edit Attendance
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// --- KITS & CERTIFICATES COMPONENT ---
function VolunteerKitsCertificates() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTeam, setExpandedTeam] = useState(null);
  const [editingTeam, setEditingTeam] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchTeams(); }, []);

  const fetchTeams = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/volunteer/all-checked-in-teams`);
      const data = await res.json();
      if (data.success) { setTeams(data.teams); } else { setError("Failed to fetch teams."); }
    } catch (err) { setError("Error connecting."); }
    setLoading(false);
  };

  const handleToggleKit = (verificationId, memberEmail, value) => {
    setTeams(prev => prev.map(t => {
      if (t._id === verificationId) {
        const newMv = t.memberVerifications.map(m => m.memberEmail === memberEmail ? { ...m, registrationKitGiven: value } : m);
        return { ...t, memberVerifications: newMv, isEdited: true };
      }
      return t;
    }));
  };

  const handleToggleCertificate = (verificationId, memberEmail, value) => {
    setTeams(prev => prev.map(t => {
      if (t._id === verificationId) {
        const newMv = t.memberVerifications.map(m => m.memberEmail === memberEmail ? { ...m, certificateGiven: value } : m);
        return { ...t, memberVerifications: newMv, isEdited: true };
      }
      return t;
    }));
  };

  const handleToggleAllKits = (teamId, value) => {
    setTeams(prev => prev.map(t => {
      if (t._id === teamId) {
        const newMv = t.memberVerifications.map(m => m.isPresent ? { ...m, registrationKitGiven: value } : m);
        return { ...t, memberVerifications: newMv, isEdited: true };
      }
      return t;
    }));
  };

  const handleToggleAllCerts = (teamId, value) => {
    setTeams(prev => prev.map(t => {
      if (t._id === teamId) {
        const newMv = t.memberVerifications.map(m => m.isPresent ? { ...m, certificateGiven: value } : m);
        return { ...t, memberVerifications: newMv, isEdited: true };
      }
      return t;
    }));
  };

  const handleSaveKitsCerts = async (teamId) => {
    setSubmitting(true);
    const team = teams.find(t => t._id === teamId);
    const membersMap = {};
    team.memberVerifications.forEach(m => { membersMap[m.memberEmail] = m; });
    try {
      const res = await fetch(`${API_BASE}/api/volunteer/bulk-update-members`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verificationId: teamId,
          volunteerEmail: sessionStorage.getItem("care_email"),
          volunteerName: sessionStorage.getItem("care_name"),
          members: membersMap
        })
      });
      if (res.ok) {
        setTeams(prev => prev.map(t => t._id === teamId ? { ...t, isEdited: false } : t));
        setEditingTeam(null);
        alert("Kits and Certificates saved!");
      }
    } catch (err) { alert("Failed to save."); }
    setSubmitting(false);
  };

  const handleCancelEdit = () => {
    setEditingTeam(null);
    fetchTeams();
  };

  if (loading) return <div className="p-12 text-center text-indigo-600 font-bold">Loading...</div>;
  if (error) return <div className="p-12 text-center text-red-600 font-bold">{error}</div>;

  const filteredTeams = teams.filter(t => t.teamId?.teamName?.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="p-4 md:p-8 max-w-md md:max-w-6xl mx-auto w-full pb-24 md:pb-8">
      <h2 className="text-2xl font-black text-slate-800 mb-6">Kits & Certificates</h2>
      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input type="text" placeholder="Search Teams..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 shadow-sm" />
      </div>
      <div className="space-y-4">
        {filteredTeams.map(item => {
          let certGivenCount = 0;
          let kitGivenCount = 0;
          let totalPresentCount = 0;
          if (item.memberVerifications) {
            item.memberVerifications.forEach(m => {
              if (m.isPresent) {
                totalPresentCount++;
                if (m.certificateGiven) certGivenCount++;
                if (m.registrationKitGiven) kitGivenCount++;
              }
            });
          }

          return (
            <div key={item._id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-colors ${item.isEdited ? 'border-amber-400 ring-2 ring-amber-400/20' : 'border-slate-200'}`}>
              <div
                onClick={() => {
                  setExpandedTeam(expandedTeam === item._id ? null : item._id);
                  if (expandedTeam !== item._id) setEditingTeam(null);
                }}
                className="p-4 bg-slate-50 cursor-pointer flex justify-between items-center hover:bg-slate-100 transition"
              >
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">{item.teamId?.teamName || "Unknown Team"}</h3>
                  <div className="flex gap-2 mt-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${kitGivenCount === totalPresentCount && totalPresentCount > 0 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : kitGivenCount > 0 ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                      KITS: {kitGivenCount}/{totalPresentCount}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${certGivenCount === totalPresentCount && totalPresentCount > 0 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : certGivenCount > 0 ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                      CERTS: {certGivenCount}/{totalPresentCount}
                    </span>
                  </div>
                </div>
                <ChevronRight size={20} className={`text-slate-400 transition-transform ${expandedTeam === item._id ? 'rotate-90' : ''}`} />
              </div>
              {expandedTeam === item._id && (
                <div className="p-5">
                  {/* Quick Actions */}
                  {editingTeam === item._id && (
                    <div className="flex gap-2 mb-4 p-3 bg-indigo-50 rounded-xl border border-indigo-100 items-center justify-between flex-wrap">
                      <span className="text-sm font-bold text-indigo-900 flex items-center gap-2"><CheckCircle size={16} /> Quick Actions</span>
                      <div className="flex gap-2">
                        {(() => {
                          const presentMembers = item.memberVerifications.filter(m => m.isPresent);
                          const isAllKitsGiven = presentMembers.length > 0 && presentMembers.every(m => m.registrationKitGiven);
                          const isAllCertsGiven = presentMembers.length > 0 && presentMembers.every(m => m.certificateGiven);
                          return (
                            <>
                              <button
                                onClick={() => handleToggleAllKits(item._id, !isAllKitsGiven)}
                                disabled={submitting}
                                className={`px-3 py-1.5 text-xs font-bold rounded shadow-sm transition-all border ${isAllKitsGiven ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'}`}
                              >
                                {isAllKitsGiven ? 'Revoke All Kits' : 'Issue All Kits'}
                              </button>
                              <button
                                onClick={() => handleToggleAllCerts(item._id, !isAllCertsGiven)}
                                disabled={submitting}
                                className={`px-3 py-1.5 text-xs font-bold rounded shadow-sm transition-all border ${isAllCertsGiven ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'}`}
                              >
                                {isAllCertsGiven ? 'Revoke All Certs' : 'Issue All Certs'}
                              </button>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Kits & Certificates */}
                  <h4 className="font-black text-slate-700 mb-4 px-2">Member Kits & Certificates</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {item.memberVerifications.map((member, idx) => {
                      if (!member.isPresent) return null;
                      const certGiven = member.certificateGiven;
                      const kitGiven = member.registrationKitGiven;
                      return (
                        <div key={idx} className={`p-4 rounded-xl border flex flex-col gap-3 transition-all ${kitGiven && certGiven ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
                          <div>
                            <p className="font-bold text-slate-800 flex items-center gap-2">
                              <User className="text-slate-400" size={16} />
                              {member.name}
                              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ml-1 ${member.role === 'Team Leader' || member.role === 'Leader' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                                {member.role || 'Member'}
                              </span>
                            </p>
                          </div>
                          
                          {/* Kit Row */}
                          <div className="flex justify-between items-center bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                            <div className="flex items-center gap-2">
                              <Package size={16} className={kitGiven ? 'text-emerald-500' : 'text-slate-400'} />
                              <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${kitGiven ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                                KIT {kitGiven ? 'ISSUED' : 'PENDING'}
                              </span>
                            </div>
                            {editingTeam === item._id && (
                              <button
                                disabled={submitting}
                                onClick={() => handleToggleKit(item._id, member.memberEmail, !kitGiven)}
                                className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md transition-colors font-bold shadow-sm ${kitGiven ? 'text-red-600 bg-white hover:bg-red-50 border border-red-200' : 'text-emerald-700 bg-emerald-100 hover:bg-emerald-200 border border-emerald-200'}`}
                              >
                                {kitGiven ? <X size={14} /> : <Check size={14} />} {kitGiven ? 'Revoke' : 'Issue'}
                              </button>
                            )}
                          </div>

                          {/* Cert Row */}
                          <div className="flex justify-between items-center bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                            <div className="flex items-center gap-2">
                              <FileText size={16} className={certGiven ? 'text-emerald-500' : 'text-slate-400'} />
                              <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${certGiven ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                                CERT {certGiven ? 'ISSUED' : 'PENDING'}
                              </span>
                            </div>
                            {editingTeam === item._id && (
                              <button
                                disabled={submitting}
                                onClick={() => handleToggleCertificate(item._id, member.memberEmail, !certGiven)}
                                className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md transition-colors font-bold shadow-sm ${certGiven ? 'text-red-600 bg-white hover:bg-red-50 border border-red-200' : 'text-emerald-700 bg-emerald-100 hover:bg-emerald-200 border border-emerald-200'}`}
                              >
                                {certGiven ? <X size={14} /> : <Check size={14} />} {certGiven ? 'Revoke' : 'Issue'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Actions */}
                  <div className="mt-6 pt-4 border-t border-slate-100">
                    {editingTeam === item._id ? (
                      <div className="flex flex-col gap-3">
                        <button onClick={() => handleSaveKitsCerts(item._id)} disabled={submitting || !item.isEdited} className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-black text-lg rounded-2xl shadow-md transition">
                          {submitting ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button onClick={handleCancelEdit} disabled={submitting} className="w-full py-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black text-lg rounded-2xl shadow-md transition">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setEditingTeam(item._id)} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg rounded-2xl shadow-md transition">
                        Edit Kits & Certificates
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- MAIN CONSOLE COMPONENT ---
export default function VolunteerConsole() {
  const [activeTab, setActiveTab] = useState("scan");
  const [scannedToken, setScannedToken] = useState(null);
  const [historyToken, setHistoryToken] = useState(null);
  const navigate = useNavigate();

  const renderContent = () => {
    if (activeTab === "scan") {
      if (scannedToken) {
        return (
          <VolunteerVerification
            qrToken={scannedToken}
            onBack={() => setScannedToken(null)}
            onComplete={() => setScannedToken(null)}
          />
        );
      }
      return <VolunteerScanner onScanSuccess={(token) => setScannedToken(token)} />;
    }
    if (activeTab === "history") {
      if (historyToken) {
        return (
          <VolunteerVerification
            qrToken={historyToken}
            onBack={() => { setHistoryToken(null); }}
            onComplete={() => { setHistoryToken(null); }}
            buttonText="Back to History"
          />
        );
      }
      return <VolunteerHistory onSelectToken={(token) => setHistoryToken(token)} />;
    }
    if (activeTab === "attendance") {
      return <VolunteerAttendance />;
    }
    if (activeTab === "kits") {
      return <VolunteerKitsCertificates />;
    }
  };

  return (
    <div className="flex-1 bg-slate-50 flex flex-col md:flex-row font-sans h-[calc(100vh-80px)] md:h-[calc(100vh-80px)] relative">

      {/* Desktop Sidebar Navigation */}
      <div className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 shadow-sm z-20">
        <div className="p-6 pb-2">
          <h2 className="text-xl font-black text-indigo-900 tracking-tight">Volunteer Portal</h2>
        </div>
        <div className="flex-1 p-4 space-y-2 mt-4">
          <button
            onClick={() => { setActiveTab("scan"); setScannedToken(null); }}
            className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all ${activeTab === 'scan' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 font-medium'}`}
          >
            <QrCode size={20} strokeWidth={activeTab === 'scan' ? 2.5 : 2} />
            Scan QR
          </button>
          <button
            onClick={() => setActiveTab("attendance")}
            className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all ${activeTab === 'attendance' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 font-medium'}`}
          >
            <ListChecks size={20} strokeWidth={activeTab === 'attendance' ? 2.5 : 2} />
            Attendance
          </button>
          <button
            onClick={() => setActiveTab("kits")}
            className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all ${activeTab === 'kits' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 font-medium'}`}
          >
            <Award size={20} strokeWidth={activeTab === 'kits' ? 2.5 : 2} />
            Kits & Certificates
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all ${activeTab === 'history' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 font-medium'}`}
          >
            <ClipboardList size={20} strokeWidth={activeTab === 'history' ? 2.5 : 2} />
            History
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto pb-[80px] md:pb-0">
        <div className="w-full h-full flex flex-col">
          {renderContent()}
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around p-2 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-20">
        <button
          onClick={() => { setActiveTab("scan"); setScannedToken(null); }}
          className={`flex flex-col items-center justify-center w-full py-2 ${activeTab === 'scan' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <div className={`p-1.5 rounded-xl mb-1 transition-colors ${activeTab === 'scan' ? 'bg-indigo-50' : ''}`}>
            <QrCode size={24} strokeWidth={activeTab === 'scan' ? 2.5 : 2} />
          </div>
          <span className="text-[10px] font-bold">SCAN</span>
        </button>
        <button
          onClick={() => setActiveTab("attendance")}
          className={`flex flex-col items-center justify-center w-full py-2 ${activeTab === 'attendance' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <div className={`p-1.5 rounded-xl mb-1 transition-colors ${activeTab === 'attendance' ? 'bg-indigo-50' : ''}`}>
            <ListChecks size={24} strokeWidth={activeTab === 'attendance' ? 2.5 : 2} />
          </div>
          <span className="text-[10px] font-bold">ATTEND</span>
        </button>
        <button
          onClick={() => setActiveTab("kits")}
          className={`flex flex-col items-center justify-center w-full py-2 ${activeTab === 'kits' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <div className={`p-1.5 rounded-xl mb-1 transition-colors ${activeTab === 'kits' ? 'bg-indigo-50' : ''}`}>
            <Award size={24} strokeWidth={activeTab === 'kits' ? 2.5 : 2} />
          </div>
          <span className="text-[10px] font-bold">KITS</span>
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex flex-col items-center justify-center w-full py-2 ${activeTab === 'history' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <div className={`p-1.5 rounded-xl mb-1 transition-colors ${activeTab === 'history' ? 'bg-indigo-50' : ''}`}>
            <ClipboardList size={24} strokeWidth={activeTab === 'history' ? 2.5 : 2} />
          </div>
          <span className="text-[10px] font-bold">HISTORY</span>
        </button>
      </div>
    </div>
  );
}
