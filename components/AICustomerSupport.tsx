'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, X, Minimize2, Maximize2, Upload, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface Message {
  id: string;
  type: 'user' | 'bot';
  text?: string;
  image?: string;
  imageType?: string;
  timestamp: Date;
}

export function AICustomerSupport() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'bot',
      text: 'Hello! Welcome to Powabitz Support. How can I help you today? Ask about investments, trading, payments, account management, or any other questions about Powabitz.',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ file: File; preview: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage({
          file,
          preview: event.target?.result as string
        });
      };
      reader.readAsDataURL(file);
    } else {
      alert('Please select a valid image file');
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim() && !selectedImage) {
      alert('Please enter a message or select an image');
      return;
    }

    if (!user?.id) {
      alert('User not authenticated');
      return;
    }

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      text: inputValue || undefined,
      image: selectedImage?.preview || undefined,
      imageType: selectedImage?.file.type || undefined,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    removeImage();
    setIsLoading(true);

    try {
      // Save message to database for admin viewing
      const formData = new FormData();
      formData.append('userId', user.id);
      formData.append('message', inputValue || '');
      if (selectedImage?.file) {
        formData.append('image', selectedImage.file);
      }

      const saveResponse = await fetch('/api/chat-messages', {
        method: 'POST',
        body: formData
      });

      if (!saveResponse.ok) {
        console.warn('[v0] Failed to save message to database');
      }

      // Get AI response
      const aiResponse = await fetch('/api/ai-support', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputValue || '[User sent an image]',
          conversationHistory: messages.map(m => ({ 
            type: m.type, 
            text: m.text || '[Image message]'
          }))
        })
      });

      const data = await aiResponse.json();
      let replyText = 'I received your message. How else can I help you with Powabitz today?';
      
      if (data && data.reply) {
        replyText = data.reply;
      }

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        text: replyText,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('[v0] Error in chat:', error);
      const fallbackMessage: Message = {
        id: (Date.now() + 2).toString(),
        type: 'bot',
        text: 'That\'s a great question about Powabitz! Our support team will review your message. For immediate assistance, contact support@powabitz.com. What else can I help you with?',
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
        className='fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 p-3 sm:p-4 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg hover:shadow-xl hover:scale-110 transition-all active:scale-95'
        title='Open AI Customer Support'
        aria-label='Open customer support chat'
      >
        <MessageCircle size={20} className='sm:w-6 sm:h-6' />
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
                  {message.image && (
                    <img 
                      src={message.image} 
                      alt="Chat attachment"
                      className='max-w-xs rounded mb-2 cursor-pointer hover:opacity-80'
                      onClick={() => window.open(message.image, '_blank')}
                    />
                  )}
                  {message.text && (
                    <p className='text-sm'>{message.text}</p>
                  )}
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
            {/* Selected Image Preview */}
            {selectedImage && (
              <div className='mb-3 relative'>
                <img 
                  src={selectedImage.preview} 
                  alt="Selected"
                  className='max-h-24 rounded border border-border'
                />
                <button
                  type='button'
                  onClick={removeImage}
                  className='absolute -top-2 -right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700'
                >
                  <X size={14} />
                </button>
              </div>
            )}
            
            <div className='flex gap-2'>
              <input
                type='text'
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder='Type your question... or attach an image'
                disabled={isLoading}
                className='flex-1 px-2 sm:px-3 py-2 text-sm rounded-lg bg-background border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-600 disabled:opacity-50'
              />
              
              {/* Image Upload Button */}
              <button
                type='button'
                disabled={isLoading}
                className='p-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-50'
                onClick={() => fileInputRef.current?.click()}
                title='Attach image'
              >
                <ImageIcon size={16} />
              </button>
              
              <input
                ref={fileInputRef}
                type='file'
                accept='image/*'
                onChange={handleImageSelect}
                className='hidden'
              />
              
              <button
                type='submit'
                disabled={isLoading || (!inputValue.trim() && !selectedImage)}
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
