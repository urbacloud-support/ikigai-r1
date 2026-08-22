const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkVerifications() {
  const uri = process.env.MONGO_URI;
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const teamVerifications = client.db('ikigai').collection('teamverifications');
    const teams = await teamVerifications.find({ teamName: { $regex: /^AGNIVEER$/i } }).toArray();
    
    if (teams.length > 0) {
      console.log('Found team in ikigai -> teamverifications:');
      console.log(JSON.stringify(teams, null, 2));
    } else {
      console.log('Team not found in ikigai -> teamverifications');
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}
checkVerifications();
