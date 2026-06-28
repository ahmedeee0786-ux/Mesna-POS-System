import React, { useState } from 'react';

export default function RestockModal({ product, onRestock, onClose }) {
  const [qty, setQty]         = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const quickAmounts = [5, 10, 20, 50, 100];

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amount = parseInt(qty);
    if (!amount || amount <= 0) return setError('Enter a positive quantity');
    setLoading(true);
    try {
      await onRestock(product.id, amount);
    } catch (err) {
      setError(err?.response?.data?.error || 'Restock failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-overlay animate-fade-in" role="dialog" aria-modal="true">
      <div className="card w-full max-w-sm mx-4 p-6 animate-scale-in shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-100">📦 Restock</h2>
            <p className="text-sm text-slate-400 mt-0.5 truncate max-w-[220px]">{product.name}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-surface hover:bg-surface-hover border border-surface-border text-slate-400 flex items-center justify-center">✕</button>
        </div>

        {/* Current stock */}
        <div className="bg-surface rounded-xl px-4 py-3 flex justify-between items-center mb-5">
          <span className="text-sm text-slate-500">Current Stock</span>
          <span className={`font-bold text-lg ${product.stock_quantity <= 5 ? 'text-amber-400' : 'text-slate-100'}`}>
            {product.stock_quantity} units
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Quick amounts */}
          <div>
            <p className="text-sm text-slate-400 mb-2">Quick Add</p>
            <div className="flex gap-2 flex-wrap">
              {quickAmounts.map((n) => (
                <button key={n} type="button" onClick={() => setQty(String(n))}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                    qty === String(n)
                      ? 'bg-brand-600 border-brand-500 text-white'
                      : 'bg-surface border-surface-border text-slate-400 hover:border-slate-500'
                  }`}>
                  +{n}
                </button>
              ))}
            </div>
          </div>

          {/* Custom amount */}
          <div>
            <label className="block text-sm text-slate-400 mb-1.5" htmlFor="restock-qty">Custom Amount</label>
            <input id="restock-qty" type="number" min="1" value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="Enter quantity…" className="input-field w-full text-center text-lg font-semibold" autoFocus />
          </div>

          {/* New total preview */}
          {qty && parseInt(qty) > 0 && (
            <div className="bg-green-900/20 border border-green-700/30 rounded-xl px-4 py-2 flex justify-between text-sm animate-fade-in">
              <span className="text-slate-400">New Total</span>
              <span className="text-green-400 font-bold">{product.stock_quantity + parseInt(qty)} units</span>
            </div>
          )}

          {error && <p className="text-red-400 text-sm">⚠ {error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 py-3">Cancel</button>
            <button type="submit" disabled={loading || !qty}
              className="btn-primary flex-1 py-3 flex items-center justify-center gap-2">
              {loading
                ? <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                : '📦 Add Stock'
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
