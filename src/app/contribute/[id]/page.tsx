'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatCentsToBRL } from '@/lib/format';

type Step = 'info' | 'pix' | 'receipt';

interface ItemInfo {
  id: string;
  name: string;
  price_cents: number;
  total_contributed_cents: number;
  remaining_cents: number;
}

interface PixData {
  id: string;
  pix_payload: string;
  pix_qr_base64: string;
  tx_id: string;
}

export default function ContributePage() {
  const params = useParams();
  const router = useRouter();
  const itemId = params.id as string;

  const [step, setStep] = useState<Step>('info');
  const [item, setItem] = useState<ItemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/items/${itemId}`)
      .then((res) => res.json())
      .then((data) => { setItem(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [itemId]);

  const amountCents = Math.round(parseFloat(amountInput.replace(',', '.') || '0') * 100);

  const handleSubmitInfo = useCallback(async () => {
    if (!name.trim() || name.trim().length < 2) {
      setError('Nome deve ter pelo menos 2 caracteres');
      return;
    }
    if (amountCents <= 0) {
      setError('Informe um valor válido');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/contributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: itemId,
          contributor_name: name.trim(),
          amount_cents: amountCents,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setPixData(data);
      setStep('pix');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar contribuição');
    } finally {
      setSubmitting(false);
    }
  }, [name, amountCents, itemId]);

  const handleCopyPix = useCallback(async () => {
    if (!pixData) return;
    try {
      await navigator.clipboard.writeText(pixData.pix_payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input');
      input.value = pixData.pix_payload;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  }, [pixData]);

  const handleUploadReceipt = useCallback(async () => {
    if (!receiptFile || !pixData) return;

    setSubmitting(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('receipt', receiptFile);

      const res = await fetch(`/api/contributions/${pixData.id}/receipt`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      router.push('/thank-you');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar comprovante');
    } finally {
      setSubmitting(false);
    }
  }, [receiptFile, pixData, router]);

  if (loading) {
    return <div className="loading-screen"><div className="spinner spinner--lg" /></div>;
  }

  return (
    <>
      <header className="header">
        <div className="container header__inner">
          <Link href="/" className="header__logo">
            🏠 <span>Nossa</span> Casa Nova
          </Link>
        </div>
      </header>

      <main className="container container--narrow" style={{ paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-16)' }}>
        <Link href={`/item/${itemId}`} className="btn btn--ghost btn--sm" style={{ marginBottom: 'var(--space-6)' }}>
          ← Voltar
        </Link>

        {item && (
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)' }}>
            Contribuindo para: <strong style={{ color: 'var(--color-text)' }}>{item.name}</strong>
          </p>
        )}

        {/* Steps */}
        <div className="steps">
          <div className={`step ${step === 'info' ? 'step--active' : (step === 'pix' || step === 'receipt') ? 'step--done' : ''}`}>1</div>
          <div className={`step-line ${(step === 'pix' || step === 'receipt') ? 'step-line--done' : ''}`} />
          <div className={`step ${step === 'pix' ? 'step--active' : step === 'receipt' ? 'step--done' : ''}`}>2</div>
          <div className={`step-line ${step === 'receipt' ? 'step-line--done' : ''}`} />
          <div className={`step ${step === 'receipt' ? 'step--active' : ''}`}>3</div>
        </div>

        {error && <div className="alert alert--error" style={{ marginBottom: 'var(--space-4)' }}>{error}</div>}

        {/* Step 1: Info */}
        {step === 'info' && (
          <div className="animate-slide-up">
            <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: 'var(--space-6)' }}>
              Seus dados
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              <div className="input-group">
                <label className="input-label" htmlFor="name">Seu nome</label>
                <input
                  id="name"
                  type="text"
                  className="input"
                  placeholder="Como quer ser identificado?"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="amount">Valor da contribuição (R$)</label>
                <input
                  id="amount"
                  type="text"
                  inputMode="decimal"
                  className="input"
                  placeholder="150,00"
                  value={amountInput}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9,\.]/g, '');
                    setAmountInput(val);
                  }}
                />
                {item && item.remaining_cents > 0 && (
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                    Valor restante: {formatCentsToBRL(item.remaining_cents)}
                  </span>
                )}
              </div>

              <button
                className="btn btn--primary btn--lg btn--full"
                onClick={handleSubmitInfo}
                disabled={submitting}
              >
                {submitting ? <span className="spinner" /> : 'Gerar Pix →'}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Pix QR */}
        {step === 'pix' && pixData && (
          <div className="animate-slide-up">
            <div className="pix-section">
              <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
                Escaneie o QR Code
              </h2>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                Abra seu app do banco e escaneie o código Pix
              </p>

              <div className="pix-section__qr">
                <img src={pixData.pix_qr_base64} alt="QR Code Pix" />
              </div>

              <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--color-primary)' }}>
                {formatCentsToBRL(amountCents)}
              </p>

              <div className="pix-section__copy" style={{ marginTop: 'var(--space-6)' }}>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)' }}>
                  Ou copie o código Pix:
                </p>
                <div className="pix-copy-input">
                  <input
                    type="text"
                    className="input"
                    value={pixData.pix_payload}
                    readOnly
                    style={{ fontSize: 'var(--font-size-xs)' }}
                  />
                  <button className="btn btn--secondary" onClick={handleCopyPix}>
                    {copied ? '✓ Copiado!' : '📋 Copiar'}
                  </button>
                </div>
              </div>
            </div>

            <button
              className="btn btn--primary btn--lg btn--full"
              onClick={() => setStep('receipt')}
              style={{ marginTop: 'var(--space-6)' }}
            >
              Já paguei! Enviar comprovante →
            </button>
          </div>
        )}

        {/* Step 3: Receipt Upload */}
        {step === 'receipt' && (
          <div className="animate-slide-up">
            <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
              Envie o comprovante
            </h2>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)' }}>
              Tire um print do comprovante de pagamento do Pix
            </p>

            <label
              className={`file-upload ${receiptFile ? 'file-upload--active' : ''}`}
              htmlFor="receipt-input"
            >
              <div className="file-upload__icon">
                {receiptFile ? '✅' : '📸'}
              </div>
              <div className="file-upload__text">
                {receiptFile ? (
                  <span>
                    <strong>{receiptFile.name}</strong>
                    <br />
                    <span style={{ fontSize: 'var(--font-size-xs)' }}>
                      Clique para trocar
                    </span>
                  </span>
                ) : (
                  <span>
                    <strong>Clique para selecionar</strong> ou arraste o comprovante
                    <br />
                    <span style={{ fontSize: 'var(--font-size-xs)' }}>
                      JPEG, PNG ou WebP — máx. 5MB
                    </span>
                  </span>
                )}
              </div>
              <input
                id="receipt-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                style={{ display: 'none' }}
              />
            </label>

            <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-6)' }}>
              <button
                className="btn btn--ghost"
                onClick={() => setStep('pix')}
              >
                ← Voltar ao QR
              </button>
              <button
                className="btn btn--primary btn--lg"
                style={{ flex: 1 }}
                onClick={handleUploadReceipt}
                disabled={!receiptFile || submitting}
              >
                {submitting ? <span className="spinner" /> : 'Enviar comprovante ✓'}
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
