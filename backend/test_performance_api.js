import 'dotenv/config';
import http from 'http';

http.get('http://localhost:5000/api/team/performance?email=hemalkotkar@gmail.com', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(JSON.stringify(JSON.parse(data), null, 2));
  });
});
