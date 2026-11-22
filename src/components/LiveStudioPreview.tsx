import { ChangeEvent, useEffect, useState } from 'react';
import {
  ArrowRight,
  Check,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  ImagePlus,
  Lock,
  Radio,
  Smartphone,
  Trash2,
  Tv,
} from 'lucide-react';
import {
  EventCategoryId,
  Language,
  PlatformId,
  UI_COPY,
} from '../data/content';
import {
  formatRemainingTime,
  getOverlaySku,
  OverlaySku,
  VerifiedOverlayToken,
} from '../data/overlayCatalog';
import { sanitizeRoomIdClient, useOverlaySync } from '../hooks/useOverlaySync';
import { KabaddiTimeoutTeam, normalizeStyleForMode, OverlayBackground, OverlayMode, OverlayStyle } from '../types/overlay';
import {
  downloadHaldiOverlayPng,
  downloadKabaddiOverlayPng,
} from '../utils/exportOverlayPng';
import { KabaddiControlDesk } from './KabaddiControlDesk';
import { KabaddiRemoteModal } from './KabaddiRemoteModal';
import { KabaddiScoreboardBar } from './KabaddiScoreboardBar';

export type PreviewMode = OverlayMode;

interface LiveStudioPreviewProps {
  lang: Language;
  activeMode: PreviewMode;
  onChangeMode: (mode: PreviewMode) => void;
  activeStyle: OverlayStyle;
  onChangeStyle: (style: OverlayStyle) => void;
  unlockedSkus: OverlaySku[];
  verifiedTokens: VerifiedOverlayToken[];
  onRequestPurchase: (sku: OverlaySku) => void;
  onBookFromPreview: (category: EventCategoryId) => void;
}

