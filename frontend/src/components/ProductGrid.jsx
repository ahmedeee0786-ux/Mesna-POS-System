import React, { useState, useMemo } from 'react';
import ProductCard from './ProductCard';

const ALL_CATEGORIES = 'All';

export default function ProductGrid({ products, onAddToCart, loading }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORIES);

  // Derive unique categories from products
  const categories = useMemo(() => {
    const cats = [...new Set(products.map((p) => p.category))].sort();
    return [ALL_CATEGORIES, ...cats];
  }, [products]);

  // Filter products by search and category
  const filteredProducts = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return products.filter((p) => {
      const matchesCategory = activeCategory === ALL_CATEGORIES || p.category === activeCategory;
      const matchesSearch =
        !query ||
        p.name.toLowerCase().includes(query) ||
        p.sku_barcode.includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [products, searchQuery, activeCategory]);

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="relative mb-3">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔍</span>
        <input
          id="product-search"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name or scan barcode…"
          className="input-field w-full pl-9 text-sm"
          aria-label="Search products"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-sm"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat}
            id={`category-tab-${cat.replace(/\s+/g, '-').toLowerCase()}`}
            onClick={() => setActiveCategory(cat)}
            className={`category-tab ${activeCategory === cat ? 'category-tab-active' : 'category-tab-inactive'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Product grid */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-500">
            <span className="text-3xl mb-2">📭</span>
            <p className="text-sm">No products found</p>
            {searchQuery && (
              <p className="text-xs mt-1">Try a different search or category</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-2 pb-4">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} onAdd={onAddToCart} />
            ))}
          </div>
        )}
      </div>

      {/* Footer count */}
      <div className="pt-2 border-t border-surface-border text-xs text-slate-500 text-right">
        {filteredProducts.length} of {products.length} products
      </div>
    </div>
  );
}
