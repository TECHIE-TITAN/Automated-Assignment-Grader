const express = require('express');
const router = express.Router();
const classroomController = require('../controllers/classroomController');
const { authenticate, isTeacher, isStudent } = require('../middleware/auth');

// Teacher routes
router.post('/', authenticate, isTeacher, classroomController.createClassroom);
router.get('/teacher', authenticate, isTeacher, classroomController.getTeacherClassrooms);
router.post('/:id/students', authenticate, isTeacher, classroomController.addStudentsToClassroom);
router.delete('/:id/students/:studentId', authenticate, isTeacher, classroomController.removeStudentFromClassroom);
router.get('/students', authenticate, isTeacher, classroomController.getAllStudents);

// Student routes
router.get('/student', authenticate, isStudent, classroomController.getStudentClassrooms);

// Shared routes (both teacher and student)
router.get('/:id', authenticate, classroomController.getClassroomDetails);

module.exports = router;
