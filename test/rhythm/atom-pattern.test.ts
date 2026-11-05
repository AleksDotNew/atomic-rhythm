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

  it('computes dynamic note durations across 1/32 to 1/1 based on atomic mass', () => {
    const h = createAtom('H');   // Mass 1.008 -> 1/32 note (12 ticks)
    const c = createAtom('C');   // Mass 12.011 -> 1/16 note (24 ticks)
    const fe = createAtom('Fe'); // Mass 55.845 -> 1/8 note (48 ticks)
    const pb = createAtom('Pb'); // Mass 207.2 -> 1/1 whole note (384 ticks)

    const hKick = buildAtomPattern(h).find(t => t.voice === 'proton')!;
    const cKick = buildAtomPattern(c).find(t => t.voice === 'proton')!;
    const feKick = buildAtomPattern(fe).find(t => t.voice === 'proton')!;
    const pbKick = buildAtomPattern(pb).find(t => t.voice === 'proton')!;

    expect(hKick.events[0].durationTicks).toBe(12);
    expect(cKick.events[0].durationTicks).toBe(24);
    expect(feKick.events[0].durationTicks).toBe(48);
    expect(pbKick.events[0].durationTicks).toBe(384);
  });

  it('boosts velocity and transient presence for oxidizers (high electronegativity)', () => {
    const o = createAtom('O');   // Electronegativity 3.44 (oxidizer)
    const na = createAtom('Na'); // Electronegativity 0.93 (electropositive metal)

    const oTracks = buildAtomPattern(o);
    const naTracks = buildAtomPattern(na);

    const oKick = oTracks.find(t => t.voice === 'proton')!;
    const naKick = naTracks.find(t => t.voice === 'proton')!;

    // Oxidizer has velocity boosted relative to low-electronegativity metal
    expect(oKick.events[0].velocity).toBeGreaterThan(naKick.events[0].velocity);
  });
});
