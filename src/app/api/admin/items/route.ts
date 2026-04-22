import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { createItemSchema } from '@/lib/validation';
import { uploadItemImage } from '@/lib/storage';
import { requireAdmin } from '@/lib/middleware/auth';

export const dynamic = 'force-dynamic';

export const GET = requireAdmin(async () => {
  try {
    const result = await query(`
      SELECT
        i.*,
        COALESCE(SUM(CASE WHEN c.status = 'approved' THEN c.amount_cents ELSE 0 END), 0)::int AS total_contributed_cents,
        COUNT(c.id)::int AS total_contributions
      FROM items i
      LEFT JOIN contributions c ON c.item_id = i.id
      GROUP BY i.id
      ORDER BY i.created_at DESC
    `);
    return NextResponse.json({ items: result.rows });
  } catch (err) {
    console.error('Admin items fetch error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
});

export const POST = requireAdmin(async (req: NextRequest) => {
  try {
    const formData = await req.formData();
    const data = {
      name: formData.get('name') as string,
      description: formData.get('description') as string || '',
      price_cents: parseInt(formData.get('price_cents') as string, 10),
      external_link: formData.get('external_link') as string || '',
    };

    const parsed = createItemSchema.safeParse(data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const result = await query<{ id: string }>(
      `INSERT INTO items (name, description, price_cents, external_link)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [parsed.data.name, parsed.data.description, parsed.data.price_cents, parsed.data.external_link || null]
    );

    const itemId = result.rows[0].id;

    // Handle image upload
    const imageFile = formData.get('image') as File | null;
    if (imageFile && imageFile.size > 0) {
      const buffer = Buffer.from(await imageFile.arrayBuffer());
      const imageUrl = await uploadItemImage(itemId, buffer, imageFile.type);
      await query('UPDATE items SET image_url = $1 WHERE id = $2', [imageUrl, itemId]);
    }

    const item = await query('SELECT * FROM items WHERE id = $1', [itemId]);
    return NextResponse.json(item.rows[0], { status: 201 });
  } catch (err) {
    console.error('Admin item create error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
});
