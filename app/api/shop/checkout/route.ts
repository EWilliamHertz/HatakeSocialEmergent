import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

async function ensureOrdersTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      order_id VARCHAR(255) UNIQUE NOT NULL,
      user_id VARCHAR(255),
      user_email VARCHAR(255) NOT NULL,
      items JSONB NOT NULL,
      total_amount DECIMAL(10,2) NOT NULL,
      currency VARCHAR(10) DEFAULT 'SEK',
      status VARCHAR(50) DEFAULT 'pending',
      shipping_address TEXT,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;
}

export async function POST(request: NextRequest) {
  try {
    await ensureOrdersTable();

    const user = await getUserFromRequest(request);
    const body = await request.json();
    const { items, totalAmount, shippingAddress, email, notes } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items in order' }, { status: 400 });
    }

    const userEmail = user?.email || email;
    if (!userEmail) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const order_id = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    await sql`
      INSERT INTO orders (order_id, user_id, user_email, items, total_amount, currency, shipping_address, notes)
      VALUES (
        ${order_id},
        ${user?.user_id || null},
        ${userEmail},
        ${JSON.stringify(items)},
        ${totalAmount},
        'SEK',
        ${shippingAddress || null},
        ${notes || null}
      )
    `;

    // Send confirmation email to customer via Resend
    try {
      const itemsList = items.map((item: any) => `<li>${item.name} × ${item.quantity} — SEK ${(item.price * item.quantity).toFixed(2)}</li>`).join('');
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Hatake.Social Shop <noreply@hatake.social>',
          to: [userEmail],
          subject: `Order received — ${order_id}`,
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#f9fafb;padding:32px;border-radius:12px;">
              <img src="https://i.imgur.com/B06rBhI.png" width="48" height="48" style="border-radius:10px;margin-bottom:16px;" />
              <h2 style="color:#111827;margin:0 0 8px;">Thank you for your order! 🌿</h2>
              <p style="color:#6b7280;margin:0 0 24px;">We've received your order and will contact you shortly with payment details.</p>

              <div style="background:white;border-radius:8px;padding:20px;margin-bottom:20px;">
                <p style="color:#374151;font-size:13px;margin:0 0 4px;"><strong>Order ID:</strong> ${order_id}</p>
                ${shippingAddress ? `<p style="color:#374151;font-size:13px;margin:0;"><strong>Ship to:</strong> ${shippingAddress}</p>` : ''}
              </div>

              <div style="background:white;border-radius:8px;padding:20px;margin-bottom:20px;">
                <h3 style="color:#111827;font-size:15px;margin:0 0 12px;">Items ordered</h3>
                <ul style="color:#374151;font-size:14px;padding-left:20px;margin:0 0 12px;">${itemsList}</ul>
                <div style="border-top:1px solid #e5e7eb;padding-top:12px;">
                  <strong style="color:#111827;">Total: SEK ${totalAmount.toFixed(2)}</strong>
                </div>
              </div>

              <div style="background:#eff6ff;border-radius:8px;padding:20px;margin-bottom:20px;">
                <h3 style="color:#1d4ed8;font-size:14px;margin:0 0 8px;">Payment options</h3>
                <p style="color:#374151;font-size:13px;margin:0;line-height:1.6;">
                  <strong>Swish:</strong> 123-587 57 37<br/>
                  <strong>Bankgiro:</strong> 5051-0031<br/>
                  <strong>Kontonummer:</strong> 9660-357 25 85<br/>
                  <em>Please include your Order ID (${order_id}) in the payment message.</em>
                </p>
              </div>

              <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0;">Hatake.Social · Sweden · hatake.social</p>
            </div>
          `,
        }),
      });
    } catch (emailErr) {
      console.error('Failed to send confirmation email:', emailErr);
      // Don't fail the whole order just because email failed
    }

    return NextResponse.json({ success: true, order_id });
  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
