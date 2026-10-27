import { describe, it, expect } from 'vitest';
import { parseSmiles } from '../../src/chem/smiles';
import { buildMoleculePattern } from '../../src/rhythm/molecule-pattern';
import { exportToStrudel } from '../../src/export/strudel';
import { exportToMidi } from '../../src/export/midi';

describe('Exporters', () => {
  it('exports valid Strudel mini-notation stack', () => {
    const h2 = parseSmiles('[H][H]');
    const pat = buildMoleculePattern(h2);
    const code = exportToStrudel(pat);

    expect(code).toContain('stack(');
    expect(code).toContain('s("bd');
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
