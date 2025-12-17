const express = require('express');
const router = express.Router();
const { authenticate, isTeacher } = require('../middleware/auth');
const rubricController = require('../controllers/rubricController');

// Upload rubric JSON file
router.post('/:assignmentId', authenticate, isTeacher, rubricController.uploadRubric);

// Get rubric
router.get('/:assignmentId', authenticate, rubricController.getRubric);

// Delete rubric
router.delete('/:assignmentId', authenticate, isTeacher, rubricController.deleteRubric);

module.exports = router;
