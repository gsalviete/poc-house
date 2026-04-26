import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { createContributionSchema } from '@/lib/validation';
import { generatePixPayload, generatePixQRCode, getPixConfig } from '@/lib/pix';
import { shortId } from '@/lib/format';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createContributionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { item_id, contributor_name, amount_cents, message } = parsed.data;

    if (item_id) {
      const itemResult = await query(
        'SELECT id FROM items WHERE id = $1 AND is_active = true',
        [item_id]
      );
      if (itemResult.rows.length === 0) {
        return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 });
      }
    }

    // Gera o ID antecipado para montar o tx_id em uma única query
    const contributionId = crypto.randomUUID();
    const txId = shortId(contributionId);

    await query(
      `INSERT INTO contributions (id, item_id, contributor_name, amount_cents, pix_tx_id, message, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
      [contributionId, item_id || null, contributor_name.trim(), amount_cents, txId, message?.trim() || null]
    );

    const pixConfig = getPixConfig();
    const pixPayload = generatePixPayload({
      pixKey: pixConfig.pixKey,
      merchantName: pixConfig.merchantName,
      merchantCity: pixConfig.merchantCity,
      amountCents: amount_cents,
      txId,
    });

    const pixQrBase64 = await generatePixQRCode(pixPayload);

    return NextResponse.json(
      { id: contributionId, pix_payload: pixPayload, pix_qr_base64: pixQrBase64, tx_id: txId, status: 'pending' },
      { status: 201 }
    );
  } catch (err) {
    console.error('Contribution creation error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
