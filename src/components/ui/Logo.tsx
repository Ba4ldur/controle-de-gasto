interface LogoProps {
  variant?: 'light' | 'dark';
  showText?: boolean;
  className?: string;
}

/**
 * Marca "Attivare Reforma Intelligence".
 * Monograma "A" com traço dourado + nome. Sem imagens externas.
 */
export function Logo({ variant = 'dark', showText = true, className = '' }: LogoProps) {
  const isLight = variant === 'light';
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <span
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-brand-900 text-base font-semibold text-white ring-1 ring-inset ring-gold/40"
        aria-hidden
      >
        <span className="relative">
          A<span className="absolute -bottom-0.5 left-0 h-0.5 w-full bg-gold" />
        </span>
      </span>
      {showText && (
        <div className="leading-tight">
          <p className={`text-sm font-semibold ${isLight ? 'text-white' : 'text-ink'}`}>
            Attivare
          </p>
          <p className={`text-[0.7rem] font-medium tracking-wide ${isLight ? 'text-brand-100' : 'text-ink-muted'}`}>
            Reforma Intelligence
          </p>
        </div>
      )}
    </div>
  );
}
