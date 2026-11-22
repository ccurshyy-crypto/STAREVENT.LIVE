import { ArrowLeft, ArrowRight, MessageCircle, Phone } from 'lucide-react';
import { Language, STUDIO_CONTACT, tLang } from '../data/content';
import { LanguageSwitcher } from './LanguageSwitcher';
import { PackagesSection } from './PackagesSection';
import { ScrollReveal } from './ScrollReveal';

interface PackagesPageProps {
  lang: Language;
  onChangeLang: (lang: Language) => void;
  selectedPackageId: string;
  selectedAddOns: string[];
  onToggleAddOn: (addonId: string) => void;
  onSelectPackage: (packageId: string) => void;
  onBackHome: () => void;
  onGoToBooking: () => void;
}

export function PackagesPage({
  lang,
  onChangeLang,
  selectedPackageId,
  selectedAddOns,
  onToggleAddOn,
  onSelectPackage,
  onBackHome,
  onGoToBooking,
}: PackagesPageProps) {
  return (
    <div className="text-[#F4F4F5]">
      {/* Top Breadcrumb + Language Switcher */}
      <div className="pt-8 sm:pt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-xl border border-[#FACC15]/25 studio-strip-animated-bg backdrop-blur-md px-4 sm:px-5 py-3 shadow-[0_8px_28px_rgba(0,0,0,0.4)]">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-[#FACC15]/14 to-transparent studio-strip-sheen"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-[1.5px] overflow-hidden"
            >
              <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-[#EF4444] to-[#FACC15] opacity-75 topbar-beam-sweep" />
            </div>

            <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
              <button
                type="button"
                onClick={onBackHome}
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-zinc-200 hover:text-white transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] rounded"
              >
                <ArrowLeft className="w-4 h-4 text-[#FACC15]" aria-hidden="true" />
                <span>
                  {tLang(
                    {
                      en: 'Back to Home',
                      mr: 'मुख्य पृष्ठावर परत जा',
                      hi: 'होम पेज पर वापस जाएं',
                      gu: 'હોમ પેજ પર પાછા જાઓ',
                    },
                    lang
                  )}
                </span>
              </button>

              <LanguageSwitcher lang={lang} onChangeLang={onChangeLang} variant="inline" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Production Packages, Add-ons Calculator & Verified Broadcast Outcomes */}
      <PackagesSection
        lang={lang}
        asPage
        selectedPackageId={selectedPackageId}
        selectedAddOns={selectedAddOns}
        onToggleAddOn={onToggleAddOn}
        onSelectPackage={onSelectPackage}
      />

      {/* Custom Event Quote Callout Strip */}
      <section className="py-14 sm:py-16 bg-[#0C0C10]/68 backdrop-blur-[2px]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
          <div className="studio-card-animate bg-[#121216]/88 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <p className="text-xs font-medium text-[#FACC15]">
                {lang === 'mr'
                  ? 'कस्टम सेटअप · एकापेक्षा जास्त दिवसांच्या स्पर्धा'
                  : 'Custom Broadcast Quote · Multi-Day Tournaments'}
              </p>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
                {lang === 'mr'
                  ? 'तुमच्या कार्यक्रमासाठी खास कस्टम पॅकेज हवे आहे का?'
                  : 'Need a Custom Multi-Camera or Multi-Day Package?'}
              </h2>
              <p className="text-sm text-zinc-400 leading-relaxed">
                {lang === 'mr'
                  ? 'तुमच्या कार्यक्रमाचे दिवस, कॅमेरे, LED स्क्रीन आणि लाईव्ह गरजांनुसार अचूक कोटेशनसाठी थेट संपर्क साधा किंवा बुकिंग फॉर्म भरा.'
                  : 'Call us directly or open the booking form to get an exact broadcast quote tailored to your venue, camera count, and schedule.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={onGoToBooking}
                className="cta-btn-animate inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-[#DC2626] hover:bg-[#B91C1C] rounded-lg transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]"
              >
                <span>{lang === 'mr' ? 'बुकिंग फॉर्म उघडा' : 'Open Booking Form'}</span>
                <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
              </button>

              <a
                href={STUDIO_CONTACT.phoneHref}
                className="inline-flex items-center gap-2 px-4 py-3 text-sm font-mono font-semibold text-[#FACC15] hover:text-white border border-white/15 hover:border-white/30 rounded-lg transition-colors whitespace-nowrap tabular-nums"
              >
                <Phone className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{STUDIO_CONTACT.phoneDisplay}</span>
              </a>

              <a
                href={`https://wa.me/${STUDIO_CONTACT.whatsappNumber}?text=${encodeURIComponent(
                  'Hello Star Event Live (starevent.live), I checked your production packages and would like a quote for my event.'
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold text-zinc-200 hover:text-white border border-white/15 hover:border-white/30 rounded-lg transition-colors whitespace-nowrap"
              >
                <MessageCircle className="w-4 h-4 text-[#FACC15] shrink-0" aria-hidden="true" />
                <span>WhatsApp</span>
              </a>
            </div>
          </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
