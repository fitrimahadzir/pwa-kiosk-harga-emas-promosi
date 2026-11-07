import React, { useState } from 'react';
import { AlertCircle, ArrowRight, Building2, Loader2, ShieldCheck } from 'lucide-react';
import { LOCAL_DEMO_CODES, normalizeOutletCode } from '../lib/auth';
import { isSupabaseConfigured } from '../lib/supabase';

interface LoginPageProps {
  shopName: string;
  error: string;
  isLoading: boolean;
  onLogin: (code: string) => Promise<void>;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  shopName,
  error,
  isLoading,
  onLogin,
}) => {
  const [code, setCode] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || isLoading) return;
    await onLogin(code);
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col justify-between overflow-hidden bg-maroon-deep text-cream">
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute -top-40 -right-32 size-[520px] rounded-full bg-gold/15 blur-3xl" />
        <div className="absolute -bottom-48 -left-24 size-[480px] rounded-full bg-maroon-soft/60 blur-3xl" />
      </div>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-sm">
          {/* Brand */}
          <div className="mb-6 text-center">
            <img
              src="/images/icon.png"
              alt="Ikon Gold Reserve"
              className="mx-auto size-20 rounded-2xl border border-gold/40 bg-maroon/40 object-contain p-1.5 shadow-2xl"
            />
            <img
              src="/SVG/company-name.svg"
              alt={shopName}
              className="mx-auto mt-4 h-6 w-auto"
            />
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-gold-soft/70">
              Kiosk Harga Emas &amp; Promosi
            </p>
          </div>

          {/* Login card */}
          <form
            onSubmit={handleSubmit}
            className="gr-panel rounded-3xl border border-gold/35 p-6 shadow-2xl"
          >
            <div className="mb-5 flex items-start gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-gold/35 bg-gold/10 text-gold">
                <Building2 size={19} />
              </div>
              <div>
                <h1 className="font-serif text-lg font-bold tracking-wide text-cream">
                  Log Masuk Outlet
                </h1>
                <p className="mt-0.5 text-[11px] leading-relaxed text-gold-soft/70">
                  Masukkan kod outlet untuk membuka paparan kiosk.
                </p>
              </div>
            </div>

            <label
              htmlFor="outlet-code"
              className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.18em] text-gold-soft/80"
            >
              Kod Outlet
            </label>
            <input
              id="outlet-code"
              type="text"
              autoFocus
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              value={code}
              onChange={(e) => setCode(normalizeOutletCode(e.target.value))}
              placeholder="CONTOH: AMANJAYA"
              disabled={isLoading}
              className="w-full rounded-xl border border-gold/35 bg-maroon-deep/70 px-4 py-3 text-center font-mono text-base font-bold uppercase tracking-[0.18em] text-cream placeholder:text-gold-soft/25 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20 disabled:opacity-60"
            />

            {error && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-700/40 bg-rose-950/50 px-3 py-2 text-[11px] text-rose-200">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !code.trim()}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gold px-4 py-3 text-sm font-bold tracking-wide text-maroon-deep shadow-[0_14px_34px_-18px_rgba(212,161,58,0.95)] transition hover:bg-gold-soft active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Menyemak kod...</span>
                </>
              ) : (
                <>
                  <span>Masuk ke Outlet</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            {/* Local fallback hint until Supabase is configured */}
            {!isSupabaseConfigured && import.meta.env.DEV && (
              <div className="mt-4 rounded-xl border border-gold/20 bg-maroon-deep/50 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gold-soft/70">
                  Mod demo (Supabase belum diset)
                </p>
                <p className="mt-1 text-[11px] text-gold-soft/60">
                  Outlet: <span className="font-mono text-gold">{LOCAL_DEMO_CODES.find((c) => c === 'AMANJAYA')}</span>
                  {' · '}
                  Admin: <span className="font-mono text-gold">HQ</span>
                </p>
              </div>
            )}
          </form>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[10px] text-gold-soft/45">
            <ShieldCheck size={12} />
            Akses terhad untuk staf outlet &amp; pentadbir sahaja.
          </p>
        </div>
      </main>

      <footer className="relative z-10 pb-5 text-center text-[10px] text-gold-soft/35">
        © {new Date().getFullYear()} {shopName} · Sistem Harga Emas &amp; Promosi
      </footer>
    </div>
  );
};
