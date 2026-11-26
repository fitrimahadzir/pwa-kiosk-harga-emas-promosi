import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Image as ImageIcon,
  Layers3,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { CatalogItem } from '../types/gold';
import { formatMYR } from '../utils/calculator';
import {
  deleteCatalogImage,
  uploadCatalogImage,
} from '../utils/storage';
import {
  prepareCatalogImage,
  productNameFromFileName,
} from '../utils/image';

interface CatalogAdminProps {
  items: CatalogItem[];
  /** Tulis senarai penuh katalog ke Supabase (admin sahaja). */
  onUpdateItems: (items: CatalogItem[]) => Promise<void>;
}

type CatalogForm = {
  id: string | null;
  name: string;
  category: string;
  description: string;
  priceInput: string;
  imageUrl: string;
  isActive: boolean;
};

const emptyForm = (): CatalogForm => ({
  id: null,
  name: '',
  category: '',
  description: '',
  priceInput: '',
  imageUrl: '',
  isActive: true,
});

const inputClass =
  'h-10 w-full rounded-lg border border-line/25 bg-[#fffdf9] px-3 text-xs text-maroon-deep placeholder:text-maroon-deep/35 focus:border-gold-deep focus:outline-none';

/**
 * Panel pentadbir katalog jewelry:
 *   - tambah/edit SATU produk dengan butiran lengkap
 *   - muat naik BERBILANG gambar sekali gus (nama diambil dari nama fail)
 *
 * Gambar terus dimuat naik ke bucket Supabase `jewelry-catalog`; rekod katalog
 * disimpan selepas admin menekan butang simpan.
 */
