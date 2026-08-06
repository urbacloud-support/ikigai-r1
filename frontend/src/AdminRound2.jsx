import React, { useState, useEffect, useMemo, useRef } from "react";
import { ExternalLink, Check, Mail, Eye, X, Unlock, Copy, Filter, Phone, MapPin, Building2, ChevronDown, FileText, Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ikigaiLogo from "./assets/ikigai.png";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

const cleanLocation = (loc) => {
  if (!loc) return "";
  const parts = loc.split(',').map(p => p.trim());
  if (parts.length > 2) {
    return `${parts[0]}, ${parts[1]}`;
  }
  return loc.trim();
};

const CustomSelect = ({ value, onChange, options, placeholder, width = "200px" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={dropdownRef} style={{ width }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-11 flex items-center justify-between bg-white border border-gray-300 hover:border-purple-400 px-4 rounded-xl text-sm font-medium text-gray-700 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-purple-500/20 text-left"
      >
        <span className="truncate pr-4">{value === "All" ? placeholder : (options.find(o => o.value === value)?.label || value)}</span>
        <ChevronDown size={16} className={`text-gray-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute z-50 mt-1 min-w-full w-max max-w-[250px] sm:max-w-[400px] right-0 md:right-auto bg-white border border-gray-100 rounded-xl shadow-lg max-h-60 overflow-y-auto overflow-x-hidden py-1">
          {options.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => { onChange(opt.value); setIsOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-sm transition flex items-start justify-between gap-2 ${value === opt.value ? 'bg-purple-50 text-purple-700 font-bold' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              <span className="whitespace-normal break-words">{opt.label}</span>
              {value === opt.value && <Check size={14} className="text-purple-600 shrink-0 mt-0.5" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const TeamCard = ({ team, isExpanded, onToggleExpand, handleUpdateStatus, handleToggleReopen, handleCopy, copiedId }) => {
  const displayStatus = (team.status === "Pending" && (!team.transactionId || !team.receiptUrl)) ? "Payment Pending" : team.status;
  const open = isExpanded;

  const leader = team.members?.find(m => m.isLeader) || team.members?.[0];
  const allMembers = team.members || [];
  
  const trackSaved = team.trackPreferences && team.trackPreferences.length > 0;
  const paymentDone = !!(team.transactionId && team.receiptUrl);
  const tshirtSaved = team.tshirtSizes && Object.keys(team.tshirtSizes).length > 0 && allMembers.every(m => team.tshirtSizes[m.email]);
  const imagesUploaded = allMembers.length > 0 && allMembers.every(m => m.photoUrl);

  return (
    <div className="relative w-full h-full min-h-[300px]">
      <div 
        className={`bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col transition-all duration-300 ${
          open 
            ? 'absolute top-[-2%] left-[-2%] sm:left-[-5%] w-[104%] sm:w-[110%] shadow-2xl shadow-purple-500/20 border-purple-400 z-50' 
            : 'relative w-full h-full hover:shadow-md z-10'
        }`}
      >
        <div 
          className={`p-5 border-b border-gray-100 flex-1 cursor-pointer transition ${open ? 'bg-purple-50/50' : 'hover:bg-gray-50'}`}
          onClick={onToggleExpand}
        >
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="text-lg font-bold text-gray-900">{team.teamName}</h3>
              {team.updatedAt && <p className="text-[10px] text-gray-500 mt-0.5 font-medium">Submitted: {new Date(team.updatedAt).toLocaleString()}</p>}
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              displayStatus === "Approved" ? "bg-green-100 text-green-700" :
              displayStatus === "Payment Pending" ? "bg-blue-100 text-blue-700" :
              displayStatus === "Pending" ? "bg-amber-100 text-amber-700" :
              "bg-gray-100 text-gray-700"
            }`}>{displayStatus}</span>
          </div>
          
          <div className="flex flex-col gap-1.5 text-sm text-gray-600 mb-4">
            <div className="font-semibold text-gray-800">{leader ? leader.name : "N/A"} <span className="text-xs font-normal text-gray-500">(Leader)</span></div>
            <div className="flex items-center gap-2"><Mail size={14} className="text-gray-400 shrink-0" /> <a href={`mailto:${team.leaderEmail}`} className="hover:text-purple-600 truncate" onClick={(e) => e.stopPropagation()}>{team.leaderEmail}</a></div>
            {leader?.organisation && <div className="flex items-center gap-2"><Building2 size={14} className="text-gray-400 shrink-0" /> <span className="truncate">{leader.organisation}</span></div>}
            {leader?.location && <div className="flex items-center gap-2"><MapPin size={14} className="text-gray-400 shrink-0" /> <span className="truncate">{cleanLocation(leader.location)}</span></div>}
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Registration Checkpoints</p>
            <div className="grid grid-cols-2 gap-3 text-xs font-medium">
              <div className="flex items-center gap-2">
                {trackSaved ? <Check size={16} className="text-green-600 bg-green-100 p-0.5 rounded-full" /> : <X size={16} className="text-red-500 bg-red-100 p-0.5 rounded-full" />}
                <span className={trackSaved ? "text-gray-700" : "text-gray-500"}>Track Preference</span>
              </div>
              <div className="flex items-center gap-2">
                {paymentDone ? <Check size={16} className="text-green-600 bg-green-100 p-0.5 rounded-full" /> : <X size={16} className="text-red-500 bg-red-100 p-0.5 rounded-full" />}
                <span className={paymentDone ? "text-gray-700" : "text-gray-500"}>Payment Done</span>
              </div>
              <div className="flex items-center gap-2">
                {tshirtSaved ? <Check size={16} className="text-green-600 bg-green-100 p-0.5 rounded-full" /> : <X size={16} className="text-red-500 bg-red-100 p-0.5 rounded-full" />}
                <span className={tshirtSaved ? "text-gray-700" : "text-gray-500"}>T-Shirt Sizes</span>
              </div>
              <div className="flex items-center gap-2">
                {imagesUploaded ? <Check size={16} className="text-green-600 bg-green-100 p-0.5 rounded-full" /> : <X size={16} className="text-red-500 bg-red-100 p-0.5 rounded-full" />}
                <span className={imagesUploaded ? "text-gray-700" : "text-gray-500"}>Member Photos</span>
              </div>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-100">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Payment Details</h4>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-800 font-mono bg-gray-50 px-2 py-1 rounded border border-gray-200">{team.transactionId || "None"}</p>
                {team.transactionId && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleCopy(team._id, team.transactionId); }}
                    className={`p-1.5 rounded-md transition ${copiedId === team._id ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-purple-600'}`}
                    title="Copy Transaction ID"
                  >
                    {copiedId === team._id ? <Check size={14} strokeWidth={3} /> : <Copy size={14} />}
                  </button>
                )}
              </div>
              {team.receiptUrl && (
                <a 
                  href={team.receiptUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1.5 text-xs font-bold text-purple-600 hover:text-purple-800 transition px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 border border-purple-200"
                >
                  <Eye size={14} /> Receipt
                </a>
              )}
            </div>
          </div>
        </div>

        {open && (
          <div className="p-5 bg-gray-50/50 border-b border-gray-100">
             
             {/* Preferences */}
             <div className="mb-5">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Track Preferences</h4>
                {team.trackPreferences && team.trackPreferences.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    {team.trackPreferences.map((pref, idx) => (
                      <div key={idx} className="text-sm text-gray-700 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                        {pref}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Not saved yet.</p>
                )}
             </div>

             {/* Team Members */}
             <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Team Members</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {allMembers.map((m, i) => (
                    <div key={i} className="bg-white p-3 rounded-xl border border-gray-200 flex items-center gap-3">
                      {m.photoUrl ? (
                        <img src={m.photoUrl} alt={m.name} className="w-12 h-12 rounded-full object-cover border border-gray-200" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-xs font-bold">No Pic</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-800 truncate">{m.name} {m.isLeader && <span className="text-[10px] text-purple-600 bg-purple-50 px-1 py-0.5 rounded">(Leader)</span>}</p>
                        <p className="text-xs text-gray-500 truncate">{m.email}</p>
                        <p className="text-xs font-medium text-gray-600 mt-0.5">T-Shirt: <span className="text-gray-900 font-bold">{team.tshirtSizes?.[m.email] || "N/A"}</span></p>
                      </div>
                    </div>
                  ))}
                </div>
             </div>
          </div>
        )}
        
        <div className="bg-white p-4 flex items-center justify-end gap-2 border-t border-gray-100 rounded-b-2xl">
          <div className="flex items-center gap-2">
            {team.status === "Pending" && (
              <>
                <button 
                  onClick={() => handleUpdateStatus(team._id, "Contact")}
                  className="flex items-center gap-1.5 text-sm font-bold bg-red-100 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-200 transition"
                  title="Contact Team / Action Required"
                >
                  <X size={16} /> Contact
                </button>
                <button 
                  onClick={() => handleUpdateStatus(team._id, "Approved")}
                  className="flex items-center gap-1.5 text-sm font-bold bg-green-100 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-200 transition"
                  title="Verify Registration"
                >
                  <Check size={16} /> Approve
                </button>
              </>
            )}
            {team.status === "Contact" && (
              <>
                {team.reopenAccess?.open ? (
                  <span 
                    className="flex items-center gap-1.5 text-sm font-bold bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg"
                    title="Form is currently open for the team to edit"
                  >
                    <Unlock size={16} /> Form Open
                  </span>
                ) : (
                  <button 
                    onClick={() => handleToggleReopen(team)}
                    className="flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-lg transition bg-blue-100 text-blue-700 hover:bg-blue-200"
                    title="Re-open Registration Form"
                  >
                    <Unlock size={16} /> Re-open
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function AdminRound2() {
  const [activeTrack, setActiveTrack] = useState("All");
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tracksCount, setTracksCount] = useState({});
  const [copiedId, setCopiedId] = useState(null);
  const [expandedTeamId, setExpandedTeamId] = useState(null);
  
  // Filtering States
  const [filterCollege, setFilterCollege] = useState("All");
  const [filterLocation, setFilterLocation] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterCheckpoint, setFilterCheckpoint] = useState("All");
  const [filterSort, setFilterSort] = useState("Newest First");
  
  // Report Builder State
  const [showReportBuilder, setShowReportBuilder] = useState(false);
  const [reportConfig, setReportConfig] = useState({
    onlyLeader: false,
    memberPhoto: true,
    memberInstitute: true,
    memberLocation: true,
    memberTshirt: true,
    preferences: true,
    transactionId: true,
    receiptUrl: true,
  });

  const [isGenerating, setIsGenerating] = useState(false);

  const startPDFGeneration = () => {
    setIsGenerating(true);
    setTimeout(() => {
      try {
        generatePDF();
      } catch (e) {
        console.error("Error generating PDF:", e);
        alert("Failed to generate PDF. Please try again.");
      } finally {
        setIsGenerating(false);
      }
    }, 100);
  };

  const generatePDF = () => {
    const doc = new jsPDF("landscape");
    
    // Header
    doc.addImage(ikigaiLogo, "PNG", 14, 10, 30, 15);
    doc.setFontSize(16);
    doc.setTextColor(40);
    doc.text("Round 2 Registration Report", 50, 18);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US');
    doc.text(`Generated on: ${dateStr} at ${timeStr}`, 50, 24);

    // Columns
    const head = [["S. No.", "Team Name"]];
    if (reportConfig.memberPhoto) head[0].push("Photo URL");
    head[0].push("Member Name");
    if (reportConfig.memberInstitute) head[0].push("Institute");
    if (reportConfig.memberLocation) head[0].push("Location");
    if (reportConfig.memberTshirt) head[0].push("T-Shirt");
    if (reportConfig.preferences) head[0].push("Preferences");
    if (reportConfig.transactionId) head[0].push("Txn ID");
    if (reportConfig.receiptUrl) head[0].push("Receipt");

    // Rows
    const body = [];
    filtered.forEach((team, tIdx) => {
      let members = team.members || [];
      if (reportConfig.onlyLeader) {
        members = [members.find(m => m.isLeader) || members[0]].filter(Boolean);
      }
      
      members.forEach((m, mIdx) => {
        const row = [];
        row.isTeamStart = (mIdx === 0);

        if (mIdx === 0) {
          row.push({ content: tIdx + 1, rowSpan: members.length, styles: { valign: 'middle', halign: 'center' } });
          row.push({ content: team.teamName, rowSpan: members.length, styles: { valign: 'middle', fontStyle: 'bold' } });
        }

        if (reportConfig.memberPhoto) {
          row.push(m.photoUrl ? { content: 'View Photo', styles: { textColor: [0, 0, 255], valign: 'middle' }, url: m.photoUrl } : { content: "N/A", styles: { valign: 'middle' } });
        }
        
        row.push({ content: m.name + (m.isLeader ? " (Leader)" : ""), styles: { valign: 'middle' } });
        
        if (reportConfig.memberInstitute) row.push({ content: m.organisation || "", styles: { valign: 'middle' } });
        if (reportConfig.memberLocation) row.push({ content: cleanLocation(m.location) || "", styles: { valign: 'middle' } });
        if (reportConfig.memberTshirt) row.push({ content: team.tshirtSizes?.[m.email] || "N/A", styles: { valign: 'middle', halign: 'center' } });
        
        if (reportConfig.preferences) {
          if (mIdx === 0) {
            row.push({ content: team.trackPreferences?.join(", ") || "N/A", rowSpan: members.length, styles: { valign: 'middle' } });
          }
        }
        
        if (reportConfig.transactionId) {
          if (mIdx === 0) {
            row.push({ content: team.transactionId || "N/A", rowSpan: members.length, styles: { valign: 'middle' } });
          }
        }
        
        if (reportConfig.receiptUrl) {
          if (mIdx === 0) {
            row.push(team.receiptUrl ? { content: 'View Receipt', rowSpan: members.length, styles: { textColor: [0, 0, 255], valign: 'middle' }, url: team.receiptUrl } : { content: "N/A", rowSpan: members.length, styles: { valign: 'middle' } });
          }
        }

        body.push(row);
      });
    });

    autoTable(doc, {
      startY: 35,
      head: head,
      body: body,
      theme: 'grid',
      headStyles: { fillColor: [147, 51, 234], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
      didDrawCell: (data) => {
        if (data.section === 'body') {
          if (data.row.raw.isTeamStart) {
            doc.setLineWidth(0.6);
            doc.setDrawColor(120, 120, 120);
            doc.line(data.cell.x, data.cell.y, data.cell.x + data.cell.width, data.cell.y);
          }
          if (data.cell.raw && typeof data.cell.raw === 'object' && data.cell.raw.url) {
            doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url: data.cell.raw.url });
          }
        }
      }
    });

    doc.save("Round2_Registration_Report.pdf");
    setShowReportBuilder(false);
  };

  const handleCopy = (id, text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Reopen Form Logic
  const handleToggleReopen = async (team) => {
    const isCurrentlyOpen = team.reopenAccess?.open;
    const confirmMessage = isCurrentlyOpen 
      ? "Are you sure you want to CLOSE the registration form for this team?" 
      : "Are you sure you want to RE-OPEN the entire registration form for this team?";
      
    if (!window.confirm(confirmMessage)) return;

    try {
      const res = await fetch(`${API_BASE}/api/round2/admin/${team._id}/reopen`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ open: !isCurrentlyOpen })
      });
      if (res.ok) {
        fetchRegistrations();
      } else {
        const data = await res.json();
        alert(data.message || "Failed to update form access");
      }
    } catch (err) {
      console.error(err);
      alert("Network Error");
    }
  };

  const fetchRegistrations = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/round2/admin`);
      const data = await res.json();
      if (data.success) {
        setRegistrations(data.registrations);
        
        // Calculate counts based on first preference
        const counts = { "All": data.registrations.length };
        data.registrations.forEach(reg => {
          if (reg.trackPreferences && reg.trackPreferences.length > 0) {
            const topTrack = reg.trackPreferences[0];
            counts[topTrack] = (counts[topTrack] || 0) + 1;
          }
        });
        setTracksCount(counts);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const updateStatus = async (id, status) => {
    try {
      const res = await fetch(`${API_BASE}/api/round2/admin/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (res.ok) fetchRegistrations();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateStatus = (id, status) => {
    const isApproved = status === "Approved";
    if (window.confirm(isApproved ? "Are you sure you want to verify and approve this registration?" : "Are you sure you want to flag this registration for contact?")) {
      updateStatus(id, status);
    }
  };



  const { filtered, uniqueColleges, uniqueLocations } = useMemo(() => {
    let list = activeTrack === "All" ? registrations : registrations.filter(r => r.trackPreferences?.[0] === activeTrack);
    
    // Extract unique colleges and locations for the dropdowns based on the current track (or all tracks)
    const colleges = new Set();
    const locations = new Set();
    
    list.forEach(team => {
      // Find the leader's data, or the first member's data
      const leader = team.members?.find(m => m.isLeader) || team.members?.[0];
      if (leader?.organisation) colleges.add(leader.organisation);
      if (leader?.location) locations.add(cleanLocation(leader.location));
    });

    if (filterCollege !== "All") {
      list = list.filter(team => {
        const leader = team.members?.find(m => m.isLeader) || team.members?.[0];
        return leader?.organisation === filterCollege;
      });
    }
    
    if (filterLocation !== "All") {
      list = list.filter(team => {
        const leader = team.members?.find(m => m.isLeader) || team.members?.[0];
        return leader?.location && cleanLocation(leader.location) === filterLocation;
      });
    }
    
    if (filterStatus !== "All") {
      list = list.filter(team => {
        const displayStatus = (team.status === "Pending" && (!team.transactionId || !team.receiptUrl)) ? "Payment Pending" : team.status;
        return displayStatus === filterStatus;
      });
    }

    if (filterCheckpoint !== "All") {
      list = list.filter(team => {
        const allMembers = team.members || [];
        const trackSaved = team.trackPreferences && team.trackPreferences.length > 0;
        const paymentDone = !!(team.transactionId && team.receiptUrl);
        const tshirtSaved = team.tshirtSizes && Object.keys(team.tshirtSizes).length > 0 && allMembers.every(m => team.tshirtSizes[m.email]);
        const imagesUploaded = allMembers.length > 0 && allMembers.every(m => m.photoUrl);

        switch (filterCheckpoint) {
          case "Completed All": return trackSaved && paymentDone && tshirtSaved && imagesUploaded;
          case "Missing Track Preference": return !trackSaved;
          case "Missing Payment": return !paymentDone;
          case "Missing T-Shirt Sizes": return !tshirtSaved;
          case "Missing Member Photos": return !imagesUploaded;
          default: return true;
        }
      });
    }

    // Sorting
    list = [...list].sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt || 0);
      const dateB = new Date(b.updatedAt || b.createdAt || 0);
      if (filterSort === "Newest First") return dateB - dateA;
      if (filterSort === "Oldest First") return dateA - dateB;
      return 0;
    });

    return { 
      filtered: list, 
      uniqueColleges: Array.from(colleges).sort(), 
      uniqueLocations: Array.from(locations).sort() 
    };
  }, [registrations, activeTrack, filterCollege, filterLocation, filterStatus, filterCheckpoint, filterSort]);

  const allTracks = Object.keys(tracksCount);

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.4s ease-out forwards;
        }
      `}</style>
      <div className="animate-fade-in w-full max-w-7xl mx-auto px-6 py-8 md:px-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-800 tracking-tight">Round 2 Candidates</h2>
          <p className="text-gray-500 mt-1">Manage teams registering for the upcoming Round 2 event.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mb-8">
        {allTracks.map(track => (
          <div 
            key={track}
            onClick={() => {
              setActiveTrack(track);
              setFilterCollege("All");
              setFilterLocation("All");
              setFilterStatus("All");
              setFilterCheckpoint("All");
              setFilterSort("Newest First");
            }}
            className={`p-4 rounded-xl shadow-sm border cursor-pointer transition min-w-[150px] ${activeTrack === track ? 'bg-purple-100 border-purple-300' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
          >
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">{track}</h3>
            <p className="text-2xl font-black text-gray-800 mt-1">{tracksCount[track] || 0} <span className="text-sm font-medium text-gray-500 ml-1">teams</span></p>
          </div>
        ))}
      </div>

      {/* FILTER HEADER */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 mb-4 flex flex-col gap-4">
        <div className="flex items-center gap-2 text-gray-800 font-bold text-lg border-b border-gray-100 pb-3">
          <Filter size={20} /> Filters & Sort
        </div>
        <div className="flex flex-wrap gap-4">
          <CustomSelect 
            value={filterSort}
            onChange={setFilterSort}
            options={[
              { label: "Newest First", value: "Newest First" },
              { label: "Oldest First", value: "Oldest First" }
            ]}
            placeholder="Sort By"
            width="160px"
          />

          <CustomSelect 
            value={filterCheckpoint}
            onChange={setFilterCheckpoint}
            options={[
              { label: "All Checkpoints", value: "All" },
              { label: "Completed All", value: "Completed All" },
              { label: "Missing Track Preference", value: "Missing Track Preference" },
              { label: "Missing Payment", value: "Missing Payment" },
              { label: "Missing T-Shirt Sizes", value: "Missing T-Shirt Sizes" },
              { label: "Missing Member Photos", value: "Missing Member Photos" }
            ]}
            placeholder="All Checkpoints"
            width="220px"
          />

          <CustomSelect 
            value={filterStatus}
            onChange={setFilterStatus}
            options={[
              { label: "All Statuses", value: "All" },
              { label: "Approved", value: "Approved" },
              { label: "Pending Verification", value: "Pending" },
              { label: "Payment Pending", value: "Payment Pending" },
              { label: "Contact", value: "Contact" }
            ]}
            placeholder="All Statuses"
            width="200px"
          />

          <CustomSelect 
            value={filterCollege}
            onChange={setFilterCollege}
            options={[
              { label: "All Colleges", value: "All" },
              ...uniqueColleges.map(c => ({ label: c, value: c }))
            ]}
            placeholder="All Colleges"
            width="220px"
          />

          <CustomSelect 
            value={filterLocation}
            onChange={setFilterLocation}
            options={[
              { label: "All Locations", value: "All" },
              ...uniqueLocations.map(l => ({ label: l, value: l }))
            ]}
            placeholder="All Locations"
            width="200px"
          />
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <span className="text-sm font-bold text-purple-700 bg-purple-100 px-3 py-1.5 rounded-full shadow-sm whitespace-nowrap">{filtered.length} team{filtered.length !== 1 ? 's' : ''} found</span>
        <button 
          onClick={() => setShowReportBuilder(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold py-2 px-4 rounded-xl shadow transition"
        >
          <FileText size={18} /> Report Builder
        </button>
      </div>

      {loading ? (
        <p className="text-center text-gray-500 py-10">Loading registrations...</p>
      ) : filtered.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-gray-200 text-center shadow-sm">
          <h3 className="text-xl font-bold text-gray-700 mb-2">No Registrations Yet</h3>
          <p className="text-gray-500">Teams will appear here once they complete the Round 2 registration from their Team Console.</p>
        </div>
      ) : (
        <div 
          key={`${activeTrack}-${filterCollege}-${filterLocation}-${filterStatus}-${filterCheckpoint}-${filterSort}`}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in-up"
        >
          {filtered.map(team => (
            <TeamCard 
              key={team._id} 
              team={team} 
              isExpanded={expandedTeamId === team._id}
              onToggleExpand={() => setExpandedTeamId(expandedTeamId === team._id ? null : team._id)}
              handleUpdateStatus={handleUpdateStatus} 
              handleToggleReopen={handleToggleReopen} 
              handleCopy={handleCopy} 
              copiedId={copiedId} 
            />
          ))}
        </div>
      )}

      {/* Report Builder Modal */}
      {showReportBuilder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <FileText size={20} className="text-purple-600" />
                Custom Report Builder
              </h3>
              <button onClick={() => setShowReportBuilder(false)} className="text-gray-400 hover:text-red-500 transition p-1 rounded-md hover:bg-red-50">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-white">
              <p className="text-sm text-gray-500 mb-5">Select the fields you want to include in the generated PDF report. The team name and member name are always included.</p>
              
              <div className="space-y-4">
                <label className="flex items-center gap-3 p-3 rounded-xl border border-purple-100 bg-purple-50 cursor-pointer hover:bg-purple-100 transition">
                  <input 
                    type="checkbox" 
                    checked={reportConfig.onlyLeader} 
                    onChange={e => setReportConfig(prev => ({ ...prev, onlyLeader: e.target.checked }))}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <div>
                    <div className="text-sm font-bold text-purple-900">Only Show Team Leader</div>
                    <div className="text-xs text-purple-700 mt-0.5">Exclude all other team members from the report</div>
                  </div>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={reportConfig.memberPhoto} onChange={e => setReportConfig(prev => ({ ...prev, memberPhoto: e.target.checked }))} className="w-4 h-4 text-purple-600 rounded" />
                    Member Photo
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={reportConfig.memberInstitute} onChange={e => setReportConfig(prev => ({ ...prev, memberInstitute: e.target.checked }))} className="w-4 h-4 text-purple-600 rounded" />
                    Member Institute
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={reportConfig.memberLocation} onChange={e => setReportConfig(prev => ({ ...prev, memberLocation: e.target.checked }))} className="w-4 h-4 text-purple-600 rounded" />
                    Member Location
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={reportConfig.memberTshirt} onChange={e => setReportConfig(prev => ({ ...prev, memberTshirt: e.target.checked }))} className="w-4 h-4 text-purple-600 rounded" />
                    T-Shirt Size
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={reportConfig.preferences} onChange={e => setReportConfig(prev => ({ ...prev, preferences: e.target.checked }))} className="w-4 h-4 text-purple-600 rounded" />
                    Track Preferences
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={reportConfig.transactionId} onChange={e => setReportConfig(prev => ({ ...prev, transactionId: e.target.checked }))} className="w-4 h-4 text-purple-600 rounded" />
                    Transaction ID
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={reportConfig.receiptUrl} onChange={e => setReportConfig(prev => ({ ...prev, receiptUrl: e.target.checked }))} className="w-4 h-4 text-purple-600 rounded" />
                    Receipt URL
                  </label>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button 
                onClick={() => setShowReportBuilder(false)}
                className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-lg transition"
              >
                Cancel
              </button>
              <button 
                onClick={startPDFGeneration}
                disabled={isGenerating}
                className="px-4 py-2 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px] justify-center"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <Download size={16} /> Generate PDF
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
