import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import sql from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const game = searchParams.get('game') || '';
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query;
    if (game) {
      query = sql`
        SELECT id, card_id, game, card_data, quantity, condition, foil, finish, 
               is_signed, is_graded, grading_company, grade_value, custom_image_url, notes, added_at
        FROM collection_items
        WHERE user_id = ${user.user_id} AND game = ${game}
        ORDER BY added_at DESC
      `;
    } else {
      query = sql`
        SELECT id, card_id, game, card_data, quantity, condition, foil, finish, 
               is_signed, is_graded, grading_company, grade_value, custom_image_url, notes, added_at
        FROM collection_items
        WHERE user_id = ${user.user_id}
        ORDER BY added_at DESC
      `;
    }

    const items = await query;

    // Ensure card_data is parsed as JSON and handle null/empty data
    const parsedItems = items.map((item: any) => {
      let cardData = item.card_data;
      
      // Parse if string
      if (typeof cardData === 'string') {
        try {
          cardData = JSON.parse(cardData);
        } catch {
          cardData = {};
        }
      }
      
      // Handle null/undefined
      if (!cardData || Object.keys(cardData).length === 0) {
        cardData = {
          name: 'Unknown Card',
          id: item.card_id,
        };
      }
      
      return {
        ...item,
        card_data: cardData
      };
    });

    return NextResponse.json({
      success: true,
      items: parsedItems.slice(offset, offset + limit),
      total: parsedItems.length,
    });
  } catch (error) {
    console.error('Get collection error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await getSessionUser(sessionToken);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { 
      cardId, game, cardData, quantity, condition, foil, notes,
      finish, isSigned, isGraded, gradingCompany, gradeValue, customImageUrl
    } = await request.json();

    if (!cardId || !game) {
      return NextResponse.json(
        { error: 'Missing required fields (cardId, game)' },
        { status: 400 }
      );
    }

    // Ensure cardData is at least an empty object
    const safeCardData = cardData || { id: cardId, name: 'Unknown Card' };

    await sql`
      INSERT INTO collection_items (
        user_id, card_id, game, card_data, quantity, condition, foil, finish,
        is_signed, is_graded, grading_company, grade_value, custom_image_url, notes
      )
      VALUES (
        ${user.user_id},
        ${cardId},
        ${game},
        ${JSON.stringify(safeCardData)},
        ${quantity || 1},
        ${condition || 'Near Mint'},
        ${foil || false},
        ${finish || 'Normal'},
        ${isSigned || false},
        ${isGraded || false},
        ${gradingCompany || null},
        ${gradeValue || null},
        ${customImageUrl || null},
        ${notes || null}
      )
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Add to collection error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await getSessionUser(sessionToken);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('id');

    if (!itemId) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      );
    }

    await sql`
      DELETE FROM collection_items
      WHERE id = ${parseInt(itemId)} AND user_id = ${user.user_id}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete from collection error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await getSessionUser(sessionToken);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { 
      id, quantity, condition, foil, notes, finish,
      isSigned, isGraded, gradingCompany, gradeValue, customImageUrl
    } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      );
    }

    await sql`
      UPDATE collection_items
      SET 
        quantity = COALESCE(${quantity}, quantity),
        condition = COALESCE(${condition}, condition),
        foil = COALESCE(${foil}, foil),
        finish = COALESCE(${finish}, finish),
        is_signed = COALESCE(${isSigned}, is_signed),
        is_graded = COALESCE(${isGraded}, is_graded),
        grading_company = COALESCE(${gradingCompany}, grading_company),
        grade_value = COALESCE(${gradeValue}, grade_value),
        custom_image_url = COALESCE(${customImageUrl}, custom_image_url),
        notes = COALESCE(${notes}, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id} AND user_id = ${user.user_id}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update collection item error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
