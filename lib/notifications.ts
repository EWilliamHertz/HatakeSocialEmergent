import sql from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export type NotificationType = 
  | 'friend_request'
  | 'friend_accepted'
  | 'message'
  | 'listing'
  | 'sale'
  | 'trade'
  | 'trade_accepted'
  | 'like'
  | 'comment'
  | 'group_invite'
  | 'system';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}

export async function createNotification({
  userId,
  type,
  title,
  message,
  link,
}: CreateNotificationParams): Promise<string> {
  const notificationId = uuidv4();
  
  await sql`
    INSERT INTO notifications (notification_id, user_id, type, title, message, link)
    VALUES (${notificationId}, ${userId}, ${type}, ${title}, ${message}, ${link || null})
  `;
  
  return notificationId;
}

export async function createBulkNotifications(
  notifications: CreateNotificationParams[]
): Promise<void> {
  for (const notification of notifications) {
    await createNotification(notification);
  }
}
