import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { TrendingUp, BarChart3, Clock, AlertCircle } from 'lucide-react';
import SummaryCard from '../components/analysis/SummaryCard';
import TrendChart from '../components/analysis/TrendChart';
import DateFilter from '../components/analysis/DateFilter';
import InsightsPanel from '../components/analysis/InsightsPanel';

const Analysis = () => {
    const [range, setRange] = useState('30d');
    const [groupBy, setGroupBy] = useState('day');
    const [isAutoAdjusted, setIsAutoAdjusted] = useState(false);
    const [data, setData] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Auto-Interval Mapping Helper
    const getAutoInterval = (r) => {
        switch (r) {
            case '1h': return 'minute';
            case '24h': return 'hour';
            case '7d': return 'day';
            case '30d': return 'day';
            default: return 'day';
        }
    };

    const handleRangeChange = (newRange) => {
        setRange(newRange);
        const autoInterval = getAutoInterval(newRange);
        setGroupBy(autoInterval);
        setIsAutoAdjusted(true);
        // Reset auto flag after 3 seconds for UI feedback
        setTimeout(() => setIsAutoAdjusted(false), 3000);
    };

    const handleGroupByChange = (newGroupBy) => {
        setGroupBy(newGroupBy);
        setIsAutoAdjusted(false);
    };

    const fetchAnalysis = useCallback(async (isRefresh = false) => {
        if (!isRefresh) setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`http://localhost:5555/api/analysis?range=${range}&groupBy=${groupBy}`, {
                headers: { 'x-auth-token': token }
            });
            setData(res.data);
            setLoading(false);
            setError(null);
            console.log("Analysis Data Received:", res.data);
        } catch (err) {
            console.error('Error fetching analysis:', err);
            setError('Failed to load real-time analysis');
            setLoading(false);
        }
    }, [range, groupBy]);

    // Initial Fetch on filter change
    useEffect(() => {
        fetchAnalysis();
    }, [fetchAnalysis]);

    // Auto Refresh Logic (Every 10 seconds)
    useEffect(() => {
        const interval = setInterval(() => {
            fetchAnalysis(true);
        }, 10000);
        return () => clearInterval(interval);
    }, [fetchAnalysis]);

    if (error) return (
        <div className="flex items-center justify-center min-h-[80vh]">
            <div className="text-center p-8 bg-red-50 rounded-3xl border border-red-100 max-w-md">
                <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
                <h3 className="text-xl font-bold text-red-800 mb-2">Trend Analysis Error</h3>
                <p className="text-red-600 font-bold leading-relaxed">{error}</p>
                <button 
                  onClick={() => fetchAnalysis()}
                  className="mt-6 px-6 py-2.5 bg-red-600 text-white font-black rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-100"
                >
                  Retry Trend Analysis
                </button>
            </div>
        </div>
    );

    const { comparison = {}, trends = {}, operations = {}, categories = {}, cashflow = {}, predictions = [], executiveAdvisory } = data;
    const { trendData = [], summary = {}, insights = [] } = trends;

    // Priority Badge Color Helper
    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'HIGH': return 'bg-red-500 text-white border-red-400';
            case 'MEDIUM': return 'bg-yellow-500 text-white border-yellow-400';
            default: return 'bg-green-500 text-white border-green-400';
        }
    };

    return (
        <div className="min-h-full bg-gray-50 p-4 md:p-8 font-sans pb-20">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                            Trend Analysis
                            <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-600 rounded-full border border-green-100">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse"></div>
                                <span className="text-[10px] font-black uppercase tracking-widest">Live Sync</span>
                            </div>
                        </h1>
                        <p className="text-gray-500 font-bold mt-1 uppercase tracking-widest text-[10px]">Advanced business trend insights and analytics</p>
                    </div>
                </div>

                {/* Filters Section */}
                <DateFilter 
                  range={range} 
                  handleRangeChange={handleRangeChange} 
                  groupBy={groupBy} 
                  handleGroupByChange={handleGroupByChange}
                  isAutoAdjusted={isAutoAdjusted}
                />

                {loading && trendData.length === 0 ? (
                  <div className="flex items-center justify-center min-h-[40vh]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                  </div>
                ) : (
                  <>
                    {/* Comparison Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <SummaryCard title="Income Change" trend={comparison.incomeChange || 0} suffix="%" />
                        <SummaryCard title="Expense Change" trend={comparison.expenseChange || 0} suffix="%" />
                        <SummaryCard title="Profit Change" trend={comparison.profitChange || 0} suffix="%" />
                    </div>

                    {/* Main Chart */}
                    <div className="mt-8">
                      <TrendChart 
                        data={trendData} 
                        title={`Performance Trends (${range.toUpperCase()} / ${groupBy.toUpperCase()})`} 
                      />
                    </div>

                    {/* Insights & Advisory Section */}
                    <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-8">
                          {/* Top row insights */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">📈 Trend Insights</h3>
                              <div className="space-y-3">
                                {insights.map((i, idx) => (
                                  <div key={idx} className={`p-3.5 rounded-xl border text-sm font-medium ${i.type === 'positive' ? 'bg-green-50 border-green-100 text-green-800' : i.type === 'warning' ? 'bg-yellow-50 border-yellow-100 text-yellow-800' : i.type === 'critical' ? 'bg-red-50 border-red-100 text-red-800' : 'bg-blue-50 border-blue-100 text-blue-800'}`}>
                                    {i.message}
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">🔮 Future Predictions</h3>
                              <div className="space-y-3">
                                {predictions.map((i, idx) => (
                                  <div key={idx} className={`p-3.5 rounded-xl border text-sm font-medium ${i.type === 'positive' ? 'bg-green-50 border-green-100 text-green-800' : i.type === 'info' ? 'bg-blue-50 border-blue-100 text-blue-800' : 'bg-yellow-50 border-yellow-100 text-yellow-800'}`}>
                                    {i.message}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Middle row insights */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">⚙️ Operational Performance</h3>
                              <div className="space-y-3">
                                {(operations.insights || []).map((i, idx) => (
                                  <div key={idx} className={`p-3.5 rounded-xl border text-sm font-medium ${i.type === 'positive' ? 'bg-green-50 border-green-100 text-green-800' : 'bg-yellow-50 border-yellow-100 text-yellow-800'}`}>
                                    {i.message}
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">📊 Category Tracking</h3>
                              <div className="space-y-3">
                                {(categories.insights || []).map((i, idx) => (
                                  <div key={idx} className={`p-3.5 rounded-xl border text-sm font-medium ${i.type === 'positive' ? 'bg-green-50 border-green-100 text-green-800' : i.type === 'info' ? 'bg-blue-50 border-blue-100 text-blue-800' : 'bg-yellow-50 border-yellow-100 text-yellow-800'}`}>
                                    {i.message}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Bottom cash row */}
                          <div className="w-full bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                              <h3 className="font-bold text-gray-800 flex items-center gap-2">💸 Cash Flow Intelligence</h3>
                              <div className="text-gray-500 text-xs font-bold uppercase tracking-wider bg-gray-50 px-3 py-1.5 rounded-lg">
                                Avg Burn Rate: ₹{(cashflow.avgDailyExpense || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}/day
                              </div>
                            </div>
                            <div className="space-y-3">
                              {(cashflow.insights || []).map((i, idx) => (
                                <div key={idx} className={`p-4 rounded-xl border text-sm font-bold ${i.type === 'critical' ? 'bg-red-50 border-red-100 text-red-800' : i.type === 'warning' ? 'bg-yellow-50 border-yellow-100 text-yellow-800' : 'bg-green-50 border-green-100 text-green-800'}`}>
                                  {i.message}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group lg:col-span-1 h-fit">
                            <div className="absolute top-0 right-0 p-4">
                                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-xl ${getPriorityColor(executiveAdvisory?.priority)}`}>
                                    Priority: {executiveAdvisory?.priority}
                                </span>
                            </div>
                            
                            <div className="flex items-center gap-3 mb-8">
                                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                                    <TrendingUp size={24} />
                                </div>
                                <h2 className="text-xl font-black italic tracking-tight text-gray-800">Executive Advisory</h2>
                            </div>
                            
                            <div className="space-y-6">
                                {/* Health Status */}
                                <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                                    <p className="text-indigo-600 text-[10px] font-black uppercase tracking-widest mb-1">Business Health</p>
                                    <p className="font-bold text-gray-800 leading-relaxed text-sm">
                                        {executiveAdvisory?.health}
                                    </p>
                                </div>

                                {/* Dynamic Cards Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {/* Warnings */}
                                    {executiveAdvisory?.warnings?.length > 0 && executiveAdvisory.warnings.map((w, i) => (
                                        <div key={i} className="p-4 bg-red-50 border border-red-100 rounded-2xl">
                                            <p className="text-[8px] font-black text-red-600 uppercase mb-1 tracking-widest">Warning</p>
                                            <p className="text-[11px] font-bold text-red-800 leading-tight">{w}</p>
                                        </div>
                                    ))}
                                    
                                    {/* Suggestions */}
                                    {executiveAdvisory?.suggestions?.length > 0 && executiveAdvisory.suggestions.map((s, i) => (
                                        <div key={i} className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                                            <p className="text-[8px] font-black text-blue-600 uppercase mb-1 tracking-widest">Actionable Suggestion</p>
                                            <p className="text-[11px] font-bold text-blue-800 leading-tight">{s}</p>
                                        </div>
                                    ))}

                                    {/* Opportunities */}
                                    {executiveAdvisory?.opportunities?.length > 0 && executiveAdvisory.opportunities.map((o, i) => (
                                        <div key={i} className="p-4 bg-green-50 border border-green-100 rounded-2xl">
                                            <p className="text-[8px] font-black text-green-600 uppercase mb-1 tracking-widest">Growth Opportunity</p>
                                            <p className="text-[11px] font-bold text-green-800 leading-tight">{o}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            <button className="w-full mt-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg hover:bg-indigo-700 transition-all uppercase tracking-widest text-[10px]">
                                Download Strategic Report
                            </button>
                        </div>
                    </div>
                  </>
                )}
            </div>
        </div>
    );
};

export default Analysis;
