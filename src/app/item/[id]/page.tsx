'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { formatCentsToBRL, formatDate } from '@/lib/format';

interface ItemDetail {
  id: string;
  name: string;
  description: string;
  price_cents: number;
  image_url: string | null;
  external_link: string | null;
  total_contributed_cents: number;
  remaining_cents: number;
  contributions: {
    contributor_name: string;
    amount_cents: number;
    status: string;
    created_at: string;
  }[];
}

export default function ItemDetailPage() {
  const params = useParams();
  const [item, setItem] = useState<ItemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/items/${params.id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Item não encontrado');
        return res.json();
      })
      .then((data) => { setItem(data); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, [params.id]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner--lg" />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="container" style={{ paddingTop: 'var(--space-16)', textAlign: 'center' }}>
        <div className="empty-state">
          <div className="empty-state__icon">😔</div>
          <div className="empty-state__text">{error || 'Item não encontrado'}</div>
          <Link href="/" className="btn btn--primary" style={{ marginTop: 'var(--space-6)' }}>
            Voltar para lista
          </Link>
        </div>
      </div>
    );
  }

  const progress = Math.min(100, (item.total_contributed_cents / item.price_cents) * 100);
  const isFullyFunded = item.total_contributed_cents >= item.price_cents;

  return (
    <>
      <header className="header">
        <div className="container header__inner">
          <Link href="/" className="header__logo">
            🏠 <span>Nossa</span> Casa Nova
          </Link>
        </div>
      </header>

      <main className="container">
        <div style={{ padding: 'var(--space-4) 0' }}>
          <Link href="/" className="btn btn--ghost btn--sm" style={{ marginBottom: 'var(--space-4)' }}>
            ← Voltar para lista
          </Link>
        </div>

        <div className="item-detail animate-fade-in">
          <div>
            {item.image_url ? (
              <img src={item.image_url} alt={item.name} className="item-detail__image" />
            ) : (
              <div className="item-detail__image-placeholder">🎁</div>
            )}
          </div>

          <div className="item-detail__info">
            <div>
              {isFullyFunded && <span className="badge badge--funded" style={{ marginBottom: 'var(--space-2)', display: 'inline-flex' }}>✓ Meta atingida!</span>}
              <h1 className="item-detail__name">{item.name}</h1>
            </div>

            {item.description && (
              <p className="item-detail__desc">{item.description}</p>
            )}

            <div>
              <div className="card__price" style={{ fontSize: 'var(--font-size-2xl)' }}>
                {formatCentsToBRL(item.price_cents)}
              </div>
              <div className="progress" style={{ marginTop: 'var(--space-3)' }}>
                <div className="progress__bar" style={{ width: `${progress}%` }} />
              </div>
              <div className="progress__text">
                <span>{formatCentsToBRL(item.total_contributed_cents)} arrecadado</span>
                <span>{formatCentsToBRL(item.remaining_cents)} restante</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', marginTop: 'var(--space-4)' }}>
              <Link
                href={`/contribute/${item.id}`}
                className="btn btn--primary btn--lg"
                style={{ flex: 1 }}
              >
                💛 Contribuir
              </Link>
              {item.external_link && (
                <a
                  href={item.external_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn--secondary btn--lg"
                >
                  🔗 Ver produto
                </a>
              )}
            </div>

            {item.contributions.length > 0 && (
              <div style={{ marginTop: 'var(--space-6)' }}>
                <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--space-3)', color: 'var(--color-text-secondary)' }}>
                  Contribuições ({item.contributions.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {item.contributions.map((c, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: 'var(--space-3) var(--space-4)',
                        background: 'var(--color-surface)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 'var(--font-size-sm)',
                      }}
                    >
                      <span>{c.contributor_name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                          {formatCentsToBRL(c.amount_cents)}
                        </span>
                        <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)' }}>
                          {formatDate(c.created_at)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
