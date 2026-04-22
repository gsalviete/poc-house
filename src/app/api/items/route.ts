import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await query(`
      SELECT
        i.id, i.name, i.description, i.price_cents, i.image_url,
        i.external_link,
        COALESCE(SUM(CASE WHEN c.status = 'approved' THEN c.amount_cents ELSE 0 END), 0)::int AS total_contributed_cents,
        COUNT(CASE WHEN c.status = 'approved' THEN 1 END)::int AS contribution_count
      FROM items i
      LEFT JOIN contributions c ON c.item_id = i.id
      WHERE i.is_active = true
      GROUP BY i.id
      ORDER BY i.created_at DESC
    `);

    const items = result.rows.map((row: Record<string, unknown>) => ({
      ...row,
      is_fully_funded: (row.total_contributed_cents as number) >= (row.price_cents as number),
    }));

    return NextResponse.json({ items });
  } catch (err) {
    console.error('Items fetch error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
