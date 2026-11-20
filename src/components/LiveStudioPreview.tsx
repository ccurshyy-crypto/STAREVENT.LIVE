import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Check,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Lock,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Tv,
} from 'lucide-react';
import {
  CUSTOM_OVERLAY_PROMPTS,
  EventCategoryId,
  Language,
  PlatformId,
  UI_COPY,
} from '../data/content';
import { getOverlaySku, OverlaySku } from '../data/overlayCatalog';
import { sanitizeRoomIdClient, useOverlaySync } from '../hooks/useOverlaySync';
import { OverlayBackground, OverlayMode, OverlayStyle } from '../types/overlay';
import {
  downloadHaldiOverlayPng,
  downloadKabaddiOverlayPng,
} from '../utils/exportOverlayPng';
import { SpinningLogoVideo } from './SpinningLogoVideo';

export type PreviewMode = OverlayMode;

interface LiveStudioPreviewProps {
  lang: Language;
  activeMode: PreviewMode;
  onChangeMode: (mode: PreviewMode) => void;
  activeStyle: OverlayStyle;
  onChangeStyle: (style: OverlayStyle) => void;
  unlockedSkus: OverlaySku[];
  onRequestPurchase: (sku: OverlaySku) => void;
  onBookFromPreview: (category: EventCategoryId) => void;
}

const PLATFORMS: {
  id: PlatformId;
  label: string;
  spec: Record<Language, string>;
}[] = [
  {
    id: 'youtube',
    label: 'YouTube Live',
    spec: {
      mr: '1920×1080 · 60fps · पब्लिक किंवा अनलिस्टेड लिंक',
      en: '1920×1080 · 60fps · Public or Unlisted Link',
    },
  },
  {
    id: 'facebook',
    label: 'Facebook Live',
    spec: {
      mr: '1920×1080 · 60fps · पेज व ग्रुप सिमलकास्ट',
      en: '1920×1080 · 60fps · Page & Group Simulcast',
    },
  },
  {
    id: 'instagram',
    label: 'Instagram Live',
    spec: {
      mr: '9:16 व 16:9 फीड · स्टुडिओ कॅमेरा इनपुट',
      en: '9:16 & 16:9 Feed · Studio Camera Ingest',
    },
  },
];

const OBS_CUSTOM_CSS =
  'html, body { background-color: rgba(0, 0, 0, 0) !important; margin: 0 auto; overflow: hidden; }';

