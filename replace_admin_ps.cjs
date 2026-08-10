const fs = require('fs');
let c = fs.readFileSync('frontend/src/pages/admin/AdminProblemStatements.jsx', 'utf8');

if (!c.includes('const [teams, setTeams] = useState([])')) {
  c = c.replace('const [loading, setLoading] = useState(false);', 
`const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState([]);
  const [editingStatementIds, setEditingStatementIds] = useState(new Set());
  const [expandedStatementId, setExpandedStatementId] = useState(null);`);
}

const fetchTeamsFunc = `
  const fetchTeams = async (eventId) => {
    try {
      const res = await fetch(\`\${API_BASE}/api/round2/admin/approved-teams/\${eventId}\`);
      const data = await res.json();
      if (data.success) {
        setTeams(data.teams);
      }
    } catch (error) {
      console.error("Error fetching teams:", error);
    }
  };
`;

if (!c.includes('const fetchTeams = async')) {
  c = c.replace('const fetchProblemStatements = async', fetchTeamsFunc + '\n  const fetchProblemStatements = async');
}

c = c.replace('fetchProblemStatements(ev._id || ev.id);', 'fetchProblemStatements(ev._id || ev.id);\n      fetchTeams(ev._id || ev.id);');

const toggleEditFunc = `
  const toggleEdit = (id) => {
    setEditingStatementIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
`;

if (!c.includes('const toggleEdit = (id) => {')) {
  c = c.replace('const handleAddStatement =', toggleEditFunc + '\n  const handleAddStatement =');
}

c = c.replace(`const newStatement = {
      id: newId,
      text: "",
      limit: 1,
    };`, `const newStatement = {
      id: newId,
      text: "",
      limit: 1,
    };
    toggleEdit(newId);`);

const statementUIMatch = `{trackStatements.map((stmt, idx) => (`;

const newStatementUI = `{trackStatements.map((stmt, idx) => {
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
                                            alert(\`Cannot reduce limit below \${assignedTeams.length}. \${assignedTeams.length} teams have already chosen this problem statement.\`);
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
                          })}`;

if (c.includes(statementUIMatch)) {
  const parts = c.split(statementUIMatch);
  const part2 = parts[1];
  const closeIdx = part2.indexOf('</div>\n                          ))}');
  if (closeIdx !== -1) {
    c = parts[0] + newStatementUI + part2.substring(closeIdx + '</div>\n                          ))}'.length);
    fs.writeFileSync('frontend/src/pages/admin/AdminProblemStatements.jsx', c);
  } else {
    // try alternative finding
    const altCloseIdx = part2.indexOf('))}');
    if (altCloseIdx !== -1) {
      // Find the end of the map block
      const rest = part2.substring(altCloseIdx + 3);
      c = parts[0] + newStatementUI + rest;
      fs.writeFileSync('frontend/src/pages/admin/AdminProblemStatements.jsx', c);
    }
  }
}
