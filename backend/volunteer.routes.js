import express from "express";
import mongoose from "mongoose";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { TeamModel } from "./round2.routes.js";

// Helper function to hash passwords matching server.js logic
const hashPassword = (password) =>
  crypto.createHash("sha256").update(password).digest("hex");

/* ================== SCHEMAS ================== */

// 1. Student Volunteer Schema
export const StudentVolunteerSchema = new mongoose.Schema(
  {
    name: String,
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    phone: String,
    passwordHash: String,
    eventId: String,
  },
  { timestamps: true }
);

StudentVolunteerSchema.index(
  { email: 1, eventId: 1 },
  { unique: true }
);

export const StudentVolunteer = mongoose.models.StudentVolunteer || mongoose.model(
  "StudentVolunteer",
  StudentVolunteerSchema
);

// 2. Team Verification Schema
export const TeamVerificationSchema = new mongoose.Schema(
  {
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team" }, 
    participantId: String,
    eventId: String,
    qrToken: { type: String, unique: true }, 
    qrGeneratedAt: Date,

    // Array tracking the verification of each member
    memberVerifications: [
      {
        memberEmail: String,
        name: String,
        role: String, // "Team Leader" | "Team Member"
        
        identityVerified: { type: Boolean, default: false },
        governmentIdVerified: { type: Boolean, default: false },
        governmentIdType: { type: String, default: "" }, 
        consentVerified: { type: Boolean, default: false },
        isPresent: { type: Boolean, default: true },
        
        verifiedAt: Date,
      }
    ],

    status: {
      type: String,
      enum: ["PENDING", "IN_PROGRESS", "CHECKED_IN"],
      default: "PENDING"
    },

    verifiedBy: {
      volunteerId: mongoose.Schema.Types.ObjectId,
      name: String,
      email: String,
    },
    checkedInAt: Date,
  },
  { timestamps: true }
);

// We define this in the primary DB connection along with standard models
export const TeamVerification = mongoose.models.TeamVerification || mongoose.model(
  "TeamVerification",
  TeamVerificationSchema
);

// Also need access to Shortlisted to pull members
const ShortlistedSchema = new mongoose.Schema({}, { strict: false });
const Shortlisted = mongoose.models.Shortlisted || mongoose.model("Shortlisted", ShortlistedSchema, "shortlisteds");


const router = express.Router();


/* ================== ADMIN ENDPOINTS ================== */

