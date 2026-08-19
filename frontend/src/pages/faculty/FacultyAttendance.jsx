import React, { useState } from "react";
import { Search, FileText, Download, CheckCircle, XCircle, ChevronDown, ChevronUp, Filter } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import ikigaiLogo from "../../assets/ikigai.png";

export default function FacultyAttendance({ teamsData }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedTeamId, setExpandedTeamId] = useState(null);
  
  const [filterDay1, setFilterDay1] = useState("All");
  const [filterDay2, setFilterDay2] = useState("All");
  const [filterDay3, setFilterDay3] = useState("All");

  const getTeamAttendanceSummary = (team, dayKey) => {
    if (!team.memberVerifications || team.memberVerifications.length === 0) return { present: 0, total: 0, status: "Absent" };
    const total = team.memberVerifications.length;
    const present = team.memberVerifications.filter(m => m.attendance?.[dayKey]).length;
    
    let status = "Absent";
    if (present === total) status = "Fully Present";
    else if (present > 0) status = "Partially Present";

    return { present, total, status };
  };

  const filteredTeams = teamsData.filter(team => {
    // 1. Search Filter
    const matchesSearch = 
      team.teamName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      team.leaderEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.memberVerifications?.some(m => m.name?.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    // 2. Day Filters
    const d1 = getTeamAttendanceSummary(team, "day1");
    const d2 = getTeamAttendanceSummary(team, "day2");
    const d3 = getTeamAttendanceSummary(team, "day3");

    if (filterDay1 !== "All" && d1.status !== filterDay1) return false;
    if (filterDay2 !== "All" && d2.status !== filterDay2) return false;
    if (filterDay3 !== "All" && d3.status !== filterDay3) return false;

    return true;
  });

  const handleExportPDF = () => {
    if (filteredTeams.length === 0) return alert("No data");
    const doc = new jsPDF("p", "mm", "a4");
    
    doc.setFillColor(250, 245, 255);
    doc.rect(0, 0, 210, 34, "F");
    doc.addImage(ikigaiLogo, "PNG", 14, 8, 45, 15);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(107, 33, 168);
    doc.text("Custom Attendance Report", 65, 18, { align: "left" });
    
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    const filterText = `Filters Applied -> Day 1: ${filterDay1} | Day 2: ${filterDay2} | Day 3: ${filterDay3}`;
    doc.text(filterText, 65, 26, { align: "left" });
    
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 32, 196, 32);

    const tableColumn = ["Team Name / Member Name", "Role", "Day 1", "Day 2", "Day 3"];
    const tableRows = [];

    let totalDay1Present = 0;
    let totalDay2Present = 0;
    let totalDay3Present = 0;
    let totalMembers = 0;

    filteredTeams.forEach(team => {
      const d1 = getTeamAttendanceSummary(team, "day1");
      const d2 = getTeamAttendanceSummary(team, "day2");
      const d3 = getTeamAttendanceSummary(team, "day3");
      
      // Team Header Row
      tableRows.push([
        { content: `[TEAM] ${team.teamName}`, styles: { fontStyle: 'bold', fillColor: [240, 240, 250] } },
        { content: `${team.memberVerifications?.length || 0} Members`, styles: { fontStyle: 'bold', fillColor: [240, 240, 250] } },
        { content: `${d1.present}/${d1.total}`, styles: { fontStyle: 'bold', fillColor: [240, 240, 250] } },
        { content: `${d2.present}/${d2.total}`, styles: { fontStyle: 'bold', fillColor: [240, 240, 250] } },
        { content: `${d3.present}/${d3.total}`, styles: { fontStyle: 'bold', fillColor: [240, 240, 250] } }
      ]);

      if (team.memberVerifications) {
        team.memberVerifications.forEach(m => {
          tableRows.push([
            `   ${m.name}`,
            m.role || "Member",
            m.attendance?.day1 ? "Present" : "Absent",
            m.attendance?.day2 ? "Present" : "Absent",
            m.attendance?.day3 ? "Present" : "Absent"
          ]);
        });
      }
    });

    // Add Grand Total Row
    tableRows.push([
      { content: "GRAND TOTAL", styles: { fontStyle: 'bold', fillColor: [220, 210, 240], halign: 'right' } },
      { content: `${totalMembers} Members`, styles: { fontStyle: 'bold', fillColor: [220, 210, 240] } },
      { content: `${totalDay1Present}/${totalMembers}`, styles: { fontStyle: 'bold', fillColor: [220, 210, 240] } },
      { content: `${totalDay2Present}/${totalMembers}`, styles: { fontStyle: 'bold', fillColor: [220, 210, 240] } },
      { content: `${totalDay3Present}/${totalMembers}`, styles: { fontStyle: 'bold', fillColor: [220, 210, 240] } }
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      theme: "grid",
      headStyles: { fillColor: [107, 33, 168] },
      styles: { fontSize: 9, cellPadding: 3 }
    });

    doc.save(`Custom_Attendance_${Date.now()}.pdf`);
  };

  const handleExportExcel = () => {
    if (filteredTeams.length === 0) return alert("No data");
    const exportData = [];
    
    let totalDay1Present = 0;
    let totalDay2Present = 0;
    let totalDay3Present = 0;
    let totalMembers = 0;

    filteredTeams.forEach(team => {
      const d1 = getTeamAttendanceSummary(team, "day1");
      const d2 = getTeamAttendanceSummary(team, "day2");
      const d3 = getTeamAttendanceSummary(team, "day3");

      exportData.push({
        "Type": "TEAM",
        "Name": team.teamName,
        "Role/Members": `${team.memberVerifications?.length || 0} Members`,
        "Day 1": `${d1.present}/${d1.total}`,
        "Day 2": `${d2.present}/${d2.total}`,
        "Day 3": `${d3.present}/${d3.total}`
      });

      if (team.memberVerifications) {
        team.memberVerifications.forEach(m => {
          exportData.push({
            "Type": "Member",
            "Name": m.name,
            "Role/Members": m.role || "Member",
            "Day 1": m.attendance?.day1 ? "Present" : "Absent",
            "Day 2": m.attendance?.day2 ? "Present" : "Absent",
            "Day 3": m.attendance?.day3 ? "Present" : "Absent"
          });
        });
      }
    });

    exportData.push({
      "Type": "TOTAL",
      "Name": "GRAND TOTAL",
      "Role/Members": `${totalMembers} Members`,
      "Day 1": `${totalDay1Present}/${totalMembers}`,
      "Day 2": `${totalDay2Present}/${totalMembers}`,
      "Day 3": `${totalDay3Present}/${totalMembers}`
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
    XLSX.writeFile(workbook, `Custom_Attendance_${Date.now()}.xlsx`);
  };

  const StatusIcon = ({ status }) => (
    status ? <CheckCircle className="text-emerald-500" size={18} /> : <XCircle className="text-red-300" size={18} />
  );

  let totalDay1Present = 0;
  let totalDay2Present = 0;
  let totalDay3Present = 0;
  let totalMembers = 0;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto w-full space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Attendance Tracking</h1>
          <p className="text-slate-500 mt-1">Advanced team-level and member-level attendance filtering.</p>
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
        {/* Filter Row */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col xl:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search team or member..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          
          <div className="flex items-center gap-3 overflow-x-auto pb-2 xl:pb-0 hide-scrollbar">
            <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl whitespace-nowrap shadow-sm">
              <Filter size={16} className="text-slate-400" />
              <span className="text-sm font-semibold text-slate-600">Day 1:</span>
              <select value={filterDay1} onChange={e => setFilterDay1(e.target.value)} className="bg-transparent text-sm font-bold text-indigo-700 outline-none cursor-pointer">
                <option value="All">All</option>
                <option value="Fully Present">Fully Present</option>
                <option value="Partially Present">Partially Present</option>
                <option value="Absent">Absent</option>
              </select>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl whitespace-nowrap shadow-sm">
              <Filter size={16} className="text-slate-400" />
              <span className="text-sm font-semibold text-slate-600">Day 2:</span>
              <select value={filterDay2} onChange={e => setFilterDay2(e.target.value)} className="bg-transparent text-sm font-bold text-indigo-700 outline-none cursor-pointer">
                <option value="All">All</option>
                <option value="Fully Present">Fully Present</option>
                <option value="Partially Present">Partially Present</option>
                <option value="Absent">Absent</option>
              </select>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl whitespace-nowrap shadow-sm">
              <Filter size={16} className="text-slate-400" />
              <span className="text-sm font-semibold text-slate-600">Day 3:</span>
              <select value={filterDay3} onChange={e => setFilterDay3(e.target.value)} className="bg-transparent text-sm font-bold text-indigo-700 outline-none cursor-pointer">
                <option value="All">All</option>
                <option value="Fully Present">Fully Present</option>
                <option value="Partially Present">Partially Present</option>
                <option value="Absent">Absent</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm font-semibold">
              <tr>
                <th className="py-3 px-4 w-1/3">Team Name</th>
                <th className="py-3 px-4 text-center">Day 1</th>
                <th className="py-3 px-4 text-center">Day 2</th>
                <th className="py-3 px-4 text-center">Day 3</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeams.map(team => {
                const d1 = getTeamAttendanceSummary(team, "day1");
                const d2 = getTeamAttendanceSummary(team, "day2");
                const d3 = getTeamAttendanceSummary(team, "day3");
                
                totalDay1Present += d1.present;
                totalDay2Present += d2.present;
                totalDay3Present += d3.present;
                totalMembers += d1.total;

                const isExpanded = expandedTeamId === team._id;

                return (
                  <React.Fragment key={team._id}>
                    <tr 
                      className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition ${isExpanded ? 'bg-indigo-50/30' : ''}`}
                      onClick={() => setExpandedTeamId(isExpanded ? null : team._id)}
                    >
                      <td className="py-4 px-4">
                        <div className="font-black text-slate-800 text-base">{team.teamName}</div>
                        <div className="text-xs text-slate-500">{team.memberVerifications?.length || 0} Members</div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-block px-3 py-1 rounded-lg text-xs font-bold ${d1.status === 'Fully Present' ? 'bg-emerald-100 text-emerald-700' : d1.status === 'Partially Present' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                          {d1.present}/{d1.total}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-block px-3 py-1 rounded-lg text-xs font-bold ${d2.status === 'Fully Present' ? 'bg-emerald-100 text-emerald-700' : d2.status === 'Partially Present' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                          {d2.present}/{d2.total}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-block px-3 py-1 rounded-lg text-xs font-bold ${d3.status === 'Fully Present' ? 'bg-emerald-100 text-emerald-700' : d3.status === 'Partially Present' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                          {d3.present}/{d3.total}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end text-slate-400">
                          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                      </td>
                    </tr>
                    
                    {isExpanded && (
                      <tr className="bg-slate-50 border-b border-slate-200 shadow-[inset_0_4px_6px_-6px_rgba(0,0,0,0.1)]">
                        <td colSpan="5" className="p-0">
                          <div className="p-4 bg-indigo-50/10">
                            {team.memberVerifications?.length > 0 ? (
                              <div className="rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm">
                                <table className="w-full text-sm">
                                  <thead className="bg-slate-100 border-b border-slate-200">
                                    <tr className="text-slate-600 font-semibold text-left">
                                      <th className="py-2 px-4">Member Name</th>
                                      <th className="py-2 px-4 text-center">Day 1</th>
                                      <th className="py-2 px-4 text-center">Day 2</th>
                                      <th className="py-2 px-4 text-center">Day 3</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {team.memberVerifications.map((m, i) => (
                                      <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                        <td className="py-3 px-4 font-medium text-slate-700">
                                          {m.name} <span className="text-xs text-slate-400 font-normal ml-1">({m.role})</span>
                                        </td>
                                        <td className="py-3 px-4"><div className="flex justify-center"><StatusIcon status={m.attendance?.day1} /></div></td>
                                        <td className="py-3 px-4"><div className="flex justify-center"><StatusIcon status={m.attendance?.day2} /></div></td>
                                        <td className="py-3 px-4"><div className="flex justify-center"><StatusIcon status={m.attendance?.day3} /></div></td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p className="text-slate-500 text-center py-4 text-sm font-medium">No members found for this team.</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {filteredTeams.length === 0 && (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-slate-500">
                    <div className="text-lg font-bold text-slate-600 mb-1">No matches found</div>
                    <p className="text-sm">Try adjusting your search or filters.</p>
                  </td>
                </tr>
              )}
            </tbody>
            {filteredTeams.length > 0 && (
              <tfoot className="bg-indigo-50/50 border-t-2 border-indigo-100 font-bold text-indigo-900">
                <tr>
                  <td className="py-4 px-4 text-right uppercase tracking-wider text-sm">Grand Total</td>
                  <td className="py-4 px-4 text-center">
                    <span className="bg-white px-3 py-1 rounded-lg border border-indigo-100 shadow-sm">{totalDay1Present}/{totalMembers}</span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="bg-white px-3 py-1 rounded-lg border border-indigo-100 shadow-sm">{totalDay2Present}/{totalMembers}</span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="bg-white px-3 py-1 rounded-lg border border-indigo-100 shadow-sm">{totalDay3Present}/{totalMembers}</span>
                  </td>
                  <td className="py-4 px-4"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
