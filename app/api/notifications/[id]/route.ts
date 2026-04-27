import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/backend/config/database';
import Notification from '@/backend/models/Notification';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: 'Notification ID required' }, { status: 400 });
    }

    await connectDB();

    const notification = await Notification.findByIdAndUpdate(
      id,
      { isRead: true, updatedAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      notification
    });
  } catch (error: any) {
    console.error('[v0] Error marking notification as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark notification as read', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: 'Notification ID required' }, { status: 400 });
    }

    await connectDB();

    const result = await Notification.findByIdAndDelete(id);

    if (!result) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error: any) {
    console.error('[v0] Error deleting notification:', error);
    return NextResponse.json(
      { error: 'Failed to delete notification', details: error.message },
      { status: 500 }
    );
  }
}
