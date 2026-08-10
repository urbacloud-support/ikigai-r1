import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import cloudinary from "cloudinary";
import { NotificationModel } from "./notification.routes.js";
import { ProblemStatement } from "./problem-statements.routes.js";


const router = express.Router();

/* ================== IKIGAI2 CONNECTION ================== */
// Create a separate connection for the "ikigai2" database
let ikigai2Db;
if (process.env.MONGO_URI) {
  const uri2 = process.env.MONGO_URI.replace("/ikigai?", "/ikigai2?");
  ikigai2Db = mongoose.createConnection(uri2);
}

/* ================== SCHEMA ================== */
const TeamSchema = new mongoose.Schema(
  {
    participantId: { type: String, required: true },
    teamName: { type: String, required: true },
    leaderEmail: { type: String, required: true },
    eventId: { type: String, required: true },
    members: { type: Array, default: [] },
    trackPreferences: { type: [String], required: true },
    tshirtSizes: { type: Object, default: {} },
    transactionId: { type: String, default: "" },
    receiptUrl: { type: String, default: "" },
    status: { type: String, default: "Pending" }, // Pending, Approved, Contact
    assignedTrack: { type: String, default: "" },
    assignedProblemStatement: { type: String, default: "" },
    reopenAccess: {
      open: { type: Boolean, default: false },
      fields: { type: [String], default: [] },
      expiresAt: { type: Date }
    }
  },
  { timestamps: true }
);

// We define the model on the ikigai2 connection.
// If ikigai2Db is not initialized, fallback to standard mongoose connection (for local tests if needed)
const TeamModel = ikigai2Db
  ? ikigai2Db.model("Team", TeamSchema, "teams")
  : mongoose.model("Team", TeamSchema, "teams");

// Need access to Shortlisted to pull members
const ShortlistedSchema = new mongoose.Schema({}, { strict: false });
const Shortlisted = mongoose.models.Shortlisted || mongoose.model("Shortlisted", ShortlistedSchema, "shortlisteds");

/* ================== MULTER ================== */
const upload = multer({ storage: multer.memoryStorage() });

/* ================== CLOUDINARY CONFIG ================== */
const getCloudinaryConfig = () => {
  const name = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const key = process.env.CLOUDINARY_API_KEY?.trim();
  const secret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (name && key && secret) {
    cloudinary.v2.config({
      cloud_name: name,
      api_key: key,
      api_secret: secret,
    });
    return true;
  }
  return false;
};

/* ================== ROUTES ================== */

// Student submits Round 2 registration
router.post(
  "/register",
  upload.single("receiptFile"),
  async (req, res) => {
    try {
      const { participantId, teamName, leaderEmail, eventId, transactionId, trackPreferences } = req.body;

      const existing = await TeamModel.findOne({ participantId });

      // Check reopen mode if already exists
      const isReopen = existing && existing.reopenAccess && existing.reopenAccess.open;

      if (!req.file && (!existing || !existing.receiptUrl)) {
        return res.status(400).json({ success: false, message: "No receipt provided" });
      }

      if (!getCloudinaryConfig()) {
        return res.status(500).json({ success: false, message: "Cloudinary is not configured" });
      }

      // Fetch members from Shortlisted
      let members = [];
      const shortlisted = await Shortlisted.findOne({
        $or: [
          { participantId: participantId },
          { participantId: String(participantId) },
          { participantId: mongoose.Types.ObjectId.isValid(participantId) ? new mongoose.Types.ObjectId(participantId) : null }
        ]
      });
      if (shortlisted && shortlisted.members) {
        members = shortlisted.members;
      }

      let finalReceiptUrl = existing ? existing.receiptUrl : "";

      if (req.file) {
        if (!getCloudinaryConfig()) {
          return res.status(500).json({ success: false, message: "Cloudinary is not configured" });
        }
        const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
        const result = await cloudinary.v2.uploader.upload(base64, {
          folder: `IKIGAI_Round2/${eventId}`,
          public_id: `${participantId}_receipt`,
          overwrite: true,
        });
        finalReceiptUrl = result.secure_url;
      }

      let prefs = [];
      if (trackPreferences) {
        prefs = JSON.parse(trackPreferences);
      } else if (existing) {
        prefs = existing.trackPreferences;
      }

      const updateData = {
        participantId,
        teamName,
        leaderEmail,
        eventId,
        members,
        status: "Pending"
      };

      if (prefs.length > 0) updateData.trackPreferences = prefs;
      if (transactionId) updateData.transactionId = transactionId;
      if (finalReceiptUrl) updateData.receiptUrl = finalReceiptUrl;

      // If this was a reopen submission, we can clear the reopenAccess
      if (isReopen) {
        updateData.reopenAccess = { open: false };
      }

      const registration = await TeamModel.findOneAndUpdate(
        { participantId },
        updateData,
        { upsert: true, new: true }
      );

      res.json({ success: true, registration });
    } catch (err) {
      console.error("Round 2 Registration Error:", err);
      res.status(500).json({ success: false, message: "Registration failed" });
    }
  }
);

