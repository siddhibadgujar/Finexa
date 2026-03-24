import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Building2, IndianRupee, Activity, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';

const SetupBusiness = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [businessInfo, setBusinessInfo] = useState({ businessName: '', businessType: 'Retail / E-commerce' });
  const [transactions, setTransactions] = useState([]);
  const [currentTx, setCurrentTx] = useState({ type: 'income', amount: '', category: 'Product Sales', date: new Date().toISOString().split('T')[0] });
  const [operations, setOperations] = useState({
    date: new Date().toISOString().split('T')[0],
    metrics: {
      ordersReceived: '', ordersCompleted: '', inventoryLevel: '', unitsProduced: ''
    }
  });

  const businessTypes = [
    "Retail / E-commerce",
    "Manufacturing",
    "Service Business",
    "Food & Restaurant",
    "Wholesale / Distribution",
    "Freelancer / Individual"
  ];

  const categories = ["Product Sales", "Service Income", "Bulk Orders", "Other Income"];

  const addTx = () => {
    if (!currentTx.amount) return;
    setTransactions([...transactions, { ...currentTx, amount: Number(currentTx.amount) }]);
    setCurrentTx({ ...currentTx, amount: '' });
  };

  const removeTx = (index) => {
    setTransactions(transactions.filter((_, i) => i !== index));
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Filter out unitsProduced if not manufacturing
      const metrics = {
        ordersReceived: Number(operations.metrics.ordersReceived) || 0,
        ordersCompleted: Number(operations.metrics.ordersCompleted) || 0,
        inventoryLevel: Number(operations.metrics.inventoryLevel) || 0
      };
      
      if (businessInfo.businessType === "Manufacturing") {
        metrics.unitsProduced = Number(operations.metrics.unitsProduced) || 0;
      }

      const payload = {
        businessInfo,
        income: transactions, // Rename transactions to income for backend sync
        operations: { ...operations, metrics }
      };

      console.log("Sending setup data:", payload);

      const res = await axios.post('http://localhost:5555/api/business/setup', payload, {
        headers: { 'x-auth-token': token }
      });

      localStorage.setItem('business', JSON.stringify(res.data.business));
      navigate('/dashboard');
    } catch (err) {
      console.error('Setup failed', err);
      alert('Setup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 font-sans">
      <div className="max-w-4xl w-full">
        {/* Stepper */}
        <div className="flex items-center justify-between mb-12 relative px-4">
          <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -translate-y-1/2 -z-10"></div>
          {[1, 2, 3].map((s) => (
            <div key={s} className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-xl transition-all ${step >= s ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-gray-400 border-4 border-gray-200'}`}>
              {step > s ? <CheckCircle2 size={24} /> : s}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 transition-all duration-300">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="p-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl"><Building2 size={32} /></div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900">Basic Business Info</h2>
                  <p className="text-gray-500 font-medium">Tell us about your company</p>
                </div>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Business Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Acme Corp"
                    className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none transition-all font-medium text-lg"
                    value={businessInfo.businessName}
                    onChange={(e) => setBusinessInfo({...businessInfo, businessName: e.target.value})}
                  />
                  <p className="text-[12px] text-gray-400 mt-2 font-medium">You can update these values later</p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Business Type</label>
                  <select 
                    className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none transition-all font-medium text-lg cursor-pointer"
                    value={businessInfo.businessType}
                    onChange={(e) => setBusinessInfo({...businessInfo, businessType: e.target.value})}
                  >
                    {businessTypes.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Financial Setup */}
          {step === 2 && (
            <div className="p-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-green-100 text-green-600 rounded-2xl"><IndianRupee size={32} /></div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900">Initial Business Income Setup</h2>
                  <p className="text-gray-500 font-medium">Add some initial sales records</p>
                </div>
              </div>
              
              <div className="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input 
                    type="number" 
                    placeholder="Amount (₹)"
                    className="px-6 py-4 rounded-xl border-2 border-white font-bold outline-none focus:border-indigo-500 bg-white"
                    value={currentTx.amount}
                    onChange={(e) => setCurrentTx({...currentTx, amount: e.target.value})}
                  />
                  <select 
                    className="px-6 py-4 rounded-xl border-2 border-white font-bold outline-none focus:border-indigo-500 bg-white cursor-pointer"
                    value={currentTx.category}
                    onChange={(e) => setCurrentTx({...currentTx, category: e.target.value})}
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <button onClick={addTx} className="bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 transition-all active:scale-95">Add Income</button>
                </div>
              </div>

              <div className="space-y-3">
                {transactions.map((tx, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl shadow-sm animate-in zoom-in-95 duration-200">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                        <TrendingUp size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{tx.category}</p>
                        <p className="text-xs text-gray-400 font-medium">{tx.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-black text-green-600">+ ₹{tx.amount.toLocaleString()}</span>
                      <button onClick={() => removeTx(i)} className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all">×</button>
                    </div>
                  </div>
                ))}
                {transactions.length === 0 && <p className="text-center py-8 text-gray-400 font-medium italic">No income records added yet</p>}
              </div>
            </div>
          )}

          {/* Step 3: Operational Data */}
          {step === 3 && (
            <div className="p-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-4 mb-2">
                <div className="p-3 bg-purple-100 text-purple-600 rounded-2xl"><Activity size={32} /></div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900">Operational Metrics</h2>
                  <p className="text-gray-500 font-medium">Tell us how your business is performing</p>
                </div>
              </div>
              <p className="text-[12px] text-gray-400 mb-8 font-medium">You can update these values later in settings</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Orders Received</label>
                  <input 
                    type="number" 
                    placeholder="Enter total orders received"
                    className="w-full px-5 py-3 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-xl outline-none font-bold"
                    value={operations.metrics.ordersReceived}
                    onChange={(e) => setOperations({
                      ...operations, 
                      metrics: { ...operations.metrics, ordersReceived: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Orders Completed</label>
                  <input 
                    type="number" 
                    placeholder="Enter orders completed"
                    className="w-full px-5 py-3 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-xl outline-none font-bold"
                    value={operations.metrics.ordersCompleted}
                    onChange={(e) => setOperations({
                      ...operations, 
                      metrics: { ...operations.metrics, ordersCompleted: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Inventory Level</label>
                  <input 
                    type="number" 
                    placeholder="Enter inventory level"
                    className="w-full px-5 py-3 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-xl outline-none font-bold"
                    value={operations.metrics.inventoryLevel}
                    onChange={(e) => setOperations({
                      ...operations, 
                      metrics: { ...operations.metrics, inventoryLevel: e.target.value }
                    })}
                  />
                </div>
                {businessInfo.businessType === "Manufacturing" && (
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Units Produced</label>
                    <input 
                      type="number" 
                      placeholder="Total units produced"
                      className="w-full px-5 py-3 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-xl outline-none font-bold"
                      value={operations.metrics.unitsProduced}
                      onChange={(e) => setOperations({
                        ...operations, 
                        metrics: { ...operations.metrics, unitsProduced: e.target.value }
                      })}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer Controls */}
          <div className="bg-gray-50 p-6 flex items-center justify-between border-t border-gray-100">
            <button 
              onClick={() => setStep(step - 1)}
              disabled={step === 1}
              className={`flex items-center gap-2 font-black transition-all ${step === 1 ? 'opacity-0' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <ArrowLeft size={20} /> Previous
            </button>
            
            {step < 3 ? (
              <button 
                onClick={() => setStep(step + 1)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-10 py-4 rounded-2xl flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all active:scale-95"
              >
                Next <ArrowRight size={20} />
              </button>
            ) : (
              <button 
                onClick={handleFinish}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 text-white font-black px-12 py-4 rounded-2xl flex items-center gap-2 shadow-lg shadow-green-100 transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? 'Setting up...' : 'Finish Setup'} <CheckCircle2 size={20} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const TrendingUp = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
    <polyline points="17 6 23 6 23 12"></polyline>
  </svg>
);

export default SetupBusiness;
