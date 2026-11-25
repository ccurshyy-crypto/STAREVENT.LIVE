import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowLeftRight,
  Award,
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

interface ScoringDashboardViewProps {
  state: CricketSuiteState;
  updateState: (updater: (prev: CricketSuiteState) => CricketSuiteState) => void;
  onOpenOverlayController: () => void;
  onNavigateToMatches?: () => void;
  onToast: (msg: string) => void;
}

type ScoringTab = 'scoring' | 'scorecard' | 'overs';

export function ScoringDashboardView({
  state,
  updateState,
  onOpenOverlayController,
  onNavigateToMatches,
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

  useEffect(() => {
    if (match) {
      setScorecardInningsTab(match.currentInningsIndex);
    }
  }, [match?.id, match?.currentInningsIndex]);

  if (!match) {
    return (
      <div className="rounded-xl bg-white border border-slate-200 shadow-xs p-10 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-indigo-50 text-[#303F9F] flex items-center justify-center mx-auto">
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
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#303F9F] hover:bg-[#283593] text-white text-xs font-bold tracking-wide transition-colors"
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

  const isScoringLocked = match.status === 'completed' || activeInn.completed;
  const needsOpeningSetup =
    !activeInn.strikerId || !activeInn.nonStrikerId || !activeInn.bowlerId;

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
    if (isScoringLocked) {
      onToast(
        match.status === 'innings_break'
          ? '1st Innings finished. Click "Start 2nd Innings" to continue.'
          : 'Match is completed. Use UNDO if you need to correct the last ball.'
      );
      return;
    }

    if (needsOpeningSetup) {
      onToast('Please assign Striker, Non-Striker, and Bowler before scoring.');
      if (!activeInn.strikerId) setPlayerPickerSlot('striker');
      else if (!activeInn.nonStrikerId) setPlayerPickerSlot('nonStriker');
      else setPlayerPickerSlot('bowler');
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

  const handleStartSecondInnings = () => {
    updateCurrentMatch((m) => {
      const nextInnings = [
        structuredClone(m.innings[0]),
        structuredClone(m.innings[1]),
      ] as [CricketMatch['innings'][0], CricketMatch['innings'][1]];
      nextInnings[0].completed = true;
      const targetRuns = nextInnings[0].runs + 1;
      nextInnings[1].target = targetRuns;
      nextInnings[1].completed = false;
      const secondBatTeam = teamMap.get(nextInnings[1].battingTeamId);
      const secondBowlTeam = teamMap.get(nextInnings[1].bowlingTeamId);
      if (!nextInnings[1].strikerId && secondBatTeam?.players[0]) {
        nextInnings[1].strikerId = secondBatTeam.players[0].id;
      }
      if (!nextInnings[1].nonStrikerId && secondBatTeam?.players[1]) {
        nextInnings[1].nonStrikerId = secondBatTeam.players[1].id;
      }
      if (!nextInnings[1].bowlerId && secondBowlTeam?.players[0]) {
        nextInnings[1].bowlerId = secondBowlTeam.players[0].id;
      }
      if (
        nextInnings[1].strikerId &&
        !nextInnings[1].battingOrder.includes(nextInnings[1].strikerId)
      ) {
        nextInnings[1].battingOrder.push(nextInnings[1].strikerId);
      }
      if (
        nextInnings[1].nonStrikerId &&
        !nextInnings[1].battingOrder.includes(nextInnings[1].nonStrikerId)
      ) {
        nextInnings[1].battingOrder.push(nextInnings[1].nonStrikerId);
      }

      return {
        ...m,
        currentInningsIndex: 1,
        status: 'live',
        resultText: `${secondBatTeam?.shortName || 'Team 2'} need ${targetRuns} runs in ${nextInnings[1].maxOvers * 6} balls`,
        innings: nextInnings,
      };
    });
    onToast('2nd Innings started!');
  };

  const handleCompleteInningsOrMatch = () => {
    updateCurrentMatch((m) => {
      const nextInnings = [
        structuredClone(m.innings[0]),
        structuredClone(m.innings[1]),
      ] as [CricketMatch['innings'][0], CricketMatch['innings'][1]];
      const cur = nextInnings[m.currentInningsIndex];
      cur.completed = true;
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
    const usedIds = new Set([
      ...activeInn.battingOrder,
      activeInn.strikerId,
      activeInn.nonStrikerId,
    ]);
    const nextCandidate = battingTeam?.players.find((p) => !usedIds.has(p.id));
    setWicketNextBatterId(nextCandidate?.id || '');
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

  const handleAssignPlayerSlot = (playerId: string) => {
    if (!playerPickerSlot) return;
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
      } else if (playerPickerSlot === 'nonStriker') {
        if (playerId === cur.strikerId) {
          cur.strikerId = cur.nonStrikerId;
        }
        cur.nonStrikerId = playerId;
        if (!cur.battingOrder.includes(playerId)) cur.battingOrder.push(playerId);
      } else {
        cur.bowlerId = playerId;
      }
      return { ...m, innings: nextInnings };
    });
    setPlayerPickerSlot(null);
    onToast('Player assigned.');
  };

  const handleQuickAddPlayer = (targetTeamId: string, assignToSlot?: 'striker' | 'nonStriker' | 'bowler' | 'nextWicket') => {
    const clean = quickPlayerName.trim();
    if (!clean) return;
    const teamObj = teamMap.get(targetTeamId);
    if (!teamObj) return;
    const newPlayer: Player = {
      id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: clean,
      role: quickPlayerRole,
      battingStyle: 'Right-Hand Bat',
      bowlingStyle: 'Right-Arm Medium',
      jerseyNo: teamObj.players.length + 1,
    };
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
        } else if (assignToSlot === 'nonStriker') {
          cur.nonStrikerId = newPlayer.id;
          if (!cur.battingOrder.includes(newPlayer.id)) cur.battingOrder.push(newPlayer.id);
        } else if (assignToSlot === 'bowler') {
          cur.bowlerId = newPlayer.id;
        }
        return { ...m, innings: nextInnings };
      });
      return { ...prev, teams: updatedTeams, matches: updatedMatches };
    });

    if (assignToSlot === 'nextWicket') {
      setWicketNextBatterId(newPlayer.id);
    } else if (assignToSlot) {
      setPlayerPickerSlot(null);
    }
    setQuickPlayerName('');
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
    if (b.isWicket) cls = 'bg-red-600 text-white border-red-700';
    else if (b.isBoundary6) cls = 'bg-amber-400 text-slate-950 border-amber-500';
    else if (b.isBoundary4) cls = 'bg-yellow-300 text-slate-950 border-yellow-500';
    else if (b.extraType !== 'none') cls = 'bg-emerald-600 text-white border-emerald-700';
    else if (b.runsOffBat > 0) cls = 'bg-[#303F9F] text-white border-[#283593]';
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
        <div className="bg-[#303F9F] text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3">
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
                          : 'bg-sky-300 text-slate-950'
                  }`}
                >
                  {match.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-[11px] text-indigo-100 truncate">
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
              onClick={onOpenOverlayController}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition-colors"
            >
              <Tv className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Overlay Control</span>
            </button>
          </div>
        </div>

        {/* 3 Main Tabs: SCORING PANEL | SCORECARD | OVERS */}
        <div className="grid grid-cols-3 border-b border-slate-200 bg-slate-50">
          {(
            [
              { id: 'scoring', label: 'SCORING PANEL' },
              { id: 'scorecard', label: 'SCORECARD' },
              { id: 'overs', label: 'OVERS' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 text-xs sm:text-sm font-bold tracking-wide transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-[#303F9F] text-[#303F9F] bg-white'
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
                      ? 'border-[#303F9F] ring-2 ring-[#303F9F]/15'
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
                      <span className="font-display font-black text-3xl text-[#303F9F] tabular-nums">
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
                    <span className="font-bold text-[#303F9F] tabular-nums">{target}</span>
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
              {(match.status === 'innings_break' ||
                (innIdx === 0 && activeInn.completed)) && (
                <button
                  type="button"
                  onClick={handleStartSecondInnings}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs"
                >
                  <Play className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>START 2ND INNINGS</span>
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

          {/* Setup Prompt if Players Not Yet Assigned */}
          {needsOpeningSetup && !isScoringLocked && (
            <div className="rounded-xl bg-amber-50 border border-amber-300 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-amber-900 text-xs sm:text-sm font-semibold">
                <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" aria-hidden="true" />
                <span>
                  Assign Striker, Non-Striker, and Opening Bowler to start live ball-by-ball
                  scoring.
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {!activeInn.strikerId && (
                  <button
                    type="button"
                    onClick={() => setPlayerPickerSlot('striker')}
                    className="px-3 py-1.5 rounded-lg bg-[#303F9F] text-white text-xs font-bold"
                  >
                    + Select Striker
                  </button>
                )}
                {!activeInn.nonStrikerId && (
                  <button
                    type="button"
                    onClick={() => setPlayerPickerSlot('nonStriker')}
                    className="px-3 py-1.5 rounded-lg bg-[#303F9F] text-white text-xs font-bold"
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
              </div>
            </div>
          )}

          {/* Striker + SWAP + Non-Striker Cards */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-stretch">
            {/* Striker Card */}
            <div className="rounded-xl bg-white border-2 border-[#303F9F] p-4 shadow-xs">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="px-2 py-0.5 rounded bg-[#303F9F] text-white text-[10px] font-bold uppercase tracking-wider">
                  STRIKER *
                </span>
                <button
                  type="button"
                  onClick={() => setPlayerPickerSlot('striker')}
                  className="text-xs font-semibold text-[#303F9F] hover:underline inline-flex items-center gap-1"
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
                  <p className="text-xs font-bold text-[#303F9F] tabular-nums">
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
                className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-[#303F9F] text-xs font-bold transition-colors"
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
                  className="text-xs font-semibold text-[#303F9F] hover:underline inline-flex items-center gap-1"
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
            <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-xs">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                  BOWLER
                </span>
                <button
                  type="button"
                  onClick={() => setPlayerPickerSlot('bowler')}
                  className="text-xs font-semibold text-[#303F9F] hover:underline inline-flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Edit Bowler</span>
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

          {/* Exact Color-Coded Scoring Keypad */}
          <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-xs space-y-3">
            {/* Row 1: Runs (Blue: 0,1,2,3,5; Yellow: 4,6) */}
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2.5">
              {[0, 1, 2, 3].map((r) => (
                <button
                  key={r}
                  type="button"
                  disabled={isScoringLocked}
                  onClick={() => recordDelivery({ runsOffBat: r })}
                  className="h-14 rounded-xl bg-[#1E6CEB] hover:bg-[#1557C0] disabled:opacity-45 text-white font-display font-black text-xl shadow-xs transition-colors"
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
                className="h-14 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] disabled:opacity-45 text-slate-950 font-display font-black text-xl shadow-xs transition-colors"
              >
                4
              </button>
              <button
                type="button"
                disabled={isScoringLocked}
                onClick={() => recordDelivery({ runsOffBat: 5 }, '+5 Runs')}
                className="h-14 rounded-xl bg-[#1E6CEB] hover:bg-[#1557C0] disabled:opacity-45 text-white font-display font-black text-xl shadow-xs transition-colors"
              >
                5
              </button>
              <button
                type="button"
                disabled={isScoringLocked}
                onClick={() =>
                  recordDelivery({ runsOffBat: 6, isBoundary6: true }, 'SIX! +6 Runs')
                }
                className="h-14 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] disabled:opacity-45 text-slate-950 font-display font-black text-xl shadow-xs transition-colors"
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
                      className="px-4 py-2 rounded-lg bg-[#1E6CEB] hover:bg-[#1557C0] disabled:opacity-45 text-white text-xs font-bold"
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
                    onClick={() => setPlayerPickerSlot('bowler')}
                    className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold"
                  >
                    Change Bowler
                  </button>
                  {!isScoringLocked && (
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
                    className="px-3.5 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-[#303F9F] text-xs font-bold"
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
                      ? 'bg-[#303F9F] text-white border-[#303F9F]'
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
              <span className="text-xs font-bold text-[#303F9F] tabular-nums">
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
                        <td className="px-4 py-2.5 text-right font-semibold text-[#303F9F] tabular-nums">
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
                      <span className="font-bold text-[#303F9F] shrink-0 tabular-nums">
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
              <p className="text-xs font-bold uppercase tracking-wider text-[#303F9F] mb-2">
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
                            <td className="px-4 py-3 font-bold text-[#303F9F]">
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

      {/* ================= MODAL: EXTRA DELIVERY ================= */}
      {extraModalType && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
            <div className="bg-[#303F9F] text-white px-4 py-3 flex items-center justify-between">
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
                        ? 'bg-[#303F9F] text-white border-[#303F9F]'
                        : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
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
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white"
                >
                  Confirm {extraModalType}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: WICKET / OUT ================= */}
      {wicketModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl bg-white border border-slate-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-red-600 text-white px-4 py-3 flex items-center justify-between">
              <h3 className="font-display font-bold text-sm">Record Wicket (OUT)</h3>
              <button
                type="button"
                onClick={() => setWicketModalOpen(false)}
                className="p-1 rounded hover:bg-white/20"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Wicket Type
                </label>
                <select
                  value={wicketType}
                  onChange={(e) => setWicketType(e.target.value as WicketType)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                >
                  {WICKET_TYPES.map((wt) => (
                    <option key={wt} value={wt}>
                      {wt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Dismissed Batter
                </label>
                <select
                  value={wicketDismissedId}
                  onChange={(e) => setWicketDismissedId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                >
                  {activeInn.strikerId && (
                    <option value={activeInn.strikerId}>
                      Striker: {strikerStats?.playerName || 'Striker'}
                    </option>
                  )}
                  {activeInn.nonStrikerId && (
                    <option value={activeInn.nonStrikerId}>
                      Non-Striker: {nonStrikerStats?.playerName || 'Non-Striker'}
                    </option>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Runs Completed
                  </label>
                  <select
                    value={wicketRunsCompleted}
                    onChange={(e) => setWicketRunsCompleted(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                  >
                    {[0, 1, 2, 3].map((r) => (
                      <option key={r} value={r}>
                        {r} run(s)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Fielder (Optional)
                  </label>
                  <input
                    type="text"
                    value={wicketFielder}
                    onChange={(e) => setWicketFielder(e.target.value)}
                    placeholder="Fielder name"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Next Incoming Batter
                </label>
                <select
                  value={wicketNextBatterId}
                  onChange={(e) => setWicketNextBatterId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                >
                  <option value="">-- Select Next Batter --</option>
                  {(battingTeam?.players ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      #{p.jerseyNo} {p.name} ({p.role})
                    </option>
                  ))}
                </select>
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
                      className="px-3 py-1.5 rounded-lg bg-[#303F9F] text-white text-xs font-bold"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
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
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-xs font-bold text-white"
                >
                  Confirm Wicket
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
            <div className="bg-[#303F9F] text-white px-4 py-3 flex items-center justify-between">
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
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => handleAssignPlayerSlot(p.id)}
                              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-left transition-colors ${
                                isSelected
                                  ? 'bg-indigo-50 border-[#303F9F] text-[#303F9F]'
                                  : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
                              }`}
                            >
                              <span className="text-sm font-semibold">
                                #{p.jerseyNo} {p.name}
                              </span>
                              <span className="text-[11px] text-slate-500">{p.role}</span>
                            </button>
                          );
                        })
                      )}
                    </div>

                    {targetTeam && (
                      <div className="pt-3 border-t border-slate-200 space-y-2">
                        <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-[#303F9F]" aria-hidden="true" />
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
                          className="w-full py-2 rounded-lg bg-[#303F9F] hover:bg-[#283593] text-white text-xs font-bold"
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
            <div className="bg-[#303F9F] text-white px-4 py-3 flex items-center justify-between">
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
                  className="px-4 py-2 rounded-lg bg-[#303F9F] hover:bg-[#283593] text-xs font-bold text-white"
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
            <div className="bg-[#303F9F] text-white px-4 py-3 flex items-center justify-between">
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
                          ? 'bg-[#303F9F] text-white border-[#303F9F]'
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
                  className="px-4 py-2 rounded-lg bg-[#303F9F] text-xs font-bold text-white"
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
            <div className="bg-[#303F9F] text-white px-4 py-3 flex items-center justify-between">
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
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#303F9F] text-xs font-bold text-white"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Save</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
