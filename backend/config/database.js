// Database abstraction layer - works with both JSON and MongoDB
const mongoose = require('mongoose');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Classroom = require('../models/Classroom');
const Enrollment = require('../models/Enrollment');
const Assignment = require('../models/Assignment');
const Rubric = require('../models/Rubric');
const Submission = require('../models/Submission');

const useMongoose = process.env.DB_TYPE === 'mongodb';
const jsonDb = require('./db'); // Fallback to JSON

// Model mapping
const models = {
  students: Student,
  teachers: Teacher,
  classrooms: Classroom,
  enrollments: Enrollment,
  assignments: Assignment,
  rubrics: Rubric,
  submissions: Submission
};

// Helper to convert ID to ObjectId if needed
const toObjectId = (id) => {
  if (!id) return id;
  if (mongoose.Types.ObjectId.isValid(id)) {
    return new mongoose.Types.ObjectId(id);
  }
  return id;
};

// Find one document
const findOne = async (collection, query) => {
  if (!useMongoose) {
    return jsonDb.findOne(collection, query);
  }
  
  const Model = models[collection];
  if (!Model) throw new Error(`Unknown collection: ${collection}`);
  
  // Convert id to _id for MongoDB and convert all IDs to ObjectIds
  const mongoQuery = { ...query };
  if (mongoQuery.id) {
    mongoQuery._id = toObjectId(mongoQuery.id);
    delete mongoQuery.id;
  }
  
  // Convert common ID fields to ObjectIds
  if (mongoQuery.studentId) mongoQuery.studentId = toObjectId(mongoQuery.studentId);
  if (mongoQuery.teacherId) mongoQuery.teacherId = toObjectId(mongoQuery.teacherId);
  if (mongoQuery.classroomId) mongoQuery.classroomId = toObjectId(mongoQuery.classroomId);
  if (mongoQuery.assignmentId) mongoQuery.assignmentId = toObjectId(mongoQuery.assignmentId);
  
  const doc = await Model.findOne(mongoQuery);
  if (!doc) return null;
  const obj = doc.toObject();
  // Add 'id' for compatibility with JSON-based API
  if (obj._id) obj.id = obj._id.toString();
  // Convert ObjectId fields to strings for compatibility
  if (obj.studentId && obj.studentId._id) obj.studentId = obj.studentId.toString();
  if (obj.teacherId && obj.teacherId._id) obj.teacherId = obj.teacherId.toString();
  if (obj.classroomId && obj.classroomId._id) obj.classroomId = obj.classroomId.toString();
  if (obj.assignmentId && obj.assignmentId._id) obj.assignmentId = obj.assignmentId.toString();
  return obj;
};

// Find many documents
const findMany = async (collection, query = {}) => {
  if (!useMongoose) {
    return jsonDb.findMany(collection, query);
  }
  
  const Model = models[collection];
  if (!Model) throw new Error(`Unknown collection: ${collection}`);
  
  // Convert id to _id for MongoDB and convert all IDs to ObjectIds
  const mongoQuery = { ...query };
  if (mongoQuery.id) {
    mongoQuery._id = toObjectId(mongoQuery.id);
    delete mongoQuery.id;
  }
  
  // Convert common ID fields to ObjectIds
  if (mongoQuery.studentId) mongoQuery.studentId = toObjectId(mongoQuery.studentId);
  if (mongoQuery.teacherId) mongoQuery.teacherId = toObjectId(mongoQuery.teacherId);
  if (mongoQuery.classroomId) mongoQuery.classroomId = toObjectId(mongoQuery.classroomId);
  if (mongoQuery.assignmentId) mongoQuery.assignmentId = toObjectId(mongoQuery.assignmentId);
  
  const docs = await Model.find(mongoQuery);
  return docs.map(doc => {
    const obj = doc.toObject();
    if (obj._id) obj.id = obj._id.toString();
    // Convert ObjectId fields to strings for compatibility
    if (obj.studentId && typeof obj.studentId === 'object') obj.studentId = obj.studentId.toString();
    if (obj.teacherId && typeof obj.teacherId === 'object') obj.teacherId = obj.teacherId.toString();
    if (obj.classroomId && typeof obj.classroomId === 'object') obj.classroomId = obj.classroomId.toString();
    if (obj.assignmentId && typeof obj.assignmentId === 'object') obj.assignmentId = obj.assignmentId.toString();
    return obj;
  });
};

