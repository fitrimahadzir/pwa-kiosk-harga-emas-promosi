import React from 'react';
import { ArrowLeft, MapPin, Trophy, Users, Wallet } from 'lucide-react';
import { OutletStaffPerformance } from '../types/gold';
import { formatMYR } from '../utils/calculator';
import { DetailPageBanner } from './DetailPageBanner';

interface StaffPageProps {
  /** Senarai outlet + jualan staff (demo buat masa ini, nanti dari AutoCount). */
  performance: OutletStaffPerformance[];
  onBack: () => void;
}

/**
 * Halaman prestasi staff — susunan sama seperti halaman detail promosi:
 * banner 3:4 di kiri, senarai prestasi di kanan.
 */
export const StaffPage: React.FC<StaffPageProps> = ({ performance, onBack }) => {
  const grandTotal = performance.reduce((sum, outlet) => sum + outlet.total, 0);

  // Susun outlet mengikut jumlah jualan tertinggi, dan staff dalam setiap
  // outlet mengikut jualan individu tertinggi. Senarai asal tidak diubah.
  const sortedPerformance = performance
    .map((outlet) => ({
      ...outlet,
      staff: [...outlet.staff].sort((a, b) => b.sale - a.sale),
    }))
    .sort((a, b) => b.total - a.total);

  const topOutletTotal = sortedPerformance[0]?.total ?? 0;

  return (
    <section className="mx-auto w-full max-w-6xl animate-in fade-in slide-in-from-bottom-2 duration-300">
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
              <Users size={20} />
            </div>
            <div>
              <h1 className="font-heading text-xl font-bold tracking-wide text-maroon-deep sm:text-2xl">
                Prestasi Staff
              </h1>
              <p className="text-[11px] text-maroon/60 sm:text-xs">
                Jualan semasa individu & jumlah terkumpul setiap outlet
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-6">
        {/* Left: permanent 3:4 banner. Tiada mx-auto — tepi kiri image
            sejajar dengan tepi kiri title di atas. */}
        <DetailPageBanner
          imageUrl="/images/3-4-RATIO.jpg"
          alt="Banner prestasi staff Gold Reserve"
          title="Prestasi Jualan Staff"
        />

        {/* Right: per-outlet staff performance */}
        <div className="gr-card-light flex flex-col gap-4 p-5 sm:p-6">
          <div>
            <p className="gr-kicker-light">Ringkasan Jualan</p>
            <h2 className="mt-1.5 font-heading text-2xl font-bold leading-tight text-maroon-deep sm:text-3xl">
              Prestasi Semasa
            </h2>
            <p className="mt-1 text-[11px] text-maroon/55">
              {performance.length} outlet · data demo (akan disambung ke AutoCount)
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-gold-deep/30 bg-gold/10 p-4">
            <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-gold/25 text-gold-deep">
              <Wallet size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gold-deep">
                Jumlah Semua Outlet
              </p>
              <p className="mt-0.5 font-sans text-2xl font-black tracking-tight text-gold-deep">
                {formatMYR(grandTotal)}
              </p>
            </div>
          </div>

          <div className="gr-hairline" />

          <div className="space-y-4">
            {sortedPerformance.map((outlet) => {
              const isTopOutlet = outlet.total > 0 && outlet.total === topOutletTotal;
              const topStaffSale = Math.max(0, ...outlet.staff.map((person) => person.sale));

              return (
                <div
                  key={outlet.outlet}
                  className={`overflow-hidden rounded-xl border bg-cream-light/60 ${
                    isTopOutlet ? 'border-gold-deep/45 ring-1 ring-gold-deep/20' : 'border-line/15'
                  }`}
                >
                  {/* Outlet name (left, with trophy for the highest seller)
                      + accumulated sale (right) */}
                  <div className="flex items-center justify-between gap-3 border-b border-line/15 bg-gold/10 px-3 py-2.5">
                    <p className="flex min-w-0 items-center gap-1.5 font-heading text-base font-bold text-maroon-deep">
                      <MapPin size={14} className="shrink-0 text-gold-deep" />
                      <span className="truncate">{outlet.outlet}</span>
                      {isTopOutlet && (
                        <Trophy
                          size={15}
                          className="shrink-0 fill-gold/30 text-gold-deep"
                          aria-label="Jualan outlet tertinggi"
                        />
                      )}
                    </p>
                    <div className="shrink-0 text-right">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-maroon/50">
                        Jumlah Outlet
                      </p>
                      <p className="font-sans text-sm font-black text-gold-deep">
                        {formatMYR(outlet.total)}
                      </p>
                    </div>
                  </div>

                  {/* Individual staff sales — highest seller gets a trophy */}
                  <div className="divide-y divide-line/10">
                    {outlet.staff.map((person) => {
                      const isTopStaff =
                        topStaffSale > 0 && person.sale === topStaffSale;

                      return (
                        <div
                          key={person.name}
                          className={`flex items-center justify-between gap-3 px-3 py-2 ${
                            isTopStaff ? 'bg-gold/5' : ''
                          }`}
                        >
                          <p className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-maroon-deep/85">
                            <span className="truncate">{person.name}</span>
                            {isTopStaff && (
                              <Trophy
                                size={13}
                                className="shrink-0 fill-gold/30 text-gold-deep"
                                aria-label="Jualan staff tertinggi"
                              />
                            )}
                          </p>
                          <p className="shrink-0 font-mono text-xs font-bold tabular-nums text-maroon-deep">
                            {formatMYR(person.sale)}
                          </p>
                        </div>
                      );
                    })}
                    {outlet.staff.length === 0 && (
                      <p className="px-3 py-3 text-[11px] text-maroon/50">
                        Tiada rekod staff untuk outlet ini.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-[10px] leading-relaxed text-maroon/45">
            Jumlah outlet = gabungan jualan semasa semua staff di outlet berkenaan.
          </p>
        </div>
      </div>
    </section>
  );
};
