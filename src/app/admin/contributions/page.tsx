'use client';

import { useEffect, useState, useCallback } from 'react';
import { formatCentsToBRL, formatDate } from '@/lib/format';
import toast from 'react-hot-toast';

interface Contribution {
  id: string;
  contributor_name: string;
  amount_cents: number;
  message: string | null;
  receipt_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  pix_tx_id: string | null;
  admin_notes: string | null;
  created_at: string;
  item_name: string | null;
  item_id: string | null;
}

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

export default function AdminContributionsPage() {
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [processing, setProcessing] = useState<string | null>(null);
  const [receiptModal, setReceiptModal] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string } | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');

  const getToken = () => sessionStorage.getItem('admin_token') || '';

  const fetchContributions = useCallback(async () => {
    try {
      const statusParam = filter !== 'all' ? `&status=${filter}` : '';
      const res = await fetch(`/api/admin/contributions?per_page=100${statusParam}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      setContributions(data.contributions || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    fetchContributions();
  }, [fetchContributions]);

  const handleUpdateStatus = async (id: string, status: 'approved' | 'rejected', notes?: string) => {
    setProcessing(id);
    try {
      const res = await fetch(`/api/admin/contributions/${id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${getToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          admin_notes: notes || (status === 'approved' ? 'Comprovante verificado' : 'Comprovante rejeitado'),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      toast.success(status === 'approved' ? 'Contribuição aprovada!' : 'Contribuição rejeitada');
      fetchContributions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar status');
    } finally {
      setProcessing(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectModal) return;
    await handleUpdateStatus(rejectModal.id, 'rejected', rejectNotes || undefined);
    setRejectModal(null);
    setRejectNotes('');
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { class: string; label: string }> = {
      pending:  { class: 'badge--pending',  label: '⏳ Pendente' },
      approved: { class: 'badge--approved', label: '✓ Aprovado' },
      rejected: { class: 'badge--rejected', label: '✕ Rejeitado' },
    };
    const s = map[status] || map.pending;
    return <span className={`badge ${s.class}`}>{s.label}</span>;
  };

  const filters: { value: StatusFilter; label: string }[] = [
    { value: 'all',      label: 'Todos' },
    { value: 'pending',  label: '⏳ Pendentes' },
    { value: 'approved', label: '✓ Aprovados' },
    { value: 'rejected', label: '✕ Rejeitados' },
  ];

  if (loading) {
    return <div className="loading-screen"><div className="spinner spinner--lg" /></div>;
  }

  return (
    <div className="animate-fade-in">
      <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, marginBottom: 'var(--space-6)' }}>
        Contribuições
      </h1>

      <div className="filters">
        {filters.map((f) => (
          <button
            key={f.value}
            className={`filter-btn ${filter === f.value ? 'filter-btn--active' : ''}`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {contributions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">💰</div>
          <div className="empty-state__text">
            Nenhuma contribuição {filter !== 'all' ? `com status "${filter}"` : ''}
          </div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Contribuinte</th>
                <th>Item</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Data</th>
                <th>Comprovante</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {contributions.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{c.contributor_name}</div>
                    {c.message && (
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-walnut)', fontStyle: 'italic', marginTop: 2 }}>
                        "{c.message}"
                      </div>
                    )}
                    {c.pix_tx_id && (
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontFamily: 'monospace', marginTop: 2 }}>
                        TX: {c.pix_tx_id}
                      </div>
                    )}
                  </td>
                  <td>
                    {c.item_name ? (
                      <span style={{ fontSize: 'var(--font-size-sm)' }}>{c.item_name}</span>
                    ) : (
                      <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                        Contribuição livre
                      </span>
                    )}
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                    {formatCentsToBRL(c.amount_cents)}
                  </td>
                  <td>{statusBadge(c.status)}</td>
                  <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                    {formatDate(c.created_at)}
                  </td>
                  <td>
                    {c.receipt_url ? (
                      <button
                        className="btn btn--ghost btn--sm"
                        onClick={() => setReceiptModal(c.receipt_url)}
                      >
                        📄 Ver
                      </button>
                    ) : (
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                        Sem comprovante
                      </span>
                    )}
                  </td>
                  <td>
                    {c.status === 'pending' ? (
                      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        <button
                          className="btn btn--success btn--sm"
                          onClick={() => handleUpdateStatus(c.id, 'approved')}
                          disabled={processing === c.id}
                        >
                          {processing === c.id ? <span className="spinner" /> : '✓'}
                        </button>
                        <button
                          className="btn btn--danger btn--sm"
                          onClick={() => { setRejectNotes(''); setRejectModal({ id: c.id }); }}
                          disabled={processing === c.id}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                        {c.admin_notes || '—'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Receipt Modal */}
      {receiptModal && (
        <div className="modal-overlay" onClick={() => setReceiptModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal__header">
              <h2 className="modal__title">Comprovante</h2>
              <button className="modal__close" onClick={() => setReceiptModal(null)}>✕</button>
            </div>
            <img
              src={receiptModal}
              alt="Comprovante de pagamento"
              style={{ width: '100%', borderRadius: 'var(--radius-md)' }}
            />
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectModal && (
        <div className="modal-overlay" onClick={() => setRejectModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal__header">
              <h2 className="modal__title">Rejeitar contribuição</h2>
              <button className="modal__close" onClick={() => setRejectModal(null)}>✕</button>
            </div>
            <div className="input-group" style={{ marginBottom: 'var(--space-5)' }}>
              <label className="input-label" htmlFor="reject-notes">
                Motivo <span style={{ fontWeight: 400, color: 'var(--color-driftwood)' }}>(opcional)</span>
              </label>
              <textarea
                id="reject-notes"
                className="input"
                rows={3}
                placeholder="Ex: Comprovante ilegível, valor incorreto..."
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
              <button className="btn btn--ghost" onClick={() => setRejectModal(null)}>Cancelar</button>
              <button
                className="btn btn--danger"
                onClick={handleRejectConfirm}
                disabled={processing === rejectModal.id}
              >
                {processing === rejectModal.id ? <span className="spinner" /> : 'Rejeitar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
