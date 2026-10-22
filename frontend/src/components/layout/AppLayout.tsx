import React, { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { History, LayoutDashboard, LogOut, Package, PanelLeftClose, PanelLeftOpen, ScanSearch, UserCog, Users } from 'lucide-react';
import { DEMO_READ_ONLY_EVENT, useAuthStore } from '../../store/authStore';
import { useCrmStore } from '../../store/crmStore';
import { useReviewSearchStore } from '../../store/reviewSearchStore';

const NAV = [
  { to: '/overview', label: 'Overview', short: 'Overview', Icon: LayoutDashboard },
  { to: '/influencers', label: 'Influencers', short: 'Influencers', Icon: Users },
  { to: '/products', label: 'Products', short: 'Products', Icon: Package },
  { to: '/review-check', label: 'Review checker', short: 'Checker', Icon: ScanSearch },
  // Team and change log, shown after a divider
  { to: '/team', label: 'Marketing Team', short: 'Team', Icon: UserCog, divider: true },
  { to: '/history', label: 'History', short: 'History', Icon: History },
] as const;

// Desktop sidebar sizing (px). Dragging narrower than COLLAPSE_AT closes it to the icon rail.
const MIN_WIDTH = 200;
const MAX_WIDTH = 420;
const DEFAULT_WIDTH = 240;
const COLLAPSED_WIDTH = 68;
const COLLAPSE_AT = 140;
const PREFS_KEY = 'mmp.sidebar';

const clampWidth = (w: number) => Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(w)));

