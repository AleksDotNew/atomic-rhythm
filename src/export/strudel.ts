import { generateEuclidean } from '../rhythm/euclid';
import { Pattern, PPQ, Track } from '../rhythm/ir';

export const DEFAULT_STRUDEL_VOICES: Record<string, string> = {
  proton: 'bd',
  neutron: 'hh',
  bond: 'cp',
  kick: 'bd',
  snare: 'sd',
  hat: 'hh',
  openhat: 'oh',
  crash: 'cr',
  clap: 'cp',
  rim: 'rim',
};

export interface StrudelExportOptions {
  readonly voiceMap?: Record<string, string>;
  readonly samplesDeclaration?: string;
  readonly compact?: boolean;
}

export function getStrudelToken(voice: string, customMap?: Record<string, string>): string {
  if (customMap && customMap[voice]) return customMap[voice];
  if (DEFAULT_STRUDEL_VOICES[voice]) return DEFAULT_STRUDEL_VOICES[voice];
  if (voice.startsWith('electron.')) return 'sd';
  if (voice.startsWith('motif.')) return 'rim';
  return 'perc';
}

function runLengthCompress(steps: string[]): string {
  const parts: string[] = [];
  let i = 0;
  while (i < steps.length) {
    const cur = steps[i];
    let count = 1;
    while (i + count < steps.length && steps[i + count] === cur) {
      count++;
    }
    if (count > 1) {
      parts.push(`${cur}!${count}`);
    } else {
      parts.push(cur);
    }
    i += count;
  }
  return parts.join(' ');
}

function compactMiniNotation(stepGrid: string[], token: string): string {
  const n = stepGrid.length;
  if (n === 0) return '~';

  const nonTilde = stepGrid.filter(s => s !== '~');
  if (nonTilde.length === 0) return `~!${n}`;

  // Check if all non-tilde steps match `token`
  const isPureSingleVoice = nonTilde.every(s => s === token);
  const k = nonTilde.length;

  if (isPureSingleVoice && k > 1 && k < n) {
    const euclid = generateEuclidean(k, n, 0);
    const matchesEuclid = euclid.pattern.every((hit, idx) => hit === (stepGrid[idx] === token));
    if (matchesEuclid) {
      return `${token}(${k},${n})`;
    }
  }

  return runLengthCompress(stepGrid);
}

export function exportToStrudel(
  pattern: Pattern,
  options?: Record<string, string> | StrudelExportOptions
): string {
  let voiceMap: Record<string, string> | undefined;
  let samplesDeclaration: string | undefined;
  let compact = true;

  if (options) {
    if ('samplesDeclaration' in options || 'compact' in options || 'voiceMap' in options) {
      const opts = options as StrudelExportOptions;
      voiceMap = opts.voiceMap;
      samplesDeclaration = opts.samplesDeclaration;
      if (opts.compact !== undefined) compact = opts.compact;
    } else {
      voiceMap = options as Record<string, string>;
    }
  }

  const barTicks = 16 * (PPQ / 4); // 384
  const lines: string[] = [];

  for (const track of pattern.tracks) {
    if (track.events.length === 0) continue;
    const token = getStrudelToken(track.voice, voiceMap);

    // Group events into 16th-note steps of the cycle
    const stepTicks = PPQ / 4; // 24 ticks
    const stepCount = Math.max(1, Math.round(track.cycleTicks / stepTicks));
    const stepGrid: string[] = new Array(stepCount).fill('~');

    for (const evt of track.events) {
      const stepIdx = Math.min(stepCount - 1, Math.round(evt.tick / stepTicks));
      stepGrid[stepIdx] = token;
    }

    const miniNotation = compact ? compactMiniNotation(stepGrid, token) : stepGrid.join(' ');
    let trackExpr = `s("${miniNotation}")`;

    // Polymetric ratio if cycle length differs from 1 bar (384 ticks)
    if (track.cycleTicks !== barTicks) {
      const ratio = +(track.cycleTicks / barTicks).toFixed(3);
      trackExpr += `.slow(${ratio})`;
    }

    // Attach stereo panning if events have pan values (converted to Strudel 0..1 range)
    const eventsWithPan = track.events.filter(e => e.pan !== undefined);
    if (eventsWithPan.length > 0) {
      const distinctPans = Array.from(new Set(eventsWithPan.map(e => e.pan!)));
      if (distinctPans.length === 1) {
        const strudelPan = +((distinctPans[0] + 1) / 2).toFixed(2);
        trackExpr += `.pan(${strudelPan})`;
      } else {
        const panSteps = eventsWithPan.map(e => +((e.pan! + 1) / 2).toFixed(2));
        trackExpr += `.pan("<${panSteps.join(' ')}>")`;
      }
    }

    lines.push(`  ${trackExpr}`);
  }

  if (lines.length === 0) {
    const emptyPattern = '// Empty Atomic Rhythm Pattern\ns("~")';
    if (samplesDeclaration && samplesDeclaration.trim().length > 0) {
      return `${samplesDeclaration.trim()}\n\n${emptyPattern}`;
    }
    return emptyPattern;
  }

  const stackCode = `// Atomic Rhythm pattern (${pattern.bars} bar(s))\nstack(\n${lines.join(',\n')}\n)`;
  if (samplesDeclaration && samplesDeclaration.trim().length > 0) {
    return `${samplesDeclaration.trim()}\n\n${stackCode}`;
  }
  return stackCode;
}
