import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowLeftRight,
  Award,
  Ban,
  BellRing,
  Check,
  CheckCircle2,
  Edit3,
  Play,
  Plus,
  Radio,
  RotateCcw,
  ShieldAlert,
  Tv,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  applyDeliveryToMatch,
  calcRunRate,
  computeBattingCard,
  computeBowlingCard,
  computeCurrentPartnership,
  computeOversBreakdown,
  computePartnershipsList,
  DeliveryInput,
  formatOvers,
  getBallPillLabel,
  undoLastDelivery,
} from '../../data/cricketSampleData';
import {
  BallEvent,
  CricketMatch,
  CricketSuiteState,
  ExtraType,
  Player,
  PlayerRole,
  TransitionOverlayType,
  WICKET_TYPES,
  WicketType,
} from '../../types/cricketSuite';
import { TvOverlayControllerView } from './TvOverlayControllerView';

interface ScoringDashboardViewProps {
  state: CricketSuiteState;
  overlayUrl: string;
  updateState: (updater: (prev: CricketSuiteState) => CricketSuiteState) => void;
  onCopyOverlayUrl: (url?: string, label?: string) => void;
  onGoToGroups: () => void;
  onOpenOverlayController: () => void;
  onNavigateToMatches?: () => void;
  onRequestLogout?: () => void;
  onToast: (msg: string) => void;
}

