import { Pattern, PPQ, Track } from '../rhythm/ir';

export const DEFAULT_STRUDEL_VOICES: Record<string, string> = {
  proton: 'bd',
  neutron: 'hh',
  bond: 'cp',
  kick: 'bd',
  snare: 'sd',
  hat: 'hh',
  clap: 'cp',
  rim: 'rim',
};

export function getStrudelToken(voice: string, customMap?: Record<string, string>): string {
  if (customMap && customMap[voice]) return customMap[voice];
  if (DEFAULT_STRUDEL_VOICES[voice]) return DEFAULT_STRUDEL_VOICES[voice];
  if (voice.startsWith('electron.')) return 'sd';
  if (voice.startsWith('motif.')) return 'rim';
  return 'perc';
}

export function exportToStrudel(
  pattern: Pattern,
  voiceMap?: Record<string, string>
): string {
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

    let trackExpr = `s("${stepGrid.join(' ')}")`;

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
    return '// Empty Atomic Rhythm Pattern\ns("~")';
  }

  return `// Atomic Rhythm pattern (${pattern.bars} bar(s))\nstack(\n${lines.join(',\n')}\n)`;
}
