import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowLeftRight,
  BarChart3,
  Check,
  Copy,
  Download,
  ExternalLink,
  HelpCircle,
  Monitor,
  Pause,
  Play,
  RotateCcw,
  Settings,
  Share2,
  Shield,
  Sparkles,
  Tv,
  Undo2,
  Upload,
  UserCheck,
  Volume2,
  X,
} from 'lucide-react';
import { useKabaddiStore } from '../../hooks/useKabaddiStore';
import {
  computeLiveTimerSeconds,
  createDefaultKabaddiSubstitutes,
  createInitialKabaddiState,
  ensureKabaddiPlayers,
  formatClockMMSS,
  KABADDI_TEAM_PALETTES,
  KabaddiAlertType,
  KabaddiCardView,
  KabaddiHalf,
  KabaddiLogEntry,
  KabaddiPlayer,
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
    // Fallback below
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

function playRefereeWhistleSound(): void {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const masterGain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2850, now);
    osc.frequency.exponentialRampToValueAtTime(3050, now + 0.12);
    osc.frequency.setValueAtTime(2920, now + 0.55);

    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(36, now);
    lfoGain.gain.setValueAtTime(110, now);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    masterGain.gain.setValueAtTime(0.001, now);
    masterGain.gain.linearRampToValueAtTime(0.24, now + 0.04);
    masterGain.gain.setValueAtTime(0.22, now + 0.45);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    osc.connect(masterGain);
    masterGain.connect(ctx.destination);

    osc.start(now);
    lfo.start(now);
    osc.stop(now + 0.68);
    lfo.stop(now + 0.68);

    window.setTimeout(() => {
      void ctx.close().catch(() => {});
    }, 900);
  } catch {
    // Ignore audio context restrictions
  }
}

function buildLogEntry(
  timeSec: number,
  text: string,
  side: KabaddiTeamSide | null = null,
  kind: KabaddiLogEntry['kind'] = 'system'
): KabaddiLogEntry {
  return {
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timeLabel: formatClockMMSS(timeSec),
    text,
    side,
    kind,
  };
}

function applyRosterChange(
  players: KabaddiPlayer[],
  revivalQueue: string[],
  outDelta: number,
  reviveDelta: number,
  specificOutPlayerId?: string
): { players: KabaddiPlayer[]; revivalQueue: string[]; playersOnMat: number } {
  const nextPlayers = players.map((p) => ({ ...p }));
  let nextQueue = revivalQueue.filter((id) => nextPlayers.some((p) => p.id === id));

  // Revive from front of FIFO revival queue first
  let remainingRevive = Math.max(0, reviveDelta);
  while (remainingRevive > 0) {
    let targetId = nextQueue.shift();
    if (!targetId) {
      const outPlayer = nextPlayers.find((p) => p.status === 'out');
      targetId = outPlayer?.id;
    }
    if (!targetId) break;
    const found = nextPlayers.find((p) => p.id === targetId);
    if (found) {
      found.status = 'in';
    }
    remainingRevive -= 1;
  }

  // Send specific player out first if requested (e.g., raider tackled)
  let remainingOut = Math.max(0, outDelta);
  if (specificOutPlayerId && remainingOut > 0) {
    const target = nextPlayers.find((p) => p.id === specificOutPlayerId && p.status === 'in');
    if (target) {
      target.status = 'out';
      if (!nextQueue.includes(target.id)) {
        nextQueue = [...nextQueue, target.id];
      }
      remainingOut -= 1;
    }
  }

  // Send remaining active players out in court order
  while (remainingOut > 0) {
    const active = nextPlayers.find((p) => p.status === 'in');
    if (!active) break;
    active.status = 'out';
    if (!nextQueue.includes(active.id)) {
      nextQueue = [...nextQueue, active.id];
    }
    remainingOut -= 1;
  }

  // Ensure every out player is present in the revival queue
  for (const p of nextPlayers) {
    if (p.status === 'out' && !nextQueue.includes(p.id)) {
      nextQueue.push(p.id);
    }
  }
  nextQueue = nextQueue.filter(
    (id) => nextPlayers.find((p) => p.id === id)?.status === 'out'
  );

  const playersOnMat = nextPlayers.filter((p) => p.status === 'in').length;
  return { players: nextPlayers, revivalQueue: nextQueue, playersOnMat };
}

