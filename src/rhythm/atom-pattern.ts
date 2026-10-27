import { AtomConfig } from '../chem/atom';
import { generateEuclidean } from './euclid';
import { PPQ, RhythmEvent, Track } from './ir';
import { DEFAULT_MOD_MATRIX, evaluateRoute, ModulationMatrix } from './modmatrix';

export const SHELL_GRID_STEPS = [16, 12, 20, 24, 28, 32, 36] as const;

export function buildAtomPattern(
  atom: AtomConfig,
  matrix: ModulationMatrix = DEFAULT_MOD_MATRIX,
  atomIndex?: number,
  segmentTicks: number = 16 * (PPQ / 4) // 1 bar of 4/4
): Track[] {
  const tracks: Track[] = [];

  // Helper to find configured route
  const getHits = (voice: string, fallback: number): number => {
    const route = matrix.routes.find(r => r.voice === voice && r.dest === 'hits');
    return route ? evaluateRoute(route, atom) : fallback;
  };

  // 1. Proton track (Kick)
  const protonHits = getHits('proton', atom.protons);
  const protonSteps = 16;
  const protonCycleTicks = segmentTicks;
  const protonEuclid = generateEuclidean(protonHits, protonSteps, 0);
  const protonEvents: RhythmEvent[] = [];

  for (let s = 0; s < protonSteps; s++) {
    if (protonEuclid.pattern[s]) {
      protonEvents.push({
        tick: Math.round((s * protonCycleTicks) / protonSteps),
        velocity: Math.min(1.0, 0.9 * protonEuclid.velocityScale),
        durationTicks: 12,
        articulation: 'normal',
        atomIndex,
      });
    }
  }

  tracks.push({
    voice: 'proton',
    cycleTicks: protonCycleTicks,
    events: protonEvents,
  });

  // 2. Neutron track (Closed Hat)
  const neutronHits = getHits('neutron', atom.neutrons);
  const neutronSteps = 16;
  const neutronCycleTicks = segmentTicks;
  const neutronEuclid = generateEuclidean(neutronHits, neutronSteps, 0);
  const neutronEvents: RhythmEvent[] = [];

  for (let s = 0; s < neutronSteps; s++) {
    if (neutronEuclid.pattern[s]) {
      neutronEvents.push({
        tick: Math.round((s * neutronCycleTicks) / neutronSteps),
        velocity: Math.min(1.0, 0.75 * neutronEuclid.velocityScale),
        durationTicks: 8,
        articulation: 'normal',
        atomIndex,
      });
    }
  }

  tracks.push({
    voice: 'neutron',
    cycleTicks: neutronCycleTicks,
    events: neutronEvents,
  });

  // 3. Electron Shell tracks (Snares / Claps / Perc)
  for (let i = 0; i < atom.shells.length; i++) {
    const voiceName = `electron.s${i + 1}`;
    const shellHits = getHits(voiceName, atom.shells[i]);
    const shellSteps = SHELL_GRID_STEPS[i] || 16;

    // Shell 1 has rotation = steps / 2 (snare on backbeat); higher shells have rotation = 0 or i * 2
    let rotation = 0;
    if (i === 0) {
      rotation = Math.floor(shellSteps / 2);
    }

    // Scale cycleTicks according to polymetric grid ratio
    // Shell 1 (16 steps) matches 16 sixteenths (segmentTicks).
    // Shell 2 (12 steps) has cycleTicks proportional: (12 / 16) * segmentTicks
    const shellCycleTicks = Math.round((shellSteps / 16) * segmentTicks);
    const shellEuclid = generateEuclidean(shellHits, shellSteps, rotation);
    const shellEvents: RhythmEvent[] = [];

    for (let s = 0; s < shellSteps; s++) {
      if (shellEuclid.pattern[s]) {
        shellEvents.push({
          tick: Math.round((s * shellCycleTicks) / shellSteps),
          velocity: Math.min(1.0, 0.85 * shellEuclid.velocityScale),
          durationTicks: 12,
          articulation: 'normal',
          atomIndex,
        });
      }
    }

    tracks.push({
      voice: voiceName,
      cycleTicks: shellCycleTicks,
      events: shellEvents,
    });
  }

  return tracks;
}
