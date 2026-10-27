import { AtomConfig } from './atom';

export interface Bond {
  readonly atomA: number; // index in atoms array
  readonly atomB: number;
  readonly order: 1 | 2 | 3;
  readonly isAromatic: boolean;
}

export interface Molecule {
  readonly atoms: readonly AtomConfig[];
  readonly bonds: readonly Bond[];
  readonly name?: string;
}
