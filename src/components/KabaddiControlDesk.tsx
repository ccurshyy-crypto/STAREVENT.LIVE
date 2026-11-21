import { ChangeEvent } from 'react';
import {
  ArrowLeftRight,
  ImagePlus,
  Pause,
  Play,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import { Language } from '../data/content';
import { KabaddiHalf, LiveOverlayState } from '../types/overlay';
import { formatClockMMSS } from './KabaddiScoreboardBar';

interface KabaddiControlDeskProps {
  lang: Language;
  state: LiveOverlayState;
  displayMatchSeconds: number;
  displayRaidSeconds: number;
  teamABinRemaining: number;
  teamBBinRemaining: number;
  onUpdateState: (patch: Partial<LiveOverlayState>) => void;
  onScoreDelta: (team: 'A' | 'B', delta: number, alertText?: string) => void;
  onToggleMatchTimer: () => void;
  onAdjustMatchSeconds: (deltaSec: number) => void;
  onSetMatchPreset: (seconds: number, autoStart?: boolean) => void;
  onToggleRaidTimer: () => void;
  onResetRaidTimer: () => void;
  onToggleSinBin: (team: 'A' | 'B') => void;
  onUploadTeamLogo: (team: 'A' | 'B', e: ChangeEvent<HTMLInputElement>) => void;
  onRemoveTeamLogo: (team: 'A' | 'B') => void;
  onSwapTeams: () => void;
  onResetMatch: () => void;
}

const HALF_OPTIONS: KabaddiHalf[] = ['1ST HALF', '2ND HALF', 'HALF TIME', 'FULL TIME'];

interface TeamColumnProps {
  side: 'A' | 'B';
  lang: Language;
  name: string;
  code: string;
  color: string;
  score: number;
  logoUrl: string;
  yellowCards: number;
  redCards: number;
  binRemaining: number;
  onChangeName: (v: string) => void;
  onChangeCode: (v: string) => void;
  onChangeColor: (v: string) => void;
  onScore: (delta: number, alert?: string) => void;
  onAddYellow: () => void;
  onResetYellow: () => void;
  onAddRed: () => void;
  onResetRed: () => void;
  onToggleBin: () => void;
  onUploadLogo: (e: ChangeEvent<HTMLInputElement>) => void;
  onRemoveLogo: () => void;
}

function TeamControlCard({
  side,
  lang,
  name,
  code,
  color,
  score,
  logoUrl,
  yellowCards,
  redCards,
  binRemaining,
  onChangeName,
  onChangeCode,
  onChangeColor,
  onScore,
  onAddYellow,
  onResetYellow,
  onAddRed,
  onResetRed,
  onToggleBin,
  onUploadLogo,
  onRemoveLogo,
}: TeamColumnProps) {
  const displayTeam = name || (side === 'A' ? 'TEAM A' : 'TEAM B');
  const binActive = binRemaining > 0;

  return (
    <div className="bg-[#0F1319] border border-[#232B36] rounded-2xl overflow-hidden flex flex-col">
      {/* Top Colored Team Accent Bar (matches reference UI) */}
      <div className="h-1.5 w-full" style={{ backgroundColor: color }} aria-hidden="true" />

      <div className="p-3 sm:p-3.5 space-y-2.5 flex-1 flex flex-col justify-between">
        <div className="space-y-2.5">
          {/* Row 1: Full Team Name Input */}
          <input
            type="text"
            aria-label={side === 'A' ? 'Left team name' : 'Right team name'}
            value={name}
            onChange={(e) => onChangeName(e.target.value)}
            placeholder={side === 'A' ? 'Left Team Name' : 'Right Team Name'}
            className="w-full px-3 py-2.5 text-sm font-medium bg-[#161C24] border border-[#2A3340] rounded-xl text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-[#FACC15] transition-colors"
          />

          {/* Row 2: Short Code Input + Team Color Swatch Picker */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              aria-label={side === 'A' ? 'Left team short code' : 'Right team short code'}
              value={code}
              maxLength={5}
              onChange={(e) => onChangeCode(e.target.value.toUpperCase())}
              placeholder={side === 'A' ? 'NER' : 'KAR'}
              className="flex-1 min-w-0 px-3 py-2 text-center text-sm font-bold uppercase tracking-wider bg-[#161C24] border border-[#2A3340] rounded-xl text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-[#FACC15] transition-colors"
            />
            <label
              title={lang === 'mr' ? 'टीम रंग निवडा' : 'Pick team color'}
              className="w-12 h-10 bg-[#161C24] border border-[#2A3340] hover:border-white/35 rounded-xl p-1.5 flex items-center justify-center cursor-pointer shrink-0 transition-colors"
            >
              <span
                className="w-full h-full rounded-md border border-white/20 block"
                style={{ backgroundColor: color }}
              />
              <input
                type="color"
                aria-label={side === 'A' ? 'Left team color' : 'Right team color'}
                value={color}
                onChange={(e) => onChangeColor(e.target.value)}
                className="sr-only"
              />
            </label>
          </div>

          {/* Row 3: Huge Centered Live Score */}
          <div className="py-1.5 text-center select-none">
            <span className="font-display font-black text-5xl text-white tabular-nums tracking-tight leading-none">
              {score}
            </span>
          </div>

          {/* Row 4: Primary -1 & Emerald +1 Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onScore(-1)}
              className="py-3 bg-[#1B222C] hover:bg-[#242D3A] active:scale-[0.98] border border-[#2A3340] text-zinc-100 rounded-xl text-lg font-extrabold transition"
            >
              −1
            </button>
            <button
              type="button"
              onClick={() => onScore(1)}
              className="py-3 bg-[#3B9E6D] hover:bg-[#338C60] active:scale-[0.98] text-white rounded-xl text-lg font-extrabold transition shadow-sm"
            >
              +1
            </button>
          </div>

          {/* Row 5 & 6: 2x2 Kabaddi Quick-Point Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onScore(1, `${displayTeam} · BONUS +1`)}
              className="py-2.5 px-1.5 bg-[#1B222C] hover:bg-[#242D3A] active:scale-[0.98] border border-[#2A3340] rounded-xl text-center transition"
            >
              <span className="block text-xs sm:text-sm font-bold text-white leading-tight">
                Bonus
              </span>
              <span className="block text-[11px] font-mono text-zinc-400 mt-0.5">+1</span>
            </button>

            <button
              type="button"
              onClick={() => onScore(2, `ALL OUT! +2 ${displayTeam}`)}
              className="py-2.5 px-1.5 bg-[#1B222C] hover:bg-[#242D3A] active:scale-[0.98] border border-[#2A3340] rounded-xl text-center transition"
            >
              <span className="block text-xs sm:text-sm font-bold text-white leading-tight">
                All Out
              </span>
              <span className="block text-[11px] font-mono text-zinc-400 mt-0.5">+2</span>
            </button>

            <button
              type="button"
              onClick={() => onScore(2, `SUPER TACKLE! +2 ${displayTeam}`)}
              className="py-2.5 px-1.5 bg-[#1B222C] hover:bg-[#242D3A] active:scale-[0.98] border border-[#2A3340] rounded-xl text-center transition"
            >
              <span className="block text-xs sm:text-sm font-bold text-white leading-tight">
                S. Tackle
              </span>
              <span className="block text-[11px] font-mono text-zinc-400 mt-0.5">+2</span>
            </button>

            <button
              type="button"
              onClick={() => onScore(3, `SUPER RAID! +3 ${displayTeam}`)}
              className="py-2.5 px-1.5 bg-[#1B222C] hover:bg-[#242D3A] active:scale-[0.98] border border-[#2A3340] rounded-xl text-center transition"
            >
              <span className="block text-xs sm:text-sm font-bold text-white leading-tight">
                S. Raid
              </span>
              <span className="block text-[11px] font-mono text-zinc-400 mt-0.5">+3</span>
            </button>
          </div>

          {/* Row 7: Yellow & Red Cards with Curved Left Accent Bars */}
          <div className="grid grid-cols-2 gap-2">
            <div className="relative flex items-center bg-[#1B222C] border border-[#2A3340] rounded-xl overflow-hidden">
              <span
                aria-hidden="true"
                className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#FACC15]"
              />
              <button
                type="button"
                onClick={onAddYellow}
                className="flex-1 py-2.5 pl-3 pr-1.5 hover:bg-[#242D3A] text-xs font-semibold text-zinc-100 tabular-nums transition text-center"
              >
                Yellow <span className="font-bold text-white">{yellowCards}</span>
              </button>
              {yellowCards > 0 && (
                <button
                  type="button"
                  onClick={onResetYellow}
                  aria-label="Reset yellow cards"
                  className="px-1.5 py-2.5 text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-3 h-3" aria-hidden="true" />
                </button>
              )}
            </div>

            <div className="relative flex items-center bg-[#1B222C] border border-[#2A3340] rounded-xl overflow-hidden">
              <span
                aria-hidden="true"
                className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#EF4444]"
              />
              <button
                type="button"
                onClick={onAddRed}
                className="flex-1 py-2.5 pl-3 pr-1.5 hover:bg-[#242D3A] text-xs font-semibold text-zinc-100 tabular-nums transition text-center"
              >
                Red <span className="font-bold text-white">{redCards}</span>
              </button>
              {redCards > 0 && (
                <button
                  type="button"
                  onClick={onResetRed}
                  aria-label="Reset red cards"
                  className="px-1.5 py-2.5 text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-3 h-3" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          {/* Row 8: Full-Width Sin Bin / 2:00 Kabaddi Suspension Timer */}
          <button
            type="button"
            onClick={onToggleBin}
            className={`w-full py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-semibold tabular-nums transition ${
              binActive
                ? 'bg-[#2C210B] border-[#FACC15]/75 text-[#FDE047]'
                : 'bg-[#1B222C] hover:bg-[#242D3A] border-[#2A3340] text-zinc-100'
            }`}
          >
            {binActive
              ? `Sin bin ${formatClockMMSS(binRemaining)} (Reset)`
              : 'Sin bin 02:00'}
          </button>
        </div>

        {/* Row 9: Side Logo Upload / Manage Button (Left or Right Team Logo) */}
        <div className="pt-1 flex items-center gap-2">
          <label className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#1B222C] hover:bg-[#242D3A] border border-[#2A3340] hover:border-[#FACC15]/60 rounded-xl text-xs sm:text-sm font-semibold text-zinc-100 cursor-pointer transition-colors whitespace-nowrap">
            <ImagePlus className="w-3.5 h-3.5 text-[#FACC15] shrink-0" aria-hidden="true" />
            <span>
              {logoUrl
                ? lang === 'mr'
                  ? 'लोगो बदला'
                  : 'Change Logo'
                : side === 'A'
                  ? lang === 'mr'
                    ? 'डावा लोगो'
                    : 'Left Logo'
                  : lang === 'mr'
                    ? 'उजवा लोगो'
                    : 'Right Logo'}
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={onUploadLogo}
              className="sr-only"
            />
          </label>

          {logoUrl && (
            <div className="flex items-center gap-1.5 ml-auto">
              <div className="w-8 h-8 rounded-full bg-white p-0.5 border border-[#FACC15] overflow-hidden shrink-0">
                <img
                  src={logoUrl}
                  alt={`${displayTeam} uploaded logo`}
                  className="w-full h-full object-contain rounded-full"
                />
              </div>
              <button
                type="button"
                onClick={onRemoveLogo}
                aria-label={side === 'A' ? 'Remove left logo' : 'Remove right logo'}
                className="p-1.5 rounded-lg bg-[#241417] hover:bg-[#361B20] border border-[#EF4444]/40 text-[#FCA5A5] transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function KabaddiControlDesk({
  lang,
  state,
  displayMatchSeconds,
  displayRaidSeconds,
  teamABinRemaining,
  teamBBinRemaining,
  onUpdateState,
  onScoreDelta,
  onToggleMatchTimer,
  onAdjustMatchSeconds,
  onSetMatchPreset,
  onToggleRaidTimer,
  onResetRaidTimer,
  onToggleSinBin,
  onUploadTeamLogo,
  onRemoveTeamLogo,
  onSwapTeams,
  onResetMatch,
}: KabaddiControlDeskProps) {
  return (
    <div className="space-y-3.5 pt-4 border-t border-white/10">
      {/* Header Row: Desk Title + Swap + Reset */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-zinc-200">
          {lang === 'mr'
            ? 'कबड्डी प्रो स्कोअरबोर्ड कंट्रोल (दोन्ही बाजू लोगो)'
            : 'Kabaddi Pro Control Desk (Dual Logos)'}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSwapTeams}
            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-[#161C24] hover:bg-[#222B37] border border-[#2A3340] rounded-lg text-zinc-300 hover:text-white transition-colors"
          >
            <ArrowLeftRight className="w-3 h-3" aria-hidden="true" />
            <span>{lang === 'mr' ? 'बाजू बदला' : 'Swap'}</span>
          </button>
          <button
            type="button"
            onClick={onResetMatch}
            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-[#161C24] hover:bg-[#222B37] border border-[#2A3340] rounded-lg text-zinc-300 hover:text-white transition-colors"
          >
            <RotateCcw className="w-3 h-3" aria-hidden="true" />
            <span>{lang === 'mr' ? 'रीसेट' : 'Reset'}</span>
          </button>
        </div>
      </div>

      {/* Match Clock, Half & 30s Raid Compact Broadcast Strip */}
      <div className="bg-[#0F1319] border border-[#232B36] rounded-2xl p-3 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono font-black text-xl text-white tabular-nums">
              {formatClockMMSS(displayMatchSeconds)}
            </span>
            <button
              type="button"
              onClick={onToggleMatchTimer}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition-colors ${
                state.matchRunning
                  ? 'bg-[#DC2626] hover:bg-[#B91C1C] text-white'
                  : 'bg-[#3B9E6D] hover:bg-[#338C60] text-white'
              }`}
            >
              {state.matchRunning ? (
                <Pause className="w-3 h-3" aria-hidden="true" />
              ) : (
                <Play className="w-3 h-3" aria-hidden="true" />
              )}
              <span>{state.matchRunning ? 'Pause' : 'Start'}</span>
            </button>
          </div>

          <div className="flex items-center gap-1 flex-wrap">
            <button
              type="button"
              onClick={() => onAdjustMatchSeconds(-5)}
              className="px-2 py-1 text-[11px] font-mono font-semibold bg-[#1B222C] hover:bg-[#242D3A] border border-[#2A3340] rounded-lg text-zinc-200"
            >
              −5s
            </button>
            <button
              type="button"
              onClick={() => onAdjustMatchSeconds(5)}
              className="px-2 py-1 text-[11px] font-mono font-semibold bg-[#1B222C] hover:bg-[#242D3A] border border-[#2A3340] rounded-lg text-zinc-200"
            >
              +5s
            </button>
            <button
              type="button"
              onClick={() => onSetMatchPreset(30, true)}
              className="px-2.5 py-1 text-[11px] font-mono font-bold bg-[#1F2A22] hover:bg-[#28382C] border border-[#3B9E6D]/70 rounded-lg text-[#86EFAC]"
            >
              30s Start
            </button>
            <button
              type="button"
              onClick={() => onSetMatchPreset(20 * 60, true)}
              className="px-2 py-1 text-[11px] font-mono font-semibold bg-[#1B222C] hover:bg-[#242D3A] border border-[#2A3340] rounded-lg text-zinc-300"
            >
              20:00
            </button>
          </div>
        </div>

        {/* Half Selector + DO-OR-DIE + 30s Raid Clock */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 pt-2 border-t border-white/8">
          <div className="flex items-center gap-1 flex-wrap">
            {HALF_OPTIONS.map((half) => (
              <button
                key={half}
                type="button"
                onClick={() => onUpdateState({ kabaddiHalf: half })}
                className={`px-2 py-1 text-[10px] font-mono font-bold rounded-md border transition-colors ${
                  state.kabaddiHalf === half
                    ? 'bg-[#FACC15] text-black border-[#FACC15]'
                    : 'bg-[#161C24] text-zinc-400 border-[#2A3340] hover:text-white'
                }`}
              >
                {half}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onUpdateState({ doOrDie: !state.doOrDie })}
              aria-pressed={state.doOrDie}
              className={`px-2 py-1 text-[10px] font-mono font-bold rounded-md border transition-colors ${
                state.doOrDie
                  ? 'bg-[#DC2626] border-[#FACC15] text-white'
                  : 'bg-[#161C24] border-[#2A3340] text-zinc-300 hover:text-white'
              }`}
            >
              DO-OR-DIE
            </button>

            <button
              type="button"
              onClick={onToggleRaidTimer}
              className={`px-2 py-1 text-[10px] font-mono font-bold rounded-md border tabular-nums transition-colors ${
                state.raidRunning
                  ? 'bg-[#FACC15] text-black border-[#FACC15]'
                  : 'bg-[#1B222C] text-zinc-200 border-[#2A3340] hover:border-[#FACC15]/60'
              }`}
            >
              {state.raidRunning ? `RAID ${String(displayRaidSeconds).padStart(2, '0')}s` : '30s Raid'}
            </button>

            {(state.raidRunning || displayRaidSeconds < 30) && (
              <button
                type="button"
                onClick={onResetRaidTimer}
                aria-label="Reset 30s raid clock"
                className="p-1 text-zinc-400 hover:text-white bg-[#161C24] border border-[#2A3340] rounded-md"
              >
                <RotateCcw className="w-3 h-3" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Side-by-Side Team Control Cards (Faithful to Reference Control UI) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <TeamControlCard
          side="A"
          lang={lang}
          name={state.teamAName}
          code={state.teamACode}
          color={state.teamAColor}
          score={state.teamAScore}
          logoUrl={state.teamALogoUrl}
          yellowCards={state.teamAYellowCards}
          redCards={state.teamARedCards}
          binRemaining={teamABinRemaining}
          onChangeName={(v) => onUpdateState({ teamAName: v })}
          onChangeCode={(v) => onUpdateState({ teamACode: v })}
          onChangeColor={(v) => onUpdateState({ teamAColor: v })}
          onScore={(delta, alert) => onScoreDelta('A', delta, alert)}
          onAddYellow={() => onUpdateState({ teamAYellowCards: state.teamAYellowCards + 1 })}
          onResetYellow={() => onUpdateState({ teamAYellowCards: 0 })}
          onAddRed={() => onUpdateState({ teamARedCards: state.teamARedCards + 1 })}
          onResetRed={() => onUpdateState({ teamARedCards: 0 })}
          onToggleBin={() => onToggleSinBin('A')}
          onUploadLogo={(e) => onUploadTeamLogo('A', e)}
          onRemoveLogo={() => onRemoveTeamLogo('A')}
        />

        <TeamControlCard
          side="B"
          lang={lang}
          name={state.teamBName}
          code={state.teamBCode}
          color={state.teamBColor}
          score={state.teamBScore}
          logoUrl={state.teamBLogoUrl}
          yellowCards={state.teamBYellowCards}
          redCards={state.teamBRedCards}
          binRemaining={teamBBinRemaining}
          onChangeName={(v) => onUpdateState({ teamBName: v })}
          onChangeCode={(v) => onUpdateState({ teamBCode: v })}
          onChangeColor={(v) => onUpdateState({ teamBColor: v })}
          onScore={(delta, alert) => onScoreDelta('B', delta, alert)}
          onAddYellow={() => onUpdateState({ teamBYellowCards: state.teamBYellowCards + 1 })}
          onResetYellow={() => onUpdateState({ teamBYellowCards: 0 })}
          onAddRed={() => onUpdateState({ teamBRedCards: state.teamBRedCards + 1 })}
          onResetRed={() => onUpdateState({ teamBRedCards: 0 })}
          onToggleBin={() => onToggleSinBin('B')}
          onUploadLogo={(e) => onUploadTeamLogo('B', e)}
          onRemoveLogo={() => onRemoveTeamLogo('B')}
        />
      </div>

      {/* Optional Tournament Ticker Line Input */}
      <div className="space-y-1">
        <label htmlFor="kabaddi-ticker-input" className="block text-[11px] text-zinc-400">
          {lang === 'mr'
            ? 'खालची टायटल पट्टी (ऐच्छिक — रिकामे ठेवल्यास लपते)'
            : 'Bottom Match Ticker (Optional — leave empty to hide)'}
        </label>
        <input
          id="kabaddi-ticker-input"
          type="text"
          value={state.kabaddiSubtitle}
          onChange={(e) => onUpdateState({ kabaddiSubtitle: e.target.value })}
          placeholder={lang === 'mr' ? 'स्पर्धेचे नाव किंवा ठिकाण...' : 'Tournament name or venue...'}
          className="w-full px-3 py-2 text-xs bg-[#161C24] border border-[#2A3340] rounded-xl text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-[#FACC15]"
        />
      </div>
    </div>
  );
}
