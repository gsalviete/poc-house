'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, ArrowLeft, ArrowRight, Copy, CheckCircle2, Camera, HeartHandshake } from 'lucide-react';
import { formatCentsToBRL } from '@/lib/format';

type Step = 'info' | 'pix' | 'receipt';

interface PixData {
  id: string;
  pix_payload: string;
  pix_qr_base64: string;
  tx_id: string;
}

const fadeVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } }
};

export default function FreeContributePage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>('info');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [copied, setCopied] = useState(false);

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
          item_id: null,
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
  }, [name, amountCents]);

  const handleCopyPix = useCallback(async () => {
    if (!pixData) return;
    try {
      await navigator.clipboard.writeText(pixData.pix_payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
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

      <main className="container container--narrow" style={{ paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-16)' }}>
        <Link href="/" className="btn btn--ghost btn--sm" style={{ marginBottom: 'var(--space-6)' }}>
          <ArrowLeft size={16} /> Voltar para lista
        </Link>

        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
          <HeartHandshake size={28} color="var(--color-primary)" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 'var(--space-2)' }} />
          Contribuição Livre
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)', fontSize: 'var(--font-size-sm)' }}>
          Contribua com qualquer valor, sem escolher um item específico
        </p>

        {/* Steps */}
        <div className="steps">
          <div className={`step ${step === 'info' ? 'step--active' : (step === 'pix' || step === 'receipt') ? 'step--done' : ''}`}>1</div>
          <div className={`step-line ${(step === 'pix' || step === 'receipt') ? 'step-line--done' : ''}`} />
          <div className={`step ${step === 'pix' ? 'step--active' : step === 'receipt' ? 'step--done' : ''}`}>2</div>
          <div className={`step-line ${step === 'receipt' ? 'step-line--done' : ''}`} />
          <div className={`step ${step === 'receipt' ? 'step--active' : ''}`}>3</div>
        </div>

        {error && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="alert alert--error" style={{ marginBottom: 'var(--space-4)' }}>{error}</motion.div>}

        <AnimatePresence mode="wait">
          {step === 'info' && (
            <motion.div key="info" variants={fadeVariants} initial="hidden" animate="visible" exit="exit">
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
                  <label className="input-label" htmlFor="amount">Valor (R$)</label>
                  <input
                    id="amount"
                    type="text"
                    inputMode="decimal"
                    className="input"
                    placeholder="100,00"
                    value={amountInput}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9,\.]/g, '');
                      setAmountInput(val);
                    }}
                  />
                </div>

                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <button
                    className="btn btn--primary btn--lg btn--full"
                    onClick={handleSubmitInfo}
                    disabled={submitting}
                  >
                    {submitting ? <span className="spinner" /> : <><ArrowRight size={20} /> Gerar Pix</>}
                  </button>
                </motion.div>
              </div>
            </motion.div>
          )}

          {step === 'pix' && pixData && (
            <motion.div key="pix" variants={fadeVariants} initial="hidden" animate="visible" exit="exit">
              <div className="pix-section card">
                <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
                  Escaneie o QR Code
                </h2>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                  Abra seu app do banco e escaneie o código Pix
                </p>

                <motion.div 
                  className="pix-section__qr"
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                >
                  <img src={pixData.pix_qr_base64} alt="QR Code Pix" />
                </motion.div>

                <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--color-primary)' }}>
                  {formatCentsToBRL(amountCents)}
                </p>

                <div className="pix-section__copy" style={{ marginTop: 'var(--space-6)' }}>
                  <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)' }}>
                    Ou copie o código Pix:
                  </p>
                  <div className="pix-copy-input">
                    <input type="text" className="input" value={pixData.pix_payload} readOnly style={{ fontSize: 'var(--font-size-xs)' }} />
                    <button className="btn btn--secondary" onClick={handleCopyPix}>
                      {copied ? <><CheckCircle2 size={16} /> Copiado!</> : <><Copy size={16} /> Copiar</>}
                    </button>
                  </div>
                </div>
              </div>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <button
                  className="btn btn--primary btn--lg btn--full"
                  onClick={() => setStep('receipt')}
                  style={{ marginTop: 'var(--space-6)' }}
                >
                  <ArrowRight size={20} /> Já paguei! Enviar comprovante
                </button>
              </motion.div>
            </motion.div>
          )}

          {step === 'receipt' && (
            <motion.div key="receipt" variants={fadeVariants} initial="hidden" animate="visible" exit="exit">
              <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
                Envie o comprovante
              </h2>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)' }}>
                Tire um print do comprovante de pagamento do Pix
              </p>

              <label className={`file-upload ${receiptFile ? 'file-upload--active' : ''}`} htmlFor="receipt-input">
                <div className="file-upload__icon">
                  {receiptFile ? <CheckCircle2 size={48} color="var(--color-success)" /> : <Camera size={48} color="var(--color-text-muted)" />}
                </div>
                <div className="file-upload__text">
                  {receiptFile ? (
                    <span><strong>{receiptFile.name}</strong><br /><span style={{ fontSize: 'var(--font-size-xs)' }}>Clique para trocar</span></span>
                  ) : (
                    <span><strong>Clique para selecionar</strong> ou arraste o comprovante<br /><span style={{ fontSize: 'var(--font-size-xs)' }}>JPEG, PNG ou WebP — máx. 5MB</span></span>
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
                <button className="btn btn--ghost" onClick={() => setStep('pix')}>
                  <ArrowLeft size={16} /> Voltar ao QR
                </button>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} style={{ flex: 1 }}>
                  <button
                    className="btn btn--primary btn--lg btn--full"
                    onClick={handleUploadReceipt}
                    disabled={!receiptFile || submitting}
                  >
                    {submitting ? <span className="spinner" /> : <><CheckCircle2 size={20} /> Enviar comprovante</>}
                  </button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </>
  );
}
