import { describe, it, expect } from 'vitest';
import { parseSmiles } from '../../src/chem/smiles';
import { buildMoleculePattern } from '../../src/rhythm/molecule-pattern';

describe('buildMoleculePattern', () => {
  it('builds H2 in sequential mode: 1 bar with H1 in segment 1 and H2 in segment 2', () => {
    const h2 = parseSmiles('[H][H]');
    const pat = buildMoleculePattern(h2, { mode: 'sequential', atomsPerBar: 2 });
    expect(pat.bars).toBe(1);

    const kick = pat.tracks.find(t => t.voice === 'proton')!;
    // 2 kick hits: one at step 0 (H1), one at step 8 (H2)
    expect(kick.events.length).toBe(2);
    expect(kick.events[0].tick).toBe(0);
    expect(kick.events[1].tick).toBe(pat.tracks[0].cycleTicks / 2);
  });

  it('adds bond articulation at segment boundary', () => {
    const o2 = parseSmiles('O=O');
    const pat = buildMoleculePattern(o2, { mode: 'sequential', atomsPerBar: 2 });
    const bondTrack = pat.tracks.find(t => t.voice === 'bond')!;
    expect(bondTrack).toBeDefined();
    // Double bond produces flam
    expect(bondTrack.events.some(e => e.articulation === 'flam')).toBe(true);
  });

  it('builds in overlay mode: all atoms play concurrently on 1 bar', () => {
    const h2 = parseSmiles('[H][H]');
    const pat = buildMoleculePattern(h2, { mode: 'overlay' });
    expect(pat.bars).toBe(1);
  });
});
