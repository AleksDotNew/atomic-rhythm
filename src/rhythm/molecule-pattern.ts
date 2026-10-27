import { analyzeMolecule } from '../chem/analysis';
import { Molecule } from '../chem/molecule';
import { buildAtomPattern } from './atom-pattern';
import { applyExcitationToAtom } from './excitation';
import { createPattern, Pattern, PPQ, RhythmEvent, Track } from './ir';
import { DEFAULT_MOD_MATRIX, ModulationMatrix } from './modmatrix';
import { buildMotifTracks } from './motifs';

export type PlaybackMode = 'sequential' | 'overlay';
export type FormMode = 'direct' | 'assembly';

export interface MoleculePatternOptions {
  readonly mode?: PlaybackMode;
  readonly atomsPerBar?: number;
  readonly matrix?: ModulationMatrix;
  readonly temperature?: number;
}

export function buildMoleculePattern(
  mol: Molecule,
  options: MoleculePatternOptions = {}
): Pattern {
  const mode = options.mode ?? 'sequential';
  const atomsPerBar = options.atomsPerBar ?? 2;
  const matrix = options.matrix ?? DEFAULT_MOD_MATRIX;
  const temperature = options.temperature ?? 0;

  if (mol.atoms.length === 0) {
    return createPattern(1, []);
  }

  const analysis = analyzeMolecule(mol);
  const oneBarTicks = 16 * (PPQ / 4); // 384 ticks

  const trackMap = new Map<string, { cycleTicks: number; events: RhythmEvent[] }>();

  const addEvent = (voice: string, cycleTicks: number, event: RhythmEvent) => {
    if (!trackMap.has(voice)) {
      trackMap.set(voice, { cycleTicks, events: [] });
    }
    const t = trackMap.get(voice)!;
    // Keep max cycleTicks or voice-specific
    t.events.push(event);
  };

  if (mode === 'sequential') {
    const totalBars = Math.max(1, Math.ceil(mol.atoms.length / atomsPerBar));
    const fullCycleTicks = totalBars * oneBarTicks;
    const segmentTicks = Math.round(oneBarTicks / atomsPerBar);

    for (let seqIdx = 0; seqIdx < analysis.traversalOrder.length; seqIdx++) {
      const atomIdx = analysis.traversalOrder[seqIdx];
      const atom = mol.atoms[atomIdx];
      const segmentStartTick = seqIdx * segmentTicks;
      const currentBar = Math.floor(segmentStartTick / oneBarTicks) + 1;

      // Build base atom tracks for this segment
      let atomTracks = buildAtomPattern(atom, matrix, atomIdx, segmentTicks);
      atomTracks = applyExcitationToAtom(atom, atomTracks, temperature, currentBar);

      for (const track of atomTracks) {
        for (const evt of track.events) {
          addEvent(track.voice, fullCycleTicks, {
            ...evt,
            tick: (segmentStartTick + evt.tick) % fullCycleTicks,
          });
        }
      }

      // Check bond to next atom in traversal sequence
      if (seqIdx < analysis.traversalOrder.length - 1) {
        const nextAtomIdx = analysis.traversalOrder[seqIdx + 1];
        const bond = mol.bonds.find(
          b => (b.atomA === atomIdx && b.atomB === nextAtomIdx) || (b.atomA === nextAtomIdx && b.atomB === atomIdx)
        );

        if (bond) {
          const boundaryTick = (segmentStartTick + segmentTicks) % fullCycleTicks;
          let articulation: RhythmEvent['articulation'] = 'normal';
          let velocity = 0.8;

          if (bond.order === 2) {
            articulation = 'flam';
          } else if (bond.order === 3) {
            articulation = 'roll';
          } else if (bond.isAromatic) {
            velocity = 0.5;
          }

          addEvent('bond', fullCycleTicks, {
            tick: boundaryTick,
            velocity,
            durationTicks: 12,
            articulation,
            atomIndex: atomIdx,
          });
        }
      }
    }

    // Add motif tracks (rings, functional groups)
    const motifTracks = buildMotifTracks(analysis, totalBars);
    for (const mt of motifTracks) {
      if (!trackMap.has(mt.voice)) {
        trackMap.set(mt.voice, { cycleTicks: mt.cycleTicks, events: [...mt.events] });
      } else {
        const t = trackMap.get(mt.voice)!;
        t.events.push(...mt.events);
      }
    }

    const tracks: Track[] = Array.from(trackMap.entries()).map(([voice, data]) => ({
      voice,
      cycleTicks: data.cycleTicks,
      events: data.events,
    }));

    return createPattern(totalBars, tracks);
  } else {
    // Overlay Mode: all atoms play concurrently on 1 bar
    const totalBars = 1;
    const fullCycleTicks = oneBarTicks;

    for (let atomIdx = 0; atomIdx < mol.atoms.length; atomIdx++) {
      const atom = mol.atoms[atomIdx];
      let atomTracks = buildAtomPattern(atom, matrix, atomIdx, fullCycleTicks);
      atomTracks = applyExcitationToAtom(atom, atomTracks, temperature, 1);

      for (const track of atomTracks) {
        for (const evt of track.events) {
          addEvent(track.voice, track.cycleTicks, evt);
        }
      }
    }

    // Add motif tracks
    const motifTracks = buildMotifTracks(analysis, totalBars);
    for (const mt of motifTracks) {
      if (!trackMap.has(mt.voice)) {
        trackMap.set(mt.voice, { cycleTicks: mt.cycleTicks, events: [...mt.events] });
      } else {
        const t = trackMap.get(mt.voice)!;
        t.events.push(...mt.events);
      }
    }

    const tracks: Track[] = Array.from(trackMap.entries()).map(([voice, data]) => ({
      voice,
      cycleTicks: data.cycleTicks,
      events: data.events,
    }));

    return createPattern(totalBars, tracks);
  }
}
