import { describe, it, expect } from 'vitest';
import { parseSmiles } from '../../src/chem/smiles';
import { buildFormPattern } from '../../src/rhythm/form';
import { buildMoleculePattern } from '../../src/rhythm/molecule-pattern';

describe('buildFormPattern', () => {
  it('returns identical pattern to buildMoleculePattern when formMode is direct', () => {
    const h2 = parseSmiles('[H][H]');
    const directPat = buildMoleculePattern(h2, { mode: 'sequential' });
    const formPat = buildFormPattern(h2, 'direct', { mode: 'sequential' });

    expect(formPat.bars).toBe(directPat.bars);
    expect(formPat.tracks.length).toBe(directPat.tracks.length);
  });

  it('builds progressive 3-stage assembly pattern for Water (H2O)', () => {
    const water = parseSmiles('O'); // O with 2 implicit H's
    const pat = buildFormPattern(water, 'assembly', { mode: 'sequential' });

    // Unique elements: O and H (2 bars) + 2 bonding bars + 1 molecule bar = 5 bars
    expect(pat.bars).toBe(5);

    // Bar 0 (O): should have dense oxygen events
    const bar0Events = pat.tracks.flatMap(t => t.events.filter(e => e.tick < 384));
    expect(bar0Events.length).toBeGreaterThan(0);

    // Bar 1 (H): hydrogen events
    const bar1Events = pat.tracks.flatMap(t => t.events.filter(e => e.tick >= 384 && e.tick < 768));
    expect(bar1Events.length).toBeGreaterThan(0);

    // Bars 2-3: Covalent bonding phase (bond flams and claps)
    const bondEvents = pat.tracks.find(t => t.voice === 'bond');
    expect(bondEvents).toBeDefined();
    expect(bondEvents!.events.some(e => e.tick >= 768 && e.tick < 1536)).toBe(true);

    // Bar 4: Final water molecule
    const bar4Events = pat.tracks.flatMap(t => t.events.filter(e => e.tick >= 1536));
    expect(bar4Events.length).toBeGreaterThan(0);
  });

  it('builds full 19-bar genesis assembly progression for Adrenaline (C9H13NO3)', () => {
    const adrenaline = parseSmiles('CNC[C@@H](C1=CC(=C(C=C1)O)O)O');
    const pat = buildFormPattern(adrenaline, 'assembly', {
      mode: 'sequential',
      orderStrategy: 'structural',
      genre: 'techno',
      motifMode: 'loop',
    });

    // 4 elements (C, N, O, H) + 2 assembly bars + 13 molecular structural units = 19 bars!
    expect(pat.bars).toBe(19);

    // Stage 1: Bars 0..3 have unique elemental tracks
    for (let b = 0; b < 4; b++) {
      const eventsInBar = pat.tracks.flatMap(t => t.events.filter(e => e.tick >= b * 384 && e.tick < (b + 1) * 384));
      expect(eventsInBar.length).toBeGreaterThan(0);
    }

    // Stage 2: Bars 4..5 have bonding and ring intro
    const bondTrack = pat.tracks.find(t => t.voice === 'bond')!;
    expect(bondTrack).toBeDefined();
    expect(bondTrack.events.some(e => e.tick >= 4 * 384 && e.tick < 6 * 384)).toBe(true);

    // Stage 3: Bars 6..18 contain full adrenaline traversal with four-on-the-floor kick
    const kickTrack = pat.tracks.find(t => t.voice === 'proton')!;
    expect(kickTrack).toBeDefined();
    const kicksInStage3 = kickTrack.events.filter(e => e.tick >= 6 * 384);
    // 13 bars * 4 kicks/bar = 52 kicks in Stage 3
    expect(kicksInStage3.length).toBe(13 * 4);
  });
});
