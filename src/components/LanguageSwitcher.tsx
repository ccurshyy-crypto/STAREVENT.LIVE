import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Globe } from 'lucide-react';
import { Language, LANGUAGE_OPTIONS } from '../data/content';

interface LanguageSwitcherProps {
  lang: Language;
  onChangeLang: (lang: Language) => void;
  variant?: 'dropdown' | 'inline';
}

export function LanguageSwitcher({
  lang,
  onChangeLang,
  variant = 'dropdown',
}: LanguageSwitcherProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const currentOption =
    LANGUAGE_OPTIONS.find((opt) => opt.id === lang) ?? LANGUAGE_OPTIONS[0];

  if (variant === 'inline') {
    return (
      <div
        role="group"
        aria-label="Language selection"
        className="inline-flex flex-wrap items-center gap-0.5 p-1 bg-black/55 border border-white/15 rounded-lg shrink-0"
      >
        {LANGUAGE_OPTIONS.map((opt) => {
          const isActive = opt.id === lang;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChangeLang(opt.id)}
              aria-pressed={isActive}
              className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-md transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] ${
                isActive ? 'bg-[#DC2626] text-white' : 'text-zinc-300 hover:text-white'
              }`}
            >
              {opt.nativeLabel}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Change language"
        className="min-h-[38px] sm:min-h-[40px] inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-zinc-100 hover:text-white bg-black/55 hover:bg-white/10 border border-white/15 hover:border-[#FACC15]/50 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]"
      >
        <Globe className="w-3.5 h-3.5 text-[#FACC15] shrink-0" aria-hidden="true" />
        <span className="sm:hidden uppercase font-mono text-[11px] font-bold">
          {currentOption.id}
        </span>
        <span className="hidden sm:inline">{currentOption.nativeLabel}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-150 shrink-0 ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Select language"
          className="absolute right-0 mt-2 w-44 bg-[#121216] border border-[#FACC15]/30 rounded-xl shadow-[0_18px_40px_rgba(0,0,0,0.7)] py-1.5 z-50"
        >
          {LANGUAGE_OPTIONS.map((opt) => {
            const isActive = opt.id === lang;
            return (
              <button
                key={opt.id}
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                onClick={() => {
                  onChangeLang(opt.id);
                  setOpen(false);
                }}
                className={`w-full px-3.5 py-2 text-left text-xs sm:text-sm flex items-center justify-between gap-2 transition-colors ${
                  isActive
                    ? 'bg-[#DC2626]/20 text-white font-semibold'
                    : 'text-zinc-300 hover:text-white hover:bg-white/8'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>{opt.nativeLabel}</span>
                  {opt.id !== 'en' && (
                    <span className="text-[11px] text-zinc-500 font-normal">{opt.label}</span>
                  )}
                </span>
                {isActive && <Check className="w-3.5 h-3.5 text-[#FACC15] shrink-0" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
