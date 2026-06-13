const db = require('../config/database');
const { autoGradeSubmission, generateFeedback } = require('../services/pythonEvaluator');

const getDueDate = (assignment) => {
  if (!assignment || !assignment.dueDate) {
    return null;
  }

  const dueDate = new Date(assignment.dueDate);
  return Number.isNaN(dueDate.getTime()) ? null : dueDate;
};

const isAssignmentClosed = (assignment) => {
  const dueDate = getDueDate(assignment);
  return dueDate ? dueDate.getTime() <= Date.now() : false;
};

const withAssignmentStatus = (assignment, extraFields = {}) => ({
  ...assignment,
  isClosed: isAssignmentClosed(assignment),
  status: isAssignmentClosed(assignment) ? 'closed' : 'open',
  ...extraFields
});

// Create a new assignment for a classroom
const createAssignment = async (req, res) => {
  try {
    const { classroomId, title, description, dueDate, maxMarks } = req.body;
    const teacherId = req.user.id;

    // Verify teacher owns the classroom
    const classroom = await db.findOne('classrooms', { id: classroomId });
    if (!classroom) {
      return res.status(404).json({ error: 'Classroom not found' });
    }
    if (classroom.teacherId !== teacherId) {
      return res.status(403).json({ error: 'Not authorized to create assignments for this classroom' });
    }

    const assignment = await db.insertOne('assignments', {
      classroomId: classroomId,
      teacherId,
      title,
      description,
      dueDate,
      maxMarks: maxMarks,
      hasRubric: false
    });

    res.status(201).json({
      message: 'Assignment created successfully',
      assignment
    });
  } catch (error) {
    console.error('Create assignment error:', error);
    res.status(500).json({ error: 'Failed to create assignment' });
  }
};

