export type PresetCategory = 'atom' | 'inorganic' | 'organic' | 'bio';

export interface MoleculePreset {
  readonly id: string;
  readonly name: string;
  readonly smiles: string;
  readonly description: string;
  readonly category: PresetCategory;
  readonly isAtom?: boolean;
}

export const PRESETS: readonly MoleculePreset[] = [
  // ==========================================
  // 1. Atoms & Isotopes
  // ==========================================
  {
    id: 'h',
    name: 'Hydrogen (Protium)',
    smiles: '[H]',
    description: '1p, 0n, 1e: fundamental atomic pulse (K-shell 1s¹)',
    category: 'atom',
    isAtom: true,
  },
  {
    id: 'd',
    name: 'Deuterium [2H]',
    smiles: '[2H]',
    description: '1p, 1n, 1e: 1 kick, 1 hat, 1 snare',
    category: 'atom',
    isAtom: true,
  },
  {
    id: 't',
    name: 'Tritium [3H]',
    smiles: '[3H]',
    description: '1p, 2n, 1e: 1 kick, 2 hats, 1 snare',
    category: 'atom',
    isAtom: true,
  },
  {
    id: 'he',
    name: 'Helium',
    smiles: '[He]',
    description: '2p, 2n, 2e: filled K-shell (1s²) noble gas duplex',
    category: 'atom',
    isAtom: true,
  },
  {
    id: 'c14',
    name: 'Carbon-14 [14C]',
    smiles: '[14C]',
    description: '6p, 8n, 6e: unstable radiocarbon, polyrhythmic neutron accent',
    category: 'atom',
    isAtom: true,
  },
  {
    id: 'fe56',
    name: 'Iron-56 [56Fe]',
    smiles: '[56Fe]',
    description: '26p, 30n, 26e: cosmic binding energy peak, dense d-shell groove',
    category: 'atom',
    isAtom: true,
  },
  {
    id: 'au',
    name: 'Gold [197Au]',
    smiles: '[Au]',
    description: '79p, 118n, 79e: relativistic heavy atom, dense f/d-shell polyrhythm',
    category: 'atom',
    isAtom: true,
  },

  // ==========================================
  // 2. Inorganic Chemistry (Acids, Salts, Oxides)
  // ==========================================
  {
    id: 'h2',
    name: 'Hydrogen Molecule (H₂)',
    smiles: '[H][H]',
    description: 'Diatomic covalent bond, sequential 2-atom bar',
    category: 'inorganic',
  },
  {
    id: 'o2',
    name: 'Oxygen (O₂)',
    smiles: 'O=O',
    description: 'Double covalent bond (flam articulation)',
    category: 'inorganic',
  },
  {
    id: 'o3',
    name: 'Ozone (O₃)',
    smiles: '[O-][O+]=O',
    description: 'Resonance triatomic radical, bent dipole rhythm',
    category: 'inorganic',
  },
  {
    id: 'n2',
    name: 'Nitrogen (N₂)',
    smiles: 'N#N',
    description: 'Triple covalent bond (roll articulation)',
    category: 'inorganic',
  },
  {
    id: 'h2o',
    name: 'Water (H₂O)',
    smiles: 'O',
    description: 'Polar covalent V-shape (104.5°), 2-hydrogen envelope',
    category: 'inorganic',
  },
  {
    id: 'h2o2',
    name: 'Hydrogen Peroxide (H₂O₂)',
    smiles: 'OO',
    description: 'Reactive peroxide O-O link with skew dihedral rhythm',
    category: 'inorganic',
  },
  {
    id: 'co2',
    name: 'Carbon Dioxide (CO₂)',
    smiles: 'O=C=O',
    description: 'Linear dual double bonds with central carbon',
    category: 'inorganic',
  },
  {
    id: 'co',
    name: 'Carbon Monoxide (CO)',
    smiles: '[C-]#[O+]',
    description: 'Isoelectronic triple bond with dipole inversion',
    category: 'inorganic',
  },
  {
    id: 'nh3',
    name: 'Ammonia (NH₃)',
    smiles: 'N',
    description: 'Trigonal pyramidal core with lone-pair inversion pulse',
    category: 'inorganic',
  },
  {
    id: 'so2',
    name: 'Sulfur Dioxide (SO₂)',
    smiles: 'O=S=O',
    description: 'Bent resonant oxide with sulfur lone-pair swing',
    category: 'inorganic',
  },
  {
    id: 'h2so4',
    name: 'Sulfuric Acid (H₂SO₄)',
    smiles: 'OS(=O)(=O)O',
    description: 'Tetrahedral hexavalent sulfur with dual oxo flams (from README)',
    category: 'inorganic',
  },
  {
    id: 'hno3',
    name: 'Nitric Acid (HNO₃)',
    smiles: 'O[N+](=O)[O-]',
    description: 'Planar nitrate resonance with formal charge polarity',
    category: 'inorganic',
  },
  {
    id: 'h3po4',
    name: 'Phosphoric Acid (H₃PO₄)',
    smiles: 'OP(=O)(O)O',
    description: 'Triprotic mineral acid with tetrahedral phosphorus anchor',
    category: 'inorganic',
  },
  {
    id: 'h4sio4',
    name: 'Orthosilicic Acid (H₄SiO₄)',
    smiles: 'O[Si](O)(O)O',
    description: 'Silicate precursor, tetrahedral quartz crystal building block',
    category: 'inorganic',
  },
  {
    id: 'nacl',
    name: 'Sodium Chloride (NaCl)',
    smiles: '[Na+].[Cl-]',
    description: 'Dissociated ionic salt crystal with phase swing',
    category: 'inorganic',
  },
  {
    id: 'mgcl2',
    name: 'Magnesium Chloride (MgCl₂)',
    smiles: '[Mg+2].[Cl-].[Cl-]',
    description: 'Bivalent mineral sea salt with 1:2 ionic counterpoint',
    category: 'inorganic',
  },
  {
    id: 'caco3',
    name: 'Calcium Carbonate (CaCO₃)',
    smiles: '[Ca+2].[O-]C(=O)[O-]',
    description: 'Calcite / marble ionic grid with carbonate planar motif',
    category: 'inorganic',
  },
  {
    id: 'cuso4',
    name: 'Copper(II) Sulfate (CuSO₄)',
    smiles: '[Cu+2].[O-]S(=O)(=O)[O-]',
    description: 'Blue vitriol crystal, d-block transition metal pulse',
    category: 'inorganic',
  },
  {
    id: 'kmno4',
    name: 'Potassium Permanganate (KMnO₄)',
    smiles: '[K+].[O-][Mn](=O)(=O)=O',
    description: 'Deep purple strong oxidizer, high-valent manganese center',
    category: 'inorganic',
  },
  {
    id: 'fecl3',
    name: 'Iron(III) Chloride (FeCl₃)',
    smiles: '[Fe+3].[Cl-].[Cl-].[Cl-]',
    description: 'Trivalent iron transition metal core with 3 ionic chlorides',
    category: 'inorganic',
  },
  {
    id: 'naoh',
    name: 'Sodium Hydroxide (NaOH)',
    smiles: '[Na+].[OH-]',
    description: 'Strong alkali caustic soda with ionic hydroxide radical',
    category: 'inorganic',
  },

  // ==========================================
  // 3. Organic Chemistry & Hydrocarbons
  // ==========================================
  {
    id: 'ch4',
    name: 'Methane (CH₄)',
    smiles: 'C',
    description: 'Tetrahedral sp³ 4-hydrogen envelope',
    category: 'organic',
  },
  {
    id: 'c2h6',
    name: 'Ethane (C₂H₆)',
    smiles: 'CC',
    description: 'Saturated alkane with central C-C single bond',
    category: 'organic',
  },
  {
    id: 'c2h4',
    name: 'Ethylene (C₂H₄)',
    smiles: 'C=C',
    description: 'Planar sp² alkene with central double bond flam',
    category: 'organic',
  },
  {
    id: 'c2h2',
    name: 'Acetylene (C₂H₂)',
    smiles: 'C#C',
    description: 'Linear sp alkyne with high-energy triple bond roll',
    category: 'organic',
  },
  {
    id: 'cyclopentane',
    name: 'Cyclopentane',
    smiles: 'C1CCCC1',
    description: '5-membered ring (5/8 quintuple meter)',
    category: 'organic',
  },
  {
    id: 'cyclohexane',
    name: 'Cyclohexane',
    smiles: 'C1CCCCC1',
    description: 'Aliphatic 6-ring (puckered chair conformation)',
    category: 'organic',
  },
  {
    id: 'benzene',
    name: 'Benzene (C₆H₆)',
    smiles: 'c1ccccc1',
    description: 'Aromatic 6-ring (6/8 polyrhythm with 1 & 4 accents)',
    category: 'organic',
  },
  {
    id: 'pyridine',
    name: 'Pyridine',
    smiles: 'c1ccncc1',
    description: 'Heteroaromatic ring with nitrogen electronegativity accent',
    category: 'organic',
  },
  {
    id: 'naphthalene',
    name: 'Naphthalene',
    smiles: 'c1ccc2ccccc2c1',
    description: 'Bicyclic fused aromatic rings, complex 10-carbon progression',
    category: 'organic',
  },
  {
    id: 'ethanol',
    name: 'Ethanol',
    smiles: 'CCO',
    description: 'Alkyl chain with terminal -OH group motif',
    category: 'organic',
  },
  {
    id: 'acetone',
    name: 'Acetone',
    smiles: 'CC(=O)C',
    description: 'Symmetrical ketone with central carbonyl C=O flam',
    category: 'organic',
  },
  {
    id: 'acetic',
    name: 'Acetic Acid',
    smiles: 'CC(=O)O',
    description: 'Carboxyl group (-COOH) motif with acidic proton',
    category: 'organic',
  },

  // ==========================================
  // 4. Biomolecules & Pharmaceuticals
  // ==========================================
  {
    id: 'aspirin',
    name: 'Aspirin (Acetylsalicylic Acid)',
    smiles: 'CC(=O)Oc1ccccc1C(=O)O',
    description: 'Ester-functionalized benzene with carboxylic acid (from README)',
    category: 'bio',
  },
  {
    id: 'glucose',
    name: 'D-Glucose',
    smiles: 'OCC1OC(O)C(O)C(O)C1O',
    description: 'Pyranose sugar ring with five hydroxyl syncopations (from README)',
    category: 'bio',
  },
  {
    id: 'atp',
    name: 'ATP (Adenosine Triphosphate)',
    smiles: 'c1nc(c2c(n1)n(cn2)C3C(C(C(O3)COP(=O)(O)OP(=O)(O)OP(=O)(O)O)O)O)N',
    description: 'Universal energy currency, adenine base + ribose + tripolyphosphate chain (from README)',
    category: 'bio',
  },
  {
    id: 'caffeine',
    name: 'Caffeine',
    smiles: 'Cn1cnc2c1c(=O)n(c(=O)n2C)C',
    description: 'Complex purine alkaloid with dual fused heterocyclic rings',
    category: 'bio',
  },
  {
    id: 'glycine',
    name: 'Glycine',
    smiles: 'NCC(=O)O',
    description: 'Simplest proteinogenic amino acid (amine + carboxyl)',
    category: 'bio',
  },
  {
    id: 'urea',
    name: 'Urea',
    smiles: 'NC(=O)N',
    description: 'Symmetrical diamide with dual amino groups',
    category: 'bio',
  },
  {
    id: 'paracetamol',
    name: 'Paracetamol (Acetaminophen)',
    smiles: 'CC(=O)Nc1ccc(O)cc1',
    description: 'Analgesic with phenol ring and acetamide chain',
    category: 'bio',
  },
  {
    id: 'dopamine',
    name: 'Dopamine',
    smiles: 'NCCc1ccc(O)c(O)c1',
    description: 'Catecholamine neurotransmitter with catechol ring and ethylamine tail',
    category: 'bio',
  },
  {
    id: 'serotonin',
    name: 'Serotonin',
    smiles: 'NCCc1c[nH]c2ccc(O)cc12',
    description: 'Tryptamine neurotransmitter with bicyclic indole core',
    category: 'bio',
  },
  {
    id: 'vitaminc',
    name: 'Ascorbic Acid (Vitamin C)',
    smiles: 'OCC(O)C1OC(=O)C(O)=C1O',
    description: 'Endiol lactone antioxidant ring with polyol chain',
    category: 'bio',
  },
];
