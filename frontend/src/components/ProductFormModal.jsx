import React, { useState, useEffect } from 'react';

const CATEGORY_EMOJI = {
  'Beverages':    '🥤',
  'Snacks':       '🍿',
  'Personal Care':'🧴',
  'Bakery':       '🥖',
  'Dairy':        '🥛',
  'Pharmacy':     '💊',
};

const EMPTY = { sku_barcode: '', name: '', price: '', cost: '', stock_quantity: '', category: '' };

export default function ProductFormModal({ product, categories, onSave, onClose }) {
  const isEdit = Boolean(product);
  const [form, setForm]       = useState(isEdit ? { ...product, price: product.price.toFixed(2), cost: product.cost.toFixed(2) } : EMPTY);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [newCat, setNewCat]   = useState('');
  const [addingCat, setAddingCat] = useState(false);

  const allCategories = addingCat
    ? categories
    : [...new Set([...categories, ...(form.category && !categories.includes(form.category) ? [form.category] : [])])];

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!form.sku_barcode.trim()) return setError('Barcode/SKU is required');
    if (!form.name.trim())        return setError('Product name is required');
    if (!form.price || isNaN(form.price) || parseFloat(form.price) <= 0) return setError('Enter a valid price');
    if (!form.cost  || isNaN(form.cost)  || parseFloat(form.cost) < 0)  return setError('Enter a valid cost');
    if (!form.category.trim())    return setError('Category is required');

    setLoading(true);
    try {
      await onSave({
        sku_barcode:    form.sku_barcode.trim(),
        name:           form.name.trim(),
        price:          parseFloat(form.price),
        cost:           parseFloat(form.cost),
        stock_quantity: parseInt(form.stock_quantity) || 0,
        category:       form.category.trim(),
      });
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = () => {
    const cat = newCat.trim();
    if (!cat) return;
    setForm((f) => ({ ...f, category: cat }));
    setNewCat('');
    setAddingCat(false);
  };

  return (
    <div className="glass-overlay animate-fade-in" role="dialog" aria-modal="true">
      <div className="card w-full max-w-lg mx-4 p-6 animate-scale-in shadow-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-100">
              {isEdit ? '✏️ Edit Product' : '➕ Add New Product'}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {isEdit ? `Editing: ${product.name}` : 'Fill in the product details below'}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-surface hover:bg-surface-hover border border-surface-border text-slate-400 flex items-center justify-center" aria-label="Close">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor="pf-name">Product Name *</label>
            <input id="pf-name" type="text" value={form.name} onChange={set('name')}
              placeholder="e.g. Chocolate Croissant" className="input-field w-full" autoFocus />
          </div>

          {/* SKU / Barcode */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor="pf-sku">Barcode / SKU *</label>
            <input id="pf-sku" type="text" value={form.sku_barcode} onChange={set('sku_barcode')}
              placeholder="e.g. 6004013" className="input-field w-full font-mono" />
            <p className="text-xs text-slate-500 mt-1">Must be unique. Used for barcode scanner lookup.</p>
          </div>

          {/* Price + Cost */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor="pf-price">Sell Price (Rs.) *</label>
              <input id="pf-price" type="number" step="0.01" min="0" value={form.price} onChange={set('price')}
                placeholder="0.00" className="input-field w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor="pf-cost">Cost Price (Rs.) *</label>
              <input id="pf-cost" type="number" step="0.01" min="0" value={form.cost} onChange={set('cost')}
                placeholder="0.00" className="input-field w-full" />
            </div>
          </div>

          {/* Margin preview */}
          {form.price && form.cost && parseFloat(form.price) > 0 && (
            <div className="bg-surface rounded-xl px-4 py-2 flex justify-between text-sm">
              <span className="text-slate-500">Profit Margin</span>
              <span className={`font-semibold ${
                ((parseFloat(form.price) - parseFloat(form.cost)) / parseFloat(form.price) * 100) > 20
                  ? 'text-green-400' : 'text-amber-400'
              }`}>
                {(((parseFloat(form.price) - parseFloat(form.cost)) / parseFloat(form.price)) * 100).toFixed(1)}%
              </span>
            </div>
          )}

          {/* Stock */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor="pf-stock">Initial Stock Quantity</label>
            <input id="pf-stock" type="number" min="0" step="1" value={form.stock_quantity} onChange={set('stock_quantity')}
              placeholder="0" className="input-field w-full" />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor="pf-category">Category *</label>
            {addingCat ? (
              <div className="flex gap-2">
                <input value={newCat} onChange={(e) => setNewCat(e.target.value)}
                  placeholder="New category name…" className="input-field flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())}
                  autoFocus />
                <button type="button" onClick={handleAddCategory} className="btn-primary px-3 py-2 text-sm">Add</button>
                <button type="button" onClick={() => setAddingCat(false)} className="btn-secondary px-3 py-2 text-sm">Cancel</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <select id="pf-category" value={form.category} onChange={set('category')} className="input-field flex-1">
                  <option value="">— Select category —</option>
                  {allCategories.map((c) => (
                    <option key={c} value={c}>{CATEGORY_EMOJI[c] || '📦'} {c}</option>
                  ))}
                </select>
                <button type="button" onClick={() => setAddingCat(true)}
                  className="btn-secondary px-3 py-2 text-sm whitespace-nowrap">+ New</button>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-900/30 border border-red-700/40 rounded-xl px-4 py-2.5 text-sm text-red-400 animate-fade-in">
              ⚠ {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 py-3">Cancel</button>
            <button type="submit" disabled={loading}
              className="btn-primary flex-1 py-3 flex items-center justify-center gap-2">
              {loading
                ? <><span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />Saving…</>
                : isEdit ? '💾 Save Changes' : '➕ Add Product'
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
