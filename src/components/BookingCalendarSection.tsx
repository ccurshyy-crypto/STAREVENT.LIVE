import { useMemo, useState } from 'react';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Lock,
  MessageCircle,
  Phone,
} from 'lucide-react';
import { Language, STUDIO_CONTACT } from '../data/content';

export const BOOKED_MONTH_INDEX = 11; // December (0-indexed)
export const BOOKED_DAY_NUMBERS: readonly number[] = [9, 10, 11, 12, 13, 14, 18, 19, 20];
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

const WEEKDAY_LABELS: Record<Language, readonly string[]> = {
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  mr: ['रवि', 'सोम', 'मंगळ', 'बुध', 'गुरु', 'शुक्र', 'शनि'],
  hi: ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि'],
  gu: ['રવિ', 'સોમ', 'મંગળ', 'બુધ', 'ગુરુ', 'શુક્ર', 'શનિ'],
};

interface BookingCalendarSectionProps {
  lang: Language;
  onSelectDateForBooking: (isoDate: string) => void;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function BookingCalendarSection({
  lang,
  onSelectDateForBooking,
}: BookingCalendarSectionProps) {
  const initialNow = useMemo(() => new Date(), []);
  const bookedYear = initialNow.getFullYear();
  const todayYear = initialNow.getFullYear();
  const todayMonth = initialNow.getMonth();
  const todayDate = initialNow.getDate();

  // Default directly to December where dates 9, 10, 11, 12, 13, 14, 18, 19, 20 are booked
  const [viewYear, setViewYear] = useState(bookedYear);
  const [viewMonth, setViewMonth] = useState(BOOKED_MONTH_INDEX);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const isDecemberBookedMonth = viewYear === bookedYear && viewMonth === BOOKED_MONTH_INDEX;

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

  const handlePrevMonth = () => {
    setSelectedDay(null);
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    setSelectedDay(null);
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleJumpDecember = () => {
    setViewYear(bookedYear);
    setViewMonth(BOOKED_MONTH_INDEX);
    setSelectedDay(null);
  };

  const selectedIsBooked = Boolean(
    selectedDay !== null && isDecemberBookedMonth && BOOKED_DAY_SET.has(selectedDay)
  );
  const selectedIsoDate =
    selectedDay !== null
      ? `${viewYear}-${pad2(viewMonth + 1)}-${pad2(selectedDay)}`
      : null;

  const bookedLabel =
    lang === 'mr' ? 'बुक' : lang === 'hi' ? 'बुक' : lang === 'gu' ? 'બુક' : 'BOOKED';

  const openLabel =
    lang === 'mr' ? 'उपलब्ध' : lang === 'hi' ? 'खाली' : lang === 'gu' ? 'ખાલી' : 'Available';

  return (
    <section
      id="top"
      aria-labelledby="booking-date-heading"
      className="relative pt-5 pb-8 sm:pt-9 sm:pb-12 border-b border-white/10"
    >
      <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 space-y-5 sm:space-y-6">
        {/* Big Prominent Top Heading */}
        <div className="text-center space-y-2">
          <h2
            id="booking-date-heading"
            className="font-display text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-none text-[#FACC15] drop-shadow-[0_4px_24px_rgba(250,204,21,0.34)]"
          >
            BOOKING DATE
          </h2>
          <p className="text-xs sm:text-base font-medium text-zinc-300 max-w-2xl mx-auto">
            {lang === 'mr'
              ? `${STUDIO_CONTACT.brand} — ${MONTH_NAMES.mr[BOOKED_MONTH_INDEX]} ${bookedYear} मधील बुक तारखा लाल रंगात हायलाइट आहेत. उपलब्ध तारखेवर क्लिक करून बुकिंग करा.`
              : lang === 'hi'
                ? `${STUDIO_CONTACT.brand} — ${MONTH_NAMES.hi[BOOKED_MONTH_INDEX]} ${bookedYear} की बुक तारीखें लाल रंग में हाइलाइट हैं। उपलब्ध तारीख चुनकर बुकिंग करें।`
                : lang === 'gu'
                  ? `${STUDIO_CONTACT.brand} — ${MONTH_NAMES.gu[BOOKED_MONTH_INDEX]} ${bookedYear} ની બુક તારીખો લાલ રંગમાં હાઇલાઇટ છે. ઉપલબ્ધ તારીખ પસંદ કરીને બુક કરો.`
                  : `${STUDIO_CONTACT.brand} — Booked dates in ${MONTH_NAMES.en[BOOKED_MONTH_INDEX]} ${bookedYear} are highlighted in red. Tap any available date to book your live broadcast.`}
          </p>
        </div>

        {/* Clean Single Calendar Card */}
        <div className="bg-[#120D12]/95 border border-[#FACC15]/35 rounded-2xl p-3.5 sm:p-6 shadow-[0_20px_54px_rgba(0,0,0,0.6)] space-y-4">
          {/* Month Navigation Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-white/10">
            <div className="flex items-center gap-2.5 min-w-0">
              <CalendarDays className="w-5 h-5 sm:w-6 sm:h-6 text-[#FACC15] shrink-0" aria-hidden="true" />
              <h3 className="font-display text-xl sm:text-2xl font-extrabold text-white tracking-tight tabular-nums">
                {monthLabel} {viewYear}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              {!isDecemberBookedMonth && (
                <button
                  type="button"
                  onClick={handleJumpDecember}
                  className="min-h-[40px] px-3 py-1.5 text-xs font-bold text-black bg-[#FACC15] hover:bg-[#FDE047] rounded-lg transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  {MONTH_NAMES[lang][BOOKED_MONTH_INDEX]} {bookedYear}
                </button>
              )}
              <button
                type="button"
                onClick={handlePrevMonth}
                aria-label="Previous month"
                className="w-10 h-10 inline-flex items-center justify-center rounded-lg border border-white/15 bg-white/[0.04] text-zinc-200 hover:text-white hover:border-[#FACC15]/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                aria-label="Next month"
                className="w-10 h-10 inline-flex items-center justify-center rounded-lg border border-white/15 bg-white/[0.04] text-zinc-200 hover:text-white hover:border-[#FACC15]/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Clean Legend Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-300">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
              <span className="inline-flex items-center gap-2 font-semibold text-white">
                <span
                  aria-hidden="true"
                  className="w-3.5 h-3.5 rounded bg-[#DC2626] border border-[#FACC15] shrink-0"
                />
                <span>
                  {lang === 'mr'
                    ? 'बुक तारीख'
                    : lang === 'hi'
                      ? 'बुक तारीख'
                      : lang === 'gu'
                        ? 'બુક તારીખ'
                        : 'Booked'}
                </span>
              </span>
              <span className="inline-flex items-center gap-2 text-zinc-300">
                <span
                  aria-hidden="true"
                  className="w-3.5 h-3.5 rounded bg-white/[0.06] border border-white/20 shrink-0"
                />
                <span>
                  {lang === 'mr'
                    ? 'उपलब्ध तारीख'
                    : lang === 'hi'
                      ? 'उपलब्ध तारीख'
                      : lang === 'gu'
                        ? 'ઉપલબ્ધ તારીખ'
                        : 'Available'}
                </span>
              </span>
              <span className="inline-flex items-center gap-2 text-[#FACC15] font-medium">
                <span
                  aria-hidden="true"
                  className="w-3.5 h-3.5 rounded bg-[#FACC15]/20 border border-[#FACC15] shrink-0"
                />
                <span>
                  {lang === 'mr'
                    ? 'निवडलेली तारीख'
                    : lang === 'hi'
                      ? 'चुनी गई तारीख'
                      : lang === 'gu'
                        ? 'પસંદ કરેલ તારીખ'
                        : 'Selected'}
                </span>
              </span>
            </div>

            <a
              href={STUDIO_CONTACT.phoneHref}
              className="inline-flex items-center gap-1.5 font-mono text-xs sm:text-sm font-bold text-[#FACC15] hover:text-white transition-colors tabular-nums whitespace-nowrap"
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
                  idx === 0 ? 'text-[#F87171]' : 'text-zinc-400'
                }`}
              >
                {dayName}
              </div>
            ))}
          </div>

          {/* 7-Column Calendar Days Grid */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5">
            {calendarCells.map((cell) => {
              if (cell.day === null) {
                return (
                  <div
                    key={cell.key}
                    aria-hidden="true"
                    className="min-h-[52px] sm:min-h-[70px] rounded-xl bg-white/[0.015] border border-white/[0.04]"
                  />
                );
              }

              const day = cell.day;
              const isBooked = isDecemberBookedMonth && BOOKED_DAY_SET.has(day);
              const isToday =
                viewYear === todayYear && viewMonth === todayMonth && day === todayDate;
              const isSelected = selectedDay === day;

              return (
                <button
                  key={cell.key}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  aria-pressed={isSelected}
                  aria-label={`${day} ${monthLabel} ${viewYear} - ${
                    isBooked ? 'Booked' : 'Available'
                  }`}
                  className={`relative min-h-[52px] sm:min-h-[70px] rounded-xl border px-1 py-1.5 sm:p-2 flex flex-col items-center justify-center transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] ${
                    isBooked
                      ? isSelected
                        ? 'bg-[#B91C1C] border-2 border-[#FACC15] text-white shadow-[0_0_24px_rgba(250,204,21,0.5)]'
                        : 'bg-gradient-to-b from-[#EF4444] to-[#B91C1C] border-[#FACC15]/90 text-white shadow-[0_6px_18px_rgba(220,38,38,0.48)] hover:brightness-110'
                      : isSelected
                        ? 'bg-[#FACC15]/20 border-2 border-[#FACC15] text-white shadow-[0_0_20px_rgba(250,204,21,0.3)]'
                        : 'bg-white/[0.035] border-white/10 text-zinc-100 hover:border-[#FACC15]/60 hover:bg-white/[0.08]'
                  }`}
                >
                  <span
                    className={`font-mono text-sm sm:text-xl font-extrabold leading-none tabular-nums ${
                      isBooked
                        ? 'text-white'
                        : isSelected
                          ? 'text-[#FACC15]'
                          : 'text-zinc-100'
                    }`}
                  >
                    {day}
                  </span>

                  {isBooked ? (
                    <span className="mt-1 text-[9px] sm:text-[10px] font-black tracking-wide text-[#FEF08A] leading-none">
                      {bookedLabel}
                    </span>
                  ) : isToday ? (
                    <span className="mt-1 text-[9px] sm:text-[10px] font-bold text-[#FACC15] leading-none">
                      {lang === 'mr'
                        ? 'आज'
                        : lang === 'hi'
                          ? 'आज'
                          : lang === 'gu'
                            ? 'આજ'
                            : 'Today'}
                    </span>
                  ) : (
                    <span className="mt-1 hidden sm:block text-[10px] font-medium text-zinc-400 leading-none">
                      {openLabel}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Inline Selected Date Action Strip (only when a date is tapped) */}
          {selectedDay !== null && (
            <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {selectedIsBooked ? (
                <>
                  <div className="flex items-center gap-2.5">
                    <Lock className="w-5 h-5 text-[#F87171] shrink-0" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="font-mono text-sm sm:text-base font-extrabold text-white tabular-nums">
                        {selectedDay} {monthLabel} {viewYear}
                      </p>
                      <p className="text-xs font-semibold text-[#F87171]">
                        {lang === 'mr'
                          ? 'ही तारीख आधीच बुक झाली आहे — कृपया दुसरी उपलब्ध तारीख निवडा किंवा कॉल करा.'
                          : lang === 'hi'
                            ? 'यह तारीख पहले से बुक है — कृपया कोई दूसरी खाली तारीख चुनें या कॉल करें।'
                            : lang === 'gu'
                              ? 'આ તારીખ પહેલેથી બુક છે — કૃપા કરીને અન્ય ઉપલબ્ધ તારીખ પસંદ કરો અથવા કોલ કરો.'
                              : 'Already Booked — choose another available date or call for backup crew.'}
                      </p>
                    </div>
                  </div>

                  <a
                    href={STUDIO_CONTACT.phoneHref}
                    className="btn-primary-pro min-h-[42px] inline-flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold rounded-xl whitespace-nowrap shrink-0 tabular-nums"
                  >
                    <Phone className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{STUDIO_CONTACT.phoneDisplay}</span>
                  </a>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-[#FACC15] shrink-0" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="font-mono text-sm sm:text-base font-extrabold text-white tabular-nums">
                        {selectedDay} {monthLabel} {viewYear}
                      </p>
                      <p className="text-xs font-semibold text-[#FACC15]">
                        {lang === 'mr'
                          ? 'बुकिंगसाठी उपलब्ध'
                          : lang === 'hi'
                            ? 'बुकिंग के लिए उपलब्ध'
                            : lang === 'gu'
                              ? 'બુકિંગ માટે ઉપલબ્ધ'
                              : 'Available for Live Booking'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {selectedIsoDate && (
                      <button
                        type="button"
                        onClick={() => onSelectDateForBooking(selectedIsoDate)}
                        className="btn-gold-pro min-h-[42px] inline-flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-extrabold text-black rounded-xl whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                      >
                        <span>
                          {lang === 'mr'
                            ? 'ही तारीख बुक करा'
                            : lang === 'hi'
                              ? 'यह तारीख बुक करें'
                              : lang === 'gu'
                                ? 'આ તારીખ બુક કરો'
                                : 'Book This Date'}
                        </span>
                        <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
                      </button>
                    )}
                    <a
                      href={`https://wa.me/${STUDIO_CONTACT.whatsappNumber}?text=${encodeURIComponent(
                        `Hello Star Event Live, I want to book live streaming for ${selectedDay} ${monthLabel} ${viewYear}.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-glass-pro min-h-[42px] inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-zinc-100 rounded-xl whitespace-nowrap"
                    >
                      <MessageCircle className="w-4 h-4 text-[#FACC15] shrink-0" aria-hidden="true" />
                      <span>WhatsApp</span>
                    </a>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
