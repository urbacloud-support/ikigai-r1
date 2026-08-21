import 'dotenv/config';
import mongoose from 'mongoose';

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection.db;
  const cols = await db.listCollections().toArray();
  for (const c of cols) {
    const doc = await db.collection(c.name).findOne({ 'members.email': 'krishnakhirbadodiya230936@acropolis.in' });
    if (doc) console.log('FOUND members.email IN COLLECTION:', c.name, 'with ID:', doc._id);
    
    const doc2 = await db.collection(c.name).findOne({ email: 'krishnakhirbadodiya230936@acropolis.in' });
    if (doc2) console.log('FOUND email IN COLLECTION:', c.name, 'with ID:', doc2._id);
  }
  process.exit(0);
});
