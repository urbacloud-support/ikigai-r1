const fs = require('fs');
let c = fs.readFileSync('round2.routes.js', 'utf8');

c = c.replace(
  'expiresAt: { type: Date }\r\n    }\r\n  },',
  'expiresAt: { type: Date }\r\n    },\r\n    assignedTrack: { type: String, default: "" },\r\n    assignedProblemStatement: { type: String, default: "" }\r\n  },'
);
c = c.replace(
  'expiresAt: { type: Date }\n    }\n  },',
  'expiresAt: { type: Date }\n    },\n    assignedTrack: { type: String, default: "" },\n    assignedProblemStatement: { type: String, default: "" }\n  },'
);

const routes = `
// Admin fetches approved teams for an event
router.get("/admin/approved-teams/:eventId", async (req, res) => {
  try {
    const teams = await TeamModel.find({ 
      eventId: req.params.eventId,
      status: "Approved" 
    }).sort({ createdAt: -1 });
    res.json({ success: true, teams });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin updates assigned track
router.put("/admin/assign-track", async (req, res) => {
  try {
    const { teamId, assignedTrack } = req.body;
    const team = await TeamModel.findByIdAndUpdate(
      teamId,
      { assignedTrack, assignedProblemStatement: "" },
      { new: true }
    );
    res.json({ success: true, team });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
`;

if (!c.includes('/admin/approved-teams/:eventId')) {
  c = c.replace(
    '// Admin update status',
    routes + '\r\n// Admin update status'
  );
  if (!c.includes(routes.trim())) {
    c = c.replace(
      '// Admin update status',
      routes + '\n// Admin update status'
    );
  }
}

fs.writeFileSync('round2.routes.js', c);
console.log("Done");
