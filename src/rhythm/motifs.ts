import { MolecularAnalysis } from '../chem/analysis';
import { generateEuclidean } from './euclid';
import { PPQ, RhythmEvent, Track } from './ir';

export type MotifMode = 'loop' | 'span' | 'once';

export interface RingActiveSpan {
  readonly startTick: number;
  readonly endTick: number;
}

export interface MotifOptions {
  readonly mode?: MotifMode;
  readonly totalTicks?: number;
  readonly totalBars?: number;
  readonly ringActiveSpans?: Map<number, RingActiveSpan>;
  readonly groupActiveTicks?: readonly (readonly number[])[] | readonly number[];
  readonly barStartTicks?: readonly number[];
}

export function buildMotifTracks(
  analysis: MolecularAnalysis,
  optionsOrBars?: MotifOptions | number,
  legacyTotalBars?: number
): Track[] {
  let options: MotifOptions;
  if (typeof optionsOrBars === 'number') {
    options = { totalBars: optionsOrBars };
  } else if (optionsOrBars && typeof optionsOrBars === 'object') {
    options = optionsOrBars;
  } else {
    options = {};
  }

  const mode: MotifMode = options.mode ?? 'loop';
  const totalBars = options.totalBars ?? (typeof legacyTotalBars === 'number' ? legacyTotalBars : 1);
  const totalTicks = options.totalTicks ?? (totalBars > 1 ? totalBars * (16 * (PPQ / 4)) : undefined);

  const tracks: Track[] = [];

  // 1. Ring Motifs
  for (let ringIdx = 0; ringIdx < analysis.rings.length; ringIdx++) {
    const ring = analysis.rings[ringIdx];
    const r = ring.size;
    const voiceName = `motif.ring${r}`;
    const pulseDurationTicks = PPQ / 2; // eighth note = 48 ticks
    const cycleTicks = r * pulseDurationTicks;
    const baseEvents: RhythmEvent[] = [];

    if (r === 6 && ring.isAromatic) {
      // 6/8 polymetric track with accents on eighths 1 and 4
      for (let s = 0; s < 6; s++) {
        const isAccent = s === 0 || s === 3;
        baseEvents.push({
          tick: s * pulseDurationTicks,
          velocity: isAccent ? 1.0 : 0.6,
          durationTicks: 24,
          articulation: 'normal',
          atomIndex: ring.atomIndices[s % ring.atomIndices.length],
        });
      }
    } else {
      // Non-aromatic or other ring sizes: Euclidean E(ceil(r/2), r)
      const hits = Math.ceil(r / 2);
      const euclid = generateEuclidean(hits, r);
      for (let s = 0; s < r; s++) {
        if (euclid.pattern[s]) {
          baseEvents.push({
            tick: s * pulseDurationTicks,
            velocity: 0.75,
            durationTicks: 24,
            articulation: 'normal',
            atomIndex: ring.atomIndices[s % ring.atomIndices.length],
          });
        }
      }
    }

    const events: RhythmEvent[] = [];
    if (mode === 'once' || totalTicks === undefined) {
      events.push(...baseEvents);
    } else if (mode === 'loop') {
      let offset = 0;
      while (offset < totalTicks) {
        for (const bEvt of baseEvents) {
          const t = offset + bEvt.tick;
          if (t < totalTicks) {
            events.push({
              ...bEvt,
              tick: t,
            });
          }
        }
        offset += cycleTicks;
      }
    } else if (mode === 'span') {
      const span = options.ringActiveSpans?.get(ringIdx);
      if (span) {
        let offset = span.startTick;
        while (offset < span.endTick) {
          for (const bEvt of baseEvents) {
            const t = offset + bEvt.tick;
            if (t < span.endTick && (totalTicks === undefined || t < totalTicks)) {
              events.push({
                ...bEvt,
                tick: t,
              });
            }
          }
          offset += cycleTicks;
        }
      } else {
        events.push(...baseEvents);
      }
    }

    tracks.push({
      voice: voiceName,
      cycleTicks: totalTicks ?? cycleTicks,
      events,
    });
  }

  // 2. Functional Group Motifs
  if (analysis.functionalGroups.length > 0) {
    const sixteenth = PPQ / 4; // 24 ticks
    const groupCycleTicks = 16 * sixteenth; // 1 bar (384 ticks)
    const events: RhythmEvent[] = [];

    const getFgBaseEvents = (fg: typeof analysis.functionalGroups[0]): RhythmEvent[] => {
      const fgEvents: RhythmEvent[] = [];
      switch (fg.type) {
        case 'OH':
          fgEvents.push({
            tick: 0,
            velocity: 0.8,
            durationTicks: 12,
            articulation: 'normal',
            atomIndex: fg.atomIndices[0],
          });
          fgEvents.push({
            tick: sixteenth,
            velocity: 0.6,
            durationTicks: 12,
            articulation: 'normal',
            atomIndex: fg.atomIndices[0],
          });
          break;
        case 'NH2':
          for (let s = 0; s < 3; s++) {
            fgEvents.push({
              tick: s * Math.round(sixteenth * 0.66),
              velocity: 0.75,
              durationTicks: 12,
              articulation: 'normal',
              atomIndex: fg.atomIndices[0],
            });
          }
          break;
        case 'C=O':
          fgEvents.push({
            tick: 0,
            velocity: 1.0,
            durationTicks: 16,
            articulation: 'normal',
            atomIndex: fg.atomIndices[0],
          });
          break;
        case 'COOH':
          for (let s = 0; s < 4; s++) {
            fgEvents.push({
              tick: s * sixteenth,
              velocity: s === 0 ? 1.0 : 0.7,
              durationTicks: 12,
              articulation: 'normal',
              atomIndex: fg.atomIndices[0],
            });
          }
          break;
      }
      return fgEvents;
    };

    if (mode === 'once' || totalTicks === undefined) {
      for (const fg of analysis.functionalGroups) {
        events.push(...getFgBaseEvents(fg));
      }
    } else if (mode === 'loop') {
      const stepBars = totalBars <= 2 ? 1 : 2;
      for (let b = 0; b < totalBars; b += stepBars) {
        const barTick = options.barStartTicks ? (options.barStartTicks[b] ?? b * groupCycleTicks) : b * groupCycleTicks;
        if (barTick >= totalTicks) break;
        for (const fg of analysis.functionalGroups) {
          const fgBase = getFgBaseEvents(fg);
          for (const bEvt of fgBase) {
            const t = barTick + bEvt.tick;
            if (t < totalTicks) {
              events.push({
                ...bEvt,
                tick: t,
              });
            }
          }
        }
      }
    } else if (mode === 'span') {
      for (let fgIdx = 0; fgIdx < analysis.functionalGroups.length; fgIdx++) {
        const fg = analysis.functionalGroups[fgIdx];
        const fgBase = getFgBaseEvents(fg);
        let activeTicks: readonly number[] = [];
        if (options.groupActiveTicks) {
          if (Array.isArray(options.groupActiveTicks[0])) {
            activeTicks = (options.groupActiveTicks as readonly (readonly number[])[])[fgIdx] || [];
          } else {
            activeTicks = options.groupActiveTicks as readonly number[];
          }
        }
        if (activeTicks.length === 0) {
          activeTicks = [0];
        }

        for (const startTick of activeTicks) {
          for (const bEvt of fgBase) {
            const t = startTick + bEvt.tick;
            if (totalTicks === undefined || t < totalTicks) {
              events.push({
                ...bEvt,
                tick: t,
              });
            }
          }
        }
      }
    }

    tracks.push({
      voice: 'motif.group',
      cycleTicks: totalTicks ?? groupCycleTicks,
      events,
    });
  }

  return tracks;
}
