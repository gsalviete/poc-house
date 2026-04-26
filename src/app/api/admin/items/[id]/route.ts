import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { updateItemSchema } from '@/lib/validation';
import { uploadItemImage, deleteItemImage, deleteReceipts } from '@/lib/storage';
import { requireAdmin } from '@/lib/middleware/auth';

export const dynamic = 'force-dynamic';

export const PUT = requireAdmin(async (
  req: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) => {
  try {
    const { id } = await params;
    const formData = await req.formData();

    const data: Record<string, unknown> = {};
    const name = formData.get('name');
    const description = formData.get('description');
    const priceCents = formData.get('price_cents');
    const externalLink = formData.get('external_link');

    if (name) data.name = name;
    if (description !== null) data.description = description;
    if (priceCents) data.price_cents = parseInt(priceCents as string, 10);
    if (externalLink !== null) data.external_link = externalLink;

    const parsed = updateItemSchema.safeParse(data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    for (const [key, val] of Object.entries(parsed.data)) {
      updates.push(`${key} = $${idx}`);
      values.push(val);
      idx++;
    }

    if (updates.length > 0) {
      values.push(id);
      await query(
        `UPDATE items SET ${updates.join(', ')} WHERE id = $${idx}`,
        values
      );
    }

    // Handle image upload
    const imageFile = formData.get('image') as File | null;
    if (imageFile && imageFile.size > 0) {
      const buffer = Buffer.from(await imageFile.arrayBuffer());
      const imageUrl = await uploadItemImage(id, buffer, imageFile.type);
      await query('UPDATE items SET image_url = $1 WHERE id = $2', [imageUrl, id]);
    }

    const result = await query('SELECT * FROM items WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (err) {
    console.error('Admin item update error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
});

export const DELETE = requireAdmin(async (
  _req: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) => {
  try {
    const { id } = await params;

    const itemResult = await query('SELECT id FROM items WHERE id = $1', [id]);
    if (itemResult.rows.length === 0) {
      return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 });
    }

    // Collect contribution IDs to delete their receipts from storage
    const contribResult = await query(
      'SELECT id FROM contributions WHERE item_id = $1',
      [id]
    );
    const contributionIds = (contribResult.rows as { id: string }[]).map((r) => r.id);

    // Delete storage files in parallel, then DB rows
    await Promise.all([
      deleteItemImage(id),
      deleteReceipts(contributionIds),
    ]);

    // Contributions are deleted via ON DELETE CASCADE on the FK,
    // but we delete explicitly to be safe if the constraint isn't set
    await query('DELETE FROM contributions WHERE item_id = $1', [id]);
    await query('DELETE FROM items WHERE id = $1', [id]);

    return NextResponse.json({ message: 'Item removido' });
  } catch (err) {
    console.error('Admin item delete error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
});
