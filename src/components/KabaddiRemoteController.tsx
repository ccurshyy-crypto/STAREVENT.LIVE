import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import {
  ArrowLeftRight,
  Clock,
  Eye,
  EyeOff,
  Globe,
  ImagePlus,
  KeyRound,
  LogOut,
  Monitor,
  Pause,
  Pencil,
  Play,
  Redo2,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Trash2,
  Undo2,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { sanitizeRoomIdClient, useOverlaySync } from '../hooks/useOverlaySync';
import { KabaddiHalf, KabaddiMatchStatus, KabaddiTimeoutTeam } from '../types/overlay';
import { formatClockMMSS, KabaddiScoreboardBar } from './KabaddiScoreboardBar';

interface KabaddiRemoteControllerProps {
  initialMatchId?: string;
  initialLanMode?: boolean;
}

const HALF_OPTIONS: KabaddiHalf[] = ['1ST HALF', '2ND HALF', 'HALF TIME', 'FULL TIME'];
const STATUS_OPTIONS: KabaddiMatchStatus[] = ['LIVE', 'PAUSED', 'TIMEOUT', 'HALF TIME', 'FULL TIME'];

function detectDefaultDeviceName(): string {
  if (typeof navigator === 'undefined') return 'Remote Controller';
  const ua = navigator.userAgent || '';
  if (/iPad|Tablet/i.test(ua)) return 'Tablet Scorer';
  if (/Android|iPhone|Mobile/i.test(ua)) return 'Mobile Scorer';
  return 'Laptop Controller';
}

export function KabaddiRemoteController({
  initialMatchId = '',
  initialLanMode = false,
}: KabaddiRemoteControllerProps) {
  const [matchInput, setMatchInput] = useState(() =>
    initialMatchId ? sanitizeRoomIdClient(initialMatchId) : 'star-live-1'
  );
  const [pinInput, setPinInput] = useState('');
  const [deviceName, setDeviceName] = useState(() => detectDefaultDeviceName());
  const [authError, setAuthError] = useState<string | null>(null);
  const [authenticating, setAuthenticating] = useState(false);

  // Security: Remote Bearer token is kept strictly in React memory (never localStorage)
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);

  const [matchPreview, setMatchPreview] = useState<{
    pinProtected: boolean;
    displays: number;
    controllers: number;
    teamAName: string;
    teamBName: string;
    teamAScore: number;
    teamBScore: number;
  } | null>(null);

  const [showLanHelper, setShowLanHelper] = useState(initialLanMode);
  const [lanUrls, setLanUrls] = useState<string[]>([]);
  const [customLanHost, setCustomLanHost] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [showTeamSettings, setShowTeamSettings] = useState(false);

  // Load Match info preview + local LAN addresses on login gate
  useEffect(() => {
    if (sessionToken) return;
    let cancelled = false;
    const safeId = sanitizeRoomIdClient(matchInput);

    fetch(`/api/remote/match/${encodeURIComponent(safeId)}/info`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.ok) {
          setMatchPreview({
            pinProtected: Boolean(data.pinProtected),
            displays: data.presence?.displays ?? 0,
            controllers: data.presence?.controllers ?? 0,
            teamAName: data.summary?.teamAName || 'TEAM A',
            teamBName: data.summary?.teamBName || 'TEAM B',
            teamAScore: data.summary?.teamAScore ?? 0,
            teamBScore: data.summary?.teamBScore ?? 0,
          });
        }
      })
      .catch(() => {});

    fetch('/api/remote/network-info', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.ok && Array.isArray(data.lanUrls)) {
          setLanUrls(data.lanUrls);
          setCustomLanHost((prev) => prev || data.lanUrls[0] || '');
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [matchInput, sessionToken]);

  const {
    state,
    updateState,
    sendAction,
    connected,
    transport,
    connectedDisplays,
    connectedControllers,
    controllerNames,
    canUndo,
    canRedo,
    undoCount,
    redoCount,
    getServerNow,
  } = useOverlaySync({
    roomId: activeMatchId || matchInput,
    role: 'controller',
    remoteToken: sessionToken || undefined,
    deviceName,
    onAuthError: (msg) => {
      setSessionToken(null);
      setActiveMatchId(null);
      setAuthError(msg);
    },
  });

  // Live ticking timers synced to server clock
  const [displayMatchSeconds, setDisplayMatchSeconds] = useState(state.matchSeconds);
  const [displayRaidSeconds, setDisplayRaidSeconds] = useState(state.raidSeconds);
  const [nowClock, setNowClock] = useState(() => Date.now());

  useEffect(() => {
    if (!state.matchRunning) {
      setDisplayMatchSeconds(state.matchSeconds);
      return;
    }
    const compute = () =>
      Math.max(0, state.matchSeconds - Math.floor(Math.max(0, getServerNow() - state.matchUpdatedAt) / 1000));
    setDisplayMatchSeconds(compute());
    const id = window.setInterval(() => setDisplayMatchSeconds(compute()), 250);
    return () => window.clearInterval(id);
  }, [state.matchSeconds, state.matchRunning, state.matchUpdatedAt, getServerNow]);

  useEffect(() => {
    if (!state.raidRunning) {
      setDisplayRaidSeconds(state.raidSeconds);
      return;
    }
    const compute = () =>
      Math.max(0, state.raidSeconds - Math.floor(Math.max(0, getServerNow() - state.raidUpdatedAt) / 1000));
    setDisplayRaidSeconds(compute());
    const id = window.setInterval(() => setDisplayRaidSeconds(compute()), 250);
    return () => window.clearInterval(id);
  }, [state.raidSeconds, state.raidRunning, state.raidUpdatedAt, getServerNow]);

  useEffect(() => {
    if (!state.teamABinEndAt && !state.teamBBinEndAt) return;
    setNowClock(getServerNow());
    const id = window.setInterval(() => setNowClock(getServerNow()), 250);
    return () => window.clearInterval(id);
  }, [state.teamABinEndAt, state.teamBBinEndAt, getServerNow]);

  const teamABinRemaining = state.teamABinEndAt
    ? Math.max(0, Math.ceil((state.teamABinEndAt - nowClock) / 1000))
    : 0;
  const teamBBinRemaining = state.teamBBinEndAt
    ? Math.max(0, Math.ceil((state.teamBBinEndAt - nowClock) / 1000))
    : 0;

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const safeId = sanitizeRoomIdClient(matchInput);
    if (!pinInput.trim()) {
      setAuthError('Please enter the Match Admin PIN.');
      return;
    }
    setAuthenticating(true);
    try {
      const res = await fetch('/api/remote/match/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: safeId,
          pin: pinInput.trim(),
          deviceName: deviceName.trim() || 'Remote Controller',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok || !data?.token) {
        setAuthError(data?.error || 'Could not authenticate. Verify Match ID & Admin PIN.');
        return;
      }
      setActiveMatchId(data.matchId || safeId);
      setSessionToken(data.token);
      setPinInput('');
    } catch {
      setAuthError('Unable to reach server. Check internet or switch to Local Wi-Fi LAN URL.');
    } finally {
      setAuthenticating(false);
    }
  };

  const handleLogout = async () => {
    if (sessionToken && activeMatchId) {
      fetch(`/api/remote/match/${encodeURIComponent(activeMatchId)}/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionToken}` },
      }).catch(() => {});
    }
    setSessionToken(null);
    setActiveMatchId(null);
    setConfirmReset(false);
  };

  const handleSwitchToLanUrl = () => {
    const cleaned = customLanHost.trim().replace(/\/+$/, '');
    if (!cleaned) return;
    const base = cleaned.startsWith('http://') || cleaned.startsWith('https://') ? cleaned : `http://${cleaned}`;
    const safeId = sanitizeRoomIdClient(matchInput);
    window.location.href = `${base}/?remote=1&match=${encodeURIComponent(safeId)}&mode=lan`;
  };

  const handleUploadTeamLogo = (team: 'A' | 'B', e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) return;
      const img = new Image();
      img.onload = () => {
        const maxSize = 200;
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const png = canvas.toDataURL('image/png');
        updateState(team === 'A' ? { teamALogoUrl: png } : { teamBLogoUrl: png });
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleToggleSinBin = (team: 'A' | 'B') => {
    const now = getServerNow();
    if (team === 'A') {
      updateState({ teamABinEndAt: teamABinRemaining > 0 ? null : now + 2 * 60 * 1000 });
    } else {
      updateState({ teamBBinEndAt: teamBBinRemaining > 0 ? null : now + 2 * 60 * 1000 });
    }
  };

  // =========================================================================
  // GATE 1: SECURE ADMIN PIN LOGIN SCREEN (Mobile-First)
  // =========================================================================
  if (!sessionToken || !activeMatchId) {
    return (
      <div className="min-h-screen bg-[#090C11] text-zinc-100 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#11161F] border border-white/12 rounded-2xl shadow-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10 bg-[#151C27] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#DC2626] flex items-center justify-center shrink-0">
                <Smartphone className="w-5 h-5 text-white" aria-hidden="true" />
              </div>
              <div>
                <p className="font-mono text-[10px] font-bold tracking-wider text-[#FACC15]">
                  STAR EVENT LIVE
                </p>
                <h1 className="font-display text-base font-extrabold text-white leading-tight">
                  Kabaddi Remote Controller
                </h1>
              </div>
            </div>
            <a
              href="/overlays"
              className="text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
            >
              Studio
            </a>
          </div>

          <div className="p-5 space-y-4">
            {matchPreview && (
              <div className="bg-[#0B0F15] border border-white/10 rounded-xl p-3 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-zinc-400">
                    MATCH: <strong className="text-white">{sanitizeRoomIdClient(matchInput).toUpperCase()}</strong>
                  </span>
                  <span className={matchPreview.pinProtected ? 'text-[#4ADE80]' : 'text-[#F59E0B]'}>
                    {matchPreview.pinProtected ? 'PIN READY' : 'SETUP PIN ON PC'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span className="truncate">{matchPreview.teamAName}</span>
                  <span className="font-mono text-[#FACC15] px-2 tabular-nums">
                    {matchPreview.teamAScore} – {matchPreview.teamBScore}
                  </span>
                  <span className="truncate text-right">{matchPreview.teamBName}</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-zinc-400 pt-0.5">
                  <span>vMix Screens: {matchPreview.displays}</span>
                  <span>·</span>
                  <span>Controllers: {matchPreview.controllers}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-3.5">
              <div className="space-y-1">
                <label htmlFor="rc-match-id" className="block text-xs font-semibold text-zinc-300">
                  Match ID
                </label>
                <input
                  id="rc-match-id"
                  type="text"
                  value={matchInput}
                  onChange={(e) => setMatchInput(sanitizeRoomIdClient(e.target.value))}
                  placeholder="e.g. kbd-4829"
                  required
                  className="w-full px-3.5 py-2.5 text-sm font-mono font-bold uppercase bg-[#0B0F15] border border-white/15 rounded-xl text-white focus:outline-none focus:border-[#FACC15]"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="rc-admin-pin" className="block text-xs font-semibold text-zinc-300">
                  Secure Admin PIN
                </label>
                <input
                  id="rc-admin-pin"
                  type="password"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="Enter Admin PIN from vMix PC"
                  autoComplete="current-password"
                  required
                  className="w-full px-3.5 py-2.5 text-sm font-mono bg-[#0B0F15] border border-white/15 rounded-xl text-white focus:outline-none focus:border-[#FACC15]"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="rc-device-name" className="block text-xs font-semibold text-zinc-300">
                  Device Name (shown on vMix PC)
                </label>
                <input
                  id="rc-device-name"
                  type="text"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  maxLength={32}
                  placeholder="e.g. Scorer Phone 1"
                  className="w-full px-3.5 py-2 text-sm bg-[#0B0F15] border border-white/15 rounded-xl text-white focus:outline-none focus:border-[#FACC15]"
                />
              </div>

              {authError && (
                <p className="text-xs text-[#FCA5A5] bg-[#2C1317] border border-[#EF4444]/40 rounded-xl px-3 py-2.5">
                  {authError}
                </p>
              )}

              <button
                type="submit"
                disabled={authenticating}
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 text-sm font-extrabold text-black bg-[#FACC15] hover:bg-[#EAB308] disabled:opacity-60 rounded-xl transition-colors"
              >
                <KeyRound className="w-4 h-4" aria-hidden="true" />
                <span>{authenticating ? 'Connecting...' : 'Unlock & Connect Remote'}</span>
              </button>
            </form>

            {/* Two Connection Modes Switcher: Anywhere Internet vs Same Wi-Fi / Local LAN */}
            <div className="pt-3 border-t border-white/10 space-y-2.5">
              <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                Connection Mode
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setShowLanHelper(false)}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border text-xs font-bold transition-colors ${
                    !showLanHelper
                      ? 'bg-[#102B1C] border-[#4ADE80]/60 text-[#86EFAC]'
                      : 'bg-[#0B0F15] border-white/12 text-zinc-300 hover:border-white/25'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>Anywhere Internet</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowLanHelper(true)}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border text-xs font-bold transition-colors ${
                    showLanHelper
                      ? 'bg-[#26200D] border-[#FACC15]/70 text-[#FDE047]'
                      : 'bg-[#0B0F15] border-white/12 text-zinc-300 hover:border-white/25'
                  }`}
                >
                  <Wifi className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>Same Wi-Fi / LAN</span>
                </button>
              </div>

              {showLanHelper ? (
                <div className="bg-[#0B0F15] border border-[#FACC15]/30 rounded-xl p-3 space-y-2">
                  <p className="text-[11px] text-zinc-300 leading-relaxed">
                    <strong className="text-[#FACC15]">Same Wi-Fi / Local Network:</strong> Connect this phone & vMix PC to the same Wi-Fi router or hotspot (works even with zero internet) and open the PC&apos;s local LAN URL:
                  </p>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={customLanHost}
                      onChange={(e) => setCustomLanHost(e.target.value)}
                      placeholder="http://192.168.1.10:3000"
                      className="flex-1 min-w-0 px-2.5 py-1.5 text-xs font-mono bg-[#131924] border border-white/15 rounded-lg text-white"
                    />
                    <button
                      type="button"
                      onClick={handleSwitchToLanUrl}
                      className="px-3 py-1.5 text-xs font-bold bg-[#FACC15] text-black rounded-lg shrink-0"
                    >
                      Go LAN
                    </button>
                  </div>
                  {lanUrls.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {lanUrls.map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => setCustomLanHost(u)}
                          className="px-2 py-0.5 text-[10px] font-mono bg-[#18202D] text-zinc-200 border border-white/10 rounded"
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Connected via <strong className="text-zinc-200">Anywhere Internet</strong> mode — control vMix remotely over 4G/5G or Wi-Fi from anywhere with real-time WebSocket sync.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // GATE 2: LIVE MOBILE-FRIENDLY KABADDI REMOTE CONTROLLER DASHBOARD
  // =========================================================================
  const isTimeout = state.matchStatus === 'TIMEOUT' || Boolean(state.timeoutTeam);
  const currentStatus: KabaddiMatchStatus = state.matchStatus || 'LIVE';

  const triggerTimeout = (target: KabaddiTimeoutTeam) => {
    if (!target) {
      sendAction('clear_timeout');
    } else {
      sendAction('timeout', { target });
    }
  };

  return (
    <div className="min-h-screen bg-[#080B10] text-zinc-100 pb-8">
      {/* Sticky Top Live Bar */}
      <header className="sticky top-0 z-30 bg-[#0E131B]/95 backdrop-blur border-b border-white/10 px-3 sm:px-5 py-2.5">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md font-mono text-[10px] font-extrabold ${
                connected && transport === 'ws'
                  ? 'bg-[#102B1C] text-[#4ADE80] border border-[#4ADE80]/40'
                  : connected
                    ? 'bg-[#2A220D] text-[#FACC15] border border-[#FACC15]/40'
                    : 'bg-[#2D1418] text-[#FCA5A5] border border-[#EF4444]/40'
              }`}
            >
              {connected ? (
                <Wifi className="w-3 h-3" aria-hidden="true" />
              ) : (
                <WifiOff className="w-3 h-3" aria-hidden="true" />
              )}
              <span>
                {transport === 'ws' ? 'WS LIVE' : connected ? 'SYNC ON' : 'RECONNECTING'}
              </span>
            </span>

            <span className="font-mono text-xs font-extrabold text-white tracking-wider truncate">
              {activeMatchId.toUpperCase()}
            </span>

            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-zinc-400">
              <Monitor className="w-3.5 h-3.5 text-[#4ADE80]" aria-hidden="true" />
              <span>vMix: {connectedDisplays}</span>
              <span>·</span>
              <Smartphone className="w-3.5 h-3.5 text-[#FACC15]" aria-hidden="true" />
              <span>Remotes: {connectedControllers}</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => sendAction('undo')}
              disabled={!canUndo}
              title="Undo last action"
              aria-label={`Undo (${undoCount})`}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold bg-[#18202C] hover:bg-[#243042] disabled:opacity-40 disabled:pointer-events-none border border-white/15 rounded-lg text-zinc-100 transition-colors"
            >
              <Undo2 className="w-3.5 h-3.5 text-[#FACC15]" aria-hidden="true" />
              <span className="hidden sm:inline">Undo</span>
            </button>

            <button
              type="button"
              onClick={() => sendAction('redo')}
              disabled={!canRedo}
              title="Redo action"
              aria-label={`Redo (${redoCount})`}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold bg-[#18202C] hover:bg-[#243042] disabled:opacity-40 disabled:pointer-events-none border border-white/15 rounded-lg text-zinc-100 transition-colors"
            >
              <Redo2 className="w-3.5 h-3.5 text-[#38BDF8]" aria-hidden="true" />
              <span className="hidden sm:inline">Redo</span>
            </button>

            <button
              type="button"
              onClick={() => updateState({ visible: !state.visible })}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-mono font-bold rounded-lg border transition-colors ${
                state.visible
                  ? 'bg-[#DC2626] border-[#DC2626] text-white'
                  : 'bg-[#18202C] border-white/15 text-zinc-300'
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
              onClick={handleLogout}
              aria-label="Lock and disconnect remote"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold bg-[#18202C] hover:bg-[#232D3D] border border-white/15 rounded-lg text-zinc-200"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Lock</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-3 sm:px-5 pt-3.5 space-y-3.5">
        {/* Live Mirrored Scoreboard Preview */}
        <section className="bg-[#11161F] border border-white/10 rounded-2xl p-3 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#4ADE80]" aria-hidden="true" />
              <span>vMix Output Mirror</span>
            </span>
            <span>
              vMix: <strong className="text-[#4ADE80]">{connectedDisplays}</strong> · Remotes:{' '}
              <strong className="text-[#FACC15]">{connectedControllers}</strong>
            </span>
          </div>

          <div className="bg-[#080B10] rounded-xl py-2.5 px-1.5 border border-white/8">
            <KabaddiScoreboardBar
              variant="studio"
              teamAName={state.teamAName}
              teamACode={state.teamACode}
              teamAColor={state.teamAColor}
              teamAScore={state.teamAScore}
              teamABonusPoints={state.teamABonusPoints}
              teamALonaPoints={state.teamALonaPoints}
              teamAPlayersOnMat={state.teamAPlayersOnMat}
              teamALogoUrl={state.teamALogoUrl}
              teamAGreenCards={state.teamAGreenCards}
              teamAYellowCards={state.teamAYellowCards}
              teamARedCards={state.teamARedCards}
              teamABinRemaining={teamABinRemaining}
              teamBName={state.teamBName}
              teamBCode={state.teamBCode}
              teamBColor={state.teamBColor}
              teamBScore={state.teamBScore}
              teamBBonusPoints={state.teamBBonusPoints}
              teamBLonaPoints={state.teamBLonaPoints}
              teamBPlayersOnMat={state.teamBPlayersOnMat}
              teamBLogoUrl={state.teamBLogoUrl}
              teamBGreenCards={state.teamBGreenCards}
              teamBYellowCards={state.teamBYellowCards}
              teamBRedCards={state.teamBRedCards}
              teamBBinRemaining={teamBBinRemaining}
              matchSeconds={displayMatchSeconds}
              raidSeconds={displayRaidSeconds}
              raidDuration={state.kabaddiRaidDuration}
              raidRunning={state.raidRunning}
              halfLabel={state.kabaddiHalf}
              matchStatus={state.matchStatus}
              timeoutTeam={state.timeoutTeam}
              doOrDie={state.doOrDie}
              alertText={state.kabaddiAlert}
              tournamentTitle={state.kabaddiTitle}
              subtitle={state.kabaddiSubtitle}
            />
          </div>
        </section>

        {/* Clock, 30s Raid, Timeout & Half/Status Strip */}
        <section className="bg-[#11161F] border border-white/10 rounded-2xl p-3.5 space-y-3">
          {/* Timer Row */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#FACC15] shrink-0" aria-hidden="true" />
              <span className="font-mono font-black text-3xl text-white tabular-nums leading-none">
                {formatClockMMSS(displayMatchSeconds)}
              </span>
              <button
                type="button"
                onClick={() => sendAction('timer_toggle')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-extrabold rounded-xl transition active:scale-[0.98] ${
                  state.matchRunning
                    ? 'bg-[#DC2626] hover:bg-[#B91C1C] text-white'
                    : 'bg-[#3B9E6D] hover:bg-[#338C60] text-white'
                }`}
              >
                {state.matchRunning ? (
                  <Pause className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Play className="w-4 h-4" aria-hidden="true" />
                )}
                <span>{state.matchRunning ? 'PAUSE' : 'START'}</span>
              </button>
              <button
                type="button"
                onClick={() => sendAction('timer_reset', { seconds: 30, autoStart: false })}
                className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-bold bg-[#1A222E] hover:bg-[#232E3E] border border-white/12 rounded-xl text-zinc-200 active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#FACC15]" aria-hidden="true" />
                <span>Reset</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => sendAction('timer_adjust', { delta: -5 })}
                className="px-3 py-2 text-xs font-mono font-bold bg-[#1A222E] hover:bg-[#232E3E] border border-white/12 rounded-xl text-zinc-100 active:scale-95"
              >
                −5s
              </button>
              <button
                type="button"
                onClick={() => sendAction('timer_adjust', { delta: 5 })}
                className="px-3 py-2 text-xs font-mono font-bold bg-[#1A222E] hover:bg-[#232E3E] border border-white/12 rounded-xl text-zinc-100 active:scale-95"
              >
                +5s
              </button>
              <button
                type="button"
                onClick={() => sendAction('timer_set', { seconds: 30, autoStart: true })}
                className="px-3 py-2 text-xs font-mono font-extrabold bg-[#172B21] hover:bg-[#203D2E] border border-[#3B9E6D]/70 rounded-xl text-[#86EFAC] active:scale-95"
              >
                30s Start
              </button>
              <button
                type="button"
                onClick={() => sendAction('timer_set', { seconds: 30, autoStart: false })}
                className="px-3 py-2 text-xs font-mono font-bold bg-[#1A222E] hover:bg-[#232E3E] border border-white/12 rounded-xl text-zinc-200 active:scale-95"
              >
                30s Reset
              </button>
              <button
                type="button"
                onClick={() => sendAction('raid_toggle')}
                className={`px-3 py-2 text-xs font-mono font-extrabold rounded-xl border tabular-nums active:scale-95 ${
                  state.raidRunning
                    ? 'bg-[#FACC15] text-black border-[#FACC15]'
                    : 'bg-[#1A222E] text-zinc-100 border-[#FACC15]/40'
                }`}
              >
                {state.raidRunning ? `RAID ${String(displayRaidSeconds).padStart(2, '0')}s` : '30s Raid'}
              </button>
              {(state.raidRunning || displayRaidSeconds < 30) && (
                <button
                  type="button"
                  onClick={() => sendAction('raid_reset')}
                  aria-label="Reset 30s raid clock"
                  className="p-2 bg-[#1A222E] border border-white/12 rounded-xl text-zinc-300"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          {/* Half-Time + DO-OR-DIE + Timeout Controls */}
          <div className="pt-2.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              {HALF_OPTIONS.map((half) => (
                <button
                  key={half}
                  type="button"
                  onClick={() => sendAction('half', { half })}
                  className={`px-2.5 py-1.5 text-[11px] font-mono font-extrabold rounded-lg border transition-colors ${
                    state.kabaddiHalf === half
                      ? 'bg-[#FACC15] text-black border-[#FACC15]'
                      : 'bg-[#171E29] text-zinc-300 border-white/12 hover:text-white'
                  }`}
                >
                  {half}
                </button>
              ))}
              <button
                type="button"
                onClick={() => updateState({ doOrDie: !state.doOrDie })}
                aria-pressed={state.doOrDie}
                className={`px-2.5 py-1.5 text-[11px] font-mono font-extrabold rounded-lg border transition-colors ${
                  state.doOrDie
                    ? 'bg-[#DC2626] text-white border-[#FACC15]'
                    : 'bg-[#171E29] text-zinc-300 border-white/12 hover:text-white'
                }`}
              >
                DO-OR-DIE
              </button>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {isTimeout ? (
                <button
                  type="button"
                  onClick={() => triggerTimeout(null)}
                  className="px-3 py-1.5 text-[11px] font-mono font-extrabold bg-[#3B9E6D] text-white rounded-lg"
                >
                  END TIMEOUT · RESUME
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => triggerTimeout('A')}
                    className="px-2.5 py-1.5 text-[11px] font-mono font-bold bg-[#27200D] hover:bg-[#362B10] border border-[#FACC15]/50 text-[#FDE047] rounded-lg"
                  >
                    T/O {state.teamACode || 'A'}
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerTimeout('B')}
                    className="px-2.5 py-1.5 text-[11px] font-mono font-bold bg-[#27200D] hover:bg-[#362B10] border border-[#FACC15]/50 text-[#FDE047] rounded-lg"
                  >
                    T/O {state.teamBCode || 'B'}
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerTimeout('OFFICIAL')}
                    className="px-2.5 py-1.5 text-[11px] font-mono font-bold bg-[#27200D] hover:bg-[#362B10] border border-[#FACC15]/50 text-[#FDE047] rounded-lg"
                  >
                    OFFICIAL T/O
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Match Status Quick Selector */}
          <div className="pt-2 border-t border-white/10 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-mono uppercase text-zinc-500 mr-1">Status:</span>
            {STATUS_OPTIONS.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => sendAction('status', { status: st })}
                className={`px-2 py-1 text-[10px] font-mono font-bold rounded-md border transition-colors ${
                  currentStatus === st
                    ? st === 'LIVE'
                      ? 'bg-[#16A34A] text-white border-[#4ADE80]'
                      : st === 'TIMEOUT'
                        ? 'bg-[#D97706] text-black border-[#FACC15]'
                        : 'bg-white text-black border-white'
                    : 'bg-[#151C26] text-zinc-400 border-white/10 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </section>

        {/* Dual Team Thumb-Friendly Scoring Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {(['A', 'B'] as const).map((side) => {
            const isA = side === 'A';
            const name = isA ? state.teamAName : state.teamBName;
            const code = isA ? state.teamACode : state.teamBCode;
            const color = isA ? state.teamAColor : state.teamBColor;
            const score = isA ? state.teamAScore : state.teamBScore;
            const raidPts = isA ? state.teamARaidPoints ?? 0 : state.teamBRaidPoints ?? 0;
            const bonusPts = isA ? state.teamABonusPoints ?? 0 : state.teamBBonusPoints ?? 0;
            const tacklePts = isA ? state.teamATacklePoints ?? 0 : state.teamBTacklePoints ?? 0;
            const logoUrl = isA ? state.teamALogoUrl : state.teamBLogoUrl;
            const yellowCards = isA ? state.teamAYellowCards : state.teamBYellowCards;
            const redCards = isA ? state.teamARedCards : state.teamBRedCards;
            const binRem = isA ? teamABinRemaining : teamBBinRemaining;

            return (
              <div
                key={side}
                className="bg-[#11161F] border border-white/12 rounded-2xl overflow-hidden flex flex-col"
              >
                <div className="h-2 w-full" style={{ backgroundColor: color }} aria-hidden="true" />
                <div className="p-3.5 space-y-3">
                  {/* Team Name & Live Score Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {logoUrl && (
                        <img
                          src={logoUrl}
                          alt={`${name} logo`}
                          className="w-9 h-9 rounded-full bg-white p-0.5 object-contain shrink-0"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            aria-label={isA ? 'Team A Name' : 'Team B Name'}
                            value={name}
                            onChange={(e) =>
                              updateState(isA ? { teamAName: e.target.value } : { teamBName: e.target.value })
                            }
                            placeholder={isA ? 'TEAM A' : 'TEAM B'}
                            className="w-full bg-transparent hover:bg-white/5 focus:bg-[#0B0F15] font-display font-extrabold text-base text-white rounded-md px-1.5 py-0.5 -ml-1.5 border border-transparent focus:border-[#FACC15] focus:outline-none truncate"
                          />
                          <Pencil className="w-3 h-3 text-zinc-500 shrink-0" aria-hidden="true" />
                        </div>
                        <p className="font-mono text-[10px] text-zinc-400">
                          RAID {raidPts} · BONUS {bonusPts} · TACKLE {tacklePts}
                        </p>
                      </div>
                    </div>

                    <span className="font-display font-black text-5xl text-white tabular-nums leading-none shrink-0">
                      {score}
                    </span>
                  </div>

                  {/* Primary Large Thumb Buttons: -1 / +1 */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => sendAction('score', { team: side, delta: -1 })}
                      className="py-4 bg-[#1A222E] hover:bg-[#232D3D] active:scale-[0.97] border border-white/12 text-white rounded-xl text-2xl font-black transition"
                    >
                      −1
                    </button>
                    <button
                      type="button"
                      onClick={() => sendAction('score', { team: side, delta: 1 })}
                      className="py-4 bg-[#3B9E6D] hover:bg-[#338C60] active:scale-[0.97] text-white rounded-xl text-2xl font-black transition shadow-md"
                    >
                      +1
                    </button>
                  </div>

                  {/* Kabaddi Specific Point Actions: Raid, Bonus, Tackle, S.Tackle, All Out, S.Raid */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => sendAction('raid', { team: side, points: 1 })}
                      className="py-2.5 px-1.5 bg-[#182230] hover:bg-[#212E40] active:scale-95 border border-white/10 rounded-xl text-center"
                    >
                      <span className="block text-xs font-extrabold text-white">Raid</span>
                      <span className="block text-[10px] font-mono text-[#4ADE80]">+1</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => sendAction('bonus', { team: side })}
                      className="py-2.5 px-1.5 bg-[#182230] hover:bg-[#212E40] active:scale-95 border border-white/10 rounded-xl text-center"
                    >
                      <span className="block text-xs font-extrabold text-white">Bonus</span>
                      <span className="block text-[10px] font-mono text-[#FACC15]">+1</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => sendAction('tackle', { team: side, points: 1 })}
                      className="py-2.5 px-1.5 bg-[#182230] hover:bg-[#212E40] active:scale-95 border border-white/10 rounded-xl text-center"
                    >
                      <span className="block text-xs font-extrabold text-white">Tackle</span>
                      <span className="block text-[10px] font-mono text-[#38BDF8]">+1</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => sendAction('tackle', { team: side, points: 2 })}
                      className="py-2.5 px-1.5 bg-[#182230] hover:bg-[#212E40] active:scale-95 border border-white/10 rounded-xl text-center"
                    >
                      <span className="block text-xs font-extrabold text-white">S. Tackle</span>
                      <span className="block text-[10px] font-mono text-[#38BDF8]">+2</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => sendAction('all_out', { team: side })}
                      className="py-2.5 px-1.5 bg-[#2A171A] hover:bg-[#3A1F24] active:scale-95 border border-[#EF4444]/40 rounded-xl text-center"
                    >
                      <span className="block text-xs font-extrabold text-white">All Out</span>
                      <span className="block text-[10px] font-mono text-[#FCA5A5]">+2</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => sendAction('raid', { team: side, points: 3 })}
                      className="py-2.5 px-1.5 bg-[#261F0E] hover:bg-[#352B13] active:scale-95 border border-[#FACC15]/40 rounded-xl text-center"
                    >
                      <span className="block text-xs font-extrabold text-white">S. Raid</span>
                      <span className="block text-[10px] font-mono text-[#FDE047]">+3</span>
                    </button>
                  </div>

                  {/* Cards + Sin Bin */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex items-center bg-[#18202C] border border-white/10 rounded-xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() =>
                          updateState(
                            isA
                              ? { teamAYellowCards: yellowCards + 1 }
                              : { teamBYellowCards: yellowCards + 1 }
                          )
                        }
                        className="flex-1 py-2 text-[11px] font-bold text-[#FACC15]"
                      >
                        Yel {yellowCards}
                      </button>
                      {yellowCards > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            updateState(isA ? { teamAYellowCards: 0 } : { teamBYellowCards: 0 })
                          }
                          aria-label="Clear yellow cards"
                          className="pr-1.5 text-zinc-400 hover:text-white"
                        >
                          <X className="w-3 h-3" aria-hidden="true" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center bg-[#18202C] border border-white/10 rounded-xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() =>
                          updateState(
                            isA ? { teamARedCards: redCards + 1 } : { teamBRedCards: redCards + 1 }
                          )
                        }
                        className="flex-1 py-2 text-[11px] font-bold text-[#FCA5A5]"
                      >
                        Red {redCards}
                      </button>
                      {redCards > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            updateState(isA ? { teamARedCards: 0 } : { teamBRedCards: 0 })
                          }
                          aria-label="Clear red cards"
                          className="pr-1.5 text-zinc-400 hover:text-white"
                        >
                          <X className="w-3 h-3" aria-hidden="true" />
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleSinBin(side)}
                      className={`py-2 px-1.5 rounded-xl border text-[11px] font-mono font-bold tabular-nums ${
                        binRem > 0
                          ? 'bg-[#2C210B] border-[#FACC15] text-[#FDE047]'
                          : 'bg-[#18202C] border-white/10 text-zinc-200'
                      }`}
                    >
                      {binRem > 0 ? formatClockMMSS(binRem) : 'Bin 2:00'}
                    </button>
                  </div>

                  {/* Collapsible Team Name / Code / Color / Logo Editor */}
                  {showTeamSettings && (
                    <div className="pt-2.5 border-t border-white/10 space-y-2">
                      <input
                        type="text"
                        value={name}
                        onChange={(e) =>
                          updateState(isA ? { teamAName: e.target.value } : { teamBName: e.target.value })
                        }
                        placeholder={isA ? 'Team A Name' : 'Team B Name'}
                        className="w-full px-3 py-2 text-xs bg-[#0B0F15] border border-white/15 rounded-lg text-white"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={code}
                          maxLength={5}
                          onChange={(e) =>
                            updateState(
                              isA
                                ? { teamACode: e.target.value.toUpperCase() }
                                : { teamBCode: e.target.value.toUpperCase() }
                            )
                          }
                          placeholder="CODE"
                          className="w-24 px-2.5 py-1.5 text-xs font-mono font-bold uppercase text-center bg-[#0B0F15] border border-white/15 rounded-lg text-white"
                        />
                        <label className="w-10 h-8 bg-[#0B0F15] border border-white/15 rounded-lg p-1 cursor-pointer">
                          <span className="block w-full h-full rounded" style={{ backgroundColor: color }} />
                          <input
                            type="color"
                            value={color}
                            onChange={(e) =>
                              updateState(
                                isA ? { teamAColor: e.target.value } : { teamBColor: e.target.value }
                              )
                            }
                            className="sr-only"
                          />
                        </label>
                        <label className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold bg-[#18202C] border border-white/15 rounded-lg text-zinc-200 cursor-pointer">
                          <ImagePlus className="w-3.5 h-3.5 text-[#FACC15]" aria-hidden="true" />
                          <span>Logo</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleUploadTeamLogo(side, e)}
                            className="sr-only"
                          />
                        </label>
                        {logoUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              updateState(isA ? { teamALogoUrl: '' } : { teamBLogoUrl: '' })
                            }
                            aria-label="Remove team logo"
                            className="p-1.5 bg-[#2A1418] border border-[#EF4444]/40 text-[#FCA5A5] rounded-lg"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </section>

        {/* Bottom Utility Bar: Undo/Redo, Edit Teams/Logos, Ticker, Swap, Reset */}
        <section className="bg-[#11161F] border border-white/10 rounded-2xl p-3.5 space-y-3">
          {/* Thumb-Friendly Undo / Redo Bar */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => sendAction('undo')}
              disabled={!canUndo}
              className="inline-flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-extrabold bg-[#18202C] hover:bg-[#232E3F] disabled:opacity-40 disabled:pointer-events-none border border-white/12 rounded-xl text-white transition"
            >
              <Undo2 className="w-4 h-4 text-[#FACC15]" aria-hidden="true" />
              <span>Undo {undoCount > 0 ? `(${undoCount})` : ''}</span>
            </button>
            <button
              type="button"
              onClick={() => sendAction('redo')}
              disabled={!canRedo}
              className="inline-flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-extrabold bg-[#18202C] hover:bg-[#232E3F] disabled:opacity-40 disabled:pointer-events-none border border-white/12 rounded-xl text-white transition"
            >
              <Redo2 className="w-4 h-4 text-[#38BDF8]" aria-hidden="true" />
              <span>Redo {redoCount > 0 ? `(${redoCount})` : ''}</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setShowTeamSettings((v) => !v)}
              className={`px-3 py-2 text-xs font-bold rounded-xl border transition-colors ${
                showTeamSettings
                  ? 'bg-[#FACC15] text-black border-[#FACC15]'
                  : 'bg-[#18202C] text-zinc-200 border-white/12'
              }`}
            >
              {showTeamSettings ? 'Hide Colors & Logos' : 'Team Colors, Codes & Logos'}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => sendAction('swap')}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-[#18202C] hover:bg-[#222D3D] border border-white/12 rounded-xl text-zinc-200"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Swap Sides</span>
              </button>

              {confirmReset ? (
                <div className="inline-flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      sendAction('reset');
                      setConfirmReset(false);
                    }}
                    className="px-3 py-2 text-xs font-extrabold bg-[#DC2626] text-white rounded-xl"
                  >
                    Confirm Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="px-2.5 py-2 text-xs bg-[#18202C] text-zinc-300 rounded-xl"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-[#18202C] hover:bg-[#2A181B] border border-white/12 rounded-xl text-zinc-200"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="rc-ticker" className="block text-[11px] text-zinc-400">
              Bottom Tournament Ticker (Optional)
            </label>
            <input
              id="rc-ticker"
              type="text"
              value={state.kabaddiSubtitle}
              onChange={(e) => updateState({ kabaddiSubtitle: e.target.value })}
              placeholder="Tournament name or venue..."
              className="w-full px-3 py-2 text-xs bg-[#0B0F15] border border-white/15 rounded-xl text-zinc-100 focus:outline-none focus:border-[#FACC15]"
            />
          </div>

          {controllerNames.length > 0 && (
            <p className="text-[11px] font-mono text-zinc-500">
              Connected controllers ({connectedControllers}): {controllerNames.join(', ')}
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
