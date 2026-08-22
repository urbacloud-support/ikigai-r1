import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function findTeam() {
  const uri = process.env.MONGO_URI;
  const uri2 = uri.replace("/ikigai?", "/ikigai2?");
  let ikigai2Db = await mongoose.createConnection(uri2).asPromise();
  const Teams = ikigai2Db.collection('teams');
  
  const team = await Teams.findOne({ teamName: /EVOS/i });
  console.log(team ? `Found team: ${team.teamName}, ID: ${team._id}` : "Not found");
  process.exit(0);
}
findTeam();
