import { Bond, Molecule } from './molecule';

export type BondType = 'covalent-nonpolar' | 'covalent-polar' | 'ionic';

export interface AnalyzedBond {
  readonly bond: Bond;
  readonly type: BondType;
  readonly deltaChi: number;
}

export interface RingInfo {
  readonly size: number;
  readonly atomIndices: readonly number[];
  readonly isAromatic: boolean;
}

export interface FunctionalGroup {
  readonly type: 'OH' | 'NH2' | 'C=O' | 'COOH';
  readonly atomIndices: readonly number[];
}

export interface MolecularAnalysis {
  readonly rings: readonly RingInfo[];
  readonly bonds: readonly AnalyzedBond[];
  readonly functionalGroups: readonly FunctionalGroup[];
  readonly traversalOrder: readonly number[]; // DFS atom index sequence
}

export function analyzeMolecule(mol: Molecule): MolecularAnalysis {
  const analyzedBonds = analyzeBonds(mol);
  const rings = findRings(mol);
  const functionalGroups = findFunctionalGroups(mol);
  const traversalOrder = computeDfsTraversal(mol);

  return {
    rings,
    bonds: analyzedBonds,
    functionalGroups,
    traversalOrder,
  };
}

function analyzeBonds(mol: Molecule): AnalyzedBond[] {
  return mol.bonds.map(bond => {
    const atomA = mol.atoms[bond.atomA];
    const atomB = mol.atoms[bond.atomB];
    const chiA = atomA?.element.electronegativity ?? 2.2;
    const chiB = atomB?.element.electronegativity ?? 2.2;
    const deltaChi = Math.abs(chiA - chiB);

    let type: BondType = 'covalent-nonpolar';
    if (deltaChi > 1.7) {
      type = 'ionic';
    } else if (deltaChi >= 0.4) {
      type = 'covalent-polar';
    }

    return {
      bond,
      type,
      deltaChi,
    };
  });
}

function buildAdjacencyList(mol: Molecule): Map<number, number[]> {
  const adj = new Map<number, number[]>();
  for (let i = 0; i < mol.atoms.length; i++) {
    adj.set(i, []);
  }
  for (const b of mol.bonds) {
    adj.get(b.atomA)?.push(b.atomB);
    adj.get(b.atomB)?.push(b.atomA);
  }
  return adj;
}

function findRings(mol: Molecule): RingInfo[] {
  const adj = buildAdjacencyList(mol);
  const rings: RingInfo[] = [];
  const visitedPaths = new Set<string>();

  // Simple cycle detection for small rings (size 3 to 8)
  for (let start = 0; start < mol.atoms.length; start++) {
    const dfs = (curr: number, path: number[]) => {
      if (path.length > 8) return;
      const neighbors = adj.get(curr) || [];
      for (const next of neighbors) {
        if (next === start && path.length >= 3) {
          // Found cycle
          const sorted = [...path].sort((a, b) => a - b).join(',');
          if (!visitedPaths.has(sorted)) {
            visitedPaths.add(sorted);
            // Check aromaticity
            const isAromatic = path.every((atomIdx, i) => {
              const nextIdx = path[(i + 1) % path.length];
              const bond = mol.bonds.find(
                b => (b.atomA === atomIdx && b.atomB === nextIdx) || (b.atomA === nextIdx && b.atomB === atomIdx)
              );
              return bond?.isAromatic ?? false;
            });
            rings.push({
              size: path.length,
              atomIndices: [...path],
              isAromatic,
            });
          }
        } else if (!path.includes(next) && next > start) {
          dfs(next, [...path, next]);
        }
      }
    };
    dfs(start, [start]);
  }

  return rings;
}

function findFunctionalGroups(mol: Molecule): FunctionalGroup[] {
  const groups: FunctionalGroup[] = [];
  const adj = buildAdjacencyList(mol);

  for (let i = 0; i < mol.atoms.length; i++) {
    const atom = mol.atoms[i];
    const neighbors = adj.get(i) || [];

    // Check for C=O or COOH
    if (atom.element.symbol === 'C') {
      let doubleBondO = -1;
      let singleBondO = -1;

      for (const n of neighbors) {
        const nAtom = mol.atoms[n];
        if (nAtom.element.symbol === 'O') {
          const bond = mol.bonds.find(
            b => (b.atomA === i && b.atomB === n) || (b.atomA === n && b.atomB === i)
          );
          if (bond?.order === 2) {
            doubleBondO = n;
          } else if (bond?.order === 1) {
            // Check if this O has an H
            const oNeighbors = adj.get(n) || [];
            const hasH = oNeighbors.some(on => mol.atoms[on].element.symbol === 'H');
            if (hasH) singleBondO = n;
          }
        }
      }

      if (doubleBondO !== -1 && singleBondO !== -1) {
        groups.push({
          type: 'COOH',
          atomIndices: [i, doubleBondO, singleBondO],
        });
      } else if (doubleBondO !== -1) {
        groups.push({
          type: 'C=O',
          atomIndices: [i, doubleBondO],
        });
      }
    }

    // Check for OH (not part of COOH)
    if (atom.element.symbol === 'O') {
      const hNeighbors = neighbors.filter(n => mol.atoms[n].element.symbol === 'H');
      const nonHNeighbors = neighbors.filter(n => mol.atoms[n].element.symbol !== 'H');
      if (hNeighbors.length >= 1 && nonHNeighbors.length >= 1) {
        // Make sure it's not already in COOH
        const attachedC = nonHNeighbors[0];
        const isCOOH = groups.some(g => g.type === 'COOH' && g.atomIndices.includes(i));
        if (!isCOOH) {
          groups.push({
            type: 'OH',
            atomIndices: [i, ...hNeighbors],
          });
        }
      }
    }

    // Check for NH2
    if (atom.element.symbol === 'N') {
      const hNeighbors = neighbors.filter(n => mol.atoms[n].element.symbol === 'H');
      if (hNeighbors.length >= 2) {
        groups.push({
          type: 'NH2',
          atomIndices: [i, ...hNeighbors],
        });
      }
    }
  }

  return groups;
}

function computeDfsTraversal(mol: Molecule): number[] {
  const order: number[] = [];
  const visited = new Set<number>();
  const adj = buildAdjacencyList(mol);

  for (let start = 0; start < mol.atoms.length; start++) {
    if (visited.has(start)) continue;

    const stack: number[] = [start];
    while (stack.length > 0) {
      const curr = stack.pop()!;
      if (visited.has(curr)) continue;
      visited.add(curr);
      order.push(curr);

      const neighbors = adj.get(curr) || [];
      // Push in reverse order so smaller indices are popped first
      for (let i = neighbors.length - 1; i >= 0; i--) {
        const next = neighbors[i];
        if (!visited.has(next)) {
          stack.push(next);
        }
      }
    }
  }

  return order;
}
