'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { PartyPopper, Home, ArrowLeft, Heart } from 'lucide-react';

export default function ThankYouPage() {
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

      <main className="container container--narrow">
        <motion.div
          className="thank-you"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, type: 'spring', stiffness: 260, damping: 22 }}
        >
          <motion.div
            className="thank-you__icon"
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.15 }}
          >
            <PartyPopper size={80} color="var(--color-terra)" />
          </motion.div>

          <h1 className="thank-you__title">Muito obrigado!</h1>

          <p className="thank-you__subtitle">
            Seu comprovante foi enviado com sucesso. Vamos verificar e confirmar
            sua contribuição em breve.{' '}
            <Heart
              size={16}
              fill="currentColor"
              color="var(--color-terra)"
              style={{ display: 'inline', verticalAlign: 'text-bottom' }}
            />
          </p>

          <motion.p
            style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-driftwood)',
              marginBottom: 'var(--space-8)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Agradecemos de coração por nos ajudar a montar nosso novo lar!
          </motion.p>

          <motion.div
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Link href="/" className="btn btn--primary btn--lg">
              <ArrowLeft size={18} /> Ver mais itens
            </Link>
          </motion.div>
        </motion.div>
      </main>
    </>
  );
}
