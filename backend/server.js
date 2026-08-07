// server.js
import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import crypto from "crypto";
import proofRoutes from "./proof.routes.js";
import pptRoutes from "./ppt.routes.js";
import aiRoutes from "./ai.routes.js";
import round2Routes, { TeamModel } from "./round2.routes.js";
import notificationRoutes, { NotificationModel } from "./notification.routes.js";
import mailingRoutes from "./mailing.routes.js";
import { sendMail } from "./mailer.js";



const app = express();
app.use(
  cors({
    origin: function (origin, callback) {
      const allowedOrigins = [
        "http://localhost:5173",
        "https://care-zeta.vercel.app",
        "https://ikigai-csit.up.railway.app"
      ];
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.up.railway.app')) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);



app.use(express.json({ limit: "25mb" }));
app.use("/api/proof", proofRoutes);
app.use("/api/upload-ppt", pptRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/round2", round2Routes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin/mailing", mailingRoutes);

app.use(express.urlencoded({ extended: true }));


app.get("/api/test-mail", async (_req, res) => {
  try {
    await sendMail({
      to: "care.system@gmail.com",
      subject: "CARE Brevo Test",
      html: "<p>Brevo mail working 🎉</p>",
    });
    res.json({ success: true });
  } catch (err) {
    console.error("BREVO ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});



/* --------------------------- MongoDB Atlas Connection --------------------------- */
// Only connect to the real DB when not running tests.
// Integration tests inject their own mongoose connection via mongodb-memory-server.
if (process.env.NODE_ENV !== "test") {
  mongoose
    .connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    })
    .then(() => console.log("\u2705 MongoDB Atlas Connected"))
    .catch((err) => {
      console.error("\u274c MongoDB Connection Error:", err.message);
      process.exit(1);
    });
}
process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED PROMISE:", err);
});

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
});

/* ------------------------------- Schemas -------------------------------- */
const SessionChairSchema = new mongoose.Schema(
  {
    name: String,
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    // ❗ remove global unique
    phone: String,
    type: String,
    passwordHash: String,
    trackId: String,
    eventId: String,
    updateToken: String,
    updateTokenExpiry: Date,
    inviteSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const TeamLeaderSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, lowercase: true, trim: true },
    phone: String,
    teamName: String,
    passwordHash: String,
    eventId: String,
    participantId: { type: mongoose.Schema.Types.ObjectId, ref: "Participant" },
    inviteSent: { type: Boolean, default: false },
    disableLoginAfter: { type: Date },
    disableLoginMessage: { type: String, default: "Registration window is now closed!" }
  },
  { timestamps: true }
);
const TeamLeader = mongoose.model("TeamLeader", TeamLeaderSchema);

const StudentCoordinatorSchema = new mongoose.Schema(
  {
    name: String,
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },

    phone: String,
    passwordHash: String,
    trackId: String,
    eventId: String,
  },
  { timestamps: true }
);

StudentCoordinatorSchema.index(
  { email: 1, trackId: 1, eventId: 1 },
  { unique: true }
);

const StudentCoordinator = mongoose.model(
  "StudentCoordinator",
  StudentCoordinatorSchema
);


// prevent duplicate chair per event
SessionChairSchema.index(
  { email: 1, trackId: 1, eventId: 1 },
  { unique: true }
);

const TrackSchema = new mongoose.Schema(
  {
    id: String,
    title: String,
    description: String,

    assessmentLocked: {
      type: Boolean,
      default: true,
    },

    // ✅ NEW (SAFE, OPTIONAL)
    meetingLink: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: true }
);



const EventSchema = new mongoose.Schema(
  {
    title: String,
    description: String,
    date: String,
    tracks: [TrackSchema],
    sessionChairs: Array,
    participants: Object,
    criteria: {
      type: [{
        name: String,
        maxMarks: Number,
        inputType: { type: String, default: "number" }
      }],
      default: [
        { name: "Innovation & Originality", maxMarks: 10, inputType: "number" },
        { name: "Technical Complexity", maxMarks: 10, inputType: "number" },
        { name: "Business & Market Viability", maxMarks: 10, inputType: "number" },
        { name: "User Experience & Design", maxMarks: 10, inputType: "number" },
        { name: "Presentation & Q&A", maxMarks: 10, inputType: "number" }
      ]
    },
    allowComments: { type: Boolean, default: true },
    requireComments: { type: Boolean, default: false },
    allowDirectTotal: { type: Boolean, default: true }
  },
  { timestamps: true }
);

const ParticipantSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    trackId: {
      type: String,
      required: false,
      index: true,
    },

    // ownership
    createdBy: {
      type: String, // student coordinator email
      required: true,
      index: true,
    },

    // Team-level details
    teamId: { type: String, unique: true, sparse: true },
    teamName: { type: String, required: true },
    track: { type: String, required: false },          // human-readable track title, auto-derived from trackId on save
    problemStatement: { type: String, required: false },
    description: { type: String, required: false },
    pptLink: { type: String, required: false },        // Cloudinary secure URL once uploaded

    // Evaluator assignment — set by admin via the assignment modal (many-to-many)
    assignedEvaluators: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "SessionChair",
      index: true,
    }],

    // Member-level details — CSV-aligned fields
    members: [
      {
        // Identity
        candidateRole: String,   // "Team Leader" | "Team Member"
        name: String,
        email: String,
        mobile: String,
        location: String,

        // Academic / Professional background
        userType: String,        // "Fresher" | "College Students" | "Professional" | "School Student"
        domain: String,          // e.g. "Engineering", "Arts & Science", "Management"
        course: String,          // e.g. "B.Tech/BE", "B.Sc.", "BBA"
        specialization: String,  // e.g. "Computer Science and Engineering"
        courseType: String,      // "Full Time" | "Part Time" | "Distance Learning"
        courseDuration: String,  // "3", "4", etc.
        classGrade: String,      // for school students
        gradYear: String,
        organisation: String,    // institute / company name
        designation: String,     // for professionals

        // Registration metadata
        // Mixed type used intentionally to prevent data loss on malformed values.
        // A valid ISO string will be stored as-is; parsing happens at read time if needed.
        registrationTime: { type: mongoose.Schema.Types.Mixed },
        // Mixed type: "Yes" → true, "No" → false at import time; raw value preserved if ambiguous.
        differentlyAbled: { type: mongoose.Schema.Types.Mixed },
        workExperience: String,
        regStatus: String,       // "Complete" | "Incomplete"
        refCode: String,
        paymentStatus: String,   // "paid" | "not paid"

        // Internal flag
        isLeader: { type: Boolean, default: false },
      }
    ],

    // Workflow
    status: {
      type: String,
      enum: ["DRAFT", "SUBMITTED", "EVALUATED", "EVALUATION_PENDING"],
      default: "DRAFT",
      index: true,
    },
    assessments: [{
      evaluatorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SessionChair",
        index: true
      },
      criteria: {
        type: [mongoose.Schema.Types.Mixed],
        default: [],
      },
      total: {
        type: Number,
        index: true,
      },
      notes: String,
      mode: {
        type: String,
        enum: ["criteria", "direct"],
      },
      evaluatedBy: String,
      evaluatedAt: Date,
      slideTimings: {
        type: [{
          slide: Number,
          duration: Number
        }],
        default: []
      },
      totalPptTime: {
        type: Number,
        default: 0
      },
      aiQueries: {
        type: [{
          query: String,
          timestamp: Date
        }],
        default: []
      }
    }],

  },
  { timestamps: true }
);

// teamId is a globally sparse unique index.
// Paid teams (paymentStatus: "paid") have reliable, consistent teamIds and are the source of truth.
// Unpaid teams may have empty/null teamIds — handled gracefully via the sparse index.

const Participant = mongoose.models.Participant || mongoose.model("Participant", ParticipantSchema);

const ShortlistedSchema = new mongoose.Schema({}, { strict: false, timestamps: true });
const Shortlisted = mongoose.models.Shortlisted || mongoose.model("Shortlisted", ShortlistedSchema);

const SessionChair = mongoose.models.SessionChair || mongoose.model("SessionChair", SessionChairSchema);
const Event = mongoose.models.Event || mongoose.model("Event", EventSchema);
const otpStore = new Map(); // email -> { otp, expiresAt }
const generateSimplePassword = (name) => {
  if (!name) return "care123";

  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "") // remove spaces & symbols
    + "123"
  );
};


/* ------------------------------- Utilities ------------------------------- */
const hashPassword = (password) =>
  crypto.createHash("sha256").update(password).digest("hex");
const generateOTP = () =>
  Math.floor(1000 + Math.random() * 9000).toString();

const checkEmailUnique = async (email, excludeId = null, excludeRole = null) => {
  if (!email) return true;
  const normEmail = email.trim().toLowerCase();
  if (process.env.ADMIN_EMAIL && normEmail === process.env.ADMIN_EMAIL.trim().toLowerCase()) return false;

  const chairQuery = { email: normEmail };
  if (excludeId && excludeRole === 'sessionChair') chairQuery._id = { $ne: excludeId };
  if (await SessionChair.findOne(chairQuery).lean()) return false;

  const studentQuery = { email: normEmail };
  if (excludeId && excludeRole === 'studentCoordinator') studentQuery._id = { $ne: excludeId };
  if (await StudentCoordinator.findOne(studentQuery).lean()) return false;

  return true;
};


/* ------------------------------- Routes -------------------------------- */
// 🔴 REQUIRED ROOT ROUTE (Railway health)
app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "CARE backend is running",
  });
});

// 🔴 REQUIRED HEALTH ROUTE
app.get("/health", (_req, res) => {
  res.status(200).send("OK");
});

// 🔴 REQUIRED FAVICON HANDLER
app.get("/favicon.ico", (_req, res) => {
  res.status(204).end();
});


