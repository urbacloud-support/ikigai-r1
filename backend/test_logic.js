const teams = [
  {
    "_id": "6a734438b51786d957fdbeb1",
    "leaderEmail": "krishnakhirbadodiya230936@acropolis.in",
    "members": [{ "email": "krishnakhirbadodiya230936@acropolis.in" }],
    "assessments": [
      {
        "eventName": "Ikigai26 Mentor Session 1",
        "evaluatorScores": [
          {
            "criteria": [
              {
                "name": "Task",
                "maxMarks": 10,
                "inputType": "text",
                "score": "Good"
              },
              {
                "name": "Progress",
                "maxMarks": 10,
                "inputType": "text",
                "score": "To see"
              },
              {
                "name": "numerical field",
                "maxMarks": 10,
                "inputType": "number",
                "score": 6
              }
            ]
          }
        ]
      }
    ]
  }
];

const performances = [];

for (const team of teams) {
  const assessmentsList = team.Assessments || team.assessments;
  if (!assessmentsList || !Array.isArray(assessmentsList)) continue;
  
  for (const assessment of assessmentsList) {
    if (!assessment) continue;
    
    const eventName = assessment.eventName || "Unknown Event";
    const teamAssessments = [];

    // Handle the new nested structure: assessment.evaluatorScores
    if (assessment.evaluatorScores && Array.isArray(assessment.evaluatorScores)) {
      for (const evaluatorScore of assessment.evaluatorScores) {
        const textData = {};
        let hasTextData = false;
        
        if (evaluatorScore.criteria && Array.isArray(evaluatorScore.criteria)) {
          for (const crit of evaluatorScore.criteria) {
            if (crit && typeof crit === 'object' && crit.name) {
              // ONLY capture fields where inputType is text OR name matches Task/Progress
              if (crit.inputType === 'text' || crit.name === 'Task' || crit.name === 'Progress') {
                // Extract the text value from the score field (as shown in the JSON schema)
                const val = crit.score || crit.value || "No feedback";
                textData[crit.name] = val;
                hasTextData = true;
              }
            }
          }
        }
        
        if (hasTextData) {
          teamAssessments.push(textData);
        }
      }
    } 
    
    // Push this event's performance if we found text feedback
    if (teamAssessments.length > 0) {
      performances.push({
        eventName,
        assessments: teamAssessments
      });
    }
  }
}

console.log(JSON.stringify(performances, null, 2));
