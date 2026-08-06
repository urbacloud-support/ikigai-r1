import React, { useState, useEffect, useMemo } from "react";

const API_BASE = import.meta.env.VITE_API_BASE;

export default function AdminCloseRegistration() {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [filterPayment, setFilterPayment] = useState("all"); // 'all', 'paid', 'unpaid'
  const [filterStatus, setFilterStatus] = useState("all"); // 'all', 'disabled', 'active'
  const [searchTeam, setSearchTeam] = useState("");
  
  const [disableTime, setDisableTime] = useState("");
  const [disableMessage, setDisableMessage] = useState("Registration window is now closed!");
  
  // Track selected IDs for disabled logic
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Minimum time for datetime-local (current local time)
  const [minDateTime, setMinDateTime] = useState("");

  useEffect(() => {
    // Set min datetime to current local time, e.g. YYYY-MM-DDThh:mm
    const now = new Date();
    // adjust for local timezone offset
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setMinDateTime(now.toISOString().slice(0, 16));
  }, []);

  const fetchLeaders = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/close-registration/list`);
      const data = await res.json();
      if (data.success) {
        setLeaders(data.leaders);
        
        // Initialize selection based on current disable status
        const initialSelected = new Set();
        let anyTime = "";
        let anyMsg = "Registration window is now closed!";
        
        data.leaders.forEach(l => {
          if (l.disableLoginAfter) {
            initialSelected.add(l._id);
            if (!anyTime) {
              const dt = new Date(l.disableLoginAfter);
              // adjust for local timezone offset before slicing
              dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
              anyTime = dt.toISOString().slice(0, 16); 
            }
            if (l.disableLoginMessage) anyMsg = l.disableLoginMessage;
          }
        });
        
        setSelectedIds(initialSelected);
        if (anyTime) setDisableTime(anyTime);
        if (anyMsg) setDisableMessage(anyMsg);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to fetch team leaders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaders();
  }, []);

  const filteredLeaders = useMemo(() => {
    const filtered = leaders.filter(l => {
      // Payment filter
      if (filterPayment === "paid" && !l.hasPaid) return false;
      if (filterPayment === "unpaid" && l.hasPaid) return false;
      
      // Status filter
      const isDisabled = selectedIds.has(l._id);
      if (filterStatus === "disabled" && !isDisabled) return false;
      if (filterStatus === "active" && isDisabled) return false;
      
      // Team name filter
      if (searchTeam.trim() !== "") {
        const tName = l.teamName ? l.teamName.toLowerCase() : "";
        if (!tName.includes(searchTeam.toLowerCase())) {
          return false;
        }
      }
      
      return true;
    });

    // Sort selected items to the top
    return filtered.sort((a, b) => {
      const aSel = selectedIds.has(a._id) ? 1 : 0;
      const bSel = selectedIds.has(b._id) ? 1 : 0;
      return bSel - aSel;
    });
  }, [leaders, filterPayment, filterStatus, searchTeam, selectedIds]);

  const toggleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };
  
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredLeaders.length) {
      // Unselect all currently visible
      const next = new Set(selectedIds);
      filteredLeaders.forEach(l => next.delete(l._id));
      setSelectedIds(next);
    } else {
      // Select all currently visible
      const next = new Set(selectedIds);
      filteredLeaders.forEach(l => next.add(l._id));
      setSelectedIds(next);
    }
  };

  const handleUpdate = async () => {
    let finalTime = disableTime;
    
    if (!finalTime && selectedIds.size > 0) {
      if (!window.confirm("No cutoff time selected. This will disable login IMMEDIATELY for selected teams. Continue?")) {
        return;
      }
      // Set to current time for DB
      finalTime = new Date().toISOString();
    } else if (finalTime) {
      finalTime = new Date(finalTime).toISOString();
    }
    
    setSaving(true);
    
    const updates = leaders.map(l => ({
      id: l._id,
      disabled: selectedIds.has(l._id)
    }));

    try {
      const res = await fetch(`${API_BASE}/api/admin/close-registration/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates,
          disableTime: finalTime,
          disableMessage
        })
      });
      const data = await res.json();
      if (data.success) {
        alert("Registration control updated successfully!");
        fetchLeaders();
      } else {
        alert(data.message || "Failed to update");
      }
    } catch (err) {
      console.error(err);
      alert("Error updating");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading leaders...</div>;
  }

  const allVisibleSelected = filteredLeaders.length > 0 && filteredLeaders.every(l => selectedIds.has(l._id));

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Close Registration</h1>
          <p className="text-gray-500 text-sm mt-1">Select teams to disable login for Round 2.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-bold mb-4">Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Disable Login After (Time)</label>
            <input 
              type="datetime-local" 
              min={minDateTime}
              value={disableTime}
              onChange={e => setDisableTime(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-green-500 focus:border-green-500"
            />
            <p className="text-xs text-gray-500 mt-1">Leave empty to disable immediately upon selection.</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Alert Message</label>
            <input 
              type="text" 
              value={disableMessage}
              onChange={e => setDisableMessage(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-green-500 focus:border-green-500"
              placeholder="e.g. Registration window is now closed!"
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button 
            onClick={handleUpdate}
            disabled={saving}
            className={`px-6 py-2 rounded-lg font-bold text-white shadow-sm transition-colors ${
              saving ? 'bg-green-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {saving ? 'Saving...' : 'Update Access Settings'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <h3 className="font-bold text-gray-700 whitespace-nowrap">Team Leaders ({filteredLeaders.length})</h3>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <input
              type="text"
              placeholder="Search by Team Name..."
              value={searchTeam}
              onChange={(e) => setSearchTeam(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm font-medium w-full sm:w-48 focus:ring-green-500 focus:border-green-500"
            />
            
            <select 
              className="border border-gray-300 rounded px-3 py-1.5 text-sm font-medium w-full sm:w-auto focus:ring-green-500 focus:border-green-500"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="all">Status: All</option>
              <option value="disabled">Status: Disabled Only</option>
              <option value="active">Status: Active Only</option>
            </select>
            
            <select 
              className="border border-gray-300 rounded px-3 py-1.5 text-sm font-medium w-full sm:w-auto focus:ring-green-500 focus:border-green-500"
              value={filterPayment}
              onChange={e => setFilterPayment(e.target.value)}
            >
              <option value="all">Payment: All</option>
              <option value="paid">Payment: Paid Only</option>
              <option value="unpaid">Payment: Unpaid Only</option>
            </select>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-600 uppercase bg-gray-100/50 border-b">
              <tr>
                <th className="px-4 py-3 w-16 text-center">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 text-green-600 rounded cursor-pointer focus:ring-green-500"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-4 py-3">Team Name</th>
                <th className="px-4 py-3">Leader Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeaders.map((l, i) => (
                <tr key={l._id} className="border-b hover:bg-gray-50/50">
                  <td className="px-4 py-3 text-center">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 text-green-600 rounded cursor-pointer focus:ring-green-500"
                      checked={selectedIds.has(l._id)}
                      onChange={() => toggleSelect(l._id)}
                    />
                  </td>
                  <td className="px-4 py-3 font-medium">{l.teamName || '—'}</td>
                  <td className="px-4 py-3">{l.name}</td>
                  <td className="px-4 py-3 text-gray-600">{l.email}</td>
                  <td className="px-4 py-3">
                    {l.hasPaid ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">Paid</span>
                    ) : (
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">Unpaid</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {selectedIds.has(l._id) ? (
                      <span className="text-orange-600 font-bold text-xs uppercase">Disabled</span>
                    ) : (
                      <span className="text-gray-400 font-bold text-xs uppercase">Active</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredLeaders.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                    No team leaders match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
