const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGO_URI.replace('/ikigai?', '/ikigai2?')).then(async () => {
  const Team = mongoose.connection.collection('teams');
  const team = await Team.findOneAndUpdate({ status: 'Approved' }, { $set: { assignedTrack: '01' } }, { returnDocument: 'after' });
  console.log('Updated team:', team.value?.teamName, team.value?.assignedTrack);
  process.exit(0);
}).catch(e => console.error(e));
