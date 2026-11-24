import { FormEvent, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  Lock,
  LockOpen,
  LogOut,
  Monitor,
  ShieldCheck,
} from 'lucide-react';
import { useOverlayAccess } from '../context/OverlayAccessContext';
import { EventCategoryId, Language, STUDIO_CONTACT, tLang } from '../data/content';
import { OVERLAY_PRODUCTS, OverlayProduct } from '../data/overlayCatalog';
import {
  createInitialCricketScoreboardDoc,
  OverlayMode,
  OverlayStyle,
} from '../types/overlay';
import { AdminAccessKeysPanel } from './AdminAccessKeysPanel';
import { CricketScoreboardBar } from './CricketScoreboardBar';
import { HaldiFestiveOverlayBar } from './HaldiFestiveOverlayBar';
import { KabaddiScoreboardBar } from './KabaddiScoreboardBar';
import { LiveStudioPreview } from './LiveStudioPreview';
import { ScrollReveal } from './ScrollReveal';
import { WeddingFrameOverlay } from './WeddingFrameOverlay';

interface OverlaysPageProps {
  lang: Language;
  activeMode: OverlayMode;
  onChangeMode: (mode: OverlayMode) => void;
  activeStyle: OverlayStyle;
  onChangeStyle: (style: OverlayStyle) => void;
  onBackHome: () => void;
  onBookFromOverlay: (category: EventCategoryId) => void;
  onOpenKabaddiControl?: () => void;
  onOpenAccessModal?: (view?: 'login' | 'admin') => void;
}

