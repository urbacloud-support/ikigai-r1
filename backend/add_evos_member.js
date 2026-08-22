import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function addEvosMember() {
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

    const Teams = ikigai2Db.collection('teams');
    const TeamsHistory = ikigai2Db.collection('teams_history');
    const Shortlisted = ikigaiDb.collection('shortlisteds');

    const teamIdStr = "6a745c92935855d0c5144fb5"; // Team EVOS

    // The new member to be added
    const newMember = {
      name: "Ajeet Jain",
      email: "programmingcompetitive28@gmail.com",
      mobile: "919259817639",
      location: "Rajiv Gandhi infront of unity 1, 452001,MP, India",
      userType: "College Student",
      domain: "Engineering",
      course: "B.Tech",
      specialization: "Information technology",
      courseType: "UG",
      courseDuration: "4 Year",
      gradYear: "2029",
      organisation: "IET DAVV Indore",
      differentlyAbled: false,
      photoUrl: "",
      candidateRole: "Team Member" // Important so they are recognized correctly
    };

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
    console.log(`Current members count: ${team.members.length}`);

    // Create a backup in teams_history
    const backupResult = await TeamsHistory.insertOne({
      ...team,
      _id: new mongoose.Types.ObjectId(), // generate new ID for history record
      originalTeamId: team._id,
      archivedAt: new Date(),
      archiveReason: "Adding a 3rd member (Ajeet Jain) to the team"
    });
    console.log(`✅ Backup created in teams_history (ID: ${backupResult.insertedId})`);

    // Add new member to tshirtSizes if it exists
    let updatedTshirtSizes = { ...team.tshirtSizes };
    updatedTshirtSizes[newMember.email] = ""; // Empty so team leader can select it in UI

    // Add the new member to the members array
    const updatedMembers = [...team.members, newMember];

    const teamUpdateResult = await Teams.updateOne(
      { _id: team._id },
      {
        $set: {
          members: updatedMembers,
          tshirtSizes: updatedTshirtSizes,
          updatedAt: new Date()
        }
      }
    );

    if (teamUpdateResult.modifiedCount > 0) {
      console.log(`✅ Successfully updated team ${team.teamName} in ikigai2 (members: ${updatedMembers.length})`);
    } else {
      console.log(`⚠️  No changes were made to team ${team.teamName} in ikigai2`);
    }

    // -------------------------------------------------------------------------
    // STEP 2: UPDATE IKIGAI (Shortlisteds)
    // -------------------------------------------------------------------------
    console.log(`\n--- Step 2: Processing ikigai (Shortlisteds) ---`);

    if (!team.participantId) {
      console.warn("⚠️ Team in ikigai2 does not have a participantId, trying to find by teamName in Shortlisteds");
    }

    const query = team.participantId 
      ? { participantId: team.participantId } 
      : { teamName: team.teamName };

    const shortlistedTeam = await Shortlisted.findOne(query);

    if (!shortlistedTeam) {
      console.log(`⚠️ Could not find team ${team.teamName} in Shortlisteds collection.`);
    } else {
      console.log(`Found team ${shortlistedTeam.teamName} in Shortlisteds.`);
      const updatedShortlistedMembers = [...shortlistedTeam.members, newMember];

      const slUpdateResult = await Shortlisted.updateOne(
        { _id: shortlistedTeam._id },
        {
          $set: {
            members: updatedShortlistedMembers,
            updatedAt: new Date()
          }
        }
      );

      if (slUpdateResult.modifiedCount > 0) {
        console.log(`✅ Successfully updated Shortlisted collection for ${team.teamName}`);
      } else {
        console.log(`⚠️ No changes made to Shortlisted collection for ${team.teamName}`);
      }
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

addEvosMember();
