import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import sql from '@/lib/db';

const ADMIN_EMAILS = ['zudran@gmail.com', 'ernst@hatake.eu'];

async function isAdmin(sessionToken: string | undefined): Promise<boolean> {
  if (!sessionToken) return false;
  const user = await getSessionUser(sessionToken);
  if (!user) return false;
  
  // Check if in admin emails list
  if (ADMIN_EMAILS.includes(user.email)) return true;
  
  // Also check database is_admin field
  try {
    const result = await sql`SELECT is_admin FROM users WHERE user_id = ${user.user_id}`;
    return result[0]?.is_admin === true;
  } catch (e) {
    return false;
  }
}

// DELETE - Remove a post (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value;
    if (!await isAdmin(sessionToken)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('post_id');

    if (!postId) {
      return NextResponse.json({ error: 'post_id is required' }, { status: 400 });
    }

    // Delete related data first (comments, reactions)
    await sql`DELETE FROM comments WHERE post_id = ${postId}`.catch(() => {});
    await sql`DELETE FROM post_reactions WHERE post_id = ${postId}`.catch(() => {});
    
    // Delete the post
    await sql`DELETE FROM posts WHERE post_id = ${postId}`;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete post error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
