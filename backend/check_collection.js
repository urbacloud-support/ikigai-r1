import 'dotenv/config';
import mongoose from 'mongoose';

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection.db;
  const cols = await db.listCollections().toArray();
  for (const c of cols) {
    const doc = await db.collection(c.name).findOne({ _id: new mongoose.Types.ObjectId('6a734438b51786d957fdbeb1') });
    if (doc) console.log('FOUND IN COLLECTION:', c.name);
  }
  process.exit(0);
});
