import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import sql from '@/lib/db';

// Admin emails - only these users can access admin features
const ADMIN_EMAILS = ['zudran@gmail.com', 'ernst@hatake.eu'];

async function isAdmin(sessionToken: string | undefined): Promise<boolean> {
  if (!sessionToken) return false;
  const user = await getSessionUser(sessionToken);
  if (!user) return false;
  return ADMIN_EMAILS.includes(user.email);
}

// Ensure shop_products table exists
async function ensureTable() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS shop_products (
        id SERIAL PRIMARY KEY,
        product_id VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price_consumer DECIMAL(10,2) NOT NULL,
        price_wholesale_min DECIMAL(10,2),
        price_wholesale_max DECIMAL(10,2),
        currency VARCHAR(10) DEFAULT 'SEK',
        image_url TEXT,
        category VARCHAR(100),
        stock_quantity INT DEFAULT 0,
        sku VARCHAR(100),
        features TEXT[],
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
  } catch (e) {
    // Table might already exist
  }
}

// GET - List all products (admin only)
export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value;
    if (!await isAdmin(sessionToken)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureTable();

    const products = await sql`
      SELECT * FROM shop_products ORDER BY created_at DESC
    `;

    return NextResponse.json({ success: true, products });
  } catch (error: any) {
    console.error('Get shop products error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create a new product
export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value;
    if (!await isAdmin(sessionToken)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureTable();

    const body = await request.json();
    const {
      product_id,
      name,
      description,
      price_consumer,
      price_wholesale_min,
      price_wholesale_max,
      currency = 'SEK',
      image_url,
      category,
      stock_quantity = 0,
      sku,
      features = [],
      active = true
    } = body;

    if (!product_id || !name || !price_consumer) {
      return NextResponse.json({ error: 'product_id, name, and price_consumer are required' }, { status: 400 });
    }

    await sql`
      INSERT INTO shop_products (product_id, name, description, price_consumer, price_wholesale_min, price_wholesale_max, currency, image_url, category, stock_quantity, sku, features, active)
      VALUES (${product_id}, ${name}, ${description}, ${price_consumer}, ${price_wholesale_min}, ${price_wholesale_max}, ${currency}, ${image_url}, ${category}, ${stock_quantity}, ${sku}, ${features}, ${active})
      ON CONFLICT (product_id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        price_consumer = EXCLUDED.price_consumer,
        price_wholesale_min = EXCLUDED.price_wholesale_min,
        price_wholesale_max = EXCLUDED.price_wholesale_max,
        currency = EXCLUDED.currency,
        image_url = EXCLUDED.image_url,
        category = EXCLUDED.category,
        stock_quantity = EXCLUDED.stock_quantity,
        sku = EXCLUDED.sku,
        features = EXCLUDED.features,
        active = EXCLUDED.active,
        updated_at = CURRENT_TIMESTAMP
    `;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Create shop product error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH - Update a product
export async function PATCH(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value;
    if (!await isAdmin(sessionToken)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { product_id, ...updates } = body;

    if (!product_id) {
      return NextResponse.json({ error: 'product_id is required' }, { status: 400 });
    }

    // Build dynamic update query
    const updateFields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields.push(`${key} = $${values.length + 1}`);
        values.push(value);
      }
    });

    if (updateFields.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    values.push(product_id);

    await sql`
      UPDATE shop_products 
      SET ${sql.unsafe(updateFields.join(', '))}, updated_at = CURRENT_TIMESTAMP
      WHERE product_id = ${product_id}
    `;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Update shop product error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Remove a product
export async function DELETE(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value;
    if (!await isAdmin(sessionToken)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const product_id = searchParams.get('product_id');

    if (!product_id) {
      return NextResponse.json({ error: 'product_id is required' }, { status: 400 });
    }

    await sql`DELETE FROM shop_products WHERE product_id = ${product_id}`;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete shop product error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
