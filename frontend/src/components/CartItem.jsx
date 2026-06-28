import React from 'react';

export default function CartItem({ item, onUpdateQty, onRemove }) {
  const { product, quantity } = item;
  const lineTotal = product.price * quantity;

  return (
    <div className="flex items-center gap-3 py-3 border-b border-surface-border last:border-0 animate-fade-in group">
      {/* Product info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-100 truncate">{product.name}</p>
        <p className="text-xs text-slate-500 mt-0.5">Rs. {product.price.toFixed(2)} each</p>
      </div>

      {/* Qty controls */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          id={`qty-dec-${product.id}`}
          onClick={() => quantity > 1 ? onUpdateQty(product.id, quantity - 1) : onRemove(product.id)}
          className="w-7 h-7 rounded-lg bg-surface hover:bg-surface-hover border border-surface-border 
                     text-slate-300 flex items-center justify-center transition-colors text-sm font-bold"
          aria-label="Decrease quantity"
        >
          {quantity === 1 ? '×' : '−'}
        </button>

        <input
          id={`qty-input-${product.id}`}
          type="number"
          min="1"
          value={quantity}
          onChange={(e) => onUpdateQty(product.id, e.target.value)}
          className="w-12 text-center text-sm font-semibold bg-surface border border-surface-border 
                     rounded-lg py-1 text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
          aria-label={`Quantity for ${product.name}`}
        />

        <button
          id={`qty-inc-${product.id}`}
          onClick={() => onUpdateQty(product.id, quantity + 1)}
          className="w-7 h-7 rounded-lg bg-surface hover:bg-surface-hover border border-surface-border 
                     text-slate-300 flex items-center justify-center transition-colors text-sm font-bold"
          aria-label="Increase quantity"
        >
          +
        </button>
      </div>

      {/* Line total */}
      <div className="w-16 text-right shrink-0">
        <span className="text-sm font-semibold text-slate-100">Rs. {lineTotal.toFixed(2)}</span>
      </div>

      {/* Remove */}
      <button
        id={`remove-item-${product.id}`}
        onClick={() => onRemove(product.id)}
        className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-md bg-red-900/40 hover:bg-red-600/40 
                   text-red-400 flex items-center justify-center transition-all text-xs shrink-0"
        aria-label={`Remove ${product.name}`}
      >
        ✕
      </button>
    </div>
  );
}
