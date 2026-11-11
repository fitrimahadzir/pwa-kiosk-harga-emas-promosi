import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  Coins,
  Image as ImageIcon,
  History,
  Settings as SettingsIcon,
  Plus,
  Trash2,
  Save,
  Check,
  Upload,
  RotateCcw,
  Calendar,
  Sparkles,
  LogOut,
  Menu,
  LayoutDashboard,
  ChevronDown,
  MapPin,
  PencilLine,
  type LucideIcon,
} from 'lucide-react';
import {
  GoldPriceItem,
  GoldPurity,
  PromoItem,
  PriceHistoryEntry,
  ShopSettings,
} from '../types/gold';
import { formatMYR } from '../utils/calculator';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentOutletName: string;
  /** Outlet name tied to the login session (from `kiosk_outlets`) — the admin identity. */
  sessionOutletName: string;
  onSelectOutlet: (outletName: string) => void;
  availableOutlets: string[];
  outletPrices: Record<string, Record<GoldPurity, GoldPriceItem>>;
  prices: Record<GoldPurity, GoldPriceItem>;
  onUpdatePrices: (newPrices: Record<GoldPurity, GoldPriceItem>, note: string) => void;
  promos: PromoItem[];
  onUpdatePromos: (newPromos: PromoItem[]) => void;
  settings: ShopSettings;
  onUpdateSettings: (newSettings: ShopSettings) => void;
  history: PriceHistoryEntry[];
  onResetDefaults: () => void;
}

type AdminTab = 'prices' | 'promos' | 'history' | 'settings';

const NAV_ITEMS: { id: AdminTab; label: string; icon: LucideIcon }[] = [
  { id: 'prices', label: 'Harga', icon: Coins },
  { id: 'promos', label: 'Promosi', icon: ImageIcon },
  { id: 'history', label: 'Sejarah', icon: History },
  { id: 'settings', label: 'Tetapan', icon: SettingsIcon },
];

const PAGE_COPY: Record<AdminTab, { kicker: string; title: string; description: string }> = {
  prices: {
    kicker: 'Pentadbir',
    title: 'Harga Emas',
    description:
      'Pilih outlet, kemudian laraskan harga jual dan beli semula — disegerakkan ke tablet kaunter outlet tersebut.',
  },
  promos: {
    kicker: 'Kaunter',
    title: 'Poster Promosi',
    description: 'Poster dipaparkan secara bergilir di skrin tablet kaunter.',
  },
  history: {
    kicker: 'Audit',
    title: 'Log Sejarah',
    description: 'Rekod perubahan harga jualan dan belian semula.',
  },
  settings: {
    kicker: 'Cawangan',
    title: 'Tetapan Kedai',
    description: 'Maklumat ini dicetak pada resit sebut harga dan paparan atas kiosk.',
  },
};

const fieldClass =
  'h-11 w-full rounded-lg border border-line/25 bg-[#fbf6ef] px-3.5 text-sm text-maroon-deep placeholder:text-maroon-deep/35 focus:border-gold-deep/45 focus:outline-none focus:ring-2 focus:ring-gold/15';

