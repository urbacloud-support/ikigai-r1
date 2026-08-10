import express from "express";
import mongoose from "mongoose";

const problemStatementSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
  trackId: { type: String, required: true },
  statements: [{
    id: { type: String, required: true },
    text: { type: String, required: true },
    limit: { type: Number, required: true, default: 0 },
  }],
}, { timestamps: true });

export const ProblemStatement = mongoose.models.ProblemStatement || mongoose.model("ProblemStatement", problemStatementSchema);

const router = express.Router();

// GET problem statements for an event
router.get("/:eventId", async (req, res) => {
  try {
    const data = await ProblemStatement.find({ eventId: req.params.eventId });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST/PUT to save problem statements for an event and track
router.post("/", async (req, res) => {
  try {
    const { eventId, trackId, statements } = req.body;
    let ps = await ProblemStatement.findOne({ eventId, trackId });
    if (ps) {
      ps.statements = statements;
      await ps.save();
    } else {
      ps = await ProblemStatement.create({ eventId, trackId, statements });
    }
    res.json({ success: true, data: ps });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
