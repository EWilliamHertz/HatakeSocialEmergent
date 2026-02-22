import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import sql from '@/lib/db';

// DELETE - Delete a post (owner or group admin)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { postId } = await params;

    // Get the post
    const posts = await sql`
      SELECT * FROM posts WHERE post_id = ${postId}
    `;

    if (posts.length === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const post = posts[0];

    // Check if user is the owner
    if (post.user_id === user.user_id) {
      // User owns the post, can delete
      await sql`DELETE FROM posts WHERE post_id = ${postId}`;
      return NextResponse.json({ success: true, message: 'Post deleted' });
    }

    // Check if user is admin of the group (if post is in a group)
    if (post.group_id) {
      const membership = await sql`
        SELECT role FROM group_members 
        WHERE group_id = ${post.group_id} AND user_id = ${user.user_id}
      `;

      if (membership.length > 0 && (membership[0].role === 'admin' || membership[0].role === 'owner')) {
        // User is admin/owner of the group, can delete
        await sql`DELETE FROM posts WHERE post_id = ${postId}`;
        return NextResponse.json({ success: true, message: 'Post deleted by admin' });
      }
    }

    return NextResponse.json({ error: 'Not authorized to delete this post' }, { status: 403 });
  } catch (error) {
    console.error('Delete post error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update a post (owner only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { postId } = await params;
    const { content } = await request.json();

    // Check ownership
    const posts = await sql`
      SELECT * FROM posts WHERE post_id = ${postId} AND user_id = ${user.user_id}
    `;

    if (posts.length === 0) {
      return NextResponse.json({ error: 'Post not found or not authorized' }, { status: 404 });
    }

    await sql`
      UPDATE posts SET content = ${content}, updated_at = NOW()
      WHERE post_id = ${postId}
    `;

    return NextResponse.json({ success: true, message: 'Post updated' });
  } catch (error) {
    console.error('Update post error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
