import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const [article] = await sql`
      SELECT a.*, u.name as author_name, u.picture as author_picture
      FROM articles a
      JOIN users u ON a.author_id = u.user_id
      WHERE a.slug = ${slug}
    `;

    if (!article) return NextResponse.json({ error: 'Article not found' }, { status: 404 });

    return NextResponse.json({ success: true, article });
  } catch (error) {
    console.error('Get article error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
