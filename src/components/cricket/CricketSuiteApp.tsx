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
  ShieldCheck,
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
import { AdminAccessKeysPanel } from '../AdminAccessKeysPanel';
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
  const [showAdminModal, setShowAdminModal] = useState(false);
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

  const overlayUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      return `/overlay?uid=${encodeURIComponent(uid)}`;
    }
    return `${window.location.origin}/overlay?uid=${encodeURIComponent(uid)}`;
  }, [uid]);

  const handleCopyOverlayUrl = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(overlayUrl)
        .then(() => showToast('vMix Overlay Link copied to clipboard!'))
        .catch(() => showToast('Copy failed — please select and copy the link manually.'));
      return;
    }
    try {
      const textarea = document.createElement('textarea');
      textarea.value = overlayUrl;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      showToast('vMix Overlay Link copied to clipboard!');
    } catch {
      showToast('Copy failed — please select and copy the link manually.');
    }
  }, [overlayUrl, showToast]);

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

  const breadcrumbText = useMemo(() => {
    switch (activeRoute) {
      case 'home':
        return '> Home';
      case 'tournament':
        return '> Tournament';
      case 'tournament-groups':
        return '> Tournament > Groups';
      case 'tournament-teams':
        return '> Tournament > Teams';
      case 'team':
        return '> Team';
      case 'match':
        return `> ${activeTournament?.name || 'Tournament'} >`;
      case 'scoring':
        return 'Scoring Dashboard';
      case 'overlay':
        return 'TV Settings > Scorecard Controller';
      case 'point-table':
        return '> Edit Point Table';
      case 'runrate':
        return '> Runrate Predictor';
      case 'player-position':
        return '> Player Position';
      case 'theme':
        return '> Theme Setup';
      case 'statistics':
        return '> Statistics';
      case 'setting':
        return '> Setting';
      case 'account':
        return '> User Account';
      default:
        return '> Home';
    }
  }, [activeRoute, activeTournament]);

  const navItemClass = (isActive: boolean) =>
    `w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left text-xs font-bold tracking-wider uppercase transition-all ${
      isActive
        ? 'bg-gradient-to-r from-[#DC2626] to-[#991B1B] text-white border border-[#FFE600]/45 shadow-[0_6px_18px_rgba(220,38,38,0.35)]'
        : 'text-zinc-300 hover:text-white hover:bg-white/5 border border-transparent'
    }`;

  const renderSidebarContent = (isMobileDrawer: boolean) => (
    <div className="flex flex-col h-full bg-[#09090D] text-[#F4F4F5]">
      {/* Brand Header */}
      <div className="px-4 py-4 border-b border-white/10 bg-gradient-to-r from-[#14070A] via-[#111116] to-[#09090D] flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          {state.user.channelLogoUrl ? (
            <img
              src={state.user.channelLogoUrl}
              alt={state.user.channelTitle}
              className="w-10 h-10 rounded-xl object-cover border border-[#FFE600]/45 shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#DC2626] to-[#7F1D1D] border border-[#FFE600]/60 flex items-center justify-center font-display font-black text-sm text-[#FFE600] shrink-0">
              SE
            </div>
          )}
          <div className="min-w-0">
            <p className="font-display font-black text-sm tracking-wide text-white truncate">
              {state.user.channelTitle || 'STAR EVENT LIVE'}
            </p>
            <p className="text-[11px] font-mono text-[#FFE600] truncate">
              ID: {uid}
            </p>
          </div>
        </div>
        {isMobileDrawer && (
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close navigation menu"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav
        aria-label="Cricket Tournament Workspace Navigation"
        className="flex-1 overflow-y-auto px-3 py-3 space-y-1"
      >
        <button
          type="button"
          onClick={() => navigateTo('home')}
          className={navItemClass(activeRoute === 'home')}
        >
          <Home className="w-4 h-4 text-[#FFE600] shrink-0" aria-hidden="true" />
          <span>HOME</span>
        </button>

        {/* Expandable TOURNAMENT Submenu */}
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setTournamentMenuOpen((prev) => !prev)}
            className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl text-left text-xs font-bold tracking-wider uppercase transition-all ${
              activeRoute === 'tournament' ||
              activeRoute === 'tournament-groups' ||
              activeRoute === 'tournament-teams'
                ? 'bg-white/10 text-[#FFE600] border border-[#FFE600]/30'
                : 'text-zinc-300 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <span className="flex items-center gap-3">
              <Trophy className="w-4 h-4 text-[#FFE600] shrink-0" aria-hidden="true" />
              <span>TOURNAMENT</span>
            </span>
            {tournamentMenuOpen ? (
              <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" aria-hidden="true" />
            ) : (
              <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" aria-hidden="true" />
            )}
          </button>

          {tournamentMenuOpen && (
            <div className="ml-4 pl-3 border-l border-white/10 space-y-1 py-0.5">
              <button
                type="button"
                onClick={() => navigateTo('tournament')}
                className={navItemClass(activeRoute === 'tournament')}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#FFE600] shrink-0" />
                <span>TOURNAMENT</span>
              </button>
              <button
                type="button"
                onClick={() => navigateTo('tournament-groups')}
                className={navItemClass(activeRoute === 'tournament-groups')}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#FFE600] shrink-0" />
                <span>TOURNAMENT GROUPS</span>
              </button>
              <button
                type="button"
                onClick={() => navigateTo('tournament-teams')}
                className={navItemClass(activeRoute === 'tournament-teams')}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#FFE600] shrink-0" />
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
          <Users className="w-4 h-4 text-[#FFE600] shrink-0" aria-hidden="true" />
          <span>TEAM</span>
        </button>

        <button
          type="button"
          onClick={() => navigateTo('match')}
          className={navItemClass(activeRoute === 'match' || activeRoute === 'scoring')}
        >
          <Radio className="w-4 h-4 text-[#FFE600] shrink-0" aria-hidden="true" />
          <span>MATCH</span>
        </button>

        <button
          type="button"
          onClick={() => navigateTo('overlay')}
          className={navItemClass(activeRoute === 'overlay')}
        >
          <Tv className="w-4 h-4 text-[#FFE600] shrink-0" aria-hidden="true" />
          <span>OVERLAY</span>
        </button>

        <button
          type="button"
          onClick={() => navigateTo('point-table')}
          className={navItemClass(activeRoute === 'point-table')}
        >
          <Table2 className="w-4 h-4 text-[#FFE600] shrink-0" aria-hidden="true" />
          <span>EDIT POINT TABLE</span>
        </button>

        <button
          type="button"
          onClick={() => navigateTo('runrate')}
          className={navItemClass(activeRoute === 'runrate')}
        >
          <Calculator className="w-4 h-4 text-[#FFE600] shrink-0" aria-hidden="true" />
          <span>RUNRATE PREDICTOR</span>
        </button>

        <button
          type="button"
          onClick={() => navigateTo('player-position')}
          className={navItemClass(activeRoute === 'player-position')}
        >
          <Crosshair className="w-4 h-4 text-[#FFE600] shrink-0" aria-hidden="true" />
          <span>PLAYER POSITION</span>
        </button>

        <button
          type="button"
          onClick={() => navigateTo('theme')}
          className={navItemClass(activeRoute === 'theme')}
        >
          <Palette className="w-4 h-4 text-[#FFE600] shrink-0" aria-hidden="true" />
          <span>THEME SETUP</span>
        </button>

        <button
          type="button"
          onClick={() => navigateTo('statistics')}
          className={navItemClass(activeRoute === 'statistics')}
        >
          <BarChart3 className="w-4 h-4 text-[#FFE600] shrink-0" aria-hidden="true" />
          <span>STATISTICS</span>
        </button>

        <button
          type="button"
          onClick={() => navigateTo('setting')}
          className={navItemClass(activeRoute === 'setting')}
        >
          <Settings className="w-4 h-4 text-[#FFE600] shrink-0" aria-hidden="true" />
          <span>SETTING</span>
        </button>
      </nav>

      {/* Bottom Blue Action Buttons (USER ACCOUNT & LOGOUT) */}
      <div className="p-3 border-t border-white/10 space-y-2 bg-[#0B0B10]">
        <button
          type="button"
          onClick={() => navigateTo('account')}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors ${
            activeRoute === 'account'
              ? 'bg-blue-500 text-white ring-2 ring-[#FFE600]'
              : 'bg-blue-600 hover:bg-blue-500 text-white'
          }`}
        >
          <UserCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>USER ACCOUNT</span>
        </button>

        <button
          type="button"
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-bold text-xs uppercase tracking-wider transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>LOGOUT</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-[82vh] bg-[#09090D] text-[#F4F4F5] border-t border-white/10">
      {/* Top Hindi Notice Banner */}
      <div className="bg-gradient-to-r from-[#7F1D1D] via-[#B91C1C] to-[#7F1D1D] border-b border-[#FFE600]/35 px-3 py-1.5 text-center">
        <p className="text-[11px] sm:text-xs font-semibold text-[#FEF9C3] tracking-wide">
          तीन महीने से पुराना टूर्नामेंट डेटा स्थायी रूप से हटाया जाएगा।
        </p>
      </div>

      {/* Workspace Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-[#111116]/95 backdrop-blur-md border-b border-white/10 px-3 sm:px-5 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Mobile Drawer Trigger */}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu drawer"
              className="lg:hidden p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/15 text-[#FFE600]"
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </button>

            {/* Desktop Sidebar Collapse Toggle */}
            <button
              type="button"
              onClick={() => setDesktopSidebarOpen((prev) => !prev)}
              aria-label="Toggle sidebar"
              className="hidden lg:inline-flex p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/15 text-[#FFE600]"
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </button>

            <div className="min-w-0">
              <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#FFE600]">
                STAR EVENT LIVE · CRICKET SUITE
              </p>
              <h1 className="font-display font-bold text-sm sm:text-base text-white truncate">
                {breadcrumbText}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeMatch && (
              <button
                type="button"
                onClick={() => navigateTo('scoring')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                  activeRoute === 'scoring'
                    ? 'bg-[#FFE600] text-[#09090D]'
                    : 'bg-[#DC2626]/20 hover:bg-[#DC2626]/35 border border-[#DC2626]/50 text-red-200'
                }`}
              >
                <Radio className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>{activeMatch.matchLabel} Scoring</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => navigateTo('overlay')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                activeRoute === 'overlay'
                  ? 'bg-[#FFE600] text-[#09090D]'
                  : 'bg-teal-600/25 hover:bg-teal-600/40 border border-teal-400/45 text-teal-200'
              }`}
            >
              <Tv className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>TV Controller</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAdminModal(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/15 hover:border-[#FFE600]/45 text-xs font-semibold text-zinc-300 hover:text-[#FFE600] transition-colors whitespace-nowrap"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#FFE600] shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">Admin</span>
            </button>

            <button
              type="button"
              onClick={onBackHome}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-semibold text-zinc-300 hover:text-white transition-colors whitespace-nowrap"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#FFE600] shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">Site Home</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout: Desktop Collapsible Sidebar + Content */}
      <div className="flex min-h-[calc(82vh-88px)]">
        {desktopSidebarOpen && (
          <aside className="hidden lg:block w-64 shrink-0 border-r border-white/10">
            <div className="sticky top-[57px] h-[calc(100vh-57px)]">
              {renderSidebarContent(false)}
            </div>
          </aside>
        )}

        <div className="flex-1 min-w-0 px-3 sm:px-5 lg:px-7 py-5">
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
                  showToast('Sample tournament & match data restored.');
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
          aria-label="Workspace navigation drawer"
        >
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-xs"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="relative z-10 w-72 max-w-[84vw] h-full border-r border-[#FFE600]/30 shadow-2xl">
            {renderSidebarContent(true)}
          </div>
        </div>
      )}

      {/* Inline Logout Confirmation Modal (No window.confirm) */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-confirm-title"
        >
          <div className="w-full max-w-sm rounded-2xl bg-[#111116] border border-[#FFE600]/35 overflow-hidden shadow-2xl">
            <div className="h-1 bg-gradient-to-r from-[#DC2626] via-[#FFE600] to-[#DC2626]" />
            <div className="p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-950/70 border border-red-500/40 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-[#FFE600]" aria-hidden="true" />
                </div>
                <div className="space-y-1">
                  <h2
                    id="logout-confirm-title"
                    className="font-display font-bold text-base text-white"
                  >
                    Lock & Logout?
                  </h2>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Your tournament data for <span className="font-mono text-[#FFE600]">{uid}</span> stays saved. You will need your Access ID and Password to unlock again.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-bold text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowLogoutConfirm(false);
                    onLogout();
                  }}
                  className="px-4 py-2 rounded-xl bg-[#DC2626] hover:bg-[#EF4444] text-xs font-bold text-white"
                >
                  Yes, Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Discreet Admin Access Keys Modal */}
      {showAdminModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Admin Access Keys Generator"
        >
          <div className="w-full max-w-2xl rounded-2xl bg-[#111116] border border-[#FFE600]/35 overflow-hidden shadow-2xl my-auto">
            <div className="h-1 bg-gradient-to-r from-[#DC2626] via-[#FFE600] to-[#DC2626]" />
            <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#FFE600]">
                Admin Access Key Manager
              </span>
              <button
                type="button"
                onClick={() => setShowAdminModal(false)}
                aria-label="Close admin panel"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            <div className="p-5 max-h-[80vh] overflow-y-auto">
              <AdminAccessKeysPanel />
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 max-w-sm px-4 py-3 rounded-xl bg-[#111116] border border-[#FFE600]/60 shadow-[0_14px_40px_rgba(0,0,0,0.75)] flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-white"
        >
          <span className="w-2 h-2 rounded-full bg-[#FFE600] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
