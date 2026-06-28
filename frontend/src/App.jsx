import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import Cart from './components/Cart';
import ProductGrid from './components/ProductGrid';
import CheckoutModal from './components/CheckoutModal';
import AdminPanel from './components/AdminPanel';
import AdminAuthModal from './components/AdminAuthModal';
import ReceiptModal from './components/ReceiptModal';
import VoiceAssistant from './components/VoiceAssistant';
import CashierEditModal from './components/CashierEditModal';
import { useCart } from './hooks/useCart';
import { useBarcodeScanner } from './hooks/useBarcodeScanner';
import { fetchProducts, processCheckout, fetchStoreSettings, fetchActiveCashier } from './services/api';

export default function App() {
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [storeSettings, setStoreSettings] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [showAdminAuth, setShowAdminAuth] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', message }
  const [cashierId, setCashierId] = useState(1);
  const [cashierName, setCashierName] = useState('Ahmad');
  const [showCashierEdit, setShowCashierEdit] = useState(false);

  // Dynamic customization themes & dark/light mode states
  const [theme, setTheme] = useState(() => localStorage.getItem('pos-theme') || 'indigo');
  const [mode, setMode] = useState(() => localStorage.getItem('pos-mode') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('pos-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-mode', mode);
    localStorage.setItem('pos-mode', mode);
  }, [mode]);

  const cart = useCart();

  // 1. Toast helper
  const showToast = useCallback((type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // 2. Reload products from server (stock refresh after checkout)
  const refreshProducts = useCallback(async () => {
    try {
      const updated = await fetchProducts();
      setProducts(updated);
    } catch {
      // Silent fail — stale data is fine
    }
  }, []);

  // 3. Reload store settings
  const refreshSettings = useCallback(async () => {
    try {
      const updated = await fetchStoreSettings();
      setStoreSettings(updated);
    } catch {
      // Silent fail
    }
  }, []);

  // 4. Load products, store settings, and cashier details on mount
  useEffect(() => {
    setProductsLoading(true);
    Promise.all([fetchProducts(), fetchStoreSettings(), fetchActiveCashier()])
      .then(([prods, settings, cashier]) => {
        setProducts(prods);
        setStoreSettings(settings);
        if (cashier) {
          if (cashier.id) setCashierId(cashier.id);
          if (cashier.name) setCashierName(cashier.name);
        }
      })
      .catch(() => showToast('error', 'Failed to load data. Is the backend running?'))
      .finally(() => setProductsLoading(false));
  }, [showToast]);

  // 5. Listen for P2P Mesh Sync notifications from backend
  useEffect(() => {
    // Use the same port the page was served from, falling back to 3001 for dev
    const wsPort = window.location.port || '3001';
    const wsUrl = `ws://${window.location.hostname}:${wsPort}/frontend-ws`;
    let socket = null;
    let reconnectTimeout = null;

    function connect() {
      socket = new WebSocket(wsUrl);
      
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'sync-complete') {
            console.log('[P2P Sync] Inventory update received from peer, refreshing...');
            refreshProducts();
          }
        } catch (err) {}
      };

      socket.onclose = () => {
        reconnectTimeout = setTimeout(connect, 5000);
      };

      socket.onerror = () => {
        socket.close();
      };
    }

    connect();

    return () => {
      if (socket) socket.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [refreshProducts]);

  // 6. Voice Command Handler
  const handleVoiceCommand = useCallback((command) => {
    switch (command.action) {
      case 'add':
        cart.addToCart(command.product);
        showToast('success', `🎙️ Added: "${command.product.name}"`);
        break;
      
      case 'remove':
        const cartItem = cart.cartItems.find(i => i.product.id === command.product.id);
        if (cartItem) {
          cart.removeFromCart(command.product.id);
          showToast('success', `🎙️ Removed: "${command.product.name}"`);
        } else {
          showToast('error', `🎙️ "${command.product.name}" is not in the cart`);
        }
        break;

      case 'discount':
        cart.setDiscount(command.value);
        showToast('success', `🎙️ Applied discount: ${command.value}%`);
        break;

      case 'clear':
        cart.clearCart();
        showToast('success', '🎙️ Cleared cart');
        break;

      case 'checkout':
        if (cart.cartItems.length === 0) {
          showToast('error', '🎙️ Cannot checkout: Cart is empty');
        } else {
          setShowCheckout(true);
          showToast('success', `🎙️ Proceeding to checkout via ${command.method.toUpperCase()}`);
        }
        break;

      default:
        showToast('error', `🎙️ Action unknown.`);
    }
  }, [cart, showToast]);

  // 7. Barcode scanner: look up by sku_barcode and add to cart
  const handleBarcodeScan = useCallback((barcode) => {
    const product = products.find((p) => p.sku_barcode === barcode);
    if (product) {
      cart.addToCart(product);
      showToast('success', `📦 ${product.name} added via scanner`);
    } else {
      showToast('error', `⚠ Barcode "${barcode}" not found`);
    }
  }, [products, cart, showToast]);

  // Disable scanner when any modal is open
  useBarcodeScanner(handleBarcodeScan, !showCheckout && !showAdmin && !showAdminAuth && !lastOrder);

  // 8. Checkout handler
  const handleCheckout = useCallback(async (paymentMethod, cashTendered) => {
    setCheckoutLoading(true);
    try {
      const payload = {
        cashier_id: cashierId,
        payment_method: paymentMethod,
        discount_applied: cart.discount,
        items: cart.cartItems.map((i) => ({
          product_id:    i.product.id,
          quantity:      i.quantity,
          price_at_sale: i.product.price,
        })),
        cash_tendered: cashTendered != null ? parseFloat(cashTendered) : 0,
        change_due: cashTendered ? parseFloat(Math.max(0, cashTendered - cart.total).toFixed(2)) : 0,
      };
      const { order } = await processCheckout(payload);
      const orderWithCash = {
        ...order,
        cashTendered: order.cash_tendered !== null ? order.cash_tendered : (cashTendered || null),
        changeDue: order.change_due !== null ? order.change_due : (cashTendered ? Math.max(0, cashTendered - order.total_amount) : null)
      };
      setShowCheckout(false);
      setLastOrder(orderWithCash);
      cart.clearCart();
      await refreshProducts(); // Update stock counts
      showToast('success', '✅ Sale completed successfully!');
    } catch (err) {
      const msg = err?.response?.data?.error || 'Checkout failed. Please try again.';
      showToast('error', `❌ ${msg}`);
    } finally {
      setCheckoutLoading(false);
    }
  }, [cart, refreshProducts, showToast]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <Header 
        cashierName={cashierName} 
        itemCount={cart.itemCount} 
        onAdminOpen={() => setShowAdminAuth(true)} 
        storeSettings={storeSettings}
        onEditCashier={() => setShowCashierEdit(true)}
        theme={theme}
        setTheme={setTheme}
        mode={mode}
        setMode={setMode}
      />

      {/* Main layout: Cart (left) + Product Grid (right) */}
      <main className="flex flex-1 overflow-hidden">
        {/* LEFT: Cart panel */}
        <aside className="w-80 xl:w-96 shrink-0 border-r border-surface-border bg-surface-card p-4 overflow-hidden flex flex-col">
          <Cart
            cart={cart}
            onCheckout={() => setShowCheckout(true)}
            loading={checkoutLoading}
          />
        </aside>

        {/* RIGHT: Product catalog */}
        <section className="flex-1 overflow-hidden p-4 flex flex-col">
          <ProductGrid
            products={products}
            onAddToCart={cart.addToCart}
            loading={productsLoading}
          />
        </section>
      </main>

      {/* Footer / Credits */}
      <footer className="shrink-0 bg-surface-card border-t border-surface-border py-2.5 px-6 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 select-none">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-400 tracking-wide">MESNA POS SYSTEM</span>
          <span className="text-[10px] bg-brand-900/40 border border-brand-800/40 text-brand-400 px-2 py-0.5 rounded-full font-semibold">v1.1.0</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4">
          <span>Developed by: <span className="text-slate-300 font-semibold">Ahmed.I</span></span>
          <span className="hidden md:inline text-slate-700">|</span>
          <span>Contact: <a href="tel:+923462685489" className="text-slate-300 font-semibold hover:text-brand-400 transition-colors">+92 346 2685489</a></span>
        </div>
      </footer>

      {/* Checkout modal */}
      {showCheckout && (
        <CheckoutModal
          cart={cart}
          total={cart.total}
          subtotal={cart.subtotal}
          discountAmount={cart.discountAmount}
          taxAmount={cart.taxAmount}
          discount={cart.discount}
          onConfirm={handleCheckout}
          onClose={() => setShowCheckout(false)}
          loading={checkoutLoading}
        />
      )}

      {/* Receipt modal */}
      {lastOrder && (
        <ReceiptModal
          order={lastOrder}
          onClose={() => setLastOrder(null)}
          storeSettings={storeSettings}
        />
      )}

      {/* Admin panel */}
      {showAdminAuth && (
        <AdminAuthModal
          onSuccess={() => {
            setShowAdminAuth(false);
            setShowAdmin(true);
          }}
          onClose={() => setShowAdminAuth(false)}
        />
      )}

      {showAdmin && (
        <AdminPanel 
          storeSettings={storeSettings}
          onRefreshSettings={refreshSettings}
          onClose={() => {
            setShowAdmin(false);
            refreshProducts(); // Refresh in case products were edited
          }} 
        />
      )}

      {/* Voice Assistant Floating Interface */}
      <VoiceAssistant onCommand={handleVoiceCommand} showToast={showToast} />

      {/* Cashier Edit Modal */}
      {showCashierEdit && (
        <CashierEditModal
          isOpen={showCashierEdit}
          onClose={() => setShowCashierEdit(false)}
          currentCashierName={cashierName}
          cashierId={cashierId}
          onUpdateSuccess={(newName) => setCashierName(newName)}
          showToast={showToast}
        />
      )}

      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-2xl text-sm font-medium 
                     animate-slide-up border max-w-sm ${
                       toast.type === 'success'
                         ? 'bg-green-900/90 border-green-700/50 text-green-200'
                         : 'bg-red-900/90 border-red-700/50 text-red-200'
                     }`}
          role="alert"
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
