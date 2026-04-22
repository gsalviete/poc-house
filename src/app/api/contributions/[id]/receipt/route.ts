import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { uploadReceipt, validateFile } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check contribution exists and is pending
    const contribResult = await query(
      'SELECT id, status FROM contributions WHERE id = $1',
      [id]
    );

    if (contribResult.rows.length === 0) {
      return NextResponse.json({ error: 'Contribuição não encontrada' }, { status: 404 });
    }

    const contrib = contribResult.rows[0] as Record<string, unknown>;
    if (contrib.status !== 'pending') {
      return NextResponse.json(
        { error: 'Comprovante já foi enviado ou contribuição já processada' },
        { status: 422 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('receipt') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Comprovante obrigatório' }, { status: 400 });
    }

    const validationError = validateFile(file);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const receiptUrl = await uploadReceipt(id, buffer, file.type);

    await query(
      'UPDATE contributions SET receipt_url = $1 WHERE id = $2',
      [receiptUrl, id]
    );

    return NextResponse.json({ receipt_url: receiptUrl, status: 'pending' });
  } catch (err) {
    console.error('Receipt upload error:', err);
    return NextResponse.json({ error: 'Erro ao enviar comprovante' }, { status: 500 });
  }
}
