import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const problemStatementSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
  trackId: { type: String, required: true },
  sponsorDescription: { type: String, default: "" },
  statements: [{
    id: { type: String, required: true },
    text: { type: String, required: true },
    limit: { type: Number, required: true, default: 0 },
  }],
}, { timestamps: true });

const ProblemStatement = mongoose.models.ProblemStatement || mongoose.model("ProblemStatement", problemStatementSchema);

async function cleanDuplicates() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to DB.");

    const allPS = await ProblemStatement.find({}).sort({ createdAt: 1 });
    const seen = new Set();
    const toDelete = [];

    for (const ps of allPS) {
      const key = `${ps.eventId.toString()}_${ps.trackId}`;
      if (seen.has(key)) {
        toDelete.push(ps._id);
        console.log(`Found duplicate: ${key}, adding ${ps._id} to delete list.`);
      } else {
        seen.add(key);
        console.log(`Keeping: ${key} -> ${ps._id}`);
      }
    }

    if (toDelete.length > 0) {
      const res = await ProblemStatement.deleteMany({ _id: { $in: toDelete } });
      console.log(`Deleted ${res.deletedCount} duplicate problem statements.`);
    } else {
      console.log("No duplicates found.");
    }
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

cleanDuplicates();