// Width and open/closed state are a per-browser convenience; storage may be unavailable
const readPrefs = (): { width: number; collapsed: boolean } => {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY) || 'null');
    if (saved && typeof saved.width === 'number') return { width: clampWidth(saved.width), collapsed: !!saved.collapsed };
  } catch { /* fall back to defaults */ }
  return { width: DEFAULT_WIDTH, collapsed: false };
};

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { load, reset, hasLoaded, loadError, influencers, products } = useCrmStore();

  const [width, setWidth] = useState(() => readPrefs().width);
  const [collapsed, setCollapsed] = useState(() => readPrefs().collapsed);
  const [dragging, setDragging] = useState(false);
  const isDemo = user?.role === 'DEMO';
  // Shown for a few seconds when the read-only demo account tries to change something
  const [demoBlocked, setDemoBlocked] = useState(false);

  useEffect(() => {
    let timer: number | undefined;
    const onBlocked = () => {
      setDemoBlocked(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setDemoBlocked(false), 5000);
    };
    window.addEventListener(DEMO_READ_ONLY_EVENT, onBlocked);
    return () => { window.removeEventListener(DEMO_READ_ONLY_EVENT, onBlocked); window.clearTimeout(timer); };
  }, []);
  const asideRef = useRef<HTMLElement>(null);
  // Width before a drag, so dragging it closed and reopening returns to the same width
  const dragStartWidth = useRef(width);

  useEffect(() => {
    if (!hasLoaded) load();
  }, [hasLoaded, load]);

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({ width, collapsed }));
    } catch { /* not persisted this time */ }
  }, [width, collapsed]);

  const toggleCollapsed = useCallback(() => setCollapsed(c => !c), []);

  // Ctrl/⌘ + B opens and closes the sidebar
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleCollapsed();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleCollapsed]);

  const handleResizeStart = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartWidth.current = width;
    setDragging(true);
  };

  const handleResizeMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging || !asideRef.current) return;
    const next = e.clientX - asideRef.current.getBoundingClientRect().left;
    if (next < COLLAPSE_AT) {
      setCollapsed(true);
    } else {
      setCollapsed(false);
      setWidth(clampWidth(next));
    }
  };

  const handleResizeEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (collapsed) setWidth(dragStartWidth.current);
    setDragging(false);
  };

  const handleResizeKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      if (collapsed) {
        if (e.key === 'ArrowRight') setCollapsed(false);
        return;
      }
      const next = width + (e.key === 'ArrowRight' ? 16 : -16);
      if (next < MIN_WIDTH) setCollapsed(true); else setWidth(clampWidth(next));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleCollapsed();
    }
  };

  const handleLogout = () => {
    logout();
    reset();
    useReviewSearchStore.getState().reset();
    navigate('/');
  };

  const counts: Record<string, number | undefined> = {
    '/influencers': hasLoaded ? influencers.length : undefined,
    '/products': hasLoaded ? products.length : undefined,
  };

  // Collapsed styling only applies from md up; phones always get the top bar
  const whenCollapsed = (cls: string) => (collapsed ? cls : '');
  const toggleLabel = collapsed ? 'Open sidebar (Ctrl/⌘ + B)' : 'Close sidebar (Ctrl/⌘ + B)';

  return (
    <div className={`flex flex-col md:flex-row h-screen w-full overflow-hidden bg-slate-50 text-slate-800 ${dragging ? 'select-none cursor-col-resize' : ''}`}>
      {/* Sidebar (desktop) / top bar (mobile) */}
      <aside
        ref={asideRef}
        style={{ '--sidebar-w': `${collapsed ? COLLAPSED_WIDTH : width}px` } as React.CSSProperties}
        className={`relative md:w-(--sidebar-w) bg-white border-b md:border-b-0 md:border-r border-slate-200 flex flex-wrap md:flex-nowrap md:flex-col shrink-0 ${
          dragging ? '' : 'md:transition-[width] md:duration-200'
        }`}
      >
        <div className={`h-14 md:h-auto md:min-h-16 md:py-2 px-4 flex flex-1 md:flex-none items-center gap-2.5 md:border-b border-slate-200 min-w-0 ${whenCollapsed('md:justify-center md:px-0')}`}>
          <div className={`bg-blue-600 text-white font-extrabold text-[11px] px-2 py-1 rounded-md tracking-wider shrink-0 ${whenCollapsed('md:hidden')}`}>MMP</div>
          <span className={`font-bold text-base md:text-[13px] text-slate-900 tracking-tight leading-tight min-w-0 ${whenCollapsed('md:hidden')}`}>
            Marketing Management Portal
          </span>
          <button
            type="button"
            onClick={toggleCollapsed}
            title={toggleLabel}
            aria-label={toggleLabel}
            aria-expanded={!collapsed}
            className={`hidden md:inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer shrink-0 ${collapsed ? '' : 'ml-auto'}`}
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        <nav className="order-last md:order-none w-full md:w-auto flex md:flex-col md:flex-1 items-center md:items-stretch gap-0.5 md:gap-1 px-1 md:px-2 pb-1.5 md:p-3 border-t md:border-t-0 border-slate-100 pt-2 md:overflow-y-auto" aria-label="Main">
          {NAV.map(item => (
            <React.Fragment key={item.to}>
            {'divider' in item && <span aria-hidden className="hidden md:block h-px bg-slate-200 my-2 mx-1" />}
            <NavLink
              to={item.to}
              title={collapsed ? `${item.label}${counts[item.to] !== undefined ? ` (${counts[item.to]})` : ''}` : undefined}
              aria-label={item.label}
              className={({ isActive }) =>
                `flex flex-1 md:flex-none items-center justify-center md:justify-between gap-2.5 px-1 md:px-3 py-1.5 md:py-2.5 rounded-lg text-[11px] md:text-sm font-semibold whitespace-nowrap transition-colors min-w-0 ${
                  whenCollapsed('md:justify-center md:px-0')
                } ${isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`
              }
            >
              <span className="flex flex-col md:flex-row items-center gap-0.5 md:gap-2.5 min-w-0">
                <item.Icon aria-hidden className={`w-4 h-4 shrink-0 ${whenCollapsed('md:w-5 md:h-5')}`} />
                <span className={`truncate md:hidden`}>{item.short}</span>
                <span className={`truncate hidden ${collapsed ? '' : 'md:inline'}`}>{item.label}</span>
              </span>
              {counts[item.to] !== undefined && (
                <span className={`text-[11px] font-bold text-slate-500 bg-slate-100 rounded-md px-1.5 py-0.5 hidden ${collapsed ? '' : 'md:inline'}`}>
                  {counts[item.to]}
                </span>
              )}
            </NavLink>
            </React.Fragment>
          ))}
        </nav>

        <div className={`md:p-3.5 px-4 md:border-t border-slate-200 flex items-center justify-between gap-2 ${whenCollapsed('md:justify-center md:px-0')}`}>
          <div className={`hidden items-center gap-2.5 min-w-0 ${collapsed ? '' : 'md:flex'}`}>
            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 border border-slate-300 flex items-center justify-center font-bold text-xs shrink-0">
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-xs text-slate-900 truncate">{user?.displayName || user?.username || 'User'}</span>
              <span className="text-[11px] text-slate-500 capitalize">{(user?.role || '').toLowerCase()}</span>
            </div>
          </div>
          <button
            type="button"
            title={collapsed ? `Log out ${user?.username ?? ''}`.trim() : undefined}
            aria-label="Log out"
            className={`border border-slate-300 text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
              whenCollapsed('md:px-2 md:py-2')
            }`}
            onClick={handleLogout}
          >
            <LogOut aria-hidden className={`w-4 h-4 hidden ${whenCollapsed('md:block')}`} />
            <span className={whenCollapsed('md:hidden')}>Logout</span>
          </button>
        </div>

        {/* Drag to resize (desktop); double-click restores the default width */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize sidebar"
          aria-valuemin={MIN_WIDTH}
          aria-valuemax={MAX_WIDTH}
          aria-valuenow={collapsed ? COLLAPSED_WIDTH : width}
          tabIndex={0}
          title="Drag to resize · double-click to reset"
          onPointerDown={handleResizeStart}
          onPointerMove={handleResizeMove}
          onPointerUp={handleResizeEnd}
          onPointerCancel={handleResizeEnd}
          onDoubleClick={() => { setCollapsed(false); setWidth(DEFAULT_WIDTH); }}
          onKeyDown={handleResizeKey}
          className="hidden md:block absolute top-0 -right-1.5 h-full w-3 cursor-col-resize z-20 group outline-none"
        >
          <span className={`absolute left-1/2 -translate-x-1/2 top-0 h-full w-0.5 transition-colors ${
            dragging ? 'bg-blue-500' : 'bg-transparent group-hover:bg-blue-300 group-focus-visible:bg-blue-500'
          }`} />
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto min-w-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          {isDemo && (
            <p role="note" className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 mb-5">
              <span className="font-semibold">Read-only demo.</span> Explore every page freely — adding, editing, deleting and Gemini searches are turned off for this account.
            </p>
          )}
          {loadError ? (
            <div className="card p-8 text-center flex flex-col items-center gap-3">
              <p className="text-sm text-slate-700">{loadError}</p>
              <button type="button" className="btn-primary" onClick={load}>Retry</button>
            </div>
          ) : !hasLoaded ? (
            <div className="card p-12 text-center text-sm text-slate-500">Loading influencers and products…</div>
          ) : (
            <Outlet />
          )}
        </div>
      </main>

      {demoBlocked && (
        <div role="alert" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-[calc(100%-2rem)] text-sm text-white bg-slate-900 rounded-lg shadow-lg px-4 py-3">
          This is a read-only demo account, so changes aren't saved.
        </div>
      )}
    </div>
  );
};