// Get all assignments for a classroom (Teacher view)
const getClassroomAssignments = async (req, res) => {
  try {
    const { classroomId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const classroom = await db.findOne('classrooms', { id: classroomId });
    if (!classroom) {
      return res.status(404).json({ error: 'Classroom not found' });
    }

    // Check authorization
    if (userRole === 'teacher' && classroom.teacherId !== userId) {
      return res.status(403).json({ error: 'Not authorized to view this classroom' });
    }

    if (userRole === 'student') {
      const enrollment = await db.findOne('enrollments', {
        classroomId: classroomId,
        studentId: userId
      });
      if (!enrollment) {
        return res.status(403).json({ error: 'Not enrolled in this classroom' });
      }
    }

    const assignments = await db.findMany('assignments', { classroomId: classroomId });

    // For students, include their submission status
    if (userRole === 'student') {
      const assignmentsWithStatus = await Promise.all(assignments.map(async assignment => {
        const submission = await db.findOne('submissions', {
          assignmentId: assignment.id,
          studentId: userId
        });
        return withAssignmentStatus(assignment, {
          submitted: !!submission,
          submissionDate: submission?.submittedAt,
          grade: submission?.grade
        });
      }));
      return res.json({ assignments: assignmentsWithStatus });
    }

    // For teachers, include submission count
    const assignmentsWithStats = await Promise.all(assignments.map(async assignment => {
      const submissions = await db.findMany('submissions', { assignmentId: assignment.id });
      const gradedCount = submissions.filter(s => s.grade !== null && s.grade !== undefined).length;
      return withAssignmentStatus(assignment, {
        totalSubmissions: submissions.length,
        gradedSubmissions: gradedCount
      });
    }));

    res.json({ assignments: assignmentsWithStats });
  } catch (error) {
    console.error('Get assignments error:', error);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
};

// Get assignment details
const getAssignmentDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const assignment = await db.findOne('assignments', { id: id });
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const classroom = await db.findOne('classrooms', { id: assignment.classroomId });

    // Check authorization
    if (userRole === 'teacher' && classroom.teacherId !== userId) {
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

    // Get rubric if exists
    const rubric = await db.findOne('rubrics', { assignmentId: assignment.id });

    // If student, attach their submission if any
    let studentSubmission = null;
    if (userRole === 'student') {
      const submission = await db.findOne('submissions', { assignmentId: assignment.id, studentId: userId });
      if (submission) {
        studentSubmission = submission;
      }
    }

    res.json({
      assignment: {
        ...withAssignmentStatus(assignment),
        classroom: {
          id: classroom.id,
          name: classroom.name
        },
        rubric: rubric || null,
        submission: studentSubmission
      }
    });
  } catch (error) {
    console.error('Get assignment details error:', error);
    res.status(500).json({ error: 'Failed to fetch assignment details' });
  }
};

// Submit assignment (Student)
const submitAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const { code } = req.body;
    const studentId = req.user.id;

    const assignment = await db.findOne('assignments', { id: id });
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    if (isAssignmentClosed(assignment)) {
      return res.status(400).json({ error: 'Assignment is closed and no longer accepts submissions' });
    }

    // Verify student is enrolled
    const enrollment = await db.findOne('enrollments', {
      classroomId: assignment.classroomId,
      studentId
    });
    if (!enrollment) {
      return res.status(403).json({ error: 'Not enrolled in this classroom' });
    }

    // Check if already submitted
    const existingSubmission = await db.findOne('submissions', {
      assignmentId: assignment.id,
      studentId
    });

    let submissionId;
    if (existingSubmission) {
      // Update existing submission
      await db.updateOne(
        'submissions',
        { id: existingSubmission.id },
        {
          code,
          submittedAt: new Date().toISOString(),
          grade: null,
          feedback: null,
          gradedAt: null,
          gradedBy: null,
          gradingResults: null
        }
      );
      submissionId = existingSubmission.id;
    } else {
      // Create new submission
      const newSubmission = await db.insertOne('submissions', {
        assignmentId: assignment.id,
        studentId,
        classroomId: assignment.classroomId,
        code,
        submittedAt: new Date().toISOString(),
        grade: null,
        feedback: null
      });
      submissionId = newSubmission.id;
    }

    // Auto-grade if rubric exists
    if (assignment.hasRubric) {
      try {
        const rubric = await db.findOne('rubrics', { assignmentId: assignment.id });
        if (rubric) {
          const { autoGradeSubmission } = require('../services/pythonEvaluator');
          const gradingResults = await autoGradeSubmission(code, rubric);
          
          // Calculate percentage grade
          const gradePercentage = gradingResults.maxPoints > 0
            ? Math.round((gradingResults.totalPoints / gradingResults.maxPoints) * 100)
            : 0;
          
          const feedback = generateAutoGradeFeedback(gradingResults);
          
          // Update submission with auto-grade results
          await db.updateOne(
            'submissions',
            { id: submissionId },
            {
              grade: gradePercentage,
              feedback: feedback,
              gradedAt: new Date().toISOString(),
              gradedBy: 'auto-grader',
              gradingResults: gradingResults
            }
          );
        }
      } catch (gradeError) {
        console.error('Auto-grading failed:', gradeError);
        // Don't fail the submission if auto-grading fails
      }
    }

    return res.status(existingSubmission ? 200 : 201).json({ 
      message: existingSubmission ? 'Assignment resubmitted and auto-graded successfully' : 'Assignment submitted and auto-graded successfully',
      autoGraded: assignment.hasRubric
    });
  } catch (error) {
    console.error('Submit assignment error:', error);
    res.status(500).json({ error: 'Failed to submit assignment' });
  }
};

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

