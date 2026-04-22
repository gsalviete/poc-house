import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAdmin } from '@/lib/middleware/auth';

export const dynamic = 'force-dynamic';

export const GET = requireAdmin(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const perPage = parseInt(searchParams.get('per_page') || '20', 10);
    const offset = (page - 1) * perPage;

    let whereClause = '';
    const values: unknown[] = [];
    let paramIdx = 1;

    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      whereClause = `WHERE c.status = $${paramIdx}`;
      values.push(status);
      paramIdx++;
    }

    values.push(perPage, offset);

    const result = await query(
      `SELECT
        c.id, c.contributor_name, c.amount_cents, c.receipt_url,
        c.status, c.pix_tx_id, c.admin_notes, c.created_at,
        i.name AS item_name, i.id AS item_id
      FROM contributions c
      LEFT JOIN items i ON i.id = c.item_id
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      values
    );

    const countValues = status ? [status] : [];
    const countResult = await query(
      `SELECT COUNT(*)::int AS total FROM contributions c ${whereClause}`,
      countValues
    );

    const total = (countResult.rows[0] as Record<string, number>).total;

    return NextResponse.json({
      contributions: result.rows,
      meta: { page, per_page: perPage, total },
    });
  } catch (err) {
    console.error('Admin contributions fetch error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
});
