import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowLeftRight,
  Award,
  Ban,
  BellRing,
  Camera,
  Check,
  CheckCircle2,
  Edit3,
  Pencil,
  Play,
  Plus,
  Radio,
  RotateCcw,
  Send,
  Trophy,
  Tv,
  Undo2,
  UserPen,
  UserPlus,
  Users,
  Wifi,
  WifiOff,
  X,
  Zap,
} from 'lucide-react';
import {
  generateActionId,
  type FirestoreConnectionStatus,
} from '../../lib/firestoreLiveSync';
import { processLogoImageFile } from '../../lib/imageUpload';
import {
  applyDeliveryToMatch,
  BROADCAST_THEMES,
  calcRunRate,
  computeBattingCard,
  computeBowlingCard,
  computeCurrentPartnership,
  computeOversBreakdown,
  computePartnershipsList,
  DeliveryInput,
  formatOvers,
  formatSingleDateHuman,
  getBallPillLabel,
  getTournamentExpiryDate,
  isMatchLockedByNewerMatch,
  isMatchTournamentExpired,
  isTournamentExpired,
  MATCH_LOCKED_MESSAGE,
  TOURNAMENT_EXPIRED_MESSAGE,
  undoLastDelivery,
} from '../../data/cricketSampleData';
import {
  BallEvent,
  CricketMatch,
  CricketSuiteState,
  OverlayThemeId,
  Player,
  TransitionOverlayType,
  WicketType,
} from '../../types/cricketSuite';
import { TvOverlayControllerView } from './TvOverlayControllerView';
import { BroadcastMatchSummaryCard } from './BroadcastMatchSummaryCard';
import {
  MatchSummaryActionToolbar,
  MatchSummaryFullscreenOverlay,
  MatchSummaryModal,
} from './MatchSummaryStudioView';
import { QuickOverlayBottomSheet } from './QuickOverlayBottomSheet';
import { WorldCupUnlockModal } from './WorldCupUnlockModal';
import {
  getPaidThemeConfig,
  isPaidThemeId,
  isThemeUnlockedInStatus,
  type PaidThemeId,
  useWorldCupServerUnlock,
} from '../../lib/worldCupUnlock';

interface ScoringDashboardViewProps {
  state: CricketSuiteState;
  overlayUrl: string;
  updateState: (
    updater: (prev: CricketSuiteState) => CricketSuiteState,
    options?: { actionId?: string }
  ) => void;
  onCopyOverlayUrl: (url?: string, label?: string) => void;
  onGoToGroups: () => void;
  onOpenOverlayController: () => void;
  onNavigateToMatches?: () => void;
  onRequestLogout?: () => void;
  onToast: (msg: string) => void;
  firestoreStatus?: FirestoreConnectionStatus;
  lastSyncLatencyMs?: number | null;
  firebaseUserEmail?: string | null;
  onConnectFirebaseLive?: () => Promise<unknown>;
  onSyncNow?: () => void;
}

type ScoringTab = 'scoring' | 'scorecard' | 'overs' | 'overlay';

function CricketBatIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M16.5 7.5 20.5 3.5"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M14.4 6.4a1.2 1.2 0 0 1 1.7 0l1.5 1.5a1.2 1.2 0 0 1 0 1.7L9.3 17.9a2.2 2.2 0 0 1-3.1 0l-1.1-1.1a2.2 2.2 0 0 1 0-3.1l9.3-7.3Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function ScoringDashboardView({
  state,
  overlayUrl,
  updateState,
  onCopyOverlayUrl,
  onGoToGroups,
  onOpenOverlayController: _onOpenOverlayController,
  onNavigateToMatches,
  onRequestLogout,
  onToast,
  firestoreStatus,
  lastSyncLatencyMs,
  firebaseUserEmail,
  onConnectFirebaseLive,
  onSyncNow,
}: ScoringDashboardViewProps) {
  const lastScoringActionTsRef = useRef<number>(0);
  const lastUndoActionTsRef = useRef<number>(0);
  const [connectingFirebase, setConnectingFirebase] = useState(false);
  const [activeTab, setActiveTab] = useState<ScoringTab>('scoring');
  const [matchSummaryModalOpen, setMatchSummaryModalOpen] = useState(false);
  const [summaryFullscreenOpen, setSummaryFullscreenOpen] = useState(false);
  const [quickOverlaySheetOpen, setQuickOverlaySheetOpen] = useState(false);
  const [worldCupPayModalOpen, setWorldCupPayModalOpen] = useState(false);
  const [payModalThemeId, setPayModalThemeId] = useState<PaidThemeId>('worldcup');
  const { status: worldCupStatus, refresh: refreshWorldCupStatus } =
    useWorldCupServerUnlock();
  const [scorecardInningsTab, setScorecardInningsTab] = useState<0 | 1>(0);
  const [keypadPanel, setKeypadPanel] = useState<
    | 'main'
    | 'NB'
    | 'NB_LB'
    | 'NB_BYE'
    | 'WD'
    | 'LB'
    | 'BYE'
    | 'DCL'
    | 'MORE'
    | 'PENALTY'
    | 'MORE_RUNS'
  >('main');
  const [changeTargetModalOpen, setChangeTargetModalOpen] = useState(false);
  const [quickTargetValue, setQuickTargetValue] = useState('');
  const [changeOverModalOpen, setChangeOverModalOpen] = useState(false);
  const [quickOverValue, setQuickOverValue] = useState('6');
  const [walkOverModalOpen, setWalkOverModalOpen] = useState(false);
  const [walkOverWinnerId, setWalkOverWinnerId] = useState('');
  const [matchSettingModalOpen, setMatchSettingModalOpen] = useState(false);

  const [wicketModalOpen, setWicketModalOpen] = useState(false);
  const [wicketStep, setWicketStep] = useState<'types' | 'runout'>('types');
  const [wicketType, setWicketType] = useState<WicketType>('Bowled');
  const [wicketDismissedId, setWicketDismissedId] = useState<string>('');
  const [wicketRunsCompleted, setWicketRunsCompleted] = useState<number>(0);
  const [, setWicketNextBatterId] = useState<string>('');

  const [playerPickerSlot, setPlayerPickerSlot] = useState<
    'striker' | 'nonStriker' | 'bowler' | null
  >(null);
  const [slotMenuOpen, setSlotMenuOpen] = useState<
    'striker' | 'nonStriker' | 'bowler' | null
  >(null);
  const [editPlayerModal, setEditPlayerModal] = useState<{
    slot: 'striker' | 'nonStriker' | 'bowler';
    playerId: string;
    teamId: string;
  } | null>(null);
  const [editPlayerName, setEditPlayerName] = useState('');
  const [editBatterScore, setEditBatterScore] = useState('0');
  const [editBatterBalls, setEditBatterBalls] = useState('0');
  const [editBatter4s, setEditBatter4s] = useState('0');
  const [editBatter6s, setEditBatter6s] = useState('0');
  const [editBowlerOvers, setEditBowlerOvers] = useState('0.0');
  const [editBowlerMaidens, setEditBowlerMaidens] = useState('0');
  const [editBowlerRuns, setEditBowlerRuns] = useState('0');
  const [editBowlerWickets, setEditBowlerWickets] = useState('0');
  const [quickPlayerName, setQuickPlayerName] = useState('');

  const [editScoreModalOpen, setEditScoreModalOpen] = useState(false);
  const [editInningsIdx, setEditInningsIdx] = useState<0 | 1>(0);
  const [editRuns, setEditRuns] = useState('0');
  const [editWickets, setEditWickets] = useState('0');
  const [editBalls, setEditBalls] = useState('0');
  const [editWides, setEditWides] = useState('0');
  const [editNoBalls, setEditNoBalls] = useState('0');
  const [editByes, setEditByes] = useState('0');
  const [editLegByes, setEditLegByes] = useState('0');
  const [editMaxOvers, setEditMaxOvers] = useState('6');
  const [editTarget, setEditTarget] = useState('');

  const [tossModalOpen, setTossModalOpen] = useState(false);
  const [tossWinnerId, setTossWinnerId] = useState('');
  const [tossDecision, setTossDecision] = useState<'Bat' | 'Bowl'>('Bat');

  const [pomModalOpen, setPomModalOpen] = useState(false);
  const [selectedPomId, setSelectedPomId] = useState('');

  // Over completion & bowler change popup state
  const [overCompleteModalOpen, setOverCompleteModalOpen] = useState(false);
  const [selectedNextBowlerId, setSelectedNextBowlerId] = useState('');
  const [bowlerConfirmedBanner, setBowlerConfirmedBanner] = useState<{
    bowlerName: string;
    overNumber: number;
    photoUrl?: string;
    initials: string;
  } | null>(null);
  const lastPromptedOverKeyRef = useRef<string>('');
  const confirmTimerRef = useRef<number | null>(null);

  // 1st Innings End & Switch to 2nd Innings + 2nd Innings Player/Bowler Setup state
  const [inningsSwitchModalOpen, setInningsSwitchModalOpen] = useState(false);
  const [secondInningsSetupModalOpen, setSecondInningsSetupModalOpen] = useState(false);
  const [inn2StrikerId, setInn2StrikerId] = useState('');
  const [inn2NonStrikerId, setInn2NonStrikerId] = useState('');
  const [inn2BowlerId, setInn2BowlerId] = useState('');
  const [quickBowlPlayerName, setQuickBowlPlayerName] = useState('');
  const lastPromptedInningsBreakKeyRef = useRef<string>('');
  const lastPromptedSecondInnSetupKeyRef = useRef<string>('');

  // Wicket Fallen -> Mandatory Next Batter Selection state
  const [newBatterModalOpen, setNewBatterModalOpen] = useState(false);
  const [selectedNextBatterId, setSelectedNextBatterId] = useState('');
  const lastPromptedNewBatterKeyRef = useRef<string>('');

  // Match Completed -> Confirmation Popup & Match Summary in Overs tab
  const [matchCompleteModalOpen, setMatchCompleteModalOpen] = useState(false);
  const [oversInningsTab, setOversInningsTab] = useState<0 | 1>(0);
  const lastPromptedMatchCompleteKeyRef = useRef<string>('');
  const quickTeamLogoInputRef = useRef<HTMLInputElement | null>(null);
  const quickLogoTargetTeamIdRef = useRef<string | null>(null);

  const triggerScoringTeamLogoUpload = (teamId: string | undefined) => {
    if (!teamId) return;
    quickLogoTargetTeamIdRef.current = teamId;
    quickTeamLogoInputRef.current?.click();
  };

  const handleScoringTeamLogoFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    const targetTeamId = quickLogoTargetTeamIdRef.current;
    if (!file || !targetTeamId) return;
    try {
      const dataUrl = await processLogoImageFile(file, 240);
      const targetTeam = state.teams.find((t) => t.id === targetTeamId);
      updateState((prev) => ({
        ...prev,
        teams: prev.teams.map((tm) =>
          tm.id === targetTeamId ? { ...tm, logoUrl: dataUrl } : tm
        ),
        overlay: {
          ...prev.overlay,
          showTeamLogo: true,
        },
      }));
      onToast(`Team logo updated for ${targetTeam?.name || 'Team'}.`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Could not upload team logo.');
    } finally {
      quickLogoTargetTeamIdRef.current = null;
    }
  };

  const match: CricketMatch | undefined = useMemo(() => {
    return (
      state.matches.find((m) => m.id === state.activeMatchId) ?? state.matches[0]
    );
  }, [state.matches, state.activeMatchId]);

  const tournament = useMemo(
    () => state.tournaments.find((t) => t.id === match?.tournamentId),
    [state.tournaments, match?.tournamentId]
  );

  const teamMap = useMemo(
    () => new Map(state.teams.map((t) => [t.id, t])),
    [state.teams]
  );

  const activeInnSafe = match ? match.innings[match.currentInningsIndex] : undefined;
  const isPendingNewBatterSafe = Boolean(
    match &&
      activeInnSafe &&
      !activeInnSafe.completed &&
      match.status !== 'completed' &&
      (activeInnSafe.pendingNewBatter ||
        (activeInnSafe.balls.length > 0 &&
          (!activeInnSafe.strikerId || !activeInnSafe.nonStrikerId)))
  );
  const newBatterPromptKey =
    isPendingNewBatterSafe && match && activeInnSafe
      ? `${match.id}:${match.currentInningsIndex}:newbat:${activeInnSafe.wickets}:${activeInnSafe.balls.length}`
      : '';

  const isPendingBowlerChangeSafe = Boolean(
    match &&
      activeInnSafe &&
      activeInnSafe.pendingBowlerChange &&
      !activeInnSafe.completed &&
      match.status !== 'completed'
  );
  const completedOverNumSafe = activeInnSafe
    ? activeInnSafe.lastCompletedOverNumber || Math.floor(activeInnSafe.legalBalls / 6)
    : 0;
  // If a wicket falls on ball 6, select the incoming batter FIRST, then prompt for next bowler
  const overPromptKey =
    isPendingBowlerChangeSafe && !isPendingNewBatterSafe && match
      ? `${match.id}:${match.currentInningsIndex}:${completedOverNumSafe}`
      : '';

  const isFirstInningsEndedSafe = Boolean(
    match &&
      match.currentInningsIndex === 0 &&
      (match.status === 'innings_break' || match.innings[0].completed)
  );
  const inningsBreakPromptKey =
    isFirstInningsEndedSafe && match
      ? `${match.id}:innings_break:${match.innings[0].runs}:${match.innings[0].legalBalls}`
      : '';

  const needsSecondInningsSetupSafe = Boolean(
    match &&
      match.currentInningsIndex === 1 &&
      !match.innings[1].completed &&
      match.status !== 'completed' &&
      match.innings[1].balls.length === 0 &&
      (!match.innings[1].strikerId ||
        !match.innings[1].nonStrikerId ||
        !match.innings[1].bowlerId)
  );
  const secondInningsSetupPromptKey =
    needsSecondInningsSetupSafe && match ? `${match.id}:inn2setup` : '';

  const isMatchCompletedPendingConfirmSafe = Boolean(
    match && match.status === 'completed' && !match.matchCompletedConfirmed
  );
  const matchCompletePromptKey =
    isMatchCompletedPendingConfirmSafe && match
      ? `${match.id}:match_complete:${match.innings[1].runs}:${match.innings[1].wickets}:${match.innings[1].legalBalls}`
      : '';

  useEffect(() => {
    if (match) {
      setScorecardInningsTab(match.currentInningsIndex);
      setOversInningsTab(match.currentInningsIndex);
    }
  }, [match?.id, match?.currentInningsIndex]);

  useEffect(() => {
    if (newBatterPromptKey) {
      if (lastPromptedNewBatterKeyRef.current !== newBatterPromptKey) {
        lastPromptedNewBatterKeyRef.current = newBatterPromptKey;
        setSelectedNextBatterId('');
        // Do NOT auto-open blocking popup — show big red "Select Batsman" button directly on the batter card
      }
    } else {
      lastPromptedNewBatterKeyRef.current = '';
      setNewBatterModalOpen(false);
      setSelectedNextBatterId('');
    }
  }, [newBatterPromptKey]);

  useEffect(() => {
    if (overPromptKey) {
      if (lastPromptedOverKeyRef.current !== overPromptKey) {
        lastPromptedOverKeyRef.current = overPromptKey;
        setSelectedNextBowlerId('');
        // Do NOT auto-open blocking popup — show big red "Select Bowler" button directly on the bowler card
        onToast('OVER COMPLETED! Tap "Select Bowler" to choose the next bowler.');
      }
    } else {
      lastPromptedOverKeyRef.current = '';
      setOverCompleteModalOpen(false);
      setSelectedNextBowlerId('');
    }
  }, [overPromptKey, onToast]);

  useEffect(() => {
    if (inningsBreakPromptKey && match) {
      if (lastPromptedInningsBreakKeyRef.current !== inningsBreakPromptKey) {
        lastPromptedInningsBreakKeyRef.current = inningsBreakPromptKey;
        setInningsSwitchModalOpen(true);
      }
    } else {
      lastPromptedInningsBreakKeyRef.current = '';
      if (match?.currentInningsIndex === 1) {
        setInningsSwitchModalOpen(false);
      }
    }
  }, [inningsBreakPromptKey, match]);

  useEffect(() => {
    if (secondInningsSetupPromptKey && match) {
      if (lastPromptedSecondInnSetupKeyRef.current !== secondInningsSetupPromptKey) {
        lastPromptedSecondInnSetupKeyRef.current = secondInningsSetupPromptKey;
        const secondInn = match.innings[1];
        setInn2StrikerId(secondInn.strikerId || '');
        setInn2NonStrikerId(secondInn.nonStrikerId || '');
        setInn2BowlerId(secondInn.bowlerId || '');
        // Do NOT auto-open blocking popup — show big red Select Batsman & Select Bowler buttons directly on the cards
      }
    } else {
      lastPromptedSecondInnSetupKeyRef.current = '';
      setSecondInningsSetupModalOpen(false);
    }
  }, [secondInningsSetupPromptKey, match]);

  useEffect(() => {
    if (!slotMenuOpen) return;
    const handleOutside = (ev: MouseEvent) => {
      const target = ev.target as HTMLElement | null;
      if (target?.closest('[data-slot-menu="true"]')) return;
      setSlotMenuOpen(null);
    };
    const handleKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') setSlotMenuOpen(null);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [slotMenuOpen]);

  useEffect(() => {
    if (matchCompletePromptKey && match) {
      if (lastPromptedMatchCompleteKeyRef.current !== matchCompletePromptKey) {
        lastPromptedMatchCompleteKeyRef.current = matchCompletePromptKey;
        setMatchCompleteModalOpen(true);
      }
    } else {
      lastPromptedMatchCompleteKeyRef.current = '';
      if (match?.status !== 'completed') {
        setMatchCompleteModalOpen(false);
      }
    }
  }, [matchCompletePromptKey, match]);

  useEffect(() => {
    return () => {
      if (confirmTimerRef.current !== null) {
        window.clearTimeout(confirmTimerRef.current);
      }
    };
  }, []);

  if (!match) {
    return (
      <div className="rounded-xl bg-white border border-slate-200 shadow-xs p-10 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-[#FFF3E0] text-[#FF8C00] flex items-center justify-center mx-auto">
          <Radio className="w-7 h-7" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <h2 className="font-display font-bold text-lg text-slate-900">
            No Active Match Selected
          </h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Create a match in the Match section first. As soon as you create a match, this
            Scoring Dashboard opens automatically.
          </p>
        </div>
        {onNavigateToMatches && (
          <button
            type="button"
            onClick={onNavigateToMatches}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg wo-btn-primary text-white text-xs font-extrabold uppercase tracking-wider"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>GO TO MATCH LIST</span>
          </button>
        )}
      </div>
    );
  }

  const innIdx = match.currentInningsIndex;
  const activeInn = match.innings[innIdx];
  const inn1 = match.innings[0];
  const inn2 = match.innings[1];

  const team1 = teamMap.get(match.team1Id);
  const team2 = teamMap.get(match.team2Id);
  const battingTeam = teamMap.get(activeInn.battingTeamId);
  const bowlingTeam = teamMap.get(activeInn.bowlingTeamId);
  const inn1Team = teamMap.get(inn1.battingTeamId);
  const inn2Team = teamMap.get(inn2.battingTeamId);

  const battingCard = useMemo(
    () => computeBattingCard(activeInn, battingTeam),
    [activeInn, battingTeam]
  );
  const bowlingCard = useMemo(
    () => computeBowlingCard(activeInn, bowlingTeam),
    [activeInn, bowlingTeam]
  );

  const strikerStats = battingCard.find((b) => b.playerId === activeInn.strikerId);
  const nonStrikerStats = battingCard.find((b) => b.playerId === activeInn.nonStrikerId);
  const bowlerStats = bowlingCard.find((b) => b.playerId === activeInn.bowlerId);

  const oversBreakdown = useMemo(() => computeOversBreakdown(activeInn), [activeInn]);
  const currentOverNumber = Math.floor(activeInn.legalBalls / 6);
  const thisOverBalls = useMemo(
    () => activeInn.balls.filter((b) => b.over === currentOverNumber),
    [activeInn.balls, currentOverNumber]
  );
  const prevOverBalls = useMemo(
    () =>
      currentOverNumber > 0
        ? activeInn.balls.filter((b) => b.over === currentOverNumber - 1)
        : [],
    [activeInn.balls, currentOverNumber]
  );

  const partnership = useMemo(() => computeCurrentPartnership(activeInn), [activeInn]);
  const crr = calcRunRate(activeInn.runs, activeInn.legalBalls);
  const maxBalls = activeInn.maxOvers * 6;
  const remainingBalls = Math.max(0, maxBalls - activeInn.legalBalls);
  const target = innIdx === 1 ? activeInn.target ?? inn1.runs + 1 : null;
  const runsRequired = target !== null ? Math.max(0, target - activeInn.runs) : null;
  const rrr =
    runsRequired !== null && remainingBalls > 0
      ? ((runsRequired * 6) / remainingBalls).toFixed(2)
      : runsRequired === 0
        ? '0.00'
        : '--';

  const isPendingBowlerChange = Boolean(
    activeInn.pendingBowlerChange &&
      !activeInn.completed &&
      match.status !== 'completed'
  );
  const completedOverNum =
    activeInn.lastCompletedOverNumber || Math.floor(activeInn.legalBalls / 6);
  const previousOverBowlerId =
    activeInn.previousOverBowlerId ||
    (activeInn.legalBalls > 0 && activeInn.legalBalls % 6 === 0
      ? [...activeInn.balls].reverse().find((b) => b.isLegal)?.bowlerId ||
        activeInn.bowlerId
      : '');
  const isAtNewOverStart =
    activeInn.legalBalls > 0 && activeInn.legalBalls % 6 === 0;
  const blockPreviousBowler = isPendingBowlerChange || isAtNewOverStart;

  const bowlingStatsByPlayerId = useMemo(
    () => new Map(bowlingCard.map((row) => [row.playerId, row])),
    [bowlingCard]
  );

  const prevOverSummary = useMemo(() => {
    const runs = prevOverBalls.reduce((sum, b) => sum + b.totalRuns, 0);
    const wkts = prevOverBalls.filter(
      (b) => b.isWicket && b.wicketType !== 'Retired Hurt'
    ).length;
    return { runs, wkts };
  }, [prevOverBalls]);

  const getPlayerInitials = (name: string) =>
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || 'P';

  const triggerBowlerConfirmedBanner = (player?: Player) => {
    if (!player) return;
    if (confirmTimerRef.current !== null) {
      window.clearTimeout(confirmTimerRef.current);
    }
    setBowlerConfirmedBanner({
      bowlerName: player.name,
      overNumber: completedOverNum + 1,
      photoUrl: player.photoUrl,
      initials: getPlayerInitials(player.name),
    });
    confirmTimerRef.current = window.setTimeout(() => {
      setBowlerConfirmedBanner(null);
      confirmTimerRef.current = null;
    }, 3200);
  };

  const isPendingNewBatter = Boolean(
    !activeInn.completed &&
      match.status !== 'completed' &&
      (activeInn.pendingNewBatter ||
        (activeInn.balls.length > 0 && (!activeInn.strikerId || !activeInn.nonStrikerId)))
  );
  const needsOpeningSetup =
    !activeInn.completed &&
    match.status !== 'completed' &&
    (!activeInn.strikerId || !activeInn.nonStrikerId || !activeInn.bowlerId);
  const isTournamentExpiredFlag = isTournamentExpired(tournament);
  const isScoringLocked =
    isTournamentExpiredFlag ||
    match.status === 'completed' ||
    activeInn.completed ||
    isPendingNewBatter ||
    isPendingBowlerChange ||
    needsOpeningSetup;

  const updateCurrentMatch = (
    updater: (m: CricketMatch) => CricketMatch,
    transitionType?: TransitionOverlayType,
    actionId?: string
  ) => {
    if (isTournamentExpiredFlag) {
      onToast(TOURNAMENT_EXPIRED_MESSAGE);
      return;
    }
    updateState(
      (prev) => ({
        ...prev,
        matches: prev.matches.map((item) =>
          item.id === match.id ? updater(item) : item
        ),
        overlay:
          transitionType && prev.overlay.autoTransition
            ? {
                ...prev.overlay,
                activeTransition: {
                  type: transitionType,
                  id: Date.now(),
                },
              }
            : prev.overlay,
      }),
      actionId ? { actionId } : undefined
    );
  };

  const recordDelivery = (input: DeliveryInput, label?: string) => {
    const nowTs = performance.now();
    if (nowTs - lastScoringActionTsRef.current < 180) {
      return;
    }
    lastScoringActionTsRef.current = nowTs;

    if (isTournamentExpiredFlag) {
      onToast(TOURNAMENT_EXPIRED_MESSAGE);
      return;
    }

    if (isPendingNewBatter) {
      setNewBatterModalOpen(true);
      onToast('Player OUT! Please select or add the next batter before scoring.');
      return;
    }

    if (needsOpeningSetup) {
      onToast('Please select Striker, Non-Striker, and Bowler before scoring.');
      if (!activeInn.strikerId) setPlayerPickerSlot('striker');
      else if (!activeInn.nonStrikerId) setPlayerPickerSlot('nonStriker');
      else setPlayerPickerSlot('bowler');
      return;
    }

    if (isPendingBowlerChange) {
      setOverCompleteModalOpen(true);
      onToast('OVER COMPLETED! Please select a new bowler before scoring the next ball.');
      return;
    }

    if (isScoringLocked) {
      onToast(
        match.status === 'innings_break'
          ? '1st Innings finished. Click "End Innings & Switch to 2nd Innings" to continue.'
          : 'Match is completed. Use UNDO if you need to correct the last ball.'
      );
      return;
    }

    let autoTrans: TransitionOverlayType | undefined;
    if (input.isWicket && input.wicketType !== 'Retired Hurt') {
      autoTrans = 'Wicket';
    } else if (input.extraType === 'WD') {
      autoTrans = 'Wide';
    } else if (input.extraType === 'NB') {
      autoTrans = 'Noball';
    } else if (input.isBoundary6 === true) {
      autoTrans = 'Six';
    } else if (input.isBoundary4 === true) {
      autoTrans = 'Four';
    }

    const actionId = generateActionId('ball');
    updateCurrentMatch(
      (m) => applyDeliveryToMatch(m, input, state.teams),
      autoTrans,
      actionId
    );
    if (label) onToast(label);
  };

  const handleSwapBatsmen = () => {
    if (!activeInn.strikerId && !activeInn.nonStrikerId) return;
    updateCurrentMatch(
      (m) => {
        const nextInnings = [
          structuredClone(m.innings[0]),
          structuredClone(m.innings[1]),
        ] as [CricketMatch['innings'][0], CricketMatch['innings'][1]];
        const cur = nextInnings[m.currentInningsIndex];
        const tmp = cur.strikerId;
        cur.strikerId = cur.nonStrikerId;
        cur.nonStrikerId = tmp;
        return { ...m, innings: nextInnings };
      },
      undefined,
      generateActionId('swap')
    );
    onToast('Striker and Non-Striker swapped.');
  };

  const handleUndo = () => {
    const nowTs = performance.now();
    if (nowTs - lastUndoActionTsRef.current < 180) {
      return;
    }
    lastUndoActionTsRef.current = nowTs;

    if (!match.undoStack.length) {
      onToast('Nothing to undo.');
      return;
    }
    updateCurrentMatch(
      (m) => undoLastDelivery(m),
      undefined,
      generateActionId('undo')
    );
    onToast('Last ball undone.');
  };

  const isFirstInningsEnded =
    innIdx === 0 && (match.status === 'innings_break' || activeInn.completed);

  const openInningsSwitchModal = () => {
    setOverCompleteModalOpen(false);
    setInningsSwitchModalOpen(true);
  };

  const handleStartSecondInnings = () => {
    updateCurrentMatch((m) => {
      const nextInnings = [
        structuredClone(m.innings[0]),
        structuredClone(m.innings[1]),
      ] as [CricketMatch['innings'][0], CricketMatch['innings'][1]];
      nextInnings[0].completed = true;
      nextInnings[0].pendingBowlerChange = false;
      nextInnings[0].pendingNewBatter = false;
      nextInnings[0].pendingBatterSlot = undefined;
      const targetRuns = nextInnings[0].runs + 1;
      nextInnings[1].target = targetRuns;
      nextInnings[1].completed = false;
      nextInnings[1].pendingBowlerChange = false;
      nextInnings[1].pendingNewBatter = false;
      nextInnings[1].pendingBatterSlot = undefined;
      nextInnings[1].previousOverBowlerId = undefined;
      nextInnings[1].lastCompletedOverNumber = undefined;
      // Never auto-assign players or bowler on 2nd innings switch — scorer selects them via inline red buttons
      if (nextInnings[1].balls.length === 0) {
        nextInnings[1].strikerId = '';
        nextInnings[1].nonStrikerId = '';
        nextInnings[1].bowlerId = '';
        nextInnings[1].battingOrder = [];
      }
      const secondBatTeam = teamMap.get(nextInnings[1].battingTeamId);

      return {
        ...m,
        currentInningsIndex: 1,
        status: 'live',
        resultText: `${secondBatTeam?.shortName || 'Team 2'} need ${targetRuns} runs in ${nextInnings[1].maxOvers * 6} balls`,
        innings: nextInnings,
      };
    });
    setInningsSwitchModalOpen(false);
    setOverCompleteModalOpen(false);
    setInn2StrikerId('');
    setInn2NonStrikerId('');
    setInn2BowlerId('');
    setQuickPlayerName('');
    setQuickBowlPlayerName('');
    onToast('Switched to 2nd Innings! Tap Select Batsman & Select Bowler to start scoring.');
  };

  const handleConfirmSecondInningsSetup = () => {
    if (!inn2StrikerId || !inn2NonStrikerId || !inn2BowlerId) {
      onToast('Please select or add Opening Striker, Non-Striker, and Opening Bowler.');
      return;
    }
    if (inn2StrikerId === inn2NonStrikerId) {
      onToast('Striker and Non-Striker must be two different players.');
      return;
    }
    updateCurrentMatch((m) => {
      const nextInnings = [
        structuredClone(m.innings[0]),
        structuredClone(m.innings[1]),
      ] as [CricketMatch['innings'][0], CricketMatch['innings'][1]];
      const secondInn = nextInnings[1];
      secondInn.strikerId = inn2StrikerId;
      secondInn.nonStrikerId = inn2NonStrikerId;
      secondInn.bowlerId = inn2BowlerId;
      secondInn.pendingNewBatter = false;
      secondInn.pendingBatterSlot = undefined;
      secondInn.pendingBowlerChange = false;
      if (!secondInn.battingOrder.includes(inn2StrikerId)) {
        secondInn.battingOrder.push(inn2StrikerId);
      }
      if (!secondInn.battingOrder.includes(inn2NonStrikerId)) {
        secondInn.battingOrder.push(inn2NonStrikerId);
      }
      return { ...m, innings: nextInnings };
    });
    setSecondInningsSetupModalOpen(false);
    onToast('2nd Innings Batters & Bowler confirmed! Live scoring enabled.');
  };

  const handleConfirmMatchCompleted = () => {
    updateCurrentMatch((m) => ({
      ...m,
      status: 'completed',
      matchCompletedConfirmed: true,
    }));
    setMatchCompleteModalOpen(false);
    setOversInningsTab(inn2.balls.length > 0 ? 1 : 0);
    setActiveTab('overs');
    onToast('Match confirmed completed! Match Summary & Overs opened.');
  };

  const handleShowSummaryOnOverlay = () => {
    updateState((prev) => ({
      ...prev,
      overlay: {
        ...prev.overlay,
        mainCard: { kind: 'MATCH_STATS', mode: 'Match Summary' },
        bottomScoreMode: 'Result',
      },
    }));
    onToast('Match Summary & Result sent to Live Broadcast Overlay!');
  };

  const handleCompleteInningsOrMatch = () => {
    updateCurrentMatch((m) => {
      const nextInnings = [
        structuredClone(m.innings[0]),
        structuredClone(m.innings[1]),
      ] as [CricketMatch['innings'][0], CricketMatch['innings'][1]];
      const cur = nextInnings[m.currentInningsIndex];
      cur.completed = true;
      cur.pendingBowlerChange = false;
      if (m.currentInningsIndex === 0) {
        nextInnings[1].target = cur.runs + 1;
        return {
          ...m,
          status: 'innings_break',
          resultText: `Innings Break · Target ${cur.runs + 1} Runs`,
          innings: nextInnings,
        };
      }
      const t1Name = teamMap.get(nextInnings[0].battingTeamId)?.name || 'Team 1';
      const t2Name = teamMap.get(nextInnings[1].battingTeamId)?.name || 'Team 2';
      const diff = nextInnings[0].runs - nextInnings[1].runs;
      const resultText =
        diff > 0
          ? `${t1Name} won by ${diff} runs`
          : diff < 0
            ? `${t2Name} won by ${Math.max(1, 10 - nextInnings[1].wickets)} wickets`
            : 'Match Tied';
      return {
        ...m,
        status: 'completed',
        resultText,
        innings: nextInnings,
      };
    });
    setKeypadPanel('main');
    onToast(
      innIdx === 0
        ? '1st Innings declared closed.'
        : 'Match marked as Completed.'
    );
  };

  const handleSaveQuickTarget = (e: FormEvent) => {
    e.preventDefault();
    const targetVal = Math.max(1, Math.floor(Number(quickTargetValue) || 1));
    updateCurrentMatch((m) => {
      const nextInnings = [
        structuredClone(m.innings[0]),
        structuredClone(m.innings[1]),
      ] as [CricketMatch['innings'][0], CricketMatch['innings'][1]];
      nextInnings[1].target = targetVal;
      const secondBatTeam = teamMap.get(nextInnings[1].battingTeamId);
      const remBalls = Math.max(0, nextInnings[1].maxOvers * 6 - nextInnings[1].legalBalls);
      const need = Math.max(0, targetVal - nextInnings[1].runs);
      return {
        ...m,
        innings: nextInnings,
        resultText:
          m.currentInningsIndex === 1 && !nextInnings[1].completed
            ? `${secondBatTeam?.shortName || 'Team 2'} need ${need} runs in ${remBalls} balls`
            : m.resultText,
      };
    });
    setChangeTargetModalOpen(false);
    setKeypadPanel('main');
    onToast(`Target updated to ${targetVal} runs.`);
  };

  const handleSaveQuickOver = (e: FormEvent) => {
    e.preventDefault();
    const ovVal = Math.max(1, Math.min(50, Math.floor(Number(quickOverValue) || match.oversPerInnings)));
    updateCurrentMatch((m) => {
      const nextInnings = [
        structuredClone(m.innings[0]),
        structuredClone(m.innings[1]),
      ] as [CricketMatch['innings'][0], CricketMatch['innings'][1]];
      nextInnings[0].maxOvers = ovVal;
      nextInnings[1].maxOvers = ovVal;
      return {
        ...m,
        oversPerInnings: ovVal,
        innings: nextInnings,
      };
    });
    setChangeOverModalOpen(false);
    setKeypadPanel('main');
    onToast(`Match overs updated to ${ovVal} overs.`);
  };

  const handleConfirmWalkOver = (e: FormEvent) => {
    e.preventDefault();
    if (!walkOverWinnerId) {
      onToast('Please select the winning team for Walk Over.');
      return;
    }
    const winnerTeam = teamMap.get(walkOverWinnerId);
    updateCurrentMatch((m) => {
      const nextInnings = [
        structuredClone(m.innings[0]),
        structuredClone(m.innings[1]),
      ] as [CricketMatch['innings'][0], CricketMatch['innings'][1]];
      nextInnings[0].completed = true;
      nextInnings[1].completed = true;
      nextInnings[0].pendingBowlerChange = false;
      nextInnings[1].pendingBowlerChange = false;
      nextInnings[0].pendingNewBatter = false;
      nextInnings[1].pendingNewBatter = false;
      return {
        ...m,
        status: 'completed',
        resultText: `${winnerTeam?.name || 'Team'} won by Walk Over`,
        innings: nextInnings,
      };
    });
    setWalkOverModalOpen(false);
    setKeypadPanel('main');
    onToast(`${winnerTeam?.name || 'Team'} declared winner by Walk Over.`);
  };

  const openWicketModal = () => {
    setWicketStep('types');
    setWicketType('Bowled');
    setWicketDismissedId(activeInn.strikerId);
    setWicketRunsCompleted(0);
    setWicketNextBatterId('');
    setWicketModalOpen(true);
  };

  const handleDirectWicketTap = (wt: WicketType) => {
    if (wt === 'Run Out') {
      setWicketType('Run Out');
      setWicketDismissedId(activeInn.strikerId);
      setWicketRunsCompleted(0);
      setWicketStep('runout');
      return;
    }
    const dismissedId =
      wt === 'Mankad Runout'
        ? activeInn.nonStrikerId || activeInn.strikerId
        : activeInn.strikerId;
    recordDelivery(
      {
        runsOffBat: 0,
        extraType: 'none',
        isWicket: true,
        wicketType: wt,
        dismissedPlayerId: dismissedId,
      },
      `OUT · ${wt}`
    );
    setWicketModalOpen(false);
    setWicketStep('types');
  };

  const submitRunOutWicket = () => {
    recordDelivery(
      {
        runsOffBat: wicketRunsCompleted,
        extraType: 'none',
        isWicket: true,
        wicketType: 'Run Out',
        dismissedPlayerId: wicketDismissedId || activeInn.strikerId,
      },
      `OUT · Run Out${wicketRunsCompleted > 0 ? ` (+${wicketRunsCompleted}r)` : ''}`
    );
    setWicketModalOpen(false);
    setWicketStep('types');
  };

  const handleConfirmNextBatter = (batterId: string) => {
    if (!batterId) {
      onToast('Please select or add the next batter before continuing.');
      return;
    }
    const isAlreadyOut = activeInn.fallOfWickets.some((f) => f.playerId === batterId);
    if (isAlreadyOut) {
      onToast('This player is already OUT. Please select another batter.');
      return;
    }
    if (batterId === activeInn.strikerId || batterId === activeInn.nonStrikerId) {
      onToast('This player is already at the crease. Please select a different batter.');
      return;
    }
    const chosenPlayer = battingTeam?.players.find((p) => p.id === batterId);
    updateCurrentMatch((m) => {
      const nextInnings = [
        structuredClone(m.innings[0]),
        structuredClone(m.innings[1]),
      ] as [CricketMatch['innings'][0], CricketMatch['innings'][1]];
      const cur = nextInnings[m.currentInningsIndex];
      const slot =
        cur.pendingBatterSlot || (!cur.strikerId ? 'striker' : 'nonStriker');
      if (slot === 'striker') {
        cur.strikerId = batterId;
      } else {
        cur.nonStrikerId = batterId;
      }
      if (!cur.battingOrder.includes(batterId)) {
        cur.battingOrder.push(batterId);
      }
      cur.pendingNewBatter = false;
      cur.pendingBatterSlot = undefined;
      return { ...m, innings: nextInnings };
    });
    setNewBatterModalOpen(false);
    setSelectedNextBatterId('');
    onToast(`Next batter selected: ${chosenPlayer?.name || 'Batter'} · Scoring enabled!`);
  };

  const handleConfirmNextBowler = (bowlerId: string) => {
    if (!bowlerId) {
      onToast('Please select a bowler for the next over.');
      return;
    }
    if (previousOverBowlerId && bowlerId === previousOverBowlerId) {
      onToast('Previous over bowler cannot bowl consecutive overs.');
      return;
    }
    const chosenPlayer = bowlingTeam?.players.find((p) => p.id === bowlerId);
    updateCurrentMatch((m) => {
      const nextInnings = [
        structuredClone(m.innings[0]),
        structuredClone(m.innings[1]),
      ] as [CricketMatch['innings'][0], CricketMatch['innings'][1]];
      const cur = nextInnings[m.currentInningsIndex];
      cur.bowlerId = bowlerId;
      cur.pendingBowlerChange = false;
      if (previousOverBowlerId) {
        cur.previousOverBowlerId = previousOverBowlerId;
      }
      return { ...m, innings: nextInnings };
    });
    setOverCompleteModalOpen(false);
    setSelectedNextBowlerId('');
    triggerBowlerConfirmedBanner(chosenPlayer);
    onToast(
      `New bowler selected: ${chosenPlayer?.name || 'Bowler'} · Over ${completedOverNum + 1} ready!`
    );
  };

  const handleAssignPlayerSlot = (playerId: string) => {
    if (!playerPickerSlot) return;
    if (
      (playerPickerSlot === 'striker' || playerPickerSlot === 'nonStriker') &&
      activeInn.fallOfWickets.some((f) => f.playerId === playerId)
    ) {
      onToast('This player is already OUT and cannot bat again.');
      return;
    }
    if (
      playerPickerSlot === 'bowler' &&
      blockPreviousBowler &&
      previousOverBowlerId &&
      playerId === previousOverBowlerId
    ) {
      onToast('Previous over bowler is disabled and cannot bowl consecutive overs.');
      return;
    }
    const chosenBowler =
      playerPickerSlot === 'bowler'
        ? bowlingTeam?.players.find((p) => p.id === playerId)
        : undefined;
    const wasPendingOverChange = playerPickerSlot === 'bowler' && isPendingBowlerChange;

    updateCurrentMatch((m) => {
      const nextInnings = [
        structuredClone(m.innings[0]),
        structuredClone(m.innings[1]),
      ] as [CricketMatch['innings'][0], CricketMatch['innings'][1]];
      const cur = nextInnings[m.currentInningsIndex];
      if (playerPickerSlot === 'striker') {
        if (playerId === cur.nonStrikerId) {
          cur.nonStrikerId = cur.strikerId;
        }
        cur.strikerId = playerId;
        if (!cur.battingOrder.includes(playerId)) cur.battingOrder.push(playerId);
        if (cur.strikerId && cur.nonStrikerId) {
          cur.pendingNewBatter = false;
          cur.pendingBatterSlot = undefined;
        }
      } else if (playerPickerSlot === 'nonStriker') {
        if (playerId === cur.strikerId) {
          cur.strikerId = cur.nonStrikerId;
        }
        cur.nonStrikerId = playerId;
        if (!cur.battingOrder.includes(playerId)) cur.battingOrder.push(playerId);
        if (cur.strikerId && cur.nonStrikerId) {
          cur.pendingNewBatter = false;
          cur.pendingBatterSlot = undefined;
        }
      } else {
        cur.bowlerId = playerId;
        if (cur.pendingBowlerChange) {
          cur.pendingBowlerChange = false;
        }
      }
      return { ...m, innings: nextInnings };
    });
    setPlayerPickerSlot(null);
    if (wasPendingOverChange) {
      setOverCompleteModalOpen(false);
      setSelectedNextBowlerId('');
      triggerBowlerConfirmedBanner(chosenBowler);
      onToast(`New bowler selected: ${chosenBowler?.name || 'Bowler'}. Scoring enabled!`);
    } else {
      onToast('Player assigned.');
    }
  };

  const openEditPlayerModal = (slot: 'striker' | 'nonStriker' | 'bowler') => {
    setSlotMenuOpen(null);
    if (slot === 'striker') {
      if (!activeInn.strikerId || !battingTeam) return;
      setEditPlayerModal({
        slot: 'striker',
        playerId: activeInn.strikerId,
        teamId: battingTeam.id,
      });
      setEditPlayerName(strikerStats?.playerName || '');
      setEditBatterScore(String(strikerStats?.runs ?? 0));
      setEditBatterBalls(String(strikerStats?.balls ?? 0));
      setEditBatter4s(String(strikerStats?.fours ?? 0));
      setEditBatter6s(String(strikerStats?.sixes ?? 0));
    } else if (slot === 'nonStriker') {
      if (!activeInn.nonStrikerId || !battingTeam) return;
      setEditPlayerModal({
        slot: 'nonStriker',
        playerId: activeInn.nonStrikerId,
        teamId: battingTeam.id,
      });
      setEditPlayerName(nonStrikerStats?.playerName || '');
      setEditBatterScore(String(nonStrikerStats?.runs ?? 0));
      setEditBatterBalls(String(nonStrikerStats?.balls ?? 0));
      setEditBatter4s(String(nonStrikerStats?.fours ?? 0));
      setEditBatter6s(String(nonStrikerStats?.sixes ?? 0));
    } else {
      if (!activeInn.bowlerId || !bowlingTeam) return;
      setEditPlayerModal({
        slot: 'bowler',
        playerId: activeInn.bowlerId,
        teamId: bowlingTeam.id,
      });
      setEditPlayerName(bowlerStats?.playerName || '');
      setEditBowlerOvers(bowlerStats?.overs ?? '0.0');
      setEditBowlerMaidens(String(bowlerStats?.maidens ?? 0));
      setEditBowlerRuns(String(bowlerStats?.runs ?? 0));
      setEditBowlerWickets(String(bowlerStats?.wickets ?? 0));
    }
  };

  const handleSaveEditPlayer = (e: FormEvent) => {
    e.preventDefault();
    if (!editPlayerModal) return;
    const cleanName = editPlayerName.trim();
    if (!cleanName) {
      onToast('Please enter a player name.');
      return;
    }
    const targetTeam = teamMap.get(editPlayerModal.teamId);
    if (targetTeam) {
      const normalized = cleanName.toLowerCase();
      const duplicate = targetTeam.players.some(
        (p) =>
          p.id !== editPlayerModal.playerId &&
          p.name.trim().toLowerCase() === normalized
      );
      if (duplicate) {
        onToast(`Player "${cleanName}" already exists in ${targetTeam.name}.`);
        return;
      }
    }

    const { slot, playerId, teamId } = editPlayerModal;

    if (slot === 'striker' || slot === 'nonStriker') {
      const desiredRuns = Math.max(0, Math.floor(Number(editBatterScore) || 0));
      const desiredBalls = Math.max(0, Math.floor(Number(editBatterBalls) || 0));
      const desired4s = Math.max(0, Math.floor(Number(editBatter4s) || 0));
      const desired6s = Math.max(0, Math.floor(Number(editBatter6s) || 0));

      // Compute raw ball-derived stats so offsets persist cleanly across future deliveries
      let rawRuns = 0;
      let rawBalls = 0;
      let raw4s = 0;
      let raw6s = 0;
      for (const b of activeInn.balls) {
        if (b.strikerId !== playerId) continue;
        if (b.extraType !== 'WD' && b.extraType !== 'PENALTY') rawBalls += 1;
        rawRuns += b.runsOffBat;
        if (b.isBoundary4) raw4s += 1;
        if (b.isBoundary6) raw6s += 1;
      }

      updateState((prev) => ({
        ...prev,
        teams: prev.teams.map((t) =>
          t.id === teamId
            ? {
                ...t,
                players: t.players.map((p) =>
                  p.id === playerId ? { ...p, name: cleanName } : p
                ),
              }
            : t
        ),
        matches: prev.matches.map((m) => {
          if (m.id !== match.id) return m;
          const nextInnings = [
            structuredClone(m.innings[0]),
            structuredClone(m.innings[1]),
          ] as [CricketMatch['innings'][0], CricketMatch['innings'][1]];
          const cur = nextInnings[m.currentInningsIndex];
          cur.battingStatOffsets = {
            ...(cur.battingStatOffsets ?? {}),
            [playerId]: {
              runs: desiredRuns - rawRuns,
              balls: desiredBalls - rawBalls,
              fours: desired4s - raw4s,
              sixes: desired6s - raw6s,
            },
          };
          return { ...m, innings: nextInnings };
        }),
      }));

      setEditPlayerModal(null);
      onToast(`${slot === 'striker' ? 'Striker' : 'Non-Striker'} updated.`);
    } else {
      const oversParts = editBowlerOvers.trim().split('.');
      const ovWhole = Math.max(0, parseInt(oversParts[0] || '0', 10) || 0);
      const ovBalls = Math.max(
        0,
        Math.min(5, parseInt(oversParts[1] || '0', 10) || 0)
      );
      const desiredLegalBalls = ovWhole * 6 + ovBalls;
      const desiredMaidens = Math.max(0, Math.floor(Number(editBowlerMaidens) || 0));
      const desiredRuns = Math.max(0, Math.floor(Number(editBowlerRuns) || 0));
      const desiredWickets = Math.max(0, Math.floor(Number(editBowlerWickets) || 0));

      let rawLegalBalls = 0;
      let rawRuns = 0;
      let rawWickets = 0;
      const overRuns = new Map<number, { legal: number; conceded: number }>();
      for (const b of activeInn.balls) {
        if (b.bowlerId !== playerId) continue;
        if (b.isLegal) rawLegalBalls += 1;
        let bowlerRuns = 0;
        if (b.extraType === 'WD') bowlerRuns = b.extraRuns;
        else if (b.extraType === 'NB') bowlerRuns = b.runsOffBat + b.extraRuns;
        else if (b.extraType === 'none') bowlerRuns = b.runsOffBat;
        rawRuns += bowlerRuns;
        if (
          b.isWicket &&
          b.wicketType !== 'Run Out' &&
          b.wicketType !== 'Retired Hurt' &&
          b.wicketType !== 'Retired Out' &&
          b.wicketType !== 'Time Out' &&
          b.wicketType !== 'Obstructing the Field' &&
          b.wicketType !== 'Mankad Runout'
        ) {
          rawWickets += 1;
        }
        const entry = overRuns.get(b.over) ?? { legal: 0, conceded: 0 };
        if (b.isLegal) entry.legal += 1;
        entry.conceded += bowlerRuns;
        overRuns.set(b.over, entry);
      }
      let rawMaidens = 0;
      overRuns.forEach((ov) => {
        if (ov.legal === 6 && ov.conceded === 0) rawMaidens += 1;
      });

      updateState((prev) => ({
        ...prev,
        teams: prev.teams.map((t) =>
          t.id === teamId
            ? {
                ...t,
                players: t.players.map((p) =>
                  p.id === playerId ? { ...p, name: cleanName } : p
                ),
              }
            : t
        ),
        matches: prev.matches.map((m) => {
          if (m.id !== match.id) return m;
          const nextInnings = [
            structuredClone(m.innings[0]),
            structuredClone(m.innings[1]),
          ] as [CricketMatch['innings'][0], CricketMatch['innings'][1]];
          const cur = nextInnings[m.currentInningsIndex];
          cur.bowlingStatOffsets = {
            ...(cur.bowlingStatOffsets ?? {}),
            [playerId]: {
              legalBalls: desiredLegalBalls - rawLegalBalls,
              maidens: desiredMaidens - rawMaidens,
              runs: desiredRuns - rawRuns,
              wickets: desiredWickets - rawWickets,
            },
          };
          return { ...m, innings: nextInnings };
        }),
      }));

      setEditPlayerModal(null);
      onToast('Bowler updated.');
    }
  };

  const handleQuickAddPlayer = (
    targetTeamId: string,
    assignToSlot?:
      | 'striker'
      | 'nonStriker'
      | 'bowler'
      | 'nextWicket'
      | 'overBowler'
      | 'newBatter'
      | 'inn2Bat'
      | 'inn2Bowl',
    customName?: string
  ) => {
    const rawName = customName !== undefined ? customName : quickPlayerName;
    const clean = rawName.trim();
    if (!clean) {
      onToast('Please enter a player name.');
      return;
    }
    const teamObj = teamMap.get(targetTeamId);
    if (!teamObj) return;

    // Prevent duplicate player names (case-insensitive) within the same team
    const normalized = clean.toLowerCase();
    const isDuplicateName = teamObj.players.some(
      (p) => p.name.trim().toLowerCase() === normalized
    );
    if (isDuplicateName) {
      onToast(
        `Player "${clean}" already exists in ${teamObj.name}. Same name player cannot be added!`
      );
      return;
    }

    const newPlayer: Player = {
      id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: clean,
      role:
        assignToSlot === 'overBowler' || assignToSlot === 'inn2Bowl'
          ? 'Bowler'
          : 'All-Rounder',
      battingStyle: 'Right-Hand Bat',
      bowlingStyle: 'Right-Arm Medium',
      jerseyNo: teamObj.players.length + 1,
    };
    const wasPendingOverChange = assignToSlot === 'bowler' && isPendingBowlerChange;

    updateState((prev) => {
      const updatedTeams = prev.teams.map((t) =>
        t.id === targetTeamId ? { ...t, players: [...t.players, newPlayer] } : t
      );
      const updatedMatches = prev.matches.map((m) => {
        if (m.id !== match.id) return m;
        const nextInnings = [
          structuredClone(m.innings[0]),
          structuredClone(m.innings[1]),
        ] as [CricketMatch['innings'][0], CricketMatch['innings'][1]];
        const cur = nextInnings[m.currentInningsIndex];
        if (assignToSlot === 'striker') {
          cur.strikerId = newPlayer.id;
          if (!cur.battingOrder.includes(newPlayer.id)) cur.battingOrder.push(newPlayer.id);
          if (cur.strikerId && cur.nonStrikerId) {
            cur.pendingNewBatter = false;
            cur.pendingBatterSlot = undefined;
          }
        } else if (assignToSlot === 'nonStriker') {
          cur.nonStrikerId = newPlayer.id;
          if (!cur.battingOrder.includes(newPlayer.id)) cur.battingOrder.push(newPlayer.id);
          if (cur.strikerId && cur.nonStrikerId) {
            cur.pendingNewBatter = false;
            cur.pendingBatterSlot = undefined;
          }
        } else if (assignToSlot === 'bowler') {
          cur.bowlerId = newPlayer.id;
          if (cur.pendingBowlerChange) {
            cur.pendingBowlerChange = false;
          }
        }
        return { ...m, innings: nextInnings };
      });
      return { ...prev, teams: updatedTeams, matches: updatedMatches };
    });

    if (assignToSlot === 'nextWicket') {
      setWicketNextBatterId(newPlayer.id);
    } else if (assignToSlot === 'overBowler') {
      setSelectedNextBowlerId(newPlayer.id);
    } else if (assignToSlot === 'newBatter') {
      setSelectedNextBatterId(newPlayer.id);
    } else if (assignToSlot === 'inn2Bat') {
      if (!inn2StrikerId) {
        setInn2StrikerId(newPlayer.id);
      } else if (!inn2NonStrikerId) {
        setInn2NonStrikerId(newPlayer.id);
      }
    } else if (assignToSlot === 'inn2Bowl') {
      setInn2BowlerId(newPlayer.id);
    } else if (assignToSlot) {
      setPlayerPickerSlot(null);
      if (wasPendingOverChange) {
        setOverCompleteModalOpen(false);
        triggerBowlerConfirmedBanner(newPlayer);
      }
    }

    if (assignToSlot === 'inn2Bowl') {
      setQuickBowlPlayerName('');
    } else {
      setQuickPlayerName('');
    }
    onToast(`Player "${clean}" added to ${teamObj.shortName}.`);
  };

  const openEditScoreModal = (idx: 0 | 1) => {
    const targetInn = match.innings[idx];
    setEditInningsIdx(idx);
    setEditRuns(String(targetInn.runs));
    setEditWickets(String(targetInn.wickets));
    setEditBalls(String(targetInn.legalBalls));
    setEditWides(String(targetInn.extras?.wd ?? 0));
    setEditNoBalls(String(targetInn.extras?.nb ?? 0));
    setEditByes(String(targetInn.extras?.bye ?? 0));
    setEditLegByes(String(targetInn.extras?.lb ?? 0));
    setEditMaxOvers(String(targetInn.maxOvers));
    setEditTarget(
      idx === 1
        ? String(targetInn.target !== null ? targetInn.target : match.innings[0].runs + 1)
        : ''
    );
    setEditScoreModalOpen(true);
  };

  const submitEditScoreModal = (e?: FormEvent) => {
    e?.preventDefault();
    const runsVal = Math.max(0, Math.floor(Number(editRuns) || 0));
    const wktsVal = Math.min(10, Math.max(0, Math.floor(Number(editWickets) || 0)));
    const ballsVal = Math.max(0, Math.floor(Number(editBalls) || 0));
    const widesVal = Math.max(0, Math.floor(Number(editWides) || 0));
    const noBallsVal = Math.max(0, Math.floor(Number(editNoBalls) || 0));
    const byesVal = Math.max(0, Math.floor(Number(editByes) || 0));
    const legByesVal = Math.max(0, Math.floor(Number(editLegByes) || 0));
    const maxOvVal = Math.max(1, Math.floor(Number(editMaxOvers) || match.oversPerInnings));
    const targetVal =
      editTarget.trim() !== '' ? Math.max(1, Math.floor(Number(editTarget) || 1)) : null;

    updateCurrentMatch((m) => {
      const nextInnings = [
        structuredClone(m.innings[0]),
        structuredClone(m.innings[1]),
      ] as [CricketMatch['innings'][0], CricketMatch['innings'][1]];
      const target = nextInnings[editInningsIdx];
      target.runs = runsVal;
      target.wickets = wktsVal;
      target.legalBalls = ballsVal;
      target.maxOvers = maxOvVal;
      target.extras = {
        ...target.extras,
        wd: widesVal,
        nb: noBallsVal,
        bye: byesVal,
        lb: legByesVal,
      };
      if (ballsVal === 0 || ballsVal % 6 !== 0) {
        target.pendingBowlerChange = false;
      }
      if (editInningsIdx === 1) {
        nextInnings[1].target = targetVal;
      } else if (nextInnings[0].completed) {
        nextInnings[1].target = runsVal + 1;
      }
      return {
        ...m,
        oversPerInnings: maxOvVal,
        innings: nextInnings,
      };
    });
    setEditScoreModalOpen(false);
    onToast(
      editInningsIdx === 0 ? '1st Innings Score updated.' : '2nd Innings Score updated.'
    );
  };

  const openTossModal = () => {
    setTossWinnerId(match.tossWinnerId || match.team1Id);
    setTossDecision(match.tossDecision || 'Bat');
    setTossModalOpen(true);
  };

  const submitTossModal = () => {
    const winnerId = tossWinnerId || match.team1Id;
    const loserId = winnerId === match.team1Id ? match.team2Id : match.team1Id;
    const batFirstId = tossDecision === 'Bat' ? winnerId : loserId;
    const bowlFirstId = batFirstId === match.team1Id ? match.team2Id : match.team1Id;
    const batFirstTeam = teamMap.get(batFirstId);
    const bowlFirstTeam = teamMap.get(bowlFirstId);

    updateCurrentMatch((m) => {
      const canSwapInningsOrder =
        m.innings[0].balls.length === 0 && m.innings[1].balls.length === 0;
      const nextInnings = [
        structuredClone(m.innings[0]),
        structuredClone(m.innings[1]),
      ] as [CricketMatch['innings'][0], CricketMatch['innings'][1]];

      if (canSwapInningsOrder) {
        nextInnings[0].battingTeamId = batFirstId;
        nextInnings[0].bowlingTeamId = bowlFirstId;
        nextInnings[0].strikerId = batFirstTeam?.players[0]?.id || '';
        nextInnings[0].nonStrikerId = batFirstTeam?.players[1]?.id || '';
        nextInnings[0].bowlerId = bowlFirstTeam?.players[0]?.id || '';
        nextInnings[0].battingOrder = [
          nextInnings[0].strikerId,
          nextInnings[0].nonStrikerId,
        ].filter(Boolean);

        nextInnings[1].battingTeamId = bowlFirstId;
        nextInnings[1].bowlingTeamId = batFirstId;
        nextInnings[1].strikerId = bowlFirstTeam?.players[0]?.id || '';
        nextInnings[1].nonStrikerId = bowlFirstTeam?.players[1]?.id || '';
        nextInnings[1].bowlerId = batFirstTeam?.players[0]?.id || '';
        nextInnings[1].battingOrder = [
          nextInnings[1].strikerId,
          nextInnings[1].nonStrikerId,
        ].filter(Boolean);
      }

      const winnerTeam = teamMap.get(winnerId);
      return {
        ...m,
        tossWinnerId: winnerId,
        tossDecision,
        tossCompleted: true,
        resultText:
          m.status === 'not_started'
            ? `${winnerTeam?.shortName || 'Team'} won the toss & elected to ${tossDecision.toLowerCase()}`
            : m.resultText,
        innings: nextInnings,
      };
    });
    setTossModalOpen(false);
    onToast('Toss saved.');
  };

  const renderBallChip = (b: BallEvent) => {
    const label = getBallPillLabel(b);
    let cls = 'bg-slate-100 text-slate-800 border-slate-300';
    if (b.isWicket) cls = 'bg-[#DC2626] text-white border-[#B91C1C]';
    else if (b.isBoundary6) cls = 'bg-[#7C3AED] text-white border-[#6D28D9]';
    else if (b.isBoundary4) cls = 'bg-[#FACC15] text-slate-950 border-[#EAB308]';
    else if (b.extraType !== 'none') cls = 'bg-[#16A34A] text-white border-[#15803D]';
    else if (b.runsOffBat > 0) cls = 'bg-[#FF8C00] text-white border-[#E87500]';
    return (
      <span
        key={b.id}
        className={`inline-flex items-center justify-center min-w-[30px] h-7 px-2 rounded-full text-xs font-bold border ${cls}`}
      >
        {label}
      </span>
    );
  };

  const scorecardInn = match.innings[scorecardInningsTab];
  const scorecardBatTeam = teamMap.get(scorecardInn.battingTeamId);
  const scorecardBowlTeam = teamMap.get(scorecardInn.bowlingTeamId);
  const scorecardBatRows = useMemo(
    () => computeBattingCard(scorecardInn, scorecardBatTeam),
    [scorecardInn, scorecardBatTeam]
  );
  const scorecardBowlRows = useMemo(
    () => computeBowlingCard(scorecardInn, scorecardBowlTeam),
    [scorecardInn, scorecardBowlTeam]
  );
  const scorecardPartnerships = useMemo(
    () => computePartnershipsList(scorecardInn, scorecardBatTeam),
    [scorecardInn, scorecardBatTeam]
  );
  const totalExtras =
    scorecardInn.extras.wd +
    scorecardInn.extras.nb +
    scorecardInn.extras.lb +
    scorecardInn.extras.bye +
    scorecardInn.extras.penalty;

  const allMatchPlayers = useMemo(() => {
    const list: Array<{ player: Player; teamShort: string }> = [];
    team1?.players.forEach((p) => list.push({ player: p, teamShort: team1.shortName }));
    team2?.players.forEach((p) => list.push({ player: p, teamShort: team2.shortName }));
    return list;
  }, [team1, team2]);

  return (
    <div className="space-y-4">
      {isTournamentExpiredFlag && tournament && (
        <div
          role="alert"
          className="rounded-xl bg-red-600 text-white px-4 py-3.5 shadow-md flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex items-start gap-2.5 min-w-0">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-display font-bold text-sm">
                Tournament Expired — Live Scoring Disabled
              </p>
              <p className="text-xs text-red-100 mt-0.5">
                &ldquo;{tournament.name}&rdquo; expired after{' '}
                {formatSingleDateHuman(getTournamentExpiryDate(tournament) || tournament.endDate)}.
                All scoring actions and broadcast updates are locked for expired tournaments.
              </p>
            </div>
          </div>
          {onNavigateToMatches && (
            <button
              type="button"
              onClick={onNavigateToMatches}
              className="px-3.5 py-1.5 rounded-lg bg-white text-red-700 hover:bg-red-50 text-xs font-extrabold uppercase tracking-wider shrink-0"
            >
              Back to Matches
            </button>
          )}
        </div>
      )}

      {/* Top Bar: Match Context + Quick Switcher + Overlay Control */}
      <div className="rounded-xl wo-card overflow-hidden">
        <div className="wo-header text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {onNavigateToMatches && (
              <button
                type="button"
                onClick={onNavigateToMatches}
                aria-label="Back to match list"
                className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 border border-white/35 transition-all"
              >
                <ArrowLeft className="w-4 h-4 text-white" aria-hidden="true" />
              </button>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display font-black text-sm sm:text-base text-white truncate">
                  {team1?.name || 'Team 1'} vs {team2?.name || 'Team 2'}
                </span>
                <span className="px-2 py-0.5 rounded bg-white/20 border border-white/35 text-white text-[10px] font-bold uppercase tracking-wider">
                  {match.stageBadge}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    isTournamentExpiredFlag
                      ? 'bg-red-600 text-white'
                      : match.status === 'live'
                        ? 'bg-white text-[#E87500]'
                        : match.status === 'completed'
                          ? 'bg-emerald-600 text-white'
                          : match.status === 'innings_break'
                            ? 'bg-amber-100 text-[#B45309]'
                            : 'bg-white/20 text-white border border-white/35'
                  }`}
                >
                  {isTournamentExpiredFlag ? 'expired' : match.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-[11px] text-orange-100 truncate">
                {tournament?.name || 'Tournament'} · {match.matchLabel} · {match.oversPerInnings}{' '}
                Overs ({match.ballType}) · ID: {match.id}
              </p>
            </div>
          </div>

          {/* Real-Time Firestore Connection Status */}
          {firestoreStatus && (
            <div className="flex items-center gap-2 shrink-0">
              {firestoreStatus === 'auth-required' && onConnectFirebaseLive ? (
                <button
                  type="button"
                  disabled={connectingFirebase}
                  onClick={async () => {
                    setConnectingFirebase(true);
                    try {
                      await onConnectFirebaseLive();
                      onToast('Firebase Real-Time Live Sync connected!');
                    } finally {
                      setConnectingFirebase(false);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white text-[#E87500] hover:bg-orange-50 text-[11px] font-extrabold shadow-xs transition-all disabled:opacity-60"
                >
                  <Zap className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{connectingFirebase ? 'Connecting…' : 'Enable Fast Live Sync'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onSyncNow}
                  title={
                    firebaseUserEmail
                      ? `Firebase Live Sync (${firebaseUserEmail}) — click to force sync`
                      : 'Click to sync now'
                  }
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-colors ${
                    firestoreStatus === 'connected'
                      ? 'bg-emerald-500/20 border-emerald-300/60 text-white'
                      : firestoreStatus === 'syncing' || firestoreStatus === 'reconnecting'
                        ? 'bg-amber-400/25 border-amber-200/70 text-white'
                        : 'bg-red-600/90 border-red-300/80 text-white'
                  }`}
                >
                  {firestoreStatus === 'offline' ? (
                    <WifiOff className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  ) : (
                    <Wifi className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  )}
                  <span className="whitespace-nowrap">
                    {firestoreStatus === 'connected'
                      ? lastSyncLatencyMs
                        ? `Live · ${lastSyncLatencyMs}ms`
                        : 'Live Connected'
                      : firestoreStatus === 'syncing'
                        ? 'Syncing…'
                        : firestoreStatus === 'reconnecting'
                          ? 'Reconnecting…'
                          : 'Offline · Queued'}
                  </span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* 4 Main Tabs: SCORING PANEL | SCORECARD | OVERS | OVERLAY */}
        <div className="grid grid-cols-4 border-t border-slate-200 bg-white">
          {(
            [
              { id: 'scoring', label: 'SCORING PANEL', mobileLabel: 'SCORING' },
              { id: 'scorecard', label: 'SCORECARD', mobileLabel: 'SCORECARD' },
              {
                id: 'overs',
                label: match.status === 'completed' ? 'OVERS & SUMMARY' : 'OVERS',
                mobileLabel: 'OVERS',
              },
              { id: 'overlay', label: 'OVERLAY', mobileLabel: 'OVERLAY' },
            ] as const
          ).map((tab) => (
            <motion.button
              key={tab.id}
              type="button"
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2.5 sm:py-3 px-1 text-[11px] sm:text-sm font-extrabold tracking-wide transition-all border-b-2 text-center ${
                activeTab === tab.id
                  ? 'border-[#FF8C00] text-[#E87500] bg-[#FFF3E0]/70'
                  : 'border-transparent text-slate-600 hover:text-[#FF8C00] hover:bg-orange-50/40'
              }`}
            >
              <span className="sm:hidden">{tab.mobileLabel}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* ================= TAB 1: SCORING PANEL ================= */}
      {activeTab === 'scoring' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
          className="space-y-4"
        >
          {/* Hidden Quick Team Logo Upload Input */}
          <input
            ref={quickTeamLogoInputRef}
            type="file"
            accept="image/*"
            onChange={handleScoringTeamLogoFile}
            className="hidden"
          />

          {/* Dual Innings Score Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {([0, 1] as const).map((idx) => {
              const inn = match.innings[idx];
              const batTeam = idx === 0 ? inn1Team : inn2Team;
              const isCurrent = innIdx === idx;
              return (
                <div
                  key={idx}
                  className={`rounded-xl wo-card p-4 transition-all text-slate-900 ${
                    isCurrent
                      ? 'ring-2 ring-[#FF8C00]'
                      : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {batTeam && (
                        <button
                          type="button"
                          onClick={() => triggerScoringTeamLogoUpload(batTeam.id)}
                          title={batTeam.logoUrl ? 'Change team logo' : 'Add team logo'}
                          className="relative w-10 h-10 rounded-lg border border-orange-200 bg-orange-50/70 flex items-center justify-center overflow-hidden shrink-0 hover:border-[#FF8C00] transition-colors"
                        >
                          {batTeam.logoUrl ? (
                            <img
                              src={batTeam.logoUrl}
                              alt={batTeam.name}
                              className="w-full h-full object-contain p-0.5 bg-white"
                            />
                          ) : (
                            <span className="font-display font-black text-[11px] text-[#E87500]">
                              {batTeam.shortName.slice(0, 3)}
                            </span>
                          )}
                          <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#FF8C00] text-white flex items-center justify-center border border-white">
                            <Camera className="w-2.5 h-2.5" aria-hidden="true" />
                          </span>
                        </button>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            {idx === 0 ? '1st Innings' : '2nd Innings'}
                          </span>
                          {isCurrent && !inn.completed && (
                            <span className="px-2 py-0.5 rounded bg-[#FF8C00] text-white text-[10px] font-extrabold uppercase">
                              Batting
                            </span>
                          )}
                          {inn.completed && (
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold uppercase">
                              Closed
                            </span>
                          )}
                        </div>
                        <h3 className="font-display font-black text-base text-slate-900 truncate mt-0.5">
                          {batTeam?.name || (idx === 0 ? 'Team 1' : 'Team 2')}
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {batTeam && (
                        <button
                          type="button"
                          onClick={() => triggerScoringTeamLogoUpload(batTeam.id)}
                          title={batTeam.logoUrl ? 'Change team logo' : 'Upload team logo'}
                          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg wo-btn-secondary text-xs font-bold"
                        >
                          <Camera className="w-3.5 h-3.5 text-[#FF8C00]" aria-hidden="true" />
                          <span>Logo</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openEditScoreModal(idx)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg wo-btn-secondary text-xs font-bold"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-[#FF8C00]" aria-hidden="true" />
                        <span>Edit</span>
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex items-baseline justify-between gap-3">
                    <div className="flex items-baseline gap-2">
                      <motion.span
                        key={`dash-inn-${idx}-${inn.runs}-${inn.wickets}`}
                        initial={{ scale: 1.18 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 420, damping: 20 }}
                        className="font-display font-black text-3xl text-[#FF8C00] tabular-nums"
                      >
                        {inn.runs}/{inn.wickets}
                      </motion.span>
                      <span className="text-sm font-semibold text-slate-600 tabular-nums">
                        ({formatOvers(inn.legalBalls)} / {inn.maxOvers} ov)
                      </span>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      CRR:{' '}
                      <span className="font-bold text-[#E87500] tabular-nums">
                        {calcRunRate(inn.runs, inn.legalBalls)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Match Status / Chase / Innings Break Bar */}
          <div className="rounded-xl wo-card px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-slate-900">
            <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm">
              <div>
                <span className="text-slate-500">Status: </span>
                <span className="font-bold text-slate-900">{match.resultText}</span>
              </div>
              {target !== null && (
                <>
                  <span className="text-slate-300">|</span>
                  <div>
                    <span className="text-slate-500">Target: </span>
                    <span className="font-bold text-[#E87500] tabular-nums">{target}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Need: </span>
                    <span className="font-bold text-slate-900 tabular-nums">
                      {runsRequired} off {remainingBalls}b
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">RRR: </span>
                    <span className="font-bold text-[#E87500] tabular-nums">{rrr}</span>
                  </div>
                </>
              )}
              <span className="text-slate-300 hidden sm:inline">|</span>
              <div>
                <span className="text-slate-500">Partnership: </span>
                <span className="font-bold text-[#E87500] tabular-nums">
                  {partnership.runs} ({partnership.balls}b)
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isFirstInningsEnded && (
                <button
                  type="button"
                  onClick={openInningsSwitchModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg wo-btn-primary text-white text-xs font-black animate-pulse"
                >
                  <Play className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>CONFIRM &amp; SWITCH TO 2ND INNINGS</span>
                </button>
              )}

              {match.status === 'completed' && !match.matchCompletedConfirmed && (
                <button
                  type="button"
                  onClick={() => setMatchCompleteModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg wo-btn-primary text-white text-xs font-black tracking-wide animate-pulse"
                >
                  <Trophy className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>CONFIRM MATCH COMPLETED</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setMatchSummaryModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg wo-btn-soft text-xs font-extrabold transition-colors whitespace-nowrap"
              >
                <Trophy className="w-3.5 h-3.5 text-[#EA580C]" aria-hidden="true" />
                <span>View Match Summary</span>
              </button>

              {match.status === 'completed' && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPomId(match.playerOfMatchId || '');
                    setPomModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg wo-btn-soft text-xs font-extrabold"
                >
                  <Award className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Set Player of the Match</span>
                </button>
              )}
            </div>
          </div>

          {/* Striker + SWAP + Non-Striker Cards */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-stretch">
            {/* Striker Card */}
            {(() => {
              const needsStriker =
                !activeInn.strikerId && !activeInn.completed && match.status !== 'completed';
              return (
                <div
                  className={`relative rounded-xl wo-card transition-all flex flex-col text-slate-900 ${
                    slotMenuOpen === 'striker' ? 'z-30' : ''
                  } ${
                    needsStriker
                      ? 'ring-2 ring-red-500'
                      : 'ring-1 ring-[#FF8C00]/45'
                  }`}
                >
                  <div className="relative px-4 py-2.5 rounded-t-[10px] flex items-center justify-between gap-2 wo-header text-white">
                    <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider">
                      {!needsStriker && <CricketBatIcon className="w-3.5 h-3.5 text-white" />}
                      <span>STRIKER</span>
                    </span>
                    <div className="relative" data-slot-menu="true">
                      <button
                        type="button"
                        onClick={() => {
                          if (needsStriker) {
                            if (isPendingNewBatter) setNewBatterModalOpen(true);
                            else setPlayerPickerSlot('striker');
                          } else {
                            setSlotMenuOpen((prev) => (prev === 'striker' ? null : 'striker'));
                          }
                        }}
                        aria-label="Edit or Replace Striker"
                        aria-expanded={slotMenuOpen === 'striker'}
                        className="p-1 rounded-md text-white hover:bg-white/20 inline-flex items-center gap-1 transition-colors"
                      >
                        <UserPen className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {slotMenuOpen === 'striker' && !needsStriker && (
                    <div
                      data-slot-menu="true"
                      className="absolute right-2.5 top-[44px] z-50 w-48 rounded-lg bg-white border border-orange-200 overflow-hidden text-left shadow-2xl"
                    >
                      <button
                        type="button"
                        onClick={() => openEditPlayerModal('striker')}
                        className="w-full px-3.5 py-2.5 text-left text-sm font-bold text-slate-800 hover:bg-[#FFF3E0] hover:text-[#E87500] transition-colors border-b border-slate-200 flex items-center gap-2"
                      >
                        <Edit3 className="w-4 h-4 text-[#FF8C00] shrink-0" aria-hidden="true" />
                        <span>Edit Batsman</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSlotMenuOpen(null);
                          setPlayerPickerSlot('striker');
                        }}
                        className="w-full px-3.5 py-2.5 text-left text-sm font-bold text-slate-800 hover:bg-[#FFF3E0] hover:text-[#E87500] transition-colors flex items-center gap-2"
                      >
                        <ArrowLeftRight className="w-4 h-4 text-[#FF8C00] shrink-0" aria-hidden="true" />
                        <span>Replace Batsman</span>
                      </button>
                    </div>
                  )}

                  {needsStriker ? (
                    <div className="p-2.5 flex-1 flex">
                      <motion.button
                        type="button"
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ scale: 1.015 }}
                        whileTap={{ scale: 0.96 }}
                        transition={{ type: 'spring', stiffness: 420, damping: 24 }}
                        onClick={() =>
                          isPendingNewBatter
                            ? setNewBatterModalOpen(true)
                            : setPlayerPickerSlot('striker')
                        }
                        className="w-full min-h-[88px] rounded-lg wo-btn-primary text-white font-display font-black text-base sm:text-lg tracking-wide flex items-center justify-center"
                      >
                        Select Batsman
                      </motion.button>
                    </div>
                  ) : (
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        {activeInn.strikerId && (
                          <span
                            className="w-7 h-7 rounded-lg bg-[#FFF3E0] border border-[#FF8C00]/35 text-[#FF8C00] inline-flex items-center justify-center shrink-0"
                            title="Currently On Strike"
                          >
                            <CricketBatIcon className="w-4 h-4" />
                          </span>
                        )}
                        <p className="font-display font-black text-base text-slate-900 truncate">
                          {strikerStats?.playerName || 'Select Striker'}
                        </p>
                      </div>
                      <div className="mt-2.5 grid grid-cols-5 gap-1 text-center bg-slate-50 rounded-lg p-2 border border-slate-200">
                        <div>
                          <p className="text-[10px] text-slate-500 font-semibold">R</p>
                          <p className="text-sm font-black text-[#FF8C00] tabular-nums">
                            {strikerStats?.runs ?? 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 font-semibold">B</p>
                          <p className="text-sm font-bold text-slate-900 tabular-nums">
                            {strikerStats?.balls ?? 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 font-semibold">4s</p>
                          <p className="text-sm font-bold text-slate-900 tabular-nums">
                            {strikerStats?.fours ?? 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 font-semibold">6s</p>
                          <p className="text-sm font-bold text-slate-900 tabular-nums">
                            {strikerStats?.sixes ?? 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 font-semibold">SR</p>
                          <p className="text-xs font-bold text-[#E87500] tabular-nums">
                            {strikerStats?.sr ?? '0.0'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Swap Batsmen Button */}
            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={handleSwapBatsmen}
                title="Swap Batsmen"
                className="w-full md:w-12 md:h-12 inline-flex items-center justify-center gap-2 px-3.5 py-2.5 md:p-0 rounded-xl wo-btn-primary text-white text-xs font-black"
              >
                <ArrowLeftRight className="w-5 h-5" aria-hidden="true" />
                <span className="md:hidden">SWAP BATSMEN</span>
              </button>
            </div>

            {/* Non-Striker Card */}
            {(() => {
              const needsNonStriker =
                !activeInn.nonStrikerId && !activeInn.completed && match.status !== 'completed';
              return (
                <div
                  className={`relative rounded-xl wo-card transition-all flex flex-col text-slate-900 ${
                    slotMenuOpen === 'nonStriker' ? 'z-30' : ''
                  } ${
                    needsNonStriker
                      ? 'ring-2 ring-red-500'
                      : ''
                  }`}
                >
                  <div className="relative px-4 py-2.5 rounded-t-[10px] flex items-center justify-between gap-2 wo-header text-white">
                    <span className="text-xs font-black uppercase tracking-wider">
                      NONSTRIKER
                    </span>
                    <div className="relative" data-slot-menu="true">
                      <button
                        type="button"
                        onClick={() => {
                          if (needsNonStriker) {
                            if (isPendingNewBatter) setNewBatterModalOpen(true);
                            else setPlayerPickerSlot('nonStriker');
                          } else {
                            setSlotMenuOpen((prev) =>
                              prev === 'nonStriker' ? null : 'nonStriker'
                            );
                          }
                        }}
                        aria-label="Edit or Replace Non-Striker"
                        aria-expanded={slotMenuOpen === 'nonStriker'}
                        className="p-1 rounded-md text-white hover:bg-white/20 inline-flex items-center gap-1 transition-colors"
                      >
                        <UserPen className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {slotMenuOpen === 'nonStriker' && !needsNonStriker && (
                    <div
                      data-slot-menu="true"
                      className="absolute right-2.5 top-[44px] z-50 w-48 rounded-lg bg-white border border-orange-200 overflow-hidden text-left shadow-2xl"
                    >
                      <button
                        type="button"
                        onClick={() => openEditPlayerModal('nonStriker')}
                        className="w-full px-3.5 py-2.5 text-left text-sm font-bold text-slate-800 hover:bg-[#FFF3E0] hover:text-[#E87500] transition-colors border-b border-slate-200 flex items-center gap-2"
                      >
                        <Edit3 className="w-4 h-4 text-[#FF8C00] shrink-0" aria-hidden="true" />
                        <span>Edit Batsman</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSlotMenuOpen(null);
                          setPlayerPickerSlot('nonStriker');
                        }}
                        className="w-full px-3.5 py-2.5 text-left text-sm font-bold text-slate-800 hover:bg-[#FFF3E0] hover:text-[#E87500] transition-colors flex items-center gap-2"
                      >
                        <ArrowLeftRight className="w-4 h-4 text-[#FF8C00] shrink-0" aria-hidden="true" />
                        <span>Replace Batsman</span>
                      </button>
                    </div>
                  )}

                  {needsNonStriker ? (
                    <div className="p-2.5 flex-1 flex">
                      <motion.button
                        type="button"
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ scale: 1.015 }}
                        whileTap={{ scale: 0.96 }}
                        transition={{ type: 'spring', stiffness: 420, damping: 24 }}
                        onClick={() =>
                          isPendingNewBatter
                            ? setNewBatterModalOpen(true)
                            : setPlayerPickerSlot('nonStriker')
                        }
                        className="w-full min-h-[88px] rounded-lg wo-btn-primary text-white font-display font-black text-base sm:text-lg tracking-wide flex items-center justify-center"
                      >
                        Select Batsman
                      </motion.button>
                    </div>
                  ) : (
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <p className="font-display font-black text-base text-slate-900 truncate">
                        {nonStrikerStats?.playerName || 'Select Non-Striker'}
                      </p>
                      <div className="mt-2.5 grid grid-cols-5 gap-1 text-center bg-slate-50 rounded-lg p-2 border border-slate-200">
                        <div>
                          <p className="text-[10px] text-slate-500 font-semibold">R</p>
                          <p className="text-sm font-black text-[#FF8C00] tabular-nums">
                            {nonStrikerStats?.runs ?? 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 font-semibold">B</p>
                          <p className="text-sm font-bold text-slate-900 tabular-nums">
                            {nonStrikerStats?.balls ?? 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 font-semibold">4s</p>
                          <p className="text-sm font-bold text-slate-900 tabular-nums">
                            {nonStrikerStats?.fours ?? 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 font-semibold">6s</p>
                          <p className="text-sm font-bold text-slate-900 tabular-nums">
                            {nonStrikerStats?.sixes ?? 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 font-semibold">SR</p>
                          <p className="text-xs font-bold text-[#E87500] tabular-nums">
                            {nonStrikerStats?.sr ?? '0.0'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Bowler Card + THIS OVER / PREV OVER */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {(() => {
              const needsNewBowler =
                (isPendingBowlerChange || !activeInn.bowlerId) &&
                !activeInn.completed &&
                match.status !== 'completed';
              return (
                <div
                  className={`relative rounded-xl wo-card transition-all flex flex-col text-slate-900 ${
                    slotMenuOpen === 'bowler' ? 'z-30' : ''
                  } ${
                    needsNewBowler
                      ? 'ring-2 ring-red-500'
                      : ''
                  }`}
                >
                  <div className="relative px-4 py-2.5 rounded-t-[10px] flex items-center justify-between gap-2 wo-header text-white">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider">
                        BOWLER
                      </span>
                      {isPendingBowlerChange && (
                        <span className="px-2 py-0.5 rounded bg-white text-[#E87500] text-[10px] font-extrabold uppercase tracking-wider">
                          Over {completedOverNum} Done
                        </span>
                      )}
                    </div>
                    <div className="relative" data-slot-menu="true">
                      <button
                        type="button"
                        onClick={() => {
                          if (needsNewBowler) {
                            if (isPendingBowlerChange) setOverCompleteModalOpen(true);
                            else setPlayerPickerSlot('bowler');
                          } else {
                            setSlotMenuOpen((prev) => (prev === 'bowler' ? null : 'bowler'));
                          }
                        }}
                        aria-label="Edit or Replace Bowler"
                        aria-expanded={slotMenuOpen === 'bowler'}
                        className="p-1 rounded-md text-white hover:bg-white/20 inline-flex items-center gap-1 transition-colors"
                      >
                        <UserPen className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {slotMenuOpen === 'bowler' && !needsNewBowler && (
                    <div
                      data-slot-menu="true"
                      className="absolute right-2.5 top-[44px] z-50 w-48 rounded-lg bg-white border border-orange-200 overflow-hidden text-left shadow-2xl"
                    >
                      <button
                        type="button"
                        onClick={() => openEditPlayerModal('bowler')}
                        className="w-full px-3.5 py-2.5 text-left text-sm font-bold text-slate-800 hover:bg-[#FFF3E0] hover:text-[#E87500] transition-colors border-b border-slate-200 flex items-center gap-2"
                      >
                        <Edit3 className="w-4 h-4 text-[#FF8C00] shrink-0" aria-hidden="true" />
                        <span>Edit Bowler</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSlotMenuOpen(null);
                          if (isPendingBowlerChange) setOverCompleteModalOpen(true);
                          else setPlayerPickerSlot('bowler');
                        }}
                        className="w-full px-3.5 py-2.5 text-left text-sm font-bold text-slate-800 hover:bg-[#FFF3E0] hover:text-[#E87500] transition-colors flex items-center gap-2"
                      >
                        <ArrowLeftRight className="w-4 h-4 text-[#FF8C00] shrink-0" aria-hidden="true" />
                        <span>Replace Bowler</span>
                      </button>
                    </div>
                  )}

                  {needsNewBowler ? (
                    <div className="p-2.5 flex-1 flex">
                      <motion.button
                        type="button"
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ scale: 1.015 }}
                        whileTap={{ scale: 0.96 }}
                        transition={{ type: 'spring', stiffness: 420, damping: 24 }}
                        onClick={() =>
                          isPendingBowlerChange
                            ? setOverCompleteModalOpen(true)
                            : setPlayerPickerSlot('bowler')
                        }
                        className="w-full min-h-[88px] rounded-lg wo-btn-primary text-white font-display font-black text-base sm:text-lg tracking-wide flex items-center justify-center"
                      >
                        Select Bowler
                      </motion.button>
                    </div>
                  ) : (
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <p className="font-display font-black text-base text-slate-900 truncate">
                        {bowlerStats?.playerName || 'Select Bowler'}
                      </p>
                      <div className="mt-2.5 grid grid-cols-5 gap-1 text-center bg-slate-50 rounded-lg p-2 border border-slate-200">
                        <div>
                          <p className="text-[10px] text-slate-500 font-semibold">O</p>
                          <p className="text-sm font-bold text-slate-900 tabular-nums">
                            {bowlerStats?.overs ?? '0.0'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 font-semibold">M</p>
                          <p className="text-sm font-bold text-slate-900 tabular-nums">
                            {bowlerStats?.maidens ?? 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 font-semibold">R</p>
                          <p className="text-sm font-bold text-slate-900 tabular-nums">
                            {bowlerStats?.runs ?? 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 font-semibold">W</p>
                          <p className="text-sm font-black text-[#FF8C00] tabular-nums">
                            {bowlerStats?.wickets ?? 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 font-semibold">Eco</p>
                          <p className="text-xs font-bold text-[#E87500] tabular-nums">
                            {bowlerStats?.economy ?? '0.00'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="rounded-xl wo-card p-4 flex flex-col justify-between gap-3 text-slate-900">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#E87500] mb-1.5">
                  THIS OVER (Over {currentOverNumber + 1})
                </p>
                <div className="flex flex-wrap gap-1.5 min-h-[28px] items-center">
                  {thisOverBalls.length > 0 ? (
                    thisOverBalls.map(renderBallChip)
                  ) : (
                    <span className="text-xs text-slate-400">No balls bowled in this over yet.</span>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  PREV OVER {currentOverNumber > 0 ? `(Over ${currentOverNumber})` : ''}
                </p>
                <div className="flex flex-wrap gap-1.5 min-h-[28px] items-center">
                  {prevOverBalls.length > 0 ? (
                    prevOverBalls.map(renderBallChip)
                  ) : (
                    <span className="text-xs text-slate-400">No previous over yet.</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Animated Match Complete / Innings End / Over Completion Pause Banner & New Bowler Confirmed Banner */}
          <AnimatePresence mode="wait">
            {match.status === 'completed' && !match.matchCompletedConfirmed && (
              <motion.div
                key={`match-completed-pending-${inn2.runs}-${inn2.legalBalls}`}
                initial={{ opacity: 0, y: -12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 360, damping: 26 }}
                className="rounded-xl bg-gradient-to-r from-[#FF8C00] via-[#E87500] to-[#D97706] text-white p-4 shadow-md border border-amber-500 flex flex-wrap items-center justify-between gap-3"
                role="alert"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <motion.div
                    animate={{ scale: [1, 1.12, 1], rotate: [0, -6, 6, 0] }}
                    transition={{ duration: 1.4, repeat: Infinity }}
                    className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0 border border-white/30"
                  >
                    <Trophy className="w-6 h-6 text-white" aria-hidden="true" />
                  </motion.div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display font-black text-base sm:text-lg tracking-wide uppercase">
                        MATCH COMPLETED
                      </span>
                      <span className="px-2 py-0.5 rounded bg-white/20 text-[10px] font-bold uppercase tracking-wider">
                        CONFIRM TO OPEN SUMMARY
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-amber-50">
                      {match.resultText}
                    </p>
                    <p className="text-[11px] text-orange-100 mt-0.5 tabular-nums">
                      {inn1Team?.shortName || 'T1'}: {inn1.runs}/{inn1.wickets} ({formatOvers(inn1.legalBalls)}) ·{' '}
                      {inn2Team?.shortName || 'T2'}: {inn2.runs}/{inn2.wickets} ({formatOvers(inn2.legalBalls)})
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {match.undoStack.length > 0 && (
                    <button
                      type="button"
                      onClick={handleUndo}
                      className="inline-flex items-center gap-1 px-3 py-2.5 rounded-lg bg-white/15 hover:bg-white/25 border border-white/35 text-white text-xs font-bold"
                    >
                      <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>UNDO</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setMatchCompleteModalOpen(true)}
                    className="px-4 py-2.5 rounded-lg bg-white hover:bg-[#FFF3E0] text-[#E87500] font-display font-black text-xs sm:text-sm tracking-wide shadow-sm transition-colors inline-flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                    <span>CONFIRM MATCH COMPLETED</span>
                  </button>
                </div>
              </motion.div>
            )}

            {match.status === 'completed' && match.matchCompletedConfirmed && (
              <motion.div
                key={`match-completed-confirmed-${match.id}`}
                initial={{ opacity: 0, y: -10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                className="rounded-xl bg-emerald-50 border-2 border-emerald-400 px-4 py-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Trophy className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-display font-black text-sm text-emerald-950 uppercase tracking-wide">
                      MATCH OVER — CONFIRMED
                    </p>
                    <p className="text-xs font-bold text-emerald-800 truncate">
                      {match.resultText}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setMatchSummaryModalOpen(true)}
                    className="px-4 py-2 rounded-lg wo-btn-primary text-white font-display font-bold text-xs tracking-wide shadow-xs shrink-0"
                  >
                    VIEW MATCH SUMMARY
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOversInningsTab(inn2.balls.length > 0 ? 1 : 0);
                      setActiveTab('overs');
                    }}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-display font-bold text-xs tracking-wide shadow-xs shrink-0"
                  >
                    OVERS &amp; FULL SUMMARY
                  </button>
                </div>
              </motion.div>
            )}

            {isFirstInningsEnded && (
              <motion.div
                key={`innings-ended-${inn1.runs}-${inn1.legalBalls}`}
                initial={{ opacity: 0, y: -12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 360, damping: 26 }}
                className="rounded-xl bg-gradient-to-r from-[#16A34A] via-[#15803D] to-[#16A34A] text-white p-4 shadow-md border border-emerald-700 flex flex-wrap items-center justify-between gap-3"
                role="alert"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                    className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0 border border-white/30"
                  >
                    <Play className="w-6 h-6 text-white" aria-hidden="true" />
                  </motion.div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display font-black text-base sm:text-lg tracking-wide uppercase">
                        1ST INNINGS COMPLETED
                      </span>
                      <span className="px-2 py-0.5 rounded bg-white/20 text-[10px] font-bold uppercase tracking-wider">
                        TARGET {inn1.runs + 1} RUNS
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-emerald-50">
                      {inn1Team?.name || 'Team 1'} finished at {inn1.runs}/{inn1.wickets} ({formatOvers(inn1.legalBalls)} / {inn1.maxOvers} ov).
                    </p>
                    <p className="text-[11px] text-emerald-100 mt-0.5">
                      Click the button to end 1st innings and switch to 2nd innings ({inn2Team?.name || 'Team 2'} batting).
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={openInningsSwitchModal}
                  className="px-4 py-2.5 rounded-lg bg-white hover:bg-emerald-50 text-emerald-800 font-display font-black text-xs sm:text-sm tracking-wide shadow-sm transition-colors shrink-0 inline-flex items-center gap-1.5"
                >
                  <ArrowLeftRight className="w-4 h-4" aria-hidden="true" />
                  <span>CONFIRM &amp; SWITCH TO 2ND INNINGS</span>
                </button>
              </motion.div>
            )}

            {!isPendingBowlerChange && bowlerConfirmedBanner && (
              <motion.div
                key={`bowler-confirmed-${bowlerConfirmedBanner.bowlerName}-${bowlerConfirmedBanner.overNumber}`}
                initial={{ opacity: 0, y: -10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                className="rounded-xl bg-emerald-50 border border-emerald-300 px-4 py-3 shadow-xs flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {bowlerConfirmedBanner.photoUrl ? (
                    <img
                      src={bowlerConfirmedBanner.photoUrl}
                      alt={bowlerConfirmedBanner.bowlerName}
                      className="w-10 h-10 rounded-full object-cover border-2 border-emerald-500 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-display font-bold text-xs flex items-center justify-center shrink-0">
                      {bowlerConfirmedBanner.initials}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-extrabold text-emerald-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
                      <span>
                        Bowler Changed: {bowlerConfirmedBanner.bowlerName}
                      </span>
                    </p>
                    <p className="text-[11px] text-emerald-700 font-medium">
                      Over {bowlerConfirmedBanner.overNumber} ready · Live scoring &amp; overlay updated.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setBowlerConfirmedBanner(null)}
                  aria-label="Dismiss bowler confirmation"
                  className="p-1 rounded-lg text-emerald-700 hover:bg-emerald-100"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* White & Orange Animated Scoring Keypad + Inline Sub-Panels */}
          <div className="rounded-xl wo-card text-slate-900 p-3 sm:p-5">
            <AnimatePresence mode="wait">
              {keypadPanel === 'main' && (
                <motion.div
                  key="keypad-main"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.14 }}
                  className="space-y-2 sm:space-y-3"
                >
                  {/* Row 1: 0, DCL, 1, 2, 3, 4 (Boundary), 6 (Boundary) */}
                  <div className="grid grid-cols-7 sm:flex sm:flex-wrap items-center gap-1.5 sm:gap-2.5">
                    {/* 0 */}
                    <motion.button
                      type="button"
                      disabled={isScoringLocked}
                      whileHover={isScoringLocked ? undefined : { scale: 1.06, y: -2 }}
                      whileTap={isScoringLocked ? undefined : { scale: 0.92 }}
                      transition={{ type: 'spring', stiffness: 460, damping: 22 }}
                      onClick={() => recordDelivery({ runsOffBat: 0 })}
                      className="w-full sm:w-[58px] h-[44px] sm:h-[48px] rounded-[11px] wo-btn-secondary disabled:opacity-45 font-display font-bold text-sm sm:text-base"
                    >
                      0
                    </motion.button>

                    {/* DCL */}
                    <motion.button
                      type="button"
                      disabled={isScoringLocked}
                      whileHover={isScoringLocked ? undefined : { scale: 1.06, y: -2 }}
                      whileTap={isScoringLocked ? undefined : { scale: 0.92 }}
                      transition={{ type: 'spring', stiffness: 460, damping: 22 }}
                      onClick={() => setKeypadPanel('DCL')}
                      className="w-full sm:w-[58px] h-[44px] sm:h-[48px] rounded-[11px] wo-trans-btn disabled:opacity-45 font-display font-extrabold text-xs sm:text-sm tracking-wide"
                    >
                      DCL
                    </motion.button>

                    {/* 1, 2, 3 */}
                    {[1, 2, 3].map((r) => (
                      <motion.button
                        key={`run-${r}`}
                        type="button"
                        disabled={isScoringLocked}
                        whileHover={isScoringLocked ? undefined : { scale: 1.06, y: -2 }}
                        whileTap={isScoringLocked ? undefined : { scale: 0.92 }}
                        transition={{ type: 'spring', stiffness: 460, damping: 22 }}
                        onClick={() => recordDelivery({ runsOffBat: r })}
                        className="w-full sm:w-[58px] h-[44px] sm:h-[48px] rounded-[11px] wo-btn-secondary disabled:opacity-45 font-display font-bold text-sm sm:text-base"
                      >
                        {r}
                      </motion.button>
                    ))}

                    {/* 4 (Boundary - Colored Golden Yellow -> triggers FOUR overlay) */}
                    <motion.button
                      type="button"
                      disabled={isScoringLocked}
                      title="Boundary 4 (Triggers FOUR Overlay)"
                      whileHover={isScoringLocked ? undefined : { scale: 1.07, y: -2 }}
                      whileTap={isScoringLocked ? undefined : { scale: 0.92 }}
                      transition={{ type: 'spring', stiffness: 460, damping: 22 }}
                      onClick={() =>
                        recordDelivery(
                          { runsOffBat: 4, isBoundary4: true, isBoundary6: false },
                          'FOUR +4 Runs'
                        )
                      }
                      className="w-full sm:w-[58px] h-[44px] sm:h-[48px] rounded-[11px] bg-gradient-to-b from-[#FDE047] via-[#FACC15] to-[#EAB308] hover:from-[#FEF08A] hover:to-[#CA8A04] border border-[#CA8A04] shadow-sm disabled:opacity-45 text-slate-950 font-display font-black text-sm sm:text-base transition-colors"
                    >
                      4
                    </motion.button>

                    {/* 6 (Boundary - Colored Orange-Crimson -> triggers SIXER overlay) */}
                    <motion.button
                      type="button"
                      disabled={isScoringLocked}
                      title="Boundary 6 (Triggers SIXER Overlay)"
                      whileHover={isScoringLocked ? undefined : { scale: 1.07, y: -2 }}
                      whileTap={isScoringLocked ? undefined : { scale: 0.92 }}
                      transition={{ type: 'spring', stiffness: 460, damping: 22 }}
                      onClick={() =>
                        recordDelivery(
                          { runsOffBat: 6, isBoundary4: false, isBoundary6: true },
                          'SIX +6 Runs'
                        )
                      }
                      className="w-full sm:w-[58px] h-[44px] sm:h-[48px] rounded-[11px] bg-gradient-to-b from-[#FF8C00] via-[#EA580C] to-[#C2410C] hover:from-[#FFA02E] hover:to-[#9A3412] border border-[#9A3412] shadow-sm disabled:opacity-45 text-white font-display font-black text-sm sm:text-base transition-colors"
                    >
                      6
                    </motion.button>
                  </div>

                  {/* Row 2: 4 (Run), 5, 6 (Run), NB, WD, LB, BYE */}
                  <div className="grid grid-cols-7 sm:flex sm:flex-wrap items-center gap-1.5 sm:gap-2.5">
                    {/* 4 (Running / Non-boundary — counted in runs ONLY, no FOUR overlay) */}
                    <motion.button
                      type="button"
                      disabled={isScoringLocked}
                      title="4 Runs (Counted in runs only — no boundary overlay)"
                      whileHover={isScoringLocked ? undefined : { scale: 1.06, y: -2 }}
                      whileTap={isScoringLocked ? undefined : { scale: 0.92 }}
                      transition={{ type: 'spring', stiffness: 460, damping: 22 }}
                      onClick={() =>
                        recordDelivery(
                          { runsOffBat: 4, isBoundary4: false, isBoundary6: false },
                          '+4 Runs'
                        )
                      }
                      className="w-full sm:w-[58px] h-[44px] sm:h-[48px] rounded-[11px] wo-btn-secondary disabled:opacity-45 font-display font-bold text-sm sm:text-base"
                    >
                      4
                    </motion.button>

                    {/* 5 */}
                    <motion.button
                      type="button"
                      disabled={isScoringLocked}
                      whileHover={isScoringLocked ? undefined : { scale: 1.06, y: -2 }}
                      whileTap={isScoringLocked ? undefined : { scale: 0.92 }}
                      transition={{ type: 'spring', stiffness: 460, damping: 22 }}
                      onClick={() => recordDelivery({ runsOffBat: 5 }, '+5 Runs')}
                      className="w-full sm:w-[58px] h-[44px] sm:h-[48px] rounded-[11px] wo-btn-secondary disabled:opacity-45 font-display font-bold text-sm sm:text-base"
                    >
                      5
                    </motion.button>

                    {/* 6 (Running / Non-boundary — counted in runs ONLY, no SIXER overlay) */}
                    <motion.button
                      type="button"
                      disabled={isScoringLocked}
                      title="6 Runs (Counted in runs only — no boundary overlay)"
                      whileHover={isScoringLocked ? undefined : { scale: 1.06, y: -2 }}
                      whileTap={isScoringLocked ? undefined : { scale: 0.92 }}
                      transition={{ type: 'spring', stiffness: 460, damping: 22 }}
                      onClick={() =>
                        recordDelivery(
                          { runsOffBat: 6, isBoundary4: false, isBoundary6: false },
                          '+6 Runs'
                        )
                      }
                      className="w-full sm:w-[58px] h-[44px] sm:h-[48px] rounded-[11px] wo-btn-secondary disabled:opacity-45 font-display font-bold text-sm sm:text-base"
                    >
                      6
                    </motion.button>

                    {/* NB, WD, LB, BYE */}
                    {(['NB', 'WD', 'LB', 'BYE'] as const).map((ex) => (
                      <motion.button
                        key={ex}
                        type="button"
                        disabled={isScoringLocked}
                        whileHover={isScoringLocked ? undefined : { scale: 1.06, y: -2 }}
                        whileTap={isScoringLocked ? undefined : { scale: 0.92 }}
                        transition={{ type: 'spring', stiffness: 460, damping: 22 }}
                        onClick={() => setKeypadPanel(ex)}
                        className="w-full sm:w-[58px] h-[44px] sm:h-[48px] rounded-[11px] wo-trans-btn disabled:opacity-45 font-display font-extrabold text-xs sm:text-sm tracking-wide"
                      >
                        {ex}
                      </motion.button>
                    ))}
                  </div>

                  {/* Row 3: OUT, More, 7 8 9 10.., Edit, Undo, overlay */}
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 sm:gap-2.5">
                    {/* OUT (Alert Red) */}
                    <motion.button
                      type="button"
                      disabled={isScoringLocked}
                      whileHover={isScoringLocked ? undefined : { scale: 1.06, y: -2 }}
                      whileTap={isScoringLocked ? undefined : { scale: 0.92 }}
                      transition={{ type: 'spring', stiffness: 460, damping: 22 }}
                      onClick={openWicketModal}
                      className="flex-1 sm:flex-none sm:w-[58px] h-[44px] sm:h-[48px] rounded-[11px] bg-[#DC2626] hover:bg-[#B91C1C] shadow-sm disabled:opacity-45 text-white font-display font-black text-xs sm:text-sm tracking-wide transition-colors"
                    >
                      OUT
                    </motion.button>

                    {/* More */}
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.06, y: -2 }}
                      whileTap={{ scale: 0.92 }}
                      transition={{ type: 'spring', stiffness: 460, damping: 22 }}
                      onClick={() => setKeypadPanel('MORE')}
                      className="flex-1 sm:flex-none sm:w-[58px] h-[44px] sm:h-[48px] rounded-[11px] wo-btn-soft font-display font-extrabold text-xs sm:text-sm transition-colors"
                    >
                      More
                    </motion.button>

                    {/* 7 8 9 10.. */}
                    <motion.button
                      type="button"
                      disabled={isScoringLocked}
                      whileHover={isScoringLocked ? undefined : { scale: 1.04, y: -2 }}
                      whileTap={isScoringLocked ? undefined : { scale: 0.94 }}
                      transition={{ type: 'spring', stiffness: 460, damping: 22 }}
                      onClick={() => setKeypadPanel('MORE_RUNS')}
                      className="flex-[1.6] sm:flex-none h-[44px] sm:h-[48px] px-2.5 sm:px-4 rounded-[11px] wo-btn-secondary disabled:opacity-45 font-display font-bold text-xs sm:text-sm tracking-wide whitespace-nowrap"
                    >
                      7 8 9 10..
                    </motion.button>

                    {/* Edit Score (Pencil) */}
                    <motion.button
                      type="button"
                      title="Edit Score"
                      aria-label="Edit Score"
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.94 }}
                      transition={{ type: 'spring', stiffness: 460, damping: 22 }}
                      onClick={() => openEditScoreModal(innIdx)}
                      className="flex-1 sm:flex-none sm:w-[58px] h-[44px] sm:h-[48px] rounded-[11px] wo-btn-soft inline-flex items-center justify-center"
                    >
                      <Pencil className="w-4 h-4 sm:w-5 sm:h-5 fill-current" aria-hidden="true" />
                    </motion.button>

                    {/* Undo Last Ball */}
                    <motion.button
                      type="button"
                      title="Undo Last Ball"
                      aria-label="Undo Last Ball"
                      disabled={!match.undoStack.length}
                      whileHover={!match.undoStack.length ? undefined : { scale: 1.05, y: -2 }}
                      whileTap={!match.undoStack.length ? undefined : { scale: 0.94 }}
                      transition={{ type: 'spring', stiffness: 460, damping: 22 }}
                      onClick={handleUndo}
                      className="flex-1 sm:flex-none sm:w-[58px] h-[44px] sm:h-[48px] rounded-[11px] wo-btn-soft disabled:opacity-45 inline-flex items-center justify-center"
                    >
                      <Undo2 className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.6]" aria-hidden="true" />
                    </motion.button>

                    {/* Overlay Button right inside Number Keypad (Orange & White Theme) */}
                    <motion.button
                      type="button"
                      title="Open Quick Overlay Controls"
                      aria-label="Open Quick Overlay Controls"
                      whileHover={{ scale: 1.04, y: -2 }}
                      whileTap={{ scale: 0.94 }}
                      transition={{ type: 'spring', stiffness: 460, damping: 22 }}
                      onClick={() => setQuickOverlaySheetOpen(true)}
                      className="flex-[1.8] sm:flex-none sm:min-w-[116px] h-[44px] sm:h-[48px] px-3 sm:px-5 rounded-[11px] wo-btn-active text-white shadow-sm font-display font-extrabold text-xs sm:text-sm tracking-wide whitespace-nowrap transition-colors"
                    >
                      overlay
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* === INLINE PANEL: NO BALL === */}
              {keypadPanel === 'NB' && (
                <motion.div
                  key="keypad-nb"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.14 }}
                  className="space-y-3.5"
                >
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => setKeypadPanel('main')}
                      aria-label="Close No Ball panel"
                      className="p-1.5 rounded-lg wo-btn-secondary text-[#FF8C00]"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <h4 className="font-display font-black text-xl text-[#E87500]">No Ball</h4>
                  </div>

                  {/* Row 1: NB, NB +1 .. NB +5 */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                    {[0, 1, 2, 3, 4, 5].map((r) => (
                      <motion.button
                        key={`nb-${r}`}
                        type="button"
                        disabled={isScoringLocked}
                        whileHover={isScoringLocked ? undefined : { scale: 1.04, y: -1 }}
                        whileTap={isScoringLocked ? undefined : { scale: 0.94 }}
                        onClick={() => {
                          recordDelivery(
                            {
                              runsOffBat: r,
                              extraType: 'NB',
                              extraRuns: 1,
                              isBoundary4: r === 4,
                              isBoundary6: false,
                            },
                            r === 0 ? 'No Ball' : `No Ball +${r}`
                          );
                          setKeypadPanel('main');
                        }}
                        className="h-12 rounded-[10px] wo-trans-btn disabled:opacity-45 font-display font-extrabold text-sm sm:text-base"
                      >
                        {r === 0 ? 'NB' : `NB +${r}`}
                      </motion.button>
                    ))}
                  </div>

                  {/* Row 2: NB +6, Leg Byes, Bye */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                    <motion.button
                      type="button"
                      disabled={isScoringLocked}
                      whileHover={isScoringLocked ? undefined : { scale: 1.04, y: -1 }}
                      whileTap={isScoringLocked ? undefined : { scale: 0.94 }}
                      onClick={() => {
                        recordDelivery(
                          {
                            runsOffBat: 6,
                            extraType: 'NB',
                            extraRuns: 1,
                            isBoundary6: true,
                          },
                          'No Ball +6'
                        );
                        setKeypadPanel('main');
                      }}
                      className="h-12 rounded-[10px] wo-trans-btn disabled:opacity-45 font-display font-extrabold text-sm sm:text-base"
                    >
                      NB +6
                    </motion.button>

                    <motion.button
                      type="button"
                      disabled={isScoringLocked}
                      whileHover={isScoringLocked ? undefined : { scale: 1.03, y: -1 }}
                      whileTap={isScoringLocked ? undefined : { scale: 0.95 }}
                      onClick={() => setKeypadPanel('NB_LB')}
                      className="sm:col-span-2 h-12 rounded-[10px] wo-btn-primary disabled:opacity-45 text-white font-display font-bold text-sm sm:text-base"
                    >
                      Leg Byes
                    </motion.button>

                    <motion.button
                      type="button"
                      disabled={isScoringLocked}
                      whileHover={isScoringLocked ? undefined : { scale: 1.03, y: -1 }}
                      whileTap={isScoringLocked ? undefined : { scale: 0.95 }}
                      onClick={() => setKeypadPanel('NB_BYE')}
                      className="sm:col-span-2 h-12 rounded-[10px] wo-btn-primary disabled:opacity-45 text-white font-display font-bold text-sm sm:text-base"
                    >
                      Bye
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* === INLINE PANEL: NO BALL + LEG BYES / BYES === */}
              {(keypadPanel === 'NB_LB' || keypadPanel === 'NB_BYE') && (
                <motion.div
                  key={`keypad-${keypadPanel}`}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.14 }}
                  className="space-y-3.5"
                >
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => setKeypadPanel('NB')}
                      aria-label="Back to No Ball"
                      className="p-1.5 rounded-lg wo-btn-secondary text-[#FF8C00]"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <h4 className="font-display font-black text-xl text-[#E87500]">
                      {keypadPanel === 'NB_LB' ? 'No Ball + Leg Byes' : 'No Ball + Byes'}
                    </h4>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                    {[1, 2, 3, 4, 5, 6].map((r) => (
                      <motion.button
                        key={`nb-extra-${r}`}
                        type="button"
                        disabled={isScoringLocked}
                        whileHover={isScoringLocked ? undefined : { scale: 1.04, y: -1 }}
                        whileTap={isScoringLocked ? undefined : { scale: 0.94 }}
                        onClick={() => {
                          const tag = keypadPanel === 'NB_LB' ? 'LB' : 'B';
                          recordDelivery(
                            {
                              runsOffBat: 0,
                              extraType: 'NB',
                              extraRuns: 1 + r,
                            },
                            `No Ball + ${r} ${tag}`
                          );
                          setKeypadPanel('main');
                        }}
                        className="h-12 rounded-[10px] wo-btn-primary disabled:opacity-45 text-white font-display font-bold text-sm sm:text-base"
                      >
                        {keypadPanel === 'NB_LB' ? `NB +${r} LB` : `NB +${r} B`}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* === INLINE PANEL: WIDE === */}
              {keypadPanel === 'WD' && (
                <motion.div
                  key="keypad-wd"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.14 }}
                  className="space-y-3.5"
                >
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => setKeypadPanel('main')}
                      aria-label="Close Wide panel"
                      className="p-1.5 rounded-lg wo-btn-secondary text-[#FF8C00]"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <h4 className="font-display font-black text-xl text-[#E87500]">Wide</h4>
                  </div>

                  {/* Row 1: Wd, Wd +1, Wd +2, Wd +3 */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[0, 1, 2, 3].map((r) => (
                      <motion.button
                        key={`wd-${r}`}
                        type="button"
                        disabled={isScoringLocked}
                        whileHover={isScoringLocked ? undefined : { scale: 1.03, y: -1 }}
                        whileTap={isScoringLocked ? undefined : { scale: 0.95 }}
                        onClick={() => {
                          recordDelivery(
                            { runsOffBat: 0, extraType: 'WD', extraRuns: 1 + r },
                            r === 0 ? 'Wide' : `Wide +${r}`
                          );
                          setKeypadPanel('main');
                        }}
                        className="h-12 rounded-[12px] wo-trans-btn disabled:opacity-45 font-display font-extrabold text-base"
                      >
                        {r === 0 ? 'Wd' : `Wd +${r}`}
                      </motion.button>
                    ))}
                  </div>

                  {/* Row 2 (Centered): Wd +4, Wd +5, Wd +6 */}
                  <div className="grid grid-cols-3 gap-3 max-w-[76%] mx-auto">
                    {[4, 5, 6].map((r) => (
                      <motion.button
                        key={`wd-${r}`}
                        type="button"
                        disabled={isScoringLocked}
                        whileHover={isScoringLocked ? undefined : { scale: 1.03, y: -1 }}
                        whileTap={isScoringLocked ? undefined : { scale: 0.95 }}
                        onClick={() => {
                          recordDelivery(
                            { runsOffBat: 0, extraType: 'WD', extraRuns: 1 + r },
                            `Wide +${r}`
                          );
                          setKeypadPanel('main');
                        }}
                        className="h-12 rounded-[12px] wo-trans-btn disabled:opacity-45 font-display font-extrabold text-base"
                      >
                        {`Wd +${r}`}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* === INLINE PANEL: BYES === */}
              {keypadPanel === 'BYE' && (
                <motion.div
                  key="keypad-bye"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.14 }}
                  className="space-y-3.5"
                >
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => setKeypadPanel('main')}
                      aria-label="Close Byes panel"
                      className="p-1.5 rounded-lg wo-btn-secondary text-[#FF8C00]"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <h4 className="font-display font-black text-xl text-[#E87500]">Byes</h4>
                  </div>

                  {/* Row 1: 1 B, 2 B, 3 B, 4 B */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[1, 2, 3, 4].map((r) => (
                      <motion.button
                        key={`bye-${r}`}
                        type="button"
                        disabled={isScoringLocked}
                        whileHover={isScoringLocked ? undefined : { scale: 1.03, y: -1 }}
                        whileTap={isScoringLocked ? undefined : { scale: 0.95 }}
                        onClick={() => {
                          recordDelivery(
                            { runsOffBat: 0, extraType: 'BYE', extraRuns: r },
                            `${r} Bye${r > 1 ? 's' : ''}`
                          );
                          setKeypadPanel('main');
                        }}
                        className="h-12 rounded-[12px] wo-trans-btn disabled:opacity-45 font-display font-extrabold text-base"
                      >
                        {`${r} B`}
                      </motion.button>
                    ))}
                  </div>

                  {/* Row 2 (Centered): 5 B, 6 B, 7 B */}
                  <div className="grid grid-cols-3 gap-3 max-w-[76%] mx-auto">
                    {[5, 6, 7].map((r) => (
                      <motion.button
                        key={`bye-${r}`}
                        type="button"
                        disabled={isScoringLocked}
                        whileHover={isScoringLocked ? undefined : { scale: 1.03, y: -1 }}
                        whileTap={isScoringLocked ? undefined : { scale: 0.95 }}
                        onClick={() => {
                          recordDelivery(
                            { runsOffBat: 0, extraType: 'BYE', extraRuns: r },
                            `${r} Byes`
                          );
                          setKeypadPanel('main');
                        }}
                        className="h-12 rounded-[12px] wo-trans-btn disabled:opacity-45 font-display font-extrabold text-base"
                      >
                        {`${r} B`}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* === INLINE PANEL: LEG BYES === */}
              {keypadPanel === 'LB' && (
                <motion.div
                  key="keypad-lb"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.14 }}
                  className="space-y-3.5"
                >
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => setKeypadPanel('main')}
                      aria-label="Close Leg Byes panel"
                      className="p-1.5 rounded-lg wo-btn-secondary text-[#FF8C00]"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <h4 className="font-display font-black text-xl text-[#E87500]">Leg Byes</h4>
                  </div>

                  {/* Row 1: 1 LB, 2 LB, 3 LB, 4 LB */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[1, 2, 3, 4].map((r) => (
                      <motion.button
                        key={`lb-${r}`}
                        type="button"
                        disabled={isScoringLocked}
                        whileHover={isScoringLocked ? undefined : { scale: 1.03, y: -1 }}
                        whileTap={isScoringLocked ? undefined : { scale: 0.95 }}
                        onClick={() => {
                          recordDelivery(
                            { runsOffBat: 0, extraType: 'LB', extraRuns: r },
                            `${r} Leg Bye${r > 1 ? 's' : ''}`
                          );
                          setKeypadPanel('main');
                        }}
                        className="h-12 rounded-[12px] wo-trans-btn disabled:opacity-45 font-display font-extrabold text-base"
                      >
                        {`${r} LB`}
                      </motion.button>
                    ))}
                  </div>

                  {/* Row 2 (Centered): 5 LB, 6 LB, 7 LB */}
                  <div className="grid grid-cols-3 gap-3 max-w-[76%] mx-auto">
                    {[5, 6, 7].map((r) => (
                      <motion.button
                        key={`lb-${r}`}
                        type="button"
                        disabled={isScoringLocked}
                        whileHover={isScoringLocked ? undefined : { scale: 1.03, y: -1 }}
                        whileTap={isScoringLocked ? undefined : { scale: 0.95 }}
                        onClick={() => {
                          recordDelivery(
                            { runsOffBat: 0, extraType: 'LB', extraRuns: r },
                            `${r} Leg Byes`
                          );
                          setKeypadPanel('main');
                        }}
                        className="h-12 rounded-[12px] wo-trans-btn disabled:opacity-45 font-display font-extrabold text-base"
                      >
                        {`${r} LB`}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* === INLINE PANEL: DECLARED RUNS (DCL) === */}
              {keypadPanel === 'DCL' && (
                <motion.div
                  key="keypad-dcl"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.14 }}
                  className="space-y-3.5"
                >
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => setKeypadPanel('main')}
                      aria-label="Close Declared panel"
                      className="p-1.5 rounded-lg wo-btn-secondary text-[#FF8C00]"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <h4 className="font-display font-black text-xl text-[#E87500]">Declared</h4>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[0, 1, 2, 3].map((r) => (
                      <motion.button
                        key={`dcl-${r}`}
                        type="button"
                        disabled={isScoringLocked}
                        whileHover={isScoringLocked ? undefined : { scale: 1.03, y: -1 }}
                        whileTap={isScoringLocked ? undefined : { scale: 0.95 }}
                        onClick={() => {
                          recordDelivery(
                            { runsOffBat: r, extraType: 'none', isDcl: true },
                            `Declared ${r} run(s)`
                          );
                          setKeypadPanel('main');
                        }}
                        className="h-12 rounded-[12px] wo-btn-primary disabled:opacity-45 text-white font-display font-black text-base"
                      >
                        {`${r} D`}
                      </motion.button>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-3 max-w-[76%] mx-auto">
                    {[4, 5, 6].map((r) => (
                      <motion.button
                        key={`dcl-${r}`}
                        type="button"
                        disabled={isScoringLocked}
                        whileHover={isScoringLocked ? undefined : { scale: 1.03, y: -1 }}
                        whileTap={isScoringLocked ? undefined : { scale: 0.95 }}
                        onClick={() => {
                          recordDelivery(
                            {
                              runsOffBat: r,
                              extraType: 'none',
                              isDcl: true,
                              isBoundary4: false,
                              isBoundary6: false,
                            },
                            `Declared ${r} runs`
                          );
                          setKeypadPanel('main');
                        }}
                        className="h-12 rounded-[12px] wo-btn-primary disabled:opacity-45 text-white font-display font-black text-base"
                      >
                        {`${r} D`}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* === INLINE PANEL: MORE === */}
              {keypadPanel === 'MORE' && (
                <motion.div
                  key="keypad-more"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.14 }}
                  className="space-y-3.5"
                >
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => setKeypadPanel('main')}
                      aria-label="Close More panel"
                      className="p-1.5 rounded-lg wo-btn-secondary text-[#FF8C00]"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <h4 className="font-display font-black text-xl text-[#E87500]">More</h4>
                  </div>

                  {/* Row 1: Complete, Change Target, Change Over, Penalty */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.03, y: -1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleCompleteInningsOrMatch}
                      className="h-12 rounded-[10px] wo-btn-secondary font-display font-bold text-sm sm:text-base"
                    >
                      Complete
                    </motion.button>

                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.03, y: -1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setQuickTargetValue(
                          String(
                            match.innings[1].target !== null
                              ? match.innings[1].target
                              : match.innings[0].runs + 1
                          )
                        );
                        setChangeTargetModalOpen(true);
                      }}
                      className="h-12 rounded-[10px] wo-btn-secondary font-display font-bold text-sm sm:text-base"
                    >
                      Change Target
                    </motion.button>

                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.03, y: -1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setQuickOverValue(String(activeInn.maxOvers || match.oversPerInnings));
                        setChangeOverModalOpen(true);
                      }}
                      className="h-12 rounded-[10px] wo-btn-secondary font-display font-bold text-sm sm:text-base"
                    >
                      Change Over
                    </motion.button>

                    <motion.button
                      type="button"
                      disabled={isScoringLocked}
                      whileHover={isScoringLocked ? undefined : { scale: 1.03, y: -1 }}
                      whileTap={isScoringLocked ? undefined : { scale: 0.95 }}
                      onClick={() => setKeypadPanel('PENALTY')}
                      className="h-12 rounded-[10px] wo-btn-secondary disabled:opacity-45 font-display font-bold text-sm sm:text-base"
                    >
                      Penalty
                    </motion.button>
                  </div>

                  {/* Row 2: Setting, Walk Over */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.03, y: -1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setMatchSettingModalOpen(true)}
                      className="h-12 rounded-[10px] wo-btn-secondary font-display font-bold text-sm sm:text-base"
                    >
                      Setting
                    </motion.button>

                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.03, y: -1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setWalkOverWinnerId(match.team1Id);
                        setWalkOverModalOpen(true);
                      }}
                      className="h-12 rounded-[10px] bg-[#DC2626] hover:bg-[#B91C1C] shadow-sm text-white font-display font-bold text-sm sm:text-base transition-colors"
                    >
                      Walk Over
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* === INLINE PANEL: PENALTY RUNS === */}
              {keypadPanel === 'PENALTY' && (
                <motion.div
                  key="keypad-penalty"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.14 }}
                  className="space-y-3.5"
                >
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => setKeypadPanel('MORE')}
                      aria-label="Back to More"
                      className="p-1.5 rounded-lg wo-btn-secondary text-[#FF8C00]"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <h4 className="font-display font-black text-xl text-[#E87500]">
                      Penalty Runs
                    </h4>
                  </div>

                  <div className="grid grid-cols-5 gap-3">
                    {[1, 2, 3, 4, 5].map((r) => (
                      <motion.button
                        key={`pen-${r}`}
                        type="button"
                        disabled={isScoringLocked}
                        whileHover={isScoringLocked ? undefined : { scale: 1.04, y: -1 }}
                        whileTap={isScoringLocked ? undefined : { scale: 0.94 }}
                        onClick={() => {
                          recordDelivery(
                            { extraType: 'PENALTY', extraRuns: r },
                            `Penalty +${r} Runs`
                          );
                          setKeypadPanel('main');
                        }}
                        className="h-12 rounded-[10px] wo-btn-secondary disabled:opacity-45 font-display font-bold text-base"
                      >
                        +{r}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* === INLINE PANEL: MORE RUNS (7, 8, 9, 10, 11, 12, 13) === */}
              {keypadPanel === 'MORE_RUNS' && (
                <motion.div
                  key="keypad-more-runs"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.14 }}
                  className="space-y-3.5"
                >
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => setKeypadPanel('main')}
                      aria-label="Close More Runs panel"
                      className="p-1.5 rounded-lg wo-btn-secondary text-[#FF8C00]"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <h4 className="font-display font-black text-xl text-[#E87500]">More Runs</h4>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    {[7, 8, 9, 10, 11, 12, 13].map((r) => (
                      <motion.button
                        key={`more-run-${r}`}
                        type="button"
                        disabled={isScoringLocked}
                        whileHover={isScoringLocked ? undefined : { scale: 1.06, y: -2 }}
                        whileTap={isScoringLocked ? undefined : { scale: 0.92 }}
                        transition={{ type: 'spring', stiffness: 460, damping: 22 }}
                        onClick={() => {
                          recordDelivery({ runsOffBat: r }, `+${r} Runs`);
                          setKeypadPanel('main');
                        }}
                        className="w-[54px] h-[48px] sm:w-[58px] sm:h-[50px] rounded-[12px] wo-btn-secondary disabled:opacity-45 font-display font-bold text-base"
                      >
                        {r}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {/* ================= TAB 2: SCORECARD ================= */}
      {activeTab === 'scorecard' && (
        <div className="space-y-4">
          {/* Innings Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            {([0, 1] as const).map((idx) => {
              const t = idx === 0 ? inn1Team : inn2Team;
              const inn = match.innings[idx];
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setScorecardInningsTab(idx)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold border transition-colors ${
                    scorecardInningsTab === idx
                      ? 'wo-btn-active'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-orange-50'
                  }`}
                >
                  {idx === 0 ? '1st Innings' : '2nd Innings'} · {t?.shortName || `Team ${idx + 1}`}{' '}
                  ({inn.runs}/{inn.wickets}, {formatOvers(inn.legalBalls)})
                </button>
              );
            })}
          </div>

          {/* Batting Scorecard */}
          <div className="rounded-xl bg-white border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-display font-bold text-sm text-slate-900">
                {scorecardBatTeam?.name || 'Batting Team'} — Batting
              </h3>
              <span className="text-xs font-bold text-[#FF8C00] tabular-nums">
                {scorecardInn.runs}/{scorecardInn.wickets} ({formatOvers(scorecardInn.legalBalls)}{' '}
                ov) · RR {calcRunRate(scorecardInn.runs, scorecardInn.legalBalls)}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5">Batter</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5 text-right">R</th>
                    <th className="px-3 py-2.5 text-right">B</th>
                    <th className="px-3 py-2.5 text-right">4s</th>
                    <th className="px-3 py-2.5 text-right">6s</th>
                    <th className="px-4 py-2.5 text-right">SR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {scorecardBatRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                        No batting entries recorded yet.
                      </td>
                    </tr>
                  ) : (
                    scorecardBatRows.map((row) => (
                      <tr key={row.playerId} className="hover:bg-slate-50/70">
                        <td className="px-4 py-2.5 font-semibold text-slate-900">
                          <span className="inline-flex items-center gap-1.5">
                            {row.isStriker && (
                              <span
                                className="inline-flex items-center justify-center w-5 h-5 rounded bg-[#FFF3E0] text-[#E87500] border border-[#FF8C00]/30 shrink-0"
                                title="On Strike"
                              >
                                <CricketBatIcon className="w-3.5 h-3.5" />
                              </span>
                            )}
                            <span>{row.playerName}</span>
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-slate-500">
                          {row.dismissalText}
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold text-slate-900 tabular-nums">
                          {row.runs}
                        </td>
                        <td className="px-3 py-2.5 text-right text-slate-700 tabular-nums">
                          {row.balls}
                        </td>
                        <td className="px-3 py-2.5 text-right text-slate-700 tabular-nums">
                          {row.fours}
                        </td>
                        <td className="px-3 py-2.5 text-right text-slate-700 tabular-nums">
                          {row.sixes}
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-600 tabular-nums">
                          {row.sr}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div>
                <span className="font-bold text-slate-700">Extras: </span>
                <span className="font-bold text-slate-900">{totalExtras}</span>
                <span className="text-slate-500 ml-1">
                  (WD {scorecardInn.extras.wd}, NB {scorecardInn.extras.nb}, LB{' '}
                  {scorecardInn.extras.lb}, B {scorecardInn.extras.bye}, P{' '}
                  {scorecardInn.extras.penalty})
                </span>
              </div>
              <div className="font-bold text-slate-900">
                Total: {scorecardInn.runs}/{scorecardInn.wickets} ({formatOvers(scorecardInn.legalBalls)}{' '}
                Overs)
              </div>
            </div>
          </div>

          {/* Bowling Scorecard */}
          <div className="rounded-xl bg-white border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
              <h3 className="font-display font-bold text-sm text-slate-900">
                {scorecardBowlTeam?.name || 'Bowling Team'} — Bowling
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5">Bowler</th>
                    <th className="px-3 py-2.5 text-right">O</th>
                    <th className="px-3 py-2.5 text-right">M</th>
                    <th className="px-3 py-2.5 text-right">R</th>
                    <th className="px-3 py-2.5 text-right">W</th>
                    <th className="px-3 py-2.5 text-right">WD</th>
                    <th className="px-3 py-2.5 text-right">NB</th>
                    <th className="px-4 py-2.5 text-right">Eco</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {scorecardBowlRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-6 text-center text-slate-400">
                        No bowling figures recorded yet.
                      </td>
                    </tr>
                  ) : (
                    scorecardBowlRows.map((row) => (
                      <tr key={row.playerId} className="hover:bg-slate-50/70">
                        <td className="px-4 py-2.5 font-semibold text-slate-900">
                          {row.playerName}
                          {row.isCurrentBowler ? ' *' : ''}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{row.overs}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{row.maidens}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{row.runs}</td>
                        <td className="px-3 py-2.5 text-right font-bold text-red-600 tabular-nums">
                          {row.wickets}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">
                          {row.wides}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">
                          {row.noBalls}
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-[#FF8C00] tabular-nums">
                          {row.economy}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Fall of Wickets + Partnerships */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl bg-white border border-slate-200 shadow-xs p-4 space-y-3">
              <h3 className="font-display font-bold text-sm text-slate-900">
                Fall of Wickets
              </h3>
              {scorecardInn.fallOfWickets.length === 0 ? (
                <p className="text-xs text-slate-400">No wickets fallen in this innings.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {scorecardInn.fallOfWickets.map((fow) => (
                    <span
                      key={fow.wicketNumber}
                      className="px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-900"
                    >
                      <strong className="font-bold">
                        {fow.scoreAtFall}-{fow.wicketNumber}
                      </strong>{' '}
                      ({fow.playerName}, {fow.oversAtFall} ov)
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl bg-white border border-slate-200 shadow-xs p-4 space-y-3">
              <h3 className="font-display font-bold text-sm text-slate-900">
                Partnerships
              </h3>
              {scorecardPartnerships.length === 0 ? (
                <p className="text-xs text-slate-400">No partnerships recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {scorecardPartnerships.map((p) => (
                    <div
                      key={p.wicketNumber}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100 text-xs"
                    >
                      <span className="font-semibold text-slate-800 truncate">
                        Wkt {p.wicketNumber}: {p.batter1Name} &amp; {p.batter2Name}
                        {p.isActive ? ' (Active)' : ''}
                      </span>
                      <span className="font-bold text-[#FF8C00] shrink-0 tabular-nums">
                        {p.runs} runs ({p.balls}b)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: OVERS & MATCH OVER SUMMARY ================= */}
      {activeTab === 'overs' && (() => {
        const selectedOverInn = match.innings[oversInningsTab];
        const selectedOverBatTeam = teamMap.get(selectedOverInn.battingTeamId);
        const selectedOverBowlTeam = teamMap.get(selectedOverInn.bowlingTeamId);
        const selectedOversList = computeOversBreakdown(selectedOverInn);

        const inn1BatSummary = computeBattingCard(inn1, inn1Team);
        const inn1BowlTeamObj = teamMap.get(inn1.bowlingTeamId);
        const inn1BowlSummary = computeBowlingCard(inn1, inn1BowlTeamObj);

        const inn2BatSummary = computeBattingCard(inn2, inn2Team);
        const inn2BowlTeamObj = teamMap.get(inn2.bowlingTeamId);
        const inn2BowlSummary = computeBowlingCard(inn2, inn2BowlTeamObj);

        const inn1Fours = inn1.balls.filter((b) => b.isBoundary4).length;
        const inn1Sixes = inn1.balls.filter((b) => b.isBoundary6).length;
        const inn1ExtrasTotal =
          inn1.extras.wd + inn1.extras.nb + inn1.extras.lb + inn1.extras.bye + inn1.extras.penalty;

        const inn2Fours = inn2.balls.filter((b) => b.isBoundary4).length;
        const inn2Sixes = inn2.balls.filter((b) => b.isBoundary6).length;
        const inn2ExtrasTotal =
          inn2.extras.wd + inn2.extras.nb + inn2.extras.lb + inn2.extras.bye + inn2.extras.penalty;

        const topBat1 = [...inn1BatSummary]
          .sort((a, b) => b.runs - a.runs || a.balls - b.balls)
          .slice(0, 3);
        const topBowl1 = [...inn1BowlSummary]
          .sort((a, b) => b.wickets - a.wickets || a.runs - b.runs)
          .slice(0, 3);
        const topBat2 = [...inn2BatSummary]
          .sort((a, b) => b.runs - a.runs || a.balls - b.balls)
          .slice(0, 3);
        const topBowl2 = [...inn2BowlSummary]
          .sort((a, b) => b.wickets - a.wickets || a.runs - b.runs)
          .slice(0, 3);

        const pomPlayer = match.playerOfMatchId
          ? [...(team1?.players ?? []), ...(team2?.players ?? [])].find(
              (p) => p.id === match.playerOfMatchId
            )
          : undefined;
        const pomTeam = match.playerOfMatchId
          ? team1?.players.some((p) => p.id === match.playerOfMatchId)
            ? team1
            : team2
          : undefined;

        const matchGroup = match.groupId
          ? state.groups.find((g) => g.id === match.groupId)
          : undefined;
        const isSummaryLiveOnOverlay =
          state.activeMatchId === match.id &&
          state.overlay.mainCard.kind === 'MATCH_STATS' &&
          state.overlay.mainCard.mode === 'Match Summary';

        return (
          <div className="space-y-4">
            {/* INTERNATIONAL BROADCAST MATCH SUMMARY (Auto-Generated from Live Scoring Data) */}
            <div className="space-y-3">
              <div className="no-print rounded-xl bg-white border border-slate-200 p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display font-bold text-sm text-slate-900">
                    Broadcast Match Summary
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Download HD PNG, open Full Screen, share on WhatsApp, print, or push live to OBS/vMix.
                  </p>
                </div>
                <MatchSummaryActionToolbar
                  match={match}
                  tournament={tournament}
                  group={matchGroup}
                  teamMap={teamMap}
                  channelTitle={state.user.channelTitle || 'STAR EVENT LIVE'}
                  isShowingOnOverlay={isSummaryLiveOnOverlay}
                  onToggleLiveOverlay={() => {
                    if (isSummaryLiveOnOverlay) {
                      updateState((prev) => ({
                        ...prev,
                        overlay: { ...prev.overlay, mainCard: { kind: 'NONE' } },
                      }));
                      onToast('Match Summary hidden from Live Broadcast Overlay.');
                    } else {
                      handleShowSummaryOnOverlay();
                    }
                  }}
                  onOpenFullscreen={() => setSummaryFullscreenOpen(true)}
                  onToast={onToast}
                />
              </div>

              <div className="match-summary-print-root">
                <BroadcastMatchSummaryCard
                  match={match}
                  tournament={tournament}
                  group={matchGroup}
                  teamMap={teamMap}
                  channelTitle={state.user.channelTitle || 'STAR EVENT LIVE'}
                />
              </div>
            </div>

            {/* COMPLETE MATCH SUMMARY DETAILS (Shown when match is completed) */}
            {match.status === 'completed' && (
              <div className="no-print rounded-2xl bg-white border-2 border-[#FF8C00] shadow-sm overflow-hidden">
                {/* Result & Trophy Banner */}
                <div className="bg-gradient-to-r from-[#FF8C00] via-[#E87500] to-[#D97706] text-white px-5 py-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0">
                      <Trophy className="w-6 h-6 text-white" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-white/20">
                          MATCH SUMMARY · {match.stageBadge}
                        </span>
                        <span className="text-[11px] font-semibold text-orange-100">
                          {tournament?.name || 'Tournament'} · {match.matchLabel}
                        </span>
                      </div>
                      <h2 className="font-display font-black text-lg sm:text-xl tracking-wide mt-0.5">
                        {match.resultText}
                      </h2>
                      <p className="text-[11px] text-orange-100 mt-0.5">
                        Toss: {teamMap.get(match.tossWinnerId)?.name || team1?.name || 'Team 1'} won &amp; elected to {match.tossDecision}
                        {match.venue ? ` · Venue: ${match.venue}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleShowSummaryOnOverlay}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white hover:bg-[#FFF3E0] text-[#E87500] text-xs font-black shadow-xs transition-colors"
                    >
                      <Tv className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Show Summary on Overlay</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPomId(match.playerOfMatchId || '');
                        setPomModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-300 hover:bg-amber-200 text-slate-950 text-xs font-bold transition-colors"
                    >
                      <Award className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{pomPlayer ? 'Edit POM' : 'Set POM'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('scorecard')}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/15 hover:bg-white/25 border border-white/30 text-white text-xs font-bold transition-colors"
                    >
                      <span>Full Scorecard</span>
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="p-4 sm:p-5 space-y-5">
                  {/* Both Innings Final Score Comparison */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div className="rounded-xl bg-[#FFF3E0]/55 border border-[#FF8C00]/30 p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#E87500]">
                          1st Innings
                        </span>
                        <span className="text-[11px] font-bold text-slate-500 tabular-nums">
                          RR {calcRunRate(inn1.runs, inn1.legalBalls)}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="font-display font-bold text-base text-slate-900 truncate">
                          {inn1Team?.name || 'Team 1'}
                        </p>
                        <p className="font-display font-black text-2xl text-[#FF8C00] tabular-nums shrink-0">
                          {inn1.runs}/{inn1.wickets}{' '}
                          <span className="text-xs font-bold text-slate-600">
                            ({formatOvers(inn1.legalBalls)}/{inn1.maxOvers} ov)
                          </span>
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-3 text-[11px] font-semibold text-slate-600 pt-1 border-t border-[#FF8C00]/15">
                        <span>4s: <strong className="text-slate-900">{inn1Fours}</strong></span>
                        <span>6s: <strong className="text-slate-900">{inn1Sixes}</strong></span>
                        <span>Extras: <strong className="text-slate-900">{inn1ExtrasTotal}</strong></span>
                      </div>
                    </div>

                    <div className="rounded-xl bg-emerald-50/70 border border-emerald-200 p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                          2nd Innings · Target {inn2.target ?? inn1.runs + 1}
                        </span>
                        <span className="text-[11px] font-bold text-slate-500 tabular-nums">
                          RR {calcRunRate(inn2.runs, inn2.legalBalls)}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="font-display font-bold text-base text-slate-900 truncate">
                          {inn2Team?.name || 'Team 2'}
                        </p>
                        <p className="font-display font-black text-2xl text-emerald-700 tabular-nums shrink-0">
                          {inn2.runs}/{inn2.wickets}{' '}
                          <span className="text-xs font-bold text-slate-600">
                            ({formatOvers(inn2.legalBalls)}/{inn2.maxOvers} ov)
                          </span>
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-3 text-[11px] font-semibold text-slate-600 pt-1 border-t border-emerald-200/70">
                        <span>4s: <strong className="text-slate-900">{inn2Fours}</strong></span>
                        <span>6s: <strong className="text-slate-900">{inn2Sixes}</strong></span>
                        <span>Extras: <strong className="text-slate-900">{inn2ExtrasTotal}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Player of the Match Highlight */}
                  <div className="rounded-xl bg-amber-50/80 border border-amber-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Award className="w-5 h-5" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-wider text-amber-800">
                          Player of the Match
                        </p>
                        <p className="font-display font-bold text-sm sm:text-base text-slate-900 truncate">
                          {pomPlayer
                            ? `${pomPlayer.name} (${pomTeam?.shortName || 'Team'})`
                            : 'Not selected yet'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPomId(match.playerOfMatchId || '');
                        setPomModalOpen(true);
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold shrink-0"
                    >
                      {pomPlayer ? 'Change Player' : 'Select Player of the Match'}
                    </button>
                  </div>

                  {/* Top Performers — Both Innings */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* 1st Innings Top Batters & Bowlers */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-3">
                      <h4 className="font-display font-bold text-xs uppercase tracking-wider text-[#E87500]">
                        1st Innings Top Performers
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-bold uppercase text-slate-500">
                            Batting ({inn1Team?.shortName || 'T1'})
                          </p>
                          {topBat1.length === 0 ? (
                            <p className="text-xs text-slate-400">No batting records.</p>
                          ) : (
                            topBat1.map((b) => (
                              <div
                                key={b.playerId}
                                className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs"
                              >
                                <span className="font-semibold text-slate-800 truncate">
                                  {b.playerName}
                                </span>
                                <span className="font-black text-slate-900 tabular-nums shrink-0">
                                  {b.runs}
                                  {b.isOut ? '' : '*'} ({b.balls})
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-bold uppercase text-slate-500">
                            Bowling ({inn1BowlTeamObj?.shortName || 'T2'})
                          </p>
                          {topBowl1.length === 0 ? (
                            <p className="text-xs text-slate-400">No bowling records.</p>
                          ) : (
                            topBowl1.map((b) => (
                              <div
                                key={b.playerId}
                                className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs"
                              >
                                <span className="font-semibold text-slate-800 truncate">
                                  {b.playerName}
                                </span>
                                <span className="font-black text-red-600 tabular-nums shrink-0">
                                  {b.wickets}/{b.runs} ({b.overs})
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 2nd Innings Top Batters & Bowlers */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-3">
                      <h4 className="font-display font-bold text-xs uppercase tracking-wider text-emerald-700">
                        2nd Innings Top Performers
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-bold uppercase text-slate-500">
                            Batting ({inn2Team?.shortName || 'T2'})
                          </p>
                          {topBat2.length === 0 ? (
                            <p className="text-xs text-slate-400">No batting records.</p>
                          ) : (
                            topBat2.map((b) => (
                              <div
                                key={b.playerId}
                                className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs"
                              >
                                <span className="font-semibold text-slate-800 truncate">
                                  {b.playerName}
                                </span>
                                <span className="font-black text-slate-900 tabular-nums shrink-0">
                                  {b.runs}
                                  {b.isOut ? '' : '*'} ({b.balls})
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-bold uppercase text-slate-500">
                            Bowling ({inn2BowlTeamObj?.shortName || 'T1'})
                          </p>
                          {topBowl2.length === 0 ? (
                            <p className="text-xs text-slate-400">No bowling records.</p>
                          ) : (
                            topBowl2.map((b) => (
                              <div
                                key={b.playerId}
                                className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs"
                              >
                                <span className="font-semibold text-slate-800 truncate">
                                  {b.playerName}
                                </span>
                                <span className="font-black text-red-600 tabular-nums shrink-0">
                                  {b.wickets}/{b.runs} ({b.overs})
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Current & Previous Over Cards (when live) */}
            {match.status !== 'completed' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-xs">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#FF8C00] mb-2">
                    Current Over (Over {currentOverNumber + 1})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {thisOverBalls.length > 0 ? (
                      thisOverBalls.map(renderBallChip)
                    ) : (
                      <span className="text-xs text-slate-400">Awaiting first delivery.</span>
                    )}
                  </div>
                </div>

                <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-xs">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Previous Over {currentOverNumber > 0 ? `(Over ${currentOverNumber})` : ''}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {prevOverBalls.length > 0 ? (
                      prevOverBalls.map(renderBallChip)
                    ) : (
                      <span className="text-xs text-slate-400">No previous over yet.</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Innings Switcher for Over-by-Over History */}
            <div className="flex flex-wrap items-center gap-2">
              {([0, 1] as const).map((idx) => {
                const t = idx === 0 ? inn1Team : inn2Team;
                const inn = match.innings[idx];
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setOversInningsTab(idx)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold border transition-colors ${
                      oversInningsTab === idx
                        ? 'wo-btn-active'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-orange-50'
                    }`}
                  >
                    {idx === 0 ? '1st Innings Overs' : '2nd Innings Overs'} ·{' '}
                    {t?.shortName || `Team ${idx + 1}`} ({inn.runs}/{inn.wickets},{' '}
                    {formatOvers(inn.legalBalls)})
                  </button>
                );
              })}
            </div>

            <div className="rounded-xl bg-white border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                <h3 className="font-display font-bold text-sm text-slate-900">
                  Complete Over-by-Over History ({selectedOverBatTeam?.name || 'Batting Team'})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2.5">Over</th>
                      <th className="px-3 py-2.5">Bowler</th>
                      <th className="px-3 py-2.5">Ball-by-Ball</th>
                      <th className="px-3 py-2.5 text-right">Runs</th>
                      <th className="px-3 py-2.5 text-right">Wkts</th>
                      <th className="px-3 py-2.5 text-right">Extras</th>
                      <th className="px-4 py-2.5 text-right">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedOversList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                          No overs bowled yet.
                        </td>
                      </tr>
                    ) : (
                      selectedOversList
                        .slice()
                        .reverse()
                        .map((ov) => {
                          const bowlerObj = selectedOverBowlTeam?.players.find(
                            (p) => p.id === ov.bowlerId
                          );
                          return (
                            <tr key={ov.overNumber} className="hover:bg-slate-50/70">
                              <td className="px-4 py-3 font-bold text-[#FF8C00]">
                                Over {ov.overNumber}
                              </td>
                              <td className="px-3 py-3 font-medium text-slate-800">
                                {bowlerObj?.name || 'Bowler'}
                              </td>
                              <td className="px-3 py-3">
                                <div className="flex flex-wrap gap-1">
                                  {ov.balls.map(renderBallChip)}
                                </div>
                              </td>
                              <td className="px-3 py-3 text-right font-bold text-slate-900 tabular-nums">
                                {ov.runsInOver}
                              </td>
                              <td className="px-3 py-3 text-right font-bold text-red-600 tabular-nums">
                                {ov.wicketsInOver}
                              </td>
                              <td className="px-3 py-3 text-right text-emerald-700 tabular-nums">
                                {ov.extrasInOver}
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-slate-900 tabular-nums">
                                {ov.cumulativeRuns}/{ov.cumulativeWickets}
                              </td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ================= TAB 4: OVERLAY CONTROL ================= */}
      {activeTab === 'overlay' && (
        <TvOverlayControllerView
          state={state}
          overlayUrl={overlayUrl}
          updateState={updateState}
          onCopyOverlayUrl={onCopyOverlayUrl}
          onGoToGroups={onGoToGroups}
          onToast={onToast}
          onRequestLogout={onRequestLogout}
        />
      )}

      {/* ================= MODAL: WICKET / OUT (EXACT 4-ROW DIRECT RED BUTTONS) ================= */}
      <AnimatePresence>
        {wicketModalOpen && (
          <motion.div
            key="wicket-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-[2px]"
            role="dialog"
            aria-modal="true"
            aria-label="Wicket"
            onClick={() => {
              setWicketModalOpen(false);
              setWicketStep('types');
            }}
          >
            <motion.div
              key="wicket-modal-card"
              initial={{ opacity: 0, scale: 0.92, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ type: 'spring', stiffness: 380, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden"
            >
              {/* Clean White Header: × on left + Wicket title */}
              <div className="px-4 sm:px-5 pt-4 pb-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (wicketStep === 'runout') {
                      setWicketStep('types');
                    } else {
                      setWicketModalOpen(false);
                    }
                  }}
                  aria-label={wicketStep === 'runout' ? 'Back to wicket types' : 'Close wicket popup'}
                  className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
                <h3 className="font-display font-bold text-lg sm:text-xl text-slate-950 tracking-tight">
                  {wicketStep === 'runout' ? 'Run Out' : 'Wicket'}
                </h3>
              </div>

              {wicketStep === 'types' ? (
                <div className="px-4 sm:px-5 pb-5 pt-1">
                  <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
                    {(
                      [
                        { label: 'Bowled', span: 'col-span-1' },
                        { label: 'Caught', span: 'col-span-1' },
                        { label: 'C & B', span: 'col-span-1' },
                        { label: 'LBW', span: 'col-span-1' },
                        { label: 'Run Out', span: 'col-span-1' },
                        { label: 'Stumped', span: 'col-span-1' },
                        { label: 'Hit Wicket', span: 'col-span-1' },
                        { label: 'Retired Hurt', span: 'col-span-1' },
                        { label: 'Time Out', span: 'col-span-1' },
                        { label: 'Retired Out', span: 'col-span-1' },
                        { label: 'Obstructing the Field', span: 'col-span-2' },
                        { label: 'Mankad Runout', span: 'col-span-2' },
                        { label: 'Hit Ball Twice', span: 'col-span-2' },
                      ] as Array<{ label: WicketType; span: string }>
                    ).map((item) => (
                      <motion.button
                        key={item.label}
                        type="button"
                        whileHover={{ scale: 1.03, y: -1.5 }}
                        whileTap={{ scale: 0.94 }}
                        transition={{ type: 'spring', stiffness: 460, damping: 22 }}
                        onClick={() => handleDirectWicketTap(item.label)}
                        className={`${item.span} min-h-[46px] sm:min-h-[50px] px-2 sm:px-3 py-2.5 rounded-xl bg-[#F44336] hover:bg-[#E53935] text-white font-semibold text-xs sm:text-[15px] text-center leading-tight shadow-[0_3px_10px_rgba(244,67,54,0.35)] flex items-center justify-center`}
                      >
                        {item.label}
                      </motion.button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="px-4 sm:px-5 pb-5 pt-1 space-y-4">
                  {/* Direct Dismissed Batter Buttons for Run Out */}
                  <div>
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                      Who is Run Out?
                    </p>
                    <div className="grid grid-cols-2 gap-2.5">
                      {activeInn.strikerId && (
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setWicketDismissedId(activeInn.strikerId)}
                          className={`px-3.5 py-3 rounded-xl border text-left transition-colors ${
                            wicketDismissedId === activeInn.strikerId
                              ? 'bg-[#F44336] text-white border-[#D32F2F] shadow-[0_3px_10px_rgba(244,67,54,0.35)]'
                              : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-red-50'
                          }`}
                        >
                          <span
                            className={`block text-[10px] font-bold uppercase ${
                              wicketDismissedId === activeInn.strikerId
                                ? 'text-red-100'
                                : 'text-slate-500'
                            }`}
                          >
                            Striker *
                          </span>
                          <span className="block text-sm font-bold truncate">
                            {strikerStats?.playerName || 'Striker'}
                          </span>
                        </motion.button>
                      )}
                      {activeInn.nonStrikerId && (
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setWicketDismissedId(activeInn.nonStrikerId)}
                          className={`px-3.5 py-3 rounded-xl border text-left transition-colors ${
                            wicketDismissedId === activeInn.nonStrikerId
                              ? 'bg-[#F44336] text-white border-[#D32F2F] shadow-[0_3px_10px_rgba(244,67,54,0.35)]'
                              : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-red-50'
                          }`}
                        >
                          <span
                            className={`block text-[10px] font-bold uppercase ${
                              wicketDismissedId === activeInn.nonStrikerId
                                ? 'text-red-100'
                                : 'text-slate-500'
                            }`}
                          >
                            Non-Striker
                          </span>
                          <span className="block text-sm font-bold truncate">
                            {nonStrikerStats?.playerName || 'Non-Striker'}
                          </span>
                        </motion.button>
                      )}
                    </div>
                  </div>

                  {/* Direct Runs Completed Buttons */}
                  <div>
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                      Runs Completed
                    </p>
                    <div className="grid grid-cols-5 gap-2">
                      {[0, 1, 2, 3, 4].map((r) => (
                        <motion.button
                          key={r}
                          type="button"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.92 }}
                          onClick={() => setWicketRunsCompleted(r)}
                          className={`py-2.5 rounded-xl text-sm font-black border transition-colors ${
                            wicketRunsCompleted === r
                              ? 'bg-[#F44336] text-white border-[#D32F2F] shadow-[0_3px_10px_rgba(244,67,54,0.35)]'
                              : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-red-50'
                          }`}
                        >
                          {r}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setWicketStep('types')}
                      className="py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm"
                    >
                      Back
                    </motion.button>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={submitRunOutWicket}
                      className="py-3 rounded-xl bg-[#F44336] hover:bg-[#E53935] text-white font-bold text-sm shadow-[0_3px_10px_rgba(244,67,54,0.35)]"
                    >
                      Confirm Run Out
                    </motion.button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= MODAL: PICK STRIKER / NON-STRIKER / BOWLER ================= */}
      {playerPickerSlot && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl bg-white border border-slate-200 shadow-2xl overflow-hidden max-h-[88vh] flex flex-col">
            <div className="wo-header text-white px-4 py-3 flex items-center justify-between">
              <h3 className="font-display font-black text-sm text-white uppercase tracking-wide">
                Select{' '}
                {playerPickerSlot === 'striker'
                  ? 'Striker'
                  : playerPickerSlot === 'nonStriker'
                    ? 'Non-Striker'
                    : 'Bowler'}
              </h3>
              <button
                type="button"
                onClick={() => setPlayerPickerSlot(null)}
                className="p-1 rounded text-white/90 hover:text-white"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto">
              {(() => {
                const targetTeam =
                  playerPickerSlot === 'bowler' ? bowlingTeam : battingTeam;
                const players = targetTeam?.players ?? [];
                return (
                  <>
                    <div className="space-y-1.5 max-h-60 overflow-y-auto">
                      {players.length === 0 ? (
                        <p className="text-xs text-slate-500 py-4 text-center">
                          No players in {targetTeam?.name || 'this team'} yet. Add one below!
                        </p>
                      ) : (
                        players.map((p) => {
                          const isSelected =
                            (playerPickerSlot === 'striker' &&
                              activeInn.strikerId === p.id) ||
                            (playerPickerSlot === 'nonStriker' &&
                              activeInn.nonStrikerId === p.id) ||
                            (playerPickerSlot === 'bowler' &&
                              activeInn.bowlerId === p.id);
                          const isDisabledPrevBowler =
                            playerPickerSlot === 'bowler' &&
                            blockPreviousBowler &&
                            Boolean(previousOverBowlerId) &&
                            p.id === previousOverBowlerId;
                          const isAlreadyOutBatter =
                            (playerPickerSlot === 'striker' ||
                              playerPickerSlot === 'nonStriker') &&
                            activeInn.fallOfWickets.some((f) => f.playerId === p.id);
                          const isOptionDisabled = isDisabledPrevBowler || isAlreadyOutBatter;
                          const bStats =
                            playerPickerSlot === 'bowler'
                              ? bowlingStatsByPlayerId.get(p.id)
                              : undefined;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              disabled={isOptionDisabled}
                              onClick={() => handleAssignPlayerSlot(p.id)}
                              className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                                isOptionDisabled
                                  ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-70'
                                  : isSelected
                                    ? 'bg-[#FFF3E0] border-[#FF8C00] text-[#FF8C00]'
                                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                {p.photoUrl ? (
                                  <img
                                    src={p.photoUrl}
                                    alt={p.name}
                                    className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-[#FFF3E0] text-[#E87500] font-bold text-[11px] flex items-center justify-center shrink-0 border border-[#FF8C00]/25">
                                    {getPlayerInitials(p.name)}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold truncate">
                                    #{p.jerseyNo} {p.name}
                                  </p>
                                  <p className="text-[11px] text-slate-500">
                                    {p.role}
                                    {bStats
                                      ? ` · ${bStats.overs}-${bStats.maidens}-${bStats.runs}-${bStats.wickets}`
                                      : ''}
                                  </p>
                                </div>
                              </div>
                              {isDisabledPrevBowler ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-200 text-slate-600 text-[10px] font-bold uppercase shrink-0">
                                  <Ban className="w-3 h-3" aria-hidden="true" />
                                  Last Over
                                </span>
                              ) : isAlreadyOutBatter ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-bold uppercase shrink-0">
                                  OUT
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-500 shrink-0">
                                  {isSelected ? 'Active' : ''}
                                </span>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>

                    {targetTeam && (
                      <div className="pt-3 border-t border-slate-200 space-y-2">
                        <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-[#FF8C00]" aria-hidden="true" />
                          Quick Add Player to {targetTeam.name}
                        </p>
                        <div>
                          <input
                            type="text"
                            value={quickPlayerName}
                            onChange={(e) => setQuickPlayerName(e.target.value)}
                            placeholder="Enter player name"
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            handleQuickAddPlayer(targetTeam.id, playerPickerSlot)
                          }
                          className="w-full py-2 rounded-lg wo-btn-primary text-white text-xs font-extrabold uppercase tracking-wider"
                        >
                          + Add &amp; Assign Player
                        </button>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT 1ST / 2ND INN SCORE ================= */}
      <AnimatePresence>
        {editScoreModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-[2px] overflow-y-auto"
            role="dialog"
            aria-modal="true"
          >
            <motion.form
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              onSubmit={submitEditScoreModal}
              className="w-full max-w-[700px] rounded-[4px] bg-white overflow-hidden shadow-2xl my-auto"
            >
              {/* White & Orange Header */}
              <div className="relative px-5 py-3.5 wo-header flex items-center justify-center">
                <h3 className="font-display font-black text-xl tracking-wide text-white uppercase text-center">
                  {editInningsIdx === 0 ? 'EDIT 1ST INN SCORE' : 'EDIT 2ND INN SCORE'}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditScoreModalOpen(false)}
                  aria-label="Close modal"
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-white/90 hover:text-white transition-transform hover:scale-110"
                >
                  <X className="w-5 h-5 stroke-[2.5]" />
                </button>
              </div>

              {/* 3-Column Material Underline Form */}
              <div className="px-7 sm:px-9 pt-6 pb-7 space-y-6 bg-white">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-7 gap-y-6">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Score
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={editRuns}
                      onChange={(e) => setEditRuns(e.target.value)}
                      className="w-full bg-transparent border-0 border-b border-slate-400 focus:border-b-2 focus:border-[#FF8C00] py-1.5 text-base text-slate-900 tabular-nums focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Wickets
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={editWickets}
                      onChange={(e) => setEditWickets(e.target.value)}
                      className="w-full bg-transparent border-0 border-b border-slate-400 focus:border-b-2 focus:border-[#FF8C00] py-1.5 text-base text-slate-900 tabular-nums focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Ball Delivered
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={editBalls}
                      onChange={(e) => setEditBalls(e.target.value)}
                      className="w-full bg-transparent border-0 border-b border-slate-400 focus:border-b-2 focus:border-[#FF8C00] py-1.5 text-base text-slate-900 tabular-nums focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Wides
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={editWides}
                      onChange={(e) => setEditWides(e.target.value)}
                      className="w-full bg-transparent border-0 border-b border-slate-400 focus:border-b-2 focus:border-[#FF8C00] py-1.5 text-base text-slate-900 tabular-nums focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      No Balls
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={editNoBalls}
                      onChange={(e) => setEditNoBalls(e.target.value)}
                      className="w-full bg-transparent border-0 border-b border-slate-400 focus:border-b-2 focus:border-[#FF8C00] py-1.5 text-base text-slate-900 tabular-nums focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Match Overs
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={editMaxOvers}
                      onChange={(e) => setEditMaxOvers(e.target.value)}
                      className="w-full bg-transparent border-0 border-b border-slate-400 focus:border-b-2 focus:border-[#FF8C00] py-1.5 text-base text-slate-900 tabular-nums focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Byes
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={editByes}
                      onChange={(e) => setEditByes(e.target.value)}
                      className="w-full bg-transparent border-0 border-b border-slate-400 focus:border-b-2 focus:border-[#FF8C00] py-1.5 text-base text-slate-900 tabular-nums focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Leg Byes
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={editLegByes}
                      onChange={(e) => setEditLegByes(e.target.value)}
                      className="w-full bg-transparent border-0 border-b border-slate-400 focus:border-b-2 focus:border-[#FF8C00] py-1.5 text-base text-slate-900 tabular-nums focus:outline-none transition-colors"
                    />
                  </div>

                  {editInningsIdx === 1 && (
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        Target
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={editTarget}
                        onChange={(e) => setEditTarget(e.target.value)}
                        className="w-full bg-transparent border-0 border-b border-slate-400 focus:border-b-2 focus:border-[#FF8C00] py-1.5 text-base text-slate-900 tabular-nums focus:outline-none transition-colors"
                      />
                    </div>
                  )}
                </div>

                {/* Centered CHANGE Button */}
                <div className="pt-2 flex justify-center">
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.96 }}
                    className="px-7 py-2.5 rounded-lg wo-btn-primary text-white text-xs font-extrabold uppercase tracking-wider cursor-pointer"
                  >
                    CHANGE
                  </motion.button>
                </div>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= MODAL: CHANGE TARGET ================= */}
      <AnimatePresence>
        {changeTargetModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-[2px]"
            role="dialog"
            aria-modal="true"
          >
            <motion.form
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onSubmit={handleSaveQuickTarget}
              className="w-full max-w-md rounded-[4px] bg-white overflow-hidden shadow-2xl"
            >
              <div className="relative px-5 py-3.5 wo-header flex items-center justify-center">
                <h3 className="font-display font-black text-lg tracking-wide text-white uppercase">
                  CHANGE TARGET
                </h3>
                <button
                  type="button"
                  onClick={() => setChangeTargetModalOpen(false)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/90 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Target Runs
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    autoFocus
                    value={quickTargetValue}
                    onChange={(e) => setQuickTargetValue(e.target.value)}
                    className="w-full bg-transparent border-0 border-b border-slate-400 focus:border-b-2 focus:border-[#FF8C00] py-1.5 text-base text-slate-900 tabular-nums focus:outline-none"
                  />
                </div>
                <div className="flex justify-center">
                  <button
                    type="submit"
                    className="px-7 py-2.5 rounded-lg wo-btn-primary text-white text-xs font-extrabold uppercase tracking-wider"
                  >
                    CHANGE
                  </button>
                </div>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= MODAL: CHANGE OVER ================= */}
      <AnimatePresence>
        {changeOverModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-[2px]"
            role="dialog"
            aria-modal="true"
          >
            <motion.form
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onSubmit={handleSaveQuickOver}
              className="w-full max-w-md rounded-xl bg-white overflow-hidden shadow-2xl"
            >
              <div className="relative px-5 py-3.5 wo-header flex items-center justify-center">
                <h3 className="font-display font-black text-lg tracking-wide text-white uppercase">
                  CHANGE MATCH OVERS
                </h3>
                <button
                  type="button"
                  onClick={() => setChangeOverModalOpen(false)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/90 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Total Overs per Innings
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    required
                    autoFocus
                    value={quickOverValue}
                    onChange={(e) => setQuickOverValue(e.target.value)}
                    className="w-full bg-transparent border-0 border-b border-slate-400 focus:border-b-2 focus:border-[#FF8C00] py-1.5 text-base text-slate-900 tabular-nums focus:outline-none"
                  />
                </div>
                <div className="flex justify-center">
                  <button
                    type="submit"
                    className="px-7 py-2.5 rounded-lg wo-btn-primary text-white text-xs font-extrabold uppercase tracking-wider"
                  >
                    CHANGE
                  </button>
                </div>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= MODAL: MATCH SETTING ================= */}
      <AnimatePresence>
        {matchSettingModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-[2px]"
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-xl wo-card overflow-hidden shadow-2xl"
            >
              <div className="relative px-5 py-3.5 wo-header flex items-center justify-center">
                <h3 className="font-display font-black text-lg tracking-wide text-white uppercase">
                  MATCH SETTINGS
                </h3>
                <button
                  type="button"
                  onClick={() => setMatchSettingModalOpen(false)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/90 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setMatchSettingModalOpen(false);
                    setKeypadPanel('main');
                    openEditScoreModal(0);
                  }}
                  className="py-3 px-3 rounded-lg wo-btn-secondary text-xs font-bold"
                >
                  Edit 1st Inn Score
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMatchSettingModalOpen(false);
                    setKeypadPanel('main');
                    openEditScoreModal(1);
                  }}
                  className="py-3 px-3 rounded-lg wo-btn-secondary text-xs font-bold"
                >
                  Edit 2nd Inn Score
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMatchSettingModalOpen(false);
                    setKeypadPanel('main');
                    openTossModal();
                  }}
                  className="py-3 px-3 rounded-lg wo-btn-soft text-xs font-extrabold"
                >
                  Edit Toss
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMatchSettingModalOpen(false);
                    setKeypadPanel('main');
                    setSelectedPomId(match.playerOfMatchId || '');
                    setPomModalOpen(true);
                  }}
                  className="py-3 px-3 rounded-lg bg-[#4CAF50] hover:bg-[#43A047] text-white text-xs font-bold shadow-xs"
                >
                  Player of the Match
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= MODAL: WALK OVER ================= */}
      <AnimatePresence>
        {walkOverModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-[2px]"
            role="dialog"
            aria-modal="true"
          >
            <motion.form
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onSubmit={handleConfirmWalkOver}
              className="w-full max-w-md rounded-[4px] bg-white overflow-hidden shadow-2xl"
            >
              <div className="relative px-5 py-3.5 bg-[#F44336] flex items-center justify-center">
                <h3 className="font-display font-bold text-lg tracking-wide text-white uppercase">
                  WALK OVER
                </h3>
                <button
                  type="button"
                  onClick={() => setWalkOverModalOpen(false)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-5">
                <p className="text-xs font-medium text-slate-600 text-center">
                  Select the team awarded the match by Walk Over:
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[match.team1Id, match.team2Id].map((tid) => {
                    const tm = teamMap.get(tid);
                    const active = walkOverWinnerId === tid;
                    return (
                      <button
                        key={tid}
                        type="button"
                        onClick={() => setWalkOverWinnerId(tid)}
                        className={`p-3 rounded-lg border-2 text-sm font-bold transition-all ${
                          active
                            ? 'bg-red-50 border-[#F44336] text-[#D32F2F]'
                            : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300'
                        }`}
                      >
                        {tm?.name || 'Team'}
                      </button>
                    );
                  })}
                </div>
                <div className="flex justify-center">
                  <button
                    type="submit"
                    className="px-7 py-2.5 rounded-[3px] bg-[#F44336] hover:bg-[#E53935] text-white text-xs font-semibold uppercase tracking-wider shadow-md"
                  >
                    CONFIRM WALK OVER
                  </button>
                </div>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= MODAL: TOSS SETUP ================= */}
      {tossModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
            <div className="wo-header text-white px-4 py-3 flex items-center justify-between">
              <h3 className="font-display font-black text-sm text-white uppercase tracking-wide">Toss Setup</h3>
              <button
                type="button"
                onClick={() => setTossModalOpen(false)}
                className="p-1 rounded text-white/90 hover:text-white"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Toss Won By
                </label>
                <select
                  value={tossWinnerId}
                  onChange={(e) => setTossWinnerId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                >
                  <option value={match.team1Id}>{team1?.name || 'Team 1'}</option>
                  <option value={match.team2Id}>{team2?.name || 'Team 2'}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Decision
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Bat', 'Bowl'] as const).map((dec) => (
                    <button
                      key={dec}
                      type="button"
                      onClick={() => setTossDecision(dec)}
                      className={`py-2 rounded-lg text-xs font-bold border ${
                        tossDecision === dec
                          ? 'wo-btn-active'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-orange-50'
                      }`}
                    >
                      Elected to {dec}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTossModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitTossModal}
                  className="px-4 py-2 rounded-lg wo-btn-primary text-xs font-extrabold uppercase tracking-wider text-white"
                >
                  Save Toss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: PLAYER OF THE MATCH ================= */}
      {pomModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
            <div className="wo-header text-white px-4 py-3 flex items-center justify-between">
              <h3 className="font-display font-black text-sm text-white uppercase tracking-wide">Select Player of the Match</h3>
              <button
                type="button"
                onClick={() => setPomModalOpen(false)}
                className="p-1 rounded text-white/90 hover:text-white"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <select
                value={selectedPomId}
                onChange={(e) => setSelectedPomId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
              >
                <option value="">-- Select Player --</option>
                {allMatchPlayers.map(({ player, teamShort }) => (
                  <option key={player.id} value={player.id}>
                    {player.name} ({teamShort})
                  </option>
                ))}
              </select>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPomModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateCurrentMatch((m) => ({
                      ...m,
                      playerOfMatchId: selectedPomId,
                    }));
                    setPomModalOpen(false);
                    onToast('Player of the Match saved.');
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg wo-btn-primary text-xs font-extrabold uppercase tracking-wider text-white"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Save</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: OVER COMPLETED — SELECT NEXT BOWLER ================= */}
      <AnimatePresence>
        {overCompleteModalOpen && isPendingBowlerChange && (
          <motion.div
            key="over-complete-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-[2px]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="over-completed-title"
          >
            <motion.div
              key="over-complete-card"
              initial={{ opacity: 0, scale: 0.9, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ type: 'spring', stiffness: 360, damping: 26 }}
              className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
            >
              {/* Animated Notification Header */}
              <div className="wo-header text-white px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <motion.div
                      animate={{ rotate: [0, -16, 16, -12, 12, 0], scale: [1, 1.1, 1] }}
                      transition={{ duration: 0.95, repeat: Infinity, repeatDelay: 1.4 }}
                      className="w-12 h-12 rounded-xl bg-white/20 border border-white/35 flex items-center justify-center shrink-0 shadow-inner"
                    >
                      <BellRing className="w-6 h-6 text-white" aria-hidden="true" />
                    </motion.div>
                    <div>
                      <h3
                        id="over-completed-title"
                        className="font-display font-black text-lg sm:text-xl tracking-wide text-white leading-tight"
                      >
                        OVER COMPLETED
                      </h3>
                      <p className="text-xs sm:text-sm font-extrabold text-orange-100 tracking-wider uppercase mt-0.5">
                        PLEASE CHANGE BOWLER
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOverCompleteModalOpen(false)}
                    aria-label="Close bowler popup"
                    className="p-1.5 rounded-lg text-white/90 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>

                {/* Completed Over Summary + Strike Rotation Confirmation */}
                <div className="mt-3 pt-3 border-t border-white/25 flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                  <span className="px-2.5 py-1 rounded-md bg-white/20 text-white">
                    Over {completedOverNum} Complete · {prevOverSummary.runs}R / {prevOverSummary.wkts}W
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-white/15 text-orange-50">
                    Next Over: Over {completedOverNum + 1}
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-white/15 text-orange-50">
                    Strike Rotated: {strikerStats?.playerName || 'Striker'} *
                  </span>
                </div>
              </div>

              {/* Bowler Selection List */}
              <div className="p-4 sm:p-5 space-y-3 overflow-y-auto flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Select Bowler ({bowlingTeam?.name || 'Bowling Team'})
                  </p>
                  <span className="text-[11px] font-semibold text-slate-500">
                    Previous bowler disabled
                  </span>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
                  {(bowlingTeam?.players ?? []).length === 0 ? (
                    <p className="text-xs text-slate-500 py-6 text-center bg-slate-50 rounded-xl border border-slate-200">
                      No bowlers found in {bowlingTeam?.name || 'this team'}. Add a bowler below.
                    </p>
                  ) : (
                    (bowlingTeam?.players ?? []).map((p) => {
                      const isPrevBowler =
                        Boolean(previousOverBowlerId) && p.id === previousOverBowlerId;
                      const isPicked = !isPrevBowler && selectedNextBowlerId === p.id;
                      const stats = bowlingStatsByPlayerId.get(p.id);

                      return (
                        <button
                          key={p.id}
                          type="button"
                          disabled={isPrevBowler}
                          onClick={() => setSelectedNextBowlerId(p.id)}
                          className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                            isPrevBowler
                              ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-70'
                              : isPicked
                                ? 'bg-[#FFF3E0] border-[#FF8C00] shadow-xs'
                                : 'bg-white border-slate-200 hover:border-[#FF8C00]/50 hover:bg-orange-50/30 text-slate-900'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {p.photoUrl ? (
                              <img
                                src={p.photoUrl}
                                alt={p.name}
                                className={`w-11 h-11 rounded-full object-cover shrink-0 border-2 ${
                                  isPrevBowler
                                    ? 'border-slate-300 grayscale'
                                    : isPicked
                                      ? 'border-[#FF8C00]'
                                      : 'border-slate-200'
                                }`}
                              />
                            ) : (
                              <div
                                className={`w-11 h-11 rounded-full font-display font-bold text-xs flex items-center justify-center shrink-0 border ${
                                  isPrevBowler
                                    ? 'bg-slate-200 text-slate-500 border-slate-300'
                                    : isPicked
                                      ? 'wo-btn-primary text-white'
                                      : 'bg-[#FFF3E0] text-[#E87500] border-[#FF8C00]/25'
                                }`}
                              >
                                {getPlayerInitials(p.name)}
                              </div>
                            )}

                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p
                                  className={`font-display font-bold text-sm truncate ${
                                    isPrevBowler ? 'text-slate-500' : 'text-slate-900'
                                  }`}
                                >
                                  {p.name}
                                </p>
                                <span className="text-[10px] font-bold text-slate-400 shrink-0">
                                  #{p.jerseyNo}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500 mt-0.5">
                                <span>{p.role}</span>
                                <span className="text-slate-300">·</span>
                                <span className="font-semibold tabular-nums">
                                  {stats
                                    ? `${stats.overs} ov · ${stats.maidens}M · ${stats.runs}R · ${stats.wickets}W (Eco ${stats.economy})`
                                    : '0.0 ov · 0R · 0W'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {isPrevBowler ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-200 text-slate-600 text-[10px] font-extrabold uppercase tracking-wide">
                                <Ban className="w-3 h-3" aria-hidden="true" />
                                Previous
                              </span>
                            ) : isPicked ? (
                              <span className="w-7 h-7 rounded-full wo-btn-primary text-white inline-flex items-center justify-center">
                                <Check className="w-4 h-4" aria-hidden="true" />
                              </span>
                            ) : (
                              <span className="w-6 h-6 rounded-full border-2 border-slate-300 inline-block" />
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Quick Add Bowler inline if team needs an extra bowler */}
                {bowlingTeam && (
                  <div className="pt-3 border-t border-slate-200 space-y-2">
                    <p className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                      <UserPlus className="w-3.5 h-3.5 text-[#FF8C00]" aria-hidden="true" />
                      Quick Add New Bowler to {bowlingTeam.shortName}
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={quickPlayerName}
                        onChange={(e) => setQuickPlayerName(e.target.value)}
                        placeholder="Enter bowler name"
                        className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:outline-hidden focus:border-[#FF8C00]"
                      />
                      <button
                        type="button"
                        onClick={() => handleQuickAddPlayer(bowlingTeam.id, 'overBowler')}
                        className="px-3.5 py-2 rounded-lg bg-[#FFF3E0] hover:bg-orange-100 border border-[#FF8C00]/30 text-[#E87500] text-xs font-bold shrink-0"
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Actions: CANCEL & SELECT BOWLER */}
              <div className="px-4 sm:px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
                <button
                  type="button"
                  onClick={() => setOverCompleteModalOpen(false)}
                  className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-xs sm:text-sm font-bold text-slate-700 transition-colors"
                >
                  CANCEL
                </button>
                <div className="flex items-center gap-2 flex-1 sm:flex-none justify-end">
                  <button
                    type="button"
                    disabled={
                      !selectedNextBowlerId || selectedNextBowlerId === previousOverBowlerId
                    }
                    onClick={() => handleConfirmNextBowler(selectedNextBowlerId)}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl wo-btn-primary disabled:opacity-45 disabled:cursor-not-allowed text-white font-display font-black text-xs sm:text-sm tracking-wide whitespace-nowrap"
                  >
                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                    <span>SELECT BOWLER</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= MODAL: WICKET FALLEN — SELECT / ADD NEXT BATTER ================= */}
      <AnimatePresence>
        {newBatterModalOpen && isPendingNewBatter && (
          <motion.div
            key="new-batter-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/65 backdrop-blur-[2px]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-batter-title"
          >
            <motion.div
              key="new-batter-card"
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 14 }}
              transition={{ type: 'spring', stiffness: 360, damping: 26 }}
              className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
            >
              {/* Header */}
              <div className="wo-header text-white px-5 py-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-white/20 border border-white/35 flex items-center justify-center shrink-0">
                    <UserPlus className="w-6 h-6 text-white" aria-hidden="true" />
                  </div>
                  <div>
                    <h3
                      id="new-batter-title"
                      className="font-display font-black text-base sm:text-lg tracking-wide text-white uppercase"
                    >
                      WICKET FALLEN · SELECT NEXT BATTER
                    </h3>
                    <p className="text-xs font-bold text-orange-100 mt-0.5">
                      Scoring is paused until the next batter is selected or added
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setNewBatterModalOpen(false)}
                  aria-label="Close next batter popup"
                  className="p-1.5 rounded-lg text-white/90 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>

              {/* Body */}
              <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
                <div className="rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-red-900">
                    Batting Team: <strong>{battingTeam?.name || 'Team'}</strong>
                  </span>
                  <span className="font-black text-red-700 tabular-nums">
                    {activeInn.runs}/{activeInn.wickets} ({formatOvers(activeInn.legalBalls)} ov)
                  </span>
                </div>

                {/* Available Batters */}
                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-0.5">
                  {(battingTeam?.players ?? []).map((p) => {
                    const isAlreadyOut = activeInn.fallOfWickets.some(
                      (f) => f.playerId === p.id
                    );
                    const isCurrentlyBatting =
                      p.id === activeInn.strikerId || p.id === activeInn.nonStrikerId;
                    const isDisabled = isAlreadyOut || isCurrentlyBatting;
                    const isPicked = selectedNextBatterId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => setSelectedNextBatterId(p.id)}
                        className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border text-left transition-all ${
                          isDisabled
                            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-70'
                            : isPicked
                              ? 'bg-red-50 border-2 border-[#DC2626] text-slate-900 shadow-xs'
                              : 'bg-white border-slate-200 hover:border-red-300 hover:bg-red-50/40 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {p.photoUrl ? (
                            <img
                              src={p.photoUrl}
                              alt={p.name}
                              className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-red-100 text-[#B91C1C] font-bold text-xs flex items-center justify-center shrink-0">
                              {getPlayerInitials(p.name)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-bold truncate">
                              #{p.jerseyNo} {p.name}
                            </p>
                            <p className="text-[11px] text-slate-500">{p.role}</p>
                          </div>
                        </div>

                        <div className="shrink-0">
                          {isAlreadyOut ? (
                            <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-extrabold uppercase">
                              OUT
                            </span>
                          ) : isCurrentlyBatting ? (
                            <span className="px-2 py-0.5 rounded bg-orange-100 text-[#E87500] text-[10px] font-extrabold uppercase">
                              BATTING
                            </span>
                          ) : isPicked ? (
                            <span className="w-7 h-7 rounded-full bg-[#DC2626] text-white inline-flex items-center justify-center shadow-xs">
                              <Check className="w-4 h-4" aria-hidden="true" />
                            </span>
                          ) : (
                            <span className="w-6 h-6 rounded-full border-2 border-slate-300 inline-block" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Inline Quick Add New Batter (with duplicate name protection) */}
                {battingTeam && (
                  <div className="pt-3 border-t border-slate-200 space-y-2">
                    <p className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                      <UserPlus className="w-3.5 h-3.5 text-[#DC2626]" aria-hidden="true" />
                      Quick Add New Batter to {battingTeam.shortName}
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={quickPlayerName}
                        onChange={(e) => setQuickPlayerName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleQuickAddPlayer(battingTeam.id, 'newBatter');
                          }
                        }}
                        placeholder="Enter new batter name"
                        className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:outline-hidden focus:border-[#DC2626]"
                      />
                      <button
                        type="button"
                        onClick={() => handleQuickAddPlayer(battingTeam.id, 'newBatter')}
                        className="px-3.5 py-2 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-[#B91C1C] text-xs font-bold shrink-0"
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 sm:px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setNewBatterModalOpen(false)}
                    className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-xs font-bold text-slate-700"
                  >
                    CANCEL
                  </button>
                  {match.undoStack.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setNewBatterModalOpen(false);
                        handleUndo();
                      }}
                      className="inline-flex items-center gap-1 px-3 py-2.5 rounded-xl bg-orange-100 hover:bg-orange-200 text-[#E87500] text-xs font-bold"
                    >
                      <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>UNDO</span>
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  disabled={!selectedNextBatterId}
                  onClick={() => handleConfirmNextBatter(selectedNextBatterId)}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl wo-btn-primary disabled:opacity-45 disabled:cursor-not-allowed text-white font-display font-black text-xs sm:text-sm tracking-wide"
                >
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                  <span>SELECT BATTER</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= MODAL: END 1ST INNINGS & SWITCH TO 2ND INNINGS ================= */}
      <AnimatePresence>
        {inningsSwitchModalOpen && innIdx === 0 && (
          <motion.div
            key="innings-switch-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-[2px]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="innings-switch-title"
          >
            <motion.div
              key="innings-switch-card"
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 14 }}
              transition={{ type: 'spring', stiffness: 360, damping: 26 }}
              className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
            >
              {/* Header */}
              <div className="wo-header text-white px-5 py-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-white/20 border border-white/35 flex items-center justify-center shrink-0">
                    <ArrowLeftRight className="w-6 h-6 text-white" aria-hidden="true" />
                  </div>
                  <div>
                    <h3
                      id="innings-switch-title"
                      className="font-display font-black text-base sm:text-lg tracking-wide text-white uppercase"
                    >
                      {isFirstInningsEnded
                        ? '1ST INNINGS COMPLETED'
                        : 'END 1ST INNINGS & SWITCH'}
                    </h3>
                    <p className="text-xs font-bold text-orange-100 mt-0.5">
                      End 1st innings and switch live scoring to 2nd innings
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setInningsSwitchModalOpen(false)}
                  aria-label="Close innings switch popup"
                  className="p-1.5 rounded-lg text-white/90 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>

              {/* Body */}
              <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
                {/* Score & Target Summary */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-[#FFF3E0] border border-[#FF8C00]/30 p-3.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#E87500]">
                      1st Innings Score
                    </p>
                    <p className="font-display font-bold text-sm text-slate-900 truncate mt-0.5">
                      {inn1Team?.name || 'Team 1'}
                    </p>
                    <p className="font-display font-black text-2xl text-[#FF8C00] tabular-nums mt-1">
                      {inn1.runs}/{inn1.wickets}
                    </p>
                    <p className="text-[11px] font-semibold text-slate-600 tabular-nums">
                      Overs: {formatOvers(inn1.legalBalls)} / {inn1.maxOvers}
                    </p>
                  </div>

                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                      2nd Innings Target
                    </p>
                    <p className="font-display font-bold text-sm text-slate-900 truncate mt-0.5">
                      {inn2Team?.name || 'Team 2'}
                    </p>
                    <p className="font-display font-black text-2xl text-emerald-700 tabular-nums mt-1">
                      {inn1.runs + 1} Runs
                    </p>
                    <p className="text-[11px] font-semibold text-emerald-800 tabular-nums">
                      In {inn2.maxOvers} Overs ({inn2.maxOvers * 6} balls)
                    </p>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-3 text-xs text-slate-700 leading-relaxed">
                  After switching to 2nd Innings, a popup will open to <strong>select or add</strong>{' '}
                  {inn2Team?.name || 'Team 2'} opening batters and {inn1Team?.name || 'Team 1'}{' '}
                  opening bowler before scoring starts.
                </div>
              </div>

              {/* Footer Actions */}
              <div className="px-4 sm:px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setInningsSwitchModalOpen(false)}
                    className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-xs font-bold text-slate-700"
                  >
                    CANCEL
                  </button>
                  {isFirstInningsEnded && match.undoStack.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setInningsSwitchModalOpen(false);
                        handleUndo();
                      }}
                      className="inline-flex items-center gap-1 px-3 py-2.5 rounded-xl bg-orange-100 hover:bg-orange-200 text-[#E87500] text-xs font-bold"
                    >
                      <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>UNDO</span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleStartSecondInnings}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white font-display font-black text-xs sm:text-sm tracking-wide shadow-sm transition-colors"
                >
                  <Play className="w-4 h-4" aria-hidden="true" />
                  <span>CONFIRM &amp; SWITCH TO 2ND INNINGS</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= MODAL: 2ND INNINGS SETUP — SELECT / ADD BATTERS & BOWLER ================= */}
      <AnimatePresence>
        {secondInningsSetupModalOpen && innIdx === 1 && !activeInn.completed && (
          <motion.div
            key="inn2-setup-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/65 backdrop-blur-[2px]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="inn2-setup-title"
          >
            <motion.div
              key="inn2-setup-card"
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 14 }}
              transition={{ type: 'spring', stiffness: 360, damping: 26 }}
              className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
            >
              {/* Header */}
              <div className="wo-header text-white px-5 py-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-white/20 border border-white/35 flex items-center justify-center shrink-0">
                    <Users className="w-6 h-6 text-white" aria-hidden="true" />
                  </div>
                  <div>
                    <h3
                      id="inn2-setup-title"
                      className="font-display font-black text-base sm:text-lg tracking-wide text-white uppercase"
                    >
                      2ND INNINGS — SELECT BATTERS &amp; BOWLER
                    </h3>
                    <p className="text-xs font-bold text-orange-100 mt-0.5">
                      Select or add Opening Striker, Non-Striker &amp; Bowler to begin scoring
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSecondInningsSetupModalOpen(false)}
                  aria-label="Close 2nd innings setup popup"
                  className="p-1.5 rounded-lg text-white/90 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>

              {/* Body */}
              {(() => {
                const secondBatTeam = teamMap.get(inn2.battingTeamId);
                const secondBowlTeam = teamMap.get(inn2.bowlingTeamId);
                return (
                  <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
                    {/* Target Banner */}
                    <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-emerald-900">
                        {secondBatTeam?.name || 'Team 2'} Batting · Chasing Target
                      </span>
                      <span className="font-display font-black text-sm text-emerald-700 tabular-nums">
                        {inn2.target ?? inn1.runs + 1} Runs
                      </span>
                    </div>

                    {/* Opening Striker */}
                    <div className="space-y-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        1. Opening Striker ({secondBatTeam?.shortName || 'Batting Team'}) *
                      </p>
                      <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                        {(secondBatTeam?.players ?? []).length === 0 ? (
                          <p className="text-xs text-slate-400">
                            No players yet — add a batter below.
                          </p>
                        ) : (
                          (secondBatTeam?.players ?? []).map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                if (p.id === inn2NonStrikerId) {
                                  setInn2NonStrikerId(inn2StrikerId);
                                }
                                setInn2StrikerId(p.id);
                              }}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                                inn2StrikerId === p.id
                                  ? 'wo-btn-active'
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-orange-50'
                              }`}
                            >
                              #{p.jerseyNo} {p.name}
                            </button>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Opening Non-Striker */}
                    <div className="space-y-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        2. Opening Non-Striker ({secondBatTeam?.shortName || 'Batting Team'}) *
                      </p>
                      <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                        {(secondBatTeam?.players ?? []).length === 0 ? (
                          <p className="text-xs text-slate-400">
                            Add at least 2 batters below.
                          </p>
                        ) : (
                          (secondBatTeam?.players ?? []).map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              disabled={p.id === inn2StrikerId}
                              onClick={() => setInn2NonStrikerId(p.id)}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                                p.id === inn2StrikerId
                                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                                  : inn2NonStrikerId === p.id
                                    ? 'wo-btn-active'
                                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-orange-50'
                              }`}
                            >
                              #{p.jerseyNo} {p.name}
                            </button>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Quick Add Batter for 2nd Innings Batting Team */}
                    {secondBatTeam && (
                      <div className="p-3 rounded-xl bg-[#FFF3E0]/80 border border-[#FF8C00]/25 space-y-1.5">
                        <p className="text-[11px] font-bold text-[#E87500] flex items-center gap-1.5">
                          <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
                          Quick Add Batter to {secondBatTeam.shortName}
                        </p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={quickPlayerName}
                            onChange={(e) => setQuickPlayerName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleQuickAddPlayer(secondBatTeam.id, 'inn2Bat');
                              }
                            }}
                            placeholder="Enter batter name"
                            className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white focus:outline-hidden focus:border-[#FF8C00]"
                          />
                          <button
                            type="button"
                            onClick={() => handleQuickAddPlayer(secondBatTeam.id, 'inn2Bat')}
                            className="px-3.5 py-1.5 rounded-lg wo-btn-primary text-white text-xs font-bold shrink-0"
                          >
                            + Add Batter
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Opening Bowler */}
                    <div className="space-y-2 pt-1 border-t border-slate-200">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        3. Opening Bowler ({secondBowlTeam?.shortName || 'Bowling Team'}) *
                      </p>
                      <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                        {(secondBowlTeam?.players ?? []).length === 0 ? (
                          <p className="text-xs text-slate-400">
                            No bowlers yet — add a bowler below.
                          </p>
                        ) : (
                          (secondBowlTeam?.players ?? []).map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => setInn2BowlerId(p.id)}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                                inn2BowlerId === p.id
                                  ? 'bg-[#16A34A] text-white border-[#15803D] shadow-xs'
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50'
                              }`}
                            >
                              #{p.jerseyNo} {p.name}
                            </button>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Quick Add Bowler for 2nd Innings Bowling Team */}
                    {secondBowlTeam && (
                      <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1.5">
                        <p className="text-[11px] font-bold text-emerald-800 flex items-center gap-1.5">
                          <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
                          Quick Add Bowler to {secondBowlTeam.shortName}
                        </p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={quickBowlPlayerName}
                            onChange={(e) => setQuickBowlPlayerName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleQuickAddPlayer(
                                  secondBowlTeam.id,
                                  'inn2Bowl',
                                  quickBowlPlayerName
                                );
                              }
                            }}
                            placeholder="Enter bowler name"
                            className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white focus:outline-hidden focus:border-emerald-600"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleQuickAddPlayer(
                                secondBowlTeam.id,
                                'inn2Bowl',
                                quickBowlPlayerName
                              )
                            }
                            className="px-3.5 py-1.5 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold shrink-0"
                          >
                            + Add Bowler
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Footer Actions */}
              <div className="px-4 sm:px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
                <button
                  type="button"
                  onClick={() => setSecondInningsSetupModalOpen(false)}
                  className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-xs font-bold text-slate-700"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  disabled={
                    !inn2StrikerId ||
                    !inn2NonStrikerId ||
                    !inn2BowlerId ||
                    inn2StrikerId === inn2NonStrikerId
                  }
                  onClick={handleConfirmSecondInningsSetup}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl wo-btn-primary disabled:opacity-45 disabled:cursor-not-allowed text-white font-display font-black text-xs sm:text-sm tracking-wide"
                >
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                  <span>CONFIRM &amp; START 2ND INNINGS</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= MODAL: MATCH COMPLETED — CONFIRM MATCH OVER ================= */}
      <AnimatePresence>
        {matchCompleteModalOpen && match.status === 'completed' && (
          <motion.div
            key="match-complete-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/65 backdrop-blur-[2px]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="match-complete-title"
          >
            <motion.div
              key="match-complete-card"
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 14 }}
              transition={{ type: 'spring', stiffness: 360, damping: 26 }}
              className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
            >
              {/* Header */}
              <div className="wo-header text-white px-5 py-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ scale: [1, 1.12, 1], rotate: [0, -6, 6, 0] }}
                    transition={{ duration: 1.4, repeat: Infinity }}
                    className="w-11 h-11 rounded-xl bg-white/20 border border-white/35 flex items-center justify-center shrink-0"
                  >
                    <Trophy className="w-6 h-6 text-white" aria-hidden="true" />
                  </motion.div>
                  <div>
                    <h3
                      id="match-complete-title"
                      className="font-display font-black text-base sm:text-lg tracking-wide text-white uppercase"
                    >
                      MATCH COMPLETED
                    </h3>
                    <p className="text-xs font-bold text-orange-100 mt-0.5">
                      Confirm match over to open complete Match Summary &amp; Overs
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMatchCompleteModalOpen(false)}
                  aria-label="Close match completed popup"
                  className="p-1.5 rounded-lg text-white/90 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>

              {/* Body */}
              <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
                {/* Winner / Result Highlight */}
                <div className="rounded-xl bg-emerald-50 border-2 border-emerald-300 px-4 py-3 text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
                    OFFICIAL MATCH RESULT
                  </p>
                  <p className="font-display font-black text-lg sm:text-xl text-emerald-950 mt-0.5">
                    {match.resultText}
                  </p>
                </div>

                {/* 1st & 2nd Innings Final Score Comparison */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-[#FFF3E0] border border-[#FF8C00]/30 p-3.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#E87500]">
                      1st Innings
                    </p>
                    <p className="font-display font-bold text-sm text-slate-900 truncate mt-0.5">
                      {inn1Team?.name || 'Team 1'}
                    </p>
                    <p className="font-display font-black text-2xl text-[#FF8C00] tabular-nums mt-1">
                      {inn1.runs}/{inn1.wickets}
                    </p>
                    <p className="text-[11px] font-semibold text-slate-600 tabular-nums">
                      Overs: {formatOvers(inn1.legalBalls)} / {inn1.maxOvers}
                    </p>
                  </div>

                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                      2nd Innings
                    </p>
                    <p className="font-display font-bold text-sm text-slate-900 truncate mt-0.5">
                      {inn2Team?.name || 'Team 2'}
                    </p>
                    <p className="font-display font-black text-2xl text-emerald-700 tabular-nums mt-1">
                      {inn2.runs}/{inn2.wickets}
                    </p>
                    <p className="text-[11px] font-semibold text-emerald-800 tabular-nums">
                      Overs: {formatOvers(inn2.legalBalls)} / {inn2.maxOvers}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 text-center">
                  Confirm karne ke baad <strong>Overs &amp; Match Summary</strong> open ho jayega jisme dono innings ke scores, top batters, top bowlers, Player of the Match aur over-by-over history dikhegi.
                </p>
              </div>

              {/* Footer Actions */}
              <div className="px-4 sm:px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMatchCompleteModalOpen(false)}
                    className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-xs font-bold text-slate-700"
                  >
                    CANCEL
                  </button>
                  {match.undoStack.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setMatchCompleteModalOpen(false);
                        handleUndo();
                      }}
                      className="inline-flex items-center gap-1 px-3 py-2.5 rounded-xl bg-orange-100 hover:bg-orange-200 text-[#E87500] text-xs font-bold"
                    >
                      <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>UNDO</span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleConfirmMatchCompleted}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white font-display font-black text-xs sm:text-sm tracking-wide shadow-sm transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                  <span>CONFIRM MATCH OVER &amp; OPEN SUMMARY</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= MODAL: EDIT STRIKER / NON-STRIKER / BOWLER ================= */}
      <AnimatePresence>
        {editPlayerModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-[2px] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-player-modal-title"
          >
            <motion.form
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              onSubmit={handleSaveEditPlayer}
              className="w-full max-w-[700px] rounded-[4px] bg-white overflow-hidden shadow-2xl my-auto"
            >
              {/* White & Orange Header */}
              <div className="relative px-5 py-3.5 wo-header flex items-center justify-center">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white flex items-center">
                  <svg
                    viewBox="0 0 36 36"
                    className="w-8 h-8"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    {/* Helmet / Cap + Head */}
                    <circle cx="20" cy="10" r="4.5" />
                    <path d="M15 8.5c1-2.8 4-4.2 7.2-3.5 1.8.4 3.2 1.7 3.8 3.5H15z" />
                    {/* Torso & Jersey */}
                    <path d="M14.5 17.5c0-1.6 1.3-2.8 3-2.8h5c1.7 0 3 1.2 3 2.8v9.5c0 1.2-.9 2-2 2h-7c-1.1 0-2-.8-2-2v-9.5z" />
                    {/* Cricket Bat held upright */}
                    <rect
                      x="7.2"
                      y="6"
                      width="3.4"
                      height="15"
                      rx="1.2"
                      transform="rotate(14 8.9 13.5)"
                    />
                    <rect
                      x="6.4"
                      y="20"
                      width="1.6"
                      height="5.5"
                      rx="0.8"
                      transform="rotate(14 7.2 22.7)"
                    />
                  </svg>
                </span>

                <h3
                  id="edit-player-modal-title"
                  className="font-display font-bold text-xl tracking-wide text-white uppercase text-center"
                >
                  {editPlayerModal.slot === 'striker'
                    ? 'EDIT STRIKER'
                    : editPlayerModal.slot === 'nonStriker'
                      ? 'EDIT NON-STRIKER'
                      : 'EDIT BOWLER'}
                </h3>

                <button
                  type="button"
                  onClick={() => setEditPlayerModal(null)}
                  aria-label="Close modal"
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-white/95 hover:text-white transition-transform hover:scale-110"
                >
                  <X className="w-5 h-5 stroke-[2.5]" />
                </button>
              </div>

              {/* Clean Material Underline Inputs */}
              <div className="px-7 sm:px-9 pt-6 pb-7 space-y-6 bg-white">
                {/* Player Name */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    {editPlayerModal.slot === 'striker'
                      ? 'Striker'
                      : editPlayerModal.slot === 'nonStriker'
                        ? 'Non-Striker'
                        : 'Bowler'}
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={editPlayerName}
                    onChange={(e) => setEditPlayerName(e.target.value)}
                    placeholder="Enter player name"
                    className="w-full bg-transparent border-0 border-b border-slate-400 focus:border-b-2 focus:border-[#FF8C00] py-1.5 text-base font-medium text-slate-900 focus:outline-none transition-colors"
                  />
                </div>

                {/* Stats Row */}
                {editPlayerModal.slot !== 'bowler' ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-5">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        Score
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={editBatterScore}
                        onChange={(e) => setEditBatterScore(e.target.value)}
                        className="w-full bg-transparent border-0 border-b border-slate-400 focus:border-b-2 focus:border-[#FF8C00] py-1.5 text-base text-slate-900 tabular-nums focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        Balls
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={editBatterBalls}
                        onChange={(e) => setEditBatterBalls(e.target.value)}
                        className="w-full bg-transparent border-0 border-b border-slate-400 focus:border-b-2 focus:border-[#FF8C00] py-1.5 text-base text-slate-900 tabular-nums focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        4s
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={editBatter4s}
                        onChange={(e) => setEditBatter4s(e.target.value)}
                        className="w-full bg-transparent border-0 border-b border-slate-400 focus:border-b-2 focus:border-[#FF8C00] py-1.5 text-base text-slate-900 tabular-nums focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        6s
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={editBatter6s}
                        onChange={(e) => setEditBatter6s(e.target.value)}
                        className="w-full bg-transparent border-0 border-b border-slate-400 focus:border-b-2 focus:border-[#FF8C00] py-1.5 text-base text-slate-900 tabular-nums focus:outline-none transition-colors"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-5">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        Overs
                      </label>
                      <input
                        type="text"
                        value={editBowlerOvers}
                        onChange={(e) => setEditBowlerOvers(e.target.value)}
                        placeholder="0.0"
                        className="w-full bg-transparent border-0 border-b border-slate-400 focus:border-b-2 focus:border-[#FF8C00] py-1.5 text-base text-slate-900 tabular-nums focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        Maidens
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={editBowlerMaidens}
                        onChange={(e) => setEditBowlerMaidens(e.target.value)}
                        className="w-full bg-transparent border-0 border-b border-slate-400 focus:border-b-2 focus:border-[#FF8C00] py-1.5 text-base text-slate-900 tabular-nums focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        Runs
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={editBowlerRuns}
                        onChange={(e) => setEditBowlerRuns(e.target.value)}
                        className="w-full bg-transparent border-0 border-b border-slate-400 focus:border-b-2 focus:border-[#FF8C00] py-1.5 text-base text-slate-900 tabular-nums focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        Wickets
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={editBowlerWickets}
                        onChange={(e) => setEditBowlerWickets(e.target.value)}
                        className="w-full bg-transparent border-0 border-b border-slate-400 focus:border-b-2 focus:border-[#FF8C00] py-1.5 text-base text-slate-900 tabular-nums focus:outline-none transition-colors"
                      />
                    </div>
                  </div>
                )}

                {/* Centered UPDATE Button */}
                <div className="pt-2 flex justify-center">
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.96 }}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg wo-btn-primary text-white text-xs font-extrabold uppercase tracking-wider cursor-pointer"
                  >
                    <span>UPDATE</span>
                    <Send className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                  </motion.button>
                </div>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      <WorldCupUnlockModal
        open={worldCupPayModalOpen}
        themeId={payModalThemeId}
        onClose={() => setWorldCupPayModalOpen(false)}
        onUnlockSuccess={({ themeId: unlockedId, orderId, cfPaymentId }) => {
          void refreshWorldCupStatus();
          const unlockedProduct = getPaidThemeConfig(unlockedId);
          updateState((prev) => ({
            ...prev,
            user: {
              ...prev.user,
              userTheme: unlockedId,
              worldcupLastPaymentRef: cfPaymentId || orderId,
              customThemeColors: {
                ...prev.user.customThemeColors,
                enabled: false,
              },
            },
            overlay: {
              ...prev.overlay,
              bottomScoreMode:
                prev.overlay.bottomScoreMode === 'EMPTY'
                  ? 'Score'
                  : prev.overlay.bottomScoreMode,
            },
          }));
          onToast(`${unlockedProduct.productName} payment verified and activated live!`);
        }}
      />

      {matchSummaryModalOpen && (
        <MatchSummaryModal
          match={match}
          state={state}
          updateState={updateState}
          onClose={() => setMatchSummaryModalOpen(false)}
          onToast={onToast}
        />
      )}

      <MatchSummaryFullscreenOverlay
        open={summaryFullscreenOpen}
        onClose={() => setSummaryFullscreenOpen(false)}
        match={match}
        tournament={tournament}
        group={match.groupId ? state.groups.find((g) => g.id === match.groupId) : undefined}
        teamMap={teamMap}
        channelTitle={state.user.channelTitle || 'STAR EVENT LIVE'}
        onToast={onToast}
      />

      <QuickOverlayBottomSheet
        open={quickOverlaySheetOpen}
        onClose={() => setQuickOverlaySheetOpen(false)}
        state={state}
        match={match}
        teamMap={teamMap}
        updateState={updateState}
        onToast={onToast}
      />
    </div>
  );
}
