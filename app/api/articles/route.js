import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import sql from '@/lib/db';

// GET all published articles
export async function GET() {
  try {
    const articles = await sql`
      SELECT a.article_id, a.title, a.slug, a.excerpt, a.cover_image, a.created_at, 
             u.name as author_name, u.picture as author_picture
      FROM articles a
      JOIN users u ON a.author_id = u.user_id
      WHERE a.published = true
      ORDER BY a.created_at DESC
    `;
    return NextResponse.json({ success: true, articles });
  } catch (error) {
    console.error('Get articles error:', error);
    return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 });
  }
}

// POST a new article (Creator only)
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { title, content, excerpt, cover_image, published } = await request.json();

    // Generate a URL-friendly slug
    const baseSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 8)}`;

    const [article] = await sql`
      INSERT INTO articles (title, slug, content, excerpt, cover_image, author_id, published)
      VALUES (${title}, ${slug}, ${content}, ${excerpt}, ${cover_image || null}, ${user.user_id}, ${published})
      RETURNING *
    `;

    return NextResponse.json({ success: true, article });
  } catch (error) {
    console.error('Create article error:', error);
    return NextResponse.json({ error: 'Failed to create article' }, { status: 500 });
  }
}
