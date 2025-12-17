const mongoose = require('mongoose');

const rubricSchema = new mongoose.Schema({
  assignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment',
    required: true,
    unique: true
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  },
  criteria: {
    type: [{
      name: String,
      description: String,
      weight: Number,
      auto_gradable: Boolean,
      ai_assisted: Boolean,
      test_cases: [{
        function_call: String,
        expected_output: String,
        timeout: Number
      }],
      patterns: [{
        name: String,
        pattern: String,
        points: Number
      }]
    }],
    required: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Rubric', rubricSchema);
