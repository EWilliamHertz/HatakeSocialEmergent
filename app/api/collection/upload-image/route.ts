import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import sql from '@/lib/db';

// Upload custom image for a card (store as base64 data URL)
export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await getSessionUser(sessionToken);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('image') as File;
    const itemId = formData.get('itemId') as string;

    if (!file || !itemId) {
      return NextResponse.json(
        { error: 'Image file and item ID are required' },
        { status: 400 }
      );
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      );
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Image must be less than 5MB' },
        { status: 400 }
      );
    }

    // Convert to base64 data URL
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;

    // Update the collection item with the custom image URL
    await sql`
      UPDATE collection_items
      SET custom_image_url = ${dataUrl}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${parseInt(itemId)} AND user_id = ${user.user_id}
    `;

    return NextResponse.json({ 
      success: true, 
      imageUrl: dataUrl 
    });
  } catch (error) {
    console.error('Upload image error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Delete custom image
export async function DELETE(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await getSessionUser(sessionToken);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');

    if (!itemId) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      );
    }

    await sql`
      UPDATE collection_items
      SET custom_image_url = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${parseInt(itemId)} AND user_id = ${user.user_id}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete image error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
