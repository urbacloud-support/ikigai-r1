const fs = require('fs');
let c = fs.readFileSync('frontend/src/pages/TeamMyTeam.jsx', 'utf8');

c = c.replace(
  'import {',
  `import { ChevronDown, ChevronUp, `
);

// Add state variables
c = c.replace(
  'const [draftTshirt, setDraftTshirt] = useState({});',
  `const [draftTshirt, setDraftTshirt] = useState({});
  const [isTracksExpanded, setIsTracksExpanded] = useState(false);
  const [trackName, setTrackName] = useState("");
  const [psText, setPsText] = useState("");`
);

// Update fetchTeam
const fetchTeamReplacement = `
    try {
      const email = sessionStorage.getItem("care_email");
      if (!email) return;

      const res = await fetch(
        \`\${API_BASE}/api/team/my-details?email=\${encodeURIComponent(email)}\`,
      );
      const data = await res.json();
      if (data.success) {
        setTeam(data.team);
      }

      const r2Res = await fetch(
        \`\${API_BASE}/api/round2/my-status?email=\${encodeURIComponent(email)}\`,
      );
      const r2Data = await r2Res.json();
      if (r2Res.ok && r2Data.registered) {
        setRound2Status(r2Data);
        
        // Fetch track and PS text
        const evRes = await fetch(\`\${API_BASE}/api/events/active\`);
        const evData = await evRes.json();
        const activeEv = evData.events?.find(e => e.isActive && e.type === "Hackathon");
        
        if (activeEv) {
          if (r2Data.assignedTrack) {
            const t = activeEv.tracks?.find(tr => tr.id === r2Data.assignedTrack || tr._id === r2Data.assignedTrack);
            if (t) setTrackName(t.title || t.name || r2Data.assignedTrack);
          }
          if (r2Data.assignedProblemStatement) {
            const psRes = await fetch(\`\${API_BASE}/api/problem-statements/\${activeEv._id}\`);
            const psJson = await psRes.json();
            if (psJson.success && psJson.data) {
              const trackPS = psJson.data.find(d => d.trackId === r2Data.assignedTrack);
              if (trackPS) {
                const statement = trackPS.statements.find(s => s.id === r2Data.assignedProblemStatement);
                if (statement) setPsText(statement.text);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("Error fetching team data", err);
    }
`;
c = c.replace(/try\s*\{\s*const email = sessionStorage\.getItem\("care_email"\);[\s\S]*?console\.error\("Error fetching team data", err\);\s*\}/, fetchTeamReplacement);

// Update Status string logic
const statusUIReplacement = `
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-start gap-3">
            <CheckCircle className="text-green-600 mt-1" size={20} />
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Status
              </p>
              <p className="text-lg font-bold text-gray-800">
                {!round2Status ? "Shortlisted for Round 2" : 
                 round2Status.assignedProblemStatement ? "Locked In" :
                 round2Status.assignedTrack ? "Track Assigned" :
                 round2Status.status === 'Approved' ? "Verified" :
                 round2Status.status === 'Contact' ? "Contact Admin" :
                 "Pending Review"}
              </p>
            </div>
          </div>
`;
c = c.replace(/<div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-start gap-3">\s*<CheckCircle className="text-green-600 mt-1" size=\{20\} \/>\s*<div>\s*<p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">\s*Status\s*<\/p>\s*<p className="text-lg font-bold text-gray-800">\s*Shortlisted for Round 2\s*<\/p>\s*<\/div>\s*<\/div>/, statusUIReplacement);

// Update assignedTrack and problem statement to use texts
c = c.replace(
  '{round2Status.assignedTrack}',
  '{round2Status.assignedTrack} - {trackName || "Unknown"}'
);

c = c.replace(
  '{round2Status.assignedProblemStatement}',
  '{round2Status.assignedProblemStatement} - {psText || "Loading..."}'
);

// Make Saved Track Preferences collapsible
const trackPrefReplacement = `
      {round2Status &&
        round2Status.trackPreferences &&
        round2Status.trackPreferences.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div 
              className="p-6 cursor-pointer flex justify-between items-center hover:bg-gray-50 transition"
              onClick={() => setIsTracksExpanded(!isTracksExpanded)}
            >
              <h2 className="text-xl font-bold text-gray-800 m-0">
                Saved Track Preferences
              </h2>
              {isTracksExpanded ? <ChevronUp className="text-gray-500" /> : <ChevronDown className="text-gray-500" />}
            </div>
            
            {isTracksExpanded && (
              <div className="px-6 pb-6 border-t border-gray-100 pt-4">
                <div className="mb-4 text-red-600 font-semibold text-sm">
                  <p>
                    Note: Selecting a preferred domain during registration does not
                    guarantee its allocation. Domain allotment will be based on
                    first-come, first-registration and successful Round 1 solution
                    submission, subject to availability.
                  </p>
                </div>
                <div className="space-y-2.5">
                  {round2Status.trackPreferences.map((track, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-100 rounded-lg"
                    >
                      <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </div>
                      <span className="font-semibold text-gray-800">{track}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
`;

c = c.replace(/\{round2Status &&[\s\S]*?round2Status\.trackPreferences\.length > 0 && \([\s\S]*?<\/div>\s*\)\}/, trackPrefReplacement);

fs.writeFileSync('frontend/src/pages/TeamMyTeam.jsx', c);
