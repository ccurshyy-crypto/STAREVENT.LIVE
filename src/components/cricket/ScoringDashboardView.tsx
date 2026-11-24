import { FormEvent, useState } from 'react';
import {
  ArrowLeftRight,
  Edit3,
  MoreHorizontal,
  PenSquare,
  Tv,
  Undo2,
  User,
  X,
} from 'lucide-react';
import {
  applyDeliveryToMatch,
  calcRunRate,
  computeBattingCard,
  computeBowlingCard,
  computeOversBreakdown,
  DeliveryInput,
  formatOvers,
  getBallPillLabel,
  undoLastDelivery,
} from '../../data/cricketSampleData';
import {
  CricketMatch,
  CricketSuiteState,
  ExtraType,
  TransitionOverlayType,
  WICKET_TYPES,
  WicketType,
} from '../../types/cricketSuite';

interface ScoringDashboardViewProps {
  state: CricketSuiteState;
  updateState: (updater: (prev: CricketSuiteState) => CricketSuiteState) => void;
  onOpenOverlayController: () => void;
  onToast: (msg: string) => void;
}

type ScoreTab = 'SCORING PANEL' | 'SCORECARD' | 'OVERS';

export function ScoringDashboardView({
  state,
  updateState,
  onOpenOverlayController,
  onToast,
}: ScoringDashboardViewProps) {
  const [tab, setTab] = useState<ScoreTab>('SCORING PANEL');
  const [wicketPanelOpen, setWicketPanelOpen] = useState(false);
  const [selectedWicketType, setSelectedWicketType] = useState<WicketType | null>(null);
  const [dismissedSide, setDismissedSide] = useState<'striker' | 'nonStriker'>('striker');
  const [fielderName, setFielderName] = useState('');
  const [nextBatterId, setNextBatterId] = useState('');
  const [wicketRuns, setWicketRuns] = useState('0');

  const [extraModal, setExtraModal] = useState<ExtraType | null>(null);
  const [customRunsModalOpen, setCustomRunsModalOpen] = useState(false);
  const [moreModalOpen, setMoreModalOpen] = useState(false);
  const [editInningsIndex, setEditInningsIndex] = useState<0 | 1 | null>(null);
  const [playerPickerMode, setPlayerPickerMode] = useState<
    'striker' | 'nonStriker' | 'bowler' | null
  >(null);

  // Manual innings edit modal state
  const [editRuns, setEditRuns] = useState('0');
  const [editWickets, setEditWickets] = useState('0');
  const [editOvers, setEditOvers] = useState('0');
  const [editBalls, setEditBalls] = useState('0');
  const [editTarget, setEditTarget] = useState('');

  // More modal inline inputs
  const [newTargetInput, setNewTargetInput] = useState('');
  const [newOversInput, setNewOversInput] = useState('');
  const [penaltyRunsInput, setPenaltyRunsInput] = useState('5');

  const match =
    state.matches.find((m) => m.id === state.activeMatchId) ?? state.matches[0];

  if (!match) {
    return (
      <div className="rounded-2xl bg-[#111116] border border-white/12 p-8 text-center text-zinc-400">
        No match selected. Go to Match List to create or select a match.
      </div>
    );
  }

  const teamMap = new Map(state.teams.map((t) => [t.id, t]));
  const team1 = teamMap.get(match.team1Id);
  const team2 = teamMap.get(match.team2Id);
  const activeInnIdx = match.currentInningsIndex;
  const activeInn = match.innings[activeInnIdx];
  const battingTeam = teamMap.get(activeInn.battingTeamId);
  const bowlingTeam = teamMap.get(activeInn.bowlingTeamId);

  const battingCards = computeBattingCard(activeInn, battingTeam);
  const bowlingCards = computeBowlingCard(activeInn, bowlingTeam);

  const strikerCard = battingCards.find((c) => c.playerId === activeInn.strikerId);
  const nonStrikerCard = battingCards.find((c) => c.playerId === activeInn.nonStrikerId);
  const bowlerCard = bowlingCards.find((c) => c.playerId === activeInn.bowlerId);

  const oversBreakdown = computeOversBreakdown(activeInn);
  const currentOverIdx = Math.floor(activeInn.legalBalls / 6);
  const thisOverBalls = activeInn.balls.filter((b) => b.over === currentOverIdx);
  const prevOverBalls =
    currentOverIdx > 0
      ? activeInn.balls.filter((b) => b.over === currentOverIdx - 1)
      : [];

  // Chase / status banner calculation
  let chaseBanner = '';
  if (match.status === 'completed') {
    chaseBanner = match.resultText;
  } else if (activeInnIdx === 1 && activeInn.target !== null) {
    const needRuns = Math.max(0, activeInn.target - activeInn.runs);
    const remBalls = Math.max(0, activeInn.maxOvers * 6 - activeInn.legalBalls);
    const rrr = remBalls > 0 ? ((needRuns * 6) / remBalls).toFixed(2) : '0.00';
    chaseBanner = `${battingTeam?.name || 'Team 2'} Need ${needRuns} Runs off ${remBalls} Balls · RRR ${rrr}`;
  } else {
    const crr = calcRunRate(activeInn.runs, activeInn.legalBalls);
    chaseBanner = `1st Innings Live · CRR: ${crr} · Max ${activeInn.maxOvers} Overs`;
  }

  const mutateActiveMatch = (
    mutator: (m: CricketMatch) => CricketMatch,
    autoTransitionType?: TransitionOverlayType
  ) => {
    updateState((prev) => {
      const nextMatches = prev.matches.map((m) =>
        m.id === match.id ? mutator(m) : m
      );
      const nextOverlay =
        autoTransitionType && prev.overlay.autoTransition
          ? {
              ...prev.overlay,
              activeTransition: { type: autoTransitionType, id: Date.now() },
            }
          : prev.overlay;
      return {
        ...prev,
        matches: nextMatches,
        overlay: nextOverlay,
      };
    });
  };

  const recordBall = (input: DeliveryInput) => {
    let trans: TransitionOverlayType | undefined;
    if (input.isWicket) trans = 'Wicket';
    else if (input.extraType === 'WD') trans = 'Wide';
    else if (input.extraType === 'NB') trans = 'Noball';
    else if (input.isBoundary6 || input.runsOffBat === 6) trans = 'Six';
    else if (input.isBoundary4 || input.runsOffBat === 4) trans = 'Four';

    mutateActiveMatch((m) => applyDeliveryToMatch(m, input, state.teams), trans);
  };

  const handleSwapStrike = () => {
    mutateActiveMatch((m) => {
      const nextInns = [
        structuredClone(m.innings[0]),
        structuredClone(m.innings[1]),
      ] as CricketMatch['innings'];
      const cur = nextInns[m.currentInningsIndex];
      const tmp = cur.strikerId;
      cur.strikerId = cur.nonStrikerId;
      cur.nonStrikerId = tmp;
      return { ...m, innings: nextInns };
    });
    onToast('Strike swapped');
  };

  const handleUndo = () => {
    if (!match.undoStack.length) {
      onToast('Nothing to undo');
      return;
    }
    mutateActiveMatch((m) => undoLastDelivery(m));
    onToast('Last ball undone');
  };

  const openEditInningsModal = (idx: 0 | 1) => {
    const inn = match.innings[idx];
    setEditInningsIndex(idx);
    setEditRuns(String(inn.runs));
    setEditWickets(String(inn.wickets));
    setEditOvers(String(Math.floor(inn.legalBalls / 6)));
    setEditBalls(String(inn.legalBalls % 6));
    setEditTarget(inn.target !== null ? String(inn.target) : '');
  };

  const handleSaveManualInnings = (e: FormEvent) => {
    e.preventDefault();
    if (editInningsIndex === null) return;
    const runsVal = Math.max(0, Number(editRuns) || 0);
    const wktsVal = Math.min(10, Math.max(0, Number(editWickets) || 0));
    const ovVal = Math.max(0, Number(editOvers) || 0);
    const bVal = Math.min(5, Math.max(0, Number(editBalls) || 0));
    const tgtVal = editTarget.trim() ? Math.max(1, Number(editTarget) || 1) : null;

    mutateActiveMatch((m) => {
      const nextInns = [
        structuredClone(m.innings[0]),
        structuredClone(m.innings[1]),
      ] as CricketMatch['innings'];
      const targetInn = nextInns[editInningsIndex];
      targetInn.runs = runsVal;
      targetInn.wickets = wktsVal;
      targetInn.legalBalls = ovVal * 6 + bVal;
      if (editInningsIndex === 1) {
        targetInn.target = tgtVal;
      }
      return { ...m, innings: nextInns };
    });

    setEditInningsIndex(null);
    onToast('Innings score updated manually');
  };

  const handleSelectPlayer = (playerId: string) => {
    if (!playerPickerMode) return;
    mutateActiveMatch((m) => {
      const nextInns = [
        structuredClone(m.innings[0]),
        structuredClone(m.innings[1]),
      ] as CricketMatch['innings'];
      const cur = nextInns[m.currentInningsIndex];
      if (playerPickerMode === 'striker') {
        cur.strikerId = playerId;
        if (!cur.battingOrder.includes(playerId)) cur.battingOrder.push(playerId);
      } else if (playerPickerMode === 'nonStriker') {
        cur.nonStrikerId = playerId;
        if (!cur.battingOrder.includes(playerId)) cur.battingOrder.push(playerId);
      } else {
        cur.bowlerId = playerId;
      }
      return { ...m, innings: nextInns };
    });
    setPlayerPickerMode(null);
  };

  const handleConfirmWicket = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedWicketType) return;
    const dismissedId =
      dismissedSide === 'striker' ? activeInn.strikerId : activeInn.nonStrikerId;

    recordBall({
      runsOffBat: Math.max(0, Number(wicketRuns) || 0),
      isWicket: true,
      wicketType: selectedWicketType,
      dismissedPlayerId: dismissedId,
      fielderName: fielderName.trim() || undefined,
      nextBatterId: nextBatterId || undefined,
    });

    setSelectedWicketType(null);
    setWicketPanelOpen(false);
    setFielderName('');
    setWicketRuns('0');
    setNextBatterId('');
    onToast(`OUT · ${selectedWicketType}`);
  };

  const handleEndInnings = () => {
    mutateActiveMatch((m) => {
      const nextInns = [
        structuredClone(m.innings[0]),
        structuredClone(m.innings[1]),
      ] as CricketMatch['innings'];
      if (m.currentInningsIndex === 0) {
        nextInns[0].completed = true;
        nextInns[1].target = nextInns[0].runs + 1;
        return {
          ...m,
          currentInningsIndex: 1,
          innings: nextInns,
          status: 'live',
          resultText: 'Match is going on',
        };
      }
      nextInns[1].completed = true;
      const diff = nextInns[0].runs - nextInns[1].runs;
      const resText =
        diff > 0
          ? `${team1?.name || 'Team 1'} won by ${diff} runs`
          : diff < 0
            ? `${team2?.name || 'Team 2'} won by ${Math.max(1, 10 - nextInns[1].wickets)} wickets`
            : 'Match Tied';
      return {
        ...m,
        innings: nextInns,
        status: 'completed',
        resultText: resText,
      };
    });
    setMoreModalOpen(false);
    onToast(activeInnIdx === 0 ? '2nd Innings started!' : 'Match completed!');
  };

  const handleCompleteMatch = () => {
    mutateActiveMatch((m) => {
      const r1 = m.innings[0].runs;
      const r2 = m.innings[1].runs;
      const w2 = m.innings[1].wickets;
      const resText =
        r1 > r2
          ? `${team1?.name || 'Team 1'} won by ${r1 - r2} runs`
          : r2 > r1
            ? `${team2?.name || 'Team 2'} won by ${Math.max(1, 10 - w2)} wickets`
            : 'Match Tied';
      return { ...m, status: 'completed', resultText: resText };
    });
    setMoreModalOpen(false);
    onToast('Match marked completed');
  };

  const handleWalkOver = (winner: 'team1' | 'team2') => {
    const winName = winner === 'team1' ? team1?.name || 'Team 1' : team2?.name || 'Team 2';
    mutateActiveMatch((m) => ({
      ...m,
      status: 'completed',
      resultText: `${winName} won by Walk Over`,
    }));
    setMoreModalOpen(false);
    onToast(`Walk Over awarded to ${winName}`);
  };

  const availableNextBatters = (battingTeam?.players || []).filter(
    (p) =>
      p.id !== activeInn.strikerId &&
      p.id !== activeInn.nonStrikerId &&
      !activeInn.fallOfWickets.some((f) => f.playerId === p.id)
  );

  return (
    <div className="space-y-4">
      {/* Top 3-Tab Bar: SCORING PANEL | SCORECARD | OVERS */}
      <div className="grid grid-cols-3 rounded-xl bg-[#111116] border border-[#FFE600]/30 p-1 gap-1">
        {(['SCORING PANEL', 'SCORECARD', 'OVERS'] as ScoreTab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`py-2.5 px-2 rounded-lg font-display font-black text-xs sm:text-sm tracking-wide transition-colors ${
              tab === t
                ? 'bg-[#DC2626] text-white shadow'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Dual Innings Score Header */}
      <div className="rounded-2xl bg-[#111116] border border-[#FFE600]/30 overflow-hidden shadow-xl">
        <div className="grid grid-cols-2 divide-x divide-white/10">
          {([0, 1] as const).map((idx) => {
            const inn = match.innings[idx];
            const tm = idx === 0 ? team1 : team2;
            const isActive = activeInnIdx === idx;
            return (
              <div
                key={idx}
                className={`p-3.5 sm:p-4 relative transition-colors ${
                  isActive ? 'bg-[#1D0B10]' : 'bg-[#0E0E14]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      mutateActiveMatch((m) => ({ ...m, currentInningsIndex: idx }))
                    }
                    className="text-left min-w-0"
                  >
                    <p className="font-display font-black text-xs sm:text-base text-white truncate">
                      {tm?.name || `Team ${idx + 1}`}
                    </p>
                    <p className="text-[11px] font-mono text-[#FFE600] font-bold">
                      {idx === 0 ? '1st Inning' : '2nd inning'}
                      {isActive && ' · LIVE'}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => openEditInningsModal(idx)}
                    title="Edit Innings Score"
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-[#FFE600] text-[#FFE600] hover:text-black transition-colors shrink-0"
                  >
                    <PenSquare className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="font-mono text-2xl sm:text-3xl font-black text-white tabular-nums">
                    {inn.runs}-{inn.wickets}
                  </span>
                  <sup className="font-mono text-xs sm:text-sm font-bold text-[#FFE600] tabular-nums">
                    ({formatOvers(inn.legalBalls)})
                  </sup>
                </div>
              </div>
            );
          })}
        </div>

        {/* Chase / Status Strip */}
        <div className="px-4 py-2 bg-gradient-to-r from-[#7F0712] via-[#B91C1C] to-[#7F0712] text-center text-xs sm:text-sm font-bold text-[#FFE600] tracking-wide">
          {chaseBanner}
        </div>
      </div>

      {/* TAB 1: SCORING PANEL */}
      {tab === 'SCORING PANEL' && (
        <div className="space-y-4">
          {/* STRIKER + Orange Swap + NONSTRIKER */}
          <div className="grid grid-cols-11 gap-2 items-stretch">
            {/* STRIKER */}
            <div className="col-span-5 rounded-xl bg-[#111116] border border-blue-500/40 overflow-hidden flex flex-col">
              <div className="px-2.5 py-1.5 bg-blue-600 flex items-center justify-between gap-1">
                <span className="font-mono text-[10px] sm:text-xs font-black text-white uppercase">
                  STRIKER *
                </span>
                <button
                  type="button"
                  onClick={() => setPlayerPickerMode('striker')}
                  title="Change Striker"
                  className="p-1 rounded bg-white/15 hover:bg-white/25 text-white"
                >
                  <User className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="p-2.5 sm:p-3 space-y-1 flex-1">
                <p className="font-bold text-xs sm:text-sm text-white truncate">
                  {strikerCard?.name || 'Select Striker'}
                </p>
                <p className="font-mono text-base sm:text-lg font-black text-[#FFE600] tabular-nums">
                  {strikerCard?.runs ?? 0}({strikerCard?.balls ?? 0})
                </p>
                <p className="font-mono text-[10px] sm:text-[11px] text-zinc-400">
                  4s:{strikerCard?.fours ?? 0} 6s:{strikerCard?.sixes ?? 0} SR:
                  {strikerCard?.sr ?? '0.0'}
                </p>
              </div>
            </div>

            {/* CENTER SWAP BUTTON */}
            <div className="col-span-1 flex items-center justify-center">
              <button
                type="button"
                onClick={handleSwapStrike}
                title="Swap Strike"
                aria-label="Swap Strike"
                className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-orange-500 hover:bg-orange-400 text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform"
              >
                <ArrowLeftRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            {/* NONSTRIKER */}
            <div className="col-span-5 rounded-xl bg-[#111116] border border-blue-500/35 overflow-hidden flex flex-col">
              <div className="px-2.5 py-1.5 bg-blue-700 flex items-center justify-between gap-1">
                <span className="font-mono text-[10px] sm:text-xs font-black text-white uppercase">
                  NONSTRIKER
                </span>
                <button
                  type="button"
                  onClick={() => setPlayerPickerMode('nonStriker')}
                  title="Change Non-Striker"
                  className="p-1 rounded bg-white/15 hover:bg-white/25 text-white"
                >
                  <User className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="p-2.5 sm:p-3 space-y-1 flex-1">
                <p className="font-bold text-xs sm:text-sm text-white truncate">
                  {nonStrikerCard?.name || 'Select Non-Striker'}
                </p>
                <p className="font-mono text-base sm:text-lg font-black text-zinc-100 tabular-nums">
                  {nonStrikerCard?.runs ?? 0}({nonStrikerCard?.balls ?? 0})
                </p>
                <p className="font-mono text-[10px] sm:text-[11px] text-zinc-400">
                  4s:{nonStrikerCard?.fours ?? 0} 6s:{nonStrikerCard?.sixes ?? 0} SR:
                  {nonStrikerCard?.sr ?? '0.0'}
                </p>
              </div>
            </div>
          </div>

          {/* BOWLER Card */}
          <div className="rounded-xl bg-[#111116] border border-blue-500/35 overflow-hidden">
            <div className="px-3 py-1.5 bg-blue-700 flex items-center justify-between">
              <span className="font-mono text-xs font-black text-white uppercase">
                BOWLER · {bowlerCard?.name || 'Select Bowler'}
              </span>
              <button
                type="button"
                onClick={() => setPlayerPickerMode('bowler')}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/15 hover:bg-white/25 text-[11px] font-bold text-white"
              >
                <User className="w-3 h-3" />
                Change
              </button>
            </div>
            <div className="grid grid-cols-5 text-center py-2.5 text-xs font-mono">
              <div>
                <p className="text-zinc-400 text-[10px]">O</p>
                <p className="font-bold text-white">{bowlerCard?.overs ?? '0.0'}</p>
              </div>
              <div>
                <p className="text-zinc-400 text-[10px]">M</p>
                <p className="font-bold text-white">{bowlerCard?.maidens ?? 0}</p>
              </div>
              <div>
                <p className="text-zinc-400 text-[10px]">R</p>
                <p className="font-bold text-white">{bowlerCard?.runs ?? 0}</p>
              </div>
              <div>
                <p className="text-zinc-400 text-[10px]">W</p>
                <p className="font-bold text-[#FFE600]">{bowlerCard?.wickets ?? 0}</p>
              </div>
              <div>
                <p className="text-zinc-400 text-[10px]">Eco</p>
                <p className="font-bold text-emerald-300">{bowlerCard?.economy ?? '0.00'}</p>
              </div>
            </div>
          </div>

          {/* THIS OVER & PREV OVER Delivery Pills */}
          <div className="rounded-xl bg-[#111116] border border-white/12 p-3 space-y-2 text-xs font-mono">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-bold text-[#FFE600] mr-1">THIS OVER :</span>
              {thisOverBalls.length === 0 ? (
                <span className="text-zinc-500">New over ready</span>
              ) : (
                thisOverBalls.map((b) => (
                  <span
                    key={b.id}
                    className={`min-w-[28px] h-7 px-2 rounded-full inline-flex items-center justify-center font-black text-[11px] ${
                      b.isWicket
                        ? 'bg-[#DC2626] text-white'
                        : b.runsOffBat === 6
                          ? 'bg-[#FFE600] text-black'
                          : b.runsOffBat === 4
                            ? 'bg-amber-500 text-black'
                            : b.extraType !== 'none'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-zinc-800 text-zinc-100 border border-white/15'
                    }`}
                  >
                    {getBallPillLabel(b)}
                  </span>
                ))
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-white/8">
              <span className="font-bold text-zinc-400 mr-1">PREV OVER :</span>
              {prevOverBalls.length === 0 ? (
                <span className="text-zinc-500">—</span>
              ) : (
                prevOverBalls.map((b) => (
                  <span
                    key={b.id}
                    className="min-w-[24px] h-6 px-1.5 rounded-full inline-flex items-center justify-center font-bold text-[10px] bg-white/8 text-zinc-300"
                  >
                    {getBallPillLabel(b)}
                  </span>
                ))
              )}
            </div>
          </div>

          {/* WICKET SELECTOR PANEL (13 Red Dismissal Buttons) */}
          {wicketPanelOpen && (
            <div className="rounded-2xl bg-[#180A0D] border-2 border-[#DC2626] p-4 space-y-3 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-black text-sm sm:text-base text-white flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-[#DC2626] text-white text-xs">
                    X Wicket
                  </span>
                  <span>Select Dismissal Type</span>
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setWicketPanelOpen(false);
                    setSelectedWicketType(null);
                  }}
                  className="p-1 rounded-lg bg-white/10 text-zinc-200 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {WICKET_TYPES.map((wt) => (
                  <button
                    key={wt}
                    type="button"
                    onClick={() => setSelectedWicketType(wt)}
                    className={`py-2.5 px-2 rounded-xl font-bold text-xs transition-all border ${
                      selectedWicketType === wt
                        ? 'bg-[#FFE600] text-black border-white scale-[1.02]'
                        : 'bg-[#DC2626] hover:bg-[#EF4444] text-white border-red-400/40'
                    }`}
                  >
                    {wt}
                  </button>
                ))}
              </div>

              {selectedWicketType && (
                <form
                  onSubmit={handleConfirmWicket}
                  className="pt-3 border-t border-white/15 grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-end"
                >
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                      Dismissed Batter
                    </label>
                    <select
                      value={dismissedSide}
                      onChange={(e) =>
                        setDismissedSide(e.target.value as 'striker' | 'nonStriker')
                      }
                      className="w-full px-2.5 py-2 rounded-lg bg-[#09090D] border border-white/15 text-xs text-white"
                    >
                      <option value="striker">Striker ({strikerCard?.name})</option>
                      <option value="nonStriker">Non-Striker ({nonStrikerCard?.name})</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                      Fielder / Keeper (Optional)
                    </label>
                    <input
                      type="text"
                      value={fielderName}
                      onChange={(e) => setFielderName(e.target.value)}
                      placeholder="Fielder name"
                      className="w-full px-2.5 py-2 rounded-lg bg-[#09090D] border border-white/15 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                      New Batsman
                    </label>
                    <select
                      value={nextBatterId}
                      onChange={(e) => setNextBatterId(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-lg bg-[#09090D] border border-white/15 text-xs text-white"
                    >
                      <option value="">Select Incoming Batter</option>
                      {availableNextBatters.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={6}
                      value={wicketRuns}
                      onChange={(e) => setWicketRuns(e.target.value)}
                      title="Runs completed before wicket"
                      className="w-14 px-2 py-2 rounded-lg bg-[#09090D] border border-white/15 text-xs font-mono text-white text-center"
                    />
                    <button
                      type="submit"
                      className="flex-1 py-2 px-3 rounded-lg bg-[#FFE600] hover:bg-[#FEF08A] text-black font-black text-xs uppercase"
                    >
                      Confirm Out
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* MAIN 3-ROW KEYPAD GRID */}
          <div className="rounded-2xl bg-[#111116] border border-[#FFE600]/25 p-3 sm:p-4 space-y-2.5 shadow-xl">
            {/* Row 1: 0 (blue), DCL (orange), 1 (blue), 2 (blue), 3 (blue), 4 (yellow), 6 (yellow) */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => recordBall({ runsOffBat: 0 })}
                className="min-h-[50px] rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono font-black text-base sm:text-lg active:scale-95 transition-transform"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => {
                  recordBall({ runsOffBat: 1, isDcl: true });
                  onToast('DCL +1 recorded');
                }}
                className="min-h-[50px] rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-display font-black text-xs sm:text-sm active:scale-95 transition-transform"
              >
                DCL
              </button>
              <button
                type="button"
                onClick={() => recordBall({ runsOffBat: 1 })}
                className="min-h-[50px] rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono font-black text-base sm:text-lg active:scale-95 transition-transform"
              >
                1
              </button>
              <button
                type="button"
                onClick={() => recordBall({ runsOffBat: 2 })}
                className="min-h-[50px] rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono font-black text-base sm:text-lg active:scale-95 transition-transform"
              >
                2
              </button>
              <button
                type="button"
                onClick={() => recordBall({ runsOffBat: 3 })}
                className="min-h-[50px] rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono font-black text-base sm:text-lg active:scale-95 transition-transform"
              >
                3
              </button>
              <button
                type="button"
                onClick={() => recordBall({ runsOffBat: 4, isBoundary4: true })}
                className="min-h-[50px] rounded-xl bg-[#FACC15] hover:bg-[#FEF08A] text-black font-mono font-black text-base sm:text-lg active:scale-95 transition-transform shadow"
              >
                4
              </button>
              <button
                type="button"
                onClick={() => recordBall({ runsOffBat: 6, isBoundary6: true })}
                className="min-h-[50px] rounded-xl bg-[#FACC15] hover:bg-[#FEF08A] text-black font-mono font-black text-base sm:text-lg active:scale-95 transition-transform shadow"
              >
                6
              </button>
            </div>

            {/* Row 2: 4 (blue), 5 (blue), 6 (blue), NB (green), WD (green), LB (green), BYE (green) */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => recordBall({ runsOffBat: 4, isBoundary4: false })}
                title="4 Runs (All Run / Non-Boundary)"
                className="min-h-[50px] rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono font-black text-base sm:text-lg active:scale-95 transition-transform"
              >
                4
              </button>
              <button
                type="button"
                onClick={() => recordBall({ runsOffBat: 5 })}
                className="min-h-[50px] rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono font-black text-base sm:text-lg active:scale-95 transition-transform"
              >
                5
              </button>
              <button
                type="button"
                onClick={() => recordBall({ runsOffBat: 6, isBoundary6: false })}
                title="6 Runs (Non-Boundary)"
                className="min-h-[50px] rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono font-black text-base sm:text-lg active:scale-95 transition-transform"
              >
                6
              </button>
              <button
                type="button"
                onClick={() => setExtraModal('NB')}
                className="min-h-[50px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-black text-xs sm:text-sm active:scale-95 transition-transform"
              >
                NB
              </button>
              <button
                type="button"
                onClick={() => setExtraModal('WD')}
                className="min-h-[50px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-black text-xs sm:text-sm active:scale-95 transition-transform"
              >
                WD
              </button>
              <button
                type="button"
                onClick={() => setExtraModal('LB')}
                className="min-h-[50px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-black text-xs sm:text-sm active:scale-95 transition-transform"
              >
                LB
              </button>
              <button
                type="button"
                onClick={() => setExtraModal('BYE')}
                className="min-h-[50px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-black text-xs sm:text-sm active:scale-95 transition-transform"
              >
                BYE
              </button>
            </div>

            {/* Row 3: OUT (red), More (teal), 7 8 9 10.. (blue), Edit (orange), Undo (orange), overlay (teal) */}
            <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setWicketPanelOpen((v) => !v)}
                className="min-h-[52px] rounded-xl bg-[#DC2626] hover:bg-[#EF4444] text-white font-display font-black text-xs sm:text-sm uppercase active:scale-95 transition-transform shadow"
              >
                OUT
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewTargetInput(
                    activeInn.target !== null ? String(activeInn.target) : ''
                  );
                  setNewOversInput(String(activeInn.maxOvers));
                  setMoreModalOpen(true);
                }}
                className="min-h-[52px] rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-display font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-1 active:scale-95 transition-transform"
              >
                <MoreHorizontal className="w-4 h-4 hidden sm:inline" />
                <span>More</span>
              </button>
              <button
                type="button"
                onClick={() => setCustomRunsModalOpen(true)}
                className="min-h-[52px] rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold text-[10px] sm:text-xs leading-tight px-1 active:scale-95 transition-transform"
              >
                7 8 9 10..
              </button>
              <button
                type="button"
                onClick={() => openEditInningsModal(activeInnIdx)}
                title="Edit / Score Correction"
                aria-label="Edit Score Correction"
                className="min-h-[52px] rounded-xl bg-orange-500 hover:bg-orange-400 text-white inline-flex items-center justify-center active:scale-95 transition-transform"
              >
                <Edit3 className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleUndo}
                title="Undo Last Ball"
                aria-label="Undo Last Ball"
                className="min-h-[52px] rounded-xl bg-orange-600 hover:bg-orange-500 text-white inline-flex items-center justify-center gap-1 active:scale-95 transition-transform"
              >
                <Undo2 className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={onOpenOverlayController}
                className="min-h-[52px] rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-display font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-1 active:scale-95 transition-transform"
              >
                <Tv className="w-4 h-4 hidden sm:inline" />
                <span>overlay</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SCORECARD */}
      {tab === 'SCORECARD' && (
        <div className="space-y-5">
          {([0, 1] as const).map((idx) => {
            const inn = match.innings[idx];
            const batTeam = teamMap.get(inn.battingTeamId);
            const bowlTeam = teamMap.get(inn.bowlingTeamId);
            const batCard = computeBattingCard(inn, batTeam);
            const bowlCard = computeBowlingCard(inn, bowlTeam);
            const totalExtras =
              inn.extras.wd + inn.extras.nb + inn.extras.lb + inn.extras.bye + inn.extras.penalty;

            return (
              <div
                key={idx}
                className="rounded-2xl bg-[#111116] border border-white/12 overflow-hidden"
              >
                <div className="px-4 py-3 bg-[#171721] border-b border-white/10 flex items-center justify-between">
                  <h3 className="font-display font-black text-sm sm:text-base text-[#FFE600]">
                    {idx === 0 ? '1st Innings' : '2nd Innings'} · {batTeam?.name}
                  </h3>
                  <span className="font-mono font-black text-sm text-white">
                    {inn.runs}-{inn.wickets} ({formatOvers(inn.legalBalls)})
                  </span>
                </div>

                {/* Batting Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-[#0C0C12] text-[11px] font-mono text-zinc-400 border-b border-white/10">
                        <th className="px-4 py-2">Batter</th>
                        <th className="px-2 py-2 text-right">R</th>
                        <th className="px-2 py-2 text-right">B</th>
                        <th className="px-2 py-2 text-right">4s</th>
                        <th className="px-2 py-2 text-right">6s</th>
                        <th className="px-4 py-2 text-right">SR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/8">
                      {batCard.map((b) => (
                        <tr key={b.playerId}>
                          <td className="px-4 py-2">
                            <p className="font-bold text-white">{b.name}</p>
                            <p className="text-[11px] text-zinc-400">{b.dismissalText}</p>
                          </td>
                          <td className="px-2 py-2 text-right font-mono font-bold text-[#FFE600]">
                            {b.runs}
                          </td>
                          <td className="px-2 py-2 text-right font-mono text-zinc-300">
                            {b.balls}
                          </td>
                          <td className="px-2 py-2 text-right font-mono text-zinc-300">
                            {b.fours}
                          </td>
                          <td className="px-2 py-2 text-right font-mono text-zinc-300">
                            {b.sixes}
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-zinc-300">
                            {b.sr}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="px-4 py-2 bg-[#0C0C12] border-y border-white/10 flex flex-wrap justify-between gap-2 text-xs text-zinc-300 font-mono">
                  <span>
                    Extras: <strong>{totalExtras}</strong> (wd {inn.extras.wd}, nb {inn.extras.nb}, lb{' '}
                    {inn.extras.lb}, b {inn.extras.bye}, pen {inn.extras.penalty})
                  </span>
                  <span>
                    Total: <strong className="text-white">{inn.runs}/{inn.wickets}</strong>
                  </span>
                </div>

                {/* Fall of Wickets */}
                {inn.fallOfWickets.length > 0 && (
                  <div className="px-4 py-2.5 text-xs text-zinc-300 border-b border-white/10">
                    <span className="font-bold text-[#FFE600] mr-2">Fall of Wickets:</span>
                    {inn.fallOfWickets.map((f, fi) => (
                      <span key={f.wicketNumber} className="mr-3 inline-block">
                        {f.scoreAtFall}-{f.wicketNumber} ({f.playerName}, {f.oversAtFall} ov)
                        {fi < inn.fallOfWickets.length - 1 ? ',' : ''}
                      </span>
                    ))}
                  </div>
                )}

                {/* Bowling Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-[#0C0C12] text-[11px] font-mono text-zinc-400 border-b border-white/10">
                        <th className="px-4 py-2">Bowler ({bowlTeam?.shortName})</th>
                        <th className="px-2 py-2 text-right">O</th>
                        <th className="px-2 py-2 text-right">M</th>
                        <th className="px-2 py-2 text-right">R</th>
                        <th className="px-2 py-2 text-right">W</th>
                        <th className="px-4 py-2 text-right">Eco</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/8">
                      {bowlCard.map((bw) => (
                        <tr key={bw.playerId}>
                          <td className="px-4 py-2 font-semibold text-white">{bw.name}</td>
                          <td className="px-2 py-2 text-right font-mono text-zinc-300">{bw.overs}</td>
                          <td className="px-2 py-2 text-right font-mono text-zinc-300">{bw.maidens}</td>
                          <td className="px-2 py-2 text-right font-mono text-zinc-300">{bw.runs}</td>
                          <td className="px-2 py-2 text-right font-mono font-bold text-[#FFE600]">
                            {bw.wickets}
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-emerald-300">
                            {bw.economy}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 3: OVERS */}
      {tab === 'OVERS' && (
        <div className="space-y-5">
          {([0, 1] as const).map((idx) => {
            const inn = match.innings[idx];
            const batTeam = teamMap.get(inn.battingTeamId);
            const bowlTeam = teamMap.get(inn.bowlingTeamId);
            const list = computeOversBreakdown(inn);
            return (
              <div
                key={idx}
                className="rounded-2xl bg-[#111116] border border-white/12 overflow-hidden"
              >
                <div className="px-4 py-3 bg-[#171721] border-b border-white/10 flex items-center justify-between">
                  <h3 className="font-display font-black text-sm text-[#FFE600]">
                    {idx === 0 ? '1st Innings Overs' : '2nd Innings Overs'} · {batTeam?.name}
                  </h3>
                  <span className="font-mono text-xs text-white font-bold">
                    {inn.runs}-{inn.wickets} ({formatOvers(inn.legalBalls)})
                  </span>
                </div>

                {list.length === 0 ? (
                  <p className="p-6 text-center text-xs text-zinc-400">No deliveries bowled yet.</p>
                ) : (
                  <div className="divide-y divide-white/8">
                    {list.map((ov) => {
                      const bName =
                        bowlTeam?.players.find((p) => p.id === ov.bowlerId)?.name || 'Bowler';
                      return (
                        <div
                          key={ov.overNumber}
                          className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                        >
                          <div className="flex items-center gap-3">
                            <span className="px-2.5 py-1 rounded-lg bg-[#DC2626]/25 border border-[#DC2626]/45 font-mono text-xs font-black text-[#FFE600]">
                              OV {ov.overNumber}
                            </span>
                            <div>
                              <p className="text-xs font-bold text-white">{bName}</p>
                              <p className="text-[11px] font-mono text-zinc-400">
                                {ov.runsInOver} runs · {ov.wicketsInOver} wkt · Score:{' '}
                                {ov.cumulativeRuns}/{ov.cumulativeWickets}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5">
                            {ov.balls.map((b) => (
                              <span
                                key={b.id}
                                className={`min-w-[28px] h-7 px-2 rounded-full inline-flex items-center justify-center font-mono font-bold text-[11px] ${
                                  b.isWicket
                                    ? 'bg-[#DC2626] text-white'
                                    : b.runsOffBat >= 4
                                      ? 'bg-[#FFE600] text-black'
                                      : 'bg-zinc-800 text-zinc-200 border border-white/15'
                                }`}
                              >
                                {getBallPillLabel(b)}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Extras Modal (NB / WD / LB / BYE) */}
      {extraModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
        >
          <div className="w-full max-w-sm rounded-2xl bg-[#111116] border border-emerald-400/50 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-black text-base text-white">
                {extraModal === 'WD'
                  ? 'Wide Ball (+ Extra Runs)'
                  : extraModal === 'NB'
                    ? 'No Ball (+ Runs Off Bat)'
                    : extraModal === 'LB'
                      ? 'Leg Bye Runs'
                      : 'Bye Runs'}
              </h3>
              <button
                type="button"
                onClick={() => setExtraModal(null)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[0, 1, 2, 3, 4, 6].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => {
                    if (extraModal === 'WD') {
                      recordBall({ extraType: 'WD', extraRuns: 1 + n, runsOffBat: 0 });
                    } else if (extraModal === 'NB') {
                      recordBall({
                        extraType: 'NB',
                        extraRuns: 1,
                        runsOffBat: n,
                        isBoundary4: n === 4,
                        isBoundary6: n === 6,
                      });
                    } else if (extraModal === 'LB') {
                      recordBall({ extraType: 'LB', extraRuns: Math.max(1, n), runsOffBat: 0 });
                    } else {
                      recordBall({ extraType: 'BYE', extraRuns: Math.max(1, n), runsOffBat: 0 });
                    }
                    setExtraModal(null);
                  }}
                  className="py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-black text-sm"
                >
                  {extraModal === 'WD'
                    ? `WD+${n}`
                    : extraModal === 'NB'
                      ? `NB+${n}`
                      : `${extraModal} ${Math.max(1, n)}`}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Custom Runs 7-13+ Modal */}
      {customRunsModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
        >
          <div className="w-full max-w-sm rounded-2xl bg-[#111116] border border-blue-400/50 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-black text-base text-white">
                Custom Runs (7 – 13+)
              </h3>
              <button
                type="button"
                onClick={() => setCustomRunsModalOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[7, 8, 9, 10, 11, 12, 13, 14].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    recordBall({ runsOffBat: r });
                    setCustomRunsModalOpen(false);
                    onToast(`+${r} runs recorded`);
                  }}
                  className="py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono font-black text-base"
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* More Options Modal */}
      {moreModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="w-full max-w-md rounded-2xl bg-[#111116] border border-teal-400/45 p-5 space-y-4 my-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-black text-base text-white uppercase">
                Match Controls (More)
              </h3>
              <button
                type="button"
                onClick={() => setMoreModalOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleEndInnings}
                className="py-2.5 px-3 rounded-xl bg-[#FFE600] hover:bg-[#FEF08A] text-black font-black text-xs uppercase"
              >
                {activeInnIdx === 0 ? 'End 1st Innings' : 'End 2nd Innings'}
              </button>
              <button
                type="button"
                onClick={handleCompleteMatch}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase"
              >
                Complete Match
              </button>
            </div>

            {/* Change Target */}
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={newTargetInput}
                onChange={(e) => setNewTargetInput(e.target.value)}
                placeholder="New Target (2nd Inn)"
                className="flex-1 px-3 py-2 rounded-lg bg-[#09090D] border border-white/15 text-xs text-white"
              />
              <button
                type="button"
                onClick={() => {
                  const val = Math.max(1, Number(newTargetInput) || 1);
                  mutateActiveMatch((m) => {
                    const nextInns = [
                      structuredClone(m.innings[0]),
                      structuredClone(m.innings[1]),
                    ] as CricketMatch['innings'];
                    nextInns[1].target = val;
                    return { ...m, innings: nextInns };
                  });
                  onToast(`Target updated to ${val}`);
                }}
                className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs whitespace-nowrap"
              >
                Change Target
              </button>
            </div>

            {/* Change Overs */}
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={50}
                value={newOversInput}
                onChange={(e) => setNewOversInput(e.target.value)}
                placeholder="Max Overs"
                className="flex-1 px-3 py-2 rounded-lg bg-[#09090D] border border-white/15 text-xs text-white"
              />
              <button
                type="button"
                onClick={() => {
                  const val = Math.max(1, Number(newOversInput) || 5);
                  mutateActiveMatch((m) => {
                    const nextInns = [
                      structuredClone(m.innings[0]),
                      structuredClone(m.innings[1]),
                    ] as CricketMatch['innings'];
                    nextInns[0].maxOvers = val;
                    nextInns[1].maxOvers = val;
                    return { ...m, oversPerInnings: val, innings: nextInns };
                  });
                  onToast(`Overs changed to ${val}`);
                }}
                className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs whitespace-nowrap"
              >
                Change Overs
              </button>
            </div>

            {/* Penalty Runs */}
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={25}
                value={penaltyRunsInput}
                onChange={(e) => setPenaltyRunsInput(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg bg-[#09090D] border border-white/15 text-xs text-white"
              />
              <button
                type="button"
                onClick={() => {
                  const pen = Math.max(1, Number(penaltyRunsInput) || 5);
                  recordBall({ extraType: 'PENALTY', extraRuns: pen, runsOffBat: 0 });
                  setMoreModalOpen(false);
                  onToast(`+${pen} Penalty Runs added`);
                }}
                className="px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-black text-xs whitespace-nowrap"
              >
                Penalty Runs
              </button>
            </div>

            {/* Walk Over */}
            <div className="pt-2 border-t border-white/10 space-y-2">
              <p className="text-[11px] font-bold uppercase text-zinc-400">Walk Over Winner</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleWalkOver('team1')}
                  className="py-2 px-2 rounded-lg bg-[#DC2626]/25 hover:bg-[#DC2626] border border-[#DC2626]/50 text-white text-xs font-bold truncate"
                >
                  {team1?.shortName} Walk Over
                </button>
                <button
                  type="button"
                  onClick={() => handleWalkOver('team2')}
                  className="py-2 px-2 rounded-lg bg-[#DC2626]/25 hover:bg-[#DC2626] border border-[#DC2626]/50 text-white text-xs font-bold truncate"
                >
                  {team2?.shortName} Walk Over
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Innings Edit Modal */}
      {editInningsIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
        >
          <div className="w-full max-w-sm rounded-2xl bg-[#111116] border border-[#FFE600]/45 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-black text-base text-white">
                Edit {editInningsIndex === 0 ? '1st Innings' : '2nd Innings'} Score
              </h3>
              <button
                type="button"
                onClick={() => setEditInningsIndex(null)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveManualInnings} className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Runs</label>
                  <input
                    type="number"
                    min={0}
                    value={editRuns}
                    onChange={(e) => setEditRuns(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#09090D] border border-white/15 text-sm font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Wickets</label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={editWickets}
                    onChange={(e) => setEditWickets(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#09090D] border border-white/15 text-sm font-mono text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Overs</label>
                  <input
                    type="number"
                    min={0}
                    value={editOvers}
                    onChange={(e) => setEditOvers(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#09090D] border border-white/15 text-sm font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Balls (0-5)</label>
                  <input
                    type="number"
                    min={0}
                    max={5}
                    value={editBalls}
                    onChange={(e) => setEditBalls(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#09090D] border border-white/15 text-sm font-mono text-white"
                  />
                </div>
              </div>

              {editInningsIndex === 1 && (
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Target</label>
                  <input
                    type="number"
                    min={1}
                    value={editTarget}
                    onChange={(e) => setEditTarget(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#09090D] border border-white/15 text-sm font-mono text-white"
                  />
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#FFE600] hover:bg-[#FEF08A] text-black font-black text-sm uppercase"
              >
                Save Score Correction
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Player Selector Modal (Striker / Non-Striker / Bowler) */}
      {playerPickerMode && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
        >
          <div className="w-full max-w-sm rounded-2xl bg-[#111116] border border-blue-400/50 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-black text-base text-white uppercase">
                Select{' '}
                {playerPickerMode === 'striker'
                  ? 'Striker'
                  : playerPickerMode === 'nonStriker'
                    ? 'Non-Striker'
                    : 'Bowler'}
              </h3>
              <button
                type="button"
                onClick={() => setPlayerPickerMode(null)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-1.5">
              {(playerPickerMode === 'bowler'
                ? bowlingTeam?.players || []
                : battingTeam?.players || []
              ).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPlayer(p.id)}
                  className="w-full text-left px-3.5 py-2.5 rounded-xl bg-[#09090D] hover:bg-blue-600/30 border border-white/10 hover:border-blue-400/60 text-sm font-semibold text-white flex items-center justify-between"
                >
                  <span>{p.name}</span>
                  <span className="text-[11px] font-mono text-zinc-400">{p.role}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
