'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Heart, ExternalLink, ArrowLeft, Gift, CheckCircle2, AlertCircle, Home } from 'lucide-react';
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
    return <div className="loading-screen"><div className="spinner spinner--lg" /></div>;
  }

  if (error || !item) {
    return (
      <div className="container" style={{ paddingTop: 'var(--space-16)', textAlign: 'center' }}>
        <motion.div
          className="empty-state"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="empty-state__icon">
            <AlertCircle size={48} color="var(--color-crimson)" />
          </div>
          <div className="empty-state__text">{error || 'Item não encontrado'}</div>
          <Link href="/" className="btn btn--primary" style={{ marginTop: 'var(--space-6)', display: 'inline-flex' }}>
            Voltar para lista
          </Link>
        </motion.div>
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
            <Home size={20} color="var(--color-terra)" />
            <span>Nossa</span>&nbsp;Casa Nova
          </Link>
        </div>
      </header>

      <main className="container">
        <div style={{ padding: 'var(--space-4) 0' }}>
          <Link href="/" className="btn btn--ghost btn--sm" style={{ marginBottom: 'var(--space-4)' }}>
            <ArrowLeft size={16} /> Voltar para lista
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 'var(--space-8)',
            background: 'var(--color-bg-card)',
            padding: 'var(--space-6)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          {/* ── Imagem ── */}
          <div>
            {item.image_url ? (
              <img
                src={item.image_url}
                alt={item.name}
                style={{
                  width: '100%',
                  borderRadius: 'var(--radius-lg)',
                  objectFit: 'cover',
                  boxShadow: 'var(--shadow-md)',
                }}
              />
            ) : (
              <div style={{
                width: '100%',
                height: '300px',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--color-surface)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Gift size={64} color="var(--color-driftwood)" />
              </div>
            )}
          </div>

          {/* ── Info ── */}
          <div className="item-detail__info">
            <div>
              {isFullyFunded && (
                <span className="badge badge--funded" style={{ marginBottom: 'var(--space-2)', display: 'inline-flex' }}>
                  <CheckCircle2 size={12} /> Meta atingida!
                </span>
              )}
              <h1 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--font-size-2xl)',
                fontWeight: 800,
                color: 'var(--color-sand)',
                lineHeight: 1.25,
                marginBottom: 'var(--space-2)',
              }}>
                {item.name}
              </h1>
            </div>

            {item.description && (
              <p style={{ color: 'var(--color-walnut)', lineHeight: 1.8 }}>
                {item.description}
              </p>
            )}

            <div style={{ marginBottom: 'var(--space-4)' }}>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--font-size-3xl)',
                fontWeight: 800,
                color: 'var(--color-terra)',
              }}>
                {formatCentsToBRL(item.price_cents)}
              </div>
              <div className="progress" style={{ marginTop: 'var(--space-3)' }}>
                <motion.div
                  className="progress__bar"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1.1, ease: 'easeOut', delay: 0.2 }}
                />
              </div>
              <div className="progress__text">
                <span>{formatCentsToBRL(item.total_contributed_cents)} arrecadado</span>
                <span>{formatCentsToBRL(item.remaining_cents)} restante</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} style={{ flex: 1 }}>
                <Link href={`/contribute/${item.id}`} className="btn btn--primary btn--lg btn--full">
                  <Heart size={18} fill="currentColor" /> Contribuir
                </Link>
              </motion.div>
              {item.external_link && (
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <a
                    href={item.external_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn--secondary btn--lg"
                  >
                    <ExternalLink size={18} /> Ver produto
                  </a>
                </motion.div>
              )}
            </div>

            {item.contributions.length > 0 && (
              <motion.div
                style={{ marginTop: 'var(--space-6)' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
              >
                <h3 style={{
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 600,
                  marginBottom: 'var(--space-3)',
                  color: 'var(--color-walnut)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}>
                  Contribuições ({item.contributions.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {item.contributions.map((c, i) => (
                    <motion.div
                      key={i}
                      className="contribution-row"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + i * 0.07 }}
                    >
                      <span style={{ fontWeight: 500, color: 'var(--color-sand)' }}>{c.contributor_name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <span style={{ color: 'var(--color-terra)', fontWeight: 600 }}>
                          {formatCentsToBRL(c.amount_cents)}
                        </span>
                        <span style={{ color: 'var(--color-driftwood)', fontSize: 'var(--font-size-xs)' }}>
                          {formatDate(c.created_at)}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </main>
    </>
  );
}
