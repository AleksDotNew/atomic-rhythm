import { analyzeMolecule, computeOrderedSequence, findKeyNodalAtoms, OrderStrategy } from '../chem/analysis';
import { Molecule } from '../chem/molecule';
import { SynthVoiceName } from '../audio/synth';
import { buildAtomPattern } from './atom-pattern';
import { applyExcitationToAtom } from './excitation';
import { createPattern, Pattern, PPQ, RhythmEvent, Track } from './ir';
import { DEFAULT_MOD_MATRIX, ModulationMatrix } from './modmatrix';
import { buildMotifTracks } from './motifs';
import { adjustPanForVoice } from './panning';

export type PlaybackMode = 'sequential' | 'overlay';
export type FormMode = 'direct' | 'assembly';

export interface MoleculePatternOptions {
  readonly mode?: PlaybackMode;
  readonly atomsPerBar?: number;
  readonly matrix?: ModulationMatrix;
  readonly temperature?: number;
  readonly atomVoiceOverrides?: Record<number, SynthVoiceName | 'default' | 'mute'>;
  readonly orderStrategy?: OrderStrategy;
  readonly customOrder?: readonly number[];
  readonly atomPans?: readonly number[];
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
  const orderStrategy = options.orderStrategy ?? 'structural';
  const customOrder = options.customOrder;

  if (mol.atoms.length === 0) {
    return createPattern(1, []);
  }

  const analysis = analyzeMolecule(mol);
  const keyNodes = findKeyNodalAtoms(mol, analysis);
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

    let pan = event.pan;
    if (pan === undefined && event.atomIndex !== undefined && options.atomPans && options.atomPans[event.atomIndex] !== undefined) {
      pan = adjustPanForVoice(options.atomPans[event.atomIndex], effectiveVoice);
    }

    const finalEvent: RhythmEvent = pan !== undefined ? { ...event, pan } : event;