// Admin fetches all registrations
router.get("/admin", async (req, res) => {
  try {
    const registrations = await TeamModel.find().sort({ createdAt: -1 });
    res.json({ success: true, registrations });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin update status (Allow / Contact)
router.put("/admin/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const registration = await TeamModel.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    
    // Generate Notification if Approved
    if (status === "Approved" && registration) {
      await NotificationModel.create({
        recipientEmail: registration.leaderEmail,
        title: "Registration Approved",
        message: "Your registration has been approved successfully.",
        type: "Approval"
      });
    }

    res.json({ success: true, registration });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin re-open specific fields
router.put("/admin/:id/reopen", async (req, res) => {
  try {
    const { open } = req.body; 

    const registration = await TeamModel.findByIdAndUpdate(
      req.params.id,
      {
        status: open ? "Contact" : "Pending", // Keeps them in Contact status until resubmission
        reopenAccess: { open }
      },
      { new: true }
    );

    if (registration && open) {
      await NotificationModel.create({
        recipientEmail: registration.leaderEmail,
        title: "Registration Re-opened",
        message: "Your registration requires modifications. Please review the comments and resubmit.",
        type: "Rejection"
      });
    }

    res.json({ success: true, registration });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Fetch my registration status for timeline
router.get("/my-status", async (req, res) => {
  try {
    const email = req.query.email;
    if (!email) return res.status(400).json({ success: false });

    const registration = await TeamModel.findOne({ leaderEmail: email });
    // Registration is only complete if a transactionId exists (meaning the final form was submitted).
    // If they only saved the sequence, transactionId will be missing.
    if (!registration || !registration.transactionId) {
      return res.json({ 
        success: true, 
        registered: false,
        trackPreferences: registration ? registration.trackPreferences : null,
        tshirtSizes: registration ? registration.tshirtSizes : null
      });
    }

    return res.json({
      success: true,
      registered: true,
      status: registration.status,
      reopenAccess: registration.reopenAccess,
      trackPreferences: registration.trackPreferences,
      tshirtSizes: registration.tshirtSizes,
      transactionId: registration.transactionId,
      receiptUrl: registration.receiptUrl,
      assignedTrack: registration.assignedTrack,
      assignedProblemStatement: registration.assignedProblemStatement
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Save track sequence directly
router.post("/save-sequence", async (req, res) => {
  try {
    const { participantId, teamName, leaderEmail, eventId, trackPreferences } = req.body;
    if (!participantId || !trackPreferences) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const prefs = typeof trackPreferences === "string" ? JSON.parse(trackPreferences) : trackPreferences;

    // Fetch members from Shortlisted to ensure they are populated on upsert
    let members = [];
    const shortlisted = await Shortlisted.findOne({
      $or: [
        { participantId: participantId },
        { participantId: String(participantId) },
        { participantId: mongoose.Types.ObjectId.isValid(participantId) ? new mongoose.Types.ObjectId(participantId) : null }
      ]
    });
    if (shortlisted && shortlisted.members) {
      members = shortlisted.members;
    }

    const registration = await TeamModel.findOneAndUpdate(
      { participantId },
      {
        participantId,
        teamName,
        leaderEmail,
        eventId,
        trackPreferences: prefs,
        $setOnInsert: {
          members,
          status: "Pending"
        }
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, registration });
  } catch (err) {
    console.error("Save Sequence Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Save t-shirt sizes
router.post("/save-tshirts", async (req, res) => {
  try {
    const { participantId, leaderEmail, tshirtSizes } = req.body;
    if (!participantId || !tshirtSizes) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const registration = await TeamModel.findOneAndUpdate(
      { participantId },
      { tshirtSizes },
      { new: true }
    );

    res.json({ success: true, registration });
  } catch (err) {
    console.error("Save T-Shirts Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export { TeamModel };
router.post("/upload-photo", upload.single("photo"), async (req, res) => {
  try {
    const { participantId, memberEmail, eventId } = req.body;
    if (!req.file || !participantId || !memberEmail) {
      return res.status(400).json({ success: false, message: "Missing file or required fields" });
    }

    if (!getCloudinaryConfig()) {
      return res.status(500).json({ success: false, message: "Cloudinary is not configured" });
    }

    const Shortlisted = mongoose.model("Shortlisted");
    const team = await Shortlisted.findOne({ participantId });
    if (!team) {
      return res.status(404).json({ success: false, message: "Team not found" });
    }

    const memberIndex = team.members.findIndex(m => m.email === memberEmail);
    if (memberIndex === -1) {
      return res.status(404).json({ success: false, message: "Member not found" });
    }

    const member = team.members[memberIndex];
    const memberName = member.name || `${member.firstName || ''} ${member.lastName || ''}`.trim();
    const sanitizedName = memberName.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
    
    const sameNameMembers = team.members.filter(m => {
      const n = m.name || `${m.firstName || ''} ${m.lastName || ''}`.trim();
      return n.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase() === sanitizedName;
    });
    
    let suffix = "";
    if (sameNameMembers.length > 1) {
      const index = sameNameMembers.findIndex(m => m.email === memberEmail);
      if (index > 0) suffix = `-${index + 1}`;
    }

    const publicId = `${team.teamId}_${sanitizedName}${suffix}`;
    const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    const result = await cloudinary.v2.uploader.upload(base64, {
      folder: `IKIGAI_Members/${eventId || team.eventId}`,
      public_id: publicId,
      overwrite: true,
    });

    const photoUrl = result.secure_url;
    
    await Shortlisted.updateOne(
      { participantId },
      { $set: { [`members.${memberIndex}.photoUrl`]: photoUrl } }
    );
    
    try {
      const Participant = mongoose.model("Participant");
      await Participant.updateOne(
        { _id: participantId },
        { $set: { [`members.${memberIndex}.photoUrl`]: photoUrl } }
      );
    } catch(e) {}

    try {
      await TeamModel.updateOne(
        { participantId },
        { $set: { [`members.${memberIndex}.photoUrl`]: photoUrl } }
      );
    } catch(e) {}

    res.json({ success: true, photoUrl });
  } catch (err) {
    console.error("Error uploading photo:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
// Update individual member's T-shirt size from My Team section
router.put("/update-tshirt", async (req, res) => {
  try {
    const { participantId, memberEmail, size, teamName, leaderEmail, eventId, members } = req.body;
    if (!participantId || !memberEmail || !size) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    let teamDoc = await TeamModel.findOne({ participantId });
    if (!teamDoc) {
      teamDoc = new TeamModel({
        participantId,
        teamName: teamName || "Unknown",
        leaderEmail: leaderEmail || "",
        eventId: eventId || "",
        members: members || [],
        trackPreferences: [],
        status: "Pending",
        tshirtSizes: { [memberEmail]: size }
      });
      await teamDoc.save();
    } else {
      teamDoc.tshirtSizes = teamDoc.tshirtSizes || {};
      teamDoc.tshirtSizes[memberEmail] = size;
      teamDoc.markModified('tshirtSizes');
      await teamDoc.save();
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Error updating t-shirt size:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});


// Choose Problem Statement (concurrent-safe)
router.post('/choose-problem-statement', async (req, res) => {
  try {
    const { participantId, leaderEmail, eventId, trackId, statementId } = req.body;

    const team = await TeamModel.findOne({ leaderEmail, status: 'Approved' });
    if (!team) return res.status(400).json({ success: false, message: 'Team not found or not approved' });
    if (team.assignedTrack !== trackId) return res.status(400).json({ success: false, message: 'Invalid track for this team' });
    if (team.assignedProblemStatement) return res.status(400).json({ success: false, message: 'Problem statement already selected' });

    // Check limit without decrementing
    const ps = await ProblemStatement.findOne({ eventId, trackId });
    if (!ps) return res.status(400).json({ success: false, message: 'Problem statements not found for this track' });

    const statement = ps.statements.find(s => s.id === statementId);
    if (!statement) return res.status(400).json({ success: false, message: 'Problem statement not found' });

    const assignedCount = await TeamModel.countDocuments({ eventId, assignedProblemStatement: statementId });
    
    if (assignedCount >= statement.limit) {
      return res.status(400).json({ success: false, message: 'Problem statement limit reached' });
    }

    team.assignedProblemStatement = statementId;
    await team.save();

    res.json({ success: true, team });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get available problem statements with computed limits
router.get("/available-statements", async (req, res) => {
  try {
    const { eventId, trackId } = req.query;
    if (!eventId || !trackId) return res.status(400).json({ success: false });

    const ps = await ProblemStatement.findOne({ eventId, trackId }).lean();
    if (!ps) return res.json({ success: true, statements: [] });

    for (const stmt of ps.statements) {
      const count = await TeamModel.countDocuments({ eventId, assignedProblemStatement: stmt.id });
      stmt.taken = count;
      stmt.left = stmt.limit - count;
    }
    res.json({ success: true, statements: ps.statements });
  } catch(err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


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

export default router;
