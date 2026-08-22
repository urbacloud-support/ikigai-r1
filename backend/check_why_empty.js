import 'dotenv/config';
import mongoose from 'mongoose';

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection.db;
  const email = 'krishnakhirbadodiya230936@acropolis.in';
  
  let teams = await db.collection("teams").find({ "members.email": email }).toArray();
  console.log("teams collection:", teams.length);
  
  let round2 = await db.collection("round2registrations").find({ "members.email": email }).toArray();
  console.log("round2registrations collection:", round2.length);
  if (round2.length > 0) {
    console.log("round2 assessments:", JSON.stringify(round2[0].assessments, null, 2));
  }
  
  let short = await db.collection("shortlisteds").find({ "members.email": email }).toArray();
  console.log("shortlisteds collection:", short.length);
  if (short.length > 0) {
    console.log("shortlisteds assessments:", JSON.stringify(short[0].assessments, null, 2));
  }
  
  let part = await db.collection("participants").find({ "members.email": email }).toArray();
  console.log("participants collection:", part.length);
  if (part.length > 0) {
    console.log("participants assessments:", JSON.stringify(part[0].assessments, null, 2));
  }
  
  process.exit(0);
});
