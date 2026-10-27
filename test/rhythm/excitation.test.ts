import { describe, it, expect } from 'vitest';
import { createAtom } from '../../src/chem/atom';
import { buildAtomPattern } from '../../src/rhythm/atom-pattern';
import {
  calculateBpm,
  calculateIonizationThreshold,
  isAtomExcited,
  applyExcitationToAtom
} from '../../src/rhythm/excitation';

describe('Excitation Engine', () => {
  it('increases BPM linearly with temperature T in [0..100]', () => {
    expect(calculateBpm(120, 0)).toBe(120);
    expect(calculateBpm(120, 50)).toBe(180);
    expect(calculateBpm(120, 100)).toBe(240);
  });

  it('determines excitation thresholds for alkali metals (Na) vs noble gases (He)', () => {
    const na = createAtom('Na'); // IE1 ~ 5.14 eV -> low threshold
    const he = createAtom('He'); // IE1 ~ 24.59 eV -> > 100 threshold

    const naThresh = calculateIonizationThreshold(na.element.ionizationEnergy1);
    const heThresh = calculateIonizationThreshold(he.element.ionizationEnergy1);

    expect(naThresh).toBeLessThan(20);
    expect(heThresh).toBeGreaterThan(100);
    expect(isAtomExcited(30, na.element.ionizationEnergy1)).toBe(true);
    expect(isAtomExcited(30, he.element.ionizationEnergy1)).toBe(false);
  });

  it('promotes valence electron and inserts fill on bar 4 when excited', () => {
    const na = createAtom('Na');
    const baseTracks = buildAtomPattern(na);
    const excitedTracks = applyExcitationToAtom(na, baseTracks, 50, 4);

    // New outer shell track created for promoted electron
    const promotedTrack = excitedTracks.find(t => t.voice === 'electron.s4');
    expect(promotedTrack).toBeDefined();
    expect(promotedTrack!.events.some(e => e.articulation === 'fill')).toBe(true);
  });
});
