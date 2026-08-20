import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function replaceTeamLeader() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("❌ MONGO_URI is not defined in .env");
    process.exit(1);
  }

  const uri2 = uri.replace("/ikigai?", "/ikigai2?");

  let ikigaiDb;
  let ikigai2Db;

  try {
    console.log("Connecting to databases...");
    ikigaiDb = await mongoose.createConnection(uri).asPromise();
    ikigai2Db = await mongoose.createConnection(uri2).asPromise();

    const TeamLeaders = ikigaiDb.collection('teamleaders');
    const Teams = ikigai2Db.collection('teams');
    const TeamsHistory = ikigai2Db.collection('teams_history');

    const oldEmail = "rathorevedant32@gmail.com";
    const teamIdStr = "6a7447af935855d0c5144f53";

    // -------------------------------------------------------------------------
    // STEP 1: UPDATE IKIGAI2 (Round 2 Data)
    // -------------------------------------------------------------------------
    console.log(`\n--- Step 1: Processing ikigai2 (Teams) ---`);
    
    // Find the team
    const team = await Teams.findOne({ _id: new mongoose.Types.ObjectId(teamIdStr) });
    if (!team) {
      throw new Error(`Team with _id ${teamIdStr} not found in ikigai2`);
    }

    console.log(`Found team: ${team.teamName}`);

    // Create a backup in teams_history
    const backupResult = await TeamsHistory.insertOne({
      ...team,
      _id: new mongoose.Types.ObjectId(), // generate new ID for history record
      originalTeamId: team._id,
      archivedAt: new Date(),
      archiveReason: "Team Leader Replacement (Vedant -> Prince)"
    });
    console.log(`✅ Backup created in teams_history (ID: ${backupResult.insertedId})`);

    // Prepare updates for the team
    let updatedTshirtSizes = { ...team.tshirtSizes };
    if (updatedTshirtSizes && updatedTshirtSizes[oldEmail]) {
      delete updatedTshirtSizes[oldEmail]; // Leave blank so it can be updated on frontend
    }

    // Map through members to update the leader
    const updatedMembers = team.members.map(member => {
      if (member.email === oldEmail || member.candidateRole === "Team Leader") {
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

    const teamUpdateResult = await Teams.updateOne(
      { _id: team._id },
      {
        $set: {
          leaderEmail: "pathariyaprince5@gmail.com",
          members: updatedMembers,
          tshirtSizes: updatedTshirtSizes,
          updatedAt: new Date()
        }
      }
    );

    if (teamUpdateResult.modifiedCount > 0) {
      console.log(`✅ Successfully updated team ${team.teamName} in ikigai2`);
    } else {
      console.log(`⚠️  No changes were made to team ${team.teamName}`);
    }


    // -------------------------------------------------------------------------
    // STEP 2: UPDATE IKIGAI (Login Credentials)
    // -------------------------------------------------------------------------
    console.log(`\n--- Step 2: Processing ikigai (TeamLeaders) ---`);

    const tlUpdateResult = await TeamLeaders.updateOne(
      { email: oldEmail },
      {
        $set: {
          email: "pathariyaprince5@gmail.com",
          name: "Prince Pathariya",
          phone: "918305295859",
          updatedAt: new Date()
        }
      }
    );

    if (tlUpdateResult.modifiedCount > 0) {
      console.log(`✅ Successfully updated TeamLeader login credentials in ikigai (Password remains unchanged)`);
    } else {
      console.log(`⚠️  Could not find or modify TeamLeader with email ${oldEmail}`);
    }

    console.log("\n🎉 ALL DONE!");

  } catch (error) {
    console.error("❌ An error occurred:", error);
  } finally {
    if (ikigaiDb) await ikigaiDb.close();
    if (ikigai2Db) await ikigai2Db.close();
    console.log("Databases disconnected.");
  }
}

replaceTeamLeader();
