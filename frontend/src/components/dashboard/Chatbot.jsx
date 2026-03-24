import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Mic, Volume2, VolumeX, Sparkles, Zap } from 'lucide-react';

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hello! I am Finexa, your AI business assistant. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);

  const scrollRef = useRef(null);
  const recognitionRef = useRef(null); // single recognition instance ref

  // Auto-scroll on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // --- Text-to-Speech ---
  const speak = (text, onEndCallback) => {
    if (!voiceEnabled || !window.speechSynthesis) {
      if (onEndCallback) onEndCallback();
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = /[\u0900-\u097F]/.test(text) ? 'hi-IN' : 'en-US';
    if (onEndCallback) {
      utterance.onend = () => onEndCallback();
      utterance.onerror = () => onEndCallback();
    }
    window.speechSynthesis.speak(utterance);
  };

  // --- Start voice listening (manual trigger only, NO auto-restart) ---
  const startListening = () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return alert('Speech recognition not supported in this browser.');
    if (isListening) return; // prevent double-start

    // Stop any existing session first
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
      recognitionRef.current = null;
    }

    const rec = new Recognition();
    rec.continuous = false;
    rec.interimResults = true;

    rec.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          setIsListening(false);
          recognitionRef.current = null;
          handleSend(transcript, false);
        } else {
          setInput(transcript); // show live text
        }
      }
    };

    // DO NOT auto-restart on end or error — just clean up
    rec.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    rec.onerror = (err) => {
      console.warn('Voice recognition error:', err.error);
      setIsListening(false);
      recognitionRef.current = null;
    };

    try {
      rec.start();
      recognitionRef.current = rec;
      setIsListening(true);
    } catch (e) {
      console.error('Recognition start error:', e);
      setIsListening(false);
    }
  };

  // Stop listening if component unmounts
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (_) {}
      }
      window.speechSynthesis?.cancel();
    };
  }, []);

  // --- Send message ---
  const handleSend = async (text, isVoice = false) => {
    const messageText = (text || input).trim();
    if (!messageText) return;

    setInput('');
    setLoading(true);
    setMessages(prev => [...prev, { role: 'user', text: messageText }]);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5555/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token || ''
        },
        body: JSON.stringify({ message: messageText })
      });

      let data;
      try {
        data = await res.json();
      } catch (_) {
        data = { reply: 'Server error, please try again.' };
      }

      const botReply = data.reply || "I'm having trouble understanding right now.";
      setMessages(prev => [...prev, { role: 'assistant', text: botReply, source: data.source }]);
      speak(botReply);
    } catch (err) {
      console.error('Chatbot Error:', err);
      setMessages(prev => [...prev, { role: 'assistant', text: 'Server error, please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      {/* Chat Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-full flex items-center justify-center text-white shadow-2xl hover:scale-110 transition-all group relative"
        >
          <MessageSquare size={30} />
          <div className="absolute right-full mr-4 bg-white text-gray-800 px-4 py-2 rounded-xl text-sm font-bold shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Ask Finexa AI
          </div>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="bg-white w-[350px] md:w-[400px] h-[550px] rounded-3xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-300">

          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                <Sparkles size={20} className="text-yellow-300" />
              </div>
              <div>
                <h3 className="font-black text-lg">Finexa Assistant</h3>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Always Online | v1.2</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (voiceEnabled) window.speechSynthesis.cancel();
                  setVoiceEnabled(!voiceEnabled);
                }}
                className={`p-2 rounded-lg transition-colors ${voiceEnabled ? 'bg-white/20 text-white' : 'text-white/40'}`}
              >
                {voiceEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
              </button>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 scrollbar-hide">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in duration-300`}>
                <div className={`max-w-[85%] p-4 rounded-2xl text-sm font-medium ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-none shadow-lg shadow-indigo-100'
                    : 'bg-white text-gray-800 rounded-tl-none shadow-sm border border-gray-100'
                }`}>
                  {msg.text}
                  {(msg.source === 'rule-based' || msg.source === 'fallback') && (
                    <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-1.5 text-[10px] font-bold text-amber-600 uppercase tracking-tighter">
                      <Zap size={10} fill="currentColor" />
                      ⚡ Quick analysis
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm flex gap-1">
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
              </div>
            )}
          </div>

          {/* Suggested Questions */}
          <div className="px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide bg-gray-50/50 border-t border-gray-100">
            {['How is my business?', 'Profit low?', 'Spending?'].map(q => (
              <button
                key={q}
                onClick={() => handleSend(q)}
                className="whitespace-nowrap bg-white border border-gray-200 px-3 py-1.5 rounded-full text-xs font-bold text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-all font-sans"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-gray-100">
            <div className="flex gap-2 p-2 bg-gray-50 rounded-2xl border-2 border-transparent focus-within:border-indigo-500 transition-all">
              <button
                onClick={startListening}
                disabled={isListening}
                className={`p-2 rounded-xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-indigo-600 hover:bg-white'}`}
              >
                <Mic size={22} />
              </button>
              <input
                type="text"
                placeholder={isListening ? 'Listening...' : 'Ask anything...'}
                className="flex-1 bg-transparent border-none outline-none px-2 font-medium text-gray-700 placeholder:text-gray-400 font-sans"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              />
              <button
                disabled={!input.trim() || loading}
                onClick={() => handleSend()}
                className="p-2 bg-indigo-600 text-white rounded-xl disabled:bg-indigo-300 disabled:cursor-not-allowed hover:bg-indigo-700 transition-all shadow-md active:scale-95"
              >
                <Send size={20} />
              </button>
            </div>
            <p className="text-[10px] text-center text-gray-400 mt-2 font-bold uppercase tracking-widest">Powered by Finexa Data Analysis</p>
          </div>

        </div>
      )}
    </div>
  );
};

export default Chatbot;
