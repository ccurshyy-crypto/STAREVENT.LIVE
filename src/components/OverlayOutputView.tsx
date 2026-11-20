import { useEffect, useState } from 'react';
import { useOverlaySync } from '../hooks/useOverlaySync';
import { LiveOverlayState, OverlayBackground, OverlayMode, OverlayStyle } from '../types/overlay';
import { SpinningLogoVideo } from './SpinningLogoVideo';

interface OverlayOutputViewProps {
  initialMode?: OverlayMode;
  initialStyle?: OverlayStyle;
  roomId: string;
  background: OverlayBackground;
  urlOverrides?: Partial<LiveOverlayState>;
  lockMode?: boolean;
  lockStyle?: boolean;
}

/**
 * Pure 1920x1080 transparent broadcast output view for OBS Studio Browser Source
 * and vMix Web Browser Input. Supports Style 1 (Classic Frame) & Style 2 (Modern TV/Ribbon)
 * for both Kabaddi Scoreboard & Haldi Live Overlay.
 */
export function OverlayOutputView({
  initialMode,
  initialStyle,
  roomId,
  background,
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

  useEffect(() => {
    if (!state.raidRunning) {
      setDisplayRaidSeconds(state.raidSeconds);
      return;
    }

    const computeRemaining = () => {
      const elapsedSec = Math.floor((Date.now() - state.raidUpdatedAt) / 1000);
      return Math.max(0, state.raidSeconds - elapsedSec);
    };

    setDisplayRaidSeconds(computeRemaining());
    const interval = window.setInterval(() => {
      setDisplayRaidSeconds(computeRemaining());
    }, 250);

    return () => window.clearInterval(interval);
  }, [state.raidSeconds, state.raidRunning, state.raidUpdatedAt]);

  const activeMode: OverlayMode = lockMode && initialMode ? initialMode : state.mode;
  const activeStyle: OverlayStyle = lockStyle && initialStyle ? initialStyle : state.style;

  const merged: LiveOverlayState = {
    ...state,
    ...(urlOverrides?.teamAName ? { teamAName: urlOverrides.teamAName } : {}),
    ...(urlOverrides?.teamBName ? { teamBName: urlOverrides.teamBName } : {}),
    ...(urlOverrides?.kabaddiTitle ? { kabaddiTitle: urlOverrides.kabaddiTitle } : {}),
    ...(urlOverrides?.kabaddiSubtitle ? { kabaddiSubtitle: urlOverrides.kabaddiSubtitle } : {}),
    ...(urlOverrides?.haldiTitle ? { haldiTitle: urlOverrides.haldiTitle } : {}),
    ...(urlOverrides?.haldiSubtitle ? { haldiSubtitle: urlOverrides.haldiSubtitle } : {}),
  };

  const isClassic = activeStyle === 'classic';

  return (
    <div
      className={`fixed inset-0 w-screen h-screen overflow-hidden select-none flex flex-col justify-between p-[2.2vw] transition-opacity duration-300 ${
        merged.visible ? 'opacity-100' : 'opacity-0'
      } ${
        isClassic
          ? activeMode === 'kabaddi'
            ? 'border-[6px] border-[#FACC15] shadow-[inset_0_0_0_6px_#DC2626]'
            : 'border-[6px] border-[#FACC15] shadow-[inset_0_0_0_8px_#B45309]'
          : ''
      }`}
    >
      {/* Classic Haldi ornamental corners */}
      {isClassic && activeMode === 'haldi' && (
        <>
          <div className="pointer-events-none absolute top-4 left-4 w-16 h-16 border-t-4 border-l-4 border-[#FACC15]" />
          <div className="pointer-events-none absolute top-4 right-4 w-16 h-16 border-t-4 border-r-4 border-[#FACC15]" />
          <div className="pointer-events-none absolute bottom-4 left-4 w-16 h-16 border-b-4 border-l-4 border-[#FACC15]" />
          <div className="pointer-events-none absolute bottom-4 right-4 w-16 h-16 border-b-4 border-r-4 border-[#FACC15]" />
        </>
      )}

      {/* TOP BAR LAYER */}
      <div className="relative z-10 flex items-center justify-between gap-4">
        {activeMode === 'kabaddi' ? (
          isClassic ? (
            <>
              <div className="bg-[#DC2626] border-2 border-[#FACC15] text-white px-5 py-2 rounded-lg font-mono font-extrabold text-[clamp(14px,1.35vw,26px)] tracking-wider shadow-xl">
                {merged.kabaddiTag}
              </div>
              <div className="bg-[#0B0A0E]/92 border-2 border-[#FACC15] px-6 py-2 rounded-lg font-display font-extrabold text-[clamp(14px,1.4vw,28px)] text-[#FACC15] shadow-xl">
                {merged.kabaddiTitle}
              </div>
            </>
          ) : (
            <>
              <div className="inline-flex items-center gap-3 bg-[#0A0C12]/90 border-2 border-[#FACC15]/85 rounded-full pl-2 pr-6 py-1.5 shadow-xl">
                <span className="bg-[#DC2626] text-white px-4 py-1 rounded-full font-mono font-extrabold text-[clamp(12px,1.05vw,20px)] tracking-wider">
                  {merged.kabaddiTag}
                </span>
                <span className="font-display font-extrabold text-[clamp(13px,1.15vw,22px)] text-[#FACC15]">
                  STAR EVENT LIVE
                </span>
              </div>
              <div className="bg-[#0A0C12]/88 border border-white/20 rounded-full px-6 py-2 font-display font-bold text-[clamp(13px,1.2vw,24px)] text-zinc-100 shadow-xl">
                {merged.kabaddiTitle}
              </div>
            </>
          )
        ) : isClassic ? (
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

      {/* 3D SPINNING CHROMA-KEYED BROADCAST LOGO WATERMARK (OBS / vMix transparent layer) */}
      {merged.showLogo && (
        <div
          className={`pointer-events-none absolute top-[10.5vh] z-20 ${
            merged.logoCorner === 'top-left' ? 'left-[2.6vw]' : 'right-[2.6vw]'
          }`}
        >
          <SpinningLogoVideo
            className="w-[clamp(74px,7.2vw,136px)] h-[clamp(74px,7.2vw,136px)] drop-shadow-[0_10px_24px_rgba(0,0,0,0.65)]"
            resolution={240}
            label="Star Event Live rotating broadcast bug"
          />
        </div>
      )}

      {/* CENTER ALERT LAYER ONLY (100% transparent when idle!) */}
      <div className="relative z-10 my-auto flex items-center justify-center pointer-events-none">
        {activeMode === 'kabaddi' && merged.kabaddiAlert && (
          <div className="bg-[#DC2626] border-4 border-[#FACC15] px-10 py-4 rounded-2xl text-white font-display font-extrabold text-[clamp(24px,3.2vw,60px)] tracking-tight shadow-2xl">
            {merged.kabaddiAlert}
          </div>
        )}
      </div>

      {/* BOTTOM BROADCAST OVERLAY BAR */}
      <div className="relative z-10 w-full">
        {activeMode === 'kabaddi' ? (
          isClassic ? (
            /* Kabaddi Style 1: Classic Shahi Arena Bar */
            <div className="w-full bg-[#12080B]/95 border-[3px] border-[#FACC15] rounded-2xl overflow-hidden shadow-2xl">
              <div className="grid grid-cols-12 items-center">
                <div className="col-span-5 bg-gradient-to-r from-[#991B1B] to-[#DC2626] px-6 py-4 flex items-center justify-between gap-4">
                  <span className="font-display font-extrabold text-[clamp(16px,1.75vw,34px)] text-white truncate">
                    {merged.teamAName}
                  </span>
                  <span className="font-mono font-extrabold text-[clamp(24px,2.8vw,52px)] text-[#FACC15] tabular-nums">
                    {String(merged.teamAScore).padStart(2, '0')}
                  </span>
                </div>

                <div className="col-span-2 bg-[#09090B] px-3 py-3 text-center border-x-2 border-[#FACC15]/70">
                  <p className="font-mono font-bold text-[clamp(10px,0.9vw,18px)] text-zinc-300 tracking-wider">
                    {merged.doOrDie ? 'DO-OR-DIE' : merged.kabaddiHalf}
                  </p>
                  <p
                    className={`font-mono font-extrabold text-[clamp(22px,2.5vw,46px)] tabular-nums leading-none mt-1 ${
                      displayRaidSeconds <= 10 ? 'text-[#EF4444]' : 'text-[#FACC15]'
                    }`}
                  >
                    {String(displayRaidSeconds).padStart(2, '0')}s
                  </p>
                </div>

                <div className="col-span-5 bg-gradient-to-l from-[#1E3A8A] to-[#1D4ED8] px-6 py-4 flex items-center justify-between gap-4">
                  <span className="font-mono font-extrabold text-[clamp(24px,2.8vw,52px)] text-[#FACC15] tabular-nums">
                    {String(merged.teamBScore).padStart(2, '0')}
                  </span>
                  <span className="font-display font-extrabold text-[clamp(16px,1.75vw,34px)] text-white truncate text-right">
                    {merged.teamBName}
                  </span>
                </div>
              </div>

              <div className="bg-[#230B0F] border-t border-[#FACC15]/50 px-6 py-2 text-center">
                <p className="font-semibold text-[clamp(12px,1.15vw,22px)] text-[#FEF08A] truncate">
                  {merged.kabaddiSubtitle}
                </p>
              </div>
            </div>
          ) : (
            /* Kabaddi Style 2: Pro TV Floating Broadcast Capsule + Circular Raid Clock */
            <div className="w-[88%] mx-auto relative">
              <div className="bg-[#0A0C14]/95 border-[3px] border-[#FACC15] rounded-full px-3 py-2.5 shadow-2xl">
                <div className="grid grid-cols-12 items-center gap-2">
                  <div className="col-span-5 bg-gradient-to-r from-[#B91C1C] to-[#EF4444] rounded-full px-7 py-3 flex items-center justify-between gap-4">
                    <span className="font-display font-extrabold text-[clamp(15px,1.55vw,30px)] text-white truncate">
                      {merged.teamAName}
                    </span>
                    <span className="font-mono font-extrabold text-[clamp(24px,2.7vw,50px)] text-[#FEF08A] tabular-nums">
                      {String(merged.teamAScore).padStart(2, '0')}
                    </span>
                  </div>

                  <div className="col-span-2 flex justify-center">
                    <div
                      className={`-my-6 w-[clamp(76px,7.4vw,138px)] h-[clamp(76px,7.4vw,138px)] rounded-full bg-[#09090B] border-4 flex flex-col items-center justify-center shadow-2xl ${
                        merged.doOrDie ? 'border-[#EF4444]' : 'border-[#FACC15]'
                      }`}
                    >
                      <span
                        className={`font-mono font-bold text-[clamp(9px,0.78vw,15px)] tracking-wider ${
                          merged.doOrDie ? 'text-[#FCA5A5]' : 'text-zinc-400'
                        }`}
                      >
                        {merged.doOrDie ? 'DO-OR-DIE' : merged.kabaddiHalf}
                      </span>
                      <span
                        className={`font-mono font-extrabold text-[clamp(20px,2.3vw,44px)] tabular-nums leading-none mt-0.5 ${
                          displayRaidSeconds <= 10 ? 'text-[#EF4444]' : 'text-[#FACC15]'
                        }`}
                      >
                        {String(displayRaidSeconds).padStart(2, '0')}s
                      </span>
                    </div>
                  </div>

                  <div className="col-span-5 bg-gradient-to-l from-[#1E3A8A] to-[#0284C7] rounded-full px-7 py-3 flex items-center justify-between gap-4">
                    <span className="font-mono font-extrabold text-[clamp(24px,2.7vw,50px)] text-[#FEF08A] tabular-nums">
                      {String(merged.teamBScore).padStart(2, '0')}
                    </span>
                    <span className="font-display font-extrabold text-[clamp(15px,1.55vw,30px)] text-white truncate text-right">
                      {merged.teamBName}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-2 text-center">
                <span className="inline-block bg-[#0A0C14]/90 border border-[#FACC15]/40 rounded-full px-6 py-1 font-semibold text-[clamp(11px,1vw,19px)] text-[#FEF08A]">
                  {merged.kabaddiSubtitle}
                </span>
              </div>
            </div>
          )
        ) : isClassic ? (
          /* Haldi Style 1: Shahi Traditional Ornamental Banner */
          <div className="w-[92%] mx-auto bg-gradient-to-r from-[#78350F]/95 via-[#B45309]/95 to-[#78350F]/95 border-[3px] border-[#FACC15] rounded-2xl px-8 py-4 text-center shadow-2xl">
            <p className="font-display font-extrabold text-[clamp(20px,2.2vw,42px)] text-white truncate">
              {merged.haldiTitle}
            </p>
            <p className="font-semibold text-[clamp(12px,1.15vw,22px)] text-[#FEF08A] mt-1 truncate">
              {merged.haldiSubtitle}
            </p>
          </div>
        ) : (
          /* Haldi Style 2: Minimal Floral Cinematic Ribbon */
          <div className="w-[82%] mx-auto bg-gradient-to-r from-[#221204]/90 via-[#92400E]/95 to-[#221204]/90 border-[3px] border-[#FDE047] rounded-full px-12 py-4 flex items-center justify-between gap-6 shadow-2xl">
            <span className="w-3.5 h-3.5 rotate-45 bg-[#FACC15] shrink-0" aria-hidden="true" />
            <div className="min-w-0 text-center flex-1">
              <p className="font-display font-extrabold text-[clamp(19px,2.1vw,40px)] text-white truncate">
                {merged.haldiTitle}
              </p>
              <p className="font-semibold text-[clamp(11px,1.05vw,20px)] text-[#FEF08A] mt-0.5 truncate">
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
