import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import sql from '@/lib/db';

// GET - Get single sealed product
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await getSessionUser(sessionToken);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { productId } = await params;

    const products = await sql`
      SELECT * FROM sealed_products 
      WHERE product_id = ${productId} AND user_id = ${user.user_id}
    `;

    if (products.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, product: products[0] });
  } catch (error) {
    console.error('Get sealed product error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update sealed product
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await getSessionUser(sessionToken);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { productId } = await params;
    const body = await request.json();

    // Check ownership
    const products = await sql`
      SELECT user_id FROM sealed_products WHERE product_id = ${productId}
    `;

    if (products.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    if (products[0].user_id !== user.user_id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const { 
      name, 
      productType, 
      setName, 
      setCode,
      language,
      quantity, 
      purchasePrice, 
      currentValue,
      purchaseDate,
      notes,
      imageUrl
    } = body;

    await sql`
      UPDATE sealed_products
      SET 
        name = COALESCE(${name}, name),
        product_type = COALESCE(${productType}, product_type),
        set_name = COALESCE(${setName}, set_name),
        set_code = COALESCE(${setCode}, set_code),
        language = COALESCE(${language}, language),
        quantity = COALESCE(${quantity}, quantity),
        purchase_price = COALESCE(${purchasePrice}, purchase_price),
        current_value = COALESCE(${currentValue}, current_value),
        purchase_date = COALESCE(${purchaseDate}, purchase_date),
        notes = COALESCE(${notes}, notes),
        image_url = COALESCE(${imageUrl}, image_url),
        updated_at = CURRENT_TIMESTAMP
      WHERE product_id = ${productId}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update sealed product error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete sealed product
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await getSessionUser(sessionToken);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { productId } = await params;

    // Check ownership
    const products = await sql`
      SELECT user_id FROM sealed_products WHERE product_id = ${productId}
    `;

    if (products.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    if (products[0].user_id !== user.user_id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    await sql`DELETE FROM sealed_products WHERE product_id = ${productId}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete sealed product error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
