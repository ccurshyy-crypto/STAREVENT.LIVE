import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Check,
  Copy,
  Download,
  Maximize2,
  Minimize2,
  Printer,
  Radio,
  Search,
  Share2,
  Trophy,
  Tv,
  X,
} from 'lucide-react';
import {
  buildWhatsAppMatchSummaryText,
  downloadMatchSummaryPng,
  extractMatchSummaryData,
  getWhatsAppShareUrl,
} from '../../lib/matchSummaryExport';
import type {
  CricketMatch,
  CricketSuiteState,
  Team,
  Tournament,
  TournamentGroup,
} from '../../types/cricketSuite';
import { BroadcastMatchSummaryCard } from './BroadcastMatchSummaryCard';

interface MatchSummaryControlsProps {
  match: CricketMatch;
  tournament?: Tournament;
  group?: TournamentGroup;
  teamMap: Map<string, Team>;
  channelTitle?: string;
  isShowingOnOverlay: boolean;
  onToggleLiveOverlay: (matchId: string) => void;
  onOpenFullscreen: () => void;
  onToast: (msg: string) => void;
}

export function MatchSummaryActionToolbar({
  match,
  tournament,
  group,
  teamMap,
  channelTitle = 'STAR EVENT LIVE',
  isShowingOnOverlay,
  onToggleLiveOverlay,
  onOpenFullscreen,
  onToast,
}: MatchSummaryControlsProps) {
  const [downloading, setDownloading] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  const summaryData = useMemo(
    () => extractMatchSummaryData(match, tournament, group, teamMap, channelTitle),
    [match, tournament, group, teamMap, channelTitle]
  );

  const whatsappUrl = useMemo(() => getWhatsAppShareUrl(summaryData), [summaryData]);

  const handleDownloadPng = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      await downloadMatchSummaryPng(summaryData);
      onToast('Match Summary PNG (1920x1080 HD) downloaded.');
    } catch {
      onToast('Could not export PNG. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handleCopySummaryText = async () => {
    const text = buildWhatsAppMatchSummaryText(summaryData);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedText(true);
      onToast('Match Summary text copied for WhatsApp.');
      window.setTimeout(() => setCopiedText(false), 2000);
    } catch {
      onToast('Copy failed — please use Share on WhatsApp.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => void handleDownloadPng()}
        disabled={downloading}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0D47B8] hover:bg-[#0A3690] text-white text-xs font-bold transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
      >
        <Download className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{downloading ? 'Exporting PNG...' : 'Download PNG'}</span>
      </button>

      <button
        type="button"
        onClick={onOpenFullscreen}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors whitespace-nowrap shrink-0"
      >
        <Maximize2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>Full Screen</span>
      </button>

      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold transition-colors whitespace-nowrap shrink-0"
      >
        <Share2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>Share on WhatsApp</span>
      </a>

      <button
        type="button"
        onClick={() => void handleCopySummaryText()}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold transition-colors whitespace-nowrap shrink-0"
      >
        {copiedText ? (
          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
        ) : (
          <Copy className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        )}
        <span>{copiedText ? 'Copied' : 'Copy Text'}</span>
      </button>

      <button
        type="button"
        onClick={() => onToggleLiveOverlay(match.id)}
        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
          isShowingOnOverlay
            ? 'bg-red-600 hover:bg-red-700 text-white'
            : 'wo-btn-primary text-white'
        }`}
      >
        <Tv className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{isShowingOnOverlay ? 'Hide from Overlay' : 'Show on Live Overlay'}</span>
      </button>

      <button
        type="button"
        onClick={handlePrint}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-bold transition-colors whitespace-nowrap shrink-0"
      >
        <Printer className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>Print</span>
      </button>
    </div>
  );
}

// =============================================================================
// FULL-SCREEN CINEMA VIEWER (Native Fullscreen API + Iframe-Safe Overlay)
// =============================================================================
interface MatchSummaryFullscreenOverlayProps {
  open: boolean;
  onClose: () => void;
  match: CricketMatch;
  tournament?: Tournament;
  group?: TournamentGroup;
  teamMap: Map<string, Team>;
  channelTitle?: string;
  onToast: (msg: string) => void;
}

export function MatchSummaryFullscreenOverlay({
  open,
  onClose,
  match,
  tournament,
  group,
  teamMap,
  channelTitle,
  onToast,
}: MatchSummaryFullscreenOverlayProps) {
  const fsContainerRef = useRef<HTMLDivElement | null>(null);
  const [downloading, setDownloading] = useState(false);

  const summaryData = useMemo(
    () => extractMatchSummaryData(match, tournament, group, teamMap, channelTitle),
    [match, tournament, group, teamMap, channelTitle]
  );

  useEffect(() => {
    if (!open) return;
    const el = fsContainerRef.current;
    if (el && typeof el.requestFullscreen === 'function') {
      el.requestFullscreen().catch(() => {
        // Fallback to CSS fixed fullscreen inside iframe
      });
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, [open, onClose]);

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      await downloadMatchSummaryPng(summaryData);
      onToast('Match Summary PNG downloaded.');
    } catch {
      onToast('Could not export PNG.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={fsContainerRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-3 sm:p-8 overflow-y-auto"
          style={{
            background:
              'radial-gradient(circle at 20% 15%, rgba(14, 165, 233, 0.28) 0%, transparent 45%), linear-gradient(155deg, #030C2E 0%, #071A58 55%, #030D31 100%)',
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Full-Screen Match Summary"
        >
          {/* Floating Minimal Controls */}
          <div className="no-print w-full max-w-6xl flex items-center justify-between gap-3 mb-4">
            <p className="text-xs sm:text-sm font-bold text-sky-200 tracking-wide truncate">
              {summaryData.tournamentName} · {summaryData.matchLabel}
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => void handleDownload()}
                disabled={downloading}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-extrabold transition-colors whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{downloading ? 'Saving...' : 'Download PNG'}</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-colors whitespace-nowrap"
              >
                <Printer className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Print</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white text-slate-900 hover:bg-slate-100 text-xs font-extrabold transition-colors whitespace-nowrap"
              >
                <Minimize2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Exit Full Screen</span>
              </button>
            </div>
          </div>

          {/* 16:9 Broadcast Summary Card */}
          <div className="match-summary-print-root w-full max-w-6xl">
            <BroadcastMatchSummaryCard
              match={match}
              tournament={tournament}
              group={group}
              teamMap={teamMap}
              channelTitle={channelTitle}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// =============================================================================
// QUICK-OPEN MATCH SUMMARY MODAL (Called from Match List or Scoring Dashboard)
// =============================================================================
export interface MatchSummaryModalProps {
  match: CricketMatch | null;
  state: CricketSuiteState;
  updateState: (updater: (prev: CricketSuiteState) => CricketSuiteState) => void;
  onClose: () => void;
  onToast: (msg: string) => void;
}

export function MatchSummaryModal({
  match,
  state,
  updateState,
  onClose,
  onToast,
}: MatchSummaryModalProps) {
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  const teamMap = useMemo(
    () => new Map(state.teams.map((t) => [t.id, t])),
    [state.teams]
  );

  if (!match) return null;

  const tournament = state.tournaments.find((t) => t.id === match.tournamentId);
  const group = state.groups.find((g) => g.id === match.groupId);
  const isShowingOnOverlay =
    state.activeMatchId === match.id &&
    state.overlay.mainCard.kind === 'MATCH_STATS' &&
    state.overlay.mainCard.mode === 'Match Summary';

  const handleToggleLiveOverlay = (matchId: string) => {
    if (isShowingOnOverlay) {
      updateState((prev) => ({
        ...prev,
        overlay: {
          ...prev.overlay,
          mainCard: { kind: 'NONE' },
        },
      }));
      onToast('Match Summary hidden from Live Broadcast Overlay.');
      return;
    }

    updateState((prev) => ({
      ...prev,
      activeMatchId: matchId,
      overlay: {
        ...prev.overlay,
        mainCard: { kind: 'MATCH_STATS', mode: 'Match Summary' },
        bottomScoreMode: 'Result',
      },
    }));
    onToast('Match Summary is now live on the Broadcast Overlay!');
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xs overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-label="Match Summary Viewer"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.22 }}
          className="w-full max-w-5xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden my-auto"
        >
          {/* Modal Top Toolbar */}
          <div className="no-print px-4 sm:px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-[#0D47B8] text-white flex items-center justify-center shrink-0">
                <Trophy className="w-4 h-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h2 className="font-display font-bold text-sm sm:text-base text-slate-900 truncate">
                  Match Summary — {match.matchLabel}
                </h2>
                <p className="text-xs text-slate-500 truncate">
                  {tournament?.name || 'Tournament'} · {match.dateLabel}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Match Summary"
              className="p-2 rounded-lg bg-slate-200/80 hover:bg-slate-300 text-slate-700 transition-colors shrink-0"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          <div className="p-3.5 sm:p-5 space-y-4 max-h-[82vh] overflow-y-auto bg-slate-100/70">
            <MatchSummaryActionToolbar
              match={match}
              tournament={tournament}
              group={group}
              teamMap={teamMap}
              channelTitle={state.user.channelTitle || 'STAR EVENT LIVE'}
              isShowingOnOverlay={isShowingOnOverlay}
              onToggleLiveOverlay={handleToggleLiveOverlay}
              onOpenFullscreen={() => setFullscreenOpen(true)}
              onToast={onToast}
            />

            <div className="match-summary-print-root">
              <BroadcastMatchSummaryCard
                match={match}
                tournament={tournament}
                group={group}
                teamMap={teamMap}
                channelTitle={state.user.channelTitle || 'STAR EVENT LIVE'}
              />
            </div>
          </div>
        </motion.div>
      </div>

      <MatchSummaryFullscreenOverlay
        open={fullscreenOpen}
        onClose={() => setFullscreenOpen(false)}
        match={match}
        tournament={tournament}
        group={group}
        teamMap={teamMap}
        channelTitle={state.user.channelTitle || 'STAR EVENT LIVE'}
        onToast={onToast}
      />
    </>
  );
}

// =============================================================================
// DEDICATED SIDEBAR PAGE: MATCH SUMMARY & SAVED ARCHIVE
// =============================================================================
export interface MatchSummaryStudioViewProps {
  state: CricketSuiteState;
  initialMatchId?: string;
  updateState: (updater: (prev: CricketSuiteState) => CricketSuiteState) => void;
  onNavigateToMatches: () => void;
  onToast: (msg: string) => void;
}

export function MatchSummaryStudioView({
  state,
  initialMatchId,
  updateState,
  onNavigateToMatches,
  onToast,
}: MatchSummaryStudioViewProps) {
  const [selectedMatchId, setSelectedMatchId] = useState<string>(
    initialMatchId || state.activeMatchId || state.matches[0]?.id || ''
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'LIVE'>('ALL');
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  useEffect(() => {
    if (initialMatchId && state.matches.some((m) => m.id === initialMatchId)) {
      setSelectedMatchId(initialMatchId);
    }
  }, [initialMatchId, state.matches]);

  const teamMap = useMemo(
    () => new Map(state.teams.map((t) => [t.id, t])),
    [state.teams]
  );
  const tourMap = useMemo(
    () => new Map(state.tournaments.map((t) => [t.id, t])),
    [state.tournaments]
  );
  const groupMap = useMemo(
    () => new Map(state.groups.map((g) => [g.id, g])),
    [state.groups]
  );

  // Deduplicate by match ID defensively so data refresh never displays duplicate entries
  const uniqueMatches = useMemo(() => {
    const seen = new Set<string>();
    const list: CricketMatch[] = [];
    for (const m of state.matches) {
      if (!m?.id || seen.has(m.id)) continue;
      seen.add(m.id);
      list.push(m);
    }
    return list;
  }, [state.matches]);

  const filteredMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return uniqueMatches.filter((m) => {
      if (statusFilter === 'COMPLETED' && m.status !== 'completed') return false;
      if (statusFilter === 'LIVE' && m.status === 'completed') return false;
      if (!q) return true;
      const t1 = teamMap.get(m.team1Id)?.name.toLowerCase() || '';
      const t2 = teamMap.get(m.team2Id)?.name.toLowerCase() || '';
      const tour = tourMap.get(m.tournamentId)?.name.toLowerCase() || '';
      return (
        t1.includes(q) ||
        t2.includes(q) ||
        tour.includes(q) ||
        m.matchLabel.toLowerCase().includes(q) ||
        (m.venue || '').toLowerCase().includes(q)
      );
    });
  }, [uniqueMatches, statusFilter, searchQuery, teamMap, tourMap]);

  const activeMatch = useMemo(() => {
    return (
      uniqueMatches.find((m) => m.id === selectedMatchId) ??
      uniqueMatches.find((m) => m.id === state.activeMatchId) ??
      uniqueMatches[0] ??
      null
    );
  }, [uniqueMatches, selectedMatchId, state.activeMatchId]);

  const activeTournament = activeMatch
    ? tourMap.get(activeMatch.tournamentId)
    : undefined;
  const activeGroup = activeMatch?.groupId
    ? groupMap.get(activeMatch.groupId)
    : undefined;

  const isShowingOnOverlay = Boolean(
    activeMatch &&
      state.activeMatchId === activeMatch.id &&
      state.overlay.mainCard.kind === 'MATCH_STATS' &&
      state.overlay.mainCard.mode === 'Match Summary'
  );

  const handleToggleLiveOverlay = (matchId: string) => {
    if (isShowingOnOverlay) {
      updateState((prev) => ({
        ...prev,
        overlay: {
          ...prev.overlay,
          mainCard: { kind: 'NONE' },
        },
      }));
      onToast('Match Summary hidden from Live Broadcast Overlay.');
      return;
    }

    updateState((prev) => ({
      ...prev,
      activeMatchId: matchId,
      overlay: {
        ...prev.overlay,
        mainCard: { kind: 'MATCH_STATS', mode: 'Match Summary' },
        bottomScoreMode: 'Result',
      },
    }));
    onToast('Match Summary & Result sent to Live Broadcast Overlay!');
  };

  if (!activeMatch) {
    return (
      <div className="rounded-xl bg-white border border-slate-200 p-10 text-center space-y-3 shadow-xs">
        <div className="w-12 h-12 mx-auto rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center">
          <Trophy className="w-6 h-6 text-[#0D47B8]" aria-hidden="true" />
        </div>
        <h2 className="font-display font-bold text-lg text-slate-900">
          No Match Summaries Yet
        </h2>
        <p className="text-sm text-slate-600 max-w-md mx-auto">
          Create and score a match to automatically generate international TV broadcast Match Summaries with top batters, best bowlers, and match results.
        </p>
        <button
          type="button"
          onClick={onNavigateToMatches}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg wo-btn-primary text-xs font-extrabold uppercase tracking-wider"
        >
          <Radio className="w-4 h-4" aria-hidden="true" />
          <span>Go to Matches</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Top Broadcast Control Bar */}
      <div className="no-print rounded-xl bg-white border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display font-bold text-base sm:text-lg text-slate-900">
              Broadcast Match Summary
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Auto-synced from live scoring data · {uniqueMatches.length}{' '}
              {uniqueMatches.length === 1 ? 'saved match' : 'saved matches'} available
            </p>
          </div>
          <MatchSummaryActionToolbar
            match={activeMatch}
            tournament={activeTournament}
            group={activeGroup}
            teamMap={teamMap}
            channelTitle={state.user.channelTitle || 'STAR EVENT LIVE'}
            isShowingOnOverlay={isShowingOnOverlay}
            onToggleLiveOverlay={handleToggleLiveOverlay}
            onOpenFullscreen={() => setFullscreenOpen(true)}
            onToast={onToast}
          />
        </div>
      </div>

      {/* Main 16:9 International Broadcast Match Summary Card */}
      <div className="match-summary-print-root">
        <BroadcastMatchSummaryCard
          match={activeMatch}
          tournament={activeTournament}
          group={activeGroup}
          teamMap={teamMap}
          channelTitle={state.user.channelTitle || 'STAR EVENT LIVE'}
        />
      </div>

      {/* Saved Matches Archive (Previous & Current Match Summaries) */}
      <div className="no-print rounded-xl bg-white border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display font-bold text-sm sm:text-base text-slate-900">
              Saved Match Summaries Archive
            </h3>
            <p className="text-xs text-slate-500">
              Select any live or completed match below to load its broadcast scorecard, export PNG, or share on WhatsApp.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(
                [
                  { id: 'ALL', label: 'All' },
                  { id: 'COMPLETED', label: 'Completed' },
                  { id: 'LIVE', label: 'Live / Upcoming' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors whitespace-nowrap ${
                    statusFilter === tab.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative min-w-[200px] sm:min-w-[240px]">
              <Search
                className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                aria-hidden="true"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search match, team, tournament..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-300 focus:border-[#0D47B8] focus:bg-white focus:outline-none text-xs text-slate-900"
              />
            </div>
          </div>
        </div>

        {filteredMatches.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">
            No matches found matching your filter.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredMatches.map((m) => {
              const tour = tourMap.get(m.tournamentId);
              const grp = m.groupId ? groupMap.get(m.groupId) : undefined;
              const sum = extractMatchSummaryData(
                m,
                tour,
                grp,
                teamMap,
                state.user.channelTitle || 'STAR EVENT LIVE'
              );
              const isSelected = m.id === activeMatch.id;

              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMatchId(m.id)}
                  className={`text-left rounded-xl p-3.5 border transition-all space-y-2 ${
                    isSelected
                      ? 'bg-sky-50/70 border-[#0D47B8] ring-2 ring-[#0D47B8]/20'
                      : 'bg-white border-slate-200 hover:border-sky-400 hover:bg-slate-50/70'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                    <span className="font-bold text-slate-700 truncate">
                      {m.matchLabel} · {m.stageBadge}
                    </span>
                    <span className="shrink-0 tabular-nums">{m.dateLabel}</span>
                  </div>

                  <div className="space-y-1 font-mono tabular-nums text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display font-bold text-slate-900 truncate">
                        {sum.innings1.teamName}
                      </span>
                      <span className="font-black text-[#0A1C4E] shrink-0">
                        {sum.innings1.hasScore
                          ? `${sum.innings1.scoreLabel} (${sum.innings1.oversCompact})`
                          : 'Yet to bat'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display font-bold text-slate-900 truncate">
                        {sum.innings2.teamName}
                      </span>
                      <span className="font-black text-[#0A1C4E] shrink-0">
                        {sum.innings2.hasScore
                          ? `${sum.innings2.scoreLabel} (${sum.innings2.oversCompact})`
                          : 'Yet to bat'}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] font-bold text-[#0D47B8] truncate pt-1 border-t border-slate-100">
                    {sum.resultHeadline}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <MatchSummaryFullscreenOverlay
        open={fullscreenOpen}
        onClose={() => setFullscreenOpen(false)}
        match={activeMatch}
        tournament={activeTournament}
        group={activeGroup}
        teamMap={teamMap}
        channelTitle={state.user.channelTitle || 'STAR EVENT LIVE'}
        onToast={onToast}
      />
    </div>
  );
}
