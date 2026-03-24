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
  const triggerRecRef = useRef(null);

  const greetingText = "Hello! I am Finexa, your AI business assistant. How can I help you today?";

  if (recognition) {
    recognition.continuous = false;
    recognition.interimResults = true; // Enable live feedback
    
    recognition.onresult = (event) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          setIsListening(false);
          handleSend(transcript, true);
        } else {
          interimTranscript += transcript;
          setInput(interimTranscript); // Show live text
        }
      }
    };

    recognition.onerror = (err) => {
      console.error("Recognition error:", err.error);
      setIsListening(false);
      startTrigger();
    };
    
    recognition.onend = () => {
      if (!isListening) startTrigger();
    };
  }

  const startTrigger = () => {
    if (!Recognition || isListening) return;
    if (triggerRecRef.current) return;

    console.log("Finexa: Starting voice trigger recognition...");
    const tr = new Recognition();
    tr.continuous = true;
    tr.interimResults = true;
    
    tr.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript.toLowerCase();
        console.log("Finexa Trigger Current Transcript:", transcript);
        
        const hasHey = transcript.includes('hey') || transcript.includes('hi') || transcript.includes('hello');
        const hasFinexa = transcript.includes('finexa') || transcript.includes('phoenix') || transcript.includes('fine') || 
                           transcript.includes('find') || transcript.includes('five') || transcript.includes('finance') ||
                           transcript.includes('finish') || transcript.includes('assistant') || transcript.includes('buddy') ||
                           transcript.includes('help');
        
        if (hasFinexa || (hasHey && hasFinexa)) {
          console.log("Finexa: Wake word detected! Opening chat...");
          window.alert("Matched: " + (hasFinexa ? "Finexa/Assistant word" : "Hey phrase")); // Final debug HUD
          stopTrigger();
          setIsOpen(true);
          // Play greeting then start listening automatically
          speak(greetingText, () => {
            console.log("Greeting finished or failed. Starting to listen...");
            startListening();
          });
        }
      }
    };
    
    tr.onerror = (err) => {
      console.error("Finexa Trigger Error:", err.error);
      stopTrigger();
      // Restart after a short delay if it's not a permanent error
      if (err.error !== 'not-allowed') {
        setTimeout(startTrigger, 1000);
      }
    };

    tr.onend = () => {
      console.log("Finexa Trigger: Recognition ended.");
      triggerRecRef.current = null;
      if (!isListening) {
        setTimeout(startTrigger, 500);
      }
    };

    try {
      tr.start();
      triggerRecRef.current = tr;
    } catch (e) {
      console.error("Finexa Trigger Start Error:", e);
      triggerRecRef.current = null;
    }
  };

  const stopTrigger = () => {
    if (triggerRecRef.current) {
      try { triggerRecRef.current.stop(); } catch (e) {}
      triggerRecRef.current = null;
    }
  };

  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1);
    } catch (e) {}
  };

  // --- Voice Trigger Setup ---
  useEffect(() => {
    startTrigger();
    return () => stopTrigger();
  }, [Recognition]);

  // --- Text-to-Speech ---
  const speak = (text, onEndCallback) => {
    if (!voiceEnabled || !window.speechSynthesis) {
      if (onEndCallback) onEndCallback();
      return;
    }
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    if (/[\u0900-\u097F]/.test(text)) {
      utterance.lang = 'hi-IN'; 
    } else {
      utterance.lang = 'en-US';
    }

    if (onEndCallback) {
      utterance.onend = () => onEndCallback();
      utterance.onerror = () => onEndCallback();
    }
    
    window.speechSynthesis.speak(utterance);
  };

  const handleSend = async (text, isVoiceSession = false) => {
    const messageText = text || input;
    if (!messageText.trim()) {
      if (isVoiceSession) startTrigger();
      return;
    }

    const userMessage = { role: 'user', text: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('http://localhost:5555/api/chat', { question: messageText }, {
        headers: { 'x-auth-token': token }
      });

      const botMessage = { 
        role: 'assistant', 
        text: res.data.reply,
        source: res.data.source
      };
      setMessages(prev => [...prev, botMessage]);
      
      speak(res.data.reply, () => {
        if (isVoiceSession && voiceEnabled) {
          startListening();
        } else {
          startTrigger();
        }
      });
    } catch (error) {
      console.error('Chat error:', error);
      const errorMsg = error.code === 'ERR_NETWORK' 
        ? 'Cannot connect to server. Please ensure the backend is running on port 5555.'
        : 'Sorry, I am having trouble connecting. Check your internet or backend status.';
      setMessages(prev => [...prev, { role: 'assistant', text: errorMsg }]);
      startTrigger();
    } finally {
      setLoading(false);
    }
  };

  const startListening = () => {
    if (!recognition) return alert('Speech recognition not supported in this browser.');
    stopTrigger();
    setIsListening(true);
    try {
      recognition.start();
    } catch (e) {
      console.error("Recognition start error:", e);
      setIsListening(false);
      startTrigger();
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
          {triggerRecRef.current && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse shadow-sm" title="Voice Trigger Active"></div>
          )}
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

          {/* Suggeted Questions */}
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
                className={`p-2 rounded-xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-indigo-600 hover:bg-white'}`}
              >
                <Mic size={22} />
              </button>
              <input 
                type="text" 
                placeholder={isListening ? 'Listening...' : "Ask anything..."}
                className="flex-1 bg-transparent border-none outline-none px-2 font-medium text-gray-700 placeholder:text-gray-400 font-sans"
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
            <p className="text-[10px] text-center text-gray-400 mt-2 font-bold uppercase tracking-widest">Powered by Finexa Data Analysis</p>
          </div>

        </div>
      )}
    </div>
  );
};

export default Chatbot;

