import { describe, it, expect } from 'vitest';
import { createAtom } from '../../src/chem/atom';
import { buildAtomPattern } from '../../src/rhythm/atom-pattern';

describe('buildAtomPattern', () => {
  it('builds Protium (1p, 0n, 1e): kick on beat 1, snare on backbeat, silent hat', () => {
    const h = createAtom('H');
    const tracks = buildAtomPattern(h);

    const kick = tracks.find(t => t.voice === 'proton')!;
    expect(kick.events.length).toBe(1);
    expect(kick.events[0].tick).toBe(0);

    const hat = tracks.find(t => t.voice === 'neutron')!;
    expect(hat.events.length).toBe(0);

    const snare = tracks.find(t => t.voice === 'electron.s1')!;
    expect(snare.events.length).toBe(1);
    expect(snare.events[0].tick).toBe(tracks[0].cycleTicks / 2);
  });

  it('builds Tritium: hat now plays 2 hits', () => {
    const t = createAtom('H', 3);
    const tracks = buildAtomPattern(t);
    const hat = tracks.find(t => t.voice === 'neutron')!;
    expect(hat.events.length).toBe(2);
  });

  it('creates polymetric tracks for multi-shell atoms (e.g. Carbon)', () => {
    const c = createAtom('C'); // shells [2, 4]
    const tracks = buildAtomPattern(c);
    const s1 = tracks.find(t => t.voice === 'electron.s1')!;
    const s2 = tracks.find(t => t.voice === 'electron.s2')!;
    expect(s1).toBeDefined();
    expect(s2).toBeDefined();
    expect(s1.cycleTicks).not.toBe(s2.cycleTicks); // 16 vs 12 subdivision grid
  });
});
