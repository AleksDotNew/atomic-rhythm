import { AtomConfig, createAtom } from './atom';
import { Bond, Molecule } from './molecule';

export class SmilesError extends Error {
  constructor(message: string, public readonly position: number) {
    super(`SMILES parse error at position ${position}: ${message}`);
    this.name = 'SmilesError';
  }
}

interface ParsedAtomNode {
  symbol: string;
  massNumber?: number;
  charge: number;
  explicitHCount?: number; // if specified in brackets
  isBracket: boolean;
  isAromatic: boolean;
  implicitHCount: number;
}

export function parseSmiles(smiles: string, name?: string): Molecule {
  const str = smiles.trim();
  if (!str) {
    throw new SmilesError('Empty SMILES string', 0);
  }

  const nodes: ParsedAtomNode[] = [];
  const bonds: { atomA: number; atomB: number; order: 1 | 2 | 3; isAromatic: boolean }[] = [];

  let i = 0;
  let currentAtomIndex = -1;
  const branchStack: number[] = [];
  const ringClosures = new Map<number, { atomIndex: number; bondOrder?: 1 | 2 | 3; isAromatic?: boolean }>();
  let pendingBond: { order: 1 | 2 | 3; isAromatic: boolean } | null = null;

  while (i < str.length) {
    const ch = str[i];

    if (ch === '.') {
      currentAtomIndex = -1;
      pendingBond = null;
      i++;
      continue;
    }

    if (ch === '(') {
      if (currentAtomIndex === -1) {
        throw new SmilesError('Branch opens with no preceding atom', i);
      }
      branchStack.push(currentAtomIndex);
      i++;
      continue;
    }

    if (ch === ')') {
      if (branchStack.length === 0) {
        throw new SmilesError('Unclosed branch (mismatched closing parenthesis)', i);
      }
      currentAtomIndex = branchStack.pop()!;
      pendingBond = null;
      i++;
      continue;
    }

    // Directional stereochemistry markers / and \ (ignored in 2D topology)
    if (ch === '/' || ch === '\\') {
      i++;
      continue;
    }

    // Bond symbols
    if (ch === '-' || ch === '=' || ch === '#' || ch === ':') {
      const order = ch === '=' ? 2 : ch === '#' ? 3 : 1;
      const isAromatic = ch === ':';
      pendingBond = { order, isAromatic };
      i++;
      continue;
    }

    // Rings: 1-9 or %nn
    if (/\d/.test(ch) || ch === '%') {
      let ringNum = 0;
      if (ch === '%') {
        const numStr = str.slice(i + 1, i + 3);
        if (!/^\d{2}$/.test(numStr)) {
          throw new SmilesError('Invalid % ring closure syntax', i);
        }
        ringNum = parseInt(numStr, 10);
        i += 3;
      } else {
        ringNum = parseInt(ch, 10);
        i++;
      }

      if (currentAtomIndex === -1) {
        throw new SmilesError('Ring closure on no atom', i);
      }

      if (ringClosures.has(ringNum)) {
        const prev = ringClosures.get(ringNum)!;
        ringClosures.delete(ringNum);
        const order = pendingBond?.order || prev.bondOrder || 1;
        const isAromatic = pendingBond?.isAromatic ?? (prev.isAromatic ?? (nodes[currentAtomIndex].isAromatic && nodes[prev.atomIndex].isAromatic));
        bonds.push({
          atomA: prev.atomIndex,
          atomB: currentAtomIndex,
          order,
          isAromatic,
        });
        pendingBond = null;
      } else {
        ringClosures.set(ringNum, {
          atomIndex: currentAtomIndex,
          bondOrder: pendingBond?.order,
          isAromatic: pendingBond?.isAromatic,
        });
        pendingBond = null;
      }
      continue;
    }

    // Atom: bracket or organic subset
    let node: ParsedAtomNode;
    const atomStart = i;

    if (ch === '[') {
      // Bracket atom
      const closeIdx = str.indexOf(']', i);
      if (closeIdx === -1) {
        throw new SmilesError('Unclosed bracket atom', i);
      }
      const bracketContent = str.slice(i + 1, closeIdx);
      node = parseBracketAtom(bracketContent, i);
      i = closeIdx + 1;
    } else {
      // Organic subset: B, C, N, O, P, S, F, Cl, Br, I, or aromatic b, c, n, o, p, s
      const twoLetter = str.slice(i, i + 2);
      if (twoLetter === 'Cl' || twoLetter === 'Br') {
        node = {
          symbol: twoLetter,
          charge: 0,
          isBracket: false,
          isAromatic: false,
          implicitHCount: 0,
        };
        i += 2;
      } else if (/^[BCNOPSFI]$/.test(ch)) {
        node = {
          symbol: ch,
          charge: 0,
          isBracket: false,
          isAromatic: false,
          implicitHCount: 0,
        };
        i++;
      } else if (/^[bcnops]$/.test(ch)) {
        node = {
          symbol: ch.toUpperCase(),
          charge: 0,
          isBracket: false,
          isAromatic: true,
          implicitHCount: 0,
        };
        i++;
      } else {
        throw new SmilesError(`Unexpected character "${ch}" in SMILES`, i);
      }
    }

    const newAtomIndex = nodes.length;
    nodes.push(node);

    if (currentAtomIndex !== -1) {
      const order = pendingBond ? pendingBond.order : 1;
      const isAromatic = pendingBond ? pendingBond.isAromatic : (node.isAromatic && nodes[currentAtomIndex].isAromatic);
      bonds.push({
        atomA: currentAtomIndex,
        atomB: newAtomIndex,
        order,
        isAromatic,
      });
      pendingBond = null;
    }

    currentAtomIndex = newAtomIndex;
  }

  if (branchStack.length > 0) {
    throw new SmilesError('Unclosed branch in SMILES', str.length);
  }
  if (ringClosures.size > 0) {
    const unclosed = Array.from(ringClosures.keys()).join(', ');
    throw new SmilesError(`Unclosed ring(s): ${unclosed}`, str.length);
  }

  // Calculate implicit hydrogens for non-bracket organic atoms and aromatic atoms
  for (let idx = 0; idx < nodes.length; idx++) {
    const n = nodes[idx];
    if (n.isBracket) {
      n.implicitHCount = n.explicitHCount || 0;
    } else {
      // Calculate current bond order sum
      let bondSum = 0;
      for (const b of bonds) {
        if (b.atomA === idx || b.atomB === idx) {
          bondSum += b.isAromatic ? 1.5 : b.order;
        }
      }
      n.implicitHCount = calculateOrganicImplicitH(n.symbol, n.isAromatic, bondSum);
    }
  }

  // Build final AtomConfig array and expand explicit/implicit hydrogens as separate atoms
  const finalAtoms: AtomConfig[] = [];
  const finalBonds: Bond[] = [];

  for (let idx = 0; idx < nodes.length; idx++) {
    const n = nodes[idx];
    finalAtoms.push(createAtom(n.symbol, n.massNumber, n.charge));
  }

  for (const b of bonds) {
    finalBonds.push({
      atomA: b.atomA,
      atomB: b.atomB,
      order: b.order,
      isAromatic: b.isAromatic,
    });
  }

  // Expand hydrogens
  for (let idx = 0; idx < nodes.length; idx++) {
    const hCount = nodes[idx].implicitHCount;
    for (let h = 0; h < hCount; h++) {
      const hIndex = finalAtoms.length;
      finalAtoms.push(createAtom('H', 1, 0));
      finalBonds.push({
        atomA: idx,
        atomB: hIndex,
        order: 1,
        isAromatic: false,
      });
    }
  }

  return {
    atoms: finalAtoms,
    bonds: finalBonds,
    name,
  };
}

