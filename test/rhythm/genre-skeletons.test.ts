import { describe, it, expect } from 'vitest';
import { createAtom } from '../../src/chem/atom';
import { buildAtomPattern } from '../../src/rhythm/atom-pattern';
import { getMeterInfo } from '../../src/rhythm/time-signature';
import {
  applyGenreSkeleton,
  GENRE_DEFAULT_BPM,
  GenreSkeletonId,
} from '../../src/rhythm/genre-skeletons';

describe('Genre Skeletons Engine', () => {
  const m44 = getMeterInfo([4, 4]);

  it('provides sensible default BPMs for each genre', () => {
    expect(GENRE_DEFAULT_BPM.dnb).toBe(174);
    expect(GENRE_DEFAULT_BPM.techno).toBe(128);
    expect(GENRE_DEFAULT_BPM.hiphop).toBe(90);
    expect(GENRE_DEFAULT_BPM.raw).toBe(120);
  });

  it('leaves tracks unmodified in raw physics mode', () => {
    const c = createAtom('C');
    const originalTracks = buildAtomPattern(c);
    const result = applyGenreSkeleton(originalTracks, c, 'raw', m44, 0);

    expect(result).toBe(originalTracks);
  });

  it('applies Drum & Bass skeleton: rigid backbeat on 2 & 4, syncopated kick, 16th rolling hats', () => {
    const o = createAtom('O'); // Oxygen Z=8
    const originalTracks = buildAtomPattern(o);
    const dnbTracks = applyGenreSkeleton(originalTracks, o, 'dnb', m44, 0);

    // 1. Kick: should NOT have 8 machine-gun hits! Should have 2 or 3 hits: step 0 (tick 0) + step 10/11
    const kick = dnbTracks.find(t => t.voice === 'proton')!;
    expect(kick.events.length).toBeLessThanOrEqual(3);
    expect(kick.events[0].tick).toBe(0);

    // 2. Snare: MUST hit on beats 2 and 4 (step 4 = tick 96, step 12 = tick 288)
    const snare = dnbTracks.find(t => t.voice.includes('electron') || t.voice === 'snare')!;
    const snareTicks = snare.events.map(e => e.tick);
    expect(snareTicks).toContain(96);  // step 4
    expect(snareTicks).toContain(288); // step 12

    // 3. Hats: dense rolling 16ths (16 hits in 4/4)
    const hat = dnbTracks.find(t => t.voice === 'neutron')!;
    expect(hat.events.length).toBe(16);
  });

  it('applies Techno skeleton: four-on-the-floor kick, offbeat open hat, 2 & 4 claps', () => {
    const c = createAtom('C');
    const originalTracks = buildAtomPattern(c);
    const technoTracks = applyGenreSkeleton(originalTracks, c, 'techno', m44, 0);

    // 1. Kick: Four-on-the-floor on steps 0, 4, 8, 12 (ticks 0, 96, 192, 288)
    const kick = technoTracks.find(t => t.voice === 'proton')!;
    const kickTicks = kick.events.map(e => e.tick);
    expect(kickTicks).toEqual([0, 96, 192, 288]);

    // 2. Openhat: offbeats on steps 2, 6, 10, 14 (ticks 48, 144, 240, 336)
    const oh = technoTracks.find(t => t.voice === 'openhat');
    expect(oh).toBeDefined();
    const ohTicks = oh!.events.map(e => e.tick);
    expect(ohTicks).toEqual([48, 144, 240, 336]);
  });

  it('applies Hip-Hop skeleton: boom-bap kick and halftime snare', () => {
    const c = createAtom('C');
    const originalTracks = buildAtomPattern(c);
    const hiphopTracks = applyGenreSkeleton(originalTracks, c, 'hiphop', m44, 0);

    // 1. Kick: downbeat tick 0
    const kick = hiphopTracks.find(t => t.voice === 'proton')!;
    expect(kick.events[0].tick).toBe(0);
    expect(kick.events.length).toBeLessThanOrEqual(3);

    // 2. Snare: backbeat present
    const snare = hiphopTracks.find(t => t.voice.includes('electron') || t.voice === 'snare')!;
    expect(snare.events.length).toBeGreaterThan(0);
  });
});

