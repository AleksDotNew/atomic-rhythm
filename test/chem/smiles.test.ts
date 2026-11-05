import { describe, it, expect } from 'vitest';
import { parseSmiles } from '../../src/chem/smiles';
import { analyzeMolecule } from '../../src/chem/analysis';
import { buildMoleculePattern } from '../../src/rhythm/molecule-pattern';
import { computeMoleculeLayout } from '../../src/viz/layout';

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

  it('parses extended candidate molecules without error', () => {
    const candidates = [
      // Atoms & Isotopes
      { name: 'Hydrogen (Protium)', smiles: '[H]' },
      { name: 'Deuterium [2H]', smiles: '[2H]' },
      { name: 'Tritium [3H]', smiles: '[3H]' },
      { name: 'Helium', smiles: '[He]' },
      { name: 'Carbon-14', smiles: '[14C]' },
      { name: 'Iron-56', smiles: '[56Fe]' },
      { name: 'Gold', smiles: '[Au]' },
      // Inorganic & Salts
      { name: 'Hydrogen Molecule (H₂)', smiles: '[H][H]' },
      { name: 'Oxygen (O₂)', smiles: 'O=O' },
      { name: 'Ozone (O₃)', smiles: '[O-][O+]=O' },
      { name: 'Nitrogen (N₂)', smiles: 'N#N' },
      { name: 'Water (H₂O)', smiles: 'O' },
      { name: 'Hydrogen Peroxide (H₂O₂)', smiles: 'OO' },
      { name: 'Carbon Dioxide (CO₂)', smiles: 'O=C=O' },
      { name: 'Carbon Monoxide (CO)', smiles: '[C-]#[O+]' },
      { name: 'Ammonia (NH₃)', smiles: 'N' },
      { name: 'Sulfur Dioxide (SO₂)', smiles: 'O=S=O' },
      { name: 'Sulfuric Acid (H₂SO₄)', smiles: 'OS(=O)(=O)O' },
      { name: 'Nitric Acid (HNO₃)', smiles: 'O[N+](=O)[O-]' },
      { name: 'Phosphoric Acid (H₃PO₄)', smiles: 'OP(=O)(O)O' },
      { name: 'Orthosilicic Acid (H₄SiO₄)', smiles: 'O[Si](O)(O)O' },
      { name: 'Sodium Chloride (NaCl)', smiles: '[Na+].[Cl-]' },
      { name: 'Magnesium Chloride (MgCl₂)', smiles: '[Mg+2].[Cl-].[Cl-]' },
      { name: 'Calcium Carbonate (CaCO₃)', smiles: '[Ca+2].[O-]C(=O)[O-]' },
      { name: 'Copper(II) Sulfate (CuSO₄)', smiles: '[Cu+2].[O-]S(=O)(=O)[O-]' },
      { name: 'Potassium Permanganate (KMnO₄)', smiles: '[K+].[O-][Mn](=O)(=O)=O' },
      { name: 'Iron(III) Chloride (FeCl₃)', smiles: '[Fe+3].[Cl-].[Cl-].[Cl-]' },
      { name: 'Sodium Hydroxide (NaOH)', smiles: '[Na+].[OH-]' },
      // Organics & Rings
      { name: 'Methane (CH₄)', smiles: 'C' },
      { name: 'Ethane (C₂H₆)', smiles: 'CC' },
      { name: 'Ethylene (C₂H₄)', smiles: 'C=C' },
      { name: 'Acetylene (C₂H₂)', smiles: 'C#C' },
      { name: 'Cyclopentane (C₅H₁₀)', smiles: 'C1CCCC1' },
      { name: 'Cyclohexane (C₆H₁₂)', smiles: 'C1CCCCC1' },
      { name: 'Benzene (C₆H₆)', smiles: 'c1ccccc1' },
      { name: 'Pyridine (C₅H₅N)', smiles: 'c1ccncc1' },
      { name: 'Naphthalene (C₁₀H₈)', smiles: 'c1ccc2ccccc2c1' },
      { name: 'Ethanol (C₂H₅OH)', smiles: 'CCO' },
      { name: 'Acetone (CH₃COCH₃)', smiles: 'CC(=O)C' },
      { name: 'Acetic Acid (CH₃COOH)', smiles: 'CC(=O)O' },
      // Bio & Pharma
      { name: 'Aspirin', smiles: 'CC(=O)Oc1ccccc1C(=O)O' },
      { name: 'Glucose', smiles: 'OCC1OC(O)C(O)C(O)C1O' },
      { name: 'ATP', smiles: 'c1nc(c2c(n1)n(cn2)C3C(C(C(O3)COP(=O)(O)OP(=O)(O)OP(=O)(O)O)O)O)N' },
      { name: 'Caffeine', smiles: 'Cn1cnc2c1c(=O)n(c(=O)n2C)C' },
      { name: 'Glycine', smiles: 'NCC(=O)O' },
      { name: 'Urea', smiles: 'NC(=O)N' },
      { name: 'Paracetamol', smiles: 'CC(=O)Nc1ccc(O)cc1' },
      { name: 'Dopamine', smiles: 'NCCc1ccc(O)c(O)c1' },
      { name: 'Serotonin', smiles: 'NCCc1c[nH]c2ccc(O)cc12' },
      { name: 'Ascorbic Acid (Vitamin C)', smiles: 'OCC(O)C1OC(=O)C(O)=C1O' },
    ];

    for (const c of candidates) {
      const mol = parseSmiles(c.smiles, c.name);
      expect(mol.atoms.length).toBeGreaterThan(0);
      const analysis = analyzeMolecule(mol);
      const layout = computeMoleculeLayout(mol, analysis, 520, 340);
      expect(layout.length).toBe(mol.atoms.length);
      const pattern = buildMoleculePattern(mol);
      expect(pattern.tracks.length).toBeGreaterThan(0);
    }
  });
});
