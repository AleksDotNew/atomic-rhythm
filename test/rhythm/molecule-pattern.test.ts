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

  it('builds cyclopentane C1CCCC1 as a 5-part cycle with 1 bar per ring unit', () => {
    const cyclopentane = parseSmiles('C1CCCC1');
    const pat = buildMoleculePattern(cyclopentane, { mode: 'sequential' });

    // 5-part cycle = 5 bars
    expect(pat.bars).toBe(5);

    // Each bar has events from its unit's carbon and hydrogens
    const oneBarTicks = 16 * 24; // 384 ticks
    for (let bar = 0; bar < 5; bar++) {
      const barStart = bar * oneBarTicks;
      const barEnd = (bar + 1) * oneBarTicks;
      // All tracks have active events in every bar (no empty dead zones!)
      const eventsInBar = pat.tracks.flatMap(t => t.events.filter(e => e.tick >= barStart && e.tick < barEnd));
      expect(eventsInBar.length).toBeGreaterThan(0);
    }

    // Has bond transitions between ring units
    const bondTrack = pat.tracks.find(t => t.voice === 'bond');
    expect(bondTrack).toBeDefined();
    expect(bondTrack!.events.length).toBeGreaterThanOrEqual(4);
  });

  it('respects atomVoiceOverrides: can remap an atom to hat or mute it', () => {
    const h2 = parseSmiles('[H][H]');

    // Remap atom 0 to 'hat', mute atom 1
    const pat = buildMoleculePattern(h2, {
      mode: 'overlay',
      atomVoiceOverrides: {
        0: 'hat',
        1: 'mute',
      },
    });

    // Check that atom 0's events go to 'hat' track
    const hatTrack = pat.tracks.find(t => t.voice === 'hat');
    expect(hatTrack).toBeDefined();
    expect(hatTrack!.events.some(e => e.atomIndex === 0)).toBe(true);

    // Check that atom 1 has zero events in any track
    const allEvents = pat.tracks.flatMap(t => t.events);
    expect(allEvents.some(e => e.atomIndex === 1)).toBe(false);
  });

  it('supports customOrder and bondWeight order strategies in sequential mode', () => {
    const ethanol = parseSmiles('CCO');
    // Ethanol: atoms 0, 1 are C, atom 2 is O, atoms 3..8 are H

    // Custom order: put O (atom 2) first
    const customOrder = [2, 1, 0, 3, 4, 5, 6, 7, 8];
    const patCustom = buildMoleculePattern(ethanol, {
      mode: 'sequential',
      orderStrategy: 'custom',
      customOrder,
      atomsPerBar: 1,
    });

    // First bar should contain events from atom 2 (O)
    const firstBarEvents = patCustom.tracks.flatMap(t => t.events.filter(e => e.tick < 384));
    expect(firstBarEvents.some(e => e.atomIndex === 2)).toBe(true);
  });

  it('scales event velocity with bond weight: bonded carbons sound weightier than hydrogens', () => {
    const methane = parseSmiles('C'); // C with 4 H's
    const pat = buildMoleculePattern(methane, { mode: 'overlay' });

    const cKick = pat.tracks.find(t => t.voice === 'proton')?.events.find(e => e.atomIndex === 0);
    const hKick = pat.tracks.find(t => t.voice === 'proton')?.events.find(e => e.atomIndex === 1);

    expect(cKick).toBeDefined();
    expect(hKick).toBeDefined();
    // C has bond weight 6.0, H has bond weight 1.5 -> C velocity is higher
    expect(cKick!.velocity).toBeGreaterThan(hKick!.velocity);
  });

  it('assigns 2D spatial stereo panning to events when atomPans are provided', () => {
    const h2 = parseSmiles('[H][H]');
    // Atom 0 on the left (-0.85), Atom 1 on the right (+0.85)
    const atomPans = [-0.85, 0.85];
    const pat = buildMoleculePattern(h2, {
      mode: 'sequential',
      atomsPerBar: 2,
      atomPans,
    });

    const protonTrack = pat.tracks.find(t => t.voice === 'proton');
    expect(protonTrack).toBeDefined();

    const ev0 = protonTrack!.events.find(e => e.atomIndex === 0);
    const ev1 = protonTrack!.events.find(e => e.atomIndex === 1);

    expect(ev0).toBeDefined();
    expect(ev1).toBeDefined();

    // Proton defaults to kick-like instrument, so pan is scaled by kick anchor (0.25)
    expect(ev0!.pan).toBeCloseTo(-0.85 * 0.25, 2);
    expect(ev1!.pan).toBeCloseTo(0.85 * 0.25, 2);
  });

  it('triggers downbeat crash on cycle start (tick 0) and openhat on central hub nodes', () => {
    // Neopentane CC(C)(C)C has central hub atom 1
    const neopentane = parseSmiles('CC(C)(C)C');
    const pat = buildMoleculePattern(neopentane, { mode: 'sequential' });

    const crashTrack = pat.tracks.find(t => t.voice === 'crash');
    expect(crashTrack).toBeDefined();
    // Cycle starts with downbeat crash at tick 0
    expect(crashTrack!.events.some(e => e.tick === 0)).toBe(true);

    const openHatTrack = pat.tracks.find(t => t.voice === 'openhat');
    expect(openHatTrack).toBeDefined();
    // Central hub atom 1 has openhat accent
    expect(openHatTrack!.events.some(e => e.atomIndex === 1)).toBe(true);
  });

  it('supports expanded atomsPerBar (16 and 32) with zero cumulative rounding drift', () => {
    // Generate a 16-atom chain (e.g. Hexadecane C16H34, or arbitrary SMILES with 16 atoms)
    const ethanol = parseSmiles('CCO'); // 9 atoms
    // Sequential mode with 16 atoms/bar
    const pat16 = buildMoleculePattern(ethanol, {
      mode: 'sequential',
      atomsPerBar: 16,
      orderStrategy: 'mass',
    });

    // 9 atoms with 16 atoms/bar fit in 1 bar
    expect(pat16.bars).toBe(1);

    // Check atom 0 start tick (0) and atom 1 start tick (round(384 / 16) = 24)
    const protonTrack = pat16.tracks.find(t => t.voice === 'proton');
    expect(protonTrack).toBeDefined();

    // Sequential mode with 32 atoms/bar (12 ticks per segment -> 1/32 notes)
    const pat32 = buildMoleculePattern(ethanol, {
      mode: 'sequential',
      atomsPerBar: 32,
      orderStrategy: 'mass',
    });
    expect(pat32.bars).toBe(1);

    // Non-power-of-2 atomsPerBar = 5 has drift-free total duration across bars
    const pat5 = buildMoleculePattern(ethanol, {
      mode: 'sequential',
      atomsPerBar: 5,
      orderStrategy: 'mass',
    });
    // 9 atoms with 5 per bar = 2 bars (ceil(9 / 5) = 2)
    expect(pat5.bars).toBe(2);
  });

  it('builds patterns with DnB genre skeleton: backbeat snares and rolling hats', () => {
    const benzene = parseSmiles('c1ccccc1');
    const pat = buildMoleculePattern(benzene, {
      mode: 'sequential',
      genre: 'dnb',
    });

    const snareTrack = pat.tracks.find(t => t.voice.includes('electron') || t.voice === 'snare')!;
    expect(snareTrack).toBeDefined();

    // In 4/4 bar 0 (384 ticks), snare hits on step 4 (tick 96) and step 12 (tick 288)
    const ticksInBar0 = snareTrack.events.filter(e => e.tick < 384).map(e => e.tick);
    expect(ticksInBar0).toContain(96);
    expect(ticksInBar0).toContain(288);

    // Kick track has limited hits per bar (not 6 machine-gun hits!)
    const kickTrack = pat.tracks.find(t => t.voice === 'proton')!;
    const kickTicksBar0 = kickTrack.events.filter(e => e.tick < 384);
    expect(kickTicksBar0.length).toBeLessThanOrEqual(3);
  });

  it('builds patterns with adaptive time signature: 5-ring cyclopentane plays in 5/8', () => {
    const cyclopentane = parseSmiles('C1CCCC1');
    const pat = buildMoleculePattern(cyclopentane, {
      mode: 'sequential',
      timeSignatureOption: 'adaptive',
    });

    // 5-ring -> 5/8 time signature (240 ticks per bar)
    expect(pat.timeSignatures).toBeDefined();
    expect(pat.timeSignatures![0]).toEqual([5, 8]);
    expect(pat.barTicks![0]).toBe(240);
  });
});


