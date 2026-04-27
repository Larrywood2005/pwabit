import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/backend/config/database';
import Notification from '@/backend/models/Notification';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Get auth token from request
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    
    // Get user ID from token (this would normally be verified via middleware)
    // For now, we'll get it from the session/cookie
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/user/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).catch(() => null);

    if (!response?.ok) {
      // Try to get userId from cookies
      const cookies = request.headers.get('cookie') || '';
      const userIdMatch = cookies.match(/userId=([^;]+)/);
      const userId = userIdMatch?.[1];

      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { searchParams } = new URL(request.url);
      const skip = parseInt(searchParams.get('skip') || '0');
      const limit = parseInt(searchParams.get('limit') || '50');

      const notifications = await Notification.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await Notification.countDocuments({ userId });
      const unreadCount = await Notification.countDocuments({ userId, isRead: false });

      return NextResponse.json({
        success: true,
        notifications,
        total,
        unreadCount,
        hasMore: skip + limit < total
      });
    }

    const userData = await response.json();
    const userId = userData.user?._id || userData.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const skip = parseInt(searchParams.get('skip') || '0');
    const limit = parseInt(searchParams.get('limit') || '50');

    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Notification.countDocuments({ userId });
    const unreadCount = await Notification.countDocuments({ userId, isRead: false });

    return NextResponse.json({
      success: true,
      notifications,
      total,
      unreadCount,
      hasMore: skip + limit < total
    });
  } catch (error: any) {
    console.error('[v0] Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, type, title, message, relatedUserId, amount, currency } = body;

    if (!userId || !type || !title) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await connectDB();

    const notification = new Notification({
      userId,
      type,
      title,
      message,
      relatedUserId,
      amount: amount || 0,
      currency: currency || 'USD'
    });

    await notification.save();

    return NextResponse.json({
      success: true,
      notification
    }, { status: 201 });
  } catch (error: any) {
    console.error('[v0] Error creating notification:', error);
    return NextResponse.json(
      { error: 'Failed to create notification', details: error.message },
      { status: 500 }
    );
  }
}
