import { analyzeMolecule } from '../chem/analysis';
import { Molecule } from '../chem/molecule';
import { SynthVoiceName } from '../audio/synth';
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
  readonly atomVoiceOverrides?: Record<number, SynthVoiceName | 'default' | 'mute'>;
}

export function buildMoleculePattern(
  mol: Molecule,
  options: MoleculePatternOptions = {}
): Pattern {
  const mode = options.mode ?? 'sequential';
  const atomsPerBar = options.atomsPerBar ?? 2;
  const matrix = options.matrix ?? DEFAULT_MOD_MATRIX;
  const temperature = options.temperature ?? 0;
  const overrides = options.atomVoiceOverrides ?? {};

  if (mol.atoms.length === 0) {
    return createPattern(1, []);
  }

  const analysis = analyzeMolecule(mol);
  const oneBarTicks = 16 * (PPQ / 4); // 384 ticks

  const trackMap = new Map<string, { cycleTicks: number; events: RhythmEvent[] }>();

  const getEffectiveVoice = (atomIdx: number | undefined, baseVoice: string): string | null => {
    if (atomIdx !== undefined && overrides[atomIdx] !== undefined) {
      const override = overrides[atomIdx];
      if (override === 'mute') return null;
      if (override !== 'default') return override;
    }
    return baseVoice;
  };

  const addEvent = (voice: string, cycleTicks: number, event: RhythmEvent) => {
    const effectiveVoice = getEffectiveVoice(event.atomIndex, voice);
    if (!effectiveVoice) return; // Muted

    if (!trackMap.has(effectiveVoice)) {
      trackMap.set(effectiveVoice, { cycleTicks, events: [] });
    }
    const t = trackMap.get(effectiveVoice)!;
    t.events.push(event);
  };

  const hasHeavyAtoms = mol.atoms.some(a => a.element.symbol !== 'H');

  if (mode === 'sequential') {
    if (hasHeavyAtoms && analysis.structuralUnits.length > 0) {
      // Structural Units / Ring Cycle Mode (e.g. cyclopentane 5-part cycle)
      const totalBars = Math.max(1, analysis.structuralUnits.length);
      const fullCycleTicks = totalBars * oneBarTicks;

      for (let unitIdx = 0; unitIdx < analysis.structuralUnits.length; unitIdx++) {
        const unit = analysis.structuralUnits[unitIdx];
        const barStartTick = unitIdx * oneBarTicks;
        const currentBar = unitIdx + 1;

        // 1. Peripheral atoms (Hydrogens) play first / groove throughout unit bar
        for (let p = 0; p < unit.peripheralAtomIndices.length; p++) {
          const pIdx = unit.peripheralAtomIndices[p];
          const pAtom = mol.atoms[pIdx];
          let pTracks = buildAtomPattern(pAtom, matrix, pIdx, oneBarTicks);
          pTracks = applyExcitationToAtom(pAtom, pTracks, temperature, currentBar);

          for (const track of pTracks) {
            for (const evt of track.events) {
              // Stagger multiple hydrogens if on the same track so they complement each other
              const offsetTick = p > 0 ? (p * 24) % oneBarTicks : 0;
              addEvent(track.voice, fullCycleTicks, {
                ...evt,
                tick: (barStartTick + evt.tick + offsetTick) % fullCycleTicks,
              });
            }
          }
        }

        // 2. Central Heavy Atom plays its driving foundation
        const heavyIdx = unit.heavyAtomIndex;
        const heavyAtom = mol.atoms[heavyIdx];
        let heavyTracks = buildAtomPattern(heavyAtom, matrix, heavyIdx, oneBarTicks);
        heavyTracks = applyExcitationToAtom(heavyAtom, heavyTracks, temperature, currentBar);

        for (const track of heavyTracks) {
          for (const evt of track.events) {
            addEvent(track.voice, fullCycleTicks, {
              ...evt,
              tick: (barStartTick + evt.tick) % fullCycleTicks,
            });
          }
        }

        // 3. Outgoing bond articulation at the end of the bar (transition into next part)
        if (unit.outgoingBond) {
          const boundaryTick = (barStartTick + oneBarTicks - 24) % fullCycleTicks;
          let articulation: RhythmEvent['articulation'] = 'normal';
          let velocity = 0.8;

          if (unit.outgoingBond.order === 2) {
            articulation = 'flam';
          } else if (unit.outgoingBond.order === 3) {
            articulation = 'roll';
          } else if (unit.outgoingBond.isAromatic) {
            velocity = 0.5;
          }

          addEvent('bond', fullCycleTicks, {
            tick: boundaryTick,
            velocity,
            durationTicks: 12,
            articulation,
            atomIndex: heavyIdx,
          });
        }
      }

      // Add motif tracks (rings, functional groups)
      const motifTracks = buildMotifTracks(analysis, totalBars);
      for (const mt of motifTracks) {
        for (const evt of mt.events) {
          addEvent(mt.voice, fullCycleTicks, evt);
        }
      }

      const tracks: Track[] = Array.from(trackMap.entries()).map(([voice, data]) => ({
        voice,
        cycleTicks: data.cycleTicks,
        events: data.events,
      }));

      return createPattern(totalBars, tracks);
    } else {
      // Linear diatomic / hydrogen fallback mode (atoms per bar segments)
      const totalBars = Math.max(1, Math.ceil(mol.atoms.length / atomsPerBar));
      const fullCycleTicks = totalBars * oneBarTicks;
      const segmentTicks = Math.round(oneBarTicks / atomsPerBar);

      for (let seqIdx = 0; seqIdx < analysis.traversalOrder.length; seqIdx++) {
        const atomIdx = analysis.traversalOrder[seqIdx];
        const atom = mol.atoms[atomIdx];
        const segmentStartTick = seqIdx * segmentTicks;
        const currentBar = Math.floor(segmentStartTick / oneBarTicks) + 1;

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

      const motifTracks = buildMotifTracks(analysis, totalBars);
      for (const mt of motifTracks) {
        for (const evt of mt.events) {
          addEvent(mt.voice, fullCycleTicks, evt);
        }
      }

      const tracks: Track[] = Array.from(trackMap.entries()).map(([voice, data]) => ({
        voice,
        cycleTicks: data.cycleTicks,
        events: data.events,
      }));

      return createPattern(totalBars, tracks);
    }
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

    const motifTracks = buildMotifTracks(analysis, totalBars);
    for (const mt of motifTracks) {
      for (const evt of mt.events) {
        addEvent(mt.voice, fullCycleTicks, evt);
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
