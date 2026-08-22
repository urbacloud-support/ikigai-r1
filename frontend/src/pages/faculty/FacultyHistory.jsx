import React, { useState } from "react";
import { Search, ChevronDown, ChevronUp, FileText, Download, CheckCircle, XCircle } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import ikigaiLogo from "../../assets/ikigai.png";

export default function FacultyHistory({ teamsData }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedTeamId, setExpandedTeamId] = useState(null);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [documentFilter, setDocumentFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("NAME_ASC");

  const filteredTeams = teamsData.filter(t => {
    const matchesSearch = t.teamName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.leaderEmail?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "ALL" ? true :
                          filterStatus === "CHECKED_IN" ? t.status === "CHECKED_IN" :
                          t.status !== "CHECKED_IN";
                          
    let matchesDocs = true;
    if (documentFilter === "MISSING_ID") {
      matchesDocs = t.memberVerifications?.some(m => !m.governmentIdVerified);
    } else if (documentFilter === "MISSING_CONSENT") {
      matchesDocs = t.memberVerifications?.some(m => !m.consentVerified);
    } else if (documentFilter === "MISSING_ANY") {
      matchesDocs = t.memberVerifications?.some(m => !m.governmentIdVerified || !m.consentVerified);
    }

    return matchesSearch && matchesFilter && matchesDocs;
  }).sort((a, b) => {
    if (sortBy === "NAME_ASC") return (a.teamName || "").localeCompare(b.teamName || "");
    if (sortBy === "NAME_DESC") return (b.teamName || "").localeCompare(a.teamName || "");
    if (sortBy === "TIME_NEWEST") return new Date(b.checkedInAt || 0) - new Date(a.checkedInAt || 0);
    if (sortBy === "TIME_OLDEST") {
      if (!a.checkedInAt) return 1;
      if (!b.checkedInAt) return -1;
      return new Date(a.checkedInAt) - new Date(b.checkedInAt);
    }
    return 0;
  });

  const handleExportPDF = () => {
    if (filteredTeams.length === 0) return alert("No data");
    const doc = new jsPDF("p", "mm", "a4");
    
    // Header
    doc.setFillColor(250, 245, 255);
    doc.rect(0, 0, 210, 34, "F");
    doc.addImage(ikigaiLogo, "PNG", 14, 8, 45, 15);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(107, 33, 168);
    doc.text("History & Document Verification", 65, 18, { align: "left" });
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 32, 196, 32);

    const tableColumn = ["Team Name / Member Name", "Check-in Time", "Role", "Present", "Gov ID", "Consent"];
    const tableRows = [];

    filteredTeams.forEach(team => {
      const checkInTime = team.checkedInAt ? new Date(team.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-";
      const memberCount = team.memberVerifications?.length || 0;

      // Team Header Row
      tableRows.push([
        { content: team.teamName, styles: { fontStyle: 'bold', fillColor: [240, 240, 250] } },
        { content: checkInTime, styles: { fontStyle: 'bold', fillColor: [240, 240, 250] } },
        { content: `${memberCount} Members`, colSpan: 4, styles: { fontStyle: 'bold', fillColor: [240, 240, 250] } }
      ]);

      if (team.memberVerifications && team.memberVerifications.length > 0) {
        team.memberVerifications.forEach(m => {
          tableRows.push([
            `   ${m.name}`,
            "-",
            m.role || "Member",
            m.isPresent ? "Yes" : "No",
            m.governmentIdVerified ? "Verified" : "Pending",
            m.consentVerified ? "Verified" : "Pending"
          ]);
        });
      }
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      theme: "grid",
      headStyles: { fillColor: [107, 33, 168] },
      styles: { fontSize: 9, cellPadding: 3 }
    });

    doc.save(`History_Verification_${Date.now()}.pdf`);
  };

  const handleExportExcel = () => {
    if (filteredTeams.length === 0) return alert("No data");
    const exportData = [];

    // Add Metadata Header
    exportData.push({ "Type": "HISTORY & DOCUMENT VERIFICATION REPORT", "Name": "", "Check-in Time": "", "Role/Members": "", "Present": "", "Government ID": "", "Consent Form": "" });
    exportData.push({ "Type": `Generated on: ${new Date().toLocaleDateString()}`, "Name": "", "Check-in Time": "", "Role/Members": "", "Present": "", "Government ID": "", "Consent Form": "" });
    exportData.push({ "Type": `Filters Applied -> Status: ${filterStatus}`, "Name": "", "Check-in Time": "", "Role/Members": "", "Present": "", "Government ID": "", "Consent Form": "" });
    exportData.push({ "Type": "", "Name": "", "Check-in Time": "", "Role/Members": "", "Present": "", "Government ID": "", "Consent Form": "" }); // Empty row

    filteredTeams.forEach((team, idx) => {
      if (idx > 0) {
        exportData.push({ "Type": "", "Name": "", "Check-in Time": "", "Role/Members": "", "Present": "", "Government ID": "", "Consent Form": "" }); // Spacer
      }
      
      const checkInTime = team.checkedInAt ? new Date(team.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-";
      const memberCount = team.memberVerifications?.length || 0;

      exportData.push({
        "Type": "TEAM",
        "Name": team.teamName,
        "Check-in Time": checkInTime,
        "Role/Members": `${memberCount} Members`,
        "Present": "-",
        "Government ID": "-",
        "Consent Form": "-"
      });

      if (team.memberVerifications && team.memberVerifications.length > 0) {
        team.memberVerifications.forEach(m => {
          exportData.push({
            "Type": "Member",
            "Name": `   ${m.name}`,
            "Check-in Time": "-",
            "Role/Members": m.role || "Member",
            "Present": m.isPresent ? "Yes" : "No",
            "Government ID": m.governmentIdVerified ? "Verified" : "Pending",
            "Consent Form": m.consentVerified ? "Verified" : "Pending"
          });
        });
      }
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    worksheet["!cols"] = [
      { wch: 15 }, // Type
      { wch: 35 }, // Name
      { wch: 15 }, // Check-in Time
      { wch: 20 }, // Role/Members
      { wch: 12 }, // Present
      { wch: 15 }, // Gov ID
      { wch: 15 }  // Consent
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "History");
    XLSX.writeFile(workbook, `History_Verification_${Date.now()}.xlsx`);
  };

  const Badge = ({ condition, text, trueColor, falseColor }) => (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${condition ? trueColor : falseColor}`}>
      {condition ? <CheckCircle size={12} /> : <XCircle size={12} />} {text}
    </span>
  );

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto w-full space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">History & Verification</h1>
          <p className="text-slate-500 mt-1">Review check-in status and missing documents.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportPDF} className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 font-medium rounded-lg hover:bg-red-100 flex items-center gap-2 text-sm shadow-sm">
            <FileText size={16} /> PDF
          </button>
          <button onClick={handleExportExcel} className="px-4 py-2 bg-green-50 text-green-600 border border-green-200 font-medium rounded-lg hover:bg-green-100 flex items-center gap-2 text-sm shadow-sm">
            <Download size={16} /> Excel
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search teams or email..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 text-sm flex-1 sm:flex-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="CHECKED_IN">Checked In</option>
                <option value="PENDING">Pending</option>
              </select>

              <select 
                value={documentFilter}
                onChange={(e) => setDocumentFilter(e.target.value)}
                className="px-4 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 text-sm flex-1 sm:flex-none"
              >
                <option value="ALL">All Documents</option>
                <option value="MISSING_ID">Missing Gov ID</option>
                <option value="MISSING_CONSENT">Missing Consent</option>
                <option value="MISSING_ANY">Missing Any Doc</option>
              </select>
              
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 text-sm flex-1 sm:flex-none"
              >
                <option value="NAME_ASC">Name (A-Z)</option>
                <option value="NAME_DESC">Name (Z-A)</option>
                <option value="TIME_NEWEST">Newest First</option>
                <option value="TIME_OLDEST">Oldest First</option>
              </select>
            </div>
          </div>
        </div>

        <div className="w-full flex-1 overflow-hidden flex flex-col">
          {/* Desktop Table */}
          <div className="hidden md:block flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm border-b border-slate-200 text-slate-600 text-sm font-semibold">
              <tr>
                <th className="py-3 px-4">Team Name</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Members</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeams.map(team => (
                <React.Fragment key={team._id}>
                  <tr 
                    className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition ${expandedTeamId === team._id ? 'bg-indigo-50/30' : ''}`}
                    onClick={() => setExpandedTeamId(expandedTeamId === team._id ? null : team._id)}
                  >
                    <td className="py-4 px-4 font-bold text-slate-800">{team.teamName}</td>
                    <td className="py-4 px-4">
                      {team.status === "CHECKED_IN" ? (
                        <div className="flex flex-col gap-1">
                          <span className="w-fit text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-md text-xs font-bold">CHECKED IN</span>
                          {team.checkedInAt && (
                            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
                              {new Date(team.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-amber-700 bg-amber-100 px-2.5 py-1 rounded-md text-xs font-bold">PENDING</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2 text-slate-500">
                        {team.memberVerifications?.length || 0} Members
                        {expandedTeamId === team._id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </td>
                  </tr>
                  {expandedTeamId === team._id && (
                    <tr className="bg-slate-50">
                      <td colSpan="3" className="p-0">
                        <div className="p-4 border-b border-slate-200 bg-indigo-50/10">
                          {team.memberVerifications?.length > 0 ? (
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-slate-500 border-b border-slate-200">
                                  <th className="pb-2 font-semibold">Name</th>
                                  <th className="pb-2 font-semibold">Present</th>
                                  <th className="pb-2 font-semibold">Gov ID</th>
                                  <th className="pb-2 font-semibold">Consent Form</th>
                                </tr>
                              </thead>
                              <tbody>
                                {team.memberVerifications.map((m, i) => (
                                  <tr key={i} className="border-b border-slate-100 last:border-0">
                                    <td className="py-3 font-medium text-slate-700">
                                      {m.name} <span className="text-xs text-slate-400 font-normal ml-1">({m.role})</span>
                                    </td>
                                    <td className="py-3">
                                      <Badge condition={m.isPresent} text={m.isPresent ? "Present" : "Absent"} trueColor="bg-emerald-100 text-emerald-700" falseColor="bg-red-100 text-red-700" />
                                    </td>
                                    <td className="py-3">
                                      {m.isPresent ? (
                                        <Badge condition={m.governmentIdVerified} text={m.governmentIdVerified ? "Verified" : "Missing"} trueColor="bg-emerald-100 text-emerald-700" falseColor="bg-amber-100 text-amber-700" />
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500">-</span>
                                      )}
                                    </td>
                                    <td className="py-3">
                                      {m.isPresent ? (
                                        <Badge condition={m.consentVerified} text={m.consentVerified ? "Verified" : "Missing"} trueColor="bg-emerald-100 text-emerald-700" falseColor="bg-amber-100 text-amber-700" />
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500">-</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <p className="text-slate-500 text-center py-4">No members found.</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {filteredTeams.length === 0 && (
                <tr>
                  <td colSpan="3" className="py-8 text-center text-slate-500">No teams found.</td>
                </tr>
              )}
            </tbody>
            </table>
          </div>

          {/* Mobile View */}
          <div className="md:hidden flex-1 overflow-auto p-4 space-y-4">
            {filteredTeams.map(team => (
              <div key={team._id} className="flex flex-col">
                <div 
                  className={`p-4 flex flex-col gap-3 cursor-pointer hover:bg-slate-50 transition ${expandedTeamId === team._id ? 'bg-indigo-50/30' : ''}`}
                  onClick={() => setExpandedTeamId(expandedTeamId === team._id ? null : team._id)}
                >
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-slate-800 text-lg">{team.teamName}</h3>
                    <div className="text-slate-400">
                      {expandedTeamId === team._id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      {team.status === "CHECKED_IN" ? (
                        <div className="flex flex-col gap-1">
                          <span className="w-fit text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-md text-xs font-bold">CHECKED IN</span>
                          {team.checkedInAt && (
                            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
                              {new Date(team.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-amber-700 bg-amber-100 px-2.5 py-1 rounded-md text-xs font-bold">PENDING</span>
                      )}
                    </div>
                    <span className="text-sm font-medium text-slate-500">{team.memberVerifications?.length || 0} Members</span>
                  </div>
                </div>

                {expandedTeamId === team._id && (
                  <div className="p-4 bg-slate-50 border-t border-slate-100">
                    {team.memberVerifications?.length > 0 ? (
                      <div className="flex flex-col gap-4">
                        {team.memberVerifications.map((m, i) => (
                          <div key={i} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-slate-700">{m.name}</span>
                              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{m.role || 'Member'}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <Badge condition={m.isPresent} text={m.isPresent ? "Present" : "Absent"} trueColor="bg-emerald-100 text-emerald-700" falseColor="bg-red-100 text-red-700" />
                              {m.isPresent ? (
                                <>
                                  <Badge condition={m.governmentIdVerified} text={m.governmentIdVerified ? "Gov ID" : "No Gov ID"} trueColor="bg-emerald-100 text-emerald-700" falseColor="bg-amber-100 text-amber-700" />
                                  <Badge condition={m.consentVerified} text={m.consentVerified ? "Consent" : "No Consent"} trueColor="bg-emerald-100 text-emerald-700" falseColor="bg-amber-100 text-amber-700" />
                                </>
                              ) : (
                                <>
                                  <span className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500">-</span>
                                  <span className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500">-</span>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-500 text-center py-4">No members found.</p>
                    )}
                  </div>
                )}
              </div>
            ))}
            {filteredTeams.length === 0 && (
              <div className="p-8 text-center text-slate-500">No teams found.</div>
            )}
          </div>
          </div>
      </div>
    </div>
  );
}
