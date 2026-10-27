import { Molecule } from '../chem/molecule';
import { createPattern, Pattern } from './ir';
import { buildAtomPattern } from './atom-pattern';
import { buildMoleculePattern, FormMode, MoleculePatternOptions } from './molecule-pattern';

export function buildFormSequence(
  mol: Molecule,
  formMode: FormMode,
  options: MoleculePatternOptions = {}
): Pattern[] {
  const mainPattern = buildMoleculePattern(mol, options);
  if (formMode === 'direct') {
    return [mainPattern];
  }

  // Assembly mode:
  // 1. Intro: play each unique element isolated for 1 bar
  const uniqueElements = new Map<string, typeof mol.atoms[0]>();
  for (const a of mol.atoms) {
    if (!uniqueElements.has(a.element.symbol)) {
      uniqueElements.set(a.element.symbol, a);
    }
  }

  const sequence: Pattern[] = [];

  for (const atom of uniqueElements.values()) {
    const tracks = buildAtomPattern(atom, options.matrix);
    sequence.push(createPattern(1, tracks));
  }

  // 2. Main molecular pattern
  sequence.push(mainPattern);

  return sequence;
}
