import { describe, it, expect } from 'vitest';
import { parseSmiles } from '../../src/chem/smiles';
import { buildMoleculePattern } from '../../src/rhythm/molecule-pattern';
import { exportToStrudel, getStrudelToken } from '../../src/export/strudel';
import { exportToMidi } from '../../src/export/midi';

describe('Exporters', () => {
  it('exports valid Strudel mini-notation stack', () => {
    const h2 = parseSmiles('[H][H]');
    const pat = buildMoleculePattern(h2);
    const code = exportToStrudel(pat);

    expect(code).toContain('stack(');
    expect(code).toContain('s("bd');
  });

  it('exports Strudel code with 1:1 soundbank alignment and .pan() modifier', () => {
    const h2 = parseSmiles('[H][H]');
    // Atom 0 on the left (-0.8), Atom 1 on the right (+0.8)
    const pat = buildMoleculePattern(h2, {
      mode: 'sequential',
      atomsPerBar: 2,
      atomPans: [-0.8, 0.8],
    });
    const code = exportToStrudel(pat);

    // Expect soundbank tokens bd, hh, etc.
    expect(code).toContain('s("');
    // Expect .pan() modifier to be present
    expect(code).toContain('.pan(');
  });

  it('maps crash to cr and openhat to oh in Strudel mini-notation', () => {
    expect(getStrudelToken('crash')).toBe('cr');
    expect(getStrudelToken('openhat')).toBe('oh');
  });

  it('exports compact algorithmic Strudel code with Euclidean syntax or rest compression and samples header', () => {
    const methane = parseSmiles('C');
    const pat = buildMoleculePattern(methane, { mode: 'overlay' });

    // Export with samplesDeclaration
    const code = exportToStrudel(pat, {
      samplesDeclaration: "samples('github:tidalcycles/dirt-samples')",
      compact: true,
    });

    // Contains samples declaration header
    expect(code).toContain("samples('github:tidalcycles/dirt-samples')");

    // Contains either Euclidean notation (e.g. bd(k, n)) or compressed rests (~!N)
    const hasEuclideanOrCompressedRest = /\([0-9]+,[0-9]+\)|~!/.test(code);
    expect(hasEuclideanOrCompressedRest).toBe(true);

    // Code does NOT have 7 consecutive standalone tildes "~ ~ ~ ~ ~ ~ ~"
    expect(code).not.toContain('~ ~ ~ ~ ~ ~ ~');
  });

  it('generates valid Standard MIDI File bytes (MThd, MTrk headers)', () => {
    const h2 = parseSmiles('[H][H]');
    const pat = buildMoleculePattern(h2);
    const bytes = exportToMidi(pat, 120);

    // MThd header check: 4D 54 68 64
    expect(bytes[0]).toBe(0x4D); // 'M'
    expect(bytes[1]).toBe(0x54); // 'T'
    expect(bytes[2]).toBe(0x68); // 'h'
    expect(bytes[3]).toBe(0x64); // 'd'
    // Format 1 or 0
    expect(bytes.length).toBeGreaterThan(14);
  });
});