export const CatalogAdmin: React.FC<CatalogAdminProps> = ({ items, onUpdateItems }) => {
  const [localItems, setLocalItems] = useState<CatalogItem[]>(items);
  const [form, setForm] = useState<CatalogForm>(emptyForm);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [stagedImageUrl, setStagedImageUrl] = useState<string | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [bulkFiles, setBulkFiles] = useState<File[]>([]);
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState('');
  const [bulkError, setBulkError] = useState('');
  const [bulkSuccess, setBulkSuccess] = useState('');

  const [listQuery, setListQuery] = useState('');

  useEffect(() => setLocalItems(items), [items]);

  // Padam gambar yang dimuat naik tetapi belum disimpan jika admin
  // meninggalkan tab katalog tanpa menekan "Simpan".
  const stagedRef = useRef<string | null>(null);
  useEffect(() => {
    stagedRef.current = stagedImageUrl;
  }, [stagedImageUrl]);
  useEffect(
    () => () => {
      if (stagedRef.current) {
        void deleteCatalogImage(stagedRef.current).catch(() => {});
      }
    },
    [],
  );

  const busy = uploading || saving || bulkUploading;

  const filteredItems = useMemo(() => {
    const needle = listQuery.trim().toLowerCase();
    if (!needle) return localItems;
    return localItems.filter(
      (item) =>
        item.name.toLowerCase().includes(needle) ||
        item.category.toLowerCase().includes(needle),
    );
  }, [listQuery, localItems]);

  const activeCount = localItems.filter((item) => item.isActive).length;

  const persist = async (next: CatalogItem[], message: string): Promise<boolean> => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await onUpdateItems(next);
      setLocalItems(next);
      setSuccess(message);
      window.setTimeout(() => setSuccess(''), 5000);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal menyimpan katalog.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setForm(emptyForm());
    setUploadedFileName('');
    setStagedImageUrl(null);
    setOriginalImageUrl(null);
  };

  const handleSingleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Benarkan fail yang sama dipilih semula selepas dibuang.
    event.target.value = '';
    if (!file || busy) return;

    setUploading(true);
    setError('');
    setSuccess('');
    try {
      const blob = await prepareCatalogImage(file);
      const imageUrl = await uploadCatalogImage(blob);

      if (stagedImageUrl && stagedImageUrl !== imageUrl) {
        void deleteCatalogImage(stagedImageUrl).catch(() => {});
      }

      setForm((previous) => ({
        ...previous,
        imageUrl,
        name: previous.name.trim() || productNameFromFileName(file.name),
      }));
      setUploadedFileName(file.name);
      setStagedImageUrl(imageUrl);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Gagal memuat naik gambar produk.',
      );
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProduct = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;

    const name = form.name.trim() || productNameFromFileName(uploadedFileName);
    if (!form.imageUrl) {
      setError('Sila muat naik gambar produk dahulu.');
      return;
    }
    if (!name || name === 'Produk Jewelry') {
      setError('Sila isikan nama produk.');
      return;
    }

    const item: CatalogItem = {
      id: form.id ?? `catalog-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      category: form.category.trim(),
      description: form.description.trim(),
      price: Math.max(0, Number(form.priceInput) || 0),
      imageUrl: form.imageUrl,
      isActive: form.isActive,
    };

    const exists = localItems.some((entry) => entry.id === item.id);
    const next = exists
      ? localItems.map((entry) => (entry.id === item.id ? item : entry))
      : [...localItems, item];
    const wasEditing = exists;
    const replacedImageUrl =
      originalImageUrl && originalImageUrl !== item.imageUrl ? originalImageUrl : null;

    const ok = await persist(
      next,
      wasEditing
        ? 'Butiran produk berjaya dikemas kini.'
        : 'Produk berjaya ditambah ke katalog.',
    );
    if (!ok) return;

    if (replacedImageUrl) {
      void deleteCatalogImage(replacedImageUrl).catch(() => {});
    }
    resetForm();
  };

  const handleEditProduct = (item: CatalogItem) => {
    if (stagedImageUrl && stagedImageUrl !== item.imageUrl) {
      void deleteCatalogImage(stagedImageUrl).catch(() => {});
    }
    setForm({
      id: item.id,
      name: item.name,
      category: item.category,
      description: item.description,
      priceInput: item.price > 0 ? String(item.price) : '',
      imageUrl: item.imageUrl,
      isActive: item.isActive,
    });
    setUploadedFileName('');
    setStagedImageUrl(null);
    setOriginalImageUrl(item.imageUrl || null);
    setError('');
    setSuccess('');
  };

  const handleCancelEdit = () => {
    if (stagedImageUrl) {
      void deleteCatalogImage(stagedImageUrl).catch(() => {});
    }
    resetForm();
    setError('');
    setSuccess('');
  };

  const handleToggleProduct = async (item: CatalogItem) => {
    if (busy) return;
    const next = localItems.map((entry) =>
      entry.id === item.id ? { ...entry, isActive: !entry.isActive } : entry,
    );
    await persist(next, item.isActive ? 'Produk dinyahaktifkan.' : 'Produk diaktifkan.');
  };

  const handleDeleteProduct = async (item: CatalogItem) => {
    if (busy) return;
    if (!window.confirm(`Padam produk “${item.name || 'tanpa nama'}” dari katalog?`)) {
      return;
    }

    const next = localItems.filter((entry) => entry.id !== item.id);
    const ok = await persist(next, 'Produk berjaya dipadam.');
    if (!ok) return;

    if (item.imageUrl) {
      void deleteCatalogImage(item.imageUrl).catch(() => {});
    }
    if (form.id === item.id) resetForm();
  };

  const handleBulkFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0 || busy) return;
    setBulkFiles(files);
    setBulkError('');
    setBulkSuccess('');
  };

  /** Muat naik semua fail yang dipilih, kemudian simpan satu kumpulan rekod. */
  const handleBulkUpload = async () => {
    if (bulkFiles.length === 0 || busy) return;

    setBulkUploading(true);
    setBulkError('');
    setBulkSuccess('');
    setError('');

    const uploadedUrls: string[] = [];
    const created: CatalogItem[] = [];
    const failed: string[] = [];

    for (let index = 0; index < bulkFiles.length; index += 1) {
      const file = bulkFiles[index];
      setBulkProgress(`${index + 1} / ${bulkFiles.length}`);
      try {
        const blob = await prepareCatalogImage(file);
        const imageUrl = await uploadCatalogImage(blob);
        uploadedUrls.push(imageUrl);
        created.push({
          id: `catalog-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
          name: productNameFromFileName(file.name),
          category: bulkCategory.trim(),
          description: '',
          price: 0,
          imageUrl,
          isActive: true,
        });
      } catch (cause) {
        failed.push(
          `${file.name}: ${cause instanceof Error ? cause.message : 'gagal dimuat naik'}`,
        );
      }
    }

    if (created.length === 0) {
      await Promise.allSettled(uploadedUrls.map((url) => deleteCatalogImage(url)));
      setBulkError(
        `Tiada gambar berjaya dimuat naik. ${failed.slice(0, 3).join(' | ')}`,
      );
      setBulkUploading(false);
      setBulkProgress('');
      return;
    }

    const next = [...localItems, ...created];
    setSaving(true);
    try {
      await onUpdateItems(next);
      setLocalItems(next);
      setBulkFiles([]);
      setBulkSuccess(
        `${created.length} produk berjaya ditambah ke katalog.${
          failed.length > 0
            ? ` ${failed.length} gagal — boleh cuba semula.`
            : ' Nama diambil dari nama fail; edit butiran di senarai bawah.'
        }`,
      );
      if (failed.length > 0) setBulkError(failed.slice(0, 3).join(' | '));
      window.setTimeout(() => setBulkSuccess(''), 8000);
    } catch (cause) {
      // Rekod gagal disimpan — padam gambar yang sudah dimuat naik supaya
      // bucket tidak dipenuhi fail yatim.
      await Promise.allSettled(uploadedUrls.map((url) => deleteCatalogImage(url)));
      setBulkError(
        cause instanceof Error ? cause.message : 'Gagal menyimpan produk ke katalog.',
      );
    } finally {
      setSaving(false);
      setBulkUploading(false);
      setBulkProgress('');
    }
  };

  return (
    <div className="mt-6 grid gap-4">
      {/* 1. Tambah / edit satu produk */}
      <section className="gr-card-light overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line/15 p-5">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-gold-deep/25 bg-gold/10 text-gold-deep">
              {form.id ? <Pencil className="size-5" /> : <Plus className="size-5" />}
            </span>
            <div>
              <p className="gr-kicker text-maroon">Satu Produk</p>
              <p className="mt-1.5 font-heading text-xl text-maroon-deep">
                {form.id ? 'Edit Produk' : 'Tambah Produk Baharu'}
              </p>
              <p className="mt-1 text-sm text-maroon-deep/55">
                Muat naik satu gambar dengan nama, kategori, penerangan dan harga rujukan.
              </p>
            </div>
          </div>
          {form.id && (
            <button
              type="button"
              onClick={handleCancelEdit}
              disabled={busy}
              className="rounded-lg border border-line/25 px-3 py-2 text-xs font-semibold text-maroon/65 transition hover:border-gold-deep/40 hover:text-maroon-deep disabled:opacity-50"
            >
              Batal edit
            </button>
          )}
        </div>

        <form onSubmit={handleSaveProduct} className="grid gap-4 p-5 lg:grid-cols-[220px_1fr]">
          <div>
            <label
              className={`flex min-h-44 cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-dashed border-line/30 bg-[#fbf6ef] p-3 text-center transition hover:border-gold-deep/50 ${
                busy ? 'cursor-not-allowed opacity-60' : ''
              }`}
            >
              {form.imageUrl ? (
                <img
                  src={form.imageUrl}
                  alt="Pratonton produk"
                  className="aspect-square w-full rounded-lg border border-line/15 object-cover"
                />
              ) : (
                <>
                  <span className="grid size-11 place-items-center rounded-xl border border-gold-deep/25 bg-gold/10">
                    {uploading ? (
                      <Loader2 className="size-5 animate-spin text-gold-deep" />
                    ) : (
                      <Upload className="size-5 text-gold-deep" />
                    )}
                  </span>
                  <span className="text-sm font-semibold text-maroon-deep">
                    {uploading ? 'Memuat naik…' : 'Muat naik gambar'}
                  </span>
                  <span className="text-[11px] text-maroon-deep/50">
                    JPG, PNG atau WEBP · {"<= 5 MB"}
                  </span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleSingleUpload}
                disabled={busy}
                className="hidden"
              />
            </label>
            {stagedImageUrl && (
              <p className="mt-2 text-[10px] leading-relaxed text-amber-800">
                Gambar sudah di Storage — tekan “Simpan Produk” untuk rekod katalog.
              </p>
            )}
          </div>

          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-maroon/70">
                  Nama produk <span className="text-[#a34a26]">*</span>
                </span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) =>
                    setForm((previous) => ({ ...previous, name: event.target.value }))
                  }
                  placeholder="Contoh: Cincin Emas 916 Batu Ruby"
                  disabled={busy}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-maroon/70">
                  Kategori / koleksi
                </span>
                <input
                  type="text"
                  value={form.category}
                  onChange={(event) =>
                    setForm((previous) => ({ ...previous, category: event.target.value }))
                  }
                  placeholder="Cincin, Rantai, Gelang…"
                  disabled={busy}
                  className={inputClass}
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold text-maroon/70">
                Penerangan ringkas
              </span>
              <textarea
                rows={2}
                value={form.description}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, description: event.target.value }))
                }
                placeholder="Berat, kod reka bentuk, atau maklumat untuk staf kaunter…"
                disabled={busy}
                className="w-full resize-y rounded-lg border border-line/25 bg-[#fffdf9] px-3 py-2 text-xs leading-relaxed text-maroon-deep placeholder:text-maroon-deep/35 focus:border-gold-deep focus:outline-none"
              />
            </label>

            <div className="flex flex-wrap items-end gap-4">
              <label className="block w-full sm:w-48">
                <span className="mb-1 block text-[11px] font-semibold text-maroon/70">
                  Harga rujukan (RM)
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={form.priceInput}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      priceInput: event.target.value,
                    }))
                  }
                  placeholder="0.00"
                  disabled={busy}
                  className={inputClass}
                />
              </label>
              <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-line/25 bg-[#fffdf9] px-3 text-xs font-semibold text-maroon-deep">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) =>
                    setForm((previous) => ({ ...previous, isActive: event.target.checked }))
                  }
                  disabled={busy}
                  className="size-3.5 accent-[#8a5f14]"
                />
                Papar di katalog
              </label>
              <button
                type="submit"
                disabled={!form.imageUrl || busy}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-gold px-4 text-xs font-semibold text-maroon-deep shadow-[0_12px_30px_-16px_rgba(212,161,58,0.9)] transition hover:bg-gold-soft disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
                {saving ? 'Menyimpan…' : form.id ? 'Simpan Perubahan' : 'Simpan Produk'}
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* 2. Muat naik berkumpulan */}
      <section className="gr-card-light overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line/15 p-5">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-gold-deep/25 bg-gold/10 text-gold-deep">
              <Layers3 className="size-5" />
            </span>
            <div>
              <p className="gr-kicker text-maroon">Muat Naik Pantas</p>
              <p className="mt-1.5 font-heading text-xl text-maroon-deep">
                Berbilang Gambar Sekali
              </p>
              <p className="mt-1 text-sm text-maroon-deep/55">
                Sesuai untuk 40+ produk — satu produk dicipta bagi setiap gambar.
                Nama produk diambil dari nama fail dan boleh diedit kemudian.
              </p>
            </div>
          </div>
          {bulkFiles.length > 0 && !bulkUploading && (
            <button
              type="button"
              onClick={() => {
                setBulkFiles([]);
                setBulkError('');
                setBulkSuccess('');
              }}
              className="rounded-lg border border-line/25 px-3 py-2 text-xs font-semibold text-maroon/65 transition hover:border-gold-deep/40 hover:text-maroon-deep"
            >
              Kosongkan ({bulkFiles.length})
            </button>
          )}
        </div>

        <div className="grid gap-4 p-5 lg:grid-cols-[1fr_240px]">
          <div className="space-y-3">
            <label
              className={`flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line/30 bg-[#fbf6ef] p-4 text-center transition hover:border-gold-deep/50 ${
                busy ? 'cursor-not-allowed opacity-60' : ''
              }`}
            >
              <span className="grid size-11 place-items-center rounded-xl border border-gold-deep/25 bg-gold/10">
                {bulkUploading ? (
                  <Loader2 className="size-5 animate-spin text-gold-deep" />
                ) : (
                  <ImageIcon className="size-5 text-gold-deep" />
                )}
              </span>
              <span className="text-sm font-semibold text-maroon-deep">
                {bulkUploading
                  ? `Memuat naik ${bulkProgress}…`
                  : bulkFiles.length > 0
                    ? `${bulkFiles.length} gambar dipilih`
                    : 'Pilih berbilang gambar produk'}
              </span>
              <span className="text-[11px] text-maroon-deep/50">
                Tahan Ctrl / Shift untuk pilih banyak fail · JPG, PNG atau WEBP
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleBulkFiles}
                disabled={busy}
                className="hidden"
              />
            </label>

            {bulkFiles.length > 0 && (
              <div className="max-h-24 space-y-1 overflow-y-auto rounded-lg border border-line/15 bg-white/60 p-2">
                {bulkFiles.slice(0, 60).map((file, index) => (
                  <p key={`${file.name}-${index}`} className="truncate text-[10px] text-maroon/60">
                    {index + 1}. {file.name}
                  </p>
                ))}
                {bulkFiles.length > 60 && (
                  <p className="text-[10px] text-maroon/45">
                    … dan {bulkFiles.length - 60} lagi
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold text-maroon/70">
                Kategori untuk semua gambar ini
              </span>
              <input
                type="text"
                value={bulkCategory}
                onChange={(event) => setBulkCategory(event.target.value)}
                placeholder="Contoh: Cincin"
                disabled={busy}
                className={inputClass}
              />
            </label>
            <button
              type="button"
              onClick={() => void handleBulkUpload()}
              disabled={bulkFiles.length === 0 || busy}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-gold px-4 text-xs font-semibold text-maroon-deep shadow-[0_12px_30px_-16px_rgba(212,161,58,0.9)] transition hover:bg-gold-soft disabled:cursor-not-allowed disabled:opacity-50"
            >
              {bulkUploading || saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              {bulkUploading || saving
                ? 'Menyimpan…'
                : `Muat naik & simpan (${bulkFiles.length})`}
            </button>
            <p className="text-[10px] leading-relaxed text-maroon-deep/50">
              Gambar dimuat naik ke bucket <code>jewelry-catalog</code> di Supabase Storage.
            </p>
          </div>
        </div>

        {bulkSuccess && (
          <div className="mx-5 mb-4 flex items-center gap-2 rounded-xl border border-[#4f9d6e]/25 bg-[#eef8f1] px-4 py-3 text-xs font-semibold text-[#3f835b]">
            <Check className="size-4 shrink-0" />
            {bulkSuccess}
          </div>
        )}
        {bulkError && (
          <div className="mx-5 mb-4 rounded-xl border border-rose-300/50 bg-rose-50 px-4 py-3 text-xs text-rose-800">
            {bulkError}
          </div>
        )}
      </section>

      {error && (
        <div className="rounded-xl border border-rose-300/50 bg-rose-50 px-4 py-3 text-xs text-rose-800">
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-[#4f9d6e]/25 bg-[#eef8f1] px-4 py-3 text-xs font-semibold text-[#3f835b]">
          <Check className="size-4 shrink-0" />
          {success}
        </div>
      )}

      {/* 3. Senarai produk */}
      <section className="gr-card-light overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/15 p-5">
          <div>
            <p className="gr-kicker text-maroon">Katalog Global</p>
            <p className="mt-1.5 font-heading text-xl text-maroon-deep">
              Senarai Produk ({localItems.length})
            </p>
            <p className="mt-1 text-[11px] text-maroon-deep/55">
              {activeCount} aktif · dikongsi oleh semua outlet
            </p>
          </div>
          <label className="relative block w-full max-w-xs">
            <span className="sr-only">Cari produk</span>
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-maroon/45"
            />
            <input
              type="search"
              value={listQuery}
              onChange={(event) => setListQuery(event.target.value)}
              placeholder="Cari nama / kategori…"
              className="h-9 w-full rounded-lg border border-line/25 bg-[#fffdf9] pl-9 pr-3 text-xs text-maroon-deep placeholder:text-maroon-deep/35 focus:border-gold-deep focus:outline-none"
            />
          </label>
        </div>

        <div className="max-h-[540px] space-y-2.5 overflow-y-auto p-5">
          {filteredItems.length === 0 ? (
            <p className="py-10 text-center text-xs text-maroon-deep/50">
              {localItems.length === 0
                ? 'Belum ada produk. Muat naik gambar di atas untuk mula.'
                : 'Tiada produk sepadan dengan carian.'}
            </p>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                className={`flex items-center justify-between gap-3 rounded-xl border border-line/15 bg-[#fbf6ef] p-3 ${
                  item.isActive ? '' : 'opacity-60'
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="size-12 shrink-0 rounded-lg border border-line/15 object-cover"
                    />
                  ) : (
                    <span className="grid size-12 shrink-0 place-items-center rounded-lg border border-line/15 bg-white/60 text-maroon/40">
                      <ImageIcon className="size-5" />
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-heading text-base leading-none text-maroon-deep">
                      {item.name || 'Produk tanpa nama'}
                    </p>
                    <p className="mt-1 truncate text-[11px] text-maroon-deep/50">
                      {[item.category || 'Tanpa kategori', item.price > 0 ? formatMYR(item.price) : 'Harga tidak dipaparkan'].join(' · ')}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleEditProduct(item)}
                    disabled={busy}
                    aria-label={`Edit ${item.name}`}
                    title="Edit butiran produk"
                    className="grid size-8 place-items-center rounded-lg text-maroon/60 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleToggleProduct(item)}
                    disabled={busy}
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] disabled:cursor-not-allowed disabled:opacity-50 ${
                      item.isActive
                        ? 'border-[#4f9d6e]/30 bg-[#eef8f1] text-[#3f835b]'
                        : 'border-line/20 bg-white text-maroon-deep/50'
                    }`}
                  >
                    {item.isActive ? 'Aktif' : 'Nyahaktif'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteProduct(item)}
                    disabled={busy}
                    aria-label={`Padam ${item.name}`}
                    title="Padam produk"
                    className="grid size-8 place-items-center rounded-lg text-[#a34a26] hover:bg-[#fbeee9] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};
