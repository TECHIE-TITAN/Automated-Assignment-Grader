const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  assignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment',
    required: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  classroomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Classroom',
    required: true
  },
  code: {
    type: String,
    required: true
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  grade: Number,
  feedback: String,
  gradedAt: Date,
  gradedBy: String,
  gradingResults: mongoose.Schema.Types.Mixed
}, {
  timestamps: true
});

// Compound index for faster queries
submissionSchema.index({ assignmentId: 1, studentId: 1 });
submissionSchema.index({ classroomId: 1 });

module.exports = mongoose.model('Submission', submissionSchema);
