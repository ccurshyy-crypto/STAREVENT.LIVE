import { ChangeEvent, FormEvent, useRef, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Camera,
  CheckCircle2,
  Edit3,
  FolderPlus,
  KeyRound,
  Loader2,
  Lock,
  Play,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import { useOverlayAccess } from '../../context/OverlayAccessContext';
import {
  consumeTournamentUnlockPass,
  emitTournamentUnlockRefresh,
  redeemTournamentUnlockCode,
  TOURNAMENT_PRICE_PER_DAY_INR,
  type TournamentUnlockPass,
  useTournamentUnlockStatus,
} from '../../lib/tournamentUnlock';
import {
  computePointTableRows,
  expandDateRange,
  formatOvers,
  formatSingleDateHuman,
  formatTournamentDatesDisplay,
  getTodayLocalDateStr,
  getTournamentDatesList,
  getTournamentExpiryDate,
  getTournamentRemainingDays,
  isMatchLockedByNewerMatch,
  isTournamentExpired,
  isTournamentUpcoming,
  isValidIsoDateStr,
  MATCH_LOCKED_MESSAGE,
  normalizeTournamentDates,
  TOURNAMENT_EXPIRED_MESSAGE,
} from '../../data/cricketSampleData';
import {
  BallType,
  CricketSuiteState,
  MatchFormat,
  Tournament,
  TournamentGroup,
  TournamentType,
} from '../../types/cricketSuite';

function addDaysToIsoDate(isoDate: string, daysToAdd: number): string {
  const parts = isoDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return isoDate;
  const dt = new Date(parts[0], parts[1] - 1, parts[2] + daysToAdd);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatPassExpiryLabel(iso?: string | null): string {
  if (!iso) return '';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface TournamentManagerViewProps {
  mode: 'tournament' | 'tournament-groups' | 'tournament-teams';
  state: CricketSuiteState;
  updateState: (updater: (prev: CricketSuiteState) => CricketSuiteState) => void;
  onOpenScoring?: (matchId: string) => void;
  onToast: (msg: string) => void;
}

const TOURNAMENT_TYPES: TournamentType[] = [
  'League + Knockout',
  'Knockout',
  'League',
  'Tri-Series',
  'Bilateral',
];

const BALL_TYPES: BallType[] = ['Tennis', 'Leather', 'Soft Tennis', 'Rubber'];

const MATCH_FORMATS: MatchFormat[] = ['T10', 'T20', 'Limited Overs', 'Box Cricket', 'ODI'];

export function TournamentManagerView({
  mode,
  state,
  updateState,
  onOpenScoring,
  onToast,
}: TournamentManagerViewProps) {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  // Tournament Form
  const [tName, setTName] = useState('');
  const [tShort, setTShort] = useState('');
  const [tLogoUrl, setTLogoUrl] = useState('');
  const [tVenue, setTVenue] = useState('');
  const [tType, setTType] = useState<TournamentType>('League + Knockout');
  const [tOvers, setTOvers] = useState('6');
  const [tBallType, setTBallType] = useState<BallType>('Tennis');
  const [tFormat, setTFormat] = useState<MatchFormat>('T10');
  const [tStartDate, setTStartDate] = useState(() => getTodayLocalDateStr());
  const [tEndDate, setTEndDate] = useState(() => getTodayLocalDateStr());
  const [tSelectedDates, setTSelectedDates] = useState<string[]>(() => [getTodayLocalDateStr()]);
  const [tAddDateInput, setTAddDateInput] = useState(() => getTodayLocalDateStr());
  const [tFormError, setTFormError] = useState<string | null>(null);
  const [tStatus, setTStatus] = useState<Tournament['status']>('active');

  // Group Form
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState('');
  const [groupTeamIds, setGroupTeamIds] = useState<string[]>([]);
  const [selectedGroupViewId, setSelectedGroupViewId] = useState<string>('');

  const [selectedTourId, setSelectedTourId] = useState<string>(
    state.activeTournamentId || state.tournaments[0]?.id || ''
  );

  const effectiveTourId =
    state.tournaments.some((t) => t.id === selectedTourId)
      ? selectedTourId
      : state.activeTournamentId || state.tournaments[0]?.id || '';

  const effectiveTour = state.tournaments.find((t) => t.id === effectiveTourId);
  const isEffectiveTourExpired = isTournamentExpired(effectiveTour);

  const { getPaymentAuthHeaders } = useOverlayAccess();
  const { status: unlockStatus, refresh: refreshUnlockStatus } = useTournamentUnlockStatus();

  // Tournament Unlock Code modal state (Admin-generated code @ ₹99/day)
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [unlockCodeInput, setUnlockCodeInput] = useState('');
  const [redeemingCode, setRedeemingCode] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [selectedPassCode, setSelectedPassCode] = useState<string>('');
  const [savingTournament, setSavingTournament] = useState(false);

  const activePass: TournamentUnlockPass | null =
    unlockStatus.activePasses.find((p) => p.code === selectedPassCode) ??
    unlockStatus.activePasses[0] ??
    null;

  const openCreateModalWithPass = (pass: TournamentUnlockPass) => {
    setSelectedPassCode(pass.code);
    setEditingId(null);
    setTFormError(null);
    setTName('');
    setTShort('');
    setTLogoUrl('');
    setTVenue('');
    setTType('League + Knockout');
    setTOvers(String(state.user.defaultOvers || 6));
    setTBallType('Tennis');
    setTFormat('T10');
    const today = getTodayLocalDateStr();
    const defaultEnd = addDaysToIsoDate(today, Math.max(0, pass.duration_days - 1));
    const initialDates = expandDateRange(today, defaultEnd);
    setTStartDate(today);
    setTEndDate(defaultEnd);
    setTSelectedDates(initialDates);
    setTAddDateInput(defaultEnd);
    setTStatus('active');
    setModalOpen(true);
  };

  const openCreateTournament = () => {
    if (activePass) {
      openCreateModalWithPass(activePass);
      return;
    }
    setUnlockError(null);
    setUnlockCodeInput('');
    setUnlockModalOpen(true);
  };

  const handleRedeemUnlockCode = async (e: FormEvent) => {
    e.preventDefault();
    setUnlockError(null);
    const cleanCode = unlockCodeInput.trim().toUpperCase();
    if (!cleanCode) {
      setUnlockError('Please enter the Tournament Unlock Code provided by Admin.');
      return;
    }
    setRedeemingCode(true);
    try {
      const authHeaders = await getPaymentAuthHeaders();
      const res = await redeemTournamentUnlockCode(authHeaders, cleanCode);
      if (!res.ok || !res.pass) {
        setUnlockError(res.error || 'Invalid Tournament Unlock Code.');
        return;
      }
      emitTournamentUnlockRefresh();
      await refreshUnlockStatus();
      setUnlockModalOpen(false);
      setUnlockCodeInput('');
      onToast(
        `Unlocked ${res.pass.duration_days}-day Tournament Pass (create unlimited new tournaments for ${res.pass.duration_days} day${res.pass.duration_days === 1 ? '' : 's'}).`
      );
      openCreateModalWithPass(res.pass);
    } catch {
      setUnlockError('Network error while verifying unlock code. Please try again.');
    } finally {
      setRedeemingCode(false);
    }
  };

  const openEditTournament = (t: Tournament) => {
    if (isTournamentExpired(t)) {
      onToast(TOURNAMENT_EXPIRED_MESSAGE);
      return;
    }
    setEditingId(t.id);
    setTFormError(null);
    setTName(t.name);
    setTShort(t.shortName);
    setTLogoUrl(t.logoUrl || '');
    setTVenue(t.location);
    setTType(t.tournamentType || 'League + Knockout');
    setTOvers(String(t.oversPerInnings));
    setTBallType(t.ballType || 'Tennis');
    setTFormat(t.matchFormat || 'T10');
    const datesList = getTournamentDatesList(t);
    setTStartDate(datesList[0] || t.startDate);
    setTEndDate(datesList[datesList.length - 1] || t.endDate);
    setTSelectedDates(datesList);
    setTAddDateInput(datesList[datesList.length - 1] || getTodayLocalDateStr());
    setTStatus(t.status);
    setModalOpen(true);
  };

  const handleStartDateChange = (nextStart: string) => {
    setTFormError(null);
    setTStartDate(nextStart);
    if (!isValidIsoDateStr(nextStart)) return;
    if (!editingId && activePass) {
      const autoEnd = addDaysToIsoDate(nextStart, Math.max(0, activePass.duration_days - 1));
      setTEndDate(autoEnd);
      setTSelectedDates(expandDateRange(nextStart, autoEnd));
      return;
    }
    const nextEnd = tEndDate && tEndDate < nextStart ? nextStart : tEndDate || nextStart;
    setTEndDate(nextEnd);
    if (isValidIsoDateStr(nextEnd)) {
      setTSelectedDates(expandDateRange(nextStart, nextEnd));
    }
  };

  const handleEndDateChange = (nextEnd: string) => {
    setTFormError(null);
    setTEndDate(nextEnd);
    const nextStart = tStartDate && nextEnd && nextEnd < tStartDate ? nextEnd : tStartDate || nextEnd;
    setTStartDate(nextStart);
    if (isValidIsoDateStr(nextStart) && isValidIsoDateStr(nextEnd)) {
      const range = expandDateRange(nextStart, nextEnd);
      if (!editingId && activePass && range.length > activePass.duration_days) {
        setTFormError(
          `Your unlock code (${activePass.code}) allows up to ${activePass.duration_days} day${activePass.duration_days === 1 ? '' : 's'} (₹${activePass.total_price_inr} @ ₹${TOURNAMENT_PRICE_PER_DAY_INR}/day). You selected ${range.length} days.`
        );
      }
      setTSelectedDates(range);
    }
  };

  const handleAddSingleDate = () => {
    setTFormError(null);
    if (!isValidIsoDateStr(tAddDateInput)) return;
    const today = getTodayLocalDateStr();
    if (tAddDateInput < today) {
      setTFormError('Cannot add a past date. Select today or a future date.');
      return;
    }
    const merged = normalizeTournamentDates([...tSelectedDates, tAddDateInput]);
    if (!editingId && activePass && merged.length > activePass.duration_days) {
      setTFormError(
        `Your unlock code allows maximum ${activePass.duration_days} day${activePass.duration_days === 1 ? '' : 's'}. Remove a date or use a longer Admin code.`
      );
      return;
    }
    setTSelectedDates(merged);
    if (merged.length > 0) {
      setTStartDate(merged[0]);
      setTEndDate(merged[merged.length - 1]);
    }
  };

  const handleRemoveSingleDate = (dateStr: string) => {
    setTFormError(null);
    const remaining = tSelectedDates.filter((d) => d !== dateStr);
    setTSelectedDates(remaining);
    if (remaining.length > 0) {
      setTStartDate(remaining[0]);
      setTEndDate(remaining[remaining.length - 1]);
    }
  };

  const handleLogoFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1_500_000) {
      onToast('Logo must be smaller than 1.5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setTLogoUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveTournament = async (e: FormEvent) => {
    e.preventDefault();
    setTFormError(null);
    const cleanName = tName.trim();
    if (!cleanName) return;
    const overs = Math.max(1, Math.min(50, Number(tOvers) || 6));

    if (editingId) {
      const existing = state.tournaments.find((t) => t.id === editingId);
      if (!existing || isTournamentExpired(existing)) {
        onToast(TOURNAMENT_EXPIRED_MESSAGE);
        setModalOpen(false);
        return;
      }
      // Dates are strictly immutable after tournament creation to prevent expiry bypass
      updateState((prev) => ({
        ...prev,
        tournaments: prev.tournaments.map((t) =>
          t.id === editingId
            ? {
                ...t,
                name: cleanName,
                shortName: tShort.trim() || cleanName.slice(0, 12),
                logoUrl: tLogoUrl,
                location: tVenue.trim() || 'Main Ground',
                tournamentType: tType,
                oversPerInnings: overs,
                ballType: tBallType,
                matchFormat: tFormat,
                status: tStatus === 'expired' ? 'active' : tStatus,
              }
            : t
        ),
      }));
      onToast(`Tournament "${cleanName}" updated.`);
      setModalOpen(false);
    } else {
      if (!activePass) {
        setModalOpen(false);
        setUnlockModalOpen(true);
        return;
      }

      const normalizedDates = normalizeTournamentDates(
        tSelectedDates.length > 0
          ? tSelectedDates
          : expandDateRange(tStartDate, tEndDate)
      );
      if (normalizedDates.length === 0) {
        setTFormError('Please select at least one tournament date.');
        return;
      }
      if (normalizedDates.length > activePass.duration_days) {
        setTFormError(
          `Your unlock code (${activePass.code}) allows up to ${activePass.duration_days} day${activePass.duration_days === 1 ? '' : 's'} (₹${activePass.total_price_inr} @ ₹${TOURNAMENT_PRICE_PER_DAY_INR}/day). Reduce dates to ${activePass.duration_days} or fewer.`
        );
        return;
      }

      const today = getTodayLocalDateStr();
      const firstDate = normalizedDates[0];
      const lastDate = normalizedDates[normalizedDates.length - 1];
      if (lastDate < today) {
        setTFormError(
          `Selected tournament dates have already passed (${formatSingleDateHuman(lastDate)}). Please select today or future dates.`
        );
        return;
      }

      const newId = `tour_${Date.now()}`;
      setSavingTournament(true);
      try {
        const authHeaders = await getPaymentAuthHeaders();
        const consumeRes = await consumeTournamentUnlockPass(authHeaders, {
          code: activePass.code,
          tournamentId: newId,
          tournamentName: cleanName,
          selectedDates: normalizedDates,
        });
        if (!consumeRes.ok) {
          setTFormError(
            consumeRes.error || 'Could not verify your Tournament Unlock Code on the server.'
          );
          return;
        }

        emitTournamentUnlockRefresh();
        await refreshUnlockStatus();

        const computedStatus: Tournament['status'] =
          firstDate > today ? 'upcoming' : 'active';
        const newTour: Tournament = {
          id: newId,
          name: cleanName,
          shortName: tShort.trim() || cleanName.slice(0, 12),
          logoUrl: tLogoUrl,
          location: tVenue.trim() || 'Main Ground',
          tournamentType: tType,
          oversPerInnings: overs,
          ballType: tBallType,
          matchFormat: tFormat,
          startDate: firstDate,
          endDate: lastDate,
          tournamentDates: normalizedDates,
          unlockCode: activePass.code,
          unlockedDays: activePass.duration_days,
          isActive: true,
          status: computedStatus,
        };
        updateState((prev) => ({
          ...prev,
          activeTournamentId: newId,
          tournaments: [
            newTour,
            ...prev.tournaments.map((t) => ({ ...t, isActive: false })),
          ],
        }));
        setSelectedTourId(newId);
        setModalOpen(false);
        const passValidUntil = formatPassExpiryLabel(
          consumeRes.pass?.expires_at || activePass.expires_at
        );
        onToast(
          `Tournament "${cleanName}" created! Your ${activePass.duration_days}-day pass stays active${
            passValidUntil ? ` until ${passValidUntil}` : ''
          } so you can create more new tournaments anytime.`
        );
      } catch {
        setTFormError('Network error while verifying your tournament unlock pass. Please retry.');
      } finally {
        setSavingTournament(false);
      }
    }
  };

  const handleDeleteTournament = (id: string) => {
    updateState((prev) => {
      const nextTours = prev.tournaments.filter((t) => t.id !== id);
      const nextActiveTour = nextTours.find((t) => !isTournamentExpired(t));
      const nextActive =
        prev.activeTournamentId === id
          ? nextActiveTour?.id || ''
          : prev.activeTournamentId;
      return {
        ...prev,
        activeTournamentId: nextActive,
        tournaments: nextTours.map((t) => ({
          ...t,
          isActive: t.id === nextActive && !isTournamentExpired(t),
        })),
        groups: prev.groups.filter((g) => g.tournamentId !== id),
      };
    });
    setDeleteConfirmId(null);
    onToast('Tournament deleted.');
  };

  const handleSetActiveTournament = (id: string) => {
    const target = state.tournaments.find((t) => t.id === id);
    if (!target || isTournamentExpired(target)) {
      onToast(TOURNAMENT_EXPIRED_MESSAGE);
      return;
    }
    updateState((prev) => ({
      ...prev,
      activeTournamentId: id,
      tournaments: prev.tournaments.map((t) => ({
        ...t,
        isActive: t.id === id && !isTournamentExpired(t),
      })),
    }));
    setSelectedTourId(id);
    onToast(`"${target.name}" is now active.`);
  };

  // =========================================================================
  // VIEW 1: TOURNAMENT LIST & CRUD
  // =========================================================================
  if (mode === 'tournament') {
    const filtered = state.tournaments.filter((t) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.shortName.toLowerCase().includes(q) ||
        t.location.toLowerCase().includes(q)
      );
    });

    return (
      <div className="space-y-4">
        {/* Tournament Unlock Pass Status Banner (₹99 / Day · Admin Code Unlock) */}
        <div
          className={`rounded-xl border p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs ${
            activePass
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-amber-50/90 border-amber-300'
          }`}
        >
          <div className="flex items-start gap-2.5 min-w-0">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                activePass
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#FF8C00] text-white'
              }`}
            >
              {activePass ? (
                <ShieldCheck className="w-5 h-5" aria-hidden="true" />
              ) : (
                <KeyRound className="w-5 h-5" aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0">
              {activePass ? (
                <>
                  <p className="text-xs sm:text-sm font-extrabold text-emerald-950">
                    Unlimited New Tournaments Unlocked ·{' '}
                    {activePass.remaining_days ?? activePass.duration_days} Day
                    {(activePass.remaining_days ?? activePass.duration_days) === 1 ? '' : 's'} Left
                    {activePass.duration_days > 1 ? ` (of ${activePass.duration_days}d Pass)` : ''}
                  </p>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    Code <span className="font-mono font-bold">{activePass.code}</span>
                    {activePass.expires_at
                      ? ` · Valid until ${formatPassExpiryLabel(activePass.expires_at)}`
                      : ''}
                    {typeof activePass.tournaments_created_count === 'number' &&
                    activePass.tournaments_created_count > 0
                      ? ` · ${activePass.tournaments_created_count} created so far`
                      : ''}
                    {' · Create new tournaments anytime before expiry.'}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs sm:text-sm font-extrabold text-slate-900">
                    Tournament Creation Pass · ₹{TOURNAMENT_PRICE_PER_DAY_INR} / Day (Admin Unlock Code Required)
                  </p>
                  <p className="text-[11px] text-slate-700 mt-0.5">
                    Get a Tournament Unlock Code from Star Event Live Admin for the exact number of
                    days you need (1 Day = ₹99, 3 Days = ₹297, 5 Days = ₹495). Create unlimited new
                    tournaments throughout your unlocked days.
                  </p>
                </>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setUnlockError(null);
              setUnlockCodeInput('');
              setUnlockModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold uppercase tracking-wider shrink-0"
          >
            <KeyRound className="w-3.5 h-3.5 text-[#FFE600]" aria-hidden="true" />
            <span>{activePass ? 'Enter Another Code' : 'Enter Unlock Code'}</span>
          </button>
        </div>

        <div className="rounded-xl bg-white border border-slate-200 p-3.5 sm:p-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-2.5 sm:gap-3 shadow-xs">
          <div className="relative w-full sm:flex-1 sm:min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tournament by name or venue..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 border border-slate-300 focus:border-[#FF8C00] focus:bg-white focus:outline-none text-sm text-slate-900"
            />
          </div>

          <button
            type="button"
            onClick={openCreateTournament}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg wo-btn-primary text-xs font-extrabold uppercase tracking-wider whitespace-nowrap"
          >
            {activePass ? (
              <Plus className="w-4 h-4" />
            ) : (
              <Lock className="w-4 h-4" aria-hidden="true" />
            )}
            <span>
              {activePass
                ? `CREATE NEW TOURNAMENT (${activePass.remaining_days ?? activePass.duration_days}D LEFT)`
                : `UNLOCK & CREATE TOURNAMENT (₹${TOURNAMENT_PRICE_PER_DAY_INR}/DAY)`}
            </span>
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl bg-white border border-slate-200 p-12 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 mx-auto rounded-xl bg-[#FFF3E0] border border-[#FF8C00]/30 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-[#FF8C00]" />
            </div>
            <h2 className="font-display font-bold text-base text-slate-900">
              No Tournaments Created Yet
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
              Create your first cricket tournament with venue, dates, overs, format, and ball type.
            </p>
            <button
              type="button"
              onClick={openCreateTournament}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg wo-btn-primary text-xs font-extrabold uppercase tracking-wider"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Tournament</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Mobile Tournament Cards */}
            <div className="md:hidden space-y-3">
              {filtered.map((t) => {
                const expired = isTournamentExpired(t);
                const upcoming = isTournamentUpcoming(t);
                const isActive = !expired && t.id === state.activeTournamentId;
                const remainingDays = getTournamentRemainingDays(t);
                const datesLabel = formatTournamentDatesDisplay(t);
                const teamCount = state.teams.filter((tm) => tm.tournamentId === t.id).length;
                const matchCount = state.matches.filter((m) => m.tournamentId === t.id).length;
                return (
                  <div
                    key={`mobile-${t.id}`}
                    className={`rounded-xl border p-3.5 space-y-3 shadow-xs ${
                      expired
                        ? 'bg-slate-50/90 border-red-200/80 opacity-90'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {t.logoUrl ? (
                        <img
                          src={t.logoUrl}
                          alt={t.name}
                          className="w-11 h-11 rounded-lg object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-lg bg-[#FFF3E0] border border-[#FF8C00]/30 flex items-center justify-center font-display font-bold text-xs text-[#FF8C00] shrink-0">
                          {t.shortName.slice(0, 3).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-display font-bold text-sm text-slate-900 truncate">
                            {t.name}
                          </p>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${
                              expired
                                ? 'bg-red-600 text-white'
                                : isActive
                                  ? 'bg-emerald-600 text-white'
                                  : upcoming
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {expired
                              ? 'Expired'
                              : isActive
                                ? 'Active'
                                : upcoming
                                  ? 'Upcoming'
                                  : 'Inactive'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">
                          {t.shortName} · {t.location} · {teamCount} Teams · {matchCount} Matches
                        </p>
                        <p className="text-[11px] text-slate-600 tabular-nums mt-0.5">
                          {t.matchFormat} · {t.oversPerInnings} Overs · {t.ballType}
                        </p>
                        <p className="text-[11px] text-slate-700 font-medium mt-1 leading-snug">
                          {datesLabel}
                        </p>
                        {!expired && (
                          <p className="text-[10px] font-semibold text-emerald-700 mt-0.5">
                            {remainingDays === 0
                              ? 'Expires tonight (last day)'
                              : `${remainingDays} day${remainingDays === 1 ? '' : 's'} remaining`}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isActive}
                        disabled={expired}
                        onClick={() => handleSetActiveTournament(t.id)}
                        title={expired ? TOURNAMENT_EXPIRED_MESSAGE : 'Activate this tournament'}
                        className={`inline-flex items-center gap-2 text-xs font-semibold ${
                          expired ? 'cursor-not-allowed opacity-60 text-slate-400' : 'text-slate-700'
                        }`}
                      >
                        <span
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            isActive
                              ? 'bg-emerald-500'
                              : expired
                                ? 'bg-slate-200'
                                : 'bg-slate-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs transition-transform ${
                              isActive ? 'translate-x-4.5' : 'translate-x-1'
                            }`}
                          />
                        </span>
                        <span>{expired ? 'Locked' : isActive ? 'Activated' : 'Activate'}</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditTournament(t)}
                          title={expired ? TOURNAMENT_EXPIRED_MESSAGE : 'Edit tournament'}
                          className={`inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold ${
                            expired
                              ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                              : 'bg-[#FFF3E0] hover:bg-orange-100 text-[#E87500]'
                          }`}
                        >
                          {expired ? (
                            <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                          ) : (
                            <Edit3 className="w-3.5 h-3.5" />
                          )}
                          {expired ? 'Locked' : 'Edit'}
                        </button>
                        {deleteConfirmId !== t.id ? (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(t.id)}
                            className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600"
                            aria-label={`Delete ${t.name}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDeleteTournament(t.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-200 text-slate-700 text-xs font-bold"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table (Matches Name | Short Name | Place | Tournament Dates | Activate | Status | Action) */}
            <div className="hidden md:block rounded-xl bg-white border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                    <tr>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Short Name</th>
                      <th className="px-4 py-3">Place</th>
                      <th className="px-4 py-3">Tournament Dates</th>
                      <th className="px-4 py-3 text-center">Activate</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((t) => {
                      const expired = isTournamentExpired(t);
                      const upcoming = isTournamentUpcoming(t);
                      const isActive = !expired && t.id === state.activeTournamentId;
                      const remainingDays = getTournamentRemainingDays(t);
                      const datesLabel = formatTournamentDatesDisplay(t);
                      const teamCount = state.teams.filter((tm) => tm.tournamentId === t.id).length;
                      const matchCount = state.matches.filter((m) => m.tournamentId === t.id).length;
                      return (
                        <tr
                          key={t.id}
                          className={
                            expired
                              ? 'bg-slate-50/75 opacity-85 transition-colors'
                              : 'hover:bg-slate-50/70 transition-colors'
                          }
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {t.logoUrl ? (
                                <img
                                  src={t.logoUrl}
                                  alt={t.name}
                                  className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-[#FFF3E0] border border-[#FF8C00]/30 flex items-center justify-center font-display font-bold text-xs text-[#FF8C00] shrink-0">
                                  {t.shortName.slice(0, 3).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <p className="font-semibold text-slate-900">{t.name}</p>
                                <p className="text-xs text-slate-500">
                                  {t.matchFormat} · {t.oversPerInnings} Overs · {teamCount} Teams · {matchCount} Matches
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs font-semibold text-slate-700">
                            {t.shortName}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-700">{t.location}</td>
                          <td className="px-4 py-3 text-xs text-slate-700 max-w-[260px]">
                            <p className="leading-snug font-medium">{datesLabel}</p>
                            {!expired && (
                              <p className="text-[11px] font-semibold text-emerald-700 mt-0.5">
                                {remainingDays === 0
                                  ? 'Last day — expires tonight'
                                  : `Valid · ${remainingDays} day${remainingDays === 1 ? '' : 's'} left`}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              role="switch"
                              aria-checked={isActive}
                              aria-label={`Activate ${t.name}`}
                              onClick={() => handleSetActiveTournament(t.id)}
                              title={
                                expired
                                  ? TOURNAMENT_EXPIRED_MESSAGE
                                  : isActive
                                    ? 'Currently active tournament'
                                    : 'Set as active tournament'
                              }
                              className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${
                                isActive
                                  ? 'bg-emerald-500'
                                  : expired
                                    ? 'bg-slate-200 cursor-not-allowed opacity-60'
                                    : 'bg-slate-300 hover:bg-slate-400 cursor-pointer'
                              }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform ${
                                  isActive ? 'translate-x-5' : 'translate-x-0.5'
                                }`}
                              />
                            </button>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold ${
                                expired
                                  ? 'bg-red-600 text-white'
                                  : isActive
                                    ? 'bg-emerald-600 text-white'
                                    : upcoming
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {expired
                                ? 'Expired'
                                : isActive
                                  ? 'Active'
                                  : upcoming
                                    ? 'Upcoming'
                                    : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEditTournament(t)}
                                title={
                                  expired
                                    ? TOURNAMENT_EXPIRED_MESSAGE
                                    : 'Edit tournament details'
                                }
                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold ${
                                  expired
                                    ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                                    : 'bg-[#FFF3E0] hover:bg-orange-100 text-[#E87500]'
                                }`}
                              >
                                {expired ? (
                                  <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                                ) : (
                                  <Edit3 className="w-3.5 h-3.5" />
                                )}
                                {expired ? 'Locked' : 'Edit'}
                              </button>
                              {deleteConfirmId !== t.id ? (
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmId(t.id)}
                                  className="p-1.5 rounded-md bg-red-50 hover:bg-red-100 text-red-600"
                                  aria-label={`Delete ${t.name}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              ) : (
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteTournament(t.id)}
                                    className="px-2 py-1 rounded bg-red-600 text-white text-xs font-semibold"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="px-2 py-1 rounded bg-slate-200 text-slate-700 text-xs font-semibold"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Create / Edit Tournament Modal */}
        {modalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 overflow-y-auto"
            role="dialog"
            aria-modal="true"
          >
            <form
              onSubmit={handleSaveTournament}
              className="w-full max-w-xl rounded-xl bg-white border border-orange-200 shadow-2xl overflow-hidden my-auto"
            >
              <div className="px-5 py-4 wo-header text-white flex items-center justify-between">
                <h3 className="font-display font-bold text-base text-white tracking-wide">
                  {editingId ? 'Edit Tournament' : 'Create Tournament'}
                </h3>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="p-1 rounded text-white/90 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Tournament Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={tName}
                      onChange={(e) => setTName(e.target.value)}
                      placeholder="Enter tournament name"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-[#FF8C00] focus:outline-none text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Short Name
                    </label>
                    <input
                      type="text"
                      value={tShort}
                      onChange={(e) => setTShort(e.target.value)}
                      placeholder="e.g. SPL 2026"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-[#FF8C00] focus:outline-none text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Venue / Ground *
                    </label>
                    <input
                      type="text"
                      required
                      value={tVenue}
                      onChange={(e) => setTVenue(e.target.value)}
                      placeholder="Enter ground or city"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-[#FF8C00] focus:outline-none text-sm"
                    />
                  </div>

                  {tFormError && (
                    <div
                      role="alert"
                      className="sm:col-span-2 rounded-lg bg-red-50 border border-red-200 px-3.5 py-2.5 text-xs font-semibold text-red-700 flex items-start gap-2"
                    >
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{tFormError}</span>
                    </div>
                  )}

                  {/* Active Unlock Pass Summary when Creating */}
                  {!editingId && activePass && (
                    <div className="sm:col-span-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
                        <span>
                          Active Pass:{' '}
                          <span className="font-mono">{activePass.code}</span> ·{' '}
                          <strong>
                            {activePass.remaining_days ?? activePass.duration_days} Day
                            {(activePass.remaining_days ?? activePass.duration_days) === 1
                              ? ''
                              : 's'}{' '}
                            Left
                          </strong>{' '}
                          (Unlimited new tournaments
                          {activePass.expires_at
                            ? ` till ${formatPassExpiryLabel(activePass.expires_at)}`
                            : ''}
                          )
                        </span>
                      </div>
                      {unlockStatus.activePasses.length > 1 && (
                        <select
                          value={activePass.code}
                          onChange={(e) => {
                            const nextPass = unlockStatus.activePasses.find(
                              (p) => p.code === e.target.value
                            );
                            if (nextPass) openCreateModalWithPass(nextPass);
                          }}
                          aria-label="Choose unlocked tournament pass"
                          className="px-2 py-1 rounded-md bg-white border border-emerald-300 text-[11px] font-bold text-emerald-950"
                        >
                          {unlockStatus.activePasses.map((p) => (
                            <option key={p.code} value={p.code}>
                              {p.code} ({p.duration_days}d · ₹{p.total_price_inr})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}

                  {/* Tournament Dates Section — Selectable on Create (capped at pass days), Strictly Locked After Creation */}
                  <div className="sm:col-span-2 rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <label className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wide">
                        <Calendar className="w-3.5 h-3.5 text-[#FF8C00]" aria-hidden="true" />
                        <span>
                          Tournament Dates *
                          {!editingId && activePass
                            ? ` (${tSelectedDates.length} / ${activePass.duration_days} Days)`
                            : ''}
                        </span>
                      </label>
                      {editingId && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-200 text-slate-600 text-[10px] font-bold uppercase">
                          <Lock className="w-3 h-3" aria-hidden="true" />
                          Locked after creation
                        </span>
                      )}
                    </div>

                    {editingId ? (
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-slate-800">
                          {tSelectedDates.map(formatSingleDateHuman).join(', ') || `${tStartDate} – ${tEndDate}`}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Tournament dates cannot be changed after creation. This tournament automatically expires after{' '}
                          <strong>
                            {formatSingleDateHuman(
                              tSelectedDates[tSelectedDates.length - 1] || tEndDate
                            )}
                          </strong>
                          .
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="block text-[11px] font-semibold text-slate-600">
                              Start Date
                            </label>
                            <input
                              type="date"
                              min={getTodayLocalDateStr()}
                              value={tStartDate}
                              onChange={(e) => handleStartDateChange(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 focus:border-[#FF8C00] focus:outline-none text-sm"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-[11px] font-semibold text-slate-600">
                              End Date (Expires after this date)
                            </label>
                            <input
                              type="date"
                              min={tStartDate || getTodayLocalDateStr()}
                              value={tEndDate}
                              onChange={(e) => handleEndDateChange(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 focus:border-[#FF8C00] focus:outline-none text-sm"
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <input
                            type="date"
                            min={getTodayLocalDateStr()}
                            value={tAddDateInput}
                            onChange={(e) => setTAddDateInput(e.target.value)}
                            aria-label="Add individual tournament date"
                            className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 focus:border-[#FF8C00] focus:outline-none text-xs"
                          />
                          <button
                            type="button"
                            onClick={handleAddSingleDate}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white hover:bg-[#FFF3E0] border border-[#FF8C00]/50 text-[#E87500] text-xs font-bold"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add Specific Date
                          </button>
                        </div>

                        {tSelectedDates.length > 0 && (
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap gap-1.5">
                              {tSelectedDates.map((d) => (
                                <span
                                  key={d}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-slate-300 text-xs font-semibold text-slate-800"
                                >
                                  <span>{formatSingleDateHuman(d)}</span>
                                  {tSelectedDates.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveSingleDate(d)}
                                      aria-label={`Remove ${formatSingleDateHuman(d)}`}
                                      className="text-slate-400 hover:text-red-600"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                </span>
                              ))}
                            </div>
                            <p className="text-[11px] font-semibold text-emerald-700">
                              Valid for {tSelectedDates.length} day{tSelectedDates.length === 1 ? '' : 's'} — will automatically expire after{' '}
                              <span className="underline">
                                {formatSingleDateHuman(tSelectedDates[tSelectedDates.length - 1])}
                              </span>
                              . Expired tournaments stop working automatically.
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Tournament Type
                    </label>
                    <select
                      value={tType}
                      onChange={(e) => setTType(e.target.value as TournamentType)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-[#FF8C00] focus:outline-none text-sm bg-white"
                    >
                      {TOURNAMENT_TYPES.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Match Format
                    </label>
                    <select
                      value={tFormat}
                      onChange={(e) => setTFormat(e.target.value as MatchFormat)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-[#FF8C00] focus:outline-none text-sm bg-white"
                    >
                      {MATCH_FORMATS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Total Overs *
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      required
                      value={tOvers}
                      onChange={(e) => setTOvers(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-[#FF8C00] focus:outline-none text-sm tabular-nums"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Ball Type
                    </label>
                    <select
                      value={tBallType}
                      onChange={(e) => setTBallType(e.target.value as BallType)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-[#FF8C00] focus:outline-none text-sm bg-white"
                    >
                      {BALL_TYPES.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Tournament Logo
                    </label>
                    <div className="flex items-center gap-3">
                      {tLogoUrl ? (
                        <img
                          src={tLogoUrl}
                          alt="Tournament logo preview"
                          className="w-12 h-12 rounded-lg object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                          <Camera className="w-5 h-5" />
                        </div>
                      )}
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoFile}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
                      >
                        Upload Logo
                      </button>
                      {tLogoUrl && (
                        <button
                          type="button"
                          onClick={() => setTLogoUrl('')}
                          className="text-xs font-semibold text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    savingTournament ||
                    (!editingId &&
                      Boolean(activePass) &&
                      tSelectedDates.length > (activePass?.duration_days ?? 0))
                  }
                  className="px-5 py-2 rounded-lg wo-btn-primary disabled:opacity-55 text-xs font-extrabold uppercase tracking-wider inline-flex items-center gap-1.5"
                >
                  {savingTournament && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>
                    {savingTournament
                      ? 'Creating...'
                      : editingId
                        ? 'Save Changes'
                        : 'Save Tournament'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Admin Tournament Unlock Code Modal (₹99 / Day) */}
        {unlockModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tournament-unlock-modal-title"
          >
            <form
              onSubmit={handleRedeemUnlockCode}
              className="w-full max-w-md rounded-2xl bg-white border-2 border-[#FF8C00] shadow-2xl overflow-hidden my-auto"
            >
              <div className="px-5 py-4 wo-header text-white flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest text-orange-100">
                    <KeyRound className="w-3.5 h-3.5 text-[#FFE600]" aria-hidden="true" />
                    <span>Admin Code Verification</span>
                  </div>
                  <h3
                    id="tournament-unlock-modal-title"
                    className="font-display font-black text-lg text-white leading-tight"
                  >
                    Unlock Tournament Creation
                  </h3>
                  <p className="text-xs text-orange-50 font-medium">
                    Tournament Price: ₹{TOURNAMENT_PRICE_PER_DAY_INR} / Day · All Scoreboards Free
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setUnlockModalOpen(false)}
                  aria-label="Close unlock code modal"
                  className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Transparent ₹99/day Pricing Breakdown */}
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 space-y-2">
                  <p className="text-xs font-extrabold text-slate-900">
                    Tournament Day Pricing (₹{TOURNAMENT_PRICE_PER_DAY_INR} per Day)
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[1, 3, 5].map((days) => (
                      <div
                        key={days}
                        className="rounded-lg bg-white border border-amber-200 px-2 py-1.5"
                      >
                        <p className="text-[11px] font-bold text-slate-700">
                          {days} Day{days === 1 ? '' : 's'}
                        </p>
                        <p className="font-mono font-black text-sm text-[#E87500] tabular-nums">
                          ₹{days * TOURNAMENT_PRICE_PER_DAY_INR}
                        </p>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Contact Star Event Live Admin (<strong>9890175727</strong>) to pay for your
                    required days and receive your unlock code. Once activated, you can create
                    unlimited new tournaments for all unlocked days.
                  </p>
                </div>

                {unlockError && (
                  <div
                    role="alert"
                    className="rounded-lg bg-red-50 border border-red-200 px-3.5 py-2.5 text-xs font-semibold text-red-700 flex items-start gap-2"
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{unlockError}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label
                    htmlFor="tournament-unlock-code-input"
                    className="block text-xs font-bold text-slate-800"
                  >
                    Enter Admin Tournament Unlock Code *
                  </label>
                  <input
                    id="tournament-unlock-code-input"
                    type="text"
                    required
                    autoFocus
                    value={unlockCodeInput}
                    onChange={(e) => setUnlockCodeInput(e.target.value.toUpperCase())}
                    placeholder="e.g. TRN-3D-XXXX-XXXX"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border-2 border-slate-300 focus:border-[#FF8C00] focus:bg-white focus:outline-none font-mono font-bold text-sm tracking-widest uppercase text-slate-900"
                  />
                  <p className="text-[11px] text-slate-500">
                    Your pass stays active for the exact number of days set by Admin — create as
                    many new tournaments as you want until the pass expires.
                  </p>
                </div>
              </div>

              <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setUnlockModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={redeemingCode}
                  className="px-5 py-2 rounded-lg wo-btn-primary disabled:opacity-60 text-xs font-extrabold uppercase tracking-wider inline-flex items-center gap-1.5"
                >
                  {redeemingCode ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-3.5 h-3.5" />
                  )}
                  <span>{redeemingCode ? 'Verifying...' : 'Verify & Unlock'}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: TOURNAMENT GROUPS (WITH GROUP-WISE MATCHES & POINTS TABLE)
  // =========================================================================
  if (mode === 'tournament-groups') {
    const tourGroups = state.groups.filter((g) => g.tournamentId === effectiveTourId);
    const tourTeams = state.teams.filter((t) => t.tournamentId === effectiveTourId);
    const activeGroup =
      tourGroups.find((g) => g.id === selectedGroupViewId) ?? tourGroups[0];
    const allPoints = computePointTableRows(state, effectiveTourId);

    const openCreateGroup = () => {
      if (isEffectiveTourExpired) {
        onToast(TOURNAMENT_EXPIRED_MESSAGE);
        return;
      }
      setEditingGroupId(null);
      setGroupName(`Group ${String.fromCharCode(65 + tourGroups.length)}`);
      setGroupTeamIds([]);
      setGroupModalOpen(true);
    };

    const openEditGroup = (g: TournamentGroup) => {
      if (isEffectiveTourExpired) {
        onToast(TOURNAMENT_EXPIRED_MESSAGE);
        return;
      }
      setEditingGroupId(g.id);
      setGroupName(g.name);
      setGroupTeamIds([...g.teamIds]);
      setGroupModalOpen(true);
    };

    const toggleTeamInForm = (teamId: string) => {
      setGroupTeamIds((prev) =>
        prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]
      );
    };

    const handleSaveGroup = (e: FormEvent) => {
      e.preventDefault();
      if (isEffectiveTourExpired) {
        onToast(TOURNAMENT_EXPIRED_MESSAGE);
        setGroupModalOpen(false);
        return;
      }
      if (!effectiveTourId || !groupName.trim()) return;
      if (editingGroupId) {
        updateState((prev) => ({
          ...prev,
          groups: prev.groups.map((g) =>
            g.id === editingGroupId
              ? { ...g, name: groupName.trim(), teamIds: groupTeamIds }
              : g
          ),
        }));
        onToast(`Group "${groupName.trim()}" updated.`);
      } else {
        const newGrp: TournamentGroup = {
          id: `grp_${Date.now()}`,
          tournamentId: effectiveTourId,
          name: groupName.trim(),
          teamIds: groupTeamIds,
        };
        updateState((prev) => ({
          ...prev,
          groups: [...prev.groups, newGrp],
        }));
        setSelectedGroupViewId(newGrp.id);
        onToast(`Group "${newGrp.name}" created.`);
      }
      setGroupModalOpen(false);
    };

    const handleDeleteGroup = (id: string) => {
      if (isEffectiveTourExpired) {
        onToast(TOURNAMENT_EXPIRED_MESSAGE);
        return;
      }
      updateState((prev) => ({
        ...prev,
        groups: prev.groups.filter((g) => g.id !== id),
      }));
      onToast('Group deleted.');
    };

    const groupMatches = activeGroup
      ? state.matches.filter(
          (m) =>
            m.tournamentId === effectiveTourId &&
            (m.groupId === activeGroup.id ||
              (activeGroup.teamIds.includes(m.team1Id) &&
                activeGroup.teamIds.includes(m.team2Id)))
        )
      : [];

    const groupPoints = activeGroup
      ? allPoints.filter((r) => activeGroup.teamIds.includes(r.teamId))
      : [];

    const teamMap = new Map(state.teams.map((t) => [t.id, t]));

    return (
      <div className="space-y-5">
        <div className="rounded-xl bg-white border border-slate-200 p-3.5 sm:p-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-2.5 sm:gap-3 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2.5 w-full sm:w-auto">
            <label className="text-xs font-semibold text-slate-600 shrink-0">Tournament:</label>
            <select
              value={effectiveTourId}
              onChange={(e) => setSelectedTourId(e.target.value)}
              className="w-full sm:w-auto sm:min-w-[220px] max-w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-900"
            >
              {state.tournaments.length === 0 && <option value="">No tournaments created</option>}
              {state.tournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {isTournamentExpired(t) ? ' (Expired)' : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            disabled={!effectiveTourId || isEffectiveTourExpired}
            onClick={openCreateGroup}
            title={isEffectiveTourExpired ? TOURNAMENT_EXPIRED_MESSAGE : 'Create group'}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg wo-btn-primary disabled:opacity-50 disabled:cursor-not-allowed text-xs font-extrabold uppercase tracking-wider whitespace-nowrap"
          >
            <FolderPlus className="w-4 h-4" />
            <span>CREATE GROUP</span>
          </button>
        </div>

        {isEffectiveTourExpired && effectiveTour && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-2.5 text-xs text-red-800">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-bold text-red-900">
                Tournament Expired ({formatSingleDateHuman(getTournamentExpiryDate(effectiveTour) || effectiveTour.endDate)})
              </p>
              <p className="mt-0.5">
                {TOURNAMENT_EXPIRED_MESSAGE}
              </p>
            </div>
          </div>
        )}

        {!effectiveTourId ? (
          <div className="rounded-xl bg-white border border-slate-200 p-10 text-center text-sm text-slate-500">
            Create a Tournament first to organize Tournament Groups.
          </div>
        ) : tourGroups.length === 0 ? (
          <div className="rounded-xl bg-white border border-slate-200 p-10 text-center space-y-3">
            <p className="text-sm font-semibold text-slate-800">
              No groups created for this tournament yet.
            </p>
            {!isEffectiveTourExpired && (
              <button
                type="button"
                onClick={openCreateGroup}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg wo-btn-primary text-xs font-extrabold uppercase tracking-wider"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Group</span>
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tourGroups.map((g) => {
                const isSelected = activeGroup?.id === g.id;
                const assignedTeams = tourTeams.filter((tm) => g.teamIds.includes(tm.id));
                return (
                  <div
                    key={g.id}
                    onClick={() => setSelectedGroupViewId(g.id)}
                    className={`cursor-pointer rounded-xl bg-white border p-4 space-y-3 transition-colors shadow-xs ${
                      isSelected ? 'border-[#FF8C00] ring-1 ring-[#FF8C00]' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-display font-bold text-base text-slate-900">{g.name}</h3>
                      <div
                        className="flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => openEditGroup(g)}
                          className="p-1.5 rounded-md bg-[#FFF3E0] hover:bg-orange-100 text-[#E87500]"
                          aria-label={`Edit ${g.name}`}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteGroup(g.id)}
                          className="p-1.5 rounded-md bg-red-50 hover:bg-red-100 text-red-600"
                          aria-label={`Delete ${g.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500">
                      {assignedTeams.length} assigned team{assignedTeams.length === 1 ? '' : 's'}
                    </p>

                    <div className="space-y-1">
                      {assignedTeams.length === 0 ? (
                        <p className="text-xs text-slate-400">No teams assigned yet.</p>
                      ) : (
                        assignedTeams.map((tm) => (
                          <div
                            key={tm.id}
                            className="text-xs font-medium text-slate-700 flex items-center justify-between py-1 border-t border-slate-100"
                          >
                            <span>{tm.name}</span>
                            <span className="font-mono text-slate-500">{tm.shortName}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Group Points Table & Matches */}
            {activeGroup && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-xs">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                    <h4 className="font-display font-bold text-sm text-slate-900">
                      {activeGroup.name} · Points Table
                    </h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                        <tr>
                          <th className="px-3 py-2 text-left">Team</th>
                          <th className="px-2 py-2 text-right">P</th>
                          <th className="px-2 py-2 text-right">W</th>
                          <th className="px-2 py-2 text-right">L</th>
                          <th className="px-2 py-2 text-right">Pts</th>
                          <th className="px-3 py-2 text-right">NRR</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 tabular-nums">
                        {groupPoints.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                              Assign teams to this group to view standings.
                            </td>
                          </tr>
                        ) : (
                          groupPoints.map((row) => (
                            <tr key={row.teamId}>
                              <td className="px-3 py-2 font-semibold text-slate-900">
                                {row.teamName}
                              </td>
                              <td className="px-2 py-2 text-right">{row.played}</td>
                              <td className="px-2 py-2 text-right">{row.won}</td>
                              <td className="px-2 py-2 text-right">{row.lost}</td>
                              <td className="px-2 py-2 text-right font-bold text-[#FF8C00]">
                                {row.points}
                              </td>
                              <td className="px-3 py-2 text-right font-mono">
                                {row.nrr >= 0 ? `+${row.nrr.toFixed(3)}` : row.nrr.toFixed(3)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-xs">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                    <h4 className="font-display font-bold text-sm text-slate-900">
                      {activeGroup.name} · Group Matches ({groupMatches.length})
                    </h4>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {groupMatches.length === 0 ? (
                      <p className="p-6 text-center text-xs text-slate-400">
                        No matches scheduled in {activeGroup.name} yet.
                      </p>
                    ) : (
                      groupMatches.map((m) => {
                        const t1 = teamMap.get(m.team1Id);
                        const t2 = teamMap.get(m.team2Id);
                        const isLocked = isMatchLockedByNewerMatch(m, state.matches);
                        const isBlocked = isEffectiveTourExpired || isLocked;
                        const lockMsg = isEffectiveTourExpired
                          ? TOURNAMENT_EXPIRED_MESSAGE
                          : MATCH_LOCKED_MESSAGE;
                        return (
                          <div
                            key={m.id}
                            className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-900 truncate">
                                {t1?.shortName || 'Team A'} vs {t2?.shortName || 'Team B'} ·{' '}
                                {m.matchLabel}
                              </p>
                              <p className="text-[11px] text-slate-500 tabular-nums">
                                {m.innings[0].runs}/{m.innings[0].wickets} (
                                {formatOvers(m.innings[0].legalBalls)}) · {m.resultText}
                              </p>
                            </div>
                            {onOpenScoring &&
                              (isBlocked ? (
                                <button
                                  type="button"
                                  onClick={() => onToast(lockMsg)}
                                  title={lockMsg}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-bold shrink-0 cursor-not-allowed ${
                                    isEffectiveTourExpired
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-slate-200 text-slate-500'
                                  }`}
                                >
                                  <Lock className="w-3 h-3" aria-hidden="true" />
                                  {isEffectiveTourExpired ? 'Expired' : 'Locked'}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => onOpenScoring(m.id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md wo-btn-primary text-[11px] font-bold shrink-0"
                                >
                                  <Play className="w-3 h-3" />
                                  Score
                                </button>
                              ))}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {groupModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55"
            role="dialog"
            aria-modal="true"
          >
            <form
              onSubmit={handleSaveGroup}
              className="w-full max-w-md rounded-xl bg-white border border-orange-200 overflow-hidden shadow-2xl"
            >
              <div className="px-5 py-4 wo-header text-white flex items-center justify-between">
                <h3 className="font-display font-bold text-base text-white tracking-wide">
                  {editingGroupId ? 'Edit Group' : 'Create Group'}
                </h3>
                <button
                  type="button"
                  onClick={() => setGroupModalOpen(false)}
                  className="p-1 text-white/90 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Group Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="e.g. Group A"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    Assign Teams ({groupTeamIds.length} selected)
                  </label>
                  {tourTeams.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      No teams registered in this tournament yet.
                    </p>
                  ) : (
                    <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                      {tourTeams.map((tm) => (
                        <label
                          key={tm.id}
                          className="flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-slate-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={groupTeamIds.includes(tm.id)}
                            onChange={() => toggleTeamInForm(tm.id)}
                            className="rounded border-slate-300 text-[#FF8C00]"
                          />
                          <span className="font-semibold text-slate-800">{tm.name}</span>
                          <span className="font-mono text-slate-400 ml-auto">{tm.shortName}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setGroupModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg wo-btn-primary text-xs font-extrabold uppercase tracking-wider"
                >
                  Save Group
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW 3: TOURNAMENT TEAMS (ONLY TEAMS BELONGING TO SELECTED TOURNAMENT)
  // =========================================================================
  const tourTeams = state.teams.filter((tm) => {
    if (effectiveTourId && tm.tournamentId !== effectiveTourId) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      tm.name.toLowerCase().includes(q) ||
      tm.shortName.toLowerCase().includes(q) ||
      tm.place.toLowerCase().includes(q)
    );
  });
  const tourGroups = state.groups.filter((g) => g.tournamentId === effectiveTourId);

  const assignTeamToGroup = (teamId: string, nextGroupId: string) => {
    if (isEffectiveTourExpired) {
      onToast(TOURNAMENT_EXPIRED_MESSAGE);
      return;
    }
    updateState((prev) => ({
      ...prev,
      groups: prev.groups.map((g) => {
        if (g.tournamentId !== effectiveTourId) return g;
        const without = g.teamIds.filter((id) => id !== teamId);
        if (g.id === nextGroupId) {
          return { ...g, teamIds: [...without, teamId] };
        }
        return { ...g, teamIds: without };
      }),
    }));
    onToast('Team group assignment updated.');
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white border border-slate-200 p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2.5 sm:gap-3 flex-1 w-full">
          <select
            value={effectiveTourId}
            onChange={(e) => setSelectedTourId(e.target.value)}
            className="w-full sm:w-auto sm:min-w-[200px] max-w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-900"
          >
            {state.tournaments.length === 0 && <option value="">No tournaments created</option>}
            {state.tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {isTournamentExpired(t) ? ' (Expired)' : ''}
              </option>
            ))}
          </select>

          <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search teams in selected tournament..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 border border-slate-300 focus:border-[#FF8C00] focus:bg-white focus:outline-none text-sm"
            />
          </div>
        </div>
      </div>

      {isEffectiveTourExpired && effectiveTour && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-2.5 text-xs text-red-800">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="font-bold text-red-900">
              Tournament Expired ({formatSingleDateHuman(getTournamentExpiryDate(effectiveTour) || effectiveTour.endDate)})
            </p>
            <p className="mt-0.5">{TOURNAMENT_EXPIRED_MESSAGE}</p>
          </div>
        </div>
      )}

      {!effectiveTourId || tourTeams.length === 0 ? (
        <div className="rounded-xl bg-white border border-slate-200 p-10 text-center space-y-2 shadow-xs">
          <Users className="w-7 h-7 text-slate-400 mx-auto" />
          <p className="text-sm font-semibold text-slate-800">
            No teams assigned to this tournament yet.
          </p>
          <p className="text-xs text-slate-500">
            Go to TEAM in the sidebar and click CREATE TEAM to add teams to this tournament.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Mobile Tournament Teams Cards */}
          <div className="md:hidden space-y-2.5">
            {tourTeams.map((tm) => {
              const currentGrp = tourGroups.find((g) => g.teamIds.includes(tm.id));
              return (
                <div
                  key={`mobile-${tm.id}`}
                  className="rounded-xl bg-white border border-slate-200 p-3.5 space-y-2.5 shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-display font-bold text-sm text-slate-900 truncate">
                      {tm.name}
                    </p>
                    <span className="font-mono text-xs font-bold text-slate-600 shrink-0">
                      {tm.shortName}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 tabular-nums">
                    {tm.place || 'No venue'} · {tm.players.length} players
                  </p>
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-600">Assigned Group</span>
                    <select
                      value={currentGrp?.id || ''}
                      disabled={isEffectiveTourExpired}
                      onChange={(e) => assignTeamToGroup(tm.id, e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white disabled:bg-slate-100 disabled:text-slate-400 text-xs text-slate-800 max-w-[180px]"
                    >
                      <option value="">Unassigned</option>
                      {tourGroups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block rounded-xl bg-white border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                  <tr>
                    <th className="px-4 py-3">Team</th>
                    <th className="px-4 py-3">Short Name</th>
                    <th className="px-4 py-3">Place</th>
                    <th className="px-4 py-3">Squad Size</th>
                    <th className="px-4 py-3">Assigned Group</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tourTeams.map((tm) => {
                    const currentGrp = tourGroups.find((g) => g.teamIds.includes(tm.id));
                    return (
                      <tr key={tm.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3 font-semibold text-slate-900">{tm.name}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">
                          {tm.shortName}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">{tm.place || '—'}</td>
                        <td className="px-4 py-3 text-xs font-mono tabular-nums text-slate-700">
                          {tm.players.length} players
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={currentGrp?.id || ''}
                            disabled={isEffectiveTourExpired}
                            onChange={(e) => assignTeamToGroup(tm.id, e.target.value)}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white disabled:bg-slate-100 disabled:text-slate-400 text-xs text-slate-800"
                          >
                            <option value="">Unassigned</option>
                            {tourGroups.map((g) => (
                              <option key={g.id} value={g.id}>
                                {g.name}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
