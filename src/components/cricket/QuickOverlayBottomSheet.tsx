import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { EyeOff, X } from 'lucide-react';
import {
  BATSMAN_STATS_MODES,
  BOWLER_STATS_MODES,
  type BatsmanStatsMode,
  type BottomScoreMode,
  type BowlerStatsMode,
  type CricketMatch,
  type CricketSuiteState,
  type HighlightMode,
  type MatchStatsMode,
  type Team,
} from '../../types/cricketSuite';

type SheetTab = 'BOTTOM_SCORE' | 'MATCH_STATS' | 'MESSAGE';
type MessageSubTab = 'CUSTOM MSG' | 'HIGHLIGHT';

const SHEET_BOTTOM_SCORE_MODES: BottomScoreMode[] = [
  'EMPTY',
  'Score',
  'Bottom Need',
  'Last 15 Balls',
  'Toss',
  'Need',
  'Versus',
  'Versus With Logo',
  'Current Partnership',
  'Result',
  'Projected Score',
  'Mini Curr. Partnership',
  'Mini Match Comparison',
  'Mini Player Position',
  'Last Wicket',
  'Last Bowler',
  "6's",
  "4's",
  'Tournament Name',
];

const SHEET_MATCH_STATS_MODES: MatchStatsMode[] = [
  'Batting card',
  'Mini Batting card',
  'Bowling card',
  'Mini Bowling card',
  '1st inn Batting card',
  '1st inn Bowling card',
  'Player Position',
  '1st Inn Wagonwheel',
  '2nd Inn Wagonwheel',
  'Batting Playing XI',
  'Bowling Playing XI',
  'Both Playing XI',
  'Match Summary',
  'Match Comparison',
];

const SHEET_HIGHLIGHT_MODES: HighlightMode[] = [
  '1st inning',
  '2nd inning',
  '1st inn FOW',
  '2nd inn FOW',
  'CR Partnership',
];

export interface QuickOverlayBottomSheetProps {
  open: boolean;
  onClose: () => void;
  state: CricketSuiteState;
  match: CricketMatch;
  teamMap: Map<string, Team>;
  updateState: (updater: (prev: CricketSuiteState) => CricketSuiteState) => void;
  onToast: (msg: string) => void;
}

