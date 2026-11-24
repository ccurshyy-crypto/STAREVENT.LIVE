import { useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Send,
  Sparkles,
  Tv,
} from 'lucide-react';
import { computePointTableRows } from '../../data/cricketSampleData';
import {
  BATSMAN_STATS_MODES,
  BOTTOM_SCORE_MODES,
  BOWLER_STATS_MODES,
  CricketSuiteState,
  HIGHLIGHT_MODES,
  MainOverlayCard,
  MATCH_STATS_MODES,
  OverlayControlState,
  TOURNAMENT_STAT_MODES,
  TRANSITION_OVERLAYS,
} from '../../types/cricketSuite';
import { BroadcastOverlayCanvas } from './BroadcastOverlayCanvas';

interface TvOverlayControllerViewProps {
  state: CricketSuiteState;
  overlayUrl: string;
  updateState: (updater: (prev: CricketSuiteState) => CricketSuiteState) => void;
  onCopyOverlayUrl: () => void;
  onGoToGroups: () => void;
  onToast: (msg: string) => void;
}

function ToggleSwitch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#09090D] border border-white/12 hover:border-[#FFE600]/45 transition-colors"
    >
      <span
        className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center ${
          checked ? 'bg-[#DC2626]' : 'bg-zinc-700'
        }`}
      >
        <span
          className={`w-4 h-4 rounded-full bg-[#FFE600] shadow transform transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </span>
      <span className="text-xs font-bold text-zinc-100 whitespace-nowrap">{label}</span>
    </button>
  );
}

