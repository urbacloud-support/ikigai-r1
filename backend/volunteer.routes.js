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
        
        attendance: {
          day1: { type: Boolean, default: false },
          day2: { type: Boolean, default: false },
          day3: { type: Boolean, default: false },
        },
        certificateGiven: { type: Boolean, default: false },
        registrationKitGiven: { type: Boolean, default: false },
        
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
    registrationKitGiven: { type: Boolean, default: false },
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
            attendance: { day1: false, day2: false, day3: false },
            certificateGiven: false,
            registrationKitGiven: false,
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
        leaderPhone: t.members && t.members.length > 0 ? (t.members[0].phone || t.members[0].mobile || t.members[0].Phone || "N/A") : "N/A",
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

    let presentCount = 0;
    for (const m of verification.memberVerifications) {
      if (m.isPresent) {
        presentCount++;
      }
    }

    if (presentCount === 0) {
      return res.status(400).json({ success: false, message: "At least one member must be present to check in" });
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

// Get all checked-in teams for attendance and kits
router.get("/all-checked-in-teams", async (req, res) => {
  try {
    const verifications = await TeamVerification.find({
      status: "CHECKED_IN"
    }).sort({ checkedInAt: -1 }).populate({
      path: "teamId",
      model: TeamModel,
      select: "teamName assignedProblemStatement assignedTrack leaderEmail"
    });

    res.json({ success: true, teams: verifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update team level status (e.g., registrationKitGiven)
router.put("/update-team-status", async (req, res) => {
  try {
    const { verificationId, field, value } = req.body;
    
    if (field !== 'registrationKitGiven') {
      return res.status(400).json({ success: false, message: "Invalid field" });
    }

    const verification = await TeamVerification.findById(verificationId);
    if (!verification) {
      return res.status(404).json({ success: false, message: "Verification not found" });
    }

    verification[field] = Boolean(value);
    await verification.save();

    res.json({ success: true, verification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update member level status (e.g., attendance, certificateGiven)
router.put("/update-member-status", async (req, res) => {
  try {
    const { verificationId, memberEmail, field, day, value } = req.body;
    
    const verification = await TeamVerification.findById(verificationId);
    if (!verification) {
      return res.status(404).json({ success: false, message: "Verification not found" });
    }

    const memberIndex = verification.memberVerifications.findIndex(m => m.memberEmail === memberEmail);
    if (memberIndex === -1) {
      return res.status(404).json({ success: false, message: "Member not found" });
    }

    if (field === 'certificateGiven') {
      verification.memberVerifications[memberIndex].certificateGiven = Boolean(value);
    } else if (field === 'registrationKitGiven') {
      verification.memberVerifications[memberIndex].registrationKitGiven = Boolean(value);
    } else if (field === 'attendance' && ['day1', 'day2', 'day3'].includes(day)) {
      verification.memberVerifications[memberIndex].attendance[day] = Boolean(value);
    } else {
      return res.status(400).json({ success: false, message: "Invalid field or day" });
    }

    await verification.save();
    res.json({ success: true, memberVerification: verification.memberVerifications[memberIndex] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Bulk update member verifications (History Edit or Bulk Attendance)
router.put("/bulk-update-members", async (req, res) => {
  try {
    const { verificationId, members } = req.body;
    
    const verification = await TeamVerification.findById(verificationId);
    if (!verification) {
      return res.status(404).json({ success: false, message: "Verification not found" });
    }

    // members should be an object mapping email to member data updates
    // e.g. { 'email@test.com': { isPresent: true, identityVerified: true, attendance: { day1: true } } }
    if (req.body.registrationKitGiven !== undefined) {
      verification.registrationKitGiven = Boolean(req.body.registrationKitGiven);
    }
    
    if (members) {
      for (const email of Object.keys(members)) {
        const memberIndex = verification.memberVerifications.findIndex(m => m.memberEmail === email);
        if (memberIndex !== -1) {
          const updates = members[email];
          if (updates.isPresent !== undefined) verification.memberVerifications[memberIndex].isPresent = updates.isPresent;
          if (updates.identityVerified !== undefined) verification.memberVerifications[memberIndex].identityVerified = updates.identityVerified;
          if (updates.governmentIdVerified !== undefined) verification.memberVerifications[memberIndex].governmentIdVerified = updates.governmentIdVerified;
          if (updates.consentVerified !== undefined) verification.memberVerifications[memberIndex].consentVerified = updates.consentVerified;
          if (updates.registrationKitGiven !== undefined) verification.memberVerifications[memberIndex].registrationKitGiven = updates.registrationKitGiven;
          if (updates.certificateGiven !== undefined) verification.memberVerifications[memberIndex].certificateGiven = updates.certificateGiven;
          if (updates.attendance) {
            if (updates.attendance.day1 !== undefined) verification.memberVerifications[memberIndex].attendance.day1 = updates.attendance.day1;
            if (updates.attendance.day2 !== undefined) verification.memberVerifications[memberIndex].attendance.day2 = updates.attendance.day2;
            if (updates.attendance.day3 !== undefined) verification.memberVerifications[memberIndex].attendance.day3 = updates.attendance.day3;
          }
        }
      }
    }

    await verification.save();
    res.json({ success: true, verification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
/* ================== FACULTY COORDINATOR ENDPOINTS ================== */

// Get highly populated teams data for Faculty Dashboard (History, Kits, Attendance)
router.get("/faculty/teams-data", async (req, res) => {
  try {
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
        eventId: t.eventId,
        assignedProblemStatement: t.assignedProblemStatement,
        status: v?.status || "PENDING",
        checkedInAt: v?.checkedInAt || null,
        registrationKitGiven: v?.registrationKitGiven || false,
        memberVerifications: v?.memberVerifications || []
      };
    });

    res.json({ success: true, teams: data });
  } catch (error) {
    console.error("Faculty Teams Data Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get overview stats
router.get("/faculty/dashboard", async (req, res) => {
  try {
    const teams = await TeamModel.find({ status: "Approved" }).lean();
    
    // 1. Calculate true total members from Shortlisted
    const pIds = teams.map(t => String(t.participantId));
    const objectIds = teams.map(t => {
      try { return new mongoose.Types.ObjectId(t.participantId); } catch(e) { return null; }
    }).filter(id => id);

    const shortlistedTeams = await Shortlisted.find({
      $or: [
        { participantId: { $in: pIds } },
        { participantId: { $in: objectIds } }
      ]
    }).lean();

    let totalMembers = 0;
    shortlistedTeams.forEach(s => {
      if (s.members && Array.isArray(s.members)) {
        totalMembers += s.members.length;
      }
    });

    const verifications = await TeamVerification.find().lean();
    
    let totalTeams = teams.length;
    let checkedInTeams = 0;
    let checkedInMembers = 0;
    
    let day1Attendance = 0;
    let day2Attendance = 0;
    let day3Attendance = 0;
    
    let missingGovId = 0;
    let missingConsent = 0;
    
    let registrationKitsGiven = 0;
    let participationCertsGiven = 0;

    for (const v of verifications) {
      // strict logic: Team must be CHECKED_IN
      if (v.status === "CHECKED_IN") {
        checkedInTeams++;
        
        // Count team-level kits for backward compatibility if needed, but we'll count member kits mostly.
        // Actually, we'll keep registrationKitsGiven as member-level metric here.
        if (v.registrationKitGiven) {
            // legacy, ignore in metric or add appropriately
        }
        
        if (v.memberVerifications && Array.isArray(v.memberVerifications)) {
          for (const m of v.memberVerifications) {
            // strict logic: Member must be present
            if (m.isPresent) {
              checkedInMembers++;
              
              if (m.attendance?.day1) day1Attendance++;
              if (m.attendance?.day2) day2Attendance++;
              if (m.attendance?.day3) day3Attendance++;
              
              if (!m.governmentIdVerified) missingGovId++;
              if (!m.consentVerified) missingConsent++;
              
              if (m.certificateGiven) participationCertsGiven++;
              if (m.registrationKitGiven) registrationKitsGiven++;
            }
          }
        }
      }
    }

    res.json({ 
      success: true, 
      stats: {
        totalTeams,
        checkedInTeams,
        totalMembers,
        checkedInMembers,
        day1Attendance,
        day2Attendance,
        day3Attendance,
        missingGovId,
        missingConsent,
        registrationKitsGiven,
        participationCertsGiven
      }
    });
  } catch (error) {
    console.error("Faculty Dashboard Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
