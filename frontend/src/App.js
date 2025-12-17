import React, { useState, useEffect } from 'react';
import './App.css';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

const DebugBar = () => {
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');

  return (
    <div style={{ position: 'fixed', left: 12, bottom: 12, zIndex: 9999 }}>
      <div style={{ background: 'rgba(0,0,0,0.7)', color: 'white', padding: 10, borderRadius: 8, fontSize: 12 }}>
        <div><strong>API:</strong> {apiUrl}</div>
        <div><strong>Token:</strong> {token ? 'present' : 'none'}</div>
        <div><strong>User:</strong> {user ? JSON.parse(user).email : 'none'}</div>
      </div>
    </div>
  );
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="app-container">
      {user ? (
        <Dashboard user={user} onLogout={handleLogout} />
      ) : (
        <Login onLoginSuccess={handleLoginSuccess} />
      )}
      <DebugBar />
    </div>
  );
}

export default App;
