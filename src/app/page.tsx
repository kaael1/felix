'use client';

import React, { useState, useRef, useEffect } from 'react';
import { TransferState, Message } from '@/types';
import StatePanel from '@/components/StatePanel';
import ChatBubble from '@/components/ChatBubble';
import { Send, Menu, X, Wallet, RefreshCw } from 'lucide-react';

const INITIAL_STATE: TransferState = {
  destinationCountry: null,
  amount: null,
  beneficiaryName: null,
  deliveryMethod: null,
  isComplete: false,
};

const INITIAL_MESSAGE: Message = {
  id: 'init-1',
  role: 'agent',
  content: "Hi! I'm your Send Money Assistant. How can I help you with your transfer today?",
  timestamp: new Date(),
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [transferState, setTransferState] = useState<TransferState>(INITIAL_STATE);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // Manages session_id - always generates new one on each page load
  // This ensures state is cleared when user reloads
  const [sessionId, setSessionId] = useState<string>(() => {
    // Always generate a new session_id on each load
    // Does not reuse from sessionStorage to avoid residual state from backend
    if (typeof window !== 'undefined') {
      const newId = crypto.randomUUID?.() || `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      return newId;
    }
    return `session-${Date.now()}`;
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Ensure input gets focus back after loading finishes
  useEffect(() => {
    if (!isLoading) {
      inputRef.current?.focus();
    }
  }, [isLoading]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userText = inputValue.trim();
    setInputValue('');
    
    // Add user message
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userText,
      timestamp: new Date(),
    };
    
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userMessage: userText,
          messageHistory: newHistory,
          sessionId: sessionId, // Send session_id to reuse session
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from server');
      }

      const data = await response.json();
      
      // Debug: verify response structure
      console.log('Response data:', data);
      
      if (!data.agentResponse) {
        console.error('Missing agentResponse in data:', data);
        throw new Error('Invalid response format: missing agentResponse');
      }
      
      const agentMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        content: data.agentResponse,
        timestamp: new Date(),
        promo: data.promo || undefined,
      };

      setMessages(prev => [...prev, agentMsg]);
      setTransferState(data.updatedState || transferState);
    } catch (error) {
      console.error("Error processing message:", error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        content: "I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([INITIAL_MESSAGE]);
    setTransferState(INITIAL_STATE);
    setInputValue('');
    // Generate new session_id on reset
    const newSessionId = crypto.randomUUID?.() || `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(newSessionId);
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden relative">
      
      {/* Mobile Header */}
      <div className="lg:hidden absolute top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-30 px-4 flex items-center justify-between">
        <div className="flex items-center space-x-2 text-blue-600 font-bold">
           <Wallet size={24} />
           <span>SendMoney AI</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar (State Panel) - Desktop: Always visible, Mobile: Slide over */}
      <div className={`
        fixed inset-y-0 left-0 z-20 w-80 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 shadow-2xl lg:shadow-none
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <StatePanel state={transferState} />
      </div>

      {/* Overlay for mobile sidebar */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-10 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full w-full max-w-5xl mx-auto lg:pt-0 pt-16">
        
        {/* Header (Desktop) - Optional Reset Button */}
        <div className="hidden lg:flex items-center justify-between px-8 py-4 border-b border-slate-200 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center space-x-2 text-slate-700 font-semibold">
            <Wallet size={20} className="text-blue-600" />
            <span>SendMoney AI Agent</span>
          </div>
          <button 
            onClick={handleReset}
            className="text-xs flex items-center space-x-1 text-slate-500 hover:text-blue-600 transition-colors"
            title="Start Over"
          >
            <RefreshCw size={14} />
            <span>Reset</span>
          </button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 scrollbar-hide">
          <div className="max-w-3xl mx-auto">
            {messages.map((msg) => (
              <ChatBubble key={msg.id} message={msg} />
            ))}
            
            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex justify-start w-full mb-6">
                 <div className="flex items-center space-x-2 bg-white px-4 py-3 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm ml-11">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                 </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-slate-200">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSendMessage} className="relative flex items-center">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={transferState.isComplete ? "Type to start a new transfer..." : "Type your message..."}
                className="w-full pl-6 pr-14 py-4 bg-slate-100 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-full transition-all outline-none text-slate-800 placeholder:text-slate-400 font-medium"
                autoFocus
                // Removed disabled={isLoading} to keep focus available
              />
              <button 
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="absolute right-2 p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors shadow-md"
              >
                <Send size={18} />
              </button>
            </form>
            <p className="text-center text-xs text-slate-400 mt-3">
              AI can make mistakes. Please verify transaction details.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
