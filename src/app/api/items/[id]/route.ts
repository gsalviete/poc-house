import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const itemResult = await query(
      `SELECT id, name, description, price_cents, image_url, external_link
       FROM items WHERE id = $1 AND is_active = true`,
      [id]
    );

    if (itemResult.rows.length === 0) {
      return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 });
    }

    const item = itemResult.rows[0] as Record<string, unknown>;

    const contribResult = await query(
      `SELECT contributor_name, amount_cents, status, message, created_at
       FROM contributions
       WHERE item_id = $1 AND status = 'approved'
       ORDER BY created_at ASC`,
      [id]
    );

    const totalContributed = contribResult.rows.reduce(
      (sum: number, c: Record<string, unknown>) => sum + (c.amount_cents as number),
      0
    );

    return NextResponse.json({
      ...item,
      total_contributed_cents: totalContributed,
      remaining_cents: Math.max(0, (item.price_cents as number) - totalContributed),
      contributions: contribResult.rows,
    });
  } catch (err) {
    console.error('Item detail error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
