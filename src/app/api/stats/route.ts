import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [itemsResult, contribResult] = await Promise.all([
      query(`
        SELECT
          COALESCE(SUM(price_cents), 0)::int AS total_goal_cents
        FROM items WHERE is_active = true
      `),
      query(`
        SELECT
          c.contributor_name,
          c.amount_cents,
          c.message,
          c.created_at,
          i.name AS item_name
        FROM contributions c
        LEFT JOIN items i ON i.id = c.item_id
        WHERE c.status = 'approved'
        ORDER BY c.created_at ASC
      `),
    ]);

    const totalGoalCents = (itemsResult.rows[0] as Record<string, number>).total_goal_cents;
    const contributions = contribResult.rows as {
      contributor_name: string;
      amount_cents: number;
      message: string | null;
      created_at: string;
      item_name: string | null;
    }[];

    const totalRaisedCents = contributions.reduce((s, c) => s + c.amount_cents, 0);

    return NextResponse.json({
      total_goal_cents: totalGoalCents,
      total_raised_cents: totalRaisedCents,
      contributors: contributions,
    });
  } catch (err) {
    console.error('Stats fetch error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
