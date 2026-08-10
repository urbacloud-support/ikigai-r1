const fs = require('fs');
let c = fs.readFileSync('frontend/src/pages/TeamHome.jsx', 'utf8');

c = c.replace('/api/admin/problem-statements/', '/api/problem-statements/');

fs.writeFileSync('frontend/src/pages/TeamHome.jsx', c);
