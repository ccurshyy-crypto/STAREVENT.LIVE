import { useEffect, useState } from 'react';
import { useSupabaseKabaddiRoom } from '../hooks/useSupabaseKabaddiRoom';
import { computeLiveCountdown, KabaddiBroadcastCallout } from '../types/supabaseKabaddi';
import { KabaddiScoreboardBar } from './KabaddiScoreboardBar';

interface SupabaseKabaddiOverlayViewProps {
  matchId: string;
}

function getCalloutPalette(type: KabaddiBroadcastCallout['type']) {
  switch (type) {
    case 'ALL OUT':
      return {
        border: '#FFE600',
        bg: 'linear-gradient(135deg, rgba(153, 12, 22, 0.97) 0%, rgba(220, 38, 38, 0.96) 52%, rgba(92, 6, 14, 0.98) 100%)',
        accent: '#FFE600',
        kicker: 'LONA · +2 BONUS POINTS',
      };
    case 'SUPER TACKLE':
      return {
        border: '#38BDF8',
        bg: 'linear-gradient(135deg, rgba(12, 20, 56, 0.97) 0%, rgba(29, 78, 216, 0.95) 52%, rgba(9, 13, 36, 0.98) 100%)',
        accent: '#FFE600',
        kicker: 'DEFENSIVE MASTERCLASS · +2',
      };
    case 'DO OR DIE':
      return {
        border: '#EF4444',
        bg: 'linear-gradient(135deg, rgba(24, 6, 9, 0.97) 0%, rgba(185, 28, 28, 0.96) 50%, rgba(24, 6, 9, 0.98) 100%)',
        accent: '#FFE600',
        kicker: 'MUST SCORE OR OUT',
      };
    case 'BONUS':
      return {
        border: '#FACC15',
        bg: 'linear-gradient(135deg, rgba(28, 18, 4, 0.96) 0%, rgba(146, 64, 14, 0.95) 52%, rgba(20, 12, 3, 0.97) 100%)',
        accent: '#FEF08A',
        kicker: 'BONUS LINE CROSSED',
      };
    case 'SUPER RAID':
    default:
      return {
        border: '#FFE600',
        bg: 'linear-gradient(135deg, rgba(18, 8, 10, 0.97) 0%, rgba(185, 28, 28, 0.95) 48%, rgba(120, 53, 15, 0.96) 100%)',
        accent: '#FFE600',
        kicker: '3+ POINTS IN A SINGLE RAID',
      };
  }
}

/**
 * Pure 1920x1080 transparent-background vMix Web Browser Input overlay (/overlay?id=MATCH_ID).
 * Zero buttons, zero scrollbars, zero background fill — updates instantaneously via Supabase Realtime.
 */