/* 1️⃣ Admin: Create Event */
app.post("/api/admin/events", async (req, res) => {
  console.log("🔥 ADMIN EVENT CREATE API HIT 🔥");

  try {
    const eventData = req.body;

    const event = await Event.create(eventData);
    console.log("🚀 CREATE EVENT CALLED");

    /* ===============================
       SESSION CHAIRS (NO EMAIL)
    =============================== */
    for (const chair of eventData.sessionChairs || []) {
      console.log("➡️ SESSION CHAIR LOOP HIT:", chair);

      const email = chair.email?.trim().toLowerCase();
      console.log("📧 Normalized email:", email);

      if (!email) {
        console.log("⛔ Skipping: email missing");
        continue;
      }

      const isUnique = await checkEmailUnique(email);
      if (!isUnique) {
        console.log("⛔ Skipping: email already in use globally");
        continue;
      }

      const exists = await SessionChair.findOne({
        email,
        eventId: event._id.toString(),
      });

      console.log("🔍 Exists in DB?", !!exists);

      if (exists) {
        console.log("⛔ Skipping: already exists");
        continue;
      }

      const tempPassword =
        chair.password || Math.random().toString(36).slice(-8);

      console.log("🔐 Temp password generated:", tempPassword);

      await SessionChair.create({
        name: chair.name,
        email,
        phone: chair.phone,
        type: chair.type,
        passwordHash: hashPassword(tempPassword),
        trackId: chair.trackId,
        eventId: event._id.toString(),
      });

      console.log("✅ Session chair saved in DB (NO EMAIL SENT)");
    }

    /* ===============================
       STUDENT COORDINATORS (EMAIL ON)
    =============================== */
    for (const sc of eventData.studentCoordinators || []) {
      const email = sc.email?.trim().toLowerCase();
      if (!email) continue;

      const isUnique = await checkEmailUnique(email);
      if (!isUnique) continue;

      const exists = await StudentCoordinator.findOne({
        email,
        eventId: event._id.toString(),
      });

      if (exists) continue;
      if (!sc.password) continue;

      await StudentCoordinator.create({
        name: sc.name,
        email: sc.email.trim().toLowerCase(),
        phone: sc.phone,
        passwordHash: hashPassword(sc.password),
        trackId: sc.trackId,
        eventId: event._id.toString(),
      });

      await sendMail({
        from: `"HackEval" <${process.env.MAIL_USER}>`,
        to: sc.email,
        subject: "HackEval Student Coordinator Access",
        html: `
          <p>Hello ${sc.name},</p>
          <p>You have been assigned as <b>Student Coordinator</b>.</p>
          <p><b>Password:</b> ${sc.password}</p>
          <p>Please login to HackEval.</p>
        `,
      });
    }

    res.status(201).json({
      success: true,
      event,
    });
  } catch (error) {
    console.error("❌ Create event error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Update event criteria
app.put("/api/admin/events/:id/criteria", async (req, res) => {
  try {
    const { id } = req.params;
    const { criteria, allowComments, requireComments, allowDirectTotal } = req.body;
    const event = await Event.findByIdAndUpdate(
      id,
      { $set: { criteria, allowComments, requireComments, allowDirectTotal } },
      { new: true }
    );
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }
    res.json({ success: true, event });
  } catch (err) {
    console.error("UPDATE CRITERIA ERROR:", err);
    res.status(500).json({ success: false, message: "Update failed" });
  }
});

app.put("/api/admin/participants/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { assessment } = req.body;

    let notesStr = undefined;
    if (assessment.comments && Array.isArray(assessment.comments)) {
      notesStr = "JSON:" + JSON.stringify(assessment.comments);
    }

    const setFields = {
      "assessment.criteria": assessment.criteria || [],
      "assessment.total": assessment.total ?? 0,
    };
    if (notesStr !== undefined) {
      setFields["assessment.notes"] = notesStr;
    }

    const updated = await Participant.findByIdAndUpdate(
      id,
      { $set: setFields },
      { new: true }
    );

    res.json({ success: true, participant: updated });
  } catch (err) {
    console.error("ADMIN MARK UPDATE FAILED:", err);
    res.status(500).json({ success: false, message: "Update failed" });
  }
});


/* 2️⃣ Login (Admin + Session Chair) */
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // ADMIN
    if (
      normalizedEmail === process.env.ADMIN_EMAIL?.toLowerCase() &&
      password === process.env.ADMIN_PASS
    ) {
      return res.json({
        success: true,
        role: "admin",
        email: normalizedEmail,
      });
    }

    const hashed = hashPassword(password);

    const student = await StudentCoordinator.findOne({ email: normalizedEmail });
    if (student && student.passwordHash === hashed) {
      return res.json({
        success: true,
        role: "studentCoordinator",
        email: normalizedEmail,
        name: student.name,
      });
    }

    const chair = await SessionChair.findOne({ email: normalizedEmail });
    if (chair && chair.passwordHash === hashed) {
      return res.json({
        success: true,
        role: "sessionChair",
        email: normalizedEmail,
        name: chair.name,
      });
    }

    const teamLeader = await TeamLeader.findOne({ email: normalizedEmail });
    if (teamLeader && teamLeader.passwordHash === hashed) {
      if (teamLeader.disableLoginAfter && new Date() >= new Date(teamLeader.disableLoginAfter)) {
        return res.status(401).json({
          success: false,
          message: teamLeader.disableLoginMessage || "Registration window is now closed!"
        });
      }
      return res.json({
        success: true,
        role: "teamLeader",
        email: normalizedEmail,
        name: teamLeader.name,
        teamName: teamLeader.teamName
      });
    }

    return res.status(401).json({
      success: false,
      message: "Invalid email or password",
    });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});


app.post("/api/auth/send-otp", async (req, res) => {
  const email = req.body.email.toLowerCase();


  if (email === "admin@csit.in") {
    return res.json({
      success: false,
      message: "Contact admin to reset password.",
    });
  }
  const chair = await SessionChair.findOne({ email }).lean();
  const student = await StudentCoordinator.findOne({ email }).lean();
  const teamLeader = await TeamLeader.findOne({ email }).lean();


  if (!chair && !student && !teamLeader) {
    console.log("OTP failed for email:", email);
    return res.status(404).json({
      success: false,
      message: "Email not registered",
    });
  }

  const otp = generateOTP();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
  console.log("MAIL_USER =", process.env.MAIL_USER);

  otpStore.set(email, { otp, expiresAt });
  try {

    await sendMail({
      from: `"IKIGAI 2026" <${process.env.MAIL_USER}>`,
      to: email,
      subject: "IKIGAI 2026 Verification OTP",
      html: `
      <div style="margin:0;padding:40px 20px;background:#f7f4ff;font-family:Arial,Helvetica,sans-serif;">
        <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 10px 30px rgba(123,44,191,0.12);">

          <div style="background:linear-gradient(135deg,#7b2cbf,#c026d3,#ec4899);padding:30px 20px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;">
              IKIGAI 2026
            </h1>
            <p style="margin:8px 0 0;color:#fdf4ff;font-size:15px;">
              Verification Code
            </p>
          </div>

          <div style="padding:35px 30px;color:#444;">
            <p style="margin:0 0 18px;font-size:16px;">
              Hello,
            </p>

            <p style="margin:0 0 25px;font-size:15px;line-height:1.7;">
              Your verification OTP for the <strong>IKIGAI 2026</strong> application is:
            </p>

            <div style="background:#faf5ff;border:2px dashed #c026d3;border-radius:14px;padding:18px;text-align:center;margin:25px 0;">
              <span style="font-size:34px;font-weight:700;letter-spacing:8px;color:#7b2cbf;">
                ${otp}
              </span>
            </div>

            <p style="margin:0;font-size:14px;color:#666;">
              This OTP is valid for <strong>5 minutes</strong>.
            </p>

            <hr style="border:none;border-top:1px solid #eee;margin:30px 0;">

            <p style="margin:0;font-size:14px;color:#777;">
              Regards,<br>
              <strong style="color:#7b2cbf;">Team IKIGAI 2026</strong>
            </p>
          </div>

        </div>
      </div>
      `,
    });

    res.json({ success: true, message: "OTP sent to email" });
  } catch (mailErr) {
    console.error("❌ OTP MAIL ERROR:", mailErr.message);
    res.status(500).json({
      success: false,
      message: "Failed to send OTP email",
    });
  }
});

