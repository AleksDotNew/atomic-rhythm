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
  readonly bpm?: number;
}

export function getStrudelToken(voice: string, customMap?: Record<string, string>): string {
  if (customMap && customMap[voice]) return customMap[voice];
  if (DEFAULT_STRUDEL_VOICES[voice]) return DEFAULT_STRUDEL_VOICES[voice];
  if (voice.startsWith('electron.')) return 'sd';
  if (voice.startsWith('motif.')) return 'rim';
  return 'perc';
}

function runLengthCompress(steps: string[]): string[] {
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
  return parts;
}

function compressSubpatterns(parts: string[]): string[] {
  const result: string[] = [];
  let i = 0;
  while (i < parts.length) {
    let bestL = -1;
    let bestCount = 0;

    // Check pattern lengths L from 2 up to half the remaining tokens
    const maxL = Math.floor((parts.length - i) / 2);
    for (let L = 2; L <= maxL; L++) {
      let count = 1;
      while (i + (count + 1) * L <= parts.length) {
        let match = true;
        for (let j = 0; j < L; j++) {
          if (parts[i + count * L + j] !== parts[i + j]) {
            match = false;
            break;
          }
        }
        if (!match) break;
        count++;
      }
      if (count >= 2) {
        // Prefer the match that consumes the most tokens (L * count)
        if (L * count > bestL * bestCount) {
          bestL = L;
          bestCount = count;
        }
      }
    }

    if (bestL > 0 && bestCount >= 2) {
      const sub = parts.slice(i, i + bestL).join(' ');
      result.push(`[${sub}]*${bestCount}`);
      i += bestL * bestCount;
    } else {
      result.push(parts[i]);
      i++;
    }
  }
  return result;
}