export function TvOverlayControllerView({
  state,
  overlayUrl,
  updateState,
  onCopyOverlayUrl,
  onGoToGroups,
  onToast,
}: TvOverlayControllerViewProps) {
  const [copied, setCopied] = useState(false);
  const [showLiveMonitor, setShowLiveMonitor] = useState(true);

  const match =
    state.matches.find((m) => m.id === state.activeMatchId) ?? state.matches[0];
  const tournament =
    state.tournaments.find((t) => t.id === state.activeTournamentId) ??
    state.tournaments[0];
  const teamMap = new Map(state.teams.map((t) => [t.id, t]));
  const team1 = match ? teamMap.get(match.team1Id) : undefined;
  const team2 = match ? teamMap.get(match.team2Id) : undefined;
  const matchPlayers = [...(team1?.players || []), ...(team2?.players || [])];

  const ov = state.overlay;

  const setOverlay = (patch: Partial<OverlayControlState>) => {
    updateState((prev) => ({
      ...prev,
      overlay: { ...prev.overlay, ...patch },
    }));
  };

  const setMainCard = (card: MainOverlayCard, label?: string) => {
    setOverlay({ mainCard: card });
    if (label) onToast(`Broadcast live: ${label}`);
  };

  const handleCopy = () => {
    onCopyOverlayUrl();
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const tourGroups = state.groups.filter((g) => g.tournamentId === state.activeTournamentId);
  const pointRows = computePointTableRows(state, state.activeTournamentId);
  const selectedTeamObj = state.teams.find((t) => t.id === ov.selectedTeamForStatsId);

  const sectionCardCls =
    'rounded-2xl bg-[#111116] border border-white/12 p-4 space-y-3 shadow-lg';
  const sectionTitleCls =
    'font-display font-black text-xs sm:text-sm uppercase tracking-wider text-[#FFE600] flex items-center justify-between gap-2 pb-2 border-b border-white/10';

  return (
    <div className="space-y-4">
      {/* Top vMix Link Bar + 3 Switches + Live Monitor Toggle */}
      <div className="rounded-2xl bg-[#111116] border border-[#FFE600]/35 p-4 space-y-3.5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
            <span className="font-mono text-xs font-black text-[#FFE600] whitespace-nowrap">
              Vmix Link :-
            </span>
            <div className="flex-1 min-w-[180px] flex items-center gap-1.5 rounded-lg bg-[#09090D] border border-white/15 px-3 py-1.5">
              <span className="font-mono text-xs text-zinc-200 truncate flex-1">
                {overlayUrl}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                aria-label="Copy Vmix Link"
                className="p-1.5 rounded bg-white/10 hover:bg-[#FFE600] text-[#FFE600] hover:text-black transition-colors shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={overlayUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#DC2626] hover:bg-[#EF4444] text-white font-display font-black text-xs uppercase tracking-wide whitespace-nowrap shadow"
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Vmix Overlay Link</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <button
              type="button"
              onClick={() => setShowLiveMonitor((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-zinc-100 whitespace-nowrap"
            >
              {showLiveMonitor ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showLiveMonitor ? 'Hide Monitor' : 'Live Monitor'}</span>
            </button>

            <button
              type="button"
              onClick={() =>
                setOverlay({
                  mainCard: { kind: 'NONE' },
                  activeTransition: null,
                })
              }
              className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-white/15 text-xs font-bold text-amber-300 whitespace-nowrap"
            >
              Clear Card
            </button>
          </div>
        </div>

        {/* 3 Toggle Switches */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-white/10">
          <ToggleSwitch
            label="Player Photo"
            checked={ov.showPlayerPhoto}
            onChange={(val) => setOverlay({ showPlayerPhoto: val })}
          />
          <ToggleSwitch
            label="Team Logo"
            checked={ov.showTeamLogo}
            onChange={(val) => setOverlay({ showTeamLogo: val })}
          />
          <ToggleSwitch
            label="User Channel Logo"
            checked={ov.showChannelLogo}
            onChange={(val) => setOverlay({ showChannelLogo: val })}
          />
        </div>

        {/* Embedded 16:9 Live Preview Monitor */}
        {showLiveMonitor && (
          <div className="pt-2">
            <div
              className="relative aspect-video w-full rounded-xl overflow-hidden border border-[#FFE600]/35"
              style={{
                backgroundColor: '#121218',
                backgroundImage:
                  'linear-gradient(45deg, #1d1d26 25%, transparent 25%), linear-gradient(-45deg, #1d1d26 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1d1d26 75%), linear-gradient(-45deg, transparent 75%, #1d1d26 75%)',
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0',
              }}
            >
              <BroadcastOverlayCanvas state={state} isPreview />
            </div>
          </div>
        )}
      </div>

      {/* 1. Bottom Score (19 Buttons) */}
      <div className={sectionCardCls}>
        <div className={sectionTitleCls}>
          <span>Bottom Score</span>
          <span className="font-mono text-[11px] text-zinc-400">
            Active: {ov.bottomScoreMode}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {BOTTOM_SCORE_MODES.map((mode) => {
            const active = ov.bottomScoreMode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setOverlay({ bottomScoreMode: mode });
                  onToast(`Bottom bar: ${mode}`);
                }}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors border ${
                  active
                    ? 'bg-[#DC2626] border-[#FFE600] text-white shadow'
                    : 'bg-[#181822] hover:bg-white/10 border-white/12 text-zinc-200'
                }`}
              >
                {mode}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Match Stats (18 Buttons) */}
      <div className={sectionCardCls}>
        <div className={sectionTitleCls}>
          <span>Match Stats</span>
          {ov.mainCard.kind === 'MATCH_STATS' && (
            <button
              type="button"
              onClick={() => setMainCard({ kind: 'NONE' })}
              className="text-[11px] font-mono text-red-400 hover:text-red-300"
            >
              Hide Active ({ov.mainCard.mode})
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {MATCH_STATS_MODES.map((mode) => {
            const active = ov.mainCard.kind === 'MATCH_STATS' && ov.mainCard.mode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() =>
                  setMainCard(
                    active ? { kind: 'NONE' } : { kind: 'MATCH_STATS', mode },
                    active ? 'Overlay cleared' : mode
                  )
                }
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors border ${
                  active
                    ? 'bg-[#FFE600] border-white text-black'
                    : 'bg-[#181822] hover:bg-white/10 border-white/12 text-zinc-200'
                }`}
              >
                {mode}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Batsman Stats & Bowler Stats Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={sectionCardCls}>
          <div className={sectionTitleCls}>
            <span>Batsman Stats</span>
          </div>
          <select
            value={ov.selectedBatsmanId}
            onChange={(e) => setOverlay({ selectedBatsmanId: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-[#09090D] border border-white/15 text-xs sm:text-sm text-white"
          >
            <option value="">Please Select Batsman</option>
            {matchPlayers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <div className="flex flex-wrap gap-1.5">
            {BATSMAN_STATS_MODES.map((mode) => {
              const active =
                ov.mainCard.kind === 'BATSMAN_STATS' && ov.mainCard.mode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    const pid = ov.selectedBatsmanId || matchPlayers[0]?.id || '';
                    setMainCard(
                      active
                        ? { kind: 'NONE' }
                        : { kind: 'BATSMAN_STATS', mode, playerId: pid },
                      `Batsman · ${mode}`
                    );
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                    active
                      ? 'bg-[#FFE600] text-black border-white'
                      : 'bg-[#181822] hover:bg-white/10 border-white/12 text-zinc-200'
                  }`}
                >
                  {mode}
                </button>
              );
            })}
          </div>
        </div>

        <div className={sectionCardCls}>
          <div className={sectionTitleCls}>
            <span>Bowler Stats</span>
          </div>
          <select
            value={ov.selectedBowlerId}
            onChange={(e) => setOverlay({ selectedBowlerId: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-[#09090D] border border-white/15 text-xs sm:text-sm text-white"
          >
            <option value="">Please Select Bowler</option>
            {matchPlayers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <div className="flex flex-wrap gap-1.5">
            {BOWLER_STATS_MODES.map((mode) => {
              const active =
                ov.mainCard.kind === 'BOWLER_STATS' && ov.mainCard.mode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    const pid = ov.selectedBowlerId || matchPlayers[0]?.id || '';
                    setMainCard(
                      active
                        ? { kind: 'NONE' }
                        : { kind: 'BOWLER_STATS', mode, playerId: pid },
                      `Bowler · ${mode}`
                    );
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                    active
                      ? 'bg-[#FFE600] text-black border-white'
                      : 'bg-[#181822] hover:bg-white/10 border-white/12 text-zinc-200'
                  }`}
                >
                  {mode}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Transition Overlay + Highlights + Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={sectionCardCls}>
          <div className={sectionTitleCls}>
            <span>Transition Overlay</span>
            <ToggleSwitch
              label="Auto"
              checked={ov.autoTransition}
              onChange={(val) => setOverlay({ autoTransition: val })}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {TRANSITION_OVERLAYS.map((tr) => (
              <button
                key={tr}
                type="button"
                onClick={() => {
                  setOverlay({ activeTransition: { type: tr, id: Date.now() } });
                  onToast(`Transition: ${tr}`);
                }}
                className="px-3 py-2 rounded-lg bg-[#DC2626] hover:bg-[#EF4444] text-white font-bold text-xs shadow inline-flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3 text-[#FFE600]" />
                {tr}
              </button>
            ))}
          </div>
        </div>

        <div className={sectionCardCls}>
          <div className={sectionTitleCls}>
            <span>Highlights</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {HIGHLIGHT_MODES.map((mode) => {
              const active = ov.mainCard.kind === 'HIGHLIGHTS' && ov.mainCard.mode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() =>
                    setMainCard(
                      active ? { kind: 'NONE' } : { kind: 'HIGHLIGHTS', mode },
                      `Highlight · ${mode}`
                    )
                  }
                  className={`px-3 py-2 rounded-lg text-xs font-bold border ${
                    active
                      ? 'bg-[#FFE600] text-black border-white'
                      : 'bg-[#181822] hover:bg-white/10 border-white/12 text-zinc-200'
                  }`}
                >
                  {mode}
                </button>
              );
            })}
          </div>
        </div>

        <div className={sectionCardCls}>
          <div className={sectionTitleCls}>
            <span>Graphs &amp; DayWise Stats</span>
          </div>
          <div className="space-y-2.5">
            <div className="flex flex-wrap gap-2">
              {(['manhatt', 'worm'] as const).map((g) => {
                const active = ov.mainCard.kind === 'GRAPHS' && ov.mainCard.mode === g;
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() =>
                      setMainCard(
                        active ? { kind: 'NONE' } : { kind: 'GRAPHS', mode: g },
                        `Graph · ${g}`
                      )
                    }
                    className={`px-3.5 py-2 rounded-lg text-xs font-bold uppercase border ${
                      active
                        ? 'bg-[#FFE600] text-black border-white'
                        : 'bg-blue-600/25 hover:bg-blue-600/45 border-blue-400/40 text-blue-100'
                    }`}
                  >
                    {g}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-white/10">
              <p className="text-[11px] font-mono text-zinc-400 mb-1.5">DayWise Stats:</p>
              <div className="flex flex-wrap gap-1.5">
                {['Day 1', 'Day 2', 'Day 3', 'Day 4'].map((day) => {
                  const active = ov.mainCard.kind === 'DAY_WISE' && ov.mainCard.day === day;
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() =>
                        setMainCard(
                          active ? { kind: 'NONE' } : { kind: 'DAY_WISE', day },
                          `DayWise · ${day}`
                        )
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                        active
                          ? 'bg-[#FFE600] text-black border-white'
                          : 'bg-[#181822] hover:bg-white/10 border-white/12 text-zinc-200'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Points Table + Custom Message */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={sectionCardCls}>
          <div className={sectionTitleCls}>
            <span>Points Table</span>
            <button
              type="button"
              onClick={() =>
                setMainCard({ kind: 'POINTS_TABLE', groupId: 'ALL' }, 'Points Table')
              }
              className="px-2.5 py-1 rounded bg-[#DC2626] hover:bg-[#EF4444] text-white text-[11px] font-bold"
            >
              Show On TV
            </button>
          </div>

          {tourGroups.length === 0 ? (
            <div className="rounded-xl bg-[#09090D] border border-white/10 p-4 text-center space-y-2">
              <p className="text-xs font-bold text-zinc-300">No Group Found</p>
              <button
                type="button"
                onClick={onGoToGroups}
                className="px-3 py-1.5 rounded-lg bg-[#FFE600] text-black font-black text-xs"
              >
                Create Group
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex flex-wrap gap-1.5">
                {tourGroups.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() =>
                      setMainCard({ kind: 'POINTS_TABLE', groupId: g.id }, `${g.name} Points`)
                    }
                    className="px-3 py-1.5 rounded-lg bg-[#181822] hover:bg-[#FFE600] hover:text-black border border-white/12 text-xs font-bold text-zinc-200 transition-colors"
                  >
                    {g.name}
                  </button>
                ))}
              </div>
              <div className="overflow-x-auto rounded-lg border border-white/10">
                <table className="w-full text-xs font-mono text-left">
                  <thead className="bg-[#09090D] text-zinc-400">
                    <tr>
                      <th className="px-2.5 py-1.5">Team</th>
                      <th className="px-2 py-1.5 text-right">M</th>
                      <th className="px-2 py-1.5 text-right">W</th>
                      <th className="px-2 py-1.5 text-right">Pts</th>
                      <th className="px-2.5 py-1.5 text-right">NRR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/8">
                    {pointRows.slice(0, 6).map((r) => (
                      <tr key={r.teamId}>
                        <td className="px-2.5 py-1.5 font-sans font-bold text-white">
                          {teamMap.get(r.teamId)?.shortName || r.teamId}
                        </td>
                        <td className="px-2 py-1.5 text-right text-zinc-300">{r.played}</td>
                        <td className="px-2 py-1.5 text-right text-zinc-300">{r.won}</td>
                        <td className="px-2 py-1.5 text-right font-bold text-[#FFE600]">
                          {r.points}
                        </td>
                        <td className="px-2.5 py-1.5 text-right text-zinc-300">
                          {r.nrr >= 0 ? `+${r.nrr.toFixed(2)}` : r.nrr.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Custom Message */}
        <div className={sectionCardCls}>
          <div className={sectionTitleCls}>
            <span>Custom Message</span>
            <div className="flex items-center gap-1">
              {(['CUSTOM MSG', 'OTHER'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setOverlay({ customMsgTab: t })}
                  className={`px-2.5 py-1 rounded text-[10px] font-black ${
                    ov.customMsgTab === t
                      ? 'bg-[#FFE600] text-black'
                      : 'bg-white/10 text-zinc-300'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            <input
              type="text"
              value={ov.customMsgHeading}
              onChange={(e) => setOverlay({ customMsgHeading: e.target.value })}
              placeholder="Heading"
              className="w-full px-3 py-2 rounded-lg bg-[#09090D] border border-white/15 text-xs sm:text-sm text-white focus:border-[#FFE600] focus:outline-none"
            />
            <textarea
              rows={2}
              value={ov.customMsgDescription}
              onChange={(e) => setOverlay({ customMsgDescription: e.target.value })}
              placeholder="Description"
              className="w-full px-3 py-2 rounded-lg bg-[#09090D] border border-white/15 text-xs sm:text-sm text-white focus:border-[#FFE600] focus:outline-none"
            />
            <button
              type="button"
              onClick={() =>
                setMainCard(
                  {
                    kind: 'CUSTOM_MESSAGE',
                    tab: ov.customMsgTab,
                    heading: ov.customMsgHeading || 'STAR EVENT LIVE',
                    description: ov.customMsgDescription || '',
                  },
                  'Custom Message Sent'
                )
              }
              className="w-full py-2.5 rounded-xl bg-[#DC2626] hover:bg-[#EF4444] text-white font-display font-black text-xs uppercase tracking-wide inline-flex items-center justify-center gap-2"
            >
              <Send className="w-3.5 h-3.5 text-[#FFE600]" />
              <span>CUSTOM MESSAAGE</span>
            </button>
          </div>
        </div>
      </div>

      {/* 6. Tournament Stats */}
      <div className={sectionCardCls}>
        <div className={sectionTitleCls}>
          <span>Tournament Stats</span>
          <span className="px-2.5 py-0.5 rounded bg-[#DC2626]/25 border border-[#DC2626]/50 text-white text-[11px] font-sans font-bold truncate max-w-[260px]">
            {tournament?.name || 'Active Tournament'}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {TOURNAMENT_STAT_MODES.map((mode) => {
            const active =
              ov.mainCard.kind === 'TOURNAMENT_STATS' && ov.mainCard.mode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() =>
                  setMainCard(
                    active ? { kind: 'NONE' } : { kind: 'TOURNAMENT_STATS', mode },
                    mode
                  )
                }
                className={`px-3.5 py-2 rounded-lg text-xs font-bold border ${
                  active
                    ? 'bg-[#FFE600] text-black border-white'
                    : 'bg-[#181822] hover:bg-white/10 border-white/12 text-zinc-200'
                }`}
              >
                {mode}
              </button>
            );
          })}
        </div>
      </div>

      {/* 7. TeamWise Player Stats + Player Of The Match */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={`lg:col-span-2 ${sectionCardCls}`}>
          <div className={sectionTitleCls}>
            <span>TeamWise Player Stats</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <select
              value={ov.selectedTeamForStatsId}
              onChange={(e) => {
                const tid = e.target.value;
                const firstPlayer =
                  state.teams.find((t) => t.id === tid)?.players[0]?.id || '';
                setOverlay({
                  selectedTeamForStatsId: tid,
                  selectedTeamPlayerId: firstPlayer,
                });
              }}
              className="px-3 py-2 rounded-lg bg-[#09090D] border border-white/15 text-xs sm:text-sm text-white"
            >
              <option value="">Please Select Team</option>
              {state.teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            <select
              value={ov.selectedTeamPlayerId}
              onChange={(e) => setOverlay({ selectedTeamPlayerId: e.target.value })}
              className="px-3 py-2 rounded-lg bg-[#09090D] border border-white/15 text-xs sm:text-sm text-white"
            >
              <option value="">Please Select Player</option>
              {(selectedTeamObj?.players || []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <p className="text-[11px] font-mono font-bold text-zinc-400 uppercase">
                Batting Statistics
              </p>
              <div className="flex flex-wrap gap-1.5">
                {['profile', 'batsman', 'tournament', 'Against Teams'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() =>
                      setMainCard(
                        {
                          kind: 'TEAM_PLAYER_STATS',
                          teamId: ov.selectedTeamForStatsId,
                          playerId: ov.selectedTeamPlayerId,
                          category: 'batting',
                          mode: m,
                        },
                        `Team Batting · ${m}`
                      )
                    }
                    className="px-2.5 py-1.5 rounded-lg bg-[#181822] hover:bg-[#FFE600] hover:text-black border border-white/12 text-xs font-bold text-zinc-200 transition-colors"
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-[11px] font-mono font-bold text-zinc-400 uppercase">
                Bowling Statistics
              </p>
              <div className="flex flex-wrap gap-1.5">
                {['profile', 'bowler', 'tournament', 'Against Teams'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() =>
                      setMainCard(
                        {
                          kind: 'TEAM_PLAYER_STATS',
                          teamId: ov.selectedTeamForStatsId,
                          playerId: ov.selectedTeamPlayerId,
                          category: 'bowling',
                          mode: m,
                        },
                        `Team Bowling · ${m}`
                      )
                    }
                    className="px-2.5 py-1.5 rounded-lg bg-[#181822] hover:bg-[#FFE600] hover:text-black border border-white/12 text-xs font-bold text-zinc-200 transition-colors"
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Player Of The Match */}
        <div className={sectionCardCls}>
          <div className={sectionTitleCls}>
            <span>Player Of The Match</span>
          </div>

          <select
            value={ov.selectedPomPlayerId}
            onChange={(e) => setOverlay({ selectedPomPlayerId: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-[#09090D] border border-white/15 text-xs sm:text-sm text-white"
          >
            <option value="">Select Player of the Match</option>
            {matchPlayers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() =>
                setMainCard(
                  {
                    kind: 'PLAYER_OF_MATCH',
                    playerId: ov.selectedPomPlayerId || matchPlayers[0]?.id || '',
                    display: 'Name',
                  },
                  'POTM · Name'
                )
              }
              className="py-2.5 rounded-xl bg-[#FFE600] hover:bg-[#FEF08A] text-black font-black text-xs uppercase"
            >
              Name
            </button>
            <button
              type="button"
              onClick={() =>
                setMainCard(
                  {
                    kind: 'PLAYER_OF_MATCH',
                    playerId: ov.selectedPomPlayerId || matchPlayers[0]?.id || '',
                    display: 'Stats',
                  },
                  'POTM · Stats'
                )
              }
              className="py-2.5 rounded-xl bg-[#DC2626] hover:bg-[#EF4444] text-white font-black text-xs uppercase"
            >
              Stats
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
