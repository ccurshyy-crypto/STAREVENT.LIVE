import { useEffect, useState } from 'react';
import { getOverlaySku } from '../data/overlayCatalog';
import { useOverlaySync } from '../hooks/useOverlaySync';
import {
  LiveOverlayState,
  normalizeStyleForMode,
  OverlayBackground,
  OverlayMode,
  OverlayStyle,
} from '../types/overlay';
import { KabaddiScoreboardBar } from './KabaddiScoreboardBar';

interface OverlayOutputViewProps {
  initialMode?: OverlayMode;
  initialStyle?: OverlayStyle;
  roomId: string;
  background: OverlayBackground;
  token?: string;
  urlOverrides?: Partial<LiveOverlayState>;
  lockMode?: boolean;
  lockStyle?: boolean;
}

/**
 * Pure 1920x1080 transparent broadcast output view for OBS Studio Browser Source
 * and vMix Web Browser Input. Supports Curved Dual-Logo Kabaddi Scoreboard,
 * Haldi & Wedding Live Overlay, and 4-Theme Animated Customizable Bottom Frame.
 */
export function OverlayOutputView({
  initialMode,
  initialStyle,
  roomId,
  background,
  token,
  urlOverrides,
  lockMode = false,
  lockStyle = false,
}: OverlayOutputViewProps) {
  const { state } = useOverlaySync({
    roomId,
    initialOverrides: {
      ...(initialMode ? { mode: initialMode } : {}),
      ...(initialStyle ? { style: initialStyle } : {}),
      ...urlOverrides,
    },
  });

  useEffect(() => {
    const className =
      background === 'green'
        ? 'overlay-chroma-green'
        : background === 'blue'
          ? 'overlay-chroma-blue'
          : 'overlay-transparent';

    document.documentElement.classList.add(className);
    document.body.classList.add(className);

    return () => {
      document.documentElement.classList.remove(className);
      document.body.classList.remove(className);
    };
  }, [background]);

  const [displayRaidSeconds, setDisplayRaidSeconds] = useState(state.raidSeconds);
  const [displayMatchSeconds, setDisplayMatchSeconds] = useState(state.matchSeconds);
  const [nowClock, setNowClock] = useState(() => Date.now());

  useEffect(() => {
    if (!state.raidRunning) {
      setDisplayRaidSeconds(state.raidSeconds);
      return;
    }
    const compute = () =>
      Math.max(0, state.raidSeconds - Math.floor((Date.now() - state.raidUpdatedAt) / 1000));
    setDisplayRaidSeconds(compute());
    const id = window.setInterval(() => setDisplayRaidSeconds(compute()), 250);
    return () => window.clearInterval(id);
  }, [state.raidSeconds, state.raidRunning, state.raidUpdatedAt]);

  useEffect(() => {
    if (!state.matchRunning) {
      setDisplayMatchSeconds(state.matchSeconds);
      return;
    }
    const compute = () =>
      Math.max(0, state.matchSeconds - Math.floor((Date.now() - state.matchUpdatedAt) / 1000));
    setDisplayMatchSeconds(compute());
    const id = window.setInterval(() => setDisplayMatchSeconds(compute()), 250);
    return () => window.clearInterval(id);
  }, [state.matchSeconds, state.matchRunning, state.matchUpdatedAt]);

  useEffect(() => {
    if (!state.teamABinEndAt && !state.teamBBinEndAt) return;
    setNowClock(Date.now());
    const id = window.setInterval(() => setNowClock(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [state.teamABinEndAt, state.teamBBinEndAt]);

  const activeMode: OverlayMode = lockMode && initialMode ? initialMode : state.mode;
  const activeStyle: OverlayStyle = normalizeStyleForMode(
    activeMode,
    lockStyle && initialStyle ? initialStyle : state.style
  );
  const activeSku = getOverlaySku(activeMode, activeStyle);

  const [accessState, setAccessState] = useState<'checking' | 'active' | 'expired' | 'locked'>(
    token ? 'checking' : 'locked'
  );
  const [expiresAt, setExpiresAt] = useState<number | null>(null);

  // Verify 24-hour paid access token against server
  useEffect(() => {
    if (!token) {
      setAccessState('locked');
      setExpiresAt(null);
      return;
    }

    let cancelled = false;
    const checkAccess = async () => {
      try {
        const res = await fetch(
          `/api/overlay/access?sku=${encodeURIComponent(activeSku)}&token=${encodeURIComponent(token)}`
        );
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && data?.active && typeof data.expiresAt === 'number') {
          setAccessState('active');
          setExpiresAt(data.expiresAt);
        } else if (data?.reason === 'expired') {
          setAccessState('expired');
          setExpiresAt(null);
        } else {
          setAccessState('locked');
          setExpiresAt(null);
        }
      } catch {
        if (!cancelled) setAccessState('locked');
      }
    };

    checkAccess();
    const recheckInterval = window.setInterval(checkAccess, 20_000);
    return () => {
      cancelled = true;
      window.clearInterval(recheckInterval);
    };
  }, [activeSku, token]);

  // Auto-lock the exact moment the 24-hour expiry timestamp is reached
  useEffect(() => {
    if (accessState !== 'active' || !expiresAt) return;
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) {
      setAccessState('expired');
      return;
    }
    const timer = window.setTimeout(() => {
      setAccessState('expired');
    }, Math.min(remaining, 2_147_483_647));
    return () => window.clearTimeout(timer);
  }, [accessState, expiresAt]);

  const merged: LiveOverlayState = {
    ...state,
    ...(urlOverrides?.teamAName ? { teamAName: urlOverrides.teamAName } : {}),
    ...(urlOverrides?.teamBName ? { teamBName: urlOverrides.teamBName } : {}),
    ...(urlOverrides?.kabaddiTitle ? { kabaddiTitle: urlOverrides.kabaddiTitle } : {}),
    ...(urlOverrides?.kabaddiSubtitle ? { kabaddiSubtitle: urlOverrides.kabaddiSubtitle } : {}),
    ...(urlOverrides?.haldiTitle ? { haldiTitle: urlOverrides.haldiTitle } : {}),
    ...(urlOverrides?.haldiSubtitle ? { haldiSubtitle: urlOverrides.haldiSubtitle } : {}),
  };

  const teamABinRemaining = merged.teamABinEndAt
    ? Math.max(0, Math.ceil((merged.teamABinEndAt - nowClock) / 1000))
    : 0;
  const teamBBinRemaining = merged.teamBBinEndAt
    ? Math.max(0, Math.ceil((merged.teamBBinEndAt - nowClock) / 1000))
    : 0;

  const isClassic = activeStyle === 'classic';

  if (accessState !== 'active') {
    return (
      <div className="fixed inset-0 w-screen h-screen flex items-center justify-center p-6 select-none">
        {accessState !== 'checking' && (
          <div className="bg-[#0B0A0E]/92 border-2 border-[#FACC15] rounded-2xl px-8 py-6 text-center max-w-xl shadow-2xl space-y-2">
            <p className="font-mono text-xs font-bold tracking-wider text-[#FACC15]">
              STAR EVENT LIVE · 24-HOUR PASS
            </p>
            <h1 className="font-display text-2xl font-extrabold text-white">
              {accessState === 'expired'
                ? 'Overlay 24-Hour Pass Expired (Auto-Locked)'
                : 'Paid Overlay Locked — ₹99 / 24 Hours'}
            </h1>
            <p className="text-sm text-zinc-300">
              {accessState === 'expired'
                ? 'Your 24-hour broadcast validity has ended. Renew for ₹99 at starevent.live/overlays to unlock again.'
                : 'Unlock this overlay for 24 hours at starevent.live/overlays (UPI: crushyyphotography@oksbi) to get your active OBS/vMix URL.'}
            </p>
          </div>
        )}
      </div>
    );
  }

  // KABADDI MODE: Clean Borderless 1920x1080 Curved Dual-Logo Scoreboard
  if (activeMode === 'kabaddi') {
    return (
      <div
        className={`fixed inset-0 w-screen h-screen overflow-hidden select-none flex flex-col justify-between p-[2.2vw] transition-opacity duration-300 ${
          merged.visible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="relative z-10 my-auto flex items-center justify-center pointer-events-none">
          {merged.kabaddiAlert && (
            <div className="bg-[#DC2626] border-4 border-[#FACC15] px-10 py-4 rounded-2xl text-white font-display font-extrabold text-[clamp(24px,3.2vw,60px)] tracking-tight shadow-2xl">
              {merged.kabaddiAlert}
            </div>
          )}
        </div>

        <div className="relative z-10 w-full">
          <KabaddiScoreboardBar
            variant="output"
            teamAName={merged.teamAName}
            teamACode={merged.teamACode}
            teamAColor={merged.teamAColor}
            teamAScore={merged.teamAScore}
            teamALogoUrl={merged.teamALogoUrl}
            teamAYellowCards={merged.teamAYellowCards}
            teamARedCards={merged.teamARedCards}
            teamABinRemaining={teamABinRemaining}
            teamBName={merged.teamBName}
            teamBCode={merged.teamBCode}
            teamBColor={merged.teamBColor}
            teamBScore={merged.teamBScore}
            teamBLogoUrl={merged.teamBLogoUrl}
            teamBYellowCards={merged.teamBYellowCards}
            teamBRedCards={merged.teamBRedCards}
            teamBBinRemaining={teamBBinRemaining}
            matchSeconds={displayMatchSeconds}
            raidSeconds={displayRaidSeconds}
            raidRunning={merged.raidRunning}
            halfLabel={merged.kabaddiHalf}
            doOrDie={merged.doOrDie}
            subtitle={merged.kabaddiSubtitle}
          />
        </div>
      </div>
    );
  }

  // HALDI & WEDDING MODE
  return (
    <div
      className={`fixed inset-0 w-screen h-screen overflow-hidden select-none flex flex-col justify-between p-[2.2vw] transition-opacity duration-300 ${
        merged.visible ? 'opacity-100' : 'opacity-0'
      } ${isClassic ? 'border-[6px] border-[#FACC15] shadow-[inset_0_0_0_8px_#B45309]' : ''}`}
    >
      {/* Classic Haldi & Wedding ornamental corners */}
      {isClassic && (
        <>
          <div className="pointer-events-none absolute top-4 left-4 w-16 h-16 border-t-4 border-l-4 border-[#FACC15]" />
          <div className="pointer-events-none absolute top-4 right-4 w-16 h-16 border-t-4 border-r-4 border-[#FACC15]" />
          <div className="pointer-events-none absolute bottom-4 left-4 w-16 h-16 border-b-4 border-l-4 border-[#FACC15]" />
          <div className="pointer-events-none absolute bottom-4 right-4 w-16 h-16 border-b-4 border-r-4 border-[#FACC15]" />
        </>
      )}

      {/* TOP BAR LAYER */}
      <div className="relative z-10 flex items-center justify-between gap-4">
        {isClassic ? (
          <>
            <div className="bg-[#B45309]/95 border-2 border-[#FACC15] text-[#FEF08A] px-5 py-2 rounded-lg font-mono font-extrabold text-[clamp(13px,1.25vw,24px)] tracking-wider shadow-xl">
              {merged.haldiTag}
            </div>
            <div className="mx-auto bg-gradient-to-r from-[#78350F]/95 via-[#B45309]/95 to-[#78350F]/95 border-2 border-[#FACC15] px-8 py-2.5 rounded-full font-display font-bold text-[clamp(15px,1.5vw,30px)] text-[#FEF08A] shadow-xl">
              {merged.haldiHeader}
            </div>
            <div className="w-[10vw]" aria-hidden="true" />
          </>
        ) : (
          <div className="ml-auto bg-[#180F06]/85 border-2 border-[#FACC15]/85 rounded-full px-6 py-2 font-display font-bold text-[clamp(13px,1.15vw,22px)] text-[#FACC15] shadow-xl">
            {merged.haldiHeader}
          </div>
        )}
      </div>

      {/* OPTIONAL USER-UPLOADED CUSTOM LOGO WATERMARK */}
      {merged.showLogo && merged.customLogoUrl && (
        <div
          className={`pointer-events-none absolute top-[10.5vh] z-20 ${
            merged.logoCorner === 'top-left' ? 'left-[2.6vw]' : 'right-[2.6vw]'
          }`}
        >
          <div className="w-[clamp(74px,7.2vw,136px)] h-[clamp(74px,7.2vw,136px)] rounded-full border-2 border-[#FACC15] bg-black/75 p-2 overflow-hidden flex items-center justify-center drop-shadow-[0_10px_24px_rgba(0,0,0,0.65)]">
            <img
              src={merged.customLogoUrl}
              alt="Custom overlay logo"
              className="w-full h-full object-contain rounded-full"
            />
          </div>
        </div>
      )}

      {/* CENTER SAFE ZONE */}
      <div className="relative z-10 my-auto" aria-hidden="true" />

      {/* BOTTOM BROADCAST OVERLAY BAR */}
      <div className="relative z-10 w-full">
        {isClassic ? (
          <div className="w-[92%] mx-auto bg-gradient-to-r from-[#78350F]/95 via-[#B45309]/95 to-[#78350F]/95 border-[3px] border-[#FACC15] rounded-2xl px-8 py-4 text-center shadow-2xl">
            <p className="font-display font-extrabold text-[clamp(20px,2.2vw,42px)] text-white truncate leading-normal py-0.5">
              {merged.haldiTitle}
            </p>
            <p className="font-semibold text-[clamp(12px,1.15vw,22px)] text-[#FEF08A] mt-1 truncate leading-normal">
              {merged.haldiSubtitle}
            </p>
          </div>
        ) : (
          <div className="w-[82%] mx-auto bg-gradient-to-r from-[#221204]/90 via-[#92400E]/95 to-[#221204]/90 border-[3px] border-[#FDE047] rounded-full px-12 py-4 flex items-center justify-between gap-6 shadow-2xl">
            <span className="w-3.5 h-3.5 rotate-45 bg-[#FACC15] shrink-0" aria-hidden="true" />
            <div className="min-w-0 text-center flex-1">
              <p className="font-display font-extrabold text-[clamp(19px,2.1vw,40px)] text-white truncate leading-normal py-0.5">
                {merged.haldiTitle}
              </p>
              <p className="font-semibold text-[clamp(11px,1.05vw,20px)] text-[#FEF08A] mt-0.5 truncate leading-normal">
                {merged.haldiTag} • {merged.haldiSubtitle}
              </p>
            </div>
            <span className="w-3.5 h-3.5 rotate-45 bg-[#FACC15] shrink-0" aria-hidden="true" />
          </div>
        )}
      </div>
    </div>
  );
}
