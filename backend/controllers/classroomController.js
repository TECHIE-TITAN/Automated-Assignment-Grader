const db = require('../config/database');

// Create a new classroom (Teachers only)
const createClassroom = async (req, res) => {
  try {
    const { name, description } = req.body;
    // Accept either 'id' (from JWT payload) or '_id' if present
    const teacherId = req.user && (req.user.id || req.user._id);

    // Ensure we have an authenticated teacher id
    if (!teacherId) {
      return res.status(401).json({ error: 'Unauthorized. Teacher ID missing from token.' });
    }

    // Validate input
    if (!name) {
      return res.status(400).json({ error: 'Classroom name is required' });
    }

    // Create classroom
    const classroom = await db.insertOne('classrooms', {
      name,
      description: description || '',
      teacherId
    });

    res.status(201).json({
      message: 'Classroom created successfully',
      classroom
    });
  } catch (error) {
    console.error('Create classroom error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get all classrooms for a teacher
const getTeacherClassrooms = async (req, res) => {
  try {
    const teacherId = req.user && (req.user.id || req.user._id);
    if (!teacherId) {
      return res.status(401).json({ error: 'Unauthorized. Teacher ID missing from token.' });
    }

    // Get all classrooms created by this teacher
    const classrooms = await db.findMany('classrooms', { teacherId });

    // For each classroom, get enrollment count
    const classroomsWithStats = await Promise.all(classrooms.map(async classroom => {
      const enrollments = await db.findMany('enrollments', { classroomId: classroom.id });
      return {
        ...classroom,
        studentCount: enrollments.length
      };
    }));

    res.json({ classrooms: classroomsWithStats });
  } catch (error) {
    console.error('Get teacher classrooms error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get all classrooms for a student (enrolled classrooms)
const getStudentClassrooms = async (req, res) => {
  try {
    const studentId = req.user.id;

    // Get all enrollments for this student
    const enrollments = await db.findMany('enrollments', { studentId });

    // Get classroom details for each enrollment
    const classrooms = await Promise.all(enrollments.map(async enrollment => {
      const classroom = await db.findOne('classrooms', { id: enrollment.classroomId });
      const teacher = await db.findOne('teachers', { id: classroom.teacherId });
      
      return {
        ...classroom,
        teacherName: teacher ? teacher.name : 'Unknown',
        enrolledAt: enrollment.enrolledAt
      };
    }));

    res.json({ classrooms });
  } catch (error) {
    console.error('Get student classrooms error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get single classroom details with students
const getClassroomDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const classroomId = id;

    // Get classroom
    const classroom = await db.findOne('classrooms', { id: classroomId });
    
    if (!classroom) {
      return res.status(404).json({ error: 'Classroom not found' });
    }

    // Check if user has access (teacher who created it or enrolled student)
    const isTeacher = req.user.role === 'teacher' && classroom.teacherId === req.user.id;
    const isEnrolledStudent = req.user.role === 'student' && 
      db.findOne('enrollments', { classroomId, studentId: req.user.id });

    if (!isTeacher && !isEnrolledStudent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get enrolled students
    const enrollments = await db.findMany('enrollments', { classroomId });
    const students = await Promise.all(enrollments.map(async enrollment => {
      const student = await db.findOne('students', { id: enrollment.studentId });
      return {
        id: student.id,
        name: student.name,
        email: student.email,
        rollNumber: student.rollNumber,
        branch: student.branch,
        enrolledAt: enrollment.enrolledAt
      };
    }));

    // Get teacher info
    const teacher = await db.findOne('teachers', { id: classroom.teacherId });

    res.json({
      classroom: {
        ...classroom,
        teacherName: teacher ? teacher.name : 'Unknown',
        students,
        studentCount: students.length
      }
    });
  } catch (error) {
    console.error('Get classroom details error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Add students to classroom (Teachers only)
const addStudentsToClassroom = async (req, res) => {
  try {
    const { id } = req.params;
    const { studentIds } = req.body;
    const classroomId = id; // Don't parse to int - MongoDB uses ObjectIds
    const teacherId = req.user && (req.user.id || req.user._id);
    if (!teacherId) {
      return res.status(401).json({ error: 'Unauthorized. Teacher ID missing from token.' });
    }

    // Validate
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ error: 'Student IDs array is required' });
    }

    // Check if classroom exists and belongs to teacher
    const classroom = await db.findOne('classrooms', { id: classroomId });
    if (!classroom) {
      return res.status(404).json({ error: 'Classroom not found' });
    }
    if (classroom.teacherId.toString() !== teacherId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Add students to classroom
    const added = [];
    const alreadyEnrolled = [];

    for (const studentId of studentIds) {
      // Check if student exists
      const student = await db.findOne('students', { id: studentId });
      if (!student) continue;

      // Check if already enrolled
      const existing = await db.findOne('enrollments', { classroomId, studentId });
      if (existing) {
        alreadyEnrolled.push(student.rollNumber);
      } else {
        await db.insertOne('enrollments', { classroomId, studentId });
        added.push(student.rollNumber);
      }
    }

    res.json({
      message: 'Students added to classroom',
      added,
      alreadyEnrolled
    });
  } catch (error) {
    console.error('Add students error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Remove student from classroom (Teachers only)
const removeStudentFromClassroom = async (req, res) => {
  try {
    const { id, studentId } = req.params;
    const classroomId = id; // Don't parse to int
    const studentIdStr = studentId; // Don't parse to int
    const teacherId = req.user && (req.user.id || req.user._id);
    if (!teacherId) {
      return res.status(401).json({ error: 'Unauthorized. Teacher ID missing from token.' });
    }

    // Check if classroom exists and belongs to teacher
    const classroom = await db.findOne('classrooms', { id: classroomId });
    if (!classroom) {
      return res.status(404).json({ error: 'Classroom not found' });
    }
    if (classroom.teacherId.toString() !== teacherId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Remove enrollment
    const deleted = await db.deleteOne('enrollments', { classroomId, studentId: studentIdStr });

    if (deleted) {
      res.json({ message: 'Student removed from classroom' });
    } else {
      res.status(404).json({ error: 'Enrollment not found' });
    }
  } catch (error) {
    console.error('Remove student error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get all students (for adding to classroom)
const getAllStudents = async (req, res) => {
  try {
    const { branch, search } = req.query;

    let students = db.readData('students');

    // Filter by branch if provided
    if (branch) {
      students = students.filter(s => s.branch === branch);
    }

    // Search by name, email, or roll number
    if (search) {
      const searchLower = search.toLowerCase();
      students = students.filter(s => 
        s.name.toLowerCase().includes(searchLower) ||
        s.email.toLowerCase().includes(searchLower) ||
        s.rollNumber.toLowerCase().includes(searchLower)
      );
    }

    // Remove password field
    students = students.map(({ password, ...student }) => student);

    res.json({ students });
  } catch (error) {
    console.error('Get all students error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  createClassroom,
  getTeacherClassrooms,
  getStudentClassrooms,
  getClassroomDetails,
  addStudentsToClassroom,
  removeStudentFromClassroom,
  getAllStudents
};
