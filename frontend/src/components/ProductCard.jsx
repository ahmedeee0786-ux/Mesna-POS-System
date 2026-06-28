import React from 'react';

const CATEGORY_EMOJI = {
  'Beverages':    '🥤',
  'Snacks':       '🍿',
  'Personal Care':'🧴',
  'Bakery':       '🥖',
  'Dairy':        '🥛',
  'Pharmacy':     '💊',
};

export default function ProductCard({ product, onAdd }) {
  const isLowStock = product.stock_quantity <= 5;
  const isOutOfStock = product.stock_quantity === 0;
  const emoji = CATEGORY_EMOJI[product.category] || '📦';

  return (
    <div
      id={`product-card-${product.id}`}
      className={`product-card animate-fade-in ${isOutOfStock ? 'opacity-40 pointer-events-none' : ''}`}
      onClick={() => !isOutOfStock && onAdd(product)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && !isOutOfStock && onAdd(product)}
      aria-label={`Add ${product.name} to cart`}
    >
      {/* Emoji icon */}
      <div className="text-3xl mb-2 text-center leading-none">{emoji}</div>

      {/* Name */}
      <h3 className="text-sm font-semibold text-slate-100 leading-tight line-clamp-2 text-center mb-1">
        {product.name}
      </h3>

      {/* SKU */}
      <p className="text-xs text-slate-500 text-center font-mono mb-2">{product.sku_barcode}</p>

      {/* Price */}
      <div className="text-center">
        <span className="text-lg font-bold text-brand-400">Rs. {product.price.toFixed(2)}</span>
      </div>

      {/* Stock badge */}
      <div className="mt-2 text-center">
        {isOutOfStock ? (
          <span className="text-xs bg-red-900/60 text-red-400 px-2 py-0.5 rounded-full border border-red-800/50">
            Out of Stock
          </span>
        ) : isLowStock ? (
          <span className="text-xs bg-amber-900/60 text-amber-400 px-2 py-0.5 rounded-full border border-amber-800/50">
            Low: {product.stock_quantity}
          </span>
        ) : (
          <span className="text-xs text-slate-500">{product.stock_quantity} in stock</span>
        )}
      </div>
    </div>
  );
}
