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
  Sparkles,
  LogOut,
  Menu,
  LayoutDashboard,
  MapPin,
  Loader2,
  Database,
  RefreshCw,
  ShieldCheck,
  ExternalLink,
  CalendarClock,
  Copy,
  type LucideIcon,
} from 'lucide-react';
import {
  GoldPriceItem,
  GoldPurity,
  PromoItem,
  PriceHistoryEntry,
} from '../types/gold';
import { formatMYR } from '../utils/calculator';
import { DEFAULT_PRICES, deletePromoImage, uploadPromoImage } from '../utils/storage';
import { isSupabaseConfigured, supabase, supabaseConfig } from '../lib/supabase';
import { isStandalonePwa } from '../utils/device';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentOutletName: string;
  /** Identiti admin yang disahkan (e-mel Supabase Auth). */
  adminLabel: string;
  availableOutlets: string[];
  outletPrices: Record<string, Record<GoldPurity, GoldPriceItem>>;
  prices: Record<GoldPurity, GoldPriceItem>;
  onUpdateAllPrices: (
    updates: { outletName: string; prices: Record<GoldPurity, GoldPriceItem> }[],
    note: string,
  ) => Promise<void>;
  promos: PromoItem[];
  onUpdatePromos: (newPromos: PromoItem[]) => Promise<void>;
  history: PriceHistoryEntry[];
  onResetDefaults: () => Promise<void>;
}

type AdminTab = 'prices' | 'promos' | 'history' | 'settings';

const PURITIES: GoldPurity[] = ['999', '916', '375'];

const PURITY_ROWS: { id: GoldPurity; label: string; karat: string }[] = [
  { id: '999', label: 'Emas 999', karat: '24K' },
  { id: '916', label: 'Emas 916', karat: '22K' },
  { id: '375', label: 'Emas 375', karat: '9K' },
];

/** Indeks lajur tetap 5 outlet seperti dalam templat reka bentuk. */
const OUTLET_SLOTS = [1, 2, 3, 4, 5] as const;

type PriceMatrix = Record<string, Record<GoldPurity, GoldPriceItem>>;
type HqBase = Record<GoldPurity, { sellPrice: number; buyPrice: number }>;

const MONTHS_MS = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogos', 'Sep', 'Okt', 'Nov', 'Dis'];

function formatKemaskiniTerakhir(iso: string | null): string {
  if (!iso) return 'Belum dikemaskini';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Belum dikemaskini';

  const time = date
    .toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit', hour12: true })
    .replace(/\s+/g, ' ')
    .toUpperCase();

  return `${date.getDate()} ${MONTHS_MS[date.getMonth()]}, ${time}`;
}

const NAV_ITEMS: { id: AdminTab; label: string; icon: LucideIcon }[] = [
  { id: 'prices', label: 'Harga', icon: Coins },
  { id: 'promos', label: 'Promosi', icon: ImageIcon },
  { id: 'history', label: 'Sejarah', icon: History },
  { id: 'settings', label: 'Tetapan', icon: SettingsIcon },
];

const PAGE_COPY: Record<AdminTab, { kicker: string; title: string; description: string }> = {
  prices: {
    kicker: 'Harga Harian',
    title: 'Tetapan Harga Emas Semasa',
    description:
      'Matriks harga jual & beli semula (RM / gram) untuk semua outlet — disegerakkan ke tablet kaunter.',
  },
  promos: {
    kicker: 'Kaunter',
    title: 'Poster Promosi',
    description:
      'Muat naik gambar poster sahaja — ia dipaparkan secara bergilir di skrin tablet kaunter.',
  },
  history: {
    kicker: 'Audit',
    title: 'Log Sejarah',
    description: 'Rekod perubahan harga jualan dan belian semula.',
  },
  settings: {
    kicker: 'Sistem',
    title: 'Tetapan',
    description:
      'Pantau sambungan Supabase, identiti pentadbir, dan penyelenggaraan data kiosk.',
  },
};

const fieldClass =
  'h-11 w-full rounded-lg border border-line/25 bg-[#fbf6ef] px-3.5 text-sm text-maroon-deep placeholder:text-maroon-deep/35 focus:border-gold-deep/45 focus:outline-none focus:ring-2 focus:ring-gold/15';

const labelClass = 'mb-1.5 block text-[11px] font-semibold text-maroon-deep/70';

/**
 * Kecilkan poster sebelum dimuat naik ke Supabase Storage.
 * Imej JPEG/WEBP kecil dikekalkan seperti asal.
 */
