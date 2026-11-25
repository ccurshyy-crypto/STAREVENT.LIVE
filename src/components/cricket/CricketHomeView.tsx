import { useState } from 'react';
import {
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  Palette,
  Radio,
  Trophy,
  Tv,
  Users,
} from 'lucide-react';
import { getThemePalette } from '../../data/cricketSampleData';
import { CricketSuiteState, SidebarRoute } from '../../types/cricketSuite';

interface CricketHomeViewProps {
  state: CricketSuiteState;
  overlayUrl: string;
  onCopyOverlayUrl: () => void;
  onNavigate: (route: SidebarRoute) => void;
}

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

  const activeTheme = getThemePalette(state.user.userTheme, state.user.customThemeColors);

  const rows: Array<{ label: string; value: string }> = [
    { label: 'User Name', value: state.user.userName },
    { label: 'User Email', value: state.user.userEmail },
    { label: 'User Mobile No.', value: state.user.userMobile },
    { label: 'Selected Overlay Theme', value: activeTheme.name },
    { label: 'Subscription Start Date', value: state.user.subscriptionStartDate },
    { label: 'Subscription End Date', value: state.user.subscriptionEndDate },
    { label: 'Total Tournaments', value: String(state.tournaments.length) },
    { label: 'Total Teams', value: String(state.teams.length) },
    { label: 'Total Matches', value: String(state.matches.length) },
    { label: 'Plan Name', value: state.user.planName },
    { label: 'Balance Tournaments', value: String(state.user.balanceTournaments) },
  ];

  const steps: Array<{
    step: string;
    title: string;
    done: boolean;
    route: SidebarRoute;
    cta: string;
  }> = [
    {
      step: '01',
      title: 'Create Tournament',
      done: state.tournaments.length > 0,
      route: 'tournament',
      cta: state.tournaments.length > 0 ? 'Manage' : 'Create Tournament',
    },
    {
      step: '02',
      title: 'Create Teams & Add Players',
      done: state.teams.length >= 2,
      route: 'team',
      cta: state.teams.length > 0 ? 'Manage Teams' : 'Create Team',
    },
    {
      step: '03',
      title: 'Create Match & Score Live',
      done: state.matches.length > 0,
      route: 'match',
      cta: state.matches.length > 0 ? 'Open Matches' : 'Create Match',
    },
    {
      step: '04',
      title: 'Control vMix Scoreboard Overlay',
      done: false,
      route: 'overlay',
      cta: 'Overlay Login',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => onNavigate('tournament')}
          className="text-left rounded-xl bg-white border border-slate-200 hover:border-[#FF8C00] p-4 transition-colors shadow-xs"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Tournaments</span>
            <Trophy className="w-4 h-4 text-[#FF8C00]" aria-hidden="true" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {state.tournaments.length}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('team')}
          className="text-left rounded-xl bg-white border border-slate-200 hover:border-[#FF8C00] p-4 transition-colors shadow-xs"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Teams</span>
            <Users className="w-4 h-4 text-[#FF8C00]" aria-hidden="true" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {state.teams.length}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('match')}
          className="text-left rounded-xl bg-white border border-slate-200 hover:border-[#FF8C00] p-4 transition-colors shadow-xs"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Matches</span>
            <Radio className="w-4 h-4 text-emerald-600" aria-hidden="true" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {state.matches.length}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('theme')}
          className="text-left rounded-xl bg-white border border-slate-200 hover:border-[#FF8C00] p-4 transition-colors shadow-xs"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Broadcast Theme</span>
            <Palette className="w-4 h-4 text-[#FF8C00]" aria-hidden="true" />
          </div>
          <p className="mt-2 font-display text-sm font-bold text-slate-900 truncate">
            {activeTheme.name}
          </p>
        </button>
      </div>

      {/* Tournament Setup Workflow Strip */}
      <div className="rounded-xl bg-white border border-slate-200 p-5 space-y-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display font-bold text-base text-slate-900">
              Quick Tournament Workflow
            </h2>
            <p className="text-xs text-slate-500">
              Start fresh — only tournaments, teams, players, and matches you create will appear.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('overlay')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#FF8C00] hover:bg-[#E87500] text-white text-xs font-semibold transition-colors whitespace-nowrap"
          >
            <Tv className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Scoreboard Overlay Control</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {steps.map((s) => (
            <div
              key={s.step}
              className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 flex flex-col justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-[#FF8C00]">Step {s.step}</span>
                  <span
                    className={`font-semibold ${
                      s.done ? 'text-emerald-600' : 'text-slate-400'
                    }`}
                  >
                    {s.done ? 'Ready' : 'Pending'}
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-900">{s.title}</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate(s.route)}
                className="inline-flex items-center justify-between gap-1.5 px-3 py-1.5 rounded-md bg-white hover:bg-[#FFF3E0] border border-slate-200 text-xs font-semibold text-[#FF8C00] transition-colors"
              >
                <span>{s.cta}</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* User Details & Public vMix Link Card */}
      <div className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display font-bold text-base text-slate-900">
            Account &amp; vMix Output Details
          </h2>
          <span className="font-mono text-xs font-semibold text-slate-600">
            UID: {state.uid}
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {rows.map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-4 px-5 py-3 hover:bg-slate-50/70 transition-colors"
            >
              <div className="sm:col-span-4 text-xs sm:text-sm font-medium text-slate-500">
                {row.label}
              </div>
              <div className="sm:col-span-8 text-sm font-semibold text-slate-900 break-words tabular-nums">
                {row.value}
              </div>
            </div>
          ))}

          {/* Public vMix Link Row */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 px-5 py-4 bg-[#FFF3E0]/70 items-center">
            <div className="sm:col-span-4 text-xs sm:text-sm font-bold text-[#E87500]">
              Public vMix / OBS Overlay Link
            </div>
            <div className="sm:col-span-8 flex flex-wrap items-center gap-2">
              <div className="flex-1 min-w-[200px] flex items-center gap-2 rounded-lg bg-white border border-slate-300 px-3 py-2">
                <span className="font-mono text-xs text-slate-700 truncate flex-1">
                  {overlayUrl}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  aria-label="Copy vMix overlay link"
                  className="p-1.5 rounded-md bg-slate-100 hover:bg-[#FF8C00] text-slate-700 hover:text-white transition-colors shrink-0"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <a
                href={overlayUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#FF8C00] hover:bg-[#E87500] text-white text-xs font-semibold transition-colors whitespace-nowrap"
              >
                <span>Open Public Output</span>
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
