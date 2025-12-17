import React, { useState } from 'react';
import { authAPI } from '../services/api';

const Login = ({ onLoginSuccess }) => {
  const [role, setRole] = useState('student'); // 'student' or 'teacher'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      let response;
      if (role === 'student') {
        response = await authAPI.studentLogin(email, password);
      } else {
        response = await authAPI.teacherLogin(email, password);
      }

      // Save token to localStorage
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      // Show success message
      setSuccess(`✅ Login successful! Welcome ${response.data.user.name}`);
      
      // Wait 1.5 seconds before redirecting to dashboard
      setTimeout(() => {
        onLoginSuccess(response.data.user);
      }, 1500);
    } catch (err) {
      // Provide more detailed error feedback for debugging
      const serverError = err.response?.data?.error || err.response?.data || null;
      const message = serverError
        ? (typeof serverError === 'string' ? serverError : JSON.stringify(serverError))
        : err.message || 'Login failed. Please try again.';
      console.error('Login error details:', err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    if (role === 'student') {
      setEmail('cse001@university.edu');
      setPassword('student123');
    } else {
      setEmail('teacher@university.edu');
      setPassword('teacher123');
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h1>🎓 Assignment Grader</h1>
          <p>Sign in to access your portal</p>
        </div>

        <div className="role-tabs">
          <button
            className={`role-tab ${role === 'student' ? 'active' : ''}`}
            onClick={() => setRole('student')}
          >
            👨‍🎓 Student
          </button>
          <button
            className={`role-tab ${role === 'teacher' ? 'active' : ''}`}
            onClick={() => setRole('teacher')}
          >
            👨‍🏫 Teacher
          </button>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={role === 'student' ? 'cse001@university.edu' : 'teacher@university.edu'}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="hint-box">
          <strong>🔑 Demo Credentials:</strong>
          {role === 'student' ? (
            <>
              Email: cse001@university.edu<br />
              Password: student123
            </>
          ) : (
            <>
              Email: teacher@university.edu<br />
              Password: teacher123
            </>
          )}
          <br />
          <button
            onClick={fillDemoCredentials}
            style={{
              marginTop: '10px',
              padding: '8px 16px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            Fill Demo Credentials
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
