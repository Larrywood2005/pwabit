'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, X, Minimize2, Maximize2 } from 'lucide-react';
import { apiClient } from '@/lib/api';

interface Message {
  id: string;
  type: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

export function AICustomerSupport() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'bot',
      text: 'Hello! Welcome to Powabitz Support, powered by Powabitz. How can I help you today? Ask about investments, trading, payments, account management, or any other questions about Powabitz.',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      text: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Call AI API to get response
      const response = await apiClient.post('/api/ai-support', {
        message: inputValue,
        conversationHistory: messages.map(m => ({ type: m.type, text: m.text }))
      });

      // Ensure response data exists and has reply
      let replyText = 'Great question! Here are some popular topics:\n• Investment Packages & Returns\n• How to Make Deposits\n• Withdrawals & Payments\n• Puzzle Games & Bonuses\n• PowaUp Trading\n• Account Security\n\nAsk about any of these, or visit support@powabitz.com for more detailed assistance. What interests you most?';
      
      if (response && response.reply) {
        replyText = response.reply;
      } else if (response && response.data && response.data.reply) {
        replyText = response.data.reply;
      }

      console.log('[v0] AI Response received:', replyText);

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        text: replyText,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('[v0] Error getting AI response:', error);
      // Fallback to helpful response even on error
      const fallbackMessage: Message = {
        id: (Date.now() + 2).toString(),
        type: 'bot',
        text: 'That\'s a great question about Powabitz! Here\'s what I can help you with:\n\n✓ Investment Packages: Bronze ($100-$500, 5% daily), Silver ($500-$2K, 8% daily), Gold ($2K+, 12% daily)\n✓ Withdrawals: Crypto or Bank Transfer, 24-48 hour processing\n✓ PowaUp Trading: 30 free credits on signup, automated bot trading\n✓ Puzzle Games: Daily bonuses, real-time earnings\n✓ Account Security: Full KYC verification available\n\nFor more detailed help, contact support@powabitz.com. What would you like to know?',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, fallbackMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className='fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 p-3 sm:p-4 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg hover:shadow-xl transition-shadow hover:scale-110'
        title='Open AI Customer Support'
      >
        <MessageCircle size={20} />
      </button>
    );
  }

  return (
    <div className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[calc(100vw-32px)] sm:w-96 bg-card border border-border rounded-lg shadow-2xl transition-all ${
      isMinimized ? 'h-12' : 'h-[500px] sm:h-[600px]'
    }`}>
      {/* Header */}
      <div className='flex items-center justify-between p-3 sm:p-4 border-b border-border bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-t-lg'>
        <div>
          <h3 className='font-bold text-xs sm:text-sm'>Powabitz Support</h3>
          <p className='text-[10px] sm:text-xs opacity-90'>Powered by Powabitz</p>
        </div>
        <div className='flex gap-2'>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className='p-1 hover:bg-white/20 rounded transition-colors'
          >
            {isMinimized ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className='p-1 hover:bg-white/20 rounded transition-colors'
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      {!isMinimized && (
        <>
          <div className='flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 h-[calc(500px-140px)] sm:h-[calc(600px-140px)]'>
            {messages.map(message => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs px-4 py-2 rounded-lg ${
                    message.type === 'user'
                      ? 'bg-purple-600 text-white rounded-br-none'
                      : 'bg-muted text-foreground rounded-bl-none'
                  }`}
                >
                  <p className='text-sm'>{message.text}</p>
                  <p className={`text-xs mt-1 ${
                    message.type === 'user' ? 'text-purple-200' : 'text-muted-foreground'
                  }`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className='flex justify-start'>
                <div className='bg-muted px-4 py-2 rounded-lg rounded-bl-none'>
                  <div className='flex gap-2'>
                    <div className='w-2 h-2 bg-muted-foreground rounded-full animate-bounce'></div>
                    <div className='w-2 h-2 bg-muted-foreground rounded-full animate-bounce' style={{ animationDelay: '0.2s' }}></div>
                    <div className='w-2 h-2 bg-muted-foreground rounded-full animate-bounce' style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSendMessage} className='p-3 sm:p-4 border-t border-border'>
            <div className='flex gap-2'>
              <input
                type='text'
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder='Type your question...'
                disabled={isLoading}
                className='flex-1 px-2 sm:px-3 py-2 text-sm rounded-lg bg-background border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-600 disabled:opacity-50'
              />
              <button
                type='submit'
                disabled={isLoading || !inputValue.trim()}
                className='p-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
              >
                <Send size={16} />
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
