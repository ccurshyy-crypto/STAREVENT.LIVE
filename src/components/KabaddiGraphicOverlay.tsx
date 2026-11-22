import { LiveOverlayState } from '../types/overlay';

interface KabaddiGraphicOverlayProps {
  state: LiveOverlayState;
  variant?: 'studio' | 'output';
}

export function KabaddiGraphicOverlay({
  state,
  variant = 'studio',
}: KabaddiGraphicOverlayProps) {
  const panel = state.kabaddiGraphicPanel ?? 'none';
  if (panel === 'none') return null;

  const isOutput = variant === 'output';
  const boxWidth = isOutput ? 'w-[74vw] max-w-[1380px]' : 'w-[94%] max-w-[540px]';
  const padClass = isOutput ? 'p-7' : 'p-2.5 sm:p-3';
  const headingSize = isOutput ? 'text-[clamp(18px,1.7vw,32px)]' : 'text-[10px] sm:text-xs';
  const bodySize = isOutput ? 'text-[clamp(14px,1.25vw,24px)]' : 'text-[9px] sm:text-[11px]';
  const subSize = isOutput ? 'text-[clamp(11px,0.95vw,18px)]' : 'text-[8px] sm:text-[9px]';

  const teamA = state.teamAName || 'TEAM A';
  const teamB = state.teamBName || 'TEAM B';
  const teamAColor = state.teamAColor || '#C8102E';
  const teamBColor = state.teamBColor || '#131D8A';
  const playersA = state.teamAStarting7?.length
    ? state.teamAStarting7
    : ['PLAYER 1', 'PLAYER 2', 'PLAYER 3', 'PLAYER 4', 'PLAYER 5', 'PLAYER 6', 'PLAYER 7'];
  const playersB = state.teamBStarting7?.length
    ? state.teamBStarting7
    : ['PLAYER 1', 'PLAYER 2', 'PLAYER 3', 'PLAYER 4', 'PLAYER 5', 'PLAYER 6', 'PLAYER 7'];

  const headerBanner = (label: string) => (
    <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-[#86198F] via-[#C026D3] to-[#86198F] px-3 py-1 rounded-t-lg border-b border-[#FACC15]/70">
      <span className={`font-display font-extrabold text-white tracking-wide uppercase truncate ${headingSize}`}>
        {label}
      </span>
      <span className={`font-mono font-bold text-[#FEF08A] truncate ${subSize}`}>
        {state.kabaddiTitle || 'KABADDI LIVE'} · {state.kabaddiMatchType || 'MATCH'}
      </span>
    </div>
  );

  if (panel === 'starting7') {
    return (
      <div className={`kabaddi-graphic-enter ${boxWidth} mx-auto rounded-xl overflow-hidden bg-[#0D131D]/94 border-2 border-[#FACC15]/80 shadow-2xl`}>
        {headerBanner('STARTING 7 LINEUP')}
        <div className={`grid grid-cols-2 gap-3 ${padClass}`}>
          <div className="space-y-1">
            <div
              className={`px-2 py-1 rounded font-display font-extrabold text-white text-center truncate ${bodySize}`}
              style={{ backgroundColor: teamAColor }}
            >
              {teamA}
            </div>
            <div className="space-y-0.5">
              {playersA.slice(0, 7).map((name, i) => (
                <div
                  key={`a-${i}`}
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/6 text-zinc-100 ${subSize}`}
                >
                  <span className="font-mono font-bold text-[#FACC15] tabular-nums">{i + 1}.</span>
                  <span className="truncate font-semibold">{name}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <div
              className={`px-2 py-1 rounded font-display font-extrabold text-white text-center truncate ${bodySize}`}
              style={{ backgroundColor: teamBColor }}
            >
              {teamB}
            </div>
            <div className="space-y-0.5">
              {playersB.slice(0, 7).map((name, i) => (
                <div
                  key={`b-${i}`}
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/6 text-zinc-100 ${subSize}`}
                >
                  <span className="font-mono font-bold text-[#FACC15] tabular-nums">{i + 1}.</span>
                  <span className="truncate font-semibold">{name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (panel === 'match_stats') {
    const rows = [
      { label: 'TOTAL SCORE', a: state.teamAScore, b: state.teamBScore },
      { label: 'RAID POINTS', a: state.teamARaidPoints ?? 0, b: state.teamBRaidPoints ?? 0 },
      { label: 'BONUS POINTS', a: state.teamABonusPoints ?? 0, b: state.teamBBonusPoints ?? 0 },
      { label: 'LONA / ALL OUT', a: state.teamALonaPoints ?? 0, b: state.teamBLonaPoints ?? 0 },
      { label: 'PLAYERS ON MAT', a: state.teamAPlayersOnMat ?? 7, b: state.teamBPlayersOnMat ?? 7 },
    ];
    return (
      <div className={`kabaddi-graphic-enter ${boxWidth} mx-auto rounded-xl overflow-hidden bg-[#0D131D]/94 border-2 border-[#FACC15]/80 shadow-2xl`}>
        {headerBanner('LIVE MATCH STATS')}
        <div className={`${padClass} space-y-1.5`}>
          <div className="grid grid-cols-3 items-center gap-2 pb-1 border-b border-white/15">
            <span className={`font-display font-extrabold text-white truncate text-left px-2 py-0.5 rounded ${bodySize}`} style={{ backgroundColor: teamAColor }}>
              {teamA}
            </span>
            <span className={`font-mono font-bold text-[#FACC15] text-center ${subSize}`}>
              {state.kabaddiHalf}
            </span>
            <span className={`font-display font-extrabold text-white truncate text-right px-2 py-0.5 rounded ${bodySize}`} style={{ backgroundColor: teamBColor }}>
              {teamB}
            </span>
          </div>
          {rows.map((r) => (
            <div key={r.label} className={`grid grid-cols-3 items-center bg-white/5 rounded px-2.5 py-1 ${bodySize}`}>
              <span className="font-mono font-extrabold text-white tabular-nums text-left">{r.a}</span>
              <span className={`font-mono font-semibold text-zinc-300 text-center ${subSize}`}>{r.label}</span>
              <span className="font-mono font-extrabold text-white tabular-nums text-right">{r.b}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (panel === 'player_stats') {
    return (
      <div className={`kabaddi-graphic-enter ${boxWidth} mx-auto rounded-xl overflow-hidden bg-[#0D131D]/94 border-2 border-[#FACC15]/80 shadow-2xl`}>
        {headerBanner('KEY PLAYER STATS')}
        <div className={`grid grid-cols-2 gap-3 ${padClass}`}>
          <div className="rounded-lg p-2.5 border border-white/15" style={{ backgroundColor: `${teamAColor}CC` }}>
            <p className={`font-mono text-[#FEF08A] font-bold ${subSize}`}>LEAD RAIDER · {teamA}</p>
            <p className={`font-display font-extrabold text-white truncate mt-0.5 ${headingSize}`}>
              {playersA[0]}
            </p>
            <p className={`font-mono text-white/90 mt-1 tabular-nums ${bodySize}`}>
              RAID: {state.teamARaidPoints ?? 0} · BONUS: {state.teamABonusPoints ?? 0}
            </p>
          </div>
          <div className="rounded-lg p-2.5 border border-white/15" style={{ backgroundColor: `${teamBColor}CC` }}>
            <p className={`font-mono text-[#FEF08A] font-bold ${subSize}`}>LEAD RAIDER · {teamB}</p>
            <p className={`font-display font-extrabold text-white truncate mt-0.5 ${headingSize}`}>
              {playersB[0]}
            </p>
            <p className={`font-mono text-white/90 mt-1 tabular-nums ${bodySize}`}>
              RAID: {state.teamBRaidPoints ?? 0} · BONUS: {state.teamBBonusPoints ?? 0}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (panel === 'winners') {
    const podium = [
      { rank: '1ST · CHAMPION', name: state.championTeam || teamA, accent: 'bg-[#FACC15] text-black' },
      { rank: '2ND · RUNNER UP', name: state.runnerUpTeam || teamB, accent: 'bg-zinc-200 text-black' },
      { rank: '3RD PLACE', name: state.thirdPlaceTeam || '3RD PLACE TEAM', accent: 'bg-[#D97706] text-white' },
      { rank: '4TH PLACE', name: state.fourthPlaceTeam || '4TH PLACE TEAM', accent: 'bg-[#334155] text-white' },
    ];
    return (
      <div className={`kabaddi-graphic-enter ${boxWidth} mx-auto rounded-xl overflow-hidden bg-[#0D131D]/95 border-2 border-[#FACC15] shadow-2xl`}>
        {headerBanner('TOURNAMENT WINNERS PODIUM')}
        <div className={`grid grid-cols-2 gap-2 ${padClass}`}>
          {podium.map((item) => (
            <div key={item.rank} className="rounded-lg border border-[#FACC15]/40 bg-[#151D2B] overflow-hidden">
              <div className={`px-2 py-0.5 font-mono font-extrabold ${item.accent} ${subSize}`}>
                {item.rank}
              </div>
              <div className={`px-2.5 py-1.5 font-display font-extrabold text-white truncate ${bodySize}`}>
                {item.name}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (panel === 'knockout') {
    return (
      <div className={`kabaddi-graphic-enter ${boxWidth} mx-auto rounded-xl overflow-hidden bg-[#0D131D]/95 border-2 border-[#FACC15]/80 shadow-2xl`}>
        {headerBanner(`KNOCKOUT · ${state.kabaddiEvent || 'PLAYOFFS'}`)}
        <div className={`${padClass} flex items-center justify-between gap-3`}>
          <div className="flex-1 rounded-lg px-3 py-2 text-center border border-white/15" style={{ backgroundColor: teamAColor }}>
            <p className={`font-display font-extrabold text-white truncate ${headingSize}`}>{teamA}</p>
            <p className={`font-mono font-bold text-[#FEF08A] tabular-nums ${bodySize}`}>{state.teamAScore} PTS</p>
          </div>
          <span className={`font-display font-black text-[#FACC15] ${headingSize}`}>VS</span>
          <div className="flex-1 rounded-lg px-3 py-2 text-center border border-white/15" style={{ backgroundColor: teamBColor }}>
            <p className={`font-display font-extrabold text-white truncate ${headingSize}`}>{teamB}</p>
            <p className={`font-mono font-bold text-[#FEF08A] tabular-nums ${bodySize}`}>{state.teamBScore} PTS</p>
          </div>
        </div>
      </div>
    );
  }

  // Substitutions slate
  return (
    <div className={`kabaddi-graphic-enter ${boxWidth} mx-auto rounded-xl overflow-hidden bg-[#0D131D]/95 border-2 border-[#FACC15]/80 shadow-2xl`}>
      {headerBanner('PLAYER SUBSTITUTION')}
      <div className={`${padClass} flex items-center justify-between gap-4`}>
        <div className="space-y-0.5">
          <p className={`font-mono font-bold text-[#4ADE80] ${subSize}`}>IN · ACTIVE SQUAD</p>
          <p className={`font-display font-extrabold text-white ${headingSize}`}>
            {teamA} ({state.teamAPlayersOnMat ?? 7}/7) · {teamB} ({state.teamBPlayersOnMat ?? 7}/7)
          </p>
        </div>
        <span className={`font-mono font-bold text-[#FACC15] ${subSize}`}>
          {state.kabaddiVenue || 'ARENA'}
        </span>
      </div>
    </div>
  );
}
