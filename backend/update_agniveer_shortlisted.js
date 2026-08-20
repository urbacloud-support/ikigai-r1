import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function updateShortlisted() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("❌ MONGO_URI is not defined in .env");
    process.exit(1);
  }

  let ikigaiDb;
  try {
    ikigaiDb = await mongoose.createConnection(uri).asPromise();
    const Shortlisted = ikigaiDb.collection('shortlisteds');

    // Find the team by participantId
    const team = await Shortlisted.findOne({ participantId: "6a67bc897e9e32c502d6dd24" });
    if (!team) {
      console.log("Team not found in Shortlisted collection.");
      return;
    }

    console.log(`Found team ${team.teamName} in Shortlisted.`);

    const updatedMembers = team.members.map(member => {
      if (member.email === "rathorevedant32@gmail.com" || member.candidateRole === "Team Leader") {
        return {
          ...member,
          name: "Prince Pathariya",
          email: "pathariyaprince5@gmail.com",
          mobile: "918305295859",
          location: "Pithampur, Indore (MP)",
          userType: "College Student",
          domain: "Engineering",
          course: "B.Tech",
          specialization: "EEE",
          courseType: "UG",
          courseDuration: "4 Year",
          gradYear: "2029",
          organisation: "Ips academy Indore",
          differentlyAbled: false,
          photoUrl: "", // Left empty for frontend re-upload
        };
      }
      return member;
    });

    const result = await Shortlisted.updateOne(
      { _id: team._id },
      {
        $set: {
          members: updatedMembers,
          updatedAt: new Date()
        }
      }
    );

    if (result.modifiedCount > 0) {
      console.log("✅ Successfully updated Shortlisted collection.");
    } else {
      console.log("⚠️ No changes made to Shortlisted collection.");
    }

  } catch (error) {
    console.error("❌ An error occurred:", error);
  } finally {
    if (ikigaiDb) await ikigaiDb.close();
    console.log("Database disconnected.");
  }
}

updateShortlisted();
