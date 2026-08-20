import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import AssignTeamsModal from "./components/admin/AssignTeamsModal";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

// --- Components ---

function ConfirmDeleteModal({ isOpen, onClose, onConfirm, itemName, itemType }) {
  const [input, setInput] = useState("");
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-xl font-bold text-red-600 mb-2">Delete {itemType}</h3>
        <p className="text-gray-600 text-sm mb-4">
          This action cannot be undone. This will permanently delete the {itemType.toLowerCase()} <strong>{itemName}</strong> and all associated data.
        </p>
        <p className="text-gray-700 text-sm mb-2">Please type <strong>{itemName}</strong> to confirm.</p>
        <input 
          type="text" 
          value={input}
          onChange={e => setInput(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-red-500"
        />
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
          <button 
            onClick={() => { onConfirm(); onClose(); setInput(""); }} 
            disabled={input !== itemName}
            className={`px-4 py-2 rounded font-semibold ${input === itemName ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-red-300 text-white cursor-not-allowed'}`}
          >
            I understand the consequences, delete this {itemType.toLowerCase()}
          </button>
        </div>
      </div>
    </div>
  );
}

function DefineCriteriaModal({ isOpen, onClose, event, refreshEvents }) {
  const [criteria, setCriteria] = useState(event.criteria && event.criteria.length ? event.criteria : [{ name: "", maxMarks: 10, inputType: "number" }]);
  const [allowComments, setAllowComments] = useState(event.allowComments ?? true);
  const [requireComments, setRequireComments] = useState(event.requireComments ?? false);
  const [allowDirectTotal, setAllowDirectTotal] = useState(event.allowDirectTotal ?? true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCriteria(event.criteria && event.criteria.length ? event.criteria : [{ name: "", maxMarks: 10, inputType: "number" }]);
      setAllowComments(event.allowComments ?? true);
      setRequireComments(event.requireComments ?? false);
      setAllowDirectTotal(event.allowDirectTotal ?? true);
    }
  }, [isOpen, event]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/events/${event._id}/criteria`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ criteria, allowComments, requireComments, allowDirectTotal })
      });
      if (res.ok) {
        onClose();
        refreshEvents();
      } else {
        alert("Failed to save criteria");
      }
    } catch (e) {
      alert("Error saving criteria");
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800">Define Assessment Criteria</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">✕</button>
        </div>
        
        <div className="flex justify-end mb-4">
          <button onClick={() => setCriteria([...criteria, { name: "", maxMarks: 10, inputType: "number" }])} className="px-3 py-1 bg-blue-100 text-blue-700 font-semibold rounded hover:bg-blue-200 text-sm">
            + Add Criteria
          </button>
        </div>

        <div className="space-y-3 mb-6">
          {criteria.map((c, idx) => (
            <div key={idx} className="flex gap-3 items-center">
              <input 
                type="text" 
                placeholder="Criteria Name" 
                value={c.name} 
                onChange={e => {
                  const newC = [...criteria];
                  newC[idx].name = e.target.value;
                  setCriteria(newC);
                }} 
                className="flex-1 border px-3 py-2 rounded" 
              />
              <select
                value={c.inputType || "number"}
                onChange={e => {
                  const newC = [...criteria];
                  newC[idx].inputType = e.target.value;
                  setCriteria(newC);
                }}
                className="border px-3 py-2 rounded"
              >
                <option value="number">Numerical</option>
                <option value="text">Text</option>
                <option value="boolean">Toggle (Yes/No)</option>
              </select>
              {c.inputType !== "text" && c.inputType !== "boolean" && (
              <input 
                type="number" 
                placeholder="Max Marks" 
                value={c.maxMarks} 
                onChange={e => {
                  const newC = [...criteria];
                  newC[idx].maxMarks = Number(e.target.value);
                  setCriteria(newC);
                }} 
                className="w-24 border px-3 py-2 rounded" 
              />
              )}
              <button 
                onClick={() => setCriteria(criteria.filter((_, i) => i !== idx))}
                className="text-red-500 hover:bg-red-50 p-2 rounded"
              >
                ✕
              </button>
            </div>
          ))}
          {criteria.length === 0 && <p className="text-gray-500 italic text-sm">No criteria defined. Add at least one.</p>}
        </div>

        <div className="mb-6 p-4 bg-gray-50 border rounded flex flex-col gap-2">
          <label className="flex items-center gap-2 font-semibold text-gray-700">
            <input type="checkbox" checked={allowComments} onChange={e => setAllowComments(e.target.checked)} />
            Allow Reason / Justification Comments
          </label>
          {allowComments && (
            <label className="flex items-center gap-2 font-semibold text-gray-700 ml-6">
              <input type="checkbox" checked={requireComments} onChange={e => setRequireComments(e.target.checked)} />
              Make comments required for each criteria
            </label>
          )}
          <hr className="my-1 border-gray-200" />
          <label className="flex items-center gap-2 font-semibold text-gray-700">
            <input type="checkbox" checked={allowDirectTotal} onChange={e => setAllowDirectTotal(e.target.checked)} />
            Allow evaluators to use "Direct Total" Assessment
          </label>
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded font-semibold">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded">
            {saving ? "Saving..." : "Save Criteria"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EvaluatorList({ event, track, refreshEvents }) {
  const [evaluators, setEvaluators] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "Mr.", firstName: "", lastName: "", email: "", phone: "" });
  const [assignModal, setAssignModal] = useState(false);
  const [selectedEvaluator, setSelectedEvaluator] = useState(null);
  const [editEvaluatorId, setEditEvaluatorId] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "" });

  useEffect(() => {
    fetch(`${API_BASE}/api/admin/session-chairs/${event._id}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.chairs) {
          setEvaluators(data.chairs.filter(c => c.trackId === track.id));
        }
      });
  }, [event._id, track.id]);

  const handleCreate = async (e) => {
    e.preventDefault();
    const fullName = `${form.title} ${form.firstName} ${form.lastName}`.trim();
    const res = await fetch(`${API_BASE}/api/admin/evaluators`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        name: fullName, 
        firstName: form.firstName, // Passed to backend for password generation
        email: form.email, 
        phone: form.phone, 
        eventId: event._id, 
        trackId: track.id 
      })
    });
    const data = await res.json();
    if (data.success) {
      setEvaluators([...evaluators, data.evaluator]);
      setShowCreate(false);
      setForm({ title: "Mr.", firstName: "", lastName: "", email: "", phone: "" });
      refreshEvents();
    } else {
      alert(data.message || "Failed to create evaluator");
    }
  };

  const handleDelete = async (evaluatorId) => {
    if (!confirm("Delete this evaluator?")) return;
    const res = await fetch(`${API_BASE}/api/admin/evaluators/${evaluatorId}`, { method: "DELETE" });
    if (res.ok) {
      setEvaluators(evaluators.filter(e => e._id !== evaluatorId));
      refreshEvents();
    }
  };

  const handleUpdate = async (e, evId) => {
    e.preventDefault();
    const res = await fetch(`${API_BASE}/api/admin/evaluators/${evId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm)
    });
    if (res.ok) {
      setEditEvaluatorId(null);
      const data = await res.json();
      setEvaluators(evaluators.map(ev => ev._id === evId ? data.evaluator : ev));
      refreshEvents();
    } else {
      alert("Failed to update evaluator");
    }
  };

  return (
    <div className="ml-6 mt-4 pl-4 border-l-2 border-green-200">
      <div className="flex justify-between items-center mb-3">
        <h5 className="font-semibold text-gray-700">Evaluators</h5>
        <button onClick={() => setShowCreate(!showCreate)} className="text-sm px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition">
          + Add Evaluator
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-gray-50 p-4 rounded-lg mb-4 flex flex-col gap-3 border border-gray-200">
          <div className="flex flex-col sm:flex-row gap-3">
            <select value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="border px-2 py-1 rounded bg-white w-full sm:w-24">
              <option value="Mr.">Mr.</option>
              <option value="Mrs.">Mrs.</option>
              <option value="Ms.">Ms.</option>
              <option value="Dr.">Dr.</option>
              <option value="Prof.">Prof.</option>
              <option value="Prof. Dr.">Prof. Dr.</option>
            </select>
            <input required type="text" placeholder="First Name" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} className="flex-1 border px-2 py-1 rounded" />
            <input required type="text" placeholder="Last Name" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} className="flex-1 border px-2 py-1 rounded" />
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <input required type="email" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="flex-1 border px-2 py-1 rounded" />
            <input required type="text" placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="flex-1 border px-2 py-1 rounded" />
            <button type="submit" className="bg-green-600 text-white px-4 py-1 rounded font-semibold hover:bg-green-700 w-full sm:w-auto">Save Evaluator</button>
          </div>
        </form>
      )}

      {evaluators.length === 0 && !showCreate && <p className="text-sm text-gray-500 italic">No evaluators found.</p>}
      
      <div className="space-y-2">
        {evaluators.map(ev => (
          <div key={ev._id} className="bg-white border border-gray-200 p-2 rounded shadow-sm text-sm">
            {editEvaluatorId === ev._id ? (
              <form onSubmit={(e) => handleUpdate(e, ev._id)} className="flex flex-col sm:flex-row gap-2 w-full">
                <input required type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="flex-1 border px-2 py-1 rounded" placeholder="Full Name" />
                <input required type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} className="flex-1 border px-2 py-1 rounded" placeholder="Email" />
                <input required type="text" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} className="flex-1 border px-2 py-1 rounded" placeholder="Phone" />
                <div className="flex gap-2">
                  <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded">Save</button>
                  <button type="button" onClick={() => setEditEvaluatorId(null)} className="bg-gray-200 px-3 py-1 rounded">Cancel</button>
                </div>
              </form>
            ) : (
              <div className="flex justify-between items-center w-full">
                <div>
                  <p className="font-semibold">{ev.name}</p>
                  <p className="text-gray-500 text-xs">{ev.email} • {ev.phone}</p>
                </div>
                <div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setSelectedEvaluator(ev); setAssignModal(true); }}
                    className="text-sm px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition font-medium mr-2"
                  >
                    Assign Teams
                  </button>
                  <button 
                    onClick={() => { setEditEvaluatorId(ev._id); setEditForm({ name: ev.name, email: ev.email, phone: ev.phone }); }} 
                    className="text-blue-600 hover:text-blue-800 px-2 py-1 mr-1"
                  >
                    Edit
                  </button>
                  <button onClick={() => handleDelete(ev._id)} className="text-red-500 hover:text-red-700 px-2 py-1">Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      <AssignTeamsModal
        isOpen={assignModal}
        onClose={() => { setAssignModal(false); setSelectedEvaluator(null); }}
        event={event}
        track={track}
        evaluator={selectedEvaluator}
      />
    </div>
  );
}

function TrackItem({ event, track, refreshEvents }) {
  const [expanded, setExpanded] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [assignStats, setAssignStats] = useState(null); // { total, assigned }
  const [isEditingTrack, setIsEditingTrack] = useState(false);
  const [trackForm, setTrackForm] = useState({ title: track.title, description: track.description });

  // Fetch assignment stats and evaluators for the badge whenever expanded
  useEffect(() => {
    if (!expanded) return;
    // Fetch all participants in this track to compute the badge
    fetch(`${API_BASE}/api/participants/by-track?eventId=${event._id}&trackId=${track.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          const total = data.participants.length;
          const assigned = data.participants.filter((p) => p.assignedEvaluators && p.assignedEvaluators.length > 0).length;
          setAssignStats({ total, assigned });
        }
      })
      .catch(console.error);
  }, [expanded, event._id, track.id]);

  const handleDelete = async () => {
    const res = await fetch(`${API_BASE}/api/admin/events/${event._id}/tracks/${track.id}`, { method: "DELETE" });
    if (res.ok) refreshEvents();
  };

  const handleEditTrack = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API_BASE}/api/admin/events/${event._id}/tracks/${track.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(trackForm)
    });
    if (res.ok) {
      setIsEditingTrack(false);
      refreshEvents();
    } else {
      alert("Failed to update track");
    }
  };

  return (
    <div className="mb-3 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      {isEditingTrack ? (
        <form onSubmit={handleEditTrack} className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="mb-3">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Track Name</label>
            <input required type="text" value={trackForm.title} onChange={e => setTrackForm({ ...trackForm, title: e.target.value })} className="w-full border border-gray-300 rounded px-3 py-2" />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Track Description</label>
            <textarea required value={trackForm.description} onChange={e => setTrackForm({ ...trackForm, description: e.target.value })} className="w-full border border-gray-300 rounded px-3 py-2 h-16" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setIsEditingTrack(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded font-semibold">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700">Save Changes</button>
          </div>
        </form>
      ) : (
        <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition" onClick={() => setExpanded(!expanded)}>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">
              <span className={`text-green-600 transition-transform ${expanded ? 'rotate-90' : ''}`}>▶</span> {track.title}
            </h4>
            <p className="text-sm text-gray-600 mt-1">{track.description}</p>
          </div>
          <div className="flex items-center gap-2 ml-4 flex-shrink-0">
            {/* Assignment badge */}
            {assignStats !== null && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                assignStats.assigned === assignStats.total && assignStats.total > 0
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}>
                {assignStats.assigned}/{assignStats.total} assigned
              </span>
            )}
            <button 
              onClick={(e) => { e.stopPropagation(); setIsEditingTrack(true); }}
              className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 px-3 py-1 rounded transition"
            >
              Edit
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setDeleteModal(true); }}
              className="text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1 rounded transition"
            >
              Delete Track
            </button>
          </div>
        </div>
      )}
      
      {expanded && (
        <div className="p-4 pt-0 border-t border-gray-100 bg-gray-50">
          <EvaluatorList event={event} track={track} refreshEvents={refreshEvents} />
        </div>
      )}

      <ConfirmDeleteModal 
        isOpen={deleteModal} 
        onClose={() => setDeleteModal(false)} 
        onConfirm={handleDelete} 
        itemName={track.title} 
        itemType="Track" 
      />

    </div>
  );
}

