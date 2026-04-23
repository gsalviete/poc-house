import type { Metadata } from 'next';
import { Playfair_Display, Outfit } from 'next/font/google';
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
      <body>{children}</body>
    </html>
  );
}
