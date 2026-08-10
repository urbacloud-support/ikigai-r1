import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2, Save, BookOpen } from "lucide-react";


const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

export default function AdminProblemStatements({ events = [] }) {
  const [selectedEventId, setSelectedEventId] = useState("");
  const [activeEvent, setActiveEvent] = useState(null);
  const [problemStatements, setProblemStatements] = useState({}); // mapped by trackId: { statements: [] }
  const [originalProblemStatements, setOriginalProblemStatements] = useState({});
  const [expandedTrackId, setExpandedTrackId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState([]);
  const [editingStatementIds, setEditingStatementIds] = useState(new Set());
  const [expandedStatementId, setExpandedStatementId] = useState(null);

  // When selected event changes, update activeEvent and fetch statements
  useEffect(() => {
    const ev = events.find(e => e._id === selectedEventId || e.id === selectedEventId);
    setActiveEvent(ev || null);
    setExpandedTrackId(null);
    setProblemStatements({});
    setOriginalProblemStatements({});

    if (ev) {
      fetchProblemStatements(ev._id || ev.id);
      fetchTeams(ev._id || ev.id);
    }
  }, [selectedEventId, events]);

  
  const fetchTeams = async (eventId) => {
    try {
      const res = await fetch(`${API_BASE}/api/round2/admin/approved-teams/${eventId}`);
      const data = await res.json();
      if (data.success) {
        setTeams(data.teams);
      }
    } catch (error) {
      console.error("Error fetching teams:", error);
    }
  };

  const fetchProblemStatements = async (eventId) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/problem-statements/${eventId}`);
      const data = await res.json();
      if (data.success && data.data) {
        const psMap = {};
        data.data.forEach(ps => {
          psMap[ps.trackId] = ps.statements || [];
        });
        setProblemStatements(psMap);
        setOriginalProblemStatements(JSON.parse(JSON.stringify(psMap)));
      }
    } catch (error) {
      console.error("Error fetching problem statements:", error);
      alert("Failed to fetch problem statements");
    } finally {
      setLoading(false);
    }
  };

  const getTwoDigitTrackId = (rawId) => {
    const num = parseInt(rawId, 10);
    return isNaN(num) ? "01" : num.toString().padStart(2, "0");
  };

  const hasUnsavedChanges = (trackId) => {
    const original = originalProblemStatements[trackId] || [];
    const current = problemStatements[trackId] || [];
    return JSON.stringify(original) !== JSON.stringify(current);
  };

  const toggleTrack = (trackId) => {
    if (expandedTrackId === trackId) {
      if (hasUnsavedChanges(trackId)) {
        if (!confirm("You have unsaved changes in this track. Discard them?")) {
          return;
        }
        setProblemStatements(prev => ({
          ...prev,
          [trackId]: JSON.parse(JSON.stringify(originalProblemStatements[trackId] || []))
        }));
      }
      setExpandedTrackId(null);
    } else {
      if (expandedTrackId && hasUnsavedChanges(expandedTrackId)) {
        if (!confirm("You have unsaved changes in the currently open track. Discard them?")) {
          return;
        }
        setProblemStatements(prev => ({
          ...prev,
          [expandedTrackId]: JSON.parse(JSON.stringify(originalProblemStatements[expandedTrackId] || []))
        }));
      }
      setExpandedTrackId(trackId);
    }
  };

  
  const toggleEdit = (id) => {
    setEditingStatementIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddStatement = (trackId) => {
    const currentStatements = problemStatements[trackId] || [];
    const trackPrefix = getTwoDigitTrackId(trackId);
    
    // Find next available statement ID
    let nextNum = 1;
    while (currentStatements.some(s => s.id === `${trackPrefix}-${nextNum.toString().padStart(2, "0")}`)) {
      nextNum++;
    }
    const newId = `${trackPrefix}-${nextNum.toString().padStart(2, "0")}`;

    const newStatement = {
      id: newId,
      text: "",
      limit: 1,
    };
    toggleEdit(newId);

    setProblemStatements({
      ...problemStatements,
      [trackId]: [...currentStatements, newStatement]
    });
  };

  const updateStatement = (trackId, id, field, value) => {
    const currentStatements = problemStatements[trackId] || [];
    const updated = currentStatements.map(s => {
      if (s.id === id) {
        return { ...s, [field]: value };
      }
      return s;
    });

    setProblemStatements({
      ...problemStatements,
      [trackId]: updated
    });
  };

  const removeStatement = (trackId, id) => {
    const currentStatements = problemStatements[trackId] || [];
    const updated = currentStatements.filter(s => s.id !== id);
    setProblemStatements({
      ...problemStatements,
      [trackId]: updated
    });
  };

  const handleSaveTrack = async (trackId) => {
    if (!activeEvent) return;
    const statements = problemStatements[trackId] || [];
    
    // Validation
    if (statements.some(s => !s.text.trim())) {
      return alert("Problem statement text cannot be empty.");
    }
    if (statements.some(s => s.limit < 0)) {
      return alert("Limit cannot be negative.");
    }

    try {
      const res = await fetch(`${API_BASE}/api/problem-statements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: activeEvent._id || activeEvent.id,
          trackId,
          statements,
        })
      });
      const data = await res.json();
      if (data.success) {
        alert("Saved successfully");
        setOriginalProblemStatements(prev => ({
          ...prev,
          [trackId]: JSON.parse(JSON.stringify(statements))
        }));
      } else {
        alert(data.message || "Failed to save");
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("Error saving problem statements");
    }
  };

  // Calculate global total
  let globalTotal = 0;
  if (activeEvent && activeEvent.tracks) {
    activeEvent.tracks.forEach(track => {
      const stmts = problemStatements[track.id] || [];
      globalTotal += stmts.reduce((sum, s) => sum + (parseInt(s.limit) || 0), 0);
    });
  }

  const handleEventSelect = (e) => {
    const newId = e.target.value;
    if (expandedTrackId && hasUnsavedChanges(expandedTrackId)) {
      if (!confirm("You have unsaved changes. Discard them?")) {
        return;
      }
    }
    setSelectedEventId(newId);
  };

  return (
    <div className="p-6 bg-gray-50 flex-1 h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3 border-b pb-4">
          <BookOpen className="text-purple-600" size={28} />
          <h2 className="text-2xl font-bold text-gray-800">Problem Statements</h2>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-6 items-end">
          <div className="flex-1 w-full">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Select Event</label>
            <select
              value={selectedEventId}
              onChange={handleEventSelect}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition"
            >
              <option value="">-- Choose an Event --</option>
              {events.map((ev) => (
                <option key={ev._id || ev.id} value={ev._id || ev.id}>
                  {ev.title}
                </option>
              ))}
            </select>
          </div>
          
          {activeEvent && (
            <div className="bg-purple-50 px-6 py-3 rounded-lg border border-purple-100 min-w-[200px] text-center">
              <p className="text-xs text-purple-600 font-bold uppercase tracking-wide">Global Team Capacity</p>
              <p className="text-3xl font-black text-purple-800">{globalTotal}</p>
            </div>
          )}
        </div>

        {loading && <p className="text-gray-500 animate-pulse text-center py-8">Loading problem statements...</p>}

        {activeEvent && !loading && (
          <div className="space-y-4 pb-12">
            {activeEvent.tracks?.map((track) => {
              const isExpanded = expandedTrackId === track.id;
              const trackStatements = problemStatements[track.id] || [];
              const trackCapacity = trackStatements.reduce((sum, s) => sum + (parseInt(s.limit) || 0), 0);
              const unsaved = hasUnsavedChanges(track.id);

              return (
                <div key={track.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-300">
                  {/* Track Header */}
                  <div 
                    onClick={() => toggleTrack(track.id)}
                    className={`p-4 md:p-5 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition ${isExpanded ? 'bg-purple-50/30' : ''}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-1 rounded-md">
                          Track {getTwoDigitTrackId(track.id)}
                        </span>
                        <h3 className="text-lg font-bold text-gray-800">{track.title}</h3>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="text-right hidden md:block">
                        <p className="text-xs text-gray-500 font-semibold uppercase">Track Capacity</p>
                        <p className="text-lg font-bold text-gray-800">{trackCapacity} Teams</p>
                      </div>
                      <div className="text-gray-400">
                        {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                      </div>
                    </div>
                  </div>

                  {/* Expandable Content */}
                  {isExpanded && (
                    <div className="p-5 border-t border-gray-100 bg-gray-50/50">
                      
                      {trackStatements.length === 0 ? (
                        <div className="text-center py-6 text-gray-400 italic bg-white rounded-lg border border-gray-100">
                          No problem statements added yet.
                        </div>
                      ) : (
                        <div className="space-y-3 mb-6">
                          {trackStatements.map((stmt, idx) => {
                            const isEditing = editingStatementIds.has(stmt.id);
                            const assignedTeams = teams.filter(t => t.assignedProblemStatement === stmt.id);
                            const isStmtExpanded = expandedStatementId === stmt.id;

                            return (
                            <div key={stmt.id} className="flex flex-col bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                              <div className="flex flex-col md:flex-row gap-3 items-start md:items-center p-3">
                                <div className="flex items-center gap-3">
                                  <span className="bg-gray-100 text-gray-700 font-bold px-2.5 py-1.5 rounded-md min-w-[70px] text-center shrink-0 cursor-pointer hover:bg-gray-200 transition"
                                        onClick={() => setExpandedStatementId(isStmtExpanded ? null : stmt.id)}>
                                    {stmt.id}
                                    <span className="text-[10px] block font-normal">{assignedTeams.length}/{stmt.limit} Teams</span>
                                  </span>
                                </div>
                                
                                {isEditing ? (
                                  <input
                                    type="text"
                                    placeholder="Problem statement description..."
                                    value={stmt.text}
                                    onChange={(e) => updateStatement(track.id, stmt.id, "text", e.target.value)}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 outline-none w-full md:w-auto"
                                  />
                                ) : (
                                  <div className="flex-1 px-2 text-gray-800 font-medium">{stmt.text || <span className="text-gray-400 italic">No description</span>}</div>
                                )}
                                
                                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                                  <div className="flex items-center gap-2">
                                    <label className="text-sm font-semibold text-gray-600 whitespace-nowrap">Limit:</label>
                                    {isEditing ? (
                                      <input
                                        type="number"
                                        min={assignedTeams.length}
                                        value={stmt.limit}
                                        onChange={(e) => {
                                          const newLimit = parseInt(e.target.value) || 0;
                                          if (newLimit < assignedTeams.length) {
                                            alert(`Cannot reduce limit below ${assignedTeams.length}. ${assignedTeams.length} teams have already chosen this problem statement.`);
                                            return;
                                          }
                                          updateStatement(track.id, stmt.id, "limit", newLimit);
                                        }}
                                        className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 outline-none"
                                      />
                                    ) : (
                                      <span className="w-12 text-center font-bold text-gray-800">{stmt.limit}</span>
                                    )}
                                  </div>
                                  
                                  <button
                                    onClick={() => toggleEdit(stmt.id)}
                                    className="px-3 py-1 text-sm bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-md font-bold transition ml-auto md:ml-2 border border-purple-200"
                                  >
                                    {isEditing ? "Done" : "Edit"}
                                  </button>
                                  
                                  <button 
                                    onClick={() => {
                                      if (assignedTeams.length > 0) {
                                        alert("Cannot remove problem statement because teams are assigned to it.");
                                        return;
                                      }
                                      removeStatement(track.id, stmt.id)
                                    }}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-md transition"
                                    title="Remove"
                                  >
                                    <Trash2 size={20} />
                                  </button>
                                </div>
                              </div>
                              
                              {/* Assigned Teams Expandable Section */}
                              {isStmtExpanded && (
                                <div className="bg-gray-50 border-t border-gray-100 p-4">
                                  <h4 className="text-sm font-bold text-gray-700 mb-3">Teams Assigned ({assignedTeams.length}):</h4>
                                  {assignedTeams.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                      {assignedTeams.map(t => (
                                        <div key={t._id} className="bg-white border border-gray-200 p-3 rounded-lg shadow-sm flex items-center gap-3">
                                          <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm shrink-0">
                                            {t.teamName.charAt(0).toUpperCase()}
                                          </div>
                                          <div className="min-w-0">
                                            <p className="text-sm font-bold text-gray-900 truncate">{t.teamName}</p>
                                            <p className="text-[10px] text-gray-500 truncate">{t.members[0]?.name || t.leaderEmail}</p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-gray-500 italic">No teams have selected this problem statement yet.</p>
                                  )}
                                </div>
                              )}
                            </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                        <button
                          onClick={() => handleAddStatement(track.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-white border border-purple-200 text-purple-700 rounded-lg hover:bg-purple-50 font-semibold transition shadow-sm"
                        >
                          <Plus size={18} /> Add Problem Statement
                        </button>
                        
                        <button
                          onClick={() => handleSaveTrack(track.id)}
                          className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition shadow-md ${
                            unsaved 
                              ? "bg-amber-500 text-white hover:bg-amber-600 animate-pulse" 
                              : "bg-purple-600 text-white hover:bg-purple-700"
                          }`}
                        >
                          <Save size={18} /> {unsaved ? "Save Changes" : "Save Track"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
