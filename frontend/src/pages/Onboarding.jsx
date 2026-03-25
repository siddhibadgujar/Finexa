import React, { useState } from 'react';
import axios from 'axios';
import { Building2, IndianRupee, PieChart, CheckCircle2, UserPlus, Package, ClipboardList, ArrowRight, ArrowLeft } from 'lucide-react';
import { API_URL } from '../config/api';

const Onboarding = ({ onLogin, onComplete }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // User Data
    name: '',
    email: '',
    password: '',
    // Business Data
    businessName: '',
    businessType: 'Retail',
    // Financial Data
    startingBalance: '',
    primaryExpense: 'Supplies',
    // Operational Data
    startingInventory: '',
    expectedWeeklyOrders: ''
  });

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  const handleSignup = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) return;
    
    const userData = { name: formData.name, email: formData.email };
    localStorage.setItem('user', JSON.stringify(userData));
    onLogin(userData); // Update App state
    nextStep();
  };

  const handleFinalSubmit = async () => {
    try {
      // 1. REAL SIGNUP: Save user to Backend MongoDB
      const res = await axios.post(`${API_URL}/api/auth/signup`, {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        businessName: formData.businessName,
        businessType: formData.businessType
      });

      // 2. Save auth data to localStorage for persistence
      localStorage.setItem('user', JSON.stringify(res.data));
      localStorage.setItem('businessName', res.data.businessName);
      localStorage.setItem('businessType', res.data.businessType);
      localStorage.setItem('primaryExpense', formData.primaryExpense);
      
      // 3. Seed initial financial & operational data via API
      await axios.post(`${API_URL}/api/transactions/add`, {
        type: 'income',
        amount: Number(formData.startingBalance) || 0,
        category: 'Initial Balance',
        inventoryLevel: formData.businessType === 'Services' ? 0 : (Number(formData.startingInventory) || 0),
        ordersReceived: Number(formData.expectedWeeklyOrders) || 0,
        ordersCompleted: 0,
        itemsSold: 0,
        comments: 'Initial account setup'
      }, {
        headers: {
          Authorization: `Bearer ${res.data.token}`,
        },
      });

      localStorage.setItem('isOnboarded', 'true');
      onComplete();
    } catch (error) {
      console.error('Error during real signup:', error.response?.data?.message || error.message);
      alert(error.response?.data?.message || "Signup failed. Please try again.");
    }
  };

  const ProgressDots = () => (
    <div className="flex justify-center gap-2 mb-8">
      {[1, 2, 3, 4].map((i) => (
        <div 
          key={i} 
          className={`h-1.5 rounded-full transition-all duration-300 ${step === i ? 'w-8 bg-finexa-primary' : 'w-2 bg-gray-200'}`}
        />
      ))}
    </div>
  );

  const isService = formData.businessType === 'Services';

  return (
    <div className="min-h-[90vh] flex items-center justify-center p-4 bg-white">
      <div className="max-w-md w-full">
        <ProgressDots />

        {/* STEP 1: SIGNUP */}
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-50 text-finexa-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                <UserPlus size={32} />
              </div>
              <h1 className="text-3xl font-extrabold text-gray-900">Create Account</h1>
              <p className="text-gray-500 mt-2">Let's get your Finexa profile started.</p>
            </div>
            <form onSubmit={handleSignup} className="space-y-4">
              <input 
                type="text" placeholder="Full Name" required
                value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full p-4 border-2 border-gray-100 rounded-2xl focus:border-finexa-primary outline-none transition-all"
              />
              <input 
                type="email" placeholder="Email Address" required
                value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full p-4 border-2 border-gray-100 rounded-2xl focus:border-finexa-primary outline-none transition-all"
              />
              <input 
                type="password" placeholder="Password" required
                value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full p-4 border-2 border-gray-100 rounded-2xl focus:border-finexa-primary outline-none transition-all"
              />
              <button type="submit" className="w-full bg-finexa-primary text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all">
                Continue <ArrowRight size={20} />
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: BUSINESS PROFILE */}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-purple-50 text-finexa-accent rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Building2 size={32} />
              </div>
              <h1 className="text-3xl font-extrabold text-gray-900">Your Business</h1>
              <p className="text-gray-500 mt-2">Tell us about what you do.</p>
            </div>
            <div className="space-y-4">
              <input 
                type="text" placeholder="Business Name"
                value={formData.businessName} onChange={(e) => setFormData({...formData, businessName: e.target.value})}
                className="w-full p-4 border-2 border-gray-100 rounded-2xl focus:border-finexa-primary outline-none"
              />
              <select 
                value={formData.businessType} onChange={(e) => setFormData({...formData, businessType: e.target.value})}
                className="w-full p-4 border-2 border-gray-100 rounded-2xl appearance-none bg-white"
              >
                <option value="Retail">Retail Store</option>
                <option value="Services">Service Based</option>
                <option value="Manufacturing">Manufacturing</option>
                <option value="Food">Food & Beverage</option>
              </select>
              <button onClick={nextStep} className="w-full bg-finexa-primary text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2">
                Continue <ArrowRight size={20} />
              </button>
              <button onClick={prevStep} className="w-full text-gray-400 font-bold py-2 flex items-center justify-center gap-2">
                <ArrowLeft size={16} /> Back
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: FINANCIALS */}
        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-50 text-finexa-profit rounded-2xl flex items-center justify-center mx-auto mb-4">
                <IndianRupee size={32} />
              </div>
              <h1 className="text-3xl font-extrabold text-gray-900">Financial Setup</h1>
              <p className="text-gray-500 mt-2">What's your current cash in hand?</p>
            </div>
            <div className="space-y-4">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">₹</span>
                <input 
                  type="number" placeholder="Starting Balance"
                  value={formData.startingBalance} onChange={(e) => setFormData({...formData, startingBalance: e.target.value})}
                  className="w-full p-4 pl-8 border-2 border-gray-100 rounded-2xl focus:border-finexa-primary outline-none"
                />
              </div>
              <label className="block text-sm font-bold text-gray-600 mb-[-10px]">What is your main expense?</label>
              <select 
                value={formData.primaryExpense} onChange={(e) => setFormData({...formData, primaryExpense: e.target.value})}
                className="w-full p-4 border-2 border-gray-100 rounded-2xl appearance-none bg-white"
              >
                <option value="Supplies">Supplies & Materials</option>
                <option value="Rent">Rent & Utilities</option>
                <option value="Staff">Salaries / Staff</option>
              </select>
              <button onClick={nextStep} className="w-full bg-finexa-primary text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2">
                Continue <ArrowRight size={20} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: OPERATIONS */}
        {step === 4 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-yellow-50 text-finexa-warning rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ClipboardList size={32} />
              </div>
              <h1 className="text-3xl font-extrabold text-gray-900">Operations</h1>
              <p className="text-gray-500 mt-2">Let's set your baseline ops.</p>
            </div>
            <div className="space-y-4">
              {!isService && (
                <div className="relative">
                  <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input 
                    type="number" placeholder="Current Inventory Count"
                    value={formData.startingInventory} onChange={(e) => setFormData({...formData, startingInventory: e.target.value})}
                    className="w-full p-4 pl-12 border-2 border-gray-100 rounded-2xl focus:border-finexa-primary outline-none"
                  />
                </div>
              )}
              <div className="relative">
                <CheckCircle2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  type="number" placeholder={isService ? "Est. Weekly Clients" : "Est. Weekly Orders"}
                  value={formData.expectedWeeklyOrders} onChange={(e) => setFormData({...formData, expectedWeeklyOrders: e.target.value})}
                  className="w-full p-4 pl-12 border-2 border-gray-100 rounded-2xl focus:border-finexa-primary outline-none"
                />
              </div>
              <button onClick={handleFinalSubmit} className="w-full bg-finexa-primary text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-100">
                Go to Dashboard <CheckCircle2 size={20} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
