import React from 'react';
import CartItem from './CartItem';

export default function Cart({
  cart,
  onCheckout,
  loading,
}) {
  const {
    cartItems, discount, setDiscount,
    removeFromCart, updateQty,
    subtotal, discountAmount, taxAmount, total, itemCount,
  } = cart;

  const isEmpty = cartItems.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Cart header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xl">🛒</span>
          <h2 className="text-lg font-bold text-slate-100">Cart</h2>
          {itemCount > 0 && (
            <span className="bg-brand-600 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-scale-in">
              {itemCount}
            </span>
          )}
        </div>
        {!isEmpty && (
          <button
            id="clear-cart-btn"
            onClick={() => cart.clearCart()}
            className="text-xs text-slate-500 hover:text-red-400 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Cart items list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-600 py-16">
            <span className="text-5xl mb-3 opacity-30">🛒</span>
            <p className="text-sm font-medium">Cart is empty</p>
            <p className="text-xs mt-1 opacity-70">Click products or scan a barcode</p>
          </div>
        ) : (
          <div>
            {cartItems.map((item) => (
              <CartItem
                key={item.product.id}
                item={item}
                onUpdateQty={updateQty}
                onRemove={removeFromCart}
              />
            ))}
          </div>
        )}
      </div>

      {/* Totals + Checkout */}
      {!isEmpty && (
        <div className="shrink-0 border-t border-surface-border pt-4 mt-2 space-y-3 animate-slide-up">
          {/* Discount input */}
          <div className="flex items-center gap-3">
            <label htmlFor="discount-input" className="text-sm text-slate-400 shrink-0">Discount %</label>
            <input
              id="discount-input"
              type="number"
              min="0"
              max="100"
              value={discount}
              onChange={(e) => {
                const val = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                setDiscount(val);
              }}
              className="input-field flex-1 text-sm text-center"
              aria-label="Discount percentage"
            />
            {discount > 0 && (
              <span className="text-xs text-green-400 font-medium shrink-0">
                −Rs. {discountAmount.toFixed(2)}
              </span>
            )}
          </div>

          {/* Totals breakdown */}
          <div className="bg-surface rounded-xl p-3 space-y-1.5">
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
            <div className="border-t border-surface-border pt-1.5 flex justify-between font-bold">
              <span className="text-slate-100">Total</span>
              <span className="text-brand-400 text-lg">Rs. {total.toFixed(2)}</span>
            </div>
          </div>

          {/* Checkout button */}
          <button
            id="checkout-btn"
            onClick={onCheckout}
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 
                       hover:to-brand-400 text-white font-bold text-base rounded-xl shadow-lg 
                       shadow-brand-900/50 transition-all duration-200 active:scale-[0.98] 
                       flex items-center justify-center gap-2 focus:outline-none focus:ring-2 
                       focus:ring-brand-400"
            aria-label="Proceed to checkout"
          >
            {loading ? (
              <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full inline-block" />
            ) : (
              <>💳 Checkout — Rs. {total.toFixed(2)}</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
