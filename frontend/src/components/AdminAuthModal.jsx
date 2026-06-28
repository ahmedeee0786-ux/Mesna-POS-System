import React, { useState, useEffect, useRef } from 'react';
import { verifyAdminPin, changeAdminPin } from '../services/api';

export default function AdminAuthModal({ onSuccess, onClose }) {
  const [mode, setMode] = useState('unlock'); // 'unlock' | 'change'
  const [pin, setPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [mode]);

  const handleUnlock = async (e) => {
    e.preventDefault();
    if (!pin) return;

    setLoading(true);
    setError('');

    try {
      await verifyAdminPin(pin);
      onSuccess();
    } catch (err) {
      setError(err?.response?.data?.error || 'Invalid PIN. (Note: Please restart backend server if you just updated the code)');
      setPin('');
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleChangePin = async (e) => {
    e.preventDefault();
    if (!pin || !newPin) return;

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      await changeAdminPin(pin, newPin);
      setSuccessMsg('✅ PIN updated successfully! Unlocking admin panel...');
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to update PIN. Check current PIN.');
      setPin('');
      setNewPin('');
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-950/80 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-surface-card border border-surface-border rounded-3xl p-8 max-w-md w-full shadow-2xl animate-scale-up relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-100 transition-colors text-xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface"
          aria-label="Close modal"
        >
          ✕
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-brand-900/50 border border-brand-700/40 flex items-center justify-center text-3xl mx-auto mb-4 shadow-inner">
            {mode === 'unlock' ? '🔒' : '🔑'}
          </div>
          <h2 className="text-xl font-bold text-slate-100">
            {mode === 'unlock' ? 'Admin Authorization' : 'Set New Admin PIN'}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {mode === 'unlock' 
              ? 'Enter the Admin PIN to manage inventory and view sales reports.' 
              : 'Enter your current PIN, then choose a new 4-digit PIN.'}
          </p>
        </div>

        {successMsg ? (
          <div className="bg-green-900/40 border border-green-700 text-green-300 p-4 rounded-2xl text-center font-medium animate-fade-in mb-6">
            {successMsg}
          </div>
        ) : mode === 'unlock' ? (
          <form onSubmit={handleUnlock} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2 text-center" htmlFor="admin-pin">
                Enter 4-Digit PIN
              </label>
              <input
                ref={inputRef}
                id="admin-pin"
                type="password"
                maxLength={4}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, ''));
                  setError('');
                }}
                placeholder="••••"
                className="w-full bg-surface border border-surface-border rounded-2xl px-4 py-4 text-center text-3xl tracking-widest font-mono text-brand-300 focus:outline-none focus:border-brand-500 transition-all shadow-inner"
              />
              {error && <p className="text-red-400 text-xs mt-2 text-center animate-shake">{error}</p>}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 btn-secondary py-3 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || pin.length < 4}
                className="flex-1 btn-primary py-3 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-100 border-t-transparent rounded-full animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <span>Unlock</span>
                    <span>🔓</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleChangePin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1 text-center" htmlFor="current-pin">
                Current PIN
              </label>
              <input
                ref={inputRef}
                id="current-pin"
                type="password"
                maxLength={4}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, ''));
                  setError('');
                }}
                placeholder="••••"
                className="w-full bg-surface border border-surface-border rounded-xl px-4 py-3 text-center text-2xl tracking-widest font-mono text-slate-200 focus:outline-none focus:border-brand-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1 text-center" htmlFor="new-pin">
                New 4-Digit PIN
              </label>
              <input
                id="new-pin"
                type="password"
                maxLength={4}
                value={newPin}
                onChange={(e) => {
                  setNewPin(e.target.value.replace(/\D/g, ''));
                  setError('');
                }}
                placeholder="••••"
                className="w-full bg-surface border border-surface-border rounded-xl px-4 py-3 text-center text-2xl tracking-widest font-mono text-brand-300 focus:outline-none focus:border-brand-500 transition-all shadow-inner"
              />
              {error && <p className="text-red-400 text-xs mt-2 text-center animate-shake">{error}</p>}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setMode('unlock'); setPin(''); setNewPin(''); setError(''); }}
                className="flex-1 btn-secondary py-3 text-sm font-semibold"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading || pin.length < 4 || newPin.length < 4}
                className="flex-1 btn-primary py-3 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-100 border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <span>Save PIN</span>
                    <span>💾</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 pt-6 border-t border-surface-border flex items-center justify-end text-xs text-slate-500">
          {mode === 'unlock' && (
            <button
              type="button"
              onClick={() => { setMode('change'); setPin(''); setError(''); }}
              className="text-brand-400 hover:text-brand-300 font-semibold transition-colors flex items-center gap-1"
            >
              <span>⚙️ Change PIN</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