function parseBracketAtom(text: string, pos: number): ParsedAtomNode {
  // Strip stereochemistry markers (@, @@) inside brackets
  const cleaned = text.replace(/@+/g, '');
  // Pattern: [isotope? symbol H? count? charge?]
  // Example: 13C, 2H, Na+, Cl-, NH4+, Fe+3, C@@H -> CH, nH
  const regex = /^(\d+)?([A-Za-z][a-z]?)(?:H(\d+)?)?([+-]\d*|\d+[+-])?$/;
  const match = cleaned.match(regex);
  if (!match) {
    throw new SmilesError(`Invalid bracket atom content "[${text}]"`, pos);
  }

  const massNumber = match[1] ? parseInt(match[1], 10) : undefined;
  const rawSymbol = match[2];
  const isAromatic = /^[a-z]/.test(rawSymbol);
  const symbol = rawSymbol.toUpperCase();

  let explicitHCount: number | undefined;
  if (match[3] !== undefined) {
    explicitHCount = match[3] === '' ? 1 : parseInt(match[3], 10);
  } else if (text.includes('H') && match[2] !== 'H') {
    explicitHCount = 1;
  }

  let charge = 0;
  if (match[4]) {
    const cStr = match[4];
    if (cStr === '+') charge = 1;
    else if (cStr === '-') charge = -1;
    else if (cStr.startsWith('+')) charge = parseInt(cStr.slice(1), 10) || 1;
    else if (cStr.startsWith('-')) charge = -(parseInt(cStr.slice(1), 10) || 1);
    else if (cStr.endsWith('+')) charge = parseInt(cStr.slice(0, -1), 10) || 1;
    else if (cStr.endsWith('-')) charge = -(parseInt(cStr.slice(0, -1), 10) || 1);
  }

  return {
    symbol,
    massNumber,
    charge,
    explicitHCount,
    isBracket: true,
    isAromatic,
    implicitHCount: explicitHCount || 0,
  };
}

function calculateOrganicImplicitH(symbol: string, isAromatic: boolean, bondSum: number): number {
  if (isAromatic) {
    if (symbol === 'C') {
      // In aromatic ring, each C typically has 1 H if connected to 2 neighbors (bondSum=3)
      return Math.max(0, Math.round(4 - bondSum));
    }
    if (symbol === 'N' || symbol === 'O' || symbol === 'S') {
      return 0;
    }
  }

  const standardValences: Record<string, number> = {
    B: 3,
    C: 4,
    N: 3,
    O: 2,
    P: 3,
    S: 2,
    F: 1,
    Cl: 1,
    Br: 1,
    I: 1,
  };

  const stdValence = standardValences[symbol];
  if (stdValence !== undefined) {
    return Math.max(0, stdValence - Math.round(bondSum));
  }
  return 0;
}
