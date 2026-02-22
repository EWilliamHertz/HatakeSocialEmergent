import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import sql from '@/lib/db';
import { generateId } from '@/lib/utils';

// GET - List user's sealed products
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const game = searchParams.get('game');

    let products;
    if (game) {
      products = await sql`
        SELECT * FROM sealed_products 
        WHERE user_id = ${user.user_id} AND game = ${game}
        ORDER BY created_at DESC
      `;
    } else {
      products = await sql`
        SELECT * FROM sealed_products 
        WHERE user_id = ${user.user_id}
        ORDER BY created_at DESC
      `;
    }

    // Calculate totals
    const totals = await sql`
      SELECT 
        COUNT(*) as total_products,
        SUM(quantity) as total_items,
        SUM(purchase_price * quantity) as total_invested,
        SUM(COALESCE(current_value, purchase_price) * quantity) as total_value
      FROM sealed_products 
      WHERE user_id = ${user.user_id}
    `;

    return NextResponse.json({ 
      success: true, 
      products,
      totals: totals[0] || { total_products: 0, total_items: 0, total_invested: 0, total_value: 0 }
    });
  } catch (error: any) {
    // If table doesn't exist, return empty
    if (error.message?.includes('does not exist')) {
      return NextResponse.json({ 
        success: true, 
        products: [],
        totals: { total_products: 0, total_items: 0, total_invested: 0, total_value: 0 },
        needsMigration: true
      });
    }
    console.error('Get sealed products error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Add a sealed product
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      name, 
      game = 'pokemon', 
      productType, 
      setName, 
      setCode,
      language = 'EN',
      quantity = 1, 
      purchasePrice = 0, 
      currentValue,
      purchaseDate,
      notes,
      imageUrl
    } = body;

    if (!name || !productType) {
      return NextResponse.json({ error: 'Name and product type are required' }, { status: 400 });
    }

    const productId = generateId('sealed');

    await sql`
      INSERT INTO sealed_products (
        product_id, user_id, name, game, product_type, set_name, set_code,
        language, quantity, purchase_price, current_value, purchase_date, notes, image_url
      )
      VALUES (
        ${productId}, ${user.user_id}, ${name}, ${game}, ${productType}, 
        ${setName || null}, ${setCode || null}, ${language}, ${quantity}, 
        ${purchasePrice}, ${currentValue || purchasePrice}, 
        ${purchaseDate || null}, ${notes || null}, ${imageUrl || null}
      )
    `;

    return NextResponse.json({ success: true, productId });
  } catch (error: any) {
    if (error.message?.includes('does not exist')) {
      return NextResponse.json({ error: 'Database migration required. Please contact admin.' }, { status: 500 });
    }
    console.error('Add sealed product error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
