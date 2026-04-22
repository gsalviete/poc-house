import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { updateContributionStatusSchema } from '@/lib/validation';
import { requireAdmin } from '@/lib/middleware/auth';

export const dynamic = 'force-dynamic';

export const PATCH = requireAdmin(async (
  req: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) => {
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateContributionStatusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { status, admin_notes } = parsed.data;

    const result = await query(
      `UPDATE contributions
       SET status = $1, admin_notes = $2
       WHERE id = $3
       RETURNING id, status, admin_notes`,
      [status, admin_notes, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Contribuição não encontrada' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (err) {
    console.error('Admin contribution status update error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
});
