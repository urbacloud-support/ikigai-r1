const fs = require('fs');
let c = fs.readFileSync('backend/round2.routes.js', 'utf8');

const targetStr = `      transactionId: registration.transactionId,
      receiptUrl: registration.receiptUrl
    });`;

const replacement = `      transactionId: registration.transactionId,
      receiptUrl: registration.receiptUrl,
      assignedTrack: registration.assignedTrack,
      assignedProblemStatement: registration.assignedProblemStatement
    });`;

if (c.includes(targetStr) && !c.includes('assignedProblemStatement: registration.assignedProblemStatement')) {
  c = c.replace(targetStr, replacement);
  fs.writeFileSync('backend/round2.routes.js', c);
}
