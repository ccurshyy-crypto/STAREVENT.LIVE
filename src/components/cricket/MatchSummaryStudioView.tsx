import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Award,
  Check,
  Copy,
  Download,
  FileDown,
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
import { getBallPillLabel } from '../../data/cricketSampleData';
import {
  buildWhatsAppMatchSummaryText,
  computeFullMatchReport,
  downloadMatchSummaryPdf,
  downloadMatchSummaryPng,
  extractMatchSummaryData,
  getWhatsAppShareUrl,
  type FullInningsReport,
  type FullMatchReport,
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
  const [downloadingPng, setDownloadingPng] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  const report = useMemo(
    () => computeFullMatchReport(match, tournament, group, teamMap, channelTitle),
    [match, tournament, group, teamMap, channelTitle]
  );

  const whatsappUrl = useMemo(
    () => getWhatsAppShareUrl(report.summary),
    [report.summary]
  );

  const handleDownloadPng = async () => {
    if (downloadingPng) return;
    setDownloadingPng(true);
    try {
      await downloadMatchSummaryPng(report.summary);
      onToast('Match Summary PNG (1920x1080 HD) downloaded.');
    } catch {
      onToast('Could not export PNG. Please try again.');
    } finally {
      setDownloadingPng(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (downloadingPdf) return;
    setDownloadingPdf(true);
    try {
      await downloadMatchSummaryPdf(report);
      onToast('Complete 3-page Match Summary PDF downloaded.');
    } catch {
      onToast('Could not export PDF. Please try again.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleCopySummaryText = async () => {
    const text = buildWhatsAppMatchSummaryText(report.summary);
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

  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => void handleDownloadPng()}
        disabled={downloadingPng}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg wo-btn-primary text-white text-xs font-bold transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
      >
        <Download className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{downloadingPng ? 'Exporting PNG...' : 'Download PNG (1920x1080)'}</span>
      </button>

      <button
        type="button"
        onClick={() => void handleDownloadPdf()}
        disabled={downloadingPdf}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg wo-btn-soft text-xs font-bold transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
      >
        <FileDown className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{downloadingPdf ? 'Generating PDF...' : 'Download PDF'}</span>
      </button>

      <button
        type="button"
        onClick={onOpenFullscreen}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors whitespace-nowrap shrink-0"
      >
        <Maximize2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>Full Screen</span>
      </button>

      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold transition-colors whitespace-nowrap shrink-0"
      >
        <Share2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>Share on WhatsApp</span>
      </a>

      <button
        type="button"
        onClick={() => void handleCopySummaryText()}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg wo-btn-secondary text-xs font-bold transition-colors whitespace-nowrap shrink-0"
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
            : 'wo-btn-active text-white'
        }`}
      >
        <Tv className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{isShowingOnOverlay ? 'Hide Live Overlay' : 'Live Stream Overlay'}</span>
      </button>

      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg wo-btn-secondary text-xs font-bold transition-colors whitespace-nowrap shrink-0"
      >
        <Printer className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>Print Summary</span>
      </button>
    </div>
  );
}

// =============================================================================
// COMPLETE SCORECARD & ANALYTICS SECTIONS (SECTIONS 1–10)
// =============================================================================
interface FullMatchScorecardSectionsProps {
  report: FullMatchReport;
  match: CricketMatch;
  teamMap: Map<string, Team>;
  onSelectPlayerOfMatch?: (playerId: string) => void;
}

function FullMatchScorecardSections({
  report,
  match,
  teamMap,
  onSelectPlayerOfMatch,
}: FullMatchScorecardSectionsProps) {
  const [inningsView, setInningsView] = useState<'both' | 'inn1' | 'inn2'>('both');

  const team1 = teamMap.get(match.team1Id);
  const team2 = teamMap.get(match.team2Id);
  const pomOptions = useMemo(() => {
    const out: { id: string; label: string }[] = [];
    (team1?.players ?? []).forEach((p) =>
      out.push({ id: p.id, label: `${p.name} (${team1?.shortName || 'T1'})` })
    );
    (team2?.players ?? []).forEach((p) =>
      out.push({ id: p.id, label: `${p.name} (${team2?.shortName || 'T2'})` })
    );
    return out;
  }, [team1, team2]);

  const renderInningsFullCard = (inn: FullInningsReport) => (
    <div
      key={`full-inn-${inn.inningsIndex}`}
      className="rounded-xl bg-white border border-slate-200 shadow-xs overflow-hidden"
    >
      {/* Innings Section Header */}
      <div className="px-4 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-2 text-white wo-header">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-orange-100">
            {inn.inningsIndex === 0 ? '1st Innings' : '2nd Innings'} · Complete Scorecard
          </p>
          <h3 className="font-display font-black text-base sm:text-lg uppercase tracking-wide">
            {inn.teamName}
          </h3>
        </div>
        <div className="text-right font-mono tabular-nums">
          <p className="font-black text-lg sm:text-2xl leading-none">
            {inn.hasScore ? inn.scoreLabel : '0/0'}
          </p>
          <p className="text-xs text-orange-100 mt-0.5">
            {inn.hasScore
              ? `${inn.oversDisplay} / ${inn.maxOvers} ov · RR ${inn.runRate}`
              : 'Yet to bat'}
          </p>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-6">
        {/* 2. COMPLETE BATTING SCORECARD */}
        <div className="space-y-2.5">
          <h4 className="font-display font-bold text-xs uppercase tracking-wider text-[#0A1C4E]">
            Batting Scorecard
          </h4>
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase font-bold text-slate-600">
                <tr>
                  <th className="px-3 py-2.5">Batsman</th>
                  <th className="px-3 py-2.5">How Out</th>
                  <th className="px-3 py-2.5 text-right">R</th>
                  <th className="px-3 py-2.5 text-right">B</th>
                  <th className="px-3 py-2.5 text-right">4s</th>
                  <th className="px-3 py-2.5 text-right">6s</th>
                  <th className="px-3 py-2.5 text-right">SR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[#0A1C4E]">
                {inn.battingCard.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-4 text-slate-500 text-xs">
                      No batting data recorded yet for this innings.
                    </td>
                  </tr>
                ) : (
                  inn.battingCard.map((b) => {
                    const isRetiredHurt = b.dismissalText.toLowerCase().includes('retired hurt');
                    return (
                      <tr key={b.playerId} className="hover:bg-slate-50/70">
                        <td className="px-3 py-2 font-display font-bold uppercase whitespace-nowrap">
                          {b.playerName}
                          {!b.isOut && (
                            <span className="text-[#FF8C00] font-black ml-0.5">*</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-600 whitespace-nowrap">
                          {isRetiredHurt ? (
                            <span className="font-semibold text-amber-700">Retired Hurt</span>
                          ) : b.isOut ? (
                            b.dismissalText
                          ) : (
                            <span className="font-semibold text-emerald-700">not out</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-black tabular-nums">
                          {b.runs}
                        </td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-600">
                          {b.balls}
                        </td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-700">
                          {b.fours}
                        </td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-700">
                          {b.sixes}
                        </td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-700">
                          {b.sr}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* 4. EXTRAS BREAKDOWN & TOTAL ROW + DID NOT BAT */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="rounded-lg bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-xs space-y-1">
              <div className="flex items-center justify-between font-bold text-[#0A1C4E]">
                <span>Extras</span>
                <span className="font-mono tabular-nums">{inn.extras.total}</span>
              </div>
              <p className="text-slate-600 font-mono tabular-nums text-[11px]">
                Byes: {inn.extras.byes} · Leg Byes: {inn.extras.legByes} · Wides: {inn.extras.wides}{' '}
                · No Balls: {inn.extras.noBalls} · Penalty: {inn.extras.penalty}
              </p>
            </div>

            <div className="rounded-lg bg-[#FFF3E0]/70 border border-[#FF8C00]/35 px-3.5 py-2.5 text-xs space-y-1">
              <div className="flex items-center justify-between font-bold text-slate-900">
                <span>Total ({inn.oversDisplay} Overs)</span>
                <span className="font-mono font-black text-sm text-[#C2410C] tabular-nums">
                  {inn.scoreLabel}
                </span>
              </div>
              <p className="text-slate-700 font-mono tabular-nums text-[11px]">
                Run Rate: {inn.runRate} · 4s: {inn.fours} · 6s: {inn.sixes}
              </p>
            </div>
          </div>

          {inn.didNotBat.length > 0 && (
            <p className="text-xs text-slate-600 pt-1">
              <strong className="text-[#0A1C4E]">Did Not Bat:</strong>{' '}
              {inn.didNotBat.map((p) => p.name).join(', ')}
            </p>
          )}
        </div>

        {/* 3. COMPLETE BOWLING SCORECARD */}
        <div className="space-y-2.5">
          <h4 className="font-display font-bold text-xs uppercase tracking-wider text-[#0A1C4E]">
            Bowling Scorecard — {inn.bowlingTeamName}
          </h4>
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase font-bold text-slate-600">
                <tr>
                  <th className="px-3 py-2.5">Bowler</th>
                  <th className="px-3 py-2.5 text-right">O</th>
                  <th className="px-3 py-2.5 text-right">M</th>
                  <th className="px-3 py-2.5 text-right">R</th>
                  <th className="px-3 py-2.5 text-right">W</th>
                  <th className="px-3 py-2.5 text-right">Eco</th>
                  <th className="px-3 py-2.5 text-right">WD</th>
                  <th className="px-3 py-2.5 text-right">NB</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[#0A1C4E]">
                {inn.bowlingCard.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-4 text-slate-500 text-xs">
                      No bowling figures recorded yet.
                    </td>
                  </tr>
                ) : (
                  inn.bowlingCard.map((bw) => (
                    <tr key={bw.playerId} className="hover:bg-slate-50/70">
                      <td className="px-3 py-2 font-display font-bold uppercase whitespace-nowrap">
                        {bw.playerName}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">{bw.overs}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-600">
                        {bw.maidens}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">{bw.runs}</td>
                      <td className="px-3 py-2 text-right font-mono font-black tabular-nums text-[#EA580C]">
                        {bw.wickets}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-700">
                        {bw.economy}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-600">
                        {bw.wides}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-600">
                        {bw.noBalls}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 5. FALL OF WICKETS & 6. BATTING PARTNERSHIPS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-display font-bold text-xs uppercase tracking-wider text-[#0A1C4E]">
              Fall of Wickets
            </h4>
            {inn.fallOfWickets.length === 0 ? (
              <p className="text-xs text-slate-500 py-2">No wickets fell in this innings.</p>
            ) : (
              <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 text-xs">
                {inn.fallOfWickets.map((f) => (
                  <div
                    key={`fow-${inn.inningsIndex}-${f.wicketNumber}`}
                    className="px-3 py-2 flex items-center justify-between gap-2"
                  >
                    <span className="font-mono font-black text-[#EA580C] tabular-nums">
                      {f.wicketNumber}-{f.scoreAtFall}
                    </span>
                    <span className="font-display font-bold text-[#0A1C4E] truncate flex-1">
                      {f.playerName}
                    </span>
                    <span className="font-mono text-slate-500 tabular-nums shrink-0">
                      ({f.oversAtFall} ov)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h4 className="font-display font-bold text-xs uppercase tracking-wider text-[#0A1C4E]">
              Batting Partnerships
            </h4>
            {inn.partnerships.length === 0 ? (
              <p className="text-xs text-slate-500 py-2">No partnerships recorded yet.</p>
            ) : (
              <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 text-xs">
                {inn.partnerships.map((p) => (
                  <div
                    key={`part-${inn.inningsIndex}-${p.wicketNumber}`}
                    className="px-3 py-2 flex items-center justify-between gap-2"
                  >
                    <span className="font-mono font-bold text-slate-500 shrink-0">
                      #{p.wicketNumber}
                    </span>
                    <span className="font-display font-bold text-[#0A1C4E] truncate flex-1">
                      {p.batter1Name} &amp; {p.batter2Name}
                    </span>
                    <span className="font-mono font-black text-[#0A1C4E] tabular-nums shrink-0">
                      {p.runs}
                      {p.isUnbroken ? '*' : ''}{' '}
                      <span className="font-semibold text-slate-500">({p.balls}b)</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 7. OVER-BY-OVER SUMMARY */}
        <div className="space-y-2">
          <h4 className="font-display font-bold text-xs uppercase tracking-wider text-[#0A1C4E]">
            Over-by-Over Summary
          </h4>
          {inn.overByOver.length === 0 ? (
            <p className="text-xs text-slate-500 py-2">No overs bowled yet.</p>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase font-bold text-slate-600">
                  <tr>
                    <th className="px-3 py-2">Over</th>
                    <th className="px-3 py-2">Deliveries</th>
                    <th className="px-3 py-2 text-right">Runs</th>
                    <th className="px-3 py-2 text-right">Wkts</th>
                    <th className="px-3 py-2 text-right">Total</th>
                    <th className="px-3 py-2 text-right">CRR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[#0A1C4E]">
                  {inn.overByOver.map((ov) => (
                    <tr key={`ov-${inn.inningsIndex}-${ov.overNumber}`} className="hover:bg-slate-50/70">
                      <td className="px-3 py-2 font-mono font-bold whitespace-nowrap">
                        Over {ov.overNumber}
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        {ov.balls.map((b) => getBallPillLabel(b)).join(' · ')}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold tabular-nums">
                        {ov.runsInOver}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold tabular-nums text-red-600">
                        {ov.wicketsInOver}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-black tabular-nums">
                        {ov.totalScoreLabel}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-600">
                        {ov.crr}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* 1. MATCH DETAILS & 10. PLAYER OF THE MATCH */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Match Details */}
        <div className="lg:col-span-2 rounded-xl bg-white border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
          <h3 className="font-display font-bold text-sm uppercase tracking-wider text-[#0A1C4E] border-b border-slate-100 pb-2">
            Match Details
          </h3>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 text-xs">
            <div>
              <dt className="text-slate-500 font-medium">Tournament</dt>
              <dd className="font-display font-bold text-slate-900 mt-0.5">
                {report.summary.tournamentName}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500 font-medium">Match</dt>
              <dd className="font-display font-bold text-slate-900 mt-0.5">
                {report.summary.matchLabel} · {report.summary.stageBadge}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500 font-medium">Format</dt>
              <dd className="font-display font-bold text-slate-900 mt-0.5">
                {report.matchFormat} ({match.oversPerInnings} Overs)
              </dd>
            </div>
            <div>
              <dt className="text-slate-500 font-medium">Teams</dt>
              <dd className="font-display font-bold text-slate-900 mt-0.5">
                {report.teamAName} vs {report.teamBName}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500 font-medium">Venue / Ground</dt>
              <dd className="font-semibold text-slate-800 mt-0.5">
                {report.summary.venue || 'Main Ground'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500 font-medium">Date</dt>
              <dd className="font-mono font-semibold text-slate-800 mt-0.5 tabular-nums">
                {report.summary.dateLabel}
              </dd>
            </div>
            <div className="col-span-2 sm:col-span-2">
              <dt className="text-slate-500 font-medium">Toss</dt>
              <dd className="font-semibold text-slate-800 mt-0.5">
                {report.tossWinnerName} won the toss &amp; chose {report.tossDecisionLabel}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500 font-medium">Result</dt>
              <dd className="font-display font-bold text-[#EA580C] mt-0.5">
                {report.summary.resultHeadline}
              </dd>
            </div>
          </dl>
        </div>

        {/* 10. PLAYER OF THE MATCH (with manual admin/scorer selector) */}
        <div className="rounded-xl bg-white border border-orange-200 p-4 sm:p-5 shadow-xs flex flex-col justify-between gap-3">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 border-b border-orange-100 pb-2">
              <Award className="w-4 h-4 text-[#FF8C00]" aria-hidden="true" />
              <h3 className="font-display font-bold text-sm uppercase tracking-wider text-slate-900">
                Player of the Match
              </h3>
            </div>

            {report.playerOfMatch ? (
              <div className="space-y-1.5">
                <p className="font-display font-black text-lg text-[#0A1C4E] leading-tight">
                  {report.playerOfMatch.playerName}
                </p>
                <p className="text-xs font-semibold text-[#E87500]">
                  {report.playerOfMatch.teamName}
                </p>
                <div className="pt-1.5 space-y-1 text-xs font-mono tabular-nums text-slate-700">
                  {report.playerOfMatch.batted && (
                    <p>
                      Batting:{' '}
                      <strong className="text-slate-900">
                        {report.playerOfMatch.runs}
                        {!report.playerOfMatch.isOut ? '*' : ''} ({report.playerOfMatch.balls} balls)
                      </strong>
                    </p>
                  )}
                  {report.playerOfMatch.bowled && (
                    <p>
                      Bowling:{' '}
                      <strong className="text-slate-900">
                        {report.playerOfMatch.bowlingFigures}
                      </strong>
                    </p>
                  )}
                  <p className="font-sans text-[11px] text-slate-600 pt-0.5">
                    {report.playerOfMatch.performanceSummary}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-2">
                No Player of the Match selected yet. Choose a player below to save it for this match.
              </p>
            )}
          </div>

          {onSelectPlayerOfMatch && pomOptions.length > 0 && (
            <div className="no-print pt-2 border-t border-slate-100 space-y-1">
              <label
                htmlFor={`pom-select-${match.id}`}
                className="block text-[11px] font-bold text-slate-600 uppercase"
              >
                Select Player of the Match
              </label>
              <select
                id={`pom-select-${match.id}`}
                value={match.playerOfMatchId || ''}
                onChange={(e) => onSelectPlayerOfMatch(e.target.value)}
                className="w-full px-2.5 py-2 rounded-lg border border-orange-300 bg-[#FFFBF5] text-xs font-semibold text-slate-900 focus:border-[#FF8C00] focus:outline-none"
              >
                <option value="">— Select Player —</option>
                {pomOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* 9. MATCH STATISTICS */}
      <div className="rounded-xl bg-white border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
        <h3 className="font-display font-bold text-sm uppercase tracking-wider text-[#0A1C4E] border-b border-slate-100 pb-2">
          Match Statistics
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
            <p className="text-slate-500 font-medium">Highest Individual Score</p>
            <p className="font-mono font-black text-base text-[#0A1C4E] tabular-nums mt-1">
              {report.statistics.highestIndividualScore
                ? `${report.statistics.highestIndividualScore.runs}${
                    !report.statistics.highestIndividualScore.isOut ? '*' : ''
                  } (${report.statistics.highestIndividualScore.balls})`
                : '—'}
            </p>
            <p className="text-[11px] text-slate-600 truncate mt-0.5">
              {report.statistics.highestIndividualScore
                ? `${report.statistics.highestIndividualScore.playerName} · ${report.statistics.highestIndividualScore.teamShortName}`
                : 'No batting yet'}
            </p>
          </div>

          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
            <p className="text-slate-500 font-medium">Best Bowling Figures</p>
            <p className="font-mono font-black text-base text-[#EA580C] tabular-nums mt-1">
              {report.statistics.bestBowlingFigures
                ? `${report.statistics.bestBowlingFigures.wickets}-${report.statistics.bestBowlingFigures.runs} (${report.statistics.bestBowlingFigures.overs})`
                : '—'}
            </p>
            <p className="text-[11px] text-slate-600 truncate mt-0.5">
              {report.statistics.bestBowlingFigures
                ? `${report.statistics.bestBowlingFigures.playerName} · ${report.statistics.bestBowlingFigures.teamShortName}`
                : 'No bowling yet'}
            </p>
          </div>

          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
            <p className="text-slate-500 font-medium">Highest Partnership</p>
            <p className="font-mono font-black text-base text-[#0A1C4E] tabular-nums mt-1">
              {report.statistics.highestPartnership
                ? `${report.statistics.highestPartnership.runs} (${report.statistics.highestPartnership.balls}b)`
                : '—'}
            </p>
            <p className="text-[11px] text-slate-600 truncate mt-0.5">
              {report.statistics.highestPartnership
                ? `${report.statistics.highestPartnership.batter1Name} & ${report.statistics.highestPartnership.batter2Name}`
                : 'No partnerships yet'}
            </p>
          </div>

          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
            <p className="text-slate-500 font-medium">Boundaries (4s / 6s)</p>
            <p className="font-mono font-black text-base text-[#E87500] tabular-nums mt-1">
              {report.statistics.totalBoundaries} Total
            </p>
            <p className="text-[11px] text-slate-600 font-mono tabular-nums mt-0.5">
              Fours: {report.statistics.totalFours} · Sixes: {report.statistics.totalSixes}
            </p>
          </div>

          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
            <p className="text-slate-500 font-medium">Match Totals &amp; Powerplay</p>
            <p className="font-mono font-black text-base text-[#0A1C4E] tabular-nums mt-1">
              {report.statistics.totalRuns} Runs · {report.statistics.totalWickets} Wkts
            </p>
            <p className="text-[11px] text-slate-600 font-mono tabular-nums mt-0.5 truncate">
              {report.statistics.powerplayInn1 || report.statistics.powerplayInn2
                ? `PP (${report.statistics.powerplayOvers} ov): ${
                    report.statistics.powerplayInn1
                      ? `${report.statistics.powerplayInn1.teamShortName} ${report.statistics.powerplayInn1.runs}/${report.statistics.powerplayInn1.wickets}`
                      : ''
                  }${
                    report.statistics.powerplayInn1 && report.statistics.powerplayInn2
                      ? ' · '
                      : ''
                  }${
                    report.statistics.powerplayInn2
                      ? `${report.statistics.powerplayInn2.teamShortName} ${report.statistics.powerplayInn2.runs}/${report.statistics.powerplayInn2.wickets}`
                      : ''
                  }`
                : `Powerplay: First ${report.statistics.powerplayOvers} overs`}
            </p>
          </div>
        </div>
      </div>

      {/* INNINGS VIEW FILTER + FULL BATTING/BOWLING/FOW/PARTNERSHIPS/OVERS */}
      <div className="space-y-4">
        <div className="no-print flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display font-bold text-sm sm:text-base text-slate-900">
            Complete Innings Scorecards
          </h3>
          <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-lg">
            {(
              [
                { id: 'both', label: 'Both Innings' },
                { id: 'inn1', label: `1st: ${report.innings1.teamShortName}` },
                { id: 'inn2', label: `2nd: ${report.innings2.teamShortName}` },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setInningsView(opt.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors whitespace-nowrap ${
                  inningsView === opt.id
                    ? 'wo-btn-active text-white'
                    : 'text-slate-600 hover:text-[#E87500]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {(inningsView === 'both' || inningsView === 'inn1') &&
          renderInningsFullCard(report.innings1)}
        {(inningsView === 'both' || inningsView === 'inn2') &&
          renderInningsFullCard(report.innings2)}
      </div>
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
          <div className="no-print w-full max-w-6xl flex items-center justify-between gap-3 mb-4">
            <p className="text-xs sm:text-sm font-bold text-sky-200 tracking-wide truncate">
              {summaryData.tournamentName} · {summaryData.matchLabel}
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => void handleDownload()}
                disabled={downloading}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg wo-btn-primary text-white text-xs font-extrabold transition-colors whitespace-nowrap"
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

  const tournament = match
    ? state.tournaments.find((t) => t.id === match.tournamentId)
    : undefined;
  const group = match?.groupId
    ? state.groups.find((g) => g.id === match.groupId)
    : undefined;

  const fullReport = useMemo(
    () =>
      match
        ? computeFullMatchReport(
            match,
            tournament,
            group,
            teamMap,
            state.user.channelTitle || 'STAR EVENT LIVE'
          )
        : null,
    [match, tournament, group, teamMap, state.user.channelTitle]
  );

  if (!match || !fullReport) return null;

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

  const handleSelectPom = (playerId: string) => {
    updateState((prev) => ({
      ...prev,
      matches: prev.matches.map((m) =>
        m.id === match.id ? { ...m, playerOfMatchId: playerId } : m
      ),
    }));
    onToast(playerId ? 'Player of the Match saved!' : 'Player of the Match cleared.');
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
          className="w-full max-w-6xl rounded-2xl bg-white border border-orange-200 shadow-2xl overflow-hidden my-auto"
        >
          {/* Modal Top Toolbar (Orange & White Header) */}
          <div className="no-print px-4 sm:px-5 py-3.5 wo-header text-white flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-white/20 border border-white/35 text-white flex items-center justify-center shrink-0">
                <Trophy className="w-4 h-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h2 className="font-display font-bold text-sm sm:text-base text-white truncate">
                  Complete Match Summary — {match.matchLabel}
                </h2>
                <p className="text-xs text-orange-100 truncate">
                  {tournament?.name || 'Tournament'} · {match.dateLabel}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Match Summary"
              className="p-2 rounded-lg bg-white/15 hover:bg-white/25 text-white transition-colors shrink-0"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          <div className="p-3.5 sm:p-5 space-y-5 max-h-[84vh] overflow-y-auto bg-slate-100/75">
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

            <FullMatchScorecardSections
              report={fullReport}
              match={match}
              teamMap={teamMap}
              onSelectPlayerOfMatch={handleSelectPom}
            />
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
// DEDICATED SIDEBAR PAGE: COMPLETE MATCH SUMMARY & SAVED ARCHIVE
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

  // Deduplicate by match ID defensively so page refreshes never duplicate rows
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

  const fullReport = useMemo(
    () =>
      activeMatch
        ? computeFullMatchReport(
            activeMatch,
            activeTournament,
            activeGroup,
            teamMap,
            state.user.channelTitle || 'STAR EVENT LIVE'
          )
        : null,
    [activeMatch, activeTournament, activeGroup, teamMap, state.user.channelTitle]
  );

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

  const handleSelectPom = (playerId: string) => {
    if (!activeMatch) return;
    updateState((prev) => ({
      ...prev,
      matches: prev.matches.map((m) =>
        m.id === activeMatch.id ? { ...m, playerOfMatchId: playerId } : m
      ),
    }));
    onToast(playerId ? 'Player of the Match saved!' : 'Player of the Match cleared.');
  };

  if (!activeMatch || !fullReport) {
    return (
      <div className="rounded-xl bg-white border border-slate-200 p-10 text-center space-y-3 shadow-xs">
        <div className="w-12 h-12 mx-auto rounded-xl bg-[#FFF3E0] border border-[#FF8C00]/30 flex items-center justify-center">
          <Trophy className="w-6 h-6 text-[#FF8C00]" aria-hidden="true" />
        </div>
        <h2 className="font-display font-bold text-lg text-slate-900">
          No Match Summaries Yet
        </h2>
        <p className="text-sm text-slate-600 max-w-md mx-auto">
          Create and score a match to automatically generate international broadcast Match Summaries, complete scorecards, partnerships, and match statistics.
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
      {/* Top Action Control Bar */}
      <div className="no-print rounded-xl bg-white border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display font-bold text-base sm:text-lg text-slate-900">
              Complete Cricket Match Summary
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Calculated directly from ball-by-ball scoring data · {uniqueMatches.length}{' '}
              {uniqueMatches.length === 1 ? 'saved match' : 'saved matches'} in archive
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

      {/* 16:9 International Broadcast Match Summary Graphic */}
      <div className="match-summary-print-root">
        <BroadcastMatchSummaryCard
          match={activeMatch}
          tournament={activeTournament}
          group={activeGroup}
          teamMap={teamMap}
          channelTitle={state.user.channelTitle || 'STAR EVENT LIVE'}
        />
      </div>

      {/* Full Match Details, Statistics, POM, Complete Batting/Bowling, Extras, FOW, Partnerships, Over-by-Over */}
      <FullMatchScorecardSections
        report={fullReport}
        match={activeMatch}
        teamMap={teamMap}
        onSelectPlayerOfMatch={handleSelectPom}
      />

      {/* Saved Matches Archive (Previous & Current Match Summaries) */}
      <div className="no-print rounded-xl bg-white border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display font-bold text-sm sm:text-base text-slate-900">
              Saved Match Summaries Archive
            </h3>
            <p className="text-xs text-slate-500">
              Select any live or completed match below to load its full report, export PNG/PDF, or push live to OBS/vMix.
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
                      ? 'wo-btn-active text-white'
                      : 'text-slate-600 hover:text-[#E87500]'
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
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-300 focus:border-[#FF8C00] focus:bg-white focus:outline-none text-xs text-slate-900"
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
                      ? 'bg-[#FFF3E0]/60 border-[#FF8C00] ring-2 ring-[#FF8C00]/25'
                      : 'bg-white border-slate-200 hover:border-[#FF8C00]/60 hover:bg-[#FFFBF5]'
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

                  <p className="text-[11px] font-bold text-[#E87500] truncate pt-1 border-t border-slate-100">
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
