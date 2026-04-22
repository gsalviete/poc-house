import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nossa Casa Nova — Lista de Presentes',
  description: 'Contribua com um presente para nossa casa nova! Escolha um item e ajude a tornar nosso lar mais completo.',
  openGraph: {
    title: 'Nossa Casa Nova — Lista de Presentes',
    description: 'Contribua com um presente para nossa casa nova!',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
