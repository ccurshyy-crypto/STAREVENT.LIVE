import { FormEvent, useEffect, useState } from 'react';
import { Check, Copy, ExternalLink, Instagram, MessageCircle, Phone, Youtube } from 'lucide-react';
import {
  ADDON_OPTIONS,
  EVENT_SERVICES,
  EventCategoryId,
  Language,
  PlatformId,
  PRODUCTION_PACKAGES,
  STUDIO_CONTACT,
  UI_COPY,
} from '../data/content';
import { ScrollReveal } from './ScrollReveal';

interface BookingSectionProps {
  lang: Language;
  selectedEvent: EventCategoryId;
  onChangeEvent: (category: EventCategoryId) => void;
  selectedPackageId: string;
  onChangePackage: (packageId: string) => void;
  selectedAddOns: string[];
  selectedDate?: string;
  onChangeDate?: (isoDate: string) => void;
  onOpenPackages?: () => void;
}

interface SubmittedInquiry {
  refId: string;
  name: string;
  phone: string;
  eventLabel: string;
  date: string;
  venue: string;
  packageName: string;
  platforms: string;
  addons: string;
  notes: string;
  summaryText: string;
  whatsappHref: string;
}

export function BookingSection({
  lang,
  selectedEvent,
  onChangeEvent,
  selectedPackageId,
  onChangePackage,
  selectedAddOns,
  selectedDate,
  onChangeDate,
  onOpenPackages,
}: BookingSectionProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [eventDate, setEventDate] = useState(selectedDate ?? '');
  const [venue, setVenue] = useState('');
  const [platforms, setPlatforms] = useState<PlatformId[]>(['youtube-public']);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (selectedDate) {
      setEventDate(selectedDate);
    }
  }, [selectedDate]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<SubmittedInquiry | null>(null);
  const [copied, setCopied] = useState(false);

  const togglePlatform = (platformId: PlatformId) => {
    setPlatforms((prev) =>
      prev.includes(platformId)
        ? prev.filter((item) => item !== platformId)
        : [...prev, platformId]
    );
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const nextErrors: Record<string, string> = {};
    const cleanedPhone = phone.replace(/\D/g, '');

    if (name.trim().length < 2) {
      nextErrors.name =
        lang === 'mr' ? 'कृपया तुमचे पूर्ण नाव प्रविष्ट करा.' : 'Please enter your full name.';
    }
    if (cleanedPhone.length < 10) {
      nextErrors.phone =
        lang === 'mr'
          ? 'कृपया वैध 10 अंकी मोबाईल नंबर प्रविष्ट करा.'
          : 'Please enter a valid 10-digit mobile number.';
    }
    if (!eventDate) {
      nextErrors.date =
        lang === 'mr' ? 'कृपया कार्यक्रमाची तारीख निवडा.' : 'Please select your event date.';
    }
    if (venue.trim().length < 2) {
      nextErrors.venue =
        lang === 'mr' ? 'कृपया शहर किंवा कार्यक्रमाचे ठिकाण लिहा.' : 'Please enter event city or venue.';
    }
    if (platforms.length === 0) {
      nextErrors.platforms =
        lang === 'mr'
          ? 'किमान एक लाईव्ह प्लॅटफॉर्म निवडा.'
          : 'Select at least one live streaming platform.';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const eventObj = EVENT_SERVICES.find((item) => item.id === selectedEvent) ?? EVENT_SERVICES[0];
    const pkgObj =
      PRODUCTION_PACKAGES.find((item) => item.id === selectedPackageId) ?? PRODUCTION_PACKAGES[1];
    const addonLabels = ADDON_OPTIONS.filter((a) => selectedAddOns.includes(a.id)).map(
      (a) => a.label[lang]
    );

    const refId = `SEL-${Math.floor(100000 + Math.random() * 900000)}`;
    const platformList = platforms
      .map((p) =>
        p === 'youtube-public'
          ? 'YouTube Live (Public)'
          : p === 'youtube-unlisted'
            ? 'YouTube Live (Private Link)'
            : 'Venue LED Wall'
      )
      .join(', ');

    const summaryLines = [
      `STAR EVENT LIVE (starevent.live) Booking Inquiry`,
      `Ref: ${refId}`,
      `Name: ${name.trim()}`,
      `Mobile: ${cleanedPhone}`,
      `Event: ${eventObj.title[lang]}`,
      `Date: ${eventDate}`,
      `Venue: ${venue.trim()}`,
      `Package: ${pkgObj.name[lang]}`,
      `Platforms: ${platformList}`,
      addonLabels.length > 0 ? `Add-ons: ${addonLabels.join(', ')}` : null,
      notes.trim() ? `Notes: ${notes.trim()}` : null,
    ].filter(Boolean);

    const summaryText = summaryLines.join('\n');
    const whatsappHref = `https://wa.me/${STUDIO_CONTACT.whatsappNumber}?text=${encodeURIComponent(
      summaryText
    )}`;

    setSubmitted({
      refId,
      name: name.trim(),
      phone: cleanedPhone,
      eventLabel: eventObj.title[lang],
      date: eventDate,
      venue: venue.trim(),
      packageName: pkgObj.name[lang],
      platforms: platformList,
      addons: addonLabels.join(', '),
      notes: notes.trim(),
      summaryText,
      whatsappHref,
    });
    setCopied(false);
  };

  const handleCopySummary = async () => {
    if (!submitted) return;
    try {
      await navigator.clipboard.writeText(submitted.summaryText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section id="book" className="py-12 sm:py-20 lg:py-24 bg-[#070B28]/48 backdrop-blur-[2px]">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left column: Direct Studio Hotline & Promise */}
          <ScrollReveal direction="left" className="lg:col-span-5 space-y-8">
            <div className="space-y-3.5">
              <p className="text-xs sm:text-sm font-bold text-[#FFE600]">
                {UI_COPY.bookingSection.kicker[lang]}
              </p>
              <h2
                className={`font-display text-2xl sm:text-4xl font-bold text-white ${
                  lang === 'mr' ? 'leading-[1.38] tracking-normal' : 'leading-[1.2] tracking-tight'
                }`}
              >
                {UI_COPY.bookingSection.heading[lang]}
              </h2>
              <p className="text-sm sm:text-base text-[#FFF3EC]/90 leading-[1.72]">
                {UI_COPY.bookingSection.intro[lang]}
              </p>
            </div>

            {/* Direct Phone Callout matching Banner Red/Yellow Phone Box */}
            <div className="bg-[#0A1033]/94 border border-[#FFE600]/40 rounded-2xl p-4 sm:p-6 space-y-5 shadow-[0_18px_48px_rgba(0,0,0,0.5)]">
              <div className="space-y-1">
                <p className="text-xs text-white/80">
                  {lang === 'mr' ? 'थेट बुकिंग व चौकशीसाठी संपर्क करा' : 'Direct Booking & Dispatch Hotline'}
                </p>
                <a
                  href={STUDIO_CONTACT.phoneHref}
                  className="inline-block font-mono text-2xl sm:text-4xl font-extrabold text-[#FFE600] hover:text-white transition-colors tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFE600] rounded"
                >
                  {STUDIO_CONTACT.phoneDisplay}
                </a>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={STUDIO_CONTACT.phoneHref}
                  className="btn-primary-pro inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl whitespace-nowrap"
                >
                  <Phone className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{lang === 'mr' ? 'आत्ताच कॉल करा' : 'Call Now'}</span>
                </a>
                <a
                  href={`https://wa.me/${STUDIO_CONTACT.whatsappNumber}?text=${encodeURIComponent(
                    'Hello Star Event Live (starevent.live), I would like to inquire about live streaming for my upcoming event.'
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white hover:text-[#FFE600] border border-white/20 hover:border-[#FFE600]/60 rounded-lg transition-colors whitespace-nowrap"
                >
                  <MessageCircle className="w-4 h-4 text-[#FFE600] shrink-0" aria-hidden="true" />
                  <span>{lang === 'mr' ? 'WhatsApp संदेश पाठवा' : 'Message on WhatsApp'}</span>
                </a>
                <a
                  href={STUDIO_CONTACT.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white hover:text-[#FFE600] border border-white/20 hover:border-[#E11D1D]/70 rounded-lg transition-colors whitespace-nowrap"
                >
                  <Youtube className="w-4 h-4 text-[#FF2E2E] shrink-0" aria-hidden="true" />
                  <span>
                    {lang === 'mr'
                      ? `YouTube चॅनेल (${STUDIO_CONTACT.youtubeHandle})`
                      : `YouTube (${STUDIO_CONTACT.youtubeHandle})`}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-white/60 shrink-0" aria-hidden="true" />
                </a>
                {STUDIO_CONTACT.instagramAccounts.map((ig) => (
                  <a
                    key={ig.handle}
                    href={ig.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white hover:text-[#FFE600] border border-white/20 hover:border-[#F472B6]/60 rounded-lg transition-colors whitespace-nowrap"
                  >
                    <Instagram className="w-4 h-4 text-[#F472B6] shrink-0" aria-hidden="true" />
                    <span>{ig.handle}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-white/60 shrink-0" aria-hidden="true" />
                  </a>
                ))}
              </div>

              <div className="pt-4 border-t border-white/15 space-y-2 text-xs text-[#E2E8F8]/85">
                <p className="font-bold text-[#FFE600]">
                  {STUDIO_CONTACT.promiseMr}
                </p>
                <p>{STUDIO_CONTACT.promiseEn}</p>
              </div>
            </div>

            {/* Service checklist */}
            <div className="space-y-3 text-xs sm:text-sm text-[#FFF3EC]/90 leading-relaxed">
              <p className="font-bold text-[#FFE600]">
                {lang === 'mr' ? 'बुकिंगमध्ये समाविष्ट असलेली खात्री:' : 'Included with every booking:'}
              </p>
              <p>— {lang === 'mr' ? 'कार्यक्रमापूर्वी नेटवर्क व ऑडिओ तपासणी' : 'Pre-event internet speed & soundboard check'}</p>
              <p>— {lang === 'mr' ? 'कस्टम मराठी / इंग्रजी स्क्रीन टायटल डिझाइन' : 'Custom Marathi or English title graphics design'}</p>
              <p>— {lang === 'mr' ? 'YouTube (@stareventlive01) लाईव्ह लिंक शेअरिंग' : 'Ready-to-share YouTube Live viewing link before event start'}</p>
            </div>
          </ScrollReveal>

          {/* Right column: Validated Booking Inquiry Form / Confirmation */}
          <ScrollReveal direction="right" delay={100} className="lg:col-span-7 bg-[#0A1033]/94 border border-[#FFE600]/40 rounded-2xl p-4 sm:p-8 shadow-[0_18px_48px_rgba(0,0,0,0.5)]">
            {submitted ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="font-mono text-xs font-semibold text-[#FACC15] tabular-nums">
                    {lang === 'mr' ? 'बुकिंग संदर्भ क्रमांक:' : 'BOOKING REFERENCE:'} {submitted.refId}
                  </p>
                  <h3 className="font-display text-2xl font-bold text-white">
                    {lang === 'mr'
                      ? 'तुमची बुकिंग विनंती तयार आहे'
                      : 'Your Event Inquiry Is Ready'}
                  </h3>
                  <p className="text-sm text-zinc-400">
                    {lang === 'mr'
                      ? 'जलद निश्चितीसाठी खालील WhatsApp बटणावर क्लिक करून ही माहिती थेट 9890175727 वर पाठवा किंवा कॉल करा.'
                      : 'Send this summary directly to 9890175727 on WhatsApp or call us to lock in your broadcast crew.'}
                  </p>
                </div>

                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-5 border-y border-white/10 text-sm">
                  <div>
                    <dt className="text-xs text-zinc-400">{lang === 'mr' ? 'नाव' : 'Name'}</dt>
                    <dd className="font-medium text-white mt-0.5">{submitted.name}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-zinc-400">{lang === 'mr' ? 'मोबाईल' : 'Mobile'}</dt>
                    <dd className="font-mono font-medium text-white mt-0.5 tabular-nums">
                      {submitted.phone}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-zinc-400">{lang === 'mr' ? 'कार्यक्रम' : 'Event'}</dt>
                    <dd className="font-medium text-white mt-0.5">{submitted.eventLabel}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-zinc-400">{lang === 'mr' ? 'दिनांक व ठिकाण' : 'Date & Venue'}</dt>
                    <dd className="font-medium text-white mt-0.5 tabular-nums">
                      {submitted.date} · {submitted.venue}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-zinc-400">{lang === 'mr' ? 'पॅकेज' : 'Package'}</dt>
                    <dd className="font-medium text-white mt-0.5">{submitted.packageName}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-zinc-400">{lang === 'mr' ? 'प्लॅटफॉर्म्स' : 'Platforms'}</dt>
                    <dd className="font-medium text-white mt-0.5">{submitted.platforms}</dd>
                  </div>
                  {submitted.addons && (
                    <div className="sm:col-span-2">
                      <dt className="text-xs text-zinc-400">{lang === 'mr' ? 'अतिरिक्त पर्याय' : 'Selected Add-ons'}</dt>
                      <dd className="font-medium text-[#FACC15] mt-0.5">{submitted.addons}</dd>
                    </div>
                  )}
                </dl>

                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href={submitted.whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-[#DC2626] hover:bg-[#B91C1C] rounded-lg transition-colors text-center sm:whitespace-nowrap"
                  >
                    <MessageCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>
                      {lang === 'mr' ? 'WhatsApp वर पाठवा (9890175727)' : 'Send via WhatsApp (9890175727)'}
                    </span>
                  </a>

                  <button
                    type="button"
                    onClick={handleCopySummary}
                    className="inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold text-zinc-200 hover:text-white border border-white/15 hover:border-white/30 rounded-lg transition-colors whitespace-nowrap"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-[#FACC15]" aria-hidden="true" />
                    ) : (
                      <Copy className="w-4 h-4" aria-hidden="true" />
                    )}
                    <span>
                      {copied
                        ? lang === 'mr'
                          ? 'कॉपी झाले'
                          : 'Copied'
                        : lang === 'mr'
                          ? 'माहिती कॉपी करा'
                          : 'Copy Details'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSubmitted(null)}
                    className="px-3 py-3 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
                  >
                    {lang === 'mr' ? 'बदल करा' : 'Edit Inquiry'}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="booking-name" className="block text-xs font-medium text-zinc-300">
                      {lang === 'mr' ? 'पूर्ण नाव *' : 'Full Name *'}
                    </label>
                    <input
                      id="booking-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={lang === 'mr' ? 'उदा. रोहित पाटील' : 'e.g. Rohit Patil'}
                      className="w-full px-3.5 py-2.5 text-sm bg-[#060A24] border border-white/15 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#FACC15]"
                    />
                    {errors.name && <p className="text-xs text-[#F87171]">{errors.name}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="booking-phone" className="block text-xs font-medium text-zinc-300">
                      {lang === 'mr' ? 'मोबाईल / WhatsApp नंबर *' : 'Mobile / WhatsApp Number *'}
                    </label>
                    <input
                      id="booking-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="9890XXXXXX"
                      className="w-full px-3.5 py-2.5 text-sm font-mono bg-[#060A24] border border-white/15 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#FACC15] tabular-nums"
                    />
                    {errors.phone && <p className="text-xs text-[#F87171]">{errors.phone}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="booking-event" className="block text-xs font-medium text-zinc-300">
                      {lang === 'mr' ? 'कार्यक्रमाचा प्रकार *' : 'Event Category *'}
                    </label>
                    <select
                      id="booking-event"
                      value={selectedEvent}
                      onChange={(e) => onChangeEvent(e.target.value as EventCategoryId)}
                      className="w-full px-3.5 py-2.5 text-sm bg-[#060A24] border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#FACC15]"
                    >
                      {EVENT_SERVICES.map((ev) => (
                        <option key={ev.id} value={ev.id} className="bg-[#060A24] text-white">
                          {ev.title[lang]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <label htmlFor="booking-package" className="block text-xs font-medium text-zinc-300">
                        {lang === 'mr' ? 'प्रॉडक्शन पॅकेज' : 'Production Package'}
                      </label>
                      {onOpenPackages && (
                        <button
                          type="button"
                          onClick={onOpenPackages}
                          className="text-[11px] font-semibold text-[#FACC15] hover:text-white transition-colors whitespace-nowrap"
                        >
                          {lang === 'mr' ? 'सर्व पॅकेजेस पहा →' : 'View packages →'}
                        </button>
                      )}
                    </div>
                    <select
                      id="booking-package"
                      value={selectedPackageId}
                      onChange={(e) => onChangePackage(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-[#060A24] border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#FACC15]"
                    >
                      {PRODUCTION_PACKAGES.map((pkg) => (
                        <option key={pkg.id} value={pkg.id} className="bg-[#060A24] text-white">
                          {pkg.name[lang]} ({pkg.priceRange[lang]})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="booking-date" className="block text-xs font-medium text-zinc-300">
                      {lang === 'mr' ? 'कार्यक्रमाची तारीख *' : 'Event Date *'}
                    </label>
                    <input
                      id="booking-date"
                      type="date"
                      value={eventDate}
                      onChange={(e) => {
                        setEventDate(e.target.value);
                        onChangeDate?.(e.target.value);
                      }}
                      className="w-full px-3.5 py-2.5 text-sm font-mono bg-[#060A24] border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#FACC15]"
                    />
                    {errors.date && <p className="text-xs text-[#F87171]">{errors.date}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="booking-venue" className="block text-xs font-medium text-zinc-300">
                      {lang === 'mr' ? 'शहर / कार्यक्रमाचे ठिकाण *' : 'City / Venue *'}
                    </label>
                    <input
                      id="booking-venue"
                      type="text"
                      value={venue}
                      onChange={(e) => setVenue(e.target.value)}
                      placeholder={lang === 'mr' ? 'उदा. नेरळ / कर्जत / बदलापूर / पुणे' : 'e.g. Neral / Karjat / Badlapur / Pune'}
                      className="w-full px-3.5 py-2.5 text-sm bg-[#060A24] border border-white/15 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#FACC15]"
                    />
                    {errors.venue && <p className="text-xs text-[#F87171]">{errors.venue}</p>}
                  </div>
                </div>

                {/* Broadcast Output Selection */}
                <div className="space-y-2">
                  <span className="block text-xs font-medium text-zinc-300">
                    {lang === 'mr' ? 'लाईव्ह प्रक्षेपण पर्याय निवडा *' : 'Broadcast Output *'}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {(['youtube-public', 'youtube-unlisted', 'led-wall'] as PlatformId[]).map((pid) => {
                      const active = platforms.includes(pid);
                      const label =
                        pid === 'youtube-public'
                          ? lang === 'mr'
                            ? 'YouTube Live (पब्लिक)'
                            : 'YouTube Live (Public)'
                          : pid === 'youtube-unlisted'
                            ? lang === 'mr'
                              ? 'YouTube Live (प्रायव्हेट लिंक)'
                              : 'YouTube Live (Private Link)'
                            : lang === 'mr'
                              ? 'व्हेन्यू LED स्क्रीन'
                              : 'Venue LED Wall';
                      return (
                        <button
                          key={pid}
                          type="button"
                          onClick={() => togglePlatform(pid)}
                          aria-pressed={active}
                          className={`px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] ${
                            active
                              ? 'bg-[#DC2626] border-[#DC2626] text-white'
                              : 'bg-[#060A24] border-white/15 text-zinc-300 hover:border-white/30'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  {errors.platforms && <p className="text-xs text-[#F87171]">{errors.platforms}</p>}
                </div>

                {/* Additional notes */}
                <div className="space-y-1.5">
                  <label htmlFor="booking-notes" className="block text-xs font-medium text-zinc-300">
                    {lang === 'mr'
                      ? 'अतिरिक्त माहिती (वेळ, कॅमेरे किंवा ग्राफिक्सची गरज)'
                      : 'Additional Details (Timings, Camera Count, Graphics Needs)'}
                  </label>
                  <textarea
                    id="booking-notes"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={
                      lang === 'mr'
                        ? 'उदा. सकाळी 9 ते सायंकाळी 6, 2 कॅमेरे आणि LED आउटपुट हवे आहे...'
                        : 'e.g. 9 AM to 6 PM coverage, 2 cameras, custom scoreboard or LED screen feed...'
                    }
                    className="w-full px-3.5 py-2.5 text-sm bg-[#060A24] border border-white/15 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#FACC15] resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="btn-primary-pro w-full py-3.5 px-5 text-sm font-bold rounded-xl text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] focus-visible:ring-offset-2 focus-visible:ring-offset-[#121216]"
                >
                  {lang === 'mr'
                    ? 'बुकिंग विनंती तयार करा'
                    : 'Confirm Booking Inquiry'}
                </button>
              </form>
            )}
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
