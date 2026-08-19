import React, { useState } from "react";
import { Search, ChevronDown, ChevronUp, FileText, Download, CheckCircle, XCircle } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import ikigaiLogo from "../../assets/ikigai.png";

export default function FacultyHistory({ teamsData }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedTeamId, setExpandedTeamId] = useState(null);

  const filteredTeams = teamsData.filter(t => 
    t.teamName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.leaderEmail?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

    const tableColumn = ["Team Name", "Member Name", "Role", "Present", "Gov ID", "Consent"];
    const tableRows = [];

    filteredTeams.forEach(team => {
      if (team.memberVerifications && team.memberVerifications.length > 0) {
        team.memberVerifications.forEach(m => {
          tableRows.push([
            team.teamName,
            m.name,
            m.role || "Member",
            m.isPresent ? "Yes" : "No",
            m.governmentIdVerified ? "Verified" : "Pending",
            m.consentVerified ? "Verified" : "Pending"
          ]);
        });
      } else {
        tableRows.push([team.teamName, "N/A", "N/A", "-", "-", "-"]);
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
    filteredTeams.forEach(team => {
      if (team.memberVerifications && team.memberVerifications.length > 0) {
        team.memberVerifications.forEach(m => {
          exportData.push({
            "Team Name": team.teamName,
            "Member Name": m.name,
            "Role": m.role || "Member",
            "Present": m.isPresent ? "Yes" : "No",
            "Government ID": m.governmentIdVerified ? "Verified" : "Pending",
            "Consent Form": m.consentVerified ? "Verified" : "Pending"
          });
        });
      } else {
        exportData.push({
          "Team Name": team.teamName,
          "Member Name": "N/A",
          "Role": "N/A",
          "Present": "-",
          "Government ID": "-",
          "Consent Form": "-"
        });
      }
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
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

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search teams or email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm font-semibold">
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
                        <span className="text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-md text-xs font-bold">CHECKED IN</span>
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
                                      <Badge condition={m.governmentIdVerified} text={m.governmentIdVerified ? "Verified" : "Missing"} trueColor="bg-emerald-100 text-emerald-700" falseColor="bg-amber-100 text-amber-700" />
                                    </td>
                                    <td className="py-3">
                                      <Badge condition={m.consentVerified} text={m.consentVerified ? "Verified" : "Missing"} trueColor="bg-emerald-100 text-emerald-700" falseColor="bg-amber-100 text-amber-700" />
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
      </div>
    </div>
  );
}
