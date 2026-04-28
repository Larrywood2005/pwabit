import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/backend/config/database';
import ChatMessage from '@/backend/models/ChatMessage';
import User from '@/backend/models/User';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const formData = await request.formData();
    const message = formData.get('message') as string;
    const userId = formData.get('userId') as string;
    const image = formData.get('image') as File | null;
    
    // Validate: must have text OR image
    if (!message?.trim() && !image) {
      return NextResponse.json(
        { error: 'Message must contain either text or image' },
        { status: 400 }
      );
    }
    
    // Fetch user for caching name and email (only if userId provided)
    let userName = 'Anonymous User';
    let userEmail = 'guest@example.com';
    
    if (userId) {
      const user = await User.findById(userId).select('fullName email');
      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
      userName = user.fullName || 'User';
      userEmail = user.email || 'guest@example.com';
    }
    
    // Image URL or Blob URL - passed from client
    let imageUrl = formData.get('imageUrl') as string | null;
    let imageType = null;
    
    if (image && !imageUrl) {
      // If file is provided but no URL, convert to base64 as fallback
      const arrayBuffer = await image.arrayBuffer();
      imageType = image.type;
      imageUrl = `data:${imageType};base64,${Buffer.from(arrayBuffer).toString('base64')}`;
    } else if (image && imageUrl) {
      imageType = image.type;
    }
    
    console.log('[v0] Creating chat message:', {
      userId,
      userName,
      userEmail,
      hasMessage: !!message?.trim(),
      hasImage: !!imageUrl,
      timestamp: new Date().toISOString()
    });
    
    // Create and save chat message
    const chatMessage = new ChatMessage({
      userId: userId || null,
      userEmail,
      userName,
      sender: userId ? 'user' : 'contact',
      message: message?.trim() || undefined,
      image: imageUrl,
      imageType,
      hasText: !!message?.trim(),
      hasImage: !!imageUrl,
      timestamp: new Date()
    });
    
    await chatMessage.save();
    
    console.log('[v0] Chat message saved successfully:', {
      messageId: chatMessage._id,
      sender: chatMessage.sender,
      timestamp: chatMessage.timestamp
    });
    
    return NextResponse.json({
      success: true,
      message: 'Message sent successfully',
      messageId: chatMessage._id,
      timestamp: new Date().toISOString()
    }, {
      status: 201,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error: any) {
    console.error('[v0] Chat message error:', {
      message: error.message,
      stack: error.stack
    });
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to send message',
        details: error.message || 'Unknown error'
      },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = parseInt(searchParams.get('skip') || '0');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }
    
    // Fetch user's chat messages
    const messages = await ChatMessage.find({ userId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(skip)
      .lean();
    
    const total = await ChatMessage.countDocuments({ userId });
    
    return NextResponse.json({
      success: true,
      messages: messages.reverse(), // Return in chronological order
      total,
      hasMore: skip + limit < total
    });
  } catch (error: any) {
    console.error('[v0] Chat message fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages', details: error.message },
      { status: 500 }
    );
  }
}
