import React, { useState, useEffect, useMemo } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { Search, Mail, CheckCircle2, XCircle, AlertCircle, Eye, Send, Users, UserCheck, AlertTriangle, Filter, X } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

export default function AdminMailingService({ events = [] }) {
  const [loading, setLoading] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  
  // Filters
  const [primaryFilter, setPrimaryFilter] = useState('None');
  const [search, setSearch] = useState('');
  const [activeQuickFilter, setActiveQuickFilter] = useState('');
  
  // Global Selectors
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedTrackId, setSelectedTrackId] = useState('');
  
  // Granular Filters
  const [filterTshirt, setFilterTshirt] = useState('All');
  const [filterPhotos, setFilterPhotos] = useState('All');
  const [filterPayment, setFilterPayment] = useState('All');
  const [filterPreferences, setFilterPreferences] = useState('All');

  // Email Composer
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  
  // UI State
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewParticipantsModalOpen, setPreviewParticipantsModalOpen] = useState(false);
  const [sending, setSending] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Fetch participants when primary filter or global selectors change
  useEffect(() => {
    fetchParticipants();
  }, [primaryFilter, selectedEventId, selectedTrackId]);

  const fetchParticipants = async () => {
    if (primaryFilter === 'None') {
      setParticipants([]);
      return;
    }
    setLoading(true);
    try {
      let url = `${API_BASE}/api/admin/mailing/participants?primaryFilter=${encodeURIComponent(primaryFilter)}`;
      if (selectedEventId) url += `&eventId=${encodeURIComponent(selectedEventId)}`;
      if (selectedTrackId) url += `&trackId=${encodeURIComponent(selectedTrackId)}`;
      
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setParticipants(data.participants || []);
      } else {
        alert("Failed to fetch participants: " + data.message);
      }
    } catch (err) {
      console.error("Error fetching mailing participants", err);
    }
    setLoading(false);
  };

  // Apply Granular Filters & Search
  const filteredParticipants = useMemo(() => {
    return participants.filter(p => {
      // Search
      if (search) {
        const q = search.toLowerCase();
        const matchName = p.leaderName?.toLowerCase()?.includes(q);
        const matchEmail = p.leaderEmail?.toLowerCase()?.includes(q);
        const matchTeam = p.teamName?.toLowerCase()?.includes(q);
        if (!matchName && !matchEmail && !matchTeam) return false;
      }

      // Checkpoints
      if (filterTshirt === 'Provided' && !p.statuses.tShirt) return false;
      if (filterTshirt === 'Not Provided' && p.statuses.tShirt) return false;

      if (filterPhotos === 'Uploaded' && !p.statuses.photos) return false;
      if (filterPhotos === 'Not Uploaded' && p.statuses.photos) return false;

      if (filterPayment === 'Verified' && !p.statuses.payment) return false;
      if (filterPayment === 'Pending' && p.statuses.payment) return false;

      if (filterPreferences === 'Saved' && !p.statuses.preferences) return false;
      if (filterPreferences === 'Not Saved' && p.statuses.preferences) return false;

      return true;
    });
  }, [participants, search, filterTshirt, filterPhotos, filterPayment, filterPreferences]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredParticipants.length / itemsPerPage);
  const paginatedParticipants = filteredParticipants.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1); // Reset page on filter change
  }, [filteredParticipants.length]);

  // Selection Handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = new Set(selectedIds);
      paginatedParticipants.forEach(p => allIds.add(p.id));
      setSelectedIds(allIds);
    } else {
      const newIds = new Set(selectedIds);
      paginatedParticipants.forEach(p => newIds.delete(p.id));
      setSelectedIds(newIds);
    }
  };

  const handleSelectOne = (id, checked) => {
    const newIds = new Set(selectedIds);
    if (checked) newIds.add(id);
    else newIds.delete(id);
    setSelectedIds(newIds);
  };

  const isAllCurrentPageSelected = paginatedParticipants.length > 0 && paginatedParticipants.every(p => selectedIds.has(p.id));

  // Quick Filters
  const applyQuickFilter = (type) => {
    if (activeQuickFilter === type) {
      // Toggle off if double-clicked
      setActiveQuickFilter('');
      setFilterPayment('All');
      setFilterTshirt('All');
      setFilterPhotos('All');
      setFilterPreferences('All');
      return;
    }

    setActiveQuickFilter(type);
    // Reset all to default before applying
    setFilterPayment('All');
    setFilterTshirt('All');
    setFilterPhotos('All');
    setFilterPreferences('All');
    
    if (type === 'pending') {
      setFilterPayment('Pending');
    } else if (type === 'fullyRegistered') {
      setFilterTshirt('Provided');
      setFilterPhotos('Uploaded');
      setFilterPayment('Verified');
      setFilterPreferences('Saved');
    } else if (type === 'missingTshirts') {
      setFilterTshirt('Not Provided');
    } else if (type === 'missingPhotos') {
      setFilterPhotos('Not Uploaded');
    } else if (type === 'missingPrefs') {
      setFilterPreferences('Not Saved');
    }
  };

  // Smart Variable Replacer for Preview (Disabled for simplicity)
  const generatePreview = (template, user) => {
    if (!user) return template;
    return template;
  };

  // Send Email
  const handleSendEmails = async (sendToAllFiltered = false) => {
    let targets = [];
    if (sendToAllFiltered) {
      targets = filteredParticipants;
    } else {
      targets = participants.filter(p => selectedIds.has(p.id));
    }

    if (targets.length === 0) return alert("No participants selected!");
    if (!emailSubject || !emailBody) return alert("Subject and Body are required!");
    if (!confirm(`Are you sure you want to send this email to ${targets.length} participants?`)) return;

    setSending(true);
    try {
      const payload = {
        recipients: targets,
        subject: emailSubject,
        htmlBody: emailBody
      };

      const res = await fetch(`${API_BASE}/api/admin/mailing/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setPreviewModalOpen(false);
      } else {
        alert("Error: " + data.message);
      }
    } catch (err) {
      alert("Network Error while sending emails");
    }
    setSending(false);
  };

  // Status Badge Component
  const StatusBadge = ({ isOk, label, extra }) => (
    <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md border ${isOk ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'} w-max`}>
      {isOk ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
      {extra || label}
    </div>
  );

  return (
    <div className="p-6 md:p-10 w-full animate-fade-in bg-gray-50 min-h-screen">
      <div className="flex items-center gap-3 mb-8">
        <Mail className="text-purple-600" size={32} />
        <div>
          <h2 className="text-3xl font-extrabold text-gray-800 tracking-tight">Mailing Service</h2>
          <p className="text-gray-500 text-sm">Filter participants, draft personalized emails, and send bulk updates.</p>
        </div>
      </div>

      {/* FILTERING SECTION */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-700 flex items-center gap-2"><Search size={18}/> Filters & Segmentation</h3>
          <div className="flex flex-wrap gap-2 justify-end">
             <button onClick={() => applyQuickFilter('pending')} className={`text-xs px-3 py-1.5 rounded-full font-semibold transition border ${activeQuickFilter === 'pending' ? 'bg-orange-500 text-white border-orange-600' : 'bg-orange-100 hover:bg-orange-200 text-orange-700 border-orange-200'}`}>
               Pending Payment
             </button>
             <button onClick={() => applyQuickFilter('missingTshirts')} className={`text-xs px-3 py-1.5 rounded-full font-semibold transition border ${activeQuickFilter === 'missingTshirts' ? 'bg-red-500 text-white border-red-600' : 'bg-red-100 hover:bg-red-200 text-red-700 border-red-200'}`}>
               Missing T-Shirts
             </button>
             <button onClick={() => applyQuickFilter('missingPhotos')} className={`text-xs px-3 py-1.5 rounded-full font-semibold transition border ${activeQuickFilter === 'missingPhotos' ? 'bg-blue-500 text-white border-blue-600' : 'bg-blue-100 hover:bg-blue-200 text-blue-700 border-blue-200'}`}>
               Missing Photos
             </button>
             <button onClick={() => applyQuickFilter('missingPrefs')} className={`text-xs px-3 py-1.5 rounded-full font-semibold transition border ${activeQuickFilter === 'missingPrefs' ? 'bg-yellow-500 text-white border-yellow-600' : 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700 border-yellow-200'}`}>
               No Preferences
             </button>
             <button onClick={() => applyQuickFilter('fullyRegistered')} className={`text-xs px-3 py-1.5 rounded-full font-semibold transition border ${activeQuickFilter === 'fullyRegistered' ? 'bg-green-600 text-white border-green-700' : 'bg-green-100 hover:bg-green-200 text-green-700 border-green-200'}`}>
               Fully Registered
             </button>
          </div>
        </div>
        
        <div className="flex flex-col lg:flex-row gap-4 mb-4">
          <div className="w-full lg:w-1/4 xl:w-1/5">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Event</label>
            <select 
              value={selectedEventId} 
              onChange={e => {
                setSelectedEventId(e.target.value);
                setSelectedTrackId(''); // Reset track on event change
              }} 
              className="w-full border-gray-300 rounded-lg px-3 py-2 bg-gray-50 border focus:ring-2 focus:ring-purple-500 outline-none transition"
            >
              <option value="">All Events</option>
              {events.map(ev => (
                <option key={ev._id} value={ev._id}>{ev.title}</option>
              ))}
            </select>
          </div>
          
          {(() => {
            const hasTracks = selectedEventId && events.find(e => e._id === selectedEventId)?.tracks?.length > 0;
            return (
              <>
                {hasTracks && (
                  <div className="w-full lg:w-1/4 xl:w-1/5">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Track</label>
                    <select 
                      value={selectedTrackId} 
                      onChange={e => setSelectedTrackId(e.target.value)} 
                      className="w-full border-gray-300 rounded-lg px-3 py-2 bg-gray-50 border focus:ring-2 focus:ring-purple-500 outline-none transition"
                    >
                      <option value="">All Tracks</option>
                      {events.find(e => e._id === selectedEventId).tracks.map(t => (
                        <option key={t.id} value={t.id}>{t.title}</option>
                      ))}
                    </select>
                  </div>
                )}
      
                <div className="w-full lg:w-1/4 xl:w-1/5">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Target Group</label>
                  <select value={primaryFilter} onChange={e => setPrimaryFilter(e.target.value)} className="w-full border-gray-300 rounded-lg px-3 py-2 bg-gray-50 border focus:ring-2 focus:ring-purple-500 outline-none transition">
                    <option value="None">None</option>
                    <option value="Saved Shortlisted Teams">Saved Shortlisted Teams</option>
                    <option value="All Students">All Students</option>
                    <option value="Shortlisted Students">Shortlisted Students</option>
                    <option value="Not Shortlisted Students">Not Shortlisted Students</option>
                  </select>
                </div>

                <div className="flex-1 w-full">
                   <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Search</label>
                   <div className="relative">
                     <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                     <input type="text" placeholder="Search by name, email, or team..." value={search} onChange={e => setSearch(e.target.value)} className="w-full border-gray-300 rounded-lg pl-10 pr-4 py-2 bg-white border focus:ring-2 focus:ring-purple-500 outline-none transition" />
                   </div>
                </div>
              </>
            );
          })()}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-gray-100 pt-4">
           <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">T-Shirt Size</label>
            <select value={filterTshirt} onChange={e => { setFilterTshirt(e.target.value); setActiveQuickFilter(''); }} className="w-full border-gray-300 rounded-md px-2 py-1.5 text-sm border focus:ring-1 focus:ring-purple-400 outline-none">
              <option value="All">All</option>
              <option value="Provided">Provided</option>
              <option value="Not Provided">Not Provided</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Payment Status</label>
            <select value={filterPayment} onChange={e => { setFilterPayment(e.target.value); setActiveQuickFilter(''); }} className="w-full border-gray-300 rounded-md px-2 py-1.5 text-sm border focus:ring-1 focus:ring-purple-400 outline-none">
              <option value="All">All</option>
              <option value="Verified">Done / Verified</option>
              <option value="Pending">Pending</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Member Photos</label>
            <select value={filterPhotos} onChange={e => { setFilterPhotos(e.target.value); setActiveQuickFilter(''); }} className="w-full border-gray-300 rounded-md px-2 py-1.5 text-sm border focus:ring-1 focus:ring-purple-400 outline-none">
              <option value="All">All</option>
              <option value="Uploaded">Uploaded</option>
              <option value="Not Uploaded">Not Uploaded</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Preferences</label>
            <select value={filterPreferences} onChange={e => { setFilterPreferences(e.target.value); setActiveQuickFilter(''); }} className="w-full border-gray-300 rounded-md px-2 py-1.5 text-sm border focus:ring-1 focus:ring-purple-400 outline-none">
              <option value="All">All</option>
              <option value="Saved">Saved</option>
              <option value="Not Saved">Not Saved</option>
            </select>
          </div>
        </div>
      </div>

      {/* ACTIVE FILTERS SUMMARY CARD */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-purple-100 mb-6 flex flex-wrap gap-2 items-center">
        <span className="text-sm font-bold text-gray-700 mr-2 flex items-center gap-1"><Filter size={16}/> Active Configuration:</span>
        
        {selectedEventId ? (
          <span className="bg-purple-50 text-purple-700 border border-purple-200 text-xs px-2 py-1 rounded-md font-semibold flex items-center gap-1 group">
            Event: {events.find(e => e._id === selectedEventId)?.title || selectedEventId}
            <X size={12} className="cursor-pointer opacity-50 hover:opacity-100" onClick={() => {setSelectedEventId(''); setSelectedTrackId('');}}/>
          </span>
        ) : (
          <span className="bg-gray-100 text-gray-500 border border-gray-200 text-xs px-2 py-1 rounded-md font-medium">Event: All</span>
        )}

        {selectedTrackId && (
          <span className="bg-purple-50 text-purple-700 border border-purple-200 text-xs px-2 py-1 rounded-md font-semibold flex items-center gap-1 group">
            Track: {events.find(e => e._id === selectedEventId)?.tracks?.find(t => t.id === selectedTrackId)?.title || selectedTrackId}
            <X size={12} className="cursor-pointer opacity-50 hover:opacity-100" onClick={() => setSelectedTrackId('')}/>
          </span>
        )}

        {primaryFilter !== 'None' && (
          <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs px-2 py-1 rounded-md font-semibold flex items-center gap-1 group">
            Target Group: {primaryFilter}
            <X size={12} className="cursor-pointer opacity-50 hover:opacity-100" onClick={() => setPrimaryFilter('None')}/>
          </span>
        )}

        {filterTshirt !== 'All' && (
           <span className="bg-red-50 text-red-700 border border-red-200 text-xs px-2 py-1 rounded-md font-semibold flex items-center gap-1 group">
             T-Shirt: {filterTshirt}
             <X size={12} className="cursor-pointer opacity-50 hover:opacity-100" onClick={() => {setFilterTshirt('All'); setActiveQuickFilter('');}}/>
           </span>
        )}
        
        {filterPayment !== 'All' && (
           <span className="bg-orange-50 text-orange-700 border border-orange-200 text-xs px-2 py-1 rounded-md font-semibold flex items-center gap-1 group">
             Payment: {filterPayment}
             <X size={12} className="cursor-pointer opacity-50 hover:opacity-100" onClick={() => {setFilterPayment('All'); setActiveQuickFilter('');}}/>
           </span>
        )}

        {filterPhotos !== 'All' && (
           <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2 py-1 rounded-md font-semibold flex items-center gap-1 group">
             Photos: {filterPhotos}
             <X size={12} className="cursor-pointer opacity-50 hover:opacity-100" onClick={() => {setFilterPhotos('All'); setActiveQuickFilter('');}}/>
           </span>
        )}

        {filterPreferences !== 'All' && (
           <span className="bg-yellow-50 text-yellow-700 border border-yellow-200 text-xs px-2 py-1 rounded-md font-semibold flex items-center gap-1 group">
             Preferences: {filterPreferences}
             <X size={12} className="cursor-pointer opacity-50 hover:opacity-100" onClick={() => {setFilterPreferences('All'); setActiveQuickFilter('');}}/>
           </span>
        )}

        {primaryFilter === 'None' && !selectedEventId && filterTshirt === 'All' && filterPayment === 'All' && filterPhotos === 'All' && filterPreferences === 'All' && (
           <span className="text-gray-400 text-xs italic">No filters applied. Data will not load until Target Group is selected.</span>
        )}
      </div>

      {/* DATA TABLE SECTION */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 mb-6 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Users className="text-gray-500" size={18} />
            <span className="font-semibold text-gray-700">Participants List</span>
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-bold">{filteredParticipants.length} matching</span>
          </div>
          <div className="text-sm font-semibold text-purple-700 bg-purple-50 px-3 py-1 rounded-lg border border-purple-200">
            {selectedIds.size} Selected
          </div>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          {loading ? (
            <div className="w-full">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex animate-pulse border-b border-gray-100 p-4 gap-4 items-center">
                  <div className="w-4 h-4 bg-gray-200 rounded flex-shrink-0"></div>
                  <div className="w-1/4">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                  <div className="w-1/5">
                    <div className="h-5 bg-gray-200 rounded w-20"></div>
                  </div>
                  <div className="flex-1 flex justify-between px-4">
                    <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
                    <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
                    <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
                    <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : primaryFilter === 'None' ? (
             <div className="p-20 text-center text-gray-500 flex flex-col items-center">
               <AlertCircle size={40} className="mb-2 text-gray-300" />
               <p className="font-semibold text-gray-600">No Target Group Selected</p>
               <p className="text-sm mt-1">Please select a Target Group and Event to load participants.</p>
             </div>
          ) : filteredParticipants.length === 0 ? (
             <div className="p-20 text-center text-gray-500 flex flex-col items-center">
               <AlertCircle size={40} className="mb-2 text-gray-300" />
               <p>No participants match your filters.</p>
             </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-600">
                  <th className="p-3 w-10 text-center">
                    <input type="checkbox" checked={isAllCurrentPageSelected} onChange={handleSelectAll} className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 cursor-pointer" />
                  </th>
                  <th className="p-3 font-semibold">Participant</th>
                  <th className="p-3 font-semibold">Team Name</th>
                  <th className="p-3 font-semibold text-center">T-Shirt</th>
                  <th className="p-3 font-semibold text-center">Payment</th>
                  <th className="p-3 font-semibold text-center">Photos</th>
                  <th className="p-3 font-semibold text-center">Prefs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedParticipants.map(p => {
                   const s = p.statuses || {};
                   // Generate tshirt display string
                   const tshirtStr = s.tShirtSizes && Object.values(s.tShirtSizes).length > 0 
                                     ? Object.values(s.tShirtSizes).join(", ") 
                                     : (s.tShirt ? 'OK' : 'Missing');

                   return (
                  <tr key={p.id} className={`hover:bg-purple-50/50 transition cursor-pointer ${selectedIds.has(p.id) ? 'bg-purple-50/40' : ''}`} onClick={() => handleSelectOne(p.id, !selectedIds.has(p.id))}>
                    <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.has(p.id)} onChange={e => handleSelectOne(p.id, e.target.checked)} className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 cursor-pointer" />
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-gray-800 text-sm">{p.leaderName}</div>
                      <div className="text-xs text-gray-500">{p.leaderEmail}</div>
                    </td>
                    <td className="p-3">
                      <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded font-medium border border-gray-200">{p.teamName}</span>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-center">
                         <StatusBadge isOk={s.tShirt} label="T-Shirt" extra={s.tShirt ? tshirtStr : 'Missing'} />
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-center">
                         <StatusBadge isOk={s.payment} label="Payment" />
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-center">
                        <StatusBadge isOk={s.photos} label="Photos" />
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-center">
                        <StatusBadge isOk={s.preferences} label="Prefs" />
                      </div>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 flex justify-between items-center bg-gray-50">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition">Previous</button>
            <span className="text-sm font-semibold text-gray-600">Page {currentPage} of {totalPages}</span>
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition">Next</button>
          </div>
        )}
      </div>

      {/* EMAIL COMPOSER SECTION */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-8 relative">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><Send size={20} className="text-purple-600"/> Compose Email</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-bold text-gray-700 mb-1">Subject</label>
          <input 
            type="text" 
            placeholder="Important Update: Action Required"
            value={emailSubject}
            onChange={e => setEmailSubject(e.target.value)}
            className="w-full border-gray-300 rounded-lg px-4 py-3 bg-gray-50 border focus:ring-2 focus:ring-purple-500 outline-none transition font-medium" 
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-bold text-gray-700 mb-1">Message Body</label>
          <div className="bg-white rounded-lg overflow-hidden border border-gray-300 focus-within:ring-2 focus-within:ring-purple-500 transition">
             <ReactQuill 
                theme="snow" 
                value={emailBody} 
                onChange={setEmailBody} 
                className="h-64 mb-10"
                placeholder="Draft your personalized email here..."
             />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-gray-100">
          <button 
            onClick={() => setPreviewParticipantsModalOpen(true)}
            disabled={selectedIds.size === 0}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white border-2 border-gray-200 hover:border-gray-300 text-gray-700 font-bold rounded-xl transition disabled:opacity-50"
          >
            <Users size={18} /> Preview Participants
          </button>

          <button 
            onClick={() => setPreviewModalOpen(true)}
            disabled={!emailSubject || !emailBody}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white border-2 border-gray-200 hover:border-gray-300 text-gray-700 font-bold rounded-xl transition disabled:opacity-50"
          >
            <Eye size={18} /> Preview Email
          </button>
          
          <button 
            onClick={() => handleSendEmails(false)}
            disabled={sending || selectedIds.size === 0}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition disabled:opacity-50"
          >
            {sending ? 'Sending...' : `Send to Selected (${selectedIds.size})`}
          </button>
          
          <button 
            onClick={() => handleSendEmails(true)}
            disabled={sending || filteredParticipants.length === 0}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-900 hover:bg-indigo-950 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition disabled:opacity-50"
          >
            {sending ? 'Sending...' : `Send to All Filtered (${filteredParticipants.length})`}
          </button>
        </div>
      </div>

      {/* PREVIEW MODAL */}
      {previewModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[95vh] animate-scale-in">
             <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-2xl">
               <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Eye size={22} className="text-purple-600"/> Email Preview Simulator</h3>
               <button onClick={() => setPreviewModalOpen(false)} className="text-gray-400 hover:text-gray-800 transition"><XCircle size={28}/></button>
             </div>
             
             <div className="p-6 overflow-y-auto bg-gray-100 flex-1 flex flex-col gap-4">
               <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-sm text-blue-900 flex gap-3 items-start shadow-sm">
                  <UserCheck size={20} className="shrink-0 mt-0.5 text-blue-600" />
                  <p>This is a live preview using data from the <strong>first selected user</strong> (or first filtered user if none selected). Notice how the Smart Variables have been automatically replaced.</p>
               </div>
               
               {(() => {
                 let previewUser = participants.find(p => selectedIds.has(p.id)) || filteredParticipants[0];
                 
                 return previewUser ? (
                   <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-md">
                      <div className="bg-white p-5 border-b border-gray-200">
                        <div className="flex mb-2">
                           <div className="w-20 text-gray-400 font-semibold text-sm">To:</div>
                           <div className="text-gray-800 font-medium text-sm">{previewUser.leaderName} &lt;{previewUser.leaderEmail}&gt;</div>
                        </div>
                        <div className="flex">
                           <div className="w-20 text-gray-400 font-semibold text-sm">Subject:</div>
                           <div className="text-gray-900 font-bold text-sm">{generatePreview(emailSubject, previewUser)}</div>
                        </div>
                      </div>
                      <div className="p-8 bg-white min-h-[300px] prose prose-purple max-w-none text-gray-800" dangerouslySetInnerHTML={{ __html: generatePreview(emailBody, previewUser) }} />
                   </div>
                 ) : (
                   <div className="text-center text-gray-500 py-20 bg-white rounded-xl border border-dashed border-gray-300">
                     No users available for preview.
                   </div>
                 )
               })()}
             </div>

             <div className="p-5 border-t border-gray-200 flex justify-end bg-gray-50 rounded-b-2xl">
               <button onClick={() => setPreviewModalOpen(false)} className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl transition">Close</button>
             </div>
           </div>
        </div>
      )}

      {/* PREVIEW PARTICIPANTS MODAL */}
      {previewParticipantsModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] animate-scale-in">
             <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-2xl">
               <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Users size={22} className="text-purple-600"/> Selected Participants ({selectedIds.size})</h3>
               <button onClick={() => setPreviewParticipantsModalOpen(false)} className="text-gray-400 hover:text-gray-800 transition"><XCircle size={28}/></button>
             </div>
             
             <div className="p-0 overflow-y-auto flex-1">
               <ul className="divide-y divide-gray-100">
                 {participants.filter(p => selectedIds.has(p.id)).map(p => (
                   <li key={p.id} className="p-4 hover:bg-gray-50 flex flex-col">
                     <span className="font-bold text-gray-800">{p.leaderName}</span>
                     <span className="text-sm text-gray-500">{p.leaderEmail} • {p.teamName}</span>
                   </li>
                 ))}
                 {selectedIds.size === 0 && (
                   <li className="p-10 text-center text-gray-500 italic">No participants selected.</li>
                 )}
               </ul>
             </div>
             
             <div className="p-5 border-t border-gray-200 flex justify-end bg-gray-50 rounded-b-2xl">
               <button onClick={() => setPreviewParticipantsModalOpen(false)} className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition shadow-md">Awesome</button>
             </div>
           </div>
        </div>
      )}
    </div>
  );
}
