import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function verifySync() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("❌ MONGO_URI is not defined in .env");
    process.exit(1);
  }

  let ikigaiDb;

  try {
    ikigaiDb = await mongoose.createConnection(uri).asPromise();
    const Shortlisteds = ikigaiDb.collection('shortlisteds');

    const participantIds = [
      "6a67bd2e7e9e32c502d6dd6b", // Lumos
      "6a67bd4b7e9e32c502d6dd7a", // Parth
      "6a67bcec7e9e32c502d6dd55", // FreeSpot101
      "6a67bc967e9e32c502d6dd2e", // BinaryBreez
      "6a67bcb37e9e32c502d6dd41"  // Team KNS
    ];

    for (const pIdStr of participantIds) {
      const team = await Shortlisteds.findOne({ participantId: pIdStr });

      if (!team) {
        console.log(`\n❌ Team with participantId ${pIdStr} not found in shortlisteds.`);
        continue;
      }

      console.log(`\n======================================================`);
      console.log(`Team Name in Shortlisteds: ${team.teamName}`);
      console.log(`Leader Email: ${team.leaderEmail}`);
      console.log("Members in Shortlisteds:");
      team.members.forEach((m, idx) => {
        console.log(`  [${idx + 1}] Role: ${m.candidateRole}, Name: ${m.name}, Email: ${m.email}`);
      });
    }

  } catch (error) {
    console.error(error);
  } finally {
    if (ikigaiDb) await ikigaiDb.close();
  }
}

verifySync();
