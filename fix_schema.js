const fs = require('fs');
let c = fs.readFileSync('backend/round2.routes.js', 'utf8');

if (!c.includes('assignedTrack: { type: String, default: "" }')) {
  c = c.replace('status: { type: String, default: "Pending" }, // Pending, Approved, Contact',
    'status: { type: String, default: "Pending" }, // Pending, Approved, Contact\n    assignedTrack: { type: String, default: "" },\n    assignedProblemStatement: { type: String, default: "" },');
}

const assignTrackEndpoint = `
// Assign track to team
router.put("/admin/assign-track", async (req, res) => {
  try {
    const { teamId, assignedTrack } = req.body;
    const team = await TeamModel.findByIdAndUpdate(teamId, { assignedTrack, assignedProblemStatement: "" }, { new: true });
    if (team) {
      res.json({ success: true, team });
    } else {
      res.status(404).json({ success: false, message: "Team not found" });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
`;

if (!c.includes('/admin/assign-track')) {
  c = c.replace('export default router;', assignTrackEndpoint + '\nexport default router;');
}

fs.writeFileSync('backend/round2.routes.js', c);
