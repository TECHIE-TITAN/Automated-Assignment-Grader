import React, { useState, useEffect } from 'react';
import { classroomAPI } from '../services/api';

const TeacherClassrooms = ({ user }) => {
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedClassroom, setSelectedClassroom] = useState(null);
  const [newClassroom, setNewClassroom] = useState({ name: '', description: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const fetchClassrooms = async () => {
    try {
      const response = await classroomAPI.getTeacherClassrooms();
      setClassrooms(response.data.classrooms);
    } catch (err) {
      setError('Failed to load classrooms');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClassroom = async (e) => {
    e.preventDefault();
    setError('');

    try {
      console.log('Creating classroom:', newClassroom);
      const response = await classroomAPI.createClassroom(newClassroom.name, newClassroom.description);
      console.log('Classroom created:', response.data);
      setShowCreateModal(false);
      setNewClassroom({ name: '', description: '' });
      fetchClassrooms();
    } catch (err) {
      console.error('Create classroom error:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to create classroom';
      setError(errorMsg);
    }
  };

  const viewClassroom = (classroom) => {
    setSelectedClassroom(classroom);
  };

  if (selectedClassroom) {
    return (
      <ClassroomDetails 
        classroom={selectedClassroom} 
        onBack={() => setSelectedClassroom(null)}
        onUpdate={fetchClassrooms}
      />
    );
  }

  return (
    <div className="classrooms-container">
      <div className="classrooms-header">
        <h2>My Classrooms</h2>
        <button className="create-btn" onClick={() => setShowCreateModal(true)}>
          Create Classroom
        </button>
      </div>

      {loading ? (
        <div className="loading-message">Loading classrooms...</div>
      ) : classrooms.length === 0 ? (
        <div className="empty-state">
          <p>No classrooms yet</p>
          <p>Create your first classroom to get started!</p>
        </div>
      ) : (
        <div className="classrooms-grid">
          {classrooms.map(classroom => (
            <div key={classroom.id} className="classroom-card">
              <div className="classroom-card-header">
                <h3>{classroom.name}</h3>
                <span className="student-count">{classroom.studentCount} students</span>
              </div>
              <p className="classroom-description">
                {classroom.description || 'No description'}
              </p>
              <div className="classroom-card-footer">
                <small>Created: {new Date(classroom.createdAt).toLocaleDateString()}</small>
                <button className="view-btn" onClick={() => viewClassroom(classroom)}>
                  View Details →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Create New Classroom</h2>
            <form onSubmit={handleCreateClassroom}>
              <div className="form-group">
                <label>Classroom Name *</label>
                <input
                  type="text"
                  value={newClassroom.name}
                  onChange={(e) => setNewClassroom({...newClassroom, name: e.target.value})}
                  placeholder="e.g., Data Structures - Fall 2025"
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={newClassroom.description}
                  onChange={(e) => setNewClassroom({...newClassroom, description: e.target.value})}
                  placeholder="Course description, schedule, etc."
                  rows="3"
                />
              </div>
              {error && <div className="error-message">{error}</div>}
              <div className="modal-buttons">
                <button type="button" onClick={() => setShowCreateModal(false)} className="cancel-btn">
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  Create Classroom
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const ClassroomDetails = ({ classroom, onBack, onUpdate }) => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddStudents, setShowAddStudents] = useState(false);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState('');

  useEffect(() => {
    fetchClassroomDetails();
  }, [classroom.id]);

  const fetchClassroomDetails = async () => {
    try {
      const response = await classroomAPI.getClassroomDetails(classroom.id);
      setStudents(response.data.classroom.students);
    } catch (err) {
      console.error('Failed to load classroom details', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableStudents = async () => {
    try {
      const response = await classroomAPI.getAllStudents({ search: searchTerm, branch: branchFilter });
      // Filter out already enrolled students
      const enrolledIds = students.map(s => s.id);
      const available = response.data.students.filter(s => !enrolledIds.includes(s.id));
      setAvailableStudents(available);
    } catch (err) {
      console.error('Failed to load students', err);
    }
  };

  useEffect(() => {
    if (showAddStudents) {
      fetchAvailableStudents();
    }
  }, [showAddStudents, searchTerm, branchFilter, students]);

  const handleAddStudents = async () => {
    if (selectedStudents.length === 0) return;

    try {
      await classroomAPI.addStudentsToClassroom(classroom.id, selectedStudents);
      setShowAddStudents(false);
      setSelectedStudents([]);
      fetchClassroomDetails();
      onUpdate();
    } catch (err) {
      console.error('Failed to add students', err);
    }
  };

  const handleRemoveStudent = async (studentId) => {
    if (!window.confirm('Remove this student from the classroom?')) return;

    try {
      await classroomAPI.removeStudentFromClassroom(classroom.id, studentId);
      fetchClassroomDetails();
      onUpdate();
    } catch (err) {
      console.error('Failed to remove student', err);
    }
  };

  const toggleStudentSelection = (studentId) => {
    setSelectedStudents(prevSelected => {
      if (prevSelected.includes(studentId)) {
        return prevSelected.filter(id => id !== studentId);
      } else {
        return [...prevSelected, studentId];
      }
    });
  };

  return (
    <div className="classroom-details">
      <div className="details-header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <div>
          <h2>{classroom.name}</h2>
          <p>{classroom.description}</p>
        </div>
        <button className="add-students-btn" onClick={() => setShowAddStudents(true)}>
          ➕ Add Students
        </button>
      </div>

      <div className="students-section">
        <h3>Enrolled Students ({students.length})</h3>
        {loading ? (
          <div>Loading...</div>
        ) : students.length === 0 ? (
          <div className="empty-state">
            <p>No students enrolled yet</p>
          </div>
        ) : (
          <div className="students-table-container">
            <table className="students-table">
              <thead>
                <tr>
                  <th>Roll Number</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Branch</th>
                  <th>Enrolled On</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map(student => (
                  <tr key={student.id}>
                    <td><strong>{student.rollNumber}</strong></td>
                    <td>{student.name}</td>
                    <td>{student.email}</td>
                    <td><span className={`branch-badge ${student.branch?.toLowerCase() || 'unknown'}`}>{student.branch || 'N/A'}</span></td>
                    <td>{new Date(student.enrolledAt).toLocaleDateString()}</td>
                    <td>
                      <button className="remove-btn-small" onClick={() => handleRemoveStudent(student.id)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddStudents && (
        <div className="modal-overlay" onClick={() => setShowAddStudents(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <h2>Add Students to {classroom.name}</h2>
            
            <div className="filters">
              <input
                type="text"
                placeholder="Search by name, email, or roll number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className="branch-select">
                <option value="">All Branches</option>
                <option value="CSE">CSE</option>
                <option value="ECE">ECE</option>
                <option value="DD">DD</option>
              </select>
            </div>

            <div className="student-selection-list">
              {availableStudents.length === 0 ? (
                <p>No students available</p>
              ) : (
                availableStudents.map(student => (
                  <div key={student.id} className="student-selection-item">
                    <input
                      type="checkbox"
                      id={`student-${student.id}`}
                      checked={selectedStudents.includes(student.id)}
                      onChange={() => toggleStudentSelection(student.id)}
                    />
                    <label htmlFor={`student-${student.id}`} className="student-info">
                      <strong>{student.rollNumber}</strong> - {student.name} ({student.branch})
                    </label>
                  </div>
                ))
              )}
            </div>

            <div className="modal-buttons">
              <button 
                onClick={() => {
                  console.log('=== DEBUG INFO ===');
                  console.log('availableStudents:', availableStudents);
                  console.log('selectedStudents:', selectedStudents);
                  console.log('First student ID:', availableStudents[0]?.id, 'type:', typeof availableStudents[0]?.id);
                  console.log('Are all IDs unique?', new Set(availableStudents.map(s => s.id)).size === availableStudents.length);
                }}
                className="cancel-btn"
                type="button"
              >
                Debug
              </button>
              <button onClick={() => setShowAddStudents(false)} className="cancel-btn">
                Cancel
              </button>
              <button 
                onClick={handleAddStudents} 
                className="submit-btn"
                disabled={selectedStudents.length === 0}
              >
                Add {selectedStudents.length} Student{selectedStudents.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherClassrooms;
