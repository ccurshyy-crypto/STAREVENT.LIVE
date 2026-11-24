import { Check, Copy, ExternalLink, Radio, ShieldCheck, Trophy, Tv, Users } from 'lucide-react';
import { useState } from 'react';
import { CricketSuiteState, SidebarRoute } from '../../types/cricketSuite';

interface CricketHomeViewProps {
  state: CricketSuiteState;
  overlayUrl: string;
  onCopyOverlayUrl: () => void;
  onNavigate: (route: SidebarRoute) => void;
}

const THEME_LABELS: Record<string, string> = {
  theme14: 'theme14 · Classic Broadcast',
  'star-red-gold': 'theme14 / Star Event Red & Gold',
  'royal-navy-gold': 'Royal Navy & Metallic Gold',
  'emerald-gold': 'Emerald Stadium & Gold',
};

export function CricketHomeView({
  state,
  overlayUrl,
  onCopyOverlayUrl,
  onNavigate,
}: CricketHomeViewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopyOverlayUrl();
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const rows: Array<{ label: string; value: string; accent?: boolean }> = [
    { label: 'User Name', value: state.user.userName },
    { label: 'User Email', value: state.user.userEmail },
    { label: 'User Mobile No.', value: state.user.userMobile },
    {
      label: 'User Theme',
      value: THEME_LABELS[state.user.userTheme] || state.user.userTheme,
      accent: true,
    },
    { label: 'Subscription Start Date', value: state.user.subscriptionStartDate },
    { label: 'Subscription End Date', value: state.user.subscriptionEndDate },
    { label: 'Total Tournaments', value: String(state.tournaments.length) },
    { label: 'Total Matches', value: String(state.matches.length) },
    { label: 'Total Teams', value: String(state.teams.length) },
    { label: 'Plan Name', value: state.user.planName, accent: true },
    { label: 'Balance Tournaments', value: String(state.user.balanceTournaments) },
  ];

  return (
    <div className="space-y-5">
      {/* Quick Broadcast KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => onNavigate('tournament')}
          className="text-left rounded-xl bg-[#111116] border border-[#FFE600]/25 hover:border-[#FFE600]/65 p-4 transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Tournaments</span>
            <Trophy className="w-4 h-4 text-[#FFE600]" />
          </div>
          <p className="mt-2 font-mono text-2xl font-black text-white tabular-nums">
            {state.tournaments.length}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('team')}
          className="text-left rounded-xl bg-[#111116] border border-white/12 hover:border-[#FFE600]/55 p-4 transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Registered Teams</span>
            <Users className="w-4 h-4 text-sky-400" />
          </div>
          <p className="mt-2 font-mono text-2xl font-black text-white tabular-nums">
            {state.teams.length}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('match')}
          className="text-left rounded-xl bg-[#111116] border border-white/12 hover:border-[#DC2626]/70 p-4 transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Matches</span>
            <Radio className="w-4 h-4 text-[#EF4444]" />
          </div>
          <p className="mt-2 font-mono text-2xl font-black text-white tabular-nums">
            {state.matches.length}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('overlay')}
          className="text-left rounded-xl bg-gradient-to-br from-[#2B060B] to-[#111116] border border-[#DC2626]/55 hover:border-[#FFE600] p-4 transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-[#FFE600]">
            <span>TV Controller</span>
            <Tv className="w-4 h-4 text-[#FFE600]" />
          </div>
          <p className="mt-2 font-display text-sm font-black text-white uppercase tracking-wide">
            Open Scorecard Desk
          </p>
        </button>
      </div>

      {/* Exact User Details Card */}
      <div className="rounded-2xl bg-[#111116] border border-[#FFE600]/30 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.55)]">
        <div className="h-1 w-full bg-gradient-to-r from-[#DC2626] via-[#FFE600] to-[#DC2626]" />
        <div className="px-5 py-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-2 bg-[#16161E]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#FFE600]" aria-hidden="true" />
            <h2 className="font-display text-base sm:text-lg font-black text-white uppercase tracking-wide">
              User Details
            </h2>
          </div>
          <span className="font-mono text-xs px-2.5 py-1 rounded bg-[#DC2626]/20 border border-[#DC2626]/45 text-[#FFE600] font-bold">
            UID: {state.uid}
          </span>
        </div>

        <div className="divide-y divide-white/8">
          {rows.map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-4 px-5 py-3 hover:bg-white/[0.02] transition-colors"
            >
              <div className="sm:col-span-5 text-xs sm:text-sm font-semibold text-zinc-400">
                {row.label}
              </div>
              <div
                className={`sm:col-span-7 text-sm font-bold break-words ${
                  row.accent ? 'text-[#FFE600]' : 'text-white'
                }`}
              >
                {row.value}
              </div>
            </div>
          ))}

          {/* Vmix Link Row */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 px-5 py-4 bg-[#0D0D13] items-center">
            <div className="sm:col-span-5 text-xs sm:text-sm font-bold text-[#FFE600]">
              Vmix Link :
            </div>
            <div className="sm:col-span-7 flex flex-wrap items-center gap-2.5">
              <div className="flex-1 min-w-[200px] flex items-center gap-2 rounded-lg bg-[#09090D] border border-white/15 px-3 py-2">
                <span className="font-mono text-xs text-zinc-200 truncate flex-1">
                  {overlayUrl}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  aria-label="Copy vMix overlay link"
                  title="Copy vMix Link"
                  className="p-1.5 rounded-md bg-white/10 hover:bg-[#FFE600] text-[#FFE600] hover:text-black transition-colors shrink-0"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <a
                href={overlayUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#DC2626] hover:bg-[#EF4444] text-white font-display font-black text-xs uppercase tracking-wide shadow-md transition-colors whitespace-nowrap"
              >
                <span>Overlay Link</span>
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
