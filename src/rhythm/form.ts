import { Molecule } from '../chem/molecule';
import { analyzeMolecule } from '../chem/analysis';
import { createPattern, Pattern, PPQ, RhythmEvent, Track } from './ir';
import { buildAtomPattern } from './atom-pattern';
import { buildMoleculePattern, FormMode, MoleculePatternOptions } from './molecule-pattern';
import { applyGenreSkeleton } from './genre-skeletons';
import { buildMotifTracks } from './motifs';

export function buildFormPattern(
  mol: Molecule,
  formMode: FormMode,
  options: MoleculePatternOptions = {}
): Pattern {
  const molPattern = buildMoleculePattern(mol, options);
  if (formMode === 'direct' || mol.atoms.length === 0) {
    return molPattern;
  }

  const analysis = analyzeMolecule(mol);
  const genre = options.genre ?? 'raw';
  const sixteenthTicks = PPQ / 4; // 24 ticks
  const barTicks = 16 * sixteenthTicks; // 384 ticks in 4/4
  const defaultMeter = { numerator: 4, denominator: 4, ticks: barTicks, steps: 16 };

  // Phase 1: Unique Elements (1 bar per unique element: C, N, O, H, etc.)
  const uniqueElements: typeof mol.atoms[0][] = [];
  const seenSymbols = new Set<string>();
  for (const a of mol.atoms) {
    if (!seenSymbols.has(a.element.symbol)) {
      seenSymbols.add(a.element.symbol);
      uniqueElements.push(a);
    }
  }

  const phase1Bars = uniqueElements.length;
  // Phase 2: Bonding & Structural Assembly (2 bars)
  const phase2Bars = 2;
  // Phase 3: Full Molecular Pattern (molPattern.bars)
  const phase3Bars = molPattern.bars;

  const totalBars = phase1Bars + phase2Bars + phase3Bars;
  const barTickList: number[] = [];
  const timeSignatures: [number, number][] = [];

  // Track map for all unified tracks across all bars
  const trackMap = new Map<string, RhythmEvent[]>();

  const addEvent = (voice: string, evt: RhythmEvent) => {
    if (!trackMap.has(voice)) {
      trackMap.set(voice, []);
    }
    trackMap.get(voice)!.push(evt);
  };

  let currentBarTick = 0;

  // --- STAGE 1: Unique Element Genesis ---
  for (let i = 0; i < uniqueElements.length; i++) {
    const atom = uniqueElements[i];
    barTickList.push(barTicks);
    timeSignatures.push([4, 4]);

    let atomTracks = buildAtomPattern(atom, options.matrix, undefined, barTicks);
    if (genre !== 'raw') {
      atomTracks = applyGenreSkeleton(atomTracks, atom, genre, defaultMeter, i);
    }

    for (const t of atomTracks) {
      for (const e of t.events) {
        addEvent(t.voice, {
          ...e,
          tick: currentBarTick + e.tick,
        });
      }
    }
    currentBarTick += barTicks;
  }

  // --- STAGE 2: Chemical Bonding & Ring Assembly (2 bars) ---
  for (let b = 0; b < phase2Bars; b++) {
    barTickList.push(barTicks);
    timeSignatures.push([4, 4]);

    // Downbeat accent
    addEvent('crash', {
      tick: currentBarTick,
      velocity: b === 0 ? 0.75 : 0.85,
      durationTicks: 48,
      articulation: 'normal',
    });

    // Covalent bonds forming (claps and flams)
    const bondSteps = b === 0 ? [4, 12] : [4, 8, 12, 14];
    for (const s of bondSteps) {
      addEvent('bond', {
        tick: currentBarTick + s * sixteenthTicks,
        velocity: 0.8,
        durationTicks: 12,
        articulation: s === 14 ? 'flam' : 'normal',
      });
    }

    // Steady building kick pulse
    if (genre === 'techno') {
      const kickSteps = b === 0 ? [0, 8] : [0, 4, 8, 12];
      for (const s of kickSteps) {
        addEvent('proton', {
          tick: currentBarTick + s * sixteenthTicks,
          velocity: 0.9,
          durationTicks: sixteenthTicks,
          articulation: 'normal',
        });
      }
    }

    // Aromatic ring starts spinning in Bar 2 of assembly
    if (b === 1 && analysis.rings.length > 0) {
      const ringTracks = buildMotifTracks(analysis, { mode: 'once', totalBars: 1, totalTicks: barTicks });
      for (const rt of ringTracks) {
        for (const re of rt.events) {
          addEvent(rt.voice, {
            ...re,
            tick: currentBarTick + re.tick,
          });
        }
      }
    }

    currentBarTick += barTicks;
  }

  // --- STAGE 3: Full Molecular Rhythm ---
  const molBarTicks = molPattern.barTicks ?? Array.from({ length: molPattern.bars }, () => barTicks);
  const molTimeSigs = molPattern.timeSignatures ?? Array.from({ length: molPattern.bars }, () => molPattern.timeSignature);

  for (let b = 0; b < molPattern.bars; b++) {
    const bTicks = molBarTicks[b] ?? barTicks;
    barTickList.push(bTicks);
    timeSignatures.push([molTimeSigs[b][0], molTimeSigs[b][1]]);
  }

  for (const track of molPattern.tracks) {
    for (const evt of track.events) {
      addEvent(track.voice, {
        ...evt,
        tick: currentBarTick + evt.tick,
      });
    }
  }

  const molCycleTicks = molPattern.barTicks
    ? molPattern.barTicks.reduce((a, b) => a + b, 0)
    : molPattern.bars * barTicks;
  const fullCycleTicks = currentBarTick + molCycleTicks;

  const unifiedTracks: Track[] = Array.from(trackMap.entries()).map(([voice, events]) => ({
    voice,
    cycleTicks: fullCycleTicks,
    events: events.sort((a, b) => a.tick - b.tick),
  }));

  const primaryTs: [number, number] = [timeSignatures[0][0], timeSignatures[0][1]];
  return createPattern(totalBars, unifiedTracks, primaryTs, timeSignatures, barTickList);
}

export function buildFormSequence(
  mol: Molecule,
  formMode: FormMode,
  options: MoleculePatternOptions = {}
): Pattern[] {
  return [buildFormPattern(mol, formMode, options)];
}