function OverlayMiniPreview({ mode, style }: { mode: OverlayMode; style: OverlayStyle }) {
  if (mode === 'kabaddi') {
    return (
      <div
        className="relative aspect-video w-full rounded-xl overflow-hidden flex flex-col justify-between p-2.5 border border-white/15"
        style={{
          backgroundColor: '#18181B',
          backgroundImage:
            'linear-gradient(45deg, #27272A 25%, transparent 25%), linear-gradient(-45deg, #27272A 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #27272A 75%), linear-gradient(-45deg, transparent 75%, #27272A 75%)',
          backgroundSize: '18px 18px',
          backgroundPosition: '0 0, 0 9px, 9px -9px, -9px 0px',
        }}
      >
        <div className="my-auto text-center">
          <span className="font-mono text-[9px] text-zinc-200 bg-black/65 px-2.5 py-0.5 rounded border border-white/10">
            1920×1080 DUAL-LOGO SCOREBOARD
          </span>
        </div>
        <KabaddiScoreboardBar
          variant="mini"
          teamAName="NERAL"
          teamACode="NER"
          teamAColor="#C8102E"
          teamAScore={24}
          teamBName="KARJAT"
          teamBCode="KAR"
          teamBColor="#131D8A"
          teamBScore={21}
          matchSeconds={30}
          halfLabel="1ST HALF"
          showDemoWatermark={false}
        />
      </div>
    );
  }

  if (mode === 'cricket') {
    const sampleCricket = createInitialCricketScoreboardDoc('preview');
    return (
      <div
        className="relative aspect-video w-full rounded-xl overflow-hidden flex flex-col justify-between p-2.5 border border-[#E5007D]/45"
        style={{
          backgroundColor: '#18181B',
          backgroundImage:
            'linear-gradient(45deg, #27272A 25%, transparent 25%), linear-gradient(-45deg, #27272A 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #27272A 75%), linear-gradient(-45deg, transparent 75%, #27272A 75%)',
          backgroundSize: '18px 18px',
          backgroundPosition: '0 0, 0 9px, 9px -9px, -9px 0px',
        }}
      >
        <div className="my-auto text-center">
          <span className="font-mono text-[9px] text-white bg-[#230A6B]/90 px-2.5 py-0.5 rounded border border-[#FFEC00]/45">
            SINGLE VMIX CRICKET SCOREBOARD · 1920×1080
          </span>
        </div>
        <CricketScoreboardBar data={sampleCricket} variant="mini" />
      </div>
    );
  }

  if (style === 'wedding') {
    return (
      <div
        className="relative aspect-video w-full rounded-xl overflow-hidden border border-[#FACC15]/50"
        style={{
          backgroundColor: '#18181B',
          backgroundImage:
            'linear-gradient(45deg, #27272A 25%, transparent 25%), linear-gradient(-45deg, #27272A 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #27272A 75%), linear-gradient(-45deg, transparent 75%, #27272A 75%)',
          backgroundSize: '18px 18px',
          backgroundPosition: '0 0, 0 9px, 9px -9px, -9px 0px',
        }}
      >
        <WeddingFrameOverlay
          variant="mini"
          groomName="चि. रोहित"
          brideName="चि. सौ. कां. प्रिया"
          connector="व"
          eventLabel="शुभ विवाह सोहळा"
          dateVenue="थेट प्रक्षेपण • दिनांक व ठिकाण"
          topHeader="|| श्री गणेशाय नमः ||"
          primaryColor="#6B0F26"
          accentColor="#F5C542"
          textColor="#FFFFFF"
          bottomAnim="gentle"
          showTopHeader
          showCornerFrame
        />
      </div>
    );
  }

  if (style === 'festive') {
    return (
      <div
        className="relative aspect-video w-full rounded-xl overflow-hidden flex flex-col justify-between p-2.5 border border-[#FACC15]/45"
        style={{
          backgroundColor: '#18181B',
          backgroundImage:
            'linear-gradient(45deg, #27272A 25%, transparent 25%), linear-gradient(-45deg, #27272A 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #27272A 75%), linear-gradient(-45deg, transparent 75%, #27272A 75%)',
          backgroundSize: '18px 18px',
          backgroundPosition: '0 0, 0 9px, 9px -9px, -9px 0px',
        }}
      >
        <div className="my-auto text-center">
          <span className="font-mono text-[9px] text-[#FEF08A] bg-black/70 px-2.5 py-0.5 rounded border border-[#FACC15]/35">
            ANIMATED · FULL CUSTOM TEXT &amp; MOTION
          </span>
        </div>
        <HaldiFestiveOverlayBar
          variant="mini"
          leftText="शुभ विवाह..."
          centerMain="हळदी"
          centerSub="समारंभ"
          rightText="Haldi Ceremony"
          animation="festive"
          theme="royal-maroon"
          showDecor
          showPetals={false}
        />
      </div>
    );
  }

  const isClassic = style === 'classic';
  return (
    <div
      className={`relative aspect-video w-full rounded-xl overflow-hidden flex flex-col justify-between p-3 ${
        isClassic
          ? 'border-2 border-[#FACC15] shadow-[inset_0_0_0_3px_#B45309]'
          : 'border border-white/15'
      }`}
      style={{
        backgroundColor: '#18181B',
        backgroundImage:
          'linear-gradient(45deg, #27272A 25%, transparent 25%), linear-gradient(-45deg, #27272A 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #27272A 75%), linear-gradient(-45deg, transparent 75%, #27272A 75%)',
        backgroundSize: '18px 18px',
        backgroundPosition: '0 0, 0 9px, 9px -9px, -9px 0px',
      }}
    >
      <div className="flex items-center justify-between gap-2">
        {isClassic ? (
          <>
            <span className="bg-[#B45309] border border-[#FACC15] text-[#FEF08A] px-1.5 py-0.5 rounded text-[8px] font-mono font-bold">
              HALDI &amp; WEDDING
            </span>
            <span className="bg-[#78350F] border border-[#FACC15] text-[#FEF08A] px-2 py-0.5 rounded-full text-[8px] font-bold truncate">
              शुभ हळदी व लग्न समारंभ
            </span>
          </>
        ) : (
          <span className="ml-auto bg-black/80 border border-[#FACC15]/80 text-[#FACC15] px-2 py-0.5 rounded-full text-[8px] font-bold">
            शुभ हळदी व लग्न समारंभ
          </span>
        )}
      </div>

      <div className="my-auto text-center" />

      {isClassic ? (
        <div className="bg-gradient-to-r from-[#78350F] via-[#B45309] to-[#78350F] border border-[#FACC15] rounded-md px-3 py-1.5 text-center">
          <p className="text-[10px] font-bold text-white truncate leading-normal py-0.5">
            देशमुख कुटुंब — हळदी व लग्न समारंभ
          </p>
          <p className="text-[8px] text-[#FEF08A] truncate leading-normal">
            थेट प्रक्षेपण • दिनांक व ठिकाण
          </p>
        </div>
      ) : (
        <div className="w-[88%] mx-auto bg-gradient-to-r from-[#221204]/95 via-[#92400E]/95 to-[#221204]/95 border border-[#FDE047] rounded-full px-3 py-1.5 flex items-center justify-between gap-2">
          <span className="w-1.5 h-1.5 rotate-45 bg-[#FACC15] shrink-0" />
          <p className="text-[9px] font-bold text-white truncate leading-normal py-0.5 text-center flex-1">
            देशमुख कुटुंब — हळदी व लग्न समारंभ
          </p>
          <span className="w-1.5 h-1.5 rotate-45 bg-[#FACC15] shrink-0" />
        </div>
      )}
    </div>
  );
}

