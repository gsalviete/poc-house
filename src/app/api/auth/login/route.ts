import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyPassword, generateToken } from '@/lib/auth';
import { loginSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { username, password } = parsed.data;

    const result = await query<{ id: string; password_hash: string }>(
      'SELECT id, password_hash FROM admin WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }

    const admin = result.rows[0];
    const valid = await verifyPassword(password, admin.password_hash);

    if (!valid) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }

    const token = generateToken(admin.id);

    return NextResponse.json({ token, expires_in: 86400 });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
