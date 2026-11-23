import { ChangeEvent, useCallback, useEffect, useState } from 'react';
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
  ShieldCheck,
  Trash2,
  Tv,
  UserCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
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
import { computeLiveClockSeconds, useUserScoreboard } from '../hooks/useUserScoreboard';
import {
  HaldiAnimationMode,
  HaldiAnimSpeed,
  HaldiColorTheme,
  KabaddiGraphicPanel,
  KabaddiHalf,
  KabaddiTimeoutTeam,
  LiveOverlayState,
  normalizeStyleForMode,
  OverlayBackground,
  OverlayMode,
  OverlayStyle,
  UserScoreboardSettingsDoc,
  WeddingBottomAnimation,
} from '../types/overlay';
import {
  downloadHaldiOverlayPng,
  downloadKabaddiOverlayPng,
} from '../utils/exportOverlayPng';
import { HaldiFestiveOverlayBar } from './HaldiFestiveOverlayBar';
import { KabaddiRemoteModal } from './KabaddiRemoteModal';
import { VmixCricketController } from './VmixCricketController';
import { VmixKabaddiController } from './VmixKabaddiController';
import { WEDDING_COLOR_PRESETS, WeddingFrameOverlay } from './WeddingFrameOverlay';

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
  forcedMatchRoomId?: string | null;
  onOpenAccountPortal?: (tab?: 'operator' | 'admin') => void;
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

const MATCH_ID_STORAGE_KEY = 'star_event_active_match_id_v1';

const KABADDI_SETTINGS_KEYS = new Set<keyof UserScoreboardSettingsDoc>([
  'teamAName',
  'teamACode',
  'teamAColor',
  'teamALogoUrl',
  'teamAStarting7',
  'teamBName',
  'teamBCode',
  'teamBColor',
  'teamBLogoUrl',
  'teamBStarting7',
  'kabaddiTitle',
  'kabaddiSubtitle',
  'kabaddiTag',
  'kabaddiVenue',
  'kabaddiLeague',
  'kabaddiEvent',
  'kabaddiMatchType',
  'sponsorName',
  'championTeam',
  'runnerUpTeam',
  'thirdPlaceTeam',
  'fourthPlaceTeam',
]);

function createUniqueMatchIdClient(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `kbd-${num}`;
}

