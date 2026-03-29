import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config/api';
import {
  Upload, FileText, CheckCircle, AlertTriangle, Loader2,
  ArrowRight, X, CloudUpload, Sparkles, Info, TrendingUp,
  TrendingDown, Users, PieChart, List, RefreshCcw, Check,
  ArrowUpRight, ArrowDownRight, Wallet, BarChart2
} from 'lucide-react';

// ─── Category display config ───────────────────────────────────────────────────
const CAT_CONFIG = {
  food:       { label: 'Food',        color: '#f97316', bg: 'bg-orange-500', light: 'bg-orange-50', text: 'text-orange-700', icon: '🍽️' },
  travel:     { label: 'Travel',      color: '#0ea5e9', bg: 'bg-sky-500',    light: 'bg-sky-50',    text: 'text-sky-700',    icon: '✈️' },
  shopping:   { label: 'Shopping',    color: '#8b5cf6', bg: 'bg-violet-500', light: 'bg-violet-50', text: 'text-violet-700', icon: '🛍️' },
  bills:      { label: 'Bills',       color: '#ef4444', bg: 'bg-red-500',    light: 'bg-red-50',    text: 'text-red-700',    icon: '🧾' },
  salary:     { label: 'Salary',      color: '#22c55e', bg: 'bg-green-500',  light: 'bg-green-50',  text: 'text-green-700',  icon: '💼' },
  rent:       { label: 'Rent',        color: '#f59e0b', bg: 'bg-amber-500',  light: 'bg-amber-50',  text: 'text-amber-700',  icon: '🏠' },
  transfers:  { label: 'Transfers',   color: '#6366f1', bg: 'bg-indigo-500', light: 'bg-indigo-50', text: 'text-indigo-700', icon: '↔️' },
  income:     { label: 'Income',      color: '#10b981', bg: 'bg-emerald-500',light: 'bg-emerald-50',text: 'text-emerald-700',icon: '💰' },
  healthcare: { label: 'Healthcare',  color: '#ec4899', bg: 'bg-pink-500',   light: 'bg-pink-50',   text: 'text-pink-700',   icon: '🏥' },
  education:  { label: 'Education',   color: '#14b8a6', bg: 'bg-teal-500',   light: 'bg-teal-50',   text: 'text-teal-700',   icon: '📚' },
  insurance:  { label: 'Insurance',   color: '#84cc16', bg: 'bg-lime-500',   light: 'bg-lime-50',   text: 'text-lime-700',   icon: '🛡️' },
  others:     { label: 'Others',      color: '#94a3b8', bg: 'bg-slate-400',  light: 'bg-slate-50',  text: 'text-slate-600',  icon: '📦' },
};

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const fmtBytes = (bytes) => (bytes / 1024).toFixed(1) + ' KB';

// ─── Summary Card ──────────────────────────────────────────────────────────────
const SummaryCard = ({ label, value, icon: Icon, colorClass, bgClass, subtext }) => (
  <div className={`bg-white rounded-[2rem] border-2 border-gray-50 p-6 shadow-lg`}>
    <div className="flex items-start justify-between mb-4">
      <div className={`w-12 h-12 ${bgClass} rounded-2xl flex items-center justify-center shadow-md`}>
        <Icon className="text-white" size={22} />
      </div>
    </div>
    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
    <p className={`text-3xl font-black tracking-tighter ${colorClass}`}>{value}</p>
    {subtext && <p className="text-[10px] font-bold text-gray-400 mt-1">{subtext}</p>}
  </div>
);

