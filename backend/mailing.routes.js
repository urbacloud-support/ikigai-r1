import express from "express";
import mongoose from "mongoose";
import { sendMail } from "./mailer.js";

const router = express.Router();

/* ================== CONNECTIONS & MODELS ================== */
let ikigai2Db;
if (process.env.MONGO_URI) {
  const uri2 = process.env.MONGO_URI.replace("/ikigai?", "/ikigai2?");
  ikigai2Db = mongoose.createConnection(uri2);
}

const TeamSchema = new mongoose.Schema({}, { strict: false });
const TeamModel = ikigai2Db
  ? ikigai2Db.model("Team", TeamSchema, "teams")
  : mongoose.model("Team", TeamSchema, "teams");

const ShortlistedSchema = new mongoose.Schema({}, { strict: false });
const Shortlisted = mongoose.models.Shortlisted || mongoose.model("Shortlisted", ShortlistedSchema, "shortlisteds");

const ParticipantSchema = new mongoose.Schema({}, { strict: false });
const Participant = mongoose.models.Participant || mongoose.model("Participant", ParticipantSchema, "participants");

/* ================== ROUTES ================== */

// GET /api/admin/mailing/participants
// Fetches participants with their status based on filters
router.get("/participants", async (req, res) => {
  try {
    const { primaryFilter, eventId, trackId } = req.query;

    let participantsData = [];

    // Base query logic depending on primaryFilter
    if (primaryFilter === "Saved Shortlisted Teams") {
      // Get all from Shortlisted collection (or filter by eventId if provided)
      const q = eventId ? { eventId } : {};
      const shortlistedTeams = await Shortlisted.find(q).lean();

      // For each shortlisted team, fetch their Round 2 registration from TeamModel (ikigai2)
      for (const st of shortlistedTeams) {
        const leaderEmail = (st.createdBy || st.leaderEmail || "").toLowerCase();
        
        // Find if they registered in round 2
        const r2Team = await TeamModel.findOne({ leaderEmail }).lean();
        
        // Track filtering
        if (trackId) {
          let matchesTrack = false;
          if (r2Team && r2Team.trackPreferences && r2Team.trackPreferences.includes(trackId)) {
            matchesTrack = true;
          } else if (st.trackId === trackId) {
            matchesTrack = true;
          }
          if (!matchesTrack) continue; // Skip if they don't belong to the selected track
        }
        
        // Evaluate statuses
        let tShirtSizeProvided = false;
        let photosUploaded = false;
        let paymentDone = false;
        let preferenceSaved = false;
        let tShirtSizes = {};
        
        const missingArray = [];

        if (r2Team) {
          // Check preferences
          if (r2Team.trackPreferences && r2Team.trackPreferences.length > 0) {
            preferenceSaved = true;
          } else {
            missingArray.push("Preferences");
          }

          // Check payment
          if (r2Team.receiptUrl || (r2Team.status === "Approved" || r2Team.status === "Pending")) {
            // Need a better check for payment? usually receiptUrl exists
            if (r2Team.receiptUrl) paymentDone = true;
            else missingArray.push("Payment");
          } else {
            missingArray.push("Payment");
          }

          // Check photos and T-shirts for members
          let allTshirts = true;
          let allPhotos = true;
          
          if (r2Team.members && r2Team.members.length > 0) {
            for (const m of r2Team.members) {
              const tSize = r2Team.tshirtSizes?.[m.email] || m.tShirtSize;
              if (!tSize) {
                allTshirts = false;
              } else {
                tShirtSizes[m.email] = tSize;
              }
              if (!m.photoUrl) allPhotos = false;
            }
          } else {
            allTshirts = false;
            allPhotos = false;
          }

          if (allTshirts) tShirtSizeProvided = true;
          else missingArray.push("T-Shirts");

          if (allPhotos) photosUploaded = true;
          else missingArray.push("Photos");

        } else {
          missingArray.push("Round 2 Registration Not Started", "Preferences", "Payment", "T-Shirts", "Photos");
        }

        participantsData.push({
          id: st._id.toString(),
          teamName: st.teamName || "Unknown Team",
          leaderName: st.leaderName || "Leader",
          leaderEmail: leaderEmail,
          isRegisteredR2: !!r2Team,
          members: st.members || [],
          statuses: {
            tShirt: tShirtSizeProvided,
            tShirtSizes: tShirtSizes,
            payment: paymentDone,
            photos: photosUploaded,
            preferences: preferenceSaved,
            missingArray
          }
        });
      }
    } 
    // Handle all other Target Groups
    else if (["All Students", "Shortlisted Students", "Not Shortlisted Students"].includes(primaryFilter)) {
      const q = {};
      if (eventId && mongoose.isValidObjectId(eventId)) {
         q.eventId = new mongoose.Types.ObjectId(eventId);
      } else if (eventId) {
         q.eventId = eventId;
      }
      if (trackId) q.trackId = trackId;

      let allParts = await Participant.find(q).lean();

      // If we need to filter by shortlisted status, cross-reference the Shortlisted collection
      if (primaryFilter !== "All Students") {
         const sq = eventId ? { eventId } : {};
         const shortlistedTeams = await Shortlisted.find(sq).lean();
         const shortlistedEmails = new Set(shortlistedTeams.map(t => (t.leaderEmail || t.createdBy || "").toLowerCase()));
         
         if (primaryFilter === "Shortlisted Students") {
            allParts = allParts.filter(p => shortlistedEmails.has((p.email || p.createdBy || "").toLowerCase()));
         } else if (primaryFilter === "Not Shortlisted Students") {
            allParts = allParts.filter(p => !shortlistedEmails.has((p.email || p.createdBy || "").toLowerCase()));
         }
      }

      // Populate identical checkpoint statuses for frontend filtering
      participantsData = await Promise.all(allParts.map(async p => {
          const leaderEmail = (p.email || p.createdBy || "").toLowerCase();
          const r2Team = await TeamModel.findOne({ leaderEmail }).lean();
          
          let tShirtSizeProvided = false;
          let photosUploaded = false;
          let paymentDone = false;
          let preferenceSaved = false;
          let tShirtSizes = {};
          const missingArray = [];

          if (r2Team) {
            if (r2Team.trackPreferences && r2Team.trackPreferences.length > 0) preferenceSaved = true;
            else missingArray.push("Preferences");

            if (r2Team.receiptUrl) paymentDone = true;
            else missingArray.push("Payment");

            let allTshirts = true, allPhotos = true;
            if (r2Team.members && r2Team.members.length > 0) {
              for (const m of r2Team.members) {
                const tSize = r2Team.tshirtSizes?.[m.email] || m.tShirtSize;
                if (!tSize) allTshirts = false;
                else tShirtSizes[m.email] = tSize;
                if (!m.photoUrl) allPhotos = false;
              }
            } else {
              allTshirts = false;
              allPhotos = false;
            }

            if (allTshirts) tShirtSizeProvided = true;
            else missingArray.push("T-Shirts");
            if (allPhotos) photosUploaded = true;
            else missingArray.push("Photos");
          } else {
            missingArray.push("Round 2 Registration Not Started", "Preferences", "Payment", "T-Shirts", "Photos");
          }

          return {
            id: p._id.toString(),
            teamName: p.teamName || "N/A",
            leaderName: p.name || p.leaderName || "Unknown",
            leaderEmail,
            isRegisteredR2: !!r2Team,
            members: p.members || [],
            statuses: {
              tShirt: tShirtSizeProvided,
              tShirtSizes,
              payment: paymentDone,
              photos: photosUploaded,
              preferences: preferenceSaved,
              missingArray
            }
          };
      }));
    }

    res.json({ success: true, participants: participantsData });
  } catch (error) {
    console.error("Error fetching mailing participants:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/mailing/send
// Send bulk emails with variables
router.post("/send", async (req, res) => {
  try {
    const { recipients, subject, htmlBody } = req.body;
    
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ success: false, message: "No recipients provided" });
    }

    let sentCount = 0;
    let failCount = 0;
    
    // Chunk size for batching
    const CHUNK_SIZE = 25;
    
    for (let i = 0; i < recipients.length; i += CHUNK_SIZE) {
      const chunk = recipients.slice(i, i + CHUNK_SIZE);
      
      const chunkPromises = chunk.map(async (user) => {
        // Replace variables
        let personalizedHtml = htmlBody;
        personalizedHtml = personalizedHtml.replace(/\{\{participant_name\}\}/g, user.leaderName || "Participant");
        personalizedHtml = personalizedHtml.replace(/\{\{team_name\}\}/g, user.teamName || "Your Team");
        personalizedHtml = personalizedHtml.replace(/\{\{missing_items\}\}/g, (user.statuses?.missingArray || []).join(", ") || "None");

        let personalizedSubject = subject;
        personalizedSubject = personalizedSubject.replace(/\{\{participant_name\}\}/g, user.leaderName || "Participant");
        personalizedSubject = personalizedSubject.replace(/\{\{team_name\}\}/g, user.teamName || "Your Team");

        try {
          await sendMail({
            to: user.leaderEmail, 
            subject: personalizedSubject, 
            html: personalizedHtml
          });
          return { success: true };
        } catch (err) {
          console.error(`Failed to send to ${user.leaderEmail}:`, err);
          return { success: false };
        }
      });
      
      // Wait for the entire chunk to process
      const results = await Promise.all(chunkPromises);
      results.forEach(r => {
        if (r.success) sentCount++;
        else failCount++;
      });
      
      // If there are more chunks left, delay by 1 second to throttle and prevent rate limits
      if (i + CHUNK_SIZE < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    res.json({ success: true, message: `Successfully sent ${sentCount} emails. Failed: ${failCount}` });
  } catch (error) {
    console.error("Error sending bulk emails:", error);
    res.status(500).json({ success: false, message: "Server error sending emails" });
  }
});

export default router;
