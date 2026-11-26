import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Gem,
  ImageOff,
  MapPin,
  Search,
  X,
} from 'lucide-react';
import { CatalogItem } from '../types/gold';
import { formatMYR } from '../utils/calculator';

interface CatalogPageProps {
  items: CatalogItem[];
  shopName: string;
  outletName: string;
  onBack: () => void;
}

function ProductThumb({
  item,
  className = '',
}: {
  item: CatalogItem;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [item.imageUrl]);

  if (!item.imageUrl || failed) {
    return (
      <div
        className={`grid place-items-center bg-gradient-to-br from-[#fbf6ef] via-cream-page to-gold/20 text-gold-deep/45 ${className}`}
      >
        <ImageOff size={28} strokeWidth={1.4} />
      </div>
    );
  }

  return (
    <img
      src={item.imageUrl}
      alt={item.name || 'Produk jewelry'}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  );
}

/**
 * Katalog tempahan jewelry — paparan grid untuk 40+ produk.
 * Tiada borang tempahan di sini: staf mengambil butiran pembeli secara manual
 * (borang tempahan akan ditambah kemudian).
 */
export const CatalogPage: React.FC<CatalogPageProps> = ({
  items,
  shopName,
  outletName,
  onBack,
}) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Semua');
  const [selected, setSelected] = useState<CatalogItem | null>(null);

  const activeItems = useMemo(
    () => items.filter((item) => item.isActive),
    [items],
  );

  const categories = useMemo(() => {
    const unique = new Set<string>();
    for (const item of activeItems) {
      const value = item.category.trim();
      if (value) unique.add(value);
    }
    return Array.from(unique).sort((a, b) => a.localeCompare(b, 'ms'));
  }, [activeItems]);

  const filteredItems = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return activeItems.filter((item) => {
      const inCategory = category === 'Semua' || item.category === category;
      if (!inCategory) return false;
      if (!needle) return true;
      return (
        item.name.toLowerCase().includes(needle) ||
        item.category.toLowerCase().includes(needle) ||
        item.description.toLowerCase().includes(needle)
      );
    });
  }, [activeItems, category, query]);

  // Tutup modaldetail jika produk itu tidak lagi wujud / dinyahaktifkan.
  useEffect(() => {
    if (!selected) return;
    if (!activeItems.some((item) => item.id === selected.id)) setSelected(null);
  }, [activeItems, selected]);

  return (
    <section className="mx-auto w-full max-w-[1480px] animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Page header */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line/20 bg-cream px-2.5 py-1 text-[11px] font-semibold text-maroon/70 transition hover:border-gold-deep/40 hover:text-maroon-deep active:scale-95"
          >
            <ArrowLeft size={13} />
            <span>Kembali ke Papan Harga</span>
          </button>

          <div className="mt-2.5 flex items-center gap-2.5">
            <div className="grid size-10 place-items-center rounded-xl border border-gold-deep/25 bg-gold/15 text-gold-deep">
              <Gem size={20} />
            </div>
            <div>
              <h1 className="font-heading text-xl font-bold tracking-wide text-maroon-deep sm:text-2xl">
                Katalog Jewelry
              </h1>
              <p className="text-[11px] text-maroon/60 sm:text-xs">
                {shopName} · {outletName} — pilih reka bentuk dan rujuk staf kaunter untuk tempahan
              </p>
            </div>
          </div>
        </div>

        <div className="gr-card-light flex items-center gap-3 px-4 py-2.5 text-right">
          <div>
            <p className="gr-kicker-light">Jumlah Produk</p>
            <p className="font-heading text-2xl font-bold leading-none text-maroon-deep">
              {activeItems.length}
            </p>
          </div>
          <div className="grid size-9 place-items-center rounded-lg border border-gold-deep/25 bg-gold/15 text-gold-deep">
            <Gem size={17} />
          </div>
        </div>
      </div>

      {/* Search + category filters */}
      <div className="gr-card-light mb-4 flex flex-col gap-3 p-3 sm:p-4">
        <label className="relative block">
          <span className="sr-only">Cari produk</span>
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-maroon/45"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari nama, kategori atau penerangan produk…"
            className="h-10 w-full rounded-lg border border-line/20 bg-[#fbf6ef] pl-9 pr-9 text-xs text-maroon-deep placeholder:text-maroon-deep/35 focus:border-gold-deep/45 focus:outline-none focus:ring-2 focus:ring-gold/15 sm:text-sm"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Kosongkan carian"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-maroon/45 transition hover:text-maroon-deep"
            >
              <X size={15} />
            </button>
          )}
        </label>

        {categories.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {['Semua', ...categories].map((chip) => {
              const isActive = category === chip;
              return (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setCategory(chip)}
                  className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition active:scale-95 ${
                    isActive
                      ? 'border-gold-deep bg-gold text-maroon-deep shadow-[0_10px_24px_-14px_rgba(212,161,58,0.9)]'
                      : 'border-line/20 bg-cream text-maroon/70 hover:border-gold-deep/40 hover:text-maroon-deep'
                  }`}
                >
                  {chip}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Product grid */}
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
          {filteredItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelected(item)}
              className="gr-card-light group overflow-hidden rounded-xl text-left shadow-[0_16px_34px_-28px_rgba(59,7,7,0.6)] transition hover:-translate-y-0.5 hover:border-gold-deep/45 hover:shadow-[0_20px_40px_-24px_rgba(59,7,7,0.7)] active:scale-[0.99]"
            >
              <ProductThumb
                item={item}
                className="aspect-square w-full transition duration-300 group-hover:scale-[1.03]"
              />
              <div className="flex flex-col gap-1 p-2.5 sm:p-3">
                {item.category && (
                  <p className="truncate text-[9px] font-bold uppercase tracking-[0.14em] text-gold-deep">
                    {item.category}
                  </p>
                )}
                <p className="line-clamp-2 font-heading text-[13px] font-bold leading-tight text-maroon-deep sm:text-sm">
                  {item.name || 'Produk Jewelry'}
                </p>
                {item.price > 0 && (
                  <p className="text-xs font-bold tabular-nums text-gold-deep">
                    {formatMYR(item.price)}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="gr-card-light grid place-items-center gap-2 px-5 py-14 text-center">
          <Gem size={30} strokeWidth={1.3} className="text-gold-deep/60" />
          <p className="font-heading text-lg font-bold text-maroon-deep">
            {activeItems.length === 0 ? 'Katalog belum diisi' : 'Tiada produk sepadan'}
          </p>
          <p className="max-w-md text-[11px] leading-relaxed text-maroon/60 sm:text-xs">
            {activeItems.length === 0
              ? 'Admin boleh muat naik gambar produk melalui panel Tetapan › Katalog.'
              : 'Cuba kata kunci lain atau pilih kategori “Semua”.'}
          </p>
          {activeItems.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setCategory('Semua');
              }}
              className="mt-1 rounded-lg border border-gold-deep/40 bg-gold/15 px-3 py-1.5 text-[11px] font-semibold text-maroon-deep transition hover:bg-gold/25"
            >
              Paparkan semua produk
            </button>
          )}
        </div>
      )}

      {/* Detail ringkas — staf ambil butiran tempahan secara manual. */}
      {selected && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[#170303]/85 p-4 backdrop-blur-sm"
          role="presentation"
          onClick={() => setSelected(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={selected.name || 'Detail produk'}
            onClick={(event) => event.stopPropagation()}
            className="gr-card-light grid max-h-[92vh] w-full max-w-4xl grid-cols-1 overflow-hidden rounded-2xl shadow-2xl md:grid-cols-2"
          >
            <div className="bg-cream-page">
              <ProductThumb item={selected} className="max-h-[50vh] min-h-56 w-full md:h-full md:max-h-none" />
            </div>

            <div className="flex flex-col gap-3 overflow-y-auto p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {selected.category && (
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gold-deep">
                      {selected.category}
                    </p>
                  )}
                  <h2 className="mt-1 font-heading text-2xl font-bold leading-tight text-maroon-deep">
                    {selected.name || 'Produk Jewelry'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  aria-label="Tutup"
                  className="grid size-8 shrink-0 place-items-center rounded-lg border border-line/20 text-maroon/60 transition hover:border-gold-deep/40 hover:text-maroon-deep"
                >
                  <X size={16} />
                </button>
              </div>

              {selected.price > 0 && (
                <p className="font-heading text-3xl font-bold text-gold-deep">
                  {formatMYR(selected.price)}
                </p>
              )}

              {selected.description && (
                <p className="whitespace-pre-line text-[13px] leading-relaxed text-maroon/75">
                  {selected.description}
                </p>
              )}

              <div className="mt-auto rounded-xl border border-gold-deep/25 bg-gold/10 p-3">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold text-maroon-deep">
                  <MapPin size={14} className="shrink-0 text-gold-deep" />
                  {outletName}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-maroon/65">
                  Sila maklumkan kod/reka bentuk ini kepada staf kaunter untuk tempahan.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
