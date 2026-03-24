import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { IndianRupee, TrendingDown, TrendingUp, Wallet, ArrowDown, ArrowUp, Plus, Minus, ChevronDown, ChevronUp, Zap, AlertCircle, BarChart3 } from 'lucide-react';
import SummaryCard from '../components/dashboard/SummaryCard';
import QuickActions from '../components/dashboard/QuickActions';
import ChartSection from '../components/dashboard/ChartSection';
import InsightsPanel from '../components/dashboard/InsightsPanel';
import HealthScore from '../components/dashboard/HealthScore';
import TransactionList from '../components/dashboard/TransactionList';
import OperationalMetrics from '../components/dashboard/OperationalMetrics';
import Chatbot from '../components/dashboard/Chatbot';

const Dashboard = () => {
  const [data, setData] = useState({
    transactions: [],
    metrics: { 
      totalRevenue: 0, totalExpense: 0, profit: 0, balance: 0, healthScore: 50,
      totalItemsSold: 0, totalOrdersCompleted: 0, totalPendingOrders: 0, latestInventory: 0
    },
    charts: { pieChartData: [], lineChartData: [] },
    insights: [],
    opInsights: [],
    anomalies: []
  });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showOpModal, setShowOpModal] = useState(false);
  const [showOpFields, setShowOpFields] = useState(false);
  const [txForm, setTxForm] = useState({ 
    type: 'income', amount: '', category: '',
    itemsSold: '', ordersReceived: '', ordersCompleted: '', pendingOrders: '', inventoryLevel: '', deliveryTimeAvg: '', defects: ''
  });
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [performance, setPerformance] = useState({
    status: "Healthy",
    revenue: "Stable 📈",
    expense: "Controlled ✅",
    risk: "Low",
    insight: "✅ Business performance is stable."
  });

  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const business = JSON.parse(localStorage.getItem('business') || 'null');
  const businessName = business?.businessName || 'My Business';

  const calculatePerformance = (anomalies) => {
    const flagged = (anomalies || []).filter(a => a.anomaly === 1);
    const incomeAnomalies = flagged.filter(a => a.type === 'income');
    const expenseAnomalies = flagged.filter(a => a.type === 'expense');

    let status = "Healthy";
    let risk = "Low";
    let insight = "✅ Business performance is stable.";

    if (flagged.length > 3) {
      status = "Unstable";
      risk = "High";
      insight = "⚠️ High anomalies detected. Business performance is unstable.";
    } else if (flagged.length > 1) {
      status = "Moderate";
      risk = "Medium";
      insight = "⚠️ Some fluctuations detected. Monitor closely.";
    }

    const revenue = incomeAnomalies.length > 0 ? "Declining 🔻" : "Stable 📈";
    const expense = expenseAnomalies.length > 0 ? "Volatile ⚠️" : "Controlled ✅";

    return { status, revenue, expense, risk, insight };
  };

  const fetchPerformance = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      const res = await axios.get('http://localhost:5555/api/anomaly', config);
      const anomalies = res.data.anomalies || [];
      setPerformance(calculatePerformance(anomalies));
    } catch (err) {
      console.error("Error fetching performance:", err);
    }
  };

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };

      const [txRes, insightsRes, catRes, opInsightsRes, anomalyRes] = await Promise.all([
        axios.get('http://localhost:5555/api/transactions', config),
        axios.get('http://localhost:5555/api/insights', config),
        axios.get('http://localhost:5555/api/categories', config),
        axios.get('http://localhost:5555/api/operations/analysis', config),
        axios.get('http://localhost:5555/api/anomaly', config)
      ]);
      setData({
        ...txRes.data,
        insights: insightsRes.data,
        opInsights: opInsightsRes.data,
        anomalies: anomalyRes.data.anomalies || []
      });
      setCategories(catRes.data);
      
      // Auto-seed if empty
      if (catRes.data.length === 0) {
        await axios.post('http://localhost:5555/api/categories/seed', {}, config);
        const retryCat = await axios.get('http://localhost:5555/api/categories', config);
        setCategories(retryCat.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("Dashboard - User:", user);
    console.log("Dashboard - Business:", business);
    fetchData();
    fetchPerformance();
  }, []);

  const openIncomeModal = () => {
    setTxForm({ 
      type: 'income', amount: '', category: categories.find(c => c.type === 'income')?.name || '',
      itemsSold: '', ordersReceived: '', ordersCompleted: '', pendingOrders: '', inventoryLevel: '', deliveryTimeAvg: '', defects: ''
    });
    setShowAddCategory(false);
    setShowOpFields(false);
    setShowModal(true);
  };

  const openExpenseModal = () => {
    setTxForm({ 
      type: 'expense', amount: '', category: categories.find(c => c.type === 'expense')?.name || '',
      itemsSold: '', ordersReceived: '', ordersCompleted: '', pendingOrders: '', inventoryLevel: '', deliveryTimeAvg: '', defects: ''
    });
    setShowAddCategory(false);
    setShowOpFields(false);
    setShowModal(true);
  };

  const openOperationalModal = () => {
    setTxForm({ 
      type: 'income', amount: 0, category: 'Operational Update',
      itemsSold: '', ordersReceived: '', ordersCompleted: '', pendingOrders: '', inventoryLevel: '', deliveryTimeAvg: '', defects: ''
    });
    setShowOpModal(true);
  };

  const submitTx = async (e) => {
    e.preventDefault();
    if (txForm.amount === '' && !showOpModal) return;

    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };

      if (showOpModal) {
        const received = Number(txForm.ordersReceived) || 0;
        const completed = Number(txForm.ordersCompleted) || 0;
        
        if (completed > received) {
           alert("Completed Work cannot exceed Total Orders / Bookings.");
           return;
        }

        await axios.post('http://localhost:5555/api/operations', {
          itemsSold: Number(txForm.itemsSold) || 0,
          ordersReceived: received,
          ordersCompleted: completed,
          pendingOrders: Number(txForm.pendingOrders) || 0,
          inventoryLevel: Number(txForm.inventoryLevel) || 0,
          deliveryTimeAvg: Number(txForm.deliveryTimeAvg) || 0,
          defects: Number(txForm.defects) || 0
        }, config);
        setShowOpModal(false);
      } else {
        await axios.post('http://localhost:5555/api/transactions/add', {
          ...txForm,
          amount: Number(txForm.amount) || 0
        }, config);
        setShowModal(false);
      }
      
      fetchData();
    } catch (error) {
       console.error('Error adding data:', error);
    }
  };
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };

      await axios.post('http://localhost:5555/api/categories/add', {
        name: newCategoryName.trim().toLowerCase(),
        type: txForm.type
      }, config);
      setNewCategoryName('');
      setShowAddCategory(false);
      fetchData();
    } catch (error) {
      console.error('Error adding category:', error);
      alert('Failed to add category. It might already exist.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] bg-transparent">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-finexa-primary"></div>
      </div>
    );
  }

  const { metrics, charts, insights, transactions } = data;

  return (
    <div className="min-h-full bg-finexa-bg pb-20">
      <div className="section-container space-y-10">
        
        {/* Header */}
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic">{businessName} Alpha</h1>
          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mt-2 mb-1 opacity-80">Real-time Financial Command Center</p>
        </div>

        {/* Anomaly Alert Alert */}
        {data.anomalies?.filter(a => a.anomaly === 1).length > 0 && (
          <Link 
            to="/anomaly"
            className="flex items-center justify-between bg-red-50 border-2 border-red-100 p-4 rounded-2xl hover:bg-red-100 transition-all group animate-pulse"
          >
            <div className="flex items-center gap-4">
              <div className="bg-red-500 p-2 rounded-full">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-red-900 font-bold">
                  {data.anomalies.filter(a => a.anomaly === 1).length} Unusual Transaction{data.anomalies.filter(a => a.anomaly === 1).length > 1 ? 's' : ''} Detected
                </p>
                <p className="text-red-700 text-sm">Our ML model has identified potential risks in your recent cashflow. Review now.</p>
              </div>
            </div>
            <div className="bg-white p-2 rounded-xl group-hover:bg-red-600 group-hover:text-white transition-all">
              <span className="text-xs font-bold uppercase tracking-wider px-2">Review</span>
            </div>
          </Link>
        )}

        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <SummaryCard title="Total Revenue" amount={metrics.totalRevenue} icon={TrendingUp} colorClass="bg-green-100 text-green-600" />
          <SummaryCard title="Total Expenses" amount={metrics.totalExpense} icon={TrendingDown} colorClass="bg-red-100 text-red-600" />
          <SummaryCard title="Net Profit" amount={metrics.profit} icon={IndianRupee} colorClass="bg-blue-100 text-blue-600" />
          <SummaryCard title="Cash Balance" amount={metrics.balance} icon={Wallet} colorClass="bg-purple-100 text-purple-600" />
        </div>

        {/* Big Action Buttons (Received / Spent) */}
        <QuickActions onAddIncome={openIncomeModal} onAddExpense={openExpenseModal} />

        {/* Charts */}
        <ChartSection lineData={charts.lineChartData} pieData={charts.pieChartData} />

        {/* Business Performance Section */}
        <div className="bg-white rounded-[1.25rem] p-10 border border-gray-100 shadow-[0_10px_30px_-5px_rgba(0,0,0,0.04),0_4px_12px_-2px_rgba(0,0,0,0.03)] mb-10 overflow-hidden relative group hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.08),0_8px_16px_-4px_rgba(0,0,0,0.04)] transition-all duration-300">
            <div className="flex items-center gap-3 mb-10">
                <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100">
                    <BarChart3 size={24} />
                </div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tighter uppercase italic">Executive Performance</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Current Status</p>
                    <p className={`text-xl font-black flex items-center gap-2 ${
                        performance.status === 'Unstable' ? 'text-red-600' : 
                        performance.status === 'Moderate' ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                        {performance.status === 'Unstable' && <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse"></div>}
                        {performance.status}
                    </p>
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Revenue Trend</p>
                    <p className="text-xl font-black text-gray-700 tracking-tight">{performance.revenue}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Expense Control</p>
                    <p className="text-xl font-black text-gray-700 tracking-tight">{performance.expense}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Risk Level</p>
                    <p className={`text-xl font-black tracking-tight ${
                        performance.risk === 'High' ? 'text-red-600' : 
                        performance.risk === 'Medium' ? 'text-yellow-600' : 'text-green-600'
                    }`}>{performance.risk}</p>
                </div>
            </div>

            <div className={`mt-8 p-5 rounded-3xl border-2 border-dashed transition-colors ${
                performance.status === 'Unstable' ? 'bg-red-50 border-red-100' : 
                performance.status === 'Moderate' ? 'bg-yellow-50 border-yellow-100' : 'bg-green-50 border-green-100'
            }`}>
                <p className={`font-black text-xs uppercase tracking-widest mb-1 opacity-60 ${
                    performance.status === 'Unstable' ? 'text-red-700' : 
                    performance.status === 'Moderate' ? 'text-yellow-700' : 'text-green-700'
                }`}>AI Decision Summary</p>
                <p className={`font-bold text-sm leading-relaxed ${
                    performance.status === 'Unstable' ? 'text-red-800' : 
                    performance.status === 'Moderate' ? 'text-yellow-800' : 'text-green-800'
                }`}>
                    {performance.insight}
                </p>
            </div>
        </div>

        {/* Operational Metrics Section */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-finexa-text">Operational Performance</h2>
            <button 
              onClick={openOperationalModal}
              className="flex items-center gap-2 bg-white text-finexa-primary border border-finexa-primary hover:bg-finexa-primary hover:text-white px-4 py-2 rounded-xl font-bold text-xs transition-all shadow-sm"
            >
              <Plus size={14}/> Update Performance
            </button>
          </div>
          <OperationalMetrics metrics={data.opInsights?.metrics || {}} />
        </div>

        {/* Lower Grid (Insights, Health, TX List) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <HealthScore score={metrics.healthScore} />
          </div>
          <div className="lg:col-span-1">
            <InsightsPanel insights={insights} operationalInsights={data.opInsights?.insights} />
          </div>
          <div className="lg:col-span-1 h-[400px]">
            <TransactionList transactions={transactions} />
          </div>
        </div>

      </div>

      {/* Financial Transaction Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto transform transition-all scale-100 scrollbar-hide">
            <div className={`flex items-center gap-3 mb-6 ${txForm.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
              <div className={`p-3 rounded-full ${txForm.type === 'income' ? 'bg-green-100' : 'bg-red-100'}`}>
                {txForm.type === 'income' ? <ArrowUp size={24} strokeWidth={3} /> : <ArrowDown size={24} strokeWidth={3} />}
              </div>
              <h2 className="text-2xl font-extrabold text-gray-800">
                {txForm.type === 'income' ? 'Amount Received' : 'Amount Spent'}
              </h2>
            </div>

            <form onSubmit={submitTx} className="space-y-4">
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Amount (₹)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                     <span className="text-gray-500 font-bold text-lg">₹</span>
                  </div>
                  <input 
                    type="number" autoFocus required min="1"
                    value={txForm.amount}
                    onChange={(e) => setTxForm({...txForm, amount: e.target.value})}
                    className="w-full border-2 border-gray-200 rounded-xl pl-10 pr-4 py-3 text-lg font-bold text-gray-800 focus:ring-0 focus:border-finexa-primary outline-none transition-all shadow-sm"
                    placeholder="Enter amount"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category</label>
                {!showAddCategory ? (
                  <div className="flex gap-2">
                    <select 
                      value={txForm.category}
                      onChange={(e) => {
                        if (e.target.value === 'ADD_NEW') {
                          setShowAddCategory(true);
                        } else {
                          setTxForm({...txForm, category: e.target.value});
                        }
                      }}
                      className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-800 font-medium focus:ring-0 focus:border-finexa-primary outline-none transition-all shadow-sm bg-white"
                    >
                      {categories.filter(c => c.type === txForm.type).map(cat => (
                        <option key={cat._id} value={cat.name}>{cat.name}</option>
                      ))}
                      <option value="ADD_NEW" className="text-finexa-primary font-bold">+ Add New Category</option>
                    </select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        placeholder="New category name"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className="flex-1 border-2 border-finexa-primary rounded-xl px-4 py-2 outline-none"
                      />
                      <button 
                        type="button"
                        onClick={handleAddCategory}
                        className="bg-finexa-primary text-white px-4 py-2 rounded-xl font-bold"
                      >
                        Add
                      </button>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setShowAddCategory(false)}
                      className="text-finexa-muted text-xs hover:text-finexa-primary"
                    >
                      Back to list
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors">Cancel</button>
                <button type="submit" className={`flex-1 px-4 py-3 text-white font-bold rounded-xl shadow-md ${txForm.type === 'income' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>Confirm Transaction</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Operational Modal */}
      {showOpModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto transform transition-all scale-100 scrollbar-hide">
            <div className="flex items-center gap-3 mb-6 text-finexa-primary border-b border-gray-100 pb-4">
               <div className="p-3 bg-blue-50 rounded-full">
                  <Zap size={24} />
               </div>
               <h2 className="text-2xl font-extrabold text-gray-800">Operational Update</h2>
            </div>

            <form onSubmit={submitTx} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Total Orders / Bookings</label>
                  <input type="number" min="0" placeholder="0" value={txForm.ordersReceived} onChange={(e) => setTxForm({...txForm, ordersReceived: e.target.value})} className="w-full p-3 border-2 border-gray-100 rounded-xl outline-none focus:border-finexa-primary" />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Completed Work</label>
                  <input type="number" min="0" placeholder="0" value={txForm.ordersCompleted} onChange={(e) => setTxForm({...txForm, ordersCompleted: e.target.value})} className="w-full p-3 border-2 border-gray-100 rounded-xl outline-none focus:border-finexa-primary" />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Pending Work</label>
                  <input type="number" min="0" placeholder="0" value={txForm.pendingOrders} onChange={(e) => setTxForm({...txForm, pendingOrders: e.target.value})} className="w-full p-3 border-2 border-gray-100 rounded-xl outline-none focus:border-finexa-primary" />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Volume / Items Sold</label>
                  <input type="number" min="0" placeholder="0" value={txForm.itemsSold} onChange={(e) => setTxForm({...txForm, itemsSold: e.target.value})} className="w-full p-3 border-2 border-gray-100 rounded-xl outline-none focus:border-finexa-primary" />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Avg Delivery Time (Days)</label>
                  <input type="number" min="0" placeholder="0" value={txForm.deliveryTimeAvg} onChange={(e) => setTxForm({...txForm, deliveryTimeAvg: e.target.value})} className="w-full p-3 border-2 border-gray-100 rounded-xl outline-none focus:border-finexa-primary" />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Errors / Complaints</label>
                  <input type="number" min="0" placeholder="0" value={txForm.defects} onChange={(e) => setTxForm({...txForm, defects: e.target.value})} className="w-full p-3 border-2 border-gray-100 rounded-xl outline-none focus:border-finexa-primary" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Inventory / Stock Level (Optional)</label>
                  <input type="number" min="0" placeholder="0" value={txForm.inventoryLevel} onChange={(e) => setTxForm({...txForm, inventoryLevel: e.target.value})} className="w-full p-3 border-2 border-gray-100 rounded-xl outline-none focus:border-finexa-primary" />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowOpModal(false)} className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-3 bg-finexa-primary text-white font-bold rounded-xl shadow-md hover:bg-blue-700 transition-all">Update Performance</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <Chatbot />
    </div>
  );
};

export default Dashboard;