async function preparePromoImage(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Fail yang dipilih bukan gambar.');
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Gambar tidak dapat dibaca.'));
      img.src = objectUrl;
    });

    const maxWidth = 1080;
    const maxHeight = 1440;
    const scale = Math.min(
      1,
      maxWidth / image.naturalWidth,
      maxHeight / image.naturalHeight,
    );

    if (
      scale === 1 &&
      file.size <= 450_000 &&
      (file.type === 'image/jpeg' || file.type === 'image/webp')
    ) {
      return file;
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

    const context = canvas.getContext('2d');
    if (!context) throw new Error('Pelayar tidak menyokong pemprosesan gambar.');

    context.imageSmoothingQuality = 'high';
    // Latar putih supaya PNG lutsinar tidak menjadi hitam selepas ditukar ke JPEG.
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.82),
    );
    if (!blob) throw new Error('Gagal memproses gambar.');
    return blob;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

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
  adminLabel,
  availableOutlets,
  outletPrices,
  prices,
  onUpdateAllPrices,
  promos,
  onUpdatePromos,
  history,
  onResetDefaults,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('prices');
  const [navOpen, setNavOpen] = useState(false);

  // ---- Matriks harga harian ------------------------------------------------
  const [matrix, setMatrix] = useState<PriceMatrix>({});
  const [hqBase, setHqBase] = useState<HqBase>({
    '999': {
      sellPrice: DEFAULT_PRICES['999'].sellPrice,
      buyPrice: DEFAULT_PRICES['999'].buyPrice,
    },
    '916': {
      sellPrice: DEFAULT_PRICES['916'].sellPrice,
      buyPrice: DEFAULT_PRICES['916'].buyPrice,
    },
    '375': {
      sellPrice: DEFAULT_PRICES['375'].sellPrice,
      buyPrice: DEFAULT_PRICES['375'].buyPrice,
    },
  });
  const [matrixDirty, setMatrixDirty] = useState<boolean>(false);
  const [priceNote, setPriceNote] = useState<string>('Pelarasan harga harian');
  const [priceSuccessMsg, setPriceSuccessMsg] = useState<string>('');
  const [priceError, setPriceError] = useState<string>('');
  const [priceSaving, setPriceSaving] = useState<boolean>(false);
  const [copyNotice, setCopyNotice] = useState<string>('');

  // Sehingga 5 outlet sebenar dipetakan ke lajur 1-5. Lajur tanpa outlet
  // berdaftar dipaparkan sebagai tempat letak kosong (tidak boleh disimpan).
  const matrixOutlets = useMemo(() => {
    const names = [...availableOutlets];
    if (names.length === 0 && currentOutletName) names.push(currentOutletName);
    return Array.from(new Set(names)).slice(0, OUTLET_SLOTS.length);
  }, [availableOutlets, currentOutletName]);

  const outletSlots = useMemo(
    () =>
      OUTLET_SLOTS.map((slotNumber, index) => ({
        slotNumber,
        outletName: matrixOutlets[index] ?? null,
        isHq: index === 0,
      })),
    [matrixOutlets],
  );

  // Tandatangan data server: effect penyemai semula hanya berjalan apabila
  // outlet atau cap masa harga berubah — bukan pada setiap ketukan kekunci.
  const matrixSignature = useMemo(() => {
    const parts: string[] = [matrixOutlets.join('|'), currentOutletName ?? ''];
    for (const name of matrixOutlets) {
      const map = outletPrices[name];
      parts.push(
        `${name}:${map?.['999']?.updatedAt ?? ''}:${map?.['916']?.updatedAt ?? ''}:${
          map?.['375']?.updatedAt ?? ''
        }`,
      );
    }
    parts.push(
      `${prices['999']?.updatedAt ?? ''}:${prices['916']?.updatedAt ?? ''}:${
        prices['375']?.updatedAt ?? ''
      }`,
    );
    return parts.join('|');
  }, [matrixOutlets, currentOutletName, outletPrices, prices]);

  /** Bina semula matriks + harga asas HQ daripada data server terkini. */
  const applySeed = () => {
    const seeded: PriceMatrix = {};

    for (const name of matrixOutlets) {
      const source =
        outletPrices[name] ?? (name === currentOutletName ? prices : DEFAULT_PRICES);
      const outlet = {} as Record<GoldPurity, GoldPriceItem>;
      for (const purity of PURITIES) {
        outlet[purity] = {
          ...DEFAULT_PRICES[purity],
          ...(source?.[purity] ?? {}),
        };
      }
      seeded[name] = outlet;
    }

    const hqSource = matrixOutlets[0] ? seeded[matrixOutlets[0]] : DEFAULT_PRICES;
    setMatrix(seeded);
    setHqBase({
      '999': {
        sellPrice: hqSource['999'].sellPrice,
        buyPrice: hqSource['999'].buyPrice,
      },
      '916': {
        sellPrice: hqSource['916'].sellPrice,
        buyPrice: hqSource['916'].buyPrice,
      },
      '375': {
        sellPrice: hqSource['375'].sellPrice,
        buyPrice: hqSource['375'].buyPrice,
      },
    });
    setMatrixDirty(false);
  };

  useEffect(() => {
    applySeed();
    // Penyemai semula bergantung pada tandatangan data, bukan identiti objek.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matrixSignature]);

  const [draftPromos, setDraftPromos] = useState<PromoItem[]>(promos);
  const [showAddPromo, setShowAddPromo] = useState<boolean>(false);
  const [newPromo, setNewPromo] = useState<Partial<PromoItem>>({
    imageUrl: '',
    isActive: true,
  });
  const [promoUploading, setPromoUploading] = useState<boolean>(false);
  const [promoUploadError, setPromoUploadError] = useState<string>('');
  const [promoSaving, setPromoSaving] = useState<boolean>(false);
  const [promoError, setPromoError] = useState<string>('');
  const [promoSuccess, setPromoSuccess] = useState<string>('');

  // Supabase connection test in the settings tab.
  const [supabaseTestState, setSupabaseTestState] = useState<
    'idle' | 'testing' | 'success' | 'error'
  >('idle');
  const [supabaseTestMessage, setSupabaseTestMessage] = useState<string>('');

  // Keep promo drafts in sync with the selected outlet's stored data.
  useEffect(() => {
    setDraftPromos(promos);
  }, [promos]);

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

  const lastUpdatedLabel = useMemo(() => {
    const stamps: string[] = [];
    for (const name of matrixOutlets) {
      const map = outletPrices[name];
      for (const purity of PURITIES) {
        const stamp = map?.[purity]?.updatedAt;
        if (stamp) stamps.push(stamp);
      }
    }
    if (currentOutletName) {
      for (const purity of PURITIES) {
        const stamp = prices[purity]?.updatedAt;
        if (stamp) stamps.push(stamp);
      }
    }

    const times = stamps
      .map((stamp) => new Date(stamp).getTime())
      .filter((time) => Number.isFinite(time));

    return formatKemaskiniTerakhir(
      times.length ? new Date(Math.max(...times)).toISOString() : null,
    );
  }, [matrixOutlets, outletPrices, currentOutletName, prices]);

  if (!isOpen) return null;

  const updateCell = (
    outletName: string,
    purity: GoldPurity,
    field: 'sellPrice' | 'buyPrice',
    value: number,
  ) => {
    setMatrix((previous) => {
      const outlet = previous[outletName];
      if (!outlet) return previous;
      return {
        ...previous,
        [outletName]: {
          ...outlet,
          [purity]: { ...outlet[purity], [field]: value },
        },
      };
    });
    setMatrixDirty(true);
    setPriceError('');
    setPriceSuccessMsg('');
  };

  const updateHqBase = (
    purity: GoldPurity,
    field: 'sellPrice' | 'buyPrice',
    value: number,
  ) => {
    setHqBase((previous) => ({
      ...previous,
      [purity]: { ...previous[purity], [field]: value },
    }));
    setCopyNotice('');
  };

  const handleCopyHqToAll = () => {
    if (matrixOutlets.length === 0) {
      setPriceError('Tiada outlet berdaftar untuk disalin.');
      return;
    }

    setMatrix((previous) => {
      const next: PriceMatrix = { ...previous };
      for (const name of matrixOutlets) {
        const outlet = previous[name];
        if (!outlet) continue;
        const updated = {} as Record<GoldPurity, GoldPriceItem>;
        for (const purity of PURITIES) {
          updated[purity] = {
            ...outlet[purity],
            sellPrice: hqBase[purity].sellPrice,
            buyPrice: hqBase[purity].buyPrice,
          };
        }
        next[name] = updated;
      }
      return next;
    });

    setMatrixDirty(true);
    setPriceError('');
    setPriceSuccessMsg('');
    setCopyNotice(
      `Harga asas HQ disalin ke ${matrixOutlets.length} outlet berdaftar. Tekan "Simpan & Siarkan" untuk menerbitkan.`,
    );
    window.setTimeout(() => setCopyNotice(''), 5000);
  };

  const handleResetMatrix = () => {
    if (
      matrixDirty &&
      !window.confirm('Set semula semua perubahan harga yang belum disimpan?')
    ) {
      return;
    }
    applySeed();
    setPriceError('');
    setPriceSuccessMsg('');
    setCopyNotice('');
  };

  const handleSaveMatrix = async () => {
    if (priceSaving) return;

    const updates = matrixOutlets
      .map((outletName) => ({ outletName, prices: matrix[outletName] }))
      .filter(
        (
          entry,
        ): entry is {
          outletName: string;
          prices: Record<GoldPurity, GoldPriceItem>;
        } => Boolean(entry.prices),
      );

    if (updates.length === 0) {
      setPriceError('Tiada outlet berdaftar untuk disimpan.');
      return;
    }

    for (const { outletName, prices: outletPrice } of updates) {
      for (const purity of PURITIES) {
        const item = outletPrice[purity];
        if (!Number.isFinite(item.sellPrice) || item.sellPrice <= 0) {
          setPriceError(
            `Harga jual ${purity} di ${outletName} mesti lebih besar daripada 0.`,
          );
          return;
        }
        if (!Number.isFinite(item.buyPrice) || item.buyPrice < 0) {
          setPriceError(`Harga beli ${purity} di ${outletName} tidak sah.`);
          return;
        }
        if (item.buyPrice > item.sellPrice) {
          setPriceError(
            `Harga beli ${purity} di ${outletName} tidak boleh melebihi harga jual.`,
          );
          return;
        }
      }
    }

    setPriceSaving(true);
    setPriceError('');
    setPriceSuccessMsg('');

    try {
      await onUpdateAllPrices(updates, priceNote.trim() || 'Pelarasan harga harian');
      setMatrixDirty(false);
      setPriceSuccessMsg(
        `Harga ${updates.length} outlet berjaya disimpan & disiarkan.`,
      );
      window.setTimeout(() => setPriceSuccessMsg(''), 4500);
    } catch (error) {
      setPriceError(
        error instanceof Error ? error.message : 'Gagal menyimpan harga ke server.',
      );
    } finally {
      setPriceSaving(false);
    }
  };

  const handleTogglePromo = async (id: string) => {
    if (promoSaving) return;

    const updated = draftPromos.map((promo) =>
      promo.id === id ? { ...promo, isActive: !promo.isActive } : promo,
    );

    setPromoSaving(true);
    setPromoError('');
    try {
      await onUpdatePromos(updated);
      setDraftPromos(updated);
    } catch (error) {
      setPromoError(
        error instanceof Error ? error.message : 'Gagal mengemas kini poster.',
      );
    } finally {
      setPromoSaving(false);
    }
  };

  const handleDeletePromo = async (id: string) => {
    if (promoSaving) return;
    if (!window.confirm('Adakah anda pasti ingin memadam poster promosi ini?')) return;

    const target = draftPromos.find((promo) => promo.id === id);
    const updated = draftPromos.filter((promo) => promo.id !== id);

    setPromoSaving(true);
    setPromoError('');
    try {
      await onUpdatePromos(updated);
      setDraftPromos(updated);
      if (target?.imageUrl) {
        void deletePromoImage(target.imageUrl).catch(() => {
          // Fail storan yatim tidak menghalang pemadaman rekod.
        });
      }
    } catch (error) {
      setPromoError(
        error instanceof Error ? error.message : 'Gagal memadam poster.',
      );
    } finally {
      setPromoSaving(false);
    }
  };

  /**
   * Simpan satu poster ke server. Dipanggil terus selepas gambar dimuat naik
   * supaya tiada langkah "simpan" berasingan yang mudah terlepas pandang.
   */
  const persistPromo = async (id: string, imageUrl: string) => {
    const created: PromoItem = {
      id,
      imageUrl,
      isActive: true,
    };

    const existingIndex = draftPromos.findIndex((promo) => promo.id === id);
    // Poster pertama kekal di posisi pertama; poster baharu ditambah di hujung.
    const updated =
      existingIndex === -1
        ? [...draftPromos, created]
        : draftPromos.map((promo) => (promo.id === id ? created : promo));

    await onUpdatePromos(updated);
    setDraftPromos(updated);
    setShowAddPromo(false);
    setNewPromo({ imageUrl: '', isActive: true });
    setPromoUploadError('');
    setPromoError('');
    setPromoSuccess('Poster global berjaya disimpan dan akan muncul di semua outlet.');
    setTimeout(() => setPromoSuccess(''), 5000);
  };

  const handleDeleteAllPromos = async () => {
    if (promoSaving || draftPromos.length === 0) return;
    if (
      !window.confirm(
        `Adakah anda pasti ingin memadam SEMUA ${draftPromos.length} poster promosi? Tindakan ini tidak boleh dibatalkan.`,
      )
    ) {
      return;
    }

    const imageUrls = draftPromos
      .map((promo) => promo.imageUrl)
      .filter((url): url is string => Boolean(url));

    setPromoSaving(true);
    setPromoError('');
    setPromoSuccess('');
    try {
      await onUpdatePromos([]);
      setDraftPromos([]);
      setPromoSuccess('Semua poster promosi telah dipadam.');
      setTimeout(() => setPromoSuccess(''), 5000);

      // Padam fail gambar di Storage selepas rekod server berjaya dipadam.
      await Promise.allSettled(imageUrls.map((url) => deletePromoImage(url)));
    } catch (error) {
      setPromoError(
        error instanceof Error ? error.message : 'Gagal memadam semua poster.',
      );
    } finally {
      setPromoSaving(false);
    }
  };

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromo.imageUrl || promoSaving || promoUploading) return;

    const id = newPromo.id ?? `promo-${Date.now()}`;

    setPromoSaving(true);
    setPromoError('');
    try {
      await persistPromo(id, newPromo.imageUrl);
    } catch (error) {
      setPromoError(
        error instanceof Error ? error.message : 'Gagal menyimpan poster ke server.',
      );
    } finally {
      setPromoSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Benarkan fail yang sama dipilih semula selepas dibuang.
    e.target.value = '';
    if (!file || promoUploading || promoSaving) return;

    setPromoUploadError('');
    setPromoError('');
    setPromoSuccess('');
    setPromoUploading(true);

    try {
      const blob = await preparePromoImage(file);
      const imageUrl = await uploadPromoImage(blob);
      const id = newPromo.id ?? `promo-${Date.now()}`;

      // Simpan terus ke Supabase — bukan sekadar pratonton setempat.
      setNewPromo({ id, imageUrl, isActive: true });
      await persistPromo(id, imageUrl);
    } catch (error) {
      setPromoUploadError(
        error instanceof Error
          ? error.message
          : 'Gagal memuat naik gambar. Sila cuba lagi.',
      );
    } finally {
      setPromoUploading(false);
    }
  };

  const handleTestSupabaseConnection = async () => {
    if (supabaseTestState === 'testing') return;

    const client = supabase;
    if (!client) {
      setSupabaseTestState('error');
      setSupabaseTestMessage(
        'Supabase belum dikonfigurasi. Tetapkan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY semasa build.',
      );
      return;
    }

    setSupabaseTestState('testing');
    setSupabaseTestMessage('');

    const startedAt = performance.now();
    try {
      const { data, error } = await client.rpc('kiosk_outlet_names');
      const elapsed = Math.round(performance.now() - startedAt);

      if (error) throw new Error(error.message);

      const outletCount = Array.isArray(data) ? data.length : 0;
      setSupabaseTestState('success');
      setSupabaseTestMessage(
        `Sambungan berjaya dalam ${elapsed} ms • ${outletCount} outlet dapat dibaca.`,
      );
    } catch (error) {
      setSupabaseTestState('error');
      setSupabaseTestMessage(
        error instanceof Error
          ? `Sambungan gagal: ${error.message}`
          : 'Sambungan Supabase gagal. Sila semak konfigurasi dan rangkaian.',
      );
    }
  };

  const handleResetDefaults = async () => {
    if (
      !window.confirm(
        'Adakah anda pasti ingin memulihkan harga dan tetapan kedai ke nilai asal? Poster promosi tidak akan dipadam.',
      )
    ) {
      return;
    }

    try {
      await onResetDefaults();
      onClose();
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : 'Gagal memulihkan data asal.',
      );
    }
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
            <p className="truncate text-[8.5px] font-semibold uppercase tracking-[0.26em] text-cream/40 mt-1.5">
              {adminLabel || 'Admin'}
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
            {initials(adminLabel || 'Admin')}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-cream">{adminLabel || 'Admin'}</p>
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
              <img src="/SVG/company-name.svg" alt="Gold Reserve" className="h-4 w-auto" />
            </div>
            <div className="grid size-9 shrink-0 place-items-center rounded-full border border-gold/30 bg-maroon-soft/50 text-[11px] font-semibold text-gold-soft">
              {initials(adminLabel || 'Admin')}
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
              <div className="inline-flex items-center gap-2.5 self-start rounded-xl border border-line/25 bg-[#fbf6ef] px-4 py-2.5 sm:self-auto">
                <CalendarClock className="size-4 shrink-0 text-gold-deep" />
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-maroon-deep/45">
                    Kemaskini Terakhir
                  </p>
                  <p className="text-sm font-semibold tabular-nums text-maroon-deep">
                    {lastUpdatedLabel}
                  </p>
                </div>
              </div>
            )}
            {activeTab === 'promos' && (
              <button
                type="button"
                onClick={() => setShowAddPromo((open) => !open)}
                disabled={promoUploading || promoSaving}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-gold px-4 text-sm font-semibold text-maroon-deep shadow-[0_12px_30px_-16px_rgba(212,161,58,0.9)] transition-colors hover:bg-gold-soft disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus className="size-4" />
                Poster baharu
              </button>
            )}
          </div>

          {activeTab !== 'prices' && (
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
          )}

          {activeTab === 'prices' && (
            <>
              {/* Bahagian 1: penyelarasan pantas harga asas HQ */}
              <section className="gr-card-light mt-6 overflow-hidden">
                <div className="flex flex-col gap-3 border-b border-line/15 p-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="gr-kicker text-maroon">Penyelarasan Pantas</p>
                    <p className="mt-1.5 font-heading text-xl text-maroon-deep">
                      Harga Asas HQ
                    </p>
                    <p className="mt-1 text-sm text-maroon-deep/55">
                      Tetapkan harga rujukan HQ (RM / gram), kemudian salin ke semua
                      outlet dalam satu klik.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyHqToAll}
                    disabled={matrixOutlets.length === 0}
                    className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-gold px-4 text-sm font-semibold text-maroon-deep shadow-[0_12px_30px_-16px_rgba(212,161,58,0.9)] transition-colors hover:bg-gold-soft disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Copy className="size-4" />
                    Salin ke Semua 5 Outlet
                  </button>
                </div>

                <div className="space-y-3 p-5">
                  {PURITY_ROWS.map((row) => (
                    <div
                      key={row.id}
                      className="grid items-end gap-3 rounded-xl border border-line/15 bg-[#fbf6ef] p-3.5 sm:grid-cols-[7.5rem_1fr] lg:grid-cols-[7.5rem_1fr_1fr]"
                    >
                      <div className="sm:pt-1">
                        <p className="font-heading text-lg leading-none text-maroon-deep">
                          {row.id}
                        </p>
                        <span className="mt-1.5 inline-block rounded border border-gold-deep/20 bg-gold/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-maroon">
                          {row.karat}
                        </span>
                      </div>
                      <HqPriceControl
                        label="Jual"
                        tone="sell"
                        purity={row.id}
                        value={hqBase[row.id].sellPrice}
                        onChange={(value) => updateHqBase(row.id, 'sellPrice', value)}
                      />
                      <HqPriceControl
                        label="Beli"
                        tone="buy"
                        purity={row.id}
                        value={hqBase[row.id].buyPrice}
                        onChange={(value) => updateHqBase(row.id, 'buyPrice', value)}
                      />
                    </div>
                  ))}
                </div>

                <div className="space-y-2 border-t border-line/15 px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] text-maroon-deep/50">
                      {matrixOutlets.length} daripada 5 lajur outlet berdaftar dalam
                      Supabase.
                    </p>
                    {copyNotice && (
                      <p className="inline-flex items-center gap-1.5 rounded-full border border-[#4f9d6e]/25 bg-[#eef8f1] px-3 py-1 text-[11px] font-semibold text-[#3f835b]">
                        <Check className="size-3.5 shrink-0" />
                        {copyNotice}
                      </p>
                    )}
                  </div>
                  {matrixOutlets.length < 5 && (
                    <p className="text-[11px] leading-relaxed text-maroon-deep/40">
                      Lajur yang belum berdaftar dipaparkan sebagai tempat letak kosong.
                      Daftarkan outlet baharu dalam Supabase untuk membuka lajur
                      tambahan.
                    </p>
                  )}
                </div>
              </section>

              {/* Bahagian 2: matriks harga semua outlet */}
              <section className="gr-card-light mt-4 overflow-hidden">
                <div className="flex flex-col gap-3 border-b border-line/15 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="gr-kicker text-maroon">Matriks Harga</p>
                    <p className="mt-1.5 font-heading text-xl text-maroon-deep">
                      Harga Jual & Beli Semula
                    </p>
                    <p className="mt-1 text-sm text-maroon-deep/55">
                      Edit terus dalam sel. Setiap lajur mewakili satu outlet berdaftar.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#4f9d6e]/25 bg-[#eef8f1] px-2.5 py-1 text-[10px] font-semibold text-[#3f835b]">
                      <span className="size-1.5 rounded-full bg-[#4f9d6e]" />
                      Jual
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#c08a3e]/25 bg-[#fdf4e3] px-2.5 py-1 text-[10px] font-semibold text-[#8a5a1d]">
                      <span className="size-1.5 rounded-full bg-[#c08a3e]" />
                      Beli
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1020px] border-collapse text-left">
                    <thead>
                      <tr>
                        <th
                          scope="col"
                          className="sticky left-0 z-10 w-[10rem] border-b border-r border-line/15 bg-[#f3e8d8] px-4 py-3"
                        >
                          <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-maroon-deep/45">
                            Ketulenan
                          </span>
                        </th>
                        {outletSlots.map((slot) => (
                          <th
                            key={slot.slotNumber}
                            scope="col"
                            className="min-w-[11.5rem] border-b border-r border-line/15 bg-[#f3e8d8] px-3 py-3 last:border-r-0"
                          >
                            <span className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-maroon-deep/45">
                              Outlet {slot.slotNumber}
                              {slot.isHq && (
                                <span className="rounded bg-maroon px-1.5 py-0.5 text-[8px] font-bold tracking-[0.08em] text-gold-soft">
                                  HQ
                                </span>
                              )}
                            </span>
                            <span
                              title={slot.outletName ?? 'Belum didaftarkan'}
                              className={`mt-1 block truncate text-sm font-semibold ${
                                slot.outletName ? 'text-maroon-deep' : 'text-maroon-deep/35'
                              }`}
                            >
                              {slot.outletName ?? 'Belum didaftarkan'}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {PURITY_ROWS.map((row, rowIndex) => (
                        <tr
                          key={row.id}
                          className={rowIndex % 2 === 0 ? 'bg-white/50' : 'bg-[#fbf6ef]'}
                        >
                          <th
                            scope="row"
                            className={`sticky left-0 z-10 border-b border-r border-line/15 px-4 py-4 align-middle ${
                              rowIndex % 2 === 0 ? 'bg-[#fffdf9]' : 'bg-[#fbf6ef]'
                            }`}
                          >
                            <p className="font-heading text-base leading-tight text-maroon-deep">
                              Emas {row.id}
                            </p>
                            <span className="mt-1.5 inline-block rounded border border-gold-deep/20 bg-gold/10 px-1.5 py-0.5 text-[9px] font-semibold text-maroon">
                              {row.karat}
                            </span>
                          </th>
                          {outletSlots.map((slot) => {
                            const outletName = slot.outletName;
                            if (!outletName) {
                              return (
                                <td
                                  key={`${row.id}-${slot.slotNumber}`}
                                  className="border-b border-r border-line/15 px-3 py-3 align-top last:border-r-0"
                                >
                                  <div className="rounded-lg border border-dashed border-line/30 bg-[#fbf6ef]/70 px-3 py-4 text-center">
                                    <p className="text-[10px] font-semibold text-maroon-deep/40">
                                      Belum didaftarkan
                                    </p>
                                    <p className="mt-1 text-[9px] leading-relaxed text-maroon-deep/30">
                                      Buka lajur selepas outlet didaftarkan.
                                    </p>
                                  </div>
                                </td>
                              );
                            }

                            return (
                              <td
                                key={`${row.id}-${slot.slotNumber}`}
                                className="border-b border-r border-line/15 px-3 py-3 align-top last:border-r-0"
                              >
                                <MatrixPriceInput
                                  label="Jual"
                                  tone="sell"
                                  purity={row.id}
                                  outletName={outletName}
                                  value={matrix[outletName]?.[row.id]?.sellPrice ?? 0}
                                  onChange={(value) =>
                                    updateCell(outletName, row.id, 'sellPrice', value)
                                  }
                                />
                                <MatrixPriceInput
                                  label="Beli"
                                  tone="buy"
                                  purity={row.id}
                                  outletName={outletName}
                                  value={matrix[outletName]?.[row.id]?.buyPrice ?? 0}
                                  onChange={(value) =>
                                    updateCell(outletName, row.id, 'buyPrice', value)
                                  }
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="border-t border-line/15 p-5">
                  <label className={labelClass}>Catatan perubahan</label>
                  <input
                    type="text"
                    value={priceNote}
                    onChange={(e) => setPriceNote(e.target.value)}
                    placeholder="cth: Pelarasan harga petang mengikut pasaran"
                    className={fieldClass}
                  />
                  <p className="mt-1.5 text-[11px] text-maroon-deep/45">
                    Catatan ini disimpan dalam log sejarah setiap outlet.
                  </p>
                </div>
              </section>

              {/* Bar tindakan melekat di bawah skrin */}
              <div className="sticky bottom-0 z-20 -mx-4 mt-5 border-t border-line/25 bg-cream-page/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p
                      className={`flex items-center gap-1.5 text-xs font-semibold ${
                        matrixDirty ? 'text-[#a34a26]' : 'text-[#3f835b]'
                      }`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${
                          matrixDirty ? 'bg-[#c08a3e]' : 'bg-[#4f9d6e]'
                        }`}
                      />
                      {matrixDirty
                        ? 'Ada perubahan harga yang belum disimpan.'
                        : 'Semua harga segerak dengan server.'}
                    </p>
                    {priceError && (
                      <p
                        role="alert"
                        className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-relaxed text-rose-700"
                      >
                        <X className="mt-0.5 size-3.5 shrink-0" />
                        {priceError}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={handleResetMatrix}
                      disabled={priceSaving}
                      className="inline-flex h-10 items-center gap-2 rounded-lg border border-line/30 bg-[#fbf6ef] px-4 text-sm font-semibold text-maroon transition-colors hover:border-gold-deep/40 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <RotateCcw className="size-4" />
                      Set Semula
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSaveMatrix()}
                      disabled={priceSaving}
                      className="inline-flex h-10 items-center gap-2 rounded-lg bg-gold px-5 text-sm font-semibold text-maroon-deep shadow-[0_12px_30px_-16px_rgba(212,161,58,0.9)] transition-colors hover:bg-gold-soft disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {priceSaving ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Save className="size-4" />
                      )}
                      {priceSaving ? 'Menyimpan...' : 'Simpan & Siarkan'}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'promos' && (
            <section className="gr-card-light mt-6 overflow-hidden">
              <div className="border-b border-line/15 p-5">
                <p className="gr-kicker text-maroon">Senarai poster</p>
                <p className="mt-1.5 font-heading text-xl text-maroon-deep">Promosi semasa</p>
                <p className="mt-1 text-sm text-maroon-deep/55">{page.description}</p>
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-gold-deep/25 bg-gold/10 px-2.5 py-1 text-[11px] font-semibold text-maroon">
                  <MapPin className="size-3 text-gold-deep" />
                  Poster global — sama untuk semua outlet
                </p>
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
                        onClick={() => {
                          const unsavedUrl = newPromo.imageUrl;
                          setShowAddPromo(false);
                          setNewPromo({ imageUrl: '', isActive: true });
                          setPromoUploadError('');
                          setPromoError('');
                          if (unsavedUrl) {
                            void deletePromoImage(unsavedUrl).catch(() => {
                              // Fail storan yatim tidak menghalang pembatalan.
                            });
                          }
                        }}
                        className="text-xs font-semibold text-maroon/70 hover:text-maroon-deep"
                      >
                        Batal
                      </button>
                    </div>

                    <p className="rounded-lg bg-white/60 px-3 py-2 text-[11px] leading-relaxed text-maroon-deep/60">
                      Pilih gambar sahaja — ia akan terus dimuat naik dan disimpan ke server,
                      kemudian dipaparkan pada semua outlet.
                    </p>

                    <div>
                      {newPromo.imageUrl ? (
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                          <div className="w-36 shrink-0 overflow-hidden rounded-xl border border-line/20 bg-[#fbf6ef]">
                            <img
                              src={newPromo.imageUrl}
                              alt="Pratonton poster"
                              className="aspect-[3/4] w-full object-cover"
                            />
                          </div>
                          <div className="flex flex-col items-start gap-2">
                            <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-line/25 bg-[#fffdf9] px-3 text-xs font-semibold text-maroon hover:border-gold-deep/40">
                              <Upload className="size-4 text-gold-deep" />
                              Tukar gambar
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileUpload}
                                disabled={promoUploading}
                                className="hidden"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                setNewPromo({ imageUrl: '', isActive: true });
                                setPromoUploadError('');
                              }}
                              className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-[#a34a26] hover:bg-[#fbeee9]"
                            >
                              <Trash2 className="size-3.5" />
                              Buang gambar
                            </button>
                            <p className="text-[11px] leading-relaxed text-maroon-deep/50">
                              Gambar disimpan ke server selepas dimuat naik. Nisbah 3:4 disyorkan.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gold-deep/30 bg-[#fffdf9] px-4 py-8 text-center transition hover:border-gold-deep/55 hover:bg-gold/[0.04]">
                          {promoUploading ? (
                            <>
                              <Loader2 className="size-6 animate-spin text-gold-deep" />
                              <span className="text-sm font-semibold text-maroon-deep">
                                Memuat naik gambar...
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="grid size-11 place-items-center rounded-xl border border-gold-deep/25 bg-gold/10">
                                <Upload className="size-5 text-gold-deep" />
                              </span>
                              <span className="text-sm font-semibold text-maroon-deep">
                                Muat naik gambar poster
                              </span>
                              <span className="text-[11px] text-maroon-deep/50">
                                JPG, PNG atau WEBP · nisbah 3:4 disyorkan
                              </span>
                            </>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            disabled={promoUploading}
                            className="hidden"
                          />
                        </label>
                      )}
                      {promoUploadError && (
                        <p className="mt-2 text-xs text-[#a34a26]">{promoUploadError}</p>
                      )}
                    </div>

                    {newPromo.imageUrl && (
                      <div className="flex flex-wrap items-center justify-end gap-3 rounded-lg border border-amber-300/50 bg-amber-50 px-3 py-2">
                        <p className="mr-auto text-[11px] text-amber-800">
                          Gambar sudah dimuat naik tetapi belum tersimpan ke pangkalan data.
                        </p>
                        <button
                          type="submit"
                          disabled={!newPromo.imageUrl || promoUploading || promoSaving}
                          className="inline-flex h-9 items-center gap-2 rounded-lg bg-gold px-3 text-xs font-semibold text-maroon-deep transition-colors hover:bg-gold-soft disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {promoSaving && <Loader2 className="size-4 animate-spin" />}
                          {promoSaving ? 'Menyimpan...' : 'Cuba simpan semula'}
                        </button>
                      </div>
                    )}
                  </form>
                )}

                {promoSuccess && (
                  <div className="flex items-center gap-2 rounded-xl border border-[#4f9d6e]/25 bg-[#eef8f1] px-4 py-3 text-xs font-semibold text-[#3f835b]">
                    <Check className="size-4 shrink-0" />
                    {promoSuccess}
                  </div>
                )}

                {promoError && (
                  <div className="rounded-xl border border-rose-300/50 bg-rose-50 px-4 py-3 text-xs text-rose-800">
                    {promoError}
                  </div>
                )}

                <div className="space-y-2.5">
                  {draftPromos.map((promo, index) => (
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
                          <p className="truncate font-heading text-lg leading-none text-maroon-deep">
                            Poster {index + 1}
                          </p>
                          <p className="mt-1 text-[11px] text-maroon-deep/50">
                            Dikongsi oleh semua outlet
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleTogglePromo(promo.id)}
                          disabled={promoSaving}
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] disabled:cursor-not-allowed disabled:opacity-50 ${
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
                          disabled={promoSaving}
                          className="grid size-8 place-items-center rounded-lg text-[#a34a26] hover:bg-[#fbeee9] disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label={`Padam poster ${index + 1}`}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {draftPromos.length > 0 && (
                  <div className="flex justify-end border-t border-line/15 pt-4">
                    <button
                      type="button"
                      onClick={handleDeleteAllPromos}
                      disabled={promoSaving}
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#a34a26]/30 bg-[#fbeee9] px-3 text-xs font-semibold text-[#a34a26] transition-colors hover:bg-[#f7e2d8] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {promoSaving ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="size-3.5" />
                      )}
                      {promoSaving
                        ? 'Memadam...'
                        : `Padam semua poster (${draftPromos.length})`}
                    </button>
                  </div>
                )}
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
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <section className="gr-card-light overflow-hidden lg:col-span-2">
                <div className="border-b border-line/15 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-gold-deep/25 bg-gold/10 text-gold-deep">
                        <Database className="size-5" />
                      </span>
                      <div>
                        <p className="gr-kicker text-maroon">Sambungan</p>
                        <p className="mt-1.5 font-heading text-xl text-maroon-deep">
                          Supabase
                        </p>
                        <p className="mt-1 text-sm text-maroon-deep/55">
                          {page.description}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
                        isSupabaseConfigured
                          ? 'border-[#4f9d6e]/30 bg-[#eef8f1] text-[#3f835b]'
                          : 'border-rose-300/50 bg-rose-50 text-rose-800'
                      }`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${
                          isSupabaseConfigured ? 'bg-[#4f9d6e]' : 'bg-rose-500'
                        }`}
                      />
                      {isSupabaseConfigured ? 'Dikonfigurasi' : 'Belum dikonfigurasi'}
                    </span>
                  </div>
                </div>

                <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
                  <SettingsValue
                    label="Project URL"
                    value={supabaseConfig.url || 'Tidak ditetapkan'}
                    mono
                  />
                  <SettingsValue
                    label="Project ref"
                    value={supabaseConfig.projectRef || '—'}
                    mono
                  />
                  <SettingsValue
                    label="Anon key"
                    value={supabaseConfig.anonKeyPreview || 'Tidak ditetapkan'}
                    mono
                  />
                </div>

                <div className="flex flex-col gap-3 border-t border-line/15 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="flex items-start gap-2 text-xs leading-relaxed text-maroon-deep/55">
                    <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#3f835b]" />
                    Hanya kunci anon awam digunakan oleh klien. Jangan masukkan
                    kunci service_role ke dalam aplikasi.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {supabaseConfig.projectRef && (
                      <a
                        href={`https://supabase.com/dashboard/project/${supabaseConfig.projectRef}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-10 items-center gap-2 rounded-lg border border-line/25 bg-[#fbf6ef] px-4 text-xs font-semibold text-maroon-deep/75 transition-colors hover:border-gold-deep/35 hover:bg-white"
                      >
                        <ExternalLink className="size-3.5" />
                        Dashboard
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => void handleTestSupabaseConnection()}
                      disabled={supabaseTestState === 'testing' || !isSupabaseConfigured}
                      className="inline-flex h-10 items-center gap-2 rounded-lg bg-gold px-4 text-xs font-semibold text-maroon-deep transition-colors hover:bg-gold-soft disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {supabaseTestState === 'testing' ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="size-3.5" />
                      )}
                      {supabaseTestState === 'testing'
                        ? 'Menguji...'
                        : 'Uji sambungan'}
                    </button>
                  </div>
                </div>

                {supabaseTestMessage && (
                  <div
                    className={`mx-5 mb-5 flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs ${
                      supabaseTestState === 'success'
                        ? 'border-[#4f9d6e]/25 bg-[#eef8f1] font-semibold text-[#3f835b]'
                        : 'border-rose-300/50 bg-rose-50 text-rose-800'
                    }`}
                  >
                    {supabaseTestState === 'success' ? (
                      <Check className="mt-0.5 size-4 shrink-0" />
                    ) : (
                      <X className="mt-0.5 size-4 shrink-0" />
                    )}
                    <span>{supabaseTestMessage}</span>
                  </div>
                )}
              </section>

              <section className="gr-card-light p-5">
                <p className="gr-kicker text-maroon">Sesi</p>
                <p className="mt-1.5 font-heading text-xl text-maroon-deep">
                  Identiti & outlet
                </p>
                <dl className="mt-4 space-y-3">
                  <SettingsRow label="Pentadbir" value={adminLabel || 'Admin'} />
                  <SettingsRow
                    label="Outlet aktif"
                    value={currentOutletName || 'Belum dipilih'}
                  />
                  <SettingsRow
                    label="Outlet tersedia"
                    value={`${availableOutlets.length} outlet`}
                  />
                  <SettingsRow
                    label="Mod paparan"
                    value={isStandalonePwa() ? 'PWA standalone' : 'Pelayar web'}
                  />
                  <SettingsRow
                    label="Segerak masa nyata"
                    value={isSupabaseConfigured ? 'Aktif' : 'Tidak aktif'}
                  />
                  <SettingsRow label="Penyegaran harga" value="Setiap 60 saat" />
                </dl>
              </section>

              <section className="gr-card-light p-5">
                <p className="gr-kicker text-maroon">Penyelenggaraan</p>
                <p className="mt-1.5 font-heading text-xl text-maroon-deep">
                  Data & aplikasi
                </p>
                <p className="mt-2 text-sm leading-relaxed text-maroon-deep/55">
                  Harga, poster dan tetapan dibaca terus daripada Supabase.
                  Pulihkan data asal atau muat semula aplikasi selepas
                  konfigurasi berubah.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleResetDefaults()}
                    className="inline-flex h-10 items-center gap-2 rounded-lg border border-line/25 bg-[#fbf6ef] px-4 text-xs font-semibold text-[#a34a26] transition-colors hover:border-[#a34a26]/40 hover:bg-white"
                  >
                    <RotateCcw className="size-3.5" />
                    Pulihkan data asal
                  </button>
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="inline-flex h-10 items-center gap-2 rounded-lg border border-line/25 bg-[#fbf6ef] px-4 text-xs font-semibold text-maroon-deep/75 transition-colors hover:border-gold-deep/35 hover:bg-white"
                  >
                    <RefreshCw className="size-3.5" />
                    Muat semula aplikasi
                  </button>
                </div>
              </section>
            </div>
          )}
        </main>
      </div>

      {priceSuccessMsg && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-24 right-4 z-[60] flex max-w-[min(22rem,calc(100vw-2rem))] items-start gap-2.5 rounded-xl border border-[#4f9d6e]/30 bg-[#eef8f1] px-4 py-3 shadow-[0_20px_45px_-20px_rgba(59,7,7,0.45)] sm:right-6"
        >
          <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-[#4f9d6e] text-white">
            <Check className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#2f6b47]">{priceSuccessMsg}</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-[#3f835b]/85">
              Perubahan harga telah disiarkan ke tablet semua outlet.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPriceSuccessMsg('')}
            aria-label="Tutup pemberitahuan"
            className="ml-1 rounded p-0.5 text-[#3f835b]/60 transition-colors hover:text-[#2f6b47]"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

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

function SettingsValue({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-line/15 bg-[#fbf6ef] px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-maroon-deep/45">
        {label}
      </p>
      <p
        title={value}
        className={`mt-1 break-all text-maroon-deep ${
          mono ? 'font-mono text-xs leading-relaxed' : 'text-sm font-semibold'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function SettingsRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line/10 pb-3 last:border-0 last:pb-0">
      <dt className="shrink-0 text-xs text-maroon-deep/55">{label}</dt>
      <dd className="min-w-0 break-words text-right text-sm font-semibold text-maroon-deep">
        {value}
      </dd>
    </div>
  );
}

function HqPriceControl({
  label,
  tone,
  purity,
  value,
  onChange,
}: {
  label: string;
  tone: 'sell' | 'buy';
  purity: GoldPurity;
  value: number;
  onChange: (value: number) => void;
}) {
  const isSell = tone === 'sell';

  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex items-center gap-2">
        <span
          className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] ${
            isSell
              ? 'bg-[#e4f3e9] text-[#2f6b47]'
              : 'bg-[#fbefd8] text-[#8a5a1d]'
          }`}
        >
          {label}
        </span>
        <span className="text-[10px] font-medium text-maroon-deep/40">RM / gram</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-maroon-deep/35">
            RM
          </span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={value === 0 ? '' : value}
            placeholder="0.00"
            onChange={(e) => {
              const parsed = Number.parseFloat(e.target.value);
              onChange(Number.isFinite(parsed) ? Math.max(0, parsed) : 0);
            }}
            aria-label={`Harga ${label} emas ${purity}`}
            className={`h-10 w-full rounded-lg border pl-8 pr-2.5 text-sm font-semibold tabular-nums text-maroon-deep placeholder:font-normal placeholder:text-maroon-deep/30 focus:outline-none focus:ring-2 ${
              isSell
                ? 'border-[#4f9d6e]/25 bg-[#f4faf6] focus:border-[#4f9d6e]/50 focus:ring-[#4f9d6e]/15'
                : 'border-[#c08a3e]/25 bg-[#fdf8ee] focus:border-[#c08a3e]/50 focus:ring-[#c08a3e]/15'
            }`}
          />
        </div>
        <button
          type="button"
          onClick={() => onChange(Math.max(0, Number((value - 1).toFixed(2))))}
          aria-label={`Tolak RM1 ${label} emas ${purity}`}
          className="grid size-9 shrink-0 place-items-center rounded-lg border border-line/25 bg-white text-[11px] font-bold text-maroon-deep/70 transition-colors hover:border-maroon/30 hover:bg-[#fbf6ef]"
        >
          -1
        </button>
        <button
          type="button"
          onClick={() => onChange(Number((value + 1).toFixed(2)))}
          aria-label={`Tambah RM1 ${label} emas ${purity}`}
          className="grid size-9 shrink-0 place-items-center rounded-lg border border-line/25 bg-white text-[11px] font-bold text-maroon-deep/70 transition-colors hover:border-maroon/30 hover:bg-[#fbf6ef]"
        >
          +1
        </button>
      </div>
    </div>
  );
}

function MatrixPriceInput({
  label,
  tone,
  purity,
  outletName,
  value,
  onChange,
}: {
  label: string;
  tone: 'sell' | 'buy';
  purity: GoldPurity;
  outletName: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const isSell = tone === 'sell';

  return (
    <div className="px-0.5 py-1 first:pt-0 last:pb-0">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span
          className={`rounded px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-[0.12em] ${
            isSell
              ? 'bg-[#e4f3e9] text-[#2f6b47]'
              : 'bg-[#fbefd8] text-[#8a5a1d]'
          }`}
        >
          {label}
        </span>
        <span className="text-[10px] font-semibold tabular-nums text-maroon-deep/40">
          RM
        </span>
      </div>
      <input
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        value={value === 0 ? '' : value}
        placeholder="0.00"
        onChange={(e) => {
          const parsed = Number.parseFloat(e.target.value);
          onChange(Number.isFinite(parsed) ? Math.max(0, parsed) : 0);
        }}
        aria-label={`Harga ${label} emas ${purity} di ${outletName}`}
        className={`h-9 w-full rounded-lg border px-2.5 text-sm font-semibold tabular-nums text-maroon-deep placeholder:font-normal placeholder:text-maroon-deep/30 focus:outline-none focus:ring-2 ${
          isSell
            ? 'border-[#4f9d6e]/20 bg-[#f4faf6] focus:border-[#4f9d6e]/45 focus:ring-[#4f9d6e]/15'
            : 'border-[#c08a3e]/20 bg-[#fdf8ee] focus:border-[#c08a3e]/45 focus:ring-[#c08a3e]/15'
        }`}
      />
    </div>
  );
}
