import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractToken } from '@/lib/auth';

export function requireAdmin(
  handler: (req: NextRequest, context: { params: Promise<Record<string, string>> }) => Promise<NextResponse>
) {
  return async (req: NextRequest, context: { params: Promise<Record<string, string>> }) => {
    const token = extractToken(req.headers.get('authorization'));
    if (!token) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    try {
      const payload = verifyToken(token);
      if (payload.role !== 'admin') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
      }
      return handler(req, context);
    } catch {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }
  };
}
