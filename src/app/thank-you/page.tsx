import Link from 'next/link';

export default function ThankYouPage() {
  return (
    <>
      <header className="header">
        <div className="container header__inner">
          <Link href="/" className="header__logo">
            🏠 <span>Nossa</span> Casa Nova
          </Link>
        </div>
      </header>

      <main className="container container--narrow">
        <div className="thank-you animate-slide-up">
          <div className="thank-you__icon">🎉</div>
          <h1 className="thank-you__title">Muito obrigado!</h1>
          <p className="thank-you__subtitle">
            Seu comprovante foi enviado com sucesso. Vamos verificar e confirmar
            sua contribuição em breve. 💛
          </p>
          <p style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-muted)',
            marginBottom: 'var(--space-8)',
          }}>
            Agradecemos de coração por nos ajudar a montar nosso novo lar!
          </p>
          <Link href="/" className="btn btn--primary btn--lg">
            ← Ver mais itens
          </Link>
        </div>
      </main>
    </>
  );
}
