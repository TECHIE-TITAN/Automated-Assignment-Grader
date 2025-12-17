const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Database file paths
const DB_FILES = {
  students: path.join(DATA_DIR, 'students.json'),
  teachers: path.join(DATA_DIR, 'teachers.json'),
  classrooms: path.join(DATA_DIR, 'classrooms.json'),
  enrollments: path.join(DATA_DIR, 'enrollments.json'),
  assignments: path.join(DATA_DIR, 'assignments.json'),
  rubrics: path.join(DATA_DIR, 'rubrics.json'),
  submissions: path.join(DATA_DIR, 'submissions.json'),
  grades: path.join(DATA_DIR, 'grades.json')
};

// Initialize empty JSON files if they don't exist
Object.values(DB_FILES).forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([], null, 2));
  }
});

// Read data from JSON file
const readData = (collection) => {
  try {
    const filePath = DB_FILES[collection];
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${collection}:`, error.message);
    return [];
  }
};

// Write data to JSON file
const writeData = (collection, data) => {
  try {
    const filePath = DB_FILES[collection];
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error writing ${collection}:`, error.message);
    return false;
  }
};

// Find one document
const findOne = (collection, query) => {
  const data = readData(collection);
  return data.find(item => {
    return Object.keys(query).every(key => item[key] === query[key]);
  });
};

// Find many documents
const findMany = (collection, query = {}) => {
  const data = readData(collection);
  if (Object.keys(query).length === 0) {
    return data;
  }
  return data.filter(item => {
    return Object.keys(query).every(key => item[key] === query[key]);
  });
};

// Insert one document
const insertOne = (collection, document) => {
  const data = readData(collection);
  const newDoc = {
    id: data.length > 0 ? Math.max(...data.map(d => d.id)) + 1 : 1,
    ...document,
    createdAt: new Date().toISOString()
  };
  data.push(newDoc);
  writeData(collection, data);
  return newDoc;
};

// Update one document
const updateOne = (collection, query, update) => {
  const data = readData(collection);
  const index = data.findIndex(item => {
    return Object.keys(query).every(key => item[key] === query[key]);
  });
  
  if (index !== -1) {
    data[index] = { ...data[index], ...update, updatedAt: new Date().toISOString() };
    writeData(collection, data);
    return data[index];
  }
  return null;
};

// Delete one document
const deleteOne = (collection, query) => {
  const data = readData(collection);
  const newData = data.filter(item => {
    return !Object.keys(query).every(key => item[key] === query[key]);
  });
  
  if (newData.length < data.length) {
    writeData(collection, newData);
    return true;
  }
  return false;
};

// Count documents
const count = (collection, query = {}) => {
  return findMany(collection, query).length;
};

module.exports = {
  readData,
  writeData,
  findOne,
  findMany,
  insertOne,
  updateOne,
  deleteOne,
  count
};
