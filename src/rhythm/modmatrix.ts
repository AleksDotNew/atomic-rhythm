import { AtomConfig } from '../chem/atom';

export type ModSource =
  | 'protons'
  | 'neutrons'
  | 'electrons'
  | 'electronsInShell'
  | 'shellCount'
  | 'period'
  | 'valenceElectrons'
  | 'typicalValence'
  | 'electronegativity'
  | 'atomicMass'
  | 'ionizationEnergy'
  | 'bondCount'
  | 'bondWeight';

export type ModDest = 'hits' | 'steps' | 'rotation' | 'velocity';

export interface ModRoute {
  readonly voice: string; // 'proton', 'neutron', 'electron.s{i}', etc.
  readonly source: ModSource;
  readonly dest: ModDest;
  readonly shellIndex?: number; // 0-based: 0=K, 1=L, 2=M...
  readonly transform?: (val: number) => number;
}

export interface ModulationMatrix {
  readonly routes: readonly ModRoute[];
}

export function evaluateRoute(
  route: ModRoute,
  atom: AtomConfig,
  bondCount?: number,
  bondWeight?: number
): number {
  let rawValue = 0;
  switch (route.source) {
    case 'protons':
      rawValue = atom.protons;
      break;
    case 'neutrons':
      rawValue = atom.neutrons;
      break;
    case 'electrons':
      rawValue = atom.electrons;
      break;
    case 'electronsInShell': {
      const idx = route.shellIndex ?? 0;
      rawValue = idx < atom.shells.length ? atom.shells[idx] : 0;
      break;
    }
    case 'shellCount':
      rawValue = atom.shells.length;
      break;
    case 'period':
      rawValue = atom.element.period;
      break;
    case 'group':
      rawValue = atom.element.group;
      break;
    case 'valenceElectrons':
      rawValue = atom.valenceElectrons;
      break;
    case 'typicalValence':
      rawValue = atom.typicalValence;
      break;
    case 'electronegativity':
      rawValue = atom.element.electronegativity ?? 2.2;
      break;
    case 'atomicMass':
      rawValue = atom.element.atomicMass;
      break;
    case 'ionizationEnergy':
      rawValue = atom.element.ionizationEnergy1;
      break;
    case 'bondCount':
      rawValue = bondCount ?? 0;
      break;
    case 'bondWeight':
      rawValue = bondWeight ?? 0;
      break;
  }

  if (route.transform) {
    return route.transform(rawValue);
  }
  return rawValue;
}

export const DEFAULT_MOD_MATRIX: ModulationMatrix = {
  routes: [
    { voice: 'proton', source: 'protons', dest: 'hits' },
    { voice: 'neutron', source: 'neutrons', dest: 'hits' },
    { voice: 'electron.s1', source: 'electronsInShell', dest: 'hits', shellIndex: 0 },
    { voice: 'electron.s2', source: 'electronsInShell', dest: 'hits', shellIndex: 1 },
    { voice: 'electron.s3', source: 'electronsInShell', dest: 'hits', shellIndex: 2 },
    { voice: 'electron.s4', source: 'electronsInShell', dest: 'hits', shellIndex: 3 },
    { voice: 'electron.s5', source: 'electronsInShell', dest: 'hits', shellIndex: 4 },
    { voice: 'electron.s6', source: 'electronsInShell', dest: 'hits', shellIndex: 5 },
    { voice: 'electron.s7', source: 'electronsInShell', dest: 'hits', shellIndex: 6 },
  ],
};
