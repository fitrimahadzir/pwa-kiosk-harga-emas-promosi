import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  RefreshCw,
  Search,
} from 'lucide-react';
import type { ReceiptRecord } from '../types/gold';
import { fetchReceipts } from '../utils/storage';
import { formatMYR, formatWeight } from '../utils/calculator';

const MONTHS_MS = [
  'Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun',
  'Jul', 'Ogos', 'Sep', 'Okt', 'Nov', 'Dis',
];

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const time = date.toLocaleTimeString('ms-MY', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  return `${date.getDate()} ${MONTHS_MS[date.getMonth()]} ${date.getFullYear()} ${time}`;
}

function itemLabel(receipt: ReceiptRecord): string {
  if (receipt.packageTitle.trim()) return receipt.packageTitle.trim();
  return `Emas ${receipt.purity} · ${receipt.karat}`.trim();
}

const buttonClass =
  'inline-flex h-10 items-center gap-2 rounded-lg border border-line/25 bg-[#fbf6ef] px-4 text-xs font-semibold text-maroon-deep transition-colors hover:border-gold-deep/35 hover:bg-white disabled:cursor-not-allowed disabled:opacity-45';

/**
 * Laporan resit untuk pentadbir — senarai semua sebut harga yang disahkan staf
 * di tablet kaunter, dengan muat turun PDF dan Excel.
 */
