import React, { useState, useEffect, useCallback } from 'react';
import ProductFormModal from './ProductFormModal';
import RestockModal from './RestockModal';
import SalesReports from './SalesReports';
import {
  fetchProducts, fetchCategories, fetchStats,
  adminCreateProduct, adminUpdateProduct,
  adminDeleteProduct, adminRestockProduct,
  updateStoreSettings,
} from '../services/api';

const CATEGORY_EMOJI = {
  'Beverages':    '🥤',
  'Snacks':       '🍿',
  'Personal Care':'🧴',
  'Bakery':       '🥖',
  'Dairy':        '🥛',
  'Pharmacy':     '💊',
};

export default function AdminPanel({ onClose, storeSettings, onRefreshSettings }) {
  const [activePanel, setActivePanel] = useState('inventory'); // 'inventory' | 'reports' | 'settings'
  const [products,   setProducts]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats,      setStats]      = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [filterCat,  setFilterCat]  = useState('All');
  const [sortBy,     setSortBy]     = useState('name'); // name | price | stock | category
  const [sortDir,    setSortDir]    = useState('asc');

  // Store Settings Form State
  const [formSettings, setFormSettings] = useState({
    storeName: storeSettings?.storeName || 'MESNA STORE',
    tagline: storeSettings?.tagline || 'Retail & POS System',
    address: storeSettings?.address || 'Lahore, Pakistan',
    phone: storeSettings?.phone || '+92 300 1234567',
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsPin, setSettingsPin] = useState(''); // Admin PIN for settings save

  useEffect(() => {
    if (storeSettings) {
      setFormSettings({
        storeName: storeSettings.storeName || '',
        tagline: storeSettings.tagline || '',
        address: storeSettings.address || '',
        phone: storeSettings.phone || '',
      });
    }
  }, [storeSettings]);

  // Modals
  const [showForm,    setShowForm]    = useState(false);
  const [editProduct, setEditProduct] = useState(null);  // null = add mode
  const [showRestock, setShowRestock] = useState(null);  // product to restock
  const [deleteTarget, setDeleteTarget] = useState(null); // confirm delete

  const [toast, setToast] = useState(null);

  const showToast = useCallback((type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [prods, cats, s] = await Promise.all([
        fetchProducts(), fetchCategories(), fetchStats(),
      ]);
      setProducts(prods);
      setCategories(cats);
      setStats(s);
    } catch {
      showToast('error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  // ── Handlers ───────────────────────────────────────────
  const handleSave = async (formData) => {
    if (editProduct) {
      await adminUpdateProduct(editProduct.id, formData);
      showToast('success', `✅ "${formData.name}" updated`);
    } else {
      await adminCreateProduct(formData);
      showToast('success', `✅ "${formData.name}" added`);
    }
    setShowForm(false);
    setEditProduct(null);
    load();
  };

  const handleRestock = async (id, qty) => {
    await adminRestockProduct(id, qty);
    showToast('success', `📦 Stock updated (+${qty})`);
    setShowRestock(null);
    load();
  };

  const handleDelete = async (product) => {
    try {
      await adminDeleteProduct(product.id);
      showToast('success', `🗑 "${product.name}" deleted`);
    } catch (err) {
      showToast('error', err?.response?.data?.error || 'Delete failed');
    }
    setDeleteTarget(null);
    load();
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!settingsPin || settingsPin.length < 4) {
      showToast('error', 'Enter your Admin PIN to save settings');
      return;
    }
    setSavingSettings(true);
    try {
      await updateStoreSettings({ ...formSettings, adminPin: settingsPin });
      showToast('success', '✅ Store settings updated successfully!');
      setSettingsPin(''); // Clear PIN after success
      if (onRefreshSettings) onRefreshSettings();
    } catch (err) {
      const msg = err?.response?.data?.error || 'Failed to update store settings';
      showToast('error', msg);
      setSettingsPin('');
    } finally {
      setSavingSettings(false);
    }
  };

  // ── Filtering & sorting ────────────────────────────────
  const filtered = products
    .filter((p) => {
      const q = search.toLowerCase();
      const matchSearch = !q || p.name.toLowerCase().includes(q) || p.sku_barcode.includes(q);
      const matchCat = filterCat === 'All' || p.category === filterCat;
      return matchSearch && matchCat;
    })
    .sort((a, b) => {
      let va = a[sortBy], vb = b[sortBy];
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ?  1 : -1;
      return 0;
    });

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  };

  const SortIcon = ({ col }) => sortBy !== col ? (
    <span className="text-slate-600 ml-1">↕</span>
  ) : sortDir === 'asc' ? (
    <span className="text-brand-400 ml-1">↑</span>
  ) : (
    <span className="text-brand-400 ml-1">↓</span>
  );

  const margin = (p) => p.price > 0 ? ((p.price - p.cost) / p.price * 100).toFixed(0) : 0;

  return (
    <div className="fixed inset-0 bg-surface z-40 flex flex-col overflow-hidden animate-fade-in">

      {/* ── Admin Header ── */}
      <div className="shrink-0 bg-surface-card border-b border-surface-border px-6 py-4 flex items-center gap-4">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-lg shadow-lg">
          ⚙️
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-100">Admin Panel</h1>
          <p className="text-xs text-slate-500">Product & Inventory Management</p>
        </div>

        {/* Stats pills */}
        {stats && (
          <div className="flex gap-3 ml-4">
            <div className="bg-surface border border-surface-border rounded-xl px-3 py-1.5 text-center">
              <p className="text-xs text-slate-500 leading-none">Orders</p>
              <p className="text-base font-bold text-slate-100 leading-tight">{stats.totalOrders}</p>
            </div>
            <div className="bg-surface border border-surface-border rounded-xl px-3 py-1.5 text-center">
              <p className="text-xs text-slate-500 leading-none">Revenue</p>
              <p className="text-base font-bold text-green-400 leading-tight">Rs. {stats.totalRevenue.toFixed(2)}</p>
            </div>
          </div>
        )}

        <div className="flex-1" />

        {/* Navigation */}
        <div className="flex bg-surface border border-surface-border p-1 rounded-xl gap-1">
          <button
            onClick={() => setActivePanel('inventory')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activePanel === 'inventory' ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            📦 Inventory
          </button>
          <button
            onClick={() => setActivePanel('reports')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activePanel === 'reports' ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            📊 Reports
          </button>
          <button
            onClick={() => setActivePanel('settings')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activePanel === 'settings' ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            🏪 Store Settings
          </button>
        </div>

        <div className="flex-1" />

        {/* Add product button */}
        {activePanel === 'inventory' && (
          <button
            id="admin-add-product-btn"
            onClick={() => { setEditProduct(null); setShowForm(true); }}
            className="btn-primary flex items-center gap-2 px-5 py-2.5"
          >
            ➕ Add Product
          </button>
        )}

        {/* Back to POS */}
        <button id="admin-close-btn" onClick={onClose} className="btn-secondary flex items-center gap-2 px-4 py-2.5">
          ← Back to POS
        </button>
      </div>

      {activePanel === 'inventory' ? (
        <>
          {/* ── Filters bar ── */}
          <div className="shrink-0 px-6 py-3 border-b border-surface-border flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-52">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔍</span>
              <input
                id="admin-search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or barcode…"
                className="input-field w-full pl-9 text-sm"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-sm">✕</button>
              )}
            </div>

            {/* Category filter */}
            <div className="flex gap-2 flex-wrap">
              {['All', ...categories].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilterCat(cat)}
                  className={`category-tab ${filterCat === cat ? 'category-tab-active' : 'category-tab-inactive'}`}
                >
                  {cat !== 'All' && (CATEGORY_EMOJI[cat] || '📦')} {cat}
                </button>
              ))}
            </div>

            <div className="ml-auto text-xs text-slate-500">{filtered.length} of {products.length} products</div>
          </div>

          {/* ── Products Table ── */}
          <div className="flex-1 overflow-auto px-6 py-4">
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-slate-500">
                <span className="text-4xl mb-3">📭</span>
                <p className="text-sm">No products found</p>
              </div>
            ) : (
              <div className="card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-border bg-surface/50">
                      {[
                        { label: 'Product',  col: 'name'           },
                        { label: 'SKU',      col: 'sku_barcode'    },
                        { label: 'Category', col: 'category'       },
                        { label: 'Price',    col: 'price'          },
                        { label: 'Cost',     col: 'cost'           },
                        { label: 'Margin',   col: null             },
                        { label: 'Stock',    col: 'stock_quantity' },
                      ].map(({ label, col }) => (
                        <th key={label}
                          onClick={() => col && toggleSort(col)}
                          className={`text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider select-none ${col ? 'cursor-pointer hover:text-slate-200' : ''}`}
                        >
                          {label}{col && <SortIcon col={col} />}
                        </th>
                      ))}
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((product, i) => {
                      const isLow = product.stock_quantity <= 5;
                      const isOut = product.stock_quantity === 0;
                      const m = margin(product);
                      return (
                        <tr key={product.id}
                          className={`border-b border-surface-border/60 transition-colors hover:bg-surface-hover/50 ${i % 2 === 0 ? '' : 'bg-surface/20'}`}
                        >
                          {/* Name */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{CATEGORY_EMOJI[product.category] || '📦'}</span>
                              <span className="font-medium text-slate-100">{product.name}</span>
                            </div>
                          </td>

                          {/* SKU */}
                          <td className="px-4 py-3 font-mono text-slate-400 text-xs">{product.sku_barcode}</td>

                          {/* Category */}
                          <td className="px-4 py-3">
                            <span className="bg-surface border border-surface-border text-slate-400 text-xs px-2 py-1 rounded-lg">
                              {product.category}
                            </span>
                          </td>

                          {/* Price */}
                          <td className="px-4 py-3 font-semibold text-brand-400">Rs. {product.price.toFixed(2)}</td>

                          {/* Cost */}
                          <td className="px-4 py-3 text-slate-400">Rs. {product.cost.toFixed(2)}</td>

                          {/* Margin */}
                          <td className="px-4 py-3">
                            <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${
                              m >= 30 ? 'bg-green-900/40 text-green-400' :
                              m >= 15 ? 'bg-amber-900/40 text-amber-400' :
                                        'bg-red-900/40 text-red-400'
                            }`}>{m}%</span>
                          </td>

                          {/* Stock */}
                          <td className="px-4 py-3">
                            <span className={`font-bold ${isOut ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-slate-100'}`}>
                              {isOut ? '⚠ 0' : isLow ? `⚡ ${product.stock_quantity}` : product.stock_quantity}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              {/* Restock */}
                              <button
                                id={`restock-btn-${product.id}`}
                                onClick={() => setShowRestock(product)}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-brand-900/40 hover:bg-brand-600/40 border border-brand-700/40 text-brand-300 transition-all"
                                title="Restock"
                              >
                                📦
                              </button>
                              {/* Edit */}
                              <button
                                id={`edit-btn-${product.id}`}
                                onClick={() => { setEditProduct(product); setShowForm(true); }}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600/40 text-slate-300 transition-all"
                                title="Edit"
                              >
                                ✏️
                              </button>
                              {/* Delete */}
                              <button
                                id={`delete-btn-${product.id}`}
                                onClick={() => setDeleteTarget(product)}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-red-900/30 hover:bg-red-600/40 border border-red-800/40 text-red-400 transition-all"
                                title="Delete"
                              >
                                🗑
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : activePanel === 'reports' ? (
        <div className="flex-1 overflow-auto px-6 py-6">
          <SalesReports />
        </div>
      ) : (
        <div className="flex-1 overflow-auto px-6 py-8 flex justify-center">
          <div className="card max-w-xl w-full p-8 border border-surface-border bg-surface-card shadow-2xl animate-scale-in">
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-surface-border">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-2xl shadow-lg shadow-brand-900/50">
                🏪
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-100">Store Identity & Receipt Details</h2>
                <p className="text-xs text-slate-400 mt-1">Customize the shop name, tagline, address, and contact info displayed on POS headers and printed customer receipts.</p>
              </div>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Store / Shop Name *</label>
                <input
                  type="text"
                  required
                  value={formSettings.storeName}
                  onChange={(e) => setFormSettings({ ...formSettings, storeName: e.target.value })}
                  placeholder="e.g. M. Sultan Wedding Invitation"
                  className="input-field w-full text-base py-3 px-4"
                />
                <p className="text-[11px] text-slate-500 mt-1">The primary unique business name shown at the top of the receipt.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Tagline / Subtitle</label>
                <input
                  type="text"
                  value={formSettings.tagline}
                  onChange={(e) => setFormSettings({ ...formSettings, tagline: e.target.value })}
                  placeholder="e.g. Retail & POS System"
                  className="input-field w-full text-base py-3 px-4"
                />
                <p className="text-[11px] text-slate-500 mt-1">Secondary descriptive line or business type (optional).</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Location / Address *</label>
                <input
                  type="text"
                  required
                  value={formSettings.address}
                  onChange={(e) => setFormSettings({ ...formSettings, address: e.target.value })}
                  placeholder="e.g. Lahore, Pakistan"
                  className="input-field w-full text-base py-3 px-4"
                />
                <p className="text-[11px] text-slate-500 mt-1">Physical shop address or branch location printed on receipts.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Contact Number *</label>
                <input
                  type="text"
                  required
                  value={formSettings.phone}
                  onChange={(e) => setFormSettings({ ...formSettings, phone: e.target.value })}
                  placeholder="e.g. +92 300 1234567"
                  className="input-field w-full text-base py-3 px-4"
                />
                <p className="text-[11px] text-slate-500 mt-1">Customer support or store telephone number.</p>
              </div>

              {/* Admin PIN required to save settings */}
              <div className="bg-amber-900/20 border border-amber-700/40 rounded-2xl p-4">
                <label className="block text-xs font-semibold text-amber-300 uppercase tracking-wider mb-2">🔒 Admin PIN (required to save)</label>
                <input
                  type="password"
                  maxLength={8}
                  required
                  value={settingsPin}
                  onChange={(e) => setSettingsPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter Admin PIN to confirm changes"
                  className="input-field w-full text-base py-3 px-4 font-mono tracking-widest"
                />
                <p className="text-[11px] text-amber-500/80 mt-1">Your Admin PIN is needed to protect store settings from unauthorized changes.</p>
              </div>

              <div className="pt-4 border-t border-surface-border flex justify-end gap-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-secondary px-6 py-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="btn-primary px-8 py-3 flex items-center gap-2 shadow-lg shadow-brand-600/30 font-bold"
                >
                  {savingSettings ? (
                    <>
                      <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <span>💾 Save Settings</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      {showForm && (
        <ProductFormModal
          product={editProduct}
          categories={categories}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditProduct(null); }}
        />
      )}

      {showRestock && (
        <RestockModal
          product={showRestock}
          onRestock={handleRestock}
          onClose={() => setShowRestock(null)}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="glass-overlay animate-fade-in">
          <div className="card w-full max-w-sm mx-4 p-6 animate-scale-in shadow-2xl">
            <div className="text-center mb-5">
              <div className="text-4xl mb-3">🗑</div>
              <h3 className="text-lg font-bold text-slate-100">Delete Product?</h3>
              <p className="text-sm text-slate-400 mt-1">
                "<span className="text-slate-200">{deleteTarget.name}</span>" will be permanently removed.
              </p>
              <p className="text-xs text-slate-500 mt-2">
                ⚠ Products with sales history cannot be deleted.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="btn-secondary flex-1 py-3">Cancel</button>
              <button
                id="confirm-delete-btn"
                onClick={() => handleDelete(deleteTarget)}
                className="flex-1 py-3 bg-red-700 hover:bg-red-600 text-white font-semibold rounded-xl transition-all"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-2xl text-sm font-medium animate-slide-up border max-w-sm ${
          toast.type === 'success'
            ? 'bg-green-900/90 border-green-700/50 text-green-200'
            : 'bg-red-900/90 border-red-700/50 text-red-200'
        }`} role="alert">
          {toast.msg}
        </div>
      )}
    </div>
  );
}
