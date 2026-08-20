import re

with open(r'c:\Users\KRISHNA KHIRBADODIYA\Desktop\Project\IKIGAI\frontend\src\pages\volunteer\VolunteerConsole.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace VolunteerVerification's handleToggleMember and Save buttons
verification_replace = """
  const [isEditing, setIsEditing] = useState(false);
  const handleSaveChanges = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/volunteer/bulk-update-members`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verificationId: teamData.verification._id,
          members: memberVerifications
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsEditing(false);
        alert("Changes saved successfully!");
      } else {
        alert("Failed to save changes.");
      }
    } catch (err) {
      alert("Error saving changes.");
    }
    setSubmitting(false);
  };

  const handleToggleMember = async (email, field, checked) => {
    let previousState;
    setMemberVerifications(prev => {
      previousState = prev[email];
      const updatedMember = { ...prev[email], [field]: checked };
      if (field === 'isPresent' && !checked) {
        updatedMember.identityVerified = false;
        updatedMember.governmentIdVerified = false;
        updatedMember.consentVerified = false;
      }
      return { ...prev, [email]: updatedMember };
    });
    
    // Only call individual API if we are checking in for the first time
    if (!isCheckedIn) {
      try {
        await fetch(`${API_BASE}/api/volunteer/verify-member`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            verificationId: teamData.verification._id,
            memberEmail: email,
            field,
            value: checked
          })
        });
      } catch (err) {
        setMemberVerifications(prev => ({ ...prev, [email]: previousState }));
        alert("Failed to save verification status");
      }
    }
  };
"""
content = re.sub(
    r'  const handleToggleMember = async \(email, field, checked\) => \{.*?\n  \};\n',
    verification_replace.strip() + '\n',
    content,
    flags=re.DOTALL
)

# Update disabled state in VolunteerVerification
content = content.replace('disabled={submitting}', 'disabled={submitting || (isCheckedIn && !isEditing)}')

# Replace Action buttons in VolunteerVerification
action_buttons = """
      {/* Actions */}
      {!isCheckedIn && (
        <button
          onClick={handleApproveTeam}
          disabled={submitting || !isReadyToApprove}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black text-lg rounded-2xl shadow-lg transition flex justify-center items-center gap-2"
        >
          {submitting ? "Approving..." : "APPROVE ENTRY"} <ChevronRight size={20} />
        </button>
      )}
      
      {isCheckedIn && !isEditing && (
        <div className="flex flex-col gap-3">
          <button onClick={() => setIsEditing(true)} className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white font-black text-lg rounded-2xl shadow-lg transition">
            Edit Verification
          </button>
          <button onClick={onComplete} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg rounded-2xl shadow-lg transition">
            {buttonText}
          </button>
        </div>
      )}

      {isCheckedIn && isEditing && (
        <div className="flex flex-col gap-3">
          <button onClick={handleSaveChanges} disabled={submitting} className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg rounded-2xl shadow-lg transition">
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
          <button onClick={() => setIsEditing(false)} disabled={submitting} className="w-full py-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black text-lg rounded-2xl shadow-lg transition">
            Cancel
          </button>
        </div>
      )}
"""
content = re.sub(
    r'      \{/\* Actions \*/\}.*?    </div>\n  \);\n\}',
    action_buttons.strip() + '\n    </div>\n  );\n}',
    content,
    flags=re.DOTALL
)

# Replace VolunteerAttendance
new_attendance = """
function VolunteerAttendance() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTeam, setExpandedTeam] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchTeams(); }, []);

  const fetchTeams = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/volunteer/all-checked-in-teams`);
      const data = await res.json();
      if (data.success) { setTeams(data.teams); } else { setError("Failed to fetch teams."); }
    } catch (err) { setError("Error connecting."); }
    setLoading(false);
  };

  const handleToggleAttendance = (teamId, memberEmail, day, value) => {
    setTeams(prev => prev.map(t => {
      if (t._id === teamId) {
        const newMv = t.memberVerifications.map(m => m.memberEmail === memberEmail ? { ...m, attendance: { ...m.attendance, [day]: value } } : m);
        return { ...t, memberVerifications: newMv, isEdited: true };
      }
      return t;
    }));
  };

  const handleMarkAllPresent = (teamId, day) => {
    setTeams(prev => prev.map(t => {
      if (t._id === teamId) {
        const newMv = t.memberVerifications.map(m => m.isPresent ? { ...m, attendance: { ...m.attendance, [day]: true } } : m);
        return { ...t, memberVerifications: newMv, isEdited: true };
      }
      return t;
    }));
  };

  const handleSaveAttendance = async (teamId) => {
    setSubmitting(true);
    const team = teams.find(t => t._id === teamId);
    const membersMap = {};
    team.memberVerifications.forEach(m => { membersMap[m.memberEmail] = m; });
    try {
      const res = await fetch(`${API_BASE}/api/volunteer/bulk-update-members`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationId: teamId, members: membersMap })
      });
      if (res.ok) {
        setTeams(prev => prev.map(t => t._id === teamId ? { ...t, isEdited: false } : t));
        alert("Attendance saved!");
      }
    } catch (err) { alert("Failed to save."); }
    setSubmitting(false);
  };

  if (loading) return <div className="p-12 text-center text-indigo-600 font-bold">Loading...</div>;
  if (error) return <div className="p-12 text-center text-red-600 font-bold">{error}</div>;

  const filteredTeams = teams.filter(t => t.teamId?.teamName?.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="p-4 md:p-8 max-w-md md:max-w-6xl mx-auto w-full pb-24 md:pb-8">
      <h2 className="text-2xl font-black text-slate-800 mb-6">Attendance Tracker</h2>
      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input type="text" placeholder="Search Teams..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500" />
      </div>
      <div className="space-y-4">
        {filteredTeams.map(item => (
          <div key={item._id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-colors ${item.isEdited ? 'border-amber-400 ring-2 ring-amber-400/20' : 'border-slate-200'}`}>
            <div onClick={() => setExpandedTeam(expandedTeam === item._id ? null : item._id)} className="p-4 bg-slate-50 cursor-pointer flex justify-between items-center hover:bg-slate-100 transition">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">{item.teamId?.teamName || "Unknown Team"}</h3>
                <p className="text-xs text-slate-500">{item.teamId?.assignedTrack || "No Track"}</p>
              </div>
              <ChevronRight size={20} className={`text-slate-400 transition-transform ${expandedTeam === item._id ? 'rotate-90' : ''}`} />
            </div>
            {expandedTeam === item._id && (
              <div className="p-4">
                <div className="flex gap-2 mb-4 p-3 bg-indigo-50 rounded-xl border border-indigo-100 items-center justify-between flex-wrap">
                  <span className="text-sm font-bold text-indigo-900 flex items-center gap-2"><CheckCircle size={16}/> Quick Actions</span>
                  <div className="flex gap-2">
                    {['day1', 'day2', 'day3'].map(day => (
                      <button key={`markall-${day}`} onClick={() => handleMarkAllPresent(item._id, day)} disabled={submitting} className="px-3 py-1.5 bg-white text-indigo-600 text-xs font-bold rounded shadow-sm hover:bg-indigo-600 hover:text-white transition">All {day.replace('day', 'Day ')}</button>
                    ))}
                  </div>
                </div>
                <div className="divide-y divide-slate-100">
                  {item.memberVerifications.map((member, idx) => {
                    if (!member.isPresent) return null;
                    return (
                      <div key={idx} className="py-4">
                        <p className="font-bold text-slate-800">{member.name}</p>
                        <div className="flex gap-2 mt-2">
                          {['day1', 'day2', 'day3'].map(day => {
                            const isPresent = member.attendance?.[day] || false;
                            const labels = { day1: 'Day 1', day2: 'Day 2', day3: 'Day 3' };
                            return (
                              <button key={day} disabled={submitting} onClick={() => handleToggleAttendance(item._id, member.memberEmail, day, !isPresent)} className={`flex-1 py-2 rounded-lg text-sm font-bold border-2 transition-all ${isPresent ? 'bg-emerald-100 border-emerald-500 text-emerald-800' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                                {labels[day]}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {item.isEdited && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <button onClick={() => handleSaveAttendance(item._id)} disabled={submitting} className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-md transition">
                      {submitting ? 'Saving...' : 'Save Attendance'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
"""
content = re.sub(
    r'function VolunteerAttendance\(\) \{.*?\n\}\n\n// --- KITS & CERTIFICATES COMPONENT ---',
    new_attendance.strip() + '\n\n// --- KITS & CERTIFICATES COMPONENT ---',
    content,
    flags=re.DOTALL
)

# Replace VolunteerKitsCertificates
new_kits = """
function VolunteerKitsCertificates() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTeam, setExpandedTeam] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchTeams(); }, []);

  const fetchTeams = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/volunteer/all-checked-in-teams`);
      const data = await res.json();
      if (data.success) { setTeams(data.teams); } else { setError("Failed to fetch teams."); }
    } catch (err) { setError("Error connecting."); }
    setLoading(false);
  };

  const handleToggleKit = async (verificationId, value) => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/volunteer/update-team-status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationId, field: 'registrationKitGiven', value })
      });
      if (res.ok) { setTeams(prev => prev.map(t => t._id === verificationId ? { ...t, registrationKitGiven: value } : t)); }
    } catch (err) {}
    setSubmitting(false);
  };

  const handleToggleCertificate = async (verificationId, memberEmail, value) => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/volunteer/update-member-status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationId, memberEmail, field: 'certificateGiven', value })
      });
      if (res.ok) {
        setTeams(prev => prev.map(t => {
          if (t._id === verificationId) {
            const newMv = t.memberVerifications.map(m => m.memberEmail === memberEmail ? { ...m, certificateGiven: value } : m);
            return { ...t, memberVerifications: newMv };
          }
          return t;
        }));
      }
    } catch (err) {}
    setSubmitting(false);
  };

  if (loading) return <div className="p-12 text-center text-indigo-600 font-bold">Loading...</div>;
  if (error) return <div className="p-12 text-center text-red-600 font-bold">{error}</div>;

  const filteredTeams = teams.filter(t => t.teamId?.teamName?.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="p-4 md:p-8 max-w-md md:max-w-6xl mx-auto w-full pb-24 md:pb-8">
      <h2 className="text-2xl font-black text-slate-800 mb-6">Kits & Certificates</h2>
      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input type="text" placeholder="Search Teams..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 shadow-sm" />
      </div>
      <div className="space-y-4">
        {filteredTeams.map(item => (
          <div key={item._id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div onClick={() => setExpandedTeam(expandedTeam === item._id ? null : item._id)} className="p-4 bg-slate-50 cursor-pointer flex justify-between items-center hover:bg-slate-100 transition">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">{item.teamId?.teamName || "Unknown Team"}</h3>
                <div className="flex gap-2 mt-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${item.registrationKitGiven ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    KIT {item.registrationKitGiven ? 'ISSUED' : 'PENDING'}
                  </span>
                </div>
              </div>
              <ChevronRight size={20} className={`text-slate-400 transition-transform ${expandedTeam === item._id ? 'rotate-90' : ''}`} />
            </div>
            {expandedTeam === item._id && (
              <div className="p-5">
                {/* Team Kit Card */}
                <div className="mb-6 p-5 bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-2xl shadow-sm">
                  <div className="flex justify-between items-center flex-wrap gap-4">
                    <div>
                      <h4 className="font-black text-indigo-900 text-lg flex items-center gap-2"><Award className="text-indigo-500"/> Team Registration Kit</h4>
                      <p className="text-sm text-indigo-600 font-medium mt-1">Issue the hackathon starter kit to the team.</p>
                    </div>
                    <button
                      disabled={submitting}
                      onClick={() => handleToggleKit(item._id, !item.registrationKitGiven)}
                      className={`px-5 py-2.5 rounded-xl font-bold shadow-sm transition-all ${item.registrationKitGiven ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200' : 'bg-emerald-500 text-white hover:bg-emerald-600'}`}
                    >
                      {item.registrationKitGiven ? 'Revoke Kit' : 'Issue Kit'}
                    </button>
                  </div>
                </div>
                
                {/* Certificates */}
                <h4 className="font-black text-slate-700 mb-4 px-2">Participation Certificates</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {item.memberVerifications.map((member, idx) => {
                    if (!member.isPresent) return null;
                    const certGiven = member.certificateGiven;
                    return (
                      <div key={idx} className={`p-4 rounded-xl border flex justify-between items-center transition-all ${certGiven ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
                        <div>
                          <p className="font-bold text-slate-800">{member.name}</p>
                          <span className={`text-[10px] px-2 py-0.5 rounded mt-1 inline-block font-bold ${certGiven ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                            {certGiven ? 'CERTIFICATE ISSUED' : 'PENDING'}
                          </span>
                        </div>
                        <button
                          disabled={submitting}
                          onClick={() => handleToggleCertificate(item._id, member.memberEmail, !certGiven)}
                          className={`p-2.5 rounded-lg transition-colors ${certGiven ? 'text-red-500 bg-white hover:bg-red-50 border border-red-100' : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 font-bold px-4'}`}
                        >
                          {certGiven ? <X size={20} /> : 'Issue'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
"""
content = re.sub(
    r'function VolunteerKitsCertificates\(\) \{.*?\n\}\n\n// --- MAIN CONSOLE COMPONENT ---',
    new_kits.strip() + '\n\n// --- MAIN CONSOLE COMPONENT ---',
    content,
    flags=re.DOTALL
)

with open(r'c:\Users\KRISHNA KHIRBADODIYA\Desktop\Project\IKIGAI\frontend\src\pages\volunteer\VolunteerConsole.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Update complete")
