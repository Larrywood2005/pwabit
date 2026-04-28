import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type - only allow images
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Only image files are allowed' },
        { status: 400 }
      );
    }

    // Validate file size - max 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const buffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const filename = `kyc-${timestamp}-${file.name}`;

    // Upload to Vercel Blob with permanent storage
    const blob = await put(filename, uint8Array, {
      access: 'private', // Keep KYC documents private
      addRandomSuffix: true,
      contentType: file.type,
    });

    console.log('[v0] KYC document uploaded to Blob:', {
      filename: blob.pathname,
      size: blob.size,
      url: blob.url
    });

    return NextResponse.json({
      success: true,
      url: blob.url,
      filename: blob.pathname,
      size: blob.size
    }, {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error: any) {
    console.error('[v0] Upload error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to upload file',
        details: error.message
      },
      { status: 500 }
    );
  }
}
