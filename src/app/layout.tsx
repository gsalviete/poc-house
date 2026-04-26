import type { Metadata } from 'next';
import { Playfair_Display, Outfit } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import './globals.css';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--playfair',
  weight: ['600', '700', '800'],
  style: ['normal', 'italic'],
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--outfit',
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Nossa Casa Nova — Lista de Presentes',
  description: 'Contribua com um presente para nossa casa nova! Escolha um item e ajude a tornar nosso lar mais completo.',
  openGraph: {
    title: 'Nossa Casa Nova — Lista de Presentes',
    description: 'Contribua com um presente para nossa casa nova!',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${playfair.variable} ${outfit.variable}`}>
      <body>
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              fontFamily: 'var(--outfit, system-ui, sans-serif)',
              background: '#fff',
              color: '#2A1A0A',
              border: '1px solid #DDD0B3',
              borderRadius: '10px',
              boxShadow: '0 4px 16px rgba(42,26,10,0.12)',
            },
            success: { iconTheme: { primary: '#4A7A58', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#B03030', secondary: '#fff' } },
          }}
        />
      </body>
    </html>
  );
}
