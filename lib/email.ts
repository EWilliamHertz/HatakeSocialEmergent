import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const SENDER_EMAIL = process.env.SENDER_EMAIL || 'noreply@hatake.social';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.hatake.eu';

// Email Templates
const getBaseTemplate = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <tr>
      <td style="background-color: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Logo -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="text-align: center; padding-bottom: 30px;">
              <img src="https://i.imgur.com/B06rBhI.png" alt="Hatake.Social" width="60" height="60" style="border-radius: 12px;">
              <h1 style="margin: 10px 0 0; color: #1f2937; font-size: 24px; font-weight: 700;">Hatake.Social</h1>
            </td>
          </tr>
        </table>
        ${content}
        <!-- Footer -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
          <tr>
            <td style="text-align: center; color: #6b7280; font-size: 12px;">
              <p style="margin: 0;">This email was sent by Hatake.Social</p>
              <p style="margin: 5px 0 0;">The TCG Social Platform for collectors worldwide</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// Email Verification Template
export const getVerificationEmailTemplate = (name: string, verificationUrl: string) => {
  const content = `
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="text-align: center;">
          <h2 style="color: #1f2937; font-size: 20px; margin: 0 0 15px;">Welcome, ${name}!</h2>
          <p style="color: #4b5563; font-size: 16px; line-height: 24px; margin: 0 0 25px;">
            Thanks for signing up for Hatake.Social! Please verify your email address to get started.
          </p>
          <a href="${verificationUrl}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;">
            Verify Email Address
          </a>
          <p style="color: #9ca3af; font-size: 14px; margin: 25px 0 0;">
            This link will expire in 24 hours.
          </p>
          <p style="color: #9ca3af; font-size: 12px; margin: 15px 0 0;">
            If you didn't create an account, you can safely ignore this email.
          </p>
        </td>
      </tr>
    </table>
  `;
  return getBaseTemplate(content);
};

// Friend Request Template
export const getFriendRequestEmailTemplate = (recipientName: string, senderName: string, senderPicture: string | null) => {
  const avatarHtml = senderPicture 
    ? `<img src="${senderPicture}" alt="${senderName}" width="60" height="60" style="border-radius: 30px;">`
    : `<div style="width: 60px; height: 60px; border-radius: 30px; background-color: #e5e7eb; display: inline-block;"></div>`;
  
  const content = `
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="text-align: center;">
          ${avatarHtml}
          <h2 style="color: #1f2937; font-size: 20px; margin: 15px 0 10px;">New Friend Request!</h2>
          <p style="color: #4b5563; font-size: 16px; line-height: 24px; margin: 0 0 25px;">
            <strong>${senderName}</strong> wants to be your friend on Hatake.Social
          </p>
          <a href="${APP_URL}/friends" style="display: inline-block; background-color: #3b82f6; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;">
            View Request
          </a>
        </td>
      </tr>
    </table>
  `;
  return getBaseTemplate(content);
};

// New Message Template
export const getNewMessageEmailTemplate = (recipientName: string, senderName: string, messagePreview: string) => {
  const truncatedMessage = messagePreview.length > 100 ? messagePreview.substring(0, 100) + '...' : messagePreview;
  
  const content = `
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="text-align: center;">
          <h2 style="color: #1f2937; font-size: 20px; margin: 0 0 15px;">New Message from ${senderName}</h2>
          <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 0 0 25px;">
            <p style="color: #4b5563; font-size: 15px; line-height: 22px; margin: 0; font-style: italic;">
              "${truncatedMessage}"
            </p>
          </div>
          <a href="${APP_URL}/messages" style="display: inline-block; background-color: #3b82f6; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;">
            Reply Now
          </a>
        </td>
      </tr>
    </table>
  `;
  return getBaseTemplate(content);
};

// Reaction Notification Template
export const getReactionEmailTemplate = (
  recipientName: string, 
  reactorName: string, 
  reactionEmoji: string, 
  contentType: 'post' | 'comment',
  contentPreview: string
) => {
  const truncatedContent = contentPreview.length > 80 ? contentPreview.substring(0, 80) + '...' : contentPreview;
  
  const content = `
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="text-align: center;">
          <div style="font-size: 48px; margin-bottom: 15px;">${reactionEmoji}</div>
          <h2 style="color: #1f2937; font-size: 20px; margin: 0 0 15px;">${reactorName} reacted to your ${contentType}</h2>
          <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 0 0 25px;">
            <p style="color: #6b7280; font-size: 14px; line-height: 20px; margin: 0;">
              "${truncatedContent}"
            </p>
          </div>
          <a href="${APP_URL}/feed" style="display: inline-block; background-color: #3b82f6; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;">
            View on Feed
          </a>
        </td>
      </tr>
    </table>
  `;
  return getBaseTemplate(content);
};

// Send Email Function
export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return { success: false, error: 'Email service not configured' };
    }

    const { data, error } = await resend.emails.send({
      from: `Hatake.Social <${SENDER_EMAIL}>`,
      to: [to],
      subject,
      html,
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err: any) {
    console.error('Email send error:', err);
    return { success: false, error: err.message };
  }
}

// Specific email senders
export async function sendVerificationEmail(email: string, name: string, token: string) {
  const verificationUrl = `${APP_URL}/verify-email?token=${token}`;
  const html = getVerificationEmailTemplate(name, verificationUrl);
  return sendEmail(email, 'Verify your Hatake.Social email', html);
}

export async function sendFriendRequestEmail(email: string, recipientName: string, senderName: string, senderPicture: string | null) {
  const html = getFriendRequestEmailTemplate(recipientName, senderName, senderPicture);
  return sendEmail(email, `${senderName} wants to be your friend on Hatake.Social`, html);
}

export async function sendNewMessageEmail(email: string, recipientName: string, senderName: string, messagePreview: string) {
  const html = getNewMessageEmailTemplate(recipientName, senderName, messagePreview);
  return sendEmail(email, `New message from ${senderName}`, html);
}

export async function sendReactionEmail(
  email: string,
  recipientName: string,
  reactorName: string,
  reactionEmoji: string,
  contentType: 'post' | 'comment',
  contentPreview: string
) {
  const html = getReactionEmailTemplate(recipientName, reactorName, reactionEmoji, contentType, contentPreview);
  return sendEmail(email, `${reactorName} reacted to your ${contentType}`, html);
}