// Get all submissions for an assignment (Teacher)
const getAssignmentSubmissions = async (req, res) => {
  try {
    const { id } = req.params;
    const teacherId = req.user.id;

    const assignment = await db.findOne('assignments', { id: id });
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    if (assignment.teacherId !== teacherId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const submissions = await db.findMany('submissions', { assignmentId: assignment.id });

    // Attach student info to each submission
    const submissionsWithStudents = await Promise.all(submissions.map(async submission => {
      const student = await db.findOne('students', { id: submission.studentId });
      return {
        ...submission,
        student: {
          id: student.id,
          name: student.name,
          rollNumber: student.rollNumber,
          email: student.email
        }
      };
    }));

    res.json({ submissions: submissionsWithStudents });
  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
};

// Delete assignment (Teacher)
const deleteAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const teacherId = req.user.id;

    const assignment = await db.findOne('assignments', { id: id });
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    if (assignment.teacherId !== teacherId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await db.deleteOne('assignments', { id: id });
    
    // Also delete associated submissions and rubrics
    const submissions = await db.findMany('submissions', { assignmentId: id });
    submissions.forEach(sub => db.deleteOne('submissions', { id: sub.id }));
    
    const rubric = await db.findOne('rubrics', { assignmentId: id });
    if (rubric) {
      await db.deleteOne('rubrics', { id: rubric.id });
    }

    res.json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    console.error('Delete assignment error:', error);
    res.status(500).json({ error: 'Failed to delete assignment' });
  }
};

// Auto-grade a submission
const autoGradeSubmission_endpoint = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const teacherId = req.user.id;

    const submission = await db.findOne('submissions', { id: submissionId });
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const assignment = await db.findOne('assignments', { id: submission.assignmentId });
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    if (assignment.teacherId !== teacherId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Get rubric
    const rubric = await db.findOne('rubrics', { assignmentId: assignment.id });
    if (!rubric) {
      return res.status(400).json({ error: 'No rubric found for this assignment. Please create a rubric first.' });
    }

    // Auto-grade the submission
    const gradingResults = await autoGradeSubmission(submission.code, rubric);
    const feedback = generateFeedback(gradingResults);

    // Update submission with grade and feedback
    await db.updateOne(
      'submissions',
      { id: submission.id },
      {
        grade: gradingResults.totalPoints,
        feedback: feedback,
        gradedAt: new Date().toISOString(),
        gradedBy: teacherId,
        autoGraded: true,
        gradingResults: gradingResults
      }
    );

    const updatedSubmission = await db.findOne('submissions', { id: submission.id });

    res.json({
      message: 'Submission auto-graded successfully',
      submission: updatedSubmission,
      gradingResults: gradingResults
    });
  } catch (error) {
    console.error('Auto-grade error:', error);
    res.status(500).json({ error: 'Failed to auto-grade submission' });
  }
};

// Manual grade a submission (teacher overrides auto-grade)
const manualGradeSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { grade, feedback } = req.body;
    const teacherId = req.user.id;

    const submission = await db.findOne('submissions', { id: submissionId });
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const assignment = await db.findOne('assignments', { id: submission.assignmentId });
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    if (assignment.teacherId !== teacherId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Validate grade
    if (grade < 0 || grade > assignment.maxMarks) {
      return res.status(400).json({ error: `Grade must be between 0 and ${assignment.maxMarks}` });
    }

    // Update submission
    await db.updateOne(
      'submissions',
      { id: submission.id },
      {
        grade: grade,
        feedback: feedback || '',
        gradedAt: new Date().toISOString(),
        gradedBy: teacherId,
        autoGraded: false
      }
    );

    const updatedSubmission = await db.findOne('submissions', { id: submission.id });

    res.json({
      message: 'Submission graded successfully',
      submission: updatedSubmission
    });
  } catch (error) {
    console.error('Manual grade error:', error);
    res.status(500).json({ error: 'Failed to grade submission' });
  }
};

module.exports = {
  createAssignment,
  getClassroomAssignments,
  getAssignmentDetails,
  submitAssignment,
  getAssignmentSubmissions,
  deleteAssignment,
  autoGradeSubmission: autoGradeSubmission_endpoint,
  manualGradeSubmission
};
