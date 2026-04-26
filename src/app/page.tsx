'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Heart, Gift, PackageOpen, CheckCircle2, Home, Flame } from 'lucide-react';
import { formatCentsToBRL } from '@/lib/format';

interface Item {
  id: string;
  name: string;
  description: string;
  price_cents: number;
  image_url: string | null;
  total_contributed_cents: number;
  contribution_count: number;
  is_fully_funded: boolean;
}

interface Stats {
  total_goal_cents: number;
  total_raised_cents: number;
  contributors: {
    contributor_name: string;
    amount_cents: number;
    message: string | null;
    created_at: string;
    item_name: string | null;
  }[];
}

const containerVariants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 280, damping: 22 } },
};

export default function HomePage() {
  const [items, setItems]   = useState<Item[]>([]);
  const [stats, setStats]   = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.all([
      fetch('/api/items').then((r) => r.json()),
      fetch('/api/stats').then((r) => r.json()),
    ])
      .then(([itemsData, statsData]) => {
        setItems(itemsData.items || []);
        setStats(statsData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);


  return (
    <>
      <header className="header">
        <div className="container header__inner">
          <Link href="/" className="header__logo">
            <Home size={20} color="var(--color-terra)" />
            <span>chá de casa nova</span>
          </Link>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
            {/* mobile-first refactor: text hidden on small screens to prevent header overflow */}
            <Link href="/contribute/free" className="btn btn--secondary btn--sm">
              <Heart size={14} color="var(--color-terra)" />
              <span className="btn-label-short">pix livre</span>
              <span className="btn-label-full">prefiro te fazer um pix</span>
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
            chá de casa nova
          </div>

          <h1 className="page-hero__title">
            me ajuda a não<br />
            <em>sobreviver só de miojo!</em> 🙏🏽
          </h1>

          <div className="page-hero__divider">
            <span className="page-hero__divider-line" />
            <span className="page-hero__divider-gem" />
            <span className="page-hero__divider-line" />
          </div>

          <p className="page-hero__subtitle">
            contribua e concorra a um churrasco na minha casa nova!{' '}
          </p>
        </motion.section>


        {/* ── Grid de itens ── */}
        <section className="section">
          {loading ? (
            <div className="loading-screen"><div className="spinner spinner--lg" /></div>
          ) : items.length === 0 ? (
            <motion.div
              className="empty-state"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="empty-state__icon"><PackageOpen size={48} color="var(--color-driftwood)" /></div>
              <div className="empty-state__text">Calma, a lista tá vindo! 👀</div>
              <p style={{ color: 'var(--color-driftwood)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-2)' }}>
                Ainda não tem nada aqui, mas em breve você vai ter muito o que escolher.
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
                const progress = item.price_cents > 0
                  ? Math.min(100, (item.total_contributed_cents / item.price_cents) * 100)
                  : 0;
                const isNearComplete = progress >= 80 && progress < 100;

                return (
                  <motion.div key={item.id} variants={itemVariants}>
                    <Link href={`/item/${item.id}`} style={{ textDecoration: 'none' }}>
                      <article className="card">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="card__image" />
                        ) : (
                          <div className="card__image" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Gift size={48} color="var(--color-driftwood)" />
                          </div>
                        )}

                        <div className="card__body">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
                            <h2 className="card__title">{item.name}</h2>
                            {item.is_fully_funded
                              ? <span className="badge badge--funded" style={{ flexShrink: 0 }}><CheckCircle2 size={11} /> Completo</span>
                              : isNearComplete
                              ? <span className="badge badge--fire" style={{ flexShrink: 0 }}><Flame size={11} /> Quase lá!</span>
                              : null}
                          </div>

                          {item.description && (
                            <p className="card__subtitle">
                              {item.description.length > 80 ? item.description.slice(0, 80) + '…' : item.description}
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
                            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-driftwood)', marginTop: 'var(--space-2)' }}>
                              {item.contribution_count} {item.contribution_count === 1 ? 'pessoa ajudou' : 'pessoas ajudaram'} 🧡
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

        {/* ── Quem já ajudou ── */}
        {stats && stats.contributors.length > 0 && (
          <motion.section
            className="contributors-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <h2 className="contributors-section__title">
              Quem já ajudou 🧡
            </h2>
            <p className="contributors-section__subtitle">
              Essas pessoas são incríveis. Sério.
            </p>

            <div className="contributors-list">
              {stats.contributors.map((c, i) => (
                <motion.div
                  key={i}
                  className="contributor-card"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.65 + i * 0.05 }}
                >
                  <div className="contributor-card__avatar">
                    {c.contributor_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="contributor-card__info">
                    <div className="contributor-card__name">{c.contributor_name}</div>
                    <div className="contributor-card__meta">
                      <span style={{ color: 'var(--color-terra)', fontWeight: 600 }}>
                        {formatCentsToBRL(c.amount_cents)}
                      </span>
                      {c.item_name
                        ? <span style={{ color: 'var(--color-driftwood)' }}> · {c.item_name}</span>
                        : <span style={{ color: 'var(--color-driftwood)', fontStyle: 'italic' }}> · contribuição livre</span>}
                    </div>
                    {c.message && (
                      <p className="contributor-card__message">"{c.message}"</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}
      </main>

    </>
  );
}
