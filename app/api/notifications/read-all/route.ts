import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/backend/config/database';
import Notification from '@/backend/models/Notification';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);

    // Get userId from cookies or token verification
    const cookies = request.headers.get('cookie') || '';
    const userIdMatch = cookies.match(/userId=([^;]+)/);
    const userId = userIdMatch?.[1];

    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 401 });
    }

    await connectDB();

    const result = await Notification.updateMany(
      { userId, isRead: false },
      { isRead: true, updatedAt: new Date() }
    );

    return NextResponse.json({
      success: true,
      modifiedCount: result.modifiedCount
    });
  } catch (error: any) {
    console.error('[v0] Error marking all notifications as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark all as read', details: error.message },
      { status: 500 }
    );
  }
}
