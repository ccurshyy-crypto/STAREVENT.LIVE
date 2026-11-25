import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Calculator,
  ChevronDown,
  ChevronRight,
  Crosshair,
  Home,
  LogOut,
  Menu,
  Palette,
  Radio,
  Settings,
  Table2,
  Trophy,
  Tv,
  UserCircle,
  Users,
  X,
} from 'lucide-react';
import { UnlockedOverlaySession } from '../../context/OverlayAccessContext';
import { useCricketSuiteStore } from '../../hooks/useCricketSuiteStore';
import { SidebarRoute } from '../../types/cricketSuite';
import { CricketHomeView } from './CricketHomeView';
import { MatchListView } from './MatchListView';
import { ScoringDashboardView } from './ScoringDashboardView';
import { SidebarToolsViews } from './SidebarToolsViews';
import { TeamManagerView } from './TeamManagerView';
import { TournamentManagerView } from './TournamentManagerView';
import { TvOverlayControllerView } from './TvOverlayControllerView';

interface CricketSuiteAppProps {
  session: UnlockedOverlaySession;
  onLogout: () => void;
  onBackHome: () => void;
}

export function CricketSuiteApp({
  session,
  onLogout,
  onBackHome,
}: CricketSuiteAppProps) {
  const { uid, state, updateState, resetDemoData } = useCricketSuiteStore(
    session.accessId,
    session.label || undefined
  );

  const [activeRoute, setActiveRoute] = useState<SidebarRoute>('home');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [tournamentMenuOpen, setTournamentMenuOpen] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 2600);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const activeTournament = useMemo(
    () =>
      state.tournaments.find((t) => t.id === state.activeTournamentId) ??
      state.tournaments[0],
    [state.tournaments, state.activeTournamentId]
  );

  const activeMatch = useMemo(
    () =>
      state.matches.find((m) => m.id === state.activeMatchId) ?? state.matches[0],
    [state.matches, state.activeMatchId]
  );

  const overlayUrl = useMemo(() => {
    const basePath = `/overlay?id=${encodeURIComponent(uid)}`;
    if (typeof window === 'undefined') return basePath;
    return `${window.location.origin}${basePath}`;
  }, [uid]);

  const handleCopyOverlayUrl = useCallback(
    (customUrl?: string, label = 'OBS / vMix Overlay Link') => {
      const targetUrl = customUrl || overlayUrl;
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        navigator.clipboard
          .writeText(targetUrl)
          .then(() => showToast(`${label} copied to clipboard!`))
          .catch(() =>
            showToast('Copy failed — please select and copy the link manually.')
          );
        return;
      }
      try {
        const textarea = document.createElement('textarea');
        textarea.value = targetUrl;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast(`${label} copied to clipboard!`);
      } catch {
        showToast('Copy failed — please select and copy the link manually.');
      }
    },
    [overlayUrl, showToast]
  );

  const navigateTo = useCallback((route: SidebarRoute) => {
    setActiveRoute(route);
    setDrawerOpen(false);
    if (
      route === 'tournament' ||
      route === 'tournament-groups' ||
      route === 'tournament-teams'
    ) {
      setTournamentMenuOpen(true);
    }
  }, []);

  const handleOpenScoring = useCallback(
    (matchId: string) => {
      updateState((prev) => ({
        ...prev,
        activeMatchId: matchId,
      }));
      setActiveRoute('scoring');
      setDrawerOpen(false);
    },
    [updateState]
  );

  const handleRequestLogout = useCallback(() => {
    setShowLogoutConfirm(true);
  }, []);

  const headerTitle = useMemo(() => {
    switch (activeRoute) {
      case 'home':
        return 'Home';
      case 'tournament':
        return 'Tournament Management';
      case 'tournament-groups':
        return 'Tournament / Groups';
      case 'tournament-teams':
        return 'Tournament / Teams';
      case 'team':
        return 'Team Management';
      case 'match':
        return activeTournament ? `Match / ${activeTournament.name}` : 'Match Management';
      case 'scoring':
        return 'Scoring Dashboard';
      case 'overlay':
        return 'Scoreboard Overlay Control';
      case 'point-table':
        return 'Edit Point Table';
      case 'runrate':
        return 'Runrate Predictor';
      case 'player-position':
        return 'Player Position';
      case 'theme':
        return 'Theme Setup';
      case 'statistics':
        return 'Statistics';
      case 'setting':
        return 'Setting';
      case 'account':
        return 'User Account';
      default:
        return 'Home';
    }
  }, [activeRoute, activeTournament]);

  const navItemClass = (isActive: boolean) =>
    `w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-left text-xs font-semibold tracking-wide transition-colors ${
      isActive
        ? 'bg-[#FFF3E0] text-[#E87500] border border-[#FF8C00]/30 shadow-xs'
        : 'text-slate-700 hover:text-[#FF8C00] hover:bg-[#FFF3E0]/70'
    }`;

  const renderSidebarContent = (isMobileDrawer: boolean) => (
    <div className="flex flex-col h-full bg-white text-slate-800">
      {/* Brand Header */}
      <div className="px-4 py-4 border-b border-slate-200 flex items-center justify-between gap-2 bg-slate-50">
        <div className="flex items-center gap-3 min-w-0">
          {state.user.channelLogoUrl ? (
            <img
              src={state.user.channelLogoUrl}
              alt={state.user.channelTitle}
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-[#FF8C00] flex items-center justify-center font-display font-black text-sm text-white shrink-0">
              SE
            </div>
          )}
          <div className="min-w-0">
            <p className="font-display font-bold text-sm text-slate-900 truncate">
              {state.user.channelTitle || 'STAR EVENT LIVE'}
            </p>
            <p className="text-[11px] font-mono text-slate-500 truncate">
              UID: {uid}
            </p>
          </div>
        </div>
        {isMobileDrawer && (
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close navigation menu"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* 13 Exact Navigation Links */}
      <nav
        aria-label="Cricket Tournament Navigation"
        className="flex-1 overflow-y-auto px-3 py-3 space-y-1"
      >
        <button
          type="button"
          onClick={() => navigateTo('home')}
          className={navItemClass(activeRoute === 'home')}
        >
          <Home className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>HOME</span>
        </button>

        {/* Expandable TOURNAMENT Menu */}
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setTournamentMenuOpen((prev) => !prev)}
            className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-lg text-left text-xs font-semibold tracking-wide transition-colors ${
              activeRoute === 'tournament' ||
              activeRoute === 'tournament-groups' ||
              activeRoute === 'tournament-teams'
                ? 'bg-[#FFF3E0] text-[#E87500]'
                : 'text-slate-700 hover:text-[#FF8C00] hover:bg-[#FFF3E0]/70'
            }`}
          >
            <span className="flex items-center gap-3">
              <Trophy className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>TOURNAMENT</span>
            </span>
            {tournamentMenuOpen ? (
              <ChevronDown className="w-4 h-4 shrink-0" aria-hidden="true" />
            ) : (
              <ChevronRight className="w-4 h-4 shrink-0" aria-hidden="true" />
            )}
          </button>

          {tournamentMenuOpen && (
            <div className="ml-4 pl-3 border-l border-slate-200 space-y-1 py-0.5">
              <button
                type="button"
                onClick={() => navigateTo('tournament')}
                className={navItemClass(activeRoute === 'tournament')}
              >
                <span>TOURNAMENT</span>
              </button>
              <button
                type="button"
                onClick={() => navigateTo('tournament-groups')}
                className={navItemClass(activeRoute === 'tournament-groups')}
              >
                <span>TOURNAMENT GROUPS</span>
              </button>
              <button
                type="button"
                onClick={() => navigateTo('tournament-teams')}
                className={navItemClass(activeRoute === 'tournament-teams')}
              >
                <span>TOURNAMENT TEAMS</span>
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => navigateTo('team')}
          className={navItemClass(activeRoute === 'team')}
        >
          <Users className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>TEAM</span>
        </button>

        <button
          type="button"
          onClick={() => navigateTo('match')}
          className={navItemClass(activeRoute === 'match' || activeRoute === 'scoring')}
        >
          <Radio className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>MATCH</span>
        </button>

        <button
          type="button"
          onClick={() => navigateTo('overlay')}
          className={navItemClass(activeRoute === 'overlay')}
        >
          <Tv className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span className="truncate">SCOREBOARD OVERLAY CONTROL</span>
        </button>

        <button
          type="button"
          onClick={() => navigateTo('point-table')}
          className={navItemClass(activeRoute === 'point-table')}
        >
          <Table2 className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>EDIT POINT TABLE</span>
        </button>

        <button
          type="button"
          onClick={() => navigateTo('runrate')}
          className={navItemClass(activeRoute === 'runrate')}
        >
          <Calculator className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>RUNRATE PREDICTOR</span>
        </button>

        <button
          type="button"
          onClick={() => navigateTo('player-position')}
          className={navItemClass(activeRoute === 'player-position')}
        >
          <Crosshair className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>PLAYER POSITION</span>
        </button>

        <button
          type="button"
          onClick={() => navigateTo('theme')}
          className={navItemClass(activeRoute === 'theme')}
        >
          <Palette className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>THEME SETUP</span>
        </button>

        <button
          type="button"
          onClick={() => navigateTo('statistics')}
          className={navItemClass(activeRoute === 'statistics')}
        >
          <BarChart3 className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>STATISTICS</span>
        </button>

        <button
          type="button"
          onClick={() => navigateTo('setting')}
          className={navItemClass(activeRoute === 'setting')}
        >
          <Settings className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>SETTING</span>
        </button>

        <div className="pt-2 mt-2 border-t border-slate-200 space-y-1">
          <button
            type="button"
            onClick={() => navigateTo('account')}
            className={navItemClass(activeRoute === 'account')}
          >
            <UserCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>USER ACCOUNT</span>
          </button>

          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-left text-xs font-semibold tracking-wide text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>LOGOUT</span>
          </button>
        </div>
      </nav>
    </div>
  );

  return (
    <div className="min-h-[85vh] bg-[#F3F4F6] text-slate-900">
      {/* Orange Dashboard Header (#FF8C00) */}
      <header className="sticky top-0 z-30 bg-[#FF8C00] text-white shadow-sm px-3 sm:px-5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu drawer"
              className="lg:hidden p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => setDesktopSidebarOpen((prev) => !prev)}
              aria-label="Toggle sidebar"
              className="hidden lg:inline-flex p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </button>

            <h1 className="font-display font-bold text-base sm:text-lg text-white truncate">
              {headerTitle}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {activeMatch && activeRoute !== 'scoring' && (
              <button
                type="button"
                onClick={() => navigateTo('scoring')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-semibold text-white transition-colors whitespace-nowrap"
              >
                <Radio className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Open Scoring ({activeMatch.matchLabel})</span>
              </button>
            )}

            <button
              type="button"
              onClick={onBackHome}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors whitespace-nowrap"
            >
              <ArrowLeft className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">Website Home</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Layout: White Left Sidebar + Light Grey Workspace */}
      <div className="flex min-h-[calc(85vh-60px)]">
        {desktopSidebarOpen && (
          <aside className="hidden lg:block w-64 shrink-0 border-r border-slate-200 bg-white">
            <div className="sticky top-[60px] h-[calc(100vh-60px)]">
              {renderSidebarContent(false)}
            </div>
          </aside>
        )}

        <div className="flex-1 min-w-0 px-3 sm:px-6 py-5">
          <div className="max-w-7xl mx-auto">
            {activeRoute === 'home' && (
              <CricketHomeView
                state={state}
                overlayUrl={overlayUrl}
                onCopyOverlayUrl={handleCopyOverlayUrl}
                onNavigate={navigateTo}
              />
            )}

            {(activeRoute === 'tournament' ||
              activeRoute === 'tournament-groups' ||
              activeRoute === 'tournament-teams') && (
              <TournamentManagerView
                mode={activeRoute}
                state={state}
                updateState={updateState}
                onOpenScoring={handleOpenScoring}
                onToast={showToast}
              />
            )}

            {activeRoute === 'team' && (
              <TeamManagerView
                state={state}
                updateState={updateState}
                onToast={showToast}
              />
            )}

            {activeRoute === 'match' && (
              <MatchListView
                state={state}
                updateState={updateState}
                onOpenScoring={handleOpenScoring}
                onToast={showToast}
              />
            )}

            {activeRoute === 'scoring' && (
              <ScoringDashboardView
                state={state}
                updateState={updateState}
                onOpenOverlayController={() => navigateTo('overlay')}
                onNavigateToMatches={() => navigateTo('match')}
                onToast={showToast}
              />
            )}

            {activeRoute === 'overlay' && (
              <TvOverlayControllerView
                state={state}
                overlayUrl={overlayUrl}
                updateState={updateState}
                onCopyOverlayUrl={handleCopyOverlayUrl}
                onGoToGroups={() => navigateTo('tournament-groups')}
                onToast={showToast}
                onRequestLogout={handleRequestLogout}
              />
            )}

            {(activeRoute === 'point-table' ||
              activeRoute === 'runrate' ||
              activeRoute === 'player-position' ||
              activeRoute === 'theme' ||
              activeRoute === 'statistics' ||
              activeRoute === 'setting' ||
              activeRoute === 'account') && (
              <SidebarToolsViews
                route={activeRoute}
                state={state}
                updateState={updateState}
                onResetDemoData={() => {
                  resetDemoData();
                  showToast('Workspace reset to clean blank state.');
                }}
                onToast={showToast}
              />
            )}
          </div>
        </div>
      </div>

      {/* Mobile Slide-Out Left Drawer */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex"
          role="dialog"
          aria-modal="true"
          aria-label="Dashboard navigation drawer"
        >
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="relative z-10 w-72 max-w-[85vw] h-full shadow-2xl">
            {renderSidebarContent(true)}
          </div>
        </div>
      )}

      {/* Inline Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55"
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-confirm-title"
        >
          <div className="w-full max-w-sm rounded-xl bg-white border border-slate-200 p-5 space-y-4 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <h2
                  id="logout-confirm-title"
                  className="font-display font-bold text-base text-slate-900"
                >
                  Sign Out of Dashboard?
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                  All tournaments, teams, matches, and scores for{' '}
                  <span className="font-mono font-semibold text-slate-900">{uid}</span> remain saved.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  onLogout();
                }}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-xs font-semibold text-white"
              >
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 max-w-sm px-4 py-3 rounded-lg bg-slate-900 text-white shadow-xl text-xs sm:text-sm font-medium"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
