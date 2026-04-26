'use client';

import { useEffect, useState, useCallback, FormEvent } from 'react';
import { formatCentsToBRL } from '@/lib/format';
import toast from 'react-hot-toast';

interface Item {
  id: string;
  name: string;
  description: string;
  price_cents: number;
  image_url: string | null;
  external_link: string | null;
  is_active: boolean;
  total_contributed_cents: number;
  total_contributions: number;
}

export default function AdminItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formLink, setFormLink] = useState('');
  const [formImage, setFormImage] = useState<File | null>(null);

  const getToken = () => sessionStorage.getItem('admin_token') || '';

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/items', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      setItems(data.items || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const openCreateModal = () => {
    setEditingItem(null);
    setFormName('');
    setFormDescription('');
    setFormPrice('');
    setFormLink('');
    setFormImage(null);
    setError('');
    setShowModal(true);
  };

  const openEditModal = (item: Item) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormDescription(item.description || '');
    setFormPrice((item.price_cents / 100).toFixed(2).replace('.', ','));
    setFormLink(item.external_link || '');
    setFormImage(null);
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const priceCents = Math.round(parseFloat(formPrice.replace(',', '.') || '0') * 100);
    if (priceCents <= 0) {
      setError('Preço deve ser maior que zero');
      setSubmitting(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('name', formName);
      formData.append('description', formDescription);
      formData.append('price_cents', priceCents.toString());
      formData.append('external_link', formLink);
      if (formImage) formData.append('image', formImage);

      const url = editingItem
        ? `/api/admin/items/${editingItem.id}`
        : '/api/admin/items';

      const res = await fetch(url, {
        method: editingItem ? 'PUT' : 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setShowModal(false);
      fetchItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    toast((t) => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={{ fontWeight: 600 }}>Remover este item?</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn--danger btn--sm"
            onClick={async () => {
              toast.dismiss(t.id);
              try {
                await fetch(`/api/admin/items/${id}`, {
                  method: 'DELETE',
                  headers: { Authorization: `Bearer ${getToken()}` },
                });
                fetchItems();
                toast.success('Item removido');
              } catch {
                toast.error('Erro ao remover item');
              }
            }}
          >
            Remover
          </button>
          <button className="btn btn--ghost btn--sm" onClick={() => toast.dismiss(t.id)}>
            Cancelar
          </button>
        </div>
      </div>
    ), { duration: Infinity });
  };

  if (loading) {
    return <div className="loading-screen"><div className="spinner spinner--lg" /></div>;
  }

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800 }}>Itens</h1>
        <button className="btn btn--primary" onClick={openCreateModal}>
          + Novo Item
        </button>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">📦</div>
          <div className="empty-state__text">Nenhum item cadastrado</div>
          <button className="btn btn--primary" onClick={openCreateModal} style={{ marginTop: 'var(--space-4)' }}>
            Criar primeiro item
          </button>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Preço</th>
                <th>Arrecadado</th>
                <th>Contribuições</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt=""
                          style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{
                          width: 40, height: 40, borderRadius: 'var(--radius-sm)',
                          background: 'var(--color-surface)', display: 'flex',
                          alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem',
                        }}>🎁</div>
                      )}
                      <div>
                        <div style={{ fontWeight: 600 }}>{item.name}</div>
                        {item.description && (
                          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                            {item.description.substring(0, 50)}{item.description.length > 50 ? '...' : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>{formatCentsToBRL(item.price_cents)}</td>
                  <td style={{ color: 'var(--color-primary)' }}>
                    {formatCentsToBRL(item.total_contributed_cents)}
                  </td>
                  <td>{item.total_contributions}</td>
                  <td>
                    {item.is_active ? (
                      <span className="badge badge--approved">Ativo</span>
                    ) : (
                      <span className="badge badge--rejected">Inativo</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                      <button className="btn btn--ghost btn--sm" onClick={() => openEditModal(item)}>
                        ✏️
                      </button>
                      <button className="btn btn--ghost btn--sm" onClick={() => handleDelete(item.id)}>
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal">
            <div className="modal__header">
              <h2 className="modal__title">{editingItem ? 'Editar Item' : 'Novo Item'}</h2>
              <button className="modal__close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            {error && <div className="alert alert--error" style={{ marginBottom: 'var(--space-4)' }}>{error}</div>}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              <div className="input-group">
                <label className="input-label" htmlFor="item-name">Nome *</label>
                <input
                  id="item-name"
                  type="text"
                  className="input"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Sofá 3 lugares"
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="item-desc">Descrição</label>
                <textarea
                  id="item-desc"
                  className="input"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Descrição opcional do item"
                  rows={3}
                />
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="item-price">Preço (R$) *</label>
                <input
                  id="item-price"
                  type="text"
                  inputMode="decimal"
                  className="input"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value.replace(/[^0-9,\.]/g, ''))}
                  placeholder="250,00"
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="item-link">Link externo</label>
                <input
                  id="item-link"
                  type="url"
                  className="input"
                  value={formLink}
                  onChange={(e) => setFormLink(e.target.value)}
                  placeholder="https://loja.com.br/produto"
                />
              </div>

              <div className="input-group">
                <label className="input-label">Imagem</label>
                <label className={`file-upload ${formImage ? 'file-upload--active' : ''}`} htmlFor="item-image" style={{ padding: 'var(--space-4)' }}>
                  <div className="file-upload__text">
                    {formImage ? (
                      <span><strong>{formImage.name}</strong></span>
                    ) : (
                      <span><strong>Selecionar imagem</strong> — JPEG, PNG ou WebP</span>
                    )}
                  </div>
                  <input
                    id="item-image"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => setFormImage(e.target.files?.[0] || null)}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn--ghost" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn--primary" disabled={submitting}>
                  {submitting ? <span className="spinner" /> : editingItem ? 'Salvar' : 'Criar Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
