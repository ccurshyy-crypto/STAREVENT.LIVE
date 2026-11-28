import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Phone,
  X,
} from 'lucide-react';
import { Language, STUDIO_CONTACT } from '../data/content';

export const BOOKED_MONTH_INDEX = 11; // December (0-indexed)
export const BOOKED_DAY_NUMBERS: readonly number[] = [6, 9, 10, 11, 12, 13, 14, 18, 19, 20];
const BOOKED_DAY_SET = new Set<number>(BOOKED_DAY_NUMBERS);

const MONTH_NAMES: Record<Language, readonly string[]> = {
  en: [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],
  mr: [
    'जानेवारी',
    'फेब्रुवारी',
    'मार्च',
    'एप्रिल',
    'मे',
    'जून',
    'जुलै',
    'ऑगस्ट',
    'सप्टेंबर',
    'ऑक्टोबर',
    'नोव्हेंबर',
    'डिसेंबर',
  ],
  hi: [
    'जनवरी',
    'फ़रवरी',
    'मार्च',
    'अप्रैल',
    'मई',
    'जून',
    'जुलाई',
    'अगस्त',
    'सितंबर',
    'अक्टूबर',
    'नवंबर',
    'दिसंबर',
  ],
  gu: [
    'જાન્યુઆરી',
    'ફેબ્રુઆરી',
    'માર્ચ',
    'એપ્રિલ',
    'મે',
    'જૂન',
    'જુલાઈ',
    'ઓગસ્ટ',
    'સપ્ટેમ્બર',
    'ઓક્ટોબર',
    'નવેમ્બર',
    'ડિસેમ્બર',
  ],
};

const SHORT_MONTHS_EN = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

const WEEKDAY_LABELS: Record<Language, readonly string[]> = {
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  mr: ['रवि', 'सोम', 'मंगळ', 'बुध', 'गुरु', 'शुक्र', 'शनि'],
  hi: ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि'],
  gu: ['રવિ', 'સોમ', 'મંગળ', 'બુધ', 'ગુરુ', 'શુક્ર', 'શનિ'],
};

const EVENT_TYPE_OPTIONS = [
  'Cricket Tournament',
  'Kabaddi Match',
  'Wedding / Haldi',
  'Birthday',
  'Other',
] as const;

type BookingEventType = (typeof EVENT_TYPE_OPTIONS)[number];

interface BookingCalendarSectionProps {
  lang: Language;
  heading?: string;
  onSelectDateForBooking?: (isoDate: string) => void;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function toIsoDate(year: number, monthIndex: number, day: number): string {
  return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
}

function formatReadableDate(iso: string): string {
  const [yStr, mStr, dStr] = iso.split('-');
  const y = Number(yStr);
  const m = Number(mStr) - 1;
  const d = Number(dStr);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return iso;
  return `${d} ${SHORT_MONTHS_EN[m] ?? ''} ${y}`;
}

export function BookingCalendarSection({
  lang,
  heading = 'BOOKING UR ORDER',
  onSelectDateForBooking,
}: BookingCalendarSectionProps) {
  // Always detect the current active system date automatically on load
  const initialNow = useMemo(() => new Date(), []);
  const todayYear = initialNow.getFullYear();
  const todayMonth = initialNow.getMonth();
  const todayDate = initialNow.getDate();

  const [viewYear, setViewYear] = useState(todayYear);
  const [viewMonth, setViewMonth] = useState(todayMonth);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);

