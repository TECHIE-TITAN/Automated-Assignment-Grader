import React, { useState, useEffect } from 'react';
import { classroomAPI, assignmentAPI } from '../services/api';
import CodeViewer from './CodeViewer';

const StudentClassrooms = ({ user }) => {
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedClassroom, setSelectedClassroom] = useState(null);

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const fetchClassrooms = async () => {
    try {
      const response = await classroomAPI.getStudentClassrooms();
      setClassrooms(response.data.classrooms);
      setError('');
    } catch (err) {
      setError('Failed to load classrooms');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const viewClassroom = (classroom) => {
    setSelectedClassroom(classroom);
  };

  if (selectedClassroom) {
    return (
      <StudentClassroomDetails 
        classroom={selectedClassroom} 
        onBack={() => setSelectedClassroom(null)}
        studentId={user.id}
      />
    );
  }

  return (
    <div className="classrooms-container">
      <div className="classrooms-header">
        <h2>My Classrooms</h2>
      </div>

      {loading ? (
        <div className="loading-message">Loading classrooms...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : classrooms.length === 0 ? (
        <div className="empty-state">
          <p>Not enrolled in any classrooms yet</p>
          <p>Wait for your teacher to add you to a classroom!</p>
        </div>
      ) : (
        <div className="classrooms-grid">
          {classrooms.map(classroom => (
            <div key={classroom.id} className="classroom-card">
              <div className="classroom-card-header">
                <h3>{classroom.name}</h3>
              </div>
              <p className="classroom-description">
                {classroom.description || 'No description'}
              </p>
              <div className="classroom-info">
                <div className="info-item">
                  <span className="info-label">Teacher:</span>
                  <span className="info-value">{classroom.teacherName}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Enrolled:</span>
                  <span className="info-value">{new Date(classroom.enrolledAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="classroom-card-footer">
                <button className="view-btn" onClick={() => viewClassroom(classroom)}>
                  View Details →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const StudentClassroomDetails = ({ classroom, onBack, studentId }) => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submissionCode, setSubmissionCode] = useState('');
  const [submissionFile, setSubmissionFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showCodeViewer, setShowCodeViewer] = useState(false);

  useEffect(() => {
    fetchClassroomDetails();
  }, [classroom.id]);

  const fetchClassroomDetails = async () => {
    try {
      const response = await classroomAPI.getClassroomDetails(classroom.id);
      setDetails(response.data.classroom);
    } catch (err) {
      console.error('Failed to load classroom details', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // fetch assignments for this classroom (student view)
    const fetchAssignments = async () => {
      try {
        const res = await assignmentAPI.getClassroomAssignments(classroom.id);
        setAssignments(res.data.assignments || []);
      } catch (err) {
        console.error('Failed to load classroom assignments', err);
      }
    };

    fetchAssignments();
  }, [classroom.id]);

  const openAssignmentDetails = async (assignmentId) => {
    try {
      const res = await assignmentAPI.getAssignmentDetails(assignmentId);
      setSelectedAssignment(res.data.assignment);
    } catch (err) {
      console.error('Failed to load assignment details', err);
      alert('Failed to load assignment details');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate Python file
    if (!file.name.endsWith('.py')) {
      alert('Please upload a Python (.py) file');
      e.target.value = '';
      return;
    }

    setSubmissionFile(file);

    // Read file content
    const reader = new FileReader();
    reader.onload = (event) => {
      setSubmissionCode(event.target.result);
    };
    reader.readAsText(file);
  };

  const handleSubmitAssignment = async () => {
    if (!submissionCode.trim()) {
      alert('Please upload a Python file or paste your code');
      return;
    }

    if (selectedAssignment?.isClosed || new Date(selectedAssignment?.dueDate) <= new Date()) {
      alert('This assignment is closed and can no longer accept submissions');
      return;
    }

    setSubmitting(true);
    try {
      const isResubmission = selectedAssignment.submission !== null;
      await assignmentAPI.submitAssignment(selectedAssignment.id, submissionCode);
      alert(isResubmission ? 'Assignment resubmitted and auto-graded successfully!' : 'Assignment submitted and auto-graded successfully!');
      setShowSubmitModal(false);
      setSubmissionCode('');
      setSubmissionFile(null);
      
      // Refresh assignment details to show submission
      const res = await assignmentAPI.getAssignmentDetails(selectedAssignment.id);
      setSelectedAssignment(res.data.assignment);
      
      // Refresh assignments list
      const assignmentsRes = await assignmentAPI.getClassroomAssignments(classroom.id);
      setAssignments(assignmentsRes.data.assignments || []);
    } catch (err) {
      console.error('Submit error:', err);
      alert(err.response?.data?.error || 'Failed to submit assignment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="loading-message">Loading...</div>;
  }

  if (!details) {
    return <div className="error-message">Failed to load classroom details</div>;
  }

  return (
    <div className="classroom-details">
      <div className="details-header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <div>
          <h2>{details.name}</h2>
          <p>{details.description}</p>
            <p style={{ marginTop: '10px', color: '#666', fontSize: '14px' }}>
            Teacher: <strong>{details.teacherName}</strong>
          </p>
        </div>
      </div>

      <div className="students-section">
        <h3>Classmates ({details.students.length})</h3>
        {details.students.length === 0 ? (
          <div className="empty-state">
            <p>No other students enrolled yet</p>
          </div>
        ) : (
          <div className="students-table-container">
            <table className="students-table">
              <thead>
                <tr>
                  <th>Roll Number</th>
                  <th>Name</th>
                  <th>Branch</th>
                  <th>Enrolled On</th>
                </tr>
              </thead>
              <tbody>
                {details.students.map(student => (
                  <tr key={student.id} className={student.id === studentId ? 'highlight-row' : ''}>
                    <td>
                      <strong>{student.rollNumber}</strong>
                      {student.id === studentId && <span className="you-badge">You</span>}
                    </td>
                    <td>{student.name}</td>
                    <td><span className={`branch-badge ${student.branch.toLowerCase()}`}>{student.branch}</span></td>
                    <td>{new Date(student.enrolledAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="welcome-card" style={{ marginTop: '30px' }}>
        <h3>Assignments</h3>
        {assignments.length === 0 ? (
          <p>No assignments yet for this classroom</p>
        ) : (
          <div className="assignments-grid small">
            {assignments.map(a => (
              <div key={a.id} className="assignment-card small" onClick={() => openAssignmentDetails(a.id)}>
                <h4>{a.title}</h4>
                <p className="assignment-description">{a.description}</p>
                <div className="assignment-meta">
                  <div className="meta-item"><span className="meta-label">Due:</span> <span className="meta-value">{new Date(a.dueDate).toLocaleDateString()}</span></div>
                  <div className="meta-item"><span className="meta-label">Max:</span> <span className="meta-value">{a.maxMarks}</span></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assignment Details Modal (Student view) */}
      {selectedAssignment && !showSubmitModal && !showCodeViewer && (
        <div className="modal-overlay" onClick={() => setSelectedAssignment(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{selectedAssignment.title}</h2>
            <p>{selectedAssignment.description}</p>
            <div className="assignment-meta">
              <div className="meta-item"><span className="meta-label">Due:</span> <span className="meta-value">{new Date(selectedAssignment.dueDate).toLocaleString()}</span></div>
              <div className="meta-item"><span className="meta-label">Max Marks:</span> <span className="meta-value">{selectedAssignment.maxMarks}</span></div>
              <div className="meta-item"><span className="meta-label">Has Rubric:</span> <span className="meta-value">{selectedAssignment.rubric ? 'Yes' : 'No'}</span></div>
              <div className="meta-item"><span className="meta-label">Status:</span> <span className="meta-value">{selectedAssignment.isClosed ? 'Closed' : 'Open'}</span></div>
              {selectedAssignment.submission && (
                <>
                  <div className="meta-item"><span className="meta-label">Status:</span> <span className="meta-value status-submitted">Submitted</span></div>
                  <div className="meta-item"><span className="meta-label">Submitted At:</span> <span className="meta-value">{new Date(selectedAssignment.submission.submittedAt).toLocaleString()}</span></div>
                  {selectedAssignment.submission.grade !== null && selectedAssignment.submission.grade !== undefined && (
                    <div className="meta-item"><span className="meta-label">Grade:</span> <span className="meta-value">{selectedAssignment.submission.grade}/{selectedAssignment.maxMarks}</span></div>
                  )}
                  {!selectedAssignment.isClosed && new Date(selectedAssignment.dueDate) > new Date() && (
                    <div className="meta-item" style={{ gridColumn: '1 / -1' }}>
                      <span style={{ color: '#28a745', fontSize: '14px' }}>
                        You can resubmit until: {new Date(selectedAssignment.dueDate).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {selectedAssignment.isClosed && (
                    <div className="meta-item" style={{ gridColumn: '1 / -1' }}>
                      <span style={{ color: '#dc3545', fontSize: '14px' }}>
                        Deadline passed - No more resubmissions allowed
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            <div style={{ marginTop: 12 }}>
              <button className="cancel-btn" onClick={() => setSelectedAssignment(null)}>Close</button>
              {selectedAssignment.submission ? (
                <>
                  <button className="create-btn" style={{ marginLeft: 8 }} onClick={() => setShowCodeViewer(true)}>View Code</button>
                  {!selectedAssignment.isClosed && new Date(selectedAssignment.dueDate) > new Date() && (
                    <button 
                      className="submit-btn" 
                      style={{ marginLeft: 8, backgroundColor: '#ff9800' }} 
                      onClick={() => {
                        setSubmissionCode(selectedAssignment.submission.code);
                        setShowSubmitModal(true);
                      }}
                    >
                      Resubmit
                    </button>
                  )}
                </>
              ) : (
                !selectedAssignment.isClosed && new Date(selectedAssignment.dueDate) > new Date() ? (
                  <button className="create-btn" style={{ marginLeft: 8 }} onClick={() => setShowSubmitModal(true)}>Submit Assignment</button>
                ) : null
              )}
            </div>
          </div>
        </div>
      )}

      {/* Submit Assignment Modal */}
      {showSubmitModal && selectedAssignment && (
        <div className="modal-overlay" onClick={() => { setShowSubmitModal(false); setSubmissionCode(''); setSubmissionFile(null); }}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <h2>{selectedAssignment.submission ? 'Resubmit' : 'Submit'} Assignment: {selectedAssignment.title}</h2>
            {selectedAssignment.submission && (
              <p style={{ color: '#ff9800', marginBottom: '16px', fontSize: '14px' }}>
                You are resubmitting. Your previous submission will be replaced and regraded.
              </p>
            )}
            
            <div className="form-group">
              <label>Upload Python File (.py) *</label>
              <input
                type="file"
                accept=".py"
                onChange={handleFileChange}
                className="file-input"
              />
              {submissionFile && (
                  <div className="file-info">
                  File loaded: <strong>{submissionFile.name}</strong>
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Or Paste Your Code *</label>
              <textarea
                value={submissionCode}
                onChange={(e) => setSubmissionCode(e.target.value)}
                placeholder="# Paste your Python code here..."
                rows="15"
                className="code-textarea"
                style={{ fontFamily: 'monospace', fontSize: '14px' }}
              />
            </div>

            <div className="modal-buttons">
              <button 
                onClick={() => { setShowSubmitModal(false); setSubmissionCode(''); setSubmissionFile(null); }} 
                className="cancel-btn"
                disabled={submitting}
              >
                Cancel
              </button>
              <button 
                onClick={handleSubmitAssignment} 
                className="submit-btn"
                disabled={submitting || !submissionCode.trim()}
              >
                {submitting ? 'Submitting...' : 'Submit Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Code Viewer Modal */}
      {showCodeViewer && selectedAssignment && selectedAssignment.submission && (
        <div className="modal-overlay" onClick={() => setShowCodeViewer(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <h2>Submission: {selectedAssignment.title}</h2>
            <p style={{ marginBottom: '16px', color: '#666' }}>
              Submitted on: {new Date(selectedAssignment.submission.submittedAt).toLocaleString()}
            </p>
            
            <CodeViewer code={selectedAssignment.submission.code} language="python" />

            {selectedAssignment.submission.feedback && (
              <div className="feedback-section" style={{ marginTop: '16px' }}>
                <h3>Feedback</h3>
                <p>{selectedAssignment.submission.feedback}</p>
              </div>
            )}

            <div style={{ marginTop: 16 }}>
              <button className="cancel-btn" onClick={() => setShowCodeViewer(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentClassrooms;
