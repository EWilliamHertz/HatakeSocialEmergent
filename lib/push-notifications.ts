// Push Notification Service using Expo Push API

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  sound?: string;
  badge?: number;
  priority?: 'default' | 'normal' | 'high';
}

interface PushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: {
    error?: string;
  };
}

export async function sendPushNotification(
  pushToken: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<{ success: boolean; ticket?: PushTicket; error?: string }> {
  try {
    if (!pushToken || !pushToken.startsWith('ExponentPushToken[')) {
      return { success: false, error: 'Invalid push token format' };
    }

    const message: PushMessage = {
      to: pushToken,
      title,
      body,
      data: data || {},
      sound: 'default',
      priority: 'high',
    };

    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify([message]),
    });

    if (!response.ok) {
      return { success: false, error: `Expo API error: ${response.status}` };
    }

    const result = await response.json();
    const ticket = result.data?.[0] as PushTicket;

    if (ticket?.status === 'error') {
      console.error('Push notification error:', ticket.message, ticket.details);
      return { success: false, error: ticket.message, ticket };
    }

    return { success: true, ticket };
  } catch (err: any) {
    console.error('Send push notification error:', err);
    return { success: false, error: err.message };
  }
}

export async function sendBatchPushNotifications(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<{ successCount: number; errorCount: number; tickets: PushTicket[] }> {
  const validTokens = tokens.filter(t => t && t.startsWith('ExponentPushToken['));
  
  if (validTokens.length === 0) {
    return { successCount: 0, errorCount: 0, tickets: [] };
  }

  const messages: PushMessage[] = validTokens.map(token => ({
    to: token,
    title,
    body,
    data: data || {},
    sound: 'default',
    priority: 'high',
  }));

  const allTickets: PushTicket[] = [];
  let successCount = 0;
  let errorCount = 0;

  // Batch in groups of 100 (Expo limit)
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    
    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(batch),
      });

      if (response.ok) {
        const result = await response.json();
        const tickets = result.data || [];
        allTickets.push(...tickets);

        for (const ticket of tickets) {
          if (ticket.status === 'ok') {
            successCount++;
          } else {
            errorCount++;
          }
        }
      } else {
        errorCount += batch.length;
      }
    } catch (err) {
      console.error('Batch push error:', err);
      errorCount += batch.length;
    }
  }

  return { successCount, errorCount, tickets: allTickets };
}

// Notification type templates
export function getFriendRequestNotification(senderName: string) {
  return {
    title: 'New Friend Request',
    body: `${senderName} wants to be your friend!`,
    data: { type: 'friend_request' },
  };
}

export function getMessageNotification(senderName: string, preview: string) {
  const truncated = preview.length > 50 ? preview.substring(0, 50) + '...' : preview;
  return {
    title: `New message from ${senderName}`,
    body: truncated,
    data: { type: 'message' },
  };
}

export function getReactionNotification(reactorName: string, emoji: string, contentType: string) {
  return {
    title: 'New Reaction',
    body: `${reactorName} reacted ${emoji} to your ${contentType}`,
    data: { type: 'reaction' },
  };
}

export function getTradeNotification(userName: string, action: string) {
  const messages: Record<string, string> = {
    'new': `${userName} wants to trade with you!`,
    'accepted': `${userName} accepted your trade offer!`,
    'declined': `${userName} declined your trade offer`,
    'completed': `Your trade with ${userName} is complete!`,
    'rating': `${userName} left you a trade rating!`,
  };
  return {
    title: 'Trade Update',
    body: messages[action] || `Trade update from ${userName}`,
    data: { type: 'trade', action },
  };
}
