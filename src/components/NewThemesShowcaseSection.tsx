import { useEffect, useState } from 'react';
import {
  Maximize2,
  MessageCircle,
  MonitorPlay,
  Play,
  Sparkles,
  Tv,
  X,
} from 'lucide-react';
import { Language, STUDIO_CONTACT } from '../data/content';

interface HighlightedThemeItem {
  id: 'worldcup' | 'lightning-pro';
  indexLabel: string;
  name: string;
  editionLabel: Record<Language, string>;
  imagePath: string;
  imageAlt: string;
  stageStyle: 'silver-studio' | 'electric-stadium';
  accentColor: string;
  tagline: Record<Language, string>;
  highlights: Record<Language, string[]>;
  whatsappText: string;
}

const NEW_BROADCAST_THEMES: readonly HighlightedThemeItem[] = [
  {
    id: 'worldcup',
    indexLabel: '01',
    name: 'WorldCup Broadcast Theme',
    editionLabel: {
      en: 'New Broadcast Edition · Metallic Silver & Royal Blue',
      mr: 'नवीन ब्रॉडकास्ट एडिशन · मेटॅलिक सिल्व्हर व रॉयल ब्लू',
      hi: 'नया ब्रॉडकास्ट एडिशन · मैटेलिक सिल्वर और रॉयल ब्लू',
      gu: 'નવું બ્રોડકાસ્ટ એડિશન · મેટાલિક સિલ્વર અને રોયલ બ્લુ',
    },
    imagePath: '/assets/aistudio/image_10123d5d.png',
    imageAlt:
      'WorldCup Live Cricket Scoreboard Theme — Metallic Silver & Royal Blue Broadcast Patti with Run Rate, Chase Need & Event Stingers',
    stageStyle: 'silver-studio',
    accentColor: '#38BDF8',
    tagline: {
      en: 'International tournament lower-third scoreboard with dual team flags, metallic silver score plate, live ball-by-ball ticker, and instant OUT / 4 / 6 animations.',
      mr: 'आंतरराष्ट्रीय टूर्नामेंट स्टाईल स्कोअरबोर्ड पट्टी — टीम फ्लॅग्स, मेटॅलिक सिल्व्हर स्कोअर प्लेट, लाईव्ह बॉल-बाय-बॉल टिकर आणि त्वरित OUT / 4 / 6 अ‍ॅनिमेशनसह.',
      hi: 'इंटरनेशनल टूर्नामेंट स्टाइल स्कोरबोर्ड पट्टी — टीम फ्लैग्स, मैटेलिक सिल्वर स्कोर प्लेट, लाइव बॉल-बाय-बॉल टिकर और इंस्टेंट OUT / 4 / 6 एनीमेशन के साथ।',
      gu: 'ઇન્ટરનેશનલ ટુર્નામેન્ટ સ્ટાઇલ સ્કોરબોર્ડ પટ્ટી — ટીમ ફ્લેગ્સ, મેટાલિક સિલ્વર સ્કોર પ્લેટ, લાઇવ બોલ-બાય-બોલ ટિકર અને ઇન્સ્ટન્ટ OUT / 4 / 6 એનિમેશન સાથે.',
    },
    highlights: {
      en: [
        '1st & 2nd Innings Run Rate / Chase Need Strip',
        'Crisp Ball-by-Ball Over Tracker & OUT Banner',
        'OBS Studio & vMix 16:9 Full HD Transparent Ready',
      ],
      mr: [
        'पहिली व दुसरी इनिंग रन रेट / टार्गेट चेस स्ट्रिप',
        'लाईव्ह बॉल-बाय-बॉल ओव्हर ट्रॅकर आणि OUT बॅनर',
        'OBS Studio व vMix 16:9 Full HD ट्रान्सपरंट रेडी',
      ],
      hi: [
        'पहली और दूसरी इनिंग रन रेट / टारगेट चेज़ स्ट्रिप',
        'लाइव बॉल-बाय-बॉल ओवर ट्रैकर और OUT बैनर',
        'OBS Studio व vMix 16:9 Full HD ट्रांसपेरेंट रेडी',
      ],
      gu: [
        'પ્રથમ અને બીજી ઇનિંગ્સ રન રેટ / ટાર્ગેટ ચેઝ સ્ટ્રિપ',
        'લાઇવ બોલ-બાય-બોલ ઓવર ટ્રેકર અને OUT બેનર',
        'OBS Studio અને vMix 16:9 Full HD ટ્રાન્સપરન્ટ રેડી',
      ],
    },
    whatsappText:
      'Hello Star Event Live, I saw the new WorldCup Broadcast Scoreboard Theme on your home page and want to use it for my live cricket broadcast.',
  },
  {
    id: 'lightning-pro',
    indexLabel: '02',
    name: 'Lightning Premier Theme',
    editionLabel: {
      en: 'New Broadcast Edition · Electric Blue, Magenta & Gold',
      mr: 'नवीन ब्रॉडकास्ट एडिशन · इलेक्ट्रिक ब्लू, मॅजेंटा व गोल्ड',
      hi: 'नया ब्रॉडकास्ट एडिशन · इलेक्ट्रिक ब्लू, मैजेंटा और गोल्ड',
      gu: 'નવું બ્રોડકાસ્ટ એડિશન · ઇલેક્ટ્રિક બ્લુ, મેજેન્ટા અને ગોલ્ડ',
    },
    imagePath: '/assets/aistudio/Petarwadi_vs_Mamdapurwadi_Scoreboard_74b76db5.png',
    imageAlt:
      'Lightning Premier Live Cricket Scoreboard Theme — Electric Royal Blue, Hot Magenta Score Pill & Golden Lightning Chevron Broadcast Patti',
    stageStyle: 'electric-stadium',
    accentColor: '#F472B6',
    tagline: {
      en: 'High-voltage franchise league scoreboard crafted with golden lightning chevrons, hot magenta central score hub, target top hood, and glowing chase ticker.',
      mr: 'हाय-व्होल्टेज फ्रँचायझी लीग स्कोअरबोर्ड — गोल्डन लाइटनिंग शेवरॉन, हॉट मॅजेंटा सेंट्रल स्कोअर हब, टार्गेट हुड आणि लाईव्ह चेस टिकरसह.',
      hi: 'हाई-वोल्टेज फ्रैंचाइज़ी लीग स्कोरबोर्ड — गोल्डन लाइटनिंग शेवरॉन, हॉट मैजेंटा सेंट्रल स्कोर हब, टारगेट हुड और लाइव चेज़ टिकर के साथ।',
      gu: 'હાઇ-વોલ્ટેજ ફ્રેન્ચાઇઝી લીગ સ્કોરબોર્ડ — ગોલ્ડન લાઇટનિંગ શેવરોન, હોટ મેજેન્ટા સેન્ટ્રલ સ્કોર હબ, ટાર્ગેટ હૂડ અને લાઇવ ચેઝ ટિકર સાથે.',
    },
    highlights: {
      en: [
        'Hot Magenta Center Score Hub & Target Hood',
        'Golden Lightning Dividers & Colored Ball Dots',
        'Bottom Need Runs Display + Match Summary Sync',
      ],
      mr: [
        'हॉट मॅजेंटा सेंटर स्कोअर हब आणि टार्गेट हुड',
        'गोल्डन लाइटनिंग डिव्हायडर्स व कलर्ड बॉल डॉट्स',
        'बॉटम नीड रन्स डिस्प्ले + मॅच समरी सिंक',
      ],
      hi: [
        'हॉट मैजेंटा सेंटर स्कोर हब और टारगेट हुड',
        'गोल्डन लाइटनिंग डिवाइडर्स और कलर्ड बॉल डॉट्स',
        'बॉटम नीड रन्स डिस्प्ले + मैच समरी सिंक',
      ],
      gu: [
        'હોટ મેજેન્ટા સેન્ટર સ્કોર હબ અને ટાર્ગેટ હૂડ',
        'ગોલ્ડન લાઇટનિંગ ડિવાઇડર્સ અને કલર્ડ બોલ ડોટ્સ',
        'બોટમ નીડ રન્સ ડિસ્પ્લે + મેચ સમરી સિંક',
      ],
    },
    whatsappText:
      'Hello Star Event Live, I saw the new Lightning Premier Broadcast Scoreboard Theme on your home page and want to use it for my live cricket broadcast.',
  },
];

