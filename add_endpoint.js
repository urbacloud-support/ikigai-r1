const fs = require('fs');
let c = fs.readFileSync('backend/round2.routes.js', 'utf8');

const importStmt = 'import { ProblemStatement } from "./problem-statements.routes.js";\n';
if (!c.includes(importStmt)) {
  c = c.replace('import { NotificationModel } from "./notification.routes.js";', 'import { NotificationModel } from "./notification.routes.js";\n' + importStmt);
}

const endpoint = `
// Choose Problem Statement (concurrent-safe)
router.post('/choose-problem-statement', async (req, res) => {
  try {
    const { participantId, leaderEmail, eventId, trackId, statementId } = req.body;

    const team = await TeamModel.findOne({ leaderEmail, status: 'Approved' });
    if (!team) return res.status(400).json({ success: false, message: 'Team not found or not approved' });
    if (team.assignedTrack !== trackId) return res.status(400).json({ success: false, message: 'Invalid track for this team' });
    if (team.assignedProblemStatement) return res.status(400).json({ success: false, message: 'Problem statement already selected' });

    // Atomic decrement
    const ps = await ProblemStatement.findOneAndUpdate(
      { eventId, trackId, 'statements': { $elemMatch: { id: statementId, limit: { $gt: 0 } } } },
      { $inc: { 'statements.$.limit': -1 } },
      { new: true }
    );

    if (!ps) return res.status(400).json({ success: false, message: 'Problem statement limit reached or not found' });

    team.assignedProblemStatement = statementId;
    await team.save();

    res.json({ success: true, team });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
`;

if (!c.includes('/choose-problem-statement')) {
  c = c.replace('export default router;', endpoint + '\nexport default router;');
  fs.writeFileSync('backend/round2.routes.js', c);
}