    if (!trackMap.has(effectiveVoice)) {
      trackMap.set(effectiveVoice, { cycleTicks, events: [] });
    }
    const t = trackMap.get(effectiveVoice)!;
    t.events.push(finalEvent);
  };

  const hasHeavyAtoms = mol.atoms.some(a => a.element.symbol !== 'H');

  if (mode === 'sequential') {
    if (orderStrategy === 'structural' && hasHeavyAtoms && analysis.structuralUnits.length > 0) {
      // Structural Units / Ring Cycle Mode (e.g. cyclopentane 5-part cycle)
      const totalBars = Math.max(1, analysis.structuralUnits.length);
      const fullCycleTicks = totalBars * oneBarTicks;

      // Downbeat crash accent at start of molecular cycle
      addEvent('crash', fullCycleTicks, {
        tick: 0,
        velocity: 0.85,
        durationTicks: 48,
      });

      for (let unitIdx = 0; unitIdx < analysis.structuralUnits.length; unitIdx++) {
        const unit = analysis.structuralUnits[unitIdx];
        const barStartTick = unitIdx * oneBarTicks;
        const currentBar = unitIdx + 1;
        const heavyIdx = unit.heavyAtomIndex;

        // Accent nodal / weighted moments
        if (keyNodes.bridgeheads.includes(heavyIdx)) {
          if (barStartTick > 0) {
            addEvent('crash', fullCycleTicks, {
              tick: barStartTick,
              velocity: 0.8,
              durationTicks: 48,
              atomIndex: heavyIdx,
            });
          }
        } else if (keyNodes.hubs.includes(heavyIdx) || keyNodes.maxWeightAtoms.includes(heavyIdx)) {
          addEvent('openhat', fullCycleTicks, {
            tick: barStartTick,
            velocity: 0.75,
            durationTicks: 24,
            atomIndex: heavyIdx,
          });
        }

        // 1. Peripheral atoms (Hydrogens) play first / groove throughout unit bar
        for (let p = 0; p < unit.peripheralAtomIndices.length; p++) {
          const pIdx = unit.peripheralAtomIndices[p];
          const pAtom = mol.atoms[pIdx];
          const pBondCount = analysis.atomBondCounts[pIdx];
          const pBondWeight = analysis.atomBondWeights[pIdx];

          let pTracks = buildAtomPattern(pAtom, matrix, pIdx, oneBarTicks, pBondCount, pBondWeight);
          pTracks = applyExcitationToAtom(pAtom, pTracks, temperature, currentBar);

          for (const track of pTracks) {
            for (const evt of track.events) {
              const offsetTick = p > 0 ? (p * 24) % oneBarTicks : 0;
              addEvent(track.voice, fullCycleTicks, {
                ...evt,
                tick: (barStartTick + evt.tick + offsetTick) % fullCycleTicks,
              });
            }
          }
        }

        // 2. Central Heavy Atom plays its driving foundation
        const heavyAtom = mol.atoms[heavyIdx];
        const heavyBondCount = analysis.atomBondCounts[heavyIdx];
        const heavyBondWeight = analysis.atomBondWeights[heavyIdx];

        let heavyTracks = buildAtomPattern(heavyAtom, matrix, heavyIdx, oneBarTicks, heavyBondCount, heavyBondWeight);
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
      // Ordered sequence mode (custom, bondWeight, mass, or fallback for all-H)
      const sequence = computeOrderedSequence(mol, analysis, orderStrategy, customOrder);
      const totalBars = Math.max(1, Math.ceil(sequence.length / atomsPerBar));
      const fullCycleTicks = totalBars * oneBarTicks;
      const segmentTicks = Math.round(oneBarTicks / atomsPerBar);

      // Downbeat crash accent at start of molecular cycle
      addEvent('crash', fullCycleTicks, {
        tick: 0,
        velocity: 0.85,
        durationTicks: 48,
      });

      for (let seqIdx = 0; seqIdx < sequence.length; seqIdx++) {
        const atomIdx = sequence[seqIdx];
        const atom = mol.atoms[atomIdx];
        const bondCount = analysis.atomBondCounts[atomIdx];
        const bondWeight = analysis.atomBondWeights[atomIdx];
        const segmentStartTick = seqIdx * segmentTicks;
        const currentBar = Math.floor(segmentStartTick / oneBarTicks) + 1;

        // Accent nodal / weighted moments
        if (keyNodes.bridgeheads.includes(atomIdx)) {
          if (segmentStartTick > 0) {
            addEvent('crash', fullCycleTicks, {
              tick: segmentStartTick,
              velocity: 0.8,
              durationTicks: 48,
              atomIndex: atomIdx,
            });
          }
        } else if (keyNodes.hubs.includes(atomIdx) || keyNodes.maxWeightAtoms.includes(atomIdx)) {
          addEvent('openhat', fullCycleTicks, {
            tick: segmentStartTick,
            velocity: 0.75,
            durationTicks: 24,
            atomIndex: atomIdx,
          });
        }

        let atomTracks = buildAtomPattern(atom, matrix, atomIdx, segmentTicks, bondCount, bondWeight);
        atomTracks = applyExcitationToAtom(atom, atomTracks, temperature, currentBar);

        for (const track of atomTracks) {
          for (const evt of track.events) {
            addEvent(track.voice, fullCycleTicks, {
              ...evt,
              tick: (segmentStartTick + evt.tick) % fullCycleTicks,
            });
          }
        }

        if (seqIdx < sequence.length - 1) {
          const nextAtomIdx = sequence[seqIdx + 1];
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

    // Downbeat crash accent
    addEvent('crash', fullCycleTicks, {
      tick: 0,
      velocity: 0.85,
      durationTicks: 48,
    });

    if (keyNodes.allNodalIndices.length > 0) {
      addEvent('openhat', fullCycleTicks, {
        tick: Math.round(fullCycleTicks / 2),
        velocity: 0.75,
        durationTicks: 24,
        atomIndex: keyNodes.allNodalIndices[0],
      });
    }

    for (let atomIdx = 0; atomIdx < mol.atoms.length; atomIdx++) {
      const atom = mol.atoms[atomIdx];
      const bondCount = analysis.atomBondCounts[atomIdx];
      const bondWeight = analysis.atomBondWeights[atomIdx];

      let atomTracks = buildAtomPattern(atom, matrix, atomIdx, fullCycleTicks, bondCount, bondWeight);
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
