import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  Loader2,
  Lock,
  Mail,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';

interface LoginPageProps {
  shopName: string;
  /** 'outlet' = paparan kiosk (tanpa kelayakan); 'admin' = Supabase Auth. */
  variant: 'outlet' | 'admin';
  outlets: string[];
  initialOutlet?: string;
  error: string;
  isLoading: boolean;
  onEnterOutlet: (outletName: string) => void;
  onAdminLogin: (email: string, password: string) => Promise<void>;
  onOpenAdmin: () => void;
  onBackToKiosk: () => void;
  /** Muat semula senarai outlet daripada server (butang cuba lagi). */
  onRefreshOutlets: () => void;
  outletsLoading?: boolean;
}

const inputClass =
  'w-full rounded-xl border border-gold/35 bg-maroon-deep/70 px-4 py-3 text-center text-base font-semibold text-cream placeholder:text-gold-soft/25 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20 disabled:opacity-60';

export const LoginPage: React.FC<LoginPageProps> = ({
  shopName,
  variant,
  outlets,
  initialOutlet,
  error,
  isLoading,
  onEnterOutlet,
  onAdminLogin,
  onOpenAdmin,
  onBackToKiosk,
  onRefreshOutlets,
  outletsLoading = false,
}) => {
  const [outlet, setOutlet] = useState(initialOutlet ?? '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [outletOpen, setOutletOpen] = useState(false);

  // Outlet names arrive asynchronously from Supabase; prefill once available.
  useEffect(() => {
    if (!initialOutlet) return;
    setOutlet((current) => current || initialOutlet);
  }, [initialOutlet]);

  const isAdmin = variant === 'admin';

  const handleOutletSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!outlet.trim() || isLoading) return;
    onEnterOutlet(outlet.trim());
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password || isLoading) return;
    await onAdminLogin(email, password);
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

          <form
            onSubmit={isAdmin ? handleAdminSubmit : handleOutletSubmit}
            className="gr-panel rounded-3xl border border-gold/35 p-6 shadow-2xl"
          >
            <div className="mb-5 flex items-start gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-gold/35 bg-gold/10 text-gold">
                {isAdmin ? <Lock size={19} /> : <Building2 size={19} />}
              </div>
              <div>
                <h1 className="font-serif text-lg font-bold tracking-wide text-cream">
                  {isAdmin ? 'Log Masuk Pentadbir' : 'Pilih Outlet'}
                </h1>
                <p className="mt-0.5 text-[11px] leading-relaxed text-gold-soft/70">
                  {isAdmin
                    ? 'Akses admin menggunakan e-mel dan kata laluan Supabase Auth.'
                    : 'Paparan kiosk adalah baca-sahaja. Pilih outlet untuk mula.'}
                </p>
              </div>
            </div>

            {!isSupabaseConfigured ? (
              <div className="flex items-start gap-2 rounded-xl border border-rose-700/40 bg-rose-950/50 px-3 py-2.5 text-[11px] text-rose-200">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span>
                  Sistem belum dikonfigurasi. Hubungi pentadbir: tetapan
                  <span className="font-mono"> VITE_SUPABASE_URL </span>
                  dan
                  <span className="font-mono"> VITE_SUPABASE_ANON_KEY </span>
                  diperlukan.
                </span>
              </div>
            ) : isAdmin ? (
              <>
                <label
                  htmlFor="admin-email"
                  className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.18em] text-gold-soft/80"
                >
                  E-mel
                </label>
                <input
                  id="admin-email"
                  type="email"
                  autoFocus
                  autoComplete="username"
                  spellCheck={false}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@kedai.com"
                  disabled={isLoading}
                  className={inputClass}
                />

                <label
                  htmlFor="admin-password"
                  className="mb-1.5 mt-3 block text-[10px] font-bold uppercase tracking-[0.18em] text-gold-soft/80"
                >
                  Kata Laluan
                </label>
                <input
                  id="admin-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isLoading}
                  className={inputClass}
                />

                <button
                  type="submit"
                  disabled={isLoading || !email.trim() || !password}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gold px-4 py-3 text-sm font-bold tracking-wide text-maroon-deep shadow-[0_14px_34px_-18px_rgba(212,161,58,0.95)] transition hover:bg-gold-soft active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Mengesahkan...</span>
                    </>
                  ) : (
                    <>
                      <Mail size={16} />
                      <span>Log Masuk Admin</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onBackToKiosk}
                  className="mt-3 flex w-full items-center justify-center gap-1.5 text-[11px] font-semibold text-gold-soft/60 transition hover:text-gold"
                >
                  <ArrowLeft size={13} />
                  Kembali ke paparan kiosk
                </button>
              </>
            ) : (
              <>
                <label
                  htmlFor="outlet-name"
                  className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.18em] text-gold-soft/80"
                >
                  Nama Outlet
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOutletOpen((value) => !value)}
                    aria-haspopup="listbox"
                    aria-expanded={outletOpen}
                    disabled={isLoading}
                    className={`${inputClass} flex items-center justify-between gap-2 text-left disabled:cursor-not-allowed`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Building2 size={16} className="shrink-0 text-gold/80" />
                      <span
                        className={`truncate ${outlet ? '' : 'font-normal text-gold-soft/35'}`}
                      >
                        {outlet || 'Pilih outlet'}
                      </span>
                    </span>
                    <ChevronDown
                      className={`size-4 shrink-0 text-gold/70 transition-transform ${
                        outletOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {outletOpen && (
                    <>
                      <button
                        type="button"
                        aria-label="Tutup senarai outlet"
                        className="fixed inset-0 z-20 cursor-default"
                        onClick={() => setOutletOpen(false)}
                      />
                      <div
                        role="listbox"
                        className="absolute inset-x-0 top-full z-30 mt-2 max-h-60 overflow-y-auto rounded-xl border border-gold/35 bg-maroon-deep p-1 shadow-2xl"
                      >
                        {outlets.length === 0 ? (
                          <div className="px-3 py-4 text-center">
                            <p className="text-[11px] leading-relaxed text-gold-soft/70">
                              Senarai outlet belum tersedia. Semak sambungan internet
                              kemudian cuba lagi.
                            </p>
                            <button
                              type="button"
                              onClick={onRefreshOutlets}
                              disabled={outletsLoading}
                              className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-lg border border-gold/40 bg-gold/10 px-3 py-1.5 text-[11px] font-semibold text-gold transition hover:bg-gold/20 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <RefreshCw
                                size={12}
                                className={outletsLoading ? 'animate-spin' : ''}
                              />
                              {outletsLoading ? 'Memuatkan...' : 'Muat semula'}
                            </button>
                          </div>
                        ) : (
                          outlets.map((name) => {
                            const isActive = name === outlet;
                            return (
                              <button
                                key={name}
                                type="button"
                                role="option"
                                aria-selected={isActive}
                                onClick={() => {
                                  setOutlet(name);
                                  setOutletOpen(false);
                                }}
                                className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                                  isActive
                                    ? 'bg-gold/15 text-gold'
                                    : 'text-cream/85 hover:bg-gold/10 hover:text-cream'
                                }`}
                              >
                                <span className="flex min-w-0 items-center gap-2">
                                  <Building2
                                    size={14}
                                    className={`shrink-0 ${
                                      isActive ? 'text-gold' : 'text-gold-soft/50'
                                    }`}
                                  />
                                  <span className="truncate">{name}</span>
                                </span>
                                {isActive && <Check size={14} className="shrink-0 text-gold" />}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !outlet.trim()}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gold px-4 py-3 text-sm font-bold tracking-wide text-maroon-deep shadow-[0_14px_34px_-18px_rgba(212,161,58,0.95)] transition hover:bg-gold-soft active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span>Masuk ke Outlet</span>
                  <ArrowRight size={16} />
                </button>

                <button
                  type="button"
                  onClick={onOpenAdmin}
                  className="mt-3 flex w-full items-center justify-center gap-1.5 text-[11px] font-semibold text-gold-soft/50 transition hover:text-gold"
                >
                  <Lock size={12} />
                  Log masuk pentadbir
                </button>
              </>
            )}

            {error && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-700/40 bg-rose-950/50 px-3 py-2 text-[11px] text-rose-200">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </form>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[10px] text-gold-soft/45">
            <ShieldCheck size={12} />
            {isAdmin
              ? 'Sesi admin disahkan di server (Supabase Auth).'
              : 'Kiosk tidak mempunyai akses tulis ke pangkalan data.'}
          </p>
        </div>
      </main>

      <footer className="relative z-10 pb-5 text-center text-[10px] text-gold-soft/35">
        © {new Date().getFullYear()} {shopName} · Sistem Harga Emas &amp; Promosi
      </footer>
    </div>
  );
};