  // Booking Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientMobile, setClientMobile] = useState('');
  const [eventType, setEventType] = useState<BookingEventType>('Cricket Tournament');
  const [eventLocation, setEventLocation] = useState('');
  const [packageNotes, setPackageNotes] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submittedWhatsappUrl, setSubmittedWhatsappUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!modalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [modalOpen]);

  const isCurrentActiveMonth = viewYear === todayYear && viewMonth === todayMonth;
  const isBookedDecemberMonth = viewYear === todayYear && viewMonth === BOOKED_MONTH_INDEX;

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOffset = new Date(viewYear, viewMonth, 1).getDay();

  const calendarCells = useMemo(() => {
    const cells: Array<{ day: number | null; key: string }> = [];
    for (let i = 0; i < firstDayOffset; i += 1) {
      cells.push({ day: null, key: `empty-start-${i}` });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push({ day, key: `${viewYear}-${viewMonth}-${day}` });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ day: null, key: `empty-end-${cells.length}` });
    }
    return cells;
  }, [daysInMonth, firstDayOffset, viewMonth, viewYear]);

  const monthLabel = MONTH_NAMES[lang][viewMonth];
  const weekdays = WEEKDAY_LABELS[lang];
  const selectedSet = useMemo(() => new Set(selectedDates), [selectedDates]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleJumpTodayMonth = () => {
    setViewYear(todayYear);
    setViewMonth(todayMonth);
  };

  const toggleDateSelection = (isoDate: string) => {
    setSubmittedWhatsappUrl(null);
    setSelectedDates((prev) => {
      if (prev.includes(isoDate)) {
        return prev.filter((d) => d !== isoDate);
      }
      const next = [...prev, isoDate].sort();
      return next;
    });
    onSelectDateForBooking?.(isoDate);
  };

  const removeSelectedDate = (isoDate: string) => {
    setSelectedDates((prev) => prev.filter((d) => d !== isoDate));
  };

  const handleOpenBookingModal = () => {
    if (selectedDates.length === 0) return;
    setFormErrors({});
    setSubmittedWhatsappUrl(null);
    setModalOpen(true);
  };

  const handleConfirmWhatsapp = (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const digitsOnly = clientMobile.replace(/\D/g, '');

    if (clientName.trim().length < 2) {
      errs.clientName = 'Please enter your full name.';
    }
    if (digitsOnly.length < 10) {
      errs.clientMobile = 'Please enter a valid 10-digit mobile number.';
    }
    if (eventLocation.trim().length < 2) {
      errs.eventLocation = 'Please enter your event location or village.';
    }

    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const formattedDatesList = selectedDates.map((d) => formatReadableDate(d)).join(', ');

    const lines = [
      'STAR EVENT LIVE — Event Booking Request',
      '------------------------------------',
      `Selected Date(s) (${selectedDates.length}): ${formattedDatesList}`,
      `Client Name: ${clientName.trim()}`,
      `Mobile Number: ${digitsOnly}`,
      `Event Type: ${eventType}`,
      `Location / Village: ${eventLocation.trim()}`,
      packageNotes.trim() ? `Setup / Package Notes: ${packageNotes.trim()}` : null,
      '------------------------------------',
      'Sent via starevent.live',
    ].filter(Boolean);

    const whatsappUrl = `https://wa.me/919890175727?text=${encodeURIComponent(lines.join('\n'))}`;
    setSubmittedWhatsappUrl(whatsappUrl);

    // Redirect cleanly without using window.open (safe inside iframes and mobile browsers)
    const link = document.createElement('a');
    link.href = whatsappUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const bookedLabel =
    lang === 'mr' ? 'बुक' : lang === 'hi' ? 'बुक' : lang === 'gu' ? 'બુક' : 'Booked';

  const openLabel =
    lang === 'mr' ? 'उपलब्ध' : lang === 'hi' ? 'खाली' : lang === 'gu' ? 'ખાલી' : 'Available';

  return (
    <section
      id="booking-calendar"
      aria-labelledby="booking-date-heading"
      className="relative pt-6 pb-9 sm:pt-10 sm:pb-14 border-b border-[#FFE600]/20"
    >
      <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 space-y-5 sm:space-y-6">
        {/* Prominent Heading */}
        <div className="text-center space-y-2">
          <h2
            id="booking-date-heading"
            className="font-display text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-none text-[#FFE600] drop-shadow-[0_4px_20px_rgba(0,0,0,0.65)]"
          >
            {heading}
          </h2>
          <p className="text-xs sm:text-base font-medium text-white/90 max-w-2xl mx-auto">
            {lang === 'mr'
              ? `${STUDIO_CONTACT.brand} — उपलब्ध तारखा (एक किंवा अनेक) निवडा आणि थेट WhatsApp वर बुकिंग पाठवा.`
              : lang === 'hi'
                ? `${STUDIO_CONTACT.brand} — एक या एक से अधिक उपलब्ध तारीखें चुनें और सीधे WhatsApp पर बुकिंग भेजें।`
                : lang === 'gu'
                  ? `${STUDIO_CONTACT.brand} — એક અથવા વધુ ઉપલબ્ધ તારીખો પસંદ કરો અને સીધી WhatsApp પર બુકિંગ મોકલો.`
                  : `${STUDIO_CONTACT.brand} — Select one or multiple available dates below and send your booking directly on WhatsApp.`}
          </p>
        </div>

        {/* Dark Black, Red & Gold Broadcast Calendar Card */}
        <div className="bg-[#0B0B10]/95 border border-[#FFE600]/40 rounded-2xl p-3.5 sm:p-6 shadow-[0_22px_56px_rgba(0,0,0,0.65)] space-y-4">
          {/* Month Navigation Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-white/12">
            <div className="flex items-center gap-2.5 min-w-0">
              <CalendarDays className="w-5 h-5 sm:w-6 sm:h-6 text-[#FFE600] shrink-0" aria-hidden="true" />
              <h3 className="font-display text-xl sm:text-2xl font-extrabold text-white tracking-tight tabular-nums">
                {monthLabel} {viewYear}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              {!isCurrentActiveMonth && (
                <button
                  type="button"
                  onClick={handleJumpTodayMonth}
                  className="min-h-[40px] px-3 py-1.5 text-xs font-extrabold text-black bg-[#FFE600] hover:bg-[#FFF04D] rounded-lg transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  {lang === 'mr'
                    ? 'आजचा महिना'
                    : lang === 'hi'
                      ? 'मौजूदा महीना'
                      : lang === 'gu'
                        ? 'ચાલુ મહિનો'
                        : 'Today'}
                </button>
              )}
              <button
                type="button"
                onClick={handlePrevMonth}
                aria-label="Previous month"
                className="w-10 h-10 inline-flex items-center justify-center rounded-lg border border-white/18 bg-white/[0.05] text-white hover:text-[#FFE600] hover:border-[#FFE600]/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFE600]"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                aria-label="Next month"
                className="w-10 h-10 inline-flex items-center justify-center rounded-lg border border-white/18 bg-white/[0.05] text-white hover:text-[#FFE600] hover:border-[#FFE600]/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFE600]"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Clean Legend Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-white/85">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
              <span className="inline-flex items-center gap-2 font-semibold text-white">
                <span
                  aria-hidden="true"
                  className="w-3.5 h-3.5 rounded bg-[#DC2626] border border-[#F87171] shrink-0"
                />
                <span>{bookedLabel}</span>
              </span>
              <span className="inline-flex items-center gap-2 font-semibold text-[#86EFAC]">
                <span
                  aria-hidden="true"
                  className="w-3.5 h-3.5 rounded bg-emerald-600 border-2 border-[#FFE600] shrink-0"
                />
                <span>
                  {lang === 'mr'
                    ? 'निवडलेल्या तारखा'
                    : lang === 'hi'
                      ? 'चुनी गई तारीखें'
                      : lang === 'gu'
                        ? 'પસંદ કરેલ તારીખો'
                        : 'Selected'}
                </span>
              </span>
              <span className="inline-flex items-center gap-2 text-white/80">
                <span
                  aria-hidden="true"
                  className="w-3.5 h-3.5 rounded bg-[#16161F] border border-white/20 shrink-0"
                />
                <span>{openLabel}</span>
              </span>
              <span className="inline-flex items-center gap-2 text-[#FFE600] font-medium">
                <span
                  aria-hidden="true"
                  className="w-3.5 h-3.5 rounded bg-transparent border-2 border-[#FFE600] shrink-0"
                />
                <span>
                  {lang === 'mr'
                    ? 'आज'
                    : lang === 'hi'
                      ? 'आज'
                      : lang === 'gu'
                        ? 'આજ'
                        : 'Today'}
                </span>
              </span>
            </div>

            <a
              href={STUDIO_CONTACT.phoneHref}
              className="inline-flex items-center gap-1.5 font-mono text-xs sm:text-sm font-bold text-[#FFE600] hover:text-white transition-colors tabular-nums whitespace-nowrap"
            >
              <Phone className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{STUDIO_CONTACT.phoneDisplay}</span>
            </a>
          </div>

          {/* Weekday Header */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5">
            {weekdays.map((dayName, idx) => (
              <div
                key={dayName}
                className={`text-center text-[11px] sm:text-xs font-bold py-1 ${
                  idx === 0 ? 'text-[#FFE600]' : 'text-white/75'
                }`}
              >
                {dayName}
              </div>
            ))}
          </div>

          {/* 7-Column Days Grid */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5">
            {calendarCells.map((cell) => {
              if (cell.day === null) {
                return (
                  <div
                    key={cell.key}
                    aria-hidden="true"
                    className="min-h-[54px] sm:min-h-[72px] rounded-xl bg-white/[0.02] border border-white/[0.04]"
                  />
                );
              }

              const day = cell.day;
              const isoDate = toIsoDate(viewYear, viewMonth, day);
              const isBooked = isBookedDecemberMonth && BOOKED_DAY_SET.has(day);
              const isToday =
                viewYear === todayYear && viewMonth === todayMonth && day === todayDate;
              const isSelected = !isBooked && selectedSet.has(isoDate);

              return (
                <button
                  key={cell.key}
                  type="button"
                  disabled={isBooked}
                  onClick={() => toggleDateSelection(isoDate)}
                  aria-pressed={isSelected}
                  aria-disabled={isBooked}
                  aria-label={`${day} ${monthLabel} ${viewYear} - ${
                    isBooked ? 'Booked' : isSelected ? 'Selected' : 'Available'
                  }`}
                  className={`relative min-h-[54px] sm:min-h-[72px] rounded-xl border px-1 py-1.5 sm:p-2 flex flex-col items-center justify-center transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFE600] ${
                    isBooked
                      ? 'bg-gradient-to-b from-[#DC2626] to-[#991B1B] border-[#FCA5A5]/60 text-white opacity-95 cursor-not-allowed'
                      : isSelected
                        ? 'bg-gradient-to-b from-emerald-600 to-emerald-800 border-2 border-[#FFE600] text-white shadow-[0_0_20px_rgba(255,230,0,0.38)]'
                        : isToday
                          ? 'bg-[#1A1610] border-2 border-[#FFE600] text-white hover:bg-[#262012] shadow-[0_0_16px_rgba(255,230,0,0.22)]'
                          : 'bg-[#14141C] border-white/12 text-white hover:border-[#FFE600]/75 hover:bg-[#1E1A22]'
                  }`}
                >
                  {isSelected && (
                    <span
                      aria-hidden="true"
                      className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 w-4 h-4 rounded-full bg-[#FFE600] text-black flex items-center justify-center"
                    >
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  )}

                  <span
                    className={`font-mono text-sm sm:text-xl font-extrabold leading-none tabular-nums ${
                      isBooked
                        ? 'text-white'
                        : isSelected
                          ? 'text-white'
                          : isToday
                            ? 'text-[#FFE600]'
                            : 'text-white'
                    }`}
                  >
                    {day}
                  </span>

                  {isBooked ? (
                    <span className="mt-1 text-[9px] sm:text-[10px] font-black tracking-wide text-[#FEF08A] leading-none">
                      {bookedLabel}
                    </span>
                  ) : isSelected ? (
                    <span className="mt-1 text-[9px] sm:text-[10px] font-black text-[#FFE600] leading-none">
                      {lang === 'mr'
                        ? 'निवडले'
                        : lang === 'hi'
                          ? 'चुना गया'
                          : lang === 'gu'
                            ? 'પસંદ'
                            : 'Selected'}
                    </span>
                  ) : isToday ? (
                    <span className="mt-1 text-[9px] sm:text-[10px] font-extrabold text-[#FFE600] leading-none">
                      {lang === 'mr'
                        ? 'आज'
                        : lang === 'hi'
                          ? 'आज'
                          : lang === 'gu'
                            ? 'આજ'
                            : 'Today'}
                    </span>
                  ) : (
                    <span className="mt-1 hidden sm:block text-[10px] font-medium text-white/55 leading-none">
                      {openLabel}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Multi-Date Selection Summary & Prominent "Book Selected Dates" CTA */}
          {selectedDates.length > 0 && (
            <div className="pt-4 border-t border-[#FFE600]/30 space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-3">
                    <p className="font-display text-sm sm:text-base font-extrabold text-[#FFE600] tabular-nums">
                      {selectedDates.length}{' '}
                      {selectedDates.length === 1 ? 'Date Selected' : 'Dates Selected'}
                    </p>
                    <button
                      type="button"
                      onClick={() => setSelectedDates([])}
                      className="text-xs font-semibold text-white/70 hover:text-white underline underline-offset-2 transition-colors whitespace-nowrap"
                    >
                      Clear all
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs sm:text-sm text-white">
                    {selectedDates.map((iso, idx) => (
                      <span
                        key={iso}
                        className="inline-flex items-center gap-1 font-mono font-semibold tabular-nums"
                      >
                        {idx > 0 && (
                          <span aria-hidden="true" className="text-white/40 mr-1.5">
                            ·
                          </span>
                        )}
                        <span>{formatReadableDate(iso)}</span>
                        <button
                          type="button"
                          onClick={() => removeSelectedDate(iso)}
                          aria-label={`Remove ${formatReadableDate(iso)}`}
                          className="ml-0.5 text-white/60 hover:text-[#FF6B6B] transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleOpenBookingModal}
                  className="btn-gold-pro min-h-[48px] inline-flex items-center justify-center gap-2 px-6 py-3 text-sm sm:text-base font-black text-black rounded-xl whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <span>
                    Book Selected {selectedDates.length === 1 ? 'Date' : 'Dates'} (
                    {selectedDates.length})
                  </span>
                  <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Client Booking Details Modal & Direct WhatsApp Send */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="calendar-booking-modal-title"
          onClick={() => setModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/88 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg my-auto bg-[#0D0B12] border border-[#FFE600]/45 rounded-2xl p-4 sm:p-6 shadow-[0_24px_70px_rgba(0,0,0,0.85)] space-y-5"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-white/12">
              <div className="space-y-1 min-w-0">
                <h3
                  id="calendar-booking-modal-title"
                  className="font-display text-xl sm:text-2xl font-black text-white leading-tight"
                >
                  Book Selected Dates
                </h3>
                <p className="text-xs sm:text-sm font-mono text-[#FFE600] tabular-nums leading-relaxed">
                  {selectedDates.map((d) => formatReadableDate(d)).join(' · ')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close booking form"
                className="w-10 h-10 rounded-xl bg-white/8 hover:bg-[#DC2626] text-white flex items-center justify-center transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFE600]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {submittedWhatsappUrl ? (
              <div className="space-y-5 py-2">
                <div className="space-y-2">
                  <p className="font-display text-lg font-extrabold text-[#FFE600]">
                    Booking Details Ready for WhatsApp
                  </p>
                  <p className="text-sm text-white/85 leading-relaxed">
                    Your selected dates and event details have been formatted for{' '}
                    <span className="font-bold text-white">{STUDIO_CONTACT.brand}</span>. If
                    WhatsApp did not open automatically, click the button below.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <a
                    href={submittedWhatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary-pro flex-1 min-h-[48px] inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-black text-white rounded-xl whitespace-nowrap"
                  >
                    <MessageCircle className="w-4 h-4 text-[#FFE600] shrink-0" aria-hidden="true" />
                    <span>Open WhatsApp Now</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setSubmittedWhatsappUrl(null)}
                    className="btn-glass-pro min-h-[48px] px-4 py-3 text-sm font-semibold text-white rounded-xl whitespace-nowrap"
                  >
                    Edit Details
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleConfirmWhatsapp} noValidate className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="cal-client-name"
                      className="block text-xs font-semibold text-white/90"
                    >
                      Client Full Name *
                    </label>
                    <input
                      id="cal-client-name"
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="e.g. Bharat Nirguda"
                      className="w-full min-h-[44px] px-3.5 py-2.5 text-sm bg-[#16141F] border border-white/18 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-[#FFE600]"
                    />
                    {formErrors.clientName && (
                      <p className="text-xs text-[#FCA5A5]">{formErrors.clientName}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="cal-client-mobile"
                      className="block text-xs font-semibold text-white/90"
                    >
                      Mobile Number *
                    </label>
                    <input
                      id="cal-client-mobile"
                      type="tel"
                      value={clientMobile}
                      onChange={(e) => setClientMobile(e.target.value)}
                      placeholder="9890XXXXXX"
                      className="w-full min-h-[44px] px-3.5 py-2.5 text-sm font-mono tabular-nums bg-[#16141F] border border-white/18 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-[#FFE600]"
                    />
                    {formErrors.clientMobile && (
                      <p className="text-xs text-[#FCA5A5]">{formErrors.clientMobile}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="cal-event-type"
                      className="block text-xs font-semibold text-white/90"
                    >
                      Event Type *
                    </label>
                    <select
                      id="cal-event-type"
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value as BookingEventType)}
                      className="w-full min-h-[44px] px-3.5 py-2.5 text-sm bg-[#16141F] border border-white/18 rounded-xl text-white focus:outline-none focus:border-[#FFE600]"
                    >
                      {EVENT_TYPE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt} className="bg-[#16141F] text-white">
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="cal-event-location"
                      className="block text-xs font-semibold text-white/90"
                    >
                      Event Location / Village *
                    </label>
                    <input
                      id="cal-event-location"
                      type="text"
                      value={eventLocation}
                      onChange={(e) => setEventLocation(e.target.value)}
                      placeholder="e.g. Neral / Karjat / Badlapur"
                      className="w-full min-h-[44px] px-3.5 py-2.5 text-sm bg-[#16141F] border border-white/18 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-[#FFE600]"
                    />
                    {formErrors.eventLocation && (
                      <p className="text-xs text-[#FCA5A5]">{formErrors.eventLocation}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="cal-package-notes"
                    className="block text-xs font-semibold text-white/90"
                  >
                    Setup / Package Preference (Optional)
                  </label>
                  <textarea
                    id="cal-package-notes"
                    rows={3}
                    value={packageNotes}
                    onChange={(e) => setPackageNotes(e.target.value)}
                    placeholder="e.g. 2 cameras, live scoreboard, LED wall feed, timings..."
                    className="w-full px-3.5 py-2.5 text-sm bg-[#16141F] border border-white/18 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-[#FFE600] resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="btn-primary-pro w-full min-h-[50px] inline-flex items-center justify-center gap-2 px-5 py-3 text-sm sm:text-base font-black text-white rounded-xl whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFE600]"
                >
                  <MessageCircle className="w-5 h-5 text-[#FFE600] shrink-0" aria-hidden="true" />
                  <span>Confirm &amp; Send on WhatsApp</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
