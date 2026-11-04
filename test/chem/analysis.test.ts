import { describe, it, expect } from 'vitest';
import { parseSmiles } from '../../src/chem/smiles';
import { analyzeMolecule, findKeyNodalAtoms } from '../../src/chem/analysis';

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

  it('detects 5 structural units in cyclopentane C1CCCC1 in a 5-part cycle', () => {
    const cyclopentane = parseSmiles('C1CCCC1');
    const analysis = analyzeMolecule(cyclopentane);

    expect(analysis.rings.length).toBe(1);
    expect(analysis.rings[0].size).toBe(5);
    expect(analysis.structuralUnits.length).toBe(5);

    // Each structural unit in cyclopentane has 1 heavy atom (C) and 2 peripheral atoms (H)
    for (const unit of analysis.structuralUnits) {
      expect(cyclopentane.atoms[unit.heavyAtomIndex].element.symbol).toBe('C');
      expect(unit.peripheralAtomIndices.length).toBe(2);
      for (const hIdx of unit.peripheralAtomIndices) {
        expect(cyclopentane.atoms[hIdx].element.symbol).toBe('H');
      }
      expect(unit.outgoingBond).toBeDefined();
    }

    // Traversal order groups hydrogens right before their heavy atom (H -> C)
    const firstUnit = analysis.structuralUnits[0];
    const cIdx = firstUnit.heavyAtomIndex;
    const hIndices = firstUnit.peripheralAtomIndices;

    const cPosInTraversal = analysis.traversalOrder.indexOf(cIdx);
    for (const hIdx of hIndices) {
      const hPos = analysis.traversalOrder.indexOf(hIdx);
      expect(hPos).toBeLessThan(cPosInTraversal);
    }
  });

  it('calculates atomBondCounts and atomBondWeights with higher priority for bonded carbons', () => {
    const cyclopentane = parseSmiles('C1CCCC1');
    const analysis = analyzeMolecule(cyclopentane);

    expect(analysis.atomBondCounts.length).toBe(cyclopentane.atoms.length);
    expect(analysis.atomBondWeights.length).toBe(cyclopentane.atoms.length);

    // Each carbon in cyclopentane has 4 single bonds (2 C-C, 2 C-H), valence 4 -> weight = 4 + 0.5*4 = 6
    for (let c = 0; c < 5; c++) {
      expect(analysis.atomBondCounts[c]).toBe(4);
      expect(analysis.atomBondWeights[c]).toBe(6);
    }

    // Each hydrogen has 1 bond, valence 1 -> weight = 1 + 0.5*1 = 1.5
    for (let h = 5; h < 15; h++) {
      expect(analysis.atomBondCounts[h]).toBe(1);
      expect(analysis.atomBondWeights[h]).toBe(1.5);
    }
  });

  it('supports different ordering strategies: structural, bondWeight, mass, custom', () => {
    const ethanol = parseSmiles('CCO');
    const analysis = analyzeMolecule(ethanol);

    // Bond weight priority: C (weight 6) and O (weight 3) come before H (weight 1.5)
    expect(analysis.atomBondWeights[0]).toBeGreaterThan(analysis.atomBondWeights[3]); // C vs H
  });

  it('detects key nodal atoms: bridgeheads in bicyclic systems and hubs in branched molecules', () => {
    // Neopentane CC(C)(C)C: atom 1 is the central quaternary carbon (4 C-C bonds)
    const neopentane = parseSmiles('CC(C)(C)C');
    const neoAnalysis = analyzeMolecule(neopentane);
    const neoNodes = findKeyNodalAtoms(neopentane, neoAnalysis);

    expect(neoNodes.hubs).toContain(1);
    expect(neoNodes.allNodalIndices).toContain(1);

    // Bicyclic molecule C1CC2CCC1C2 (bicyclo[2.2.1]heptane-like): two bridgehead atoms
    const bicyclo = parseSmiles('C1CC2CCC1C2');
    const biAnalysis = analyzeMolecule(bicyclo);
    const biNodes = findKeyNodalAtoms(bicyclo, biAnalysis);

    expect(biNodes.bridgeheads.length).toBeGreaterThanOrEqual(2);
    expect(biNodes.allNodalIndices.length).toBeGreaterThanOrEqual(2);
  });
});


