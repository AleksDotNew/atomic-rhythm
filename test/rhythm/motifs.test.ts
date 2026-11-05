import { describe, it, expect } from 'vitest';
import { parseSmiles } from '../../src/chem/smiles';
import { analyzeMolecule } from '../../src/chem/analysis';
import { buildMotifTracks } from '../../src/rhythm/motifs';

describe('buildMotifTracks', () => {
  it('generates 6/8 polymetric track with accents on 1 and 4 for benzene ring (legacy 1 bar)', () => {
    const benzene = parseSmiles('c1ccccc1');
    const analysis = analyzeMolecule(benzene);
    const tracks = buildMotifTracks(analysis, 1);

    const ringTrack = tracks.find(t => t.voice === 'motif.ring6');
    expect(ringTrack).toBeDefined();
    // 6 pulses
    expect(ringTrack!.events.length).toBe(6);
    // accents on 1 and 4
    expect(ringTrack!.events[0].velocity).toBe(1.0);
    expect(ringTrack!.events[3].velocity).toBe(1.0);
  });

  it('generates motif for OH group in ethanol (legacy 1 bar)', () => {
    const ethanol = parseSmiles('CCO');
    const analysis = analyzeMolecule(ethanol);
    const tracks = buildMotifTracks(analysis, 1);

    const groupTrack = tracks.find(t => t.voice === 'motif.group');
    expect(groupTrack).toBeDefined();
    expect(groupTrack!.events.length).toBe(2);
  });

  it('loops ring motif continuously across totalTicks in loop mode', () => {
    const benzene = parseSmiles('c1ccccc1');
    const analysis = analyzeMolecule(benzene);
    // 6 bars of 4/4 = 2304 ticks. Ring cycle = 288 ticks. 2304 / 288 = 8 repeats * 6 = 48 events.
    const tracks = buildMotifTracks(analysis, {
      mode: 'loop',
      totalTicks: 2304,
      totalBars: 6,
    });

    const ringTrack = tracks.find(t => t.voice === 'motif.ring6');
    expect(ringTrack).toBeDefined();
    expect(ringTrack!.events.length).toBe(48);
    // First cycle
    expect(ringTrack!.events[0].tick).toBe(0);
    // Second cycle starts at 288
    expect(ringTrack!.events[6].tick).toBe(288);
    // Last cycle starts at 2016
    expect(ringTrack!.events[42].tick).toBe(2016);
    // All events are strictly before 2304
    expect(ringTrack!.events.every(e => e.tick < 2304)).toBe(true);
  });

  it('restricts ring motif to its active span in span mode', () => {
    const benzene = parseSmiles('c1ccccc1');
    const analysis = analyzeMolecule(benzene);
    // Active from bar 1 (384) to bar 3 (1152) -> 768 ticks span.
    // 768 / 288 = 2 full cycles (12 hits) + 768 - 576 = 192 ticks (4 hits) = 16 events.
    const tracks = buildMotifTracks(analysis, {
      mode: 'span',
      totalTicks: 2304,
      totalBars: 6,
      ringActiveSpans: new Map([[0, { startTick: 384, endTick: 1152 }]]),
    });

    const ringTrack = tracks.find(t => t.voice === 'motif.ring6');
    expect(ringTrack).toBeDefined();
    expect(ringTrack!.events.length).toBe(16);
    expect(ringTrack!.events[0].tick).toBe(384);
    expect(ringTrack!.events.every(e => e.tick >= 384 && e.tick < 1152)).toBe(true);
  });

  it('generates only 1 cycle in once mode even when multi-bar totalTicks is provided', () => {
    const benzene = parseSmiles('c1ccccc1');
    const analysis = analyzeMolecule(benzene);
    const tracks = buildMotifTracks(analysis, {
      mode: 'once',
      totalTicks: 2304,
      totalBars: 6,
    });

    const ringTrack = tracks.find(t => t.voice === 'motif.ring6');
    expect(ringTrack).toBeDefined();
    expect(ringTrack!.events.length).toBe(6);
    expect(ringTrack!.events[5].tick).toBe(240);
  });

  it('repeats functional groups on phrase boundaries in loop mode', () => {
    const ethanol = parseSmiles('CCO');
    const analysis = analyzeMolecule(ethanol);
    // 4 bars: functional groups repeat every 2 bars (at bar 0 and bar 2)
    const tracks = buildMotifTracks(analysis, {
      mode: 'loop',
      totalTicks: 1536,
      totalBars: 4,
      barStartTicks: [0, 384, 768, 1152],
    });

    const groupTrack = tracks.find(t => t.voice === 'motif.group');
    expect(groupTrack).toBeDefined();
    // 2 events per trigger (OH), triggered twice (bar 0 and bar 2) = 4 events
    expect(groupTrack!.events.length).toBe(4);
    expect(groupTrack!.events[0].tick).toBe(0);
    expect(groupTrack!.events[2].tick).toBe(768);
  });

  it('triggers functional group only on active atom bars in span mode', () => {
    const ethanol = parseSmiles('CCO');
    const analysis = analyzeMolecule(ethanol);
    // Only active in bar 2 (tick 768)
    const tracks = buildMotifTracks(analysis, {
      mode: 'span',
      totalTicks: 1536,
      totalBars: 4,
      groupActiveTicks: [[768]],
    });

    const groupTrack = tracks.find(t => t.voice === 'motif.group');
    expect(groupTrack).toBeDefined();
    expect(groupTrack!.events.length).toBe(2);
    expect(groupTrack!.events[0].tick).toBe(768);
    expect(groupTrack!.events[1].tick).toBe(768 + 24);
  });
});
