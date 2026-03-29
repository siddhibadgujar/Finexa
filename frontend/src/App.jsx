import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Signup from './pages/Signup';
import Login from './pages/Login';
import SetupBusiness from './pages/SetupBusiness';
import Analysis from './pages/Analysis';
import Anomaly from './pages/Anomaly';
import Settings from './pages/Settings';
import ImportData from './pages/ImportData';
import Chatbot from './components/dashboard/Chatbot';

const ProtectedRoute = ({ children, requireBusiness = true }) => {
  const token = localStorage.getItem('token');
  const business = localStorage.getItem('business');
  
  if (!token) return <Navigate to="/login" />;
  
  // If we require a business but don't have one, go to setup
  if (requireBusiness && !business) return <Navigate to="/setup-business" />;
  
  // If we DON'T require a business (we are on setup page) but we DO have one, go to dashboard
  if (!requireBusiness && business) return <Navigate to="/dashboard" />;
  
  return children;
};

// Layout for pages WITHOUT Navbar (Login, Signup)
const PublicLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Outlet />
    </div>
  );
};

// Layout for onboarding WITHOUT Navbar (Business Setup)
const OnboardingLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Outlet />
    </div>
  );
};

// Layout for pages WITH Navbar (Dashboard, Analysis, etc.)
const PrivateLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
      <Chatbot />
    </div>
  );
};

function App() {
  useEffect(() => {
    // 1. Session Timeout Logic (2 Days)
    const interval = setInterval(() => {
      const token = localStorage.getItem('token');
      const lastActive = localStorage.getItem('lastActive');

      if (token && lastActive) {
        const now = Date.now();
        const diff = now - parseInt(lastActive);

        if (diff > 2 * 24 * 60 * 60 * 1000) { // 2 days
          console.log("Session timed out due to inactivity");
          localStorage.clear();
          window.location.href = "/login";
        }
      }
    }, 5000);

    // 2. Activity Tracking
    const updateActivity = () => {
      if (localStorage.getItem('token')) {
        localStorage.setItem('lastActive', Date.now().toString());
      }
    };

    window.addEventListener("click", updateActivity);
    window.addEventListener("keypress", updateActivity);
    window.addEventListener("scroll", updateActivity);

    return () => {
      clearInterval(interval);
      window.removeEventListener("click", updateActivity);
      window.removeEventListener("keypress", updateActivity);
      window.removeEventListener("scroll", updateActivity);
    };
  }, []);

  return (
    <Router>
      <Routes>
        {/* Public Routes - No Navbar */}
        <Route element={<PublicLayout />}>
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
        </Route>

        {/* Onboarding Routes - No Navbar */}
        <Route element={<OnboardingLayout />}>
          <Route path="/setup-business" element={
            <ProtectedRoute requireBusiness={false}>
              <SetupBusiness />
            </ProtectedRoute>
          } />
        </Route>

        {/* Private Routes - With Navbar */}
        <Route element={<PrivateLayout />}>
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/analysis" element={
            <ProtectedRoute>
              <Analysis />
            </ProtectedRoute>
          } />
          <Route path="/anomaly" element={
            <ProtectedRoute>
              <Anomaly />
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute requireBusiness={false}>
              <Settings />
            </ProtectedRoute>
          } />
          <Route path="/import-data" element={
            <ProtectedRoute>
              <ImportData />
            </ProtectedRoute>
          } />
          {/* Default Route */}
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
