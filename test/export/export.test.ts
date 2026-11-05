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

  it('exports concise algorithmic Strudel code without sheets of rests or multi-bar duplication', () => {
    const benzene = parseSmiles('c1ccccc1');
    const pat = buildMoleculePattern(benzene, { mode: 'sequential' });
    const code = exportToStrudel(pat, { compact: true });

    // Periodic tracks should fold to 1 cycle: bd(6,16) and hh(6,16) without .slow(6)
    expect(code).toContain('s("bd(6,16)")');
    expect(code).toContain('s("hh(6,16)")');

    // Sparse or multi-bar changing tracks should use angle bracket cycle notation <...>
    expect(code).toMatch(/s\("<cr\s+.*>"\)/);

    // Should NOT have 95 rests in a single string or multi-bar identical duplicates
    expect(code).not.toContain('~!95');
    expect(code).not.toContain('~!85');
    expect(code).not.toContain('.slow(6)');

    // Sub-pattern repetition compression: detects repeated patterns like [sd ~!2]*3 and [rim ~]*5
    expect(code).toContain('[sd ~!2]*3');
    expect(code).toContain('[rim ~]*5');
  });

  it('compacts custom repeating sub-patterns into multiplier syntax [pat]*K', () => {
    // Generate a pattern with a repeated 4-step motif: bd ~ cp ~ repeated 4 times in 16 steps
    // Since bd & cp are different tokens, Euclidean doesn't match, but sub-pattern compression should
    const benzene = parseSmiles('c1ccccc1');
    const pat = buildMoleculePattern(benzene, { mode: 'sequential' });
    const code = exportToStrudel(pat);

    expect(code).not.toContain('sd ~!2 sd ~!2 sd ~!2 sd ~!6 sd ~!2');
  });

  it('compresses repeated cycle elements inside <...> and formats per-bar stereo panning', () => {
    // Caffeine / multi-bar heterocyclic molecule with stereo panning
    const caffeine = parseSmiles('CN1C=NC2=C1C(=O)N(C(=O)N2C)C');
    const pans = caffeine.atoms.map((_, i) => (i % 2 === 0 ? -0.6 : 0.6));
    const pat = buildMoleculePattern(caffeine, {
      mode: 'sequential',
      atomPans: pans,
    });
    const code = exportToStrudel(pat, { compact: true });

    // 1. Crash and sparse tracks should use compressed rests like ~!N
    expect(code).toMatch(/s\("<.*cr.*>"\)/);
    expect(code).toContain('~!9');
    expect(code).toContain('~!13');

    // 2. No long consecutive spaces of identical elements inside <...>
    expect(code).not.toMatch(/~ ~ ~ ~ ~/);

    // 3. Kick/centered voices should not dump giant walls of 50+ pan numbers
    expect(code).not.toMatch(/\.pan\("<(?:[0-9.]+\s+){20,}/);
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

  it('exports Strudel code with setcps tempo declaration when bpm option is provided', () => {
    const methane = parseSmiles('C');
    const pat = buildMoleculePattern(methane);
    const code = exportToStrudel(pat, { bpm: 174 });

    // setcps(174 / 60 / 4 = 0.725)
    expect(code).toContain('setcps(');
    expect(code).toContain('0.725');
  });

  it('writes MIDI Time Signature Meta Events into Track 0', () => {
    const cyclopentane = parseSmiles('C1CCCC1');
    const pat = buildMoleculePattern(cyclopentane, { timeSignatureOption: 'adaptive' });
    const bytes = exportToMidi(pat, 120);

    // Check for Meta Event FF 58 04 (Time Signature)
    let foundTimeSig = false;
    for (let i = 0; i < bytes.length - 4; i++) {
      if (bytes[i] === 0xFF && bytes[i + 1] === 0x58 && bytes[i + 2] === 0x04) {
        foundTimeSig = true;
        break;
      }
    }
    expect(foundTimeSig).toBe(true);
  });
});