function TrackList({ event, refreshEvents }) {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", description: "" });

  const handleCreate = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API_BASE}/api/admin/events/${event._id}/tracks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    if (res.ok) {
      setShowCreate(false);
      setForm({ title: "", description: "" });
      refreshEvents();
    } else {
      alert("Failed to create track");
    }
  };

  return (
    <div className="mt-4 border-t border-gray-200 pt-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-gray-700">Tracks</h3>
        <button onClick={() => setShowCreate(!showCreate)} className="px-4 py-2 bg-green-100 text-green-700 rounded-md font-semibold hover:bg-green-200 transition">
          + Create Track
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white p-4 rounded-lg border border-green-200 shadow-sm mb-4">
          <div className="mb-3">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Track Name</label>
            <input required type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full border border-gray-300 rounded px-3 py-2" placeholder="e.g. AI & Machine Learning" />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Track Description</label>
            <textarea required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full border border-gray-300 rounded px-3 py-2 h-20" placeholder="Brief description of the track" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded font-semibold">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded font-semibold hover:bg-green-700">Save Track</button>
          </div>
        </form>
      )}

      {event.tracks && event.tracks.length > 0 ? (
        <div className="space-y-3">
          {event.tracks.map(track => (
            <TrackItem key={track.id} event={event} track={track} refreshEvents={refreshEvents} />
          ))}
        </div>
      ) : (
        !showCreate && <div className="text-center p-6 bg-gray-50 border border-dashed border-gray-300 rounded-lg text-gray-500">No tracks found. Create one to get started.</div>
      )}
    </div>
  );
}

