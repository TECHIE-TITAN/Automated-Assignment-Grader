const db = require('../config/database');
const { autoGradeSubmission } = require('../services/pythonEvaluator');

// Helper function to generate feedback from grading results
const generateAutoGradeFeedback = (results) => {
  let feedback = `Auto-Graded: ${results.totalPoints}/${results.maxPoints} points\n\n`;
  
  if (!results.syntaxValid) {
    feedback += `Syntax Error: ${results.executionError}\n\n`;
  }
  
  results.criteria.forEach(criterion => {
    const status = criterion.passed === null ? 'PENDING' : (criterion.passed ? 'PASS' : 'FAIL');
    feedback += `${status} ${criterion.name}: ${criterion.points}/${criterion.maxPoints} points\n`;
    if (criterion.details) {
      feedback += `   ${criterion.details}\n`;
    }
    feedback += '\n';
  });
  
  return feedback;
};

// Helper function to regrade all submissions for an assignment
const regradeAllSubmissions = async (assignmentId, rubric) => {
  const submissions = await db.findMany('submissions', { assignmentId: assignmentId });
  
  for (const submission of submissions) {
    try {
      const gradingResults = await autoGradeSubmission(submission.code, rubric);
      
      // Calculate percentage grade
      const gradePercentage = gradingResults.maxPoints > 0
        ? Math.round((gradingResults.totalPoints / gradingResults.maxPoints) * 100)
        : 0;
      
      const feedback = generateAutoGradeFeedback(gradingResults);
      
      // Update submission with auto-grade results
      await db.updateOne(
        'submissions',
        { id: submission.id },
        {
          grade: gradePercentage,
          feedback: feedback,
          gradedAt: new Date().toISOString(),
          gradedBy: 'auto-grader',
          gradingResults: gradingResults
        }
      );
    } catch (gradeError) {
      console.error(`Failed to regrade submission ${submission.id}:`, gradeError);
    }
  }
};

// Upload rubric JSON file for an assignment
const uploadRubric = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const teacherId = req.user.id;

    const assignment = await db.findOne('assignments', { id: assignmentId });
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    if (assignment.teacherId !== teacherId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Parse the uploaded JSON rubric
    let rubricData;
    try {
      rubricData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (parseError) {
      return res.status(400).json({ error: 'Invalid JSON format' });
    }

    // Validate rubric structure
    if (!rubricData.criteria || !Array.isArray(rubricData.criteria)) {
      return res.status(400).json({ error: 'Rubric must have a criteria array' });
    }

    // Check if rubric exists
    const existingRubric = await db.findOne('rubrics', { assignmentId: assignmentId });

    let rubric;
    if (existingRubric) {
      // Update existing rubric
      await db.updateOne(
        'rubrics',
        { id: existingRubric.id },
        { 
          criteria: rubricData.criteria,
          metadata: rubricData.metadata || {},
          updatedAt: new Date().toISOString() 
        }
      );
      
      rubric = db.findOne('rubrics', { id: existingRubric.id });
      
      // Regrade all existing submissions
      await regradeAllSubmissions(assignmentId, rubric);
      
      return res.json({ 
        message: 'Rubric updated and all submissions regraded successfully', 
        rubric 
      });
    } else {
      // Create new rubric
      rubric = db.insertOne('rubrics', {
        assignmentId: assignmentId,
        teacherId,
        criteria: rubricData.criteria,
        metadata: rubricData.metadata || {}
      });

      // Update assignment hasRubric flag
      await db.updateOne(
        'assignments',
        { id: assignmentId },
        { hasRubric: true }
      );

      // Grade all existing submissions
      await regradeAllSubmissions(assignmentId, rubric);

      return res.status(201).json({ 
        message: 'Rubric uploaded and all submissions graded successfully', 
        rubric 
      });
    }
  } catch (error) {
    console.error('Upload rubric error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to upload rubric',
      details: error.message 
    });
  }
};

// Get rubric for an assignment
const getRubric = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const assignment = await db.findOne('assignments', { id: assignmentId });
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Check authorization
    if (userRole === 'teacher' && assignment.teacherId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (userRole === 'student') {
      const enrollment = await db.findOne('enrollments', {
        classroomId: assignment.classroomId,
        studentId: userId
      });
      if (!enrollment) {
        return res.status(403).json({ error: 'Not enrolled in this classroom' });
      }
    }

    const rubric = await db.findOne('rubrics', { assignmentId: assignmentId });
    if (!rubric) {
      return res.status(404).json({ error: 'No rubric found for this assignment' });
    }

    res.json({ rubric });
  } catch (error) {
    console.error('Get rubric error:', error);
    res.status(500).json({ error: 'Failed to fetch rubric' });
  }
};

// Delete rubric
const deleteRubric = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const teacherId = req.user.id;

    const assignment = await db.findOne('assignments', { id: assignmentId });
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    if (assignment.teacherId !== teacherId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const rubric = await db.findOne('rubrics', { assignmentId: assignmentId });
    if (rubric) {
      await db.deleteOne('rubrics', { id: rubric.id });
      
      // Update assignment hasRubric flag
      await db.updateOne(
        'assignments',
        { id: assignmentId },
        { hasRubric: false }
      );
    }

    res.json({ message: 'Rubric deleted successfully' });
  } catch (error) {
    console.error('Delete rubric error:', error);
    res.status(500).json({ error: 'Failed to delete rubric' });
  }
};

module.exports = {
  uploadRubric,
  getRubric,
  deleteRubric
};
