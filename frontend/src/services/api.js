import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if it exists
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth API calls
export const authAPI = {
  studentLogin: (email, password) => 
    api.post('/auth/student/login', { email, password }),
  
  teacherLogin: (email, password) => 
    api.post('/auth/teacher/login', { email, password }),
  
  teacherRegister: (name, email, password) => 
    api.post('/auth/teacher/register', { name, email, password }),
  
  getProfile: () => 
    api.get('/auth/profile'),
};

// Classroom API calls
export const classroomAPI = {
  // Teacher endpoints
  createClassroom: (name, description) =>
    api.post('/classrooms', { name, description }),
  
  getTeacherClassrooms: () =>
    api.get('/classrooms/teacher'),
  
  addStudentsToClassroom: (classroomId, studentIds) =>
    api.post(`/classrooms/${classroomId}/students`, { studentIds }),
  
  removeStudentFromClassroom: (classroomId, studentId) =>
    api.delete(`/classrooms/${classroomId}/students/${studentId}`),
  
  getAllStudents: (params) =>
    api.get('/classrooms/students', { params }),
  
  // Student endpoints
  getStudentClassrooms: () =>
    api.get('/classrooms/student'),
  
  // Shared endpoints
  getClassroomDetails: (classroomId) =>
    api.get(`/classrooms/${classroomId}`),
};

// Assignment API
export const assignmentAPI = {
  // Teacher endpoints
  createAssignment: (classroomId, title, description, dueDate, maxMarks) =>
    api.post('/assignments', { classroomId, title, description, dueDate, maxMarks }),
  
  getAssignmentSubmissions: (assignmentId) =>
    api.get(`/assignments/${assignmentId}/submissions`),
  
  deleteAssignment: (assignmentId) =>
    api.delete(`/assignments/${assignmentId}`),
  
  // Student endpoints
  submitAssignment: (assignmentId, code) =>
    api.post(`/assignments/${assignmentId}/submit`, { code }),
  
  // Shared endpoints
  getClassroomAssignments: (classroomId) =>
    api.get(`/assignments/classroom/${classroomId}`),
  
  getAssignmentDetails: (assignmentId) =>
    api.get(`/assignments/${assignmentId}`),
  
  // Grading endpoints
  autoGradeSubmission: (submissionId) =>
    api.post(`/assignments/submissions/${submissionId}/autograde`),
  
  manualGradeSubmission: (submissionId, grade, feedback) =>
    api.post(`/assignments/submissions/${submissionId}/grade`, { grade, feedback }),
};

// Rubric API
export const rubricAPI = {
  uploadRubric: (assignmentId, rubricData) =>
    api.post(`/rubrics/${assignmentId}`, rubricData),
  
  getRubric: (assignmentId) =>
    api.get(`/rubrics/${assignmentId}`),
  
  deleteRubric: (assignmentId) =>
    api.delete(`/rubrics/${assignmentId}`),
};

export default api;