function compressCycleElements(elements: string[]): string {
  const parts: string[] = [];
  let i = 0;
  while (i < elements.length) {
    const cur = elements[i];
    let count = 1;
    while (i + count < elements.length && elements[i + count] === cur) {
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

function formatTrackPan(
  track: Track,
  numBars: number,
  barTicks: number,
  isFoldedToOneBar: boolean
): string | null {
  const eventsWithPan = track.events.filter(e => e.pan !== undefined);
  if (eventsWithPan.length === 0) return null;

  const toStrudelPan = (p: number) => +((p + 1) / 2).toFixed(2);

  // If all events are virtually centered (within 0.06 of 0.0 in -1..1, i.e. 0.47..0.53 in Strudel),
  // omit .pan() since 0.5 is already the default center pan in Strudel/audio
  const allCentered = eventsWithPan.every(e => Math.abs(e.pan!) <= 0.06);
  if (allCentered) return null;

  const pans = eventsWithPan.map(e => e.pan!);
  const minPan = Math.min(...pans);
  const maxPan = Math.max(...pans);

  // If track has uniform panning across all events or folded to 1 bar
  if (maxPan - minPan <= 0.04 || isFoldedToOneBar) {
    const avgPan = toStrudelPan(pans.reduce((a, b) => a + b, 0) / pans.length);
    if (Math.abs(avgPan - 0.5) <= 0.04) return null;
    return `.pan(${avgPan})`;
  }

  // Multi-bar track: calculate exactly 1 pan per bar (matching Strudel cycle step)
  if (numBars > 1 && track.cycleTicks % barTicks === 0) {
    const barPans: string[] = [];
    let lastKnownPan = toStrudelPan(pans[0]);

    for (let b = 0; b < numBars; b++) {
      const barStart = b * barTicks;
      const barEnd = (b + 1) * barTicks;
      const barEvents = track.events.filter(
        e => e.tick >= barStart && e.tick < barEnd && e.pan !== undefined
      );

      if (barEvents.length > 0) {
        const avg = barEvents.reduce((sum, e) => sum + e.pan!, 0) / barEvents.length;
        lastKnownPan = toStrudelPan(avg);
        barPans.push(lastKnownPan.toString());
      } else {
        barPans.push(lastKnownPan.toString());
      }
    }

    const compressed = compressCycleElements(barPans);
    if (!compressed.includes(' ')) {
      const single = compressed.split('!')[0];
      if (Math.abs(+single - 0.5) <= 0.04) return null;
      return `.pan(${single})`;
    }
    return `.pan("<${compressed}>")`;
  }

  // Polymetric track fallback
  const distinctPans = Array.from(new Set(pans.map(toStrudelPan)));
  if (distinctPans.length === 1) {
    if (Math.abs(distinctPans[0] - 0.5) <= 0.04) return null;
    return `.pan(${distinctPans[0]})`;
  }
  const panStrings = pans.map(p => toStrudelPan(p).toString());
  return `.pan("<${compressCycleElements(panStrings)}>")`;
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

  const rleParts = runLengthCompress(stepGrid);
  const subpatternParts = compressSubpatterns(rleParts);
  return subpatternParts.join(' ');
}

export function exportToStrudel(
  pattern: Pattern,
  options?: Record<string, string> | StrudelExportOptions
): string {
  let voiceMap: Record<string, string> | undefined;
  let samplesDeclaration: string | undefined;
  let compact = true;
  let bpm: number | undefined;

  if (options) {
    if ('samplesDeclaration' in options || 'compact' in options || 'voiceMap' in options || 'bpm' in options) {
      const opts = options as StrudelExportOptions;
      voiceMap = opts.voiceMap;
      samplesDeclaration = opts.samplesDeclaration;
      bpm = opts.bpm;
      if (opts.compact !== undefined) compact = opts.compact;
    } else {
      voiceMap = options as Record<string, string>;
    }
  }

  const stepTicks = PPQ / 4; // 24 ticks
  const barTicks = pattern.barTicks ? pattern.barTicks[0] : 16 * stepTicks; // default 384
  const lines: string[] = [];

  for (const track of pattern.tracks) {
    if (track.events.length === 0) continue;
    const token = getStrudelToken(track.voice, voiceMap);

    // Group events into 16th-note steps of the cycle
    const stepCount = Math.max(1, Math.round(track.cycleTicks / stepTicks));
    const stepGrid: string[] = new Array(stepCount).fill('~');

    for (const evt of track.events) {
      const stepIdx = Math.min(stepCount - 1, Math.round(evt.tick / stepTicks));
      stepGrid[stepIdx] = token;
    }

    const numBars = pattern.barTicks ? pattern.barTicks.length : Math.round(track.cycleTicks / barTicks);
    let trackExpr: string;
    let isFoldedToOneBar = false;

    // Multi-bar pattern analysis (e.g. 6-bar benzene, 5-bar cyclopentane)
    if (compact && numBars > 1) {
      const barChunks: string[][] = [];
      if (pattern.barTicks && pattern.barTicks.length > 1) {
        let curStep = 0;
        for (let b = 0; b < pattern.barTicks.length; b++) {
          const bSteps = Math.round(pattern.barTicks[b] / stepTicks);
          barChunks.push(stepGrid.slice(curStep, curStep + bSteps));
          curStep += bSteps;
        }
      } else {
        const stepsPerBar = pattern.barTicks ? Math.round(pattern.barTicks[0] / stepTicks) : 16;
        for (let b = 0; b < numBars; b++) {
          barChunks.push(stepGrid.slice(b * stepsPerBar, (b + 1) * stepsPerBar));
        }
      }

      const firstBar = barChunks[0];
      const allBarsIdentical = barChunks.every(bar =>
        bar.every((step, idx) => step === firstBar[idx])
      );

      if (allBarsIdentical) {
        // Every bar has the identical rhythm; fold into 1 standard cycle without .slow()
        isFoldedToOneBar = true;
        const miniNotation = compactMiniNotation(firstBar, token);
        trackExpr = `s("${miniNotation}")`;
      } else {
        // Bars differ: use idiomatic Strudel cycle progression <bar0 bar1 ...>
        const barStrings = barChunks.map(bar => {
          const nonTildes = bar.filter(s => s !== '~');
          if (nonTildes.length === 0) return '~';
          // Single hit on downbeat can be represented cleanly as just the token
          if (nonTildes.length === 1 && bar[0] === token) return token;
          const compacted = compactMiniNotation(bar, token);
          if (compacted.includes(' ')) {
            return `[${compacted}]`;
          }
          return compacted;
        });

        const compressedCycle = compressCycleElements(barStrings);
        trackExpr = `s("<${compressedCycle}>")`;
      }
    } else {
      const miniNotation = compact ? compactMiniNotation(stepGrid, token) : stepGrid.join(' ');
      trackExpr = `s("${miniNotation}")`;

      // Polymetric ratio if cycle length differs from 1 bar
      if (track.cycleTicks !== barTicks) {
        const ratio = +(track.cycleTicks / barTicks).toFixed(3);
        trackExpr += `.slow(${ratio})`;
      }
    }

    // Attach stereo panning if events have pan values (converted to Strudel 0..1 range)
    const panModifier = formatTrackPan(track, numBars, barTicks, isFoldedToOneBar);
    if (panModifier) {
      trackExpr += panModifier;
    }

    lines.push(`  ${trackExpr}`);
  }

  let prefix = '';
  if (bpm) {
    prefix += `setcps(${(bpm / 60 / 4).toFixed(3)})\n\n`;
  }
  if (samplesDeclaration && samplesDeclaration.trim().length > 0) {
    prefix += `${samplesDeclaration.trim()}\n\n`;
  }

  if (lines.length === 0) {
    const emptyPattern = '// Empty Atomic Rhythm Pattern\ns("~")';
    return prefix ? `${prefix}${emptyPattern}` : emptyPattern;
  }

  const stackCode = `// Atomic Rhythm pattern (${pattern.bars} bar(s))\nstack(\n${lines.join(',\n')}\n)`;
  return prefix ? `${prefix}${stackCode}` : stackCode;
}
