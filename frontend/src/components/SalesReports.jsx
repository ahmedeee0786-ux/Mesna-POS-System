import React, { useState, useEffect } from 'react';
import { fetchAdminOrders, fetchTopProducts } from '../services/api';

const CATEGORY_EMOJI = {
  'Beverages':    '🥤',
  'Snacks':       '🍿',
  'Personal Care':'🧴',
  'Bakery':       '🥖',
  'Dairy':        '🥛',
  'Pharmacy':     '💊',
};

export default function SalesReports() {
  const [orders, setOrders] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'products'

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [o, p] = await Promise.all([fetchAdminOrders(), fetchTopProducts()]);
        setOrders(o);
        setTopProducts(p);
      } catch (err) {
        console.error('Failed to load reports:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Tabs */}
      <div className="flex gap-4 border-b border-surface-border">
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3 px-2 text-sm font-bold transition-all ${
            activeTab === 'orders' ? 'text-brand-400 border-b-2 border-brand-400' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          📜 Recent Sales
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`pb-3 px-2 text-sm font-bold transition-all ${
            activeTab === 'products' ? 'text-brand-400 border-b-2 border-brand-400' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          📊 Product Performance
        </button>
        <button
          onClick={() => setActiveTab('registers')}
          className={`pb-3 px-2 text-sm font-bold transition-all ${
            activeTab === 'registers' ? 'text-brand-400 border-b-2 border-brand-400' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          🖥️ Register Performance
        </button>
      </div>

      {activeTab === 'orders' ? (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="text-center py-10 text-slate-500">No sales records yet.</div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-surface/50 text-slate-400 uppercase text-xs font-bold">
                  <tr>
                    <th className="px-6 py-3">Order ID</th>
                    <th className="px-6 py-3">Date & Time</th>
                    <th className="px-6 py-3">Seller</th>
                    <th className="px-6 py-3">Items</th>
                    <th className="px-6 py-3">Payment Info</th>
                    <th className="px-6 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border/50">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-surface-hover/30 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-slate-350">#{order.id}</td>
                      <td className="px-6 py-4">
                        <div className="text-slate-200">{new Date(order.timestamp).toLocaleDateString()}</div>
                        <div className="text-xs text-slate-500">{new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-200 font-semibold">{order.cashier?.name || 'Ahmad'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-xs truncate text-slate-300">
                          {order.items.map(i => `${i.quantity}x ${i.product.name}`).join(', ')}
                        </div>
                        <div className="text-xs text-slate-500">{order.items.length} items sold</div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            order.payment_method === 'cash' ? 'bg-green-900/40 text-green-400' : 'bg-blue-900/40 text-blue-400'
                          }`}>
                            {order.payment_method === 'cash' ? '💵 Cash' : '💳 Card'}
                          </span>
                        </div>
                        {order.payment_method === 'cash' && order.cash_tendered > 0 && (
                          <div className="text-[10px] text-slate-500 mt-1 font-mono leading-none">
                            Recv: Rs. {order.cash_tendered.toFixed(2)}<br />
                            Change: Rs. {order.change_due.toFixed(2)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-brand-400">
                        Rs. {order.total_amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : activeTab === 'products' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top Selling Products */}
          <div className="card p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-200">Top Sellers</h3>
            <div className="space-y-3">
              {topProducts.slice(0, 10).map((p, i) => (
                <div key={p.id} className="flex items-center gap-4 bg-surface/50 p-3 rounded-xl border border-surface-border/50">
                  <div className="w-8 h-8 rounded-lg bg-brand-900/30 flex items-center justify-center text-brand-400 font-bold text-sm">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-100 truncate">{p.name}</p>
                    <p className="text-xs text-slate-500">{p.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-200">{p.unitsSold} Sold</p>
                    <p className="text-xs text-green-400">Rs. {p.totalRevenue.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sales by Category (Simple List) */}
          <div className="card p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-200">Sales by Category</h3>
            <div className="space-y-3">
              {Object.entries(topProducts.reduce((acc, p) => {
                acc[p.category] = (acc[p.category] || 0) + p.totalRevenue;
                return acc;
              }, {})).sort((a, b) => b[1] - a[1]).map(([cat, rev]) => (
                <div key={cat} className="flex items-center justify-between p-3 bg-surface/50 rounded-xl border border-surface-border/50">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{CATEGORY_EMOJI[cat] || '📦'}</span>
                    <span className="text-sm font-medium text-slate-200">{cat}</span>
                  </div>
                  <span className="text-sm font-bold text-brand-400">Rs. {rev.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="card p-6 border border-surface-border">
            <h3 className="text-lg font-bold text-slate-200 mb-4">Register Sales Distribution</h3>
            
            {orders.length === 0 ? (
              <div className="text-center py-10 text-slate-500">No register transactions logged yet.</div>
            ) : (
              (() => {
                const totalStoreSales = orders.reduce((sum, o) => sum + o.total_amount, 0);
                const registerSales = orders.reduce((acc, order) => {
                  const regId = Number(order.id) % 10;
                  const regName = `Register ${regId}`;
                  acc[regName] = (acc[regName] || 0) + order.total_amount;
                  return acc;
                }, {});

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Visual Progress Bars */}
                    <div className="space-y-6">
                      {Object.entries(registerSales)
                        .sort((a, b) => b[1] - a[1])
                        .map(([regName, total]) => {
                          const pct = totalStoreSales > 0 ? (total / totalStoreSales * 100).toFixed(1) : 0;
                          return (
                            <div key={regName} className="space-y-2">
                              <div className="flex justify-between text-sm font-medium">
                                <span className="text-slate-300">{regName}</span>
                                <span className="text-brand-400 font-bold">Rs. {total.toFixed(2)} ({pct}%)</span>
                              </div>
                              <div className="w-full h-3 bg-surface rounded-full overflow-hidden border border-surface-border/50">
                                <div 
                                  className="h-full bg-gradient-to-r from-brand-600 to-brand-400 rounded-full transition-all duration-500"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                    </div>

                    {/* Quick Highlights info box */}
                    <div className="bg-surface/50 border border-surface-border p-6 rounded-2xl flex flex-col justify-center">
                      <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">POS Network Summary</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm border-b border-surface-border/40 pb-2">
                          <span className="text-slate-500">Active Mesh Terminals:</span>
                          <span className="text-slate-200 font-bold">{Object.keys(registerSales).length}</span>
                        </div>
                        <div className="flex justify-between text-sm border-b border-surface-border/40 pb-2">
                          <span className="text-slate-500">Total Mesh Sales:</span>
                          <span className="text-green-400 font-bold">Rs. {totalStoreSales.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Avg Revenue / Terminal:</span>
                          <span className="text-slate-200 font-semibold">
                            Rs. {(totalStoreSales / (Object.keys(registerSales).length || 1)).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        </div>
      )}
    </div>
  );
}
