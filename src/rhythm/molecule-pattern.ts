import { analyzeMolecule, computeOrderedSequence, findKeyNodalAtoms, OrderStrategy } from '../chem/analysis';
import { Molecule } from '../chem/molecule';
import { SynthVoiceName } from '../audio/synth';
import { buildAtomPattern } from './atom-pattern';
import { applyExcitationToAtom } from './excitation';
import { applyGenreSkeleton, GenreSkeletonId } from './genre-skeletons';
import { createPattern, Pattern, PPQ, RhythmEvent, Track } from './ir';
import { DEFAULT_MOD_MATRIX, ModulationMatrix } from './modmatrix';
import { buildMotifTracks } from './motifs';
import { adjustPanForVoice } from './panning';
import { resolveBarMeters, TimeSignatureOption } from './time-signature';

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
  readonly genre?: GenreSkeletonId;
  readonly timeSignatureOption?: TimeSignatureOption;
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
  const genre = options.genre ?? 'raw';
  const timeSignatureOption = options.timeSignatureOption ?? '4/4';

  if (mol.atoms.length === 0) {
    return createPattern(1, []);
  }

  const analysis = analyzeMolecule(mol);
  const keyNodes = findKeyNodalAtoms(mol, analysis);

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
      const barMeters = resolveBarMeters(mol, analysis, timeSignatureOption, totalBars);
      const barStartTicks: number[] = [0];
      for (let b = 0; b < totalBars; b++) {
        barStartTicks.push(barStartTicks[b] + barMeters[b].ticks);
      }
      const fullCycleTicks = barStartTicks[totalBars];

      // Downbeat crash accent at start of molecular cycle
      addEvent('crash', fullCycleTicks, {
        tick: 0,
        velocity: 0.85,
        durationTicks: 48,
      });

      for (let unitIdx = 0; unitIdx < analysis.structuralUnits.length; unitIdx++) {
        const unit = analysis.structuralUnits[unitIdx];
        const meter = barMeters[unitIdx];
        const barTicks = meter.ticks;
        const barStartTick = barStartTicks[unitIdx];
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

          let pTracks = buildAtomPattern(pAtom, matrix, pIdx, barTicks, pBondCount, pBondWeight);
          pTracks = applyExcitationToAtom(pAtom, pTracks, temperature, currentBar);
          if (genre !== 'raw') {
            pTracks = pTracks.filter(t => t.voice !== 'proton');
          }

          for (const track of pTracks) {
            for (const evt of track.events) {
              const offsetTick = p > 0 ? (p * 24) % barTicks : 0;
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

        let heavyTracks = buildAtomPattern(heavyAtom, matrix, heavyIdx, barTicks, heavyBondCount, heavyBondWeight);
        heavyTracks = applyExcitationToAtom(heavyAtom, heavyTracks, temperature, currentBar);
        heavyTracks = applyGenreSkeleton(heavyTracks, heavyAtom, genre, meter, unitIdx);

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
          const boundaryTick = (barStartTick + barTicks - 24) % fullCycleTicks;
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

      const primaryTs: [number, number] = [barMeters[0].numerator, barMeters[0].denominator];
      const timeSignatures: [number, number][] = barMeters.map(m => [m.numerator, m.denominator]);
      const barTickList: number[] = barMeters.map(m => m.ticks);

      return createPattern(totalBars, tracks, primaryTs, timeSignatures, barTickList);
    } else {
      // Ordered sequence mode (custom, bondWeight, mass, or fallback for all-H)
      const sequence = computeOrderedSequence(mol, analysis, orderStrategy, customOrder);
      const apb = Math.max(1, atomsPerBar);
      const totalBars = Math.max(1, Math.ceil(sequence.length / apb));
      const barMeters = resolveBarMeters(mol, analysis, timeSignatureOption, totalBars);
      const barStartTicks: number[] = [0];
      for (let b = 0; b < totalBars; b++) {
        barStartTicks.push(barStartTicks[b] + barMeters[b].ticks);
      }
      const fullCycleTicks = barStartTicks[totalBars];

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
        const barIndex = Math.min(totalBars - 1, Math.floor(seqIdx / apb));
        const meter = barMeters[barIndex];
        const barTicks = meter.ticks;
        const currentBar = barIndex + 1;
        const subIdx = seqIdx % apb;
        const segmentStartTick = barStartTicks[barIndex] + Math.round((subIdx * barTicks) / apb);
        const nextSegmentStartTick = barStartTicks[barIndex] + Math.round(((subIdx + 1) * barTicks) / apb);
        const segmentTicks = Math.max(1, nextSegmentStartTick - segmentStartTick);

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
        if (genre !== 'raw') {
          atomTracks = applyGenreSkeleton(atomTracks, atom, genre, meter, barIndex);
        }

        for (const track of atomTracks) {
          for (const evt of track.events) {
            addEvent(track.voice, fullCycleTicks, {
              ...evt,
              tick: (segmentStartTick + evt.tick) % fullCycleTicks,
            });
          }
        }

        // Outgoing bond articulation at segment boundary
        const nextIdx = sequence[(seqIdx + 1) % sequence.length];
        if (nextIdx !== undefined) {
          const bond = mol.bonds.find(
            b => (b.atomA === atomIdx && b.atomB === nextIdx) || (b.atomA === nextIdx && b.atomB === atomIdx)
          );
          if (bond) {
            const boundaryTick = (segmentStartTick + segmentTicks - 12) % fullCycleTicks;
            let articulation: RhythmEvent['articulation'] = 'normal';
            let velocity = 0.7;

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

      const primaryTs: [number, number] = [barMeters[0].numerator, barMeters[0].denominator];
      const timeSignatures: [number, number][] = barMeters.map(m => [m.numerator, m.denominator]);
      const barTickList: number[] = barMeters.map(m => m.ticks);

      return createPattern(totalBars, tracks, primaryTs, timeSignatures, barTickList);
    }
  } else {
    // Overlay Mode: all atoms play concurrently on 1 bar
    const totalBars = 1;
    const barMeters = resolveBarMeters(mol, analysis, timeSignatureOption, 1);
    const meter = barMeters[0];
    const fullCycleTicks = meter.ticks;

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
      if (genre !== 'raw') {
        atomTracks = applyGenreSkeleton(atomTracks, atom, genre, meter, 0);
      }

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

    const primaryTs: [number, number] = [meter.numerator, meter.denominator];
    return createPattern(1, tracks, primaryTs, [primaryTs], [meter.ticks]);
  }
}
