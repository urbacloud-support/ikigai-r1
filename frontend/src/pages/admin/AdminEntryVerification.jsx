import React, { useState, useEffect } from "react";
import { QrCode, CheckCircle, Clock, AlertTriangle, Search, Loader2, Download, FileText, X } from "lucide-react";
import QRCode from "react-qr-code";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import ikigaiLogo from "../../assets/ikigai.png";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

export default function AdminEntryVerification() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [stats, setStats] = useState({ total: 0, eligible: 0, qrGenerated: 0, checkedIn: 0, pending: 0 });
  const [filterState, setFilterState] = useState("ALL"); // ALL, ELIGIBLE, NOT_ELIGIBLE
  const [filterStatus, setFilterStatus] = useState("ALL"); // ALL, CHECKED_IN, IN_PROGRESS, PENDING, NOT_GENERATED, QR_GENERATED
  const [sortBy, setSortBy] = useState("NAME_ASC");
  const [activeCard, setActiveCard] = useState(null);
  const [viewQrToken, setViewQrToken] = useState(null);
  const [viewQrTeamName, setViewQrTeamName] = useState("");

  const fetchVerificationStatus = async () => {
    try {
      setLoading(true);
      // We'll query round 2 teams and fetch their verification status in parallel or the backend should return it.
      // Let's create a specific admin endpoint or just fetch round2 teams and verifications.
      // For now, let's call an endpoint that returns all teams + verification status.
      // Wait, we didn't explicitly create this endpoint in Phase 1, but we can easily fetch from the existing endpoints and join, or I'll create a new endpoint /api/admin/team-verification-status.
      
      const res = await fetch(`${API_BASE}/api/volunteer/admin/team-verification-status`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setTeams(data.teams);
          calculateStats(data.teams);
        }
      }
    } catch (err) {
      console.error("Error fetching verification status", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchVerificationStatus();
  }, []);

  const calculateStats = (teamData) => {
    const s = { total: teamData.length, eligible: 0, qrGenerated: 0, checkedIn: 0, pending: 0 };
    teamData.forEach(t => {
      if (t.assignedProblemStatement) s.eligible++;
      if (t.qrToken) s.qrGenerated++;
      if (t.status === "CHECKED_IN") s.checkedIn++;
      else if (t.qrToken) s.pending++;
    });
    setStats(s);
  };

  const generateQRs = async (teamIds) => {
    if (teamIds.length === 0) return;
    setGenerating(true);
    try {
      const res = await fetch(`${API_BASE}/api/volunteer/admin/generate-team-qrs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamIds })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Successfully generated QR for ${data.generatedCount} teams. Skipped ${data.skippedCount}.`);
        fetchVerificationStatus();
        setSelectedTeams([]);
      } else {
        alert(data.message || "Failed to generate QRs");
      }
    } catch (err) {
      alert("Error generating QRs");
    }
    setGenerating(false);
  };

  const handleSelectAllEligible = () => {
    const eligibleIds = teams
      .filter(t => t.assignedProblemStatement && !t.qrToken)
      .map(t => t._id);
    setSelectedTeams(eligibleIds);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedTeams(filteredTeams.map(t => t._id));
    } else {
      setSelectedTeams([]);
    }
  };

  const toggleTeam = (id) => {
    setSelectedTeams(prev => prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]);
  };

  const handleCardClick = (cardName) => {
    if (activeCard === cardName) {
      setActiveCard(null);
      setFilterState("ALL");
      setFilterStatus("ALL");
    } else {
      setActiveCard(cardName);
      if (cardName === "ELIGIBLE") {
        setFilterState("ELIGIBLE");
        setFilterStatus("ALL");
      } else if (cardName === "QR_GENERATED") {
        setFilterState("ALL");
        setFilterStatus("QR_GENERATED");
      } else if (cardName === "CHECKED_IN") {
        setFilterState("ALL");
        setFilterStatus("CHECKED_IN");
      } else if (cardName === "PENDING") {
        setFilterState("ALL");
        setFilterStatus("PENDING");
      }
    }
  };

  const filteredTeams = teams.filter(t => {
    const matchesSearch = t.teamName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.leaderEmail?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEligibility = filterState === "ALL" ? true :
                               filterState === "ELIGIBLE" ? !!t.assignedProblemStatement :
                               !t.assignedProblemStatement;
    const matchesStatus = filterStatus === "ALL" ? true :
                          filterStatus === "CHECKED_IN" ? t.status === "CHECKED_IN" :
                          filterStatus === "IN_PROGRESS" ? t.status === "IN_PROGRESS" :
                          filterStatus === "PENDING" ? (t.qrToken && t.status !== "CHECKED_IN" && t.status !== "IN_PROGRESS") :
                          filterStatus === "NOT_GENERATED" ? (!t.qrToken && !!t.assignedProblemStatement) :
                          filterStatus === "QR_GENERATED" ? !!t.qrToken : true;
    return matchesSearch && matchesEligibility && matchesStatus;
  }).sort((a, b) => {
    if (sortBy === "NAME_ASC") return (a.teamName || "").localeCompare(b.teamName || "");
    if (sortBy === "NAME_DESC") return (b.teamName || "").localeCompare(a.teamName || "");
    return 0;
  });

  const handleExportPDF = () => {
    if (filteredTeams.length === 0) {
      alert("No data to export!");
      return;
    }
    const doc = new jsPDF("p", "mm", "a4");
    doc.setFont("helvetica", "normal");

    // Header
    doc.setFillColor(250, 245, 255);
    doc.rect(0, 0, 210, 34, "F");
    doc.addImage(ikigaiLogo, "PNG", 14, 8, 45, 15);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(107, 33, 168);
    const filterTitle = filterState === "ALL" ? "All" : filterState === "ELIGIBLE" ? "Eligible" : "Not Eligible";
    doc.text(`Entry Verification - ${filterTitle}`, 65, 18, { align: "left" });
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 32, 196, 32);

    // Meta
    doc.setFontSize(10);
    doc.setTextColor(31, 41, 55);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 40);
    doc.text(`Total Teams: ${filteredTeams.length}`, 14, 45);

    // Table Data
    const tableColumn = ["Team Name", "Leader Email", "Leader Phone", "Eligibility", "QR Status", "Verification"];
    const tableRows = filteredTeams.map(t => [
      t.teamName || "N/A",
      t.leaderEmail || "N/A",
      t.leaderPhone || "N/A",
      t.assignedProblemStatement ? "Eligible" : "Pending PS",
      t.qrToken ? "Generated" : "Not Generated",
      !t.qrToken ? "-" : t.status === "CHECKED_IN" ? "CHECKED IN" : t.status === "IN_PROGRESS" ? "IN PROGRESS" : "PENDING"
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 55,
      theme: "grid",
      headStyles: { fillColor: [107, 33, 168] },
      styles: { fontSize: 9, cellPadding: 3 },
    });

    doc.save(`Entry_Verification_${filterTitle}_${Date.now()}.pdf`);
  };

  const handleExportExcel = () => {
    if (filteredTeams.length === 0) {
      alert("No data to export!");
      return;
    }
    const filterTitle = filterState === "ALL" ? "All" : filterState === "ELIGIBLE" ? "Eligible" : "Not Eligible";
    
    const exportData = [];
    
    // Metadata Header
    exportData.push({ "Team Name": "ENTRY VERIFICATION REPORT", "Leader Email": "", "Leader Phone": "", "Eligibility": "", "QR Status": "", "Verification Status": "" });
    exportData.push({ "Team Name": `Generated on: ${new Date().toLocaleDateString()}`, "Leader Email": "", "Leader Phone": "", "Eligibility": "", "QR Status": "", "Verification Status": "" });
    exportData.push({ "Team Name": `Filters Applied -> Eligibility: ${filterState} | Status: ${filterStatus}`, "Leader Email": "", "Leader Phone": "", "Eligibility": "", "QR Status": "", "Verification Status": "" });
    exportData.push({ "Team Name": "", "Leader Email": "", "Leader Phone": "", "Eligibility": "", "QR Status": "", "Verification Status": "" }); // Empty Row

    filteredTeams.forEach(t => {
      exportData.push({
        "Team Name": t.teamName || "N/A",
        "Leader Email": t.leaderEmail || "N/A",
        "Leader Phone": t.leaderPhone || "N/A",
        "Eligibility": t.assignedProblemStatement ? "Eligible" : "Pending PS",
        "QR Status": t.qrToken ? "Generated" : "Not Generated",
        "Verification Status": !t.qrToken ? "-" : t.status === "CHECKED_IN" ? "CHECKED IN" : t.status === "IN_PROGRESS" ? "IN PROGRESS" : "PENDING"
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    worksheet["!cols"] = [
      { wch: 30 }, // Team Name
      { wch: 35 }, // Leader Email
      { wch: 15 }, // Leader Phone
      { wch: 15 }, // Eligibility
      { wch: 15 }, // QR Status
      { wch: 20 }  // Verification Status
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Verification");
    XLSX.writeFile(workbook, `Entry_Verification_${filterTitle}_${Date.now()}.xlsx`);
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 pb-32">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Entry Verification</h1>
          <p className="text-slate-500 mt-1">Manage physical entry verification and QR code generation for teams.</p>
        </div>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div 
          onClick={() => handleCardClick("ELIGIBLE")}
          className={`bg-white p-6 rounded-2xl shadow-sm border ${activeCard === "ELIGIBLE" ? "border-blue-500 ring-2 ring-blue-100" : "border-slate-200"} cursor-pointer hover:border-blue-300 transition`}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Search size={20} /></div>
            <h3 className="font-semibold text-slate-700">Eligible Teams</h3>
          </div>
          <p className="text-3xl font-bold text-slate-800">{stats.eligible} <span className="text-sm font-normal text-slate-500">/ {stats.total}</span></p>
        </div>
        
        <div 
          onClick={() => handleCardClick("QR_GENERATED")}
          className={`bg-white p-6 rounded-2xl shadow-sm border ${activeCard === "QR_GENERATED" ? "border-purple-500 ring-2 ring-purple-100" : "border-slate-200"} cursor-pointer hover:border-purple-300 transition`}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><QrCode size={20} /></div>
            <h3 className="font-semibold text-slate-700">QR Generated</h3>
          </div>
          <p className="text-3xl font-bold text-slate-800">{stats.qrGenerated}</p>
        </div>
        
        <div 
          onClick={() => handleCardClick("CHECKED_IN")}
          className={`bg-white p-6 rounded-2xl shadow-sm border ${activeCard === "CHECKED_IN" ? "border-green-500 ring-2 ring-green-100" : "border-slate-200"} cursor-pointer hover:border-green-300 transition`}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-50 text-green-600 rounded-lg"><CheckCircle size={20} /></div>
            <h3 className="font-semibold text-slate-700">Checked In</h3>
          </div>
          <p className="text-3xl font-bold text-slate-800">{stats.checkedIn}</p>
        </div>
        
        <div 
          onClick={() => handleCardClick("PENDING")}
          className={`bg-white p-6 rounded-2xl shadow-sm border ${activeCard === "PENDING" ? "border-orange-500 ring-2 ring-orange-100" : "border-slate-200"} cursor-pointer hover:border-orange-300 transition`}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><Clock size={20} /></div>
            <h3 className="font-semibold text-slate-700">Pending Entry</h3>
          </div>
          <p className="text-3xl font-bold text-slate-800">{stats.pending}</p>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col gap-4 bg-slate-50">
          <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
            <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto flex-1">
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search name or email..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                />
              </div>
              <select 
                value={filterState} 
                onChange={(e) => setFilterState(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-700 text-sm"
              >
                <option value="ALL">All Eligibility</option>
                <option value="ELIGIBLE">Eligible</option>
                <option value="NOT_ELIGIBLE">Not Eligible</option>
              </select>
              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-700 text-sm"
              >
                <option value="ALL">All Status</option>
                <option value="CHECKED_IN">Checked In</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="PENDING">Pending (QR Gen)</option>
                <option value="NOT_GENERATED">Not Generated</option>
                <option value="QR_GENERATED">QR Generated (All)</option>
              </select>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-700 text-sm"
              >
                <option value="NAME_ASC">Name (A-Z)</option>
                <option value="NAME_DESC">Name (Z-A)</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
              <button 
                onClick={handleExportPDF}
                className="px-3 py-2 bg-red-50 text-red-600 border border-red-200 font-medium rounded-lg hover:bg-red-100 transition flex items-center gap-2 text-sm shadow-sm"
              >
                <FileText size={16} /> PDF
              </button>
              <button 
                onClick={handleExportExcel}
                className="px-3 py-2 bg-green-50 text-green-600 border border-green-200 font-medium rounded-lg hover:bg-green-100 transition flex items-center gap-2 text-sm shadow-sm"
              >
                <Download size={16} /> Excel
              </button>
              {filterState !== "NOT_ELIGIBLE" && filterStatus !== "CHECKED_IN" && filterStatus !== "IN_PROGRESS" && (
                <>
                  <button 
                    onClick={handleSelectAllEligible}
                    className="px-3 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition whitespace-nowrap text-sm"
                  >
                    Select All Eligible
                  </button>
                  <button 
                    onClick={() => generateQRs(selectedTeams)}
                    disabled={selectedTeams.length === 0 || generating}
                    className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap text-sm shadow-sm"
                  >
                    {generating ? <Loader2 size={16} className="animate-spin" /> : <QrCode size={16} />}
                    Gen QR ({selectedTeams.length})
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Table / Cards Area */}
        <div className="flex-1 overflow-auto bg-slate-50 md:bg-white">
          {loading ? (
            <div className="h-full flex items-center justify-center text-slate-500">
              <Loader2 className="animate-spin mr-2" size={24} /> Loading Teams...
            </div>
          ) : (
            <div className="w-full h-full">
              {/* Desktop Table */}
              <div className="hidden md:block h-full">
                <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="py-3 px-4 w-12 border-b border-slate-200">
                    {filterState !== "NOT_ELIGIBLE" && (
                      <input 
                        type="checkbox" 
                        onChange={handleSelectAll}
                        checked={selectedTeams.length === filteredTeams.length && filteredTeams.length > 0}
                        className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                      />
                    )}
                  </th>
                  <th className="py-3 px-4 font-semibold text-slate-600 text-sm border-b border-slate-200">Team Details</th>
                  <th className="py-3 px-4 font-semibold text-slate-600 text-sm border-b border-slate-200">Eligibility</th>
                  <th className="py-3 px-4 font-semibold text-slate-600 text-sm border-b border-slate-200">QR Status</th>
                  <th className="py-3 px-4 font-semibold text-slate-600 text-sm border-b border-slate-200">Verification</th>
                  <th className="py-3 px-4 font-semibold text-slate-600 text-sm border-b border-slate-200 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTeams.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-slate-500">No teams found.</td>
                  </tr>
                ) : (
                  filteredTeams.map(team => (
                    <tr key={team._id} className="hover:bg-slate-50 transition group">
                      <td className="py-3 px-4">
                        {filterState !== "NOT_ELIGIBLE" && (
                          <input 
                            type="checkbox" 
                            checked={selectedTeams.includes(team._id)}
                            onChange={() => toggleTeam(team._id)}
                            className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                          />
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">{team.teamName}</div>
                        <div className="text-xs text-slate-500">{team.leaderEmail}</div>
                        <div className="text-xs text-slate-400">{team.leaderPhone || "N/A"}</div>
                      </td>
                      <td className="py-3 px-4">
                        {team.assignedProblemStatement ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                            <CheckCircle size={12} /> Eligible
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                            <AlertTriangle size={12} /> Pending PS
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        {team.qrToken ? (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewQrToken(team.qrToken);
                              setViewQrTeamName(team.teamName);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-semibold hover:bg-purple-100 transition border border-purple-200"
                          >
                            <QrCode size={14} /> Generated
                          </button>
                        ) : (
                          <span className="text-slate-400 text-xs font-medium px-2">Not Generated</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {!team.qrToken ? (
                          <span className="text-sm text-slate-400">-</span>
                        ) : team.status === "CHECKED_IN" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                            <CheckCircle size={12} /> CHECKED IN
                          </span>
                        ) : team.status === "IN_PROGRESS" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-200">
                            <Clock size={12} /> IN PROGRESS
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            <Clock size={12} /> PENDING
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {!team.qrToken && team.assignedProblemStatement && (
                          <button 
                            onClick={() => generateQRs([team._id])}
                            className="px-3 py-1.5 bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300 font-medium rounded-lg text-sm transition shadow-sm"
                          >
                            Generate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden flex flex-col gap-3 p-4">
            {filterState !== "NOT_ELIGIBLE" && filteredTeams.length > 0 && (
              <div className="flex items-center gap-2 px-1 mb-1">
                <input 
                  type="checkbox" 
                  onChange={handleSelectAll}
                  checked={selectedTeams.length === filteredTeams.length && filteredTeams.length > 0}
                  className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer w-5 h-5"
                />
                <span className="text-sm font-semibold text-slate-600">Select All {filteredTeams.length} Teams</span>
              </div>
            )}
            
            {filteredTeams.length === 0 ? (
              <div className="py-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
                No teams found.
              </div>
            ) : (
              filteredTeams.map(team => (
                <div key={team._id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3 relative">
                  {filterState !== "NOT_ELIGIBLE" && (
                    <div className="absolute top-4 right-4">
                      <input 
                        type="checkbox" 
                        checked={selectedTeams.includes(team._id)}
                        onChange={() => toggleTeam(team._id)}
                        className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer w-5 h-5"
                      />
                    </div>
                  )}
                  
                  <div className="pr-8">
                    <div className="font-black text-slate-800 text-lg">{team.teamName}</div>
                    <div className="text-sm text-slate-500 mt-1">{team.leaderEmail}</div>
                    <div className="text-xs text-slate-400">{team.leaderPhone || "N/A"}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div className="flex flex-col gap-1 p-2 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Eligibility</span>
                      {team.assignedProblemStatement ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700"><CheckCircle size={12} /> Eligible</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-600"><AlertTriangle size={12} /> Pending PS</span>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-1 p-2 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">QR Status</span>
                      {team.qrToken ? (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewQrToken(team.qrToken);
                            setViewQrTeamName(team.teamName);
                          }}
                          className="inline-flex w-max items-center gap-1 text-xs font-bold text-purple-700 bg-purple-100 hover:bg-purple-200 px-2 py-1 rounded-md transition"
                        >
                          <QrCode size={12} /> Generated
                        </button>
                      ) : (
                        <span className="text-xs font-medium text-slate-400">Not Generated</span>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-1 pt-3 border-t border-slate-100">
                    <div>
                      {!team.qrToken ? (
                        <span className="text-sm text-slate-400">-</span>
                      ) : team.status === "CHECKED_IN" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                          <CheckCircle size={12} /> CHECKED IN
                        </span>
                      ) : team.status === "IN_PROGRESS" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700">
                          <Clock size={12} /> IN PROGRESS
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                          <Clock size={12} /> PENDING
                        </span>
                      )}
                    </div>
                    
                    {!team.qrToken && team.assignedProblemStatement && (
                      <button 
                        onClick={() => generateQRs([team._id])}
                        className="px-3 py-1.5 bg-purple-50 text-purple-700 font-bold rounded-lg text-xs transition active:bg-purple-100"
                      >
                        Generate QR
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
            </div>
          )}
        </div>
      </div>

      {viewQrToken && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" style={{ margin: 0 }}>
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full relative flex flex-col items-center animate-in fade-in zoom-in duration-200 shadow-2xl">
            <button 
              onClick={() => setViewQrToken(null)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100 transition"
            >
              <X size={20} />
            </button>
            <h3 className="text-xl font-black text-slate-800 mb-1">Team QR Code</h3>
            <p className="text-slate-500 mb-6 text-center font-medium">{viewQrTeamName}</p>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 inline-block mb-2">
              <QRCode value={viewQrToken} size={200} />
            </div>
            <p className="text-xs text-slate-400 mt-4 text-center max-w-[250px]">Volunteers can scan this code to verify the team's entry.</p>
          </div>
        </div>
      )}
    </div>
  );
}
