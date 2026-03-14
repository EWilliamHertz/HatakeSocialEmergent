import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

const ADMIN_EMAILS = ['zudran@gmail.com', 'ernst@hatake.eu'];

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

async function requireAdmin(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user || (!ADMIN_EMAILS.includes(user.email) && !user.is_admin)) {
    return null;
  }
  return user;
}

// GET /api/admin/orders — list all orders
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await ensureOrdersTable();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const orders = status
      ? await sql`SELECT * FROM orders WHERE status = ${status} ORDER BY created_at DESC`
      : await sql`SELECT * FROM orders ORDER BY created_at DESC`;

    return NextResponse.json({ success: true, orders });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/admin/orders — update order status or send payment details
export async function PUT(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await ensureOrdersTable();

    const body = await request.json();
    const { order_id, action, status } = body;

    if (!order_id) {
      return NextResponse.json({ error: 'order_id is required' }, { status: 400 });
    }

    // Fetch the order
    const rows = await sql`SELECT * FROM orders WHERE order_id = ${order_id}`;
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    const order = rows[0] as any;

    if (action === 'send_payment') {
      // Send payment details email via Resend
      const items = Array.isArray(order.items) ? order.items : JSON.parse(order.items);
      const itemsList = items.map((item: any) => `<li>${item.name} × ${item.quantity} — SEK ${(item.price * item.quantity).toFixed(2)}</li>`).join('');

      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Hatake.Social Shop <noreply@hatake.social>',
          to: [order.user_email],
          subject: `Payment details for your order ${order.order_id}`,
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#f9fafb;padding:32px;border-radius:12px;">
              <img src="https://i.imgur.com/B06rBhI.png" width="48" height="48" style="border-radius:10px;margin-bottom:16px;" />
              <h2 style="color:#111827;margin:0 0 8px;">Payment details for your order 🌿</h2>
              <p style="color:#6b7280;margin:0 0 24px;">Please send payment using one of the options below to complete your order.</p>

              <div style="background:white;border-radius:8px;padding:20px;margin-bottom:20px;">
                <p style="color:#374151;font-size:13px;margin:0;"><strong>Order ID:</strong> ${order.order_id}</p>
              </div>

              <div style="background:white;border-radius:8px;padding:20px;margin-bottom:20px;">
                <h3 style="color:#111827;font-size:15px;margin:0 0 12px;">Items</h3>
                <ul style="color:#374151;font-size:14px;padding-left:20px;margin:0 0 12px;">${itemsList}</ul>
                <div style="border-top:1px solid #e5e7eb;padding-top:12px;">
                  <strong style="color:#111827;font-size:16px;">Total: SEK ${Number(order.total_amount).toFixed(2)}</strong>
                </div>
              </div>

              <div style="background:#eff6ff;border-radius:8px;padding:20px;margin-bottom:24px;">
                <h3 style="color:#1d4ed8;font-size:15px;margin:0 0 12px;">Pay via</h3>
                <p style="color:#374151;font-size:14px;margin:0;line-height:2;">
                  <strong>Swish:</strong> 123-587 57 37<br/>
                  <strong>Bankgiro:</strong> 5051-0031<br/>
                  <strong>Kontonummer:</strong> 9660-357 25 85
                </p>
                <div style="background:#dbeafe;border-radius:6px;padding:12px;margin-top:12px;">
                  <p style="color:#1e40af;font-size:13px;margin:0;">
                    ⚠️ <strong>Important:</strong> Include your Order ID <strong>${order.order_id}</strong> in the payment message so we can match it quickly.
                  </p>
                </div>
              </div>

              <p style="color:#6b7280;font-size:13px;">Once we receive your payment, we'll ship your items promptly. Questions? Reply to this email or contact <a href="mailto:ernst@hatake.eu" style="color:#3b82f6;">ernst@hatake.eu</a>.</p>
              <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:24px;">Hatake.Social · Sweden · hatake.social</p>
            </div>
          `,
        }),
      });

      if (!emailRes.ok) {
        const err = await emailRes.text();
        return NextResponse.json({ error: `Email failed: ${err}` }, { status: 500 });
      }

      // Update status
      await sql`
        UPDATE orders SET status = 'payment_details_sent', updated_at = NOW()
        WHERE order_id = ${order_id}
      `;

      return NextResponse.json({ success: true, message: 'Payment details sent' });
    }

    // Generic status update
    if (status) {
      await sql`
        UPDATE orders SET status = ${status}, updated_at = NOW()
        WHERE order_id = ${order_id}
      `;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'No action specified' }, { status: 400 });
  } catch (error: any) {
    console.error('Admin orders PUT error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
