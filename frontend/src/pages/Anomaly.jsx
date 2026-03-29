import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';
import { useTranslation } from 'react-i18next';
import {
  RefreshCcw, AlertTriangle, CheckCircle, Loader2, TrendingUp, TrendingDown,
  Info, ShieldAlert, Sparkles, BrainCircuit, Activity, Lightbulb, ArrowRight, X, Check
} from 'lucide-react';
import AnomalyChart from '../components/anomaly/AnomalyChart';

// ─────────────────────────────────────────────────────────────────────────────
// DYNAMIC STRATEGY ENGINE
// Returns a fully context-aware strategy object based on anomaly data.
// Extendable: add new anomalyType cases to cover future detection patterns.
// ─────────────────────────────────────────────────────────────────────────────

const COLOR_THEMES = {
  red:    { bg: 'bg-red-600',    light: 'bg-red-50',    border: 'border-red-100',    text: 'text-red-700',    badge: 'bg-red-100 text-red-700',    accent: '#dc2626' },
  orange: { bg: 'bg-orange-500', light: 'bg-orange-50', border: 'border-orange-100', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-700', accent: '#f97316' },
  blue:   { bg: 'bg-blue-600',   light: 'bg-blue-50',   border: 'border-blue-100',   text: 'text-blue-700',   badge: 'bg-blue-100 text-blue-700',   accent: '#2563eb' },
  purple: { bg: 'bg-purple-600', light: 'bg-purple-50', border: 'border-purple-100', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-700', accent: '#7c3aed' },
  amber:  { bg: 'bg-amber-500',  light: 'bg-amber-50',  border: 'border-amber-100',  text: 'text-amber-700',  badge: 'bg-amber-100 text-amber-700',  accent: '#d97706' },
};

/**
 * getStrategyForAnomaly(anomaly)
 * ─────────────────────────────
 * Maps an anomaly object to a fully dynamic strategy:
 *   { title, subtitle, color, icon, steps[] }
 *
 * Priority: anomalyType > derived from type+amount > fallback
 */
function getStrategyForAnomaly(anomaly) {
  if (!anomaly) return null;

  const { anomalyType, type, amount, category, severity, explanation } = anomaly;
  const fmt  = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
  const cat  = category ? `"${category}"` : 'this category';

  // ── 1. HIGH_EXPENSE ────────────────────────────────────────────────────────
  if (anomalyType === 'HIGH_EXPENSE' || (type === 'expense' && amount > 100000)) {
    return {
      title:    'High Expense Alert',
      subtitle: `${fmt(amount)} exceeded the ₹1,00,000 threshold — immediate review required.`,
      colorKey: 'red',
      icon:     '🚨',
      steps: [
        {
          icon: '🔍',
          action: 'Verify the transaction legitimacy',
          detail: `Pull the original invoice or receipt for this ${fmt(amount)} charge and confirm it is authorised.`,
        },
        {
          icon: '📞',
          action: 'Contact the vendor immediately',
          detail: 'Reach out to the supplier, request a breakdown of charges, and ask for a credit note if overcharged.',
        },
        {
          icon: '📊',
          action: 'Compare against 3-month history',
          detail: `Check whether similar ${cat} expenses were significantly lower in the prior 90 days.`,
        },
        {
          icon: '💰',
          action: 'Revise budget cap for this category',
          detail: `Update your monthly ceiling for ${cat} and set an alert for any future amount exceeding ${fmt(amount * 0.8)}.`,
        },
        {
          icon: '🔒',
          action: 'Enforce approval workflow',
          detail: 'Require dual-approval for any single transaction above ₹75,000 going forward to prevent recurrence.',
        },
      ],
    };
  }

  // ── 2. SPIKE_PATTERN ───────────────────────────────────────────────────────
  if (anomalyType === 'SPIKE_PATTERN') {
    return {
      title:    'Sudden Spending Spike',
      subtitle: explanation || `${fmt(amount)} is significantly above your typical spending baseline.`,
      colorKey: 'orange',
      icon:     '📈',
      steps: [
        {
          icon: '📋',
          action: 'Identify the spike root cause',
          detail: `Cross-reference this ${fmt(amount)} transaction with pending project milestones, contracts, or one-off events.`,
        },
        {
          icon: '📉',
          action: 'Compare with 30-day rolling average',
          detail: 'Pull a 30-day expense report for the same category and compute the deviation percentage.',
        },
        {
          icon: '🔁',
          action: 'Check for accidental duplicate payments',
          detail: 'Verify no duplicate invoice was processed around the same date or period.',
        },
        {
          icon: '📅',
          action: 'Plan spending smoothing',
          detail: 'If the spike is periodic (quarterly/annual), amortise it across months in your forecast model.',
        },
        {
          icon: '⚙️',
          action: 'Update anomaly threshold',
          detail: `If this is an expected pattern, recalibrate the ML model's baseline to avoid repeated alerts.`,
        },
      ],
    };
  }

  // ── 3. INCOME_DROP ─────────────────────────────────────────────────────────
  if (anomalyType === 'INCOME_DROP' || type === 'income') {
    return {
      title:    'Revenue Drop Detected',
      subtitle: explanation || `Income of ${fmt(amount)} is below expected levels — cashflow risk identified.`,
      colorKey: 'blue',
      icon:     '📉',
      steps: [
        {
          icon: '📋',
          action: 'Audit outstanding receivables',
          detail: 'Pull a list of all unpaid invoices older than 15 days and prioritise immediate follow-up.',
        },
        {
          icon: '📞',
          action: 'Follow up with key clients',
          detail: 'Contact top-5 revenue clients directly to ensure payment schedules are on track.',
        },
        {
          icon: '📈',
          action: 'Review your sales pipeline',
          detail: 'Identify deals at risk of delay or churn and accelerate conversion on high-probability leads.',
        },
        {
          icon: '🎯',
          action: 'Launch a short-term revenue campaign',
          detail: 'Offer limited-time bundles or discounts to accelerate near-term cash inflows.',
        },
        {
          icon: '🔄',
          action: 'Diversify revenue sources',
          detail: 'Evaluate adding a new income stream (subscription, retainer, affiliate) to reduce revenue concentration risk.',
        },
      ],
    };
  }

  // ── 4. FREQUENT_TRANSACTIONS ───────────────────────────────────────────────
  if (anomalyType === 'FREQUENT_TRANSACTIONS') {
    return {
      title:    'Unusual Transaction Frequency',
      subtitle: `Multiple transactions detected in ${cat} within a short window — possible duplication or automation error.`,
      colorKey: 'purple',
      icon:     '⚡',
      steps: [
        {
          icon: '🔁',
          action: 'Scan for duplicate payments',
          detail: `Filter all ${cat} transactions from the past 7 days and identify any with the same amount or vendor.`,
        },
        {
          icon: '🤖',
          action: 'Review automation & recurring rules',
          detail: 'Check your payment automation (standing orders, APIs, billing tools) for misconfigured triggers.',
        },
        {
          icon: '📋',
          action: 'Audit recent transaction log',
          detail: 'Pull a detailed ledger for the impacted category and manually verify each entry against source documents.',
        },
        {
          icon: '🔒',
          action: 'Add frequency-based spending guard',
          detail: `Set a rule: block more than 3 transactions in ${cat} within any 72-hour period pending manual approval.`,
        },
        {
          icon: '📞',
          action: 'Contact vendor / payment processor',
          detail: 'If a vendor-side error caused repeated charges, initiate a dispute and request refund confirmation.',
        },
      ],
    };
  }

  // ── 5. UNUSUAL_CATEGORY ────────────────────────────────────────────────────
  if (anomalyType === 'UNUSUAL_CATEGORY') {
    return {
      title:    'Category Deviation Detected',
      subtitle: `A transaction of ${fmt(amount)} in ${cat} is outside your normal spending pattern.`,
      colorKey: 'amber',
      icon:     '🔮',
      steps: [
        {
          icon: '📊',
          action: 'Benchmark against category history',
          detail: `Compare this ${fmt(amount)} entry in ${cat} against the same category over the last 6 months.`,
        },
        {
          icon: '✅',
          action: 'Validate business necessity',
          detail: `Confirm with the approver that this ${cat} expense was explicitly authorised and budgeted.`,
        },
        {
          icon: '🗂️',
          action: 'Check if category is miscoded',
          detail: 'The transaction might be correctly categorised elsewhere — verify the accounting code mapping.',
        },
        {
          icon: '💰',
          action: 'Reallocate budget if legitimate',
          detail: `If necessary, shift budget from an underspent category to cover ${cat} without breaching overall limits.`,
        },
        {
          icon: '🚦',
          action: 'Flag category for enhanced monitoring',
          detail: `Add ${cat} to your high-attention list so all future transactions above ${fmt(amount * 0.5)} trigger alerts.`,
        },
      ],
    };
  }

  // ── Fallback (should rarely be reached) ──────────────────────────────────
  return {
    title:    'Financial Anomaly Detected',
    subtitle: explanation || `An unusual pattern of ${fmt(amount)} was identified and requires review.`,
    colorKey: type === 'income' ? 'blue' : 'red',
    icon:     '⚠️',
    steps: [
      { icon: '🔍', action: 'Review the transaction',      detail: 'Verify the charge is legitimate against source documents.' },
      { icon: '📞', action: 'Contact the relevant party', detail: 'Reach out to the vendor or client for clarification.' },
      { icon: '📊', action: 'Compare with past patterns', detail: 'Check similar transactions over the last 90 days.' },
      { icon: '💰', action: 'Adjust budget or forecast',  detail: 'Update projections to account for this deviation.' },
      { icon: '✅', action: 'Implement a control',        detail: 'Add an approval gate for similar future transactions.' },
    ],
  };
}

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast = ({ message, onDone }) => {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[999] animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex items-center gap-3 bg-gray-900 text-white px-6 py-4 rounded-2xl shadow-2xl">
        <div className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center shrink-0">
          <Check size={14} strokeWidth={3} />
        </div>
        <p className="font-black text-sm">{message}</p>
      </div>
    </div>
  );
};

// ─── Resolution Modal ─────────────────────────────────────────────────────────
// Calls getStrategyForAnomaly() at render time so every modal is unique.
const ResolutionModal = ({ anomaly, onConfirm, onClose, loading }) => {
  const strategy = getStrategyForAnomaly(anomaly);
  if (!strategy) return null;

  const theme = COLOR_THEMES[strategy.colorKey] || COLOR_THEMES.red;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`${theme.bg} px-8 py-6 text-white`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{strategy.icon}</span>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">
                  AI-Generated Strategy · {anomaly?.anomalyType || 'Anomaly'}
                </p>
              </div>
              <h2 className="text-2xl font-black tracking-tight leading-tight">{strategy.title}</h2>
              <p className="text-white/75 text-xs font-bold mt-2 leading-relaxed">{strategy.subtitle}</p>
              <p className="text-white/50 text-[10px] font-black mt-2 uppercase tracking-widest">
                {new Date(anomaly?.date).toLocaleDateString(undefined, { dateStyle: 'long' })}
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors mt-1 shrink-0">
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Steps */}
        <div className="p-6 space-y-3 max-h-[50vh] overflow-y-auto">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${theme.bg}`} />
            Resolution Playbook — {strategy.steps.length} Actions
          </p>
          {strategy.steps.map((step, i) => (
            <div key={i} className={`flex items-start gap-4 p-4 rounded-2xl ${theme.light} border ${theme.border} transition-all hover:shadow-sm`}>
              <div className="text-xl shrink-0 w-8 text-center">{step.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${theme.badge}`}>
                    Step {i + 1}
                  </span>
                  <p className={`font-black text-sm ${theme.text}`}>{step.action}</p>
                </div>
                <p className="text-xs font-medium text-gray-500 leading-snug">{step.detail}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-4 bg-gray-100 text-gray-700 font-black rounded-2xl hover:bg-gray-200 transition-colors text-sm">
            Skip for Now
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 py-4 bg-gray-900 text-white font-black rounded-2xl hover:bg-black transition-all shadow-lg text-sm flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
            {loading ? 'Resolving...' : 'Mark as Resolved'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const Anomaly = () => {
  const { t } = useTranslation();

  const [data, setData] = useState({
    anomalies: [], aiSummary: '', riskScore: 0,
    riskLevel: 'Low', recommendations: [], trendInsight: ''
  });
  const [resolvedIds, setResolvedIds] = useState(new Set());
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated,setLastUpdated]= useState(new Date());

  // Resolution modal
  const [modal,         setModal]         = useState(null);   // anomaly object
  const [resolveLoading,setResolveLoading]= useState(false);

  // Toast
  const [toast, setToast] = useState('');

  const isFetchingRef = useRef(false);

  // ── Fetch ────────────────────────────────────────────────────
  const fetchAnomalies = useCallback(async (isAuto = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (!isAuto) setRefreshing(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/anomaly`, {
        headers: { 'x-auth-token': token },
        timeout: 10000
      });
      setData(response.data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('[AI Engine] Error fetching anomalies:', err.message);
      setData(prev => {
        if (!prev.anomalies || prev.anomalies.length === 0)
          setError('⚠️ ML service is currently offline');
        return prev;
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchAnomalies();
    const interval = setInterval(() => fetchAnomalies(true), 10000);
    return () => clearInterval(interval);
  }, [fetchAnomalies]);

  const handleManualRefresh = () => {
    if (refreshing || isFetchingRef.current) return;
    fetchAnomalies(false);
  };

  // ── Implement Strategy (open modal) ─────────────────────────
  const handleImplement = (item) => {
    setModal(item);
  };

  // ── Confirm resolution ───────────────────────────────────────
  const handleResolve = async () => {
    if (!modal) return;
    const anomalyId = modal.id || modal._id; // consistent id field
    setResolveLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/api/anomaly/resolve/${anomalyId}`,
        { actionTaken: STRATEGIES[modal.type]?.title || 'Strategy Implemented' },
        { headers: { 'x-auth-token': token } }
      );

      // Update local state — mark as resolved, do NOT remove
      setResolvedIds(prev => new Set([...prev, anomalyId]));
      setData(prev => ({
        ...prev,
        anomalies: prev.anomalies.map(a =>
          (a.id === anomalyId || a._id === anomalyId) ? { ...a, isResolved: true } : a
        )
      }));

      setModal(null);
      setToast('Anomaly resolved successfully ✓');
    } catch (err) {
      console.error('Resolve error:', err.message);
      setToast('Failed to resolve. Please try again.');
    } finally {
      setResolveLoading(false);
    }
  };

  // ── Derived state ───────────────────────────────────────────
  const allAnomalies    = data.anomalies || [];
  const flaggedAnomalies = allAnomalies.filter(a => a.anomaly === 1);
  const activeAnomalies  = flaggedAnomalies.filter(a => !a.isResolved);
  const resolvedAnomalies = flaggedAnomalies.filter(a => a.isResolved);
  const allResolved = flaggedAnomalies.length > 0 && activeAnomalies.length === 0;
  const noAnomalies = flaggedAnomalies.length === 0;

  // Dynamic insight message
  const insightText = allResolved
    ? 'System Stable — All anomalies resolved.'
    : noAnomalies
      ? 'System Stable — No unusual transactions detected.'
      : `Unusual transactions detected — ${activeAnomalies.length} require attention.`;

  const getSeverityStyles = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'high':   return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'low':    return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default:       return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getRiskColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'high':   return 'text-red-600 bg-red-50 border-red-100';
      case 'medium': return 'text-orange-600 bg-orange-50 border-orange-100';
      default:       return 'text-green-600 bg-green-50 border-green-100';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="relative">
          <Loader2 className="w-16 h-16 text-indigo-600 animate-spin" />
          <BrainCircuit className="w-8 h-8 text-indigo-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <p className="text-gray-600 font-bold mt-6 text-lg tracking-tight">Financial Intelligence Engine Active</p>
        <p className="text-gray-400 text-xs mt-2 uppercase font-black tracking-widest">Running Isolation Forest + AI Decision Layer</p>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-finexa-bg pb-24">
      <div className="section-container space-y-12">

        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic">{t('anomaly.title')}</h1>
              <div className={`px-4 py-2 rounded-2xl border-2 font-black text-sm flex items-center gap-2 shadow-sm ${getRiskColor(data.riskLevel)}`}>
                <Activity size={18} />
                RISK: {data.riskScore}/100
              </div>
            </div>
            <p className="text-[9px] text-indigo-600 mt-2 font-black uppercase tracking-[0.3em] opacity-80 flex items-center gap-3">
              Probabilistic Deviation Monitoring & ML Mitigation
              <span className="text-[9px] uppercase font-black tracking-widest bg-white/50 border border-gray-100 px-2 py-0.5 rounded text-gray-400">
                Uptime: {lastUpdated.toLocaleTimeString()}
              </span>
            </p>
          </div>
          <button onClick={handleManualRefresh} disabled={refreshing}
            className="w-full lg:w-auto flex items-center justify-center gap-3 bg-gray-900 text-white px-8 py-4 rounded-[2rem] hover:bg-black transition-all shadow-2xl shadow-indigo-100 disabled:opacity-50 font-black tracking-tight">
            <RefreshCcw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'AI PROCESSING...' : 'REFRESH AI ANALYSIS'}
          </button>
        </div>

        {error ? (
          <div className="bg-red-50 border-2 border-red-100 p-8 rounded-[3rem] text-center">
            <ShieldAlert size={64} className="text-red-500 mx-auto mb-4" />
            <h3 className="text-2xl font-black text-red-900 mb-2 uppercase italic">ML Pipeline Interrupted</h3>
            <p className="text-red-700 font-bold mb-6">{error}</p>
            <button onClick={handleManualRefresh} className="px-8 py-3 bg-red-600 text-white font-black rounded-2xl hover:bg-red-700 transition-all">Retry Analysis</button>
          </div>
        ) : (
          <div className="space-y-10">

            {/* AI Insight Summary */}
            <div className="bg-indigo-600 rounded-[3rem] p-8 md:p-10 shadow-3xl relative overflow-hidden text-white group">
              <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:scale-110 transition-transform duration-500">
                <BrainCircuit size={180} />
              </div>
              <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                <div className="bg-white/20 backdrop-blur-md p-6 rounded-[2rem] border border-white/30 transform -rotate-3 group-hover:rotate-0 transition-all">
                  <Sparkles className="w-12 h-12 text-white" />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-200 mb-3 block">Executive AI Insight</span>
                  <h2 className="text-3xl md:text-4xl font-black tracking-tighter mb-4 leading-[1.1]">
                    {data.aiSummary || 'No significant patterns identified in current data stream.'}
                  </h2>
                  <div className="flex flex-wrap justify-center md:justify-start gap-4">
                    <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl text-xs font-black border border-white/10">
                      <Activity size={14} /> {activeAnomalies.length} Active &middot; {resolvedAnomalies.length} Resolved
                    </div>
                    <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl text-xs font-black border border-white/10">
                      <TrendingUp size={14} /> Volatility Index: {data.riskScore}%
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              {/* Chart + Trend */}
              <div className="lg:col-span-2 space-y-10">
                <AnomalyChart data={allAnomalies} />

                <div className="bg-white p-8 rounded-[2.5rem] border-2 border-gray-50 shadow-xl shadow-indigo-50/20 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                      <TrendingUp className="text-indigo-600" size={24} />
                      <h3 className="text-lg font-black uppercase tracking-widest text-gray-900 leading-none mt-1">Real-time Trend Insight</h3>
                    </div>
                    <p className="text-2xl font-black text-gray-700 tracking-tight leading-snug">
                    {allResolved
                      ? 'System Stable — All anomalies have been resolved.'
                      : noAnomalies
                        ? 'No unusual transactions detected in current observation window.'
                        : (data.trendInsight || insightText)}
                  </p>
                  </div>
                </div>
              </div>

              {/* AI Recommendations */}
              <div className="lg:col-span-1">
                <div className="bg-white p-8 rounded-[2.5rem] border-2 border-indigo-50 shadow-2xl shadow-indigo-50/40 h-full">
                  <div className="flex items-center gap-3 mb-8 border-b border-gray-50 pb-6">
                    <div className="bg-indigo-600 p-3 rounded-2xl shadow-lg shadow-indigo-200">
                      <Lightbulb className="text-white" size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-gray-900 tracking-tighter">AI STRATEGY</h3>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mt-1">Next Best Actions</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {data.recommendations && data.recommendations.length > 0 ? data.recommendations.map((rec, i) => (
                      <div key={i} className="group flex items-start gap-4 p-4 rounded-3xl border-2 border-transparent hover:border-indigo-100 hover:bg-indigo-50/50 transition-all cursor-default">
                        <div className="bg-indigo-100 text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center font-black text-xs group-hover:bg-indigo-600 group-hover:text-white transition-all shrink-0">
                          {i + 1}
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-800 leading-snug">{rec}</p>
                          <div className="flex items-center gap-1 text-[10px] text-indigo-600 font-bold uppercase mt-2 group-hover:translate-x-1 transition-transform">
                            Strategy Queued <ArrowRight size={10} />
                          </div>
                        </div>
                      </div>
                    )) : (
                      <p className="text-gray-400 font-bold text-center italic text-sm">Strategic engine pending baseline analysis.</p>
                    )}
                  </div>

                  <div className="mt-10 p-6 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center text-center">
                    <BrainCircuit className="text-gray-300 mb-3" size={32} />
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Decision Model v2.4.0 (Synchronized)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Anomaly Cards Grid */}
            <div>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic">Raw Analysis Stream</h2>
                  <span className="h-0.5 w-12 bg-red-100 rounded-full" />
                </div>
                <div className="flex gap-4">
                  <span className="flex items-center gap-2 text-[10px] font-black px-4 py-2 bg-red-50 text-red-600 rounded-full border-2 border-red-100">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> {activeAnomalies.length} ACTIVE
                  </span>
                  <span className="flex items-center gap-2 text-[10px] font-black px-4 py-2 bg-green-50 text-green-600 rounded-full border-2 border-green-100">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" /> {flaggedAnomalies.length - activeAnomalies.length} RESOLVED
                  </span>
                </div>
              </div>

              {/* Active anomaly cards */}
              {activeAnomalies.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
                  {activeAnomalies.map((item, index) => (
                    <div key={index}
                      className="group bg-white rounded-[2.5rem] border-2 border-gray-50 overflow-hidden hover:border-indigo-100 hover:shadow-3xl hover:shadow-indigo-50/50 transition-all duration-500 transform hover:-translate-y-2">
                      <div className="p-8">
                        <div className="flex justify-between items-start mb-8">
                          <div className={`px-4 py-2 rounded-2xl border-2 text-[10px] font-black uppercase tracking-[0.2em] ${getSeverityStyles(item.severity)}`}>
                            {item.severity} Risk
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                              {new Date(item.date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col mb-8 text-center md:text-left">
                          <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
                            {/* Strategy icon + type badge */}
                            <span className="text-lg">{getStrategyForAnomaly(item)?.icon || '⚠️'}</span>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] leading-none px-2 py-1 rounded-lg bg-gray-100 text-gray-500">
                              {item.anomalyType?.replace(/_/g, ' ') || item.type}
                            </span>
                          </div>
                          <h3 className="text-5xl font-black text-gray-900 leading-none tracking-tighter">₹{item.amount.toLocaleString()}</h3>
                        </div>

                        <div className="bg-gray-50/80 p-6 rounded-[2rem] border-2 border-gray-50 flex flex-col gap-4 group-hover:bg-white group-hover:border-indigo-50 transition-all">
                          <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                              <BrainCircuit size={12} className="text-indigo-500" /> AI CLASSIFICATION
                            </p>
                            <p className="text-sm font-black text-gray-800 leading-snug tracking-tight italic">
                              "{item.explanation || 'Isolated deviation detected in regular cycles.'}"
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Implement Strategy button */}
                      <button
                        onClick={() => handleImplement(item)}
                        className="w-full px-8 py-4 bg-indigo-600 text-white flex justify-between items-center
                          translate-y-full group-hover:translate-y-0 transition-all duration-300 hover:bg-indigo-700"
                      >
                        <span className="text-[10px] font-black uppercase tracking-widest">Implement Strategy</span>
                        <ArrowRight size={16} className="animate-pulse" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Resolved anomaly cards — faded */}
              {flaggedAnomalies.filter(a => a.isResolved).length > 0 && (
                <div className="mt-6">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <CheckCircle size={12} className="text-green-500" /> Resolved Anomalies
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-50">
                    {flaggedAnomalies.filter(a => a.isResolved).map((item, index) => (
                      <div key={index} className="bg-green-50 rounded-[2rem] border-2 border-green-100 p-6">
                        <div className="flex justify-between items-start mb-4">
                          <span className="px-3 py-1.5 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest bg-green-100 text-green-700 border-green-200 flex items-center gap-1.5">
                            <Check size={10} strokeWidth={3} /> Resolved
                          </span>
                          <p className="text-[10px] font-black text-gray-400">{new Date(item.date).toLocaleDateString()}</p>
                        </div>
                        <p className="text-3xl font-black text-gray-500 tracking-tighter">₹{item.amount.toLocaleString()}</p>
                        <p className="text-[10px] font-black text-gray-400 uppercase mt-1">
                          {item.anomalyType?.replace(/_/g, ' ') || item.type}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state: show ONLY when no active anomalies (all resolved or none ever) */}
              {(noAnomalies || allResolved) && (
                <div className={`text-center py-32 bg-white rounded-[4rem] border-2 border-dashed ${allResolved ? 'border-green-100' : 'border-gray-100'} shadow-sm relative overflow-hidden group`}>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.02] rotate-12 scale-[3] group-hover:scale-[3.5] transition-transform duration-1000">
                    <CheckCircle size={200} className="text-green-500" />
                  </div>
                  <div className="relative z-10">
                    <div className="bg-green-50 w-24 h-24 rounded-[3rem] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-green-50">
                      <CheckCircle className="w-12 h-12 text-green-500" />
                    </div>
                    <h3 className="text-4xl font-black text-gray-900 tracking-tighter uppercase mb-4">
                      {allResolved ? 'System Stable' : 'Baseline Synchronized'}
                    </h3>
                    <p className="text-gray-500 font-bold max-w-sm mx-auto leading-relaxed uppercase text-xs tracking-widest">
                      {allResolved
                        ? 'All anomalies resolved. No active risks detected.'
                        : 'No critical anomalies identified within the current observation window.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Resolution Modal */}
      {modal && (
        <ResolutionModal
          anomaly={modal}
          onConfirm={handleResolve}
          onClose={() => setModal(null)}
          loading={resolveLoading}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
};

export default Anomaly;
