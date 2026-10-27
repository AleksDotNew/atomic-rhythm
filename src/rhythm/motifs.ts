import { MolecularAnalysis } from '../chem/analysis';
import { generateEuclidean } from './euclid';
import { PPQ, RhythmEvent, Track } from './ir';

export function buildMotifTracks(analysis: MolecularAnalysis, _totalBars: number = 1): Track[] {
  const tracks: Track[] = [];

  // 1. Ring Motifs
  for (const ring of analysis.rings) {
    const r = ring.size;
    const voiceName = `motif.ring${r}`;
    const pulseDurationTicks = PPQ / 2; // eighth note = 48 ticks
    const cycleTicks = r * pulseDurationTicks;
    const events: RhythmEvent[] = [];

    if (r === 6 && ring.isAromatic) {
      // 6/8 polymetric track with accents on eighths 1 and 4
      for (let s = 0; s < 6; s++) {
        const isAccent = s === 0 || s === 3;
        events.push({
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
          events.push({
            tick: s * pulseDurationTicks,
            velocity: 0.75,
            durationTicks: 24,
            articulation: 'normal',
            atomIndex: ring.atomIndices[s % ring.atomIndices.length],
          });
        }
      }
    }

    tracks.push({
      voice: voiceName,
      cycleTicks,
      events,
    });
  }

  // 2. Functional Group Motifs
  if (analysis.functionalGroups.length > 0) {
    const groupCycleTicks = 16 * (PPQ / 4); // 1 bar (384 ticks)
    const events: RhythmEvent[] = [];

    for (const fg of analysis.functionalGroups) {
      const sixteenth = PPQ / 4; // 24 ticks
      switch (fg.type) {
        case 'OH':
          events.push({
            tick: 0,
            velocity: 0.8,
            durationTicks: 12,
            articulation: 'normal',
            atomIndex: fg.atomIndices[0],
          });
          events.push({
            tick: sixteenth,
            velocity: 0.6,
            durationTicks: 12,
            articulation: 'normal',
            atomIndex: fg.atomIndices[0],
          });
          break;
        case 'NH2':
          for (let s = 0; s < 3; s++) {
            events.push({
              tick: s * Math.round(sixteenth * 0.66),
              velocity: 0.75,
              durationTicks: 12,
              articulation: 'normal',
              atomIndex: fg.atomIndices[0],
            });
          }
          break;
        case 'C=O':
          events.push({
            tick: 0,
            velocity: 1.0,
            durationTicks: 16,
            articulation: 'normal',
            atomIndex: fg.atomIndices[0],
          });
          break;
        case 'COOH':
          for (let s = 0; s < 4; s++) {
            events.push({
              tick: s * sixteenth,
              velocity: s === 0 ? 1.0 : 0.7,
              durationTicks: 12,
              articulation: 'normal',
              atomIndex: fg.atomIndices[0],
            });
          }
          break;
      }
    }

    tracks.push({
      voice: 'motif.group',
      cycleTicks: groupCycleTicks,
      events,
    });
  }

  return tracks;
}