// ─── Category Bar ──────────────────────────────────────────────────────────────
const CategoryBar = ({ name, amount, max }) => {
  const cfg = CAT_CONFIG[name] || CAT_CONFIG.others;
  const pct = max > 0 ? Math.max(2, (amount / max) * 100) : 0;
  return (
    <div className="flex items-center gap-4 group">
      <div className="w-8 text-center text-base">{cfg.icon}</div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-black text-gray-700">{cfg.label}</span>
          <span className="text-xs font-black text-gray-500">{fmt(amount)}</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${cfg.bg} rounded-full transition-all duration-700`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
const ImportData = () => {
  const [file, setFile]               = useState(null);
  const [dragging, setDragging]       = useState(false);
  const [phase, setPhase]             = useState('idle');   // idle | analyzing | analyzed | importing | done | error
  const [analysis, setAnalysis]       = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [errorMsg, setErrorMsg]       = useState('');
  const [activeTab, setActiveTab]     = useState('categories'); // categories | people | transactions
  const inputRef = useRef();
  const navigate = useNavigate();

  /* ── Drag & Drop ─────────────────────────────────────────── */
  const onDragOver  = useCallback((e) => { e.preventDefault(); setDragging(true); }, []);
  const onDragLeave = useCallback(() => setDragging(false), []);
  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type === 'application/pdf') { setFile(dropped); resetState(); }
    else { setErrorMsg('Only PDF files are accepted.'); setPhase('error'); }
  }, []);

  const onFileChange = (e) => {
    const chosen = e.target.files[0];
    if (chosen) { setFile(chosen); resetState(); }
  };

  const resetState = () => {
    setPhase('idle'); setAnalysis(null); setImportResult(null); setErrorMsg('');
  };

  const removeFile = () => {
    setFile(null); resetState();
    if (inputRef.current) inputRef.current.value = '';
  };

  /* ── Phase 1: Analyze ──────────────────────────────────────── */
  const handleAnalyze = async () => {
    if (!file) return;
    setPhase('analyzing');
    setAnalysis(null);
    setErrorMsg('');

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);

      const res = await axios.post(
        `${API_URL}/api/transactions/analyze-statement`,
        formData,
        { headers: { 'x-auth-token': token, 'Content-Type': 'multipart/form-data' }, timeout: 90000 }
      );

      setAnalysis(res.data);
      setPhase('analyzed');
      setActiveTab('categories');
    } catch (err) {
      setPhase('error');
      const msg = err.response?.data?.message || err.response?.data?.error
        || (err.code === 'ECONNABORTED' ? 'Request timed out — PDF may be too complex.' : err.message);
      setErrorMsg(msg);
    }
  };

  /* ── Phase 2: Import ─────────────────────────────────────── */
  const handleImport = async () => {
    if (!analysis?.transactions || analysis.transactions.length === 0) {
      setErrorMsg('No transactions found to import.');
      setPhase('error');
      return;
    }

    setPhase('importing');
    setErrorMsg('');

    try {
      const token = localStorage.getItem('token');
      
      const res = await axios.post(
        `${API_URL}/api/transactions/import-pdf`,
        { transactions: analysis.transactions },
        { 
          headers: { 
            'x-auth-token': token, 
            'Content-Type': 'application/json' 
          } 
        }
      );

      setImportResult(res.data);
      setPhase('done');
    } catch (err) {
      setPhase('error');
      const msg = err.response?.data?.message || err.message;
      setErrorMsg(msg);
    }
  };

  /* ── Derived ─────────────────────────────────────────────── */
  const activeCats = analysis
    ? Object.entries(analysis.categories || {})
        .filter(([, v]) => v > 0)
        .sort(([, a], [, b]) => b - a)
    : [];
  const maxCatVal = activeCats.length ? activeCats[0][1] : 0;
  const topPeople = (analysis?.people || []).slice(0, 8);
  const recentTxns = (analysis?.transactions || []).slice(0, 20);

  /* ── Render ──────────────────────────────────────────────── */
  return (
    <div className="min-h-full bg-finexa-bg pb-24">
      <div className="section-container space-y-10">

        {/* Header */}
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic">
              Smart Import
            </h1>
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-full text-[10px] font-black uppercase tracking-widest">
              <Sparkles size={12} /> AI-Powered
            </span>
          </div>
          <p className="text-[10px] text-indigo-600 mt-2 font-black uppercase tracking-[0.3em] opacity-80">
            Upload any bank statement PDF — AI extracts, categorises, and analyses automatically
          </p>
        </div>

        {/* ── Upload + Analysis Panel ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left: Upload + actions */}
          <div className="lg:col-span-1 space-y-5">

            {/* Drop Zone */}
            <div
              onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
              onClick={() => !file && inputRef.current?.click()}
              className={`relative rounded-[2.5rem] border-2 border-dashed p-10 flex flex-col items-center justify-center text-center
                transition-all duration-300 cursor-pointer group
                ${dragging ? 'border-indigo-500 bg-indigo-50 scale-[1.01]'
                  : file ? 'border-green-300 bg-green-50/40 cursor-default'
                  : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/20'}`}
            >
              <input ref={inputRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={onFileChange} />

              {file ? (
                <>
                  <div className="w-16 h-16 bg-green-100 rounded-[1.8rem] flex items-center justify-center mb-4 shadow-lg shadow-green-50">
                    <FileText className="w-8 h-8 text-green-600" />
                  </div>
                  <p className="text-lg font-black text-gray-900 tracking-tight mb-1 max-w-[200px] truncate">{file.name}</p>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">{fmtBytes(file.size)} · PDF</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFile(); }}
                    className="flex items-center gap-2 text-xs font-black text-red-400 hover:text-red-600 uppercase tracking-widest transition-colors"
                  >
                    <X size={12} /> Remove
                  </button>
                </>
              ) : (
                <>
                  <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center mb-4 shadow-xl transition-all duration-300
                    ${dragging ? 'bg-indigo-600 scale-110' : 'bg-indigo-50 group-hover:bg-indigo-600 group-hover:scale-105'}`}>
                    <CloudUpload className={`w-10 h-10 transition-colors duration-300 ${dragging ? 'text-white' : 'text-indigo-400 group-hover:text-white'}`} />
                  </div>
                  <p className="text-lg font-black text-gray-900 tracking-tight mb-2">
                    {dragging ? 'Drop it here!' : 'Drag & drop your PDF'}
                  </p>
                  <p className="text-gray-400 font-bold text-sm mb-4">
                    or <span className="text-indigo-600 underline underline-offset-2">browse files</span>
                  </p>
                  <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                    <Info size={10} /> Max 5 MB · PDF only
                  </div>
                </>
              )}
            </div>

            {/* Analyse Button */}
            {phase !== 'done' && (
              <button
                onClick={handleAnalyze}
                disabled={!file || phase === 'analyzing' || phase === 'importing'}
                className="w-full flex items-center justify-center gap-3 bg-indigo-600 text-white py-4 rounded-[1.5rem]
                  font-black tracking-tight text-base hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100
                  disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {phase === 'analyzing' ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Analysing Statement...</>
                ) : (
                  <><BarChart2 className="w-5 h-5" /> Analyse PDF</>
                )}
              </button>
            )}

            {/* Import Button — shown only after analysis */}
            {phase === 'analyzed' && (
              <button
                onClick={handleImport}
                disabled={phase === 'importing'}
                className="w-full flex items-center justify-center gap-3 bg-gray-900 text-white py-4 rounded-[1.5rem]
                  font-black tracking-tight text-base hover:bg-black transition-all shadow-xl
                  disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Upload className="w-5 h-5" />
                Import {analysis?.transactionCount} Transactions to Dashboard
              </button>
            )}

            {/* Re-analyse button after done */}
            {phase === 'done' && (
              <button
                onClick={() => { removeFile(); }}
                className="w-full flex items-center justify-center gap-3 bg-indigo-50 text-indigo-700 py-4 rounded-[1.5rem]
                  font-black tracking-tight text-sm hover:bg-indigo-100 transition-all border-2 border-indigo-100"
              >
                <RefreshCcw className="w-5 h-5" /> Import Another Statement
              </button>
            )}

            {/* Error Banner */}
            {phase === 'error' && errorMsg && (
              <div className="bg-red-50 border-2 border-red-100 rounded-[2rem] p-6 flex items-start gap-4 animate-in fade-in duration-300">
                <div className="w-10 h-10 bg-red-500 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-red-100">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-red-900 text-sm mb-1">Analysis Failed</h3>
                  <p className="text-xs font-bold text-red-700 leading-snug">{errorMsg}</p>
                </div>
              </div>
            )}

            {/* Done banner */}
            {phase === 'done' && importResult && (
              <div className="bg-green-50 border-2 border-green-100 rounded-[2rem] p-6 flex items-start gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="w-10 h-10 bg-green-500 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-green-100">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-black text-green-900 mb-1">
                    {importResult.count} Transaction{importResult.count !== 1 ? 's' : ''} Imported!
                  </h3>
                  {importResult.skipped > 0 && (
                    <p className="text-xs font-bold text-green-700 mb-3">{importResult.skipped} duplicates skipped</p>
                  )}
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl font-black text-xs hover:bg-green-700 transition-all shadow-md"
                  >
                    View Dashboard <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* How it works */}
            <div className="bg-white rounded-[2.5rem] border-2 border-gray-50 shadow-xl shadow-indigo-50/20 p-6">
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-4">How It Works</p>
              <div className="space-y-4">
                {[
                  { n: '01', title: 'Upload PDF', desc: 'Any bank statement — SBI, HDFC, GPay, Paytm, etc.' },
                  { n: '02', title: 'AI Extracts', desc: 'ML reads tables & text, extracts all transactions.' },
                  { n: '03', title: 'Auto-Categorised', desc: 'Food, Travel, Bills, People — all classified instantly.' },
                  { n: '04', title: 'Import to Dashboard', desc: 'Save transactions and see them in analytics.' },
                ].map((s) => (
                  <div key={s.n} className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-black text-[10px] shrink-0">{s.n}</div>
                    <div>
                      <p className="font-black text-gray-900 text-xs">{s.title}</p>
                      <p className="text-[10px] font-bold text-gray-400 mt-0.5 leading-snug">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Analysis Results */}
          <div className="lg:col-span-2">

            {/* Idle / Analyzing placeholder */}
            {(phase === 'idle' || phase === 'analyzing') && (
              <div className="h-full min-h-[400px] bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100 flex flex-col items-center justify-center text-center p-12">
                {phase === 'analyzing' ? (
                  <>
                    <div className="w-20 h-20 bg-indigo-50 rounded-[2rem] flex items-center justify-center mb-6 animate-pulse">
                      <Sparkles className="w-10 h-10 text-indigo-400" />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tighter mb-2">AI Reading Statement...</h3>
                    <p className="text-sm font-bold text-gray-400">Extracting transactions, categorising, and building insights</p>
                    <div className="flex gap-1.5 mt-6">
                      {[0, 1, 2].map(i => (
                        <div key={i} className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center mb-6">
                      <PieChart className="w-10 h-10 text-gray-200" />
                    </div>
                    <h3 className="text-xl font-black text-gray-400 tracking-tighter mb-2">No analysis yet</h3>
                    <p className="text-sm font-bold text-gray-300">Upload a PDF and click Analyse to see your financial intelligence</p>
                  </>
                )}
              </div>
            )}

            {/* Analysis Results */}
            {(phase === 'analyzed' || phase === 'importing' || phase === 'done') && analysis && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <SummaryCard
                    label="Total Received"
                    value={fmt(analysis.totalReceived)}
                    icon={ArrowDownRight}
                    colorClass="text-green-600"
                    bgClass="bg-green-500"
                    subtext="Credits this period"
                  />
                  <SummaryCard
                    label="Total Spent"
                    value={fmt(analysis.totalSpent)}
                    icon={ArrowUpRight}
                    colorClass="text-red-600"
                    bgClass="bg-red-500"
                    subtext="Debits this period"
                  />
                  <SummaryCard
                    label="Net Balance"
                    value={fmt(analysis.netBalance)}
                    icon={Wallet}
                    colorClass={analysis.netBalance >= 0 ? 'text-indigo-600' : 'text-orange-600'}
                    bgClass={analysis.netBalance >= 0 ? 'bg-indigo-500' : 'bg-orange-500'}
                    subtext="Received minus Spent"
                  />
                  <SummaryCard
                    label="Transactions"
                    value={analysis.transactionCount}
                    icon={List}
                    colorClass="text-gray-800"
                    bgClass="bg-gray-700"
                    subtext="Total entries found"
                  />
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-[2.5rem] border-2 border-gray-50 shadow-xl shadow-indigo-50/20 overflow-hidden">
                  {/* Tab Bar */}
                  <div className="flex border-b border-gray-50">
                    {[
                      { id: 'categories', label: 'Categories', icon: PieChart },
                      { id: 'people',     label: 'People',     icon: Users },
                      { id: 'transactions', label: 'Transactions', icon: List },
                    ].map(({ id, label, icon: Icon }) => (
                      <button
                        key={id}
                        onClick={() => setActiveTab(id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-4 text-xs font-black uppercase tracking-widest transition-all
                          ${activeTab === id
                            ? 'text-indigo-600 border-b-2 border-indigo-500 bg-indigo-50/40'
                            : 'text-gray-400 hover:text-gray-600'}`}
                      >
                        <Icon size={14} /> {label}
                      </button>
                    ))}
                  </div>

                  {/* Tab Content */}
                  <div className="p-6">

                    {/* Categories Tab */}
                    {activeTab === 'categories' && (
                      <div className="space-y-4">
                        {activeCats.length === 0 ? (
                          <p className="text-center text-gray-400 font-bold py-8">No category data available</p>
                        ) : activeCats.map(([name, amount]) => (
                          <CategoryBar key={name} name={name} amount={amount} max={maxCatVal} />
                        ))}
                      </div>
                    )}

                    {/* People Tab */}
                    {activeTab === 'people' && (
                      <div className="space-y-3">
                        {topPeople.length === 0 ? (
                          <div className="text-center py-8">
                            <Users className="w-12 h-12 text-gray-100 mx-auto mb-3" />
                            <p className="text-gray-400 font-bold text-sm">No person-to-person transfers detected</p>
                            <p className="text-gray-300 font-bold text-xs mt-1">UPI/NEFT transfers with recipient names will appear here</p>
                          </div>
                        ) : topPeople.map((person, i) => (
                          <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 hover:bg-indigo-50 transition-colors">
                            <div className="w-10 h-10 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 font-black text-sm shrink-0">
                              {person.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-black text-gray-900 text-sm truncate">{person.name}</p>
                              <div className="flex items-center gap-3 mt-1">
                                {person.sent > 0 && (
                                  <span className="flex items-center gap-1 text-[10px] font-black text-red-600">
                                    <ArrowUpRight size={10} /> Sent {fmt(person.sent)}
                                  </span>
                                )}
                                {person.received > 0 && (
                                  <span className="flex items-center gap-1 text-[10px] font-black text-green-600">
                                    <ArrowDownRight size={10} /> Recv {fmt(person.received)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-black text-gray-900 text-sm">{fmt(person.sent + person.received)}</p>
                              <p className="text-[9px] font-black text-gray-400 uppercase">Total</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Transactions Tab */}
                    {activeTab === 'transactions' && (
                      <div>
                        {recentTxns.length === 0 ? (
                          <p className="text-center text-gray-400 font-bold py-8">No transactions found</p>
                        ) : (
                          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                            {recentTxns.map((tx, i) => {
                              const cfg = CAT_CONFIG[tx.category?.toLowerCase()] || CAT_CONFIG.others;
                              return (
                                <div key={i} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 transition-colors group">
                                  <div className={`w-9 h-9 ${cfg.light} rounded-xl flex items-center justify-center text-base shrink-0`}>
                                    {cfg.icon}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black text-gray-800 truncate leading-snug">
                                      {tx.description || 'No description'}
                                    </p>
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-wide mt-0.5">
                                      {tx.date} · {cfg.label}
                                    </p>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <p className={`text-sm font-black ${tx.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                                      {tx.type === 'credit' ? '+' : '-'}{fmt(tx.amount)}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                            {analysis.transactions.length > 20 && (
                              <p className="text-center text-[10px] font-black text-gray-400 uppercase tracking-widest py-3 border-t border-gray-50">
                                Showing first 20 of {analysis.transactionCount} transactions. Import to see all.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportData;
