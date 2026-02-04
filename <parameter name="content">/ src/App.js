import React, { useState, useEffect } from 'react';
import LoginPage from './components/LoginPage';
import ManagerDashboard from './components/ManagerDashboard';
import SalesDashboard from './components/SalesDashboard';
import { getInitialRFQs } from './utils/helpers';
import { rfqAPI, authAPI } from './api';

const App = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [rfqs, setRfqs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('pcbTrackerUser');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchRFQs();
    }
  }, [currentUser]);

  const fetchRFQs = async () => {
    const token = localStorage.getItem('pcbTrackerToken');
    if (!token) {
      setRfqs(getInitialRFQs());
      return;
    }

    try {
      const response = await rfqAPI.getAll(token);
      if (response.data && response.data.length > 0) {
        setRfqs(response.data);
      } else {
        setRfqs(getInitialRFQs());
      }
    } catch (error) {
      console.log('Using local RFQ data');
      setRfqs(getInitialRFQs());
    }
  };

  const handleLogin = (user) => {
    setCurrentUser(user);
    localStorage.setItem('pcbTrackerUser', JSON.stringify(user));
  };

  const handleLogout = async () => {
    const token = localStorage.getItem('pcbTrackerToken');
    if (token && token !== 'demo-token') {
      try {
        await authAPI.logout(token);
      } catch (error) {
      }
    }
    setCurrentUser(null);
    localStorage.removeItem('pcbTrackerUser');
    localStorage.removeItem('pcbTrackerToken');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    );
  }

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (currentUser.role === 'manager' || currentUser.role === 'admin') {
    return (
      <ManagerDashboard
        user={currentUser}
        rfqs={rfqs}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <SalesDashboard
      user={currentUser}
      rfqs={rfqs}
      onLogout={handleLogout}
      updateRFQs={setRfqs}
    />
  );
};

export default App;
</parameter>
<parameter name="path">/Users/mac/Desktop/files/PCB TRACKER/frontend/src/App.js</parameter>
