import { AtomConfig } from '../chem/atom';
import { SHELL_GRID_STEPS } from './atom-pattern';
import { generateEuclidean } from './euclid';
import { PPQ, RhythmEvent, Track } from './ir';
import { calculateBpm } from './temperature';

export { calculateBpm };

export function calculateIonizationThreshold(ie1: number): number {
  return 100 * ((ie1 - 3.5) / (20.0 - 3.5));
}

export function isAtomExcited(temperature: number, ie1: number): boolean {
  if (temperature <= 0) return false;
  const threshold = calculateIonizationThreshold(ie1);
  const effectiveTemp = temperature > 100 ? (temperature / 50) : temperature;
  return effectiveTemp >= threshold;
}

export function applyExcitationToAtom(
  atom: AtomConfig,
  tracks: Track[],
  temperature: number,
  currentBar: number
): Track[] {
  if (!isAtomExcited(temperature, atom.element.ionizationEnergy1)) {
    return tracks;
  }

  const result: Track[] = [];
  const outerShellIndex = atom.shells.length; // e.g. for Na (shells=[2,8,1]), outer is 3rd shell (index 2, promoted to index 3 = s4)
  const promotedVoice = `electron.s${outerShellIndex + 1}`;
  const isFillBar = currentBar > 0 && currentBar % 4 === 0;

  for (const track of tracks) {
    if (track.voice === `electron.s${outerShellIndex}`) {
      // Outermost ground state shell: 1 electron is promoted away
      // If had > 1 hit, reduce hits; if had 1, it's promoted
      if (track.events.length <= 1) {
        // All promoted to next shell, or keep ghost
        result.push({
          voice: track.voice,
          cycleTicks: track.cycleTicks,
          events: [],
        });
      } else {
        result.push({
          voice: track.voice,
          cycleTicks: track.cycleTicks,
          events: track.events.slice(0, track.events.length - 1),
        });
      }
    } else {
      result.push(track);
    }
  }

  // Create promoted shell track
  const promotedSteps = SHELL_GRID_STEPS[outerShellIndex] || 24;
  const segmentTicks = 16 * (PPQ / 4);
  const promotedCycleTicks = Math.round((promotedSteps / 16) * segmentTicks);
  const hits = isFillBar ? Math.min(promotedSteps, 6) : 2;
  const euclid = generateEuclidean(hits, promotedSteps, 0);
  const events: RhythmEvent[] = [];

  for (let s = 0; s < promotedSteps; s++) {
    if (euclid.pattern[s]) {
      events.push({
        tick: Math.round((s * promotedCycleTicks) / promotedSteps),
        velocity: isFillBar ? 1.0 : 0.85,
        durationTicks: 12,
        articulation: isFillBar ? 'fill' : 'normal',
        atomIndex: tracks[0]?.events[0]?.atomIndex,
      });
    }
  }

  result.push({
    voice: promotedVoice,
    cycleTicks: promotedCycleTicks,
    events,
  });

  return result;
}