export function ReceiptReport() {
  const [receipts, setReceipts] = useState<ReceiptRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [outletFilter, setOutletFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setReceipts(await fetchReceipts());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuatkan senarai resit.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const outlets = useMemo(
    () => Array.from(new Set(receipts.map((item) => item.outletName).filter(Boolean))).sort(),
    [receipts],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return receipts.filter((item) => {
      if (outletFilter !== 'all' && item.outletName !== outletFilter) return false;
      if (!query) return true;
      return [item.receiptNumber, item.quoteId, item.outletName, item.packageTitle, `${item.purity}`, item.karat]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [receipts, outletFilter, search]);

  const totalSales = useMemo(
    () => filtered.reduce((sum, item) => sum + item.finalTotal, 0),
    [filtered],
  );

  const exportRows = useMemo(
    () =>
      filtered.map((item) => ({
        id: item.id,
        tarikh: formatDateTime(item.createdAt),
        noResit: item.receiptNumber,
        outlet: item.outletName,
        item: itemLabel(item),
        berat: formatWeight(item.weight),
        jumlah: formatMYR(item.finalTotal),
      })),
    [filtered],
  );

  const handleDownloadPdf = async () => {
    if (exportRows.length === 0) return;
    setExporting('pdf');
    setError('');
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 12;
      const usable = pageWidth - margin * 2;

      const clip = (text: string, maxWidth: number) => {
        if (doc.getTextWidth(text) <= maxWidth) return text;
        let value = text;
        while (value.length > 1 && doc.getTextWidth(`${value}…`) > maxWidth) {
          value = value.slice(0, -1);
        }
        return `${value}…`;
      };

      // Header
      doc.setFillColor(59, 7, 7);
      doc.rect(0, 0, pageWidth, 26, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.text('Laporan Resit & Sebut Harga', margin, 12);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`Dijana: ${formatDateTime(new Date().toISOString())}`, margin, 19);
      doc.text(`Rekod: ${exportRows.length}`, pageWidth - margin, 19, { align: 'right' });

      // Ringkasan
      doc.setTextColor(60, 40, 40);
      doc.setFontSize(9);
      doc.text(
        `Jumlah jualan: ${formatMYR(totalSales)}    |    Outlet: ${
          outletFilter === 'all' ? 'Semua' : outletFilter
        }`,
        margin,
        34,
      );

      const columns = [
        { label: 'Tarikh', width: 34, get: (row: (typeof exportRows)[number]) => row.tarikh },
        { label: 'No. Resit', width: 52, get: (row: (typeof exportRows)[number]) => row.noResit },
        { label: 'Outlet', width: 52, get: (row: (typeof exportRows)[number]) => row.outlet },
        { label: 'Item', width: 68, get: (row: (typeof exportRows)[number]) => row.item },
        { label: 'Berat', width: 22, get: (row: (typeof exportRows)[number]) => row.berat },
        { label: 'Jumlah', width: 32, get: (row: (typeof exportRows)[number]) => row.jumlah },
      ];
      const scale = usable / columns.reduce((sum, col) => sum + col.width, 0);
      const widths = columns.map((col) => col.width * scale);
      const xAt = (index: number) =>
        margin + widths.slice(0, index).reduce((sum, width) => sum + width, 0);

      let y = 42;
      const drawHeader = () => {
        doc.setFillColor(242, 236, 226);
        doc.rect(margin, y - 5, usable, 8, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(74, 20, 20);
        columns.forEach((col, index) => doc.text(col.label, xAt(index) + 2, y));
        y += 10;
      };
      drawHeader();

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      exportRows.forEach((row, rowIndex) => {
        if (y > pageHeight - 16) {
          doc.addPage();
          y = 16;
          drawHeader();
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
        }
        if (rowIndex % 2 === 1) {
          doc.setFillColor(250, 247, 242);
          doc.rect(margin, y - 5, usable, 8, 'F');
        }
        doc.setTextColor(60, 40, 40);
        columns.forEach((col, index) =>
          doc.text(clip(col.get(row), widths[index] - 4), xAt(index) + 2, y),
        );
        y += 8;
      });

      doc.setTextColor(130, 110, 110);
      doc.setFontSize(7);
      doc.text('Gold Reserve — laporan dijana dari sistem kiosk', margin, pageHeight - 6);

      doc.save(`Laporan-Resit-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menjana fail PDF.');
    } finally {
      setExporting(null);
    }
  };

  const handleDownloadExcel = async () => {
    if (filtered.length === 0) return;
    setExporting('excel');
    setError('');
    try {
      const XLSX = await import('xlsx');
      const header = [
        'Tarikh', 'No. Resit', 'Outlet', 'Item', 'Berat (g)', 'Harga/g (RM)',
        'Kos Emas (RM)', 'Upah (RM)', 'Subtotal (RM)', 'Diskaun (RM)',
        'Trade-In (RM)', 'Pakej', 'Jumlah (RM)',
      ];
      const body = filtered.map((item) => [
        formatDateTime(item.createdAt),
        item.receiptNumber,
        item.outletName,
        itemLabel(item),
        item.weight,
        item.pricePerGram,
        item.goldCost,
        item.workmanship,
        item.subtotal,
        item.discountAmount,
        item.tradeInAmount,
        item.packageTitle,
        item.finalTotal,
      ]);
      const sheet = XLSX.utils.aoa_to_sheet([header, ...body]);
      sheet['!cols'] = [
        { wch: 20 }, { wch: 26 }, { wch: 22 }, { wch: 28 }, { wch: 12 },
        { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
        { wch: 14 }, { wch: 24 }, { wch: 14 },
      ];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, 'Resit');

      const summary = XLSX.utils.aoa_to_sheet([
        ['Laporan', 'Resit & Sebut Harga Kiosk'],
        ['Dijana', formatDateTime(new Date().toISOString())],
        ['Outlet', outletFilter === 'all' ? 'Semua' : outletFilter],
        ['Bilangan resit', filtered.length],
        ['Jumlah jualan (RM)', totalSales],
      ]);
      summary['!cols'] = [{ wch: 22 }, { wch: 32 }];
      XLSX.utils.book_append_sheet(workbook, summary, 'Ringkasan');

      XLSX.writeFile(workbook, `Laporan-Resit-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menjana fail Excel.');
    } finally {
      setExporting(null);
    }
  };

  return (
    <section className="gr-card-light mt-6 overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line/15 p-5">
        <div>
          <p className="gr-kicker text-maroon">Laporan</p>
          <p className="mt-1.5 font-heading text-xl text-maroon-deep">Resit &amp; sebut harga</p>
          <p className="mt-1 text-sm text-maroon-deep/55">
            Setiap resit yang disahkan staf di tablet kaunter direkodkan di sini.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className={buttonClass}
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            Muat semula
          </button>
          <button
            type="button"
            onClick={() => void handleDownloadPdf()}
            disabled={exporting !== null || filtered.length === 0}
            className={buttonClass}
          >
            {exporting === 'pdf' ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <FileText className="size-3.5" />
            )}
            PDF
          </button>
          <button
            type="button"
            onClick={() => void handleDownloadExcel()}
            disabled={exporting !== null || filtered.length === 0}
            className={`${buttonClass} !border-gold-deep/30 !bg-gold !text-maroon-deep hover:!bg-gold-soft`}
          >
            {exporting === 'excel' ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <FileSpreadsheet className="size-3.5" />
            )}
            Excel
          </button>
        </div>
      </div>

      <div className="grid gap-3 border-b border-line/15 p-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-semibold text-maroon-deep/70">Outlet</span>
          <select
            value={outletFilter}
            onChange={(event) => setOutletFilter(event.target.value)}
            className="h-11 w-full rounded-lg border border-line/25 bg-[#fbf6ef] px-3 text-sm text-maroon-deep focus:border-gold-deep/45 focus:outline-none"
          >
            <option value="all">Semua outlet</option>
            {outlets.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-semibold text-maroon-deep/70">Carian</span>
          <span className="relative block">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-maroon-deep/35" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="No. resit, outlet atau pakej"
              className="h-11 w-full rounded-lg border border-line/25 bg-[#fbf6ef] pl-9 pr-3 text-sm text-maroon-deep placeholder:text-maroon-deep/35 focus:border-gold-deep/45 focus:outline-none"
            />
          </span>
        </label>
        <div className="flex items-end">
          <div className="rounded-lg border border-line/20 bg-[#fbf6ef] px-4 py-2">
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-maroon-deep/45">
              Jumlah jualan
            </p>
            <p className="mt-0.5 font-heading text-lg text-maroon-deep">
              {formatMYR(totalSales)}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-5 mt-4 flex items-start gap-2 rounded-xl border border-rose-300/50 bg-rose-50 px-3 py-2.5 text-xs text-rose-800">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-line/15 bg-[#fbf6ef] text-[10px] uppercase tracking-[0.12em] text-maroon-deep/50">
              <th className="px-5 py-3 font-semibold">Tarikh</th>
              <th className="px-5 py-3 font-semibold">No. Resit</th>
              <th className="px-5 py-3 font-semibold">Outlet</th>
              <th className="px-5 py-3 font-semibold">Item</th>
              <th className="px-5 py-3 text-right font-semibold">Berat</th>
              <th className="px-5 py-3 text-right font-semibold">Jumlah</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/10">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-xs text-maroon-deep/45">
                  <Loader2 className="mx-auto mb-2 size-5 animate-spin text-gold-deep" />
                  Memuatkan resit...
                </td>
              </tr>
            ) : exportRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-xs uppercase tracking-[0.14em] text-maroon-deep/35">
                  Tiada resit untuk dipaparkan
                </td>
              </tr>
            ) : (
              exportRows.map((row) => (
                <tr key={row.id} className="transition-colors hover:bg-gold/5">
                  <td className="whitespace-nowrap px-5 py-3 text-xs text-maroon-deep/60">{row.tarikh}</td>
                  <td className="whitespace-nowrap px-5 py-3 font-mono text-[11px] text-maroon-deep/75">{row.noResit}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-xs text-maroon-deep/75">{row.outlet}</td>
                  <td className="px-5 py-3 text-xs text-maroon-deep/75">{row.item}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-right text-xs tabular-nums text-maroon-deep/65">{row.berat}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-right text-sm font-semibold tabular-nums text-maroon">
                    {row.jumlah}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/15 px-5 py-3 text-[11px] text-maroon-deep/45">
        <span>
          {filtered.length} daripada {receipts.length} resit · maksimum 500 rekod terkini
        </span>
        <span className="flex items-center gap-1.5">
          <Download className="size-3" />
          Muat turun tersedia dalam format PDF &amp; Excel
        </span>
      </div>
    </section>
  );
}