// Generate QR tokens for selected teams
router.post("/admin/generate-team-qrs", async (req, res) => {
  try {
    const { teamIds, eventId } = req.body; // teamIds refers to the actual _id of TeamModel

    if (!Array.isArray(teamIds) || teamIds.length === 0) {
      return res.status(400).json({ success: false, message: "No teams selected" });
    }

    const generated = [];
    const skipped = [];

    // Find the teams to verify they are eligible
    const teams = await TeamModel.find({ _id: { $in: teamIds } });

    for (const team of teams) {
      if (!team.assignedProblemStatement) {
        skipped.push({ teamId: team._id, reason: "No problem statement submitted" });
        continue;
      }

      // Check if already exists
      let verification = await TeamVerification.findOne({ teamId: team._id });
      if (verification && verification.qrToken) {
        skipped.push({ teamId: team._id, reason: "QR already generated" });
        continue;
      }

      // Fetch the actual members from Shortlisted to prepopulate memberVerifications
      const shortlisted = await Shortlisted.findOne({
        $or: [
          { participantId: team.participantId },
          { participantId: String(team.participantId) },
          { participantId: new mongoose.Types.ObjectId(team.participantId) },
        ],
      });

      const memberVerifications = [];
      if (shortlisted && shortlisted.members) {
        shortlisted.members.forEach((m) => {
          memberVerifications.push({
            memberEmail: m.email,
            name: m.name,
            role: m.candidateRole || (m.isLeader ? "Team Leader" : "Team Member"),
            identityVerified: false,
            governmentIdVerified: false,
            consentVerified: false,
            isPresent: true,
          });
        });
      }

      const qrToken = uuidv4();

      if (verification) {
        // Update existing verification record
        verification.qrToken = qrToken;
        verification.qrGeneratedAt = new Date();
        verification.memberVerifications = memberVerifications;
        await verification.save();
      } else {
        // Create new
        verification = new TeamVerification({
          teamId: team._id,
          participantId: team.participantId,
          eventId: eventId || team.eventId,
          qrToken,
          qrGeneratedAt: new Date(),
          memberVerifications,
          status: "PENDING"
        });
        await verification.save();
      }
      generated.push(team._id);
    }

    res.json({ 
      success: true, 
      generatedCount: generated.length,
      skippedCount: skipped.length,
      skippedDetails: skipped 
    });

  } catch (error) {
    console.error("Generate QR Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get verification status for all teams
router.get("/admin/team-verification-status", async (req, res) => {
  try {
    // We want to fetch all teams and left outer join with TeamVerification
    const teams = await TeamModel.find({ status: "Approved" }).lean();
    const verifications = await TeamVerification.find().lean();
    
    const verifMap = {};
    verifications.forEach(v => {
      verifMap[v.teamId.toString()] = v;
    });

    const data = teams.map(t => {
      const v = verifMap[t._id.toString()];
      return {
        _id: t._id,
        teamName: t.teamName,
        leaderEmail: t.leaderEmail,
        assignedProblemStatement: t.assignedProblemStatement,
        qrToken: v?.qrToken || null,
        status: v?.status || "PENDING",
      };
    });

    res.json({ success: true, teams: data });
  } catch (error) {
    console.error("Fetch Status Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ================== VOLUNTEER ENDPOINTS ================== */

// Scan a QR token and resolve team details
router.post("/scan", async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ success: false, message: "Token is required" });
    }

    const verification = await TeamVerification.findOne({ qrToken: token });
    if (!verification) {
      return res.status(404).json({ success: false, message: "Invalid or unrecognized QR token" });
    }

    const team = await TeamModel.findById(verification.teamId).lean();
    if (!team) {
      return res.status(404).json({ success: false, message: "Team data not found" });
    }

    // Update status to IN_PROGRESS if it was PENDING
    if (verification.status === "PENDING") {
      verification.status = "IN_PROGRESS";
      await verification.save();
    }

    // Fetch member photos from Shortlisted
    const shortlisted = await Shortlisted.findOne({
      $or: [
        { participantId: verification.participantId },
        { participantId: String(verification.participantId) },
        { participantId: new mongoose.Types.ObjectId(verification.participantId) },
      ],
    }).lean();

    // Attach photos to the verification data
    const memberVerificationsWithPhotos = verification.memberVerifications.map(mv => {
      const shortMember = shortlisted?.members?.find(sm => sm.email === mv.memberEmail);
      return {
        ...mv.toObject(),
        photoUrl: shortMember?.photoUrl || null
      };
    });

    res.json({
      success: true,
      team: {
        _id: team._id,
        teamName: team.teamName,
        assignedProblemStatement: team.assignedProblemStatement,
        assignedTrack: team.assignedTrack,
        leaderEmail: team.leaderEmail
      },
      verification: {
        _id: verification._id,
        status: verification.status,
        memberVerifications: memberVerificationsWithPhotos
      }
    });

  } catch (error) {
    console.error("Scan Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});


// Update a specific member's verification status
router.put("/verify-member", async (req, res) => {
  try {
    const { verificationId, memberEmail, field, value } = req.body;
    
    // field will be one of: 'identityVerified', 'governmentIdVerified', 'consentVerified', 'isPresent'
    const allowedFields = ['identityVerified', 'governmentIdVerified', 'consentVerified', 'isPresent'];
    if (!allowedFields.includes(field)) {
      return res.status(400).json({ success: false, message: "Invalid verification field" });
    }

    const verification = await TeamVerification.findById(verificationId);
    if (!verification) {
      return res.status(404).json({ success: false, message: "Verification record not found" });
    }

    const memberIndex = verification.memberVerifications.findIndex(m => m.memberEmail === memberEmail);
    if (memberIndex === -1) {
      return res.status(404).json({ success: false, message: "Member not found in verification record" });
    }

    verification.memberVerifications[memberIndex][field] = Boolean(value);
    
    // If marking as absent, clear all verifications
    if (field === 'isPresent' && !Boolean(value)) {
      verification.memberVerifications[memberIndex].identityVerified = false;
      verification.memberVerifications[memberIndex].governmentIdVerified = false;
      verification.memberVerifications[memberIndex].consentVerified = false;
    }
    
    verification.memberVerifications[memberIndex].verifiedAt = new Date();
    
    await verification.save();

    res.json({ success: true, memberVerification: verification.memberVerifications[memberIndex] });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Final check-in approval for the team
router.post("/approve-team", async (req, res) => {
  try {
    const { verificationId, volunteerEmail, volunteerName } = req.body;

    const verification = await TeamVerification.findById(verificationId);
    if (!verification) {
      return res.status(404).json({ success: false, message: "Verification record not found" });
    }

    if (verification.status === "CHECKED_IN") {
      return res.status(400).json({ success: false, message: "Team is already checked in" });
    }

    // Verify all present members have all 3 checkboxes
    let allVerified = true;
    let presentCount = 0;
    for (const m of verification.memberVerifications) {
      if (m.isPresent) {
        presentCount++;
        if (!m.identityVerified || !m.governmentIdVerified || !m.consentVerified) {
          allVerified = false;
          break;
        }
      }
    }

    if (presentCount === 0) {
      return res.status(400).json({ success: false, message: "At least one member must be present to check in" });
    }

    if (!allVerified) {
      return res.status(400).json({ success: false, message: "Not all present members have completed verification" });
    }

    verification.status = "CHECKED_IN";
    verification.checkedInAt = new Date();
    verification.verifiedBy = {
      name: volunteerName || "Student Volunteer",
      email: volunteerEmail
    };

    await verification.save();

    res.json({ success: true, message: "Team successfully checked in" });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get volunteer history
router.get("/history", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ success: false });

    const verifications = await TeamVerification.find({
      status: "CHECKED_IN",
      "verifiedBy.email": email
    }).sort({ checkedInAt: -1 }).populate({
      path: "teamId",
      model: TeamModel,
      select: "teamName assignedProblemStatement assignedTrack"
    });

    res.json({ success: true, history: verifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
