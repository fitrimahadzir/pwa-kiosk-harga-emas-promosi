import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  GoldPriceItem,
  GoldPurity,
  PromoItem,
  PriceHistoryEntry,
  ShopSettings,
  QuotationResult,
} from './types/gold';
import {
  DEFAULT_PRICES,
  DEFAULT_SETTINGS,
  loadCurrentOutletName,
  saveCurrentOutletName,
  clearCurrentOutletName,
  purgeLegacyLocalStorage,
  fetchOutletNames,
  fetchAllOutletPrices,
  fetchOutletPrices,
  pushOutletPrices,
  fetchPromos,
  pushPromos,
  fetchOutletSettings,
  pushOutletSettings,
  fetchOutletHistory,
} from './utils/storage';
import { useSupabaseRealtime } from './hooks/useSupabaseRealtime';
import { useLandscapeOrientation, usePromoStageHeight } from './hooks/usePromoStageHeight';
import { Header } from './components/Header';
import { GoldPriceBoard } from './components/GoldPriceBoard';
import { PromoCarousel } from './components/PromoCarousel';
import { QuotationModal } from './components/QuotationModal';
import { AdminModal } from './components/AdminModal';
import { CalculatorPage } from './components/CalculatorPage';
import { LoginPage } from './components/LoginPage';
import { OfflineIndicator } from './components/OfflineIndicator';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { getAdminSession, signInAdmin, signOutAdmin, type AdminSession } from './lib/auth';
import { supabase } from './lib/supabase';
import { Sparkles, Calculator, Loader2 } from 'lucide-react';

const PURITIES: GoldPurity[] = ['999', '916', '375'];

const REFRESH_INTERVAL_MS = 60_000;

type Page = 'home' | 'calculator';

