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
    
    // Fetch user for caching name and email
    const user = await User.findById(userId).select('fullName email');
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Handle image upload if present
    let imageUrl = null;
    let imageType = null;
    if (image) {
      // For production, use Vercel Blob or S3
      // For now, store as base64 or use a temp URL
      const arrayBuffer = await image.arrayBuffer();
      imageType = image.type;
      imageUrl = `data:${imageType};base64,${Buffer.from(arrayBuffer).toString('base64')}`;
    }
    
    // Create and save chat message
    const chatMessage = new ChatMessage({
      userId,
      userEmail: user.email,
      userName: user.fullName,
      sender: 'user',
      message: message?.trim() || undefined,
      image: imageUrl,
      imageType,
      hasText: !!message?.trim(),
      hasImage: !!image
    });
    
    await chatMessage.save();
    
    return NextResponse.json({
      success: true,
      messageId: chatMessage._id,
      timestamp: new Date()
    });
  } catch (error: any) {
    console.error('[v0] Chat message save error:', error);
    return NextResponse.json(
      { error: 'Failed to save message', details: error.message },
      { status: 500 }
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