export function KabaddiControlDashboard({
  uid: rawUid,
  onBackHome,
  embedded = false,
  onToast,
}: KabaddiControlDashboardProps) {
  const { uid, state, syncing, canUndo, updateState, undo } = useKabaddiStore(rawUid, false);

  const [nowMs, setNowMs] = useState(() => Date.now());
  const [raidShape, setRaidShape] = useState<'circle' | 'rectangle'>('circle');
  const [clockPresetMode, setClockPresetMode] = useState<'auto' | '20m' | '40m'>('auto');
  const [showBroadcastMonitor, setShowBroadcastMonitor] = useState(false);
  const [previewBg, setPreviewBg] = useState<'arena' | 'green' | 'transparent'>('arena');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [selectingRaiderPrompt, setSelectingRaiderPrompt] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [localToast, setLocalToast] = useState<string | null>(null);

  // Substitute modal local state
  const [subSide, setSubSide] = useState<KabaddiTeamSide>('A');
  const [subOutPlayerId, setSubOutPlayerId] = useState<string>('');
  const [subInName, setSubInName] = useState<string>('');
  const [subInNumber, setSubInNumber] = useState<string>('');

  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const loadFileInputRef = useRef<HTMLInputElement | null>(null);
  const [previewScale, setPreviewScale] = useState(0.55);

  const teamAPlayers = useMemo(
    () => ensureKabaddiPlayers(state.teamA, 'A'),
    [state.teamA]
  );
  const teamBPlayers = useMemo(
    () => ensureKabaddiPlayers(state.teamB, 'B'),
    [state.teamB]
  );
  const teamARevivalIds = useMemo(() => {
    const existing = state.teamA.revivalQueue ?? [];
    const outIds = teamAPlayers.filter((p) => p.status === 'out').map((p) => p.id);
    const ordered = existing.filter((id) => outIds.includes(id));
    for (const id of outIds) {
      if (!ordered.includes(id)) ordered.push(id);
    }
    return ordered;
  }, [state.teamA.revivalQueue, teamAPlayers]);

  const teamBRevivalIds = useMemo(() => {
    const existing = state.teamB.revivalQueue ?? [];
    const outIds = teamBPlayers.filter((p) => p.status === 'out').map((p) => p.id);
    const ordered = existing.filter((id) => outIds.includes(id));
    for (const id of outIds) {
      if (!ordered.includes(id)) ordered.push(id);
    }
    return ordered;
  }, [state.teamB.revivalQueue, teamBPlayers]);

  const gameLog = state.gameLog ?? [];

  const activeRaiderObj = useMemo(() => {
    const sel = state.selectedRaider;
    if (!sel) return null;
    const list = sel.side === 'A' ? teamAPlayers : teamBPlayers;
    const player = list.find((p) => p.id === sel.playerId && p.status === 'in');
    if (!player) return null;
    return {
      side: sel.side,
      player,
      teamName: sel.side === 'A' ? state.teamA.name : state.teamB.name,
    };
  }, [state.selectedRaider, state.teamA.name, state.teamB.name, teamAPlayers, teamBPlayers]);

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

  // Live ticker for timers
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  const liveMatchSec = computeLiveTimerSeconds(state.matchClock, nowMs);
  const liveRaidSec = computeLiveTimerSeconds(state.raidClock, nowMs);

  // Auto-stop raid clock & match clock when they hit 0
  useEffect(() => {
    if (state.raidClock.running && liveRaidSec === 0) {
      playRefereeWhistleSound();
      updateState(
        (prev) => ({
          ...prev,
          raidClock: {
            ...prev.raidClock,
            remainingSec: 0,
            running: false,
            startedAtMs: null,
          },
          gameLog: [
            buildLogEntry(
              computeLiveTimerSeconds(prev.matchClock),
              '30s Raid Clock expired!',
              prev.raidingTeam,
              'system'
            ),
            ...(prev.gameLog ?? []),
          ].slice(0, 80),
        }),
        false
      );
    }
  }, [state.raidClock.running, liveRaidSec, updateState]);

  useEffect(() => {
    if (state.matchClock.running && liveMatchSec === 0) {
      playRefereeWhistleSound();
      updateState(
        (prev) => ({
          ...prev,
          matchClock: {
            ...prev.matchClock,
            remainingSec: 0,
            running: false,
            startedAtMs: null,
          },
          gameLog: [
            buildLogEntry(0, 'Game Clock reached 00:00 — Time Up!', null, 'system'),
            ...(prev.gameLog ?? []),
          ].slice(0, 80),
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
      if (width > 0) setPreviewScale(width / 1280);
    };
    updateScale();
    const ro = new ResizeObserver(updateScale);
    ro.observe(el);
    return () => ro.disconnect();
  }, [showBroadcastMonitor]);

  const overlayUrl = useMemo(() => {
    const path = `/kabaddi-overlay?id=${encodeURIComponent(uid)}`;
    if (typeof window === 'undefined') return path;
    return `${window.location.origin}${path}`;
  }, [uid]);

  const handleCopyOverlayLink = async () => {
    const ok = await copyClipboard(overlayUrl);
    if (ok) {
      setCopiedLink(true);
      notify('OBS / vMix Kabaddi Overlay Link copied!');
      window.setTimeout(() => setCopiedLink(false), 2000);
    }
  };

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

  // Match Clock Controls
  const toggleMatchClock = () => {
    updateState((prev) => {
      const now = Date.now();
      const currSec = computeLiveTimerSeconds(prev.matchClock, now);
      if (prev.matchClock.running) {
        return {
          ...prev,
          matchClock: {
            ...prev.matchClock,
            remainingSec: currSec,
            running: false,
            startedAtMs: null,
          },
          gameLog: [
            buildLogEntry(currSec, 'Game clock paused', null, 'system'),
            ...(prev.gameLog ?? []),
          ].slice(0, 80),
        };
      }
      const startSec = currSec > 0 ? currSec : prev.matchClock.durationSec;
      return {
        ...prev,
        matchClock: {
          ...prev.matchClock,
          remainingSec: startSec,
          running: true,
          startedAtMs: now,
        },
        gameLog: [
          buildLogEntry(
            startSec,
            (prev.gameLog ?? []).length === 0 ? 'Match started!' : 'Game clock resumed',
            null,
            'system'
          ),
          ...(prev.gameLog ?? []),
        ].slice(0, 80),
      };
    }, false);
  };

  const setMatchClockMinutes = (mins: number, mode?: 'auto' | '20m' | '40m') => {
    const secs = Math.max(60, Math.min(60 * 60, mins * 60));
    if (mode) setClockPresetMode(mode);
    updateState(
      (prev) => ({
        ...prev,
        matchClock: {
          durationSec: secs,
          remainingSec: secs,
          running: false,
          startedAtMs: null,
        },
      }),
      false
    );
  };

  const adjustMatchClockSeconds = (deltaSec: number) => {
    updateState(
      (prev) => {
        const curr = computeLiveTimerSeconds(prev.matchClock);
        const next = Math.max(0, Math.min(60 * 60, curr + deltaSec));
        return {
          ...prev,
          matchClock: {
            ...prev.matchClock,
            remainingSec: next,
            running: false,
            startedAtMs: null,
          },
        };
      },
      false
    );
  };

  // Raid 30s Clock Controls
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

  const resetRaidClock = (autoStart = false) => {
    updateState((prev) => {
      const now = Date.now();
      return {
        ...prev,
        raidClock: {
          durationSec: 30,
          remainingSec: 30,
          running: autoStart,
          startedAtMs: autoStart ? now : null,
        },
      };
    }, false);
  };

  // Select a player as active raider (starts 30s raid clock & sets raiding team)
  const handleSelectRaider = (side: KabaddiTeamSide, player: KabaddiPlayer) => {
    if (player.status === 'out') {
      // Clicking an OUT player revives them immediately
      handleTogglePlayerStatus(side, player.id);
      return;
    }
    setSelectingRaiderPrompt(false);
    updateState((prev) => {
      const now = Date.now();
      const team = side === 'A' ? prev.teamA : prev.teamB;
      const isAlreadySelected =
        prev.selectedRaider?.side === side && prev.selectedRaider?.playerId === player.id;
      if (isAlreadySelected) {
        return {
          ...prev,
          selectedRaider: null,
          raidClock: {
            durationSec: 30,
            remainingSec: 30,
            running: false,
            startedAtMs: null,
          },
        };
      }
      const isDoOrDie = team.emptyRaids >= 2;
      return {
        ...prev,
        raidingTeam: side,
        selectedRaider: { side, playerId: player.id },
        raidClock: {
          durationSec: 30,
          remainingSec: 30,
          running: true,
          startedAtMs: now,
        },
        alert: isDoOrDie
          ? buildAlert(
              'DO_OR_DIE',
              side,
              'DO OR DIE RAID!',
              `${team.name} · #${player.number} ${player.name}`,
              '3RD RAID'
            )
          : prev.alert,
        gameLog: [
          buildLogEntry(
            computeLiveTimerSeconds(prev.matchClock, now),
            `${team.name}: #${player.number} ${player.name} raiding${isDoOrDie ? ' (DO OR DIE!)' : ''}`,
            side,
            'raid'
          ),
          ...(prev.gameLog ?? []),
        ].slice(0, 80),
      };
    }, false);
  };

  // Score points with full Revival Queue + Player Stats + Game Log + Auto All-Out handling
  const recordScoringAction = (
    scoringSide: KabaddiTeamSide,
    points: number,
    kind: 'raid' | 'tackle' | 'bonus' | 'adjust',
    autoAlert?: KabaddiAlertType
  ) => {
    updateState((prev) => {
      const now = Date.now();
      const clockSec = computeLiveTimerSeconds(prev.matchClock, now);
      const teamKey = scoringSide === 'A' ? 'teamA' : 'teamB';
      const oppKey = scoringSide === 'A' ? 'teamB' : 'teamA';
      const oppSide: KabaddiTeamSide = scoringSide === 'A' ? 'B' : 'A';
      const team = prev[teamKey];
      const opp = prev[oppKey];

      const teamPlayersBase = ensureKabaddiPlayers(team, scoringSide);
      const oppPlayersBase = ensureKabaddiPlayers(opp, oppSide);
      const teamQueueBase = team.revivalQueue ?? [];
      const oppQueueBase = opp.revivalQueue ?? [];

      const reviveCount =
        points > 0 && kind === 'raid'
          ? points
          : points > 0 && kind === 'tackle'
            ? 1
            : 0;
      const oppOutCount =
        points > 0 && kind === 'raid'
          ? points
          : points > 0 && kind === 'tackle'
            ? 1
            : 0;

      // Credit active raider / tackler stats
      const creditedTeamPlayers = teamPlayersBase.map((p) => {
        if (
          kind === 'raid' &&
          points > 0 &&
          prev.selectedRaider?.side === scoringSide &&
          prev.selectedRaider.playerId === p.id
        ) {
          return { ...p, raidPoints: p.raidPoints + points };
        }
        return p;
      });

      const teamRoster = applyRosterChange(
        creditedTeamPlayers,
        teamQueueBase,
        0,
        reviveCount
      );

      // If tackle, specifically send the active raider out if they belong to opponent
      const tackledRaiderId =
        kind === 'tackle' && prev.selectedRaider?.side === oppSide
          ? prev.selectedRaider.playerId
          : undefined;

      let oppRoster = applyRosterChange(
        oppPlayersBase,
        oppQueueBase,
        oppOutCount,
        0,
        tackledRaiderId
      );

      // Check automatic ALL OUT when opponent hits 0 players on mat!
      let extraAllOutPts = 0;
      let triggeredAllOut = false;
      if (points > 0 && (kind === 'raid' || kind === 'tackle') && oppRoster.playersOnMat === 0) {
        triggeredAllOut = true;
        extraAllOutPts = 2;
        oppRoster = {
          players: oppRoster.players.map((p) => ({ ...p, status: 'in' as const })),
          revivalQueue: [],
          playersOnMat: 7,
        };
      }

      const nextScore = Math.max(0, team.score + points + extraAllOutPts);
      const nextTeam = {
        ...team,
        score: nextScore,
        raidPoints:
          kind === 'raid' ? Math.max(0, team.raidPoints + points) : team.raidPoints,
        tacklePoints:
          kind === 'tackle' ? Math.max(0, team.tacklePoints + points) : team.tacklePoints,
        bonusPoints:
          kind === 'bonus' ? Math.max(0, team.bonusPoints + points) : team.bonusPoints,
        allOuts: triggeredAllOut ? team.allOuts + 1 : team.allOuts,
        emptyRaids: points > 0 && kind === 'raid' ? 0 : team.emptyRaids,
        players: teamRoster.players,
        revivalQueue: teamRoster.revivalQueue,
        playersOnMat: teamRoster.playersOnMat,
      };

      const nextOpp = {
        ...opp,
        players: oppRoster.players,
        revivalQueue: oppRoster.revivalQueue,
        playersOnMat: oppRoster.playersOnMat,
      };

      // Build Game Log entry
      const raiderLabel =
        prev.selectedRaider?.side === scoringSide
          ? (() => {
              const found = teamPlayersBase.find((p) => p.id === prev.selectedRaider?.playerId);
              return found ? ` (#${found.number} ${found.name})` : '';
            })()
          : '';

      let logMsg = `${team.name} ${points >= 0 ? `+${points}` : points} pts`;
      if (kind === 'raid') {
        logMsg = `${team.name}${raiderLabel}: +${points} ${points >= 3 ? 'Super Raid!' : 'Raid Pt' + (points > 1 ? 's' : '')}`;
      } else if (kind === 'tackle') {
        logMsg = `${team.name}: +${points} ${points >= 2 ? 'Super Tackle!' : 'Tackle Pt'}`;
      } else if (kind === 'bonus') {
        logMsg = `${team.name}${raiderLabel}: +1 Bonus Point`;
      } else {
        logMsg = `${team.name}: Score adjusted (${points >= 0 ? `+${points}` : points})`;
      }

      const nextLogs: KabaddiLogEntry[] = [
        buildLogEntry(
          clockSec,
          logMsg,
          scoringSide,
          kind === 'adjust' ? 'system' : kind
        ),
        ...(prev.gameLog ?? []),
      ];
      if (triggeredAllOut) {
        nextLogs.unshift(
          buildLogEntry(
            clockSec,
            `ALL OUT on ${opp.name}! ${team.name} awarded +2 Bonus Points`,
            scoringSide,
            'allout'
          )
        );
      }

      let nextAlert = prev.alert;
      if (triggeredAllOut) {
        nextAlert = buildAlert(
          'ALL_OUT',
          scoringSide,
          'ALL OUT!',
          `${team.name} +2 POINTS`,
          '+2 ALL OUT'
        );
      } else if (autoAlert === 'SUPER_RAID') {
        nextAlert = buildAlert('SUPER_RAID', scoringSide, 'SUPER RAID!', team.name, `+${points} PTS`);
      } else if (autoAlert === 'SUPER_TACKLE') {
        nextAlert = buildAlert('SUPER_TACKLE', scoringSide, 'SUPER TACKLE!', team.name, '+2 PTS');
      } else if (autoAlert === 'BONUS') {
        nextAlert = buildAlert('BONUS', scoringSide, 'BONUS POINT!', team.name, '+1 PT');
      }

      const shouldEndRaid = kind === 'raid' || kind === 'tackle';

      return {
        ...prev,
        [teamKey]: nextTeam,
        [oppKey]: nextOpp,
        raidingTeam: shouldEndRaid ? oppSide : prev.raidingTeam,
        selectedRaider: shouldEndRaid ? null : prev.selectedRaider,
        raidClock: shouldEndRaid
          ? {
              durationSec: 30,
              remainingSec: 30,
              running: false,
              startedAtMs: null,
            }
          : prev.raidClock,
        alert: nextAlert,
        gameLog: nextLogs.slice(0, 80),
      };
    });
  };

  // Manual All Out on defending team
  const handleManualAllOut = (defendingSide: KabaddiTeamSide) => {
    updateState((prev) => {
      const clockSec = computeLiveTimerSeconds(prev.matchClock);
      const defKey = defendingSide === 'A' ? 'teamA' : 'teamB';
      const attKey = defendingSide === 'A' ? 'teamB' : 'teamA';
      const attSide: KabaddiTeamSide = defendingSide === 'A' ? 'B' : 'A';
      const defending = prev[defKey];
      const attacking = prev[attKey];
      const defPlayers = ensureKabaddiPlayers(defending, defendingSide).map((p) => ({
        ...p,
        status: 'in' as const,
      }));

      return {
        ...prev,
        [defKey]: {
          ...defending,
          players: defPlayers,
          revivalQueue: [],
          playersOnMat: 7,
        },
        [attKey]: {
          ...attacking,
          score: attacking.score + 2,
          allOuts: attacking.allOuts + 1,
        },
        selectedRaider: null,
        raidClock: { durationSec: 30, remainingSec: 30, running: false, startedAtMs: null },
        alert: buildAlert(
          'ALL_OUT',
          attSide,
          'ALL OUT!',
          `${attacking.name} +2 POINTS`,
          '+2 ALL OUT'
        ),
        gameLog: [
          buildLogEntry(
            clockSec,
            `ALL OUT on ${defending.name}! ${attacking.name} +2 Points (7 players revived)`,
            attSide,
            'allout'
          ),
          ...(prev.gameLog ?? []),
        ].slice(0, 80),
      };
    });
  };

  // Empty Raid handler
  const handleEmptyRaid = (side: KabaddiTeamSide) => {
    updateState((prev) => {
      const clockSec = computeLiveTimerSeconds(prev.matchClock);
      const key = side === 'A' ? 'teamA' : 'teamB';
      const oppSide: KabaddiTeamSide = side === 'A' ? 'B' : 'A';
      const nextEmpty = (prev[key].emptyRaids + 1) % 3;
      const triggerDoOrDie = nextEmpty === 2;

      return {
        ...prev,
        raidingTeam: oppSide,
        selectedRaider: null,
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
        gameLog: [
          buildLogEntry(
            clockSec,
            `${prev[key].name}: Empty Raid (${nextEmpty}/2)${triggerDoOrDie ? ' — Next Raid DO OR DIE!' : ''}`,
            side,
            'raid'
          ),
          ...(prev.gameLog ?? []),
        ].slice(0, 80),
      };
    });
  };

  // Toggle individual player IN / OUT + sync Revival Queue & playersOnMat
  const handleTogglePlayerStatus = (side: KabaddiTeamSide, playerId: string) => {
    updateState((prev) => {
      const clockSec = computeLiveTimerSeconds(prev.matchClock);
      const key = side === 'A' ? 'teamA' : 'teamB';
      const team = prev[key];
      const players = ensureKabaddiPlayers(team, side).map((p) => ({ ...p }));
      const target = players.find((p) => p.id === playerId);
      if (!target) return prev;

      let queue = (team.revivalQueue ?? []).filter((id) => players.some((p) => p.id === id));
      let actionLabel = '';

      if (target.status === 'in') {
        target.status = 'out';
        if (!queue.includes(target.id)) queue = [...queue, target.id];
        actionLabel = `${team.name}: #${target.number} ${target.name} marked OUT`;
      } else {
        target.status = 'in';
        queue = queue.filter((id) => id !== target.id);
        actionLabel = `${team.name}: #${target.number} ${target.name} REVIVED`;
      }

      const playersOnMat = players.filter((p) => p.status === 'in').length;
      const clearRaider =
        target.status === 'out' &&
        prev.selectedRaider?.side === side &&
        prev.selectedRaider.playerId === playerId;

      return {
        ...prev,
        selectedRaider: clearRaider ? null : prev.selectedRaider,
        [key]: {
          ...team,
          players,
          revivalQueue: queue,
          playersOnMat,
        },
        gameLog: [
          buildLogEntry(clockSec, actionLabel, side, 'system'),
          ...(prev.gameLog ?? []),
        ].slice(0, 80),
      };
    });
  };

  const handleReviveNextInQueue = (side: KabaddiTeamSide) => {
    updateState((prev) => {
      const clockSec = computeLiveTimerSeconds(prev.matchClock);
      const key = side === 'A' ? 'teamA' : 'teamB';
      const team = prev[key];
      const players = ensureKabaddiPlayers(team, side);
      const queue = team.revivalQueue ?? [];
      const nextId = queue[0] ?? players.find((p) => p.status === 'out')?.id;
      if (!nextId) return prev;

      const revivedPlayer = players.find((p) => p.id === nextId);
      const roster = applyRosterChange(players, queue, 0, 1);

      return {
        ...prev,
        [key]: {
          ...team,
          players: roster.players,
          revivalQueue: roster.revivalQueue,
          playersOnMat: roster.playersOnMat,
        },
        gameLog: [
          buildLogEntry(
            clockSec,
            `${team.name}: #${revivedPlayer?.number ?? ''} ${revivedPlayer?.name ?? 'Player'} revived from queue`,
            side,
            'system'
          ),
          ...(prev.gameLog ?? []),
        ].slice(0, 80),
      };
    });
  };

  // Timeout trigger (`T` button next to score)
  const handleUseTimeout = (side: KabaddiTeamSide) => {
    const team = side === 'A' ? state.teamA : state.teamB;
    if (team.timeoutsLeft <= 0) {
      notify(`${team.name} has no timeouts remaining.`);
      return;
    }
    playRefereeWhistleSound();
    updateState((prev) => {
      const now = Date.now();
      const clockSec = computeLiveTimerSeconds(prev.matchClock, now);
      const key = side === 'A' ? 'teamA' : 'teamB';
      const remaining = Math.max(0, prev[key].timeoutsLeft - 1);
      return {
        ...prev,
        [key]: { ...prev[key], timeoutsLeft: remaining },
        matchClock: {
          ...prev.matchClock,
          remainingSec: clockSec,
          running: false,
          startedAtMs: null,
        },
        raidClock: {
          ...prev.raidClock,
          remainingSec: computeLiveTimerSeconds(prev.raidClock, now),
          running: false,
          startedAtMs: null,
        },
        alert: buildAlert('TIME_OUT', side, 'TIME OUT', prev[key].name, `${remaining} LEFT`),
        gameLog: [
          buildLogEntry(
            clockSec,
            `${prev[key].name} called Timeout (${remaining} remaining)`,
            side,
            'timeout'
          ),
          ...(prev.gameLog ?? []),
        ].slice(0, 80),
      };
    });
  };

  const handleWhistle = () => {
    playRefereeWhistleSound();
    updateState(
      (prev) => ({
        ...prev,
        gameLog: [
          buildLogEntry(
            computeLiveTimerSeconds(prev.matchClock),
            'Referee Whistle blown',
            null,
            'system'
          ),
          ...(prev.gameLog ?? []),
        ].slice(0, 80),
      }),
      false
    );
    notify('Referee whistle blown!');
  };

  const handleSwapSides = () => {
    updateState((prev) => ({
      ...prev,
      teamA: prev.teamB,
      teamB: prev.teamA,
      raidingTeam: prev.raidingTeam === 'A' ? 'B' : prev.raidingTeam === 'B' ? 'A' : null,
      selectedRaider: prev.selectedRaider
        ? {
            ...prev.selectedRaider,
            side: prev.selectedRaider.side === 'A' ? 'B' : 'A',
          }
        : null,
      gameLog: [
        buildLogEntry(
          computeLiveTimerSeconds(prev.matchClock),
          'Teams swapped court sides',
          null,
          'system'
        ),
        ...(prev.gameLog ?? []),
      ].slice(0, 80),
    }));
    notify('Swapped Team A and Team B sides.');
  };

  // Save Game to JSON file
  const handleSaveGame = () => {
    try {
      const payload = JSON.stringify(state, null, 2);
      const blob = new Blob([payload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeA = state.teamA.shortName || 'TeamA';
      const safeB = state.teamB.shortName || 'TeamB';
      a.download = `kabaddi-${safeA}-vs-${safeB}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      notify('Kabaddi game saved (.json)!');
    } catch {
      notify('Could not export save file.');
    }
  };

  // Load Game from JSON file
  const handleLoadGameFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '')) as Partial<KabaddiScoreboardState>;
        if (!parsed || !parsed.teamA || !parsed.teamB) {
          notify('Invalid Kabaddi save file.');
          return;
        }
        updateState(() => {
          const base = createInitialKabaddiState(uid);
          return {
            ...base,
            ...parsed,
            uid,
            teamA: { ...base.teamA, ...parsed.teamA },
            teamB: { ...base.teamB, ...parsed.teamB },
            matchClock: { ...base.matchClock, ...parsed.matchClock, running: false, startedAtMs: null },
            raidClock: { ...base.raidClock, ...parsed.raidClock, running: false, startedAtMs: null },
          };
        });
        notify('Saved Kabaddi match loaded!');
      } catch {
        notify('Could not read save file. Please select a valid .json file.');
      }
    };
    reader.readAsText(file);
  };

  // Substitute Player
  const openSubstituteModal = () => {
    const defaultList = ensureKabaddiPlayers(state.teamA, 'A');
    setSubSide('A');
    setSubOutPlayerId(defaultList[0]?.id || '');
    setSubInName('');
    setSubInNumber('');
    setShowSubModal(true);
  };

  const handleConfirmSubstitute = () => {
    const cleanName = subInName.trim();
    if (!subOutPlayerId || !cleanName) {
      notify('Select a court player and enter the incoming substitute name.');
      return;
    }
    const parsedNum = Number(subInNumber);
    updateState((prev) => {
      const clockSec = computeLiveTimerSeconds(prev.matchClock);
      const key = subSide === 'A' ? 'teamA' : 'teamB';
      const team = prev[key];
      const players = ensureKabaddiPlayers(team, subSide);
      const outgoing = players.find((p) => p.id === subOutPlayerId);
      if (!outgoing) return prev;
      const nextNum =
        Number.isFinite(parsedNum) && parsedNum > 0 && parsedNum <= 99
          ? Math.floor(parsedNum)
          : outgoing.number;

      const updatedPlayers = players.map((p) =>
        p.id === subOutPlayerId ? { ...p, name: cleanName, number: nextNum } : p
      );

      return {
        ...prev,
        [key]: {
          ...team,
          players: updatedPlayers,
        },
        gameLog: [
          buildLogEntry(
            clockSec,
            `${team.name} Sub: #${nextNum} ${cleanName} IN for #${outgoing.number} ${outgoing.name}`,
            subSide,
            'system'
          ),
          ...(prev.gameLog ?? []),
        ].slice(0, 80),
      };
    });
    setShowSubModal(false);
    notify('Player substitution completed!');
  };

  const handleResetGame = () => {
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
          players: ensureKabaddiPlayers(prev.teamA, 'A').map((p) => ({
            ...p,
            status: 'in' as const,
            raidPoints: 0,
            tacklePoints: 0,
          })),
          revivalQueue: [],
          substitutes: prev.teamA.substitutes ?? createDefaultKabaddiSubstitutes('A'),
        },
        teamB: {
          ...fresh.teamB,
          name: prev.teamB.name,
          shortName: prev.teamB.shortName,
          color: prev.teamB.color,
          players: ensureKabaddiPlayers(prev.teamB, 'B').map((p) => ({
            ...p,
            status: 'in' as const,
            raidPoints: 0,
            tacklePoints: 0,
          })),
          revivalQueue: [],
          substitutes: prev.teamB.substitutes ?? createDefaultKabaddiSubstitutes('B'),
        },
        gameLog: [],
      };
    });
    setConfirmReset(false);
    setSelectingRaiderPrompt(false);
    notify('Kabaddi game reset to 0 - 0.');
  };

  // Circular Raid Progress Ring math
  const ringRadius = 52;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const raidProgress = Math.max(0, Math.min(1, liveRaidSec / 30));
  const ringDashOffset = ringCircumference * (1 - raidProgress);
  const raidDanger = liveRaidSec <= 10 && state.raidClock.running;

  const renderTeamScoreCard = (side: KabaddiTeamSide) => {
    const team = side === 'A' ? state.teamA : state.teamB;
    const players = side === 'A' ? teamAPlayers : teamBPlayers;
    const activeCount = players.filter((p) => p.status === 'in').length;
    const isRaiding = state.raidingTeam === side;
    const superTackleOn = activeCount > 0 && activeCount <= 3;

    return (
      <div
        className={`rounded-xl bg-white border border-orange-200 border-t-[3px] border-t-[#FF8C00] shadow-xs px-5 py-5 flex flex-col items-center justify-between text-center transition-all ${
          isRaiding ? 'ring-2 ring-[#FF8C00]/35' : ''
        }`}
      >
        {/* Team Name Header */}
        <div className="w-full pb-2.5 border-b border-orange-100">
          <div className="flex items-center justify-center gap-2">
            {isRaiding && (
              <span
                className="w-2.5 h-2.5 rounded-full bg-[#FF8C00] animate-pulse shrink-0"
                title="Currently Raiding"
              />
            )}
            <h2 className="font-display text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate">
              {team.name}
            </h2>
          </div>
        </div>

        {/* Score + Timeout [T] Button */}
        <div className="my-5 flex items-center justify-center gap-4">
          {side === 'A' && (
            <button
              type="button"
              onClick={() => handleUseTimeout('A')}
              disabled={team.timeoutsLeft <= 0}
              title={`Call Timeout for ${team.name} (${team.timeoutsLeft} left)`}
              className="w-8 h-8 rounded-lg border border-orange-200 bg-orange-50 hover:bg-[#FF8C00] hover:text-white hover:border-[#FF8C00] disabled:opacity-40 text-xs font-mono font-black text-[#EA580C] flex items-center justify-center transition-colors"
            >
              T
            </button>
          )}

          <div className="flex flex-col items-center">
            <span className="font-mono text-6xl sm:text-7xl font-black text-slate-900 leading-none tabular-nums">
              {team.score}
            </span>
            <div className="mt-2 inline-flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => recordScoringAction(side, -1, 'adjust')}
                aria-label={`Subtract 1 point from ${team.name}`}
                className="w-6 h-6 rounded-md bg-orange-50 hover:bg-orange-100 border border-orange-200 text-slate-700 font-mono text-xs font-black flex items-center justify-center transition-colors"
              >
                -
              </button>
              <button
                type="button"
                onClick={() => recordScoringAction(side, 1, 'raid')}
                aria-label={`Add 1 raid point to ${team.name}`}
                className="w-6 h-6 rounded-md bg-[#FF8C00] hover:bg-[#EA580C] text-white font-mono text-xs font-black flex items-center justify-center transition-colors"
              >
                +
              </button>
            </div>
          </div>

          {side === 'B' && (
            <button
              type="button"
              onClick={() => handleUseTimeout('B')}
              disabled={team.timeoutsLeft <= 0}
              title={`Call Timeout for ${team.name} (${team.timeoutsLeft} left)`}
              className="w-8 h-8 rounded-lg border border-orange-200 bg-orange-50 hover:bg-[#FF8C00] hover:text-white hover:border-[#FF8C00] disabled:opacity-40 text-xs font-mono font-black text-[#EA580C] flex items-center justify-center transition-colors"
            >
              T
            </button>
          )}
        </div>

        {/* 7 Player Court Status Squares */}
        <div className="space-y-2.5 w-full flex flex-col items-center">
          <div className="flex items-center justify-center gap-1.5">
            {players.map((p) => {
              const isIn = p.status === 'in';
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleTogglePlayerStatus(side, p.id)}
                  title={`#${p.number} ${p.name} (${isIn ? 'On Court — click to mark Out' : 'Out — click to Revive'})`}
                  className={`w-4 h-4 sm:w-5 sm:h-5 rounded-[4px] transition-all ${
                    isIn
                      ? 'bg-[#FF8C00] shadow-[0_1px_4px_rgba(255,140,0,0.45)] hover:scale-110'
                      : 'bg-orange-100/70 border border-orange-200 hover:border-[#FF8C00]'
                  }`}
                />
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-semibold text-slate-500">
            <span>Timeouts: {team.timeoutsLeft}</span>
            {superTackleOn && (
              <span className="px-1.5 py-0.5 rounded bg-orange-100 text-[#EA580C] font-mono text-[10px] font-black uppercase">
                Super Tackle
              </span>
            )}
            {team.emptyRaids >= 2 && (
              <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-mono text-[10px] font-black uppercase animate-pulse">
                Do or Die
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderTeamPlayersCard = (side: KabaddiTeamSide) => {
    const team = side === 'A' ? state.teamA : state.teamB;
    const players = side === 'A' ? teamAPlayers : teamBPlayers;
    const revivalIds = side === 'A' ? teamARevivalIds : teamBRevivalIds;

    return (
      <div
        className={`rounded-xl bg-white border border-orange-200 border-t-[3px] border-t-[#FF8C00] shadow-xs p-4 sm:p-5 space-y-4 transition-all ${
          selectingRaiderPrompt ? 'ring-2 ring-[#FF8C00]' : ''
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-base sm:text-lg font-black text-slate-900">
            {team.name} Players
          </h3>
          <span className="text-[11px] font-mono font-bold text-[#EA580C] bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md">
            {players.filter((p) => p.status === 'in').length}/7 In
          </span>
        </div>

        {/* 7 Player Grid (Exact 4 + 3 layout matching reference) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {players.map((p) => {
            const isOut = p.status === 'out';
            const isSelectedRaider =
              state.selectedRaider?.side === side && state.selectedRaider?.playerId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectRaider(side, p)}
                className={`relative rounded-lg px-2.5 py-2.5 text-center border transition-all flex flex-col items-center justify-center min-h-[60px] ${
                  isSelectedRaider
                    ? 'bg-[#FF8C00] border-[#EA580C] text-white shadow-md scale-[1.02]'
                    : isOut
                      ? 'bg-slate-50 border-dashed border-slate-300 text-slate-400 hover:border-[#FF8C00] hover:text-slate-700'
                      : 'bg-white border-orange-200/90 text-slate-900 hover:bg-orange-50 hover:border-[#FF8C00]'
                }`}
              >
                <span
                  className={`font-mono text-sm sm:text-base font-black leading-tight ${
                    isSelectedRaider
                      ? 'text-white'
                      : isOut
                        ? 'text-slate-400 line-through'
                        : 'text-[#EA580C]'
                  }`}
                >
                  {p.number}
                </span>
                <span
                  className={`text-[11px] font-semibold truncate max-w-full mt-0.5 ${
                    isSelectedRaider
                      ? 'text-orange-50'
                      : isOut
                        ? 'text-slate-400'
                        : 'text-slate-700'
                  }`}
                >
                  {p.name}
                </span>
                {isSelectedRaider && (
                  <span className="mt-0.5 text-[9px] font-mono font-black uppercase tracking-wider text-white/95">
                    RAIDING
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Revival Queue Box */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-display text-sm font-extrabold text-slate-800">
              Revival Queue
            </h4>
            {revivalIds.length > 0 && (
              <button
                type="button"
                onClick={() => handleReviveNextInQueue(side)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-orange-50 hover:bg-[#FF8C00] text-[#EA580C] hover:text-white border border-orange-200 text-[11px] font-bold transition-colors"
              >
                <UserCheck className="w-3 h-3" aria-hidden="true" />
                <span>Revive Next</span>
              </button>
            )}
          </div>

          <div className="min-h-[54px] rounded-xl bg-orange-50/65 border border-orange-200/80 px-3 py-2 flex flex-wrap items-center gap-1.5">
            {revivalIds.length === 0 ? (
              <span className="text-xs text-slate-400 italic">All 7 players on court</span>
            ) : (
              revivalIds.map((pid, idx) => {
                const pl = players.find((p) => p.id === pid);
                if (!pl) return null;
                return (
                  <button
                    key={pid}
                    type="button"
                    onClick={() => handleTogglePlayerStatus(side, pid)}
                    title="Click to revive player"
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                      idx === 0
                        ? 'bg-[#FF8C00] text-white border-[#EA580C] shadow-xs'
                        : 'bg-white text-slate-700 border-orange-200 hover:border-[#FF8C00]'
                    }`}
                  >
                    <span className="font-mono font-black">#{pl.number}</span>
                    <span>{pl.name}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  };

  const activeScoringSide: KabaddiTeamSide = activeRaiderObj?.side ?? state.raidingTeam ?? 'A';
  const oppScoringSide: KabaddiTeamSide = activeScoringSide === 'A' ? 'B' : 'A';
  const activeTeamName = activeScoringSide === 'A' ? state.teamA.name : state.teamB.name;
  const oppTeamName = oppScoringSide === 'A' ? state.teamA.name : state.teamB.name;

  return (
    <div
      className={
        embedded
          ? 'rounded-2xl bg-[#FFF8F1] p-3 sm:p-4 text-slate-900 overflow-x-clip'
          : 'min-h-screen bg-[#FFF8F1] py-4 sm:py-6 px-3 sm:px-5 lg:px-6 text-slate-900 overflow-x-clip'
      }
    >
      {/* Hidden file input for Load Game */}
      <input
        ref={loadFileInputRef}
        type="file"
        accept="application/json,.json"
        onChange={handleLoadGameFile}
        className="hidden"
      />

      <div className="max-w-[1440px] mx-auto grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_310px] gap-4 items-stretch">
        {/* ================= LEFT MAIN WORKSPACE ================= */}
        <div className="space-y-4 min-w-0">
          {/* Top Header Bar */}
          <div className="rounded-xl bg-white border border-orange-200 border-t-[3px] border-t-[#FF8C00] shadow-xs px-4 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              {onBackHome && !embedded && (
                <button
                  type="button"
                  onClick={onBackHome}
                  aria-label="Back to Home"
                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-orange-50 hover:bg-[#FF8C00] text-[#EA580C] hover:text-white border border-orange-200 transition-colors shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
              <h1 className="font-display text-lg sm:text-xl font-black text-slate-900 tracking-tight truncate">
                Kabaddi Scoreboard
              </h1>
              {syncing && (
                <span className="hidden sm:inline-block text-[10px] font-mono font-bold text-[#EA580C] bg-orange-50 border border-orange-200 px-2 py-0.5 rounded">
                  Syncing
                </span>
              )}
            </div>

            {/* Right Toolbar Matching Reference Controls in White & Orange */}
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Clock Duration Quick Segmented Switcher */}
              <div
                role="group"
                aria-label="Match clock preset"
                className="inline-flex items-center rounded-lg border border-orange-200 bg-orange-50/70 p-0.5 text-xs font-bold"
              >
                {(
                  [
                    { id: 'auto', label: '40m', mins: 40 },
                    { id: '20m', label: '20m', mins: 20 },
                    { id: '40m', label: '15m', mins: 15 },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setMatchClockMinutes(item.mins, item.id)}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      clockPresetMode === item.id
                        ? 'bg-[#FF8C00] text-white shadow-xs'
                        : 'text-slate-600 hover:text-[#EA580C]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Raid Timer Shape Toggle (Circle / Rectangle) */}
              <button
                type="button"
                onClick={() =>
                  setRaidShape((prev) => (prev === 'circle' ? 'rectangle' : 'circle'))
                }
                title="Toggle Raid Timer Shape"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white hover:bg-orange-50 border border-orange-200 text-xs font-bold text-slate-700 transition-colors"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-[#FF8C00]" aria-hidden="true" />
                <span>{raidShape === 'circle' ? 'Rectangle' : 'Circle'}</span>
              </button>

              {/* Undo */}
              <button
                type="button"
                onClick={undo}
                disabled={!canUndo}
                title="Undo last action"
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white hover:bg-orange-50 disabled:opacity-40 border border-orange-200 text-slate-700 transition-colors"
              >
                <Undo2 className="w-4 h-4 text-[#FF8C00]" aria-hidden="true" />
              </button>

              {/* Share / Copy OBS & vMix Link */}
              <button
                type="button"
                onClick={() => void handleCopyOverlayLink()}
                title="Copy OBS / vMix Overlay URL"
                className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border transition-colors ${
                  copiedLink
                    ? 'bg-[#FF8C00] border-[#EA580C] text-white'
                    : 'bg-white hover:bg-orange-50 border-orange-200 text-slate-700'
                }`}
              >
                {copiedLink ? (
                  <Check className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Share2 className="w-4 h-4 text-[#FF8C00]" aria-hidden="true" />
                )}
              </button>

              {/* Live Broadcast Preview Monitor Toggle */}
              <button
                type="button"
                onClick={() => setShowBroadcastMonitor((v) => !v)}
                title="Toggle OBS / vMix Broadcast Monitor & Alerts"
                className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border transition-colors ${
                  showBroadcastMonitor
                    ? 'bg-[#FF8C00] border-[#EA580C] text-white'
                    : 'bg-white hover:bg-orange-50 border-orange-200 text-slate-700'
                }`}
              >
                <Monitor className="w-4 h-4" aria-hidden="true" />
              </button>

              {/* Settings */}
              <button
                type="button"
                onClick={() => setShowSettingsModal(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white hover:bg-orange-50 border border-orange-200 text-xs font-bold text-slate-700 transition-colors"
              >
                <Settings className="w-3.5 h-3.5 text-[#FF8C00]" aria-hidden="true" />
                <span>Settings</span>
              </button>

              {/* Help */}
              <button
                type="button"
                onClick={() => setShowHelpModal(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white hover:bg-orange-50 border border-orange-200 text-xs font-bold text-slate-700 transition-colors"
              >
                <HelpCircle className="w-3.5 h-3.5 text-[#FF8C00]" aria-hidden="true" />
                <span>Help</span>
              </button>
            </div>
          </div>

          {/* 3-Column Scoreboard Row: Team A | Game Time & Raid Clock | Team B */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {renderTeamScoreCard('A')}

            {/* Center Game Time & Raid Timer Card */}
            <div className="rounded-xl bg-white border border-orange-200 border-t-[3px] border-t-[#FF8C00] shadow-xs px-5 py-5 flex flex-col items-center justify-between text-center gap-4">
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Game Time
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const idx = HALF_OPTIONS.indexOf(state.half);
                      const nextHalf = HALF_OPTIONS[(idx + 1) % HALF_OPTIONS.length];
                      updateState((prev) => ({ ...prev, half: nextHalf }), false);
                    }}
                    title="Click to cycle match half"
                    className="px-2 py-0.5 rounded bg-orange-50 hover:bg-orange-100 border border-orange-200 font-mono text-[10px] font-extrabold text-[#EA580C]"
                  >
                    {state.half}
                  </button>
                </div>

                {/* Big Game Clock */}
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={toggleMatchClock}
                    title={state.matchClock.running ? 'Pause Game Time' : 'Start Game Time'}
                    className="font-mono text-4xl sm:text-5xl font-black text-slate-900 hover:text-[#EA580C] tracking-tight leading-none tabular-nums transition-colors"
                  >
                    {formatClockMMSS(liveMatchSec)}
                  </button>
                  <button
                    type="button"
                    onClick={toggleMatchClock}
                    aria-label={state.matchClock.running ? 'Pause match clock' : 'Start match clock'}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                      state.matchClock.running
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-[#FF8C00] hover:bg-[#EA580C] text-white'
                    }`}
                  >
                    {state.matchClock.running ? (
                      <Pause className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <Play className="w-4 h-4 ml-0.5" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              {/* 30-Second Raid Timer (Circle or Rectangle) */}
              {raidShape === 'circle' ? (
                <button
                  type="button"
                  onClick={toggleRaidClock}
                  onDoubleClick={() => resetRaidClock(true)}
                  title="Click to Start/Pause 30s Raid Timer · Double-click to Reset 30s"
                  className="relative w-32 h-32 flex items-center justify-center group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8C00] rounded-full"
                >
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                    <circle
                      cx="60"
                      cy="60"
                      r={ringRadius}
                      fill="none"
                      stroke="#FFEDD5"
                      strokeWidth="8"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r={ringRadius}
                      fill="none"
                      stroke={raidDanger ? '#DC2626' : '#FF8C00'}
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={ringCircumference}
                      strokeDashoffset={ringDashOffset}
                      className="transition-all duration-200"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span
                      className={`font-mono text-3xl font-black tabular-nums leading-none ${
                        raidDanger ? 'text-red-600 animate-pulse' : 'text-slate-900'
                      }`}
                    >
                      {liveRaidSec}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">
                      {state.raidClock.running ? 'LIVE' : 'RAID'}
                    </span>
                  </div>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={toggleRaidClock}
                  onDoubleClick={() => resetRaidClock(true)}
                  title="Click to Start/Pause 30s Raid Timer"
                  className="w-full rounded-xl border-2 border-[#FF8C00] bg-orange-50/60 p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase text-[#EA580C]">
                      30s Raid Clock
                    </span>
                    <span
                      className={`font-mono text-2xl font-black tabular-nums ${
                        raidDanger ? 'text-red-600 animate-pulse' : 'text-slate-900'
                      }`}
                    >
                      {liveRaidSec}s
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-orange-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-200 ${
                        raidDanger ? 'bg-red-600' : 'bg-[#FF8C00]'
                      }`}
                      style={{ width: `${raidProgress * 100}%` }}
                    />
                  </div>
                </button>
              )}

              {/* Select a Raider Primary Action Button */}
              <div className="w-full space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    if (activeRaiderObj) {
                      resetRaidClock(true);
                    } else {
                      setSelectingRaiderPrompt((v) => !v);
                      notify('Click any active player below to start their raid!');
                    }
                  }}
                  className={`w-full min-h-[42px] px-4 py-2 rounded-lg font-display text-sm font-extrabold transition-all ${
                    activeRaiderObj
                      ? 'bg-[#FF8C00] hover:bg-[#EA580C] text-white shadow-sm'
                      : selectingRaiderPrompt
                        ? 'bg-orange-100 text-[#EA580C] border-2 border-[#FF8C00]'
                        : 'bg-orange-50 hover:bg-[#FF8C00] text-[#EA580C] hover:text-white border border-orange-200'
                  }`}
                >
                  {activeRaiderObj
                    ? `#${activeRaiderObj.player.number} ${activeRaiderObj.player.name} (${activeRaiderObj.teamName})`
                    : selectingRaiderPrompt
                      ? 'Tap a Player Below...'
                      : 'Select a Raider'}
                </button>

                {/* Quick Raid Scoring Controls Bar */}
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => recordScoringAction(activeScoringSide, 1, 'raid')}
                    className="py-1.5 rounded-lg bg-orange-50 hover:bg-[#FF8C00] text-[#EA580C] hover:text-white border border-orange-200 font-mono text-[11px] font-black transition-colors"
                    title={`+1 Raid Pt for ${activeTeamName}`}
                  >
                    +1 Raid
                  </button>
                  <button
                    type="button"
                    onClick={() => recordScoringAction(activeScoringSide, 2, 'raid')}
                    className="py-1.5 rounded-lg bg-orange-50 hover:bg-[#FF8C00] text-[#EA580C] hover:text-white border border-orange-200 font-mono text-[11px] font-black transition-colors"
                    title={`+2 Raid Pts for ${activeTeamName}`}
                  >
                    +2 Raid
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      recordScoringAction(activeScoringSide, 3, 'raid', 'SUPER_RAID')
                    }
                    className="py-1.5 rounded-lg bg-[#FF8C00] hover:bg-[#EA580C] text-white font-mono text-[11px] font-black transition-colors"
                    title={`+3 Super Raid for ${activeTeamName}`}
                  >
                    +3 SR
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      recordScoringAction(activeScoringSide, 1, 'bonus', 'BONUS')
                    }
                    className="py-1.5 rounded-lg bg-white hover:bg-orange-50 text-slate-800 border border-orange-200 font-mono text-[11px] font-black transition-colors"
                    title={`+1 Bonus Pt for ${activeTeamName}`}
                  >
                    +1 Bon
                  </button>

                  <button
                    type="button"
                    onClick={() => recordScoringAction(oppScoringSide, 1, 'tackle')}
                    className="py-1.5 rounded-lg bg-white hover:bg-orange-50 text-slate-800 border border-orange-200 font-mono text-[11px] font-bold transition-colors"
                    title={`Tackle +1 for ${oppTeamName}`}
                  >
                    Tackle
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      recordScoringAction(oppScoringSide, 2, 'tackle', 'SUPER_TACKLE')
                    }
                    className="py-1.5 rounded-lg bg-white hover:bg-orange-50 text-[#EA580C] border border-orange-200 font-mono text-[11px] font-bold transition-colors"
                    title={`Super Tackle +2 for ${oppTeamName}`}
                  >
                    S.Tackle
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEmptyRaid(activeScoringSide)}
                    className="py-1.5 rounded-lg bg-white hover:bg-orange-50 text-slate-700 border border-orange-200 font-mono text-[11px] font-bold transition-colors"
                    title={`Empty Raid for ${activeTeamName}`}
                  >
                    Empty
                  </button>
                  <button
                    type="button"
                    onClick={() => handleManualAllOut(oppScoringSide)}
                    className="py-1.5 rounded-lg bg-red-50 hover:bg-red-600 text-red-700 hover:text-white border border-red-200 font-mono text-[11px] font-bold transition-colors"
                    title={`All Out ${oppTeamName} (+2 ${activeTeamName})`}
                  >
                    All Out
                  </button>
                </div>
              </div>
            </div>

            {renderTeamScoreCard('B')}
          </div>

          {/* 2-Column Players & Revival Queue Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderTeamPlayersCard('A')}
            {renderTeamPlayersCard('B')}
          </div>

          {/* Collapsible OBS / vMix Broadcast Monitor, Graphics & Alerts Panel */}
          {showBroadcastMonitor && (
            <div className="rounded-xl bg-white border border-orange-200 border-t-[3px] border-t-[#FF8C00] shadow-xs overflow-hidden space-y-4 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-orange-100">
                <div className="flex items-center gap-2">
                  <Tv className="w-4 h-4 text-[#FF8C00]" aria-hidden="true" />
                  <h3 className="font-display text-sm font-black uppercase tracking-wide text-slate-900">
                    OBS / vMix Live Overlay &amp; Broadcast Graphics
                  </h3>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleCopyOverlayLink()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF8C00] hover:bg-[#EA580C] text-white text-xs font-bold"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copied!' : 'Copy OBS / vMix URL'}</span>
                  </button>
                  <a
                    href={overlayUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 border border-orange-200 text-[#EA580C] text-xs font-bold"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Overlay</span>
                  </a>
                </div>
              </div>

              {/* 16:9 Live Preview */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <code className="text-[11px] font-mono text-[#EA580C] bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-md truncate max-w-full">
                    {overlayUrl}
                  </code>
                  <div className="inline-flex items-center gap-1">
                    {(['arena', 'green', 'transparent'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setPreviewBg(mode)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase ${
                          previewBg === mode
                            ? 'bg-[#FF8C00] text-white'
                            : 'bg-orange-50 text-slate-600 hover:text-[#EA580C]'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                <div
                  ref={previewContainerRef}
                  className="relative w-full aspect-video rounded-xl overflow-hidden border border-orange-200 bg-slate-900"
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

              {/* Broadcast Cards & Pop-Up Alerts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1">
                <div className="space-y-2">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                    Overlay Cards
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        updateState(
                          (prev) => ({ ...prev, showScoreboard: !prev.showScoreboard }),
                          false
                        )
                      }
                      className={`py-2 px-2 rounded-lg text-xs font-extrabold uppercase border ${
                        state.showScoreboard
                          ? 'bg-[#FF8C00] text-white border-[#EA580C]'
                          : 'bg-white text-slate-700 border-orange-200'
                      }`}
                    >
                      Bar: {state.showScoreboard ? 'ON' : 'OFF'}
                    </button>
                    {(
                      [
                        { id: 'NONE', label: 'Live' },
                        { id: 'VERSUS', label: 'VS Card' },
                        { id: 'SUMMARY', label: 'Summary' },
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
                        className={`py-2 px-2 rounded-lg text-xs font-extrabold uppercase border ${
                          state.activeCard === card.id
                            ? 'bg-[#FF8C00] text-white border-[#EA580C]'
                            : 'bg-white text-slate-700 border-orange-200 hover:bg-orange-50'
                        }`}
                      >
                        {card.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-[#FF8C00]" aria-hidden="true" />
                      <span>Pop-Up Alerts</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => triggerManualAlert('NONE')}
                      className="text-[11px] font-bold text-[#EA580C] hover:underline"
                    >
                      Clear Alert
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
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
                        className="py-1.5 px-2 rounded-lg bg-orange-50 hover:bg-[#FF8C00] text-[#EA580C] hover:text-white border border-orange-200 text-[11px] font-extrabold uppercase transition-colors"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ================= RIGHT SIDEBAR: GAME LOG + ACTIONS ================= */}
        <aside className="flex flex-col gap-4 min-w-0">
          {/* Game Log Card */}
          <div className="flex-1 min-h-[280px] xl:min-h-[420px] rounded-xl bg-white border border-orange-200 border-t-[3px] border-t-[#FF8C00] shadow-xs p-4 sm:p-5 flex flex-col">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-orange-100">
              <h2 className="font-display text-lg font-black text-slate-900">Game Log</h2>
              {gameLog.length > 0 && (
                <button
                  type="button"
                  onClick={() => updateState((prev) => ({ ...prev, gameLog: [] }), false)}
                  className="text-[11px] font-bold text-slate-400 hover:text-[#EA580C]"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto pt-3 space-y-2 max-h-[380px]">
              {gameLog.length === 0 ? (
                <div className="h-full min-h-[160px] flex items-center justify-center text-center">
                  <p className="text-sm font-medium text-slate-400">Game has not started.</p>
                </div>
              ) : (
                gameLog.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-lg bg-orange-50/55 border border-orange-100 px-3 py-2 flex items-start gap-2.5 text-xs"
                  >
                    <span className="font-mono font-bold text-[#EA580C] shrink-0 tabular-nums">
                      {entry.timeLabel}
                    </span>
                    <span className="text-slate-700 font-medium leading-snug">{entry.text}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Actions Card */}
          <div className="rounded-xl bg-white border border-orange-200 border-t-[3px] border-t-[#FF8C00] shadow-xs p-4 sm:p-5 space-y-3">
            <div className="pb-2.5 border-b border-orange-100">
              <h2 className="font-display text-lg font-black text-slate-900">Actions</h2>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowStatsModal(true)}
                className="w-full min-h-[40px] px-3.5 py-2 rounded-lg bg-white hover:bg-orange-50 border border-orange-200 text-slate-800 hover:text-[#EA580C] text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <BarChart3 className="w-4 h-4 text-[#FF8C00]" aria-hidden="true" />
                <span>Statistics</span>
              </button>

              <button
                type="button"
                onClick={handleWhistle}
                className="w-full min-h-[40px] px-3.5 py-2 rounded-lg bg-white hover:bg-orange-50 border border-orange-200 text-slate-800 hover:text-[#EA580C] text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <Volume2 className="w-4 h-4 text-[#FF8C00]" aria-hidden="true" />
                <span>Whistle</span>
              </button>

              <button
                type="button"
                onClick={openSubstituteModal}
                className="w-full min-h-[40px] px-3.5 py-2 rounded-lg bg-white hover:bg-orange-50 border border-orange-200 text-slate-800 hover:text-[#EA580C] text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <ArrowLeftRight className="w-4 h-4 text-[#FF8C00]" aria-hidden="true" />
                <span>Substitute</span>
              </button>

              <button
                type="button"
                onClick={handleSaveGame}
                className="w-full min-h-[40px] px-3.5 py-2 rounded-lg bg-white hover:bg-orange-50 border border-orange-200 text-slate-800 hover:text-[#EA580C] text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4 text-[#FF8C00]" aria-hidden="true" />
                <span>Save Game</span>
              </button>

              <button
                type="button"
                onClick={() => loadFileInputRef.current?.click()}
                className="w-full min-h-[40px] px-3.5 py-2 rounded-lg bg-white hover:bg-orange-50 border border-orange-200 text-slate-800 hover:text-[#EA580C] text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <Upload className="w-4 h-4 text-[#FF8C00]" aria-hidden="true" />
                <span>Load Game</span>
              </button>

              {!confirmReset ? (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="w-full min-h-[42px] px-3.5 py-2 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 shadow-xs transition-colors"
                >
                  <RotateCcw className="w-4 h-4" aria-hidden="true" />
                  <span>Reset Game</span>
                </button>
              ) : (
                <div className="rounded-lg bg-red-50 border border-red-200 p-2.5 space-y-2 text-center">
                  <p className="text-xs font-bold text-red-700">Reset scores, timers &amp; log?</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={handleResetGame}
                      className="py-1.5 rounded-md bg-[#DC2626] hover:bg-red-700 text-white text-xs font-extrabold"
                    >
                      Yes, Reset
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmReset(false)}
                      className="py-1.5 rounded-md bg-white border border-slate-300 text-slate-700 text-xs font-bold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* ================= MODAL: SETTINGS (TEAM, PLAYERS & CLOCK) ================= */}
      {showSettingsModal && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setShowSettingsModal(false)}
          className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-3xl rounded-2xl bg-white border border-orange-200 border-t-4 border-t-[#FF8C00] shadow-2xl overflow-hidden my-auto"
          >
            <div className="px-5 py-4 bg-gradient-to-r from-[#FF8C00] to-[#EA580C] text-white flex items-center justify-between">
              <h3 className="font-display text-base sm:text-lg font-black uppercase">
                Kabaddi Match &amp; Team Settings
              </h3>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                aria-label="Close settings"
                className="p-1 rounded-lg hover:bg-white/15"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Tournament & Clock Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase text-slate-600">
                    Tournament Name
                  </label>
                  <input
                    type="text"
                    value={state.tournamentName}
                    onChange={(e) =>
                      updateState((prev) => ({ ...prev, tournamentName: e.target.value }), false)
                    }
                    className="w-full px-3 py-2 rounded-lg border border-orange-200 text-xs font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase text-slate-600">
                    Match Label
                  </label>
                  <input
                    type="text"
                    value={state.matchLabel}
                    onChange={(e) =>
                      updateState((prev) => ({ ...prev, matchLabel: e.target.value }), false)
                    }
                    className="w-full px-3 py-2 rounded-lg border border-orange-200 text-xs font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase text-slate-600">
                    Clock Fine Adjust
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => adjustMatchClockSeconds(-30)}
                      className="flex-1 py-2 rounded-lg bg-orange-50 hover:bg-orange-100 border border-orange-200 font-mono text-xs font-bold text-[#EA580C]"
                    >
                      -30s
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustMatchClockSeconds(30)}
                      className="flex-1 py-2 rounded-lg bg-orange-50 hover:bg-orange-100 border border-orange-200 font-mono text-xs font-bold text-[#EA580C]"
                    >
                      +30s
                    </button>
                    <button
                      type="button"
                      onClick={handleSwapSides}
                      className="flex-1 py-2 rounded-lg bg-[#FF8C00] text-white text-xs font-bold"
                    >
                      Swap
                    </button>
                  </div>
                </div>
              </div>

              {/* Team A & Team B Editor + 7 Player Name Editors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(['A', 'B'] as const).map((side) => {
                  const key = side === 'A' ? 'teamA' : 'teamB';
                  const team = state[key];
                  const players = side === 'A' ? teamAPlayers : teamBPlayers;
                  return (
                    <div
                      key={side}
                      className="rounded-xl bg-orange-50/45 border border-orange-200 p-3.5 space-y-3"
                    >
                      <p className="text-xs font-black uppercase tracking-wider text-[#EA580C]">
                        Team {side} Setup
                      </p>
                      <div className="grid grid-cols-[1fr_84px] gap-2">
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
                          className="px-3 py-2 rounded-lg bg-white border border-orange-200 text-xs font-bold"
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
                          className="px-2 py-2 rounded-lg bg-white border border-orange-200 text-xs font-mono font-black text-center text-[#EA580C]"
                        />
                      </div>

                      <div className="flex flex-wrap gap-1">
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
                              className={`px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 border ${
                                active
                                  ? 'border-[#FF8C00] bg-orange-100 text-[#EA580C]'
                                  : 'border-slate-200 bg-white text-slate-600'
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

                      <div className="space-y-1.5 pt-1">
                        <p className="text-[11px] font-bold text-slate-600">7 Court Players</p>
                        <div className="grid grid-cols-1 gap-1.5">
                          {players.map((p, idx) => (
                            <div key={p.id} className="grid grid-cols-[54px_1fr] gap-1.5">
                              <input
                                type="number"
                                min={1}
                                max={99}
                                value={p.number}
                                onChange={(e) => {
                                  const num = Math.max(1, Math.min(99, Number(e.target.value) || idx + 1));
                                  updateState((prev) => {
                                    const list = ensureKabaddiPlayers(prev[key], side);
                                    return {
                                      ...prev,
                                      [key]: {
                                        ...prev[key],
                                        players: list.map((item) =>
                                          item.id === p.id ? { ...item, number: num } : item
                                        ),
                                      },
                                    };
                                  }, false);
                                }}
                                className="px-2 py-1.5 rounded-lg bg-white border border-orange-200 text-xs font-mono font-bold text-center"
                              />
                              <input
                                type="text"
                                value={p.name}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  updateState((prev) => {
                                    const list = ensureKabaddiPlayers(prev[key], side);
                                    return {
                                      ...prev,
                                      [key]: {
                                        ...prev[key],
                                        players: list.map((item) =>
                                          item.id === p.id ? { ...item, name: val } : item
                                        ),
                                      },
                                    };
                                  }, false);
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-white border border-orange-200 text-xs font-semibold"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end pt-2 border-t border-orange-100">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-5 py-2 rounded-lg bg-[#FF8C00] hover:bg-[#EA580C] text-white text-xs font-extrabold uppercase"
                >
                  Save &amp; Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: MATCH STATISTICS ================= */}
      {showStatsModal && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setShowStatsModal(false)}
          className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl rounded-2xl bg-white border border-orange-200 border-t-4 border-t-[#FF8C00] shadow-2xl overflow-hidden my-auto"
          >
            <div className="px-5 py-4 bg-gradient-to-r from-[#FF8C00] to-[#EA580C] text-white flex items-center justify-between">
              <h3 className="font-display text-base font-black uppercase">
                Kabaddi Match Statistics
              </h3>
              <button
                type="button"
                onClick={() => setShowStatsModal(false)}
                aria-label="Close statistics"
                className="p-1 rounded-lg hover:bg-white/15"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 text-center items-center pb-3 border-b border-orange-100">
                <p className="font-display font-black text-base text-slate-900">{state.teamA.name}</p>
                <p className="font-mono text-xs font-extrabold uppercase text-[#EA580C]">
                  {state.half}
                </p>
                <p className="font-display font-black text-base text-slate-900">{state.teamB.name}</p>
              </div>

              {(
                [
                  { label: 'Total Score', a: state.teamA.score, b: state.teamB.score },
                  { label: 'Raid Points', a: state.teamA.raidPoints, b: state.teamB.raidPoints },
                  { label: 'Tackle Points', a: state.teamA.tacklePoints, b: state.teamB.tacklePoints },
                  { label: 'Bonus Points', a: state.teamA.bonusPoints, b: state.teamB.bonusPoints },
                  { label: 'All Outs', a: state.teamA.allOuts, b: state.teamB.allOuts },
                  { label: 'Players On Court', a: state.teamA.playersOnMat, b: state.teamB.playersOnMat },
                  { label: 'Timeouts Left', a: state.teamA.timeoutsLeft, b: state.teamB.timeoutsLeft },
                ] as const
              ).map((row) => (
                <div
                  key={row.label}
                  className="grid grid-cols-3 items-center text-center py-2 px-3 rounded-lg bg-orange-50/50 border border-orange-100"
                >
                  <span className="font-mono text-lg font-black text-[#EA580C] tabular-nums">
                    {row.a}
                  </span>
                  <span className="text-xs font-bold uppercase text-slate-600">{row.label}</span>
                  <span className="font-mono text-lg font-black text-[#EA580C] tabular-nums">
                    {row.b}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: SUBSTITUTE PLAYER ================= */}
      {showSubModal && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setShowSubModal(false)}
          className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-white border border-orange-200 border-t-4 border-t-[#FF8C00] shadow-2xl overflow-hidden"
          >
            <div className="px-5 py-4 bg-gradient-to-r from-[#FF8C00] to-[#EA580C] text-white flex items-center justify-between">
              <h3 className="font-display text-base font-black uppercase">Substitute Player</h3>
              <button
                type="button"
                onClick={() => setShowSubModal(false)}
                aria-label="Close substitute modal"
                className="p-1 rounded-lg hover:bg-white/15"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {(['A', 'B'] as const).map((side) => (
                  <button
                    key={side}
                    type="button"
                    onClick={() => {
                      setSubSide(side);
                      const list = side === 'A' ? teamAPlayers : teamBPlayers;
                      setSubOutPlayerId(list[0]?.id || '');
                    }}
                    className={`py-2 rounded-lg text-xs font-extrabold border ${
                      subSide === side
                        ? 'bg-[#FF8C00] text-white border-[#EA580C]'
                        : 'bg-orange-50 text-slate-700 border-orange-200'
                    }`}
                  >
                    {side === 'A' ? state.teamA.name : state.teamB.name}
                  </button>
                ))}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Outgoing Player (Court)
                </label>
                <select
                  value={subOutPlayerId}
                  onChange={(e) => setSubOutPlayerId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-orange-200 text-sm bg-white"
                >
                  {(subSide === 'A' ? teamAPlayers : teamBPlayers).map((p) => (
                    <option key={p.id} value={p.id}>
                      #{p.number} {p.name} ({p.status.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-[90px_1fr] gap-2">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Jersey #</label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={subInNumber}
                    onChange={(e) => setSubInNumber(e.target.value)}
                    placeholder="8"
                    className="w-full px-3 py-2 rounded-lg border border-orange-200 text-sm font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Incoming Substitute Name *
                  </label>
                  <input
                    type="text"
                    value={subInName}
                    onChange={(e) => setSubInName(e.target.value)}
                    placeholder="Enter player name"
                    className="w-full px-3 py-2 rounded-lg border border-orange-200 text-sm"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleConfirmSubstitute}
                className="w-full py-2.5 rounded-lg bg-[#FF8C00] hover:bg-[#EA580C] text-white text-xs font-extrabold uppercase"
              >
                Confirm Substitution
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: HELP ================= */}
      {showHelpModal && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setShowHelpModal(false)}
          className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl bg-white border border-orange-200 border-t-4 border-t-[#FF8C00] shadow-2xl overflow-hidden"
          >
            <div className="px-5 py-4 bg-gradient-to-r from-[#FF8C00] to-[#EA580C] text-white flex items-center justify-between">
              <h3 className="font-display text-base font-black uppercase">
                Kabaddi Scoreboard Quick Guide
              </h3>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                aria-label="Close help"
                className="p-1 rounded-lg hover:bg-white/15"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-2.5 text-xs sm:text-sm text-slate-700">
              <p className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-[#FF8C00] shrink-0 mt-0.5" />
                <span>
                  <strong>Start Raid:</strong> Tap any active player tile (1–7) to select them as the Raider and automatically start the 30s raid timer.
                </span>
              </p>
              <p className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-[#FF8C00] shrink-0 mt-0.5" />
                <span>
                  <strong>Revival Queue:</strong> When players are out, they enter the Revival Queue in order and automatically revive as their team scores raid or tackle points.
                </span>
              </p>
              <p className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-[#FF8C00] shrink-0 mt-0.5" />
                <span>
                  <strong>OBS / vMix Sync:</strong> Click the Share icon to copy your transparent Broadcast Overlay URL, or click the Monitor icon to preview live graphics and trigger pop-up alerts.
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

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
