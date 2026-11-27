import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Calculator,
  ChevronDown,
  ChevronRight,
  Crosshair,
  Home,
  Loader2,
  LogOut,
  Menu,
  Palette,
  Radio,
  RefreshCw,
  Settings,
  Table2,
  Trophy,
  Tv,
  UserCircle,
  Users,
  WifiOff,
  X,
} from 'lucide-react';
import { UnlockedOverlaySession } from '../../context/OverlayAccessContext';
import {
  isMatchLockedByNewerMatch,
  isMatchTournamentExpired,
  isTournamentExpired,
  MATCH_LOCKED_MESSAGE,
  TOURNAMENT_EXPIRED_MESSAGE,
} from '../../data/cricketSampleData';
import { useCricketSuiteStore } from '../../hooks/useCricketSuiteStore';
import { SidebarRoute } from '../../types/cricketSuite';
import { CricketHomeView } from './CricketHomeView';
import { MatchListView } from './MatchListView';
import { ScoringDashboardView } from './ScoringDashboardView';
import { SidebarToolsViews } from './SidebarToolsViews';
import { TeamManagerView } from './TeamManagerView';
import { TournamentManagerView } from './TournamentManagerView';
import { TvOverlayControllerView } from './TvOverlayControllerView';
import { KabaddiControlDashboard } from '../kabaddi/KabaddiControlDashboard';

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
  const {
    uid,
    state,
    loadStatus,
    loadError,
    isOffline,
    hasPendingSync,
    updateState,
    resetDemoData,
    retryLoad,
    syncNow,
  } = useCricketSuiteStore(
    session.accessId,
    session.label || undefined
  );

  const [activeRoute, setActiveRoute] = useState<SidebarRoute>('home');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [tournamentMenuOpen, setTournamentMenuOpen] = useState(false);
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

  useEffect(() => {
    if (loadStatus !== 'ready' || typeof window === 'undefined') return;
    const flagKey = `cricket_suite_tata_ipl_2022_v1_${uid}`;
    if (window.localStorage.getItem(flagKey) === '1') return;
    window.localStorage.setItem(flagKey, '1');
    const isValidTheme =
      state.user.userTheme === 'tata-ipl-2022' ||
      state.user.userTheme === 'worldcup' ||
      state.user.userTheme === 'lightning-pro';
    if (!isValidTheme || state.user.customThemeColors?.enabled) {
      updateState((prev) => ({
        ...prev,
        user: {
          ...prev.user,
          userTheme: isValidTheme ? prev.user.userTheme : 'tata-ipl-2022',
          customThemeColors: {
            ...prev.user.customThemeColors,
            enabled: false,
          },
        },
      }));
    }
  }, [loadStatus, uid, state.user.userTheme, state.user.customThemeColors?.enabled, updateState]);

  // Automatically deactivate & mark expired tournaments whose selected dates have passed
  useEffect(() => {
    if (loadStatus !== 'ready') return;
    const enforceExpiry = () => {
      const now = new Date();
      const hasExpiredToSync = state.tournaments.some(
        (t) => isTournamentExpired(t, now) && (t.isActive || t.status !== 'expired')
      );
      const activeTour = state.tournaments.find((t) => t.id === state.activeTournamentId);
      const activeTourIsExpired = Boolean(activeTour && isTournamentExpired(activeTour, now));
      if (!hasExpiredToSync && !activeTourIsExpired) return;

      updateState((prev) => {
        const nextTours = prev.tournaments.map((t) =>
          isTournamentExpired(t, now)
            ? { ...t, isActive: false, status: 'expired' as const }
            : t
        );
        const currentActiveStillValid = nextTours.find(
          (t) => t.id === prev.activeTournamentId && !isTournamentExpired(t, now)
        );
        const fallbackActive =
          currentActiveStillValid ?? nextTours.find((t) => !isTournamentExpired(t, now));
        const nextActiveId = fallbackActive?.id || '';
        return {
          ...prev,
          activeTournamentId: nextActiveId,
          tournaments: nextTours.map((t) => ({
            ...t,
            isActive: t.id === nextActiveId && !isTournamentExpired(t, now),
          })),
        };
      });
    };

    enforceExpiry();
    const timer = window.setInterval(enforceExpiry, 60_000);
    return () => window.clearInterval(timer);
  }, [loadStatus, state.tournaments, state.activeTournamentId, updateState]);

  const activeTournament = useMemo(
    () =>
      state.tournaments.find(
        (t) => t.id === state.activeTournamentId && !isTournamentExpired(t)
      ) ?? state.tournaments.find((t) => !isTournamentExpired(t)),
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
      const targetMatch = state.matches.find((m) => m.id === matchId);
      if (targetMatch && isMatchTournamentExpired(targetMatch, state.tournaments)) {
        showToast(TOURNAMENT_EXPIRED_MESSAGE);
        return;
      }
      if (targetMatch && isMatchLockedByNewerMatch(targetMatch, state.matches)) {
        showToast(MATCH_LOCKED_MESSAGE);
        return;
      }
      updateState((prev) => ({
        ...prev,
        activeMatchId: matchId,
      }));
      setActiveRoute('scoring');
      setDrawerOpen(false);
    },
    [state.matches, state.tournaments, showToast, updateState]
  );

  const handleRequestLogout = useCallback(() => {
    setShowLogoutConfirm(true);
  }, []);

  const headerTitle = useMemo(() => {
    switch (activeRoute) {
      case 'home':
        return 'Home';
      case 'kabaddi':
        return 'Kabaddi Scoreboard & Control';
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
    `w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-left text-xs font-bold tracking-wide transition-all ${
      isActive
        ? 'wo-btn-active text-white'
        : 'text-slate-700 hover:text-[#E87500] hover:bg-[#FFF3E0]'
    }`;

  const renderSidebarContent = (isMobileDrawer: boolean) => (
    <div className="flex flex-col h-full bg-white text-slate-800 shadow-lg">
      {/* Brand Header */}
      <div className="px-4 py-4 wo-header flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          {state.user.channelLogoUrl ? (
            <img
              src={state.user.channelLogoUrl}
              alt={state.user.channelTitle}
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-lg object-cover border-2 border-white/70 shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-white text-[#FF8C00] border border-white/80 flex items-center justify-center font-display font-black text-sm shadow-sm shrink-0">
              SE
            </div>
          )}
          <div className="min-w-0">
            <p className="font-display font-bold text-sm text-white truncate">
              {state.user.channelTitle || 'STAR EVENT LIVE'}
            </p>
            <p className="text-[11px] font-mono text-orange-100 truncate">
              UID: {uid}
            </p>
          </div>
        </div>
        {isMobileDrawer && (
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close navigation menu"
            className="p-1.5 rounded-lg text-white/90 hover:text-white hover:bg-white/20"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* 13 Exact Navigation Links */}
      <nav
        aria-label="Cricket Tournament Navigation"
        className="flex-1 overflow-y-auto px-3 py-3 space-y-1 bg-white"
      >
        <button
          type="button"
          onClick={() => navigateTo('home')}
          className={navItemClass(activeRoute === 'home')}
        >
          <Home className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>HOME</span>
        </button>

        <button
          type="button"
          onClick={() => navigateTo('kabaddi')}
          className={navItemClass(activeRoute === 'kabaddi')}
        >
          <Tv
            className={`w-4 h-4 shrink-0 ${
              activeRoute === 'kabaddi' ? 'text-white' : 'text-[#FF8C00]'
            }`}
            aria-hidden="true"
          />
          <span>KABADDI SCOREBOARD</span>
        </button>

        {/* Expandable TOURNAMENT Menu */}
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setTournamentMenuOpen((prev) => !prev)}
            className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-lg text-left text-xs font-bold tracking-wide transition-all ${
              activeRoute === 'tournament' ||
              activeRoute === 'tournament-groups' ||
              activeRoute === 'tournament-teams'
                ? 'bg-[#FFF3E0] text-[#E87500] border border-[#FF8C00]/40'
                : 'text-slate-700 hover:text-[#E87500] hover:bg-[#FFF3E0]'
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
            <div className="ml-4 pl-3 border-l-2 border-[#FF8C00]/30 space-y-1 py-0.5">
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
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-left text-xs font-bold tracking-wide text-red-600 hover:text-white hover:bg-red-600 transition-all"
          >
            <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>LOGOUT</span>
          </button>
        </div>
      </nav>
    </div>
  );

  // STEP 4: Wait until cloud data loading completes before showing or editing the dashboard
  if (loadStatus === 'loading') {
    return (
      <div className="cricket-suite-animated min-h-screen bg-transparent text-slate-900 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 24 }}
          className="w-full max-w-md rounded-2xl bg-white/95 backdrop-blur-md border border-[#FFE600]/35 shadow-2xl p-7 text-center space-y-4"
        >
          <div className="w-12 h-12 mx-auto rounded-xl bg-[#FFF3E0] border border-[#FF8C00]/30 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-[#FF8C00] animate-spin" aria-hidden="true" />
          </div>
          <div className="space-y-1.5">
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-[#E87500]">
              Account: {uid}
            </p>
            <h2 className="font-display font-bold text-lg text-slate-900">
              Loading Your Tournament Data
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Fetching your saved tournaments, teams, players, live scores, and settings from the cloud database...
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // STEP 7: Never interpret a network failure as an empty database
  if (loadStatus === 'error') {
    return (
      <div className="cricket-suite-animated min-h-screen bg-transparent text-slate-900 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-full max-w-md rounded-2xl bg-white/95 backdrop-blur-md border border-red-300 shadow-2xl p-7 text-center space-y-5"
        >
          <div className="w-12 h-12 mx-auto rounded-xl bg-red-50 border border-red-200 flex items-center justify-center">
            <WifiOff className="w-6 h-6 text-red-600" aria-hidden="true" />
          </div>
          <div className="space-y-1.5">
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-red-600">
              Connection Required · {uid}
            </p>
            <h2 className="font-display font-bold text-lg text-slate-900">
              Could Not Load Saved Data
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              {loadError ||
                'Unable to reach the cloud database right now. Your existing data is safe — please check your internet connection and try again.'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={() => void retryLoad()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg wo-btn-primary text-xs sm:text-sm font-extrabold uppercase tracking-wider"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              <span>Retry Connection</span>
            </button>
            <button
              type="button"
              onClick={onBackHome}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-semibold transition-colors"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              <span>Website Home</span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="cricket-suite-animated min-h-screen bg-transparent text-slate-900 overflow-x-clip">
      {/* White & Orange Overlay Dashboard Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md text-slate-900 shadow-md border-b-2 border-[#FF8C00] px-2.5 sm:px-5 py-2.5 sm:py-3">
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu drawer"
              className="lg:hidden p-2 rounded-lg bg-[#FFF3E0] hover:bg-[#FFE4BD] text-[#E87500] border border-[#FF8C00]/30 transition-colors shrink-0"
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => setDesktopSidebarOpen((prev) => !prev)}
              aria-label="Toggle sidebar"
              className="hidden lg:inline-flex p-2 rounded-lg bg-[#FFF3E0] hover:bg-[#FFE4BD] text-[#E87500] border border-[#FF8C00]/30 transition-colors shrink-0"
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </button>

            <h1 className="font-display font-bold text-sm sm:text-lg text-slate-900 truncate">
              {headerTitle}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0">
            {activeRoute !== 'kabaddi' && (
              <button
                type="button"
                onClick={() => navigateTo('kabaddi')}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg wo-btn-primary text-[11px] sm:text-xs font-extrabold whitespace-nowrap"
              >
                <Tv className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span className="sm:hidden">Kabaddi</span>
                <span className="hidden sm:inline">Kabaddi Scoreboard</span>
              </button>
            )}

            {activeMatch &&
              activeRoute !== 'scoring' &&
              !isMatchTournamentExpired(activeMatch, state.tournaments) &&
              !isMatchLockedByNewerMatch(activeMatch, state.matches) && (
                <button
                  type="button"
                  onClick={() => handleOpenScoring(activeMatch.id)}
                  className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg wo-btn-soft text-[11px] sm:text-xs font-bold whitespace-nowrap"
                >
                  <Radio className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span className="sm:hidden">Scoring</span>
                  <span className="hidden sm:inline">Open Scoring ({activeMatch.matchLabel})</span>
                </button>
              )}

            <button
              type="button"
              onClick={onBackHome}
              aria-label="Website Home"
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg wo-btn-secondary text-[11px] sm:text-xs font-bold whitespace-nowrap"
            >
              <ArrowLeft className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">Website Home</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Layout: Crisp White Sidebar + Crimson Animated Page Background Behind White Cards */}
      <div className="flex min-h-[calc(100vh-56px)]">
        {desktopSidebarOpen && (
          <aside className="hidden lg:block w-64 shrink-0 border-r border-slate-200 bg-white">
            <div className="sticky top-[60px] h-[calc(100vh-60px)]">
              {renderSidebarContent(false)}
            </div>
          </aside>
        )}

        <div className="flex-1 min-w-0 px-2.5 sm:px-6 py-3.5 sm:py-5">
          <div className="max-w-7xl mx-auto">
            {(isOffline || hasPendingSync) && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                role="alert"
                className="mb-4 rounded-xl bg-white border-2 border-[#FF8C00] px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-slate-900 shadow-md"
              >
                <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold">
                  <WifiOff className="w-4 h-4 text-[#FF8C00] shrink-0" aria-hidden="true" />
                  <span>
                    {isOffline
                      ? 'You are currently offline. Your changes are safely queued on this device and will sync automatically when internet reconnects.'
                      : 'Unsaved changes are waiting to sync with the cloud database.'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={syncNow}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg wo-btn-primary text-xs font-bold whitespace-nowrap"
                >
                  <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Sync Now</span>
                </button>
              </motion.div>
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={activeRoute}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                {activeRoute === 'home' && (
                  <CricketHomeView
                    state={state}
                    overlayUrl={overlayUrl}
                    onCopyOverlayUrl={handleCopyOverlayUrl}
                    onNavigate={navigateTo}
                  />
                )}

                {activeRoute === 'kabaddi' && (
                  <KabaddiControlDashboard
                    uid={uid}
                    embedded
                    onToast={showToast}
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
                    overlayUrl={overlayUrl}
                    updateState={updateState}
                    onCopyOverlayUrl={handleCopyOverlayUrl}
                    onGoToGroups={() => navigateTo('tournament-groups')}
                    onOpenOverlayController={() => navigateTo('overlay')}
                    onNavigateToMatches={() => navigateTo('match')}
                    onRequestLogout={handleRequestLogout}
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
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Animated Mobile Slide-Out Left Drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <div
            className="fixed inset-0 z-50 lg:hidden flex"
            role="dialog"
            aria-modal="true"
            aria-label="Dashboard navigation drawer"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => setDrawerOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 32 }}
              className="relative z-10 w-72 max-w-[85vw] h-full shadow-2xl border-r border-slate-200 bg-white"
            >
              {renderSidebarContent(true)}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Animated Inline Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-confirm-title"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 10 }}
              transition={{ type: 'spring', stiffness: 380, damping: 26 }}
              className="w-full max-w-sm rounded-xl bg-white border border-slate-200 p-5 space-y-4 shadow-2xl"
            >
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Animated Floating Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            key={toastMessage}
            initial={{ opacity: 0, y: 20, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            role="status"
            aria-live="polite"
            className="fixed bottom-5 right-5 z-50 max-w-sm px-4 py-3 rounded-xl bg-white border-2 border-[#FF8C00] text-slate-900 shadow-2xl text-xs sm:text-sm font-bold"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
