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
  const baseYear = initialNow.getFullYear();
  const baseMonth = initialNow.getMonth();
  const todayDate = initialNow.getDate();

  const [viewYear, setViewYear] = useState(baseYear);
  const [viewMonth, setViewMonth] = useState(baseMonth);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const isBookingMonth = viewYear === baseYear && viewMonth === baseMonth;

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

  const handleJumpCurrentMonth = () => {
    setViewYear(baseYear);
    setViewMonth(baseMonth);
    setSelectedDay(null);
  };

  const selectedIsBooked = Boolean(
    selectedDay !== null && isBookingMonth && BOOKED_DAY_SET.has(selectedDay)
  );
  const selectedIsoDate =
    selectedDay !== null
      ? `${viewYear}-${pad2(viewMonth + 1)}-${pad2(selectedDay)}`
      : null;

  const bookedBadgeText =
    lang === 'mr' ? 'बुक' : lang === 'hi' ? 'बुक' : lang === 'gu' ? 'બુક' : 'BOOKED';

  const openBadgeText =
    lang === 'mr' ? 'उपलब्ध' : lang === 'hi' ? 'खाली' : lang === 'gu' ? 'ખાલી' : 'Open';

  return (
    <section
      id="top"
      aria-labelledby="booking-date-heading"
      className="relative pt-5 pb-8 sm:pt-9 sm:pb-12 border-b border-white/10"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 space-y-5 sm:space-y-7">
        {/* Big Prominent Top Heading */}
        <div className="text-center space-y-2">
          <h1
            id="booking-date-heading"
            className="font-display text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-none text-[#FACC15] drop-shadow-[0_4px_24px_rgba(250,204,21,0.3)]"
          >
            BOOKING DATE
          </h1>
          <p className="text-xs sm:text-base font-medium text-zinc-300 max-w-2xl mx-auto">
            {lang === 'mr'
              ? `${STUDIO_CONTACT.brand} — ${monthLabel} ${viewYear} मधील बुक झालेल्या तारखा लाल रंगात हायलाइट केल्या आहेत. उपलब्ध तारखेवर क्लिक करून त्वरित बुकिंग करा.`
              : lang === 'hi'
                ? `${STUDIO_CONTACT.brand} — ${monthLabel} ${viewYear} की बुक की गई तारीखें लाल रंग में हाइलाइट हैं। खाली तारीख चुनकर तुरंत बुकिंग करें।`
                : lang === 'gu'
                  ? `${STUDIO_CONTACT.brand} — ${monthLabel} ${viewYear} ની બુક થયેલી તારીખો લાલ રંગમાં હાઇલાઇટ છે. ઉપલબ્ધ તારીખ પસંદ કરીને તરત બુક કરો.`
                  : `${STUDIO_CONTACT.brand} — Booked dates for ${monthLabel} ${viewYear} are highlighted in red. Tap any open date to book your live broadcast.`}
          </p>
        </div>

        {/* Main 2-Column Calendar + Booked Summary Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-stretch">
          {/* Calendar Grid Card */}
          <div className="lg:col-span-8 bg-[#120D12]/95 border border-[#FACC15]/30 rounded-2xl p-3.5 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.55)] flex flex-col">
            {/* Month Header & Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5 min-w-0">
                <CalendarDays className="w-5 h-5 sm:w-6 sm:h-6 text-[#FACC15] shrink-0" aria-hidden="true" />
                <h2 className="font-display text-xl sm:text-2xl font-extrabold text-white tracking-tight tabular-nums">
                  {monthLabel} {viewYear}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                {!isBookingMonth && (
                  <button
                    type="button"
                    onClick={handleJumpCurrentMonth}
                    className="min-h-[40px] px-3 py-1.5 text-xs font-bold text-black bg-[#FACC15] hover:bg-[#FDE047] rounded-lg transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    {lang === 'mr'
                      ? 'चालू महिना'
                      : lang === 'hi'
                        ? 'मौजूदा महीना'
                        : lang === 'gu'
                          ? 'ચાલુ મહિનો'
                          : 'Current Month'}
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

            {/* Legend Row (Clean unboxed metadata, no pill clutter) */}
            <div className="flex flex-wrap items-center justify-between gap-3 py-3 text-xs text-zinc-300">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
                <span className="inline-flex items-center gap-2 font-semibold text-white">
                  <span
                    aria-hidden="true"
                    className="w-3.5 h-3.5 rounded bg-[#DC2626] border border-[#FACC15] shrink-0"
                  />
                  <span>
                    {lang === 'mr'
                      ? 'बुक तारीख (9–14, 18–20)'
                      : lang === 'hi'
                        ? 'बुक तारीख (9–14, 18–20)'
                        : lang === 'gu'
                          ? 'બુક તારીખ (9–14, 18–20)'
                          : 'Booked Date (9–14, 18–20)'}
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

              {isBookingMonth && (
                <span className="font-mono text-xs text-zinc-400 tabular-nums">
                  {BOOKED_DAY_NUMBERS.length}{' '}
                  {lang === 'mr'
                    ? 'तारखा बुक'
                    : lang === 'hi'
                      ? 'तारीखें बुक'
                      : lang === 'gu'
                        ? 'તારીખો બુક'
                        : 'dates booked'}
                </span>
              )}
            </div>

            {/* Weekday Header */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2 pb-2">
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

            {/* 7-Column Days Grid */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2 flex-1">
              {calendarCells.map((cell) => {
                if (cell.day === null) {
                  return (
                    <div
                      key={cell.key}
                      aria-hidden="true"
                      className="min-h-[50px] sm:min-h-[66px] rounded-xl bg-white/[0.015] border border-white/[0.04]"
                    />
                  );
                }

                const day = cell.day;
                const isBooked = isBookingMonth && BOOKED_DAY_SET.has(day);
                const isToday = isBookingMonth && day === todayDate;
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
                    className={`relative min-h-[50px] sm:min-h-[66px] rounded-xl border px-1 py-1.5 sm:p-2 flex flex-col items-center justify-center transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] ${
                      isBooked
                        ? isSelected
                          ? 'bg-[#B91C1C] border-2 border-[#FACC15] text-white shadow-[0_0_24px_rgba(250,204,21,0.45)]'
                          : 'bg-gradient-to-b from-[#EF4444] to-[#B91C1C] border-[#FACC15]/85 text-white shadow-[0_6px_18px_rgba(220,38,38,0.45)] hover:brightness-110'
                        : isSelected
                          ? 'bg-[#FACC15]/20 border-2 border-[#FACC15] text-white shadow-[0_0_20px_rgba(250,204,21,0.28)]'
                          : 'bg-white/[0.035] border-white/10 text-zinc-100 hover:border-[#FACC15]/60 hover:bg-white/[0.08]'
                    }`}
                  >
                    <span
                      className={`font-mono text-sm sm:text-lg font-extrabold leading-none tabular-nums ${
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
                        {bookedBadgeText}
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
                        {openBadgeText}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Summary & Quick Booking Panel */}
          <aside className="lg:col-span-4 bg-[#120D12]/95 border border-white/12 rounded-2xl p-4 sm:p-6 flex flex-col justify-between gap-5">
            <div className="space-y-5">
              {/* Highlighted Booked Dates Roster */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-base sm:text-lg font-bold text-white">
                    {lang === 'mr'
                      ? 'बुक झालेल्या तारखा'
                      : lang === 'hi'
                        ? 'बुक की गई तारीखें'
                        : lang === 'gu'
                          ? 'બુક થયેલી તારીખો'
                          : 'Highlighted Booked Dates'}
                  </h3>
                  <span className="font-mono text-xs font-bold text-[#F87171] tabular-nums">
                    {MONTH_NAMES[lang][baseMonth]} {baseYear}
                  </span>
                </div>

                <div className="grid grid-cols-5 sm:grid-cols-9 lg:grid-cols-3 gap-2">
                  {BOOKED_DAY_NUMBERS.map((d) => {
                    const active = isBookingMonth && selectedDay === d;
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          setViewYear(baseYear);
                          setViewMonth(baseMonth);
                          setSelectedDay(d);
                        }}
                        className={`min-h-[42px] rounded-xl border font-mono text-sm font-extrabold tabular-nums transition-all flex items-center justify-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] ${
                          active
                            ? 'bg-[#B91C1C] border-[#FACC15] text-white shadow-[0_0_16px_rgba(250,204,21,0.4)]'
                            : 'bg-[#DC2626]/22 border-[#EF4444]/65 text-[#FECACA] hover:bg-[#DC2626]/40 hover:text-white'
                        }`}
                      >
                        <span>{d}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {lang === 'mr'
                    ? 'या तारखा आधीच बुक झाल्या आहेत. इतर कोणत्याही मोकळ्या तारखेवर क्लिक करून तुमचा कार्यक्रम बुक करा.'
                    : lang === 'hi'
                      ? 'ये तारीखें पहले से बुक हैं। किसी भी अन्य खाली तारीख पर क्लिक करके अपना लाइव इवेंट बुक करें।'
                      : lang === 'gu'
                        ? 'આ તારીખો પહેલેથી જ બુક છે. અન્ય કોઈપણ ખાલી તારીખ પર ક્લિક કરીને તમારો ઇવેન્ટ બુક કરો.'
                        : 'These 9 dates are already reserved. Pick any open date on the calendar to request your live broadcast.'}
                </p>
              </div>

              {/* Selected Date Action Box */}
              <div className="pt-4 border-t border-white/10 space-y-3">
                {selectedDay === null ? (
                  <div className="space-y-1.5">
                    <p className="text-sm font-bold text-white">
                      {lang === 'mr'
                        ? 'कॅलेंडरमधून तारीख निवडा'
                        : lang === 'hi'
                          ? 'कैलेंडर से कोई तारीख चुनें'
                          : lang === 'gu'
                            ? 'કેલેન્ડરમાંથી તારીખ પસંદ કરો'
                            : 'Tap Any Date to Check Status'}
                    </p>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {lang === 'mr'
                        ? 'उपलब्ध तारखेवर क्लिक केल्यास ती तारीख थेट बुकिंग फॉर्ममध्ये भरली जाईल.'
                        : lang === 'hi'
                          ? 'किसी भी खाली तारीख पर क्लिक करने पर वह सीधे बुकिंग फॉर्म में भर जाएगी।'
                          : lang === 'gu'
                            ? 'ઉપલબ્ધ તારીખ પર ક્લિક કરવાથી તે સીધી બુકિંગ ફોર્મમાં ભરાઈ જશે.'
                            : 'Select an available date to pre-fill the booking form instantly, or tap a red booked date for details.'}
                    </p>
                  </div>
                ) : selectedIsBooked ? (
                  <div className="space-y-3">
                    <div className="flex items-start gap-2.5">
                      <Lock className="w-5 h-5 text-[#F87171] shrink-0 mt-0.5" aria-hidden="true" />
                      <div>
                        <p className="font-mono text-base font-extrabold text-white tabular-nums">
                          {selectedDay} {monthLabel} {viewYear}
                        </p>
                        <p className="text-xs font-bold text-[#F87171] mt-0.5">
                          {lang === 'mr'
                            ? 'ही तारीख आधीच बुक झाली आहे'
                            : lang === 'hi'
                              ? 'यह तारीख पहले से बुक है'
                              : lang === 'gu'
                                ? 'આ તારીખ પહેલેથી બુક છે'
                                : 'Already Booked'}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {lang === 'mr'
                        ? 'दुसरी उपलब्ध तारीख निवडा किंवा बॅकअप टीमसाठी थेट कॉल करा.'
                        : lang === 'hi'
                          ? 'कृपया कोई अन्य उपलब्ध तारीख चुनें या अतिरिक्त टीम के लिए सीधे कॉल करें।'
                          : lang === 'gu'
                            ? 'કૃપા કરીને અન્ય ઉપલબ્ધ તારીખ પસંદ કરો અથવા બેકઅપ ટીમ માટે સીધો કોલ કરો.'
                            : 'Please choose another available date or call our studio desk to check backup camera crew availability.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-5 h-5 text-[#FACC15] shrink-0 mt-0.5" aria-hidden="true" />
                      <div>
                        <p className="font-mono text-base font-extrabold text-white tabular-nums">
                          {selectedDay} {monthLabel} {viewYear}
                        </p>
                        <p className="text-xs font-bold text-[#FACC15] mt-0.5">
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

                    {selectedIsoDate && (
                      <button
                        type="button"
                        onClick={() => onSelectDateForBooking(selectedIsoDate)}
                        className="btn-gold-pro w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-extrabold text-black rounded-xl whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
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
                  </div>
                )}
              </div>
            </div>

            {/* Direct Booking Hotline Footer */}
            <div className="pt-4 border-t border-white/10 space-y-2.5">
              <p className="text-xs text-zinc-400">
                {lang === 'mr'
                  ? 'त्वरित तारीख निश्चितीसाठी कॉल करा:'
                  : lang === 'hi'
                    ? 'तुरंत तारीख कन्फर्म करने के लिए कॉल करें:'
                    : lang === 'gu'
                      ? 'તરત તારીખ કન્ફર્મ કરવા કોલ કરો:'
                      : 'Confirm your date directly:'}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={STUDIO_CONTACT.phoneHref}
                  className="btn-primary-pro flex-1 min-h-[42px] inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl whitespace-nowrap tabular-nums"
                >
                  <Phone className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{STUDIO_CONTACT.phoneDisplay}</span>
                </a>
                <a
                  href={`https://wa.me/${STUDIO_CONTACT.whatsappNumber}?text=${encodeURIComponent(
                    selectedIsoDate
                      ? `Hello Star Event Live, I want to check live streaming booking for ${selectedIsoDate}.`
                      : 'Hello Star Event Live, I want to check available booking dates for my event.'
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-glass-pro min-h-[42px] inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-zinc-100 rounded-xl whitespace-nowrap"
                >
                  <MessageCircle className="w-4 h-4 text-[#FACC15] shrink-0" aria-hidden="true" />
                  <span>WhatsApp</span>
                </a>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
