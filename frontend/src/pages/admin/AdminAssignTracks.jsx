import React, { useState, useEffect, useMemo } from "react";
import { ChevronDown, ChevronUp, Users, Search, Filter, ArrowDownUp, Ban, Send, X } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

export default function AdminAssignTracks({ events = [] }) {
  const [selectedEventId, setSelectedEventId] = useState("");
  const [activeEvent, setActiveEvent] = useState(null);
  const [teams, setTeams] = useState([]);
  const [problemStatements, setProblemStatements] = useState({});
  const [loading, setLoading] = useState(false);
  const [expandedTrackId, setExpandedTrackId] = useState(null);
  const [dragOverTrackId, setDragOverTrackId] = useState(null);
  const [showPublishModal, setShowPublishModal] = useState(false);

  // Filters & Sorting
  const [sortOrder, setSortOrder] = useState("asc");
  const [filterText, setFilterText] = useState("");
  const [filterInstitute, setFilterInstitute] = useState("");
  const [filterBranch, setFilterBranch] = useState("");
  const [filterLocation, setFilterLocation] = useState("");

  useEffect(() => {
    const ev = events.find((e) => e._id === selectedEventId || e.id === selectedEventId);
    setActiveEvent(ev || null);
    setExpandedTrackId(null);
    setTeams([]);
    setProblemStatements({});

    if (ev) {
      const eventId = ev._id || ev.id;
      fetchData(eventId);
    }
  }, [selectedEventId, events]);

  const fetchData = async (eventId) => {
    setLoading(true);
    try {
      // Fetch Problem Statements to calculate limits
      const psRes = await fetch(`${API_BASE}/api/problem-statements/${eventId}`);
      const psData = await psRes.json();
      
      const psMap = {};
      if (psData.success && psData.data) {
        psData.data.forEach((ps) => {
          psMap[ps.trackId] = ps.statements || [];
        });
      }
      setProblemStatements(psMap);

      // Fetch Approved Teams
      const teamsRes = await fetch(`${API_BASE}/api/round2/admin/approved-teams/${eventId}`);
      const teamsData = await teamsRes.json();
      if (teamsData.success) {
        setTeams(teamsData.teams || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      alert("Failed to fetch data for assignment.");
    } finally {
      setLoading(false);
    }
  };

  const getTwoDigitTrackId = (rawId) => {
    const num = parseInt(rawId, 10);
    return isNaN(num) ? "01" : num.toString().padStart(2, "0");
  };

  // Drag and drop handlers
  const handleDragStart = (e, teamId) => {
    e.dataTransfer.setData("teamId", teamId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, trackId) => {
    e.preventDefault();
    if (trackId !== "") {
      const trackStmts = problemStatements[trackId] || [];
      const capacity = trackStmts.reduce((sum, s) => sum + (parseInt(s.limit) || 0), 0);
      const currentlyAssigned = teams.filter(t => t.assignedTrack === trackId).length;
      
      if (capacity > 0 && currentlyAssigned >= capacity) {
        e.dataTransfer.dropEffect = "none";
        return;
      }
    }
    e.dataTransfer.dropEffect = "move";
    if (dragOverTrackId !== trackId) {
      setDragOverTrackId(trackId);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverTrackId(null);
    }
  };

  const handleDrop = async (e, targetTrackId) => {
    e.preventDefault();
    setDragOverTrackId(null);
    const teamId = e.dataTransfer.getData("teamId");
    if (!teamId) return;

    const team = teams.find((t) => t._id === teamId);
    if (!team) return;

    // Prevent dropping if it's already in the target track
    if (team.assignedTrack === targetTrackId) return;

    // Check capacity if dropping into a track
    if (targetTrackId !== "") {
      const trackStmts = problemStatements[targetTrackId] || [];
      const capacity = trackStmts.reduce((sum, s) => sum + (parseInt(s.limit) || 0), 0);
      const currentlyAssigned = teams.filter(t => t.assignedTrack === targetTrackId).length;
      if (currentlyAssigned >= capacity) {
        alert("This track has reached its maximum capacity.");
        return;
      }
    }

    try {
      // Optimistically update
      setTeams(teams.map((t) => (t._id === teamId ? { ...t, assignedTrack: targetTrackId } : t)));

      const res = await fetch(`${API_BASE}/api/round2/admin/assign-track`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, assignedTrack: targetTrackId })
      });
      const data = await res.json();
      
      if (data.success) {
        if (targetTrackId === "") {
          alert(`Team ${team.teamName} has been unassigned.`);
        } else {
          const trackName = activeEvent.tracks.find(t => t.id === targetTrackId)?.title || targetTrackId;
          alert(`Team ${team.teamName} has been assigned to track ${trackName}.`);
        }
      } else {
        alert("Failed to assign track. Reverting changes.");
        fetchData(activeEvent._id || activeEvent.id); // Revert
      }
    } catch (error) {
      console.error("Assign error:", error);
      alert("Error assigning team.");
      fetchData(activeEvent._id || activeEvent.id); // Revert
    }
  };

  const handlePublishClick = () => {
    if (!activeEvent) return;
    if (activeEvent.publishProblemStatements) {
      // If unpublishing, just ask for confirmation
      if (window.confirm("Are you sure you want to UNPUBLISH problem statements? This will hide the problem statement selection from all team leader consoles.")) {
        executePublish(false);
      }
    } else {
      // If publishing, show preview modal
      setShowPublishModal(true);
    }
  };

  const executePublish = async (publishState) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/events/${activeEvent._id || activeEvent.id}/publish-ps`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publish: publishState })
      });
      const data = await res.json();
      if (data.success) {
        setActiveEvent(data.event);
        setShowPublishModal(false);
        alert(`Problem statements successfully ${publishState ? "published" : "unpublished"}!`);
      } else {
        alert(data.message || "Failed to update publish state");
      }
    } catch (err) {
      console.error(err);
      alert("Network Error");
    }
  };

  const eligibleTeams = useMemo(() => {
    return teams.filter((t) => t.assignedTrack && t.assignedTrack !== "");
  }, [teams]);

  // Filter and sort logic for LHS (Unassigned Teams)
  const processedUnassignedTeams = useMemo(() => {
    let result = teams.filter((t) => !t.assignedTrack);

    // Filter by text (Team Name, Leader Name, Member Name)
    if (filterText.trim()) {
      const lower = filterText.toLowerCase();
      result = result.filter(
        (t) =>
          t.teamName?.toLowerCase().includes(lower) ||
          t.leaderEmail?.toLowerCase().includes(lower) ||
          t.members?.some((m) => m.name?.toLowerCase().includes(lower))
      );
    }

    // Filter by Institute
    if (filterInstitute.trim()) {
      const lower = filterInstitute.toLowerCase();
      result = result.filter((t) =>
        t.members?.some((m) => m.institute?.toLowerCase().includes(lower))
      );
    }

    // Filter by Branch
    if (filterBranch.trim()) {
      const lower = filterBranch.toLowerCase();
      result = result.filter((t) =>
        t.members?.some((m) => m.branch?.toLowerCase().includes(lower))
      );
    }

    // Filter by Location (City/State logic)
    if (filterLocation.trim()) {
      const lower = filterLocation.toLowerCase();
      result = result.filter((t) =>
        t.members?.some((m) => {
          if (!m.location) return false;
          // Extract city and state: city before 1st comma, state between 1st and 2nd
          const parts = m.location.split(",");
          const city = (parts[0] || "").toLowerCase();
          const state = (parts[1] || "").toLowerCase();
          return city.includes(lower) || state.includes(lower);
        })
      );
    }

    // Sort
    result.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    });

    return result;
  }, [teams, filterText, filterInstitute, filterBranch, filterLocation, sortOrder]);

  const assignedTeamsTotal = teams.filter((t) => t.assignedTrack).length;
  const unassignedTeamsTotal = processedUnassignedTeams.length;

  const renderTeamCard = (team, isDraggable = true) => (
    <div
      key={team._id}
      draggable={isDraggable}
      onDragStart={(e) => isDraggable && handleDragStart(e, team._id)}
      className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 cursor-grab active:cursor-grabbing hover:shadow-md transition mb-3"
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-bold text-gray-800 text-lg">{team.teamName}</h4>
        <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded">
          {new Date(team.createdAt).toLocaleDateString()}
        </span>
      </div>
      <p className="text-sm text-gray-600 mb-1">
        <span className="font-semibold">Leader:</span> {team.members[0]?.name || team.leaderEmail}
      </p>
      <p className="text-sm text-gray-600 mb-2">
        <span className="font-semibold">Institute:</span> {team.members[0]?.organisation || "N/A"}
      </p>
      
      {team.trackPreferences && team.trackPreferences.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-semibold text-purple-600 mb-1">Preferences:</p>
          <div className="flex flex-wrap gap-1">
            {team.trackPreferences.map((prefId, idx) => {
              const prefName = activeEvent?.tracks?.find(t => t.id === prefId)?.title || prefId;
              return (
                <span key={idx} className={`text-xs px-2 py-1 rounded-full ${idx === 0 ? 'bg-purple-100 text-purple-700 font-bold' : 'bg-gray-100 text-gray-600'}`}>
                  {idx + 1}. {prefName}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-gray-100">
        <p className="text-xs font-semibold text-gray-500 mb-2">Members ({team.members?.length || 0}):</p>
        <div className="flex flex-wrap gap-2">
          {team.members?.map((m, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
              {m.photoUrl ? (
                <img src={m.photoUrl} alt={m.name} className="w-6 h-6 rounded-full object-cover" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-[10px] text-white font-bold">
                  {(m.name || "?").charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-xs text-gray-700">{m.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 bg-gray-50 flex-1 h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3 border-b pb-4">
          <Users className="text-purple-600" size={28} />
          <h2 className="text-2xl font-bold text-gray-800">Assign Tracks</h2>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Select Event</label>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="w-full md:w-1/3 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition"
          >
            <option value="">-- Choose an Event --</option>
            {events.map((ev) => (
              <option key={ev._id || ev.id} value={ev._id || ev.id}>
                {ev.title}
              </option>
            ))}
          </select>

          {activeEvent && (
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-gray-800 text-sm">Problem Statement Publishing</h4>
                <p className="text-xs text-gray-500 mt-1">Allow assigned teams to view and select their problem statements from their dashboard.</p>
              </div>
              <button 
                onClick={handlePublishClick}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition shadow-sm ${
                  activeEvent.publishProblemStatements 
                    ? 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-200' 
                    : 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-200'
                }`}
              >
                <Send size={16} />
                {activeEvent.publishProblemStatements ? 'Unpublish' : 'Publish'}
              </button>
            </div>
          )}
        </div>

        {loading && <p className="text-gray-500 animate-pulse text-center py-8">Loading data...</p>}

        {activeEvent && !loading && (
          <div className="flex flex-col lg:flex-row gap-6 h-[800px]">
            {/* LHS: Unassigned Teams Queue */}
            <div 
              className="lg:w-1/2 flex flex-col bg-gray-100 rounded-xl border border-gray-200 overflow-hidden"
              onDragOver={(e) => handleDragOver(e, "")}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, "")}
            >
              <div className="p-4 bg-white border-b border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                    Unassigned Teams
                    <span className="bg-purple-100 text-purple-700 px-2.5 py-0.5 rounded-full text-sm">
                      {unassignedTeamsTotal}
                    </span>
                  </h3>
                  <button 
                    onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
                    className="flex items-center gap-1 text-sm font-semibold text-gray-600 hover:text-purple-600 transition"
                  >
                    <ArrowDownUp size={16} /> Sort ({sortOrder.toUpperCase()})
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                    <input 
                      type="text" 
                      placeholder="Search name, leader, member..." 
                      value={filterText}
                      onChange={(e) => setFilterText(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <input 
                      type="text" 
                      placeholder="Institute" 
                      value={filterInstitute}
                      onChange={(e) => setFilterInstitute(e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500"
                    />
                    <input 
                      type="text" 
                      placeholder="Branch" 
                      value={filterBranch}
                      onChange={(e) => setFilterBranch(e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500"
                    />
                    <input 
                      type="text" 
                      placeholder="City/State" 
                      value={filterLocation}
                      onChange={(e) => setFilterLocation(e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>
              
              <div className="p-4 overflow-y-auto flex-1">
                {processedUnassignedTeams.length === 0 ? (
                  <p className="text-center text-gray-500 mt-10">No unassigned teams match criteria.</p>
                ) : (
                  processedUnassignedTeams.map(team => renderTeamCard(team))
                )}
              </div>
            </div>

            {/* RHS: Tracks Dropzones */}
            <div className="lg:w-1/2 flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                  Tracks
                </h3>
                <span className="text-sm font-semibold text-gray-600 bg-white px-3 py-1 rounded-md shadow-sm border border-gray-200">
                  Total Assigned: <span className="text-purple-700 font-bold ml-1">{assignedTeamsTotal}</span>
                </span>
              </div>

              <div className="p-4 overflow-y-auto flex-1 space-y-4 bg-gray-50/50">
                {activeEvent.tracks?.map((track) => {
                  const trackStatements = problemStatements[track.id] || [];
                  const capacity = trackStatements.reduce((sum, s) => sum + (parseInt(s.limit) || 0), 0);
                  const trackTeams = teams.filter(t => t.assignedTrack === track.id);
                  const isExpanded = expandedTrackId === track.id;
                  const isFull = capacity > 0 && trackTeams.length >= capacity;
                  const isDragOver = dragOverTrackId === track.id;

                  return (
                    <div 
                      key={track.id}
                      onDragOver={(e) => handleDragOver(e, track.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, track.id)}
                      title={isFull ? 'No capacity remaining in this track' : ''}
                      className={`rounded-xl border transition-all duration-300 overflow-hidden ${
                        isFull
                          ? 'border-red-200 bg-red-50/20 cursor-not-allowed opacity-80' 
                          : isDragOver
                            ? 'border-purple-500 bg-purple-50 scale-[1.02] shadow-md ring-2 ring-purple-500/50'
                            : 'border-purple-200 bg-white hover:border-purple-400'
                      }`}
                    >
                      <div 
                        className={`p-4 flex items-center justify-between ${!isFull ? 'cursor-pointer' : ''}`}
                        onClick={() => setExpandedTrackId(isExpanded ? null : track.id)}
                      >
                        <div>
                          <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-1 rounded-md mb-2 inline-flex items-center gap-1">
                            Track {getTwoDigitTrackId(track.id)}
                            {isFull && <Ban size={12} className="text-red-500" />}
                          </span>
                          <h4 className="font-bold text-gray-800 text-lg">{track.title}</h4>
                        </div>
                        <div className="text-right flex items-center gap-4">
                          <div>
                            <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Capacity</p>
                            <p className={`text-xl font-black ${trackTeams.length >= capacity ? 'text-red-500' : 'text-purple-700'}`}>
                              {trackTeams.length} <span className="text-sm text-gray-400 font-normal">/ {capacity}</span>
                            </p>
                          </div>
                          <div className="text-gray-400">
                            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="p-4 border-t border-gray-100 bg-gray-50">
                          {trackTeams.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-4 border-2 border-dashed border-gray-200 rounded-lg">
                              Drag & Drop teams here to assign.
                            </p>
                          ) : (
                            <div className="space-y-3">
                              {trackTeams.map(team => renderTeamCard(team))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {showPublishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Send size={22} className="text-purple-600" />
                Publish Preview
              </h3>
              <button onClick={() => setShowPublishModal(false)} className="text-gray-400 hover:text-red-500 transition p-1 rounded-md hover:bg-red-50">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-white">
              <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 mb-6">
                <p className="text-purple-800 font-medium">
                  The following <strong className="text-purple-900">{eligibleTeams.length}</strong> teams will instantly gain access to the problem statement selection UI on their team leader console.
                </p>
                <p className="text-sm text-purple-600 mt-1">
                  Only teams that are "Approved" and have been assigned to a track are eligible. Unassigned teams will not see the problem statements.
                </p>
              </div>

              {eligibleTeams.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-gray-500 font-medium">No teams are currently eligible.</p>
                  <p className="text-sm text-gray-400 mt-1">Assign teams to tracks first.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {eligibleTeams.map(team => (
                    <div key={team._id} className="bg-white border border-gray-200 rounded-lg p-3 flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold shrink-0">
                        {team.teamName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-800 truncate">{team.teamName}</p>
                        <p className="text-xs text-gray-500 truncate">{team.members[0]?.name || team.leaderEmail}</p>
                        <p className="text-[10px] text-gray-400 uppercase font-semibold mt-1">
                          Track {getTwoDigitTrackId(team.assignedTrack)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button 
                onClick={() => setShowPublishModal(false)}
                className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-lg transition"
              >
                Cancel
              </button>
              <button 
                onClick={() => executePublish(true)}
                disabled={eligibleTeams.length === 0}
                className="px-6 py-2 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg transition flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={16} /> Confirm Publish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