export function QuickOverlayBottomSheet({
  open,
  onClose,
  state,
  match,
  teamMap,
  updateState,
  onToast,
}: QuickOverlayBottomSheetProps) {
  const [activeTab, setActiveTab] = useState<SheetTab>('BOTTOM_SCORE');
  const [playerStatsDrawer, setPlayerStatsDrawer] = useState<'none' | 'batsman' | 'bowler'>('none');
  const [msgSubTab, setMsgSubTab] = useState<MessageSubTab>('CUSTOM MSG');
  const [msgHeading, setMsgHeading] = useState(state.overlay.customMsgHeading || '');
  const [msgDescription, setMsgDescription] = useState(
    state.overlay.customMsgDescription || state.user.channelTitle || 'STAR EVENT LIVE'
  );

  const curInn = match.innings[match.currentInningsIndex];
  const batTeam = teamMap.get(curInn.battingTeamId);
  const bowlTeam = teamMap.get(curInn.bowlingTeamId);
  const team1 = teamMap.get(match.team1Id);
  const team2 = teamMap.get(match.team2Id);
  const tournament = state.tournaments.find((t) => t.id === match.tournamentId);

  const allMatchPlayers = useMemo(
    () => [...(team1?.players ?? []), ...(team2?.players ?? [])],
    [team1?.players, team2?.players]
  );

  const [selectedBatsmanId, setSelectedBatsmanId] = useState<string>(
    curInn.strikerId || batTeam?.players[0]?.id || ''
  );
  const [selectedBowlerId, setSelectedBowlerId] = useState<string>(
    curInn.bowlerId || bowlTeam?.players[0]?.id || ''
  );

  useEffect(() => {
    if (!open) return;
    setSelectedBatsmanId(
      curInn.strikerId || state.overlay.selectedBatsmanId || batTeam?.players[0]?.id || ''
    );
    setSelectedBowlerId(
      curInn.bowlerId || state.overlay.selectedBowlerId || bowlTeam?.players[0]?.id || ''
    );
    setMsgHeading((prev) => prev || state.overlay.customMsgHeading || tournament?.name || '');
    setMsgDescription(
      (prev) =>
        prev ||
        state.overlay.customMsgDescription ||
        state.user.channelTitle ||
        'STAR EVENT LIVE'
    );
  }, [
    open,
    curInn.strikerId,
    curInn.bowlerId,
    state.overlay.selectedBatsmanId,
    state.overlay.selectedBowlerId,
    state.overlay.customMsgHeading,
    state.overlay.customMsgDescription,
    batTeam?.players,
    bowlTeam?.players,
    tournament?.name,
    state.user.channelTitle,
  ]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const { overlay } = state;

  const handleSelectBottomMode = (mode: BottomScoreMode) => {
    const nextMode: BottomScoreMode = mode === 'EMPTY' ? 'EMPTY' : mode;
    updateState((prev) => ({
      ...prev,
      activeMatchId: match.id,
      overlay: {
        ...prev.overlay,
        bottomScoreMode: nextMode,
        mainCard: { kind: 'NONE' },
        activeTransition: null,
      },
    }));
    onToast(nextMode === 'EMPTY' ? 'Overlay cleared (EMPTY).' : `Bottom Score: ${nextMode}`);
  };

  const handleTriggerBatsmanStats = (mode: BatsmanStatsMode, playerId?: string) => {
    const pid = playerId || selectedBatsmanId || curInn.strikerId || batTeam?.players[0]?.id || '';
    if (!pid) {
      onToast('Select a batsman first.');
      return;
    }
    const isSameActive =
      overlay.mainCard.kind === 'BATSMAN_STATS' &&
      overlay.mainCard.mode === mode &&
      overlay.mainCard.playerId === pid;
    updateState((prev) => ({
      ...prev,
      activeMatchId: match.id,
      overlay: {
        ...prev.overlay,
        selectedBatsmanId: pid,
        bottomScoreMode: 'EMPTY',
        activeTransition: null,
        mainCard: isSameActive ? { kind: 'NONE' } : { kind: 'BATSMAN_STATS', mode, playerId: pid },
      },
    }));
    onToast(isSameActive ? 'Batsman Stats hidden.' : `Batsman Stats (${mode}) live on overlay.`);
  };

  const handleTriggerBowlerStats = (mode: BowlerStatsMode, playerId?: string) => {
    const pid = playerId || selectedBowlerId || curInn.bowlerId || bowlTeam?.players[0]?.id || '';
    if (!pid) {
      onToast('Select a bowler first.');
      return;
    }
    const isSameActive =
      overlay.mainCard.kind === 'BOWLER_STATS' &&
      overlay.mainCard.mode === mode &&
      overlay.mainCard.playerId === pid;
    updateState((prev) => ({
      ...prev,
      activeMatchId: match.id,
      overlay: {
        ...prev.overlay,
        selectedBowlerId: pid,
        bottomScoreMode: 'EMPTY',
        activeTransition: null,
        mainCard: isSameActive ? { kind: 'NONE' } : { kind: 'BOWLER_STATS', mode, playerId: pid },
      },
    }));
    onToast(isSameActive ? 'Bowler Stats hidden.' : `Bowler Stats (${mode}) live on overlay.`);
  };

  const handleToggleMatchStat = (mode: MatchStatsMode) => {
    const isSame = overlay.mainCard.kind === 'MATCH_STATS' && overlay.mainCard.mode === mode;
    updateState((prev) => ({
      ...prev,
      activeMatchId: match.id,
      overlay: {
        ...prev.overlay,
        bottomScoreMode: 'EMPTY',
        activeTransition: null,
        mainCard: isSame ? { kind: 'NONE' } : { kind: 'MATCH_STATS', mode },
      },
    }));
    onToast(isSame ? `${mode} hidden from overlay.` : `${mode} live on overlay.`);
  };

  const handleToggleHighlight = (mode: HighlightMode) => {
    const isSame = overlay.mainCard.kind === 'HIGHLIGHTS' && overlay.mainCard.mode === mode;
    updateState((prev) => ({
      ...prev,
      activeMatchId: match.id,
      overlay: {
        ...prev.overlay,
        bottomScoreMode: 'EMPTY',
        activeTransition: null,
        mainCard: isSame ? { kind: 'NONE' } : { kind: 'HIGHLIGHTS', mode },
      },
    }));
    onToast(isSame ? `${mode} hidden from overlay.` : `Highlight: ${mode} live on overlay.`);
  };

  const handleTogglePom = () => {
    const pomId =
      match.playerOfMatchId ||
      overlay.selectedPomPlayerId ||
      curInn.strikerId ||
      allMatchPlayers[0]?.id ||
      '';
    if (!pomId) {
      onToast('No player available for Player of the Match.');
      return;
    }
    const isSame = overlay.mainCard.kind === 'PLAYER_OF_MATCH';
    updateState((prev) => ({
      ...prev,
      activeMatchId: match.id,
      overlay: {
        ...prev.overlay,
        selectedPomPlayerId: pomId,
        bottomScoreMode: 'EMPTY',
        activeTransition: null,
        mainCard: isSame
          ? { kind: 'NONE' }
          : { kind: 'PLAYER_OF_MATCH', playerId: pomId, display: 'Stats' },
      },
    }));
    onToast(isSame ? 'Player Of The Match hidden.' : 'Player Of The Match live on overlay.');
  };

  const handleSendCustomMessage = () => {
    const cleanHeading = msgHeading.trim();
    const cleanDesc = msgDescription.trim();
    if (!cleanHeading && !cleanDesc) {
      onToast('Enter a Heading or Description first.');
      return;
    }
    const mappedTab = msgSubTab === 'CUSTOM MSG' ? 'CUSTOM MSG' : 'OTHER';
    updateState((prev) => ({
      ...prev,
      activeMatchId: match.id,
      overlay: {
        ...prev.overlay,
        bottomScoreMode: 'Score',
        activeTransition: null,
        customMsgTab: mappedTab,
        customMsgHeading: cleanHeading,
        customMsgDescription: cleanDesc,
        mainCard: {
          kind: 'CUSTOM_MESSAGE',
          tab: mappedTab,
          heading: cleanHeading,
          description: cleanDesc,
        },
      },
    }));
    onToast(
      msgSubTab === 'CUSTOM MSG'
        ? 'Custom Message live on scoreboard bar!'
        : 'Highlight live on scoreboard bar!'
    );
  };

  const handleHideMainCard = () => {
    updateState((prev) => ({
      ...prev,
      overlay: {
        ...prev.overlay,
        mainCard: { kind: 'NONE' },
      },
    }));
    onToast('Overlay popup card hidden.');
  };

  // Orange & White Theme Button Styling (matches STAR EVENT LIVE dashboard)
  const orangeBtnClass = (active: boolean) =>
    `px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-[8px] text-[12px] sm:text-[13px] font-bold leading-tight transition-all border whitespace-nowrap ${
      active
        ? 'bg-gradient-to-r from-[#FF8C00] to-[#EA580C] text-white border-[#C2410C] ring-2 ring-[#FDBA74] shadow-sm'
        : 'bg-white hover:bg-[#FFF3E0] text-[#C25900] border-[#FF8C00]/55 hover:border-[#FF8C00] shadow-2xs'
    }`;

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="Quick Live Overlay Controls"
        >
          {/* Dimmed backdrop — tap anywhere above to return straight to scoring */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/50"
          />

          {/* Bottom Sheet Container (Orange & White Theme) */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            className="relative z-10 w-full max-w-2xl mx-auto bg-white border-t-2 border-x border-[#FF8C00] shadow-[0_-16px_45px_rgba(2,6,23,0.45)] overflow-hidden rounded-t-xl sm:rounded-t-2xl max-h-[82vh] flex flex-col"
          >
            {/* Orange & White 3-Tab Header */}
            <div className="wo-header flex items-stretch relative shrink-0">
              {(
                [
                  { id: 'BOTTOM_SCORE', label: 'BOTTOM SCORE' },
                  { id: 'MATCH_STATS', label: 'MATCH STATS' },
                  { id: 'MESSAGE', label: 'MESSAGE' },
                ] as const
              ).map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 py-3 px-2 text-center font-display font-extrabold text-[11px] sm:text-xs tracking-wider uppercase transition-colors border-b-[3px] whitespace-nowrap ${
                      isActive
                        ? 'bg-white text-[#E87500] border-[#FF8C00]'
                        : 'text-white/95 hover:bg-white/15 border-transparent'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={onClose}
                aria-label="Close overlay drawer"
                className="px-3 text-white/90 hover:text-white hover:bg-white/15 transition-colors flex items-center justify-center shrink-0"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            {/* Active Main Card Quick Hide Strip */}
            {overlay.mainCard.kind !== 'NONE' && (
              <div className="px-3 py-1.5 bg-[#FFF3E0] border-b border-[#FF8C00]/30 flex items-center justify-between gap-2 text-[11px] text-slate-800 shrink-0">
                <span className="font-semibold truncate">
                  Live on Overlay:{' '}
                  <strong className="text-[#C2410C]">
                    {overlay.mainCard.kind === 'MATCH_STATS'
                      ? overlay.mainCard.mode
                      : overlay.mainCard.kind === 'HIGHLIGHTS'
                        ? overlay.mainCard.mode
                        : overlay.mainCard.kind === 'CUSTOM_MESSAGE'
                          ? overlay.mainCard.heading || 'Custom Message'
                          : overlay.mainCard.kind.replace(/_/g, ' ')}
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={handleHideMainCard}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold shrink-0"
                >
                  <EyeOff className="w-3 h-3" aria-hidden="true" />
                  <span>Hide Card</span>
                </button>
              </div>
            )}

            {/* Scrollable White Body */}
            <div className="p-3 sm:p-4 overflow-y-auto space-y-2.5 bg-white">
              {/* ================= TAB 1: BOTTOM SCORE ================= */}
              {activeTab === 'BOTTOM_SCORE' && (
                <>
                  {/* Main Bottom Score Mode Buttons Box */}
                  <div className="rounded-lg border border-orange-200 p-2.5 sm:p-3 bg-[#FFFBF5]">
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {SHEET_BOTTOM_SCORE_MODES.map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => handleSelectBottomMode(mode)}
                          className={orangeBtnClass(
                            overlay.bottomScoreMode === mode && overlay.mainCard.kind === 'NONE'
                          )}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Bottom Box: Batsman Stats & Bowler Stats */}
                  <div className="rounded-lg border border-orange-200 p-2.5 sm:p-3 bg-white space-y-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPlayerStatsDrawer((prev) =>
                            prev === 'batsman' ? 'none' : 'batsman'
                          );
                          handleTriggerBatsmanStats('batsman');
                        }}
                        className={orangeBtnClass(
                          playerStatsDrawer === 'batsman' ||
                            overlay.mainCard.kind === 'BATSMAN_STATS'
                        )}
                      >
                        Batsman Stats
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPlayerStatsDrawer((prev) =>
                            prev === 'bowler' ? 'none' : 'bowler'
                          );
                          handleTriggerBowlerStats('bowler');
                        }}
                        className={orangeBtnClass(
                          playerStatsDrawer === 'bowler' ||
                            overlay.mainCard.kind === 'BOWLER_STATS'
                        )}
                      >
                        Bowler Stats
                      </button>
                    </div>

                    {/* Inline Batsman Stats Selector */}
                    {playerStatsDrawer === 'batsman' && (
                      <div className="pt-2 border-t border-orange-100 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="text-[11px] font-bold text-[#C25900] uppercase">
                            Batsman:
                          </label>
                          <select
                            value={selectedBatsmanId}
                            onChange={(e) => setSelectedBatsmanId(e.target.value)}
                            className="flex-1 min-w-[160px] px-2.5 py-1.5 rounded-lg border border-orange-300 bg-[#FFFBF5] text-xs font-semibold text-slate-900 focus:border-[#FF8C00] focus:outline-none"
                          >
                            {(batTeam?.players ?? []).map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                                {p.id === curInn.strikerId ? ' (Striker)' : ''}
                                {p.id === curInn.nonStrikerId ? ' (Non-Striker)' : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {BATSMAN_STATS_MODES.map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => handleTriggerBatsmanStats(m, selectedBatsmanId)}
                              className={orangeBtnClass(
                                overlay.mainCard.kind === 'BATSMAN_STATS' &&
                                  overlay.mainCard.mode === m &&
                                  overlay.mainCard.playerId === selectedBatsmanId
                              )}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Inline Bowler Stats Selector */}
                    {playerStatsDrawer === 'bowler' && (
                      <div className="pt-2 border-t border-orange-100 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="text-[11px] font-bold text-[#C25900] uppercase">
                            Bowler:
                          </label>
                          <select
                            value={selectedBowlerId}
                            onChange={(e) => setSelectedBowlerId(e.target.value)}
                            className="flex-1 min-w-[160px] px-2.5 py-1.5 rounded-lg border border-orange-300 bg-[#FFFBF5] text-xs font-semibold text-slate-900 focus:border-[#FF8C00] focus:outline-none"
                          >
                            {(bowlTeam?.players ?? []).map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                                {p.id === curInn.bowlerId ? ' (Current Bowler)' : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {BOWLER_STATS_MODES.map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => handleTriggerBowlerStats(m, selectedBowlerId)}
                              className={orangeBtnClass(
                                overlay.mainCard.kind === 'BOWLER_STATS' &&
                                  overlay.mainCard.mode === m &&
                                  overlay.mainCard.playerId === selectedBowlerId
                              )}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* ================= TAB 2: MATCH STATS ================= */}
              {activeTab === 'MATCH_STATS' && (
                <>
                  {/* Top Box: Match Stats Buttons */}
                  <div className="rounded-lg border border-orange-200 p-2.5 sm:p-3 bg-[#FFFBF5]">
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {SHEET_MATCH_STATS_MODES.map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => handleToggleMatchStat(mode)}
                          className={orangeBtnClass(
                            overlay.mainCard.kind === 'MATCH_STATS' &&
                              overlay.mainCard.mode === mode
                          )}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Bottom Box: Highlights + Player Of The Match */}
                  <div className="rounded-lg border border-orange-200 p-2.5 sm:p-3 bg-white">
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {SHEET_HIGHLIGHT_MODES.map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => handleToggleHighlight(mode)}
                          className={orangeBtnClass(
                            overlay.mainCard.kind === 'HIGHLIGHTS' &&
                              overlay.mainCard.mode === mode
                          )}
                        >
                          {mode}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={handleTogglePom}
                        className={orangeBtnClass(overlay.mainCard.kind === 'PLAYER_OF_MATCH')}
                      >
                        Player Of The Match
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* ================= TAB 3: MESSAGE ================= */}
              {activeTab === 'MESSAGE' && (
                <div className="rounded-lg border border-orange-200 p-3 sm:p-4 bg-white space-y-4">
                  {/* Sub-tabs: CUSTOM MSG | HIGHLIGHT (Orange & White) */}
                  <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-orange-200">
                    <button
                      type="button"
                      onClick={() => setMsgSubTab('CUSTOM MSG')}
                      className={`py-2.5 text-center font-display font-extrabold text-xs tracking-wider uppercase transition-colors ${
                        msgSubTab === 'CUSTOM MSG'
                          ? 'bg-gradient-to-r from-[#FF8C00] to-[#EA580C] text-white'
                          : 'bg-[#FFF3E0] text-[#C25900] hover:bg-[#FFE4BD]'
                      }`}
                    >
                      CUSTOM MSG
                    </button>
                    <button
                      type="button"
                      onClick={() => setMsgSubTab('HIGHLIGHT')}
                      className={`py-2.5 text-center font-display font-extrabold text-xs tracking-wider uppercase transition-colors ${
                        msgSubTab === 'HIGHLIGHT'
                          ? 'bg-gradient-to-r from-[#FF8C00] to-[#EA580C] text-white'
                          : 'bg-[#FFF3E0] text-[#C25900] hover:bg-[#FFE4BD]'
                      }`}
                    >
                      HIGHLIGHT
                    </button>
                  </div>

                  {/* Clean Underline Inputs (Heading + Description) */}
                  <div className="space-y-4 px-1">
                    <div>
                      <label
                        htmlFor="quick-overlay-msg-heading"
                        className="block text-[11px] font-bold text-[#C25900] uppercase tracking-wider mb-0.5"
                      >
                        Heading
                      </label>
                      <input
                        id="quick-overlay-msg-heading"
                        type="text"
                        value={msgHeading}
                        onChange={(e) => setMsgHeading(e.target.value)}
                        placeholder={tournament?.name || 'Enter broadcast heading...'}
                        className="w-full py-1.5 border-b-2 border-orange-200 focus:border-[#FF8C00] focus:outline-none text-sm font-semibold text-slate-900 bg-transparent"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="quick-overlay-msg-desc"
                        className="block text-[11px] font-bold text-[#C25900] uppercase tracking-wider mb-0.5"
                      >
                        Description
                      </label>
                      <input
                        id="quick-overlay-msg-desc"
                        type="text"
                        value={msgDescription}
                        onChange={(e) => setMsgDescription(e.target.value)}
                        placeholder={state.user.channelTitle || 'STAR EVENT LIVE'}
                        className="w-full py-1.5 border-b-2 border-orange-200 focus:border-[#FF8C00] focus:outline-none text-sm font-semibold text-slate-900 bg-transparent"
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleSendCustomMessage}
                        className="px-6 py-2.5 rounded-lg wo-btn-primary text-white font-display font-extrabold text-xs uppercase tracking-wider shadow-sm transition-colors"
                      >
                        {msgSubTab === 'CUSTOM MSG' ? 'CUSTOM MESSAGE' : 'SHOW HIGHLIGHT'}
                      </button>

                      {overlay.mainCard.kind === 'CUSTOM_MESSAGE' && (
                        <button
                          type="button"
                          onClick={handleHideMainCard}
                          className="px-4 py-2.5 rounded-lg wo-btn-soft font-display font-bold text-xs uppercase tracking-wider transition-colors"
                        >
                          HIDE
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
