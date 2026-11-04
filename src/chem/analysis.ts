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

export interface StructuralUnit {
  readonly heavyAtomIndex: number;
  readonly peripheralAtomIndices: readonly number[]; // e.g. hydrogens attached to this atom
  readonly outgoingBond?: {
    readonly nextHeavyAtomIndex: number;
    readonly order: 1 | 2 | 3;
    readonly isAromatic: boolean;
  };
}

export type OrderStrategy = 'structural' | 'bondWeight' | 'mass' | 'custom';

export interface MolecularAnalysis {
  readonly rings: readonly RingInfo[];
  readonly bonds: readonly AnalyzedBond[];
  readonly functionalGroups: readonly FunctionalGroup[];
  readonly traversalOrder: readonly number[]; // Atom index sequence
  readonly structuralUnits: readonly StructuralUnit[];
  readonly atomBondCounts: readonly number[];
  readonly atomBondWeights: readonly number[];
}

export function analyzeMolecule(mol: Molecule): MolecularAnalysis {
  const analyzedBonds = analyzeBonds(mol);
  const rings = findRings(mol);
  const functionalGroups = findFunctionalGroups(mol);
  const structuralUnits = computeStructuralUnits(mol, rings);
  const traversalOrder = computeTraversalFromUnits(mol, structuralUnits);
  const { counts, weights } = computeBondWeightsAndCounts(mol);

  return {
    rings,
    bonds: analyzedBonds,
    functionalGroups,
    traversalOrder,
    structuralUnits,
    atomBondCounts: counts,
    atomBondWeights: weights,
  };
}

function computeBondWeightsAndCounts(mol: Molecule): { counts: number[]; weights: number[] } {
  const counts = new Array(mol.atoms.length).fill(0);
  const bondSums = new Array(mol.atoms.length).fill(0);

  for (const b of mol.bonds) {
    if (b.atomA < counts.length) counts[b.atomA]++;
    if (b.atomB < counts.length) counts[b.atomB]++;
    const orderVal = b.isAromatic ? 1.5 : b.order;
    if (b.atomA < bondSums.length) bondSums[b.atomA] += orderVal;
    if (b.atomB < bondSums.length) bondSums[b.atomB] += orderVal;
  }

  const weights = mol.atoms.map((atom, idx) => {
    const bondSum = bondSums[idx];
    const valence = atom.typicalValence || 1;
    return bondSum + 0.5 * valence;
  });

  return { counts, weights };
}

export interface KeyNodalAtoms {
  readonly bridgeheads: readonly number[];
  readonly hubs: readonly number[];
  readonly maxWeightAtoms: readonly number[];
  readonly allNodalIndices: readonly number[];
}

export function findKeyNodalAtoms(mol: Molecule, analysis: MolecularAnalysis): KeyNodalAtoms {
  const bridgeheads: number[] = [];
  const hubs: number[] = [];
  const maxWeightAtoms: number[] = [];

  // 1. Detect bridgeheads (atoms belonging to >= 2 rings)
  const ringMembership = new Map<number, number>();
  for (const ring of analysis.rings) {
    for (const aIdx of ring.atomIndices) {
      ringMembership.set(aIdx, (ringMembership.get(aIdx) || 0) + 1);
    }
  }
  for (const [aIdx, count] of ringMembership.entries()) {
    if (count >= 2) {
      bridgeheads.push(aIdx);
    }
  }

  // 2. Detect central hubs with >= 4 bonds
  for (let i = 0; i < mol.atoms.length; i++) {
    if ((analysis.atomBondCounts[i] ?? 0) >= 4) {
      hubs.push(i);
    }
  }

  // 3. Detect max-weight atoms
  if (analysis.atomBondWeights.length > 0) {
    const maxWeight = Math.max(...analysis.atomBondWeights);
    const allSame = analysis.atomBondWeights.every(w => Math.abs(w - maxWeight) < 1e-4);
    if (!allSame && maxWeight >= 3.0) {
      for (let i = 0; i < analysis.atomBondWeights.length; i++) {
        if (Math.abs(analysis.atomBondWeights[i] - maxWeight) < 1e-4) {
          maxWeightAtoms.push(i);
        }
      }
    }
  }

  const allNodalSet = new Set<number>([...bridgeheads, ...hubs, ...maxWeightAtoms]);
  const allNodalIndices = Array.from(allNodalSet).sort((a, b) => a - b);

  return {
    bridgeheads: bridgeheads.sort((a, b) => a - b),
    hubs: hubs.sort((a, b) => a - b),
    maxWeightAtoms: maxWeightAtoms.sort((a, b) => a - b),
    allNodalIndices,
  };
}

