import React, { useState, useEffect } from 'react';
import { adminEditOrder } from '../services/api';

const TAX_RATE = 0.085;

function calcTotal(items, discount) {
  const subtotal = items.reduce((s, i) => s + i.price_at_sale * i.quantity, 0);
  const disc = (discount || 0) / 100;
  const afterDisc = subtotal * (1 - disc);
  return parseFloat((afterDisc + afterDisc * TAX_RATE).toFixed(2));
}

export default function OrderEditModal({ order, onClose, onSaved }) {
  const [items, setItems]     = useState([]);
  const [discount, setDiscount] = useState(0);
  const [payment, setPayment] = useState('cash');
  const [pin, setPin]         = useState('');
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (!order) return;
    setItems(
      order.items.map(i => ({
        product_id:    i.product_id,
        name:          i.product?.name || `Product #${i.product_id}`,
        quantity:      i.quantity,
        price_at_sale: i.price_at_sale,
      }))
    );
    setDiscount(order.discount_applied || 0);
    setPayment(order.payment_method || 'cash');
    setPin('');
    setError('');
  }, [order]);

  if (!order) return null;

  const preview = calcTotal(items, discount);

  function handleQtyChange(idx, val) {
    const qty = Math.max(1, parseInt(val) || 1);
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: qty } : it));
  }

  function handlePriceChange(idx, val) {
    const price = Math.max(0, parseFloat(val) || 0);
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, price_at_sale: price } : it));
  }

  async function handleSave() {
    if (!pin.trim()) { setError('Admin PIN is required'); return; }
    setSaving(true);
    setError('');
    try {
      await adminEditOrder(order.id, {
        adminPin: pin.trim(),
        items,
        payment_method: payment,
        discount_applied: discount,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to update order');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative w-full max-w-xl rounded-2xl border border-surface-border shadow-2xl overflow-hidden"
        style={{ background: 'var(--color-surface, #1e2130)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
          <div>
            <h2 className="text-lg font-bold text-slate-100">✏️ Edit Order <span className="font-mono text-brand-400">#{order.id}</span></h2>
            <p className="text-xs text-slate-500 mt-0.5">Correct quantities or prices — revenue will update automatically.</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-200 transition-colors text-xl leading-none"
          >✕</button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">

          {/* Items table */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Items</p>
            {items.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 bg-surface/60 border border-surface-border/60 rounded-xl px-4 py-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-100 truncate">{item.name}</p>
                </div>
                {/* Qty */}
                <div className="flex flex-col items-center gap-0.5">
                  <label className="text-[10px] text-slate-500 uppercase">Qty</label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={e => handleQtyChange(idx, e.target.value)}
                    className="w-16 text-center rounded-lg border border-surface-border bg-surface text-slate-100 text-sm py-1 px-2 focus:outline-none focus:border-brand-400"
                  />
                </div>
                {/* Price */}
                <div className="flex flex-col items-center gap-0.5">
                  <label className="text-[10px] text-slate-500 uppercase">Price (Rs.)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.price_at_sale}
                    onChange={e => handlePriceChange(idx, e.target.value)}
                    className="w-24 text-center rounded-lg border border-surface-border bg-surface text-slate-100 text-sm py-1 px-2 focus:outline-none focus:border-brand-400"
                  />
                </div>
                {/* Line total */}
                <div className="flex flex-col items-end gap-0.5 min-w-[70px]">
                  <span className="text-[10px] text-slate-500 uppercase">Subtotal</span>
                  <span className="text-sm font-bold text-brand-400">
                    Rs. {(item.quantity * item.price_at_sale).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Discount & Payment */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Discount (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={discount}
                onChange={e => setDiscount(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                className="w-full rounded-xl border border-surface-border bg-surface text-slate-100 text-sm py-2 px-3 focus:outline-none focus:border-brand-400"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Payment</label>
              <select
                value={payment}
                onChange={e => setPayment(e.target.value)}
                className="w-full rounded-xl border border-surface-border bg-surface text-slate-100 text-sm py-2 px-3 focus:outline-none focus:border-brand-400"
              >
                <option value="cash">💵 Cash</option>
                <option value="card">💳 Card</option>
              </select>
            </div>
          </div>

          {/* Live total preview */}
          <div className="flex items-center justify-between bg-brand-900/20 border border-brand-700/30 rounded-xl px-5 py-3">
            <span className="text-sm font-semibold text-slate-300">New Total (incl. 8.5% tax)</span>
            <span className="text-xl font-bold text-brand-400">Rs. {preview.toFixed(2)}</span>
          </div>

          {/* Admin PIN */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">🔐 Admin PIN to confirm</label>
            <input
              type="password"
              placeholder="Enter admin PIN"
              value={pin}
              onChange={e => setPin(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              className="w-full rounded-xl border border-surface-border bg-surface text-slate-100 text-sm py-2 px-4 focus:outline-none focus:border-brand-400 tracking-widest"
            />
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-900/20 border border-red-700/30 rounded-xl px-4 py-2">
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-border">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-slate-400 hover:text-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 rounded-xl text-sm font-bold text-white transition-all
              bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400
              disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-900/30"
          >
            {saving ? '⏳ Saving…' : '✅ Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
