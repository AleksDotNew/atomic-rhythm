import { AtomConfig } from '../chem/atom';
import { generateEuclidean } from './euclid';
import { PPQ, RhythmEvent, Track } from './ir';
import { DEFAULT_MOD_MATRIX, evaluateRoute, ModulationMatrix } from './modmatrix';

export const SHELL_GRID_STEPS = [16, 12, 20, 24, 28, 32, 36] as const;

/**
 * Calculate base note duration in ticks (PPQ = 96) from atomic mass:
 * - Mass < 4 (e.g. H 1.008, He 4.0): 1/32 note = 12 ticks
 * - Mass < 30 (e.g. C 12, N 14, O 16, Na 23): 1/16 note = 24 ticks
 * - Mass < 80 (e.g. S 32, Fe 56, Cu 63.5): 1/8 note = 48 ticks
 * - Mass < 150 (e.g. Br 79.9, Ag 107.8, I 126.9): 1/4 note = 96 ticks
 * - Mass < 200 (e.g. Au 196.9): 1/2 note = 192 ticks
 * - Mass >= 200 (e.g. Pb 207.2, U 238): 1/1 whole note = 384 ticks
 */
export function calculateDurationTicksFromMass(mass: number): number {
  if (mass < 4) return 12;   // 1/32 note
  if (mass < 30) return 24;  // 1/16 note
  if (mass < 80) return 48;  // 1/8 note
  if (mass < 150) return 96; // 1/4 note
  if (mass < 200) return 192;// 1/2 note
  return 384;                // 1/1 note
}

/**
 * Calculate velocity scaling factor based on Pauling electronegativity:
 * Oxidizers (high EN >= 3.0) get an attack boost (up to +20%).
 * Electropositive atoms (low EN < 1.5) get a softer attack (-10% to -20%).
 */
export function calculateElectronegativityScale(en: number | null | undefined): number {
  if (en === null || en === undefined) return 1.0;
  if (en >= 3.0) {
    return 1.0 + Math.min(0.20, (en - 3.0) * 0.15 + 0.05);
  }
  if (en < 1.5) {
    return Math.max(0.80, 1.0 - (1.5 - en) * 0.20);
  }
  return 1.0;
}

export function buildAtomPattern(
  atom: AtomConfig,
  matrix: ModulationMatrix = DEFAULT_MOD_MATRIX,
  atomIndex?: number,
  segmentTicks: number = 16 * (PPQ / 4), // 1 bar of 4/4
  bondCount?: number,
  bondWeight?: number
): Track[] {
  const tracks: Track[] = [];

  const weightScale = bondWeight !== undefined && bondWeight > 0 ? 0.75 + 0.25 * Math.min(1.0, bondWeight / 6.0) : 1.0;
  const mass = atom.element.atomicMass;
  const baseDuration = calculateDurationTicksFromMass(mass);
  const enScale = calculateElectronegativityScale(atom.element.electronegativity);

  // Helper to find configured route
  const getHits = (voice: string, fallback: number): number => {
    const route = matrix.routes.find(r => r.voice === voice && r.dest === 'hits');
    return route ? evaluateRoute(route, atom, bondCount, bondWeight) : fallback;
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
        velocity: Math.min(1.0, 0.9 * protonEuclid.velocityScale * weightScale * enScale),
        durationTicks: baseDuration,
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
  const hatDuration = Math.max(8, Math.round(baseDuration * 0.5));

  for (let s = 0; s < neutronSteps; s++) {
    if (neutronEuclid.pattern[s]) {
      neutronEvents.push({
        tick: Math.round((s * neutronCycleTicks) / neutronSteps),
        velocity: Math.min(1.0, 0.75 * neutronEuclid.velocityScale * weightScale * enScale),
        durationTicks: hatDuration,
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
  const shellDuration = Math.max(12, Math.round(baseDuration * 0.75));
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
          velocity: Math.min(1.0, 0.85 * shellEuclid.velocityScale * weightScale * enScale),
          durationTicks: shellDuration,
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
