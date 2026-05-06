'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, CheckCircle, Clock, Image as ImageIcon, Wifi, WifiOff } from 'lucide-react';
import { useSocket } from '@/hooks/useSocket';

interface ChatMessage {
  _id: string;
  userId: string;
  userName: string;
  userEmail: string;
  message?: string;
  image?: string;
  hasText: boolean;
  hasImage: boolean;
  isResolved: boolean;
  timestamp: string;
  sender?: string;
}

interface AdminChatMessagesModalProps {
  onClose: () => void;
}

export function AdminChatMessagesModal({ onClose }: AdminChatMessagesModalProps) {
  const { socket, connected } = useSocket();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
  const initialLoadRef = useRef(false);

  // Join admin room on socket connection
  useEffect(() => {
    if (socket && connected) {
      console.log('[v0] Socket connected, joining admin-messages room');
      socket.emit('join-admin', 'admin-panel');
      
      // Listen for new messages in real-time
      socket.on('new-message', (newMessage: ChatMessage) => {
        console.log('[v0] Real-time message received:', newMessage);
        setMessages(prev => {
          // Prevent duplicates
          if (prev.some(m => m._id === newMessage._id)) {
            return prev;
          }
          return [newMessage, ...prev];
        });
      });

      // Listen for message updates
      socket.on('message-updated', (update: any) => {
        console.log('[v0] Message updated:', update);
        setMessages(prev =>
          prev.map(m => 
            m._id === update.messageId 
              ? { ...m, isResolved: true }
              : m
          )
        );
      });

      return () => {
        socket.off('new-message');
        socket.off('message-updated');
      };
    }
  }, [socket, connected]);

  // Initial load and polling fallback
  useEffect(() => {
    if (!initialLoadRef.current) {
      initialLoadRef.current = true;
      fetchMessages();
    }
  }, []);

  // Polling fallback if socket is not connected
  useEffect(() => {
    if (!connected) {
      const pollInterval = setInterval(fetchMessages, 5000);
      return () => clearInterval(pollInterval);
    }
  }, [connected]);

  useEffect(() => {
    fetchMessages();
  }, [unreadOnly]);

  const fetchMessages = async () => {
    try {
      if (loading === true && messages.length === 0) {
        // Only show loading on initial fetch
      } else {
        // Silent refresh on background polls
      }
      
      setError('');
      
      console.log('[v0] Fetching chat messages:', { unreadOnly, socketConnected: connected });
      
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      
      const response = await fetch(`/api/admin/chat-messages?unreadOnly=${unreadOnly}&limit=100`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[v0] Chat API error response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText.substring(0, 200)
        });
        setError(`Failed to load messages (Status: ${response.status})`);
        setLoading(false);
        return;
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('[v0] Invalid content type:', contentType);
        setError('Invalid response from server');
        setLoading(false);
        return;
      }

      let data;
      try {
        const responseText = await response.text();
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('[v0] JSON parse error:', parseError);
        setError('Failed to parse server response');
        setLoading(false);
        return;
      }
      
      console.log('[v0] Messages fetched successfully:', {
        success: data.success,
        messagesCount: data.messages?.length || 0,
        total: data.total
      });
      
      if (data.success) {
        setMessages(data.messages || []);
      } else {
        setError(data.error || 'Failed to load messages');
      }
    } catch (err) {
      console.error('[v0] Error fetching messages:', err);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkResolved = async (messageId: string) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      
      const response = await fetch('/api/admin/chat-messages', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        credentials: 'include',
        body: JSON.stringify({ messageId, isResolved: true })
      });

      if (response.ok) {
        setMessages(prev => 
          prev.map(m => m._id === messageId ? { ...m, isResolved: true } : m)
        );
        setSelectedMessage(null);
        console.log('[v0] Message marked as resolved:', messageId);
      }
    } catch (err) {
      console.error('[v0] Error updating message:', err);
    }
  };

  const unreadCount = messages.filter(m => !m.isResolved).length;

  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
      <div className='bg-card rounded-lg max-w-6xl max-h-[90vh] overflow-hidden w-full flex flex-col'>
        {/* Header */}
        <div className='sticky top-0 p-6 border-b border-border flex items-center justify-between bg-card z-10'>
          <div>
            <h2 className='text-2xl font-bold text-foreground flex items-center gap-2'>
              <MessageCircle size={24} />
              User Messages
              <span className='flex items-center gap-1 text-sm font-normal text-muted-foreground ml-2'>
                {connected ? (
                  <>
                    <Wifi size={16} className='text-green-600' />
                    Real-time connected
                  </>
                ) : (
                  <>
                    <WifiOff size={16} className='text-yellow-600' />
                    Polling (socket disconnected)
                  </>
                )}
              </span>
            </h2>
            <p className='text-sm text-muted-foreground mt-1'>
              {unreadCount} unread • {messages.length} total
            </p>
          </div>
          <button onClick={onClose} className='text-muted-foreground hover:text-foreground'>
            <X size={24} />
          </button>
        </div>

        {/* Filter */}
        <div className='px-6 py-3 border-b border-border bg-muted/30 flex items-center gap-4'>
          <label className='flex items-center gap-2 cursor-pointer'>
            <input
              type='checkbox'
              checked={unreadOnly}
              onChange={(e) => setUnreadOnly(e.target.checked)}
              className='w-4 h-4'
            />
            <span className='text-sm text-foreground'>Show unread only</span>
          </label>
          <button
            onClick={fetchMessages}
            className='ml-auto text-sm px-3 py-1 bg-primary/20 text-primary rounded hover:bg-primary/30'
          >
            Refresh
          </button>
        </div>

        {/* Content */}
        <div className='flex-1 overflow-hidden flex'>
          {/* Messages List */}
          <div className='w-full md:w-96 border-r border-border overflow-y-auto'>
            {loading ? (
              <div className='p-4 text-center'>
                <div className='inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary'></div>
                <p className='text-xs text-muted-foreground mt-2'>Loading messages...</p>
              </div>
            ) : error ? (
              <div className='p-4 text-red-600 text-sm'>{error}</div>
            ) : messages.length === 0 ? (
              <div className='p-4 text-center text-muted-foreground text-sm'>
                No messages yet
              </div>
            ) : (
              <div className='space-y-1'>
                {messages.map(msg => (
                  <button
                    key={msg._id}
                    onClick={() => setSelectedMessage(msg)}
                    className={`w-full text-left p-4 border-b border-border hover:bg-muted/50 transition-colors ${
                      selectedMessage?._id === msg._id ? 'bg-primary/10' : ''
                    } ${!msg.isResolved ? 'bg-yellow-500/5' : ''}`}
                  >
                    <div className='flex items-start justify-between gap-2'>
                      <div className='flex-1 min-w-0'>
                        <p className='font-semibold text-foreground text-sm truncate'>
                          {msg.userName}
                        </p>
                        <p className='text-xs text-muted-foreground truncate'>
                          {msg.userEmail}
                        </p>
                        <p className='text-xs text-muted-foreground mt-1 flex items-center gap-1'>
                          <span className='inline-block px-1.5 py-0.5 bg-blue-600/20 text-blue-600 rounded text-[10px] font-semibold'>
                            {msg.sender || 'user'}
                          </span>
                          {msg.message?.substring(0, 40) || '[Image only]'}
                          {msg.message && msg.message.length > 40 ? '...' : ''}
                        </p>
                      </div>
                      <div className='flex-shrink-0 flex flex-col gap-1'>
                        {msg.isResolved ? (
                          <CheckCircle size={16} className='text-green-600' />
                        ) : (
                          <Clock size={16} className='text-yellow-600' />
                        )}
                        {msg.hasImage && (
                          <ImageIcon size={14} className='text-blue-600' />
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Message Detail */}
          <div className='hidden md:flex md:w-full flex-col'>
            {selectedMessage ? (
              <>
                <div className='p-6 border-b border-border'>
                  <h3 className='font-bold text-lg text-foreground mb-2'>
                    {selectedMessage.userName}
                  </h3>
                  <p className='text-sm text-muted-foreground mb-2'>
                    {selectedMessage.userEmail}
                  </p>
                  <p className='text-xs text-muted-foreground mb-2'>
                    Source: <span className='font-semibold capitalize'>{selectedMessage.sender || 'user'}</span>
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    {new Date(selectedMessage.timestamp).toLocaleString()}
                  </p>
                </div>

                <div className='flex-1 overflow-y-auto p-6'>
                  {selectedMessage.hasImage && selectedMessage.image && (
                    <img
                      src={selectedMessage.image}
                      alt='User attachment'
                      className='max-w-full max-h-64 rounded border border-border mb-4'
                    />
                  )}
                  {selectedMessage.message && (
                    <div className='prose dark:prose-invert text-sm'>
                      <p className='whitespace-pre-wrap text-foreground'>
                        {selectedMessage.message}
                      </p>
                    </div>
                  )}
                </div>

                <div className='p-6 border-t border-border flex gap-2'>
                  {!selectedMessage.isResolved && (
                    <button
                      onClick={() => handleMarkResolved(selectedMessage._id)}
                      className='flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors'
                    >
                      Mark as Resolved
                    </button>
                  )}
                  {selectedMessage.isResolved && (
                    <div className='flex-1 px-4 py-2 bg-green-500/20 text-green-600 rounded-lg text-center text-sm font-semibold'>
                      Resolved
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className='flex items-center justify-center h-full text-muted-foreground'>
                <p>Select a message to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
