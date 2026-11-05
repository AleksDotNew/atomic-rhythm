import { describe, it, expect } from 'vitest';
import { parseSmiles } from '../../src/chem/smiles';
import { analyzeMolecule } from '../../src/chem/analysis';
import {
  getMeterInfo,
  resolveBarMeters,
  TimeSignatureOption,
} from '../../src/rhythm/time-signature';

describe('Time Signature Engine', () => {
  it('calculates step counts and tick lengths for standard meters', () => {
    // PPQ = 96. 1 sixteenth = 24 ticks.
    const m44 = getMeterInfo([4, 4]);
    expect(m44.steps).toBe(16);
    expect(m44.ticks).toBe(384);

    const m34 = getMeterInfo([3, 4]);
    expect(m34.steps).toBe(12);
    expect(m34.ticks).toBe(288);

    const m68 = getMeterInfo([6, 8]);
    expect(m68.steps).toBe(12);
    expect(m68.ticks).toBe(288);

    const m58 = getMeterInfo([5, 8]);
    expect(m58.steps).toBe(10);
    expect(m58.ticks).toBe(240);

    const m78 = getMeterInfo([7, 8]);
    expect(m78.steps).toBe(14);
    expect(m78.ticks).toBe(336);

    const m54 = getMeterInfo([5, 4]);
    expect(m54.steps).toBe(20);
    expect(m54.ticks).toBe(480);
  });

  it('resolves fixed meters uniformly across all bars', () => {
    const ethanol = parseSmiles('CCO');
    const analysis = analyzeMolecule(ethanol);
    const bars = 3;

    const meters78 = resolveBarMeters(ethanol, analysis, '7/8', bars);
    expect(meters78.length).toBe(3);
    expect(meters78.every(m => m.numerator === 7 && m.denominator === 8)).toBe(true);
    expect(meters78[0].steps).toBe(14);
  });

  it('resolves adaptive meters from molecular rings (5-ring -> 5/8, 6-ring -> 6/8, linear -> 4/4)', () => {
    // Caffeine has fused 6-ring (pyrimidinedione) and 5-ring (imidazole) plus peripheral methyls
    const caffeine = parseSmiles('CN1C=NC2=C1C(=O)N(C(=O)N2C)C');
    const analysis = analyzeMolecule(caffeine);
    const totalBars = analysis.structuralUnits.length;

    const adaptiveMeters = resolveBarMeters(caffeine, analysis, 'adaptive', totalBars);
    expect(adaptiveMeters.length).toBe(totalBars);

    // Should contain both 6/8 bars (for 6-ring) and 5/8 bars (for 5-ring)
    const has68 = adaptiveMeters.some(m => m.numerator === 6 && m.denominator === 8);
    const has58 = adaptiveMeters.some(m => m.numerator === 5 && m.denominator === 8);
    expect(has68).toBe(true);
    expect(has58).toBe(true);
  });
});

