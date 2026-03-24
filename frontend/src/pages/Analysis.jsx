import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { TrendingUp, BarChart3, Clock, AlertCircle, Zap, Activity, ShieldCheck, Truck } from 'lucide-react';
import SummaryCard from '../components/analysis/SummaryCard';
import TrendChart from '../components/analysis/TrendChart';
import DateFilter from '../components/analysis/DateFilter';
import InsightsPanel from '../components/analysis/InsightsPanel';

const Analysis = () => {
    const { t } = useTranslation();
    const [range, setRange] = useState('30d');
    const [groupBy, setGroupBy] = useState('day');
    const [isAutoAdjusted, setIsAutoAdjusted] = useState(false);
    const [data, setData] = useState({});
    const [patterns, setPatterns] = useState([]);
    const [trendInsights, setTrendInsights] = useState([]);
    const [performanceStatus, setPerformanceStatus] = useState(null);
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
            const [res, patternsRes] = await Promise.all([
               axios.get(`http://localhost:5555/api/analysis?range=${range}&groupBy=${groupBy}`, { headers: { 'x-auth-token': token } }),
               axios.get(`http://localhost:5555/api/analysis/operations`, { headers: { 'x-auth-token': token } })
            ]);
            setData(res.data);
            setPatterns(patternsRes.data);
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

    useEffect(() => {
        fetch(`http://localhost:5555/api/analysis/trends?range=${range}&groupBy=${groupBy}`, {
            headers: { 'x-auth-token': localStorage.getItem('token') }
        })
        .then(res => res.json())
        .then(data => {
            setTrendInsights(data.insights || []);
            setPerformanceStatus(data.performance);
        })
        .catch(() => {
            setTrendInsights([]);
            setPerformanceStatus(null);
        });
    }, [range, groupBy]);

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
    const perfDisplay = performanceStatus || data.performance || {};
    const { trendData = [], summary = {}, insights = [] } = trends;

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'HIGH': return 'bg-red-500 text-white border-red-400';
            case 'MEDIUM': return 'bg-yellow-500 text-white border-yellow-400';
            default: return 'bg-green-500 text-white border-green-400';
        }
    };

    const downloadReport = () => {
        const token = localStorage.getItem('token');
        window.open(`http://localhost:5555/api/report/download?token=${token}`, "_blank");
    };

    return (
        <div className="min-h-full bg-finexa-bg pb-20">
            <div className="section-container space-y-12">
                {/* Header */}
        <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic">
                            {t('analysis.title')}
                        </h1>
                        <div className="flex items-center gap-2 mt-2">
                             <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-600 rounded-full border border-green-100">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse"></div>
                                <span className="text-[10px] font-black uppercase tracking-widest">Baseline Sync</span>
                            </div>
                            <p className="text-gray-400 font-black uppercase tracking-[0.2em] text-[9px] opacity-80">{t('analysis.subtitle')}</p>
                        </div>
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
                  <div className="space-y-12">
                    {/* 1. Main Graph */}
                    <div className="mt-4">
                      <TrendChart 
                        data={trendData} 
                        title={`Real-Time Performance Trends (${range.toUpperCase()})`} 
                      />
                    </div>

                    {/* 2. Performance Indicators */}
                    <div className="mt-8">
                        <h3 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-2">
                             <Activity className="text-indigo-600" size={24} /> Performance Indicators
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                                { label: 'Efficiency', value: perfDisplay.efficiency, icon: Zap, color: perfDisplay.efficiency === 'Good' ? 'text-green-600 bg-green-50' : perfDisplay.efficiency === 'Average' ? 'text-yellow-600 bg-yellow-50' : 'text-red-600 bg-red-50' },
                                { label: 'Workload', value: perfDisplay.workload, icon: BarChart3, color: perfDisplay.workload === 'Low' ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50' },
                                { label: 'Quality', value: perfDisplay.quality, icon: ShieldCheck, color: perfDisplay.quality === 'Good' ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50' },
                                { label: 'Delivery', value: perfDisplay.delivery, icon: Truck, color: perfDisplay.delivery === 'Fast' ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50' }
                            ].map((item, idx) => (
                                <div key={idx} className="business-card p-6 flex items-center gap-4">
                                    <div className={`p-3 rounded-2xl ${item.color.split(' ')[1]} ${item.color.split(' ')[0]}`}>
                                        <item.icon size={24} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">{item.label}</p>
                                        <p className={`text-xl font-black tracking-tight ${item.color.split(' ')[0]}`}>{item.value || 'N/A'}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 3. Trend Insights */}
                    <div className="mt-8 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                        <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2 text-xl">
                            <TrendingUp className="text-indigo-600" size={24} /> Dynamic Trend Insights
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {trendInsights.length > 0 ? (
                                trendInsights.map((item, index) => (
                                <div key={index} className="p-4 rounded-2xl border bg-gray-50 border-gray-100 text-gray-700 text-sm font-bold shadow-sm transition-all hover:bg-white hover:border-indigo-100">
                                    {item.message}
                                </div>
                                ))
                            ) : (
                                <p className="text-gray-500 text-sm font-medium italic col-span-full">
                                Not enough data to generate trends
                                </p>
                            )}
                        </div>
                    </div>

                    {/* 4. Comparison Cards */}
                    <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <SummaryCard title="Income Change" trend={comparison.incomeChange || 0} suffix="%" />
                        <SummaryCard title="Expense Change" trend={comparison.expenseChange || 0} suffix="%" />
                        <SummaryCard title="Profit Change" trend={comparison.profitChange || 0} suffix="%" />
                    </div>

                    {/* 5, 6 & Advisory. Category Analysis, Operational Patterns & Executive Advisory */}
                    <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-8">
                            {/* Category Analysis */}
                            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-lg">
                                    <BarChart3 className="text-indigo-600" size={20} /> Category Analysis
                                </h3>
                                <div className="space-y-3">
                                {(categories.insights || []).map((i, idx) => (
                                    <div key={idx} className={`p-3.5 rounded-xl border text-sm font-medium ${i.type === 'positive' ? 'bg-green-50 border-green-100 text-green-800' : i.type === 'info' ? 'bg-blue-50 border-blue-100 text-blue-800' : 'bg-yellow-50 border-yellow-100 text-yellow-800'}`}>
                                    {i.message}
                                    </div>
                                ))}
                                </div>
                            </div>

                            {/* Operational Patterns */}
                            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-lg">
                                    <Clock className="text-indigo-600" size={20} /> Operational Patterns
                                </h3>
                                <div className="space-y-3">
                                {patterns && patterns.length > 0 && patterns[0].message !== "No operational patterns available" ? (
                                    patterns.map((item, i) => (
                                    <div key={i} className="pattern-card p-3.5 rounded-xl border bg-yellow-50 border-yellow-100 text-yellow-800 text-sm font-medium">
                                        {item.message}
                                    </div>
                                    ))
                                ) : (
                                    <div className="text-[12px] text-gray-500 italic p-4 bg-gray-50 rounded-xl border border-gray-100">No operational patterns available</div>
                                )}
                                </div>
                            </div>
                        </div>

                        {/* Executive Advisory */}
                        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group h-fit">
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
                                <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                                    <p className="text-indigo-600 text-[10px] font-black uppercase tracking-widest mb-1">Business Health</p>
                                    <p className="font-bold text-gray-800 leading-relaxed text-sm">
                                        {executiveAdvisory?.health}
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 gap-3">
                                    {executiveAdvisory?.warnings?.length > 0 && executiveAdvisory.warnings.map((w, i) => (
                                        <div key={i} className="p-4 bg-red-50 border border-red-100 rounded-2xl">
                                            <p className="text-[8px] font-black text-red-600 uppercase mb-1 tracking-widest">Warning</p>
                                            <p className="text-[11px] font-bold text-red-800 leading-tight">{w}</p>
                                        </div>
                                    ))}
                                    
                                    {executiveAdvisory?.suggestions?.length > 0 && executiveAdvisory.suggestions.map((s, i) => (
                                        <div key={i} className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                                            <p className="text-[8px] font-black text-blue-600 uppercase mb-1 tracking-widest">Suggestion</p>
                                            <p className="text-[11px] font-bold text-blue-800 leading-tight">{s}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            <button onClick={downloadReport} className="w-full mt-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg hover:bg-indigo-700 transition-all uppercase tracking-widest text-[10px]">
                                Download Strategic Report
                            </button>
                        </div>
                    </div>

                    {/* 7. Cash Flow Intelligence */}
                    <div className="mt-8 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm mb-10">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                            <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">💸 Cash Flow Intelligence</h3>
                            <div className="text-gray-500 text-xs font-bold uppercase tracking-wider bg-gray-50 px-3 py-2 rounded-xl border border-gray-100">
                            Avg Burn Rate: ₹{(cashflow.avgDailyExpense || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}/day
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className={`p-6 rounded-3xl border flex flex-col sm:flex-row sm:items-center justify-between gap-6 transition-all ${cashflow.daysLeft < 7 ? 'bg-red-50 border-red-100' : cashflow.daysLeft < 20 ? 'bg-yellow-50 border-yellow-100' : 'bg-green-50 border-green-100'}`}>
                            <div className="flex items-center gap-4">
                                <div className={`p-4 rounded-2xl bg-white/60 shadow-sm`}>
                                <Clock size={28} className={cashflow.daysLeft < 7 ? 'text-red-600' : cashflow.daysLeft < 20 ? 'text-yellow-600' : 'text-green-600'} />
                                </div>
                                <div>
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Cash Sustainability Status</p>
                                <p className="text-xl font-black">{cashflow.status}</p>
                                </div>
                            </div>
                            <div className="text-right bg-white/40 p-4 rounded-2xl border border-white/60">
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Cash will last approximately</p>
                                <p className="text-3xl font-black">{Math.floor(cashflow.daysLeft || 0)} Days</p>
                            </div>
                            </div>
                        </div>
                    </div>
                  </div>
                )}
            </div>
        </div>
    );
};

export default Analysis;