function parseHash(): { admin: boolean; page: Page } {
  const raw = window.location.hash.replace(/^#\/?/, '').toLowerCase();
  if (raw === 'admin') return { admin: true, page: 'home' };
  return { admin: false, page: raw === 'kalkulator' ? 'calculator' : 'home' };
}

/** Carry the previous sell price forward so the trend arrow stays meaningful. */
function mergeRemotePrices(
  remote: Record<GoldPurity, GoldPriceItem>,
  local: Record<GoldPurity, GoldPriceItem> | undefined,
): Record<GoldPurity, GoldPriceItem> {
  const next = { ...remote };
  for (const purity of PURITIES) {
    const previous = local?.[purity];
    const incoming = remote[purity];
    next[purity] = {
      ...incoming,
      previousSellPrice:
        previous && previous.sellPrice !== incoming.sellPrice
          ? previous.sellPrice
          : previous?.previousSellPrice ?? incoming.previousSellPrice,
    };
  }
  return next;
}

export default function App() {
  // Outlet-scoped state. `null` means the kiosk is showing the outlet picker.
  const [currentOutletName, setCurrentOutletName] = useState<string | null>(() =>
    loadCurrentOutletName(),
  );
  const [prices, setPrices] = useState<Record<GoldPurity, GoldPriceItem>>(DEFAULT_PRICES);
  const [promos, setPromos] = useState<PromoItem[]>([]);
  const [settings, setSettings] = useState<ShopSettings>(DEFAULT_SETTINGS);
  const [history, setHistory] = useState<PriceHistoryEntry[]>([]);

  // All outlets shown in the pickers (public names only — role = 'outlet').
  const [availableOutlets, setAvailableOutlets] = useState<string[]>([]);
  const [outletsLoading, setOutletsLoading] = useState<boolean>(false);

  // Per-outlet price snapshot for the admin overview table (server data).
  const [outletPrices, setOutletPrices] = useState<
    Record<string, Record<GoldPurity, GoldPriceItem>>
  >({});

  // Active calculator purity selection
  const [selectedPurity, setSelectedPurity] = useState<GoldPurity>('916');

  // Hash routing: kiosk/calculator <-> admin panel (`#/admin`).
  const [route, setRoute] = useState<{ admin: boolean; page: Page }>(parseHash());
  const [page, setPage] = useState<Page>(route.page);

  // Modals
  const [activeQuotation, setActiveQuotation] = useState<QuotationResult | null>(null);

  // Admin session (Supabase Auth). Verified on boot and fail-closed.
  const [adminSession, setAdminSession] = useState<AdminSession | null>(null);
  const [authChecked, setAuthChecked] = useState<boolean>(false);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string>('');

  const isOnline = useOnlineStatus();

  // Stage kiosk: dalam paparan melintang, tinggi poster promosi diselaraskan
  // dengan tinggi papan harga + banner 3:1 + kalkulator.
  const stageLeftRef = useRef<HTMLDivElement | null>(null);
  const stageRightRef = useRef<HTMLDivElement | null>(null);
  const isLandscape = useLandscapeOrientation();
  usePromoStageHeight(
    stageLeftRef,
    stageRightRef,
    isLandscape && !route.admin && page === 'home' && Boolean(currentOutletName),
  );

  const navigateTo = (nextPage: Page) => {
    window.location.hash = nextPage === 'calculator' ? '/kalkulator' : '/';
    setPage(nextPage);
    setRoute((prev) => ({ ...prev, page: nextPage }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Keep state in sync with the browser hash (#/admin, #/kalkulator).
  useEffect(() => {
    const handleHashChange = () => {
      const next = parseHash();
      setRoute(next);
      setPage(next.page);
      if (next.admin) setLoginError('');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Buang cache localStorage lama sekali — semua data kini dari Supabase.
  useEffect(() => {
    purgeLegacyLocalStorage();
  }, []);

  // Verify any persisted Supabase Auth session once, on boot.
  useEffect(() => {
    let cancelled = false;

    void getAdminSession()
      .then((session) => {
        if (!cancelled) setAdminSession(session);
      })
      .catch(() => {
        if (!cancelled) setAdminSession(null);
      })
      .finally(() => {
        if (!cancelled) setAuthChecked(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Sesi admin yang disahkan sentiasa dihalakan ke panel admin, termasuk
  // selepas refresh atau membuka semula PWA.
  useEffect(() => {
    if (!authChecked || !adminSession) return;
    if (parseHash().admin) return;

    window.location.hash = '/admin';
    setRoute({ admin: true, page: 'home' });
    setPage('home');
  }, [authChecked, adminSession, route.admin]);

  // If Supabase ends the session (logout elsewhere, revoked token), drop admin.
  useEffect(() => {
    if (!supabase) return;

    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== 'SIGNED_OUT') return;
      setAdminSession(null);
      setLoginError('');
      if (parseHash().admin) {
        window.location.hash = '/';
        setRoute({ admin: false, page: 'home' });
        setPage('home');
      }
    });

    return () => data.subscription.unsubscribe();
  }, []);

  /** Reload the public outlet list from the server (also used by "cuba lagi"). */
  const refreshOutlets = useCallback(async () => {
    setOutletsLoading(true);
    try {
      setAvailableOutlets(await fetchOutletNames());
    } catch {
      // Offline / Supabase tidak dikonfigurasi — tiada cache peranti.
      setAvailableOutlets([]);
    } finally {
      setOutletsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshOutlets();
  }, [refreshOutlets]);

  /**
   * Fetch the authoritative prices for the current outlet from Supabase.
   * Realtime payloads are never trusted — they only trigger this refetch.
   */
  const refreshPrices = useCallback(async () => {
    const outletName = currentOutletName;
    if (!outletName) return;

    const remote = await fetchOutletPrices(outletName);
    if (!remote) return;

    setPrices((previous) => mergeRemotePrices(remote, previous));
  }, [currentOutletName]);

  const refreshPromosAndSettings = useCallback(async () => {
    const outletName = currentOutletName;
    if (!outletName) return;

    const [remotePromos, remoteSettings] = await Promise.all([
      fetchPromos(),
      fetchOutletSettings(outletName),
    ]);

    setPromos(remotePromos);
    setSettings(remoteSettings);
  }, [currentOutletName]);

  const refreshHistory = useCallback(async () => {
    if (!currentOutletName || !adminSession) {
      setHistory([]);
      return;
    }
    setHistory(await fetchOutletHistory(currentOutletName));
  }, [currentOutletName, adminSession]);

  const refreshAllPrices = useCallback(async () => {
    setOutletPrices(await fetchAllOutletPrices());
  }, []);

  const refreshOutletData = useCallback(async () => {
    await Promise.all([refreshPrices(), refreshPromosAndSettings()]);
  }, [refreshPrices, refreshPromosAndSettings]);

  // Hydrate the selected outlet from the server (no local cache).
  useEffect(() => {
    if (!currentOutletName) {
      setPrices(DEFAULT_PRICES);
      setPromos([]);
      setSettings(DEFAULT_SETTINGS);
      setHistory([]);
      return;
    }

    setSettings((previous) => ({ ...previous, outletName: currentOutletName }));
    void refreshOutletData();
    void refreshHistory();
  }, [currentOutletName, refreshOutletData, refreshHistory]);

  // Realtime refetch + slow poll (covers kiosks that lose the websocket).
  // Skipped while the admin editor is open so remote refreshes never wipe
  // unsaved draft edits.
  useSupabaseRealtime(route.admin ? null : currentOutletName, () => {
    void refreshOutletData();
  });

  useEffect(() => {
    if (!currentOutletName || route.admin) return;
    const timer = setInterval(() => {
      void refreshOutletData();
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [currentOutletName, refreshOutletData, route.admin]);

  // Admin overview table reads every outlet's prices from the server.
  useEffect(() => {
    if (!route.admin) return;
    void refreshAllPrices();
  }, [route.admin, currentOutletName, refreshAllPrices]);

  /** Enter kiosk mode for an outlet (no credentials required). */
  const enterOutlet = useCallback((name: string) => {
    const outletName = name.trim();
    if (!outletName) return;

    saveCurrentOutletName(outletName);
    setCurrentOutletName(outletName);
    setLoginError('');
    setActiveQuotation(null);
    setPage('home');
    setRoute({ admin: false, page: 'home' });
    window.location.hash = '/';
  }, []);

  /** Switch the active outlet (used by the admin price editor too). */
  const selectOutlet = useCallback(
    (outletName: string) => {
      if (!outletName || outletName === currentOutletName) return;
      saveCurrentOutletName(outletName);
      setCurrentOutletName(outletName);
    },
    [currentOutletName],
  );

  // A persisted admin session opened directly on #/admin may have no outlet
  // selected yet — pick a valid one so the price editor is always usable.
  useEffect(() => {
    if (!route.admin || !adminSession || currentOutletName) return;
    const fallback = availableOutlets[0] ?? DEFAULT_SETTINGS.outletName;
    saveCurrentOutletName(fallback);
    setCurrentOutletName(fallback);
  }, [route.admin, adminSession, currentOutletName, availableOutlets]);

  /** Leave kiosk mode and return to the outlet picker. */
  const handleExitOutlet = () => {
    clearCurrentOutletName();
    setCurrentOutletName(null);
    setActiveQuotation(null);
    setLoginError('');
    setPage('home');
    setRoute({ admin: false, page: 'home' });
    window.location.hash = '/';
  };

  const openAdmin = () => {
    setLoginError('');
    setIsLoggingIn(false);
    setRoute({ admin: true, page: 'home' });
    window.location.hash = '/admin';
  };

  const handleAdminLogin = async (email: string, password: string) => {
    if (isLoggingIn) return;

    setIsLoggingIn(true);
    setLoginError('');

    try {
      const session = await signInAdmin(email, password);
      setAdminSession(session);

      // Make sure the admin editor always has an outlet selected.
      let names = availableOutlets;
      try {
        const remoteNames = await fetchOutletNames();
        names = remoteNames;
        setAvailableOutlets(remoteNames);
      } catch {
        // Kekalkan senarai yang sudah ada dalam memori.
      }

      if (!currentOutletName) {
        const fallback = names[0] ?? DEFAULT_SETTINGS.outletName;
        saveCurrentOutletName(fallback);
        setCurrentOutletName(fallback);
      }

      setRoute({ admin: true, page: 'home' });
      window.location.hash = '/admin';
    } catch (error) {
      setAdminSession(null);
      setLoginError(
        error instanceof Error ? error.message : 'Log masuk gagal. Sila cuba lagi.',
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleAdminLogout = async () => {
    try {
      await signOutAdmin();
    } catch {
      // Ignore network errors — the local session is dropped regardless.
    }
    setAdminSession(null);
    setLoginError('');
    setRoute({ admin: false, page: 'home' });
    setPage('home');
    window.location.hash = '/';
  };

  const backToKiosk = () => {
    setLoginError('');
    setIsLoggingIn(false);
    setRoute({ admin: false, page: 'home' });
    window.location.hash = '/';
  };

  /**
   * Admin-only write path. The database re-checks `is_kiosk_admin()`; a
   * rejected write throws so the UI never reports a false success.
   */
  const handleUpdatePrices = async (
    newPrices: Record<GoldPurity, GoldPriceItem>,
    note: string,
  ): Promise<void> => {
    if (!adminSession) {
      throw new Error('Sesi admin tidak sah. Sila log masuk semula.');
    }

    const outletName = currentOutletName;
    if (!outletName) {
      throw new Error('Tiada outlet dipilih.');
    }

    for (const purity of PURITIES) {
      const item = newPrices[purity];
      if (!item) throw new Error(`Harga ${purity} tidak lengkap.`);
      if (!Number.isFinite(item.sellPrice) || item.sellPrice <= 0) {
        throw new Error(`Harga jual ${purity} mesti lebih besar daripada 0.`);
      }
      if (!Number.isFinite(item.buyPrice) || item.buyPrice < 0) {
        throw new Error(`Harga beli ${purity} tidak sah.`);
      }
      if (item.buyPrice > item.sellPrice) {
        throw new Error(`Harga beli ${purity} tidak boleh melebihi harga jual.`);
      }
    }

    const timestamp = new Date().toISOString();
    const previous = prices;
    const next = {} as Record<GoldPurity, GoldPriceItem>;

    for (const purity of PURITIES) {
      const oldItem = previous[purity];
      const newItem = newPrices[purity];
      const changed =
        !oldItem ||
        oldItem.sellPrice !== newItem.sellPrice ||
        oldItem.buyPrice !== newItem.buyPrice;

      next[purity] = {
        ...newItem,
        previousSellPrice: changed && oldItem ? oldItem.sellPrice : newItem.previousSellPrice,
        updatedAt: timestamp,
      };
    }

    // Throws if RLS rejects the write (e.g. session expired / not an admin).
    await pushOutletPrices(outletName, next, note);

    setPrices(next);
    await Promise.all([refreshPrices(), refreshHistory(), refreshAllPrices()]);
  };

  // Poster promosi global disimpan di Supabase (sama untuk semua outlet).
  const handleUpdatePromos = async (newPromos: PromoItem[]): Promise<void> => {
    if (!adminSession) {
      throw new Error('Sesi admin tidak sah. Sila log masuk semula.');
    }

    await pushPromos(newPromos);
    setPromos(await fetchPromos());
  };

  // Tetapan kedai disimpan di Supabase.
  const handleUpdateSettings = async (newSettings: ShopSettings): Promise<void> => {
    const outletName = currentOutletName;
    if (!outletName) throw new Error('Tiada outlet dipilih.');
    if (!adminSession) {
      throw new Error('Sesi admin tidak sah. Sila log masuk semula.');
    }

    await pushOutletSettings(outletName, newSettings);
    setSettings(await fetchOutletSettings(outletName));
  };

  // Reset harga + tetapan ke nilai asal (poster promosi tidak dipadam).
  const handleResetDefaults = async (): Promise<void> => {
    const outletName = currentOutletName;
    if (!outletName) return;
    if (!adminSession) {
      throw new Error('Sesi admin tidak sah. Sila log masuk semula.');
    }

    const defaults = { ...DEFAULT_SETTINGS, outletName };

    await Promise.all([
      pushOutletPrices(outletName, DEFAULT_PRICES, 'Pulihkan harga asal'),
      pushOutletSettings(outletName, defaults),
    ]);

    setPrices(DEFAULT_PRICES);
    setSettings(defaults);
    await Promise.all([
      refreshPrices(),
      refreshPromosAndSettings(),
      refreshHistory(),
      refreshAllPrices(),
    ]);
  };

  // ---- Rendering gates -----------------------------------------------------

  // The kiosk needs no credentials; only the admin panel is authenticated.
  if (route.admin) {
    if (!authChecked) {
      return (
        <div className="grid min-h-screen place-items-center bg-maroon-deep text-cream">
          <div className="flex items-center gap-2 text-sm text-gold-soft/70">
            <Loader2 size={16} className="animate-spin" />
            Mengesahkan sesi pentadbir...
          </div>
        </div>
      );
    }

    if (!adminSession) {
      return (
        <LoginPage
          shopName={DEFAULT_SETTINGS.shopName}
          variant="admin"
          outlets={availableOutlets}
          initialOutlet={currentOutletName ?? undefined}
          error={loginError}
          isLoading={isLoggingIn}
          onEnterOutlet={enterOutlet}
          onAdminLogin={handleAdminLogin}
          onOpenAdmin={openAdmin}
          onBackToKiosk={backToKiosk}
          onRefreshOutlets={() => void refreshOutlets()}
          outletsLoading={outletsLoading}
        />
      );
    }

    return (
      <>
        <AdminModal
          isOpen
          onClose={() => {
            void handleAdminLogout();
          }}
          currentOutletName={currentOutletName ?? DEFAULT_SETTINGS.outletName}
          adminLabel={adminSession.email}
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

  if (!currentOutletName) {
    return (
      <LoginPage
        shopName={DEFAULT_SETTINGS.shopName}
        variant="outlet"
        outlets={availableOutlets}
        initialOutlet={availableOutlets[0]}
        error={loginError}
        isLoading={isLoggingIn}
        onEnterOutlet={enterOutlet}
        onAdminLogin={handleAdminLogin}
        onOpenAdmin={openAdmin}
        onBackToKiosk={backToKiosk}
        onRefreshOutlets={() => void refreshOutlets()}
        outletsLoading={outletsLoading}
      />
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col justify-between font-sans text-maroon-deep selection:bg-gold/35 selection:text-maroon-deep">
      {/* 1. TOP HEADER BAR */}
      <Header
        settings={settings}
        onLogout={handleExitOutlet}
        onOpenAdmin={openAdmin}
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
        <main className="mx-auto grid w-full max-w-[1480px] flex-1 grid-cols-1 items-stretch gap-4 px-4 py-5 sm:px-6 lg:gap-5 lg:px-8 lg:py-6 landscape:flex landscape:items-start landscape:gap-4 landscape:py-4 landscape:sm:gap-5 landscape:sm:py-5 landscape:lg:py-6">
          {/* LEFT COLUMN: Gold Prices Board + Promo Banner + Calculator launcher.
              In portrait these become direct grid items so the poster can sit
              between them, while landscape keeps the original side-by-side layout.
              In landscape the column's natural height (price board + 3:1 banner
              + calculator) becomes the reference height for the promo poster. */}
          <div
            ref={stageLeftRef}
            className="contents landscape:order-1 landscape:flex landscape:min-w-0 landscape:flex-1 landscape:flex-col landscape:justify-start landscape:gap-4 landscape:sm:gap-5"
          >
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
              stretched to the full app width. Landscape: the poster keeps its
              3:4 ratio and its height is synced with the left column, so the
              price board, banner and calculator always end at the same line. */}
          <div
            ref={stageRightRef}
            className="order-2 flex w-full flex-col items-center justify-between gap-3 landscape:order-2 landscape:w-auto landscape:flex-none landscape:items-stretch"
          >
            {/* Promo Posters Carousel (3:4 — height synced in landscape) */}
            <div className="w-full flex-1 flex items-center justify-center landscape:h-full landscape:justify-center">
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
