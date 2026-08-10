import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, 
  Users,
  Mail,
  Phone,
  MapPin,
  Building2,
  BookOpen,
  CheckCircle,
  Camera,
  UploadCloud,
  Loader2,
  Shirt,
  Target,
  Lightbulb,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

export default function TeamMyTeam() {
  const [team, setTeam] = useState(null);
  const [round2Status, setRound2Status] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadingFor, setUploadingFor] = useState(null);
  const fileInputRef = useRef(null);
  const [selectedMemberEmail, setSelectedMemberEmail] = useState("");
  const [updatingTshirt, setUpdatingTshirt] = useState(null);
  const [editingTshirt, setEditingTshirt] = useState({});
  const [draftTshirt, setDraftTshirt] = useState({});
  const [isTracksExpanded, setIsTracksExpanded] = useState(false);
  const [trackName, setTrackName] = useState("");
  const [psText, setPsText] = useState("");

  const toggleEditTshirt = (email) => {
    if (!editingTshirt[email]) {
      // Entering edit mode, initialize draft state
      setDraftTshirt(prev => ({ ...prev, [email]: round2Status?.tshirtSizes?.[email] || "" }));
    }
    setEditingTshirt(prev => ({ ...prev, [email]: !prev[email] }));
  };

  const fetchTeam = async () => {
    
    try {
      const email = sessionStorage.getItem("care_email");
      if (!email) return;

      const res = await fetch(
        `${API_BASE}/api/team/my-details?email=${encodeURIComponent(email)}`,
      );
      const data = await res.json();
      if (data.success) {
        setTeam(data.team);
      }

      const r2Res = await fetch(
        `${API_BASE}/api/round2/my-status?email=${encodeURIComponent(email)}`,
      );
      const r2Data = await r2Res.json();
      if (r2Res.ok && r2Data.registered) {
        setRound2Status(r2Data);
        
        // Fetch track and PS text
        const evRes = await fetch(`${API_BASE}/api/admin/events`);
        const evData = await evRes.json();
        const activeEv = evData.events?.find(e => {
          const t = (e.title || e.name || "").toLowerCase();
          return t.includes("round 2") || t.includes("round-2") || e._id === r2Data.eventId;
        });
        
        if (activeEv) {
          if (r2Data.assignedTrack) {
            const t = activeEv.tracks?.find(tr => tr.id === r2Data.assignedTrack || tr._id === r2Data.assignedTrack);
            if (t) setTrackName(t.title || t.name || r2Data.assignedTrack);
          }
          if (r2Data.assignedProblemStatement) {
            const psRes = await fetch(`${API_BASE}/api/problem-statements/${activeEv._id}`);
            const psJson = await psRes.json();
            if (psJson.success && psJson.data) {
              const trackPS = psJson.data.find(d => d.trackId === r2Data.assignedTrack);
              if (trackPS) {
                const statement = trackPS.statements.find(s => s.id === r2Data.assignedProblemStatement);
                if (statement) setPsText(statement.text);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("Error fetching team data", err);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const handlePhotoSelect = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedMemberEmail || !team) return;

    // Quick validation
    if (file.size > 5 * 1024 * 1024) {
      alert("File is too large. Max 5MB allowed.");
      return;
    }

    setUploadingFor(selectedMemberEmail);
    const formData = new FormData();
    formData.append("photo", file);
    formData.append("participantId", team.participantId || team._id);
    formData.append("memberEmail", selectedMemberEmail);
    formData.append("eventId", team.eventId);

    try {
      const res = await fetch(`${API_BASE}/api/round2/upload-photo`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        await fetchTeam(); // Refetch to get updated photoUrl
      } else {
        alert(data.message || "Failed to upload photo");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while uploading the photo.");
    } finally {
      setUploadingFor(null);
      setSelectedMemberEmail("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const triggerFileInput = (email) => {
    setSelectedMemberEmail(email);
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleTshirtUpdate = async (email) => {
    const size = draftTshirt[email];
    if (!size || !team) {
      alert("Please select a size first.");
      return;
    }
    setUpdatingTshirt(email);
    try {
      const res = await fetch(`${API_BASE}/api/round2/update-tshirt`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: team.participantId || team._id,
          memberEmail: email,
          size,
          teamName: team.teamName,
          leaderEmail: sessionStorage.getItem("care_email"),
          eventId: team.eventId,
          members: team.members
        })
      });
      const data = await res.json();
      if (data.success) {
        await fetchTeam(); // Refetch to get updated status
        setEditingTshirt(prev => ({ ...prev, [email]: false }));
      } else {
        alert(data.message || "Failed to update T-shirt size.");
      }
    } catch (err) {
      console.error(err);
      alert("Error updating T-shirt size.");
    } finally {
      setUpdatingTshirt(null);
    }
  };

  if (loading)
    return (
      <div className="p-8 text-center text-gray-600">
        Loading team details...
      </div>
    );

  if (!team)
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="bg-white p-6 rounded-xl shadow border border-gray-200 text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Team Not Found
          </h2>
          <p className="text-gray-600">
            We couldn't locate your shortlisted team details.
          </p>
        </div>
      </div>
    );

  const missingPhotos =
    team && team.members && team.members.some((m) => !m.photoUrl);

  return (
    <div className="p-6 max-w-5xl mx-auto w-full space-y-6">
      {/* Hidden file input for photo upload */}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={handlePhotoSelect}
      />

      {missingPhotos && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl shadow-sm text-sm font-semibold flex items-center gap-2">
          <span>⚠️</span> Please upload the image of all members as it may
          affect the verification process.
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <h1 className="text-3xl font-black text-gray-900 mb-2">
          {team.teamName}
        </h1>
        <p className="text-lg text-gray-600 font-medium mb-6">
          {team.projectTitle}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-start gap-3">
            <Users className="text-green-600 mt-1" size={20} />
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Total Members
              </p>
              <p className="text-lg font-bold text-gray-800">
                {team.members?.length || 0}
              </p>
            </div>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-start gap-3">
            <CheckCircle className="text-green-600 mt-1" size={20} />
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Status
              </p>
              <p className="text-lg font-bold text-gray-800">
                {!round2Status ? "Shortlisted for Round 2" : 
                 round2Status.assignedProblemStatement ? "Locked In" :
                 round2Status.assignedTrack ? "Track Assigned" :
                 round2Status.status === 'Approved' ? "Verified" :
                 round2Status.status === 'Contact' ? "Contact Admin" :
                 "Pending Review"}
              </p>
            </div>
          </div>

          {round2Status?.assignedTrack && (
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-start gap-3">
              <Target className="text-purple-600 mt-1" size={20} />
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                  Assigned Track
                </p>
                <p className="text-lg font-bold text-gray-800">
                  {round2Status.assignedTrack} - {trackName || "Unknown"}
                </p>
              </div>
            </div>
          )}
          {round2Status?.assignedProblemStatement && (
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-start gap-3">
              <Lightbulb className="text-purple-600 mt-1" size={20} />
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                  Problem Statement
                </p>
                <p className="text-lg font-bold text-gray-800">
                  {round2Status.assignedProblemStatement} - {psText || "Loading..."}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      
      {round2Status &&
        round2Status.trackPreferences &&
        round2Status.trackPreferences.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div 
              className="p-6 cursor-pointer flex justify-between items-center hover:bg-gray-50 transition"
              onClick={() => setIsTracksExpanded(!isTracksExpanded)}
            >
              <h2 className="text-xl font-bold text-gray-800 m-0">
                Saved Track Preferences
              </h2>
              {isTracksExpanded ? <ChevronUp className="text-gray-500" /> : <ChevronDown className="text-gray-500" />}
            </div>
            
            {isTracksExpanded && (
              <div className="px-6 pb-6 border-t border-gray-100 pt-4">
                <div className="mb-4 text-red-600 font-semibold text-sm">
                  <p>
                    Note: Selecting a preferred domain during registration does not
                    guarantee its allocation. Domain allotment will be based on
                    first-come, first-registration and successful Round 1 solution
                    submission, subject to availability.
                  </p>
                </div>
                <div className="space-y-2.5">
                  {round2Status.trackPreferences.map((track, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-100 rounded-lg"
                    >
                      <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </div>
                      <span className="font-semibold text-gray-800">{track}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}


      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-800 px-2">Team Members</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {team.members?.map((member, idx) => (
            <div
              key={idx}
              className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 relative overflow-hidden group hover:shadow-md transition"
            >
              {member.isLeader && (
                <div className="absolute top-0 right-0 bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-bl-lg">
                  Team Leader
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-5 items-start">
                <div className="flex flex-col items-center gap-2 w-full sm:w-auto shrink-0 border-b sm:border-b-0 sm:border-r border-gray-100 pb-4 sm:pb-0 sm:pr-5">
                  <div className="w-24 h-24 rounded-full border border-gray-200 bg-gray-100 flex items-center justify-center overflow-hidden shrink-0 relative group">
                    {member.photoUrl ? (
                      <img
                        src={member.photoUrl}
                        alt={member.name || member.firstName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Users className="text-gray-300" size={40} />
                    )}
                    {uploadingFor === member.email && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Loader2
                          className="animate-spin text-white"
                          size={24}
                        />
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => triggerFileInput(member.email)}
                    disabled={uploadingFor === member.email}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50"
                  >
                    {member.photoUrl ? (
                      <>
                        <Camera size={14} /> Change Photo
                      </>
                    ) : (
                      <>
                        <UploadCloud size={14} /> Upload Photo
                      </>
                    )}
                  </button>
                </div>

                <div className="flex-1 w-full">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">
                    {member.name || `${member.firstName} ${member.lastName}`}
                  </h3>
                  <p className="text-sm text-gray-500 font-medium mb-4">
                    {member.userType}
                  </p>

                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Mail size={16} className="text-gray-400" />{" "}
                      {member.email}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Phone size={16} className="text-gray-400" />{" "}
                      {member.mobile || member.phone}
                    </div>
                    {member.organisation && (
                      <div className="flex items-start gap-2 text-sm text-gray-700">
                        <Building2
                          size={16}
                          className="text-gray-400 shrink-0 mt-0.5"
                        />
                        <span className="line-clamp-2">
                          {member.organisation}
                        </span>
                      </div>
                    )}
                    {member.specialization && (
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <BookOpen
                          size={16}
                          className="text-gray-400 shrink-0"
                        />
                        <span className="line-clamp-1">
                          {member.course} - {member.specialization}
                        </span>
                      </div>
                    )}
                    {member.location && (
                      <div className="flex items-start gap-2 text-sm text-gray-700">
                        <MapPin
                          size={16}
                          className="text-gray-400 shrink-0 mt-0.5"
                        />
                        <span className="line-clamp-1">{member.location}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-100 flex flex-col gap-2 w-full">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Shirt size={16} className="text-gray-400 shrink-0" />
                        <span className="font-semibold text-gray-800">T-Shirt:</span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={editingTshirt[member.email] ? draftTshirt[member.email] || "" : round2Status?.tshirtSizes?.[member.email] || ""}
                          onChange={(e) => setDraftTshirt(prev => ({ ...prev, [member.email]: e.target.value }))}
                          disabled={updatingTshirt === member.email || !editingTshirt[member.email]}
                          className={`text-sm border rounded-md px-2 py-1.5 focus:ring-1 focus:ring-green-500 focus:outline-none transition-colors min-w-[100px] ${editingTshirt[member.email] ? 'border-green-300 bg-white' : 'border-gray-200 bg-gray-50 text-gray-600'}`}
                        >
                          <option value="">Select Size</option>
                          <option value="S">S</option>
                          <option value="M">M</option>
                          <option value="L">L</option>
                          <option value="XL">XL</option>
                          <option value="XXL">XXL</option>
                        </select>

                        {!editingTshirt[member.email] && updatingTshirt !== member.email && (
                          <button 
                            onClick={() => toggleEditTshirt(member.email)}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors px-2"
                          >
                            Change
                          </button>
                        )}
                        
                        {updatingTshirt === member.email && <Loader2 className="animate-spin text-green-600" size={16} />}
                      </div>
                    </div>

                    {editingTshirt[member.email] && updatingTshirt !== member.email && (
                      <div className="flex items-center gap-2 mt-1" style={{ paddingLeft: "5.5rem" }}>
                        <button 
                          onClick={() => handleTshirtUpdate(member.email)}
                          className="text-xs font-bold bg-green-600 text-white hover:bg-green-700 px-3 py-1.5 rounded-md shadow-sm transition"
                        >
                          Update
                        </button>
                        <button 
                          onClick={() => toggleEditTshirt(member.email)}
                          className="text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 px-3 py-1.5 rounded-md transition"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
