require('dotenv').config();
const connectDB = require('../config/mongodb');
const oldDb = require('../config/db');

// Import models
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Classroom = require('../models/Classroom');
const Enrollment = require('../models/Enrollment');
const Assignment = require('../models/Assignment');
const Rubric = require('../models/Rubric');
const Submission = require('../models/Submission');

const migrateData = async () => {
  try {
    console.log('🚀 Starting migration from JSON to MongoDB...\n');
    
    // Connect to MongoDB
    await connectDB();
    
    // Clear existing data (optional - remove in production!)
    console.log('🗑️  Clearing existing MongoDB data...');
    await Student.deleteMany({});
    await Teacher.deleteMany({});
    await Classroom.deleteMany({});
    await Enrollment.deleteMany({});
    await Assignment.deleteMany({});
    await Rubric.deleteMany({});
    await Submission.deleteMany({});
    
    // Create ID mapping for foreign keys
    const studentIdMap = {};
    const teacherIdMap = {};
    const classroomIdMap = {};
    const assignmentIdMap = {};
    
    // 1. Migrate Students
    console.log('\n📚 Migrating Students...');
    const students = oldDb.findMany('students');
    for (const student of students) {
      const newStudent = await Student.create({
        name: student.name,
        email: student.email,
        password: student.password,
        rollNumber: student.rollNumber
      });
      studentIdMap[student.id] = newStudent._id;
      console.log(`  ✓ ${student.name} (${student.email})`);
    }
    console.log(`✅ Migrated ${students.length} students`);
    
    // 2. Migrate Teachers
    console.log('\n👨‍🏫 Migrating Teachers...');
    const teachers = oldDb.findMany('teachers');
    for (const teacher of teachers) {
      const newTeacher = await Teacher.create({
        name: teacher.name,
        email: teacher.email,
        password: teacher.password
      });
      teacherIdMap[teacher.id] = newTeacher._id;
      console.log(`  ✓ ${teacher.name} (${teacher.email})`);
    }
    console.log(`✅ Migrated ${teachers.length} teachers`);
    
    // 3. Migrate Classrooms
    console.log('\n🏫 Migrating Classrooms...');
    const classrooms = oldDb.findMany('classrooms');
    for (const classroom of classrooms) {
      // Skip if teacherId is missing or invalid
      if (!classroom.teacherId || !teacherIdMap[classroom.teacherId]) {
        console.log(`  ⚠️  Skipping ${classroom.name} - No valid teacher ID`);
        continue;
      }
      
      const newClassroom = await Classroom.create({
        name: classroom.name,
        description: classroom.description,
        teacherId: teacherIdMap[classroom.teacherId],
        teacherName: classroom.teacherName
      });
      classroomIdMap[classroom.id] = newClassroom._id;
      console.log(`  ✓ ${classroom.name}`);
    }
    console.log(`✅ Migrated ${Object.keys(classroomIdMap).length} classrooms`);
    
    // 4. Migrate Enrollments
    console.log('\n📝 Migrating Enrollments...');
    const enrollments = oldDb.findMany('enrollments');
    let enrollmentCount = 0;
    for (const enrollment of enrollments) {
      // Skip if classroom or student ID is missing or invalid
      if (!classroomIdMap[enrollment.classroomId] || !studentIdMap[enrollment.studentId]) {
        continue;
      }
      
      await Enrollment.create({
        classroomId: classroomIdMap[enrollment.classroomId],
        studentId: studentIdMap[enrollment.studentId],
        enrolledAt: enrollment.enrolledAt || new Date()
      });
      enrollmentCount++;
    }
    console.log(`✅ Migrated ${enrollmentCount} enrollments`);
    
    // 5. Migrate Assignments
    console.log('\n📋 Migrating Assignments...');
    const assignments = oldDb.findMany('assignments');
    for (const assignment of assignments) {
      // Skip if classroom or teacher ID is missing or invalid
      if (!classroomIdMap[assignment.classroomId] || !teacherIdMap[assignment.teacherId]) {
        console.log(`  ⚠️  Skipping ${assignment.title} - No valid classroom/teacher ID`);
        continue;
      }
      
      const newAssignment = await Assignment.create({
        title: assignment.title,
        description: assignment.description,
        dueDate: assignment.dueDate,
        maxMarks: assignment.maxMarks,
        classroomId: classroomIdMap[assignment.classroomId],
        teacherId: teacherIdMap[assignment.teacherId],
        hasRubric: assignment.hasRubric || false
      });
      assignmentIdMap[assignment.id] = newAssignment._id;
      console.log(`  ✓ ${assignment.title}`);
    }
    console.log(`✅ Migrated ${Object.keys(assignmentIdMap).length} assignments`);
    
    // 6. Migrate Rubrics
    console.log('\n📊 Migrating Rubrics...');
    const rubrics = oldDb.findMany('rubrics');
    let rubricCount = 0;
    for (const rubric of rubrics) {
      // Skip if assignment or teacher ID is missing or invalid
      if (!assignmentIdMap[rubric.assignmentId] || !teacherIdMap[rubric.teacherId]) {
        continue;
      }
      
      await Rubric.create({
        assignmentId: assignmentIdMap[rubric.assignmentId],
        teacherId: teacherIdMap[rubric.teacherId],
        criteria: rubric.criteria,
        metadata: rubric.metadata || {}
      });
      rubricCount++;
      console.log(`  ✓ Rubric for assignment ID ${rubric.assignmentId}`);
    }
    console.log(`✅ Migrated ${rubricCount} rubrics`);
    
    // 7. Migrate Submissions
    console.log('\n📤 Migrating Submissions...');
    const submissions = oldDb.findMany('submissions');
    let submissionCount = 0;
    for (const submission of submissions) {
      // Skip if assignment, student, or classroom ID is missing or invalid
      if (!assignmentIdMap[submission.assignmentId] || 
          !studentIdMap[submission.studentId] || 
          !classroomIdMap[submission.classroomId]) {
        continue;
      }
      
      await Submission.create({
        assignmentId: assignmentIdMap[submission.assignmentId],
        studentId: studentIdMap[submission.studentId],
        classroomId: classroomIdMap[submission.classroomId],
        code: submission.code,
        submittedAt: submission.submittedAt,
        grade: submission.grade,
        feedback: submission.feedback,
        gradedAt: submission.gradedAt,
        gradedBy: submission.gradedBy,
        gradingResults: submission.gradingResults
      });
      submissionCount++;
    }
    console.log(`✅ Migrated ${submissionCount} submissions`);
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`  Students: ${students.length}`);
    console.log(`  Teachers: ${teachers.length}`);
    console.log(`  Classrooms: ${Object.keys(classroomIdMap).length}`);
    console.log(`  Enrollments: ${enrollmentCount}`);
    console.log(`  Assignments: ${Object.keys(assignmentIdMap).length}`);
    console.log(`  Rubrics: ${rubricCount}`);
    console.log(`  Submissions: ${submissionCount}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

migrateData();
