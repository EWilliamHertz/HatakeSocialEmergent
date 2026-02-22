import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { v2 as cloudinary } from 'cloudinary';
import { generateId } from '@/lib/utils';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: NextRequest) {
  try {
    // Use JWT auth for mobile compatibility
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check if Cloudinary is configured
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return NextResponse.json({ 
        error: 'File upload not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env' 
      }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/quicktime'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    // Validate file size (max 10MB for images, 100MB for videos on free plan)
    const maxSize = file.type.startsWith('video/') ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: `File too large (max ${file.type.startsWith('video/') ? '100MB' : '10MB'})` }, { status: 400 });
    }

    // Convert file to base64 for Cloudinary upload
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const dataURI = `data:${file.type};base64,${base64}`;

    // Determine resource type
    const resourceType = file.type.startsWith('video/') ? 'video' : 'image';

    // Upload to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(dataURI, {
      folder: 'hatake-social',
      public_id: generateId('file'),
      resource_type: resourceType,
      // Add transformations for optimization
      transformation: resourceType === 'image' ? [
        { quality: 'auto:good', fetch_format: 'auto' }
      ] : undefined
    });

    return NextResponse.json({ 
      success: true, 
      url: uploadResult.secure_url,
      filename: uploadResult.public_id,
      type: file.type,
      size: file.size,
      width: uploadResult.width,
      height: uploadResult.height
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    );
  }
}
