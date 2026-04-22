'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { PartyPopper, Home, ArrowLeft } from 'lucide-react';

export default function ThankYouPage() {
  return (
    <>
      <header className="header">
        <div className="container header__inner">
          <Link href="/" className="header__logo">
            <Home className="text-primary" size={24} color="var(--color-primary)" />
            <span>Nossa</span> Casa Nova
          </Link>
        </div>
      </header>

      <main className="container container--narrow">
        <motion.div 
          className="thank-you"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, type: 'spring' }}
        >
          <motion.div 
            className="thank-you__icon"
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
            style={{ display: 'inline-block' }}
          >
            <PartyPopper size={80} color="var(--color-primary)" />
          </motion.div>
          
          <h1 className="thank-you__title">Muito obrigado!</h1>
          <p className="thank-you__subtitle">
            Seu comprovante foi enviado com sucesso. Vamos verificar e confirmar
            sua contribuição em breve. 
            <Heart size={18} fill="currentColor" color="var(--color-primary)" style={{ display: 'inline', verticalAlign: 'text-bottom', marginLeft: 'var(--space-1)' }} />
          </p>
          <p style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-muted)',
            marginBottom: 'var(--space-8)',
          }}>
            Agradecemos de coração por nos ajudar a montar nosso novo lar!
          </p>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link href="/" className="btn btn--primary btn--lg">
              <ArrowLeft size={20} /> Ver mais itens
            </Link>
          </motion.div>
        </motion.div>
      </main>
    </>
  );
}

// Quick fallback component since Heart wasn't imported from lucide-react in the top import
function Heart(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size} height={props.size} viewBox="0 0 24 24" fill={props.fill || "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
    </svg>
  );
}
