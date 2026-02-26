import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import sql from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const [article] = await sql`
      SELECT a.*, u.name as author_name, u.picture as author_picture
      FROM articles a JOIN users u ON a.author_id = u.user_id WHERE a.slug = ${slug}
    `;
    if (!article) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, article });
  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

// NEW: Add the ability to EDIT an article
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { slug } = await params;
    const { title, content, excerpt, cover_image, category, published } = await request.json();

    const [article] = await sql`
      UPDATE articles 
      SET title = ${title}, content = ${content}, excerpt = ${excerpt}, 
          cover_image = ${cover_image}, category = ${category}, published = ${published}, updated_at = NOW()
      WHERE slug = ${slug} AND author_id = ${user.user_id}
      RETURNING *
    `;

    return NextResponse.json({ success: true, article });
  } catch (error) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}