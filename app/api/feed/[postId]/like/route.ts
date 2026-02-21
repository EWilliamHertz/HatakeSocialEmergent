import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import sql from '@/lib/db';
import { createNotification } from '@/lib/notifications';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    // Support both cookie and Bearer token auth
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { postId } = await params;

    // Check if already liked
    const existing = await sql`
      SELECT id FROM likes
      WHERE post_id = ${postId} AND user_id = ${user.user_id}
    `;

    if (existing.length > 0) {
      // Unlike
      await sql`
        DELETE FROM likes
        WHERE post_id = ${postId} AND user_id = ${user.user_id}
      `;
      return NextResponse.json({ success: true, liked: false });
    } else {
      // Like
      await sql`
        INSERT INTO likes (post_id, user_id)
        VALUES (${postId}, ${user.user_id})
      `;
      
      // Get post owner to send notification
      const posts = await sql`
        SELECT user_id FROM posts WHERE post_id = ${postId}
      `;
      
      if (posts.length > 0 && posts[0].user_id !== user.user_id) {
        // Send notification to post owner
        try {
          await createNotification({
            userId: posts[0].user_id,
            type: 'like',
            title: 'New Like',
            message: `${user.name} liked your post`,
            link: `/feed#${postId}`,
          });
        } catch (e) {
          // Don't fail the like if notification fails
          console.error('Failed to send like notification:', e);
        }
      }
      
      return NextResponse.json({ success: true, liked: true });
    }
  } catch (error) {
    console.error('Toggle like error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}