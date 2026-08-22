import 'dotenv/config';
import mongoose from 'mongoose';

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection.db;
  const p = await db.collection('shortlisteds').findOne({ "assessments.0": { $exists: true } });
  if (p && p.members && p.members.length > 0) {
    console.log("Email:", p.members[0].email);
  }
  process.exit(0);
});