function EventCard({ event, refreshEvents }) {
  const [expanded, setExpanded] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [criteriaModal, setCriteriaModal] = useState(false);

  const handleDelete = async () => {
    const res = await fetch(`${API_BASE}/api/admin/events/${event._id}`, { method: "DELETE" });
    if (res.ok) refreshEvents();
  };

  return (
    <div className="bg-white border border-green-200 rounded-2xl shadow-sm hover:shadow-md transition mb-6 overflow-hidden">
      <div className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-green-600 transition-transform ${expanded ? 'rotate-90' : ''}`}>▶</span>
            <h3 className="text-2xl font-extrabold text-green-700 truncate">{event.title}</h3>
          </div>
          <p className="text-sm text-gray-500 mt-1">Date: {event.date || "—"}</p>
          <p className="text-sm text-gray-600 mt-2 line-clamp-2">{event.description}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link to={`/admin/events/${event._id}/participants`} onClick={(e) => e.stopPropagation()} className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-md text-sm font-semibold transition">
            View Participants
          </Link>
          <Link to={`/edit/${event._id}`} onClick={(e) => e.stopPropagation()} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-semibold transition">
            Edit Event
          </Link>
          <button onClick={(e) => { e.stopPropagation(); setDeleteModal(true); }} className="px-4 py-2 border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white rounded-md text-sm font-semibold transition">
            Delete Event
          </button>
        </div>
      </div>
      
      {expanded && (
        <div className="p-6 pt-0 bg-white">
          <div className="flex justify-end mb-4 border-t border-gray-200 pt-4">
            <button onClick={() => setCriteriaModal(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-semibold transition shadow-sm">
              Define Criteria
            </button>
          </div>
          <TrackList event={event} refreshEvents={refreshEvents} />
        </div>
      )}

      <ConfirmDeleteModal 
        isOpen={deleteModal} 
        onClose={() => setDeleteModal(false)} 
        onConfirm={handleDelete} 
        itemName={event.title} 
        itemType="Event" 
      />
      <DefineCriteriaModal
        isOpen={criteriaModal}
        onClose={() => setCriteriaModal(false)}
        event={event}
        refreshEvents={refreshEvents}
      />
    </div>
  );
}

// --- Views ---

export function EventsView({ events, refreshEvents }) {
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", date: "" });
  const [loading, setLoading] = useState(false);

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, tracks: [], sessionChairs: [] })
      });
      if (res.ok) {
        setShowCreateEvent(false);
        setForm({ title: "", description: "", date: "" });
        refreshEvents();
      } else {
        alert("Failed to create event");
      }
    } catch (err) {
      alert("Error creating event");
    }
    setLoading(false);
  };

  return (
    <div className="animate-fade-in w-full max-w-7xl mx-auto px-6 py-8 md:px-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-800 tracking-tight">Events Management</h2>
          <p className="text-gray-500 mt-1">Manage events, tracks, and evaluators.</p>
        </div>
        <button
          onClick={() => setShowCreateEvent(!showCreateEvent)}
          className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold shadow-md transition transform hover:-translate-y-0.5"
        >
          {showCreateEvent ? "Cancel" : "+ Create Event"}
        </button>
      </div>

      {showCreateEvent && (
        <div className="mb-8 bg-white p-6 border border-green-200 rounded-2xl shadow-lg">
          <h3 className="text-xl font-bold text-green-700 mb-4">Create New Event Shell</h3>
          <form onSubmit={handleCreateEvent}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Event Name</label>
                <input required type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-400 focus:outline-none" placeholder="Hackathon 2026" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Date</label>
                <input required type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-400 focus:outline-none" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                <textarea required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2 h-24 focus:ring-2 focus:ring-green-400 focus:outline-none" placeholder="Brief description..." />
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={loading} className="px-8 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition disabled:opacity-50">
                {loading ? "Saving..." : "Create Event"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-2">
        {!events || events.length === 0 ? (
          <div className="p-12 text-center bg-white/80 border-2 border-dashed border-green-200 rounded-2xl text-gray-500">
            <p className="text-lg">No events found.</p>
            <p className="text-sm mt-2">Click "Create Event" to build your first event shell.</p>
          </div>
        ) : (
          events.map(ev => <EventCard key={ev._id} event={ev} refreshEvents={refreshEvents} />)
        )}
      </div>
    </div>
  );
}

export function ProgressView({ events }) {
  const navigate = useNavigate();
  const [selectedEventId, setSelectedEventId] = useState("");

  const handleSelect = (e) => {
    const id = e.target.value;
    setSelectedEventId(id);
    if (id) {
      navigate(`/event/${id}`);
    }
  };

  return (
    <div className="animate-fade-in w-full max-w-7xl mx-auto px-6 py-8 md:px-10">
      <h2 className="text-3xl font-extrabold text-gray-800 tracking-tight mb-2">Event Progress</h2>
      <p className="text-gray-500 mb-8">Select an event from the dropdown below to view its full evaluation progress.</p>
      
      <div className="bg-white p-6 border border-green-200 rounded-2xl shadow-sm w-full">
        <label className="block text-sm font-semibold text-gray-700 mb-2">Choose an Event</label>
        <select 
          value={selectedEventId} 
          onChange={handleSelect} 
          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-400 focus:outline-none"
        >
          <option value="">-- Select an Event --</option>
          {events.map(ev => (
            <option key={ev._id} value={ev._id}>{ev.title} ({ev.date})</option>
          ))}
        </select>
        
        {selectedEventId === "" && (
          <div className="mt-6 p-4 bg-gray-50 text-gray-500 text-sm text-center rounded-lg border border-dashed border-gray-300">
            Select an event to open the detailed progress tracking console.
          </div>
        )}
      </div>
    </div>
  );
}

export function UsersView() {
  const [evaluators, setEvaluators] = useState([]);
  const [students, setStudents] = useState([]);
  const [teamLeaders, setTeamLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", role: "studentCoordinator", email: "", phone: "" });

  const fetchData = async () => {
    setLoading(true);
    try {
      const resEv = await fetch(`${API_BASE}/api/admin/evaluators/all`);
      const dataEv = await resEv.json();
      if (dataEv.success) setEvaluators(dataEv.chairs || []);

      const resSc = await fetch(`${API_BASE}/api/admin/users/global`);
      const dataSc = await resSc.json();
      if (dataSc.success) setStudents(dataSc.users || []);

      const resTl = await fetch(`${API_BASE}/api/admin/team-leaders/all`);
      const dataTl = await resTl.json();
      if (dataTl.success) setTeamLeaders(dataTl.leaders || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const [invitingId, setInvitingId] = useState(null);
  const [isBulkInviting, setIsBulkInviting] = useState(false);
  const [isBulkInvitingTeams, setIsBulkInvitingTeams] = useState(false);
  const [selectedEvaluators, setSelectedEvaluators] = useState([]);
  const [selectedTeamLeaders, setSelectedTeamLeaders] = useState([]);
  const [showInviteMenu, setShowInviteMenu] = useState(false);
  const [showTeamInviteMenu, setShowTeamInviteMenu] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isTeamSelectionMode, setIsTeamSelectionMode] = useState(false);

  const handleSendInvite = async (e, evId, isResend) => {
    e.stopPropagation();
    const msg = isResend ? "Resend the invitation email to this evaluator?" : "Send invitation email to this evaluator?";
    if (!confirm(msg)) return;
    setInvitingId(evId);
    try {
      const res = await fetch(`${API_BASE}/api/admin/evaluators/${evId}/send-invite`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        alert("Invitation sent successfully!");
        fetchData();
      } else {
        alert(data.message || "Failed to send invitation.");
      }
    } catch (err) {
      alert("Error sending invitation.");
    }
    setInvitingId(null);
  };

  const handleSendTeamInvite = async (e, evId, isResend) => {
    e.stopPropagation();
    const msg = isResend ? "Resend the invitation email to this team leader?" : "Send invitation email to this team leader?";
    if (!confirm(msg)) return;
    setInvitingId(evId);
    try {
      const res = await fetch(`${API_BASE}/api/admin/team-leaders/send-mail`, { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leaderIds: [evId] })
      });
      const data = await res.json();
      if (data.success) {
        alert("Invitation sent successfully!");
        fetchData();
      } else {
        alert(data.message || "Failed to send invitation.");
      }
    } catch (err) {
      alert("Error sending invitation.");
    }
    setInvitingId(null);
  };

  const handleSendSelected = async () => {
    if (selectedEvaluators.length === 0) return;
    if (!confirm(`Send invitation emails to ${selectedEvaluators.length} selected evaluator(s)?`)) return;
    setIsBulkInviting(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/evaluators/send-invites-selected`, { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evaluatorIds: selectedEvaluators })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || "Invitations sent successfully!");
        setSelectedEvaluators([]);
        setIsSelectionMode(false);
        fetchData();
      } else {
        alert(data.message || "Failed to send invitations.");
      }
    } catch (err) {
      alert("Error sending invitations.");
    } finally {
      setIsBulkInviting(false);
    }
  };

  const handleSendSelectedTeams = async () => {
    if (selectedTeamLeaders.length === 0) return;
    if (!confirm(`Send invitation emails to ${selectedTeamLeaders.length} selected team leader(s)?`)) return;
    setIsBulkInvitingTeams(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/team-leaders/send-mail`, { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leaderIds: selectedTeamLeaders })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || "Invitations sent successfully!");
        setSelectedTeamLeaders([]);
        setIsTeamSelectionMode(false);
        fetchData();
      } else {
        alert(data.message || "Failed to send invitations.");
      }
    } catch (err) {
      alert("Error sending invitations.");
    } finally {
      setIsBulkInvitingTeams(false);
    }
  };

  const handleBulkInvite = async () => {
    if (!confirm("Send invitation emails to ALL evaluators?")) return;
    setIsBulkInviting(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/evaluators/send-invites-bulk`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        alert(data.message || "Invitations sent successfully!");
        fetchData();
      } else {
        alert(data.message || "Failed to send invitations.");
      }
    } catch (err) {
      alert("Error sending invitations.");
    } finally {
      setIsBulkInviting(false);
    }
  };

  const handleBulkTeamInvite = async () => {
    if (!confirm("Send invitation emails to ALL shortlisted team leaders?")) return;
    setIsBulkInvitingTeams(true);
    try {
      const allTeamLeaderIds = filteredTeams.map(tl => tl._id);
      const res = await fetch(`${API_BASE}/api/admin/team-leaders/send-mail`, { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leaderIds: allTeamLeaderIds })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || "Invitations sent successfully!");
        fetchData();
      } else {
        alert(data.message || "Failed to send invitations.");
      }
    } catch (err) {
      alert("Error sending invitations.");
    } finally {
      setIsBulkInvitingTeams(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (form.role === "studentCoordinator" || form.role === "studentVolunteer" || form.role === "facultyCoordinator") {
      const fullName = `${form.firstName} ${form.lastName}`.trim();
      const res = await fetch(`${API_BASE}/api/admin/users/global`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: fullName, firstName: form.firstName, email: form.email, phone: form.phone, role: form.role })
      });
      const data = await res.json();
      if (data.success) {
        setShowCreate(false);
        setForm({ firstName: "", lastName: "", role: "studentCoordinator", email: "", phone: "" });
        fetchData();
      } else {
        alert(data.message || "Failed to create user");
      }
    }
  };

  const [editStudentId, setEditStudentId] = useState(null);
  const [editStudentForm, setEditStudentForm] = useState({ name: "", email: "", phone: "" });

  const handleUpdateStudent = async (e, id) => {
    e.preventDefault();
    const res = await fetch(`${API_BASE}/api/admin/student-coordinator`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...editStudentForm })
    });
    const data = await res.json();
    if (data.success) {
      setEditStudentId(null);
      fetchData();
    } else {
      alert("Failed to update student coordinator");
    }
  };

  const handleDeleteStudent = async (id, role) => {
    if (!confirm(`Are you sure you want to delete this ${role === 'studentVolunteer' ? 'volunteer' : role === 'facultyCoordinator' ? 'faculty' : 'coordinator'}?`)) return;
    const res = await fetch(`${API_BASE}/api/admin/users/global/${role}/${id}`, { method: "DELETE" });
    if (res.ok) {
      fetchData();
    }
  };

  const [editEvaluatorId, setEditEvaluatorId] = useState(null);
  const [editEvaluatorForm, setEditEvaluatorForm] = useState({ name: "", email: "", phone: "" });

  const handleUpdateGlobalEvaluator = async (e, id) => {
    e.preventDefault();
    const res = await fetch(`${API_BASE}/api/admin/evaluators/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editEvaluatorForm)
    });
    if (res.ok) {
      setEditEvaluatorId(null);
      fetchData();
    } else {
      alert("Failed to update evaluator");
    }
  };

  const handleDeleteGlobalEvaluator = async (id) => {
    if (!confirm("Are you sure you want to delete this evaluator?")) return;
    const res = await fetch(`${API_BASE}/api/admin/evaluators/${id}`, { method: "DELETE" });
    if (res.ok) {
      fetchData();
    }
  };

  const [filterInstitute, setFilterInstitute] = useState("");
  const [filterBranch, setFilterBranch] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [filterState, setFilterState] = useState("");
  const [filterCountry, setFilterCountry] = useState("");
  const [searchTeam, setSearchTeam] = useState("");
  const [activeRoleSection, setActiveRoleSection] = useState(null);
  const isTeamsCollapsed = activeRoleSection !== 'teams';
  const isEvaluatorsCollapsed = activeRoleSection !== 'evaluators';
  const isStudentsCollapsed = activeRoleSection !== 'students';

  const getTeamLeader = (p) => p?.members?.find(m => m.isLeader) || p?.members?.[0];
  const getTeamLocation = (p) => {
    const loc = getTeamLeader(p)?.location || "";
    const parts = loc.split(',').map(s => s.trim());
    return { city: parts[0] || "", state: parts[1] || "", country: parts[2] || "" };
  };
  const getTeamInstitute = (p) => getTeamLeader(p)?.organisation || "";
  const getTeamBranch = (p) => getTeamLeader(p)?.specialization || "";

  let filteredTeams = teamLeaders.filter(tl => {
    const p = tl.participantId;
    if (!p) return false;
    
    const searchLower = searchTeam.toLowerCase();
    const matchesSearch = !searchTeam || 
      tl.teamName.toLowerCase().includes(searchLower) || 
      tl.name.toLowerCase().includes(searchLower) ||
      (tl.email && tl.email.toLowerCase().includes(searchLower));
      
    const inst = getTeamInstitute(p);
    const branch = getTeamBranch(p);
    const loc = getTeamLocation(p);

    const matchesInst = !filterInstitute || inst === filterInstitute;
    const matchesBranch = !filterBranch || branch === filterBranch;
    const matchesCity = !filterCity || loc.city === filterCity;
    const matchesState = !filterState || loc.state === filterState;
    const matchesCountry = !filterCountry || loc.country === filterCountry;

    return matchesSearch && matchesInst && matchesBranch && matchesCity && matchesState && matchesCountry;
  });

  const uniqueInstitutes = [...new Set(teamLeaders.map(tl => getTeamInstitute(tl.participantId)).filter(Boolean))].sort();
  const uniqueBranches = [...new Set(teamLeaders.map(tl => getTeamBranch(tl.participantId)).filter(Boolean))].sort();
  const uniqueCities = [...new Set(teamLeaders.map(tl => getTeamLocation(tl.participantId).city).filter(Boolean))].sort();
  const uniqueStates = [...new Set(teamLeaders.map(tl => getTeamLocation(tl.participantId).state).filter(Boolean))].sort();
  const uniqueCountries = [...new Set(teamLeaders.map(tl => getTeamLocation(tl.participantId).country).filter(Boolean))].sort();

  return (
    <div className="animate-fade-in w-full max-w-7xl mx-auto px-6 py-8 md:px-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-800 tracking-tight">Users Management</h2>
          <p className="text-gray-500 mt-1">Manage evaluators and student coordinators across all events.</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold shadow-md transition"
        >
          {showCreate ? "Cancel" : "+ Add User"}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white p-6 border border-green-200 rounded-2xl shadow-lg mb-8">
          <h3 className="text-xl font-bold text-green-700 mb-4">Create New User</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Role</label>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="w-full border border-gray-300 rounded px-3 py-2 bg-white text-gray-700">
                <option value="studentCoordinator">Student Coordinator</option>
                <option value="studentVolunteer">Student Volunteer</option>
                <option value="facultyCoordinator">Faculty Coordinator</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Evaluators are created from inside an Event Track.</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">First Name</label>
              <input required type="text" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} className="w-full border border-gray-300 rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Last Name</label>
              <input required type="text" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} className="w-full border border-gray-300 rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
              <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full border border-gray-300 rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Phone</label>
              <input required type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full border border-gray-300 rounded px-3 py-2" />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700">Save User</button>
          </div>
        </form>
      )}

      {/* Student Coordinators */}
      <div className="bg-white border border-green-200 rounded-2xl shadow-sm overflow-hidden mb-6">
        <div 
          className="bg-green-50 px-6 py-4 border-b border-green-100 font-bold text-green-800 text-lg flex justify-between items-center cursor-pointer"
          onClick={() => setActiveRoleSection(activeRoleSection === 'students' ? null : 'students')}
        >
          <div className="flex items-center gap-3">
            <span className="text-sm">{isStudentsCollapsed ? '▶' : '▼'}</span>
            <span>Global Staff (Coordinators, Volunteers & Faculty) ({students.length})</span>
          </div>
        </div>
        {!isStudentsCollapsed && (
          loading ? (
            <div className="p-6 text-gray-500">Loading users...</div>
        ) : students.length === 0 ? (
          <div className="p-6 text-gray-500">No global staff have been created yet.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {students.map(sc => (
              <div key={sc._id} className="p-4 hover:bg-gray-50 transition cursor-pointer" onClick={(e) => { if (editStudentId !== sc._id) setExpandedId(expandedId === sc._id ? null : sc._id); }}>
                {editStudentId === sc._id ? (
                  <form onSubmit={(e) => handleUpdateStudent(e, sc._id)} className="flex flex-col sm:flex-row gap-2 w-full p-2" onClick={e => e.stopPropagation()}>
                    <input required type="text" value={editStudentForm.name} onChange={e => setEditStudentForm({ ...editStudentForm, name: e.target.value })} className="flex-1 border px-2 py-1 rounded" placeholder="Full Name" />
                    <input required type="email" value={editStudentForm.email} onChange={e => setEditStudentForm({ ...editStudentForm, email: e.target.value })} className="flex-1 border px-2 py-1 rounded" placeholder="Email" />
                    <input required type="text" value={editStudentForm.phone} onChange={e => setEditStudentForm({ ...editStudentForm, phone: e.target.value })} className="flex-1 border px-2 py-1 rounded" placeholder="Phone" />
                    <div className="flex gap-2">
                      <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded">Save</button>
                      <button type="button" onClick={() => setEditStudentId(null)} className="bg-gray-200 px-3 py-1 rounded">Cancel</button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                        <span className={`text-green-600 transition-transform ${expandedId === sc._id ? 'rotate-90' : ''}`}>▶</span>
                        {sc.name}
                      </h4>
                      <p className="text-sm text-gray-500 ml-5">{sc.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setEditStudentId(sc._id); setEditStudentForm({ name: sc.name, email: sc.email, phone: sc.phone || "" }); }}
                        className="text-blue-600 hover:text-blue-800 px-2 py-1 text-sm font-medium"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteStudent(sc._id, sc.role); }}
                        className="text-red-500 hover:text-red-700 px-2 py-1 text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
                {expandedId === sc._id && editStudentId !== sc._id && (
                  <div className="ml-5 mt-4 p-4 bg-gray-100 rounded-lg text-sm grid grid-cols-2 gap-2">
                    <div><span className="font-semibold text-gray-700">Phone:</span> {sc.phone || 'N/A'}</div>
                    <div><span className="font-semibold text-gray-700">Type:</span> {sc.role === 'studentVolunteer' ? 'Student Volunteer' : sc.role === 'facultyCoordinator' ? 'Faculty Coordinator' : 'Student Coordinator'} (Global)</div>
                    <div className="col-span-2 mt-2 pt-2 border-t border-gray-200">
                      <span className="font-semibold text-gray-700">Temporary Password:</span> 
                      <span className="ml-2 font-mono bg-white px-2 py-1 rounded border border-gray-300">
                        {sc.name.split(' ')[0]?.toLowerCase() || 'student'}123
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          )
        )}
      </div>

      {/* Evaluators */}
      <div className="bg-white border border-green-200 rounded-2xl shadow-sm overflow-hidden mb-6">
        <div 
          className="bg-green-50 px-6 py-4 border-b border-green-100 font-bold text-green-800 text-lg flex justify-between items-center cursor-pointer"
          onClick={(e) => {
            if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON') {
              setActiveRoleSection(activeRoleSection === 'evaluators' ? null : 'evaluators');
            }
          }}
        >
          <div className="flex items-center gap-3">
            <span className="text-sm">{isEvaluatorsCollapsed ? '▶' : '▼'}</span>
            {evaluators.length > 0 && isSelectionMode && (
              <input 
                type="checkbox"
                checked={selectedEvaluators.length === evaluators.length && evaluators.length > 0}
                onChange={(e) => {
                  if (e.target.checked) setSelectedEvaluators(evaluators.map(ev => ev._id));
                  else setSelectedEvaluators([]);
                }}
                className="w-4 h-4 cursor-pointer"
              />
            )}
            <span>Evaluators ({evaluators.length})</span>
          </div>
          <div className="flex gap-2 relative">
            {evaluators.length > 0 && (
              isSelectionMode ? (
                <>
                  <button
                    onClick={() => {
                      setIsSelectionMode(false);
                      setSelectedEvaluators([]);
                    }}
                    className="text-sm px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded shadow transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendSelected}
                    disabled={isBulkInviting || selectedEvaluators.length === 0}
                    className="text-sm px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded shadow transition disabled:opacity-50"
                  >
                    {isBulkInviting ? "Sending..." : `Confirm Send (${selectedEvaluators.length})`}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowInviteMenu(!showInviteMenu);
                      if (activeRoleSection !== 'evaluators') setActiveRoleSection('evaluators');
                    }}
                    disabled={isBulkInviting}
                    className="text-sm px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded shadow transition flex items-center gap-1 disabled:opacity-50"
                  >
                    {isBulkInviting ? "Sending..." : "Send Invitations ▾"}
                  </button>
                  {showInviteMenu && !isBulkInviting && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-xl z-10 overflow-hidden">
                      <button
                        onClick={() => { setShowInviteMenu(false); handleBulkInvite(); }}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 text-gray-700 font-semibold text-sm border-b border-gray-100 transition"
                      >
                        Send to All ({evaluators.length})
                      </button>
                      <button
                        onClick={() => { setShowInviteMenu(false); setIsSelectionMode(true); }}
                        className="w-full text-left px-4 py-3 font-semibold text-sm transition hover:bg-gray-50 text-indigo-700"
                      >
                        Send to Custom Users
                      </button>
                    </div>
                  )}
                </>
              )
            )}
          </div>
        </div>
        {!isEvaluatorsCollapsed && (
          loading ? (
            <div className="p-6 text-gray-500">Loading users...</div>
        ) : evaluators.length === 0 ? (
          <div className="p-6 text-gray-500">No evaluators have been created yet.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {evaluators.map(ev => (
              <div key={ev._id} className="p-4 hover:bg-gray-50 transition cursor-pointer" onClick={(e) => { if (editEvaluatorId !== ev._id) setExpandedId(expandedId === ev._id ? null : ev._id); }}>
                {editEvaluatorId === ev._id ? (
                  <form onSubmit={(e) => handleUpdateGlobalEvaluator(e, ev._id)} className="flex flex-col sm:flex-row gap-2 w-full p-2" onClick={e => e.stopPropagation()}>
                    <input required type="text" value={editEvaluatorForm.name} onChange={e => setEditEvaluatorForm({ ...editEvaluatorForm, name: e.target.value })} className="flex-1 border px-2 py-1 rounded" placeholder="Full Name" />
                    <input required type="email" value={editEvaluatorForm.email} onChange={e => setEditEvaluatorForm({ ...editEvaluatorForm, email: e.target.value })} className="flex-1 border px-2 py-1 rounded" placeholder="Email" />
                    <input required type="text" value={editEvaluatorForm.phone} onChange={e => setEditEvaluatorForm({ ...editEvaluatorForm, phone: e.target.value })} className="flex-1 border px-2 py-1 rounded" placeholder="Phone" />
                    <div className="flex gap-2">
                      <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded">Save</button>
                      <button type="button" onClick={() => setEditEvaluatorId(null)} className="bg-gray-200 px-3 py-1 rounded">Cancel</button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isSelectionMode && (
                        <input 
                          type="checkbox"
                          checked={selectedEvaluators.includes(ev._id)}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedEvaluators([...selectedEvaluators, ev._id]);
                            else setSelectedEvaluators(selectedEvaluators.filter(id => id !== ev._id));
                          }}
                          className="w-4 h-4 cursor-pointer"
                        />
                      )}
                      <div>
                        <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                          <span className={`text-green-600 transition-transform ${expandedId === ev._id ? 'rotate-90' : ''}`}>▶</span>
                          {ev.name}
                        </h4>
                    <p className="text-sm text-gray-500 ml-5">{ev.email}</p>
                  </div>
                  </div>
                  <div className="flex items-center gap-2 mr-4">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setEditEvaluatorId(ev._id); setEditEvaluatorForm({ name: ev.name, email: ev.email, phone: ev.phone || "" }); }}
                      className="text-blue-600 hover:text-blue-800 px-2 py-1 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteGlobalEvaluator(ev._id); }}
                      className="text-red-500 hover:text-red-700 px-2 py-1 text-sm font-medium"
                    >
                      Delete
                    </button>
                    <button 
                      onClick={(e) => handleSendInvite(e, ev._id, ev.inviteSent)} 
                      disabled={invitingId === ev._id}
                      className={`text-xs font-semibold px-3 py-1 border rounded transition disabled:opacity-50 ${ev.inviteSent ? 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100' : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'}`}
                    >
                      {invitingId === ev._id ? "Sending..." : ev.inviteSent ? "Resend Invite" : "Send Invite"}
                    </button>
                  </div>
                </div>
                )}
                {expandedId === ev._id && editEvaluatorId !== ev._id && (
                  <div className="ml-5 mt-4 p-4 bg-gray-100 rounded-lg text-sm grid grid-cols-2 gap-2">
                    <div><span className="font-semibold text-gray-700">Phone:</span> {ev.phone || 'N/A'}</div>
                    <div><span className="font-semibold text-gray-700">Type:</span> Evaluator</div>
                    <div><span className="font-semibold text-gray-700">Event ID:</span> {ev.eventId}</div>
                    <div><span className="font-semibold text-gray-700">Track ID:</span> {ev.trackId}</div>
                    <div className="col-span-2 mt-2 pt-2 border-t border-gray-200">
                      <span className="font-semibold text-gray-700">Temporary Password:</span> 
                      <span className="ml-2 font-mono bg-white px-2 py-1 rounded border border-gray-300">
                        {(() => {
                          const cleanName = ev.name.replace(/^(mr\.|mrs\.|ms\.|dr\.|prof\.)\s*/i, "").trim();
                          const firstName = cleanName.split(" ")[0].toLowerCase().replace(/[^a-z0-9]/g, "") || "evaluator";
                          return `${firstName}123`;
                        })()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          )
        )}
      </div>
      {/* Teams (Shortlisted) */}
      <div className="bg-white border border-green-200 rounded-2xl shadow-sm overflow-hidden mb-6">
        <div 
          className="bg-green-50 px-6 py-4 border-b border-green-100 font-bold text-green-800 text-lg flex justify-between items-center cursor-pointer"
          onClick={(e) => {
            if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'SELECT') {
              setActiveRoleSection(activeRoleSection === 'teams' ? null : 'teams');
            }
          }}
        >
          <div className="flex items-center gap-3">
            <span className="text-sm">{isTeamsCollapsed ? '▶' : '▼'}</span>
            {filteredTeams.length > 0 && isTeamSelectionMode && (
              <input 
                type="checkbox"
                checked={selectedTeamLeaders.length === filteredTeams.length && filteredTeams.length > 0}
                onChange={(e) => {
                  if (e.target.checked) setSelectedTeamLeaders(filteredTeams.map(tl => tl._id));
                  else setSelectedTeamLeaders([]);
                }}
                className="w-4 h-4 cursor-pointer"
              />
            )}
            <span>Teams ({filteredTeams.length})</span>
          </div>
          <div className="flex gap-2 relative">
            {filteredTeams.length > 0 && (
              isTeamSelectionMode ? (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsTeamSelectionMode(false);
                      setSelectedTeamLeaders([]);
                    }}
                    className="text-sm px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded shadow transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleSendSelectedTeams(); }}
                    disabled={selectedTeamLeaders.length === 0 || isBulkInvitingTeams}
                    className="text-sm px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded shadow transition disabled:opacity-50"
                  >
                    {isBulkInvitingTeams ? "Sending..." : `Confirm Send (${selectedTeamLeaders.length})`}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowTeamInviteMenu(!showTeamInviteMenu);
                      if (activeRoleSection !== 'teams') setActiveRoleSection('teams');
                    }}
                    disabled={isBulkInvitingTeams}
                    className="text-sm px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded shadow transition flex items-center gap-1 disabled:opacity-50"
                  >
                    {isBulkInvitingTeams ? "Sending..." : "Send Invitations ▾"}
                  </button>
                  {showTeamInviteMenu && !isBulkInvitingTeams && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-xl z-10 overflow-hidden">
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowTeamInviteMenu(false); handleBulkTeamInvite(); }}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 text-gray-700 font-semibold text-sm border-b border-gray-100 transition"
                      >
                        Send to All ({filteredTeams.length})
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowTeamInviteMenu(false); setIsTeamSelectionMode(true); }}
                        className="w-full text-left px-4 py-3 font-semibold text-sm transition hover:bg-gray-50 text-indigo-700"
                      >
                        Send to Custom Users
                      </button>
                    </div>
                  )}
                </>
              )
            )}
          </div>
        </div>
        {!isTeamsCollapsed && (
          loading ? (
            <div className="p-6 text-gray-500">Loading users...</div>
          ) : teamLeaders.length === 0 ? (
            <div className="p-6 text-gray-500">No teams have been shortlisted yet.</div>
          ) : (
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex flex-wrap gap-2 mb-3">
                <input 
                  type="text" 
                  placeholder="Search team or leader..." 
                  className="border border-gray-300 rounded px-3 py-1.5 text-sm"
                  value={searchTeam}
                  onChange={(e) => setSearchTeam(e.target.value)}
                />
                <select value={filterInstitute} onChange={e => setFilterInstitute(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm max-w-[200px] truncate">
                  <option value="">All Institutes</option>
                  {uniqueInstitutes.map(inst => <option key={inst} value={inst}>{inst}</option>)}
                </select>
                <select value={filterBranch} onChange={e => setFilterBranch(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm max-w-[150px] truncate">
                  <option value="">All Branches</option>
                  {uniqueBranches.map(branch => <option key={branch} value={branch}>{branch}</option>)}
                </select>
                <select value={filterCity} onChange={e => setFilterCity(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm max-w-[120px] truncate">
                  <option value="">All Cities</option>
                  {uniqueCities.map(city => <option key={city} value={city}>{city}</option>)}
                </select>
                <select value={filterState} onChange={e => setFilterState(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm max-w-[120px] truncate">
                  <option value="">All States</option>
                  {uniqueStates.map(state => <option key={state} value={state}>{state}</option>)}
                </select>
                <select value={filterCountry} onChange={e => setFilterCountry(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm max-w-[120px] truncate">
                  <option value="">All Countries</option>
                  {uniqueCountries.map(country => <option key={country} value={country}>{country}</option>)}
                </select>
                <button onClick={() => { setFilterInstitute(""); setFilterBranch(""); setFilterCity(""); setFilterState(""); setFilterCountry(""); setSearchTeam(""); }} className="text-sm text-blue-600 hover:underline px-2 py-1.5">
                  Clear
                </button>
              </div>
              <div className="divide-y divide-gray-100 border rounded-lg bg-white">
                {filteredTeams.map(tl => (
                  <div key={tl._id} className="p-4 hover:bg-gray-50 transition flex flex-col cursor-pointer" onClick={(e) => { if (!isTeamSelectionMode) setExpandedId(expandedId === tl._id ? null : tl._id); }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isTeamSelectionMode && (
                          <input 
                            type="checkbox"
                            checked={selectedTeamLeaders.includes(tl._id)}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedTeamLeaders([...selectedTeamLeaders, tl._id]);
                              else setSelectedTeamLeaders(selectedTeamLeaders.filter(id => id !== tl._id));
                            }}
                            className="w-4 h-4 cursor-pointer"
                          />
                        )}
                        <div>
                          <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                            <span className={`text-green-600 transition-transform ${expandedId === tl._id ? 'rotate-90' : ''}`}>▶</span>
                            {tl.teamName}
                          </h4>
                          <p className="text-sm text-gray-500 ml-5">{tl.name} ({tl.email})</p>
                          <p className="text-xs text-gray-400 ml-5 mt-0.5">
                            {getTeamInstitute(tl.participantId) || 'N/A'} • {[getTeamLocation(tl.participantId).city, getTeamLocation(tl.participantId).state].filter(Boolean).join(', ') || 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mr-4">
                        <button 
                          onClick={(e) => handleSendTeamInvite(e, tl._id, tl.inviteSent)} 
                          disabled={invitingId === tl._id}
                          className={`text-xs font-semibold px-3 py-1 border rounded transition disabled:opacity-50 ${tl.inviteSent ? 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100' : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'}`}
                        >
                          {invitingId === tl._id ? "Sending..." : tl.inviteSent ? "Resend Invite" : "Send Invite"}
                        </button>
                      </div>
                    </div>
                    {expandedId === tl._id && (
                      <div className="ml-5 mt-4 p-4 bg-gray-100 rounded-lg text-sm">
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div><span className="font-semibold text-gray-700">Institute:</span> {getTeamInstitute(tl.participantId) || 'N/A'}</div>
                          <div><span className="font-semibold text-gray-700">Branch:</span> {getTeamBranch(tl.participantId) || 'N/A'}</div>
                          <div><span className="font-semibold text-gray-700">Location:</span> {[getTeamLocation(tl.participantId).city, getTeamLocation(tl.participantId).state, getTeamLocation(tl.participantId).country].filter(Boolean).join(', ') || 'N/A'}</div>
                          <div><span className="font-semibold text-gray-700">Phone:</span> {tl.phone || 'N/A'}</div>
                          <div><span className="font-semibold text-gray-700">Type:</span> Team Leader</div>
                          <div><span className="font-semibold text-gray-700">Event ID:</span> {tl.eventId}</div>
                        </div>
                        
                        {tl.participantId?.members && tl.participantId.members.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <h5 className="font-bold text-gray-700 mb-3">Team Members ({tl.participantId.members.length})</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {tl.participantId.members.map((m, idx) => (
                                <div key={idx} className="bg-white p-3 rounded shadow-sm border border-gray-200">
                                  <p className="font-semibold text-gray-800">{m.name || m.firstName + ' ' + m.lastName} {m.isLeader ? '(Leader)' : ''}</p>
                                  <p className="text-xs text-gray-500 mt-1">{m.email}</p>
                                  <p className="text-xs text-gray-500">{m.phone}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {filteredTeams.length === 0 && <div className="p-4 text-gray-500">No teams match the current filters.</div>}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
