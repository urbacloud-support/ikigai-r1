import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function checkTeams() {
  const uri = process.env.MONGO_URI;
  const uri2 = uri.replace('/ikigai?', '/ikigai2?');
  
  let ikigai2Db;
  try {
    ikigai2Db = await mongoose.createConnection(uri2).asPromise();
    const Teams = ikigai2Db.collection('teams');
    
    const sample = await Teams.findOne({});
    console.log('Sample Team keys:', Object.keys(sample));
    console.log('Sample Team ID field:', sample.teamId, sample._id);
    
    // Search for any team with string matching 1703362-UJXL2996 or Agniveer
    const agni = await Teams.findOne({ $or: [{ teamName: /Agniveer/i }, { teamId: /1703362/ }] });
    if(agni) {
      console.log('Found Agniveer:', JSON.stringify(agni, null, 2));
    } else {
      console.log('Not found Agniveer');
    }
    
  } finally {
    if (ikigai2Db) await ikigai2Db.close();
  }
}
checkTeams();
