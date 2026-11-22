import { useEffect, useState } from 'react';
import { computeLiveClockSeconds, useUserScoreboard } from '../hooks/useUserScoreboard';
import { OverlayBackground } from '../types/overlay';
import { KabaddiGraphicOverlay } from './KabaddiGraphicOverlay';
import { KabaddiScoreboardBar } from './KabaddiScoreboardBar';

interface UserScoreboardOverlayViewProps {
  targetUid: string;
  background?: OverlayBackground;
}

/**
 * Pure Transparent vMix / OBS Scoreboard Overlay (`/scoreboard/{USER_UID}`).
 *
 * Broadcast guarantees:
 * - Fully transparent background (no website chrome, no admin UI, no usernames,
 *   no Firebase UIDs, no debug logs, no lock banners).
 * - Independent per-user Firebase Firestore real-time synchronization
 *   (`/users/{targetUid}/scoreboard/current` & `/users/{targetUid}/settings/main`).
 * - Instant real-time updates without refreshing the vMix Browser Input.
 */
export function UserScoreboardOverlayView({
  targetUid,
  background = 'transparent',
}: UserScoreboardOverlayViewProps) {
  const { state } = useUserScoreboard({
    targetUid,
    role: 'overlay',
    canWrite: false,
  });

  // Enforce transparent (or optional chroma key) document root immediately
  useEffect(() => {
    const className =
      background === 'green'
        ? 'overlay-chroma-green'
        : background === 'blue'
          ? 'overlay-chroma-blue'
          : 'overlay-transparent';

    document.documentElement.classList.remove(
      'overlay-transparent',
      'overlay-chroma-green',
      'overlay-chroma-blue'
    );
    document.body.classList.remove(
      'overlay-transparent',
      'overlay-chroma-green',
      'overlay-chroma-blue'
    );
    document.documentElement.classList.add(className);
    document.body.classList.add(className);

    return () => {
      document.documentElement.classList.remove(className);
      document.body.classList.remove(className);
    };
  }, [background]);

  const [nowClock, setNowClock] = useState(() => Date.now());

  // Tick local display smoothly only when a clock or sin-bin countdown is active
  const anyClockRunning =
    state.matchRunning ||
    state.raidRunning ||
    Boolean(state.teamABinEndAt) ||
    Boolean(state.teamBBinEndAt);

  useEffect(() => {
    setNowClock(Date.now());
    if (!anyClockRunning) return;
    const id = window.setInterval(() => setNowClock(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [anyClockRunning, state.matchUpdatedAt, state.raidUpdatedAt]);

  const displayMatchSeconds = computeLiveClockSeconds(
    state.matchSeconds,
    state.matchRunning,
    state.matchUpdatedAt,
    nowClock
  );

  const displayRaidSeconds = computeLiveClockSeconds(
    state.raidSeconds,
    state.raidRunning,
    state.raidUpdatedAt,
    nowClock
  );

  const teamABinRemaining = state.teamABinEndAt
    ? Math.max(0, Math.ceil((state.teamABinEndAt - nowClock) / 1000))
    : 0;
  const teamBBinRemaining = state.teamBBinEndAt
    ? Math.max(0, Math.ceil((state.teamBBinEndAt - nowClock) / 1000))
    : 0;

  // Include optional sponsor name cleanly in the broadcast ticker without clutter
  const cleanSponsor = (state.sponsorName || '').trim();
  const cleanSubtitle = (state.kabaddiSubtitle || '').trim();
  const broadcastSubtitle =
    cleanSponsor && cleanSubtitle && !cleanSubtitle.toLowerCase().includes(cleanSponsor.toLowerCase())
      ? `${cleanSubtitle} · ${cleanSponsor}`
      : cleanSubtitle || cleanSponsor;

  return (
    <div
      className={`fixed inset-0 w-screen h-screen overflow-hidden select-none flex flex-col justify-between p-[2.2vw] bg-transparent transition-opacity duration-300 ${
        state.visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="relative z-10 my-auto flex flex-col items-center justify-center gap-4 pointer-events-none">
        {state.kabaddiGraphicPanel && state.kabaddiGraphicPanel !== 'none' && (
          <KabaddiGraphicOverlay state={state} variant="output" />
        )}
      </div>

      <div className="relative z-10 w-full">
        <KabaddiScoreboardBar
          variant="output"
          teamAName={state.teamAName}
          teamACode={state.teamACode}
          teamAColor={state.teamAColor}
          teamAScore={state.teamAScore}
          teamABonusPoints={state.teamABonusPoints}
          teamALonaPoints={state.teamALonaPoints}
          teamAPlayersOnMat={state.teamAPlayersOnMat}
          teamALogoUrl={state.teamALogoUrl}
          teamAGreenCards={state.teamAGreenCards}
          teamAYellowCards={state.teamAYellowCards}
          teamARedCards={state.teamARedCards}
          teamABinRemaining={teamABinRemaining}
          teamBName={state.teamBName}
          teamBCode={state.teamBCode}
          teamBColor={state.teamBColor}
          teamBScore={state.teamBScore}
          teamBBonusPoints={state.teamBBonusPoints}
          teamBLonaPoints={state.teamBLonaPoints}
          teamBPlayersOnMat={state.teamBPlayersOnMat}
          teamBLogoUrl={state.teamBLogoUrl}
          teamBGreenCards={state.teamBGreenCards}
          teamBYellowCards={state.teamBYellowCards}
          teamBRedCards={state.teamBRedCards}
          teamBBinRemaining={teamBBinRemaining}
          matchSeconds={displayMatchSeconds}
          raidSeconds={displayRaidSeconds}
          raidDuration={state.kabaddiRaidDuration}
          raidRunning={state.raidRunning}
          halfLabel={state.kabaddiHalf}
          matchStatus={state.matchStatus}
          timeoutTeam={state.timeoutTeam}
          doOrDie={state.doOrDie}
          alertText={state.kabaddiAlert}
          tournamentTitle={state.kabaddiTitle}
          subtitle={broadcastSubtitle}
          showDemoWatermark={false}
        />
      </div>
    </div>
  );
}