app.get("/api/test-mail", async (_req, res) => {
  try {

    await sendMail({
      to: process.env.MAIL_USER,
      from: process.env.MAIL_USER,
      subject: "CARE Mail Test",
      text: "Mail system working",
    });

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get("/api/admin/events/session-chair-counts", async (req, res) => {
  try {
    const counts = await SessionChair.aggregate([
      {
        $match: {
          eventId: { $ne: null },
        },
      },
      {
        $group: {
          _id: "$eventId",
          count: { $sum: 1 },
        },
      },
    ]);

    const map = {};
    counts.forEach((c) => {
      map[c._id] = c.count;
    });

    res.json({ success: true, counts: map });
  } catch (err) {
    console.error("Session chair count error:", err);
    res.status(500).json({ success: false });
  }
});


app.post("/api/auth/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  const record = otpStore.get(email);
  if (!record) {
    return res.status(400).json({ success: false, message: "OTP expired" });
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(email);
    return res.status(400).json({ success: false, message: "OTP expired" });
  }

  if (record.otp !== otp) {
    return res.status(401).json({ success: false, message: "Invalid OTP" });
  }

  otpStore.delete(email);

  // ADMIN CHECK
  if (email === "admin@csit.in") {
    return res.json({ success: true, role: "admin" });
  }

  const student = await StudentCoordinator.findOne({ email });
  if (student) {
    return res.json({
      success: true,
      role: "studentCoordinator",
      name: student.name,
    });
  }


  const chair = await SessionChair.findOne({ email });
  if (chair) {
    return res.json({
      success: true,
      role: "sessionChair",
      name: chair.name,
      chair: {
        email: chair.email,
        eventId: chair.eventId,
      },
    });
  }

  const teamLeader = await TeamLeader.findOne({ email });
  if (teamLeader) {
    if (teamLeader.disableLoginAfter && new Date() >= new Date(teamLeader.disableLoginAfter)) {
      return res.status(401).json({
        success: false,
        message: teamLeader.disableLoginMessage || "Registration window is now closed!"
      });
    }
    return res.json({
      success: true,
      role: "teamLeader",
      email: email,
      name: teamLeader.name,
      teamName: teamLeader.teamName
    });
  }

  return res.status(404).json({ success: false });
});
// ADMIN: Update participant assessment (override)
app.put("/api/admin/participants/:id/assessment", async (req, res) => {
  try {
    const { id } = req.params;
    const { assessment } = req.body;

    if (!assessment) {
      return res.status(400).json({
        success: false,
        message: "Assessment payload required",
      });
    }

    const participant = await Participant.findById(id);
    if (!participant) {
      return res.status(404).json({
        success: false,
        message: "Participant not found",
      });
    }

    const criteria = Array.isArray(assessment.criteria)
      ? assessment.criteria.map(n => Number(n) || 0)
      : [];

    const total =
      typeof assessment.total === "number"
        ? assessment.total
        : criteria.reduce((a, b) => a + b, 0);

    participant.assessment.criteria = criteria;
    participant.assessment.total = total;
    if (assessment.notes !== undefined) {
      participant.assessment.notes = assessment.notes;
    } else if (assessment.comments && Array.isArray(assessment.comments)) {
      participant.assessment.notes = "JSON:" + JSON.stringify(assessment.comments);
    }
    participant.assessment.mode = criteria.length ? "criteria" : "direct";
    participant.assessment.evaluatedBy = "admin";
    participant.assessment.evaluatedAt = new Date();

    participant.status = "EVALUATED";

    await participant.save();

    res.json({ success: true, participant });
  } catch (err) {
    console.error("❌ Admin assessment update failed:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

/* 3️⃣ Admin: Update Event (SAFE MERGE – NO DATA LOSS) */
app.put("/api/admin/events/:id", async (req, res) => {
  const eventId = req.params.id;
  try {
    const eventData = req.body;
    const incoming = req.body;
    const incomingChairs = Array.isArray(incoming.sessionChairs)
      ? incoming.sessionChairs
      : [];

    const oldEvent = await Event.findById(eventId);
    if (!oldEvent) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }


    /* ===================== SESSION CHAIR SYNC ===================== */

    console.log("🔥 ADMIN EVENT UPDATE API HIT 🔥");

    for (const chair of eventData.sessionChairs || []) {
      const email = chair.email?.trim().toLowerCase();
      if (!email) continue;

      const exists = await SessionChair.findOne({
        email,
        eventId: req.params.id,
      });

      if (exists) continue;

      const tempPassword =
        chair.password || Math.random().toString(36).slice(-8);

      await SessionChair.create({
        name: chair.name,
        email,
        phone: chair.phone,
        type: chair.type,
        passwordHash: hashPassword(tempPassword),
        trackId: chair.trackId,
        eventId: req.params.id,
      });

      try {

        await sendMail({
          from: `"CARE System" <${process.env.MAIL_USER}>`,
          to: email,
          subject: "CARE – Session Chair Invitation",
          html: `
        <p>Hello <b>${chair.name}</b>,</p>
        <p>You have been assigned as a <b>${chair.type}</b> Session Chair.</p>
        <p><b>Track:</b> ${chair.trackId}</p>
        <p><b>Login Email:</b> ${email}</p>
        <p><b>Temporary Password:</b> ${tempPassword}</p>
        <p>Please login to CARE.</p>
      `,
        });

        console.log("✅ Session chair invitation sent to:", email);
      } catch (err) {
        console.error("❌ Session chair mail failed:", err.message);
      }
    }


    const hasSessionChairUpdate = Array.isArray(incoming.sessionChairs);

    if (hasSessionChairUpdate) {
      const incomingChairs = incoming.sessionChairs;
      const normalizedChairs = incomingChairs.map(c => ({
        ...c,
        email: c.email.toLowerCase().trim(),
      }));

      const dbChairs = await SessionChair.find({ eventId });
      const dbChairMap = new Map(
        dbChairs.map(c => [`${c.email}-${c.trackId}`, c])
      );

      const incomingChairKeys = new Set(
        normalizedChairs.map(c => `${c.email}-${c.trackId}`)
      );

      // UPSERT CHAIRS
      for (const c of normalizedChairs) {
        const key = `${c.email}-${c.trackId}`;

        if (!dbChairMap.has(key)) {
          const isUnique = await checkEmailUnique(c.email);
          if (!isUnique) continue;

          await SessionChair.create({
            name: c.name,
            email: c.email,
            phone: c.phone,
            type: c.type,
            passwordHash: hashPassword(c.password),
            trackId: c.trackId,
            eventId,
          });
        } else {
          const dbChair = dbChairMap.get(key);
          const isUnique = await checkEmailUnique(c.email, dbChair._id, "sessionChair");
          if (!isUnique) continue;

          await SessionChair.updateOne(
            { email: c.email, trackId: c.trackId, eventId },
            {
              $set: {
                name: c.name,
                phone: c.phone,
                type: c.type,
              },
            }
          );
        }
      }

      // DELETE REMOVED CHAIRS
      for (const db of dbChairs) {
        const key = `${db.email}-${db.trackId}`;
        if (!incomingChairKeys.has(key)) {
          await SessionChair.deleteOne({ _id: db._id });
        }
      }
    }

    /* ===================== EVENT UPDATE ===================== */

    const updatePayload = {};

    // update basic fields ONLY if present
    if (typeof incoming.title === "string")
      updatePayload.title = incoming.title;

    if (typeof incoming.description === "string")
      updatePayload.description = incoming.description;

    if (typeof incoming.date === "string")
      updatePayload.date = incoming.date;

    // update tracks ONLY if present
    if (Array.isArray(incoming.tracks)) {
      updatePayload.tracks = incoming.tracks.map((t) => ({
        ...t,
        assessmentLocked:
          typeof t.assessmentLocked === "boolean"
            ? t.assessmentLocked
            : true,
      }));
    }



    const updatedEvent = await Event.findByIdAndUpdate(
      eventId,
      { $set: updatePayload },
      { new: true }
    );
    console.log("🧪 UPDATE TARGET", eventId);



    if (!updatedEvent) {
      console.error("❌ UPDATE FAILED — NO DOCUMENT MATCHED", eventId);
    }


    res.json({
      success: true,
      event: updatedEvent,
    });

  } catch (error) {
    console.error("❌ Update event error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

app.post("/api/admin/student-coordinator", async (req, res) => {
  try {
    const { name, email, phone, password, eventId, trackId } = req.body;

    if (!name || !email || !phone || !eventId || !trackId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const isUnique = await checkEmailUnique(email);
    if (!isUnique) {
      return res.status(400).json({ success: false, message: "This email is already in use by another role in the system." });
    }

    // 🔐 AUTO PASSWORD (firstname123)
    const finalPassword =
      password && password.trim()
        ? password.trim()
        : generateSimplePassword(name);

    // 🔁 HARD RESET: only ONE coordinator per track
    await StudentCoordinator.deleteOne({
      eventId: String(eventId),
      trackId: String(trackId),
    });

    const coordinator = await StudentCoordinator.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone,
      passwordHash: hashPassword(finalPassword),
      eventId: String(eventId),
      trackId: String(trackId),
    });

    res.json({
      success: true,
      coordinator: {
        _id: coordinator._id,
        name: coordinator.name,
        email: coordinator.email,
        phone: coordinator.phone,
        trackId: coordinator.trackId,
      },
    });
  } catch (err) {
    console.error("❌ CREATE STUDENT COORDINATOR ERROR:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

/*  STUDENT SAVE PARTICIPANTS  */
app.post("/api/student/participants", async (req, res) => {
  try {
    const {
      eventId,
      trackId,
      submittedBy,
      ...participantData
    } = req.body;

    if (!eventId || !trackId || !submittedBy) {
      return res.status(400).json({
        success: false,
        message: "Missing eventId, trackId, or submittedBy",
      });
    }

    // Auto-derive the human-readable track name from the event
    let trackName = null;
    try {
      const event = await Event.findById(eventId);
      if (event) {
        const matchedTrack = event.tracks.find((t) => String(t.id) === String(trackId));
        if (matchedTrack) trackName = matchedTrack.title;
      }
    } catch (_) {
      // Non-fatal — track name derivation failure should not block participant save
    }

    const participant = await Participant.create({
      ...participantData,
      eventId: new mongoose.Types.ObjectId(eventId),
      trackId,
      track: trackName,
      createdBy: submittedBy,
    });

    console.log("✅ PARTICIPANT SAVED:", participant._id);

    res.json({ success: true, participant });
  } catch (err) {
    console.error("❌ PARTICIPANT INSERT ERROR:", err.message);
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
});


app.put("/api/student/participants/:id", async (req, res) => {
  try {
    const {
      teamName,
      track,
      problemStatement,
      description,
      pptLink,
      members,
      eventId,
      trackId,
      resetAssessment
    } = req.body;

    const updates = {
      ...(teamName !== undefined && { teamName }),
      ...(track !== undefined && { track }),
      ...(problemStatement !== undefined && { problemStatement }),
      ...(description !== undefined && { description }),
      ...(pptLink !== undefined && { pptLink }),
      ...(members !== undefined && { members }),
      ...(eventId !== undefined && { eventId }),
      ...(trackId !== undefined && { trackId }),
    };

    let updateQuery = { $set: updates };
    if (resetAssessment) {
      updates.assessment = { criteria: [], total: 0, notes: "" };
      updateQuery.$unset = { evaluator: 1 };
    }

    const updated = await Participant.findByIdAndUpdate(
      req.params.id,
      updateQuery,
      { new: true, runValidators: false }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Participant not found",
      });
    }

    res.json({
      success: true,
      participant: updated,
    });
  } catch (err) {
    console.error("❌ STUDENT UPDATE ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update participant",
    });
  }
});


// ═══════════════════════════════════════════════════════════════════
// SHARED: Fetch participants by track (all 3 roles)
// ═══════════════════════════════════════════════════════════════════
// Query: eventId (required), trackId (required), evaluatorId (optional)
// - evaluatorId present → only teams assigned to that evaluator
// - evaluatorId absent  → all teams in the track
app.get("/api/participants/by-track", async (req, res) => {
  try {
    const { eventId, trackId, evaluatorId } = req.query;

    if (!eventId || !trackId) {
      return res.status(400).json({
        success: false,
        message: "Missing eventId or trackId",
      });
    }

    const filter = {
      eventId: new mongoose.Types.ObjectId(eventId),
      trackId: String(trackId),
    };

    // If evaluatorId is provided, scope to only assigned teams
    if (evaluatorId) {
      filter.assignedEvaluators = new mongoose.Types.ObjectId(evaluatorId);
    }

    const participants = await Participant.find(filter).sort({ createdAt: 1 });

    res.json({ success: true, participants });
  } catch (err) {
    console.error("❌ Fetch participants by-track error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});


// ═══════════════════════════════════════════════════════════════════
// ADMIN: Bulk assign multiple teams to an evaluator
// ═══════════════════════════════════════════════════════════════════
app.patch("/api/admin/participants/bulk-assign", async (req, res) => {
  try {
    const { participantIds, evaluatorId } = req.body;

    if (!Array.isArray(participantIds)) {
      return res.status(400).json({ success: false, message: "participantIds must be an array" });
    }

    if (evaluatorId !== null && evaluatorId !== undefined) {
      const evaluator = await SessionChair.findById(evaluatorId);
      if (!evaluator) {
        return res.status(404).json({ success: false, message: "Evaluator not found" });
      }
    }

    if (evaluatorId) {
      await Participant.updateMany(
        { _id: { $in: participantIds } },
        { $addToSet: { assignedEvaluators: evaluatorId } }
      );
    } else {
      if (req.body.fromEvaluatorId) {
        await Participant.updateMany(
          { _id: { $in: participantIds } },
          { $pull: { assignedEvaluators: req.body.fromEvaluatorId } }
        );
      } else {
        // Clear all assignments if fromEvaluatorId is not provided
        await Participant.updateMany(
          { _id: { $in: participantIds } },
          { $set: { assignedEvaluators: [] } }
        );
      }
    }

    res.json({ success: true, message: `Successfully assigned ${participantIds.length} teams.` });
  } catch (err) {
    console.error("BULK ASSIGN ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to assign teams" });
  }
});

// ═══════════════════════════════════════════════════════════════════
// ADMIN: Assign a team to an evaluator (or unassign)
// ═══════════════════════════════════════════════════════════════════
// Body: { evaluatorId: "<ObjectId>" | null }
// - Passing a valid SessionChair ObjectId assigns the team.
// - Passing null unassigns the team (returns to Unassigned pool).
app.patch("/api/admin/participants/:id/assign", async (req, res) => {
  try {
    const { evaluatorId } = req.body;
    const participantId = req.params.id;

    const participant = await Participant.findById(participantId);
    if (!participant) {
      return res.status(404).json({ success: false, message: "Participant not found" });
    }

    // Unassign case
    if (evaluatorId === null || evaluatorId === undefined) {
      if (req.body.fromEvaluatorId) {
        participant.assignedEvaluators.pull(req.body.fromEvaluatorId);
      } else {
        participant.assignedEvaluators = [];
      }
      await participant.save();
      return res.json({ success: true, participant });
    }

    // Validate: evaluator must exist
    const evaluator = await SessionChair.findById(evaluatorId);
    if (!evaluator) {
      return res.status(404).json({ success: false, message: "Evaluator not found" });
    }

    // Validate: evaluator must belong to the same track as the participant
    if (String(evaluator.trackId) !== String(participant.trackId) ||
      String(evaluator.eventId) !== String(participant.eventId)) {
      return res.status(400).json({
        success: false,
        message: "Evaluator does not belong to the same event/track as this team",
      });
    }

    const isUnassigning = req.body.action === 'unassign';
    if (isUnassigning) {
      participant.assignedEvaluators.pull(evaluatorId);
    } else {
      if (!participant.assignedEvaluators.includes(evaluatorId)) {
        participant.assignedEvaluators.push(evaluatorId);
      }
    }

    await participant.save();

    res.json({ success: true, participant });
  } catch (err) {
    console.error("❌ Assign evaluator error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});


// ✅ Session Chair: fetch participants assigned to THIS evaluator (read-only)
app.get("/api/session/participants", async (req, res) => {
  try {
    const { eventId, trackId, evaluatorId } = req.query;

    if (!eventId || !trackId) {
      return res.status(400).json({
        success: false,
        message: "Missing eventId or trackId",
      });
    }

    const filter = {
      eventId: new mongoose.Types.ObjectId(eventId),
      trackId: String(trackId),
    };

    // If evaluatorId provided, scope to only their assigned teams
    if (evaluatorId) {
      filter.assignedEvaluators = new mongoose.Types.ObjectId(evaluatorId);
    }

    const participants = await Participant.find(filter).sort({ createdAt: 1 });

    res.json({ success: true, participants });
  } catch (err) {
    console.error("❌ Session chair participants fetch error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.patch("/api/session/participants/:id/assessment", async (req, res) => {
  try {
    const { assessment } = req.body;

    const participant = await Participant.findById(req.params.id);
    if (!participant) {
      return res.status(404).json({
        success: false,
        message: "Participant not found",
      });
    }

    // 🔒 FETCH EVENT + TRACK
    const event = await Event.findById(participant.eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    const track = event.tracks.find(
      (t) => String(t.id) === String(participant.trackId)
    );

    if (!track) {
      return res.status(404).json({
        success: false,
        message: "Track not found",
      });
    }

    // 🚫 BLOCK IF LOCKED
    if (track.assessmentLocked) {
      return res.status(403).json({
        success: false,
        message: "Assessment is locked by admin",
      });
    }

    const evaluatorId = req.body.evaluatorId;
    if (!evaluatorId) {
      return res.status(400).json({ success: false, message: "Missing evaluatorId" });
    }

    const newAssessment = {
      evaluatorId: new mongoose.Types.ObjectId(evaluatorId),
      criteria: assessment.criteria || [],
      total: assessment.total,
      notes: assessment.notes || "",
      mode: assessment.mode || "criteria",
      evaluatedBy: req.body.evaluatedBy || "sessionChair",
      evaluatedAt: new Date(),
      slideTimings: assessment.slideTimings || [],
      totalPptTime: assessment.totalPptTime || 0,
      aiQueries: assessment.aiQueries || []
    };

    // Pull any existing assessment by this evaluator
    await Participant.updateOne(
      { _id: req.params.id },
      { $pull: { assessments: { evaluatorId: new mongoose.Types.ObjectId(evaluatorId) } } }
    );

    // Push new assessment
    const updated = await Participant.findByIdAndUpdate(
      req.params.id,
      {
        $push: { assessments: newAssessment },
        $set: { status: "EVALUATED" },
      },
      { new: true }
    );

    res.json({
      success: true,
      participant: updated,
    });
  } catch (err) {
    console.error("ASSESSMENT SAVE ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to save assessment",
    });
  }
});

// ✅ Student Coordinator: Update meeting link for own track
app.put("/api/student/track/meeting-link", async (req, res) => {
  try {
    const { email, eventId, trackId, meetingLink } = req.body;

    if (!email || !eventId || !trackId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // 1️⃣ Verify student coordinator
    const student = await StudentCoordinator.findOne({
      email: email.toLowerCase(),
      eventId,
      trackId,
    });

    if (!student) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized track access",
      });
    }

    // 2️⃣ Load event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // 3️⃣ Find track
    const track = event.tracks.find(
      (t) => String(t.id) === String(trackId)
    );

    if (!track) {
      return res.status(404).json({
        success: false,
        message: "Track not found",
      });
    }

    // 4️⃣ Update ONLY meeting link
    track.meetingLink = meetingLink || "";

    await event.save();

    res.json({
      success: true,
      meetingLink: track.meetingLink,
    });
  } catch (err) {
    console.error("❌ Meeting link update error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

app.post("/api/admin/tracks/:eventId/:trackId/lock", async (req, res) => {
  try {
    const { eventId, trackId } = req.params;
    const { locked } = req.body;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    const track = event.tracks.find(
      (t) => String(t.id) === String(trackId)
    );

    if (!track) {
      return res.status(404).json({ success: false, message: "Track not found" });
    }

    track.assessmentLocked = Boolean(locked);
    track.lockedAt = new Date();
    track.lockedBy = "admin";

    await event.save();

    res.json({
      success: true,
      assessmentLocked: track.assessmentLocked,
    });
  } catch (err) {
    console.error("❌ LOCK ROUTE ERROR:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// SESSION CHAIR: Get current track lock status







app.delete("/api/student/participants/:id", async (req, res) => {
  try {
    await Participant.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});




// SESSION CHAIR: get current track lock status
app.get("/api/session/track-status", async (req, res) => {
  try {
    const { eventId, trackId } = req.query;

    if (!eventId || !trackId) {
      return res.status(400).json({
        success: false,
        message: "eventId and trackId are required",
      });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    const track = event.tracks.find(
      (t) => String(t.id) === String(trackId)
    );

    if (!track) {
      return res.status(404).json({
        success: false,
        message: "Track not found",
      });
    }

    res.json({
      success: true,
      assessmentLocked: !!track.assessmentLocked,
    });
  } catch (err) {
    console.error("TRACK STATUS ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch track status",
    });
  }
});

//* 4️⃣ Session Chair Dashboard */
app.get("/api/session/:email", async (req, res) => {
  try {
    const chair = await SessionChair.findOne({
      email: req.params.email.toLowerCase(),
    });

    if (!chair) {
      return res.status(404).json({
        success: false,
        message: "Session chair not found",
      });
    }

    const event = await Event.findById(chair.eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // ✅ TRACK FROM EVENT
    const track = event.tracks.find(
      (t) => String(t.id) === String(chair.trackId)
    );

    if (!track) {
      return res.status(404).json({
        success: false,
        message: "Track not found",
      });
    }

    // ✅ PARTICIPANTS FROM PARTICIPANT COLLECTION
    const participants = await Participant.find({
      eventId: chair.eventId,
      trackId: chair.trackId,
    }).sort({ createdAt: 1 });

    res.json({
      success: true,
      chair,
      event,
      track,
      participants,
    });
  } catch (err) {
    console.error("❌ Session fetch error:", err);
    res.status(500).json({ success: false });
  }
});




app.post("/api/student/participants/bulk", async (req, res) => {
  try {
    const { eventId, participants, createdBy } = req.body;
    if (!eventId || !participants || !Array.isArray(participants)) {
      return res.status(400).json({ success: false, message: "Invalid payload" });
    }
    const creatorEmail = createdBy || "bulk-import@system";

    let added = 0;
    let updated = 0;
    let errors = [];

    for (const pData of participants) {
      try {
        const existing = await Participant.findOne({ eventId, teamId: pData.teamId });
        if (existing) {
          // Update existing
          existing.teamName = pData.teamName || existing.teamName;
          existing.members = pData.members || existing.members;
          await existing.save();
          updated++;
        } else {
          // Add new
          await Participant.create({
            eventId,
            teamId: pData.teamId,
            teamName: pData.teamName,
            members: pData.members,
            trackId: pData.trackId || null,
            problemStatement: pData.problemStatement || "",
            description: pData.description || "",
            createdBy: creatorEmail
          });
          added++;
        }
      } catch (err) {
        errors.push({ teamId: pData.teamId, error: err.message });
      }
    }

    res.json({
      success: true,
      results: { added, updated, errors }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
app.get("/api/student/participants", async (req, res) => {
  try {
    const { eventId, trackId } = req.query;

    if (!eventId || !trackId) {
      return res.status(400).json({
        success: false,
        message: "Missing eventId or trackId",
      });
    }

    let participants;
    if (eventId === "global") {
      participants = await Participant.find({}).sort({ createdAt: 1 });
    } else {
      participants = await Participant.find({
        eventId: new mongoose.Types.ObjectId(eventId),
        trackId: trackId
      }).sort({ createdAt: 1 });
    }

    res.json({ success: true, participants });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});




/*  STUDENT COORDINATOR DASHBOARD FETCH  */

app.get("/api/student/session/:email", async (req, res) => {
  try {
    const student = await StudentCoordinator.findOne({
      email: req.params.email,
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student coordinator not found",
      });
    }

    // Global Student Coordinator logic
    if (student.eventId === "global") {
      const allEvents = await Event.find({}).lean();
      const allParticipants = await Participant.find({}).lean();
      return res.json({
        success: true,
        student,
        event: { _id: "global", title: "Global Events" },
        track: { id: "global", title: "All Tracks" },
        participants: allParticipants,
        sessionChairs: [],
        allEvents // send events to frontend to populate dropdowns
      });
    }

    const event = await Event.findById(student.eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    const track = event.tracks.find((t) => String(t.id) === String(student.trackId));
    if (!track) {
      return res.status(404).json({ success: false, message: "Assigned track not found" });
    }

    const participants = await Participant.find({ eventId: event._id, trackId: track.id }).lean();
    const sessionChairs = await SessionChair.find({ eventId: event._id, trackId: track.id }).lean();

    res.json({ success: true, event, track, participants, sessionChairs, student });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get("/api/session/participants", async (req, res) => {
  try {
    const { eventId, trackId } = req.query;

    if (!eventId || !trackId) {
      return res.status(400).json({
        success: false,
        message: "Missing eventId or trackId",
      });
    }

    const participants = await Participant.find({
      eventId: new mongoose.Types.ObjectId(eventId),
      trackId,
    }).sort({ createdAt: 1 });

    res.json({
      success: true,
      participants,
    });
  } catch (err) {
    console.error("❌ Session participant fetch error:", err);
    res.status(500).json({ success: false });
  }
});



/* 5️⃣ Admin: Fetch All Events (USED BY DASHBOARD) */


app.get("/api/admin/events", async (_req, res) => {
  try {
    const events = await Event.find().sort({ createdAt: -1 }).lean();

    console.log("📦 Admin fetch events:", events.length);

    res.json({
      success: true,
      events,

    });
  } catch (err) {
    console.error("❌ Admin fetch events error:", err);
    res.status(500).json({
      success: false,
      events: [],
    });
  }
});

// ✅ MUST COME FIRST
app.get("/api/admin/events/participant-counts", async (req, res) => {
  try {
    const counts = await Participant.aggregate([
      {
        // ✅ Ignore broken participants
        $match: {
          eventId: { $ne: null }
        }
      },
      {
        $group: {
          _id: "$eventId",
          count: { $sum: 1 }
        }
      }
    ]);

    const map = {};
    counts.forEach((c) => {
      map[c._id.toString()] = c.count;
    });

    res.json({ success: true, counts: map });
  } catch (err) {
    console.error("Participant count error:", err);
    res.status(500).json({ success: false });
  }
});
// ✅ PUT THIS FIRST


app.get("/api/admin/participants/stats", async (req, res) => {
  try {
    const { eventId } = req.query;

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: "eventId is required",
      });
    }

    // ✅ Build query safely
    const query = mongoose.Types.ObjectId.isValid(eventId)
      ? {
        $or: [
          { eventId: eventId },
          { eventId: new mongoose.Types.ObjectId(eventId) },
        ],
      }
      : { eventId: eventId };

    const participants = await Participant.find(query);

    const stats = {};

    for (const p of participants) {
      const trackId = String(p.trackId); // 🔑 must match frontend

      if (!stats[trackId]) {
        stats[trackId] = { total: 0, assessed: 0 };
      }

      stats[trackId].total += 1;

      // ✅ correct assessed condition
      if (p.status === "EVALUATED") {
        stats[trackId].assessed += 1;
      }
    }

    res.json({ success: true, stats });
  } catch (err) {
    console.error("❌ Participant stats error:", err.message);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

app.get("/api/admin/events/:eventId/shortlisted", async (req, res) => {
  try {
    const { eventId } = req.params;
    const shortlisted = await Shortlisted.find({ eventId });
    res.json({ success: true, shortlisted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/admin/events/:eventId/shortlisted", async (req, res) => {
  try {
    const { eventId } = req.params;
    const { participants } = req.body;

    await Shortlisted.deleteMany({ eventId });

    const docs = participants.map(p => {
      const doc = { ...p };
      delete doc._id; // avoid duplicate _id issues
      return {
        eventId,
        participantId: p._id,
        ...doc
      };
    });

    if (docs.length > 0) {
      await Shortlisted.insertMany(docs);
    }

    // Create/update TeamLeader docs for shortlisted
    const teamLeaderOps = [];
    for (const p of participants) {
      const leader = p.members?.find((m) => m.isLeader || m.candidateRole === "Team Leader") || p.members?.[0];
      if (!leader || !leader.email) continue;
      teamLeaderOps.push({
        updateOne: {
          filter: { eventId, participantId: p._id },
          update: {
            $set: {
              name: leader.name,
              email: leader.email.trim().toLowerCase(),
              phone: leader.mobile,
              teamName: p.teamName
            },
            $setOnInsert: {
              inviteSent: false
            }
          },
          upsert: true
        }
      });
    }

    const currentParticipantIds = participants.map(p => p._id);
    await TeamLeader.deleteMany({ eventId, participantId: { $nin: currentParticipantIds } });

    if (teamLeaderOps.length > 0) {
      await TeamLeader.bulkWrite(teamLeaderOps);
    }

    res.json({ success: true, message: "Shortlist updated" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/admin/events/:eventId/participants", async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.json({ success: false, message: "Event not found" });
    }

    let enriched = [];
    if (event.title && (event.title.toLowerCase().includes("round-2") || event.title.toLowerCase().includes("round 2"))) {
      const round2Teams = await TeamModel.find({ eventId: String(eventId), status: "Approved" });
      enriched = round2Teams.map(p => {
        return {
          _id: p._id,
          participantId: p.participantId,
          teamId: p.participantId, // map to paperId
          teamName: p.teamName,
          members: p.members,
          trackName: p.trackPreferences && p.trackPreferences.length > 0 ? p.trackPreferences[0] : "Pending",
          trackPreferences: p.trackPreferences || [],
          transactionId: p.transactionId,
          receiptUrl: p.receiptUrl,
          leaderEmail: p.leaderEmail,
          assessments: [],
          assignedEvaluators: [],
          isRound2: true
        };
      });
    } else {
      const participants = await Participant.find({
        eventId: new mongoose.Types.ObjectId(eventId),
      })
        .populate({ path: "assignedEvaluators", select: "name email phone", strictPopulate: false })
        .populate({ path: "assessments.evaluatorId", select: "name email phone", strictPopulate: false });

      const trackMap = {};
      event.tracks.forEach((t) => {
        trackMap[t.id] = t.title;
      });

      enriched = participants.map((pDoc) => {
        const p = pDoc.toObject();
        // Fallback for older Round 1 schemas that used member1_name instead of members array
        if (!p.members || p.members.length === 0) {
          if (p.member1_name) {
            p.members = [
              {
                isLeader: true,
                name: p.member1_name,
                email: p.member1_email,
                mobile: p.member1_mobile,
                organisation: p.member1_organisation,
                domain: p.member1_domain,
                specialization: p.member1_specialization,
                location: p.member1_location
              }
            ];
          }
        }
        return {
          ...p,
          trackName: trackMap[p.trackId] || "—",
        };
      });
    }

    res.json({
      success: true,
      participants: enriched,
      tracks: event.tracks,
      event: event,
    });
  } catch (err) {
    console.error("ADMIN PARTICIPANTS ERROR:", err);
    res.status(500).json({ success: false, message: err.message, stack: err.stack });
  }
});


// ✅ Admin: Get single event by ID
app.get("/api/admin/events/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    return res.json({
      success: true,
      event,
    });
  } catch (err) {
    console.error("Fetch single event error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});


app.get("/api/admin/participants/:eventId", async (req, res) => {
  try {
    const participants = await Participant.find({
      eventId: new mongoose.Types.ObjectId(req.params.eventId),
    });
    res.json({ success: true, participants });
  } catch (err) {
    console.error("❌ Admin participants fetch error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch participants" });
  }
});

// ✅ Admin: Fetch Session Chairs (SOURCE OF TRUTH)
app.get("/api/admin/session-chairs/:eventId", async (req, res) => {
  try {
    const chairs = await SessionChair.find({
      eventId: req.params.eventId,
    }).select("-passwordHash");

    res.json({ success: true, chairs });
  } catch (err) {
    console.error("❌ Fetch session chairs error:", err);
    res.status(500).json({ success: false });
  }
});
// ✅ Admin: Fetch participants by event + track (FOR TRACK DETAILS PANEL)
app.get("/api/admin/participants", async (req, res) => {
  try {
    const { eventId, trackId } = req.query;

    if (!eventId || !trackId) {
      return res.status(400).json({
        success: false,
        message: "Missing eventId or trackId",
      });
    }

    const participants = await Participant.find({
      eventId: new mongoose.Types.ObjectId(eventId),
      trackId: String(trackId),
    }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      participants,
    });
  } catch (err) {
    console.error("❌ Admin track participants fetch error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch participants",
    });
  }
});
app.delete("/api/admin/student-coordinator", async (req, res) => {
  try {
    const { eventId, trackId } = req.body;

    if (!eventId || !trackId) {
      return res.status(400).json({ success: false });
    }

    await StudentCoordinator.deleteOne({
      eventId: String(eventId),
      trackId: String(trackId),
    });

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Delete student coordinator error:", err);
    res.status(500).json({ success: false });
  }
});

app.put("/api/admin/student-coordinator", async (req, res) => {
  const { id, name, email, phone, password } = req.body;

  if (!id) {
    return res.status(400).json({ success: false });
  }

  const isUnique = await checkEmailUnique(email, id, "studentCoordinator");
  if (!isUnique) {
    return res.status(400).json({ success: false, message: "This email is already in use by another user." });
  }

  const update = {
    name,
    email: email.toLowerCase().trim(),
    phone,
  };

  if (password && password.trim()) {
    update.passwordHash = hashPassword(password);
  }

  await StudentCoordinator.findByIdAndUpdate(id, { $set: update });

  res.json({ success: true });
});


// ✅ Admin: Fetch Student Coordinator for a Track
app.get("/api/admin/student-coordinator", async (req, res) => {
  try {
    const { eventId, trackId } = req.query;

    if (!eventId || !trackId) {
      return res.status(400).json({
        success: false,
        message: "Missing eventId or trackId",
      });
    }

    const coordinator = await StudentCoordinator.findOne({
      eventId: String(eventId),
      trackId: String(trackId),
    }).select("_id name email phone trackId");

    // 🔒 HARD NULL STATE
    return res.json({
      success: true,
      coordinator: coordinator || null,
    });
  } catch (err) {
    console.error("❌ Fetch student coordinator error:", err);
    return res.status(500).json({ success: false });
  }
});

// ================= UPDATE TRACK MEETING LINK =================
app.put(
  "/api/event/:eventId/track/:trackId/meeting-link",
  // your existing auth middleware
  async (req, res) => {
    try {
      const { eventId, trackId } = req.params;
      const { meetingLink } = req.body;

      // 🔐 ROLE GUARD


      if (!meetingLink || typeof meetingLink !== "string") {
        return res.status(400).json({
          success: false,
          message: "Valid meeting link is required",
        });
      }

      // 🔎 UPDATE TRACK
      const result = await Event.updateOne(
        { _id: eventId, "tracks.id": trackId },
        { $set: { "tracks.$.meetingLink": meetingLink.trim() } }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({
          success: false,
          message: "Event or track not found",
        });
      }

      return res.json({
        success: true,
        message: "Meeting link updated successfully",
      });
    } catch (err) {
      console.error("❌ UPDATE MEETING LINK ERROR:", err);
      return res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
);

// ================= GET TRACK MEETING LINK =================
app.get(
  "/api/event/:eventId/track/:trackId/meeting-link",
  async (req, res) => {
    try {
      const { eventId, trackId } = req.params;

      const event = await Event.findOne(
        { _id: eventId, "tracks.id": trackId },
        { "tracks.$": 1 }
      );

      if (!event || !event.tracks.length) {
        return res.status(404).json({
          success: false,
          message: "Track not found",
        });
      }

      const track = event.tracks[0];

      return res.json({
        success: true,
        meetingLink: track.meetingLink || "",
        assessmentLocked: track.assessmentLocked,
      });
    } catch (err) {
      console.error("❌ GET MEETING LINK ERROR:", err);
      return res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
);



app.post(
  "/api/admin/session-chairs/:id/resend-invite",
  async (req, res) => {
    try {
      const chairId = req.params.id;

      const chair = await SessionChair.findById(chairId);
      if (!chair) {
        return res.status(404).json({
          success: false,
          message: "Session chair not found",
        });
      }

      const event = await Event.findById(chair.eventId);
      const eventTitle = event ? event.title : "CARE Event";

      // ✅ SIMPLE TEMP PASSWORD: name + 123
      const tempPassword = generateSimplePassword(chair.name);

      // 🔐 hash & save
      chair.passwordHash = hashPassword(tempPassword);
      await chair.save();

      // 📧 send mail
      await sendMail({
        to: chair.email,
        subject: "HackEval – Session Chair Invitation",
        html: `
        <div style="background:#f0fdf4;padding:24px;font-family:Arial,Helvetica,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:auto;background:#ffffff;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.08);overflow:hidden;">
            
            <tr>
              <td style="background:#16a34a;padding:20px;text-align:center;">
                <h1 style="margin:0;color:#ffffff;">HackEval</h1>
              </td>
            </tr>

            <tr>
              <td style="padding:28px;color:#1f2937;">
                <h2 style="color:#15803d;">Hello ${chair.name},</h2>

                <p>
                  You have been appointed as a
                  <strong>${chair.type} Session Chair</strong>.
                </p>

                <table width="100%" style="margin:16px 0;">
                  <tr>
                    <td><b>Event</b></td>
                    <td>${eventTitle}</td>
                  </tr>
                  <tr>
                    <td><b>Track ID</b></td>
                    <td>${chair.trackId}</td>
                  </tr>
                  <tr>
                    <td><b>Login Email</b></td>
                    <td>${chair.email}</td>
                  </tr>
                  <tr>
                    <td><b>Temporary Password</b></td>
                    <td>
                      <span style="background:#dcfce7;padding:6px 10px;border-radius:6px;font-weight:bold;">
                        ${tempPassword}
                      </span>
                    </td>
                  </tr>
                </table>

                <p>Please log in and change your password after first login.</p>

                <div style="text-align:center;margin:24px 0;">
                  <a href="https://care-zeta.vercel.app"
                     style="background:#16a34a;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;">
                    Login to HackEval
                  </a>
                </div>
              </td>
            </tr>

            <tr>
              <td style="background:#f9fafb;padding:16px;text-align:center;font-size:12px;color:#6b7280;">
                © ${new Date().getFullYear()} HackEval
              </td>
            </tr>

          </table>
        </div>
        `,
      });

      console.log("🔁 Invitation resent to:", chair.email);
      res.json({ success: true });

    } catch (err) {
      console.error("❌ Resend invite error:", err);
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }
);



app.use((err, req, res, next) => {
  console.error("🔥 UNHANDLED ERROR:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

const PORT = process.env.PORT || 5000;




// Event DELETE
app.delete("/api/admin/events/:id", async (req, res) => {
  try {
    const eventId = req.params.id;
    await Event.findByIdAndDelete(eventId);
    await SessionChair.deleteMany({ eventId });
    await Participant.deleteMany({ eventId });
    res.json({ success: true, message: "Event deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Track POST
app.post("/api/admin/events/:id/tracks", async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false });

    const existingIds = event.tracks.map(t => parseInt(t.id, 10)).filter(n => !isNaN(n));
    const nextId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
    const trackId = nextId.toString().padStart(3, "0");

    const newTrack = {
      id: trackId,
      title: req.body.title,
      description: req.body.description,
      assessmentLocked: true,
      meetingLink: ""
    };

    event.tracks.push(newTrack);
    await event.save();
    res.json({ success: true, track: newTrack });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Track PUT
app.put("/api/admin/events/:id/tracks/:trackId", async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false });

    const track = event.tracks.find(t => t.id === req.params.trackId);
    if (!track) return res.status(404).json({ success: false });

    track.title = req.body.title;
    track.description = req.body.description;
    await event.save();
    res.json({ success: true, track });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Track DELETE
app.delete("/api/admin/events/:id/tracks/:trackId", async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false });

    event.tracks = event.tracks.filter(t => t.id !== req.params.trackId);
    await event.save();

    // Also delete related evaluators and participants
    await SessionChair.deleteMany({ eventId: req.params.id, trackId: req.params.trackId });
    await Participant.deleteMany({ eventId: req.params.id, trackId: req.params.trackId });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

const generateTempPassword = (fullName) => {
  if (!fullName) return "evaluator123";
  const cleanName = fullName.replace(/^(mr\.|mrs\.|ms\.|dr\.|prof\.)\s*/i, "").trim();
  const firstName = cleanName.split(" ")[0].toLowerCase().replace(/[^a-z0-9]/g, "") || "evaluator";
  return `${firstName}123`;
};

// Evaluator POST
app.post("/api/admin/evaluators", async (req, res) => {
  try {
    const { eventId, trackId, name, email, phone } = req.body;

    const isUnique = await checkEmailUnique(email);
    if (!isUnique) {
      return res.status(400).json({ success: false, message: "This email is already in use by another role in the system." });
    }

    const exists = await SessionChair.findOne({ email, eventId, trackId });
    if (exists) return res.status(400).json({ success: false, message: "Evaluator with this email already exists in this track." });

    const tempPassword = generateTempPassword(name);
    const evaluator = await SessionChair.create({
      name,
      email: email.trim().toLowerCase(),
      phone,
      type: "Evaluator", // Default for legacy compatibility
      passwordHash: hashPassword(tempPassword),
      trackId,
      eventId
    });

    // Attempt to send email but don't fail if it doesn't work
    try {
      await sendMail({
        from: `"HackEval" <${process.env.MAIL_USER}>`,
        to: email,
        subject: "IKIGAI 2026 - Evaluator Invitation",
        html: `<p>Hello <b>${name}</b>,</p><p>You have been assigned as an Evaluator.</p><p><b>Track:</b> ${trackId}</p><p><b>Login Email:</b> ${email}</p><p><b>Temporary Password:</b> ${tempPassword}</p>`
      });
    } catch (e) {
      console.error("Email failed", e);
    }

    res.json({ success: true, evaluator });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- New Routes for Evaluator Email Invitations & Password Update ---

const generateInviteEmailHtml = (name, email, tempPassword, updateToken) => {
  const frontendUrl = process.env.FRONTEND_URL || "https://ikigai-csit.up.railway.app";
  return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <div style="text-align: center; padding: 20px; background-color: #ffffff; border-radius: 8px;">
          <img src="https://res.cloudinary.com/dixdw1mus/image/upload/v1785233443/ikigai_fjnl8b.png" width="200" alt="IKIGAI 2026 Logo" style="background-color: #ffffff;" />
        </div>
        <h2 style="color: #2c3e50;">Dear Evaluator ${name},</h2>
        <p>Welcome to IKIGAI 2026! We are honored to have you on board as a distinguished evaluator. Your expertise and insights are invaluable in helping us recognize and celebrate the innovative projects presented by our talented participants.</p>
        <p>Below, you will find your secure credentials to access the evaluation portal</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0;"><strong>Login Email:</strong> ${email}</p>
          <p style="margin: 0;"><strong>Temporary Password:</strong> ${tempPassword}</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${frontendUrl}" style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Access the Project Portal</a>
        </div>
        <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
          <p style="font-size: 14px; color: #666;">Want to change your password? Click here to securely update it. (This link expires in 15 minutes)</p>
          <a href="${frontendUrl}/update-password?token=${updateToken}" style="color: #2563eb; text-decoration: underline; font-size: 14px;">Update Password securely</a>
        </div>
        <div style="margin-top: 40px; font-size: 14px; color: #666;">
          <p>Thank you for contributing to the success of IKIGAI 2026.</p>
          <p>Warm regards,<br>The IKIGAI Organizing Team</p>
        </div>
      </div>
    `;
};

app.post("/api/admin/evaluators/:id/send-invite", async (req, res) => {
  try {
    const evaluator = await SessionChair.findById(req.params.id);
    if (!evaluator) return res.status(404).json({ success: false, message: "Evaluator not found" });

    const tempPassword = generateTempPassword(evaluator.name);
    const updateToken = crypto.randomBytes(32).toString("hex");

    evaluator.passwordHash = hashPassword(tempPassword);
    evaluator.updateToken = updateToken;
    evaluator.updateTokenExpiry = Date.now() + 15 * 60 * 1000; // 15 mins
    evaluator.inviteSent = true;
    await evaluator.save();

    await sendMail({
      to: evaluator.email,
      subject: `IKIGAI 2026 - Evaluator Invitation [${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}]`,
      html: generateInviteEmailHtml(evaluator.name, evaluator.email, tempPassword, updateToken)
    });

    res.json({ success: true, message: "Invitation sent" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/api/admin/evaluators/send-invites-bulk", async (req, res) => {
  try {
    const evaluators = await SessionChair.find({ type: "Evaluator" });
    let sent = 0;
    let failed = 0;

    for (let evaluator of evaluators) {
      try {
        const tempPassword = generateTempPassword(evaluator.name);
        const updateToken = crypto.randomBytes(32).toString("hex");

        evaluator.passwordHash = hashPassword(tempPassword);
        evaluator.updateToken = updateToken;
        evaluator.updateTokenExpiry = Date.now() + 15 * 60 * 1000;
        evaluator.inviteSent = true;
        await evaluator.save();

        await sendMail({
          to: evaluator.email,
          subject: `IKIGAI 2026 - Evaluator Invitation [${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}]`,
          html: generateInviteEmailHtml(evaluator.name, evaluator.email, tempPassword, updateToken)
        });
        sent++;
      } catch (e) {
        console.error("Failed to send to", evaluator.email, e);
        failed++;
      }
    }

    res.json({ success: true, message: `Sent ${sent} invitations, ${failed} failed.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/api/admin/evaluators/send-invites-selected", async (req, res) => {
  try {
    const { evaluatorIds } = req.body;
    if (!evaluatorIds || !Array.isArray(evaluatorIds)) {
      return res.status(400).json({ success: false, message: "No evaluators selected" });
    }

    const evaluators = await SessionChair.find({ _id: { $in: evaluatorIds } });
    let sent = 0;
    let failed = 0;

    for (let evaluator of evaluators) {
      try {
        const tempPassword = generateTempPassword(evaluator.name);
        const updateToken = crypto.randomBytes(32).toString("hex");

        evaluator.passwordHash = hashPassword(tempPassword);
        evaluator.updateToken = updateToken;
        evaluator.updateTokenExpiry = Date.now() + 15 * 60 * 1000;
        evaluator.inviteSent = true;
        await evaluator.save();

        await sendMail({
          to: evaluator.email,
          subject: `IKIGAI 2026 - Evaluator Invitation [${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}]`,
          html: generateInviteEmailHtml(evaluator.name, evaluator.email, tempPassword, updateToken)
        });
        sent++;
      } catch (e) {
        console.error("Failed to send to", evaluator.email, e);
        failed++;
      }
    }

    res.json({ success: true, message: `Sent ${sent} invitations, ${failed} failed.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/api/auth/update-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ success: false, message: "Token and new password required" });

    const evaluator = await SessionChair.findOne({
      updateToken: token,
      updateTokenExpiry: { $gt: Date.now() }
    });

    if (!evaluator) {
      return res.status(400).json({ success: false, message: "This password reset link has expired or is invalid." });
    }

    evaluator.passwordHash = hashPassword(newPassword);
    evaluator.updateToken = undefined;
    evaluator.updateTokenExpiry = undefined;
    await evaluator.save();

    res.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});
// Direct change password (for logged in users)
app.post("/api/auth/change-password-direct", async (req, res) => {
  try {
    const { email, role, newPassword } = req.body;
    if (!email || !role || !newPassword) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const hashed = hashPassword(newPassword);

    if (role === "studentCoordinator") {
      const student = await StudentCoordinator.findOne({ email: normalizedEmail });
      if (!student) return res.status(404).json({ success: false, message: "User not found" });
      student.passwordHash = hashed;
      await student.save();
      return res.json({ success: true, message: "Password updated successfully" });
    }
    else if (role === "sessionChair") {
      const chair = await SessionChair.findOne({ email: normalizedEmail });
      if (!chair) return res.status(404).json({ success: false, message: "User not found" });
      chair.passwordHash = hashed;
      await chair.save();
      return res.json({ success: true, message: "Password updated successfully" });
    }
    else {
      return res.status(400).json({ success: false, message: "Invalid role or operation not supported for this role" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});
// --- End New Routes ---

// Evaluator PUT
app.put("/api/admin/evaluators/:id", async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    const isUnique = await checkEmailUnique(email, req.params.id, "sessionChair");
    if (!isUnique) {
      return res.status(400).json({ success: false, message: "This email is already in use by another user." });
    }

    const evaluator = await SessionChair.findByIdAndUpdate(req.params.id, {
      name, email: email.trim().toLowerCase(), phone
    }, { new: true });
    res.json({ success: true, evaluator });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Evaluator DELETE
app.delete("/api/admin/evaluators/:id", async (req, res) => {
  try {
    await SessionChair.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});



app.get('/api/admin/evaluators/all', async (req, res) => {
  try {
    const chairs = await SessionChair.find({});
    res.json({ success: true, chairs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// ✅ Admin: Create Global Student Coordinator
app.post("/api/admin/student-coordinators/global", async (req, res) => {
  try {
    const { name, firstName, email, phone } = req.body;

    // Check if exists globally
    const isUnique = await checkEmailUnique(email);
    if (!isUnique) {
      return res.status(400).json({ success: false, message: "This email is already in use by another role in the system." });
    }

    const tempPassword = (firstName || "student").toLowerCase().replace(/[^a-z0-9]/g, "") + "123";
    const passwordHash = await hashPassword(tempPassword);

    const newStudent = await StudentCoordinator.create({
      name,
      email,
      phone,
      passwordHash,
      eventId: "global",
      trackId: "global"
    });

    res.json({ success: true, user: { ...newStudent.toObject(), tempPassword } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get("/api/admin/student-coordinators/global", async (req, res) => {
  try {
    const students = await StudentCoordinator.find({ eventId: "global" });
    res.json({ success: true, students });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete("/api/admin/student-coordinators/:id", async (req, res) => {
  try {
    await StudentCoordinator.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
// ✅ Admin: Team Leaders endpoints
const UNIVERSE_WORDS = ["Milkyway", "Pluto", "Galaxy", "Nebula", "Orion", "Cosmos", "Nova", "Apollo", "Saturn", "Jupiter", "Starlight", "Meteor"];

app.get("/api/admin/team-leaders/all", async (req, res) => {
  try {
    const leaders = await TeamLeader.find().populate('participantId');
    res.json({ success: true, leaders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/admin/team-leaders/:eventId", async (req, res) => {
  try {
    const leaders = await TeamLeader.find({ eventId: req.params.eventId }).populate('participantId');
    res.json({ success: true, leaders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/admin/team-leaders/send-mail", async (req, res) => {
  try {
    const { eventId, leaderIds } = req.body;
    const leaders = await TeamLeader.find({ _id: { $in: leaderIds } }).populate('participantId');

    let successCount = 0;
    for (const tl of leaders) {
      const p = tl.participantId;
      if (!p) continue;

      const randomWord = UNIVERSE_WORDS[Math.floor(Math.random() * UNIVERSE_WORDS.length)];
      const tempPass = `${randomWord}123`;
      const hashed = hashPassword(tempPass);

      tl.passwordHash = hashed;
      tl.inviteSent = true;
      await tl.save();

      // Generate Welcome Notification
      await NotificationModel.create({
        recipientEmail: tl.email,
        title: "Welcome to iKIGAI",
        message: "Welcome to the iKIGAI Team Leader Portal. Please change your default password to secure your account.",
        type: "Welcome"
      });

      await sendMail({
        to: tl.email,
        subject: "Congratulations! You are shortlisted for Round 2",
        html: `
          <div style="background-color: #fdf4ff; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #334155; margin: 0; padding: 20px; line-height: 1.6;">
            <div style="max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 15px rgba(168, 85, 247, 0.1); overflow: hidden;">
              <div style="background: linear-gradient(135deg, #a855f7 0%, #db2777 100%); padding: 30px 20px; text-align: center; color: #ffffff;">
                <h1 style="margin: 0; font-size: 28px; letter-spacing: 1px; font-weight: 700;">Congratulations!</h1>
                <p style="margin-top: 10px; font-size: 18px;">You've made it to the Grand Finale of IKIGAI 2026</p>
              </div>
              <div style="padding: 40px 30px;">
                <p>Dear <span style="color: #9d174d; font-weight: 600;">${tl.name}</span>,</p>
                <p>We are delighted to inform you that your team, <span style="color: #9d174d; font-weight: 600;">${tl.teamName}</span>, has successfully qualified for the <strong>Grand Finale (Offline Round 2)</strong> of <strong>IKIGAI 2026 – Intelligent Knowledge Integration for Global AI Innovation</strong>, a <strong>36-hour National-Level Hackathon</strong> organized by the <strong>Department of Computer Science & Information Technology, Acropolis Institute of Technology and Research (AITR), Indore</strong>.</p>
                <p>Your selection reflects your team's innovation, technical skills, and outstanding performance in Round 1. We look forward to welcoming you to the Grand Finale for an exciting journey of collaboration, creativity, and problem-solving.</p>
                
                <h2 style="color: #86198f; margin-top: 30px; margin-bottom: 15px; border-bottom: 2px solid #fdf4ff; padding-bottom: 5px;">Complete Your Grand Finale Registration</h2>
                <p>To confirm your participation, please complete the registration process <strong style="color: #d946ef;">on or before 8 August 2026, 11:00 AM</strong>.</p>
                <ul style="padding-left: 20px;">
                  <li style="margin-bottom: 8px;">Pay the <strong>registration fee of ₹501 per team</strong></li>
                  <li style="margin-bottom: 8px;">Select your preferred <strong>problem domain (track)</strong> in order of preference</li>
                </ul>
                <p><em><strong>Please Note:</strong> The specific problem statement for your allotted domain will be revealed on <strong>15 August 2026</strong>.</em></p>
                <p><em><strong>Selecting a preferred domain during registration does not guarantee its allocation. Domain allotment will be based on first-come, first-registration and successful Round 1 solution submission, subject to availability.</strong>.</em></p>
                
                <h3 style="color: #86198f; margin-top: 30px; margin-bottom: 15px; border-bottom: 2px solid #fdf4ff; padding-bottom: 5px;">Login Details</h3>
                <div style="background: #fdf4ff; border-left: 4px solid #a855f7; padding: 15px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                  <p style="margin: 8px 0;"><strong>Application Portal:</strong> <a href="https://ikigai-csit.up.railway.app/" style="color: #db2777;">https://ikigai-csit.up.railway.app/</a></p>
                  <p style="margin: 8px 0;"><strong>Login as:</strong> Team Leader</p>
                  <p style="margin: 8px 0;"><strong>Email:</strong> ${tl.email}</p>
                  <p style="margin: 8px 0;"><strong>Temporary Password:</strong> <span style="background: #f3e8ff; padding: 4px 8px; border-radius: 4px; font-weight: bold; color: #86198f;">${tempPass}</span></p>
                </div>
                <p style="font-size: 14px; color: #ef4444;"><em>For security reasons, we strongly recommend changing your password immediately after your first login.</em></p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://ikigai-csit.up.railway.app/" style="background: linear-gradient(135deg, #a855f7 0%, #db2777 100%); color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold; display: inline-block; box-shadow: 0 4px 10px rgba(168, 85, 247, 0.3);">Login to Dashboard</a>
                </div>
                <p>Your participation will be confirmed only after successful payment and completion of the registration process.</p>
                
                <h2 style="color: #86198f; margin-top: 30px; margin-bottom: 15px; border-bottom: 2px solid #fdf4ff; padding-bottom: 5px;">Grand Finale Schedule</h2>
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                  <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #f3e8ff; font-weight: bold; color: #86198f; width: 35%;">Reporting Date</td>
                    <td style="padding: 10px; border-bottom: 1px solid #f3e8ff;">21 August 2026</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #f3e8ff; font-weight: bold; color: #86198f; width: 35%;">Reporting Time</td>
                    <td style="padding: 10px; border-bottom: 1px solid #f3e8ff;">4:00 PM</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #f3e8ff; font-weight: bold; color: #86198f; width: 35%;">Hackathon Duration</td>
                    <td style="padding: 10px; border-bottom: 1px solid #f3e8ff;">36 Hours (Non-Stop)</td>
                  </tr>
                </table>
                
                <h2 style="color: #86198f; margin-top: 30px; margin-bottom: 15px; border-bottom: 2px solid #fdf4ff; padding-bottom: 5px;">Venue</h2>
                <p><strong>Acropolis Institute of Technology and Research (AITR)</strong><br>Bypass Road (Dewas Road), Mangliya Square, Before Toll Tax, Indore, Madhya Pradesh<br>📍 <a href="https://tinyurl.com/LocationAcropolis" style="color: #db2777;">Google Maps</a> | 🌐 <a href="http://www.aitr.ac.in" style="color: #db2777;">www.aitr.ac.in</a></p>
                
                <h2 style="color: #86198f; margin-top: 30px; margin-bottom: 15px; border-bottom: 2px solid #fdf4ff; padding-bottom: 5px;">Travel Advisory</h2>
                <p>Participants travelling from outside Indore are advised to book their travel tickets as early as possible and ensure they arrive at the venue before the reporting time.</p>
                
                <h2 style="color: #86198f; margin-top: 30px; margin-bottom: 15px; border-bottom: 2px solid #fdf4ff; padding-bottom: 5px;">Hospitality</h2>
                <p>All registered participants will receive complimentary:</p>
                <ul style="padding-left: 20px;">
                  <li style="margin-bottom: 8px;">Breakfast</li>
                  <li style="margin-bottom: 8px;">Lunch</li>
                  <li style="margin-bottom: 8px;">Dinner</li>
                </ul>
                <p>throughout the hackathon. Additional event guidelines, reporting instructions, and important announcements will be shared through the application portal and registered email before the event.</p>
                <p>We encourage you to regularly check your dashboard for important updates and announcements.</p>
                <p>Once again, congratulations on qualifying for the Grand Finale. We wish you and your team the very best and look forward to witnessing your innovative ideas at <strong>IKIGAI 2026</strong>.</p>
                
                <h2 style="color: #86198f; margin-top: 30px; margin-bottom: 15px; border-bottom: 2px solid #fdf4ff; padding-bottom: 5px;">Official WhatsApp Group</h2>
                <p>To stay updated with the latest announcements, kindly join our official WhatsApp group for team leaders:</p>
                <div style="margin: 20px 0;">
                  <a href="https://chat.whatsapp.com/LpovcG41oI21iYYTdWNQIB?s=sw&p=a&ilr=0" style="background: #25D366; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; display: inline-block; box-shadow: 0 4px 10px rgba(37, 211, 102, 0.3);">Join WhatsApp Group</a>
                </div>

                <div style="margin-top: 40px; font-style: italic;">
                  <p style="margin-bottom: 5px;">Warm regards,</p>
                  <p style="margin: 0; font-weight: bold; color: #86198f;">Organizing Team – IKIGAI 2026</p>
                  <p style="margin: 0; font-size: 14px;">Department of Computer Science & Information Technology<br>Acropolis Institute of Technology and Research (AITR), Indore</p>
                </div>
              </div>
              <div style="background: #faf5ff; padding: 20px 30px; text-align: left; font-size: 14px; color: #64748b; border-top: 1px solid #f3e8ff;">
                <p style="margin-top: 0; margin-bottom: 10px; font-weight: bold; color: #86198f; font-size: 15px;">For any queries, please contact:</p>
                <ul style="list-style-type: none; padding-left: 0; margin-bottom: 0;">
                  <li style="margin-bottom: 8px;"><strong>Aarti Jaiswal</strong> (Faculty Coordinator) - <a href="tel:+918966883481" style="color: #db2777; text-decoration: none;">+91 89668 83481</a></li>
                  <li style="margin-bottom: 8px;"><strong>Anjali Khandelwal</strong> (Student Coordinator) - <a href="tel:+919406920845" style="color: #db2777; text-decoration: none;">9406920845</a></li>
                  <li><strong>Haripriya Gupta</strong> (Student Coordinator) - <a href="tel:+918839117054" style="color: #db2777; text-decoration: none;">8839117054</a></li>
                </ul>
              </div>
            </div>
          </div>
        `
      });
      successCount++;
    }
    res.json({ success: true, count: successCount });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/team/my-details", async (req, res) => {
  try {
    const email = req.query.email;
    if (!email) return res.status(400).json({ success: false, message: "Email required" });

    const tl = await TeamLeader.findOne({ email });
    if (!tl || !tl.participantId) {
      return res.status(404).json({ success: false, message: "Team not found" });
    }

    const shortlistedTeam = await Shortlisted.findOne({
      $or: [
        { participantId: tl.participantId },
        { participantId: String(tl.participantId) },
        { participantId: new mongoose.Types.ObjectId(tl.participantId) }
      ]
    });
    if (!shortlistedTeam) {
      return res.status(404).json({ success: false, message: "Team is not shortlisted" });
    }

    const teamObj = shortlistedTeam.toObject();
    delete teamObj.assessment;
    delete teamObj.pptLink;

    res.json({ success: true, team: teamObj });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Export app for integration testing (supertest imports this)
export { app };

// Only start listening when not under test
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\uD83D\uDE80 Server running on port ${PORT}`);
  });
}

/* ------------------------------- Server Start --------------------------- */

/* ================== REGISTRATION CONTROL ================== */
app.get("/api/admin/close-registration/list", async (req, res) => {
  try {
    const leaders = await TeamLeader.find({}).lean();

    let ikigai2Db;
    if (process.env.MONGO_URI) {
      const uri2 = process.env.MONGO_URI.replace("/ikigai?", "/ikigai2?");
      ikigai2Db = mongoose.createConnection(uri2);
    } else {
      ikigai2Db = mongoose.connection;
    }
    const TeamSchema = new mongoose.Schema({}, { strict: false });
    const TeamModel = ikigai2Db.model("Team", TeamSchema, "teams");

    const teams = await TeamModel.find({}).lean();

    const result = leaders.map(leader => {
      const pId = leader.participantId ? leader.participantId.toString() : null;
      const email = leader.email ? leader.email.toLowerCase() : null;

      const team = teams.find(t =>
        (pId && t.participantId === pId) ||
        (email && t.leaderEmail && t.leaderEmail.toLowerCase() === email)
      );

      const hasPaid = team && (team.receiptUrl || team.status === "Approved");

      return {
        _id: leader._id,
        name: leader.name,
        email: leader.email,
        teamName: leader.teamName,
        hasPaid: !!hasPaid,
        disableLoginAfter: leader.disableLoginAfter,
        disableLoginMessage: leader.disableLoginMessage
      };
    });

    res.json({ success: true, leaders: result });

    if (process.env.MONGO_URI && ikigai2Db) {
      await ikigai2Db.close();
    }
  } catch (err) {
    console.error("Error fetching close registration list:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post("/api/admin/close-registration/update", async (req, res) => {
  try {
    const { updates, disableTime, disableMessage } = req.body;

    for (const update of updates) {
      if (update.disabled) {
        await TeamLeader.updateOne(
          { _id: update.id },
          {
            $set: {
              disableLoginAfter: disableTime ? new Date(disableTime) : null,
              disableLoginMessage: disableMessage || "Registration window is now closed!"
            }
          }
        );
      } else {
        await TeamLeader.updateOne(
          { _id: update.id },
          { $unset: { disableLoginAfter: 1, disableLoginMessage: 1 } }
        );
      }
    }

    res.json({ success: true, message: "Registration control updated successfully" });
  } catch (err) {
    console.error("Error updating close registration:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});
