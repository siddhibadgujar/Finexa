import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config/api';
import {
  Upload, FileText, CheckCircle, AlertTriangle, Loader2,
  ArrowRight, X, CloudUpload, Sparkles, Info
} from 'lucide-react';

const ImportData = () => {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | uploading | success | error | warning
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef();
  const navigate = useNavigate();

  /* ── Drag & Drop ─────────────────────────────────────────── */
  const onDragOver = useCallback((e) => { e.preventDefault(); setDragging(true); }, []);
  const onDragLeave = useCallback(() => setDragging(false), []);
  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type === 'application/pdf') {
      setFile(dropped);
      setStatus('idle');
      setResult(null);
    } else {
      setErrorMsg('Only PDF files are accepted.');
      setStatus('error');
    }
  }, []);

  const onFileChange = (e) => {
    const chosen = e.target.files[0];
    if (chosen) {
      setFile(chosen);
      setStatus('idle');
      setResult(null);
      setErrorMsg('');
    }
  };

  const removeFile = () => {
    setFile(null);
    setStatus('idle');
    setResult(null);
    setErrorMsg('');
    if (inputRef.current) inputRef.current.value = '';
  };

  /* ── Upload ──────────────────────────────────────────────── */
  const handleImport = async () => {
    if (!file) return;

    setStatus('uploading');
    setResult(null);
    setErrorMsg('');

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);

      const res = await axios.post(
        `${API_URL}/api/transactions/import-pdf`,
        formData,
        {
          headers: {
            'x-auth-token': token,
            'Content-Type': 'multipart/form-data'
          },
          timeout: 60000
        }
      );

      if (res.data.count === 0) {
        setStatus('warning');
        setResult(res.data);
      } else {
        setStatus('success');
        setResult(res.data);
      }
    } catch (err) {
      setStatus('error');
        // Show full backend/ML error for debugging
        const backendMsg = err.response?.data?.message || err.response?.data?.error;
        const msg = backendMsg ||
          (err.code === 'ECONNABORTED' ? 'Request timed out. The PDF may be too large or complex.' : err.message);
      setErrorMsg(msg);
    }
  };

  /* ── Helpers ─────────────────────────────────────────────── */
  const fmt = (bytes) => (bytes / 1024).toFixed(1) + ' KB';

  return (
    <div className="min-h-full bg-finexa-bg pb-24">
      <div className="section-container space-y-10">

        {/* ── Header ── */}
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
            Upload your bank statement PDF — transactions extracted automatically
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

          {/* ── Left: Upload Panel ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Drop Zone */}
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => !file && inputRef.current?.click()}
              className={`
                relative rounded-[3rem] border-2 border-dashed p-16 flex flex-col items-center justify-center text-center
                transition-all duration-300 cursor-pointer group
                ${dragging
                  ? 'border-indigo-500 bg-indigo-50 scale-[1.01]'
                  : file
                    ? 'border-green-300 bg-green-50/40 cursor-default'
                    : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/20'}
              `}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={onFileChange}
              />

              {file ? (
                <>
                  <div className="w-20 h-20 bg-green-100 rounded-[2rem] flex items-center justify-center mb-6 shadow-lg shadow-green-50">
                    <FileText className="w-10 h-10 text-green-600" />
                  </div>
                  <p className="text-2xl font-black text-gray-900 tracking-tight mb-1 max-w-xs truncate">
                    {file.name}
                  </p>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">
                    {fmt(file.size)} · PDF
                  </p>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFile(); }}
                    className="flex items-center gap-2 text-xs font-black text-red-400 hover:text-red-600 uppercase tracking-widest transition-colors"
                  >
                    <X size={14} /> Remove
                  </button>
                </>
              ) : (
                <>
                  <div className={`w-24 h-24 rounded-[2.5rem] flex items-center justify-center mb-6 shadow-xl transition-all duration-300
                    ${dragging ? 'bg-indigo-600 scale-110' : 'bg-indigo-50 group-hover:bg-indigo-600 group-hover:scale-105'}`}>
                    <CloudUpload className={`w-12 h-12 transition-colors duration-300 ${dragging ? 'text-white' : 'text-indigo-400 group-hover:text-white'}`} />
                  </div>
                  <p className="text-2xl font-black text-gray-900 tracking-tight mb-2">
                    {dragging ? 'Drop it here!' : 'Drag & drop your PDF'}
                  </p>
                  <p className="text-gray-400 font-bold text-sm mb-6">
                    or <span className="text-indigo-600 underline underline-offset-2">browse files</span>
                  </p>
                  <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-4 py-2 rounded-full border border-gray-100">
                    <Info size={12} /> Max 5 MB · PDF only
                  </div>
                </>
              )}
            </div>

            {/* Import Button */}
            <button
              onClick={handleImport}
              disabled={!file || status === 'uploading'}
              className="w-full flex items-center justify-center gap-3 bg-gray-900 text-white py-5 rounded-[2rem]
                font-black tracking-tight text-lg hover:bg-black transition-all shadow-2xl shadow-indigo-100
                disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {status === 'uploading' ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  AI is reading your statement...
                </>
              ) : (
                <>
                  <Upload className="w-6 h-6" />
                  Import Transactions
                </>
              )}
            </button>

            {/* ── Result Banner ── */}
            {status === 'success' && result && (
              <div className="bg-green-50 border-2 border-green-100 rounded-[2.5rem] p-8 flex items-start gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="w-14 h-14 bg-green-500 rounded-[1.5rem] flex items-center justify-center shrink-0 shadow-lg shadow-green-100">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-black text-green-900 tracking-tight mb-1">
                    {result.count} Transaction{result.count !== 1 ? 's' : ''} Imported!
                  </h3>
                  {result.skipped > 0 && (
                    <p className="text-sm font-bold text-green-700 mb-4">
                      {result.skipped} duplicate{result.skipped !== 1 ? 's' : ''} skipped.
                    </p>
                  )}
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-2xl font-black text-sm hover:bg-green-700 transition-all shadow-md"
                  >
                    View Dashboard <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {status === 'warning' && result && (
              <div className="bg-yellow-50 border-2 border-yellow-100 rounded-[2.5rem] p-8 flex items-start gap-6 animate-in fade-in duration-300">
                <div className="w-14 h-14 bg-yellow-400 rounded-[1.5rem] flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-yellow-900 mb-1">All transactions were duplicates</h3>
                  <p className="text-sm font-bold text-yellow-700">
                    {result.skipped} transaction{result.skipped !== 1 ? 's' : ''} already exist in your account. Nothing new was added.
                  </p>
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="bg-red-50 border-2 border-red-100 rounded-[2.5rem] p-8 flex items-start gap-6 animate-in fade-in duration-300">
                <div className="w-14 h-14 bg-red-500 rounded-[1.5rem] flex items-center justify-center shrink-0 shadow-lg shadow-red-100">
                  <AlertTriangle className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-red-900 mb-1">Import Failed</h3>
                  <p className="text-sm font-bold text-red-700">{errorMsg}</p>
                </div>
              </div>
            )}
          </div>

          {/* ── Right: How It Works ── */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-[2.5rem] border-2 border-gray-50 shadow-xl shadow-indigo-50/20 p-8">
              <div className="flex items-center gap-3 mb-8 border-b border-gray-50 pb-6">
                <div className="bg-indigo-600 p-3 rounded-2xl shadow-lg shadow-indigo-200">
                  <Sparkles className="text-white" size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 tracking-tighter">How It Works</h3>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mt-1">3 simple steps</p>
                </div>
              </div>

              <div className="space-y-6">
                {[
                  { n: '01', title: 'Upload PDF', desc: 'Drag & drop your downloaded bank statement PDF (any standard format).' },
                  { n: '02', title: 'AI Extraction', desc: 'Our ML model reads each row and extracts date, amount, debit/credit automatically.' },
                  { n: '03', title: 'Auto-Categorised', desc: 'Transactions are categorised (Food, Rent, Salary…) and saved to your dashboard.' },
                ].map((step) => (
                  <div key={step.n} className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-black text-xs shrink-0">
                      {step.n}
                    </div>
                    <div>
                      <p className="font-black text-gray-900 text-sm">{step.title}</p>
                      <p className="text-xs font-bold text-gray-400 leading-snug mt-0.5">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Supported categories */}
            <div className="bg-white rounded-[2.5rem] border-2 border-gray-50 shadow-xl shadow-indigo-50/20 p-8">
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-4">Auto-detected categories</p>
              <div className="flex flex-wrap gap-2">
                {['Food', 'Transport', 'Salary', 'Rent', 'Utilities', 'Shopping', 'Insurance', 'Healthcare', 'Education', 'Telecom', 'Income', 'Others'].map(cat => (
                  <span key={cat} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-[11px] font-black border border-indigo-100">
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportData;
