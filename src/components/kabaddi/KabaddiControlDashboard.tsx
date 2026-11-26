import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowLeftRight,
  Check,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  Shield,
  Sparkles,
  Timer,
  Trophy,
  Tv,
  Undo2,
  Users,
  Zap,
} from 'lucide-react';
import { useKabaddiStore } from '../../hooks/useKabaddiStore';
import {
  computeLiveTimerSeconds,
  createInitialKabaddiState,
  formatClockMMSS,
  KABADDI_TEAM_PALETTES,
  KabaddiAlertType,
  KabaddiCardView,
  KabaddiHalf,
  KabaddiScoreboardState,
  KabaddiTeamColor,
  KabaddiTeamSide,
} from '../../types/kabaddi';
import { KabaddiOverlayCanvas } from './KabaddiOverlayCanvas';

interface KabaddiControlDashboardProps {
  uid: string;
  onBackHome?: () => void;
  embedded?: boolean;
  onToast?: (msg: string) => void;
}

const HALF_OPTIONS: KabaddiHalf[] = [
  '1ST HALF',
  'HALF TIME',
  '2ND HALF',
  'FULL TIME',
  'TIE BREAKER',
];

const TEAM_COLORS = Object.keys(KABADDI_TEAM_PALETTES) as KabaddiTeamColor[];

const ALERT_DURATION_MS = 4500;

async function copyClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback
  }
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

