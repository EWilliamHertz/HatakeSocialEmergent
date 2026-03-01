import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import sql from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  try {
    const posts = await sql`
      SELECT ep.post_id, ep.event_id, ep.user_id, ep.content, ep.media_urls, ep.created_at,
             u.name as author_name, u.picture as author_picture,
             eo.role as author_role
      FROM event_posts ep
      JOIN users u ON ep.user_id = u.user_id
      LEFT JOIN event_organizers eo ON ep.event_id = eo.event_id AND ep.user_id = eo.user_id
      WHERE ep.event_id = ${eventId}
      ORDER BY ep.created_at DESC
    `;
    return NextResponse.json({ success: true, posts });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  if (!user.is_admin) {
    const orgCheck = await sql`SELECT role FROM event_organizers WHERE event_id = ${eventId} AND user_id = ${user.user_id}`;
    if (!orgCheck[0]) return NextResponse.json({ success: false, error: 'Only admins and organizers/exhibitors can post' }, { status: 403 });
  }
  try {
    const { content, media_urls } = await req.json();
    if (!content?.trim() && (!media_urls || !media_urls.length)) {
      return NextResponse.json({ success: false, error: 'Post must have content or media' }, { status: 400 });
    }
    const post = await sql`
      INSERT INTO event_posts (event_id, user_id, content, media_urls, created_at)
      VALUES (${eventId}, ${user.user_id}, ${content || ''}, ${JSON.stringify(media_urls || [])}, NOW())
      RETURNING *
    `;
    return NextResponse.json({ success: true, post: post[0] });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const { postId } = await req.json();
  try {
    const post = await sql`SELECT user_id FROM event_posts WHERE post_id = ${postId} AND event_id = ${eventId}`;
    if (!post[0]) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    if (!user.is_admin && post[0].user_id !== user.user_id) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    await sql`DELETE FROM event_posts WHERE post_id = ${postId}`;
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