const PLATFORMS: {
  id: PlatformId;
  label: string;
  shortLabel: string;
  spec: Record<Language, string>;
}[] = [
  {
    id: 'youtube-public',
    label: 'YouTube Live',
    shortLabel: 'YouTube Public',
    spec: {
      en: '1920×1080 · 60fps · YouTube Public Live',
      mr: '1920×1080 · 60fps · YouTube पब्लिक लाईव्ह',
      hi: '1920×1080 · 60fps · YouTube पब्लिक लाइव',
      gu: '1920×1080 · 60fps · YouTube પબ્લિક લાઇવ',
    },
  },
  {
    id: 'youtube-unlisted',
    label: 'YouTube Private',
    shortLabel: 'YouTube Link',
    spec: {
      en: '1920×1080 · 60fps · Unlisted Private Link',
      mr: '1920×1080 · 60fps · प्रायव्हेट / अनलिस्टेड लिंक',
      hi: '1920×1080 · 60fps · प्राइवेट / अनलिस्टेड लिंक',
      gu: '1920×1080 · 60fps · પ્રાઇવેટ / અનલિસ્ટેડ લિંક',
    },
  },
  {
    id: 'led-wall',
    label: 'Venue LED Wall',
    shortLabel: 'LED Screen',
    spec: {
      en: '1920×1080 · 60fps · Venue LED Wall Output',
      mr: '1920×1080 · 60fps · ग्राउंड / स्टेज LED आउटपुट',
      hi: '1920×1080 · 60fps · ग्राउंड / स्टेज LED आउटपुट',
      gu: '1920×1080 · 60fps · ગ્રાઉન્ડ / સ્ટેજ LED આઉટપુટ',
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
  verifiedTokens,
  onRequestPurchase,
  onBookFromPreview,
}: LiveStudioPreviewProps) {
  const [platform, setPlatform] = useState<PlatformId>('youtube-public');
  const [transparentBg, setTransparentBg] = useState(true);
  const [roomInput, setRoomInput] = useState('star-live-1');
  const [outputBg, setOutputBg] = useState<OverlayBackground>('transparent');
  const [lockModeInUrl, setLockModeInUrl] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [remoteModalOpen, setRemoteModalOpen] = useState(false);
  const [nowTs, setNowTs] = useState(() => Date.now());

  const {
    state,
    updateState,
    sendAction,
    connected,
    connectedDisplays,
    connectedControllers,
    controllerNames,
    canUndo,
    canRedo,
    roomId,
    getServerNow,
  } = useOverlaySync({
    roomId: roomInput,
    role: 'studio',
  });

  const resolvedStyle = normalizeStyleForMode(activeMode, activeStyle);
  const isClassic = resolvedStyle === 'classic';
  const isFreeDemo = activeMode === 'kabaddi' && resolvedStyle === 'demo';
  const currentSku = getOverlaySku(activeMode, resolvedStyle);
  const activeToken = verifiedTokens.find((t) => t.sku === currentSku && t.expiresAt > nowTs) ?? null;
  const isCurrentUnlocked = isFreeDemo || Boolean(activeToken && unlockedSkus.includes(currentSku));

  useEffect(() => {
    if (!activeToken) return;
    const id = window.setInterval(() => setNowTs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [activeToken]);

  const handleSelectMode = (mode: PreviewMode) => {
    const nextStyle = normalizeStyleForMode(mode, activeStyle);
    onChangeMode(mode);
    onChangeStyle(nextStyle);
    updateState({ mode, style: nextStyle });
  };

  const handleSelectStyle = (style: OverlayStyle) => {
    const nextStyle = normalizeStyleForMode(activeMode, style);
    onChangeStyle(nextStyle);
    updateState({ style: nextStyle });
  };

  // Real-time ticking 30s Kabaddi timer, 30s raid timer & 2:00 sin-bin timers
  const [displayRaidSeconds, setDisplayRaidSeconds] = useState(state.raidSeconds);
  const [displayMatchSeconds, setDisplayMatchSeconds] = useState(state.matchSeconds);
  const [binTickNow, setBinTickNow] = useState(() => Date.now());

  useEffect(() => {
    if (!state.raidRunning) {
      setDisplayRaidSeconds(state.raidSeconds);
      return;
    }

    const computeRemaining = () => {
      const elapsedSec = Math.floor(Math.max(0, getServerNow() - state.raidUpdatedAt) / 1000);
      return Math.max(0, state.raidSeconds - elapsedSec);
    };

    setDisplayRaidSeconds(computeRemaining());
    const interval = window.setInterval(() => {
      const rem = computeRemaining();
      setDisplayRaidSeconds(rem);
      if (rem === 0) {
        updateState({ raidRunning: false, raidSeconds: 0, raidUpdatedAt: getServerNow() });
      }
    }, 250);

    return () => window.clearInterval(interval);
  }, [state.raidSeconds, state.raidRunning, state.raidUpdatedAt, updateState, getServerNow]);

  useEffect(() => {
    if (!state.matchRunning) {
      setDisplayMatchSeconds(state.matchSeconds);
      return;
    }

    const computeMatch = () => {
      const elapsedSec = Math.floor(Math.max(0, getServerNow() - state.matchUpdatedAt) / 1000);
      return Math.max(0, state.matchSeconds - elapsedSec);
    };

    setDisplayMatchSeconds(computeMatch());
    const interval = window.setInterval(() => {
      const rem = computeMatch();
      setDisplayMatchSeconds(rem);
      if (rem === 0) {
        updateState({ matchRunning: false, matchSeconds: 0, matchUpdatedAt: getServerNow() });
      }
    }, 250);

    return () => window.clearInterval(interval);
  }, [state.matchSeconds, state.matchRunning, state.matchUpdatedAt, updateState, getServerNow]);

  useEffect(() => {
    if (!state.teamABinEndAt && !state.teamBBinEndAt) return;
    setBinTickNow(getServerNow());
    const interval = window.setInterval(() => {
      const now = getServerNow();
      setBinTickNow(now);
      if (state.teamABinEndAt && state.teamABinEndAt <= now) {
        updateState({ teamABinEndAt: null });
      }
      if (state.teamBBinEndAt && state.teamBBinEndAt <= now) {
        updateState({ teamBBinEndAt: null });
      }
    }, 250);
    return () => window.clearInterval(interval);
  }, [state.teamABinEndAt, state.teamBBinEndAt, updateState, getServerNow]);

  const teamABinRemaining = state.teamABinEndAt
    ? Math.max(0, Math.ceil((state.teamABinEndAt - binTickNow) / 1000))
    : 0;
  const teamBBinRemaining = state.teamBBinEndAt
    ? Math.max(0, Math.ceil((state.teamBBinEndAt - binTickNow) / 1000))
    : 0;

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

  const handleKabaddiQuickPoint = (
    team: 'A' | 'B',
    kind: 'raid' | 'bonus' | 'tackle' | 'super_tackle' | 'all_out' | 'super_raid'
  ) => {
    if (kind === 'raid') sendAction('raid', { team, points: 1 });
    else if (kind === 'super_raid') sendAction('raid', { team, points: 3 });
    else if (kind === 'bonus') sendAction('bonus', { team });
    else if (kind === 'tackle') sendAction('tackle', { team, points: 1 });
    else if (kind === 'super_tackle') sendAction('tackle', { team, points: 2 });
    else if (kind === 'all_out') sendAction('all_out', { team });
  };

  const handleKabaddiTimeout = (target: KabaddiTimeoutTeam) => {
    if (!target) {
      sendAction('clear_timeout');
    } else {
      sendAction('timeout', { target });
    }
  };

  const handleToggleMatchTimer = () => {
    if (state.matchRunning) {
      updateState({
        matchRunning: false,
        matchSeconds: displayMatchSeconds,
        matchUpdatedAt: Date.now(),
      });
    } else {
      const startFrom = displayMatchSeconds === 0 ? 30 : displayMatchSeconds;
      updateState({
        matchRunning: true,
        matchSeconds: startFrom,
        matchUpdatedAt: Date.now(),
      });
    }
  };

  const handleAdjustMatchSeconds = (deltaSec: number) => {
    const nextSec = Math.max(0, Math.min(99 * 60, displayMatchSeconds + deltaSec));
    updateState({
      matchSeconds: nextSec,
      matchUpdatedAt: Date.now(),
    });
  };

  const handleSetMatchPreset = (seconds: number, autoStart = true) => {
    updateState({
      matchRunning: autoStart,
      matchSeconds: Math.max(0, seconds),
      matchUpdatedAt: Date.now(),
    });
  };

  const handleToggleSinBin = (team: 'A' | 'B') => {
    const now = Date.now();
    if (team === 'A') {
      updateState({
        teamABinEndAt: teamABinRemaining > 0 ? null : now + 2 * 60 * 1000,
      });
    } else {
      updateState({
        teamBBinEndAt: teamBBinRemaining > 0 ? null : now + 2 * 60 * 1000,
      });
    }
  };

  const handleSwapTeams = () => {
    updateState({
      teamAName: state.teamBName,
      teamACode: state.teamBCode,
      teamAColor: state.teamBColor,
      teamAScore: state.teamBScore,
      teamALogoUrl: state.teamBLogoUrl,
      teamAYellowCards: state.teamBYellowCards,
      teamARedCards: state.teamBRedCards,
      teamABinEndAt: state.teamBBinEndAt,
      teamBName: state.teamAName,
      teamBCode: state.teamACode,
      teamBColor: state.teamAColor,
      teamBScore: state.teamAScore,
      teamBLogoUrl: state.teamALogoUrl,
      teamBYellowCards: state.teamAYellowCards,
      teamBRedCards: state.teamARedCards,
      teamBBinEndAt: state.teamABinEndAt,
    });
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
    const now = Date.now();
    updateState({
      teamAScore: 0,
      teamBScore: 0,
      teamAYellowCards: 0,
      teamARedCards: 0,
      teamBYellowCards: 0,
      teamBRedCards: 0,
      teamABinEndAt: null,
      teamBBinEndAt: null,
      matchSeconds: 30,
      matchRunning: true,
      matchUpdatedAt: now,
      raidSeconds: 30,
      raidRunning: false,
      raidUpdatedAt: now,
      kabaddiHalf: '1ST HALF',
      doOrDie: false,
      kabaddiAlert: null,
    });
  };

  // Build real OBS & vMix Browser Source URLs (auto-converts private ais-dev preview host notice)
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://starevent.live';
  const isPrivateDevPreview =
    typeof window !== 'undefined' && window.location.hostname.startsWith('ais-dev-');
  const buildOutputUrl = (extraParams?: Record<string, string>) => {
    const params = new URLSearchParams();
    params.set('overlay', activeMode);
    params.set('style', resolvedStyle);
    params.set('room', roomId);
    params.set('bg', outputBg);
    if (!isFreeDemo && activeToken?.unlockCode) {
      params.set('token', activeToken.unlockCode);
    }
    if (lockModeInUrl || isFreeDemo) {
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

  const handleDownloadOverlay = async () => {
    if (!isFreeDemo) {
      if (!isCurrentUnlocked || !activeToken) {
        onRequestPurchase(currentSku);
        return;
      }

      // Re-verify live access on the server before PNG export (blocks expired/revoked passes)
      try {
        const checkRes = await fetch(
          `/api/overlay/access?sku=${encodeURIComponent(currentSku)}&token=${encodeURIComponent(activeToken.unlockCode)}`
        );
        const checkData = await checkRes.json();
        if (!checkRes.ok || !checkData?.active) {
          onRequestPurchase(currentSku);
          return;
        }
      } catch {
        onRequestPurchase(currentSku);
        return;
      }
    }

    if (activeMode === 'kabaddi') {
      await downloadKabaddiOverlayPng({
        style: resolvedStyle,
        title: state.kabaddiTitle,
        subtitle: state.kabaddiSubtitle,
        tag: state.kabaddiTag,
        teamAName: state.teamAName || 'TEAM A',
        teamACode: state.teamACode,
        teamAColor: state.teamAColor,
        teamAScore: state.teamAScore,
        teamALogoUrl: state.teamALogoUrl,
        teamAYellowCards: state.teamAYellowCards,
        teamARedCards: state.teamARedCards,
        teamBName: state.teamBName || 'TEAM B',
        teamBCode: state.teamBCode,
        teamBColor: state.teamBColor,
        teamBScore: state.teamBScore,
        teamBLogoUrl: state.teamBLogoUrl,
        teamBYellowCards: state.teamBYellowCards,
        teamBRedCards: state.teamBRedCards,
        matchSeconds: displayMatchSeconds,
        raidSeconds: displayRaidSeconds,
        raidRunning: state.raidRunning,
        halfLabel: state.kabaddiHalf,
        doOrDie: state.doOrDie,
        showDemoWatermark: isFreeDemo,
      });
    } else {
      await downloadHaldiOverlayPng({
        style: resolvedStyle,
        tag: state.haldiTag,
        header: state.haldiHeader,
        title: state.haldiTitle,
        subtitle: state.haldiSubtitle,
        customLogoUrl: state.showLogo ? state.customLogoUrl : '',
        logoCorner: state.logoCorner,
      });
    }
  };

  const readCompressedLogoPng = (file: File, onReady: (dataUrl: string) => void) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) return;
      const img = new Image();
      img.onload = () => {
        const maxSize = 220;
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        onReady(canvas.toDataURL('image/png'));
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleUploadCustomLogo = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    readCompressedLogoPng(file, (compressedPng) => {
      updateState({
        customLogoUrl: compressedPng,
        showLogo: true,
      });
    });
  };

  const handleRemoveCustomLogo = () => {
    updateState({
      customLogoUrl: '',
      showLogo: false,
    });
  };

  const handleUploadTeamLogo = (team: 'A' | 'B', e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    readCompressedLogoPng(file, (compressedPng) => {
      if (team === 'A') {
        updateState({ teamALogoUrl: compressedPng });
      } else {
        updateState({ teamBLogoUrl: compressedPng });
      }
    });
  };

  const handleRemoveTeamLogo = (team: 'A' | 'B') => {
    if (team === 'A') {
      updateState({ teamALogoUrl: '' });
    } else {
      updateState({ teamBLogoUrl: '' });
    }
  };

  const applyCeremonyPreset = (preset: 'haldi' | 'wedding') => {
    if (preset === 'haldi') {
      updateState({
        haldiTag: 'HALDI LIVE',
        haldiHeader: '|| श्री गणेशाय नमः || शुभ हळदी समारंभ',
        haldiTitle: 'देशमुख कुटुंब — शुभ हळदी समारंभ',
        haldiSubtitle: 'थेट प्रक्षेपण • दिनांक व ठिकाण',
      });
    } else {
      updateState({
        haldiTag: 'WEDDING LIVE',
        haldiHeader: '|| श्री गणेशाय नमः || शुभ मंगल सावधान',
        haldiTitle: 'चि. रोहित व चि. सौ. कां. प्रिया — शुभ विवाह',
        haldiSubtitle: 'लग्न समारंभ थेट प्रक्षेपण • सस्नेह निमंत्रण',
      });
    }
  };

  const modeTabs: { id: PreviewMode; label: Record<Language, string> }[] = [
    {
      id: 'kabaddi',
      label: {
        en: 'Kabaddi Scoreboard',
        mr: 'कबड्डी स्कोअरबोर्ड',
        hi: 'कबड्डी स्कोरबोर्ड',
        gu: 'કબડ્ડી સ્કોરબોર્ડ',
      },
    },
    {
      id: 'haldi',
      label: {
        en: 'Haldi & Wedding (2)',
        mr: 'हळदी व लग्न ओव्हरले (2)',
        hi: 'हल्दी व शादी ओवरले (2)',
        gu: 'હળદી અને લગ્ન ઓવરલે (2)',
      },
    },
  ];

  const styleOptions: {
    id: OverlayStyle;
    label: Record<Language, string>;
    desc: Record<Language, string>;
    badge?: string;
  }[] =
    activeMode === 'kabaddi'
      ? [
          {
            id: 'demo',
            label: {
              en: 'FREE Demo · Small Watermark',
              mr: 'फ्री डेमो · छोटा वॉटरमार्क',
              hi: 'फ्री डेमो · छोटा वॉटरमार्क',
              gu: 'ફ્રી ડેમો · નાનો વોટરમાર્ક',
            },
            desc: {
              en: 'Free OBS/vMix URL & PNG with small STAR EVENT LIVE watermark',
              mr: 'मोफत OBS/vMix URL व PNG — छोटा STAR EVENT LIVE वॉटरमार्क',
              hi: 'फ्री OBS/vMix URL और PNG — छोटे STAR EVENT LIVE वॉटरमार्क के साथ',
              gu: 'ફ્રી OBS/vMix URL અને PNG — નાના STAR EVENT LIVE વોટરમાર્ક સાથે',
            },
            badge: 'FREE',
          },
          {
            id: 'classic',
            label: {
              en: 'Pro Scoreboard · Watermark-Free',
              mr: 'प्रो स्कोअरबोर्ड · वॉटरमार्क-फ्री',
              hi: 'प्रो स्कोरबोर्ड · वॉटरमार्क-फ्री',
              gu: 'પ્રો સ્કોરબોર્ડ · વોટરમાર્ક-ફ્રી',
            },
            desc: {
              en: "Today's Offer: Just ₹1 · 1 Day (24h) Auto-Unlock",
              mr: 'आजची ऑफर: फक्त ₹1 · 1 दिवस (24 तास) ऑटो अनलॉक',
              hi: 'आज का ऑफर: सिर्फ ₹1 · 1 दिन (24 घंटे) ऑटो अनलॉक',
              gu: 'આજની ઓફર: માત્ર ₹1 · 1 દિવસ (24 કલાક) ઓટો અનલોક',
            },
            badge: '₹1 OFFER',
          },
        ]
      : [
          {
            id: 'classic',
            label: {
              en: 'Style 1 · Shahi Haldi & Wedding',
              mr: 'स्टाईल 1 · शाही हळदी-लग्न फ्रेम',
              hi: 'स्टाइल 1 · शाही हल्दी-शादी फ्रेम',
              gu: 'સ્ટાઇલ 1 · શાહી હળદી-લગ્ન ફ્રેમ',
            },
            desc: {
              en: "Today's Offer: Just ₹1 · 1 Day (24h) Auto-Unlock",
              mr: 'आजची ऑफर: फक्त ₹1 · 1 दिवस (24 तास) ऑटो अनलॉक',
              hi: 'आज का ऑफर: सिर्फ ₹1 · 1 दिन (24 घंटे) ऑटो अनलॉक',
              gu: 'આજની ઓફર: માત્ર ₹1 · 1 દિવસ (24 કલાક) ઓટો અનલોક',
            },
          },
          {
            id: 'modern',
            label: {
              en: 'Style 2 · Cinematic Ribbon',
              mr: 'स्टाईल 2 · सिनेमॅटिक लग्न रिबन',
              hi: 'स्टाइल 2 · सिनेमैटिक वेडिंग रिबन',
              gu: 'સ્ટાઇલ 2 · સિનેમેટિક લગ્ન રિબન',
            },
            desc: {
              en: "Today's Offer: Just ₹1 · 1 Day (24h) Auto-Unlock",
              mr: 'आजची ऑफर: फक्त ₹1 · 1 दिवस (24 तास) ऑटो अनलॉक',
              hi: 'आज का ऑफर: सिर्फ ₹1 · 1 दिन (24 घंटे) ऑटो अनलॉक',
              gu: 'આજની ઓફર: માત્ર ₹1 · 1 દિવસ (24 કલાક) ઓટો અનલોક',
            },
          },
        ];

  const activeStyleLabel =
    activeMode === 'kabaddi'
      ? isFreeDemo
        ? 'FREE DEMO'
        : 'PRO SCOREBOARD'
      : resolvedStyle === 'classic'
        ? 'STYLE 1'
        : 'STYLE 2';

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
    <section
      id="studio"
      className="py-20 sm:py-24 border-b border-white/10 bg-[#0C0C0F]/68 backdrop-blur-[2px]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          <div className="max-w-2xl space-y-3.5">
            <p className="text-xs sm:text-sm font-medium text-[#FACC15]">
              {UI_COPY.studioSection.kicker[lang]}
            </p>
            <h2
              className={`font-display text-2xl sm:text-4xl font-bold text-white ${
                lang === 'mr' ? 'leading-[1.38] tracking-normal' : 'leading-[1.2] tracking-tight'
              }`}
            >
              {UI_COPY.studioSection.heading[lang]}
            </h2>
            <p className="text-sm sm:text-base text-zinc-400 leading-[1.72]">
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

        {/* Style / Tier Visual Picker Bar (Kabaddi Free Demo vs Pro, or Haldi Style 1 vs Style 2) */}
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {styleOptions.map((opt) => {
            const selected = resolvedStyle === opt.id;
            const isFreeOption = opt.id === 'demo';
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelectStyle(opt.id)}
                aria-pressed={selected}
                className={`flex flex-col justify-between gap-2.5 px-4 py-3 rounded-xl border text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] ${
                  selected
                    ? isFreeOption
                      ? 'bg-[#101D16] border-[#4ADE80] text-white'
                      : 'bg-[#1A1315] border-[#FACC15] text-white'
                    : 'bg-[#121216] border-white/10 text-zinc-300 hover:border-white/25'
                }`}
              >
                <div className="flex items-start justify-between gap-3 w-full">
                  <div className="space-y-1 min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-white leading-normal">
                      {opt.label[lang]}
                    </p>
                    <p className="text-[11px] sm:text-xs text-zinc-400 leading-relaxed">
                      {opt.desc[lang]}
                    </p>
                  </div>
                  <span
                    className={`font-mono text-[10px] font-bold whitespace-nowrap shrink-0 mt-0.5 ${
                      selected
                        ? isFreeOption
                          ? 'text-[#4ADE80]'
                          : 'text-[#FACC15]'
                        : isFreeOption
                          ? 'text-[#4ADE80]/80'
                          : 'text-zinc-500'
                    }`}
                  >
                    {selected
                      ? opt.badge || (lang === 'mr' ? 'सक्रिय' : 'ACTIVE')
                      : opt.badge || (lang === 'mr' ? 'निवडा' : 'SELECT')}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Main Studio Grid: Monitor + Control Desk */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
          {/* Broadcast Program Monitor (16:9) + OBS/vMix URL Panel */}
          <div
            className={`${
              activeMode === 'kabaddi' ? 'xl:col-span-7' : 'xl:col-span-8'
            } bg-[#121216] border border-white/12 rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-5`}
          >
            {/* Monitor top toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/8 text-xs text-zinc-400">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono font-medium text-zinc-200">
                  1920×1080 PGM · {activeStyleLabel} · {activePlatformObj.label}
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
                {activeMode === 'haldi' && (
                  <>
                    <label className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono font-semibold rounded border bg-[#18181D] text-zinc-200 border-white/15 hover:border-[#FACC15]/70 transition-colors cursor-pointer whitespace-nowrap shrink-0">
                      <ImagePlus className="w-3.5 h-3.5 text-[#FACC15]" aria-hidden="true" />
                      <span>
                        {state.customLogoUrl
                          ? lang === 'mr'
                            ? 'लोगो बदला'
                            : 'Change Logo'
                          : lang === 'mr'
                            ? 'कस्टम लोगो'
                            : 'Add Logo'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleUploadCustomLogo}
                        className="sr-only"
                      />
                    </label>

                    {state.customLogoUrl && (
                      <>
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
                          {state.showLogo ? 'Logo: ON' : 'Logo: OFF'}
                        </button>
                        {state.showLogo && (
                          <button
                            type="button"
                            onClick={() =>
                              updateState({
                                logoCorner:
                                  state.logoCorner === 'top-right' ? 'top-left' : 'top-right',
                              })
                            }
                            className="px-2.5 py-1 text-[11px] font-mono font-semibold rounded border bg-[#18181D] text-zinc-300 border-white/15 hover:border-white/30 transition-colors whitespace-nowrap shrink-0"
                          >
                            {state.logoCorner === 'top-right' ? 'Pos: Right' : 'Pos: Left'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleRemoveCustomLogo}
                          aria-label={lang === 'mr' ? 'लोगो काढा' : 'Remove custom logo'}
                          className="p-1 text-zinc-400 hover:text-[#F87171] border border-white/15 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </>
                    )}
                  </>
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

            {/* Simulated 16:9 Live Broadcast Stage */}
            <div
              className={`relative aspect-video w-full rounded-xl overflow-hidden flex flex-col justify-between p-3.5 sm:p-5 transition-opacity duration-200 ${
                state.visible ? 'opacity-100' : 'opacity-25'
              } ${
                isClassic && activeMode === 'haldi'
                  ? 'border-2 border-[#FACC15] shadow-[inset_0_0_0_4px_#B45309]'
                  : 'border border-white/12'
              } ${
                transparentBg
                  ? ''
                  : activeMode === 'kabaddi'
                    ? 'bg-gradient-to-br from-[#0F172A] via-[#131924] to-[#09090B]'
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

              {/* Top Layer */}
              {activeMode === 'haldi' ? (
                <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
                  {isClassic ? (
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
              ) : (
                <div className="h-3" aria-hidden="true" />
              )}

              {/* Optional User-Uploaded Custom Logo Watermark (Haldi & Wedding mode) */}
              {activeMode === 'haldi' && state.showLogo && state.customLogoUrl && (
                <div
                  className={`pointer-events-none absolute top-14 sm:top-16 z-20 ${
                    state.logoCorner === 'top-left' ? 'left-4 sm:left-5' : 'right-4 sm:right-5'
                  }`}
                >
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 border-[#FACC15] bg-black/75 p-1.5 overflow-hidden flex items-center justify-center drop-shadow-[0_6px_14px_rgba(0,0,0,0.65)]">
                    <img
                      src={state.customLogoUrl}
                      alt="Custom overlay logo"
                      className="w-full h-full object-contain rounded-full"
                    />
                  </div>
                </div>
              )}

              {/* Center Safe Zone */}
              <div className="relative z-10 my-auto flex flex-col items-center justify-center text-center px-3">
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

              {/* Bottom On-Screen Graphic */}
              <div className="relative z-10 w-full">
                {activeMode === 'kabaddi' ? (
                  <KabaddiScoreboardBar
                    variant="studio"
                    teamAName={state.teamAName}
                    teamACode={state.teamACode}
                    teamAColor={state.teamAColor}
                    teamAScore={state.teamAScore}
                    teamALogoUrl={state.teamALogoUrl}
                    teamAYellowCards={state.teamAYellowCards}
                    teamARedCards={state.teamARedCards}
                    teamABinRemaining={teamABinRemaining}
                    teamBName={state.teamBName}
                    teamBCode={state.teamBCode}
                    teamBColor={state.teamBColor}
                    teamBScore={state.teamBScore}
                    teamBLogoUrl={state.teamBLogoUrl}
                    teamBYellowCards={state.teamBYellowCards}
                    teamBRedCards={state.teamBRedCards}
                    teamBBinRemaining={teamBBinRemaining}
                    matchSeconds={displayMatchSeconds}
                    raidSeconds={displayRaidSeconds}
                    raidRunning={state.raidRunning}
                    halfLabel={state.kabaddiHalf}
                    matchStatus={state.matchStatus}
                    timeoutTeam={state.timeoutTeam}
                    doOrDie={state.doOrDie}
                    subtitle={state.kabaddiSubtitle}
                    showDemoWatermark={isFreeDemo}
                  />
                ) : isClassic ? (
                  <div className="bg-gradient-to-r from-[#78350F]/95 via-[#B45309]/95 to-[#78350F]/95 border-2 border-[#FACC15] rounded-xl px-4 py-2.5 text-center shadow-lg">
                    <p className="font-display text-sm sm:text-xl font-extrabold text-white truncate leading-normal py-0.5">
                      {state.haldiTitle}
                    </p>
                    <p className="text-[10px] sm:text-xs font-medium text-[#FEF08A] mt-0.5 truncate leading-normal">
                      {state.haldiSubtitle}
                    </p>
                  </div>
                ) : (
                  /* Haldi Style 2: Minimal Floral Cinematic Ribbon */
                  <div className="w-[88%] mx-auto bg-gradient-to-r from-[#221204]/90 via-[#92400E]/95 to-[#221204]/90 border-2 border-[#FDE047] rounded-full px-5 sm:px-7 py-2.5 flex items-center justify-between gap-3 shadow-xl">
                    <span className="w-2.5 h-2.5 rotate-45 bg-[#FACC15] shrink-0" aria-hidden="true" />
                    <div className="min-w-0 text-center flex-1">
                      <p className="font-display text-sm sm:text-lg font-extrabold text-white truncate leading-normal py-0.5">
                        {state.haldiTitle}
                      </p>
                      <p className="text-[10px] sm:text-xs font-medium text-[#FEF08A] truncate leading-normal">
                        {state.haldiTag} • {state.haldiSubtitle}
                      </p>
                    </div>
                    <span className="w-2.5 h-2.5 rotate-45 bg-[#FACC15] shrink-0" aria-hidden="true" />
                  </div>
                )}
              </div>
            </div>

            {/* OBS Studio & vMix Live Browser Source URL Support Panel */}
            <div className="pt-4 border-t border-white/10 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-white flex items-center gap-2">
                    <Radio className="w-4 h-4 text-[#EF4444]" aria-hidden="true" />
                    <span>
                      {lang === 'mr'
                        ? 'OBS Studio व vMix थेट Browser Source URL'
                        : 'OBS Studio & vMix Live Browser Source URLs'}
                    </span>
                  </p>
                  <p className="text-xs text-zinc-400">
                    {isFreeDemo
                      ? lang === 'mr'
                        ? 'मोफत डेमो सक्रिय · छोटा STAR EVENT LIVE वॉटरमार्क राहील. आजची ऑफर: वॉटरमार्क-फ्री प्रो फक्त ₹1.'
                        : "FREE Demo Active · Includes small STAR EVENT LIVE watermark. Today's Offer: Watermark-free Pro just ₹1."
                      : isCurrentUnlocked && activeToken
                        ? lang === 'mr'
                          ? `पास सक्रिय · शिल्लक वेळ: ${formatRemainingTime(activeToken.expiresAt, nowTs)} (त्यानंतर आपोआप लॉक होईल)`
                          : `Pass Active · Auto-locks in ${formatRemainingTime(activeToken.expiresAt, nowTs)} · Paste URL in OBS or vMix.`
                        : lang === 'mr'
                          ? 'आजची ऑफर: फक्त ₹1 पेमेंट करा — 1 दिवसासाठी (24 तास) OBS/vMix URL आपोआप अनलॉक होईल, त्यानंतर एक्सपायर होईल.'
                          : "Today's Offer: Pay ₹1 — auto-unlocks OBS/vMix URL & PNG export for 1 Day (24h), then auto-expires."}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {activeMode === 'kabaddi' && (
                    <button
                      type="button"
                      onClick={() => setRemoteModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] border border-[#60A5FA]/50 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      <Smartphone className="w-3.5 h-3.5 text-[#FACC15] shrink-0" aria-hidden="true" />
                      <span>
                        {lang === 'mr' ? 'रिमोट कंट्रोल (QR / PIN)' : 'Remote Control (QR / PIN)'}
                      </span>
                      {connectedControllers > 0 && (
                        <span className="ml-0.5 px-1.5 py-0.5 text-[10px] font-mono font-extrabold bg-[#FACC15] text-black rounded">
                          {connectedControllers}
                        </span>
                      )}
                    </button>
                  )}

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
                      <span className="font-mono font-extrabold text-[#FACC15]">₹1 OFFER</span>
                      <span>{lang === 'mr' ? 'अनलॉक करा' : 'Unlock Overlay'}</span>
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

                  {isPrivateDevPreview && (
                    <div className="bg-[#1C140A] border border-[#FACC15]/45 rounded-xl px-3.5 py-2.5 text-[11px] text-[#FEF08A] leading-relaxed">
                      <strong className="font-bold text-[#FACC15]">
                        {lang === 'mr' ? 'OBS / vMix महत्वाची टीप: ' : 'OBS / vMix Important Tip: '}
                      </strong>
                      {lang === 'mr'
                        ? 'सध्या तुम्ही खाजगी Dev Preview (ais-dev) मध्ये आहात. OBS किंवा vMix मध्ये URL चालवण्यासाठी App चा Public / Shared Link (ais-pre किंवा तुमचा डोमेन) उघडा आणि त्यातून कंट्रोल करा — मग सर्व स्कोअर व बदल आपोआप OBS/vMix मध्ये दिसतील.'
                        : 'You are viewing the private Dev Preview (ais-dev). Desktop OBS & vMix cannot sign in to private dev URLs — open your Public Shared App URL (ais-pre or deployed domain) and copy the OBS/vMix URL from there for instant auto-sync.'}
                    </div>
                  )}
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
                        ? 'आजची ऑफर: फक्त ₹1 पेमेंट करा — लगेच आपोआप अनलॉक होईल आणि 1 दिवसानंतर (24 तास) आपोआप एक्सपायर होईल.'
                        : "Today's Offer: Pay ₹1 — unlocks automatically for 1 Day (24 hours), then auto-expires."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRequestPurchase(currentSku)}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 text-xs sm:text-sm font-semibold text-black bg-[#FACC15] hover:bg-[#EAB308] rounded-lg transition-colors whitespace-nowrap shrink-0 tabular-nums"
                  >
                    <span className="font-mono font-extrabold">₹1 · 1 DAY</span>
                    <span>{lang === 'mr' ? 'पेमेंट करून अनलॉक करा' : 'Pay & Unlock'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Interactive Control Desk (Bottom Frame, Pro Kabaddi Deck, or Haldi & Wedding) */}
          <div
            className={`${
              activeMode === 'kabaddi' ? 'xl:col-span-5' : 'xl:col-span-4'
            } bg-[#121216] border border-white/12 rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-6`}
          >
            <div className="space-y-5">
              {/* Broadcast Output Mode Selector */}
              <div className="space-y-2.5">
                <p className="text-xs font-semibold text-zinc-300 flex items-center gap-2">
                  <Tv className="w-3.5 h-3.5 text-[#FACC15]" aria-hidden="true" />
                  <span>{lang === 'mr' ? 'आउटपुट मोड निवडा' : 'Select Broadcast Output'}</span>
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
                      {p.shortLabel}
                    </button>
                  ))}
                </div>
              </div>

              {activeMode === 'kabaddi' ? (
                <KabaddiControlDesk
                  lang={lang}
                  state={state}
                  displayMatchSeconds={displayMatchSeconds}
                  displayRaidSeconds={displayRaidSeconds}
                  teamABinRemaining={teamABinRemaining}
                  teamBBinRemaining={teamBBinRemaining}
                  onUpdateState={updateState}
                  onScoreDelta={handleKabaddiScore}
                  onQuickPoint={handleKabaddiQuickPoint}
                  onTimeout={handleKabaddiTimeout}
                  canUndo={canUndo}
                  canRedo={canRedo}
                  onUndo={() => sendAction('undo')}
                  onRedo={() => sendAction('redo')}
                  onToggleMatchTimer={handleToggleMatchTimer}
                  onResetMatchTimer={() => sendAction('timer_reset', { seconds: 30, autoStart: false })}
                  onAdjustMatchSeconds={handleAdjustMatchSeconds}
                  onSetMatchPreset={handleSetMatchPreset}
                  onToggleRaidTimer={handleToggleRaidTimer}
                  onResetRaidTimer={handleResetRaidTimer}
                  onToggleSinBin={handleToggleSinBin}
                  onUploadTeamLogo={handleUploadTeamLogo}
                  onRemoveTeamLogo={handleRemoveTeamLogo}
                  onSwapTeams={handleSwapTeams}
                  onResetMatch={handleResetKabaddi}
                />
              ) : (
                <div className="space-y-4 pt-4 border-t border-white/10">
                  <p className="text-xs font-semibold text-zinc-200">
                    {lang === 'mr'
                      ? 'हळदी व लग्न समारंभ ओव्हरले कंट्रोल (OBS/vMix सिंक)'
                      : 'Haldi & Wedding Overlay Controls (OBS/vMix Sync)'}
                  </p>

                  {/* 1-Click Haldi vs Wedding Preset Switch */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => applyCeremonyPreset('haldi')}
                      className="py-2 px-3 text-xs font-semibold rounded-lg border bg-[#1E1608] hover:bg-[#2A1E0A] text-[#FACC15] border-[#FACC15]/50 transition-colors"
                    >
                      {lang === 'mr' ? 'हळदी समारंभ (Haldi)' : 'Haldi Ceremony'}
                    </button>
                    <button
                      type="button"
                      onClick={() => applyCeremonyPreset('wedding')}
                      className="py-2 px-3 text-xs font-semibold rounded-lg border bg-[#260D12] hover:bg-[#35121A] text-[#FEF08A] border-[#EF4444]/60 transition-colors"
                    >
                      {lang === 'mr' ? 'शुभ विवाह (Wedding)' : 'Wedding Ceremony'}
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="preview-haldi-tag" className="block text-xs text-zinc-400">
                      {lang === 'mr' ? 'बॅज टॅग (HALDI LIVE / WEDDING LIVE)' : 'Corner Tag Badge'}
                    </label>
                    <input
                      id="preview-haldi-tag"
                      type="text"
                      value={state.haldiTag}
                      onChange={(e) => updateState({ haldiTag: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-[#18181D] border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#FACC15]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="preview-haldi-header" className="block text-xs text-zinc-400">
                      {lang === 'mr' ? 'वरचा बॅनर (शुभ हळदी / शुभ मंगल सावधान)' : 'Top Header Banner'}
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
                      {lang === 'mr'
                        ? 'हळदी / लग्नाचे मुख्य नाव (वधू-वर / कुटुंब)'
                        : 'Main Haldi / Wedding Title (Couple / Family)'}
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
                      {lang === 'mr' ? 'ठिकाण, तारीख व निमंत्रण ओळ' : 'Venue, Date & Subtitle Strip'}
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
      <KabaddiRemoteModal
        open={remoteModalOpen}
        onClose={() => setRemoteModalOpen(false)}
        lang={lang}
        currentRoomId={roomId}
        onBindMatchId={(nextId) => setRoomInput(sanitizeRoomIdClient(nextId))}
        vmixBrowserUrl={vmixBrowserUrl}
        connectedDisplays={connectedDisplays}
        connectedControllers={connectedControllers}
        controllerNames={controllerNames}
      />
    </section>
  );
}
