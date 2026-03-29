import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, X, Send, Mic, Volume2, VolumeX, Sparkles, Zap, MicOff } from 'lucide-react';
import { API_URL } from '../../config/api';

// ─── Constants ────────────────────────────────────────────────────────────────
const WAKE_PHRASE = 'hello assistant';
const WAKE_DEBOUNCE_MS = 3000; // minimum gap between two wake-word triggers
const WAKE_RESTART_DELAY_MS = 800; // delay before restarting continuous listener

// ─── Chatbot Component ────────────────────────────────────────────────────────
const Chatbot = () => {
  // ── Core state ──────────────────────────────────────────────────────────────
  const [isOpen, setIsOpen]         = useState(false);
  const [messages, setMessages]     = useState([
    { role: 'assistant', text: 'Hello! I am Finexa, your AI business assistant. How can I help you today?' }
  ]);
  const [input, setInput]           = useState('');
  const [loading, setLoading]       = useState(false);

  // ── Voice / TTS state ───────────────────────────────────────────────────────
  const [voiceEnabled, setVoiceEnabled]         = useState(true);
  const [isListening, setIsListening]           = useState(false);

  // ── Wake-word activation state ──────────────────────────────────────────────
  const [wakeEnabled, setWakeEnabled]           = useState(true);  // user toggle
  // wakeActive intentionally removed — listener runs silently, no UI indicator
  const [micPermission, setMicPermission]       = useState('unknown'); // 'granted'|'denied'|'unknown'
  const [browserSupported, setBrowserSupported] = useState(true);

  // ── Refs ─────────────────────────────────────────────────────────────────────
  const scrollRef          = useRef(null);
  const inputRef           = useRef(null);
  const recognitionRef     = useRef(null);   // manual STT (mic button)
  const wakeRecognitionRef = useRef(null);   // background wake-word listener
  const lastWakeTimeRef    = useRef(0);      // debounce timestamp
  const wakeRestartTimer   = useRef(null);   // restart timer ref
  const isOpenRef          = useRef(isOpen); // stable ref for closures
  const wakeEnabledRef     = useRef(wakeEnabled);
  const isListeningRef     = useRef(isListening);

  // Keep refs in sync with state (avoids stale closures in recognition handlers)
  useEffect(() => { isOpenRef.current      = isOpen;      }, [isOpen]);
  useEffect(() => { wakeEnabledRef.current = wakeEnabled; }, [wakeEnabled]);
  useEffect(() => { isListeningRef.current = isListening; }, [isListening]);

  // ── Check browser support on mount ──────────────────────────────────────────
  useEffect(() => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setBrowserSupported(false);
      console.warn('[Finexa] Web Speech API not supported in this browser. Use Chrome 33+.');
    }
  }, []);

  // ── Auto-scroll on new messages ──────────────────────────────────────────────
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // ── Focus input when chatbot opens ───────────────────────────────────────────
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // ─────────────────────────────────────────────────────────────────────────────
  //  TEXT-TO-SPEECH
  // ─────────────────────────────────────────────────────────────────────────────
  const speak = useCallback((text, onEnd) => {
    if (!voiceEnabled || !window.speechSynthesis) { onEnd?.(); return; }
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang  = /[\u0900-\u097F]/.test(text) ? 'hi-IN' : 'en-US';
    utt.rate  = 1.0;
    if (onEnd) { utt.onend = onEnd; utt.onerror = onEnd; }
    window.speechSynthesis.speak(utt);
  }, [voiceEnabled]);

  // ─────────────────────────────────────────────────────────────────────────────
  //  REQUEST MIC PERMISSION (proactive)
  // ─────────────────────────────────────────────────────────────────────────────
  const requestMicPermission = useCallback(async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicPermission('granted');
      return true;
    } catch {
      setMicPermission('denied');
      return false;
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  //  STOP WAKE LISTENER (helper)
  // ─────────────────────────────────────────────────────────────────────────────
  const stopWakeListener = useCallback(() => {
    clearTimeout(wakeRestartTimer.current);
    if (wakeRecognitionRef.current) {
      try { wakeRecognitionRef.current.stop(); } catch (_) {}
      wakeRecognitionRef.current = null;
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  //  START WAKE LISTENER
  // ─────────────────────────────────────────────────────────────────────────────
  const startWakeListener = useCallback(() => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition || !wakeEnabledRef.current) return;

    // Don't start if already running
    if (wakeRecognitionRef.current) return;

    const wakeRec = new Recognition();
    wakeRec.continuous      = true;
    wakeRec.interimResults  = true;
    wakeRec.lang            = 'en-US';
    wakeRec.maxAlternatives = 1;

    wakeRec.onstart = () => { /* silent — no UI update */ };

    wakeRec.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.toLowerCase().trim();

        if (transcript.includes(WAKE_PHRASE)) {
          // ── Debounce ────────────────────────────────────────────────────────
          const now = Date.now();
          if (now - lastWakeTimeRef.current < WAKE_DEBOUNCE_MS) return;
          lastWakeTimeRef.current = now;

          console.log('[Finexa] Wake phrase detected:', transcript);

          // ── Open chatbot & auto-fill greeting ───────────────────────────────
          setIsOpen(true);
          setInput('Hello');

          // Focus input after open animation completes
          setTimeout(() => {
            inputRef.current?.focus();
            inputRef.current?.select();
          }, 200);

          // Respond with TTS
          speak('Yes, I am listening! How can I help you?');

          // Stop wake listener while chatbot is open (will restart when closed)
          stopWakeListener();
          return;
        }
      }
    };

    wakeRec.onerror = (err) => {
      console.warn('[Finexa] Wake listener error:', err.error);
      wakeRecognitionRef.current = null;

      if (err.error === 'not-allowed') {
        setMicPermission('denied');
        return; // Don't restart if permission denied
      }

      // Restart for transient errors (no-speech, network, aborted)
      if (wakeEnabledRef.current && !isOpenRef.current) {
        wakeRestartTimer.current = setTimeout(() => startWakeListener(), WAKE_RESTART_DELAY_MS * 2);
      }
    };

    wakeRec.onend = () => {
      wakeRecognitionRef.current = null;

      // Auto-restart if still active and chatbot not open
      if (wakeEnabledRef.current && !isOpenRef.current && !isListeningRef.current) {
        wakeRestartTimer.current = setTimeout(() => startWakeListener(), WAKE_RESTART_DELAY_MS);
      }
    };

    try {
      wakeRec.start();
      wakeRecognitionRef.current = wakeRec;
    } catch (e) {
      console.error('[Finexa] Wake listener start error:', e);
      setWakeActive(false);
    }
  }, [speak, stopWakeListener]);

  // ─────────────────────────────────────────────────────────────────────────────
  //  WAKE LISTENER LIFECYCLE — starts/stops based on isOpen + wakeEnabled
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!browserSupported) return;

    if (wakeEnabled && !isOpen) {
      // Request mic permission then start
      if (micPermission === 'unknown') {
        requestMicPermission().then((granted) => {
          if (granted) startWakeListener();
        });
      } else if (micPermission === 'granted') {
        startWakeListener();
      }
    } else {
      stopWakeListener();
    }

    return () => stopWakeListener();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wakeEnabled, isOpen, browserSupported]);

  // ─────────────────────────────────────────────────────────────────────────────
  //  MANUAL VOICE INPUT (mic button inside chat)
  // ─────────────────────────────────────────────────────────────────────────────
  const startListening = useCallback(() => {
    if (!browserSupported) {
      alert('Speech recognition is not supported in this browser. Please use Google Chrome.');
      return;
    }
    if (isListening) return;

    // Stop any existing session
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
      recognitionRef.current = null;
    }

    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new Recognition();
    rec.continuous     = false;
    rec.interimResults = true;
    rec.lang           = 'en-US';

    rec.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          setIsListening(false);
          recognitionRef.current = null;
          handleSend(transcript, false);
        } else {
          setInput(transcript);
        }
      }
    };

    rec.onend   = () => { setIsListening(false); recognitionRef.current = null; };
    rec.onerror = (err) => {
      console.warn('[Finexa] Voice input error:', err.error);
      if (err.error === 'not-allowed') setMicPermission('denied');
      setIsListening(false);
      recognitionRef.current = null;
    };

    try {
      rec.start();
      recognitionRef.current = rec;
      setIsListening(true);
    } catch (e) {
      console.error('[Finexa] Recognition start error:', e);
      setIsListening(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [browserSupported, isListening]);

  // ─────────────────────────────────────────────────────────────────────────────
  //  SEND MESSAGE
  // ─────────────────────────────────────────────────────────────────────────────
  const handleSend = useCallback(async (text) => {
    const messageText = (text || input).trim();
    if (!messageText) return;

    setInput('');
    setLoading(true);
    setMessages(prev => [...prev, { role: 'user', text: messageText }]);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/chat`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'x-auth-token':  token || ''
        },
        body: JSON.stringify({ message: messageText })
      });

      let data;
      try   { data = await res.json(); }
      catch { data = { reply: 'Server error, please try again.' }; }

      const botReply = data.reply || "I'm having trouble understanding right now.";
      setMessages(prev => [...prev, { role: 'assistant', text: botReply, source: data.source }]);
      speak(botReply);
    } catch (err) {
      console.error('[Finexa] Chatbot Error:', err);
      setMessages(prev => [...prev, { role: 'assistant', text: 'Connection error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, speak]);

  // ─────────────────────────────────────────────────────────────────────────────
  //  TOGGLE WAKE WORD
  // ─────────────────────────────────────────────────────────────────────────────
  const toggleWake = useCallback(async () => {
    const next = !wakeEnabled;
    setWakeEnabled(next);
    if (next && micPermission === 'unknown') {
      const granted = await requestMicPermission();
      if (!granted) { setWakeEnabled(false); }
    }
  }, [wakeEnabled, micPermission, requestMicPermission]);

  // ─────────────────────────────────────────────────────────────────────────────
  //  CLEANUP on unmount
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      clearTimeout(wakeRestartTimer.current);
      if (recognitionRef.current)     try { recognitionRef.current.stop();     } catch (_) {}
      if (wakeRecognitionRef.current) try { wakeRecognitionRef.current.stop(); } catch (_) {}
      window.speechSynthesis?.cancel();
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed bottom-6 right-6 z-[100]">

      {/* Wake-word listener runs silently — no UI indicator shown */}

      {/* ── Floating Toggle Button ── */}
      {!isOpen && (
        <button
          id="finexa-chat-toggle"
          onClick={() => setIsOpen(true)}
          aria-label="Open Finexa Assistant"
          className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-full
                     flex items-center justify-center text-white shadow-2xl hover:scale-110
                     transition-all group relative"
        >
          <MessageSquare size={30} />
          <div className="absolute right-full mr-4 bg-white text-gray-800 px-4 py-2 rounded-xl
                          text-sm font-bold shadow-xl opacity-0 group-hover:opacity-100 transition-opacity
                          whitespace-nowrap pointer-events-none">
            Ask Finexa AI
          </div>
        </button>
      )}

      {/* ── Chat Window ── */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Finexa Assistant Chat"
          className="bg-white w-[350px] md:w-[400px] h-[580px] rounded-3xl shadow-2xl border border-gray-100
                     flex flex-col overflow-hidden"
          style={{ animation: 'slideUp 0.25s cubic-bezier(0.16,1,0.3,1)' }}
        >

          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-5 flex items-center justify-between text-white flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                <Sparkles size={20} className="text-yellow-300" />
              </div>
              <div>
                <h3 className="font-black text-lg leading-none">Finexa Assistant</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">
                    Always Online · v1.3
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* TTS Toggle */}
              <button
                id="finexa-tts-toggle"
                onClick={() => { if (voiceEnabled) window.speechSynthesis.cancel(); setVoiceEnabled(v => !v); }}
                title={voiceEnabled ? 'Mute voice responses' : 'Unmute voice responses'}
                className={`p-2 rounded-lg transition-colors ${voiceEnabled ? 'bg-white/20 text-white' : 'text-white/40'}`}
                aria-pressed={voiceEnabled}
              >
                {voiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </button>

              {/* Wake-Word Toggle */}
              <button
                id="finexa-wake-toggle"
                onClick={toggleWake}
                title={
                  !browserSupported
                    ? 'Voice activation not supported (Chrome only)'
                    : micPermission === 'denied'
                      ? 'Microphone access denied — check browser settings'
                      : wakeEnabled
                        ? 'Disable "Hello Assistant" voice activation'
                        : 'Enable "Hello Assistant" voice activation'
                }
                disabled={!browserSupported}
                className={`p-2 rounded-lg transition-all relative ${
                  !browserSupported
                    ? 'text-white/20 cursor-not-allowed'
                    : micPermission === 'denied'
                      ? 'text-red-300 bg-red-500/20'
                      : wakeEnabled
                        ? 'bg-white/20 text-white'
                        : 'text-white/40'
                }`}
                aria-pressed={wakeEnabled}
              >
                {micPermission === 'denied' ? <MicOff size={18} /> : <Mic size={18} />}
                {/* No live-dot indicator — background listening is silent */}
              </button>

              {/* Close */}
              <button
                id="finexa-chat-close"
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Close chat"
              >
                <X size={22} />
              </button>
            </div>
          </div>

          {/* Mic-denied state is handled silently; user can still type normally */}

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50"
            style={{ scrollbarWidth: 'none' }}
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                style={{ animation: 'fadeIn 0.2s ease' }}
              >
                <div className={`max-w-[85%] p-4 rounded-2xl text-sm font-medium leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-none shadow-lg shadow-indigo-100'
                    : 'bg-white text-gray-800 rounded-tl-none shadow-sm border border-gray-100'
                }`}>
                  {msg.text}
                  {(msg.source === 'rule-based' || msg.source === 'fallback') && (
                    <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-1.5 text-[10px] font-bold text-amber-600 uppercase tracking-tighter">
                      <Zap size={10} fill="currentColor" /> Quick analysis
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm flex gap-1 border border-gray-100">
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.15s]" />
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.3s]" />
                </div>
              </div>
            )}
          </div>

          {/* Suggested Questions */}
          <div className="px-4 py-2 flex gap-2 overflow-x-auto bg-gray-50/50 border-t border-gray-100 flex-shrink-0"
               style={{ scrollbarWidth: 'none' }}>
            {['How is my business?', 'Profit low?', 'Show spending'].map(q => (
              <button
                key={q}
                onClick={() => handleSend(q)}
                className="whitespace-nowrap bg-white border border-gray-200 px-3 py-1.5 rounded-full
                           text-xs font-bold text-gray-500 hover:border-indigo-400 hover:text-indigo-600
                           transition-all flex-shrink-0"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-gray-100 flex-shrink-0">
            <div className="flex gap-2 p-2 bg-gray-50 rounded-2xl border-2 border-transparent focus-within:border-indigo-500 transition-all">
              <button
                id="finexa-mic-btn"
                onClick={startListening}
                disabled={isListening || !browserSupported}
                title={
                  !browserSupported
                    ? 'Speech input not supported (Chrome only)'
                    : isListening
                      ? 'Listening…'
                      : 'Speak your message'
                }
                className={`p-2 rounded-xl transition-all flex-shrink-0 ${
                  isListening
                    ? 'bg-red-500 text-white animate-pulse'
                    : !browserSupported
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-indigo-600 hover:bg-white'
                }`}
                aria-pressed={isListening}
              >
                {isListening ? <MicOff size={22} /> : <Mic size={22} />}
              </button>

              <input
                ref={inputRef}
                id="finexa-chat-input"
                type="text"
                placeholder={isListening ? '🎙 Listening…' : 'Ask anything…'}
                className="flex-1 bg-transparent border-none outline-none px-2 font-medium text-gray-700 placeholder:text-gray-400"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                aria-label="Chat input"
              />

              <button
                id="finexa-send-btn"
                disabled={!input.trim() || loading}
                onClick={() => handleSend()}
                className="p-2 bg-indigo-600 text-white rounded-xl disabled:bg-indigo-300
                           disabled:cursor-not-allowed hover:bg-indigo-700 transition-all
                           shadow-md active:scale-95 flex-shrink-0"
                aria-label="Send message"
              >
                <Send size={20} />
              </button>
            </div>

            <p className="text-[10px] text-center text-gray-400 mt-2 font-semibold uppercase tracking-widest">
              Powered by Finexa Data Analysis
            </p>
          </div>
        </div>
      )}

      {/* ── Keyframe animations (injected once) ── */}
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default Chatbot;
