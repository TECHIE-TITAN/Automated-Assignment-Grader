const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

// Generate JWT token
const generateToken = (user, role) => {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: role,
      name: user.name,
      ...(role === 'student' && { rollNumber: user.rollNumber, branch: user.branch })
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Student Login
const studentLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find student
    const student = await db.findOne('students', { email });
    
    if (!student) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, student.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(student, 'student');

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: student.id,
        name: student.name,
        email: student.email,
        rollNumber: student.rollNumber,
        branch: student.branch,
        role: 'student'
      }
    });
  } catch (error) {
    console.error('Student login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
};

// Teacher Login
const teacherLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find teacher
    const teacher = await db.findOne('teachers', { email });
    
    if (!teacher) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, teacher.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(teacher, 'teacher');

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        role: 'teacher'
      }
    });
  } catch (error) {
    console.error('Teacher login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    const { role, id } = req.user;
    
    if (role === 'student') {
      const student = await db.findOne('students', { id });
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }
      
      // Remove password from response
      const { password, ...studentData } = student;
      res.json({ user: { ...studentData, role: 'student' } });
    } else if (role === 'teacher') {
      const teacher = await db.findOne('teachers', { id });
      if (!teacher) {
        return res.status(404).json({ error: 'Teacher not found' });
      }
      
      // Remove password from response
      const { password, ...teacherData } = teacher;
      res.json({ user: { ...teacherData, role: 'teacher' } });
    } else {
      res.status(400).json({ error: 'Invalid user role' });
    }
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Teacher Registration (optional - for creating new teachers)
const teacherRegister = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // Check if teacher already exists
    const existingTeacher = await db.findOne('teachers', { email });
    if (existingTeacher) {
      return res.status(400).json({ error: 'Teacher with this email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create teacher
    const teacher = await db.insertOne('teachers', {
      name,
      email,
      password: hashedPassword
    });

    // Generate token
    const token = generateToken(teacher, 'teacher');

    res.status(201).json({
      message: 'Teacher registered successfully',
      token,
      user: {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        role: 'teacher'
      }
    });
  } catch (error) {
    console.error('Teacher registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
};

module.exports = {
  studentLogin,
  teacherLogin,
  getProfile,
  teacherRegister
};
