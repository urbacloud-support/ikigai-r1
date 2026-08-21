const { MongoClient } = require('mongodb');
require('dotenv').config();

async function updateDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("❌ MONGO_URI is not defined in .env");
    process.exit(1);
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    
    // Update function helper
    const updateMember = async (collection, dbName, collectionName) => {
      console.log(`\nChecking ${dbName} -> ${collectionName} collection...`);
      // Use toArray in case of multiple documents for the same team (especially in history)
      const teams = await collection.find({ teamName: { $regex: /^AGNIVEER$/i } }).toArray();
      
      if (teams.length > 0) {
        console.log(`Found ${teams.length} document(s) for AGNIVEER in ${collectionName}.`);
        for (let team of teams) {
          let updated = false;
          const updatedMembers = team.members.map(member => {
            if (member.name === "Anshu Joshi" || member.email === "akarshgpandey@gmail.com") {
              console.log(`Found member in document _id ${team._id}, updating...`);
              updated = true;
              return {
                ...member,
                name: "Divyanshi Solanki",
                mobile: "9893416718",
                photoUrl: ""
              };
            }
            return member;
          });

          if (updated) {
            const result = await collection.updateOne(
              { _id: team._id },
              { $set: { members: updatedMembers, updatedAt: new Date() } }
            );
            console.log(`Update result for _id ${team._id}:`, result.modifiedCount);
          }
        }
      } else {
        console.log(`Team not found in ${collectionName} collection.`);
      }
    };

    // Databases and Collections to check
    const db1 = client.db('ikigai');
    const db2 = client.db('ikigai2');
    
    await updateMember(db1.collection('teams'), 'ikigai', 'teams');
    await updateMember(db2.collection('teams'), 'ikigai2', 'teams');
    await updateMember(db2.collection('teams_history'), 'ikigai2', 'teams_history');

  } catch (error) {
    console.error("❌ An error occurred:", error);
  } finally {
    await client.close();
    console.log("\nDatabase disconnected.");
  }
}

updateDB();
