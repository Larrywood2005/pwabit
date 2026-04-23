import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/backend/config/database';
import ChatMessage from '@/backend/models/ChatMessage';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const skip = parseInt(searchParams.get('skip') || '0');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    
    // Admin only: retrieve all user messages - do NOT filter by sender
    let query: any = {};
    
    // Filter for unread messages if requested
    if (unreadOnly) {
      query.isResolved = false;
    }
    
    console.log('[DEBUG - Admin Chat Messages]', {
      query: query,
      limit: limit,
      skip: skip,
      message: 'Fetching all messages without sender filter'
    });
    
    // Fetch all user messages
    const messages = await ChatMessage.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(skip)
      .lean();
    
    const total = await ChatMessage.countDocuments(query);
    
    console.log('[DEBUG - Admin Chat Results]', {
      messagesFound: messages.length,
      total: total,
      hasMore: skip + limit < total,
      message: 'Successfully fetched messages'
    });
    
    // Always return proper JSON structure
    const response = {
      success: true,
      messages: messages.reverse(), // Return in chronological order
      total,
      hasMore: skip + limit < total,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    });
  } catch (error: any) {
    console.error('[v0] Admin chat fetch error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Always return JSON error, never HTML
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch messages',
        details: error.message || 'Unknown error'
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { messageId, isResolved } = body;
    
    if (!messageId) {
      return NextResponse.json(
        { error: 'messageId is required' },
        { status: 400 }
      );
    }
    
    // Update message resolution status
    const updated = await ChatMessage.findByIdAndUpdate(
      messageId,
      { 
        isResolved: isResolved,
        updatedAt: new Date()
      },
      { new: true }
    );
    
    if (!updated) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: updated
    });
  } catch (error: any) {
    console.error('[v0] Admin message update error:', error);
    return NextResponse.json(
      { error: 'Failed to update message', details: error.message },
      { status: 500 }
    );
  }
}
