import 'dotenv/config';
import mongoose from 'mongoose';

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  for (const c of collections) {
    const doc = await db.collection(c.name).findOne({ Assessments: { $exists: true } });
    if (doc) {
      console.log('Found capital Assessments in collection:', c.name, 'for team:', doc.teamName);
      console.log(JSON.stringify(doc.Assessments, null, 2));
    }
  }
  process.exit(0);
});
