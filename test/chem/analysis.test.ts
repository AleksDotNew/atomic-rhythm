import { describe, it, expect } from 'vitest';
import { parseSmiles } from '../../src/chem/smiles';
import { analyzeMolecule } from '../../src/chem/analysis';

describe('analyzeMolecule', () => {
  it('detects 6-membered aromatic ring in benzene c1ccccc1', () => {
    const benzene = parseSmiles('c1ccccc1');
    const analysis = analyzeMolecule(benzene);
    expect(analysis.rings.length).toBe(1);
    expect(analysis.rings[0].size).toBe(6);
    expect(analysis.rings[0].isAromatic).toBe(true);
  });

  it('determines bond types by delta chi (H2O vs NaCl)', () => {
    const h2o = parseSmiles('O');
    const h2oAnalysis = analyzeMolecule(h2o);
    // O-H delta chi = 3.44 - 2.20 = 1.24 -> covalent-polar
    expect(h2oAnalysis.bonds.length).toBeGreaterThan(0);
    expect(h2oAnalysis.bonds[0].type).toBe('covalent-polar');
    expect(h2oAnalysis.bonds[0].deltaChi).toBeCloseTo(1.24, 2);

    const nacl = parseSmiles('[Na+].[Cl-]');
    const naclAnalysis = analyzeMolecule(nacl);
    // Non-bonded ionic compound
    expect(naclAnalysis.bonds.length).toBe(0);
  });

  it('identifies functional groups: ethanol CCO has OH', () => {
    const ethanol = parseSmiles('CCO');
    const analysis = analyzeMolecule(ethanol);
    expect(analysis.functionalGroups.some(g => g.type === 'OH')).toBe(true);
  });

  it('produces a deterministic DFS traversal order covering all atoms', () => {
    const ethanol = parseSmiles('CCO');
    const analysis = analyzeMolecule(ethanol);
    expect(analysis.traversalOrder.length).toBe(ethanol.atoms.length);
    expect(new Set(analysis.traversalOrder).size).toBe(ethanol.atoms.length);
  });
});
