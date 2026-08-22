const { MongoClient } = require('mongodb');
require('dotenv').config();

async function fixTeamVerification() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("❌ MONGO_URI is not defined in .env");
    process.exit(1);
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    
    // The team is in ikigai2 database
    const dbIkigai2 = client.db('ikigai2');
    const Teams = dbIkigai2.collection('teams');
    const team = await Teams.findOne({ teamName: { $regex: /^AGNIVEER$/i } });
    
    if (!team) {
      console.log("Team AGNIVEER not found in ikigai2.teams");
      return;
    }
    
    console.log(`Found Team AGNIVEER in ikigai2.teams with _id: ${team._id}`);
    
    // Now search for teamverifications in ikigai
    const dbIkigai1 = client.db('ikigai');
    const TeamVerifications = dbIkigai1.collection('teamverifications');
    let verification = await TeamVerifications.findOne({ teamId: team._id });
    
    if (!verification) {
      console.log("No verification record found in ikigai.teamverifications. Trying ikigai2...");
      // Wait, is it in ikigai2?
      const TeamVerifications2 = dbIkigai2.collection('teamverifications');
      verification = await TeamVerifications2.findOne({ teamId: team._id });
      
      if (!verification) {
          console.log("No verification record found anywhere for teamId: " + team._id);
          
          // Wait, maybe the teamId is stored as string in teamverifications?
          console.log("Searching for string ID...");
          verification = await TeamVerifications.findOne({ teamId: team._id.toString() });
          if (!verification) {
              console.log("Still not found. Trying querying teamverifications by participantId: " + team.participantId);
              verification = await TeamVerifications.findOne({ participantId: team.participantId });
          }
      }
    }
    
    if (!verification) {
      console.log("ABSOLUTELY NO VERIFICATION RECORD FOUND.");
      return;
    }
    
    console.log(`Found Verification Record with _id: ${verification._id}`);
    
    let updated = false;
    const updatedMembers = verification.memberVerifications.map(member => {
      // Find the old member
      if (member.name === "Anshu Joshi" || member.memberEmail === "akarshgpandey@gmail.com") {
        console.log("Found member in verification record, updating name...");
        updated = true;
        return {
          ...member,
          name: "Divyanshi Solanki"
        };
      }
      return member;
    });

    if (updated) {
      // Update in the collection we found it in
      const coll = dbIkigai1.collection('teamverifications'); // Assuming it's here, update dynamically:
      await client.db('ikigai').collection('teamverifications').updateOne(
        { _id: verification._id },
        { $set: { memberVerifications: updatedMembers } }
      ).catch(e => {});
      
      await client.db('ikigai2').collection('teamverifications').updateOne(
        { _id: verification._id },
        { $set: { memberVerifications: updatedMembers } }
      ).catch(e => {});

      console.log("Update sent to verification collections.");
    } else {
      console.log("Member Anshu Joshi not found in memberVerifications array.");
    }
    
  } catch (error) {
    console.error("❌ An error occurred:", error);
  } finally {
    await client.close();
    console.log("Database disconnected.");
  }
}

fixTeamVerification();
