import { describe, it, expect } from 'vitest';
import { parseSmiles } from '../../src/chem/smiles';

describe('parseSmiles', () => {
  it('parses diatomic hydrogen [H][H]', () => {
    const mol = parseSmiles('[H][H]');
    expect(mol.atoms.length).toBe(2);
    expect(mol.bonds.length).toBe(1);
    expect(mol.bonds[0].order).toBe(1);
  });

  it('parses water O with implicit hydrogens expanded', () => {
    const mol = parseSmiles('O');
    // Oxygen + 2 explicit Hydrogens
    expect(mol.atoms.length).toBe(3);
    expect(mol.atoms.filter(a => a.element.symbol === 'H').length).toBe(2);
    expect(mol.bonds.length).toBe(2);
  });

  it('parses double and triple bonds: O=O, N#N, C=C', () => {
    const o2 = parseSmiles('O=O');
    expect(o2.bonds.some(b => b.order === 2)).toBe(true);

    const n2 = parseSmiles('N#N');
    expect(n2.bonds.some(b => b.order === 3)).toBe(true);
  });

  it('parses ring closures: cyclohexane C1CCCCC1 and benzene c1ccccc1', () => {
    const c6h12 = parseSmiles('C1CCCCC1');
    expect(c6h12.atoms.filter(a => a.element.symbol === 'C').length).toBe(6);

    const benzene = parseSmiles('c1ccccc1');
    expect(benzene.atoms.filter(a => a.element.symbol === 'C').length).toBe(6);
    expect(benzene.bonds.some(b => b.isAromatic)).toBe(true);
  });

  it('parses disconnected components: NaCl [Na+].[Cl-]', () => {
    const nacl = parseSmiles('[Na+].[Cl-]');
    expect(nacl.atoms.length).toBe(2);
    expect(nacl.bonds.length).toBe(0);
  });

  it('throws descriptive error on syntax errors', () => {
    expect(() => parseSmiles('C1CC')).toThrow(/ring/i);
    expect(() => parseSmiles('C(C')).toThrow(/branch/i);
  });
});
