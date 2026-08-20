import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function findTeam() {
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
    const TeamLeaders = ikigaiDb.collection('teamleaders');

    const teamIdStr = "1703362-UJXL2996";
    const team = await Teams.findOne({ teamId: teamIdStr });
    
    if (team) {
      console.log("Team found:", JSON.stringify(team, null, 2));
      
      const leader = await TeamLeaders.findOne({ email: team.leaderEmail });
      console.log("Leader found:", JSON.stringify(leader, null, 2));
    } else {
      console.log("Team not found by teamId");
    }

  } catch (error) {
    console.error("❌ An error occurred:", error);
  } finally {
    if (ikigaiDb) await ikigaiDb.close();
    if (ikigai2Db) await ikigai2Db.close();
    console.log("Databases disconnected.");
  }
}

findTeam();
