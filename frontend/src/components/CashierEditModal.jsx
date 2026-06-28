import React, { useState } from 'react';
import { updateCashierName } from '../services/api';

export default function CashierEditModal({ isOpen, onClose, currentCashierName, cashierId = 1, onUpdateSuccess, showToast }) {
  const [newName, setNewName] = useState(currentCashierName || '');
  const [adminPin, setAdminPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return setError('Cashier name cannot be empty');
    if (!adminPin.trim()) return setError('Admin PIN is required for authorization');

    setLoading(true);
    setError('');

    try {
      const res = await updateCashierName(cashierId, newName, adminPin);
      if (res.success) {
        showToast('success', `Cashier name updated to "${newName}"`);
        onUpdateSuccess(newName);
        onClose();
      } else {
        setError('Failed to update cashier name');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Authorization failed. Verify PIN.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="card max-w-md w-full p-6 space-y-6 relative border border-surface-border bg-surface-card">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            👤 Edit Cashier Name
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Updating the cashier name requires admin approval.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-950/40 border border-red-500/30 text-red-400 text-xs rounded-xl animate-shake">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">New Cashier Name</label>
            <input
              type="text"
              className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-brand-500"
              placeholder="e.g. Ahmad"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Admin PIN Code</label>
            <input
              type="password"
              maxLength={4}
              pattern="[0-9]*"
              inputMode="numeric"
              className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-center text-xl tracking-[0.5em] font-bold text-slate-100 focus:outline-none focus:border-brand-500"
              placeholder="••••"
              value={adminPin}
              onChange={(e) => setAdminPin(e.target.value.replace(/\D/g, ''))}
              required
              disabled={loading}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-secondary py-2.5"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 btn-primary py-2.5"
              disabled={loading}
            >
              {loading ? 'Authorizing...' : 'Save & Authorize'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
