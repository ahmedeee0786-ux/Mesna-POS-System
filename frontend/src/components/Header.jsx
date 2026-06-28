import React, { useState, useEffect } from 'react';

export default function Header({ 
  cashierName = 'Ahmad', 
  itemCount = 0, 
  onAdminOpen, 
  storeSettings, 
  onEditCashier,
  theme,
  setTheme,
  mode,
  setMode
}) {
  const [time, setTime] = useState(new Date());
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!showThemeMenu) return;
    const handleClose = () => setShowThemeMenu(false);
    window.addEventListener('click', handleClose);
    return () => window.removeEventListener('click', handleClose);
  }, [showThemeMenu]);

  const handleToggleThemeMenu = (e) => {
    e.stopPropagation();
    setShowThemeMenu(!showThemeMenu);
  };

  const dateStr = time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const timeStr = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <header className="shrink-0 bg-surface-card border-b border-surface-border px-6 py-3 flex items-center gap-6">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-lg shadow-lg shadow-brand-900/50">
          🏪
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-100 leading-tight">
            {storeSettings?.storeName || 'Mesna POS'}
          </h1>
          <p className="text-xs text-slate-500 leading-tight">
            {storeSettings?.tagline || 'Point of Sale'}
          </p>
        </div>
      </div>


      {/* Divider */}
      <div className="h-8 w-px bg-surface-border" />

      {/* Cashier */}
      <button 
        onClick={onEditCashier}
        className="flex items-center gap-2 hover:bg-surface border border-transparent hover:border-surface-border rounded-xl px-2 py-1 transition-all text-left"
        title="Edit Cashier Name"
      >
        <div className="w-7 h-7 rounded-full bg-brand-700 flex items-center justify-center text-xs font-bold text-brand-200 shrink-0">
          {cashierName.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-xs text-slate-500 leading-none flex items-center gap-1">
            <span>Cashier</span>
            <span className="text-[10px]">✏️</span>
          </p>
          <p className="text-sm font-semibold text-slate-200 leading-none mt-0.5">{cashierName}</p>
        </div>
      </button>

      {/* Admin Button */}
      <button
        id="admin-open-btn"
        onClick={onAdminOpen}
        className="btn-secondary px-3 py-1.5 text-xs flex items-center gap-2"
        title="Admin Settings"
      >
        <span>⚙️</span>
        <span className="hidden sm:inline">Admin</span>
      </button>

      {/* Theme Switcher */}
      <div className="relative">
        <button
          onClick={handleToggleThemeMenu}
          className="btn-secondary px-3 py-1.5 text-xs flex items-center gap-2"
          title="Customize Theme"
        >
          <span>🎨</span>
          <span className="hidden sm:inline">Theme</span>
        </button>

        {showThemeMenu && (
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="absolute left-0 sm:left-auto sm:right-0 mt-2.5 w-56 rounded-2xl bg-surface-card border border-surface-border shadow-2xl p-4 z-50 animate-scale-in"
          >
            {/* Mode selection: Light vs Dark */}
            <div className="flex justify-between items-center mb-4 pb-2.5 border-b border-surface-border">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Interface Mode</span>
              <div className="flex bg-surface border border-surface-border p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setMode('light')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    mode === 'light' 
                      ? 'bg-brand-600 text-white shadow-md' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  ☀️ Light
                </button>
                <button
                  type="button"
                  onClick={() => setMode('dark')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    mode === 'dark' 
                      ? 'bg-brand-600 text-white shadow-md' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  🌙 Dark
                </button>
              </div>
            </div>

            {/* Colors selection */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wide block mb-2">Color Presets</span>
              {[
                { id: 'indigo', name: 'Indigo Slate', color: 'bg-indigo-500' },
                { id: 'emerald', name: 'Emerald Orchard', color: 'bg-emerald-500' },
                { id: 'crimson', name: 'Crimson Sunset', color: 'bg-rose-500' },
                { id: 'amber', name: 'Golden Amber', color: 'bg-amber-500' },
                { id: 'purple', name: 'Amethyst Royal', color: 'bg-purple-500' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheme(t.id)}
                  className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left text-xs font-semibold transition-all ${
                    theme === t.id 
                      ? 'bg-surface text-brand-400 border border-brand-500/20 shadow-inner' 
                      : 'hover:bg-surface-hover text-slate-300 hover:text-slate-100 border border-transparent'
                  }`}
                >
                  <span className={`w-3.5 h-3.5 rounded-full ${t.color} border border-white/20 shrink-0`} />
                  <span className="flex-1">{t.name}</span>
                  {theme === t.id && <span className="text-brand-400 font-bold">✓</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Active cart badge */}
      {itemCount > 0 && (
        <div className="flex items-center gap-2 bg-brand-900/50 border border-brand-700/40 rounded-xl px-3 py-1.5 animate-pulse-soft">
          <span className="text-brand-400 text-sm">🛒</span>
          <span className="text-brand-300 text-sm font-semibold">{itemCount} items</span>
        </div>
      )}

      {/* Date/Time */}
      <div className="text-right">
        <p className="text-xs text-slate-500 leading-none">{dateStr}</p>
        <p className="text-sm font-mono font-semibold text-slate-300 leading-none mt-0.5">{timeStr}</p>
      </div>

      {/* Status dot */}
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="text-xs text-slate-500">Online</span>
      </div>
    </header>
  );
}
