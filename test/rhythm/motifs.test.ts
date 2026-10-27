import { describe, it, expect } from 'vitest';
import { parseSmiles } from '../../src/chem/smiles';
import { analyzeMolecule } from '../../src/chem/analysis';
import { buildMotifTracks } from '../../src/rhythm/motifs';

describe('buildMotifTracks', () => {
  it('generates 6/8 polymetric track with accents on 1 and 4 for benzene ring', () => {
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

  it('generates motif for OH group in ethanol', () => {
    const ethanol = parseSmiles('CCO');
    const analysis = analyzeMolecule(ethanol);
    const tracks = buildMotifTracks(analysis, 1);

    const groupTrack = tracks.find(t => t.voice === 'motif.group');
    expect(groupTrack).toBeDefined();
    expect(groupTrack!.events.length).toBe(2);
  });
});
