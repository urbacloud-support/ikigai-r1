const fs = require('fs');
let c = fs.readFileSync('frontend/src/pages/TeamHome.jsx', 'utf8');

const submitPSFunc = `
  const submitProblemStatement = async () => {
    if (!selectedPS) return;
    setSubmittingPS(true);
    try {
      const res = await fetch(\`\${API_BASE}/api/round2/choose-problem-statement\`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: teamInfo.participantId,
          leaderEmail: sessionStorage.getItem("care_email"),
          eventId: event._id,
          trackId: assignedTrack,
          statementId: selectedPS
        })
      });
      const data = await res.json();
      if (data.success) {
        setAssignedProblemStatement(selectedPS);
        alert("Problem statement successfully assigned!");
      } else {
        alert(data.message || "Failed to assign problem statement. It may be fully booked.");
        // Refresh available
        window.location.reload();
      }
    } catch (err) {
      alert("Error assigning problem statement");
    }
    setSubmittingPS(false);
  };
`;

if (!c.includes('submitProblemStatement')) {
  c = c.replace('const handleDragEnd', submitPSFunc + '\n  const handleDragEnd');
}

const uiTarget = `{submitted && !isReopened ? (
        <div className="bg-white p-10 rounded-2xl shadow-sm border border-green-200 text-center">
          <div
            className={\`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 \${regStatus === "Approved" ? "bg-green-100 text-green-600" : regStatus === "Contact" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"}\`}
          >
            {regStatus === "Approved" ? (
              <Upload size={40} />
            ) : (
              <Upload size={40} />
            )}
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            {regStatus === "Approved" && teamInfo?.allottedTrack
              ? "Track & Problem Statement Available!"
              : regStatus === "Approved"
                ? "Registration Verified!"
                : regStatus === "Contact"
                  ? "Action Required"
                  : "Registration Verification Pending"}
          </h2>
          <p className="text-gray-600">
            {regStatus === "Approved" && teamInfo?.allottedTrack
              ? "Your final track has been allotted. Check your problem statement above and get ready for the 36-hour hackathon!"
              : regStatus === "Approved"
                ? "Your registration has been approved. The Admin is currently reviewing your preferences to allot your final track and problem statement. Please check back soon."
                : regStatus === "Contact"
                  ? "There is an issue with your registration. Please contact the organizers immediately."
                  : "Your Round 2 preferences and payment receipt have been received and are pending verification."}
          </p>
        </div>
      ) : (`;

const uiReplacement = `{submitted && !isReopened ? (
        regStatus === "Approved" && assignedTrack && publishProblemStatements ? (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-purple-200">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Congratulations, you have been assigned {assignedTrack} - {tracks.find(t => t.id === assignedTrack || t._id === assignedTrack)?.title || assignedTrack}.
            </h2>
            
            {assignedProblemStatement ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Upload size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Problem Statement Selected!</h3>
                <p className="text-gray-600 mb-4">You have successfully locked in your problem statement.</p>
                <div className="inline-block bg-white border border-gray-200 rounded-lg p-4 text-left shadow-sm max-w-2xl w-full">
                  <div className="flex gap-4 items-center">
                    <div className="text-3xl font-black text-green-600 opacity-50">{assignedProblemStatement}</div>
                    <div className="text-gray-800 font-semibold text-lg">{availableProblemStatements.find(p => p.id === assignedProblemStatement)?.text || "Your problem statement"}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-gray-600 mb-6 text-lg">Choose one of the following problem statements:</p>
                <div className="space-y-4">
                  {availableProblemStatements.length > 0 ? availableProblemStatements.map((ps) => (
                    <div 
                      key={ps.id}
                      onClick={() => setSelectedPS(ps.id)}
                      className={\`cursor-pointer border-2 rounded-xl p-5 flex gap-5 items-center transition-all \${selectedPS === ps.id ? 'border-purple-600 bg-purple-50 shadow-md transform scale-[1.02]' : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'}\`}
                    >
                      <div className={\`text-4xl font-black \${selectedPS === ps.id ? 'text-purple-600' : 'text-gray-300'}\`}>
                        {ps.id}
                      </div>
                      <div className="flex-1 text-gray-800 font-medium text-lg leading-snug">
                        {ps.text}
                      </div>
                      <div className="text-sm font-bold text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200">
                        {ps.limit} left
                      </div>
                    </div>
                  )) : (
                    <p className="text-red-500 font-bold p-4 bg-red-50 rounded-lg text-center border border-red-200">No problem statements are currently available. They may be fully booked.</p>
                  )}
                </div>
                
                <div className="mt-8 flex justify-end">
                  <button
                    onClick={submitProblemStatement}
                    disabled={!selectedPS || submittingPS}
                    className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {submittingPS ? "Locking in..." : "Confirm Selection"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white p-10 rounded-2xl shadow-sm border border-green-200 text-center">
            <div
              className={\`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 \${regStatus === "Approved" ? "bg-green-100 text-green-600" : regStatus === "Contact" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"}\`}
            >
              <Upload size={40} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {regStatus === "Approved" && assignedTrack
                ? "Track Assigned. Awaiting Problem Statements!"
                : regStatus === "Approved"
                  ? "Registration Verified!"
                  : regStatus === "Contact"
                    ? "Action Required"
                    : "Registration Verification Pending"}
            </h2>
            <p className="text-gray-600">
              {regStatus === "Approved" && assignedTrack
                ? "Your final track has been allotted. Problem statements will be released soon. Keep checking back!"
                : regStatus === "Approved"
                  ? "Your registration has been approved. The Admin is currently reviewing your preferences to allot your final track and problem statement. Please check back soon."
                  : regStatus === "Contact"
                    ? "There is an issue with your registration. Please contact the organizers immediately."
                    : "Your Round 2 preferences and payment receipt have been received and are pending verification."}
            </p>
          </div>
        )
      ) : (`;

if (c.includes('{submitted && !isReopened ? (') && !c.includes('regStatus === "Approved" && assignedTrack && publishProblemStatements ? (')) {
  c = c.replace(uiTarget, uiReplacement);
  fs.writeFileSync('frontend/src/pages/TeamHome.jsx', c);
}
