'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, ArrowLeft, ArrowRight, Copy, CheckCircle2, Camera } from 'lucide-react';
import { formatCentsToBRL } from '@/lib/format';
import toast from 'react-hot-toast';

type Step = 'info' | 'pix' | 'receipt';

interface ItemInfo {
  id: string;
  name: string;
  price_cents: number;
  remaining_cents: number;
}

interface PixData {
  id: string;
  pix_payload: string;
  pix_qr_base64: string;
  tx_id: string;
}

const fadeVariants = {
  hidden:  { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  exit:    { opacity: 0, y: -10, transition: { duration: 0.2 } },
};

const STEP_LABELS = ['Seus dados', 'Pagar', 'Comprovante'];

interface Props {
  itemId: string | null;
}

export default function ContributeFlow({ itemId }: Props) {
  const router = useRouter();

  const [step, setStep]             = useState<Step>('info');
  const [item, setItem]             = useState<ItemInfo | null>(null);
  const [loadingItem, setLoadingItem] = useState(!!itemId);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName]             = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [message, setMessage]       = useState('');
  const [pixData, setPixData]       = useState<PixData | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [copied, setCopied]         = useState(false);

  useEffect(() => {
    if (!itemId) return;
    fetch(`/api/items/${itemId}`)
      .then((r) => r.json())
      .then((d) => setItem(d))
      .catch(() => {})
      .finally(() => setLoadingItem(false));
  }, [itemId]);

  const amountCents = Math.round(parseFloat(amountInput.replace(',', '.') || '0') * 100);

  const handleSubmitInfo = useCallback(async () => {
    if (name.trim().length < 2) {
      toast.error('Nome deve ter pelo menos 2 caracteres');
      return;
    }
    if (amountCents <= 0) {
      toast.error('Informe um valor válido');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/contributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: itemId,
          contributor_name: name.trim(),
          amount_cents: amountCents,
          message: message.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setPixData(data);
      setStep('pix');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar contribuição');
    } finally {
      setSubmitting(false);
    }
  }, [name, amountCents, itemId, message]);

  const handleCopyPix = useCallback(async () => {
    if (!pixData) return;
    try {
      await navigator.clipboard.writeText(pixData.pix_payload);
    } catch {
      const el = document.createElement('input');
      el.value = pixData.pix_payload;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
    toast.success('Código Pix copiado!');
  }, [pixData]);

  const handleUploadReceipt = useCallback(async () => {
    if (!receiptFile || !pixData) return;

    setSubmitting(true);
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
      toast.error(err instanceof Error ? err.message : 'Erro ao enviar comprovante');
    } finally {
      setSubmitting(false);
    }
  }, [receiptFile, pixData, router]);

  const fillRemaining = () => {
    if (item?.remaining_cents) {
      setAmountInput((item.remaining_cents / 100).toFixed(2).replace('.', ','));
    }
  };

  if (loadingItem) {
    return <div className="loading-screen"><div className="spinner spinner--lg" /></div>;
  }

  const stepIndex = step === 'info' ? 0 : step === 'pix' ? 1 : 2;

  return (
    <>
      <header className="header">
        <div className="container header__inner">
          <Link href="/" className="header__logo">
            <Home size={20} color="var(--color-terra)" />
            <span>chá de casa</span>&nbsp;do sasa
          </Link>
        </div>
      </header>

      <main className="container container--narrow" style={{ paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-16)' }}>
        <Link href={itemId ? `/item/${itemId}` : '/'} className="btn btn--ghost btn--sm" style={{ marginBottom: 'var(--space-6)' }}>
          <ArrowLeft size={16} /> Voltar
        </Link>

        {item ? (
          <div style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-4)', background: 'var(--color-primary-bg)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(184,92,56,.15)' }}>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-walnut)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 'var(--space-1)' }}>
              Contribuindo para
            </p>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--color-sand)' }}>
              {item.name}
            </p>
            {item.remaining_cents > 0 && (
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-walnut)', marginTop: 'var(--space-1)' }}>
                Faltam <strong style={{ color: 'var(--color-terra)' }}>{formatCentsToBRL(item.remaining_cents)}</strong> para completar 🎯
              </p>
            )}
          </div>
        ) : !itemId && (
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--color-sand)', marginBottom: 'var(--space-1)' }}>
              Contribuição livre 💸
            </h1>
            <p style={{ color: 'var(--color-walnut)', fontSize: 'var(--font-size-sm)' }}>
              Contribua com qualquer valor, sem escolher um item específico. A gente agradece igual! 🧡
            </p>
          </div>
        )}

        {/* Steps */}
        <div className="steps">
          {STEP_LABELS.map((label, i) => {
            const done   = i < stepIndex;
            const active = i === stepIndex;
            return (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <div
                  className={`step ${active ? 'step--active' : done ? 'step--done' : ''}`}
                  title={label}
                >
                  {done ? <CheckCircle2 size={16} /> : i + 1}
                </div>
                {i < STEP_LABELS.length - 1 && (
                  <div className={`step-line ${done ? 'step-line--done' : ''}`} />
                )}
              </div>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {/* ── Step 1: Info ── */}
          {step === 'info' && (
            <motion.div key="info" variants={fadeVariants} initial="hidden" animate="visible" exit="exit">
              <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: 'var(--space-6)', color: 'var(--color-sand)' }}>
                Me conta quem você é 😄
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                <div className="input-group">
                  <label className="input-label" htmlFor="name">Seu nome</label>
                  <input
                    id="name"
                    type="text"
                    className="input"
                    placeholder="Como quer aparecer na lista?"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={100}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label" htmlFor="amount">
                    Valor da contribuição (R$)
                  </label>
                  <input
                    id="amount"
                    type="text"
                    inputMode="decimal"
                    className="input"
                    placeholder="150,00"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value.replace(/[^0-9,.]/g, ''))}
                  />
                  {item && item.remaining_cents > 0 && (
                    <button
                      type="button"
                      onClick={fillRemaining}
                      style={{
                        alignSelf: 'flex-start',
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--color-terra)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        textDecoration: 'underline',
                      }}
                    >
                      Completar os {formatCentsToBRL(item.remaining_cents)} que faltam
                    </button>
                  )}
                </div>

                <div className="input-group">
                  <label className="input-label" htmlFor="message">
                    Deixa uma mensagem pra mim{' '}
                    <span style={{ fontWeight: 400, color: 'var(--color-driftwood)' }}>(opcional)</span>
                  </label>
                  <textarea
                    id="message"
                    className="input"
                    placeholder="pode ser um oi, uma motivação ou até uma ameaça carinhosa 😂"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={300}
                    rows={2}
                  />
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-driftwood)', textAlign: 'right' }}>
                    {message.length}/300
                  </span>
                </div>

                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <button
                    className="btn btn--primary btn--lg btn--full"
                    onClick={handleSubmitInfo}
                    disabled={submitting}
                  >
                    {submitting ? <span className="spinner" /> : <><ArrowRight size={20} /> Gerar meu Pix</>}
                  </button>
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* ── Step 2: QR Code ── */}
          {step === 'pix' && pixData && (
            <motion.div key="pix" variants={fadeVariants} initial="hidden" animate="visible" exit="exit">
              <div className="pix-section card">
                <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: 'var(--space-2)', color: 'var(--color-sand)' }}>
                  Hora de pagar! 💸
                </h2>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-walnut)' }}>
                  Abre o app do banco e escaneia o QR Code abaixo
                </p>

                <motion.div
                  className="pix-section__qr"
                  initial={{ scale: 0.85 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                >
                  <img src={pixData.pix_qr_base64} alt="QR Code Pix" />
                </motion.div>

                <p style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-terra)' }}>
                  {formatCentsToBRL(amountCents)}
                </p>

                <div className="pix-section__copy" style={{ marginTop: 'var(--space-6)' }}>
                  <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-driftwood)', marginBottom: 'var(--space-2)' }}>
                    Prefere copiar e colar o código?
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
                  <ArrowRight size={20} /> Paguei! Me deixa mandar o print 📸
                </button>
              </motion.div>
            </motion.div>
          )}

          {/* ── Step 3: Comprovante ── */}
          {step === 'receipt' && (
            <motion.div key="receipt" variants={fadeVariants} initial="hidden" animate="visible" exit="exit">
              <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: 'var(--space-2)', color: 'var(--color-sand)' }}>
                Só falta um printinho 📱
              </h2>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-walnut)', marginBottom: 'var(--space-6)' }}>
                Quase lá! Manda o comprovante do Pix pra eu confirmar 🙏
              </p>

              <label
                className={`file-upload ${receiptFile ? 'file-upload--active' : ''}`}
                htmlFor="receipt-input"
              >
                <div className="file-upload__icon">
                  {receiptFile
                    ? <CheckCircle2 size={48} color="var(--color-moss)" />
                    : <Camera size={48} color="var(--color-driftwood)" />}
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