export function LiveStudioPreview({
  lang,
  activeMode,
  onChangeMode,
  activeStyle,
  onChangeStyle,
  unlockedSkus,
  onRequestPurchase,
  onBookFromPreview,
}: LiveStudioPreviewProps) {
  const [platform, setPlatform] = useState<PlatformId>('youtube');
  const [transparentBg, setTransparentBg] = useState(true);
  const [roomInput, setRoomInput] = useState('star-live-1');
  const [outputBg, setOutputBg] = useState<OverlayBackground>('transparent');
  const [lockModeInUrl, setLockModeInUrl] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const { state, updateState, connected, connectedDisplays, roomId } = useOverlaySync({
    roomId: roomInput,
  });

  const isClassic = activeStyle === 'classic';
  const currentSku = getOverlaySku(activeMode, activeStyle);
  const isCurrentUnlocked = unlockedSkus.includes(currentSku);

  const handleSelectMode = (mode: PreviewMode) => {
    onChangeMode(mode);
    updateState({ mode });
  };

  const handleSelectStyle = (style: OverlayStyle) => {
    onChangeStyle(style);
    updateState({ style });
  };

  // Real-time ticking 30s Kabaddi raid timer
  const [displayRaidSeconds, setDisplayRaidSeconds] = useState(state.raidSeconds);

  useEffect(() => {
    if (!state.raidRunning) {
      setDisplayRaidSeconds(state.raidSeconds);
      return;
    }

    const computeRemaining = () => {
      const elapsedSec = Math.floor((Date.now() - state.raidUpdatedAt) / 1000);
      return Math.max(0, state.raidSeconds - elapsedSec);
    };

    setDisplayRaidSeconds(computeRemaining());
    const interval = window.setInterval(() => {
      const rem = computeRemaining();
      setDisplayRaidSeconds(rem);
      if (rem === 0) {
        updateState({ raidRunning: false, raidSeconds: 0, raidUpdatedAt: Date.now() });
      }
    }, 250);

    return () => window.clearInterval(interval);
  }, [state.raidSeconds, state.raidRunning, state.raidUpdatedAt, updateState]);

  const copyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey((curr) => (curr === key ? null : curr));
      }, 2000);
    } catch {
      setCopiedKey(null);
    }
  };

  const triggerKabaddiAlert = (label: string) => {
    updateState({ kabaddiAlert: label });
    window.setTimeout(() => {
      updateState({ kabaddiAlert: null });
    }, 1800);
  };

  const handleKabaddiScore = (team: 'A' | 'B', delta: number, alertText?: string) => {
    if (team === 'A') {
      updateState({
        mode: 'kabaddi',
        teamAScore: Math.max(0, state.teamAScore + delta),
        ...(alertText ? { kabaddiAlert: alertText } : {}),
      });
    } else {
      updateState({
        mode: 'kabaddi',
        teamBScore: Math.max(0, state.teamBScore + delta),
        ...(alertText ? { kabaddiAlert: alertText } : {}),
      });
    }
    if (alertText) {
      triggerKabaddiAlert(alertText);
    }
  };

  const handleToggleRaidTimer = () => {
    if (state.raidRunning) {
      updateState({
        raidRunning: false,
        raidSeconds: displayRaidSeconds,
        raidUpdatedAt: Date.now(),
      });
    } else {
      const startFrom = displayRaidSeconds === 0 ? 30 : displayRaidSeconds;
      updateState({
        raidRunning: true,
        raidSeconds: startFrom,
        raidUpdatedAt: Date.now(),
      });
    }
  };

  const handleResetRaidTimer = () => {
    updateState({
      raidRunning: false,
      raidSeconds: 30,
      raidUpdatedAt: Date.now(),
    });
  };

  const handleResetKabaddi = () => {
    updateState({
      teamAScore: 0,
      teamBScore: 0,
      raidSeconds: 30,
      raidRunning: false,
      raidUpdatedAt: Date.now(),
      doOrDie: false,
      kabaddiAlert: null,
    });
  };

  // Build real OBS & vMix Browser Source URLs (including active style!)
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://starevent.live';
  const buildOutputUrl = (extraParams?: Record<string, string>) => {
    const params = new URLSearchParams();
    params.set('overlay', activeMode);
    params.set('style', activeStyle);
    params.set('room', roomId);
    params.set('bg', outputBg);
    if (lockModeInUrl) {
      params.set('lock', '1');
    }
    if (extraParams) {
      for (const [k, v] of Object.entries(extraParams)) {
        params.set(k, v);
      }
    }
    return `${origin}/?${params.toString()}`;
  };

  const obsBrowserUrl = buildOutputUrl();
  const vmixBrowserUrl = buildOutputUrl({ client: 'vmix' });

  const handleDownloadOverlay = () => {
    if (!isCurrentUnlocked) {
      onRequestPurchase(currentSku);
      return;
    }
    if (activeMode === 'kabaddi') {
      downloadKabaddiOverlayPng({
        style: activeStyle,
        title: state.kabaddiTitle,
        subtitle: state.kabaddiSubtitle,
        tag: state.kabaddiTag,
        teamAName: state.teamAName || 'TEAM A',
        teamAScore: state.teamAScore,
        teamBName: state.teamBName || 'TEAM B',
        teamBScore: state.teamBScore,
        raidSeconds: displayRaidSeconds,
        halfLabel: state.kabaddiHalf,
        doOrDie: state.doOrDie,
      });
    } else {
      downloadHaldiOverlayPng({
        style: activeStyle,
        tag: state.haldiTag,
        header: state.haldiHeader,
        title: state.haldiTitle,
        subtitle: state.haldiSubtitle,
      });
    }
  };

  const modeTabs: { id: PreviewMode; label: Record<Language, string> }[] = [
    { id: 'kabaddi', label: { mr: 'कबड्डी स्कोअरबोर्ड', en: 'Kabaddi Scoreboard' } },
    { id: 'haldi', label: { mr: 'हळदी समारंभ ओव्हरले', en: 'Haldi Overlay' } },
  ];

  const styleOptions: { id: OverlayStyle; label: Record<Language, string>; desc: Record<Language, string> }[] =
    activeMode === 'kabaddi'
      ? [
          {
            id: 'classic',
            label: { mr: 'स्टाईल 1 · शाही अरेना फ्रेम', en: 'Style 1 · Shahi Arena Frame' },
            desc: { mr: 'लाल-सोनेरी पूर्ण बॉर्डर', en: 'Full red & gold border' },
          },
          {
            id: 'modern',
            label: { mr: 'स्टाईल 2 · प्रो TV स्कोअरबार', en: 'Style 2 · Pro TV Scorebar' },
            desc: { mr: 'फ्लोटिंग पिल + गोल टायमर', en: 'Open frame + round timer' },
          },
        ]
      : [
          {
            id: 'classic',
            label: { mr: 'स्टाईल 1 · शाही हळदी फ्रेम', en: 'Style 1 · Shahi Marigold Frame' },
            desc: { mr: 'कॉर्नर डिझाईन + टॉप बॅनर', en: 'Ornamental corners + top plaque' },
          },
          {
            id: 'modern',
            label: { mr: 'स्टाईल 2 · सिनेमॅटिक रिबन', en: 'Style 2 · Cinematic Ribbon' },
            desc: { mr: 'क्लिन ओपन व्ह्यू + फ्लोटिंग रिबन', en: 'Open viewport + floating ribbon' },
          },
        ];

  const activePlatformObj = PLATFORMS.find((p) => p.id === platform) ?? PLATFORMS[0];

  const monitorBackgroundStyle = transparentBg
    ? outputBg === 'green'
      ? { backgroundColor: '#00B140' }
      : outputBg === 'blue'
        ? { backgroundColor: '#0047BB' }
        : {
            backgroundColor: '#18181B',
            backgroundImage:
              'linear-gradient(45deg, #27272A 25%, transparent 25%), linear-gradient(-45deg, #27272A 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #27272A 75%), linear-gradient(-45deg, transparent 75%, #27272A 75%)',
            backgroundSize: '24px 24px',
            backgroundPosition: '0 0, 0 12px, 12px -12px, -12px 0px',
          }
    : undefined;

  return (
    <section id="studio" className="py-20 sm:py-24 border-b border-white/10 bg-[#0C0C0F]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          <div className="max-w-2xl space-y-3">
            <p className="text-xs sm:text-sm font-medium text-[#FACC15]">
              {UI_COPY.studioSection.kicker[lang]}
            </p>
            <h2 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-white">
              {UI_COPY.studioSection.heading[lang]}
            </h2>
            <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
              {UI_COPY.studioSection.intro[lang]}
            </p>
          </div>

          {/* 2-Tab Mode Switcher: Kabaddi Scoreboard & Haldi Overlay ONLY */}
          <div
            role="tablist"
            aria-label="Broadcast overlay mode"
            className="flex flex-wrap items-center gap-1 p-1 bg-[#141418] border border-white/10 rounded-xl shrink-0"
          >
            {modeTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeMode === tab.id}
                onClick={() => handleSelectMode(tab.id)}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] ${
                  activeMode === tab.id
                    ? 'bg-[#DC2626] text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {tab.label[lang]}
              </button>
            ))}
          </div>
        </div>

        {/* 2-Style Visual Picker Bar */}
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {styleOptions.map((opt) => {
            const selected = activeStyle === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelectStyle(opt.id)}
                aria-pressed={selected}
                className={`flex items-center justify-between gap-4 px-4 py-3 rounded-xl border text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] ${
                  selected
                    ? 'bg-[#1A1315] border-[#FACC15] text-white'
                    : 'bg-[#121216] border-white/10 text-zinc-300 hover:border-white/25'
                }`}
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-white">{opt.label[lang]}</p>
                  <p className="text-xs text-zinc-400">{opt.desc[lang]}</p>
                </div>
                <span
                  className={`font-mono text-[11px] font-bold whitespace-nowrap shrink-0 ${
                    selected ? 'text-[#FACC15]' : 'text-zinc-500'
                  }`}
                >
                  {selected
                    ? lang === 'mr'
                      ? 'सक्रिय'
                      : 'ACTIVE'
                    : lang === 'mr'
                      ? 'निवडा'
                      : 'SELECT'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Main Studio Grid: Monitor + Control Desk */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Broadcast Program Monitor (16:9) + OBS/vMix URL Panel */}
          <div className="lg:col-span-8 bg-[#121216] border border-white/12 rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-5">
            {/* Monitor top toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/8 text-xs text-zinc-400">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono font-medium text-zinc-200">
                  1920×1080 PGM · {activeStyle === 'classic' ? 'STYLE 1' : 'STYLE 2'} · {activePlatformObj.label}
                </span>
                <span aria-hidden="true" className="text-zinc-600">·</span>
                <span className="font-mono text-zinc-400 tabular-nums">
                  {connected
                    ? lang === 'mr'
                      ? `लाईव्ह सिंक चालू (${connectedDisplays} स्क्रीन)`
                      : `Live Sync Connected (${connectedDisplays} screen${connectedDisplays === 1 ? '' : 's'})`
                    : lang === 'mr'
                      ? 'लोकल सिंक चालू'
                      : 'Local Sync Ready'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateState({ showLogo: !state.showLogo })}
                  aria-pressed={state.showLogo}
                  className={`px-2.5 py-1 text-[11px] font-mono font-semibold rounded border transition-colors whitespace-nowrap shrink-0 ${
                    state.showLogo
                      ? 'bg-[#1D1618] text-[#FACC15] border-[#FACC15]/70'
                      : 'bg-[#18181D] text-zinc-400 border-white/15 hover:border-white/30'
                  }`}
                >
                  {state.showLogo ? '3D Logo: ON' : '3D Logo: OFF'}
                </button>

                {state.showLogo && (
                  <button
                    type="button"
                    onClick={() =>
                      updateState({
                        logoCorner: state.logoCorner === 'top-right' ? 'top-left' : 'top-right',
                      })
                    }
                    className="px-2.5 py-1 text-[11px] font-mono font-semibold rounded border bg-[#18181D] text-zinc-300 border-white/15 hover:border-white/30 transition-colors whitespace-nowrap shrink-0"
                  >
                    {state.logoCorner === 'top-right' ? 'Pos: Right' : 'Pos: Left'}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => updateState({ visible: !state.visible })}
                  aria-pressed={state.visible}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono font-semibold rounded border transition-colors whitespace-nowrap shrink-0 ${
                    state.visible
                      ? 'bg-[#DC2626] text-white border-[#DC2626]'
                      : 'bg-[#18181D] text-zinc-300 border-white/15 hover:border-white/30'
                  }`}
                >
                  {state.visible ? (
                    <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                  <span>{state.visible ? 'ON AIR' : 'HIDDEN'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTransparentBg((v) => !v)}
                  aria-pressed={transparentBg}
                  className={`px-2.5 py-1 text-[11px] font-mono font-semibold rounded border transition-colors whitespace-nowrap shrink-0 ${
                    transparentBg
                      ? 'bg-[#FACC15] text-black border-[#FACC15]'
                      : 'bg-[#18181D] text-zinc-300 border-white/15 hover:border-white/30'
                  }`}
                >
                  {transparentBg
                    ? outputBg === 'transparent'
                      ? 'Alpha Grid: ON'
                      : `Chroma: ${outputBg.toUpperCase()}`
                    : 'Studio Dark BG'}
                </button>
              </div>
            </div>

            {/* Simulated 16:9 Live Broadcast Stage (Style 1 & Style 2) */}
            <div
              className={`relative aspect-video w-full rounded-xl overflow-hidden flex flex-col justify-between p-3.5 sm:p-5 transition-opacity duration-200 ${
                state.visible ? 'opacity-100' : 'opacity-25'
              } ${
                isClassic
                  ? activeMode === 'kabaddi'
                    ? 'border-2 border-[#FACC15] shadow-[inset_0_0_0_3px_#DC2626]'
                    : 'border-2 border-[#FACC15] shadow-[inset_0_0_0_4px_#B45309]'
                  : 'border border-white/12'
              } ${
                transparentBg
                  ? ''
                  : activeMode === 'kabaddi'
                    ? 'bg-gradient-to-br from-[#2E070A] via-[#130D14] to-[#09090B]'
                    : 'bg-gradient-to-br from-[#452705] via-[#261607] to-[#09090B]'
              }`}
              style={monitorBackgroundStyle}
            >
              {/* Classic Haldi ornamental corners */}
              {isClassic && activeMode === 'haldi' && (
                <>
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute top-2.5 left-2.5 w-7 h-7 border-t-2 border-l-2 border-[#FACC15]"
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute top-2.5 right-2.5 w-7 h-7 border-t-2 border-r-2 border-[#FACC15]"
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute bottom-2.5 left-2.5 w-7 h-7 border-b-2 border-l-2 border-[#FACC15]"
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute bottom-2.5 right-2.5 w-7 h-7 border-b-2 border-r-2 border-[#FACC15]"
                  />
                </>
              )}

              {/* Top Broadcast Bug Bar */}
              <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
                {activeMode === 'kabaddi' ? (
                  isClassic ? (
                    <>
                      <div className="inline-flex items-center gap-2 bg-[#DC2626] border border-[#FACC15] text-white px-2.5 py-1 rounded text-[11px] font-mono font-bold tracking-wide">
                        <span>{state.kabaddiTag}</span>
                      </div>
                      <div className="bg-[#0B0A0E]/90 border border-[#FACC15]/80 px-3 py-1 rounded text-[11px] sm:text-xs font-display font-bold text-[#FACC15]">
                        {state.kabaddiTitle}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="inline-flex items-center gap-2 bg-[#0A0C12]/90 border border-[#FACC15]/85 rounded-full pl-1 pr-3 py-0.5">
                        <span className="bg-[#DC2626] text-white px-2 py-0.5 rounded-full text-[10px] font-mono font-bold">
                          {state.kabaddiTag}
                        </span>
                        <span className="text-[11px] font-display font-bold text-[#FACC15]">
                          STAR EVENT LIVE
                        </span>
                      </div>
                      <div className="bg-[#0A0C12]/88 border border-white/20 rounded-full px-3 py-1 text-[10px] sm:text-xs font-display font-bold text-zinc-100">
                        {state.kabaddiTitle}
                      </div>
                    </>
                  )
                ) : isClassic ? (
                  <>
                    <div className="inline-flex items-center gap-1.5 bg-[#B45309]/95 border border-[#FACC15] text-[#FEF08A] px-2.5 py-1 rounded text-[11px] font-mono font-bold tracking-wide">
                      <span>{state.haldiTag}</span>
                    </div>
                    <div className="bg-[#78350F]/95 border border-[#FACC15] px-4 py-1 rounded-full text-[11px] sm:text-xs font-display font-bold text-[#FEF08A]">
                      {state.haldiHeader}
                    </div>
                  </>
                ) : (
                  <div className="ml-auto bg-[#180F06]/88 border border-[#FACC15]/85 rounded-full px-3.5 py-1 text-[10px] sm:text-xs font-display font-bold text-[#FACC15]">
                    {state.haldiHeader}
                  </div>
                )}
              </div>

              {/* 3D Spinning Chroma-Keyed Logo Watermark */}
              {state.showLogo && (
                <div
                  className={`pointer-events-none absolute top-14 sm:top-16 z-20 ${
                    state.logoCorner === 'top-left' ? 'left-4 sm:left-5' : 'right-4 sm:right-5'
                  }`}
                >
                  <SpinningLogoVideo
                    className="w-14 h-14 sm:w-20 sm:h-20 drop-shadow-[0_6px_14px_rgba(0,0,0,0.65)]"
                    resolution={200}
                    label="Star Event Live rotating broadcast bug"
                  />
                </div>
              )}

              {/* Center Safe Zone */}
              <div className="relative z-10 my-auto flex flex-col items-center justify-center text-center px-2">
                {activeMode === 'kabaddi' && state.kabaddiAlert ? (
                  <div className="bg-[#DC2626] border-2 border-[#FACC15] px-6 py-2.5 rounded-lg text-white font-display font-extrabold text-xl sm:text-3xl tracking-tight shadow-lg">
                    {state.kabaddiAlert}
                  </div>
                ) : (
                  <p className="font-mono text-[11px] sm:text-xs text-zinc-200 bg-black/65 px-3 py-1.5 rounded border border-white/10">
                    {lang === 'mr'
                      ? 'क्लियर सेंटर (OBS / vMix मध्ये येथे तुमचा लाईव्ह कॅमेरा दिसेल)'
                      : 'CLEAR CENTER · LIVE OBS / vMix CAMERA FEED SHOWS HERE'}
                  </p>
                )}
              </div>

              {/* Bottom On-Screen Graphic (Style 1 vs Style 2) */}
              <div className="relative z-10">
                {activeMode === 'kabaddi' ? (
                  isClassic ? (
                    <div className="bg-[#12080B]/95 border-2 border-[#FACC15] rounded-xl overflow-hidden">
                      <div className="grid grid-cols-12 items-center">
                        <div className="col-span-5 bg-gradient-to-r from-[#991B1B] to-[#DC2626] px-2.5 sm:px-4 py-2 flex items-center justify-between gap-2">
                          <span className="font-display font-extrabold text-[11px] sm:text-sm text-white truncate">
                            {state.teamAName}
                          </span>
                          <span className="font-mono font-extrabold text-base sm:text-2xl text-[#FACC15] tabular-nums">
                            {String(state.teamAScore).padStart(2, '0')}
                          </span>
                        </div>

                        <div className="col-span-2 bg-[#09090B] px-1.5 py-1.5 text-center border-x border-[#FACC15]/60">
                          <p className="text-[9px] font-mono text-zinc-400 leading-none truncate">
                            {state.doOrDie ? 'DO-OR-DIE' : state.kabaddiHalf}
                          </p>
                          <p
                            className={`font-mono font-extrabold text-sm sm:text-xl tabular-nums leading-tight mt-0.5 ${
                              displayRaidSeconds <= 10 ? 'text-[#EF4444]' : 'text-[#FACC15]'
                            }`}
                          >
                            {String(displayRaidSeconds).padStart(2, '0')}s
                          </p>
                        </div>

                        <div className="col-span-5 bg-gradient-to-l from-[#1E3A8A] to-[#1D4ED8] px-2.5 sm:px-4 py-2 flex items-center justify-between gap-2">
                          <span className="font-mono font-extrabold text-base sm:text-2xl text-[#FACC15] tabular-nums">
                            {String(state.teamBScore).padStart(2, '0')}
                          </span>
                          <span className="font-display font-extrabold text-[11px] sm:text-sm text-white truncate text-right">
                            {state.teamBName}
                          </span>
                        </div>
                      </div>

                      <div className="bg-[#230B0F] border-t border-[#FACC15]/40 px-3 py-1 text-center">
                        <p className="text-[10px] sm:text-xs font-medium text-[#FEF08A] truncate">
                          {state.kabaddiSubtitle}
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* Style 2: Pro TV Floating Broadcast Capsule */
                    <div className="w-[94%] mx-auto">
                      <div className="bg-[#0A0C14]/95 border-2 border-[#FACC15] rounded-full px-2 py-1.5 shadow-xl">
                        <div className="grid grid-cols-12 items-center gap-1.5">
                          <div className="col-span-5 bg-gradient-to-r from-[#B91C1C] to-[#EF4444] rounded-full px-3 sm:px-4 py-1.5 flex items-center justify-between gap-2">
                            <span className="font-display font-extrabold text-[10px] sm:text-xs text-white truncate">
                              {state.teamAName}
                            </span>
                            <span className="font-mono font-extrabold text-sm sm:text-xl text-[#FEF08A] tabular-nums">
                              {String(state.teamAScore).padStart(2, '0')}
                            </span>
                          </div>

                          <div className="col-span-2 flex justify-center">
                            <div
                              className={`-my-3 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#09090B] border-2 flex flex-col items-center justify-center shadow-lg ${
                                state.doOrDie ? 'border-[#EF4444]' : 'border-[#FACC15]'
                              }`}
                            >
                              <span
                                className={`font-mono font-bold text-[7px] sm:text-[8px] leading-none ${
                                  state.doOrDie ? 'text-[#FCA5A5]' : 'text-zinc-400'
                                }`}
                              >
                                {state.doOrDie ? 'DO-OR-DIE' : state.kabaddiHalf.replace(' HALF', '')}
                              </span>
                              <span
                                className={`font-mono font-extrabold text-xs sm:text-base tabular-nums leading-tight ${
                                  displayRaidSeconds <= 10 ? 'text-[#EF4444]' : 'text-[#FACC15]'
                                }`}
                              >
                                {String(displayRaidSeconds).padStart(2, '0')}s
                              </span>
                            </div>
                          </div>

                          <div className="col-span-5 bg-gradient-to-l from-[#1E3A8A] to-[#0284C7] rounded-full px-3 sm:px-4 py-1.5 flex items-center justify-between gap-2">
                            <span className="font-mono font-extrabold text-sm sm:text-xl text-[#FEF08A] tabular-nums">
                              {String(state.teamBScore).padStart(2, '0')}
                            </span>
                            <span className="font-display font-extrabold text-[10px] sm:text-xs text-white truncate text-right">
                              {state.teamBName}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-1.5 text-center">
                        <span className="inline-block bg-[#0A0C14]/90 border border-[#FACC15]/40 rounded-full px-3 py-0.5 text-[9px] sm:text-[11px] font-medium text-[#FEF08A] max-w-full truncate">
                          {state.kabaddiSubtitle}
                        </span>
                      </div>
                    </div>
                  )
                ) : isClassic ? (
                  <div className="bg-gradient-to-r from-[#78350F]/95 via-[#B45309]/95 to-[#78350F]/95 border-2 border-[#FACC15] rounded-xl px-4 py-2.5 text-center shadow-lg">
                    <p className="font-display text-sm sm:text-xl font-extrabold text-white truncate">
                      {state.haldiTitle}
                    </p>
                    <p className="text-[10px] sm:text-xs font-medium text-[#FEF08A] mt-0.5 truncate">
                      {state.haldiSubtitle}
                    </p>
                  </div>
                ) : (
                  /* Haldi Style 2: Minimal Floral Cinematic Ribbon */
                  <div className="w-[88%] mx-auto bg-gradient-to-r from-[#221204]/90 via-[#92400E]/95 to-[#221204]/90 border-2 border-[#FDE047] rounded-full px-5 sm:px-7 py-2.5 flex items-center justify-between gap-3 shadow-xl">
                    <span className="w-2.5 h-2.5 rotate-45 bg-[#FACC15] shrink-0" aria-hidden="true" />
                    <div className="min-w-0 text-center flex-1">
                      <p className="font-display text-sm sm:text-lg font-extrabold text-white truncate">
                        {state.haldiTitle}
                      </p>
                      <p className="text-[10px] sm:text-xs font-medium text-[#FEF08A] truncate">
                        {state.haldiTag} • {state.haldiSubtitle}
                      </p>
                    </div>
                    <span className="w-2.5 h-2.5 rotate-45 bg-[#FACC15] shrink-0" aria-hidden="true" />
                  </div>
                )}
              </div>
            </div>

            {/* OBS Studio & vMix Live Browser Source URL Support Panel (Paid ₹99 Unlock Gate) */}
            <div className="pt-4 border-t border-white/10 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-white flex items-center gap-2">
                    <Radio className="w-4 h-4 text-[#EF4444]" aria-hidden="true" />
                    <span>
                      {lang === 'mr'
                        ? 'OBS Studio व vMix थेट Browser Source URL (1920×1080 ट्रान्सपरंट)'
                        : 'OBS Studio & vMix Live Browser Source URLs (1920×1080 Transparent)'}
                    </span>
                  </p>
                  <p className="text-xs text-zinc-400">
                    {isCurrentUnlocked
                      ? lang === 'mr'
                        ? 'अनलॉक केलेले · ही URL OBS किंवा vMix मध्ये पेस्ट करा — स्कोअर व टायटल रिअल-टाईम अपडेट होतील.'
                        : 'Unlocked · Paste this URL into OBS Browser Source or vMix Web Browser Input for live sync.'
                      : lang === 'mr'
                        ? 'OBS URL, vMix URL आणि 1920×1080 ट्रान्सपरंट PNG डाउनलोड करण्यासाठी हा ओव्हरले फक्त ₹99 मध्ये अनलॉक करा.'
                        : 'Unlock this overlay for ₹99 (was ₹149) to access live OBS URL, vMix URL, and 1920×1080 PNG export.'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {isCurrentUnlocked ? (
                    <>
                      <button
                        type="button"
                        onClick={handleDownloadOverlay}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-black bg-[#FACC15] hover:bg-[#EAB308] rounded-lg transition-colors whitespace-nowrap shrink-0"
                      >
                        <Download className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span>{lang === 'mr' ? '1920×1080 PNG' : 'Download PNG'}</span>
                      </button>

                      <a
                        href={obsBrowserUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#DC2626] hover:bg-[#B91C1C] rounded-lg transition-colors whitespace-nowrap shrink-0"
                      >
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span>{lang === 'mr' ? 'ट्रान्सपरंट आउटपुट पहा' : 'Open Output Tab'}</span>
                      </a>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onRequestPurchase(currentSku)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-[#DC2626] hover:bg-[#B91C1C] rounded-lg transition-colors whitespace-nowrap shrink-0 tabular-nums"
                    >
                      <Lock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span className="line-through text-red-200/80">₹149</span>
                      <span className="font-mono font-extrabold text-[#FACC15]">₹99</span>
                      <span>{lang === 'mr' ? 'मध्ये अनलॉक करा' : 'Unlock Overlay'}</span>
                    </button>
                  )}
                </div>
              </div>

              {isCurrentUnlocked ? (
                <>
                  {/* Channel Room ID + Background Mode + Lock Mode controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-4 space-y-1">
                      <label htmlFor="overlay-room-id" className="block text-[11px] font-medium text-zinc-400">
                        {lang === 'mr' ? 'लाईव्ह चॅनेल / रूम ID' : 'Live Channel / Room ID'}
                      </label>
                      <input
                        id="overlay-room-id"
                        type="text"
                        value={roomInput}
                        onChange={(e) => setRoomInput(sanitizeRoomIdClient(e.target.value))}
                        className="w-full px-3 py-1.5 text-xs font-mono bg-[#0D0D11] border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#FACC15]"
                      />
                    </div>

                    <div className="sm:col-span-5 space-y-1">
                      <span className="block text-[11px] font-medium text-zinc-400">
                        {lang === 'mr' ? 'आउटपुट बॅकग्राउंड (OBS / vMix)' : 'Output Background Mode'}
                      </span>
                      <div className="grid grid-cols-3 gap-1">
                        {(['transparent', 'green', 'blue'] as OverlayBackground[]).map((bgOpt) => (
                          <button
                            key={bgOpt}
                            type="button"
                            onClick={() => setOutputBg(bgOpt)}
                            className={`py-1.5 text-[11px] font-semibold rounded-lg border transition-colors whitespace-nowrap ${
                              outputBg === bgOpt
                                ? 'bg-white text-black border-white'
                                : 'bg-[#0D0D11] text-zinc-300 border-white/12 hover:border-white/30'
                            }`}
                          >
                            {bgOpt === 'transparent' ? 'Alpha PNG' : bgOpt === 'green' ? 'Chroma Green' : 'Chroma Blue'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="sm:col-span-3 space-y-1">
                      <span className="block text-[11px] font-medium text-zinc-400">
                        {lang === 'mr' ? 'मोड लॉक' : 'URL Mode'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setLockModeInUrl((v) => !v)}
                        aria-pressed={lockModeInUrl}
                        className={`w-full py-1.5 text-[11px] font-semibold rounded-lg border transition-colors whitespace-nowrap ${
                          lockModeInUrl
                            ? 'bg-[#FACC15] text-black border-[#FACC15]'
                            : 'bg-[#0D0D11] text-zinc-300 border-white/12 hover:border-white/30'
                        }`}
                      >
                        {lockModeInUrl ? `Locked: ${activeMode}` : 'Auto-Follow Desk'}
                      </button>
                    </div>
                  </div>

                  {/* Copyable OBS & vMix URLs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-[#0D0D11] border border-white/10 rounded-xl p-3.5 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-white">OBS Studio · Browser Source</span>
                        <span className="font-mono text-[10px] text-[#FACC15]">1920 × 1080 · 60fps</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          aria-label="OBS Studio Browser Source URL"
                          value={obsBrowserUrl}
                          className="flex-1 min-w-0 px-2.5 py-1.5 text-[11px] font-mono bg-[#16161C] border border-white/10 rounded text-zinc-200 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => copyText('obs', obsBrowserUrl)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded transition-colors whitespace-nowrap shrink-0"
                        >
                          {copiedKey === 'obs' ? (
                            <Check className="w-3.5 h-3.5" aria-hidden="true" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                          )}
                          <span>{copiedKey === 'obs' ? 'Copied' : 'Copy OBS'}</span>
                        </button>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <span className="text-[11px] text-zinc-400 truncate">
                          Sources → + Browser → 1920×1080 → Transparent Alpha
                        </span>
                        <button
                          type="button"
                          onClick={() => copyText('css', OBS_CUSTOM_CSS)}
                          className="text-[11px] font-mono text-[#FACC15] hover:text-white whitespace-nowrap shrink-0"
                        >
                          {copiedKey === 'css' ? 'CSS Copied' : 'Copy OBS CSS'}
                        </button>
                      </div>
                    </div>

                    <div className="bg-[#0D0D11] border border-white/10 rounded-xl p-3.5 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-white">vMix · Web Browser Input</span>
                        <span className="font-mono text-[10px] text-[#FACC15]">Overlay Ch 1–4</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          aria-label="vMix Web Browser Input URL"
                          value={vmixBrowserUrl}
                          className="flex-1 min-w-0 px-2.5 py-1.5 text-[11px] font-mono bg-[#16161C] border border-white/10 rounded text-zinc-200 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => copyText('vmix', vmixBrowserUrl)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded transition-colors whitespace-nowrap shrink-0"
                        >
                          {copiedKey === 'vmix' ? (
                            <Check className="w-3.5 h-3.5" aria-hidden="true" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                          )}
                          <span>{copiedKey === 'vmix' ? 'Copied' : 'Copy vMix'}</span>
                        </button>
                      </div>
                      <p className="text-[11px] text-zinc-400 pt-1 truncate">
                        Add Input → Web Browser → 1920×1080 → Click Overlay [1]
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-[#0D0D11] border border-[#FACC15]/30 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-white flex items-center gap-2">
                      <Lock className="w-4 h-4 text-[#FACC15] shrink-0" aria-hidden="true" />
                      <span>
                        {lang === 'mr'
                          ? 'OBS / vMix लाईव्ह URL व 1920×1080 PNG लॉक केलेले आहे'
                          : 'OBS / vMix Live URLs & 1920×1080 PNG Export Locked'}
                      </span>
                    </p>
                    <p className="text-xs text-zinc-400">
                      {lang === 'mr'
                        ? 'तुम्ही वरती स्कोअरबोर्ड आणि टायटलची चाचणी मोफत घेऊ शकता. लाईव्ह स्ट्रीमसाठी ₹149 कट करून फक्त ₹99 मध्ये अनलॉक करा.'
                        : 'Test live scores and titles above for free. Unlock for ₹99 (MRP ₹149) to get your OBS Browser Source URL, vMix URL, and transparent PNG.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRequestPurchase(currentSku)}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 text-xs sm:text-sm font-semibold text-black bg-[#FACC15] hover:bg-[#EAB308] rounded-lg transition-colors whitespace-nowrap shrink-0 tabular-nums"
                  >
                    <span className="line-through text-black/60">₹149</span>
                    <span className="font-mono font-extrabold">₹99</span>
                    <span>{lang === 'mr' ? 'अनलॉक करा' : 'Unlock Now'}</span>
                  </button>
                </div>
              )}

              {/* Kabaddi Custom Overlay Prompt Spec */}
              {activeMode === 'kabaddi' && (
                <div className="flex flex-wrap items-center justify-between gap-2 bg-[#0D0D11] border border-white/8 rounded-lg px-3 py-2">
                  <p className="text-[11px] font-mono text-zinc-400 flex-1 min-w-0 truncate">
                    {CUSTOM_OVERLAY_PROMPTS.kabaddi.imagePrompt}
                  </p>
                  <button
                    type="button"
                    onClick={() => copyText('prompt', CUSTOM_OVERLAY_PROMPTS.kabaddi.imagePrompt)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#FACC15] hover:text-white whitespace-nowrap shrink-0"
                  >
                    {copiedKey === 'prompt' ? (
                      <Check className="w-3 h-3" aria-hidden="true" />
                    ) : (
                      <Copy className="w-3 h-3" aria-hidden="true" />
                    )}
                    <span>{copiedKey === 'prompt' ? 'Prompt Copied' : 'Copy Prompt'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Interactive Control Desk (Kabaddi Scoreboard or Haldi Overlay) */}
          <div className="lg:col-span-4 bg-[#121216] border border-white/12 rounded-2xl p-5 sm:p-6 flex flex-col justify-between gap-6">
            <div className="space-y-5">
              {/* Platform Selector */}
              <div className="space-y-2.5">
                <p className="text-xs font-semibold text-zinc-300 flex items-center gap-2">
                  <Tv className="w-3.5 h-3.5 text-[#FACC15]" aria-hidden="true" />
                  <span>{lang === 'mr' ? 'स्ट्रीमिंग प्लॅटफॉर्म निवडा' : 'Select Streaming Platform'}</span>
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPlatform(p.id)}
                      className={`px-2 py-2 text-xs font-semibold rounded-lg border transition-colors duration-150 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] ${
                        platform === p.id
                          ? 'bg-white text-[#09090B] border-white'
                          : 'bg-[#18181D] text-zinc-300 border-white/10 hover:border-white/25'
                      }`}
                    >
                      {p.label.replace(' Live', '')}
                    </button>
                  ))}
                </div>
              </div>

              {activeMode === 'kabaddi' ? (
                <div className="space-y-4 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-zinc-200">
                      {lang === 'mr' ? 'कबड्डी स्कोअर व 30s रेड टायमर' : 'Kabaddi Score & 30s Raid Desk'}
                    </p>
                    <button
                      type="button"
                      onClick={handleResetKabaddi}
                      className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" aria-hidden="true" />
                      <span>{lang === 'mr' ? 'रीसेट' : 'Reset'}</span>
                    </button>
                  </div>

                  {/* Team Names */}
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      aria-label="Team A name"
                      value={state.teamAName}
                      onChange={(e) => updateState({ teamAName: e.target.value })}
                      className="px-2.5 py-2 text-xs font-semibold bg-[#18181D] border border-[#DC2626]/50 rounded-lg text-white focus:outline-none focus:border-[#FACC15]"
                    />
                    <input
                      type="text"
                      aria-label="Team B name"
                      value={state.teamBName}
                      onChange={(e) => updateState({ teamBName: e.target.value })}
                      className="px-2.5 py-2 text-xs font-semibold bg-[#18181D] border border-blue-600/50 rounded-lg text-white focus:outline-none focus:border-[#FACC15]"
                    />
                  </div>

                  {/* Team Scoring Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <div className="grid grid-cols-3 gap-1">
                        <button
                          type="button"
                          onClick={() => handleKabaddiScore('A', -1)}
                          className="py-2 text-xs font-mono font-bold bg-[#18181D] hover:bg-[#22222A] text-zinc-300 border border-white/10 rounded-lg"
                        >
                          -1
                        </button>
                        <button
                          type="button"
                          onClick={() => handleKabaddiScore('A', 1)}
                          className="col-span-2 py-2 text-xs font-mono font-bold bg-[#991B1B] hover:bg-[#DC2626] text-white rounded-lg transition-colors"
                        >
                          A +1 PT
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleKabaddiScore('A', 3, `${state.teamAName}: SUPER RAID +3`)}
                        className="w-full py-2 text-xs font-mono font-bold bg-[#18181D] hover:bg-[#22222A] text-[#FACC15] border border-white/10 rounded-lg transition-colors"
                      >
                        SUPER RAID +3
                      </button>
                      <button
                        type="button"
                        onClick={() => handleKabaddiScore('A', 2, `ALL OUT! +2 ${state.teamAName}`)}
                        className="w-full py-1.5 text-[11px] font-mono font-semibold bg-[#18181D] hover:bg-[#22222A] text-zinc-200 border border-white/10 rounded-lg transition-colors"
                      >
                        ALL OUT +2
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <div className="grid grid-cols-3 gap-1">
                        <button
                          type="button"
                          onClick={() => handleKabaddiScore('B', -1)}
                          className="py-2 text-xs font-mono font-bold bg-[#18181D] hover:bg-[#22222A] text-zinc-300 border border-white/10 rounded-lg"
                        >
                          -1
                        </button>
                        <button
                          type="button"
                          onClick={() => handleKabaddiScore('B', 1)}
                          className="col-span-2 py-2 text-xs font-mono font-bold bg-[#1D4ED8] hover:bg-[#2563EB] text-white rounded-lg transition-colors"
                        >
                          B +1 PT
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleKabaddiScore('B', 3, `${state.teamBName}: SUPER RAID +3`)}
                        className="w-full py-2 text-xs font-mono font-bold bg-[#18181D] hover:bg-[#22222A] text-[#FACC15] border border-white/10 rounded-lg transition-colors"
                      >
                        SUPER RAID +3
                      </button>
                      <button
                        type="button"
                        onClick={() => handleKabaddiScore('B', 2, `ALL OUT! +2 ${state.teamBName}`)}
                        className="w-full py-1.5 text-[11px] font-mono font-semibold bg-[#18181D] hover:bg-[#22222A] text-zinc-200 border border-white/10 rounded-lg transition-colors"
                      >
                        ALL OUT +2
                      </button>
                    </div>
                  </div>

                  {/* 30-Second Raid Timer Controls */}
                  <div className="pt-3 border-t border-white/10 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono text-zinc-300 tabular-nums">
                        RAID: {String(displayRaidSeconds).padStart(2, '0')}s
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            updateState({
                              kabaddiHalf: state.kabaddiHalf === '1ST HALF' ? '2ND HALF' : '1ST HALF',
                            })
                          }
                          className="px-2 py-1 text-[11px] font-mono bg-[#18181D] border border-white/10 rounded text-zinc-300 hover:text-white"
                        >
                          {state.kabaddiHalf}
                        </button>
                        <button
                          type="button"
                          onClick={() => updateState({ doOrDie: !state.doOrDie })}
                          aria-pressed={state.doOrDie}
                          className={`px-2 py-1 text-[11px] font-mono rounded border ${
                            state.doOrDie
                              ? 'bg-[#DC2626] border-[#FACC15] text-white'
                              : 'bg-[#18181D] border-white/10 text-zinc-300'
                          }`}
                        >
                          DO-OR-DIE
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handleToggleRaidTimer}
                        className="inline-flex items-center justify-center gap-1.5 py-2 text-xs font-semibold bg-[#FACC15] hover:bg-[#EAB308] text-black rounded-lg transition-colors"
                      >
                        {state.raidRunning ? (
                          <Pause className="w-3.5 h-3.5" aria-hidden="true" />
                        ) : (
                          <Play className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                        <span>{state.raidRunning ? 'Pause Timer' : 'Start 30s Raid'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleResetRaidTimer}
                        className="py-2 text-xs font-semibold bg-[#18181D] hover:bg-[#22222A] text-zinc-200 border border-white/10 rounded-lg transition-colors"
                      >
                        Reset 30s
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 pt-4 border-t border-white/10">
                  <p className="text-xs font-semibold text-zinc-200">
                    {lang === 'mr'
                      ? 'हळदी समारंभ ओव्हरले कंट्रोल (OBS/vMix सिंक)'
                      : 'Haldi Ceremony Overlay Controls (OBS/vMix Sync)'}
                  </p>

                  <div className="space-y-1.5">
                    <label htmlFor="preview-haldi-header" className="block text-xs text-zinc-400">
                      {lang === 'mr' ? 'वरचा बॅनर (Header)' : 'Top Header Banner'}
                    </label>
                    <input
                      id="preview-haldi-header"
                      type="text"
                      value={state.haldiHeader}
                      onChange={(e) => updateState({ haldiHeader: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-[#18181D] border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#FACC15]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="preview-haldi-title" className="block text-xs text-zinc-400">
                      {lang === 'mr' ? 'हळदी समारंभ मुख्य नाव' : 'Main Haldi Title'}
                    </label>
                    <input
                      id="preview-haldi-title"
                      type="text"
                      value={state.haldiTitle}
                      onChange={(e) => updateState({ haldiTitle: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-[#18181D] border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#FACC15]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="preview-haldi-subtitle" className="block text-xs text-zinc-400">
                      {lang === 'mr' ? 'ठिकाण व संपर्क ओळ' : 'Venue & Contact Strip'}
                    </label>
                    <input
                      id="preview-haldi-subtitle"
                      type="text"
                      value={state.haldiSubtitle}
                      onChange={(e) => updateState({ haldiSubtitle: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-[#18181D] border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#FACC15]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Book CTA tied to previewed mode */}
            <div className="pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => onBookFromPreview(activeMode)}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-[#DC2626] hover:bg-[#B91C1C] rounded-lg transition-colors duration-150 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]"
              >
                <span>
                  {lang === 'mr'
                    ? 'या कार्यक्रमासाठी बुकिंग करा'
                    : 'Book This Broadcast Setup'}
                </span>
                <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
