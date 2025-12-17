const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');
const { authenticate, isTeacher, isStudent } = require('../middleware/auth');

// Create assignment (Teacher only)
router.post('/', authenticate, isTeacher, assignmentController.createAssignment);

// Get assignments for a classroom
router.get('/classroom/:classroomId', authenticate, assignmentController.getClassroomAssignments);

// Get assignment details
router.get('/:id', authenticate, assignmentController.getAssignmentDetails);

// Submit assignment (Student only)
router.post('/:id/submit', authenticate, isStudent, assignmentController.submitAssignment);

// Get all submissions for an assignment (Teacher only)
router.get('/:id/submissions', authenticate, isTeacher, assignmentController.getAssignmentSubmissions);

// Delete assignment (Teacher only)
router.delete('/:id', authenticate, isTeacher, assignmentController.deleteAssignment);

// Auto-grade a submission (Teacher only)
router.post('/submissions/:submissionId/autograde', authenticate, isTeacher, assignmentController.autoGradeSubmission);

// Manual grade a submission (Teacher only)
router.post('/submissions/:submissionId/grade', authenticate, isTeacher, assignmentController.manualGradeSubmission);

module.exports = router;
