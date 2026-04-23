'use client';

import { useState, useEffect } from 'react';
import { MessageCircle, X, CheckCircle, Clock, Image as ImageIcon } from 'lucide-react';

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
}

interface AdminChatMessagesModalProps {
  onClose: () => void;
}

export function AdminChatMessagesModal({ onClose }: AdminChatMessagesModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);

  useEffect(() => {
    fetchMessages();
  }, [unreadOnly]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('[DEBUG - AdminChatMessagesModal]', {
        fetching: true,
        unreadOnly: unreadOnly,
        url: `/api/admin/chat-messages?unreadOnly=${unreadOnly}&limit=100`
      });
      
      const response = await fetch(`/api/admin/chat-messages?unreadOnly=${unreadOnly}&limit=100`);
      
      // Check if response is ok and is JSON
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

      // Verify content type is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('[v0] Invalid content type:', contentType);
        setError('Invalid response from server');
        setLoading(false);
        return;
      }

      // Parse JSON safely
      let data;
      try {
        const responseText = await response.text();
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('[v0] JSON parse error:', parseError);
        console.error('[v0] Response text:', await response.text());
        setError('Failed to parse server response');
        setLoading(false);
        return;
      }
      
      console.log('[DEBUG - AdminChatMessagesModal Response]', {
        success: data.success,
        messagesCount: data.messages?.length || 0,
        total: data.total,
        error: data.error
      });
      
      if (data.success) {
        setMessages(data.messages || []);
      } else {
        setError(data.error || 'Failed to load messages');
      }
    } catch (err) {
      console.error('[v0] Error fetching messages:', err);
      setError('Failed to load messages - ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleMarkResolved = async (messageId: string) => {
    try {
      const response = await fetch('/api/admin/chat-messages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, isResolved: true })
      });

      if (response.ok) {
        setMessages(prev => 
          prev.map(m => m._id === messageId ? { ...m, isResolved: true } : m)
        );
        setSelectedMessage(null);
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
                        <p className='text-xs text-muted-foreground mt-1'>
                          {msg.message?.substring(0, 50) || '[Image only]'}
                          {msg.message && msg.message.length > 50 ? '...' : ''}
                        </p>
                      </div>
                      <div className='flex-shrink-0'>
                        {msg.isResolved ? (
                          <CheckCircle size={16} className='text-green-600' />
                        ) : (
                          <Clock size={16} className='text-yellow-600' />
                        )}
                        {msg.hasImage && (
                          <ImageIcon size={14} className='text-blue-600 mt-1' />
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
                  <p className='text-sm text-muted-foreground mb-4'>
                    {selectedMessage.userEmail}
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
