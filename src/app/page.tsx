'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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

export default function HomePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/items')
      .then((res) => res.json())
      .then((data) => { setItems(data.items || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <>
      <header className="header">
        <div className="container header__inner">
          <Link href="/" className="header__logo">
            🏠 <span>Nossa</span> Casa Nova
          </Link>
          <Link href="/contribute/free" className="btn btn--secondary btn--sm">
            💛 Contribuir livremente
          </Link>
        </div>
      </header>

      <main className="container">
        <section className="page-hero">
          <h1 className="page-hero__title">Nossa Lista de Presentes</h1>
          <p className="page-hero__subtitle">
            Estamos montando nosso novo lar! Escolha um item e nos ajude a tornar
            nossa casa mais especial. 💛
          </p>
        </section>

        <section className="section">
          {loading ? (
            <div className="loading-screen">
              <div className="spinner spinner--lg" />
            </div>
          ) : items.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">📦</div>
              <div className="empty-state__text">Nenhum item disponível ainda</div>
              <p style={{ color: 'var(--color-text-muted)' }}>Em breve teremos novidades!</p>
            </div>
          ) : (
            <div className="grid grid--items">
              {items.map((item) => {
                const progress = item.price_cents > 0
                  ? Math.min(100, (item.total_contributed_cents / item.price_cents) * 100)
                  : 0;

                return (
                  <Link href={`/item/${item.id}`} key={item.id} style={{ textDecoration: 'none' }}>
                    <article className="card animate-fade-in">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="card__image"
                        />
                      ) : (
                        <div className="card__image" style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '3rem',
                          background: 'var(--color-surface)',
                        }}>
                          🎁
                        </div>
                      )}
                      <div className="card__body">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                          <h2 className="card__title">{item.name}</h2>
                          {item.is_fully_funded && (
                            <span className="badge badge--funded">✓ Completo</span>
                          )}
                        </div>
                        {item.description && (
                          <p className="card__subtitle">
                            {item.description.length > 80
                              ? item.description.substring(0, 80) + '...'
                              : item.description}
                          </p>
                        )}
                        <div className="card__price">{formatCentsToBRL(item.price_cents)}</div>

                        <div className="progress">
                          <div
                            className="progress__bar"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <div className="progress__text">
                          <span>{formatCentsToBRL(item.total_contributed_cents)} arrecadado</span>
                          <span>{Math.round(progress)}%</span>
                        </div>

                        {item.contribution_count > 0 && (
                          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-2)' }}>
                            {item.contribution_count} {item.contribution_count === 1 ? 'contribuição' : 'contribuições'}
                          </p>
                        )}
                      </div>
                    </article>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <footer style={{
        textAlign: 'center',
        padding: 'var(--space-8)',
        color: 'var(--color-text-muted)',
        fontSize: 'var(--font-size-xs)',
        borderTop: '1px solid var(--color-border)',
        marginTop: 'var(--space-8)',
      }}>
        Feito com 💛 para nossa casa nova
      </footer>
    </>
  );
}