const labelClass = 'mb-1.5 block text-[11px] font-semibold text-maroon-deep/70';

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'AD';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent = 'gold',
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint: string;
  accent?: 'gold' | 'success' | 'warm' | 'cream';
}) {
  const accentClass = {
    gold: 'border-gold/35 bg-gold/15 text-gold',
    success: 'border-success/35 bg-success/15 text-success',
    warm: 'border-warm/35 bg-warm/15 text-warm',
    cream: 'border-cream/30 bg-cream/10 text-cream/80',
  }[accent];

  return (
    <div className="rounded-2xl border border-line/70 bg-gradient-to-r from-[#3b0707] to-[#6a1a17] p-4 shadow-[0_20px_45px_-30px_rgba(0,0,0,0.9)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="gr-kicker">{label}</p>
          <p className="mt-2 font-heading text-[1.65rem] leading-none text-cream sm:text-[2rem]">{value}</p>
          <p className="mt-2 truncate text-[10px] uppercase tracking-[0.12em] text-cream/55">{hint}</p>
        </div>
        <div className={`grid size-9 shrink-0 place-items-center rounded-lg border ${accentClass}`}>
          <Icon className="size-4" />
        </div>
      </div>
    </div>
  );
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  currentOutletName,
  sessionOutletName,
  onSelectOutlet,
  availableOutlets,
  outletPrices,
  prices,
  onUpdatePrices,
  promos,
  onUpdatePromos,
  settings,
  onUpdateSettings,
  history,
  onResetDefaults,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('prices');
  const [navOpen, setNavOpen] = useState(false);

  const [draftPrices, setDraftPrices] = useState<Record<GoldPurity, GoldPriceItem>>(prices);
  const [priceNote, setPriceNote] = useState<string>('Pelarasan harga semasa');
  const [priceSuccessMsg, setPriceSuccessMsg] = useState<string>('');

  const [draftPromos, setDraftPromos] = useState<PromoItem[]>(promos);
  const [showAddPromo, setShowAddPromo] = useState<boolean>(false);
  const [newPromo, setNewPromo] = useState<Partial<PromoItem>>({
    title: '',
    subtitle: '',
    badge: 'PROMOSI KHAS',
    imageUrl: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80',
    validUntil: '31 Disember 2026',
    terms: 'Tertakluk kepada pembelian koleksi terpilih.',
    isActive: true,
  });

  const [draftSettings, setDraftSettings] = useState<ShopSettings>(settings);
  const [settingsSuccess, setSettingsSuccess] = useState<string>('');

  // Keep drafts in sync with the selected outlet's stored data. Without this,
  // switching outlets would keep editing the previous outlet's prices/promos.
  useEffect(() => {
    setDraftPrices(prices);
  }, [prices]);
  useEffect(() => {
    setDraftPromos(promos);
  }, [promos]);
  useEffect(() => {
    setDraftSettings(settings);
  }, [settings]);

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString('ms-MY', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    [],
  );

  const activePromoCount = draftPromos.filter((promo) => promo.isActive).length;
  const page = PAGE_COPY[activeTab];

  if (!isOpen) return null;

  // Outlet list used by the picker (fallback to the current outlet only)
  const outletOptions =
    availableOutlets.length > 0 ? availableOutlets : [currentOutletName || 'HQ Warehouse'];

  // True while the admin has unsaved price edits for the current outlet
  const hasUnsavedPriceEdits = (['999', '916', '375'] as GoldPurity[]).some(
    (purity) =>
      draftPrices[purity].sellPrice !== prices[purity].sellPrice ||
      draftPrices[purity].buyPrice !== prices[purity].buyPrice,
  );

  // Switch the outlet being edited (with a guard for unsaved price edits)
  const handleSelectOutlet = (name: string) => {
    if (name === currentOutletName) return;
    if (
      hasUnsavedPriceEdits &&
      !window.confirm(
        'Ada perubahan harga yang belum disimpan. Tukar outlet dan abaikan perubahan ini?',
      )
    ) {
      return;
    }
    setPriceSuccessMsg('');
    onSelectOutlet(name);
  };

  const handleSavePrices = () => {
    onUpdatePrices(draftPrices, priceNote);
    setPriceSuccessMsg(
      `Harga ${currentOutletName || 'outlet ini'} berjaya dikemaskini dan disegerakkan.`,
    );
    setTimeout(() => setPriceSuccessMsg(''), 3000);
  };

  const handleTogglePromo = (id: string) => {
    const updated = draftPromos.map((promo) =>
      promo.id === id ? { ...promo, isActive: !promo.isActive } : promo,
    );
    setDraftPromos(updated);
    onUpdatePromos(updated);
  };

  const handleDeletePromo = (id: string) => {
    if (window.confirm('Adakah anda pasti ingin memadam poster promosi ini?')) {
      const updated = draftPromos.filter((promo) => promo.id !== id);
      setDraftPromos(updated);
      onUpdatePromos(updated);
    }
  };

  const handleCreatePromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromo.title || !newPromo.imageUrl) return;

    const created: PromoItem = {
      id: `promo-${Date.now()}`,
      title: newPromo.title || 'Promosi Emas',
      subtitle: newPromo.subtitle || '',
      badge: newPromo.badge || 'PROMOSI TERKINI',
      imageUrl: newPromo.imageUrl || '',
      validUntil: newPromo.validUntil || 'Sah Hari Ini',
      terms: newPromo.terms || '',
      isActive: true,
    };

    const updated = [created, ...draftPromos];
    setDraftPromos(updated);
    onUpdatePromos(updated);
    setShowAddPromo(false);
    setNewPromo({
      title: '',
      subtitle: '',
      badge: 'PROMOSI KHAS',
      imageUrl: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80',
      validUntil: '31 Disember 2026',
      terms: 'Tertakluk kepada pembelian terpilih.',
      isActive: true,
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setNewPromo((prev) => ({ ...prev, imageUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({ ...draftSettings });
    setSettingsSuccess('Tetapan kedai berjaya disimpan.');
    setTimeout(() => setSettingsSuccess(''), 3000);
  };

  const selectTab = (tab: AdminTab) => {
    setActiveTab(tab);
    setNavOpen(false);
  };

  const sidebar = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="px-1">
        <div className="flex items-center gap-3">
          <img src="/SVG/favicon.svg" alt="" aria-hidden="true" className="size-10 shrink-0 rounded-lg" />
          <div className="min-w-0">
            <img src="/SVG/company-name.svg" alt="Gold Reserve" className="h-4 w-auto max-w-full" />
            {/* Outlet name tied to the login (from kiosk_outlets) — stays fixed
                even when another outlet is selected for price editing. */}
            <p className="truncate text-[8.5px] font-semibold uppercase tracking-[0.26em] text-cream/40">
              {sessionOutletName || 'Admin'}
            </p>
          </div>
        </div>
      </div>

      <div className="gr-hairline my-6" />

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => selectTab(item.id)}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                active
                  ? 'bg-gold/10 text-gold'
                  : 'text-cream/55 hover:bg-cream/5 hover:text-cream'
              }`}
            >
              <item.icon className={`size-4 ${active ? 'text-gold' : 'text-cream/45'}`} />
              {item.label}
              {active && <span className="ml-auto size-1.5 rounded-full bg-gold" />}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto pt-6">
        <div className="gr-hairline mb-4" />
        <div className="flex items-center gap-3 rounded-lg border border-line/60 bg-maroon/30 p-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-full border border-gold/30 bg-maroon-soft/60 text-[11px] font-semibold text-gold-soft">
            {initials(sessionOutletName || 'Admin')}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-cream">{sessionOutletName || 'Admin'}</p>
            <p className="truncate text-[11px] text-cream/40">Pentadbir</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-cream/55 transition-colors hover:bg-cream/5 hover:text-cream"
        >
          <LogOut className="size-4" />
          Log keluar
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-cream-page font-sans text-maroon-deep">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line/50 bg-[linear-gradient(180deg,#3b0707,#4b0b0b)] px-5 pb-5 pt-[calc(1.25rem+env(safe-area-inset-top))] lg:flex">
        {sidebar}
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-line/40 bg-maroon-deep pt-[env(safe-area-inset-top)] lg:hidden">
          <div className="flex h-16 items-center justify-between gap-3 px-4">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setNavOpen(true)}
                aria-label="Buka navigasi"
                className="grid size-9 place-items-center rounded-lg border border-line/70 bg-maroon/30 text-cream/70 transition-colors hover:text-cream"
              >
                <Menu className="size-4" />
              </button>
              <img src="/SVG/favicon.svg" alt="" className="size-8 shrink-0 rounded-lg" />
              <img src="/SVG/company-name.svg" alt="Gold Reserve" className="h-3.5 w-auto" />
            </div>
            <div className="grid size-9 shrink-0 place-items-center rounded-full border border-gold/30 bg-maroon-soft/50 text-[11px] font-semibold text-gold-soft">
              {initials(sessionOutletName || 'Admin')}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="gr-kicker text-maroon">{page.kicker}</p>
              <h1 className="mt-2 font-heading text-[2.35rem] leading-none text-maroon-deep sm:text-[2.5rem]">
                {page.title}
              </h1>
              <p className="mt-2.5 text-sm text-maroon-deep/60">{todayLabel}</p>
            </div>
            {activeTab === 'prices' && (
              <button
                type="button"
                onClick={handleSavePrices}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-gold px-4 text-sm font-semibold text-maroon-deep shadow-[0_12px_30px_-16px_rgba(212,161,58,0.9)] transition-colors hover:bg-gold-soft"
              >
                <Save className="size-4" />
                Simpan harga
              </button>
            )}
            {activeTab === 'promos' && (
              <button
                type="button"
                onClick={() => setShowAddPromo((open) => !open)}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-gold px-4 text-sm font-semibold text-maroon-deep shadow-[0_12px_30px_-16px_rgba(212,161,58,0.9)] transition-colors hover:bg-gold-soft"
              >
                <Plus className="size-4" />
                Poster baharu
              </button>
            )}
          </div>

          <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              icon={LayoutDashboard}
              label="Emas 999"
              value={formatMYR(prices['999'].sellPrice)}
              hint={`Beli semula ${formatMYR(prices['999'].buyPrice)} • ${currentOutletName || 'outlet ini'}`}
            />
            <StatCard
              icon={Coins}
              label="Emas 916"
              value={formatMYR(prices['916'].sellPrice)}
              hint={`Beli semula ${formatMYR(prices['916'].buyPrice)} • ${currentOutletName || 'outlet ini'}`}
              accent="cream"
            />
            <StatCard
              icon={ImageIcon}
              label="Poster aktif"
              value={String(activePromoCount)}
              hint={`${draftPromos.length} poster keseluruhan`}
              accent="success"
            />
            <StatCard
              icon={History}
              label="Log harga"
              value={String(history.length)}
              hint="Rekod perubahan kaunter"
              accent="warm"
            />
          </div>

          {activeTab === 'prices' && (
            <>
              {/* STEP 1: choose which outlet/kiosk to update */}
              <section className="gr-card-light mt-6 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div className="min-w-0">
                    <p className="gr-kicker text-maroon">Langkah 1</p>
                    <p className="mt-1.5 font-heading text-xl text-maroon-deep">Pilih outlet / kiosk</p>
                    <p className="mt-1 text-sm text-maroon-deep/55">
                      Setiap outlet menyimpan harga jual dan beli semula yang berasingan.
                    </p>
                  </div>
                  <div className="w-full sm:w-80">
                    <label className={labelClass}>Outlet untuk dikemaskini</label>
                    <OutletSelect
                      outlets={outletOptions}
                      selected={currentOutletName}
                      onSelect={handleSelectOutlet}
                    />
                  </div>
                </div>
              </section>

              {/* STEP 2: edit the selected outlet's prices */}
              <section className="gr-card-light mt-4 overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/15 p-5">
                  <div className="min-w-0">
                    <p className="gr-kicker text-maroon">Langkah 2</p>
                    <p className="mt-1.5 font-heading text-xl text-maroon-deep">
                      Harga emas {currentOutletName || 'outlet ini'}
                    </p>
                    <p className="mt-1 text-sm text-maroon-deep/55">{page.description}</p>
                  </div>
                  {priceSuccessMsg && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#4f9d6e]/30 bg-[#eef8f1] px-3 py-1.5 text-xs font-semibold text-[#3f835b]">
                      <Check className="size-3.5" />
                      {priceSuccessMsg}
                    </span>
                  )}
                </div>

                <div className="space-y-5 p-5">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {(['999', '916', '375'] as GoldPurity[]).map((purity) => {
                      const item = draftPrices[purity];
                      return (
                        <article key={purity} className="rounded-xl border border-line/15 bg-[#fbf6ef] p-4">
                          <div className="flex items-center justify-between border-b border-line/15 pb-3">
                            <div>
                              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-maroon-deep/45">
                                {item.karat}
                              </p>
                              <p className="mt-1 font-heading text-xl leading-none text-maroon-deep">
                                Emas {purity}
                              </p>
                            </div>
                            <span className="rounded-md border border-gold-deep/20 bg-gold/10 px-2 py-1 text-[10px] font-semibold text-maroon">
                              {item.fineness}
                            </span>
                          </div>

                          <PriceField
                            label="Harga jual"
                            value={item.sellPrice}
                            onChange={(value) =>
                              setDraftPrices({
                                ...draftPrices,
                                [purity]: { ...item, sellPrice: value },
                              })
                            }
                          />
                          <PriceField
                            label="Beli semula"
                            value={item.buyPrice}
                            onChange={(value) =>
                              setDraftPrices({
                                ...draftPrices,
                                [purity]: { ...item, buyPrice: value },
                              })
                            }
                          />
                        </article>
                      );
                    })}
                  </div>

                  <div>
                    <label className={labelClass}>Catatan perubahan</label>
                    <input
                      type="text"
                      value={priceNote}
                      onChange={(e) => setPriceNote(e.target.value)}
                      placeholder="cth: Pelarasan harga petang mengikut pasaran"
                      className={fieldClass}
                    />
                    <p className="mt-1.5 text-[11px] text-maroon-deep/45">
                      Catatan ini disimpan dalam log sejarah.
                    </p>
                  </div>
                </div>
              </section>

              {/* Overview: current prices of every outlet */}
              <section className="gr-card-light mt-4 overflow-hidden">
                <div className="border-b border-line/15 p-5">
                  <p className="gr-kicker text-maroon">Semua outlet</p>
                  <p className="mt-1.5 font-heading text-xl text-maroon-deep">Perbandingan harga jual</p>
                  <p className="mt-1 text-sm text-maroon-deep/55">
                    Harga jual semasa setiap outlet/kiosk. Pilih mana-mana baris untuk mula mengemaskini.
                  </p>
                </div>
                <div className="divide-y divide-line/10">
                  {outletOptions.map((name) => {
                    const outletPriceMap = outletPrices[name];
                    const isActive = name === currentOutletName;
                    return (
                      <div
                        key={name}
                        className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <MapPin
                              className={`size-3.5 shrink-0 ${
                                isActive ? 'text-gold-deep' : 'text-maroon-deep/35'
                              }`}
                            />
                            <p className="truncate font-heading text-lg leading-none text-maroon-deep">
                              {name}
                            </p>
                            {isActive && (
                              <span className="rounded-full border border-gold-deep/25 bg-gold/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-maroon">
                                Dipilih
                              </span>
                            )}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {(['999', '916', '375'] as GoldPurity[]).map((purity) => (
                              <span
                                key={purity}
                                className="rounded-md border border-line/15 bg-[#fbf6ef] px-2 py-1 text-[10px] font-semibold tabular-nums text-maroon-deep/70"
                              >
                                {purity} · {formatMYR(outletPriceMap?.[purity]?.sellPrice ?? 0)}
                              </span>
                            ))}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSelectOutlet(name)}
                          disabled={isActive}
                          className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors ${
                            isActive
                              ? 'cursor-default bg-gold/15 text-maroon'
                              : 'border border-line/25 bg-[#fffdf9] text-maroon hover:border-gold-deep/40 hover:bg-gold/10'
                          }`}
                        >
                          {isActive ? (
                            <Check className="size-3.5" />
                          ) : (
                            <PencilLine className="size-3.5 text-gold-deep" />
                          )}
                          {isActive ? 'Sedang diedit' : 'Ubah harga'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          )}

          {activeTab === 'promos' && (
            <section className="gr-card-light mt-6 overflow-hidden">
              <div className="border-b border-line/15 p-5">
                <p className="gr-kicker text-maroon">Senarai poster</p>
                <p className="mt-1.5 font-heading text-xl text-maroon-deep">Promosi semasa</p>
                <p className="mt-1 text-sm text-maroon-deep/55">{page.description}</p>
              </div>

              <div className="space-y-4 p-5">
                {showAddPromo && (
                  <form
                    onSubmit={handleCreatePromo}
                    className="space-y-4 rounded-xl border border-gold-deep/25 bg-gold/[0.06] p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="flex items-center gap-2 font-heading text-lg text-maroon-deep">
                        <Sparkles className="size-4 text-gold-deep" />
                        Poster baharu
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowAddPromo(false)}
                        className="text-xs font-semibold text-maroon/70 hover:text-maroon-deep"
                      >
                        Batal
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className={labelClass}>Tajuk promosi</label>
                        <input
                          type="text"
                          required
                          placeholder="cth: Pesta Cahaya 916"
                          value={newPromo.title}
                          onChange={(e) => setNewPromo({ ...newPromo, title: e.target.value })}
                          className={fieldClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Badge</label>
                        <input
                          type="text"
                          placeholder="cth: DISKAUN 50% UPAH"
                          value={newPromo.badge}
                          onChange={(e) => setNewPromo({ ...newPromo, badge: e.target.value })}
                          className={fieldClass}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className={labelClass}>Penerangan ringkas</label>
                        <input
                          type="text"
                          placeholder="cth: Potongan upah bagi rantai leher terpilih"
                          value={newPromo.subtitle}
                          onChange={(e) => setNewPromo({ ...newPromo, subtitle: e.target.value })}
                          className={fieldClass}
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <label className={labelClass}>Gambar poster (nisbah 3:4)</label>
                        <div className="flex flex-wrap gap-2">
                          <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-line/25 bg-[#fffdf9] px-3 text-xs font-semibold text-maroon hover:border-gold-deep/40">
                            <Upload className="size-4 text-gold-deep" />
                            Muat naik
                            <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                          </label>
                          <input
                            type="url"
                            placeholder="Atau tampal URL gambar"
                            value={newPromo.imageUrl}
                            onChange={(e) => setNewPromo({ ...newPromo, imageUrl: e.target.value })}
                            className={`${fieldClass} min-w-[16rem] flex-1`}
                          />
                        </div>
                        {newPromo.imageUrl && (
                          <div className="mt-2 w-24 overflow-hidden rounded-xl border border-line/20 bg-[#fbf6ef]">
                            <img
                              src={newPromo.imageUrl}
                              alt="Pratonton poster"
                              className="aspect-[3/4] w-full object-cover"
                            />
                          </div>
                        )}
                      </div>
                      <div>
                        <label className={labelClass}>Tempoh sah sehingga</label>
                        <input
                          type="text"
                          placeholder="cth: 31 Disember 2026"
                          value={newPromo.validUntil}
                          onChange={(e) => setNewPromo({ ...newPromo, validUntil: e.target.value })}
                          className={fieldClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Terma & syarat</label>
                        <input
                          type="text"
                          placeholder="cth: Terhad kepada 50 pelanggan terawal"
                          value={newPromo.terms}
                          onChange={(e) => setNewPromo({ ...newPromo, terms: e.target.value })}
                          className={fieldClass}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="inline-flex h-10 items-center rounded-lg bg-gold px-4 text-sm font-semibold text-maroon-deep hover:bg-gold-soft"
                      >
                        Simpan poster
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-2.5">
                  {draftPromos.map((promo) => (
                    <div
                      key={promo.id}
                      className={`flex items-center justify-between gap-3 rounded-xl border border-line/15 bg-[#fbf6ef] p-3 ${
                        promo.isActive ? '' : 'opacity-60'
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <img
                          src={promo.imageUrl}
                          alt=""
                          className="aspect-[3/4] w-12 shrink-0 rounded-lg border border-line/15 object-cover"
                        />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-heading text-lg leading-none text-maroon-deep">{promo.title}</p>
                            <span className="rounded-full border border-gold-deep/25 bg-gold/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-maroon">
                              {promo.badge}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-xs text-maroon-deep/55">{promo.subtitle}</p>
                          <p className="mt-1 flex items-center gap-1 text-[10px] uppercase tracking-[0.08em] text-maroon-deep/40">
                            <Calendar className="size-3 text-gold-deep" />
                            Sah {promo.validUntil}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleTogglePromo(promo.id)}
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${
                            promo.isActive
                              ? 'border-[#4f9d6e]/30 bg-[#eef8f1] text-[#3f835b]'
                              : 'border-line/20 bg-white text-maroon-deep/50'
                          }`}
                        >
                          {promo.isActive ? 'Aktif' : 'Nyahaktif'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePromo(promo.id)}
                          className="grid size-8 place-items-center rounded-lg text-[#a34a26] hover:bg-[#fbeee9]"
                          aria-label={`Padam ${promo.title}`}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {activeTab === 'history' && (
            <section className="gr-card-light mt-6 overflow-hidden">
              <div className="border-b border-line/15 p-5">
                <p className="gr-kicker text-maroon">Rekod audit</p>
                <p className="mt-1.5 font-heading text-xl text-maroon-deep">Perubahan harga</p>
                <p className="mt-1 text-sm text-maroon-deep/55">{page.description}</p>
              </div>
              <div className="divide-y divide-line/10">
                {history.length === 0 ? (
                  <p className="p-8 text-center text-xs uppercase tracking-[0.14em] text-maroon-deep/35">
                    Tiada rekod lagi
                  </p>
                ) : (
                  history.map((entry) => {
                    const diff = entry.newSellPrice - entry.oldSellPrice;
                    return (
                      <div
                        key={entry.id}
                        className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                      >
                        <div className="min-w-0">
                          <p className="font-heading text-lg leading-none text-maroon-deep">Emas {entry.purity}</p>
                          <p className="mt-1.5 text-[11px] text-maroon-deep/45">
                            {new Date(entry.timestamp).toLocaleString('ms-MY')}
                          </p>
                          <p className="mt-1 text-xs text-maroon-deep/60">
                            {entry.adminNote || 'Pelarasan harga kaunter'}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 text-right">
                          <div>
                            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-maroon-deep/40">
                              Harga jual
                            </p>
                            <p className="mt-1 text-sm font-semibold tabular-nums text-maroon">
                              {formatMYR(entry.newSellPrice)}
                            </p>
                            <p
                              className={`mt-0.5 text-[11px] font-semibold tabular-nums ${
                                diff >= 0 ? 'text-[#3f835b]' : 'text-[#a34a26]'
                              }`}
                            >
                              {diff >= 0 ? `+${formatMYR(diff)}` : `-${formatMYR(Math.abs(diff))}`}
                            </p>
                          </div>
                          <div className="border-l border-line/15 pl-4">
                            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-maroon-deep/40">
                              Beli semula
                            </p>
                            <p className="mt-1 text-sm font-semibold tabular-nums text-maroon-deep">
                              {formatMYR(entry.newBuyPrice)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          )}

          {activeTab === 'settings' && (
            <section className="gr-card-light mt-6 overflow-hidden">
              <div className="border-b border-line/15 p-5">
                <p className="gr-kicker text-maroon">Profil kedai</p>
                <p className="mt-1.5 font-heading text-xl text-maroon-deep">Tetapan cawangan</p>
                <p className="mt-1 text-sm text-maroon-deep/55">{page.description}</p>
              </div>
              <form onSubmit={handleSaveSettings} className="max-w-xl space-y-4 p-5">
                {settingsSuccess && (
                  <div className="flex items-center gap-2 rounded-xl border border-[#4f9d6e]/25 bg-[#eef8f1] px-3 py-2.5 text-xs font-semibold text-[#3f835b]">
                    <Check className="size-4" />
                    {settingsSuccess}
                  </div>
                )}
                <div>
                  <label className={labelClass}>Nama kedai emas</label>
                  <input
                    type="text"
                    value={draftSettings.shopName}
                    onChange={(e) => setDraftSettings({ ...draftSettings, shopName: e.target.value })}
                    className={fieldClass}
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Cawangan</label>
                    <input
                      type="text"
                      value={draftSettings.branch}
                      onChange={(e) => setDraftSettings({ ...draftSettings, branch: e.target.value })}
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Telefon / WhatsApp</label>
                    <input
                      type="text"
                      value={draftSettings.phone}
                      onChange={(e) => setDraftSettings({ ...draftSettings, phone: e.target.value })}
                      className={fieldClass}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Alamat kedai</label>
                  <input
                    type="text"
                    value={draftSettings.address}
                    onChange={(e) => setDraftSettings({ ...draftSettings, address: e.target.value })}
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Slogan</label>
                  <input
                    type="text"
                    value={draftSettings.tagline}
                    onChange={(e) => setDraftSettings({ ...draftSettings, tagline: e.target.value })}
                    className={fieldClass}
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        window.confirm(
                          'Adakah anda pasti ingin memulihkan semua data harga dan promosi ke tetapan asal?',
                        )
                      ) {
                        onResetDefaults();
                        onClose();
                      }
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#a34a26] hover:text-[#7c2727]"
                  >
                    <RotateCcw className="size-3.5" />
                    Pulihkan data asal
                  </button>
                  <button
                    type="submit"
                    className="inline-flex h-10 items-center rounded-lg bg-gold px-4 text-sm font-semibold text-maroon-deep hover:bg-gold-soft"
                  >
                    Simpan tetapan
                  </button>
                </div>
              </form>
            </section>
          )}
        </main>
      </div>

      {navOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Tutup navigasi"
            className="absolute inset-0 bg-[#170303]/80 backdrop-blur-[2px]"
            onClick={() => setNavOpen(false)}
          />
          <div className="gr-drawer relative flex h-full w-[min(19rem,85vw)] flex-col border-r border-line bg-[linear-gradient(180deg,#3b0707,#4b0b0b)] px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-[calc(1.25rem+env(safe-area-inset-top))] shadow-[20px_0_60px_-20px_rgba(0,0,0,0.8)]">
            <button
              type="button"
              onClick={() => setNavOpen(false)}
              aria-label="Tutup"
              className="absolute right-4 top-4 rounded-md p-1.5 text-cream/45 hover:bg-cream/10 hover:text-cream"
            >
              <X className="size-4" />
            </button>
            {sidebar}
          </div>
        </div>
      )}
    </div>
  );
};

function PriceField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="pt-3">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label className="text-[11px] font-semibold text-maroon-deep/70">{label}</label>
        <span className="text-xs font-semibold tabular-nums text-maroon">{formatMYR(value)}</span>
      </div>
      <input
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className={`${fieldClass} font-semibold tabular-nums`}
      />
    </div>
  );
}

/**
 * Dropdown to pick which outlet/kiosk the admin is updating prices for.
 * Selecting an outlet calls `onSelect`, which reloads all outlet-scoped data.
 */
function OutletSelect({
  outlets,
  selected,
  onSelect,
}: {
  outlets: string[];
  selected: string;
  onSelect: (name: string) => void;
}) {
  const [open, setOpen] = useState<boolean>(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`${fieldClass} flex items-center justify-between gap-2 text-left`}
      >
        <span className="flex min-w-0 items-center gap-2">
          <MapPin className="size-4 shrink-0 text-gold-deep" />
          <span className="truncate">{selected || 'Pilih outlet'}</span>
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-maroon-deep/50 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Tutup senarai outlet"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            role="listbox"
            className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border border-line bg-[#fbf6ef] p-1 shadow-[0_18px_40px_-18px_rgba(59,7,7,0.55)]"
          >
            {outlets.map((name) => {
              const isActive = name === selected;
              return (
                <button
                  key={name}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => {
                    onSelect(name);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
                    isActive ? 'bg-gold/15 text-maroon' : 'text-maroon-deep hover:bg-gold/10'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <MapPin
                      className={`size-3.5 shrink-0 ${isActive ? 'text-gold-deep' : 'text-maroon-deep/40'}`}
                    />
                    <span className="truncate">{name}</span>
                  </span>
                  {isActive && <Check className="size-3.5 shrink-0 text-gold-deep" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
