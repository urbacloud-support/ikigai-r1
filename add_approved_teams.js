const fs = require('fs');
let c = fs.readFileSync('backend/round2.routes.js', 'utf8');

const newEndpoint = `
// Get approved teams for an event
router.get("/admin/approved-teams/:eventId", async (req, res) => {
  try {
    const { eventId } = req.params;
    const teams = await TeamModel.find({ eventId, status: "Approved" });
    res.json({ success: true, teams });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
`;

if (!c.includes('/admin/approved-teams/:eventId')) {
  c = c.replace('export default router;', newEndpoint + '\nexport default router;');
  fs.writeFileSync('backend/round2.routes.js', c);
}