export function OverlaysPage({
  lang,
  activeMode,
  onChangeMode,
  activeStyle,
  onChangeStyle,
  onBackHome,
  onBookFromOverlay,
  onOpenKabaddiControl,
  onOpenAccessModal,
}: OverlaysPageProps) {
  const { session, isUnlocked, isReady, unlockWithCredentials, lockAndLogout } =
    useOverlayAccess();

  const [filterMode, setFilterMode] = useState<'all' | OverlayMode>('all');
  const [accessIdInput, setAccessIdInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showInlineAdmin, setShowInlineAdmin] = useState(false);

  const handleUnlockSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginBusy(true);
    const res = await unlockWithCredentials(accessIdInput, passwordInput);
    setLoginBusy(false);

    if (!res.ok) {
      setLoginError(res.error || 'Invalid Access ID or Password.');
      return;
    }

    setAccessIdInput('');
    setPasswordInput('');
  };

  const visibleProducts =
    filterMode === 'all'
      ? OVERLAY_PRODUCTS
      : OVERLAY_PRODUCTS.filter((p) => p.mode === filterMode);

  const handleOpenPreview = (product: OverlayProduct) => {
    onChangeMode(product.mode);
    onChangeStyle(product.style);
    const el = document.getElementById('studio');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (!isReady) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-16 text-[#F4F4F5]">
        <div className="bg-[#111116] border border-white/15 rounded-2xl px-8 py-6 text-center space-y-2 shadow-2xl">
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-[#FFE600]">
            Star Event Live · Overlay Access
          </p>
          <p className="text-sm text-zinc-300">Verifying overlay access...</p>
        </div>
      </div>
    );
  }

  // Locked Gate: ONLY Access ID + Password + "Unlock Overlays" button (plus inline Admin Panel toggle)
  if (!isUnlocked) {
    return (
      <div className="min-h-[75vh] text-[#F4F4F5] py-8 sm:py-14 px-3 sm:px-6 lg:px-8">
        <div className="max-w-lg mx-auto space-y-5">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onBackHome}
              className="btn-glass-pro inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-zinc-100 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFE600]"
            >
              <ArrowLeft className="w-4 h-4 text-[#FFE600]" aria-hidden="true" />
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

            <button
              type="button"
              onClick={() => setShowInlineAdmin((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#09090D]/90 hover:bg-[#161620] border border-[#FFE600]/40 text-xs font-bold text-[#FFE600] whitespace-nowrap"
            >
              <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{showInlineAdmin ? 'Back to Unlock' : 'Admin Panel'}</span>
            </button>
          </div>

          <div className="bg-[#111116] border border-[#FFE600]/35 rounded-2xl overflow-hidden shadow-[0_24px_70px_rgba(0,0,0,0.78)]">
            <div className="h-1 w-full bg-gradient-to-r from-[#DC2626] via-[#FFE600] to-[#DC2626]" />

            <div className="p-5 sm:p-8 space-y-6">
              {showInlineAdmin ? (
                <AdminAccessKeysPanel />
              ) : (
                <>
                  <div className="text-center space-y-2.5">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-[#DC2626]/20 border border-[#FFE600]/45 flex items-center justify-center">
                      <Lock className="w-7 h-7 text-[#FFE600]" aria-hidden="true" />
                    </div>
                    <p className="font-mono text-xs font-bold uppercase tracking-widest text-[#FFE600]">
                      STAR EVENT LIVE · OVERLAY ACCESS
                    </p>
                    <h1 className="font-display text-2xl sm:text-3xl font-black text-white leading-tight">
                      Unlock Overlays &amp; Scoreboards
                    </h1>
                    <p className="text-xs sm:text-sm text-zinc-400">
                      Enter your Access ID and Password to unlock all live broadcast overlays.
                    </p>
                  </div>

                  {loginError && (
                    <div
                      role="alert"
                      className="bg-red-950/75 border border-red-500/50 rounded-xl px-4 py-3 text-xs sm:text-sm font-medium text-red-100"
                    >
                      {loginError}
                    </div>
                  )}

                  <form onSubmit={handleUnlockSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label
                        htmlFor="overlays-access-id"
                        className="block text-xs font-bold uppercase tracking-wider text-zinc-300"
                      >
                        Access ID
                      </label>
                      <input
                        id="overlays-access-id"
                        type="text"
                        autoComplete="username"
                        value={accessIdInput}
                        onChange={(e) => setAccessIdInput(e.target.value)}
                        placeholder="e.g. STAR-101"
                        className="w-full px-4 py-3 rounded-xl bg-[#09090D] border border-white/15 focus:border-[#FFE600] focus:outline-none text-sm font-mono text-white placeholder:text-zinc-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor="overlays-access-password"
                        className="block text-xs font-bold uppercase tracking-wider text-zinc-300"
                      >
                        Password
                      </label>
                      <div className="relative">
                        <input
                          id="overlays-access-password"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="current-password"
                          value={passwordInput}
                          onChange={(e) => setPasswordInput(e.target.value)}
                          placeholder="Enter password"
                          className="w-full pl-4 pr-11 py-3 rounded-xl bg-[#09090D] border border-white/15 focus:border-[#FFE600] focus:outline-none text-sm text-white placeholder:text-zinc-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-zinc-400 hover:text-white rounded-lg"
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" aria-hidden="true" />
                          ) : (
                            <Eye className="w-4 h-4" aria-hidden="true" />
                          )}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loginBusy}
                      className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#FFE600] to-[#FACC15] hover:from-[#FEF08A] hover:to-[#FFE600] disabled:opacity-60 text-[#09090D] font-display font-black text-sm sm:text-base uppercase tracking-wide transition-colors"
                    >
                      <LockOpen className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>{loginBusy ? 'Verifying...' : 'Unlock Overlays'}</span>
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="text-[#F4F4F5]">
      <section className="pt-8 pb-16 sm:pt-12 sm:pb-20 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top Unlocked Session Bar */}
          <div className="relative overflow-hidden rounded-xl border border-[#FFE600]/30 bg-[#111116]/95 backdrop-blur-md px-4 sm:px-5 py-3 shadow-[0_8px_28px_rgba(0,0,0,0.45)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={onBackHome}
                  className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-zinc-200 hover:text-white transition-colors whitespace-nowrap"
                >
                  <ArrowLeft className="w-4 h-4 text-[#FFE600]" aria-hidden="true" />
                  <span>Back to Home</span>
                </button>

                <span aria-hidden="true" className="text-zinc-600 hidden sm:inline">|</span>

                <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-300">
                  <LockOpen className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Unlocked: {session?.accessId}</span>
                  {session?.label && (
                    <span className="text-zinc-400 font-sans font-medium">
                      ({session.label})
                    </span>
                  )}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {onOpenKabaddiControl && (
                  <button
                    type="button"
                    onClick={onOpenKabaddiControl}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FFE600] hover:bg-[#FEF08A] text-[#09090D] font-display font-black text-xs uppercase tracking-wide whitespace-nowrap"
                  >
                    <Monitor className="w-3.5 h-3.5 shrink-0" />
                    <span>Kabaddi vMix Room</span>
                  </button>
                )}

                {onOpenAccessModal && (
                  <button
                    type="button"
                    onClick={() => onOpenAccessModal('admin')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-[#FFE600]/35 text-xs font-bold text-[#FFE600] whitespace-nowrap"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                    <span>Admin Panel</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={lockAndLogout}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#DC2626] hover:bg-[#EF4444] text-xs font-bold text-white whitespace-nowrap"
                >
                  <LogOut className="w-3.5 h-3.5 shrink-0" />
                  <span>Lock / Logout</span>
                </button>
              </div>
            </div>
          </div>

          {/* Store Header */}
          <div className="pt-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10 site-hero-enter">
            <div className="max-w-3xl space-y-3">
              <p className="text-xs sm:text-sm font-mono font-bold uppercase tracking-wider text-[#FFE600]">
                {STUDIO_CONTACT.domain} · FULL ACCESS UNLOCKED
              </p>
              <h1
                className={`font-display font-extrabold text-white text-[clamp(1.95rem,3.4vw,3.05rem)] ${
                  lang !== 'en'
                    ? 'leading-[1.38] tracking-normal'
                    : 'leading-[1.16] tracking-tight'
                }`}
              >
                {tLang(
                  {
                    en: 'Live Overlays & Scoreboards for OBS & vMix',
                    mr: 'OBS आणि vMix साठी लाईव्ह ओव्हरले व स्कोअरबोर्ड',
                    hi: 'OBS और vMix के लिए लाइव ओवरले और स्कोरबोर्ड',
                    gu: 'OBS અને vMix માટે લાઇવ ઓવરલે અને સ્કોરબોર્ડ',
                  },
                  lang
                )}
              </h1>
              <p className="text-sm sm:text-base text-zinc-400 leading-[1.72] max-w-2xl">
                All Kabaddi, Cricket, Haldi, and Wedding broadcast overlays are unlocked for your active Access ID. Choose any overlay below to customize and copy its 1920×1080 transparent OBS/vMix URL.
              </p>
            </div>

            {/* Filter tabs */}
            <div
              role="group"
              aria-label="Filter overlays"
              className="flex flex-wrap items-center gap-1 p-1 bg-[#141418] border border-white/10 rounded-xl shrink-0"
            >
              {(
                [
                  { id: 'all', label: { en: 'All (7)', mr: 'सर्व (7)', hi: 'सभी (7)', gu: 'બધા (7)' } },
                  { id: 'cricket', label: { en: 'Cricket (1)', mr: 'क्रिकेट (1)', hi: 'क्रिकेट (1)', gu: 'ક્રિકેટ (1)' } },
                  { id: 'kabaddi', label: { en: 'Kabaddi (2)', mr: 'कबड्डी (2)', hi: 'कबड्डी (2)', gu: 'કબડ્ડી (2)' } },
                  { id: 'haldi', label: { en: 'Wedding & Haldi (4)', mr: 'लग्न व हळदी (4)', hi: 'शादी और हल्दी (4)', gu: 'લગ્ન અને હળદી (4)' } },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterMode(tab.id)}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    filterMode === tab.id
                      ? 'bg-[#DC2626] text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {tab.label[lang]}
                </button>
              ))}
            </div>
          </div>

          {/* All Overlay Cards — Fully Unlocked */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {visibleProducts.map((product, idx) => {
              const isActiveInStudio =
                activeMode === product.mode && activeStyle === product.style;

              return (
                <ScrollReveal key={product.sku} delay={(idx % 2) * 90} className="h-full">
                  <article
                    className={`studio-card-animate h-full bg-[#121216]/90 backdrop-blur-sm border rounded-2xl p-5 sm:p-6 flex flex-col justify-between gap-5 transition-colors ${
                      isActiveInStudio
                        ? 'border-[#FFE600]/80'
                        : 'border-white/12 hover:border-[#FFE600]/45'
                    }`}
                  >
                    <div className="space-y-4">
                      <OverlayMiniPreview mode={product.mode} style={product.style} />

                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {product.meta[lang].map((m, metaIdx) => (
                            <span key={m} className="inline-flex items-center gap-1.5">
                              {metaIdx > 0 && (
                                <span aria-hidden="true" className="text-zinc-600">
                                  ·
                                </span>
                              )}
                              <span>{m}</span>
                            </span>
                          ))}
                        </div>
                        <span className="font-mono font-bold text-emerald-400">
                          UNLOCKED
                        </span>
                      </div>

                      <div>
                        <h2 className="font-display text-lg sm:text-xl font-bold text-white leading-[1.38]">
                          {product.title[lang]}
                        </h2>
                        <p className="text-xs sm:text-sm text-zinc-400 mt-1.5 leading-relaxed">
                          {product.subtitle[lang]}
                        </p>
                      </div>

                      <ul className="space-y-2.5 text-xs sm:text-sm text-zinc-300 leading-relaxed pt-2 border-t border-white/10">
                        {product.features[lang].map((feat) => (
                          <li key={feat} className="flex items-start gap-2.5">
                            <Check
                              className="w-4 h-4 shrink-0 mt-1 text-[#FFE600]"
                              aria-hidden="true"
                            />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-4 border-t border-white/10 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleOpenPreview(product)}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 text-xs sm:text-sm font-black text-[#09090D] bg-[#FFE600] hover:bg-[#FEF08A] rounded-lg transition-colors whitespace-nowrap"
                      >
                        <LockOpen className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span>Open in Live Studio</span>
                      </button>

                      {product.mode === 'kabaddi' && onOpenKabaddiControl && (
                        <button
                          type="button"
                          onClick={onOpenKabaddiControl}
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-3 text-xs sm:text-sm font-bold text-white bg-[#DC2626] hover:bg-[#EF4444] rounded-lg transition-colors whitespace-nowrap"
                        >
                          <Monitor className="w-4 h-4 shrink-0" aria-hidden="true" />
                          <span>vMix Controller</span>
                        </button>
                      )}
                    </div>
                  </article>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Embedded Live Overlay Control Desk & OBS/vMix Studio */}
      <LiveStudioPreview
        lang={lang}
        activeMode={activeMode}
        onChangeMode={onChangeMode}
        activeStyle={activeStyle}
        onChangeStyle={onChangeStyle}
        onBookFromPreview={onBookFromOverlay}
        onOpenAccessModal={onOpenAccessModal}
      />
    </div>
  );
}
