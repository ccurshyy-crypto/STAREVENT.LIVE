import { useEffect } from 'react';
import { useCricketScoreboard } from '../hooks/useCricketScoreboard';
import { OverlayBackground } from '../types/overlay';
import { CricketScoreboardBar } from './CricketScoreboardBar';

interface UserCricketOverlayViewProps {
  targetUid: string;
  background?: OverlayBackground;
}

/**
 * Pure Transparent vMix / OBS Single Cricket Scoreboard Output (`/cricket-overlay/{USER_UID}`).
 *
 * Broadcast guarantees:
 * - Fully transparent background (or optional `?bg=green` / `?bg=blue` chroma key).
 * - Zero website navigation, zero admin controls, zero watermarks.
 * - Real-time per-user Firestore synchronization (`/users/{targetUid}/cricket/current`).
 */
export function UserCricketOverlayView({
  targetUid,
  background = 'transparent',
}: UserCricketOverlayViewProps) {
  const { doc: cricketDoc } = useCricketScoreboard({
    targetUid,
    role: 'overlay',
    canWrite: false,
  });

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

  return (
    <div
      className={`fixed inset-0 w-screen h-screen overflow-hidden select-none flex flex-col justify-end pb-[2.4vw] px-[2.4vw] bg-transparent transition-opacity duration-300 ${
        cricketDoc.visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <CricketScoreboardBar data={cricketDoc} variant="output" />
    </div>
  );
}
