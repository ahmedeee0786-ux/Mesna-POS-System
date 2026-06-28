import React, { useState } from 'react';

export default function CheckoutModal({ cart, total, subtotal, discountAmount, taxAmount, discount, onConfirm, onClose, loading }) {
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [cashGiven, setCashGiven] = useState('');

  const cashChange = paymentMethod === 'cash' && parseFloat(cashGiven) >= total
    ? parseFloat(cashGiven) - total
    : null;

  const canConfirm = cart.cartItems.length > 0 && (
    paymentMethod === 'card' || 
    (cashGiven !== '' && parseFloat(parseFloat(cashGiven).toFixed(2)) >= parseFloat(total.toFixed(2)))
  );

  return (
    <div className="glass-overlay animate-fade-in" role="dialog" aria-modal="true" aria-label="Checkout">
      <div className="card w-full max-w-md mx-4 p-6 animate-scale-in shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-100">Complete Payment</h2>
            <p className="text-sm text-slate-500 mt-0.5">{cart.itemCount} item{cart.itemCount !== 1 ? 's' : ''} in cart</p>
          </div>
          <button
            id="checkout-modal-close"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-surface hover:bg-surface-hover border border-surface-border 
                       text-slate-400 flex items-center justify-center transition-colors"
            aria-label="Close checkout"
          >
            ✕
          </button>
        </div>

        {/* Order summary */}
        <div className="bg-surface rounded-xl p-4 mb-5 space-y-2">
          <div className="flex justify-between text-sm text-slate-400">
            <span>Subtotal</span>
            <span>Rs. {subtotal.toFixed(2)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-sm text-green-400">
              <span>Discount ({discount}%)</span>
              <span>−Rs. {discountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm text-slate-400">
            <span>Tax (8.5%)</span>
            <span>Rs. {taxAmount.toFixed(2)}</span>
          </div>
          <div className="border-t border-surface-border pt-2 flex justify-between font-bold text-lg">
            <span className="text-slate-100">Total Due</span>
            <span className="text-brand-400">Rs. {total.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment method */}
        <div className="mb-5">
          <p className="text-sm font-medium text-slate-300 mb-2">Payment Method</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              id="payment-cash"
              onClick={() => setPaymentMethod('cash')}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl border font-semibold 
                         transition-all duration-150 ${
                           paymentMethod === 'cash'
                             ? 'bg-brand-600 border-brand-500 text-white shadow-lg shadow-brand-900/40'
                             : 'bg-surface border-surface-border text-slate-400 hover:border-slate-500'
                         }`}
              aria-pressed={paymentMethod === 'cash'}
            >
              💵 Cash
            </button>
            <button
              id="payment-card"
              onClick={() => setPaymentMethod('card')}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl border font-semibold 
                         transition-all duration-150 ${
                           paymentMethod === 'card'
                             ? 'bg-brand-600 border-brand-500 text-white shadow-lg shadow-brand-900/40'
                             : 'bg-surface border-surface-border text-slate-400 hover:border-slate-500'
                         }`}
              aria-pressed={paymentMethod === 'card'}
            >
              💳 Card
            </button>
          </div>
        </div>

        {/* Cash tendered */}
        {paymentMethod === 'cash' && (
          <div className="mb-5 animate-slide-up">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-slate-300" htmlFor="cash-given">
                Cash Tendered
              </label>
              <button 
                type="button"
                onClick={() => setCashGiven(total.toFixed(2))}
                className="text-xs text-brand-400 hover:text-brand-300 font-semibold"
              >
                Exact Amount
              </button>
            </div>

            {/* Quick cash buttons */}
            <div className="flex gap-2 mb-3">
              {[100, 500, 1000, 5000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setCashGiven(amt.toFixed(2))}
                  className="flex-1 py-2 rounded-lg bg-surface border border-surface-border text-xs font-bold text-slate-400 hover:border-brand-500 hover:text-brand-400 transition-all"
                >
                  Rs. {amt}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                id="cash-given"
                type="number"
                min={total.toFixed(2)}
                step="0.01"
                value={cashGiven}
                onChange={(e) => setCashGiven(e.target.value)}
                placeholder={`Minimum Rs. ${total.toFixed(2)}`}
                className="input-field flex-1 text-lg font-semibold text-center"
                autoFocus
              />
              {cashGiven && (
                <button
                  type="button"
                  onClick={() => setCashGiven('')}
                  className="px-3 bg-surface border border-surface-border rounded-xl text-slate-500 hover:text-red-400"
                  aria-label="Clear"
                >
                  ✕
                </button>
              )}
            </div>

            {cashChange !== null && cashChange >= 0 && (
              <div className="mt-2 bg-green-900/30 border border-green-700/40 rounded-xl px-4 py-2 flex justify-between">
                <span className="text-green-400 text-sm font-medium">Change Due</span>
                <span className="text-green-300 font-bold">Rs. {cashChange.toFixed(2)}</span>
              </div>
            )}
            {cashGiven !== '' && parseFloat(parseFloat(cashGiven).toFixed(2)) < parseFloat(total.toFixed(2)) && (
              <p className="text-red-400 text-xs mt-1 animate-pulse">⚠️ Insufficient amount (Need at least Rs. {total.toFixed(2)})</p>
            )}
          </div>
        )}

        {/* Confirm button */}
        <button
          id="confirm-checkout-btn"
          onClick={() => onConfirm(paymentMethod, paymentMethod === 'cash' ? parseFloat(cashGiven) : null)}
          disabled={!canConfirm || loading}
          className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-200 
                     flex items-center justify-center gap-2 ${
                       canConfirm && !loading
                         ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/40 active:scale-[0.98]'
                         : 'bg-surface-card border border-surface-border text-slate-600 cursor-not-allowed'
                     }`}
          aria-label="Confirm payment"
        >
          {loading ? (
            <>
              <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full inline-block" />
              Processing…
            </>
          ) : (
            <>✅ Confirm Payment</>
          )}
        </button>
      </div>
    </div>
  );
}
