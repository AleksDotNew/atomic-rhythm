import { ElementData, getElement } from './elements';

export interface AtomConfig {
  readonly element: ElementData;
  readonly massNumber: number; // A
  readonly charge: number;     // e.g. 0, +1, -1
  readonly protons: number;    // Z
  readonly neutrons: number;   // A - Z
  readonly electrons: number;  // Z - charge
  readonly shells: readonly number[]; // [K, L, M, N, ...]
  readonly valenceElectrons: number;
  readonly typicalValence: number;
}

interface Subshell {
  readonly n: number;
  readonly capacity: number;
}

// Order of filling according to Madelung / Aufbau rule
const AUFBAU_ORDER: readonly Subshell[] = [
  { n: 1, capacity: 2 },  // 1s
  { n: 2, capacity: 2 },  // 2s
  { n: 2, capacity: 6 },  // 2p
  { n: 3, capacity: 2 },  // 3s
  { n: 3, capacity: 6 },  // 3p
  { n: 4, capacity: 2 },  // 4s
  { n: 3, capacity: 10 }, // 3d
  { n: 4, capacity: 6 },  // 4p
  { n: 5, capacity: 2 },  // 5s
  { n: 4, capacity: 10 }, // 4d
  { n: 5, capacity: 6 },  // 5p
  { n: 6, capacity: 2 },  // 6s
  { n: 4, capacity: 14 }, // 4f
  { n: 5, capacity: 10 }, // 5d
  { n: 6, capacity: 6 },  // 6p
  { n: 7, capacity: 2 },  // 7s
  { n: 5, capacity: 14 }, // 5f
  { n: 6, capacity: 10 }, // 6d
  { n: 7, capacity: 6 },  // 7p
];

export function calculateShells(totalElectrons: number): number[] {
  if (totalElectrons <= 0) return [];
  const shellMap = new Map<number, number>();
  let remaining = totalElectrons;

  for (const sub of AUFBAU_ORDER) {
    if (remaining <= 0) break;
    const count = Math.min(remaining, sub.capacity);
    shellMap.set(sub.n, (shellMap.get(sub.n) || 0) + count);
    remaining -= count;
  }

  // Find max n
  let maxN = 0;
  for (const n of shellMap.keys()) {
    if (n > maxN) maxN = n;
  }

  const result: number[] = [];
  for (let n = 1; n <= maxN; n++) {
    result.push(shellMap.get(n) || 0);
  }
  return result;
}

export function getTypicalValence(element: ElementData): number {
  const g = element.group;
  if (element.symbol === 'H') return 1;
  if (g === 1) return 1;
  if (g === 2) return 2;
  if (g === 13) return 3;
  if (g === 14) return 4;
  if (g === 15) return 3;
  if (g === 16) return 2;
  if (g === 17) return 1;
  if (g === 18) return 0;
  // Transition / f-block elements default typical valence
  return 2;
}

export function createAtom(
  symbolOrZ: string | number,
  massNumber?: number,
  charge: number = 0
): AtomConfig {
  const element = getElement(symbolOrZ);
  const A = massNumber !== undefined ? massNumber : element.mostAbundantA;
  const protons = element.z;
  const neutrons = Math.max(0, A - protons);
  const electrons = Math.max(0, protons - charge);
  const shells = calculateShells(electrons);
  const valenceElectrons = shells.length > 0 ? shells[shells.length - 1] : 0;
  const typicalValence = getTypicalValence(element);

  return {
    element,
    massNumber: A,
    charge,
    protons,
    neutrons,
    electrons,
    shells,
    valenceElectrons,
    typicalValence,
  };
}
