import React, { useState } from 'react';
import TeacherClassrooms from './TeacherClassrooms';
import StudentClassrooms from './StudentClassrooms';
import TeacherAssignments from './TeacherAssignments';

const Dashboard = ({ user, onLogout }) => {
  const isTeacher = user.role === 'teacher';
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="dashboard-container">
      <nav className="navbar">
        <div className="navbar-brand">Assignment Grader</div>
        <div className="navbar-user">
          <div className="user-info">
            <div className="user-name">{user.name}</div>
            <div className="user-role">{user.role}</div>
          </div>
          <button className="logout-button" onClick={onLogout}>
            Logout
          </button>
        </div>
      </nav>

      <div className="dashboard-tabs">
        <button 
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab ${activeTab === 'classrooms' ? 'active' : ''}`}
          onClick={() => setActiveTab('classrooms')}
        >
          Classrooms
        </button>
        {isTeacher && (
          <button 
            className={`tab ${activeTab === 'assignments' ? 'active' : ''}`}
            onClick={() => setActiveTab('assignments')}
            >
            Assignments
          </button>
        )}
      </div>

      <div className="dashboard-content">
        {activeTab === 'overview' && (
          <>
            <div className="welcome-card">
              <h2>Welcome back, {user.name}!</h2>
              <p>
                {isTeacher
                  ? 'Manage your classrooms, assignments, and grade student submissions.'
                  : `Roll Number: ${user.rollNumber} | Branch: ${user.branch}`}
              </p>
            </div>

            {isTeacher ? (
              <div className="stats-grid">
                <div className="stat-card">
                  <h3>0</h3>
                  <p>Active Classrooms</p>
                </div>
                <div className="stat-card">
                  <h3>0</h3>
                  <p>Total Assignments</p>
                </div>
                <div className="stat-card">
                  <h3>0</h3>
                  <p>Pending Submissions</p>
                </div>
                <div className="stat-card">
                  <h3>0</h3>
                  <p>Students Enrolled</p>
                </div>
              </div>
            ) : (
              <div className="stats-grid">
                <div className="stat-card">
                  <h3>0</h3>
                  <p>Enrolled Classes</p>
                </div>
                <div className="stat-card">
                  <h3>0</h3>
                  <p>Pending Assignments</p>
                </div>
                <div className="stat-card">
                  <h3>0</h3>
                  <p>Submissions</p>
                </div>
                <div className="stat-card">
                  <h3>-</h3>
                  <p>Average Grade</p>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'classrooms' && isTeacher && (
          <TeacherClassrooms user={user} />
        )}

        {activeTab === 'classrooms' && !isTeacher && (
          <StudentClassrooms user={user} />
        )}

        {activeTab === 'assignments' && isTeacher && (
          <TeacherAssignments user={user} />
        )}
      </div>
    </div>
  );
};

export default Dashboard;
