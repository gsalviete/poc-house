'use client';

import { useEffect, useState } from 'react';
import { formatCentsToBRL } from '@/lib/format';

interface Stats {
  totalItems: number;
  totalContributions: number;
  pendingCount: number;
  approvedTotal: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = sessionStorage.getItem('admin_token');
    if (!token) return;

    Promise.all([
      fetch('/api/admin/items', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch('/api/admin/contributions?per_page=1000', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([itemsData, contribData]) => {
      const contributions = contribData.contributions || [];
      const pendingCount = contributions.filter((c: Record<string, unknown>) => c.status === 'pending').length;
      const approvedTotal = contributions
        .filter((c: Record<string, unknown>) => c.status === 'approved')
        .reduce((sum: number, c: Record<string, unknown>) => sum + (c.amount_cents as number), 0);

      setStats({
        totalItems: (itemsData.items || []).length,
        totalContributions: contributions.length,
        pendingCount,
        approvedTotal,
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="loading-screen"><div className="spinner spinner--lg" /></div>;
  }

  return (
    <div className="animate-fade-in">
      <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, marginBottom: 'var(--space-8)' }}>
        Dashboard
      </h1>

      <div className="grid grid--stats">
        <div className="stat-card">
          <div className="stat-card__value">{stats?.totalItems || 0}</div>
          <div className="stat-card__label">Itens cadastrados</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__value">{stats?.totalContributions || 0}</div>
          <div className="stat-card__label">Contribuições total</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__value" style={{ color: 'var(--color-warning)' }}>
            {stats?.pendingCount || 0}
          </div>
          <div className="stat-card__label">Pendentes de aprovação</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__value" style={{ color: 'var(--color-success)' }}>
            {formatCentsToBRL(stats?.approvedTotal || 0)}
          </div>
          <div className="stat-card__label">Total arrecadado</div>
        </div>
      </div>

      {(stats?.pendingCount || 0) > 0 && (
        <div className="alert alert--warning" style={{
          marginTop: 'var(--space-8)',
          background: 'var(--color-warning-bg)',
          borderColor: 'var(--color-warning)',
          color: 'var(--color-warning)',
        }}>
          ⚠️ Você tem {stats?.pendingCount} contribuição(ões) aguardando aprovação.
          <a href="/admin/contributions" style={{ color: 'var(--color-warning)', fontWeight: 700, marginLeft: 'var(--space-2)' }}>
            Ver contribuições →
          </a>
        </div>
      )}
    </div>
  );
}
