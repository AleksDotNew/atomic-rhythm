export interface MoleculePreset {
  readonly id: string;
  readonly name: string;
  readonly smiles: string;
  readonly description: string;
  readonly isAtom?: boolean;
}

export const PRESETS: readonly MoleculePreset[] = [
  { id: 'h', name: 'Hydrogen (Protium)', smiles: '[H]', description: '1p, 0n, 1e: fundamental atomic pulse', isAtom: true },
  { id: 'd', name: 'Deuterium [2H]', smiles: '[2H]', description: '1p, 1n, 1e: 1 kick, 1 hat, 1 snare', isAtom: true },
  { id: 't', name: 'Tritium [3H]', smiles: '[3H]', description: '1p, 2n, 1e: 1 kick, 2 hats, 1 snare', isAtom: true },
  { id: 'h2', name: 'Hydrogen Molecule (H₂)', smiles: '[H][H]', description: 'Diatomic bond, sequential 2-atom bar' },
  { id: 'o2', name: 'Oxygen (O₂)', smiles: 'O=O', description: 'Double bond (flam articulation)' },
  { id: 'n2', name: 'Nitrogen (N₂)', smiles: 'N#N', description: 'Triple bond (roll articulation)' },
  { id: 'h2o', name: 'Water (H₂O)', smiles: 'O', description: 'Polar covalent bonds, expanded hydrogens' },
  { id: 'co2', name: 'Carbon Dioxide (CO₂)', smiles: 'O=C=O', description: 'Dual double bonds with central carbon' },
  { id: 'ch4', name: 'Methane (CH₄)', smiles: 'C', description: 'Tetrahedral 4-hydrogen envelope' },
  { id: 'nh3', name: 'Ammonia (NH₃)', smiles: 'N', description: 'Pyramidal nitrogen core' },
  { id: 'nacl', name: 'Sodium Chloride (NaCl)', smiles: '[Na+].[Cl-]', description: 'Ionic crystal dissociation' },
  { id: 'ethanol', name: 'Ethanol', smiles: 'CCO', description: 'Alkyl chain with -OH group motif' },
  { id: 'acetic', name: 'Acetic Acid', smiles: 'CC(=O)O', description: 'Carbonyl and carboxyl group motifs' },
  { id: 'cyclopentane', name: 'Cyclopentane', smiles: 'C1CCCC1', description: '5-membered ring (5/8 polymetric track)' },
  { id: 'benzene', name: 'Benzene (C₆H₆)', smiles: 'c1ccccc1', description: 'Aromatic 6-ring (6/8 polyrhythm with accents)' },
  { id: 'pyridine', name: 'Pyridine', smiles: 'c1ccncc1', description: 'Heteroaromatic ring with nitrogen' },
  { id: 'caffeine', name: 'Caffeine', smiles: 'Cn1cnc2c1c(=O)n(c(=O)n2C)C', description: 'Complex purine alkaloid with dual fused rings' },
];
