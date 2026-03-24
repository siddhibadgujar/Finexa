import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight } from 'lucide-react';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5555/api/auth/login', formData);
      const token = res.data.token;
      const user = res.data.user;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      console.log("User logged in:", user);

      // Check if business is already setup
      const businessRes = await axios.get('http://localhost:5555/api/business/me', {
        headers: { 'x-auth-token': token }
      });

      console.log("Business check response:", businessRes.data);

      if (businessRes.data.exists) {
        localStorage.setItem('business', JSON.stringify(businessRes.data.business));
        navigate('/dashboard');
      } else {
        localStorage.removeItem('business'); // Ensure old business data is gone
        navigate('/setup-business');
      }
      
      window.location.reload(); // Refresh to update navbar state
    } catch (err) {
      console.error("Login Error:", err);
      setError(err.response?.data?.message || 'Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-indigo-600 mb-2">Finexa</h1>
          <p className="text-gray-500 font-medium">Welcome back!</p>
        </div>

        {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-bold border border-red-100">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="email" 
              placeholder="Email Address"
              className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none transition-all font-medium"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="password" 
              placeholder="Password"
              className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none transition-all font-medium"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required
            />
          </div>
          <button 
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 group"
          >
            Log In
            <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
          </button>
        </form>

        <p className="text-center mt-8 text-gray-500 font-medium">
          New to Finexa? <Link to="/signup" className="text-indigo-600 font-bold hover:underline">Create Account</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
