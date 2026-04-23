'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Heart, Gift, PackageOpen, CheckCircle2, Home } from 'lucide-react';
import { formatCentsToBRL } from '@/lib/format';

interface Item {
  id: string;
  name: string;
  description: string;
  price_cents: number;
  image_url: string | null;
  external_link: string | null;
  total_contributed_cents: number;
  contribution_count: number;
  is_fully_funded: boolean;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 280, damping: 22 } },
};

export default function HomePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/items')
      .then((r) => r.json())
      .then((d) => { setItems(d.items || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <>
      <header className="header">
        <div className="container header__inner">
          <Link href="/" className="header__logo">
            <Home size={20} color="var(--color-terra)" />
            <span>Nossa</span>&nbsp;Casa Nova
          </Link>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
            <Link href="/contribute/free" className="btn btn--secondary btn--sm">
              <Heart size={14} color="var(--color-terra)" />
              Contribuição livre
            </Link>
          </motion.div>
        </div>
      </header>

      <main className="container">
        {/* ── Hero ── */}
        <motion.section
          className="page-hero"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        >
          <div className="page-hero__eyebrow">
            <Home size={12} />
            Nossa Nova Casa
          </div>

          <h1 className="page-hero__title">
            Lista de<br />
            <em>Presentes</em>
          </h1>

          <div className="page-hero__divider">
            <span className="page-hero__divider-line" />
            <span className="page-hero__divider-gem" />
            <span className="page-hero__divider-line" />
          </div>

          <p className="page-hero__subtitle">
            Estamos montando nosso novo lar! Escolha um item e nos ajude a tornar
            nossa casa mais especial.{' '}
            <Heart
              size={16}
              color="var(--color-terra)"
              style={{ display: 'inline', verticalAlign: 'text-bottom' }}
            />
          </p>
        </motion.section>

        {/* ── Grid ── */}
        <section className="section">
          {loading ? (
            <div className="loading-screen">
              <div className="spinner spinner--lg" />
            </div>
          ) : items.length === 0 ? (
            <motion.div
              className="empty-state"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.45 }}
            >
              <div className="empty-state__icon">
                <PackageOpen size={48} color="var(--color-driftwood)" />
              </div>
              <div className="empty-state__text">Nenhum item disponível ainda</div>
              <p style={{ color: 'var(--color-driftwood)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-2)' }}>
                Em breve teremos novidades!
              </p>
            </motion.div>
          ) : (
            <motion.div
              className="grid grid--items"
              variants={containerVariants}
              initial="hidden"
              animate="show"
            >
              {items.map((item) => {
                const progress =
                  item.price_cents > 0
                    ? Math.min(100, (item.total_contributed_cents / item.price_cents) * 100)
                    : 0;

                return (
                  <motion.div key={item.id} variants={itemVariants}>
                    <Link href={`/item/${item.id}`} style={{ textDecoration: 'none' }}>
                      <article className="card">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="card__image"
                          />
                        ) : (
                          <div
                            className="card__image"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Gift size={48} color="var(--color-driftwood)" />
                          </div>
                        )}

                        <div className="card__body">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
                            <h2 className="card__title">{item.name}</h2>
                            {item.is_fully_funded && (
                              <span className="badge badge--funded" style={{ flexShrink: 0 }}>
                                <CheckCircle2 size={11} /> Completo
                              </span>
                            )}
                          </div>

                          {item.description && (
                            <p className="card__subtitle">
                              {item.description.length > 80
                                ? item.description.slice(0, 80) + '…'
                                : item.description}
                            </p>
                          )}

                          <div className="card__price">{formatCentsToBRL(item.price_cents)}</div>

                          <div className="progress">
                            <motion.div
                              className="progress__bar"
                              initial={{ width: 0 }}
                              animate={{ width: `${progress}%` }}
                              transition={{ duration: 1.1, ease: 'easeOut' }}
                            />
                          </div>
                          <div className="progress__text">
                            <span>{formatCentsToBRL(item.total_contributed_cents)} arrecadado</span>
                            <span style={{ fontWeight: 600, color: progress >= 100 ? 'var(--color-moss)' : undefined }}>
                              {Math.round(progress)}%
                            </span>
                          </div>

                          {item.contribution_count > 0 && (
                            <p style={{
                              fontSize: 'var(--font-size-xs)',
                              color: 'var(--color-driftwood)',
                              marginTop: 'var(--space-2)',
                            }}>
                              {item.contribution_count}{' '}
                              {item.contribution_count === 1 ? 'contribuição' : 'contribuições'}
                            </p>
                          )}
                        </div>
                      </article>
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </section>
      </main>

      <footer className="footer">
        Feito com{' '}
        <Heart size={12} color="var(--color-terra)" style={{ display: 'inline' }} />
        {' '}para nossa casa nova
      </footer>
    </>
  );
}
