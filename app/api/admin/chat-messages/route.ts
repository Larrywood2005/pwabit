import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/backend/config/database';
import ChatMessage from '@/backend/models/ChatMessage';

export async function POST(request: NextRequest) {
  try {
    console.log('[DEBUG] Admin chat-messages POST request received');
    
    await connectDB();
    
    const body = await request.json();
    const { userName, userEmail, message, subject, hasText, hasImage, image } = body;
    
    // Validate required fields
    if (!userName || !userEmail) {
      return NextResponse.json(
        { error: 'userName and userEmail are required', success: false },
        { status: 400 }
      );
    }
    
    if (!hasText && !hasImage) {
      return NextResponse.json(
        { error: 'Message must contain either text or image', success: false },
        { status: 400 }
      );
    }
    
    console.log('[v0] Creating chat message from contact/support:', {
      userName,
      userEmail,
      hasText,
      hasImage,
      subject
    });
    
    // Create and save chat message - message will appear in admin dashboard
    const chatMessage = new ChatMessage({
      userId: null, // Anonymous messages from contact form
      userEmail,
      userName,
      sender: 'contact',
      message: message || undefined,
      subject: subject || undefined,
      image: image || undefined,
      hasText,
      hasImage,
      isResolved: false,
      timestamp: new Date()
    });
    
    await chatMessage.save();
    
    console.log('[v0] Chat message saved successfully:', chatMessage._id);
    
    return NextResponse.json({
      success: true,
      messageId: chatMessage._id,
      timestamp: new Date()
    }, {
      status: 201,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error: any) {
    console.error('[v0] Chat message save error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to save message', 
        details: error.message 
      },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('[DEBUG] Admin chat-messages GET request received');
    
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
    console.log('[DEBUG] Admin chat-messages PUT request received');
    
    await connectDB();
    
    const body = await request.json();
    const { messageId, isResolved } = body;
    
    if (!messageId) {
      return NextResponse.json(
        { error: 'messageId is required', success: false },
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
        { error: 'Message not found', success: false },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: updated
    }, {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error: any) {
    console.error('[v0] Admin message update error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update message', 
        details: error.message 
      },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