export function computeOrderedSequence(
  mol: Molecule,
  analysis: MolecularAnalysis,
  strategy: OrderStrategy = 'structural',
  customOrder?: readonly number[]
): number[] {
  if (strategy === 'custom' && customOrder && customOrder.length === mol.atoms.length) {
    return [...customOrder];
  }

  if (strategy === 'bondWeight') {
    return Array.from({ length: mol.atoms.length }, (_, i) => i).sort((a, b) => {
      const diff = analysis.atomBondWeights[b] - analysis.atomBondWeights[a];
      if (Math.abs(diff) > 0.001) return diff;
      return mol.atoms[b].element.atomicMass - mol.atoms[a].element.atomicMass;
    });
  }

  if (strategy === 'mass') {
    return Array.from({ length: mol.atoms.length }, (_, i) => i).sort(
      (a, b) => mol.atoms[b].element.atomicMass - mol.atoms[a].element.atomicMass
    );
  }

  return [...analysis.traversalOrder];
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

export function computeStructuralUnits(mol: Molecule, rings: readonly RingInfo[]): StructuralUnit[] {
  const units: StructuralUnit[] = [];
  const adj = buildAdjacencyList(mol);
  const visitedHeavy = new Set<number>();
  const visitedPeripheral = new Set<number>();

  const isHydrogen = (idx: number) => idx >= 0 && idx < mol.atoms.length && mol.atoms[idx].element.symbol === 'H';

  // 1. First process rings if present
  for (const ring of rings) {
    const rAtoms = ring.atomIndices;
    const ringSet = new Set(rAtoms);

    for (let i = 0; i < rAtoms.length; i++) {
      const heavyIdx = rAtoms[i];
      if (visitedHeavy.has(heavyIdx)) continue;
      visitedHeavy.add(heavyIdx);

      // Find peripheral atoms attached to this heavy atom (hydrogens or non-ring terminal atoms)
      const neighbors = adj.get(heavyIdx) || [];
      const peripherals: number[] = [];
      for (const n of neighbors) {
        if (!ringSet.has(n) && !visitedPeripheral.has(n) && (isHydrogen(n) || (adj.get(n)?.length === 1))) {
          peripherals.push(n);
          visitedPeripheral.add(n);
        }
      }

      // Outgoing bond to next atom in ring
      const nextHeavyIdx = rAtoms[(i + 1) % rAtoms.length];
      const bond = mol.bonds.find(
        b => (b.atomA === heavyIdx && b.atomB === nextHeavyIdx) || (b.atomA === nextHeavyIdx && b.atomB === heavyIdx)
      );

      units.push({
        heavyAtomIndex: heavyIdx,
        peripheralAtomIndices: peripherals,
        outgoingBond: bond
          ? {
              nextHeavyAtomIndex: nextHeavyIdx,
              order: bond.order,
              isAromatic: bond.isAromatic,
            }
          : undefined,
      });
    }
  }

  // 2. Process non-ring heavy atoms (backbone / side chains)
  const heavyAtomIndices = mol.atoms
    .map((_, i) => i)
    .filter(i => !isHydrogen(i) && !visitedHeavy.has(i));

  for (const heavyIdx of heavyAtomIndices) {
    if (visitedHeavy.has(heavyIdx)) continue;
    visitedHeavy.add(heavyIdx);

    const neighbors = adj.get(heavyIdx) || [];
    const peripherals: number[] = [];
    let nextHeavy: number | undefined;

    for (const n of neighbors) {
      if (isHydrogen(n) && !visitedPeripheral.has(n)) {
        peripherals.push(n);
        visitedPeripheral.add(n);
      } else if (!isHydrogen(n) && !visitedHeavy.has(n) && nextHeavy === undefined) {
        nextHeavy = n;
      }
    }

    let outgoingBond: StructuralUnit['outgoingBond'];
    if (nextHeavy !== undefined) {
      const bond = mol.bonds.find(
        b => (b.atomA === heavyIdx && b.atomB === nextHeavy) || (b.atomA === nextHeavy && b.atomB === heavyIdx)
      );
      if (bond) {
        outgoingBond = {
          nextHeavyAtomIndex: nextHeavy,
          order: bond.order,
          isAromatic: bond.isAromatic,
        };
      }
    }

    units.push({
      heavyAtomIndex: heavyIdx,
      peripheralAtomIndices: peripherals,
      outgoingBond,
    });
  }

  // 3. Fallback for molecules with no heavy atoms (e.g. H2)
  if (units.length === 0) {
    for (let i = 0; i < mol.atoms.length; i++) {
      units.push({
        heavyAtomIndex: i,
        peripheralAtomIndices: [],
      });
    }
  }

  return units;
}

function computeTraversalFromUnits(mol: Molecule, units: readonly StructuralUnit[]): number[] {
  const order: number[] = [];
  const visited = new Set<number>();

  for (const unit of units) {
    // 1. Hydrogens / peripheral atoms lead into the heavy atom
    for (const pIdx of unit.peripheralAtomIndices) {
      if (!visited.has(pIdx)) {
        visited.add(pIdx);
        order.push(pIdx);
      }
    }
    // 2. Central heavy atom
    if (!visited.has(unit.heavyAtomIndex)) {
      visited.add(unit.heavyAtomIndex);
      order.push(unit.heavyAtomIndex);
    }
  }

  // 3. Guarantee any remaining unvisited atoms are included
  for (let i = 0; i < mol.atoms.length; i++) {
    if (!visited.has(i)) {
      visited.add(i);
      order.push(i);
    }
  }

  return order;
}

