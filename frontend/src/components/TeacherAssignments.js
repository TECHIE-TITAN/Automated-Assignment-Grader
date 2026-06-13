import React, { useState, useEffect } from 'react';
import { classroomAPI, assignmentAPI, rubricAPI } from '../services/api';
import CodeViewer from './CodeViewer';

const TeacherAssignments = ({ user }) => {
  const [classrooms, setClassrooms] = useState([]);
  const [selectedClassroom, setSelectedClassroom] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
  const [showRubricModal, setShowRubricModal] = useState(false);
  const [showCodeViewer, setShowCodeViewer] = useState(false);
  const [currentSubmission, setCurrentSubmission] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [rubricFile, setRubricFile] = useState(null);
  const [newAssignment, setNewAssignment] = useState({
    title: '',
    description: '',
    dueDate: '',
    maxMarks: 100
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const fetchClassrooms = async () => {
    try {
      const response = await classroomAPI.getTeacherClassrooms();
      setClassrooms(response.data.classrooms);
      if (response.data.classrooms.length > 0) {
        setSelectedClassroom(response.data.classrooms[0]);
      }
    } catch (err) {
      console.error('Failed to load classrooms', err);
      setError('Failed to load classrooms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedClassroom) {
      fetchAssignments();
    }
  }, [selectedClassroom]);

  const fetchAssignments = async () => {
    if (!selectedClassroom) return;
    try {
      const response = await assignmentAPI.getClassroomAssignments(selectedClassroom.id);
      setAssignments(response.data.assignments);
    } catch (err) {
      console.error('Failed to load assignments', err);
    }
  };

  const openAssignmentDetails = async (assignmentId) => {
    try {
      const res = await assignmentAPI.getAssignmentDetails(assignmentId);
      setSelectedAssignment(res.data.assignment);
    } catch (err) {
      console.error('Failed to load assignment details', err);
      alert('Failed to load assignment details');
    }
  };

  const openSubmissionsView = async (assignment) => {
    try {
      setSelectedAssignment(assignment);
      const res = await assignmentAPI.getAssignmentSubmissions(assignment.id);
      setSubmissions(res.data.submissions);
      setShowSubmissionsModal(true);
    } catch (err) {
      console.error('Failed to load submissions', err);
      alert('Failed to load submissions');
    }
  };

  const openRubricModal = async (assignment) => {
    setSelectedAssignment(assignment);
    setRubricFile(null);
    setShowRubricModal(true);
  };

  const handleRubricFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/json') {
      setRubricFile(file);
    } else {
      alert('Please upload a valid JSON file');
      e.target.value = '';
    }
  };

  const handleUploadRubric = async () => {
    if (!selectedAssignment || !rubricFile) {
      alert('Please select a rubric JSON file');
      return;
    }

    try {
      const fileContent = await rubricFile.text();
      const rubricData = JSON.parse(fileContent);
      
      // Validate rubric structure
      if (!rubricData.criteria || !Array.isArray(rubricData.criteria)) {
        alert('Invalid rubric format. Must have a "criteria" array.');
        return;
      }

      await rubricAPI.uploadRubric(selectedAssignment.id, rubricData);
      alert('Rubric uploaded successfully!');
      setShowRubricModal(false);
      setRubricFile(null);
      fetchAssignments(); // Refresh to show updated hasRubric status
    } catch (err) {
      console.error('Upload rubric error:', err);
      if (err.message.includes('JSON')) {
        alert('Invalid JSON file format');
      } else {
        alert(err.response?.data?.error || 'Failed to upload rubric');
      }
    }
  };

  const viewSubmissionCode = (submission) => {
    setCurrentSubmission(submission);
    setShowCodeViewer(true);
  };

  const handleAutoGrade = async () => {
    if (!currentSubmission) return;

    if (!window.confirm('Auto-grade this submission using the rubric?')) return;

    try {
      const res = await assignmentAPI.autoGradeSubmission(currentSubmission.id);
      alert(`Auto-grading complete! Score: ${res.data.gradingResults.totalPoints}/${res.data.gradingResults.maxPoints}`);
      
      // Refresh submissions
      const submissionsRes = await assignmentAPI.getAssignmentSubmissions(selectedAssignment.id);
      setSubmissions(submissionsRes.data.submissions);
      
      // Update current submission
      setCurrentSubmission(res.data.submission);
    } catch (err) {
      console.error('Auto-grade error:', err);
      alert(err.response?.data?.error || 'Failed to auto-grade submission');
    }
  };

  const handleManualGrade = async () => {
    if (!currentSubmission || !selectedAssignment) return;

    const gradeInput = prompt(`Enter grade (0-${selectedAssignment.maxMarks}):`);
    if (gradeInput === null) return;

    const grade = parseInt(gradeInput);
    if (isNaN(grade) || grade < 0 || grade > selectedAssignment.maxMarks) {
      alert(`Please enter a valid grade between 0 and ${selectedAssignment.maxMarks}`);
      return;
    }

    const feedback = prompt('Enter feedback (optional):') || '';

    try {
      await assignmentAPI.manualGradeSubmission(currentSubmission.id, grade, feedback);
      alert('Submission graded successfully!');
      
      // Refresh submissions
      const submissionsRes = await assignmentAPI.getAssignmentSubmissions(selectedAssignment.id);
      setSubmissions(submissionsRes.data.submissions);
      
      // Close code viewer
      setShowCodeViewer(false);
      setCurrentSubmission(null);
    } catch (err) {
      console.error('Manual grade error:', err);
      alert(err.response?.data?.error || 'Failed to grade submission');
    }
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    setError('');

    try {
      await assignmentAPI.createAssignment(
        selectedClassroom.id,
        newAssignment.title,
        newAssignment.description,
        newAssignment.dueDate,
        newAssignment.maxMarks
      );
      setShowCreateModal(false);
      setNewAssignment({ title: '', description: '', dueDate: '', maxMarks: 100 });
      fetchAssignments();
    } catch (err) {
      console.error('Create assignment error:', err);
      const errorMsg = err.response?.data?.error || 'Failed to create assignment';
      setError(errorMsg);
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    if (!window.confirm('Are you sure you want to delete this assignment?')) return;

    try {
      await assignmentAPI.deleteAssignment(assignmentId);
      fetchAssignments();
    } catch (err) {
      console.error('Delete assignment error:', err);
      alert('Failed to delete assignment');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <div className="loading-message">Loading...</div>;
  }

  if (classrooms.length === 0) {
    return (
      <div className="empty-state">
        <h3>No Classrooms Yet</h3>
        <p>Create a classroom first to add assignments</p>
      </div>
    );
  }

  return (
    <div className="assignments-container">
      <div className="assignments-header">
        <div className="header-left">
          <h2>Assignments</h2>
          <select 
            value={selectedClassroom?.id || ''} 
            onChange={(e) => {
              const classroom = classrooms.find(c => String(c.id) === e.target.value);
              setSelectedClassroom(classroom);
            }}
            className="classroom-select"
          >
            {classrooms.map(classroom => (
              <option key={classroom.id} value={classroom.id}>
                {classroom.name}
              </option>
            ))}
          </select>
        </div>
        <button className="create-btn" onClick={() => setShowCreateModal(true)}>
          Create Assignment
        </button>
      </div>

      {assignments.length === 0 ? (
        <div className="empty-state">
          <p>No assignments yet for this classroom</p>
          <button className="create-btn" onClick={() => setShowCreateModal(true)}>
            Create First Assignment
          </button>
        </div>
      ) : (
        <div className="assignments-grid">
            {assignments.map(assignment => (
              <div key={assignment.id} className="assignment-card" onClick={() => openAssignmentDetails(assignment.id)}>
              <div className="assignment-header">
                <h3>{assignment.title}</h3>
                <div className="assignment-actions">
                  <button 
                    className="delete-btn-small" 
                    onClick={(e) => { e.stopPropagation(); handleDeleteAssignment(assignment.id); }}
                    title="Delete"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p className="assignment-description">{assignment.description}</p>
              <div className="assignment-meta">
                <div className="meta-item">
                  <span className="meta-label">Max Marks:</span>
                  <span className="meta-value">{assignment.maxMarks}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Due Date:</span>
                  <span className="meta-value">{formatDate(assignment.dueDate)}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Submissions:</span>
                  <span className="meta-value">{assignment.totalSubmissions || 0}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Graded:</span>
                  <span className="meta-value">{assignment.gradedSubmissions || 0}</span>
                </div>
              </div>
              <div className="assignment-status">
                {assignment.hasRubric ? (
                  <span className="status-badge graded">Has Rubric</span>
                ) : (
                  <span className="status-badge not-graded">No Rubric</span>
                )}
                {assignment.isClosed ? (
                  <span className="status-badge not-graded" style={{ marginLeft: 8 }}>Closed</span>
                ) : (
                  <span className="status-badge graded" style={{ marginLeft: 8 }}>Open</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Assignment Details Modal (Teacher view) */}
      {selectedAssignment && !showSubmissionsModal && !showRubricModal && (
        <div className="modal-overlay" onClick={() => setSelectedAssignment(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{selectedAssignment.title}</h2>
            <p>{selectedAssignment.description}</p>
            <div className="assignment-meta">
              <div className="meta-item">
                <span className="meta-label">Max Marks:</span>
                <span className="meta-value">{selectedAssignment.maxMarks}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Due Date:</span>
                <span className="meta-value">{formatDate(selectedAssignment.dueDate)}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Has Rubric:</span>
                <span className="meta-value">{selectedAssignment.hasRubric ? 'Yes' : 'No'}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Status:</span>
                <span className="meta-value">{selectedAssignment.isClosed ? 'Closed' : 'Open'}</span>
              </div>
            </div>

            <div style={{ marginTop: 16, display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button className="cancel-btn" onClick={() => setSelectedAssignment(null)}>Close</button>
              <button 
                className="create-btn" 
                onClick={() => openSubmissionsView(selectedAssignment)}
              >
                View Submissions
              </button>
              <button 
                className="create-btn" 
                onClick={() => openRubricModal(selectedAssignment)}
              >
                {selectedAssignment.hasRubric ? 'Edit Rubric' : 'Add Rubric'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Assignment Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Create New Assignment</h2>
            <form onSubmit={handleCreateAssignment}>
              <div className="form-group">
                <label>Assignment Title *</label>
                <input
                  type="text"
                  value={newAssignment.title}
                  onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                  placeholder="e.g., Python List Operations"
                  required
                />
              </div>
              <div className="form-group">
                <label>Description *</label>
                <textarea
                  value={newAssignment.description}
                  onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
                  placeholder="Describe the assignment requirements..."
                  rows="4"
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Due Date *</label>
                  <input
                    type="datetime-local"
                    value={newAssignment.dueDate}
                    onChange={(e) => setNewAssignment({ ...newAssignment, dueDate: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Max Marks *</label>
                  <input
                    type="number"
                    value={newAssignment.maxMarks}
                    onChange={(e) => setNewAssignment({ ...newAssignment, maxMarks: parseInt(e.target.value) })}
                    min="1"
                    max="1000"
                    required
                  />
                </div>
              </div>
              {error && <div className="error-message">{error}</div>}
              <div className="modal-buttons">
                <button type="button" onClick={() => setShowCreateModal(false)} className="cancel-btn">
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  Create Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Submissions View Modal */}
      {showSubmissionsModal && selectedAssignment && !showCodeViewer && (
        <div className="modal-overlay" onClick={() => { setShowSubmissionsModal(false); setSelectedAssignment(null); }}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <h2>Submissions: {selectedAssignment.title}</h2>
            <p style={{ marginBottom: '16px', color: '#666' }}>
              Total Submissions: {submissions.length}
            </p>

            {submissions.length === 0 ? (
              <div className="empty-state">
                <p>No submissions yet</p>
              </div>
            ) : (
              <div className="submissions-table-container">
                <table className="students-table">
                  <thead>
                    <tr>
                      <th>Roll Number</th>
                      <th>Name</th>
                      <th>Submitted At</th>
                      <th>Grade</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map(submission => (
                      <tr key={submission.id}>
                        <td><strong>{submission.student.rollNumber}</strong></td>
                        <td>{submission.student.name}</td>
                        <td>{new Date(submission.submittedAt).toLocaleString()}</td>
                        <td>
                          {submission.grade !== null && submission.grade !== undefined ? (
                            <span className="grade-badge">{submission.grade}/{selectedAssignment.maxMarks}</span>
                          ) : (
                            <span className="status-badge not-graded">Not Graded</span>
                          )}
                        </td>
                        <td>
                          <button 
                            className="view-btn-small"
                            onClick={() => viewSubmissionCode(submission)}
                          >
                            View Code
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ marginTop: 16 }}>
              <button className="cancel-btn" onClick={() => { setShowSubmissionsModal(false); setSelectedAssignment(null); }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Code Viewer Modal (Teacher) */}
      {showCodeViewer && currentSubmission && (
        <div className="modal-overlay" onClick={() => { setShowCodeViewer(false); setCurrentSubmission(null); }}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <h2>Submission by {currentSubmission.student.name}</h2>
            <p style={{ marginBottom: '16px', color: '#666' }}>
              Roll: {currentSubmission.student.rollNumber} | 
              Submitted: {new Date(currentSubmission.submittedAt).toLocaleString()}
            </p>
            
            <CodeViewer code={currentSubmission.code} language="python" />

            {currentSubmission.feedback && (
              <div className="feedback-section" style={{ marginTop: '16px' }}>
                <h3>Feedback</h3>
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{currentSubmission.feedback}</pre>
              </div>
            )}

            {currentSubmission.grade !== null && currentSubmission.grade !== undefined && (
              <div style={{ marginTop: '16px', padding: '12px', background: '#e8f5e9', borderRadius: '8px' }}>
                <strong>Grade: {currentSubmission.grade}/{selectedAssignment.maxMarks}</strong>
                {currentSubmission.autoGraded && <span style={{ marginLeft: '8px', color: '#666' }}>(Auto-graded)</span>}
              </div>
            )}

            <div style={{ marginTop: 16, display: 'flex', gap: '8px' }}>
              <button className="cancel-btn" onClick={() => { setShowCodeViewer(false); setCurrentSubmission(null); }}>
                Close
              </button>
              {selectedAssignment.hasRubric && (
                <button 
                  className="create-btn" 
                  onClick={handleAutoGrade}
                  disabled={currentSubmission.grade !== null && currentSubmission.grade !== undefined && currentSubmission.autoGraded}
                >
                  {currentSubmission.autoGraded ? 'Re-run Auto-Grade' : 'Auto-Grade'}
                </button>
              )}
              <button className="create-btn" onClick={handleManualGrade}>
                Manual Grade
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rubric Modal */}
      {showRubricModal && selectedAssignment && (
        <div className="modal-overlay" onClick={() => { setShowRubricModal(false); setRubricFile(null); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Upload Rubric: {selectedAssignment.title}</h2>
            <p style={{ marginBottom: '16px', color: '#666' }}>
              Upload a JSON rubric file to define grading criteria
            </p>

            <div className="form-group">
              <label>Rubric JSON File *</label>
              <input
                type="file"
                accept=".json"
                onChange={handleRubricFileChange}
                style={{ 
                  padding: '10px',
                  border: '2px dashed #007bff',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  width: '100%'
                }}
              />
              {rubricFile && (
                <p style={{ marginTop: '8px', color: '#28a745', fontSize: '14px' }}>
                  Selected: {rubricFile.name}
                </p>
              )}
            </div>

            <div style={{ 
              marginTop: '16px', 
              padding: '12px', 
              backgroundColor: '#f8f9fa', 
              borderRadius: '8px',
              fontSize: '14px',
              color: '#666'
            }}>
              <strong>Expected JSON Format:</strong>
              <pre style={{ 
                marginTop: '8px', 
                fontSize: '12px', 
                overflowX: 'auto',
                backgroundColor: '#fff',
                padding: '8px',
                borderRadius: '4px'
              }}>
{`{
  "criteria": [
    {
      "name": "Functionality",
      "description": "Tests if code works",
      "weight": 0.4,
      "auto_gradable": true,
      "test_cases": [
        {
          "function_call": "sum_list([1,2,3])",
          "expected_output": "6"
        }
      ]
    }
  ]
}`}
              </pre>
            </div>

            <div className="modal-buttons" style={{ marginTop: 16 }}>
              <button 
                className="cancel-btn"
                onClick={() => { setShowRubricModal(false); setRubricFile(null); }}
              >
                Cancel
              </button>
              <button 
                className="submit-btn"
                onClick={handleUploadRubric}
                disabled={!rubricFile}
              >
                Upload Rubric
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherAssignments;
