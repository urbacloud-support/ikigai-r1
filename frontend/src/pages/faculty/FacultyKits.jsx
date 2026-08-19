import React, { useState } from "react";
import { Search, FileText, Download, CheckCircle, XCircle, ChevronDown, ChevronUp, Filter, Package } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import ikigaiLogo from "../../assets/ikigai.png";

export default function FacultyKits({ teamsData }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedTeamId, setExpandedTeamId] = useState(null);
  
  const [filterTeamKit, setFilterTeamKit] = useState("All");
  const [filterCerts, setFilterCerts] = useState("All");

  const getCertsSummary = (team) => {
    if (!team.memberVerifications || team.memberVerifications.length === 0) return { given: 0, total: 0, status: "None Given" };
    const total = team.memberVerifications.length;
    const given = team.memberVerifications.filter(m => m.certificateGiven).length;
    
    let status = "None Given";
    if (given === total) status = "Fully Distributed";
    else if (given > 0) status = "Partially Distributed";

    return { given, total, status };
  };

  const filteredTeams = teamsData.filter(team => {
    // 1. Search Filter
    const matchesSearch = 
      team.teamName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      team.leaderEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.memberVerifications?.some(m => m.name?.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    // 2. Kit & Cert Filters
    const certs = getCertsSummary(team);
    const kitStatus = team.registrationKitGiven ? "Given" : "Pending";

    if (filterTeamKit !== "All" && kitStatus !== filterTeamKit) return false;
    if (filterCerts !== "All" && certs.status !== filterCerts) return false;

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
    doc.text("Custom Kits & Certs Report", 65, 18, { align: "left" });
    
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    const filterText = `Filters -> Team Kit: ${filterTeamKit} | Certs: ${filterCerts}`;
    doc.text(filterText, 65, 26, { align: "left" });
    
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 32, 196, 32);

    const tableColumn = ["Team Name / Member Name", "Role", "Team Kit", "Certificates"];
    const tableRows = [];

    let totalKitsGiven = 0;
    let totalCertsGiven = 0;
    let totalMembers = 0;
    let totalTeams = filteredTeams.length;

    filteredTeams.forEach(team => {
      const certs = getCertsSummary(team);
      if (team.registrationKitGiven) totalKitsGiven++;
      totalCertsGiven += certs.given;
      totalMembers += certs.total;
      
      // Team Header Row
      tableRows.push([
        { content: `[TEAM] ${team.teamName}`, styles: { fontStyle: 'bold', fillColor: [250, 240, 245] } },
        { content: `${team.memberVerifications?.length || 0} Members`, styles: { fontStyle: 'bold', fillColor: [250, 240, 245] } },
        { content: team.registrationKitGiven ? "Given" : "Pending", styles: { fontStyle: 'bold', fillColor: [250, 240, 245] } },
        { content: `${certs.given}/${certs.total}`, styles: { fontStyle: 'bold', fillColor: [250, 240, 245] } }
      ]);

      if (team.memberVerifications) {
        team.memberVerifications.forEach(m => {
          tableRows.push([
            `   ${m.name}`,
            m.role || "Member",
            "-",
            m.certificateGiven ? "Given" : "Pending"
          ]);
        });
      }
    });

    tableRows.push([
      { content: "GRAND TOTAL", styles: { fontStyle: 'bold', fillColor: [240, 220, 230], halign: 'right' } },
      { content: `${totalTeams} Teams | ${totalMembers} Members`, styles: { fontStyle: 'bold', fillColor: [240, 220, 230] } },
      { content: `${totalKitsGiven}/${totalTeams}`, styles: { fontStyle: 'bold', fillColor: [240, 220, 230] } },
      { content: `${totalCertsGiven}/${totalMembers}`, styles: { fontStyle: 'bold', fillColor: [240, 220, 230] } }
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      theme: "grid",
      headStyles: { fillColor: [168, 33, 107] }, // Fuchsia tone for Kits
      styles: { fontSize: 9, cellPadding: 3 }
    });

    doc.save(`Custom_Kits_Certs_${Date.now()}.pdf`);
  };

  const handleExportExcel = () => {
    if (filteredTeams.length === 0) return alert("No data");
    const exportData = [];
    
    let totalKitsGiven = 0;
    let totalCertsGiven = 0;
    let totalMembers = 0;
    let totalTeams = filteredTeams.length;

    filteredTeams.forEach(team => {
      const certs = getCertsSummary(team);
      if (team.registrationKitGiven) totalKitsGiven++;
      totalCertsGiven += certs.given;
      totalMembers += certs.total;

      exportData.push({
        "Type": "TEAM",
        "Name": team.teamName,
        "Role/Members": `${team.memberVerifications?.length || 0} Members`,
        "Team Kit": team.registrationKitGiven ? "Given" : "Pending",
        "Certificates": `${certs.given}/${certs.total}`
      });

      if (team.memberVerifications) {
        team.memberVerifications.forEach(m => {
          exportData.push({
            "Type": "Member",
            "Name": m.name,
            "Role/Members": m.role || "Member",
            "Team Kit": "-",
            "Certificates": m.certificateGiven ? "Given" : "Pending"
          });
        });
      }
    });

    exportData.push({
      "Type": "TOTAL",
      "Name": "GRAND TOTAL",
      "Role/Members": `${totalTeams} Teams | ${totalMembers} Members`,
      "Team Kit": `${totalKitsGiven}/${totalTeams}`,
      "Certificates": `${totalCertsGiven}/${totalMembers}`
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Kits & Certs");
    XLSX.writeFile(workbook, `Custom_Kits_Certs_${Date.now()}.xlsx`);
  };

  const StatusIcon = ({ status }) => (
    status ? <CheckCircle className="text-fuchsia-500" size={18} /> : <XCircle className="text-slate-300" size={18} />
  );

  let uiTotalKitsGiven = 0;
  let uiTotalCertsGiven = 0;
  let uiTotalMembers = 0;
  let uiTotalTeams = filteredTeams.length;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto w-full space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Kits & Certificates</h1>
          <p className="text-slate-500 mt-1">Advanced tracking of team registration kits and participation certificates.</p>
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
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
            />
          </div>
          
          <div className="flex items-center gap-3 overflow-x-auto pb-2 xl:pb-0 hide-scrollbar">
            <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl whitespace-nowrap shadow-sm">
              <Package size={16} className="text-slate-400" />
              <span className="text-sm font-semibold text-slate-600">Team Kit:</span>
              <select value={filterTeamKit} onChange={e => setFilterTeamKit(e.target.value)} className="bg-transparent text-sm font-bold text-fuchsia-700 outline-none cursor-pointer">
                <option value="All">All</option>
                <option value="Given">Given</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl whitespace-nowrap shadow-sm">
              <FileText size={16} className="text-slate-400" />
              <span className="text-sm font-semibold text-slate-600">Certificates:</span>
              <select value={filterCerts} onChange={e => setFilterCerts(e.target.value)} className="bg-transparent text-sm font-bold text-fuchsia-700 outline-none cursor-pointer">
                <option value="All">All</option>
                <option value="Fully Distributed">Fully Distributed</option>
                <option value="Partially Distributed">Partially Distributed</option>
                <option value="None Given">None Given</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm font-semibold">
              <tr>
                <th className="py-3 px-4 w-1/3">Team Name</th>
                <th className="py-3 px-4 text-center">Team Kit</th>
                <th className="py-3 px-4 text-center">Certificates</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeams.map(team => {
                const certs = getCertsSummary(team);
                if (team.registrationKitGiven) uiTotalKitsGiven++;
                uiTotalCertsGiven += certs.given;
                uiTotalMembers += certs.total;

                const isExpanded = expandedTeamId === team._id;

                return (
                  <React.Fragment key={team._id}>
                    <tr 
                      className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition ${isExpanded ? 'bg-fuchsia-50/30' : ''}`}
                      onClick={() => setExpandedTeamId(isExpanded ? null : team._id)}
                    >
                      <td className="py-4 px-4">
                        <div className="font-black text-slate-800 text-base">{team.teamName}</div>
                        <div className="text-xs text-slate-500">{team.memberVerifications?.length || 0} Members</div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-block px-3 py-1 rounded-lg text-xs font-bold ${team.registrationKitGiven ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {team.registrationKitGiven ? "Given" : "Pending"}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-block px-3 py-1 rounded-lg text-xs font-bold ${certs.status === 'Fully Distributed' ? 'bg-emerald-100 text-emerald-700' : certs.status === 'Partially Distributed' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                          {certs.given}/{certs.total}
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
                        <td colSpan="4" className="p-0">
                          <div className="p-4 bg-fuchsia-50/10">
                            {team.memberVerifications?.length > 0 ? (
                              <div className="rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm">
                                <table className="w-full text-sm">
                                  <thead className="bg-slate-100 border-b border-slate-200">
                                    <tr className="text-slate-600 font-semibold text-left">
                                      <th className="py-2 px-4 w-1/2">Member Name</th>
                                      <th className="py-2 px-4 text-center w-1/2">Participation Certificate</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {team.memberVerifications.map((m, i) => (
                                      <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                        <td className="py-3 px-4 font-medium text-slate-700">
                                          {m.name} <span className="text-xs text-slate-400 font-normal ml-1">({m.role})</span>
                                        </td>
                                        <td className="py-3 px-4"><div className="flex justify-center"><StatusIcon status={m.certificateGiven} /></div></td>
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
                  <td colSpan="4" className="py-12 text-center text-slate-500">
                    <div className="text-lg font-bold text-slate-600 mb-1">No matches found</div>
                    <p className="text-sm">Try adjusting your search or filters.</p>
                  </td>
                </tr>
              )}
            </tbody>
            {filteredTeams.length > 0 && (
              <tfoot className="bg-fuchsia-50/50 border-t-2 border-fuchsia-100 font-bold text-fuchsia-900">
                <tr>
                  <td className="py-4 px-4 text-right uppercase tracking-wider text-sm">Grand Total</td>
                  <td className="py-4 px-4 text-center">
                    <span className="bg-white px-3 py-1 rounded-lg border border-fuchsia-100 shadow-sm">{uiTotalKitsGiven}/{uiTotalTeams} Teams</span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="bg-white px-3 py-1 rounded-lg border border-fuchsia-100 shadow-sm">{uiTotalCertsGiven}/{uiTotalMembers} Members</span>
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
