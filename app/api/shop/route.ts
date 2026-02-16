import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

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

// GET - Public endpoint to fetch active shop products
export async function GET(request: NextRequest) {
  try {
    await ensureTable();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    let products;
    if (category && category !== 'All') {
      products = await sql`
        SELECT product_id, name, description, price_consumer, currency, image_url, category, stock_quantity, sku, features
        FROM shop_products 
        WHERE active = true AND category = ${category}
        ORDER BY created_at DESC
      `;
    } else {
      products = await sql`
        SELECT product_id, name, description, price_consumer, currency, image_url, category, stock_quantity, sku, features
        FROM shop_products 
        WHERE active = true
        ORDER BY created_at DESC
      `;
    }

    return NextResponse.json({ 
      success: true, 
      products: products.map(p => ({
        id: p.product_id,
        name: p.name,
        description: p.description,
        price: Number(p.price_consumer),
        currency: p.currency,
        image: p.image_url,
        category: p.category,
        stock: p.stock_quantity,
        sku: p.sku,
        features: p.features || ['Shipped from Sweden']
      }))
    });
  } catch (error: any) {
    console.error('Get public shop products error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
