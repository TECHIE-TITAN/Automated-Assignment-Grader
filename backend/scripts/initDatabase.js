const bcrypt = require('bcryptjs');
const db = require('../config/db');

// Populate students (350 students: 115 CSE, 100 ECE, 135 DD)
const populateStudents = async () => {
  console.log('Creating 350 students...');
  const hashedPassword = await bcrypt.hash('student123', 10);
  const branches = [
    { name: 'CSE', count: 115 },
    { name: 'ECE', count: 100 },
    { name: 'DD', count: 135 }
  ];

  const students = [];
  let studentNumber = 1;

  for (const branch of branches) {
    for (let i = 1; i <= branch.count; i++) {
      const rollNumber = `${branch.name}${String(i).padStart(3, '0')}`;
      const student = {
        id: studentNumber,
        rollNumber: rollNumber,
        name: `Student ${studentNumber}`,
        email: `${rollNumber.toLowerCase()}@university.edu`,
        password: hashedPassword,
        branch: branch.name
      };
      students.push(student);
      studentNumber++;
    }
  }

  db.writeData('students', students);
  console.log('✓ 350 students created (115 CSE, 100 ECE, 135 DD)');
};

// Create default teacher account
const createDefaultTeacher = async () => {
  console.log('Creating default teacher account...');
  const hashedPassword = await bcrypt.hash('teacher123', 10);
  
  const teachers = [
    {
      id: 1,
      name: 'Prof. Smith',
      email: 'teacher@university.edu',
      password: hashedPassword
    }
  ];

  db.writeData('teachers', teachers);
  console.log('✓ Default teacher account created');
};

// Initialize database
const initDatabase = async () => {
  try {
    console.log('\n📦 Initializing JSON database...\n');
    await populateStudents();
    await createDefaultTeacher();
    
    console.log('\n✅ Database initialization completed successfully!\n');
    console.log('📝 Default Credentials:');
    console.log('   Teacher: teacher@university.edu / teacher123');
    console.log('   Student: cse001@university.edu / student123\n');
    
    console.log('📊 Database Summary:');
    console.log(`   Students: ${db.count('students')}`);
    console.log(`   Teachers: ${db.count('teachers')}`);
    console.log(`   CSE Students: ${db.findMany('students', { branch: 'CSE' }).length}`);
    console.log(`   ECE Students: ${db.findMany('students', { branch: 'ECE' }).length}`);
    console.log(`   DD Students: ${db.findMany('students', { branch: 'DD' }).length}\n`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  }
};

initDatabase();
