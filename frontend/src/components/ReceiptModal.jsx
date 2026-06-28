import React from 'react';

export default function ReceiptModal({ order, onClose, storeSettings }) {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  // Calculate subtotal from items
  const subtotal = order.items.reduce((sum, item) => sum + (item.price_at_sale * item.quantity), 0);
  const discountAmount = subtotal * (order.discount_applied / 100);
  const discountedSubtotal = subtotal - discountAmount;
  const taxAmount = discountedSubtotal * 0.085;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md animate-fade-in p-4 md:p-6 print:bg-white print:p-0 print:backdrop-blur-none print:inset-auto print:static print:block print:h-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col md:flex-row overflow-hidden animate-scale-in max-h-[90vh] md:max-h-[85vh] relative print:bg-white print:border-none print:shadow-none print:rounded-none print:max-h-none print:w-full print:flex-col print:overflow-visible print:static">
        
        {/* Close button (Screen only) */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 z-10 text-slate-400 hover:text-slate-200 transition-colors text-xl w-8.5 h-8.5 flex items-center justify-center rounded-full bg-slate-800/80 border border-slate-700 hover:bg-slate-750 print:hidden"
          aria-label="Close receipt"
        >
          ✕
        </button>

        {/* LEFT COLUMN: Thermal Paper Preview */}
        <div className="w-full md:w-1/2 p-6 md:p-8 bg-slate-950/60 flex justify-center items-start overflow-y-auto max-h-[50vh] md:max-h-none print:bg-white print:p-0 print:overflow-visible print:max-h-none print:w-full print:block">
          
          {/* Simulated Receipt Paper Card */}
          <div className="bg-[#fdfdfb] text-slate-800 shadow-xl border border-slate-200/50 w-full max-w-sm px-6 py-8 relative flex flex-col font-mono text-xs select-text rounded-sm print:shadow-none print:border-none print:p-0 print:w-full print:max-w-none print:m-0 print:static">
            
            {/* Top Jagged Edge Effect (Screen only) */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-repeat-x print:hidden" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 12' fill='%23020617'%3E%3Cpath d='M0 0 L12 12 L24 0 Z'/%3E%3C/svg%3E")`,
              backgroundSize: '12px 6px',
            }} />

            {/* Bottom Jagged Edge Effect (Screen only) */}
            <div className="absolute bottom-0 left-0 right-0 h-2 bg-repeat-x print:hidden" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 12' fill='%23020617'%3E%3Cpath d='M0 12 L12 0 L24 12 Z'/%3E%3C/svg%3E")`,
              backgroundSize: '12px 6px',
            }} />

            {/* Store Header */}
            <div className="text-center space-y-1 border-b border-dashed border-slate-300 pb-5">
              <h2 className="text-xl font-bold tracking-tight text-slate-950 uppercase">
                {storeSettings?.storeName || 'MESNA STORE'}
              </h2>
              {storeSettings?.tagline && (
                <p className="text-slate-500 text-[10px] font-semibold tracking-wider uppercase">{storeSettings.tagline}</p>
              )}
              <p className="text-slate-550 text-[10px]">{storeSettings?.address || 'Lahore, Pakistan'}</p>
              <p className="text-slate-400 text-[9px] pt-0.5">Tel: {storeSettings?.phone || '+92 300 1234567'}</p>
            </div>

            {/* Receipt Metadata */}
            <div className="flex justify-between text-slate-650 text-[10px] border-b border-dashed border-slate-300 py-3.5">
              <div>
                <p>Receipt: <span className="font-bold text-slate-950">#{order.id.toString().padStart(5, '0')}</span></p>
                <p>Cashier: <span className="font-bold text-slate-950">{order.cashier?.name || 'Ahmad'}</span></p>
              </div>
              <div className="text-right">
                <p>{new Date(order.timestamp || Date.now()).toLocaleDateString()}</p>
                <p>{new Date(order.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>

            {/* Purchased Items Table */}
            <div className="py-3 border-b border-dashed border-slate-300">
              <table className="w-full text-left border-collapse text-[10px]">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="pb-1.5 font-bold">Item</th>
                    <th className="pb-1.5 font-bold text-center w-12">Qty</th>
                    <th className="pb-1.5 font-bold text-right w-20">Price</th>
                    <th className="pb-1.5 font-bold text-right w-20">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.items.map((item, i) => (
                    <tr key={i} className="text-slate-850 align-top">
                      <td className="py-2 pr-1 font-medium">{item.product?.name || 'Item'}</td>
                      <td className="py-2 px-1 text-center text-slate-650">{item.quantity}</td>
                      <td className="py-2 px-1 text-right text-slate-650">Rs. {item.price_at_sale.toFixed(2)}</td>
                      <td className="py-2 pl-1 text-right font-bold text-slate-955">Rs. {(item.quantity * item.price_at_sale).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Breakdown */}
            <div className="space-y-1.5 pt-3 text-slate-650 text-[10px]">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>Rs. {subtotal.toFixed(2)}</span>
              </div>
              {order.discount_applied > 0 && (
                <div className="flex justify-between text-green-700 font-semibold">
                  <span>Discount ({order.discount_applied}%)</span>
                  <span>−Rs. {discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Tax (8.5%)</span>
                <span>Rs. {taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-extrabold text-slate-950 pt-2.5 border-t border-slate-200">
                <span>TOTAL DUE</span>
                <span>Rs. {order.total_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[10px] font-medium text-slate-700 pt-1 border-t border-slate-100/50 mt-1">
                <span>Payment Method</span>
                <span className="uppercase font-bold">{order.payment_method === 'cash' ? '💵 Cash' : '💳 Card'}</span>
              </div>
              
              {/* Optional Local Cash Tendered / Change Info */}
              {order.cashTendered !== null && order.cashTendered !== undefined && (
                <>
                  <div className="flex justify-between text-[10px] text-slate-650">
                    <span>Cash Tendered</span>
                    <span>Rs. {order.cashTendered.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-green-700">
                    <span>Change Due</span>
                    <span>Rs. {order.changeDue.toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Footer Message */}
            <div className="text-center space-y-1 pt-6 border-t border-dashed border-slate-300 mt-4">
              <p className="font-extrabold text-slate-900 tracking-wider text-[10px]">THANK YOU FOR YOUR VISIT!</p>
              <p className="text-slate-400 text-[9px]">No cash refund without receipt</p>
              
              {/* Credits & Support */}
              <div className="pt-2 border-t border-dotted border-slate-250 mt-2 text-[8px] text-slate-500 space-y-0.5">
                <p className="font-bold text-slate-705 uppercase tracking-wide">MESNA POS SYSTEM</p>
                <p>Developed by Ahmed.I</p>
                <p>Contact: +92 3462685489</p>
              </div>

              {/* Fake barcode simulation */}
              <div className="font-mono tracking-widest text-[16px] pt-2.5 select-none text-slate-700">
                ||| | |||| | || | ||||
              </div>
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: Actions and Information (Screen only) */}
        <div className="w-full md:w-1/2 p-6 md:p-8 bg-slate-900 flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-800/80 print:hidden">
          
          <div className="space-y-6">
            
            {/* Animated Confirmation Status */}
            <div className="flex flex-col items-center text-center mt-2">
              <div className="w-16 h-16 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full flex items-center justify-center mb-4 text-3xl shadow-inner animate-bounce">
                ✓
              </div>
              <h3 className="text-xl font-bold text-slate-100 mb-1">Order Confirmed!</h3>
              <p className="text-xs text-slate-500">Order has been saved and is ready for print.</p>
            </div>

            {/* Transaction Quick Details Summary */}
            <div className="bg-slate-950/40 rounded-2xl p-5 border border-surface-border space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Order Summary</h4>
              <div className="flex justify-between text-sm text-slate-300">
                <span>Total Amount</span>
                <span className="text-slate-100 font-bold">Rs. {order.total_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-300">
                <span>Payment Method</span>
                <span className="text-slate-100 font-semibold uppercase">{order.payment_method === 'cash' ? '💵 Cash' : '💳 Card'}</span>
              </div>
              
              {order.cashTendered !== null && order.cashTendered !== undefined && (
                <>
                  <div className="flex justify-between text-sm text-slate-300 border-t border-slate-850 pt-2">
                    <span>Cash Tendered</span>
                    <span className="text-slate-100 font-semibold">Rs. {order.cashTendered.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-green-400 font-semibold">Change Due</span>
                    <span className="text-green-400 font-extrabold">Rs. {order.changeDue.toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Mock Digital Receipt send option */}
            <div className="bg-slate-950/20 rounded-2xl p-4 border border-surface-border/40 space-y-2.5">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Send Digital Receipt</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter customer email or phone"
                  className="input-field text-xs py-2.5 flex-1 w-full bg-slate-950"
                />
                <button 
                  type="button"
                  onClick={() => alert("Digital receipt features are in mock mode. Receipt simulated sent successfully!")}
                  className="px-4 py-2.5 bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 border border-brand-500/20 rounded-xl text-xs font-bold transition-all whitespace-nowrap"
                >
                  Send
                </button>
              </div>
            </div>

          </div>

          {/* Action buttons */}
          <div className="mt-8 pt-4 border-t border-slate-800 flex flex-col gap-3">
            <button
              type="button"
              onClick={handlePrint}
              className="w-full py-4 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-bold rounded-2xl shadow-lg shadow-brand-600/30 transition-all text-base flex items-center justify-center gap-2 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-brand-400"
            >
              <span>🖨️ Print Receipt</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-750 font-bold rounded-2xl transition-all text-sm active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-brand-400"
            >
              Start New Sale
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