function getInitialMatchId(): string {
  if (typeof window === 'undefined') return 'kbd-1001';
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('match') || params.get('room');
  if (fromUrl && fromUrl.trim()) {
    return sanitizeRoomIdClient(fromUrl);
  }
  try {
    const saved = window.localStorage.getItem(MATCH_ID_STORAGE_KEY);
    if (saved && saved.trim()) {
      return sanitizeRoomIdClient(saved);
    }
    const generated = createUniqueMatchIdClient();
    window.localStorage.setItem(MATCH_ID_STORAGE_KEY, generated);
    return generated;
  } catch {
    return createUniqueMatchIdClient();
  }
}

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
  forcedMatchRoomId,
  onOpenAccountPortal,
}: LiveStudioPreviewProps) {
  const {
    firebaseUser,
    isSuperAdmin,
    userAccount,
  } = useAuth();
  const [platform, setPlatform] = useState<PlatformId>('youtube-public');
  const [transparentBg, setTransparentBg] = useState(true);
  const [roomInput, setRoomInput] = useState<string>(() =>
    forcedMatchRoomId ? sanitizeRoomIdClient(forcedMatchRoomId) : getInitialMatchId()
  );
  const [outputBg, setOutputBg] = useState<OverlayBackground>('transparent');
  const [lockModeInUrl, setLockModeInUrl] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [remoteModalOpen, setRemoteModalOpen] = useState(false);
  const [nowTs, setNowTs] = useState(() => Date.now());
  const [nowClock, setNowClock] = useState(() => Date.now());

  // Sync forcedMatchRoomId (e.g. Super Admin clicking "Open Board" on a user)
  useEffect(() => {
    if (!forcedMatchRoomId) return;
    if (userAccount && !isSuperAdmin) return; // Operator stays locked to their own isolated room
    const clean = sanitizeRoomIdClient(forcedMatchRoomId);
    setRoomInput(clean);
  }, [forcedMatchRoomId, userAccount, isSuperAdmin]);

  // Automatically isolate authenticated Operator User to their dedicated Match Room ID
  useEffect(() => {
    if (!userAccount || isSuperAdmin) return;
    const clean = sanitizeRoomIdClient(userAccount.matchRoomId);
    setRoomInput(clean);
  }, [userAccount, isSuperAdmin]);

  const handleSetMatchId = (raw: string) => {
    // Operators stay on their dedicated isolated Match ID; Super Admin & guests can change rooms freely
    if (userAccount && !isSuperAdmin) {
      setRoomInput(sanitizeRoomIdClient(userAccount.matchRoomId));
      return;
    }
    const clean = sanitizeRoomIdClient(raw);
    setRoomInput(clean);
    try {
      window.localStorage.setItem(MATCH_ID_STORAGE_KEY, clean);
    } catch {
      // ignore
    }
  };

  const handleGenerateNewMatchId = () => {
    if (userAccount && !isSuperAdmin) return;
    handleSetMatchId(createUniqueMatchIdClient());
  };

  // Single-source-of-truth per-user Firebase Firestore scoreboard when authenticated
  const kabaddiTargetUid = firebaseUser?.uid ?? '';
  const useFirestoreKabaddi = Boolean(kabaddiTargetUid);

  const userScoreboard = useUserScoreboard({
    targetUid: activeMode === 'kabaddi' && useFirestoreKabaddi ? kabaddiTargetUid : '',
    role: 'controller',
    canWrite: activeMode === 'kabaddi' && useFirestoreKabaddi,
  });

  // Node overlay sync (used for Haldi/Wedding modes & guest fallback only)
  const {
    state: syncState,
    updateState: updateSyncState,
    sendAction: sendSyncAction,
    connected: syncConnected,
    connectionStatus: syncConnectionStatus,
    transport: syncTransport,
    connectedDisplays,
    connectedControllers,
    controllerNames,
    canUndo: syncCanUndo,
    canRedo: syncCanRedo,
    roomId,
    getServerNow,
  } = useOverlaySync({
    roomId: roomInput,
    role: 'studio',
    readOnly: activeMode === 'kabaddi' && useFirestoreKabaddi,
  });

  // Active state: Haldi/Wedding uses syncState; Kabaddi uses isolated Firestore state when logged in
  const state = syncState;
  const updateState = updateSyncState;
  const kabaddiState = useFirestoreKabaddi ? userScoreboard.state : syncState;

  const resolvedStyle = normalizeStyleForMode(activeMode, activeStyle);
  const isClassic = resolvedStyle === 'classic';
  const isFestive = resolvedStyle === 'festive';
  const isWeddingFrame = resolvedStyle === 'wedding';
  const isFreeDemo =
    (activeMode === 'kabaddi' && resolvedStyle === 'demo') || activeMode === 'cricket';
  const currentSku = getOverlaySku(activeMode, resolvedStyle);
  const activeToken = verifiedTokens.find((t) => t.sku === currentSku && t.expiresAt > nowTs) ?? null;
  const isCurrentUnlocked = isFreeDemo || Boolean(activeToken && unlockedSkus.includes(currentSku));

  useEffect(() => {
    if (!activeToken) return;
    const id = window.setInterval(() => setNowTs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [activeToken]);

  const handleSelectMode = (mode: PreviewMode) => {
    const nextStyle =
      mode === 'haldi' && activeMode !== 'haldi'
        ? 'festive'
        : normalizeStyleForMode(mode, activeStyle);
    onChangeMode(mode);
    onChangeStyle(nextStyle);
    if (mode === 'haldi') {
      updateSyncState({ mode, style: nextStyle });
    }
  };

  const handleSelectStyle = (style: OverlayStyle) => {
    const nextStyle = normalizeStyleForMode(activeMode, style);
    onChangeStyle(nextStyle);
    if (activeMode === 'haldi') {
      updateSyncState({ style: nextStyle });
    }
  };

  // Smooth, read-only local display clock ticker (NEVER auto-modifies scores or spams writes!)
  const anyKabaddiClockRunning =
    activeMode === 'kabaddi' &&
    (kabaddiState.matchRunning ||
      kabaddiState.raidRunning ||
      Boolean(kabaddiState.teamABinEndAt) ||
      Boolean(kabaddiState.teamBBinEndAt));

  useEffect(() => {
    const getNow = () => (useFirestoreKabaddi ? Date.now() : getServerNow());
    setNowClock(getNow());
    if (!anyKabaddiClockRunning) return;
    const id = window.setInterval(() => setNowClock(getNow()), 250);
    return () => window.clearInterval(id);
  }, [
    anyKabaddiClockRunning,
    useFirestoreKabaddi,
    getServerNow,
    kabaddiState.matchUpdatedAt,
    kabaddiState.raidUpdatedAt,
  ]);

  const displayMatchSeconds = computeLiveClockSeconds(
    kabaddiState.matchSeconds,
    kabaddiState.matchRunning,
    kabaddiState.matchUpdatedAt,
    nowClock
  );

  const displayRaidSeconds = computeLiveClockSeconds(
    kabaddiState.raidSeconds,
    kabaddiState.raidRunning,
    kabaddiState.raidUpdatedAt,
    nowClock
  );

  const teamABinRemaining = kabaddiState.teamABinEndAt
    ? Math.max(0, Math.ceil((kabaddiState.teamABinEndAt - nowClock) / 1000))
    : 0;
  const teamBBinRemaining = kabaddiState.teamBBinEndAt
    ? Math.max(0, Math.ceil((kabaddiState.teamBBinEndAt - nowClock) / 1000))
    : 0;

  // Route Kabaddi settings/visibility updates cleanly to Firestore when logged in
  const handleKabaddiUpdateState = useCallback(
    (patch: Partial<LiveOverlayState>) => {
      if (!useFirestoreKabaddi) {
        updateSyncState(patch);
        return;
      }
      const settingsPatch: Partial<UserScoreboardSettingsDoc> = {};
      let hasSettings = false;
      for (const [k, v] of Object.entries(patch)) {
        if (KABADDI_SETTINGS_KEYS.has(k as keyof UserScoreboardSettingsDoc)) {
          (settingsPatch as Record<string, unknown>)[k] = v;
          hasSettings = true;
        }
      }
      if (hasSettings) {
        userScoreboard.updateSettings(settingsPatch);
      }
      if (typeof patch.visible === 'boolean') {
        void userScoreboard.setVisible(patch.visible);
      }
      if (patch.kabaddiGraphicPanel !== undefined) {
        void userScoreboard.setGraphicPanel(patch.kabaddiGraphicPanel);
      }
      if (patch.raidRunning === false && patch.raidSeconds === 30) {
        void userScoreboard.resetRaidTimer();
      }
    },
    [
      useFirestoreKabaddi,
      updateSyncState,
      userScoreboard.updateSettings,
      userScoreboard.setVisible,
      userScoreboard.setGraphicPanel,
      userScoreboard.resetRaidTimer,
    ]
  );

  // Route every manual Kabaddi action strictly 1:1 to atomic Firestore writes when logged in
  const handleKabaddiSendAction = useCallback(
    (action: string, payload?: Record<string, unknown>) => {
      if (!useFirestoreKabaddi) {
        sendSyncAction(action, payload);
        return;
      }
      const team: 'A' | 'B' = payload?.team === 'B' ? 'B' : 'A';
      const points = typeof payload?.points === 'number' ? payload.points : 1;

      switch (action) {
        case 'point':
        case 'raid':
          void userScoreboard.applyScoreDelta(team, action === 'point' ? 'point' : 'raid', points);
          break;
        case 'bonus':
          void userScoreboard.applyScoreDelta(team, 'bonus', points);
          break;
        case 'tackle':
          void userScoreboard.applyScoreDelta(team, 'tackle', points);
          break;
        case 'lona':
          void userScoreboard.applyScoreDelta(team, 'lona', points);
          break;
        case 'all_out':
          void userScoreboard.triggerAllOut(team);
          break;
        case 'players_on_mat': {
          const count = typeof payload?.count === 'number' ? payload.count : 7;
          void userScoreboard.setPlayersOnMat(team, count);
          break;
        }
        case 'player_out':
          void userScoreboard.playerOut(team);
          break;
        case 'half':
          if (payload?.half) {
            void userScoreboard.setHalf(payload.half as KabaddiHalf);
          }
          break;
        case 'do_or_die':
          void userScoreboard.setDoOrDie(Boolean(payload?.active));
          break;
        case 'card':
          if (
            payload?.card === 'green' ||
            payload?.card === 'yellow' ||
            payload?.card === 'red'
          ) {
            void userScoreboard.issueCard(team, payload.card);
          }
          break;
        case 'graphic_panel':
          if (payload?.panel) {
            void userScoreboard.setGraphicPanel(payload.panel as KabaddiGraphicPanel);
          }
          break;
        case 'raid_reset':
          void userScoreboard.resetRaidTimer();
          break;
        case 'raid_toggle':
          void userScoreboard.toggleRaidTimer();
          break;
        default:
          break;
      }
    },
    [
      useFirestoreKabaddi,
      sendSyncAction,
      userScoreboard.applyScoreDelta,
      userScoreboard.triggerAllOut,
      userScoreboard.setPlayersOnMat,
      userScoreboard.playerOut,
      userScoreboard.setHalf,
      userScoreboard.setDoOrDie,
      userScoreboard.issueCard,
      userScoreboard.setGraphicPanel,
      userScoreboard.resetRaidTimer,
      userScoreboard.toggleRaidTimer,
    ]
  );

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
    if (useFirestoreKabaddi) {
      void userScoreboard.triggerAlert(label);
      return;
    }
    updateSyncState({ kabaddiAlert: label });
    window.setTimeout(() => {
      updateSyncState({ kabaddiAlert: null });
    }, 1800);
  };

  const handleKabaddiTimeout = (target: KabaddiTimeoutTeam) => {
    if (useFirestoreKabaddi) {
      void userScoreboard.setTimeoutTeam(target);
      return;
    }
    if (!target) {
      sendSyncAction('clear_timeout');
    } else {
      sendSyncAction('timeout', { target });
    }
  };

  const handleToggleMatchTimer = () => {
    if (useFirestoreKabaddi) {
      void userScoreboard.toggleMatchTimer();
      return;
    }
    sendSyncAction('timer_toggle');
  };

  const handleSetMatchPreset = (seconds: number, autoStart = true) => {
    if (useFirestoreKabaddi) {
      void userScoreboard.resetMatchTimer(Math.max(0, seconds), autoStart);
      return;
    }
    sendSyncAction('timer_set', { seconds: Math.max(0, seconds), autoStart });
  };

  const handleSwapTeams = () => {
    if (useFirestoreKabaddi) {
      void userScoreboard.swapTeams();
      return;
    }
    sendSyncAction('swap');
  };

  const handleToggleRaidTimer = () => {
    if (useFirestoreKabaddi) {
      void userScoreboard.toggleRaidTimer();
      return;
    }
    sendSyncAction('raid_toggle');
  };

  const handleResetRaidTimer = () => {
    if (useFirestoreKabaddi) {
      void userScoreboard.resetRaidTimer();
      return;
    }
    sendSyncAction('raid_reset', { seconds: kabaddiState.kabaddiRaidDuration || 30 });
  };

  const handleResetKabaddi = () => {
    if (useFirestoreKabaddi) {
      void userScoreboard.resetMatchScore();
      return;
    }
    sendSyncAction('reset');
  };

  // Build real OBS & vMix Browser Source URLs (auto-converts private ais-dev preview host notice)
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://starevent.live';
  const isPrivateDevPreview =
    typeof window !== 'undefined' && window.location.hostname.startsWith('ais-dev-');
  const buildOutputUrl = (extraParams?: Record<string, string>) => {
    if (activeMode === 'kabaddi' && useFirestoreKabaddi) {
      const base = `${origin}/scoreboard/${encodeURIComponent(kabaddiTargetUid)}`;
      const params = new URLSearchParams();
      if (outputBg !== 'transparent') {
        params.set('bg', outputBg);
      }
      if (extraParams) {
        for (const [k, v] of Object.entries(extraParams)) {
          params.set(k, v);
        }
      }
      const qs = params.toString();
      return qs ? `${base}?${qs}` : base;
    }
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
  const vmixBrowserUrl =
    activeMode === 'kabaddi' && useFirestoreKabaddi
      ? obsBrowserUrl
      : buildOutputUrl({ client: 'vmix' });
  const kabaddiControlUrl = useFirestoreKabaddi
    ? `${origin}/control/${encodeURIComponent(kabaddiTargetUid)}`
    : undefined;

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
        title: kabaddiState.kabaddiTitle,
        subtitle: kabaddiState.kabaddiSubtitle,
        tag: kabaddiState.kabaddiTag,
        teamAName: kabaddiState.teamAName || 'TEAM A',
        teamACode: kabaddiState.teamACode,
        teamAColor: kabaddiState.teamAColor,
        teamAScore: kabaddiState.teamAScore,
        teamALogoUrl: kabaddiState.teamALogoUrl,
        teamAYellowCards: kabaddiState.teamAYellowCards,
        teamARedCards: kabaddiState.teamARedCards,
        teamBName: kabaddiState.teamBName || 'TEAM B',
        teamBCode: kabaddiState.teamBCode,
        teamBColor: kabaddiState.teamBColor,
        teamBScore: kabaddiState.teamBScore,
        teamBLogoUrl: kabaddiState.teamBLogoUrl,
        teamBYellowCards: kabaddiState.teamBYellowCards,
        teamBRedCards: kabaddiState.teamBRedCards,
        matchSeconds: displayMatchSeconds,
        raidSeconds: displayRaidSeconds,
        raidRunning: kabaddiState.raidRunning,
        halfLabel: kabaddiState.kabaddiHalf,
        doOrDie: kabaddiState.doOrDie,
        showDemoWatermark: isFreeDemo,
      });
    } else {
      await downloadHaldiOverlayPng({
        style: resolvedStyle,
        tag: state.haldiTag,
        header: state.haldiHeader,
        title: state.haldiTitle,
        subtitle: state.haldiSubtitle,
        leftText: state.haldiLeftText,
        centerMain: state.haldiCenterMain,
        centerSub: state.haldiCenterSub,
        rightText: state.haldiRightText,
        theme: state.haldiTheme,
        showTopHeader: state.haldiShowTopHeader,
        showDecor: state.haldiShowDecor,
        weddingGroomName: state.weddingGroomName,
        weddingBrideName: state.weddingBrideName,
        weddingConnector: state.weddingConnector,
        weddingEventLabel: state.weddingEventLabel,
        weddingDateVenue: state.weddingDateVenue,
        weddingTopHeader: state.weddingTopHeader,
        weddingPrimaryColor: state.weddingPrimaryColor,
        weddingAccentColor: state.weddingAccentColor,
        weddingTextColor: state.weddingTextColor,
        weddingShowTopHeader: state.weddingShowTopHeader,
        weddingShowCornerFrame: state.weddingShowCornerFrame,
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
      if (useFirestoreKabaddi) {
        userScoreboard.updateSettings(
          team === 'A' ? { teamALogoUrl: compressedPng } : { teamBLogoUrl: compressedPng },
          true
        );
        return;
      }
      if (team === 'A') {
        updateSyncState({ teamALogoUrl: compressedPng });
      } else {
        updateSyncState({ teamBLogoUrl: compressedPng });
      }
    });
  };

  const handleRemoveTeamLogo = (team: 'A' | 'B') => {
    if (useFirestoreKabaddi) {
      userScoreboard.updateSettings(
        team === 'A' ? { teamALogoUrl: '' } : { teamBLogoUrl: '' },
        true
      );
      return;
    }
    if (team === 'A') {
      updateSyncState({ teamALogoUrl: '' });
    } else {
      updateSyncState({ teamBLogoUrl: '' });
    }
  };

  const applyCeremonyPreset = (preset: 'haldi' | 'wedding' | 'haldi-hi' | 'haldi-gu') => {
    if (preset === 'haldi') {
      updateState({
        haldiTag: 'HALDI LIVE',
        haldiHeader: '|| श्री गणेशाय नमः || शुभ हळदी समारंभ',
        haldiTitle: 'देशमुख कुटुंब — शुभ हळदी समारंभ',
        haldiSubtitle: 'थेट प्रक्षेपण • दिनांक व ठिकाण',
        haldiLeftText: 'शुभ विवाह...',
        haldiCenterMain: 'हळदी',
        haldiCenterSub: 'समारंभ',
        haldiRightText: 'Haldi Ceremony',
      });
    } else if (preset === 'haldi-hi') {
      updateState({
        haldiTag: 'HALDI LIVE',
        haldiHeader: '|| श्री गणेशाय नमः || शुभ हल्दी समारोह',
        haldiTitle: 'शर्मा परिवार — शुभ हल्दी समारोह',
        haldiSubtitle: 'लाइव प्रसारण • दिनांक व स्थान',
        haldiLeftText: 'शुभ विवाह...',
        haldiCenterMain: 'हल्दी',
        haldiCenterSub: 'समारोह',
        haldiRightText: 'Haldi Ceremony',
      });
    } else if (preset === 'haldi-gu') {
      updateState({
        haldiTag: 'HALDI LIVE',
        haldiHeader: '|| શ્રી ગણેશાય નમઃ || શુભ હળદી સમારંભ',
        haldiTitle: 'પટેલ પરિવાર — શુભ હળદી સમારંભ',
        haldiSubtitle: 'લાઇવ પ્રસારણ • તારીખ અને સ્થળ',
        haldiLeftText: 'શુભ લગ્ન...',
        haldiCenterMain: 'હળદી',
        haldiCenterSub: 'સમારંભ',
        haldiRightText: 'Haldi Ceremony',
      });
    } else {
      updateState({
        haldiTag: 'WEDDING LIVE',
        haldiHeader: '|| श्री गणेशाय नमः || शुभ मंगल सावधान',
        haldiTitle: 'चि. रोहित व चि. सौ. कां. प्रिया — शुभ विवाह',
        haldiSubtitle: 'लग्न समारंभ थेट प्रक्षेपण • सस्नेह निमंत्रण',
        haldiLeftText: 'शुभ मंगल...',
        haldiCenterMain: 'विवाह',
        haldiCenterSub: 'सोहळा',
        haldiRightText: 'Wedding Live',
      });
    }
  };

  const applyWeddingPreset = (preset: 'mr' | 'hi' | 'gu' | 'en') => {
    if (preset === 'mr') {
      updateState({
        weddingGroomName: 'चि. रोहित',
        weddingBrideName: 'चि. सौ. कां. प्रिया',
        weddingConnector: 'व',
        weddingEventLabel: 'शुभ विवाह सोहळा',
        weddingDateVenue: 'थेट प्रक्षेपण • दिनांक व ठिकाण',
        weddingTopHeader: '|| श्री गणेशाय नमः ||',
      });
    } else if (preset === 'hi') {
      updateState({
        weddingGroomName: 'चि. आरव',
        weddingBrideName: 'सौ. का. अनन्या',
        weddingConnector: 'संग',
        weddingEventLabel: 'शुभ विवाह समारोह',
        weddingDateVenue: 'लाइव प्रसारण • दिनांक व स्थान',
        weddingTopHeader: '|| श्री गणेशाय नमः ||',
      });
    } else if (preset === 'gu') {
      updateState({
        weddingGroomName: 'ચિ. દેવ',
        weddingBrideName: 'ચિ. મીરા',
        weddingConnector: 'સંગ',
        weddingEventLabel: 'શુભ લગ્ન પ્રસંગ',
        weddingDateVenue: 'લાઇવ પ્રસારણ • તારીખ અને સ્થળ',
        weddingTopHeader: '|| શ્રી ગણેશાય નમઃ ||',
      });
    } else {
      updateState({
        weddingGroomName: 'ROHIT SHARMA',
        weddingBrideName: 'PRIYA PATIL',
        weddingConnector: 'Weds',
        weddingEventLabel: 'WEDDING CEREMONY LIVE',
        weddingDateVenue: '24 Nov 2026 • Live Broadcast',
        weddingTopHeader: 'SHUBH VIVAH · LIVE COVERAGE',
      });
    }
  };

  const modeTabs: { id: PreviewMode; label: Record<Language, string> }[] = [
    {
      id: 'kabaddi',
      label: {
        en: 'Kabaddi Controller',
        mr: 'कबड्डी कंट्रोलर',
        hi: 'कबड्डी कंट्रोलर',
        gu: 'કબડ્ડી કંટ્રોલર',
      },
    },
    {
      id: 'cricket',
      label: {
        en: 'Cricket Scoreboard',
        mr: 'क्रिकेट स्कोअरबोर्ड',
        hi: 'क्रिकेट स्कोरबोर्ड',
        gu: 'ક્રિકેટ સ્કોરબોર્ડ',
      },
    },
    {
      id: 'haldi',
      label: {
        en: 'Wedding & Haldi (4)',
        mr: 'लग्न व हळदी ओव्हरले (4)',
        hi: 'शादी व हल्दी ओवरले (4)',
        gu: 'લગ્ન અને હળદી ઓવરલે (4)',
      },
    },
  ];

  const styleOptions: {
    id: OverlayStyle;
    label: Record<Language, string>;
    desc: Record<Language, string>;
    badge?: string;
  }[] =
    activeMode === 'cricket'
      ? [
          {
            id: 'classic',
            label: {
              en: 'Single Cricket Broadcast Bar · vMix Control',
              mr: 'सिंगल क्रिकेट ब्रॉडकास्ट बार · vMix कंट्रोल',
              hi: 'सिंगल क्रिकेट ब्रॉडकास्ट बार · vMix कंट्रोल',
              gu: 'સિંગલ ક્રિકેટ બ્રોડકાસ્ટ બાર · vMix કંટ્રોલ',
            },
            desc: {
              en: 'WC-style purple/magenta/yellow lower-third with live vMix transparent URL & ball-by-ball controls',
              mr: 'WC स्टाईल पर्पल-मॅजेंटा-यलो लोअर-थर्ड + सिंगल vMix ट्रान्सपरंट URL व बॉल-बाय-बॉल कंट्रोल',
              hi: 'WC स्टाइल पर्पल-मैजेंटा-येलो लोअर-थर्ड + सिंगल vMix ट्रांसपेरेंट URL और बॉल-बाय-बॉल कंट्रोल',
              gu: 'WC સ્ટાઇલ પર્પલ-મેજેન્ટા-યલો લોઅર-थર્ડ + સિંગલ vMix ટ્રાન્સપરન્ટ URL અને બોલ-બાય-બોલ કંટ્રોલ',
            },
            badge: 'NEW · VMIX LIVE',
          },
        ]
      : activeMode === 'kabaddi'
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
            id: 'wedding',
            label: {
              en: 'Royal Wedding Frame · Custom Color',
              mr: 'रॉयल वेडिंग फ्रेम · नाव व कलर कस्टमाईज',
              hi: 'रॉयल वेडिंग फ्रेम · नाम व कलर कस्टमाइज़',
              gu: 'રોયલ વેડિંગ ફ્રેમ · નામ અને કલર કસ્ટમાઇઝ',
            },
            desc: {
              en: 'Custom Groom/Bride names + Color picker + Subtle bottom motion (₹1)',
              mr: 'वधू-वर नाव + कलर पिकर + हलके बॉटम अ‍ॅनिमेशन (फक्त ₹1)',
              hi: 'वर-वधू नाम + कलर पिकर + हल्का बॉटम एनिमेशन (सिर्फ ₹1)',
              gu: 'વર-વધૂ નામ + કલર પિકર + હળવું બોટમ એનિમેશન (માત્ર ₹1)',
            },
            badge: 'NEW FRAME',
          },
          {
            id: 'festive',
            label: {
              en: 'Royal Haldi · Dhol & Kalash',
              mr: 'रॉयल हळदी · ढोलक व ॐ कलश',
              hi: 'रॉयल हल्दी · ढोलक व ॐ कलश',
              gu: 'રોયલ હળદી · ઢોલક અને ॐ કળશ',
            },
            desc: {
              en: 'Full custom text + 5 live animations + 4 themes (₹1 / 1 Day)',
              mr: 'फुल कस्टम टेक्स्ट + 5 अ‍ॅनिमेशन्स + 4 थीम (फक्त ₹1 / 1 दिवस)',
              hi: 'फुल कस्टम टेक्स्ट + 5 एनिमेशन + 4 थीम (सिर्फ ₹1 / 1 दिन)',
              gu: 'ફુલ કસ્ટમ ટેક્સ્ટ + 5 એનિમેશન + 4 થીમ (માત્ર ₹1 / 1 દિવસ)',
            },
            badge: 'ANIMATED',
          },
          {
            id: 'classic',
            label: {
              en: 'Style 1 · Shahi Gold Frame',
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
      : isWeddingFrame
        ? 'ROYAL WEDDING FRAME'
        : isFestive
          ? 'ROYAL HALDI ANIMATED'
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
      className="py-20 sm:py-24 border-b border-white/10 bg-[#090B12]/36 backdrop-blur-[2px]"
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

        {/* Style / Tier Visual Picker Bar */}
        <div
          className={`mb-6 grid grid-cols-1 gap-3 ${
            styleOptions.length === 4
              ? 'sm:grid-cols-2 lg:grid-cols-4'
              : styleOptions.length === 3
                ? 'sm:grid-cols-3'
                : styleOptions.length === 1
                  ? 'grid-cols-1'
                  : 'sm:grid-cols-2'
          }`}
        >
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

        {/* Main Studio Area: Cricket Controller OR Kabaddi Controller OR Haldi/Wedding Monitor */}
        {activeMode === 'cricket' ? (
          <VmixCricketController
            targetUid={kabaddiTargetUid || roomId}
            accountLabel={
              userAccount?.loginId || (isSuperAdmin ? 'SUPER ADMIN' : (kabaddiTargetUid || roomId).slice(0, 8))
            }
            lang={lang}
            outputBg={outputBg}
            onChangeOutputBg={setOutputBg}
            transparentBg={transparentBg}
            onToggleTransparentBg={() => setTransparentBg((v) => !v)}
          />
        ) : activeMode === 'kabaddi' ? (
          <div className="space-y-4">
            {/* Authenticated Operator / Super Admin Isolation Strip */}
            {onOpenAccountPortal && (
              <div className="rounded-2xl border border-white/12 bg-[#111524]/85 backdrop-blur-md px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5 text-xs">
                  {isSuperAdmin ? (
                    <>
                      <ShieldCheck className="w-4 h-4 text-[#FACC15] shrink-0" aria-hidden="true" />
                      <span className="font-bold text-[#FACC15]">SUPER ADMIN MODE</span>
                      <span className="text-zinc-400">
                        · Active Room: <span className="font-mono font-bold text-white">{roomId}</span>
                      </span>
                    </>
                  ) : userAccount ? (
                    <>
                      <UserCircle2 className="w-4 h-4 text-[#38BDF8] shrink-0" aria-hidden="true" />
                      <span className="font-bold text-white">{userAccount.fullName}</span>
                      <span className="font-mono text-[#FACC15] font-bold">
                        ({userAccount.loginId})
                      </span>
                      <span className="text-zinc-400">
                        · Isolated Scoreboard &amp; vMix Room:{' '}
                        <span className="font-mono font-bold text-[#4ADE80]">{userAccount.matchRoomId}</span>
                      </span>
                    </>
                  ) : (
                    <>
                      <UserCircle2 className="w-4 h-4 text-zinc-400 shrink-0" aria-hidden="true" />
                      <span className="text-zinc-300">
                        Have a personal Login ID? Sign in to load your separate scoreboard &amp; vMix URL.
                      </span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenAccountPortal(isSuperAdmin ? 'admin' : 'operator')}
                    className={
                      isSuperAdmin
                        ? 'btn-gold-pro px-3.5 py-2 text-xs font-extrabold rounded-xl inline-flex items-center gap-1.5'
                        : 'btn-glass-pro px-3.5 py-2 text-xs font-bold rounded-xl inline-flex items-center gap-1.5 text-white'
                    }
                  >
                    {isSuperAdmin ? (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Manage Users / Create Account</span>
                      </>
                    ) : userAccount ? (
                      <>
                        <UserCircle2 className="w-3.5 h-3.5 text-[#38BDF8]" aria-hidden="true" />
                        <span>My Account &amp; URLs</span>
                      </>
                    ) : (
                      <>
                        <UserCircle2 className="w-3.5 h-3.5 text-[#FACC15]" aria-hidden="true" />
                        <span>User Login / Super Admin</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            <VmixKabaddiController
              lang={lang}
              state={kabaddiState}
              displayMatchSeconds={displayMatchSeconds}
              displayRaidSeconds={displayRaidSeconds}
              teamABinRemaining={teamABinRemaining}
              teamBBinRemaining={teamBBinRemaining}
              connected={useFirestoreKabaddi ? userScoreboard.connected : syncConnected}
              connectionStatus={
                useFirestoreKabaddi
                  ? userScoreboard.connected
                    ? 'live'
                    : 'reconnecting'
                  : syncConnectionStatus
              }
              transport={useFirestoreKabaddi ? 'firebase' : syncTransport}
              connectedDisplays={useFirestoreKabaddi ? 1 : connectedDisplays}
              connectedControllers={useFirestoreKabaddi ? 1 : connectedControllers}
              roomInput={
                useFirestoreKabaddi
                  ? userAccount?.loginId || (isSuperAdmin ? 'SUPER ADMIN' : kabaddiTargetUid.slice(0, 8))
                  : roomInput
              }
              onChangeRoomInput={handleSetMatchId}
              onGenerateMatchId={handleGenerateNewMatchId}
              outputBg={outputBg}
              onChangeOutputBg={setOutputBg}
              transparentBg={transparentBg}
              onToggleTransparentBg={() => setTransparentBg((v) => !v)}
              lockModeInUrl={lockModeInUrl}
              onToggleLockModeInUrl={() => setLockModeInUrl((v) => !v)}
              obsBrowserUrl={obsBrowserUrl}
              vmixBrowserUrl={vmixBrowserUrl}
              isPrivateDevPreview={isPrivateDevPreview}
              isFreeDemo={isFreeDemo}
              isCurrentUnlocked={isCurrentUnlocked}
              activeToken={activeToken}
              currentSku={currentSku}
              nowTs={nowTs}
              canUndo={useFirestoreKabaddi ? userScoreboard.canUndo : syncCanUndo}
              canRedo={useFirestoreKabaddi ? false : syncCanRedo}
              onUndo={() => {
                if (useFirestoreKabaddi) {
                  void userScoreboard.undoLastAction();
                } else {
                  sendSyncAction('undo');
                }
              }}
              onRedo={() => {
                if (!useFirestoreKabaddi) {
                  sendSyncAction('redo');
                }
              }}
              onUpdateState={handleKabaddiUpdateState}
              onSendAction={handleKabaddiSendAction}
              onTriggerAlert={triggerKabaddiAlert}
              onTimeout={handleKabaddiTimeout}
              onToggleMatchTimer={handleToggleMatchTimer}
              onSetMatchPreset={handleSetMatchPreset}
              onToggleRaidTimer={handleToggleRaidTimer}
              onResetRaidTimer={handleResetRaidTimer}
              onUploadTeamLogo={handleUploadTeamLogo}
              onRemoveTeamLogo={handleRemoveTeamLogo}
              onSwapTeams={handleSwapTeams}
              onResetMatch={handleResetKabaddi}
              onOpenRemoteModal={() => setRemoteModalOpen(true)}
              onDownloadPng={handleDownloadOverlay}
              onRequestPurchase={onRequestPurchase}
              isolatedUserMode={useFirestoreKabaddi}
              undoCount={useFirestoreKabaddi ? userScoreboard.undoCount : 0}
              lastUndoLabel={useFirestoreKabaddi ? userScoreboard.lastUndoLabel : null}
              savingSettings={useFirestoreKabaddi ? userScoreboard.savingSettings : false}
              controlUrl={kabaddiControlUrl}
              onPlayerOut={
                useFirestoreKabaddi ? (team) => void userScoreboard.playerOut(team) : undefined
              }
              onAllOut={
                useFirestoreKabaddi ? (team) => void userScoreboard.triggerAllOut(team) : undefined
              }
              onFlushSettings={
                useFirestoreKabaddi ? () => void userScoreboard.flushSettingsNow() : undefined
              }
            />
          </div>
        ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
          {/* Broadcast Program Monitor (16:9) + OBS/vMix URL Panel */}
          <div className="xl:col-span-8 bg-[#121216] border border-white/12 rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-5">
            {/* Monitor top toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/8 text-xs text-zinc-400">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono font-medium text-zinc-200">
                  1920×1080 PGM · {activeStyleLabel} · {activePlatformObj.label}
                </span>
                <span aria-hidden="true" className="text-zinc-600">·</span>
                <span className="font-mono text-zinc-400 tabular-nums">
                  {syncConnected
                    ? lang === 'mr'
                      ? `लाईव्ह सिंक चालू (${connectedDisplays} स्क्रीन)`
                      : `Live Sync Connected (${connectedDisplays} screen${connectedDisplays === 1 ? '' : 's'})`
                    : lang === 'mr'
                      ? 'लोकल सिंक चालू'
                      : 'Local Sync Ready'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
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
                isClassic
                  ? 'border-2 border-[#FACC15] shadow-[inset_0_0_0_4px_#B45309]'
                  : 'border border-white/12'
              } ${
                transparentBg
                  ? ''
                  : 'bg-gradient-to-br from-[#452705] via-[#261607] to-[#09090B]'
              }`}
              style={monitorBackgroundStyle}
            >
              {isWeddingFrame ? (
                <>
                  {/* Center safe zone label */}
                  <div className="relative z-10 my-auto flex flex-col items-center justify-center text-center px-3">
                    <p className="font-mono text-[11px] sm:text-xs text-zinc-200 bg-black/60 px-3 py-1.5 rounded border border-white/10">
                      {lang === 'mr'
                        ? 'क्लियर सेंटर (OBS / vMix मध्ये येथे तुमचा लाईव्ह कॅमेरा दिसेल)'
                        : 'CLEAR CENTER · LIVE OBS / vMix CAMERA FEED SHOWS HERE'}
                    </p>
                  </div>

                  <WeddingFrameOverlay
                    variant="studio"
                    groomName={state.weddingGroomName}
                    brideName={state.weddingBrideName}
                    connector={state.weddingConnector}
                    eventLabel={state.weddingEventLabel}
                    dateVenue={state.weddingDateVenue}
                    topHeader={state.weddingTopHeader}
                    primaryColor={state.weddingPrimaryColor}
                    accentColor={state.weddingAccentColor}
                    textColor={state.weddingTextColor}
                    bottomAnim={state.weddingBottomAnim}
                    showTopHeader={state.weddingShowTopHeader}
                    showCornerFrame={state.weddingShowCornerFrame}
                  />

                  {state.showLogo && state.customLogoUrl && (
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
                </>
              ) : (
                <>
                  {/* Classic Haldi ornamental corners */}
                  {isClassic && (
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
                  <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
                    {isFestive ? (
                      state.haldiShowTopHeader && state.haldiHeader.trim() ? (
                        <div className="mx-auto bg-gradient-to-r from-[#4D0414]/95 via-[#8F0C26]/95 to-[#4D0414]/95 border border-[#FACC15] px-4 py-1 rounded-full text-[11px] sm:text-xs font-display font-bold text-[#FEF08A]">
                          {state.haldiHeader}
                        </div>
                      ) : (
                        <div className="h-2" aria-hidden="true" />
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

                  {/* Optional User-Uploaded Custom Logo Watermark */}
                  {state.showLogo && state.customLogoUrl && (
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
                    <p className="font-mono text-[11px] sm:text-xs text-zinc-200 bg-black/65 px-3 py-1.5 rounded border border-white/10">
                      {lang === 'mr'
                        ? 'क्लियर सेंटर (OBS / vMix मध्ये येथे तुमचा लाईव्ह कॅमेरा दिसेल)'
                        : 'CLEAR CENTER · LIVE OBS / vMix CAMERA FEED SHOWS HERE'}
                    </p>
                  </div>

                  {/* Bottom On-Screen Graphic */}
                  <div className="relative z-10 w-full">
                    {isFestive ? (
                      <HaldiFestiveOverlayBar
                        variant="studio"
                        leftText={state.haldiLeftText}
                        centerMain={state.haldiCenterMain}
                        centerSub={state.haldiCenterSub}
                        rightText={state.haldiRightText}
                        animation={state.haldiAnimation}
                        theme={state.haldiTheme}
                        speed={state.haldiAnimSpeed}
                        showDecor={state.haldiShowDecor}
                        showPetals={state.haldiShowPetals}
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
                </>
              )}
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
                    {isCurrentUnlocked && activeToken
                      ? lang === 'mr'
                        ? `पास सक्रिय · शिल्लक वेळ: ${formatRemainingTime(activeToken.expiresAt, nowTs)} (त्यानंतर आपोआप लॉक होईल)`
                        : `Pass Active · Auto-locks in ${formatRemainingTime(activeToken.expiresAt, nowTs)} · Paste URL in OBS or vMix.`
                      : lang === 'mr'
                        ? 'आजची ऑफर: फक्त ₹1 पेमेंट करा — 1 दिवसासाठी (24 तास) OBS/vMix URL आपोआप अनलॉक होईल, त्यानंतर एक्सपायर होईल.'
                        : "Today's Offer: Pay ₹1 — auto-unlocks OBS/vMix URL & PNG export for 1 Day (24h), then auto-expires."}
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

          {/* Interactive Control Desk (Wedding Frame & Haldi Customizers) */}
          <div className="xl:col-span-4 bg-[#121216] border border-white/12 rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-6">
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

              {isWeddingFrame ? (
                <div className="space-y-4 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-zinc-200">
                      {lang === 'mr'
                        ? 'वेडिंग फ्रेम नाव, कलर व अ‍ॅनिमेशन कस्टमाईज'
                        : lang === 'hi'
                          ? 'वेडिंग फ्रेम नाम, कलर और एनिमेशन कस्टमाइज़'
                          : lang === 'gu'
                            ? 'વેડિંગ ફ્રેમ નામ, કલર અને એનિમેશન કસ્ટમાઇઝ'
                            : 'Wedding Frame Name, Color & Motion'}
                    </p>
                    <span className="font-mono text-[10px] text-[#FACC15]">OBS/vMix SYNC</span>
                  </div>

                  {/* 1-Click Language Wedding Presets */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => applyWeddingPreset('mr')}
                      className="py-1.5 px-2 text-[11px] font-semibold rounded-lg border bg-[#260912] hover:bg-[#3A0D1C] text-[#FACC15] border-[#FACC15]/45 transition-colors whitespace-nowrap"
                    >
                      मराठी विवाह
                    </button>
                    <button
                      type="button"
                      onClick={() => applyWeddingPreset('hi')}
                      className="py-1.5 px-2 text-[11px] font-semibold rounded-lg border bg-[#260912] hover:bg-[#3A0D1C] text-[#FEF08A] border-[#FACC15]/35 transition-colors whitespace-nowrap"
                    >
                      हिंदी विवाह
                    </button>
                    <button
                      type="button"
                      onClick={() => applyWeddingPreset('gu')}
                      className="py-1.5 px-2 text-[11px] font-semibold rounded-lg border bg-[#260912] hover:bg-[#3A0D1C] text-[#FEF08A] border-[#FACC15]/35 transition-colors whitespace-nowrap"
                    >
                      ગુજરાતી લગ્ન
                    </button>
                    <button
                      type="button"
                      onClick={() => applyWeddingPreset('en')}
                      className="py-1.5 px-2 text-[11px] font-semibold rounded-lg border bg-[#1B1822] hover:bg-[#262132] text-white border-white/15 transition-colors whitespace-nowrap"
                    >
                      English Wedding
                    </button>
                  </div>

                  {/* Groom Name, Connector & Bride Name */}
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-5 space-y-1">
                      <label htmlFor="wed-groom-name" className="block text-[11px] text-zinc-400">
                        Groom Name (वर)
                      </label>
                      <input
                        id="wed-groom-name"
                        type="text"
                        value={state.weddingGroomName ?? ''}
                        onChange={(e) => updateState({ weddingGroomName: e.target.value })}
                        placeholder="चि. रोहित"
                        className="w-full px-2.5 py-1.5 text-xs sm:text-sm bg-[#18181D] border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#FACC15]"
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label htmlFor="wed-connector" className="block text-[11px] text-zinc-400 text-center">
                        &amp;
                      </label>
                      <input
                        id="wed-connector"
                        type="text"
                        value={state.weddingConnector ?? 'व'}
                        onChange={(e) => updateState({ weddingConnector: e.target.value })}
                        placeholder="व"
                        className="w-full px-1.5 py-1.5 text-xs font-bold text-center bg-[#18181D] border border-[#FACC15]/40 rounded-lg text-[#FACC15] focus:outline-none focus:border-[#FACC15]"
                      />
                    </div>
                    <div className="col-span-5 space-y-1">
                      <label htmlFor="wed-bride-name" className="block text-[11px] text-zinc-400">
                        Bride Name (वधू)
                      </label>
                      <input
                        id="wed-bride-name"
                        type="text"
                        value={state.weddingBrideName ?? ''}
                        onChange={(e) => updateState({ weddingBrideName: e.target.value })}
                        placeholder="चि. सौ. कां. प्रिया"
                        className="w-full px-2.5 py-1.5 text-xs sm:text-sm bg-[#18181D] border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#FACC15]"
                      />
                    </div>
                  </div>

                  {/* Ceremony Title & Date/Venue */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label htmlFor="wed-event-label" className="block text-[11px] text-zinc-400">
                        Wedding Title
                      </label>
                      <input
                        id="wed-event-label"
                        type="text"
                        value={state.weddingEventLabel ?? ''}
                        onChange={(e) => updateState({ weddingEventLabel: e.target.value })}
                        placeholder="शुभ विवाह सोहळा"
                        className="w-full px-2.5 py-1.5 text-xs bg-[#18181D] border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#FACC15]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="wed-top-header" className="block text-[11px] text-zinc-400">
                        Top Blessing Text
                      </label>
                      <input
                        id="wed-top-header"
                        type="text"
                        value={state.weddingTopHeader ?? ''}
                        onChange={(e) => updateState({ weddingTopHeader: e.target.value })}
                        placeholder="|| श्री गणेशाय नमः ||"
                        className="w-full px-2.5 py-1.5 text-xs bg-[#18181D] border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#FACC15]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="wed-date-venue" className="block text-[11px] text-zinc-400">
                      Date, Venue &amp; Subtitle
                    </label>
                    <input
                      id="wed-date-venue"
                      type="text"
                      value={state.weddingDateVenue ?? ''}
                      onChange={(e) => updateState({ weddingDateVenue: e.target.value })}
                      placeholder="24 नोव्हेंबर 2026 • थेट प्रक्षेपण"
                      className="w-full px-2.5 py-1.5 text-xs bg-[#18181D] border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#FACC15]"
                    />
                  </div>

                  {/* Quick Royal Color Themes */}
                  <div className="space-y-1.5">
                    <span className="block text-[11px] font-medium text-zinc-400">
                      Wedding Color Theme (कलर थीम निवडा)
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {WEDDING_COLOR_PRESETS.map((preset) => {
                        const active =
                          (state.weddingPrimaryColor || '#6B0F26').toLowerCase() ===
                          preset.primary.toLowerCase();
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() =>
                              updateState({
                                weddingPrimaryColor: preset.primary,
                                weddingAccentColor: preset.accent,
                                weddingTextColor: preset.text,
                              })
                            }
                            className={`flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-semibold rounded-lg border transition-colors whitespace-nowrap ${
                              active
                                ? 'bg-[#211A0E] text-[#FACC15] border-[#FACC15]'
                                : 'bg-[#18181D] text-zinc-300 border-white/12 hover:border-white/30'
                            }`}
                          >
                            <span
                              aria-hidden="true"
                              className="w-3 h-3 rounded-sm border shrink-0"
                              style={{
                                backgroundColor: preset.primary,
                                borderColor: preset.accent,
                              }}
                            />
                            <span className="truncate">{preset.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Live Color Pickers (Frame, Gold Border, Name Text) */}
                  <div className="grid grid-cols-3 gap-2">
                    <label className="flex flex-col gap-1 bg-[#18181D] border border-white/12 rounded-lg p-2 cursor-pointer">
                      <span className="text-[10px] text-zinc-400">Frame Color</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={state.weddingPrimaryColor || '#6B0F26'}
                          onChange={(e) => updateState({ weddingPrimaryColor: e.target.value })}
                          className="w-6 h-5 bg-transparent border-0 cursor-pointer p-0"
                        />
                        <span className="font-mono text-[10px] text-zinc-200 uppercase">
                          {state.weddingPrimaryColor || '#6B0F26'}
                        </span>
                      </div>
                    </label>
                    <label className="flex flex-col gap-1 bg-[#18181D] border border-white/12 rounded-lg p-2 cursor-pointer">
                      <span className="text-[10px] text-zinc-400">Border Color</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={state.weddingAccentColor || '#F5C542'}
                          onChange={(e) => updateState({ weddingAccentColor: e.target.value })}
                          className="w-6 h-5 bg-transparent border-0 cursor-pointer p-0"
                        />
                        <span className="font-mono text-[10px] text-zinc-200 uppercase">
                          {state.weddingAccentColor || '#F5C542'}
                        </span>
                      </div>
                    </label>
                    <label className="flex flex-col gap-1 bg-[#18181D] border border-white/12 rounded-lg p-2 cursor-pointer">
                      <span className="text-[10px] text-zinc-400">Name Color</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={state.weddingTextColor || '#FFFFFF'}
                          onChange={(e) => updateState({ weddingTextColor: e.target.value })}
                          className="w-6 h-5 bg-transparent border-0 cursor-pointer p-0"
                        />
                        <span className="font-mono text-[10px] text-zinc-200 uppercase">
                          {state.weddingTextColor || '#FFFFFF'}
                        </span>
                      </div>
                    </label>
                  </div>

                  {/* Subtle Bottom Frame Animation Selector */}
                  <div className="space-y-1.5">
                    <span className="block text-[11px] font-medium text-zinc-400">
                      Bottom Frame Soft Animation (हलके बॉटम अ‍ॅनिमेशन)
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(
                        [
                          { id: 'gentle', label: 'Soft Glow + Sheen' },
                          { id: 'shimmer', label: 'Light Shimmer' },
                          { id: 'petals', label: 'Soft Gold Sparks' },
                          { id: 'static', label: 'Static Clean' },
                        ] as { id: WeddingBottomAnimation; label: string }[]
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => updateState({ weddingBottomAnim: opt.id })}
                          className={`py-1.5 px-2 text-[11px] font-semibold rounded-lg border transition-colors whitespace-nowrap ${
                            (state.weddingBottomAnim || 'gentle') === opt.id
                              ? 'bg-[#FACC15] text-black border-[#FACC15]'
                              : 'bg-[#18181D] text-zinc-300 border-white/12 hover:border-white/30'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Frame Border & Top Header Toggles */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        updateState({ weddingShowCornerFrame: state.weddingShowCornerFrame === false })
                      }
                      aria-pressed={state.weddingShowCornerFrame !== false}
                      className={`py-1.5 px-2 text-[11px] font-semibold rounded-lg border transition-colors whitespace-nowrap ${
                        state.weddingShowCornerFrame !== false
                          ? 'bg-[#1D160A] text-[#FACC15] border-[#FACC15]/60'
                          : 'bg-[#18181D] text-zinc-400 border-white/12'
                      }`}
                    >
                      Royal Border: {state.weddingShowCornerFrame !== false ? 'ON' : 'OFF'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateState({ weddingShowTopHeader: state.weddingShowTopHeader === false })
                      }
                      aria-pressed={state.weddingShowTopHeader !== false}
                      className={`py-1.5 px-2 text-[11px] font-semibold rounded-lg border transition-colors whitespace-nowrap ${
                        state.weddingShowTopHeader !== false
                          ? 'bg-[#1D160A] text-[#FACC15] border-[#FACC15]/60'
                          : 'bg-[#18181D] text-zinc-400 border-white/12'
                      }`}
                    >
                      Top Blessing: {state.weddingShowTopHeader !== false ? 'ON' : 'OFF'}
                    </button>
                  </div>
                </div>
              ) : isFestive ? (
                <div className="space-y-4 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-zinc-200">
                      {lang === 'mr'
                        ? 'हळदी अ‍ॅनिमेटेड ओव्हरले कस्टमाईज (OBS/vMix सिंक)'
                        : lang === 'hi'
                          ? 'हल्दी एनिमेटेड ओवरले कस्टमाइज़ (OBS/vMix सिंक)'
                          : lang === 'gu'
                            ? 'હળદી એનિમેટેડ ઓવરલે કસ્ટમાઇઝ (OBS/vMix સિંક)'
                            : 'Royal Haldi Text & Animation Customizer'}
                    </p>
                    <span className="font-mono text-[10px] text-[#FACC15]">LIVE SYNC</span>
                  </div>

                  {/* 1-Click Language & Ceremony Presets */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => applyCeremonyPreset('haldi')}
                      className="py-1.5 px-2.5 text-[11px] font-semibold rounded-lg border bg-[#260912] hover:bg-[#3A0D1C] text-[#FACC15] border-[#FACC15]/45 transition-colors whitespace-nowrap"
                    >
                      मराठी हळदी
                    </button>
                    <button
                      type="button"
                      onClick={() => applyCeremonyPreset('haldi-hi')}
                      className="py-1.5 px-2.5 text-[11px] font-semibold rounded-lg border bg-[#260912] hover:bg-[#3A0D1C] text-[#FEF08A] border-[#FACC15]/35 transition-colors whitespace-nowrap"
                    >
                      हिंदी हल्दी
                    </button>
                    <button
                      type="button"
                      onClick={() => applyCeremonyPreset('haldi-gu')}
                      className="py-1.5 px-2.5 text-[11px] font-semibold rounded-lg border bg-[#260912] hover:bg-[#3A0D1C] text-[#FEF08A] border-[#FACC15]/35 transition-colors whitespace-nowrap"
                    >
                      ગુજરાતી હળદી
                    </button>
                    <button
                      type="button"
                      onClick={() => applyCeremonyPreset('wedding')}
                      className="py-1.5 px-2.5 text-[11px] font-semibold rounded-lg border bg-[#1F120A] hover:bg-[#2F1B0E] text-white border-white/15 transition-colors whitespace-nowrap"
                    >
                      शुभ विवाह (Wedding)
                    </button>
                  </div>

                  {/* 4 Full Customizable Text Zones */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label htmlFor="haldi-left-text" className="block text-[11px] text-zinc-400">
                        Left Text (डावा टेक्स्ट)
                      </label>
                      <input
                        id="haldi-left-text"
                        type="text"
                        value={state.haldiLeftText}
                        onChange={(e) => updateState({ haldiLeftText: e.target.value })}
                        placeholder="शुभ विवाह..."
                        className="w-full px-2.5 py-2 text-xs sm:text-sm bg-[#18181D] border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#FACC15]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="haldi-right-text" className="block text-[11px] text-zinc-400">
                        Right Text (उजवा टेक्स्ट)
                      </label>
                      <input
                        id="haldi-right-text"
                        type="text"
                        value={state.haldiRightText}
                        onChange={(e) => updateState({ haldiRightText: e.target.value })}
                        placeholder="Haldi Ceremony"
                        className="w-full px-2.5 py-2 text-xs sm:text-sm bg-[#18181D] border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#FACC15]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="haldi-center-main" className="block text-[11px] text-zinc-400">
                        Center Main (मधला मुख्य)
                      </label>
                      <input
                        id="haldi-center-main"
                        type="text"
                        value={state.haldiCenterMain}
                        onChange={(e) => updateState({ haldiCenterMain: e.target.value })}
                        placeholder="हळदी"
                        className="w-full px-2.5 py-2 text-xs sm:text-sm font-bold bg-[#18181D] border border-[#FACC15]/40 rounded-lg text-[#FACC15] focus:outline-none focus:border-[#FACC15]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="haldi-center-sub" className="block text-[11px] text-zinc-400">
                        Center Sub (उपशीर्षक)
                      </label>
                      <input
                        id="haldi-center-sub"
                        type="text"
                        value={state.haldiCenterSub}
                        onChange={(e) => updateState({ haldiCenterSub: e.target.value })}
                        placeholder="समारंभ"
                        className="w-full px-2.5 py-2 text-xs sm:text-sm bg-[#18181D] border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#FACC15]"
                      />
                    </div>
                  </div>

                  {/* Animation Style Picker */}
                  <div className="space-y-1.5">
                    <span className="block text-[11px] font-medium text-zinc-400">
                      Animation Effect (अ‍ॅनिमेशन निवडा)
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(
                        [
                          { id: 'festive', label: 'Festive All' },
                          { id: 'shimmer', label: 'Gold Shimmer' },
                          { id: 'petals', label: 'Petals Float' },
                          { id: 'beat', label: 'Dhol Beat' },
                          { id: 'static', label: 'Static Clean' },
                        ] as { id: HaldiAnimationMode; label: string }[]
                      ).map((anim) => (
                        <button
                          key={anim.id}
                          type="button"
                          onClick={() => updateState({ haldiAnimation: anim.id })}
                          className={`py-1.5 px-2 text-[11px] font-semibold rounded-lg border transition-colors whitespace-nowrap ${
                            state.haldiAnimation === anim.id
                              ? 'bg-[#FACC15] text-black border-[#FACC15]'
                              : 'bg-[#18181D] text-zinc-300 border-white/12 hover:border-white/30'
                          }`}
                        >
                          {anim.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Animation Speed */}
                  <div className="space-y-1.5">
                    <span className="block text-[11px] font-medium text-zinc-400">
                      Animation Speed
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['slow', 'normal', 'fast'] as HaldiAnimSpeed[]).map((spd) => (
                        <button
                          key={spd}
                          type="button"
                          onClick={() => updateState({ haldiAnimSpeed: spd })}
                          className={`py-1.5 text-[11px] font-semibold rounded-lg border capitalize transition-colors ${
                            state.haldiAnimSpeed === spd
                              ? 'bg-white text-black border-white'
                              : 'bg-[#18181D] text-zinc-300 border-white/12 hover:border-white/30'
                          }`}
                        >
                          {spd}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Royal Color Theme Picker */}
                  <div className="space-y-1.5">
                    <span className="block text-[11px] font-medium text-zinc-400">
                      Banner Color Theme
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(
                        [
                          { id: 'royal-maroon', label: 'Royal Maroon', dot: '#8F0C26' },
                          { id: 'turmeric-gold', label: 'Haldi Gold', dot: '#B45309' },
                          { id: 'saffron-red', label: 'Saffron Red', dot: '#B91C1C' },
                          { id: 'emerald-gold', label: 'Royal Emerald', dot: '#065F46' },
                        ] as { id: HaldiColorTheme; label: string; dot: string }[]
                      ).map((th) => (
                        <button
                          key={th.id}
                          type="button"
                          onClick={() => updateState({ haldiTheme: th.id })}
                          className={`flex items-center gap-2 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border transition-colors whitespace-nowrap ${
                            state.haldiTheme === th.id
                              ? 'bg-[#211A0E] text-[#FACC15] border-[#FACC15]'
                              : 'bg-[#18181D] text-zinc-300 border-white/12 hover:border-white/30'
                          }`}
                        >
                          <span
                            aria-hidden="true"
                            className="w-3 h-3 rounded-sm border border-[#FACC15]/70 shrink-0"
                            style={{ backgroundColor: th.dot }}
                          />
                          <span className="truncate">{th.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Decor & Top Header Toggles */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => updateState({ haldiShowDecor: !state.haldiShowDecor })}
                      aria-pressed={state.haldiShowDecor}
                      className={`py-1.5 px-2 text-[11px] font-semibold rounded-lg border transition-colors whitespace-nowrap ${
                        state.haldiShowDecor
                          ? 'bg-[#1D160A] text-[#FACC15] border-[#FACC15]/60'
                          : 'bg-[#18181D] text-zinc-400 border-white/12'
                      }`}
                    >
                      Dhol/Kalash: {state.haldiShowDecor ? 'ON' : 'OFF'}
                    </button>
                    <button
                      type="button"
                      onClick={() => updateState({ haldiShowPetals: !state.haldiShowPetals })}
                      aria-pressed={state.haldiShowPetals}
                      className={`py-1.5 px-2 text-[11px] font-semibold rounded-lg border transition-colors whitespace-nowrap ${
                        state.haldiShowPetals
                          ? 'bg-[#1D160A] text-[#FACC15] border-[#FACC15]/60'
                          : 'bg-[#18181D] text-zinc-400 border-white/12'
                      }`}
                    >
                      Petals: {state.haldiShowPetals ? 'ON' : 'OFF'}
                    </button>
                    <button
                      type="button"
                      onClick={() => updateState({ haldiShowTopHeader: !state.haldiShowTopHeader })}
                      aria-pressed={state.haldiShowTopHeader}
                      className={`py-1.5 px-2 text-[11px] font-semibold rounded-lg border transition-colors whitespace-nowrap ${
                        state.haldiShowTopHeader
                          ? 'bg-[#1D160A] text-[#FACC15] border-[#FACC15]/60'
                          : 'bg-[#18181D] text-zinc-400 border-white/12'
                      }`}
                    >
                      Top Bar: {state.haldiShowTopHeader ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {state.haldiShowTopHeader && (
                    <div className="space-y-1">
                      <label htmlFor="preview-festive-top-header" className="block text-[11px] text-zinc-400">
                        Top Invocation Strip
                      </label>
                      <input
                        id="preview-festive-top-header"
                        type="text"
                        value={state.haldiHeader}
                        onChange={(e) => updateState({ haldiHeader: e.target.value })}
                        className="w-full px-3 py-2 text-xs sm:text-sm bg-[#18181D] border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#FACC15]"
                      />
                    </div>
                  )}
                </div>
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
                className="cta-btn-animate w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-[#DC2626] hover:bg-[#B91C1C] rounded-lg transition-colors duration-150 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]"
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
        )}
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
