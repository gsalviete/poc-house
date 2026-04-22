'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem('admin_token');
    if (!stored && pathname !== '/admin/login') {
      router.push('/admin/login');
    } else {
      setToken(stored);
    }
    setChecking(false);
  }, [pathname, router]);

  const handleLogout = useCallback(() => {
    sessionStorage.removeItem('admin_token');
    router.push('/admin/login');
  }, [router]);

  // Don't show sidebar on login page
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  if (checking) {
    return <div className="loading-screen"><div className="spinner spinner--lg" /></div>;
  }

  if (!token) {
    return null;
  }

  const navLinks = [
    { href: '/admin', label: '📊 Dashboard', exact: true },
    { href: '/admin/items', label: '📦 Itens' },
    { href: '/admin/contributions', label: '💰 Contribuições' },
  ];

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <div className="sidebar__logo">
          🏠 <span>Admin</span>
        </div>
        <nav className="sidebar__nav">
          {navLinks.map((link) => {
            const isActive = link.exact
              ? pathname === link.href
              : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`sidebar__link ${isActive ? 'sidebar__link--active' : ''}`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
          <Link href="/" className="sidebar__link" target="_blank">
            🔗 Ver site público
          </Link>
          <button onClick={handleLogout} className="sidebar__link" style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-family)' }}>
            🚪 Sair
          </button>
        </div>
      </aside>

      <main className="admin-content">
        {children}
      </main>
    </div>
  );
}