type ScoringTab = 'scoring' | 'scorecard' | 'overs' | 'overlay';

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
}: ScoringDashboardViewProps) {
  const [activeTab, setActiveTab] = useState<ScoringTab>('scoring');
  const [scorecardInningsTab, setScorecardInningsTab] = useState<0 | 1>(0);
  const [showMoreDrawer, setShowMoreDrawer] = useState(false);

  // Modals
  const [extraModalType, setExtraModalType] = useState<ExtraType | 'DCL' | null>(null);
  const [extraAdditionalRuns, setExtraAdditionalRuns] = useState<number>(0);

  const [wicketModalOpen, setWicketModalOpen] = useState(false);
  const [wicketType, setWicketType] = useState<WicketType>('Bowled');
  const [wicketDismissedId, setWicketDismissedId] = useState<string>('');
  const [wicketRunsCompleted, setWicketRunsCompleted] = useState<number>(0);
  const [wicketFielder, setWicketFielder] = useState<string>('');
  const [wicketNextBatterId, setWicketNextBatterId] = useState<string>('');

  const [playerPickerSlot, setPlayerPickerSlot] = useState<
    'striker' | 'nonStriker' | 'bowler' | null
  >(null);
  const [quickPlayerName, setQuickPlayerName] = useState('');
  const [quickPlayerRole, setQuickPlayerRole] = useState<PlayerRole>('All-Rounder');

  const [editScoreModalOpen, setEditScoreModalOpen] = useState(false);
  const [editInningsIdx, setEditInningsIdx] = useState<0 | 1>(0);
  const [editRuns, setEditRuns] = useState('0');
  const [editWickets, setEditWickets] = useState('0');
  const [editBalls, setEditBalls] = useState('0');
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

  useEffect(() => {
    if (match) {
      setScorecardInningsTab(match.currentInningsIndex);
    }
  }, [match?.id, match?.currentInningsIndex]);

  useEffect(() => {
    if (newBatterPromptKey) {
      if (lastPromptedNewBatterKeyRef.current !== newBatterPromptKey) {
        lastPromptedNewBatterKeyRef.current = newBatterPromptKey;
        setSelectedNextBatterId('');
        setNewBatterModalOpen(true);
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
        setOverCompleteModalOpen(true);
      }
    } else {
      lastPromptedOverKeyRef.current = '';
      setOverCompleteModalOpen(false);
      setSelectedNextBowlerId('');
    }
  }, [overPromptKey]);

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
        setSecondInningsSetupModalOpen(true);
      }
    } else {
      lastPromptedSecondInnSetupKeyRef.current = '';
      setSecondInningsSetupModalOpen(false);
    }
  }, [secondInningsSetupPromptKey, match]);

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
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#FF8C00] hover:bg-[#E87500] text-white text-xs font-bold tracking-wide transition-colors"
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
  const isScoringLocked =
    match.status === 'completed' ||
    activeInn.completed ||
    isPendingNewBatter ||
    isPendingBowlerChange ||
    needsOpeningSetup;

  const updateCurrentMatch = (
    updater: (m: CricketMatch) => CricketMatch,
    transitionType?: TransitionOverlayType
  ) => {
    updateState((prev) => ({
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
    }));
  };

  const recordDelivery = (input: DeliveryInput, label?: string) => {
    if (isPendingNewBatter) {
      setNewBatterModalOpen(true);
      onToast('Player OUT! Please select or add the next batter before scoring.');
      return;
    }

    if (needsOpeningSetup) {
      if (innIdx === 1) {
        setInn2StrikerId(activeInn.strikerId || '');
        setInn2NonStrikerId(activeInn.nonStrikerId || '');
        setInn2BowlerId(activeInn.bowlerId || '');
        setSecondInningsSetupModalOpen(true);
        onToast('Please select or add 2nd Innings Batters and Bowler before scoring.');
      } else {
        onToast('Please assign Striker, Non-Striker, and Bowler before scoring.');
        if (!activeInn.strikerId) setPlayerPickerSlot('striker');
        else if (!activeInn.nonStrikerId) setPlayerPickerSlot('nonStriker');
        else setPlayerPickerSlot('bowler');
      }
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
    } else if (input.isBoundary6 || input.runsOffBat === 6) {
      autoTrans = 'Six';
    } else if (input.isBoundary4 || input.runsOffBat === 4) {
      autoTrans = 'Four';
    }

    updateCurrentMatch(
      (m) => applyDeliveryToMatch(m, input, state.teams),
      autoTrans
    );
    if (label) onToast(label);
  };

  const handleSwapBatsmen = () => {
    if (!activeInn.strikerId && !activeInn.nonStrikerId) return;
    updateCurrentMatch((m) => {
      const nextInnings = [
        structuredClone(m.innings[0]),
        structuredClone(m.innings[1]),
      ] as [CricketMatch['innings'][0], CricketMatch['innings'][1]];
      const cur = nextInnings[m.currentInningsIndex];
      const tmp = cur.strikerId;
      cur.strikerId = cur.nonStrikerId;
      cur.nonStrikerId = tmp;
      return { ...m, innings: nextInnings };
    });
    onToast('Striker and Non-Striker swapped.');
  };

  const handleUndo = () => {
    if (!match.undoStack.length) {
      onToast('Nothing to undo.');
      return;
    }
    updateCurrentMatch((m) => undoLastDelivery(m));
    onToast('Last ball undone.');
  };

  const isFirstInningsEnded =
    innIdx === 0 && (match.status === 'innings_break' || activeInn.completed);

  const openInningsSwitchModal = () => {
    setOverCompleteModalOpen(false);
    setInningsSwitchModalOpen(true);
  };

  const openSecondInningsSetupModal = () => {
    setInn2StrikerId(inn2.strikerId || '');
    setInn2NonStrikerId(inn2.nonStrikerId || '');
    setInn2BowlerId(inn2.bowlerId || '');
    setQuickPlayerName('');
    setQuickBowlPlayerName('');
    setSecondInningsSetupModalOpen(true);
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
      // Never auto-assign players or bowler on 2nd innings switch — scorer must select or add them
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
    setSecondInningsSetupModalOpen(true);
    onToast('Switched to 2nd Innings! Please select or add Batters and Bowler to start scoring.');
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
    setShowMoreDrawer(false);
    onToast(
      innIdx === 0
        ? '1st Innings declared closed.'
        : 'Match marked as Completed.'
    );
  };

  const openExtraModal = (type: ExtraType | 'DCL') => {
    setExtraModalType(type);
    setExtraAdditionalRuns(type === 'BYE' || type === 'LB' || type === 'DCL' ? 1 : 0);
  };

  const submitExtraModal = () => {
    if (!extraModalType) return;
    if (extraModalType === 'DCL') {
      recordDelivery(
        {
          runsOffBat: extraAdditionalRuns,
          extraType: 'none',
          isDcl: true,
        },
        `Declared ${extraAdditionalRuns} run(s)`
      );
    } else if (extraModalType === 'WD') {
      recordDelivery(
        {
          runsOffBat: 0,
          extraType: 'WD',
          extraRuns: 1 + extraAdditionalRuns,
        },
        `Wide +${extraAdditionalRuns}`
      );
    } else if (extraModalType === 'NB') {
      recordDelivery(
        {
          runsOffBat: extraAdditionalRuns,
          extraType: 'NB',
          extraRuns: 1,
          isBoundary4: extraAdditionalRuns === 4,
          isBoundary6: extraAdditionalRuns === 6,
        },
        `No Ball +${extraAdditionalRuns}`
      );
    } else if (extraModalType === 'LB') {
      recordDelivery(
        {
          runsOffBat: 0,
          extraType: 'LB',
          extraRuns: Math.max(1, extraAdditionalRuns),
        },
        `Leg Bye ${Math.max(1, extraAdditionalRuns)}`
      );
    } else if (extraModalType === 'BYE') {
      recordDelivery(
        {
          runsOffBat: 0,
          extraType: 'BYE',
          extraRuns: Math.max(1, extraAdditionalRuns),
        },
        `Bye ${Math.max(1, extraAdditionalRuns)}`
      );
    }
    setExtraModalType(null);
  };

  const openWicketModal = () => {
    setWicketType('Bowled');
    setWicketDismissedId(activeInn.strikerId);
    setWicketRunsCompleted(0);
    setWicketFielder('');
    // Never auto-select incoming batter — scorer explicitly picks or adds next batter
    setWicketNextBatterId('');
    setWicketModalOpen(true);
  };

  const submitWicketModal = () => {
    recordDelivery(
      {
        runsOffBat: wicketRunsCompleted,
        extraType: 'none',
        isWicket: true,
        wicketType,
        dismissedPlayerId: wicketDismissedId || activeInn.strikerId,
        fielderName: wicketFielder.trim() || undefined,
        nextBatterId: wicketNextBatterId || undefined,
      },
      `OUT · ${wicketType}`
    );
    setWicketModalOpen(false);
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
          : quickPlayerRole,
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
    setEditMaxOvers(String(targetInn.maxOvers));
    setEditTarget(targetInn.target !== null ? String(targetInn.target) : '');
    setEditScoreModalOpen(true);
  };

  const submitEditScoreModal = () => {
    const runsVal = Math.max(0, Number(editRuns) || 0);
    const wktsVal = Math.min(10, Math.max(0, Number(editWickets) || 0));
    const ballsVal = Math.max(0, Number(editBalls) || 0);
    const maxOvVal = Math.max(1, Number(editMaxOvers) || match.oversPerInnings);
    const targetVal = editTarget.trim() !== '' ? Math.max(1, Number(editTarget) || 1) : null;

    updateCurrentMatch((m) => {
      const nextInnings = [
        structuredClone(m.innings[0]),
        structuredClone(m.innings[1]),
      ] as [CricketMatch['innings'][0], CricketMatch['innings'][1]];
      nextInnings[editInningsIdx].runs = runsVal;
      nextInnings[editInningsIdx].wickets = wktsVal;
      nextInnings[editInningsIdx].legalBalls = ballsVal;
      nextInnings[editInningsIdx].maxOvers = maxOvVal;
      if (ballsVal === 0 || ballsVal % 6 !== 0) {
        nextInnings[editInningsIdx].pendingBowlerChange = false;
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
    onToast(`Innings ${editInningsIdx + 1} updated.`);
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
      {/* Top Bar: Match Context + Quick Switcher + Overlay Control */}
      <div className="rounded-xl bg-white border border-slate-200 shadow-xs overflow-hidden">
        <div className="bg-[#FF8C00] text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {onNavigateToMatches && (
              <button
                type="button"
                onClick={onNavigateToMatches}
                aria-label="Back to match list"
                className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display font-bold text-sm sm:text-base truncate">
                  {team1?.name || 'Team 1'} vs {team2?.name || 'Team 2'}
                </span>
                <span className="px-2 py-0.5 rounded bg-white/20 text-[10px] font-bold uppercase tracking-wider">
                  {match.stageBadge}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    match.status === 'live'
                      ? 'bg-emerald-400 text-slate-950'
                      : match.status === 'completed'
                        ? 'bg-slate-200 text-slate-900'
                        : match.status === 'innings_break'
                          ? 'bg-amber-300 text-slate-950'
                          : 'bg-[#FFF3E0] text-[#E87500]'
                  }`}
                >
                  {match.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-[11px] text-orange-100 truncate">
                {tournament?.name || 'Tournament'} · {match.matchLabel} · {match.oversPerInnings}{' '}
                Overs ({match.ballType}) · ID: {match.id}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {state.matches.length > 1 && (
              <select
                value={match.id}
                onChange={(e) =>
                  updateState((prev) => ({ ...prev, activeMatchId: e.target.value }))
                }
                aria-label="Switch active match"
                className="px-2.5 py-1.5 rounded-lg bg-white/15 text-white text-xs font-semibold border border-white/25 focus:outline-hidden"
              >
                {state.matches.map((m) => (
                  <option key={m.id} value={m.id} className="text-slate-900">
                    {m.matchLabel} · {teamMap.get(m.team1Id)?.shortName || 'T1'} vs{' '}
                    {teamMap.get(m.team2Id)?.shortName || 'T2'}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={openTossModal}
              className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-semibold text-white transition-colors"
            >
              Toss Setup
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('overlay')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'overlay'
                  ? 'bg-white text-[#E87500]'
                  : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
              }`}
            >
              <Tv className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Overlay Control</span>
            </button>
          </div>
        </div>

        {/* 4 Main Tabs: SCORING PANEL | SCORECARD | OVERS | OVERLAY */}
        <div className="grid grid-cols-4 border-b border-slate-200 bg-slate-50">
          {(
            [
              { id: 'scoring', label: 'SCORING PANEL' },
              { id: 'scorecard', label: 'SCORECARD' },
              { id: 'overs', label: 'OVERS' },
              { id: 'overlay', label: 'OVERLAY' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-1 text-[11px] sm:text-sm font-bold tracking-wide transition-colors border-b-2 truncate ${
                activeTab === tab.id
                  ? 'border-[#FF8C00] text-[#FF8C00] bg-white'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ================= TAB 1: SCORING PANEL ================= */}
      {activeTab === 'scoring' && (
        <div className="space-y-4">
          {/* Dual Innings Score Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {([0, 1] as const).map((idx) => {
              const inn = match.innings[idx];
              const batTeam = idx === 0 ? inn1Team : inn2Team;
              const isCurrent = innIdx === idx;
              return (
                <div
                  key={idx}
                  className={`rounded-xl bg-white border p-4 shadow-xs transition-all ${
                    isCurrent
                      ? 'border-[#FF8C00] ring-2 ring-[#FF8C00]/15'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          {idx === 0 ? '1st Innings' : '2nd Innings'}
                        </span>
                        {isCurrent && !inn.completed && (
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">
                            Batting
                          </span>
                        )}
                        {inn.completed && (
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold uppercase">
                            Closed
                          </span>
                        )}
                      </div>
                      <h3 className="font-display font-bold text-base text-slate-900 truncate mt-0.5">
                        {batTeam?.name || (idx === 0 ? 'Team 1' : 'Team 2')}
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() => openEditScoreModal(idx)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                    >
                      <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Edit</span>
                    </button>
                  </div>

                  <div className="mt-3 flex items-baseline justify-between gap-3">
                    <div className="flex items-baseline gap-2">
                      <span className="font-display font-black text-3xl text-[#FF8C00] tabular-nums">
                        {inn.runs}/{inn.wickets}
                      </span>
                      <span className="text-sm font-semibold text-slate-600 tabular-nums">
                        ({formatOvers(inn.legalBalls)} / {inn.maxOvers} ov)
                      </span>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      CRR:{' '}
                      <span className="font-bold text-slate-900 tabular-nums">
                        {calcRunRate(inn.runs, inn.legalBalls)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Match Status / Chase / Innings Break Bar */}
          <div className="rounded-xl bg-white border border-slate-200 shadow-xs px-4 py-3 flex flex-wrap items-center justify-between gap-3">
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
                    <span className="font-bold text-[#FF8C00] tabular-nums">{target}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Need: </span>
                    <span className="font-bold text-red-600 tabular-nums">
                      {runsRequired} off {remainingBalls}b
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">RRR: </span>
                    <span className="font-bold text-amber-700 tabular-nums">{rrr}</span>
                  </div>
                </>
              )}
              <span className="text-slate-300 hidden sm:inline">|</span>
              <div>
                <span className="text-slate-500">Partnership: </span>
                <span className="font-bold text-slate-900 tabular-nums">
                  {partnership.runs} ({partnership.balls}b)
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isFirstInningsEnded && (
                <button
                  type="button"
                  onClick={openInningsSwitchModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold shadow-xs animate-pulse"
                >
                  <Play className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>END INNINGS &amp; SWITCH TO 2ND INNINGS</span>
                </button>
              )}

              {innIdx === 0 && !isFirstInningsEnded && match.status !== 'completed' && (
                <button
                  type="button"
                  onClick={openInningsSwitchModal}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#FFF3E0] hover:bg-orange-100 border border-[#FF8C00]/35 text-[#E87500] text-xs font-bold transition-colors"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>End Innings / Switch 2nd</span>
                </button>
              )}

              {match.status === 'completed' && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPomId(match.playerOfMatchId || '');
                    setPomModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold"
                >
                  <Award className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Set Player of the Match</span>
                </button>
              )}
            </div>
          </div>

          {/* Setup Prompt if Players/Bowler Not Yet Assigned */}
          {needsOpeningSetup && !isPendingNewBatter && !activeInn.completed && match.status !== 'completed' && (
            <div className="rounded-xl bg-[#FFF3E0] border-2 border-[#FF8C00] px-4 py-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5 text-slate-900 text-xs sm:text-sm font-bold">
                <ShieldAlert className="w-5 h-5 text-[#E87500] shrink-0" aria-hidden="true" />
                <span>
                  {innIdx === 1
                    ? '2ND INNINGS: Please select or add Opening Striker, Non-Striker & Bowler to start scoring.'
                    : 'Scoring paused — Assign Striker, Non-Striker, and Opening Bowler to start live ball-by-ball scoring.'}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {innIdx === 1 ? (
                  <button
                    type="button"
                    onClick={openSecondInningsSetupModal}
                    className="px-4 py-2 rounded-lg bg-[#FF8C00] hover:bg-[#E87500] text-white text-xs font-black tracking-wide shadow-xs"
                  >
                    + SELECT / ADD PLAYERS &amp; BOWLER
                  </button>
                ) : (
                  <>
                    {!activeInn.strikerId && (
                      <button
                        type="button"
                        onClick={() => setPlayerPickerSlot('striker')}
                        className="px-3 py-1.5 rounded-lg bg-[#FF8C00] text-white text-xs font-bold"
                      >
                        + Select Striker
                      </button>
                    )}
                    {!activeInn.nonStrikerId && (
                      <button
                        type="button"
                        onClick={() => setPlayerPickerSlot('nonStriker')}
                        className="px-3 py-1.5 rounded-lg bg-[#FF8C00] text-white text-xs font-bold"
                      >
                        + Select Non-Striker
                      </button>
                    )}
                    {!activeInn.bowlerId && (
                      <button
                        type="button"
                        onClick={() => setPlayerPickerSlot('bowler')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold"
                      >
                        + Select Bowler
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Striker + SWAP + Non-Striker Cards */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-stretch">
            {/* Striker Card */}
            <div className="rounded-xl bg-white border-2 border-[#FF8C00] p-4 shadow-xs">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="px-2 py-0.5 rounded bg-[#FF8C00] text-white text-[10px] font-bold uppercase tracking-wider">
                  STRIKER *
                </span>
                <button
                  type="button"
                  onClick={() => setPlayerPickerSlot('striker')}
                  className="text-xs font-semibold text-[#FF8C00] hover:underline inline-flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Edit Player</span>
                </button>
              </div>
              <p className="font-display font-bold text-base text-slate-900 truncate">
                {strikerStats?.playerName || 'Select Striker'}
              </p>
              <div className="mt-2 grid grid-cols-5 gap-1 text-center bg-slate-50 rounded-lg p-2 border border-slate-100">
                <div>
                  <p className="text-[10px] text-slate-500 font-semibold">R</p>
                  <p className="text-sm font-black text-slate-900 tabular-nums">
                    {strikerStats?.runs ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-semibold">B</p>
                  <p className="text-sm font-bold text-slate-700 tabular-nums">
                    {strikerStats?.balls ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-semibold">4s</p>
                  <p className="text-sm font-bold text-slate-700 tabular-nums">
                    {strikerStats?.fours ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-semibold">6s</p>
                  <p className="text-sm font-bold text-slate-700 tabular-nums">
                    {strikerStats?.sixes ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-semibold">SR</p>
                  <p className="text-xs font-bold text-[#FF8C00] tabular-nums">
                    {strikerStats?.sr ?? '0.0'}
                  </p>
                </div>
              </div>
            </div>

            {/* Swap Batsmen Button */}
            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={handleSwapBatsmen}
                className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#FFF3E0] hover:bg-orange-100 border border-[#FF8C00]/30 text-[#FF8C00] text-xs font-bold transition-colors"
              >
                <ArrowLeftRight className="w-4 h-4" aria-hidden="true" />
                <span>SWAP BATSMEN</span>
              </button>
            </div>

            {/* Non-Striker Card */}
            <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-xs">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-bold uppercase tracking-wider">
                  NONSTRIKER
                </span>
                <button
                  type="button"
                  onClick={() => setPlayerPickerSlot('nonStriker')}
                  className="text-xs font-semibold text-[#FF8C00] hover:underline inline-flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Edit Player</span>
                </button>
              </div>
              <p className="font-display font-bold text-base text-slate-900 truncate">
                {nonStrikerStats?.playerName || 'Select Non-Striker'}
              </p>
              <div className="mt-2 grid grid-cols-5 gap-1 text-center bg-slate-50 rounded-lg p-2 border border-slate-100">
                <div>
                  <p className="text-[10px] text-slate-500 font-semibold">R</p>
                  <p className="text-sm font-black text-slate-900 tabular-nums">
                    {nonStrikerStats?.runs ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-semibold">B</p>
                  <p className="text-sm font-bold text-slate-700 tabular-nums">
                    {nonStrikerStats?.balls ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-semibold">4s</p>
                  <p className="text-sm font-bold text-slate-700 tabular-nums">
                    {nonStrikerStats?.fours ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-semibold">6s</p>
                  <p className="text-sm font-bold text-slate-700 tabular-nums">
                    {nonStrikerStats?.sixes ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-semibold">SR</p>
                  <p className="text-xs font-bold text-slate-700 tabular-nums">
                    {nonStrikerStats?.sr ?? '0.0'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bowler Card + THIS OVER / PREV OVER */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div
              className={`rounded-xl bg-white p-4 shadow-xs transition-all ${
                isPendingBowlerChange
                  ? 'border-2 border-[#FF8C00] ring-2 ring-[#FF8C00]/20 bg-[#FFF3E0]/30'
                  : 'border border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                    BOWLER
                  </span>
                  {isPendingBowlerChange && (
                    <span className="px-2 py-0.5 rounded bg-[#FF8C00] text-white text-[10px] font-bold uppercase tracking-wider animate-pulse">
                      CHANGE BOWLER
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    isPendingBowlerChange
                      ? setOverCompleteModalOpen(true)
                      : setPlayerPickerSlot('bowler')
                  }
                  className="text-xs font-semibold text-[#FF8C00] hover:underline inline-flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{isPendingBowlerChange ? 'Select New Bowler' : 'Edit Bowler'}</span>
                </button>
              </div>
              <p className="font-display font-bold text-base text-slate-900 truncate">
                {bowlerStats?.playerName || 'Select Bowler'}
              </p>
              <div className="mt-2 grid grid-cols-5 gap-1 text-center bg-slate-50 rounded-lg p-2 border border-slate-100">
                <div>
                  <p className="text-[10px] text-slate-500 font-semibold">O</p>
                  <p className="text-sm font-bold text-slate-900 tabular-nums">
                    {bowlerStats?.overs ?? '0.0'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-semibold">M</p>
                  <p className="text-sm font-bold text-slate-700 tabular-nums">
                    {bowlerStats?.maidens ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-semibold">R</p>
                  <p className="text-sm font-bold text-slate-700 tabular-nums">
                    {bowlerStats?.runs ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-semibold">W</p>
                  <p className="text-sm font-black text-red-600 tabular-nums">
                    {bowlerStats?.wickets ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-semibold">Eco</p>
                  <p className="text-xs font-bold text-emerald-700 tabular-nums">
                    {bowlerStats?.economy ?? '0.00'}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-xs flex flex-col justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
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

              <div className="pt-2 border-t border-slate-100">
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

          {/* Animated Innings End / Over Completion Pause Banner & New Bowler Confirmed Banner */}
          <AnimatePresence mode="wait">
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
                        1ST INNINGS COMPLETED!
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
                  <span>END INNINGS &amp; SWITCH 2ND</span>
                </button>
              </motion.div>
            )}

            {!isFirstInningsEnded && isPendingNewBatter && (
              <motion.div
                key={`wicket-paused-${activeInn.wickets}-${activeInn.balls.length}`}
                initial={{ opacity: 0, y: -12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 360, damping: 26 }}
                className="rounded-xl bg-gradient-to-r from-[#DC2626] via-[#B91C1C] to-[#DC2626] text-white p-4 shadow-md border border-red-700 flex flex-wrap items-center justify-between gap-3"
                role="alert"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <motion.div
                    animate={{ scale: [1, 1.12, 1] }}
                    transition={{ duration: 1.1, repeat: Infinity }}
                    className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0 border border-white/30"
                  >
                    <UserPlus className="w-6 h-6 text-white" aria-hidden="true" />
                  </motion.div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display font-black text-base sm:text-lg tracking-wide uppercase">
                        WICKET FALLEN! SELECT NEXT BATTER
                      </span>
                      <span className="px-2 py-0.5 rounded bg-white/20 text-[10px] font-bold uppercase tracking-wider">
                        SCORING PAUSED
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-red-50">
                      Scoring is locked until you select or add the next incoming batter for{' '}
                      {battingTeam?.shortName || 'Batting Team'}.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setNewBatterModalOpen(true)}
                  className="px-4 py-2.5 rounded-lg bg-white hover:bg-red-50 text-[#B91C1C] font-display font-black text-xs sm:text-sm tracking-wide shadow-sm transition-colors shrink-0"
                >
                  SELECT / ADD NEXT BATTER
                </button>
              </motion.div>
            )}

            {!isFirstInningsEnded && !isPendingNewBatter && isPendingBowlerChange && (
              <motion.div
                key={`over-paused-${completedOverNum}`}
                initial={{ opacity: 0, y: -12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 360, damping: 26 }}
                className="rounded-xl bg-gradient-to-r from-[#FF8C00] via-[#E87500] to-[#FF8C00] text-white p-4 shadow-md border border-[#E87500] flex flex-wrap items-center justify-between gap-3"
                role="alert"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <motion.div
                    animate={{ rotate: [0, -14, 14, -10, 10, 0], scale: [1, 1.08, 1] }}
                    transition={{ duration: 1.1, repeat: Infinity, repeatDelay: 1.8 }}
                    className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0 border border-white/30"
                  >
                    <BellRing className="w-6 h-6 text-white" aria-hidden="true" />
                  </motion.div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display font-black text-base sm:text-lg tracking-wide uppercase">
                        OVER COMPLETED!
                      </span>
                      <span className="px-2 py-0.5 rounded bg-white/20 text-[10px] font-bold uppercase tracking-wider">
                        OVER {completedOverNum} DONE
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-orange-50 tracking-wide">
                      PLEASE CHANGE BOWLER — Scoring paused until next bowler is selected.
                    </p>
                    <p className="text-[11px] text-orange-100 mt-0.5">
                      Strike rotated automatically · On Strike:{' '}
                      <strong className="text-white">
                        {strikerStats?.playerName || 'Striker'} *
                      </strong>
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {innIdx === 0 && (
                    <button
                      type="button"
                      onClick={openInningsSwitchModal}
                      className="px-3.5 py-2.5 rounded-lg bg-white/15 hover:bg-white/25 border border-white/35 text-white font-bold text-xs tracking-wide transition-colors"
                    >
                      END INNINGS → 2ND
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setOverCompleteModalOpen(true)}
                    className="px-4 py-2.5 rounded-lg bg-white hover:bg-[#FFF3E0] text-[#E87500] font-display font-black text-xs sm:text-sm tracking-wide shadow-sm transition-colors"
                  >
                    SELECT BOWLER
                  </button>
                </div>
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

          {/* Exact Color-Coded Scoring Keypad */}
          <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-xs space-y-3">
            {/* Row 1: Runs (Orange: 0,1,2,3,5; Yellow: 4; Purple: 6) */}
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2.5">
              {[0, 1, 2, 3].map((r) => (
                <button
                  key={r}
                  type="button"
                  disabled={isScoringLocked}
                  onClick={() => recordDelivery({ runsOffBat: r })}
                  className="h-14 rounded-xl bg-[#FF8C00] hover:bg-[#E87500] disabled:opacity-45 text-white font-display font-black text-xl shadow-xs transition-colors"
                >
                  {r}
                </button>
              ))}
              <button
                type="button"
                disabled={isScoringLocked}
                onClick={() =>
                  recordDelivery({ runsOffBat: 4, isBoundary4: true }, 'FOUR! +4 Runs')
                }
                className="h-14 rounded-xl bg-[#FACC15] hover:bg-[#EAB308] border border-yellow-500 disabled:opacity-45 text-slate-950 font-display font-black text-xl shadow-xs transition-colors"
              >
                4
              </button>
              <button
                type="button"
                disabled={isScoringLocked}
                onClick={() => recordDelivery({ runsOffBat: 5 }, '+5 Runs')}
                className="h-14 rounded-xl bg-[#FF8C00] hover:bg-[#E87500] disabled:opacity-45 text-white font-display font-black text-xl shadow-xs transition-colors"
              >
                5
              </button>
              <button
                type="button"
                disabled={isScoringLocked}
                onClick={() =>
                  recordDelivery({ runsOffBat: 6, isBoundary6: true }, 'SIX! +6 Runs')
                }
                className="h-14 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-45 text-white font-display font-black text-xl shadow-xs transition-colors"
              >
                6
              </button>
            </div>

            {/* Row 2: Extras (Green: DCL, NB, WD, LB, BYE) */}
            <div className="grid grid-cols-5 gap-2.5">
              {(['DCL', 'NB', 'WD', 'LB', 'BYE'] as const).map((ex) => (
                <button
                  key={ex}
                  type="button"
                  disabled={isScoringLocked}
                  onClick={() => openExtraModal(ex)}
                  className="h-12 rounded-xl bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-45 text-white font-bold text-xs sm:text-sm tracking-wide shadow-xs transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>

            {/* Row 3: OUT (Red), MORE (Teal), EDIT & UNDO (Orange) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                type="button"
                disabled={isScoringLocked}
                onClick={openWicketModal}
                className="h-12 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] disabled:opacity-45 text-white font-display font-black text-sm tracking-wider shadow-xs transition-colors"
              >
                OUT
              </button>
              <button
                type="button"
                onClick={() => setShowMoreDrawer((prev) => !prev)}
                className="h-12 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white font-display font-black text-sm tracking-wider shadow-xs transition-colors"
              >
                MORE {showMoreDrawer ? '▲' : '▼'}
              </button>
              <button
                type="button"
                onClick={() => openEditScoreModal(innIdx)}
                className="h-12 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-display font-black text-sm tracking-wider shadow-xs transition-colors"
              >
                EDIT
              </button>
              <button
                type="button"
                disabled={!match.undoStack.length}
                onClick={handleUndo}
                className="h-12 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] disabled:opacity-45 text-white font-display font-black text-sm tracking-wider shadow-xs transition-colors inline-flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
                <span>UNDO</span>
              </button>
            </div>

            {/* Expandable MORE Actions: 7 8 9 10, Penalty, End Innings, Complete Match, POM */}
            {showMoreDrawer && (
              <div className="pt-3 border-t border-slate-200 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-600 mr-1">High Runs:</span>
                  {[7, 8, 9, 10].map((r) => (
                    <button
                      key={r}
                      type="button"
                      disabled={isScoringLocked}
                      onClick={() => recordDelivery({ runsOffBat: r }, `+${r} Runs`)}
                      className="px-4 py-2 rounded-lg bg-[#FF8C00] hover:bg-[#E87500] disabled:opacity-45 text-white text-xs font-bold"
                    >
                      +{r}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={isScoringLocked}
                    onClick={() =>
                      recordDelivery(
                        { extraType: 'PENALTY', extraRuns: 5 },
                        'Penalty +5 Runs'
                      )
                    }
                    className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-45 text-white text-xs font-bold"
                  >
                    Penalty +5
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      isPendingBowlerChange
                        ? setOverCompleteModalOpen(true)
                        : setPlayerPickerSlot('bowler')
                    }
                    className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold"
                  >
                    Change Bowler
                  </button>
                  {match.status !== 'completed' && !activeInn.completed && (
                    <button
                      type="button"
                      onClick={handleCompleteInningsOrMatch}
                      className="px-3.5 py-2 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold"
                    >
                      {innIdx === 0 ? 'End / Declare 1st Innings' : 'End & Complete Match'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPomId(match.playerOfMatchId || '');
                      setPomModalOpen(true);
                    }}
                    className="px-3.5 py-2 rounded-lg bg-[#FFF3E0] hover:bg-orange-100 text-[#FF8C00] text-xs font-bold"
                  >
                    Player of the Match
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
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
                      ? 'bg-[#FF8C00] text-white border-[#FF8C00]'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
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
                          {row.playerName}
                          {row.isStriker ? ' *' : ''}
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

      {/* ================= TAB 3: OVERS ================= */}
      {activeTab === 'overs' && (
        <div className="space-y-4">
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

          <div className="rounded-xl bg-white border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
              <h3 className="font-display font-bold text-sm text-slate-900">
                Complete Over-by-Over History ({battingTeam?.name || 'Batting Team'})
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
                  {oversBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        No overs bowled yet.
                      </td>
                    </tr>
                  ) : (
                    oversBreakdown
                      .slice()
                      .reverse()
                      .map((ov) => {
                        const bowlerObj = bowlingTeam?.players.find(
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
      )}

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

      {/* ================= MODAL: EXTRA DELIVERY ================= */}
      {extraModalType && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
            <div className="bg-[#16A34A] text-white px-4 py-3 flex items-center justify-between">
              <h3 className="font-display font-bold text-sm">
                Record {extraModalType} Delivery
              </h3>
              <button
                type="button"
                onClick={() => setExtraModalType(null)}
                className="p-1 rounded hover:bg-white/20"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-xs text-slate-600">
                {extraModalType === 'WD' &&
                  'Wide adds 1 extra run automatically (illegal ball). Select any additional runs ran:'}
                {extraModalType === 'NB' &&
                  'No Ball adds 1 extra run automatically (illegal ball). Select runs scored off bat:'}
                {extraModalType === 'LB' &&
                  'Leg Bye counts as a legal ball. Select total leg-bye runs:'}
                {extraModalType === 'BYE' &&
                  'Bye counts as a legal ball. Select total bye runs:'}
                {extraModalType === 'DCL' &&
                  'Declared run counts as a legal ball without rotating strike. Select runs:'}
              </p>

              <div className="grid grid-cols-4 gap-2">
                {(extraModalType === 'WD' || extraModalType === 'NB'
                  ? [0, 1, 2, 3, 4, 6]
                  : [1, 2, 3, 4]
                ).map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setExtraAdditionalRuns(val)}
                    className={`py-2.5 rounded-lg text-sm font-bold border transition-colors ${
                      extraAdditionalRuns === val
                        ? 'bg-[#16A34A] text-white border-[#15803D] shadow-xs'
                        : 'bg-emerald-50/50 text-slate-800 border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    {extraModalType === 'WD' || extraModalType === 'NB'
                      ? `+${val}`
                      : val}
                  </button>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setExtraModalType(null)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitExtraModal}
                  className="px-4 py-2 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-xs font-bold text-white"
                >
                  Confirm {extraModalType}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: WICKET / OUT (DIRECT BUTTONS) ================= */}
      {wicketModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/55"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-xl bg-white border border-red-200 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="bg-[#DC2626] text-white px-4 py-3 flex items-center justify-between">
              <h3 className="font-display font-bold text-sm sm:text-base tracking-wide">
                Record Wicket (OUT)
              </h3>
              <button
                type="button"
                onClick={() => setWicketModalOpen(false)}
                className="p-1 rounded hover:bg-white/20"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {/* Direct Wicket Type Buttons */}
              <div>
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Wicket Type
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                  {WICKET_TYPES.map((wt) => {
                    const isActive = wicketType === wt;
                    return (
                      <button
                        key={wt}
                        type="button"
                        onClick={() => setWicketType(wt)}
                        className={`px-2 py-2 rounded-lg text-[11px] sm:text-xs font-bold border text-center transition-colors leading-tight ${
                          isActive
                            ? 'bg-[#DC2626] text-white border-[#B91C1C] shadow-xs'
                            : 'bg-red-50/50 text-slate-800 border-red-200 hover:bg-red-100'
                        }`}
                      >
                        {wt}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Direct Dismissed Batter Buttons */}
              <div>
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Dismissed Batter
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {activeInn.strikerId && (
                    <button
                      type="button"
                      onClick={() => setWicketDismissedId(activeInn.strikerId)}
                      className={`px-3 py-2.5 rounded-lg border text-left transition-colors ${
                        wicketDismissedId === activeInn.strikerId
                          ? 'bg-[#DC2626] text-white border-[#B91C1C] shadow-xs'
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
                      <span className="block text-xs sm:text-sm font-bold truncate">
                        {strikerStats?.playerName || 'Striker'}
                      </span>
                    </button>
                  )}
                  {activeInn.nonStrikerId && (
                    <button
                      type="button"
                      onClick={() => setWicketDismissedId(activeInn.nonStrikerId)}
                      className={`px-3 py-2.5 rounded-lg border text-left transition-colors ${
                        wicketDismissedId === activeInn.nonStrikerId
                          ? 'bg-[#DC2626] text-white border-[#B91C1C] shadow-xs'
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
                      <span className="block text-xs sm:text-sm font-bold truncate">
                        {nonStrikerStats?.playerName || 'Non-Striker'}
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {/* Direct Runs Completed Buttons + Fielder */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Runs Completed
                  </p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[0, 1, 2, 3].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setWicketRunsCompleted(r)}
                        className={`py-2 rounded-lg text-xs font-black border transition-colors ${
                          wicketRunsCompleted === r
                            ? 'bg-[#DC2626] text-white border-[#B91C1C] shadow-xs'
                            : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-red-50'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Fielder (Optional)
                  </label>
                  <input
                    type="text"
                    value={wicketFielder}
                    onChange={(e) => setWicketFielder(e.target.value)}
                    placeholder="Fielder name"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm"
                  />
                </div>
              </div>

              {/* Direct Next Incoming Batter Buttons */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Next Incoming Batter
                  </p>
                  {wicketNextBatterId && (
                    <button
                      type="button"
                      onClick={() => setWicketNextBatterId('')}
                      className="text-[11px] font-bold text-red-600 hover:underline"
                    >
                      Clear (Select after OUT)
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mb-2">
                  Pick the next batter now, or leave unselected to pause scoring until you add/select the new batter.
                </p>
                <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-0.5">
                  {(battingTeam?.players ?? []).map((p) => {
                    const isPicked = wicketNextBatterId === p.id;
                    const isCurrentlyBatting =
                      p.id === activeInn.strikerId || p.id === activeInn.nonStrikerId;
                    const isAlreadyOut = activeInn.fallOfWickets.some(
                      (f) => f.playerId === p.id
                    );
                    const isDisabled = isAlreadyOut || isCurrentlyBatting;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => setWicketNextBatterId(p.id)}
                        className={`px-2.5 py-2 rounded-lg border text-left transition-colors ${
                          isPicked
                            ? 'bg-[#DC2626] text-white border-[#B91C1C] shadow-xs'
                            : isDisabled
                              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-70'
                              : 'bg-white text-slate-800 border-slate-200 hover:border-red-300 hover:bg-red-50/40'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold truncate">
                            #{p.jerseyNo} {p.name}
                          </span>
                          {isAlreadyOut && (
                            <span
                              className="text-[9px] font-bold uppercase px-1 rounded shrink-0 bg-red-100 text-red-700"
                            >
                              Out
                            </span>
                          )}
                          {!isAlreadyOut && isCurrentlyBatting && (
                            <span
                              className="text-[9px] font-bold uppercase px-1 rounded shrink-0 bg-orange-100 text-[#E87500]"
                            >
                              In
                            </span>
                          )}
                        </div>
                        <span
                          className={`block text-[10px] truncate ${
                            isPicked ? 'text-red-100' : 'text-slate-500'
                          }`}
                        >
                          {p.role}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick Add Batter Inline */}
              {battingTeam && (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                  <p className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                    <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
                    Quick Add Player to {battingTeam.shortName}
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={quickPlayerName}
                      onChange={(e) => setQuickPlayerName(e.target.value)}
                      placeholder="New player name"
                      className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => handleQuickAddPlayer(battingTeam.id, 'nextWicket')}
                      className="px-3 py-1.5 rounded-lg bg-[#FF8C00] hover:bg-[#E87500] text-white text-xs font-bold"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setWicketModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitWicketModal}
                  className="px-5 py-2 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-xs font-bold text-white shadow-xs"
                >
                  Confirm OUT ({wicketType})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: PICK STRIKER / NON-STRIKER / BOWLER ================= */}
      {playerPickerSlot && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl bg-white border border-slate-200 shadow-2xl overflow-hidden max-h-[88vh] flex flex-col">
            <div className="bg-[#FF8C00] text-white px-4 py-3 flex items-center justify-between">
              <h3 className="font-display font-bold text-sm">
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
                className="p-1 rounded hover:bg-white/20"
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
                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
                          <input
                            type="text"
                            value={quickPlayerName}
                            onChange={(e) => setQuickPlayerName(e.target.value)}
                            placeholder="Enter player name"
                            className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
                          />
                          <select
                            value={quickPlayerRole}
                            onChange={(e) =>
                              setQuickPlayerRole(e.target.value as PlayerRole)
                            }
                            className="px-2.5 py-2 rounded-lg border border-slate-300 text-xs bg-white"
                          >
                            <option value="Batsman">Batsman</option>
                            <option value="Bowler">Bowler</option>
                            <option value="All-Rounder">All-Rounder</option>
                            <option value="Wicket-Keeper">Wicket-Keeper</option>
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            handleQuickAddPlayer(targetTeam.id, playerPickerSlot)
                          }
                          className="w-full py-2 rounded-lg bg-[#FF8C00] hover:bg-[#E87500] text-white text-xs font-bold"
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

      {/* ================= MODAL: EDIT INNINGS SCORE ================= */}
      {editScoreModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
            <div className="bg-[#FF8C00] text-white px-4 py-3 flex items-center justify-between">
              <h3 className="font-display font-bold text-sm">
                Edit Innings {editInningsIdx + 1} Score
              </h3>
              <button
                type="button"
                onClick={() => setEditScoreModalOpen(false)}
                className="p-1 rounded hover:bg-white/20"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Runs</label>
                  <input
                    type="number"
                    min={0}
                    value={editRuns}
                    onChange={(e) => setEditRuns(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Wickets (0-10)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={editWickets}
                    onChange={(e) => setEditWickets(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Legal Balls
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editBalls}
                    onChange={(e) => setEditBalls(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Max Overs
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={editMaxOvers}
                    onChange={(e) => setEditMaxOvers(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
              </div>
              {editInningsIdx === 1 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Target Runs
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={editTarget}
                    onChange={(e) => setEditTarget(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditScoreModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitEditScoreModal}
                  className="px-4 py-2 rounded-lg bg-[#FF8C00] hover:bg-[#E87500] text-xs font-bold text-white"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: TOSS SETUP ================= */}
      {tossModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
            <div className="bg-[#FF8C00] text-white px-4 py-3 flex items-center justify-between">
              <h3 className="font-display font-bold text-sm">Toss Setup</h3>
              <button
                type="button"
                onClick={() => setTossModalOpen(false)}
                className="p-1 rounded hover:bg-white/20"
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
                          ? 'bg-[#FF8C00] text-white border-[#FF8C00]'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
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
                  className="px-4 py-2 rounded-lg bg-[#FF8C00] text-xs font-bold text-white"
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
            <div className="bg-[#FF8C00] text-white px-4 py-3 flex items-center justify-between">
              <h3 className="font-display font-bold text-sm">Select Player of the Match</h3>
              <button
                type="button"
                onClick={() => setPomModalOpen(false)}
                className="p-1 rounded hover:bg-white/20"
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
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#FF8C00] text-xs font-bold text-white"
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
              className="w-full max-w-lg rounded-2xl bg-white border border-orange-200 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
            >
              {/* Animated Notification Header */}
              <div className="bg-gradient-to-r from-[#FF8C00] via-[#E87500] to-[#FF8C00] text-white px-5 py-4">
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
                        className="font-display font-black text-lg sm:text-xl tracking-wide leading-tight"
                      >
                        OVER COMPLETED!
                      </h3>
                      <p className="text-xs sm:text-sm font-extrabold text-[#FFF3E0] tracking-wider uppercase mt-0.5">
                        PLEASE CHANGE BOWLER
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOverCompleteModalOpen(false)}
                    aria-label="Close bowler popup"
                    className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>

                {/* Completed Over Summary + Strike Rotation Confirmation */}
                <div className="mt-3 pt-3 border-t border-white/20 flex flex-wrap items-center gap-2 text-[11px] font-semibold">
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
                                      ? 'bg-[#FF8C00] text-white border-[#E87500]'
                                      : 'bg-[#FFF3E0] text-[#E87500] border-[#FF8C00]/30'
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
                              <span className="w-7 h-7 rounded-full bg-[#FF8C00] text-white inline-flex items-center justify-center shadow-xs">
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

              {/* Footer Actions: CANCEL, END INNINGS (1st inn), & SELECT BOWLER */}
              <div className="px-4 sm:px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
                <button
                  type="button"
                  onClick={() => setOverCompleteModalOpen(false)}
                  className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-xs sm:text-sm font-bold text-slate-700 transition-colors"
                >
                  CANCEL
                </button>
                <div className="flex items-center gap-2 flex-1 sm:flex-none justify-end">
                  {innIdx === 0 && (
                    <button
                      type="button"
                      onClick={openInningsSwitchModal}
                      className="px-3.5 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold transition-colors whitespace-nowrap"
                    >
                      End Innings → 2nd
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={
                      !selectedNextBowlerId || selectedNextBowlerId === previousOverBowlerId
                    }
                    onClick={() => handleConfirmNextBowler(selectedNextBowlerId)}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF8C00] hover:bg-[#E87500] disabled:opacity-45 disabled:cursor-not-allowed text-white font-display font-black text-xs sm:text-sm tracking-wide shadow-sm transition-colors whitespace-nowrap"
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
              className="w-full max-w-lg rounded-2xl bg-white border border-red-200 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-[#DC2626] via-[#B91C1C] to-[#DC2626] text-white px-5 py-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0">
                    <UserPlus className="w-6 h-6 text-white" aria-hidden="true" />
                  </div>
                  <div>
                    <h3
                      id="new-batter-title"
                      className="font-display font-black text-base sm:text-lg tracking-wide uppercase"
                    >
                      WICKET FALLEN! SELECT NEXT BATTER
                    </h3>
                    <p className="text-xs font-bold text-red-100 mt-0.5">
                      Scoring is paused until the next batter is selected or added
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setNewBatterModalOpen(false)}
                  aria-label="Close next batter popup"
                  className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
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
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] disabled:opacity-45 disabled:cursor-not-allowed text-white font-display font-black text-xs sm:text-sm tracking-wide shadow-sm transition-colors"
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
              className="w-full max-w-lg rounded-2xl bg-white border border-emerald-200 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-[#FF8C00] via-[#E87500] to-[#FF8C00] text-white px-5 py-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0">
                    <ArrowLeftRight className="w-6 h-6 text-white" aria-hidden="true" />
                  </div>
                  <div>
                    <h3
                      id="innings-switch-title"
                      className="font-display font-black text-base sm:text-lg tracking-wide uppercase"
                    >
                      {isFirstInningsEnded
                        ? '1ST INNINGS COMPLETED!'
                        : 'END 1ST INNINGS & SWITCH'}
                    </h3>
                    <p className="text-xs font-bold text-[#FFF3E0] mt-0.5">
                      End 1st innings and switch live scoring to 2nd innings
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setInningsSwitchModalOpen(false)}
                  aria-label="Close innings switch popup"
                  className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
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
                  <span>END INNINGS &amp; SWITCH TO 2ND</span>
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
              className="w-full max-w-lg rounded-2xl bg-white border border-[#FF8C00]/30 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-[#FF8C00] via-[#E87500] to-[#FF8C00] text-white px-5 py-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0">
                    <Users className="w-6 h-6 text-white" aria-hidden="true" />
                  </div>
                  <div>
                    <h3
                      id="inn2-setup-title"
                      className="font-display font-black text-base sm:text-lg tracking-wide uppercase"
                    >
                      2ND INNINGS — SELECT BATTERS &amp; BOWLER
                    </h3>
                    <p className="text-xs font-bold text-[#FFF3E0] mt-0.5">
                      Select or add Opening Striker, Non-Striker &amp; Bowler to begin scoring
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSecondInningsSetupModalOpen(false)}
                  aria-label="Close 2nd innings setup popup"
                  className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
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
                                  ? 'bg-[#FF8C00] text-white border-[#E87500] shadow-xs'
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
                                    ? 'bg-[#FF8C00] text-white border-[#E87500] shadow-xs'
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
                      <div className="p-3 rounded-xl bg-[#FFF3E0]/60 border border-[#FF8C00]/25 space-y-1.5">
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
                            className="px-3.5 py-1.5 rounded-lg bg-[#FF8C00] hover:bg-[#E87500] text-white text-xs font-bold shrink-0"
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
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF8C00] hover:bg-[#E87500] disabled:opacity-45 disabled:cursor-not-allowed text-white font-display font-black text-xs sm:text-sm tracking-wide shadow-sm transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                  <span>CONFIRM &amp; START 2ND INNINGS</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
