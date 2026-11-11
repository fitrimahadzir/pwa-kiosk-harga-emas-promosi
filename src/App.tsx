import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  GoldPriceItem,
  GoldPurity,
  PromoItem,
  PriceHistoryEntry,
  ShopSettings,
  QuotationResult,
  OutletConfig,
} from './types/gold';
import {
  loadPrices,
  savePrices,
  loadPromos,
  savePromos,
  loadSettings,
  saveSettings,
  loadHistory,
  saveHistory,
  subscribeToSync,
  DEFAULT_PRICES,
  DEFAULT_PROMOS,
  DEFAULT_SETTINGS,
  DEFAULT_HISTORY,
  DEFAULT_OUTLET,
  loadCurrentOutletName,
  saveCurrentOutletName,
  getOutlet,
  upsertOutlet,
  listOutletNames,
  syncRemoteOutlets,
} from './utils/storage';
import { useSupabaseRealtime } from './hooks/useSupabaseRealtime';
import { Header } from './components/Header';
import { GoldPriceBoard } from './components/GoldPriceBoard';
import { PromoCarousel } from './components/PromoCarousel';
import { QuotationModal } from './components/QuotationModal';
import { AdminModal } from './components/AdminModal';
import { CalculatorPage } from './components/CalculatorPage';
import { LoginPage } from './components/LoginPage';
import { OfflineIndicator } from './components/OfflineIndicator';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import {
  loginWithOutletCode,
  refreshSession,
  loadSession,
  saveSession,
  clearSession,
  type AuthSession,
} from './lib/auth';
import { Sparkles, Calculator } from 'lucide-react';