// Insert one document
const insertOne = async (collection, document) => {
  if (!useMongoose) {
    return jsonDb.insertOne(collection, document);
  }
  
  const Model = models[collection];
  if (!Model) throw new Error(`Unknown collection: ${collection}`);
  
  // Convert ID fields to ObjectIds before insertion
  const mongoDoc = { ...document };
  if (mongoDoc.studentId) mongoDoc.studentId = toObjectId(mongoDoc.studentId);
  if (mongoDoc.teacherId) mongoDoc.teacherId = toObjectId(mongoDoc.teacherId);
  if (mongoDoc.classroomId) mongoDoc.classroomId = toObjectId(mongoDoc.classroomId);
  if (mongoDoc.assignmentId) mongoDoc.assignmentId = toObjectId(mongoDoc.assignmentId);
  
  const doc = await Model.create(mongoDoc);
  const obj = doc.toObject();
  obj.id = obj._id.toString(); // Add id for compatibility
  // Convert ObjectId fields to strings for compatibility
  if (obj.studentId) obj.studentId = obj.studentId.toString();
  if (obj.teacherId) obj.teacherId = obj.teacherId.toString();
  if (obj.classroomId) obj.classroomId = obj.classroomId.toString();
  if (obj.assignmentId) obj.assignmentId = obj.assignmentId.toString();
  return obj;
};

// Update one document
const updateOne = async (collection, query, update) => {
  if (!useMongoose) {
    return jsonDb.updateOne(collection, query, update);
  }
  
  const Model = models[collection];
  if (!Model) throw new Error(`Unknown collection: ${collection}`);
  
  // Convert id to _id for MongoDB and convert all IDs to ObjectIds
  const mongoQuery = { ...query };
  if (mongoQuery.id) {
    mongoQuery._id = toObjectId(mongoQuery.id);
    delete mongoQuery.id;
  }
  
  // Convert common ID fields to ObjectIds in query
  if (mongoQuery.studentId) mongoQuery.studentId = toObjectId(mongoQuery.studentId);
  if (mongoQuery.teacherId) mongoQuery.teacherId = toObjectId(mongoQuery.teacherId);
  if (mongoQuery.classroomId) mongoQuery.classroomId = toObjectId(mongoQuery.classroomId);
  if (mongoQuery.assignmentId) mongoQuery.assignmentId = toObjectId(mongoQuery.assignmentId);
  
  // Convert ID fields in update as well
  const mongoUpdate = { ...update };
  if (mongoUpdate.studentId) mongoUpdate.studentId = toObjectId(mongoUpdate.studentId);
  if (mongoUpdate.teacherId) mongoUpdate.teacherId = toObjectId(mongoUpdate.teacherId);
  if (mongoUpdate.classroomId) mongoUpdate.classroomId = toObjectId(mongoUpdate.classroomId);
  if (mongoUpdate.assignmentId) mongoUpdate.assignmentId = toObjectId(mongoUpdate.assignmentId);
  
  const doc = await Model.findOneAndUpdate(
    mongoQuery,
    { $set: mongoUpdate },
    { new: true }
  );
  if (!doc) return null;
  const obj = doc.toObject();
  if (obj._id) obj.id = obj._id.toString();
  // Convert ObjectId fields to strings for compatibility
  if (obj.studentId && typeof obj.studentId === 'object') obj.studentId = obj.studentId.toString();
  if (obj.teacherId && typeof obj.teacherId === 'object') obj.teacherId = obj.teacherId.toString();
  if (obj.classroomId && typeof obj.classroomId === 'object') obj.classroomId = obj.classroomId.toString();
  if (obj.assignmentId && typeof obj.assignmentId === 'object') obj.assignmentId = obj.assignmentId.toString();
  return obj;
};

// Delete one document
const deleteOne = async (collection, query) => {
  if (!useMongoose) {
    return jsonDb.deleteOne(collection, query);
  }
  
  const Model = models[collection];
  if (!Model) throw new Error(`Unknown collection: ${collection}`);
  
  // Convert id to _id for MongoDB and convert all IDs to ObjectIds
  const mongoQuery = { ...query };
  if (mongoQuery.id) {
    mongoQuery._id = toObjectId(mongoQuery.id);
    delete mongoQuery.id;
  }
  
  // Convert common ID fields to ObjectIds
  if (mongoQuery.studentId) mongoQuery.studentId = toObjectId(mongoQuery.studentId);
  if (mongoQuery.teacherId) mongoQuery.teacherId = toObjectId(mongoQuery.teacherId);
  if (mongoQuery.classroomId) mongoQuery.classroomId = toObjectId(mongoQuery.classroomId);
  if (mongoQuery.assignmentId) mongoQuery.assignmentId = toObjectId(mongoQuery.assignmentId);
  
  const result = await Model.deleteOne(mongoQuery);
  return result.deletedCount > 0;
};

module.exports = {
  findOne,
  findMany,
  insertOne,
  updateOne,
  deleteOne
};
