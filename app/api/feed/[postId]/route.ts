import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import sql from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const { postId } = await params;
    const posts = await sql`SELECT * FROM posts WHERE post_id = ${postId}`;
    if (posts.length === 0) return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    const post = posts[0];
    const isPlatformAdmin = (user as any).role === 'admin' || (user as any).is_admin === true;
    if (post.user_id === user.user_id || isPlatformAdmin) {
      await sql`DELETE FROM posts WHERE post_id = ${postId}`;
      return NextResponse.json({ success: true, message: 'Post deleted' });
    }
    if (post.group_id) {
      const membership = await sql`SELECT role FROM group_members WHERE group_id = ${post.group_id} AND user_id = ${user.user_id}`;
      if (membership.length > 0 && (membership[0].role === 'admin' || membership[0].role === 'owner')) {
        await sql`DELETE FROM posts WHERE post_id = ${postId}`;
        return NextResponse.json({ success: true, message: 'Post deleted by admin' });
      }
    }
    return NextResponse.json({ error: 'Not authorized to delete this post' }, { status: 403 });
  } catch (error) {
    console.error('Delete post error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const { postId } = await params;
    const { content } = await request.json();
    if (!content?.trim()) return NextResponse.json({ error: 'Content cannot be empty' }, { status: 400 });
    const posts = await sql`SELECT * FROM posts WHERE post_id = ${postId}`;
    if (posts.length === 0) return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    const post = posts[0];
    const isPlatformAdmin = (user as any).role === 'admin' || (user as any).is_admin === true;
    const isOwner = post.user_id === user.user_id;
    if (!isOwner && !isPlatformAdmin) return NextResponse.json({ error: 'Not authorized to edit this post' }, { status: 403 });
    await sql`UPDATE posts SET content = ${content.trim()}, updated_at = NOW() WHERE post_id = ${postId}`;
    return NextResponse.json({ success: true, message: 'Post updated' });
  } catch (error) {
    console.error('Update post error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
