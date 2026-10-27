import { describe, it, expect } from 'vitest';
import { createAtom, calculateShells } from '../../src/chem/atom';

describe('createAtom and calculateShells', () => {
  it('creates Protium (standard Hydrogen)', () => {
    const h = createAtom('H');
    expect(h.protons).toBe(1);
    expect(h.neutrons).toBe(0);
    expect(h.electrons).toBe(1);
    expect(h.shells).toEqual([1]);
    expect(h.valenceElectrons).toBe(1);
    expect(h.typicalValence).toBe(1);
  });

  it('creates Deuterium ([2H]) and Tritium ([3H])', () => {
    const d = createAtom('H', 2);
    expect(d.protons).toBe(1);
    expect(d.neutrons).toBe(1);
    expect(d.electrons).toBe(1);

    const t = createAtom('H', 3);
    expect(t.protons).toBe(1);
    expect(t.neutrons).toBe(2);
    expect(t.electrons).toBe(1);
  });

  it('handles ion charges: Na+ and Cl-', () => {
    const naPlus = createAtom('Na', 23, 1);
    expect(naPlus.protons).toBe(11);
    expect(naPlus.electrons).toBe(10);
    expect(naPlus.shells).toEqual([2, 8]);

    const clMinus = createAtom('Cl', 35, -1);
    expect(clMinus.protons).toBe(17);
    expect(clMinus.electrons).toBe(18);
    expect(clMinus.shells).toEqual([2, 8, 8]);
  });

  it('calculates electron configurations for atoms according to Madelung rule', () => {
    // Carbon (6e): 1s2 2s2 2p2 -> [2, 4]
    expect(calculateShells(6)).toEqual([2, 4]);
    // Argon (18e): 1s2 2s2 2p6 3s2 3p6 -> [2, 8, 8]
    expect(calculateShells(18)).toEqual([2, 8, 8]);
    // Iron (26e): 1s2 2s2 2p6 3s2 3p6 4s2 3d6 -> [2, 8, 14, 2]
    expect(calculateShells(26)).toEqual([2, 8, 14, 2]);
    // Krypton (36e): [2, 8, 18, 8]
    expect(calculateShells(36)).toEqual([2, 8, 18, 8]);
  });
});
