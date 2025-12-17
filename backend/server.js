// Load environment variables (.env.local takes precedence over .env)
const fs = require('fs');
const path = require('path');
if (fs.existsSync(path.join(__dirname, '.env.local'))) {
  require('dotenv').config({ path: '.env.local' });
} else {
  require('dotenv').config();
}

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/mongodb');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
if (process.env.DB_TYPE === 'mongodb') {
  connectDB();
}

// For backward compatibility, still load db.js for migration scripts
const db = require('./config/db');

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
const authRoutes = require('./routes/auth');
const classroomRoutes = require('./routes/classrooms');
const assignmentRoutes = require('./routes/assignments');
const rubricRoutes = require('./routes/rubrics');
app.use('/api/auth', authRoutes);
app.use('/api/classrooms', classroomRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/rubrics', rubricRoutes);

// Test route
app.get('/', (req, res) => {
  res.json({ 
    message: '🎓 Assignment Grader API is running!',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Health check route
app.get('/health', (req, res) => {
  try {
    const studentCount = db.count('students');
    const teacherCount = db.count('teachers');
    const cseCount = db.findMany('students', { branch: 'CSE' }).length;
    const eceCount = db.findMany('students', { branch: 'ECE' }).length;
    const ddCount = db.findMany('students', { branch: 'DD' }).length;

    res.json({ 
      status: 'healthy',
      database: 'connected (JSON)',
      students: {
        total: studentCount,
        CSE: cseCount,
        ECE: eceCount,
        DD: ddCount
      },
      teachers: teacherCount
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      message: error.message 
    });
  }
});

// Stats route
app.get('/api/stats', (req, res) => {
  try {
    const students = db.readData('students');
    const teachers = db.readData('teachers');
    const classrooms = db.readData('classrooms');
    const assignments = db.readData('assignments');

    res.json({
      students: {
        total: students.length,
        byBranch: {
          CSE: students.filter(s => s.branch === 'CSE').length,
          ECE: students.filter(s => s.branch === 'ECE').length,
          DD: students.filter(s => s.branch === 'DD').length
        }
      },
      teachers: teachers.length,
      classrooms: classrooms.length,
      assignments: assignments.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(50));
  console.log('🚀 Assignment Grader API Server Started');
  console.log('='.repeat(50));
  console.log(`📡 Server URL: http://localhost:${PORT}`);
  console.log(`💚 Health Check: http://localhost:${PORT}/health`);
  console.log(`📊 Statistics: http://localhost:${PORT}/api/stats`);
  console.log('='.repeat(50) + '\n');
});
