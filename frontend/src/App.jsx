import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Signup from './pages/Signup';
import Login from './pages/Login';
import SetupBusiness from './pages/SetupBusiness';
import Analysis from './pages/Analysis';

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

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<Login />} />
            <Route path="/setup-business" element={
              <ProtectedRoute requireBusiness={false}>
                <SetupBusiness />
              </ProtectedRoute>
            } />
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
            <Route path="/" element={<Navigate to="/dashboard" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
