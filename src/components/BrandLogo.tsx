interface BrandLogoProps {
  compact?: boolean;
  subtitle?: string;
  className?: string;
}

export function BrandLogo({
  compact = false,
  subtitle = 'Outlet: Amanjaya Mall',
  className = '',
}: BrandLogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img
        src="/SVG/favicon.svg"
        alt=""
        aria-hidden="true"
        className="size-10 shrink-0 rounded-lg"
      />
      {!compact && (
        <div className="min-w-0">
          <img
            src="/SVG/company-name.svg"
            alt="Gold Reserve"
            className="h-4 w-auto max-w-full"
          />
          <p className="mt-1.5 text-[8.5px] font-semibold uppercase tracking-[0.26em] text-cream/40">
            {subtitle}
          </p>
        </div>
      )}
    </div>
  );
}
