import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
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
  
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // --- Speech Recognition ---
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = Recognition ? new Recognition() : null;

  if (recognition) {
    recognition.continuous = false;
    recognition.interimResults = false;
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setIsListening(false);
      handleSend(transcript);
    };

    recognition.onerror = () => setIsListening(false);
  }

  // --- Voice Trigger (Hey Finexa) ---
  useEffect(() => {
    if (!Recognition) return;
    
    const triggerRec = new Recognition();
    triggerRec.continuous = true;
    triggerRec.interimResults = true;
    
    triggerRec.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript.toLowerCase();
        if (transcript.includes('hey finexa') || transcript.includes('hey phoenix')) {
          setIsOpen(true);
          // Play a small sound or give visual feedback?
        }
      }
    };
    
    triggerRec.start();
    return () => triggerRec.stop();
  }, []);

  // --- Text-to-Speech ---
  const speak = (text) => {
    if (!voiceEnabled || !window.speechSynthesis) return;
    
    // Stop any current speaking
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Auto-detect language (simple regex check for Devanagari script)
    if (/[\u0900-\u097F]/.test(text)) {
      // Could be Hindi or Marathi. 
      // Most browsers support hi-IN. 
      utterance.lang = 'hi-IN'; 
    } else {
      utterance.lang = 'en-US';
    }
    
    window.speechSynthesis.speak(utterance);
  };

  const handleSend = async (text) => {
    const messageText = text || input;
    if (!messageText.trim()) return;

    const userMessage = { role: 'user', text: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('http://localhost:5555/api/chat', { message: messageText }, {
        headers: { 'x-auth-token': token }
      });

      const botMessage = { 
        role: 'assistant', 
        text: res.data.reply
      };
      setMessages(prev => [...prev, botMessage]);
      speak(res.data.reply);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', text: 'Server error, try again' }]);
    } finally {
      setLoading(false);
    }
  };

  const startListening = () => {
    if (!recognition) return alert('Speech recognition not supported in this browser.');
    setIsListening(true);
    recognition.start();
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
          <div className="absolute -top-2 -right-2 bg-red-500 text-[10px] font-bold px-2 py-1 rounded-full animate-bounce">AI</div>
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
                  <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Active Intelligence</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setVoiceEnabled(!voiceEnabled)}
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
                  {msg.source === 'fallback' && (
                    <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-1.5 text-[10px] font-bold text-amber-600 uppercase tracking-tighter">
                      <Zap size={10} fill="currentColor" />
                      Quick analysis (AI unavailable)
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

          {/* Suggeted Questions */}
          <div className="px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide bg-gray-50/50 border-t border-gray-100">
            {['How is my business?', 'Profit low?', 'Spending?'].map(q => (
              <button 
                key={q}
                onClick={() => handleSend(q)}
                className="whitespace-nowrap bg-white border border-gray-200 px-3 py-1.5 rounded-full text-xs font-bold text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-all"
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
                className={`p-2 rounded-xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-indigo-600 hover:bg-white'}`}
              >
                <Mic size={22} />
              </button>
              <input 
                type="text" 
                placeholder={isListening ? 'Listening...' : "Ask anything..."}
                className="flex-1 bg-transparent border-none outline-none px-2 font-medium text-gray-700 placeholder:text-gray-400"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              />
              <button 
                disabled={!input.trim()}
                onClick={() => handleSend()}
                className="p-2 bg-indigo-600 text-white rounded-xl disabled:bg-indigo-300 disabled:cursor-not-allowed hover:bg-indigo-700 transition-all shadow-md active:scale-95"
              >
                <Send size={20} />
              </button>
            </div>
            <p className="text-[10px] text-center text-gray-400 mt-2 font-bold uppercase tracking-widest">Powered by Finexa Intelligence</p>
          </div>

        </div>
      )}
    </div>
  );
};

export default Chatbot;