export default function App() {
  // Outlet-scoped state
  const [currentOutletName, setCurrentOutletName] = useState<string>(
    loadCurrentOutletName() ?? DEFAULT_OUTLET.outletName
  );
  const [prices, setPrices] = useState<Record<GoldPurity, GoldPriceItem>>(
    loadPrices
  );
  const [promos, setPromos] = useState<PromoItem[]>(loadPromos);
  const [settings, setSettings] = useState<ShopSettings>(loadSettings);
  const [history, setHistory] = useState<PriceHistoryEntry[]>(loadHistory);

  // All outlets the admin can switch between / update prices for
  const [availableOutlets, setAvailableOutlets] = useState<string[]>(() =>
    listOutletNames()
  );

  // Active calculator purity selection
  const [selectedPurity, setSelectedPurity] = useState<GoldPurity>('916');

  // Hash-based page routing: main price board <-> dedicated calculator page
  const getPageFromHash = (): 'home' | 'calculator' => {
    const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
    return hash === 'kalkulator' ? 'calculator' : 'home';
  };

  const [page, setPage] = useState<'home' | 'calculator'>(getPageFromHash);

  // Modals
  const [activeQuotation, setActiveQuotation] = useState<QuotationResult | null>(null);

  // Login gate session
  const [session, setSession] = useState<AuthSession | null>(loadSession);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string>('');

  const isOnline = useOnlineStatus();

  // Multi-tab real-time sync via BroadcastChannel
  useEffect(() => {
    const unsubscribe = subscribeToSync((type) => {
      if (type === 'prices') setPrices(loadPrices());
      if (type === 'promos') setPromos(loadPromos());
      if (type === 'settings') {
        setSettings(loadSettings());
        setAvailableOutlets(listOutletNames());
      }
      if (type === 'history') setHistory(loadHistory());
    });
    return unsubscribe;
  }, []);

  // Keep the admin outlet picker in sync with Supabase, so every outlet can be
  // selected when updating prices — even outlets that never logged in here.
  useEffect(() => {
    if (!session || session.role !== 'admin') return;

    let cancelled = false;
    syncRemoteOutlets()
      .then((names) => {
        if (!cancelled && names.length > 0) setAvailableOutlets(names);
      })
      .catch(() => {
        // Offline or Supabase not configured — keep the local outlet list.
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

  // Per-outlet price snapshot for the admin "all outlets" overview table.
  // Rebuilt whenever any outlet-scoped state changes (saves, outlet switches,
  // realtime updates) so it always reflects what is stored.
  const outletPrices = useMemo(() => {
    const map: Record<string, Record<GoldPurity, GoldPriceItem>> = {};
    for (const name of listOutletNames()) {
      const outlet = getOutlet(name);
      if (outlet) map[name] = outlet.prices;
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prices, promos, settings, history, availableOutlets, currentOutletName]);

  // Realtime for prices/promos:
  // - Local multi-tab: BroadcastChannel (already in use)
  // - Kios multi-device: Supabase Realtime broadcast (if VITE_SUPABASE_URL is set)
  useSupabaseRealtime(prices);

  // Sync page state with browser hash (#/kalkulator)
  useEffect(() => {
    const handleHashChange = () => setPage(getPageFromHash());
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (nextPage: 'home' | 'calculator') => {
    window.location.hash = nextPage === 'calculator' ? '/kalkulator' : '/';
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Switches the active outlet and reloads outlet-scoped data
  const selectOutlet = useCallback(
    (outletName: string) => {
      if (outletName === currentOutletName) return;
      setCurrentOutletName(outletName);
      saveCurrentOutletName(outletName);
      setPrices(loadPrices());
      setPromos(loadPromos());
      setSettings(loadSettings());
      setHistory(loadHistory());
    },
    [currentOutletName]
  );

  // Update Prices Handler
  const handleUpdatePrices = (
    newPrices: Record<GoldPurity, GoldPriceItem>,
    note: string
  ) => {
    // Record history for any changed prices
    const newHistoryEntries: PriceHistoryEntry[] = [];
    const timestamp = new Date().toISOString();

    (['999', '916', '375'] as GoldPurity[]).forEach((purity) => {
      const oldItem = prices[purity];
      const newItem = newPrices[purity];
      if (
        oldItem.sellPrice !== newItem.sellPrice ||
        oldItem.buyPrice !== newItem.buyPrice
      ) {
        newHistoryEntries.push({
          id: `hist-${Date.now()}-${purity}`,
          timestamp,
          purity,
          oldSellPrice: oldItem.sellPrice,
          newSellPrice: newItem.sellPrice,
          oldBuyPrice: oldItem.buyPrice,
          newBuyPrice: newItem.buyPrice,
          adminNote: note,
        });

        // Track previous sell price for trend calculations
        newItem.previousSellPrice = oldItem.sellPrice;
        newItem.updatedAt = timestamp;
      }
    });

    setPrices(newPrices);
    savePrices(newPrices);

    if (newHistoryEntries.length > 0) {
      const updatedHistory = [...newHistoryEntries, ...history];
      setHistory(updatedHistory);
      saveHistory(updatedHistory);
    }
  };

  // Update Promos Handler
  const handleUpdatePromos = (newPromos: PromoItem[]) => {
    setPromos(newPromos);
    savePromos(newPromos);
  };

  // Update Settings Handler
  const handleUpdateSettings = (newSettings: ShopSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  // Reset to Defaults Handler
  const handleResetDefaults = () => {
    const outletName = currentOutletName;
    upsertOutlet({
      outletName,
      prices: DEFAULT_PRICES,
      promos: DEFAULT_PROMOS,
      settings: DEFAULT_SETTINGS,
      history: DEFAULT_HISTORY,
      updatedAt: new Date().toISOString(),
    });
    setPrices(DEFAULT_PRICES);
    setPromos(DEFAULT_PROMOS);
    setSettings(DEFAULT_SETTINGS);
    setHistory(DEFAULT_HISTORY);
  };

  // Login Handler (code-only, outlet or admin)
  const handleLogin = async (code: string) => {
    if (isLoggingIn) return;

    setIsLoggingIn(true);
    setLoginError('');

    try {
      const nextSession = await loginWithOutletCode(code);

      saveSession(nextSession);
      setSession(nextSession);

      // Determine which outlet this session belongs to.
      const outletName =
        nextSession.outletName && nextSession.outletName.trim().length > 0
          ? nextSession.outletName
          : DEFAULT_OUTLET.outletName;

      // If the outlet does not exist yet, seed it from defaults.
      if (!getOutlet(outletName)) {
        upsertOutlet({
          outletName,
          prices: DEFAULT_PRICES,
          promos: DEFAULT_PROMOS,
          settings: {
            ...DEFAULT_SETTINGS,
            outletName,
          },
          history: DEFAULT_HISTORY,
          updatedAt: new Date().toISOString(),
        });
      }

      setCurrentOutletName(outletName);
      saveCurrentOutletName(outletName);
      setPrices(loadPrices());
      setPromos(loadPromos());
      setSettings(loadSettings());
      setHistory(loadHistory());
    } catch (error) {
      setLoginError(
        error instanceof Error
          ? error.message
          : 'Log masuk gagal. Sila cuba lagi.'
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Logout Handler
  const handleLogout = () => {
    clearSession();
    setSession(null);
    setActiveQuotation(null);
    setLoginError('');
    setPage('home');
    window.location.hash = '/';

    // Return to the default outlet until the next login.
    setCurrentOutletName(DEFAULT_OUTLET.outletName);
    saveCurrentOutletName(DEFAULT_OUTLET.outletName);
    setPrices(loadPrices());
    setPromos(loadPromos());
    setSettings(loadSettings());
    setHistory(loadHistory());
  };

  // Re-validate the stored session (and its role) against Supabase on boot.
  // In local demo mode, refreshSession keeps the session unchanged.
  useEffect(() => {
    if (!session) return;

    let cancelled = false;

    void refreshSession(session).then((nextSession) => {
      if (cancelled) return;

      if (!nextSession) {
        handleLogout();
        return;
      }

      if (
        nextSession.role !== session.role ||
        nextSession.outletName !== session.outletName
      ) {
        saveSession(nextSession);
        setSession(nextSession);

        // Switch to the outlet associated with this session.
        const outletName =
          nextSession.outletName && nextSession.outletName.trim().length > 0
            ? nextSession.outletName
            : DEFAULT_OUTLET.outletName;

        // Seed if missing.
        if (!getOutlet(outletName)) {
          upsertOutlet({
            outletName,
            prices: DEFAULT_PRICES,
            promos: DEFAULT_PROMOS,
            settings: {
              ...DEFAULT_SETTINGS,
              outletName,
            },
            history: DEFAULT_HISTORY,
            updatedAt: new Date().toISOString(),
          });
        }

        selectOutlet(outletName);
      }
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // Mandatory login gate: kiosk stays hidden until a valid outlet code is entered.
  if (!session) {
    return (
      <LoginPage
        shopName={DEFAULT_SETTINGS.shopName}
        error={loginError}
        isLoading={isLoggingIn}
        onLogin={handleLogin}
      />
    );
  }

  // Admin login goes straight to the admin panel; closing it logs out.
  if (session.role === 'admin') {
    return (
      <>
        <AdminModal
          isOpen
          onClose={handleLogout}
          currentOutletName={currentOutletName}
          sessionOutletName={session.outletName}
          onSelectOutlet={selectOutlet}
          availableOutlets={availableOutlets}
          outletPrices={outletPrices}
          prices={prices}
          onUpdatePrices={handleUpdatePrices}
          promos={promos}
          onUpdatePromos={handleUpdatePromos}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          history={history}
          onResetDefaults={handleResetDefaults}
        />
        <OfflineIndicator />
      </>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col justify-between font-sans text-maroon-deep selection:bg-gold/35 selection:text-maroon-deep">
      {/* 1. TOP HEADER BAR */}
      <Header
        settings={settings}
        onLogout={handleLogout}
        showCalculator={page === 'calculator'}
        onToggleCalculator={() => navigateTo(page === 'calculator' ? 'home' : 'calculator')}
      />

      {/* 2. MAIN CONTENT */}
      {page === 'calculator' ? (
        /* Dedicated calculator page */
        <main className="mx-auto w-full max-w-[1480px] flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
          <CalculatorPage
            prices={prices}
            selectedPurity={selectedPurity}
            onPurityChange={setSelectedPurity}
            onGenerateQuote={(quote) => setActiveQuotation(quote)}
            onBack={() => navigateTo('home')}
          />
        </main>
      ) : (
        /* Main price board page */
        <main className="mx-auto grid w-full max-w-[1480px] flex-1 grid-cols-1 items-stretch gap-4 px-4 py-5 sm:px-6 lg:gap-5 lg:px-8 lg:py-6 landscape:lg:flex">
          {/* LEFT COLUMN: Gold Prices Board + Promo Banner + Calculator launcher.
              In portrait these become direct grid items so the poster can sit
              between them, while landscape keeps the original side-by-side layout.
              In landscape it flexes to fill all remaining width, so the poster
              keeps its fixed 3:4 size. */}
          <div className="contents landscape:lg:min-w-0 landscape:lg:flex-1 landscape:lg:flex landscape:lg:flex-col landscape:lg:gap-4 landscape:lg:justify-between">
            {/* Section: Live Gold Price Board (999, 916, 375) */}
            <div className="order-1">
              <GoldPriceBoard
                prices={prices}
                selectedPurity={selectedPurity}
                onSelectPurity={setSelectedPurity}
                onOpenCalculator={() => navigateTo('calculator')}
              />
            </div>

            {/* Banner image: sits between the price board and calculator launcher.
                Ratio 3:1 (e.g. 1800 × 600 px). Replace /images/banner-promosi.svg
                with the permanent artwork, or point src to a .jpg/.png file. */}
            <div className="order-3 w-full overflow-hidden rounded-2xl border border-line/15 bg-[#2a0404] shadow-[0_16px_36px_-26px_rgba(59,7,7,0.45)]">
              <img
                src="/images/banner-promosi.svg"
                alt="Banner promosi kedai emas"
                className="block w-full aspect-[3/1] object-cover object-center"
                loading="lazy"
              />
            </div>

            {/* Compact launcher to the dedicated calculator page */}
            <button
              type="button"
              onClick={() => navigateTo('calculator')}
              className="order-4 w-full flex items-center justify-between gap-4 rounded-2xl bg-gold px-4 py-3.5 text-left text-maroon-deep border border-gold-deep/45 shadow-[0_16px_36px_-26px_rgba(212,161,58,0.75)] transition hover:bg-gold-soft active:scale-[0.99]"
            >
              <span className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-maroon-deep/10 border border-maroon-deep/20">
                  <Calculator size={20} />
                </span>
                <span>
                  <span className="block font-serif text-sm font-bold tracking-wide sm:text-base">
                    Kalkulator Jualan
                  </span>
                  <span className="block text-[11px] text-maroon-deep/70">
                    Kira harga jual, upah tukang & trade-in emas lama
                  </span>
                </span>
              </span>
              <span className="shrink-0 rounded-lg bg-maroon-deep px-3 py-1.5 text-[11px] font-bold text-gold">
                Buka
              </span>
            </button>
          </div>

          {/* RIGHT COLUMN: Promotional Posters Carousel & Highlights.
              Portrait: appears between the price board and the calculator,
              stretched to the full app width. Landscape: fixed 430px poster on
              the right, aligned with the header's logout button. */}
          <div className="order-2 flex w-full flex-col items-center justify-between gap-3 landscape:order-4 landscape:lg:w-[430px] landscape:lg:shrink-0 landscape:lg:items-end">
            {/* Promo Posters Carousel (3:4 single / 3:2 dual in tablet portrait) */}
            <div className="w-full flex-1 flex items-center justify-center landscape:lg:justify-end">
              <PromoCarousel
                promos={promos}
                shopName={settings.shopName}
                shopPhone={settings.phone}
              />
            </div>
          </div>
        </main>
      )}

      {/* 3. FOOTER RUNNING TICKER / MARQUEE */}
      <div className="mx-auto w-full max-w-[1480px] px-4 pb-4 sm:px-6 lg:px-8">
        <footer className="gr-card-light flex flex-col gap-1.5 px-4 py-2 text-[11px] text-maroon/60">
          <div className="flex items-center gap-2">
            <Sparkles size={12} className="animate-pulse text-gold-deep" />
            <span className="font-semibold text-maroon-deep">Pengumuman Kaunter:</span>
            <span className="max-w-md truncate text-maroon/70">
              Promosi potongan upah 50% untuk rantai leher 916 & trade-in bonus sah sehingga hujung bulan.
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/15 pt-1.5 text-[10px] text-maroon/50">
            <span className="truncate">
              {settings.branch} • {settings.phone}
            </span>
            <span className="flex items-center gap-1.5">
              Kadar Disahkan Kaunter
              <span>•</span>
              © {new Date().getFullYear()}
              <span>•</span>
              <span
                className={`flex items-center gap-1 font-semibold ${
                  isOnline ? 'text-success' : 'text-warm'
                }`}
                title={isOnline ? 'Sistem bersambung ke rangkaian' : 'Mod Luar Talian (Data disimpan dalam cache)'}
              >
                <span
                  className={`size-1.5 rounded-full ${
                    isOnline ? 'bg-success animate-pulse' : 'bg-warm'
                  }`}
                />
                {isOnline ? 'Dalam Talian' : 'Luar Talian'}
              </span>
            </span>
          </div>
        </footer>
      </div>

      {/* 4. MODALS */}
      {/* Quotation Slip Modal */}
      <QuotationModal
        quote={activeQuotation}
        settings={settings}
        onClose={() => setActiveQuotation(null)}
      />

      {/* Offline Alert Indicator */}
      <OfflineIndicator />
    </div>
  );
}