export function KabaddiControlDashboard({
  uid: rawUid,
  onBackHome,
  embedded = false,
  onToast,
}: KabaddiControlDashboardProps) {
  const { uid, state, syncing, canUndo, updateState, undo } = useKabaddiStore(rawUid, false);

  const [nowMs, setNowMs] = useState(() => Date.now());
  const [previewBg, setPreviewBg] = useState<'arena' | 'green' | 'transparent'>('arena');
  const [showPreview, setShowPreview] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [copiedType, setCopiedType] = useState<'normal' | 'green' | null>(null);
  const [localToast, setLocalToast] = useState<string | null>(null);

  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const [previewScale, setPreviewScale] = useState(0.6);

  const notify = (msg: string) => {
    if (onToast) {
      onToast(msg);
      return;
    }
    setLocalToast(msg);
    window.setTimeout(() => {
      setLocalToast((prev) => (prev === msg ? null : prev));
    }, 2400);
  };

  // Live ticker for control timers
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  // Auto-stop raid clock & match clock when they hit 0
  const liveMatchSec = computeLiveTimerSeconds(state.matchClock, nowMs);
  const liveRaidSec = computeLiveTimerSeconds(state.raidClock, nowMs);

  useEffect(() => {
    if (state.raidClock.running && liveRaidSec === 0) {
      updateState(
        (prev) => ({
          ...prev,
          raidClock: {
            ...prev.raidClock,
            remainingSec: 0,
            running: false,
            startedAtMs: null,
          },
        }),
        false
      );
    }
  }, [state.raidClock.running, liveRaidSec, updateState]);

  useEffect(() => {
    if (state.matchClock.running && liveMatchSec === 0) {
      updateState(
        (prev) => ({
          ...prev,
          matchClock: {
            ...prev.matchClock,
            remainingSec: 0,
            running: false,
            startedAtMs: null,
          },
        }),
        false
      );
    }
  }, [state.matchClock.running, liveMatchSec, updateState]);

  // Responsive 16:9 preview scaling
  useEffect(() => {
    const el = previewContainerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const updateScale = () => {
      const width = el.clientWidth;
      if (width > 0) {
        setPreviewScale(width / 1280);
      }
    };
    updateScale();
    const ro = new ResizeObserver(updateScale);
    ro.observe(el);
    return () => ro.disconnect();
  }, [showPreview]);

  const overlayUrl = useMemo(() => {
    const path = `/kabaddi-overlay?id=${encodeURIComponent(uid)}`;
    if (typeof window === 'undefined') return path;
    return `${window.location.origin}${path}`;
  }, [uid]);

  const greenOverlayUrl = `${overlayUrl}&bg=green`;

  const handleCopyLink = async (mode: 'normal' | 'green') => {
    const url = mode === 'green' ? greenOverlayUrl : overlayUrl;
    const ok = await copyClipboard(url);
    if (ok) {
      setCopiedType(mode);
      notify(
        mode === 'green'
          ? 'Green Screen Kabaddi Overlay URL copied!'
          : 'vMix / OBS Kabaddi Overlay URL copied!'
      );
      window.setTimeout(() => setCopiedType(null), 2000);
    }
  };

  // Helpers to trigger broadcast alerts (auto-hide after 4.5s)
  const buildAlert = (
    type: KabaddiAlertType,
    teamSide: KabaddiTeamSide | null,
    title: string,
    subtitle: string,
    pointsBadge?: string
  ) => {
    const now = Date.now();
    return {
      type,
      teamSide,
      title,
      subtitle,
      pointsBadge,
      triggeredAtMs: now,
      expiresAtMs: now + ALERT_DURATION_MS,
    };
  };

  const triggerManualAlert = (
    type: KabaddiAlertType,
    side: KabaddiTeamSide | null = null
  ) => {
    updateState((prev) => {
      if (type === 'NONE') {
        return { ...prev, alert: null };
      }
      const teamName =
        side === 'A'
          ? prev.teamA.name
          : side === 'B'
            ? prev.teamB.name
            : `${prev.teamA.shortName} VS ${prev.teamB.shortName}`;

      const map: Record<
        Exclude<KabaddiAlertType, 'NONE'>,
        { title: string; subtitle: string; badge?: string }
      > = {
        SUPER_RAID: { title: 'SUPER RAID!', subtitle: teamName, badge: '3+ PTS' },
        SUPER_TACKLE: { title: 'SUPER TACKLE!', subtitle: teamName, badge: '+2 PTS' },
        ALL_OUT: { title: 'ALL OUT!', subtitle: teamName, badge: '+2 BONUS' },
        BONUS: { title: 'BONUS POINT!', subtitle: teamName, badge: '+1 PT' },
        DO_OR_DIE: { title: 'DO OR DIE RAID!', subtitle: teamName, badge: '3RD RAID' },
        TIME_OUT: { title: 'TIME OUT', subtitle: teamName, badge: 'OFFICIAL' },
        TV_REVIEW: { title: 'TV UMPIRE REVIEW', subtitle: prev.matchLabel, badge: 'PENDING' },
        HALF_TIME: {
          title: 'HALF TIME',
          subtitle: `${prev.teamA.shortName} ${prev.teamA.score} - ${prev.teamB.score} ${prev.teamB.shortName}`,
        },
        FULL_TIME: {
          title: 'FULL TIME',
          subtitle: `${prev.teamA.shortName} ${prev.teamA.score} - ${prev.teamB.score} ${prev.teamB.shortName}`,
        },
      };

      const cfg = map[type];
      return {
        ...prev,
        alert: buildAlert(type, side, cfg.title, cfg.subtitle, cfg.badge),
      };
    }, false);
  };

  // Scoring actions
  const addTeamPoints = (
    side: KabaddiTeamSide,
    points: number,
    kind: 'raid' | 'tackle' | 'bonus' | 'adjust',
    autoAlert?: KabaddiAlertType
  ) => {
    updateState((prev) => {
      const teamKey = side === 'A' ? 'teamA' : 'teamB';
      const oppKey = side === 'A' ? 'teamB' : 'teamA';
      const team = prev[teamKey];
      const opp = prev[oppKey];

      const nextScore = Math.max(0, team.score + points);
      const nextTeam = {
        ...team,
        score: nextScore,
        raidPoints: kind === 'raid' ? Math.max(0, team.raidPoints + points) : team.raidPoints,
        tacklePoints:
          kind === 'tackle' ? Math.max(0, team.tacklePoints + points) : team.tacklePoints,
        bonusPoints:
          kind === 'bonus' ? Math.max(0, team.bonusPoints + points) : team.bonusPoints,
        // Scoring a point resets empty raids counter for that team
        emptyRaids: points > 0 && kind === 'raid' ? 0 : team.emptyRaids,
        // Revive players on mat for raid/tackle points (up to 7)
        playersOnMat:
          points > 0 && (kind === 'raid' || kind === 'tackle')
            ? Math.min(7, team.playersOnMat + (kind === 'tackle' ? 1 : points))
            : team.playersOnMat,
      };

      // Reduce opponent players on mat when raid or tackle succeeds
      let nextOppPlayers = opp.playersOnMat;
      if (points > 0 && kind === 'raid') {
        nextOppPlayers = Math.max(0, opp.playersOnMat - points);
      } else if (points > 0 && kind === 'tackle') {
        nextOppPlayers = Math.max(0, opp.playersOnMat - 1);
      }

      const nextOpp = {
        ...opp,
        playersOnMat: nextOppPlayers,
      };

      let nextAlert = prev.alert;
      if (autoAlert === 'SUPER_RAID') {
        nextAlert = buildAlert('SUPER_RAID', side, 'SUPER RAID!', team.name, `+${points} PTS`);
      } else if (autoAlert === 'SUPER_TACKLE') {
        nextAlert = buildAlert('SUPER_TACKLE', side, 'SUPER TACKLE!', team.name, '+2 PTS');
      } else if (autoAlert === 'BONUS') {
        nextAlert = buildAlert('BONUS', side, 'BONUS POINT!', team.name, '+1 PT');
      }

      return {
        ...prev,
        [teamKey]: nextTeam,
        [oppKey]: nextOpp,
        alert: nextAlert,
      };
    });
  };

  // Trigger ALL OUT on defending team -> awards +2 to opposing team & resets defending team to 7 players
  const handleAllOutOnTeam = (defendingSide: KabaddiTeamSide) => {
    updateState((prev) => {
      const defKey = defendingSide === 'A' ? 'teamA' : 'teamB';
      const attKey = defendingSide === 'A' ? 'teamB' : 'teamA';
      const defending = prev[defKey];
      const attacking = prev[attKey];

      return {
        ...prev,
        [defKey]: {
          ...defending,
          playersOnMat: 7,
        },
        [attKey]: {
          ...attacking,
          score: attacking.score + 2,
          allOuts: attacking.allOuts + 1,
        },
        alert: buildAlert(
          'ALL_OUT',
          defendingSide === 'A' ? 'B' : 'A',
          'ALL OUT!',
          `${attacking.name} +2 POINTS`,
          '+2 ALL OUT'
        ),
      };
    });
  };

  const adjustMatPlayers = (side: KabaddiTeamSide, delta: number, exact?: number) => {
    updateState((prev) => {
      const key = side === 'A' ? 'teamA' : 'teamB';
      const nextCount =
        typeof exact === 'number'
          ? exact
          : Math.max(0, Math.min(7, prev[key].playersOnMat + delta));
      return {
        ...prev,
        [key]: { ...prev[key], playersOnMat: nextCount },
      };
    });
  };

  const handleEmptyRaid = (side: KabaddiTeamSide) => {
    updateState((prev) => {
      const key = side === 'A' ? 'teamA' : 'teamB';
      const nextEmpty = (prev[key].emptyRaids + 1) % 3;
      const triggerDoOrDie = nextEmpty === 2;
      return {
        ...prev,
        raidingTeam: side === 'A' ? 'B' : 'A',
        [key]: { ...prev[key], emptyRaids: nextEmpty },
        raidClock: {
          durationSec: 30,
          remainingSec: 30,
          running: false,
          startedAtMs: null,
        },
        alert: triggerDoOrDie
          ? buildAlert(
              'DO_OR_DIE',
              side,
              'DO OR DIE NEXT!',
              `${prev[key].name} · 2 EMPTY RAIDS`,
              'DO OR DIE'
            )
          : prev.alert,
      };
    });
  };

  const handleUseTimeout = (side: KabaddiTeamSide) => {
    updateState((prev) => {
      const key = side === 'A' ? 'teamA' : 'teamB';
      const remaining = Math.max(0, prev[key].timeoutsLeft - 1);
      const currentMatchSec = computeLiveTimerSeconds(prev.matchClock);
      return {
        ...prev,
        [key]: { ...prev[key], timeoutsLeft: remaining },
        matchClock: {
          ...prev.matchClock,
          remainingSec: currentMatchSec,
          running: false,
          startedAtMs: null,
        },
        raidClock: {
          ...prev.raidClock,
          remainingSec: computeLiveTimerSeconds(prev.raidClock),
          running: false,
          startedAtMs: null,
        },
        alert: buildAlert('TIME_OUT', side, 'TIME OUT', prev[key].name, `${remaining} LEFT`),
      };
    });
  };

  // Match Clock controls
  const toggleMatchClock = () => {
    updateState((prev) => {
      const now = Date.now();
      if (prev.matchClock.running) {
        return {
          ...prev,
          matchClock: {
            ...prev.matchClock,
            remainingSec: computeLiveTimerSeconds(prev.matchClock, now),
            running: false,
            startedAtMs: null,
          },
        };
      }
      return {
        ...prev,
        matchClock: {
          ...prev.matchClock,
          running: true,
          startedAtMs: now,
        },
      };
    }, false);
  };

  const setMatchClockSeconds = (seconds: number, updateDuration = false) => {
    const safe = Math.max(0, Math.min(60 * 60, seconds));
    updateState(
      (prev) => ({
        ...prev,
        matchClock: {
          durationSec: updateDuration ? safe : prev.matchClock.durationSec,
          remainingSec: safe,
          running: false,
          startedAtMs: null,
        },
      }),
      false
    );
  };

  // Raid 30s Clock controls
  const toggleRaidClock = () => {
    updateState((prev) => {
      const now = Date.now();
      if (prev.raidClock.running) {
        return {
          ...prev,
          raidClock: {
            ...prev.raidClock,
            remainingSec: computeLiveTimerSeconds(prev.raidClock, now),
            running: false,
            startedAtMs: null,
          },
        };
      }
      const startFrom = prev.raidClock.remainingSec > 0 ? prev.raidClock.remainingSec : 30;
      return {
        ...prev,
        raidClock: {
          durationSec: 30,
          remainingSec: startFrom,
          running: true,
          startedAtMs: now,
        },
      };
    }, false);
  };

  const resetAndStartRaid = (autoStart = true, switchSide = false) => {
    updateState((prev) => {
      const now = Date.now();
      const nextSide: KabaddiTeamSide =
        switchSide
          ? prev.raidingTeam === 'A'
            ? 'B'
            : 'A'
          : prev.raidingTeam || 'A';
      const raidingTeamObj = nextSide === 'A' ? prev.teamA : prev.teamB;
      const isDoOrDie = raidingTeamObj.emptyRaids >= 2;
      return {
        ...prev,
        raidingTeam: nextSide,
        raidClock: {
          durationSec: 30,
          remainingSec: 30,
          running: autoStart,
          startedAtMs: autoStart ? now : null,
        },
        alert:
          isDoOrDie && autoStart
            ? buildAlert(
                'DO_OR_DIE',
                nextSide,
                'DO OR DIE RAID!',
                raidingTeamObj.name,
                '3RD RAID'
              )
            : prev.alert,
      };
    }, false);
  };

  const handleSwapSides = () => {
    updateState((prev) => ({
      ...prev,
      teamA: prev.teamB,
      teamB: prev.teamA,
      raidingTeam: prev.raidingTeam === 'A' ? 'B' : prev.raidingTeam === 'B' ? 'A' : null,
    }));
    notify('Swapped Team A and Team B sides.');
  };

  const handleResetMatch = () => {
    updateState((prev) => {
      const fresh = createInitialKabaddiState(uid);
      return {
        ...fresh,
        tournamentName: prev.tournamentName,
        matchLabel: prev.matchLabel,
        tickerText: prev.tickerText,
        teamA: {
          ...fresh.teamA,
          name: prev.teamA.name,
          shortName: prev.teamA.shortName,
          color: prev.teamA.color,
        },
        teamB: {
          ...fresh.teamB,
          name: prev.teamB.name,
          shortName: prev.teamB.shortName,
          color: prev.teamB.color,
        },
      };
    });
    setConfirmReset(false);
    notify('Kabaddi match scores & timers reset to 0-0.');
  };

  const renderTeamControlCard = (side: KabaddiTeamSide) => {
    const team = side === 'A' ? state.teamA : state.teamB;
    const palette = KABADDI_TEAM_PALETTES[team.color] || KABADDI_TEAM_PALETTES.crimson;
    const isRaiding = state.raidingTeam === side;
    const superTackleOn = team.playersOnMat > 0 && team.playersOnMat <= 3;

    return (
      <div className="rounded-2xl wo-card overflow-hidden flex flex-col text-slate-900">
        {/* Team Header */}
        <div
          className="px-4 py-3 border-b border-white/20 flex items-center justify-between gap-2"
          style={{ background: palette.bgGradient }}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-black/35 border border-white/40 font-mono text-[11px] font-black text-white">
                {team.shortName}
              </span>
              <h3 className="font-display text-base sm:text-lg font-black text-white uppercase truncate">
                {team.name}
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px] font-mono font-bold text-white/90">
              <span>RAID: {team.raidPoints}</span>
              <span>·</span>
              <span>TACKLE: {team.tacklePoints}</span>
              <span>·</span>
              <span>ALL OUT: {team.allOuts}</span>
              <span>·</span>
              <span>BONUS: {team.bonusPoints}</span>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="block font-mono text-4xl sm:text-5xl font-black text-white leading-none tabular-nums drop-shadow">
              {String(team.score).padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* Body Controls */}
        <div className="p-3.5 sm:p-4 space-y-3.5 flex-1">
          {/* Raiding Status & Players on Mat */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200">
            <button
              type="button"
              onClick={() =>
                updateState((prev) => ({ ...prev, raidingTeam: side }), false)
              }
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wide transition-all ${
                isRaiding ? 'wo-btn-active' : 'wo-btn-secondary'
              }`}
            >
              {isRaiding ? '● Raiding Now' : 'Set Raiding'}
            </button>

            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#FF8C00]" aria-hidden="true" />
              <span className="text-[11px] font-bold text-slate-600">Mat:</span>
              <button
                type="button"
                onClick={() => adjustMatPlayers(side, -1)}
                className="w-7 h-7 rounded-lg wo-btn-secondary font-mono font-black text-sm flex items-center justify-center"
                aria-label={`Remove player from ${team.name}`}
              >
                -
              </button>
              <span
                className={`px-2 py-0.5 rounded-md font-mono text-xs font-black tabular-nums ${
                  superTackleOn
                    ? 'bg-[#FF8C00] text-white'
                    : 'bg-slate-100 border border-slate-200 text-slate-900'
                }`}
              >
                {team.playersOnMat}/7
              </span>
              <button
                type="button"
                onClick={() => adjustMatPlayers(side, 1)}
                className="w-7 h-7 rounded-lg wo-btn-secondary font-mono font-black text-sm flex items-center justify-center"
                aria-label={`Revive player for ${team.name}`}
              >
                +
              </button>
              <button
                type="button"
                onClick={() => adjustMatPlayers(side, 0, 7)}
                className="px-2 h-7 rounded-lg wo-btn-secondary font-mono text-[10px] font-black"
              >
                7
              </button>
            </div>
          </div>

          {superTackleOn && (
            <div className="rounded-lg bg-[#FFF3E0] border border-[#FF8C00]/50 px-3 py-1.5 text-[11px] font-mono font-black text-[#E87500] uppercase flex items-center justify-between">
              <span>SUPER TACKLE ON ({team.playersOnMat} PLAYERS)</span>
              <Shield className="w-3.5 h-3.5" aria-hidden="true" />
            </div>
          )}

          {/* Primary Point Buttons */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => addTeamPoints(side, 1, 'raid')}
              className="min-h-[46px] px-2 py-2 rounded-xl wo-btn-secondary font-display font-black text-xs sm:text-sm flex flex-col items-center justify-center leading-tight"
            >
              <span className="text-[#FF8C00] text-base font-mono">+1</span>
              <span className="text-[10px] uppercase">Raid Pt</span>
            </button>
            <button
              type="button"
              onClick={() => addTeamPoints(side, 2, 'raid')}
              className="min-h-[46px] px-2 py-2 rounded-xl wo-btn-secondary font-display font-black text-xs sm:text-sm flex flex-col items-center justify-center leading-tight"
            >
              <span className="text-[#FF8C00] text-base font-mono">+2</span>
              <span className="text-[10px] uppercase">Raid Pts</span>
            </button>
            <button
              type="button"
              onClick={() => addTeamPoints(side, 3, 'raid', 'SUPER_RAID')}
              className="min-h-[46px] px-2 py-2 rounded-xl wo-btn-primary text-white font-display font-black text-xs sm:text-sm flex flex-col items-center justify-center leading-tight"
            >
              <span className="text-base font-mono">+3</span>
              <span className="text-[10px] uppercase">Super Raid</span>
            </button>

            <button
              type="button"
              onClick={() => addTeamPoints(side, 1, 'tackle')}
              className="min-h-[46px] px-2 py-2 rounded-xl wo-btn-secondary font-display font-black text-xs sm:text-sm flex flex-col items-center justify-center leading-tight"
            >
              <span className="text-[#FF8C00] text-base font-mono">+1</span>
              <span className="text-[10px] uppercase">Tackle</span>
            </button>
            <button
              type="button"
              onClick={() => addTeamPoints(side, 2, 'tackle', 'SUPER_TACKLE')}
              className="min-h-[46px] px-2 py-2 rounded-xl wo-btn-active font-display font-black text-xs sm:text-sm flex flex-col items-center justify-center leading-tight"
            >
              <span className="text-base font-mono">+2</span>
              <span className="text-[10px] uppercase">Super Tackle</span>
            </button>
            <button
              type="button"
              onClick={() => addTeamPoints(side, 1, 'bonus', 'BONUS')}
              className="min-h-[46px] px-2 py-2 rounded-xl wo-btn-secondary font-display font-black text-xs sm:text-sm flex flex-col items-center justify-center leading-tight"
            >
              <span className="text-[#FF8C00] text-base font-mono">+1</span>
              <span className="text-[10px] uppercase">Bonus</span>
            </button>
          </div>

          {/* All Out, Empty Raid, Timeout, -1 Adjust */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleAllOutOnTeam(side)}
              className="min-h-[40px] px-2.5 py-2 rounded-xl wo-btn-primary text-white font-display font-black text-[11px] uppercase tracking-wide"
            >
              All Out (+2 Opp)
            </button>
            <button
              type="button"
              onClick={() => handleEmptyRaid(side)}
              className={`min-h-[40px] px-2.5 py-2 rounded-xl font-display font-extrabold text-[11px] uppercase ${
                team.emptyRaids >= 2
                  ? 'bg-[#DC2626] text-white border border-red-700 animate-pulse'
                  : 'wo-btn-secondary'
              }`}
            >
              {team.emptyRaids >= 2
                ? 'DO OR DIE!'
                : `Empty Raid (${team.emptyRaids}/2)`}
            </button>
            <button
              type="button"
              onClick={() => handleUseTimeout(side)}
              disabled={team.timeoutsLeft <= 0}
              className="min-h-[40px] px-2.5 py-2 rounded-xl wo-btn-secondary disabled:opacity-45 font-display font-bold text-[11px] uppercase"
            >
              Timeout ({team.timeoutsLeft})
            </button>
            <button
              type="button"
              onClick={() => addTeamPoints(side, -1, 'adjust')}
              className="min-h-[40px] px-2.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-mono font-black text-xs"
            >
              -1 Score
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className={
        embedded
          ? 'space-y-5 text-slate-900'
          : 'min-h-screen py-5 sm:py-8 px-3 sm:px-6 lg:px-8 text-slate-900'
      }
    >
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Top Action Bar */}
        <div className="rounded-2xl wo-card overflow-hidden">
          <div className="wo-header px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {onBackHome && !embedded && (
                <button
                  type="button"
                  onClick={onBackHome}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 border border-white/35 text-xs font-bold text-white"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-white" aria-hidden="true" />
                  <span>Home</span>
                </button>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-white shrink-0" aria-hidden="true" />
                  <h1 className="font-display text-base sm:text-xl font-black text-white uppercase tracking-wide truncate">
                    Kabaddi Live Scoreboard &amp; Control
                  </h1>
                </div>
                <p className="font-mono text-[11px] text-orange-100">
                  Room ID: {uid} · {syncing ? 'Syncing live...' : 'Real-Time Sync Ready (OBS / vMix)'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={undo}
                disabled={!canUndo}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-orange-50 disabled:opacity-45 text-[#E87500] text-xs font-bold shadow-xs"
              >
                <Undo2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Undo</span>
              </button>

              <button
                type="button"
                onClick={handleSwapSides}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-orange-50 text-[#E87500] text-xs font-bold shadow-xs"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Swap Sides</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSetup((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs ${
                  showSetup
                    ? 'bg-slate-900 text-white'
                    : 'bg-white hover:bg-orange-50 text-[#E87500]'
                }`}
              >
                <Settings2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Team &amp; Match Setup</span>
              </button>
            </div>
          </div>

          {/* vMix / OBS Overlay Link Bar */}
          <div className="p-3.5 sm:px-6 sm:py-3.5 bg-[#FFF8F0] border-t border-[#FF8C00]/20 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Tv className="w-4 h-4 text-[#FF8C00] shrink-0" aria-hidden="true" />
              <span className="text-xs font-bold text-slate-700 shrink-0">vMix / OBS URL:</span>
              <code className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-mono text-[11px] text-[#E87500] truncate max-w-full">
                {overlayUrl}
              </code>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void handleCopyLink('normal')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg wo-btn-primary text-white font-display font-black text-xs"
              >
                {copiedType === 'normal' ? (
                  <Check className="w-3.5 h-3.5" aria-hidden="true" />
                ) : (
                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                )}
                <span>{copiedType === 'normal' ? 'Copied!' : 'Copy Overlay Link'}</span>
              </button>

              <button
                type="button"
                onClick={() => void handleCopyLink('green')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-display font-bold text-xs shadow-xs"
              >
                {copiedType === 'green' ? (
                  <Check className="w-3.5 h-3.5" aria-hidden="true" />
                ) : (
                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                )}
                <span>Green Screen Link</span>
              </button>

              <a
                href={overlayUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg wo-btn-secondary text-xs font-bold"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#FF8C00]" aria-hidden="true" />
                <span>Open Overlay</span>
              </a>

              <button
                type="button"
                onClick={() => setShowPreview((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg wo-btn-secondary text-xs font-bold"
              >
                {showPreview ? (
                  <EyeOff className="w-3.5 h-3.5 text-[#FF8C00]" aria-hidden="true" />
                ) : (
                  <Eye className="w-3.5 h-3.5 text-[#FF8C00]" aria-hidden="true" />
                )}
                <span>{showPreview ? 'Hide Preview' : 'Show Preview'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Collapsible Team & Match Setup Editor */}
        {showSetup && (
          <div className="rounded-2xl wo-card p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
              <h2 className="font-display text-sm font-black uppercase tracking-wider text-[#E87500]">
                Tournament, Team Names &amp; Colors
              </h2>
              {!confirmReset ? (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-xs font-bold text-red-600"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Reset Match to 0-0</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-red-600">Reset scores &amp; timers?</span>
                  <button
                    type="button"
                    onClick={handleResetMatch}
                    className="px-3 py-1 rounded-lg bg-[#DC2626] text-white text-xs font-black"
                  >
                    Yes, Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="px-3 py-1 rounded-lg wo-btn-secondary text-xs font-bold"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600 uppercase">
                  Tournament Name
                </label>
                <input
                  type="text"
                  value={state.tournamentName}
                  onChange={(e) =>
                    updateState((prev) => ({ ...prev, tournamentName: e.target.value }), false)
                  }
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 focus:border-[#FF8C00] focus:ring-2 focus:ring-[#FF8C00]/25 focus:outline-none text-xs text-slate-900"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600 uppercase">
                  Match Label
                </label>
                <input
                  type="text"
                  value={state.matchLabel}
                  onChange={(e) =>
                    updateState((prev) => ({ ...prev, matchLabel: e.target.value }), false)
                  }
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 focus:border-[#FF8C00] focus:ring-2 focus:ring-[#FF8C00]/25 focus:outline-none text-xs text-slate-900"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600 uppercase">
                  Bottom Ticker Text
                </label>
                <input
                  type="text"
                  value={state.tickerText}
                  onChange={(e) =>
                    updateState((prev) => ({ ...prev, tickerText: e.target.value }), false)
                  }
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 focus:border-[#FF8C00] focus:ring-2 focus:ring-[#FF8C00]/25 focus:outline-none text-xs text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {(['A', 'B'] as const).map((side) => {
                const key = side === 'A' ? 'teamA' : 'teamB';
                const team = state[key];
                return (
                  <div
                    key={side}
                    className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-2.5"
                  >
                    <p className="text-xs font-black uppercase tracking-wider text-[#E87500]">
                      Team {side} Details
                    </p>
                    <div className="grid grid-cols-[1fr_92px] gap-2">
                      <input
                        type="text"
                        value={team.name}
                        onChange={(e) =>
                          updateState(
                            (prev) => ({
                              ...prev,
                              [key]: { ...prev[key], name: e.target.value },
                            }),
                            false
                          )
                        }
                        placeholder={`Team ${side} Name`}
                        className="px-3 py-2 rounded-lg bg-white border border-slate-300 focus:border-[#FF8C00] focus:outline-none text-xs font-bold text-slate-900 uppercase"
                      />
                      <input
                        type="text"
                        maxLength={4}
                        value={team.shortName}
                        onChange={(e) =>
                          updateState(
                            (prev) => ({
                              ...prev,
                              [key]: {
                                ...prev[key],
                                shortName: e.target.value.toUpperCase().slice(0, 4),
                              },
                            }),
                            false
                          )
                        }
                        placeholder="CODE"
                        className="px-3 py-2 rounded-lg bg-white border border-slate-300 focus:border-[#FF8C00] focus:outline-none text-xs font-mono font-black text-[#E87500] uppercase text-center"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {TEAM_COLORS.map((colorId) => {
                        const pal = KABADDI_TEAM_PALETTES[colorId];
                        const active = team.color === colorId;
                        return (
                          <button
                            key={colorId}
                            type="button"
                            onClick={() =>
                              updateState(
                                (prev) => ({
                                  ...prev,
                                  [key]: { ...prev[key], color: colorId },
                                }),
                                false
                              )
                            }
                            title={pal.label}
                            className={`px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1.5 border ${
                              active
                                ? 'border-[#FF8C00] bg-[#FFF3E0] text-[#E87500]'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-[#FF8C00]/50'
                            }`}
                          >
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: pal.swatch }}
                            />
                            <span>{pal.label.split(' ')[0]}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* LIVE 16:9 BROADCAST PREVIEW */}
        {showPreview && (
          <div className="rounded-2xl wo-card overflow-hidden">
            <div className="px-4 py-2.5 wo-header flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="font-mono text-xs font-black uppercase tracking-wider text-white">
                  LIVE BROADCAST PREVIEW (1920×1080 / 1280×720)
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {(['arena', 'green', 'transparent'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPreviewBg(mode)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition-colors ${
                      previewBg === mode
                        ? 'bg-white text-[#E87500] shadow-xs'
                        : 'bg-white/15 hover:bg-white/25 text-white border border-white/25'
                    }`}
                  >
                    {mode === 'arena' ? 'Arena BG' : mode === 'green' ? 'Green Screen' : 'Transparent'}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 sm:p-4 bg-slate-900">
              <div
                ref={previewContainerRef}
                className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-700 shadow-2xl"
                style={
                  previewBg === 'transparent'
                    ? {
                        backgroundImage:
                          'linear-gradient(45deg, #1b1b26 25%, transparent 25%), linear-gradient(-45deg, #1b1b26 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1b1b26 75%), linear-gradient(-45deg, transparent 75%, #1b1b26 75%)',
                        backgroundSize: '20px 20px',
                        backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                        backgroundColor: '#11111a',
                      }
                    : undefined
                }
              >
                <div
                  style={{
                    width: '1280px',
                    height: '720px',
                    transform: `scale(${previewScale})`,
                    transformOrigin: 'top left',
                  }}
                >
                  <KabaddiOverlayCanvas state={state} bgMode={previewBg} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TIMERS CONSOLE: MATCH CLOCK + 30s RAID TIMER */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Match Clock Panel */}
          <div className="rounded-2xl wo-card overflow-hidden">
            <div className="wo-header px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Timer className="w-4 h-4 text-white" aria-hidden="true" />
                <span className="font-display text-xs font-black uppercase tracking-wider text-white">
                  Match Clock &amp; Half Control
                </span>
              </div>
              <span className="px-2 py-0.5 rounded bg-white/20 border border-white/35 font-mono text-[10px] font-black text-white">
                {state.half}
              </span>
            </div>

            <div className="p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="font-mono text-4xl sm:text-5xl font-black text-[#FF8C00] tabular-nums">
                  {formatClockMMSS(liveMatchSec)}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleMatchClock}
                    className={`min-h-[42px] px-4 py-2 rounded-xl font-display font-black text-xs uppercase inline-flex items-center gap-1.5 ${
                      state.matchClock.running
                        ? 'bg-red-600 hover:bg-red-700 text-white shadow-xs'
                        : 'wo-btn-primary text-white'
                    }`}
                  >
                    {state.matchClock.running ? (
                      <>
                        <Pause className="w-4 h-4" aria-hidden="true" />
                        <span>Pause Clock</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" aria-hidden="true" />
                        <span>Start Clock</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMatchClockSeconds(state.matchClock.durationSec)}
                    className="min-h-[42px] px-3 py-2 rounded-xl wo-btn-secondary text-xs font-bold inline-flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-[#FF8C00]" aria-hidden="true" />
                    <span>Reset</span>
                  </button>
                </div>
              </div>

              {/* Quick Time Presets & Fine Adjust */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[10, 15, 20].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setMatchClockSeconds(mins * 60, true)}
                    className="px-2.5 py-1 rounded-lg wo-btn-secondary font-mono text-[11px] font-bold"
                  >
                    {mins}:00
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setMatchClockSeconds(liveMatchSec + 10)}
                  className="px-2.5 py-1 rounded-lg wo-btn-secondary font-mono text-[11px] font-bold"
                >
                  +10s
                </button>
                <button
                  type="button"
                  onClick={() => setMatchClockSeconds(liveMatchSec - 10)}
                  className="px-2.5 py-1 rounded-lg wo-btn-secondary font-mono text-[11px] font-bold"
                >
                  -10s
                </button>
              </div>

              {/* Half Selector */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {HALF_OPTIONS.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() =>
                      updateState((prev) => {
                        if (h === 'FULL TIME') {
                          return {
                            ...prev,
                            half: h,
                            matchClock: {
                              ...prev.matchClock,
                              remainingSec: computeLiveTimerSeconds(prev.matchClock),
                              running: false,
                              startedAtMs: null,
                            },
                            raidClock: {
                              ...prev.raidClock,
                              remainingSec: computeLiveTimerSeconds(prev.raidClock),
                              running: false,
                              startedAtMs: null,
                            },
                          };
                        }
                        return { ...prev, half: h };
                      }, false)
                    }
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold uppercase ${
                      state.half === h
                        ? 'wo-btn-active'
                        : h === 'FULL TIME'
                          ? 'wo-btn-soft'
                          : 'wo-btn-secondary'
                    }`}
                  >
                    {h === 'FULL TIME' ? '🏆 Full Time (Show Winner)' : h}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 30-Second Raid Timer Panel */}
          <div className="rounded-2xl wo-card overflow-hidden">
            <div className="wo-header px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-white" aria-hidden="true" />
                <span className="font-display text-xs font-black uppercase tracking-wider text-white">
                  30-Second Raid Timer
                </span>
              </div>
              <span className="font-mono text-[11px] font-black text-orange-100">
                Raiding:{' '}
                {state.raidingTeam === 'A'
                  ? state.teamA.shortName
                  : state.raidingTeam === 'B'
                    ? state.teamB.shortName
                    : 'NONE'}
              </span>
            </div>

            <div className="p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div
                  className={`px-4 py-1.5 rounded-xl font-mono text-4xl sm:text-5xl font-black tabular-nums border-2 ${
                    liveRaidSec <= 10 && state.raidClock.running
                      ? 'bg-[#DC2626] border-red-700 text-white animate-pulse'
                      : 'bg-[#FFF3E0] border-[#FF8C00]/45 text-[#E87500]'
                  }`}
                >
                  {String(liveRaidSec).padStart(2, '0')}s
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleRaidClock}
                    className={`min-h-[42px] px-4 py-2 rounded-xl font-display font-black text-xs uppercase inline-flex items-center gap-1.5 ${
                      state.raidClock.running
                        ? 'bg-red-600 hover:bg-red-700 text-white shadow-xs'
                        : 'wo-btn-primary text-white'
                    }`}
                  >
                    {state.raidClock.running ? (
                      <>
                        <Pause className="w-4 h-4" aria-hidden="true" />
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" aria-hidden="true" />
                        <span>Start 30s</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => resetAndStartRaid(true, false)}
                    className="min-h-[42px] px-3.5 py-2 rounded-xl wo-btn-secondary text-xs font-bold inline-flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-[#FF8C00]" aria-hidden="true" />
                    <span>Fresh 30s</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => resetAndStartRaid(true, true)}
                  className="flex-1 min-h-[40px] px-3 py-2 rounded-xl wo-btn-primary text-white font-display font-black text-xs uppercase inline-flex items-center justify-center gap-1.5"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5 text-white" aria-hidden="true" />
                  <span>Next Raid (Switch Side + Start 30s)</span>
                </button>
                <button
                  type="button"
                  onClick={() => resetAndStartRaid(false, false)}
                  className="min-h-[40px] px-3 py-2 rounded-xl wo-btn-secondary text-xs font-bold"
                >
                  Reset 30s
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* SIDE-BY-SIDE TEAM SCORING PANELS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {renderTeamControlCard('A')}
          {renderTeamControlCard('B')}
        </div>

        {/* BROADCAST OVERLAY CARDS & ANIMATED ALERTS (MUTUALLY EXCLUSIVE + AUTO-HIDE) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Broadcast Graphics & Cards */}
          <div className="rounded-2xl wo-card overflow-hidden">
            <div className="wo-header px-4 py-2.5 flex items-center justify-between">
              <span className="font-display text-xs font-black uppercase tracking-wider text-white">
                Broadcast Overlay Graphics
              </span>
              <span className="font-mono text-[10px] font-bold text-orange-100">
                1 Active at a Time
              </span>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    updateState(
                      (prev) => ({ ...prev, showScoreboard: !prev.showScoreboard }),
                      false
                    )
                  }
                  className={`min-h-[42px] px-3 py-2 rounded-xl text-xs font-extrabold uppercase ${
                    state.showScoreboard ? 'wo-btn-active' : 'wo-btn-secondary'
                  }`}
                >
                  Score Bar: {state.showScoreboard ? 'ON' : 'OFF'}
                </button>

                {(
                  [
                    { id: 'NONE', label: 'Live Match' },
                    { id: 'VERSUS', label: 'Match VS Card' },
                    { id: 'SUMMARY', label: 'Match Summary' },
                  ] as Array<{ id: KabaddiCardView; label: string }>
                ).map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() =>
                      updateState(
                        (prev) => ({
                          ...prev,
                          activeCard: prev.activeCard === card.id ? 'NONE' : card.id,
                        }),
                        false
                      )
                    }
                    className={`min-h-[42px] px-3 py-2 rounded-xl text-xs font-extrabold uppercase ${
                      state.activeCard === card.id ? 'wo-btn-active' : 'wo-btn-secondary'
                    }`}
                  >
                    {card.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Animated Pop-Up Alerts (Auto-Hide after 4.5s) */}
          <div className="rounded-2xl wo-card overflow-hidden">
            <div className="wo-header px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-white" aria-hidden="true" />
                <span className="font-display text-xs font-black uppercase tracking-wider text-white">
                  Broadcast Pop-Up Alerts (Auto-Hide)
                </span>
              </div>
              <button
                type="button"
                onClick={() => triggerManualAlert('NONE')}
                className="px-2 py-0.5 rounded bg-white text-[#E87500] hover:bg-orange-50 text-[10px] font-bold shadow-xs"
              >
                Clear Now
              </button>
            </div>
            <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(
                [
                  { id: 'SUPER_RAID', label: 'Super Raid' },
                  { id: 'SUPER_TACKLE', label: 'Super Tackle' },
                  { id: 'ALL_OUT', label: 'All Out' },
                  { id: 'BONUS', label: 'Bonus +1' },
                  { id: 'DO_OR_DIE', label: 'Do or Die' },
                  { id: 'TIME_OUT', label: 'Time Out' },
                  { id: 'TV_REVIEW', label: 'TV Review' },
                  { id: 'FULL_TIME', label: 'Full Time' },
                ] as Array<{ id: KabaddiAlertType; label: string }>
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => triggerManualAlert(item.id, state.raidingTeam)}
                  className="min-h-[40px] px-2.5 py-2 rounded-xl wo-trans-btn text-xs font-black uppercase tracking-wide"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Standalone Toast */}
      {localToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl bg-white border-2 border-[#FF8C00] text-slate-900 text-xs sm:text-sm font-bold shadow-2xl"
        >
          {localToast}
        </div>
      )}
    </div>
  );
}