export function SupabaseKabaddiOverlayView({ matchId }: SupabaseKabaddiOverlayViewProps) {
  const { state } = useSupabaseKabaddiRoom({ matchId, readOnly: true });

  const [nowMs, setNowMs] = useState(() => Date.now());
  const [scale, setScale] = useState(1);

  // Enforce strict transparent background & zero scrollbars for vMix / OBS alpha compositing
  useEffect(() => {
    document.documentElement.classList.add('overlay-transparent');
    document.body.classList.add('overlay-transparent');
    return () => {
      document.documentElement.classList.remove('overlay-transparent');
      document.body.classList.remove('overlay-transparent');
    };
  }, []);

  // Keep native 1920x1080 exact in vMix and proportionally scaled inside smaller preview windows
  useEffect(() => {
    const updateScale = () => {
      const vw = window.innerWidth || 1920;
      const vh = window.innerHeight || 1080;
      const next = Math.min(vw / 1920, vh / 1080);
      setScale(next > 0 ? next : 1);
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  // Tick local clock cleanly for 30s raid timer, match clock, and auto-expiring broadcast callouts
  useEffect(() => {
    const needsTick =
      state.raidRunning ||
      state.matchRunning ||
      Boolean(state.callout && state.callout.expiresAt > Date.now());
    if (!needsTick) {
      setNowMs(Date.now());
      return;
    }
    const id = window.setInterval(() => setNowMs(Date.now()), 200);
    return () => window.clearInterval(id);
  }, [state.raidRunning, state.matchRunning, state.callout]);

  const liveRaidSeconds = computeLiveCountdown(
    state.raidSeconds,
    state.raidRunning,
    state.raidUpdatedAt,
    nowMs
  );
  const liveMatchSeconds = computeLiveCountdown(
    state.matchSeconds,
    state.matchRunning,
    state.matchUpdatedAt,
    nowMs
  );

  const activeCallout =
    state.callout && state.callout.expiresAt > nowMs ? state.callout : null;

  const calloutPalette = activeCallout ? getCalloutPalette(activeCallout.type) : null;
  const calloutTeamColor =
    activeCallout?.team === 'A'
      ? state.teamAColor
      : activeCallout?.team === 'B'
        ? state.teamBColor
        : '#FFE600';

  const doOrDieTeamName =
    state.doOrDieTeam === 'A'
      ? state.teamAName
      : state.doOrDieTeam === 'B'
        ? state.teamBName
        : null;

  return (
    <div
      className="fixed inset-0 w-screen h-screen overflow-hidden select-none pointer-events-none flex items-center justify-center"
      style={{ background: 'transparent' }}
    >
      <div
        className={`relative w-[1920px] h-[1080px] shrink-0 overflow-hidden transition-opacity duration-300 ${
          state.visible ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          background: 'transparent',
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
      >
        {/* Top-Right Compact Do-or-Die Raid Alert Banner (when active) */}
        {state.doOrDie && (
          <div
            className="absolute top-[42px] right-[48px] z-20 flex items-center gap-4 px-7 py-3.5 rounded-xl border-2 border-[#FFE600] shadow-[0_14px_40px_rgba(0,0,0,0.65)]"
            style={{
              background:
                'linear-gradient(135deg, rgba(127, 13, 18, 0.96) 0%, rgba(220, 38, 38, 0.95) 55%, rgba(24, 6, 8, 0.97) 100%)',
            }}
          >
            <span className="font-display font-black text-[28px] tracking-wider text-[#FFE600] uppercase leading-none">
              DO OR DIE RAID
            </span>
            {doOrDieTeamName && (
              <span className="font-mono font-bold text-[20px] text-white border-l-2 border-[#FFE600]/60 pl-4 uppercase tracking-wide">
                {doOrDieTeamName}
              </span>
            )}
          </div>
        )}

        {/* Animated Center-Lower Broadcast Callout (SUPER RAID / SUPER TACKLE / ALL OUT) */}
        {activeCallout && calloutPalette && (
          <div
            key={activeCallout.id}
            className="absolute left-1/2 bottom-[250px] z-30 -translate-x-1/2"
          >
            <div
              className="relative overflow-hidden min-w-[680px] max-w-[1100px] px-12 py-6 rounded-2xl border-[3px] shadow-[0_24px_64px_rgba(0,0,0,0.75)] text-center animate-[kabaddiAlertRise_0.42s_cubic-bezier(0.22,1,0.36,1)_both]"
              style={{
                borderColor: calloutPalette.border,
                background: calloutPalette.bg,
              }}
            >
              <div
                className="absolute inset-y-0 left-0 w-3"
                style={{ backgroundColor: calloutTeamColor }}
              />
              <div
                className="absolute inset-y-0 right-0 w-3"
                style={{ backgroundColor: calloutTeamColor }}
              />
              <p
                className="font-mono text-[18px] font-extrabold tracking-[0.26em] uppercase"
                style={{ color: calloutPalette.accent }}
              >
                {calloutPalette.kicker}
              </p>
              <p className="font-display font-black text-[58px] leading-[1.08] tracking-tight text-white uppercase drop-shadow-[0_4px_12px_rgba(0,0,0,0.65)] mt-1">
                {activeCallout.label}
              </p>
              {activeCallout.sublabel && (
                <p className="font-display font-bold text-[24px] tracking-wider text-[#FEF08A] uppercase mt-1.5">
                  {activeCallout.sublabel}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Lower-Third Broadcast Kabaddi Scoreboard anchored cleanly for 1920x1080 vMix safe zone */}
        <div className="absolute inset-x-[44px] bottom-[36px] z-20">
          <KabaddiScoreboardBar
            variant="output"
            teamAName={state.teamAName}
            teamACode={state.teamACode}
            teamAColor={state.teamAColor}
            teamAScore={state.teamAScore}
            teamABonusPoints={state.teamABonusPoints}
            teamALonaPoints={state.teamALonaPoints}
            teamAPlayersOnMat={state.teamAPlayersOnMat}
            teamBName={state.teamBName}
            teamBCode={state.teamBCode}
            teamBColor={state.teamBColor}
            teamBScore={state.teamBScore}
            teamBBonusPoints={state.teamBBonusPoints}
            teamBLonaPoints={state.teamBLonaPoints}
            teamBPlayersOnMat={state.teamBPlayersOnMat}
            matchSeconds={liveMatchSeconds}
            raidSeconds={liveRaidSeconds}
            raidDuration={state.raidDuration}
            raidRunning={state.raidRunning}
            halfLabel={state.half}
            doOrDie={state.doOrDie}
            alertText={activeCallout ? activeCallout.label : null}
            tournamentTitle={state.tournamentTitle}
            subtitle={state.subtitle}
            showDemoWatermark={false}
          />
        </div>
      </div>
    </div>
  );
}