interface NewThemesShowcaseSectionProps {
  lang: Language;
  onOpenOverlays: () => void;
}

export function NewThemesShowcaseSection({
  lang,
  onOpenOverlays,
}: NewThemesShowcaseSectionProps) {
  const [activeZoom, setActiveZoom] = useState<HighlightedThemeItem | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!activeZoom) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveZoom(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeZoom]);

  const kickerText =
    lang === 'mr'
      ? 'नवीन ब्रॉडकास्ट स्कोरबोर्ड थीम्स · मोफत अनलॉक'
      : lang === 'hi'
        ? 'नई ब्रॉडकास्ट स्कोरबोर्ड थीम्स · फ्री अनलॉक'
        : lang === 'gu'
          ? 'નવી બ્રોડકાસ્ટ સ્કોરબોર્ડ થીમ્સ · ફ્રી અનલોક'
          : 'NEW LIVE CRICKET BROADCAST THEMES · OBS & VMIX READY';

  const headingText =
    lang === 'mr'
      ? 'नवीन 2 प्रो स्कोअरबोर्ड थीम्स'
      : lang === 'hi'
        ? '2 नई प्रो लाइव स्कोरबोर्ड थीम्स'
        : lang === 'gu'
          ? '2 નવી પ્રો લાઇવ સ્કોરબોર્ડ થીમ્સ'
          : '2 NEW PRO SCOREBOARD THEMES';

  const subcopyText =
    lang === 'mr'
      ? 'STAR EVENT LIVE क्रिकेट सॉफ्टवेअरमध्ये नवीन जोडलेल्या WorldCup आणि Lightning Premier ब्रॉडकास्ट स्कोअरबोर्ड थीम्सची थेट झलक पहा.'
      : lang === 'hi'
        ? 'STAR EVENT LIVE क्रिकेट सॉफ्टवेयर में नई जोड़ी गई WorldCup और Lightning Premier ब्रॉडकास्ट स्कोरबोर्ड थीम्स का HD प्रीव्यू देखें।'
        : lang === 'gu'
          ? 'STAR EVENT LIVE ક્રિકેટ સોફ્ટવેરમાં નવી ઉમેરાયેલી WorldCup અને Lightning Premier બ્રોડકાસ્ટ સ્કોરબોર્ડ થીમ્સનો HD પ્રીવ્યૂ જુઓ.'
          : 'Explore the 2 newly added international-grade broadcast scoreboard themes inside Star Event Live — ready for instant OBS Studio and vMix live streaming.';

  const openStudioLabel =
    lang === 'mr'
      ? 'लाईव्ह थीम वापरा'
      : lang === 'hi'
        ? 'लाइव थीम चलाएं'
        : lang === 'gu'
          ? 'લાઇવ થીમ વાપરો'
          : 'Use Theme Live';

  const fullPreviewLabel =
    lang === 'mr'
      ? 'HD झूम पहा'
      : lang === 'hi'
        ? 'HD ज़ूम देखें'
        : lang === 'gu'
          ? 'HD ઝૂમ જુઓ'
          : 'Full HD Preview';

  const whatsappLabel =
    lang === 'mr'
      ? 'WhatsApp चौकशी'
      : lang === 'hi'
        ? 'WhatsApp पूछताछ'
        : lang === 'gu'
          ? 'WhatsApp પૂછપરછ'
          : 'WhatsApp Desk';

  return (
    <section
      id="new-themes"
      aria-labelledby="new-themes-heading"
      className="relative py-10 sm:py-14 border-b border-[#FFE600]/30"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
        {/* Highlighted Studio Banner Header */}
        <div className="relative overflow-hidden rounded-2xl overlay-home-card p-5 sm:p-7 text-center space-y-2.5 shadow-[0_20px_54px_rgba(0,0,0,0.55)]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#FFE600]/80 to-transparent"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] overflow-hidden"
          >
            <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-[#FFE600] to-[#EF1A1A] topbar-beam-sweep" />
          </div>

          <p className="inline-flex items-center justify-center gap-2 text-[11px] sm:text-xs font-mono font-bold tracking-[0.16em] text-[#FFE600]">
            <Sparkles className="w-3.5 h-3.5 text-[#FFE600] shrink-0" aria-hidden="true" />
            <span>{kickerText}</span>
          </p>

          <h2
            id="new-themes-heading"
            className="font-display text-2xl sm:text-4xl md:text-5xl font-black tracking-tight leading-[1.15] text-white [text-wrap:balance]"
          >
            <span className="text-white drop-shadow-[0_3px_16px_rgba(0,0,0,0.75)]">
              {headingText}
            </span>
          </h2>

          <p className="text-xs sm:text-base text-rose-100/90 max-w-3xl mx-auto leading-relaxed">
            {subcopyText}
          </p>
        </div>

        {/* 2 Featured New Broadcast Theme Showcase Frames */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 items-stretch">
          {NEW_BROADCAST_THEMES.map((theme) => {
            const whatsappHref = `https://wa.me/${STUDIO_CONTACT.whatsappNumber}?text=${encodeURIComponent(
              theme.whatsappText
            )}`;
            const isSilver = theme.stageStyle === 'silver-studio';

            return (
              <article
                key={theme.id}
                className="group relative rounded-2xl overlay-home-card border border-[#FFE600]/50 hover:border-[#FFE600] overflow-hidden flex flex-col justify-between transition-transform duration-200 hover:-translate-y-1 shadow-[0_22px_52px_rgba(0,0,0,0.62)]"
              >
                {/* Top Broadcast Header Strip */}
                <div className="overlay-home-header px-4 sm:px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex items-center gap-2.5">
                    <span className="font-mono text-sm font-black text-[#FFE600] tabular-nums shrink-0">
                      {theme.indexLabel}.
                    </span>
                    <h3 className="font-display text-base sm:text-lg font-black text-white tracking-tight truncate">
                      {theme.name}
                    </h3>
                  </div>
                  <span className="font-mono text-[11px] font-extrabold text-[#FFE600] whitespace-nowrap shrink-0">
                    NEW · HD 16:9
                  </span>
                </div>

                {/* Highlighted Scoreboard Visual Stage */}
                <div className="p-4 sm:p-5 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <button
                      type="button"
                      onClick={() => setActiveZoom(theme)}
                      aria-label={`View ${theme.name} full screen preview`}
                      className={`relative w-full rounded-xl overflow-hidden border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFE600] block text-left ${
                        isSilver
                          ? 'bg-gradient-to-br from-[#F8FAFC] via-[#EEF2F6] to-[#DBE4F0] border-white/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_12px_32px_rgba(0,0,0,0.45)]'
                          : 'bg-[radial-gradient(ellipse_at_center,#14308F_0%,#081036_64%,#04071A_100%)] border-[#F472B6]/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_12px_36px_rgba(0,0,0,0.6)]'
                      }`}
                    >
                      {/* Subtle Top Spotlight Glint */}
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-0 top-0 h-px"
                        style={{
                          background: `linear-gradient(90deg, transparent, ${theme.accentColor}, transparent)`,
                        }}
                      />

                      <div className="relative px-3 py-6 sm:px-5 sm:py-8 min-h-[168px] sm:min-h-[210px] flex items-center justify-center">
                        {!failedImages[theme.id] ? (
                          <img
                            src={theme.imagePath}
                            alt={theme.imageAlt}
                            referrerPolicy="no-referrer"
                            loading="eager"
                            decoding="async"
                            onError={() =>
                              setFailedImages((prev) => ({ ...prev, [theme.id]: true }))
                            }
                            className="w-full h-auto max-h-[185px] object-contain drop-shadow-[0_14px_26px_rgba(0,0,0,0.42)] transition-transform duration-300 group-hover:scale-[1.03]"
                          />
                        ) : (
                          <div className="w-full py-8 rounded-lg bg-[#0A1033]/85 border border-[#FFE600]/30 flex flex-col items-center justify-center gap-2 text-center px-4">
                            <MonitorPlay
                              className="w-9 h-9 text-[#FFE600]"
                              aria-hidden="true"
                            />
                            <span className="font-display text-base font-black text-white">
                              {theme.name}
                            </span>
                          </div>
                        )}

                        <span
                          aria-hidden="true"
                          className={`absolute top-2.5 right-2.5 inline-flex items-center justify-center w-8 h-8 rounded-lg border transition-opacity ${
                            isSilver
                              ? 'bg-[#070B28]/85 border-slate-300/60 text-[#FFE600]'
                              : 'bg-black/75 border-white/25 text-[#FFE600]'
                          }`}
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </button>

                    {/* Clean Unboxed Metadata & Description */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-[#FFE600]/95">
                        {theme.editionLabel[lang]}
                      </p>
                      <p className="text-xs sm:text-sm text-rose-50/90 leading-relaxed">
                        {theme.tagline[lang]}
                      </p>
                    </div>

                    {/* Clean Unboxed Feature Specs */}
                    <ul className="pt-3 border-t border-white/10 space-y-1.5 text-xs sm:text-[13px] text-rose-50/90">
                      {theme.highlights[lang].map((point) => (
                        <li key={point} className="flex items-start gap-2">
                          <span
                            aria-hidden="true"
                            className="text-[#FFE600] font-black leading-5"
                          >
                            ·
                          </span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Action Row */}
                  <div className="pt-3 border-t border-[#FFE600]/20 flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={onOpenOverlays}
                      className="btn-gold-pro flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black text-[#070B28] whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                      <Play className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>{openStudioLabel}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveZoom(theme)}
                      className="btn-glass-pro min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFE600]"
                    >
                      <Maximize2 className="w-3.5 h-3.5 text-[#FFE600] shrink-0" aria-hidden="true" />
                      <span>{fullPreviewLabel}</span>
                    </button>

                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary-pro min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFE600]"
                    >
                      <MessageCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>{whatsappLabel}</span>
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Bottom Live Studio Proof Strip */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl bg-[#070B28]/80 border border-[#FFE600]/25 px-4 sm:px-6 py-3.5 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2.5 gap-y-1 text-xs sm:text-sm text-rose-50/90">
            <Tv className="w-4 h-4 text-[#FFE600] shrink-0" aria-hidden="true" />
            <span className="font-bold text-white">Instant Broadcast Sync</span>
            <span aria-hidden="true" className="text-[#FFE600]/60">
              ·
            </span>
            <span>WorldCup &amp; Lightning Premier + TATA IPL 2022 Included Free</span>
          </div>

          <button
            type="button"
            onClick={onOpenOverlays}
            className="text-xs sm:text-sm font-extrabold text-[#FFE600] hover:text-white transition-colors whitespace-nowrap underline underline-offset-4"
          >
            {lang === 'mr'
              ? 'सर्व थीम्स ओव्हरले स्टुडिओमध्ये पहा →'
              : lang === 'hi'
                ? 'सभी थीम्स ओवरले स्टूडियो में देखें →'
                : lang === 'gu'
                  ? 'બધી થીમ્સ ઓવરલે સ્ટુડિયોમાં જુઓ →'
                  : 'Switch Themes in Overlay Studio →'}
          </button>
        </div>
      </div>

      {/* Fullscreen HD Lightbox Modal */}
      {activeZoom && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={activeZoom.name}
          onClick={() => setActiveZoom(null)}
          className="fixed inset-0 z-50 bg-black/92 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-5xl bg-[#090C24] border border-[#FFE600]/55 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-display text-base sm:text-xl font-black text-white truncate">
                  {activeZoom.indexLabel}. {activeZoom.name}
                </p>
                <p className="text-xs text-[#FFE600]/90 truncate">
                  {activeZoom.editionLabel[lang]}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveZoom(null)}
                aria-label="Close theme preview"
                className="w-10 h-10 rounded-xl bg-[#E11D1D] hover:bg-[#B91C1C] text-white flex items-center justify-center transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div
              className={`w-full rounded-xl p-4 sm:p-8 flex items-center justify-center overflow-hidden border ${
                activeZoom.stageStyle === 'silver-studio'
                  ? 'bg-gradient-to-br from-[#F8FAFC] via-[#EEF2F6] to-[#DBE4F0] border-white/60'
                  : 'bg-[radial-gradient(ellipse_at_center,#14308F_0%,#081036_64%,#04071A_100%)] border-[#F472B6]/45'
              }`}
            >
              <img
                src={activeZoom.imagePath}
                alt={activeZoom.imageAlt}
                referrerPolicy="no-referrer"
                className="w-full h-auto max-h-[65vh] object-contain drop-shadow-[0_18px_36px_rgba(0,0,0,0.45)]"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <p className="text-xs sm:text-sm text-rose-100/90 max-w-xl">
                {activeZoom.tagline[lang]}
              </p>
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setActiveZoom(null);
                    onOpenOverlays();
                  }}
                  className="btn-gold-pro min-h-[42px] inline-flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-black text-[#070B28] rounded-xl whitespace-nowrap"
                >
                  <Play className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{openStudioLabel}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
