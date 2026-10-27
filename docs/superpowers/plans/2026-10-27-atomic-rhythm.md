# Atomic Rhythm Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-page web app in TypeScript/HTML/CSS that generates multi-track polyrhythmic drum patterns and structural motifs from chemical atoms and molecules, featuring Web Audio synthesis, interactive SVG molecular visualization with data labels, customizable modulation matrix, and Strudel/MIDI export, packaged as a self-contained single-file HTML bundle.

**Architecture:** Three-tier pipeline: Chemical Graph (atoms, bonds, rings, electron shells) → Rhythm IR (voices, tracks, ticks, velocities, articulations) → Output Drivers (Web Audio synthesizer, Strudel mini-notation, Standard MIDI File). Visualization uses SVG with 2D graph layout displaying $p/n/e$ and Lewis dots, coupled in real time to the audio scheduler.

**Tech Stack:** TypeScript (strict), Vite, vite-plugin-singlefile, Vitest, Web Audio API, SVG, IndexedDB.

**Spec:** [docs/superpowers/specs/2026-10-27-atomic-rhythm-design.md](file:///Users/novikov.alek/projects/atomic-rhythm/docs/superpowers/specs/2026-10-27-atomic-rhythm-design.md)
**Skill:** [.agents/skills/atomic-rhythm-mapping/SKILL.md](file:///Users/novikov.alek/projects/atomic-rhythm/.agents/skills/atomic-rhythm-mapping/SKILL.md)

## Global Constraints

- Standalone: Zero backend servers, daemons, or open ports required to run.
- Deliverable: Must build to a single self-contained `dist/index.html` file that opens and functions fully over `file://`.
- Periodic table data (118 elements) compiled in-bundle as TypeScript constants; user recipes stored in browser IndexedDB.
- Strict TDD for all data processing, chemical algorithms, rhythmic generators, and export modules.
- Modern dark-mode aesthetic with responsive UI layout, accessible controls, and live sequencer playhead.

---

### Task 1: Project Scaffolding & Build Configuration

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.ts`

**Interfaces:**
- Consumes: Node.js / npm environment
- Produces: Runnable build setup with `npm run build` producing single-file `dist/index.html` and `npm test` running Vitest.

- [ ] **Step 1: Create `package.json` with scripts and dependencies**
```json
{
  "name": "atomic-rhythm",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "vite": "^6.0.0",
    "vite-plugin-singlefile": "^2.1.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  },
  "include": ["src/**/*", "test/**/*"]
}
```

- [ ] **Step 3: Create `vite.config.ts`**
```typescript
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    target: 'esnext',
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
  },
  test: {
    environment: 'happy-dom',
  },
});
```

- [ ] **Step 4: Create placeholder `index.html` and `src/main.ts`**
In `index.html`:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Atomic Rhythm</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```
In `src/main.ts`:
```typescript
console.log('Atomic Rhythm initialized');
```

- [ ] **Step 5: Install dependencies and verify build**
Run: `npm install && npm run build`
Expected: Build succeeds and produces `dist/index.html`.

- [ ] **Step 6: Commit scaffolding**
```bash
git add package.json tsconfig.json vite.config.ts index.html src/main.ts package-lock.json
git commit -m "chore: scaffold project with vite, typescript, vitest, and singlefile plugin"
```

---

### Task 2: Elements Database & Chemical Constants

**Files:**
- Create: `src/chem/elements.ts`
- Create: `test/chem/elements.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export interface ElementData {
    readonly symbol: string;
    readonly name: string;
    readonly z: number;
    readonly atomicMass: number;
    readonly mostAbundantA: number;
    readonly group: number;
    readonly period: number;
    readonly block: 's' | 'p' | 'd' | 'f';
    readonly electronegativity: number | null;
    readonly ionizationEnergy1: number; // in eV
  }
  export function getElement(symbolOrZ: string | number): ElementData;
  export const ELEMENTS: readonly ElementData[];
  ```

- [ ] **Step 1: Write failing unit test for elements database**
In `test/chem/elements.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { getElement, ELEMENTS } from '../../src/chem/elements';

describe('elements database', () => {
  it('contains 118 elements', () => {
    expect(ELEMENTS.length).toBe(118);
  });

  it('retrieves hydrogen by symbol and Z=1', () => {
    const h = getElement('H');
    expect(h.z).toBe(1);
    expect(h.name).toBe('Hydrogen');
    expect(h.mostAbundantA).toBe(1);
    expect(h.electronegativity).toBeCloseTo(2.20, 2);
    expect(getElement(1)).toBe(h);
  });

  it('retrieves carbon, oxygen, gold, and uranium with correct attributes', () => {
    const c = getElement('C');
    expect(c.z).toBe(6);
    expect(c.mostAbundantA).toBe(12);
    expect(c.group).toBe(14);
    expect(c.block).toBe('p');

    const u = getElement('U');
    expect(u.z).toBe(92);
    expect(u.mostAbundantA).toBe(238);
    expect(u.block).toBe('f');
  });

  it('throws for unknown symbol or invalid Z', () => {
    expect(() => getElement('Xz')).toThrow();
    expect(() => getElement(0)).toThrow();
    expect(() => getElement(119)).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test test/chem/elements.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/chem/elements.ts`**
Implement the 118 periodic table records with verified IUPAC data for $Z=1..118$.

- [ ] **Step 4: Run test to verify it passes**
Run: `npm test test/chem/elements.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/chem/elements.ts test/chem/elements.test.ts
git commit -m "feat(chem): add periodic table database for all 118 elements"
```

---

### Task 3: Atom Model, Isotopes & Electron Configuration

**Files:**
- Create: `src/chem/atom.ts`
- Create: `test/chem/atom.test.ts`

**Interfaces:**
- Consumes: `ElementData`, `getElement` from `src/chem/elements.ts`
- Produces:
  ```typescript
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
  export function createAtom(symbolOrZ: string | number, massNumber?: number, charge?: number): AtomConfig;
  export function calculateShells(totalElectrons: number): number[];
  ```

- [ ] **Step 1: Write failing test for Atom Model & Shells**
In `test/chem/atom.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { createAtom, calculateShells } from '../../src/chem/atom';

describe('createAtom', () => {
  it('creates Protium (standard Hydrogen)', () => {
    const h = createAtom('H');
    expect(h.protons).toBe(1);
    expect(h.neutrons).toBe(0);
    expect(h.electrons).toBe(1);
    expect(h.shells).toEqual([1]);
    expect(h.valenceElectrons).toBe(1);
    expect(h.typicalValence).toBe(1);
  });

  it('creates Deuterium ([2H]) and Tritium ([3H])', () => {
    const d = createAtom('H', 2);
    expect(d.protons).toBe(1);
    expect(d.neutrons).toBe(1);
    expect(d.electrons).toBe(1);

    const t = createAtom('H', 3);
    expect(t.protons).toBe(1);
    expect(t.neutrons).toBe(2);
    expect(t.electrons).toBe(1);
  });

  it('handles ion charges: Na+ and Cl-', () => {
    const naPlus = createAtom('Na', 23, 1);
    expect(naPlus.protons).toBe(11);
    expect(naPlus.electrons).toBe(10);
    expect(naPlus.shells).toEqual([2, 8]);

    const clMinus = createAtom('Cl', 35, -1);
    expect(clMinus.protons).toBe(17);
    expect(clMinus.electrons).toBe(18);
    expect(clMinus.shells).toEqual([2, 8, 8]);
  });

  it('calculates electron configurations for heavier atoms according to Madelung rule', () => {
    // Carbon (6e): 1s2 2s2 2p2 -> [2, 4]
    expect(calculateShells(6)).toEqual([2, 4]);
    // Argon (18e): 1s2 2s2 2p6 3s2 3p6 -> [2, 8, 8]
    expect(calculateShells(18)).toEqual([2, 8, 8]);
    // Iron (26e): 1s2 2s2 2p6 3s2 3p6 4s2 3d6 -> [2, 8, 14, 2]
    expect(calculateShells(26)).toEqual([2, 8, 14, 2]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test test/chem/atom.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/chem/atom.ts`**
Implement orbital filling via Madelung's $(n+l)$ rule, aggregate into principal shells, calculate valence electrons and typical valence.

- [ ] **Step 4: Run test to verify it passes**
Run: `npm test test/chem/atom.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/chem/atom.ts test/chem/atom.test.ts
git commit -m "feat(chem): implement AtomConfig with Madelung shell filling and isotope support"
```

---

### Task 4: Chemical Graph & SMILES Parser

**Files:**
- Create: `src/chem/molecule.ts`
- Create: `src/chem/smiles.ts`
- Create: `test/chem/smiles.test.ts`

**Interfaces:**
- Consumes: `AtomConfig`, `createAtom` from `src/chem/atom.ts`
- Produces:
  ```typescript
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
  export function parseSmiles(smiles: string): Molecule;
  ```

- [ ] **Step 1: Write failing test for SMILES parsing**
In `test/chem/smiles.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { parseSmiles } from '../../src/chem/smiles';

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

  it('throws descriptive SmilesError on syntax errors', () => {
    expect(() => parseSmiles('C1CC')).toThrow(/Unclosed ring/);
    expect(() => parseSmiles('C(C')).toThrow(/Unclosed branch/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test test/chem/smiles.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement SMILES parser and Molecule builder**
In `src/chem/smiles.ts` and `src/chem/molecule.ts`, implement recursive/lexical parser handling organic elements, bracket atoms, ring numbers, branches, explicit/implicit hydrogens, and bonds.

- [ ] **Step 4: Run test to verify it passes**
Run: `npm test test/chem/smiles.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/chem/molecule.ts src/chem/smiles.ts test/chem/smiles.test.ts
git commit -m "feat(chem): implement SMILES parser with hydrogen expansion and bond resolution"
```

---

### Task 5: Molecular Analysis (Rings, Bonds, Groups, Traversal)

**Files:**
- Create: `src/chem/analysis.ts`
- Create: `test/chem/analysis.test.ts`

**Interfaces:**
- Consumes: `Molecule`, `Bond` from `src/chem/molecule.ts`
- Produces:
  ```typescript
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
  export function analyzeMolecule(mol: Molecule): MolecularAnalysis;
  ```

- [ ] **Step 1: Write failing test for molecular analysis**
In `test/chem/analysis.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { parseSmiles } from '../../src/chem/smiles';
import { analyzeMolecule } from '../../src/chem/analysis';

describe('analyzeMolecule', () => {
  it('detects 6-membered aromatic ring in benzene c1ccccc1', () => {
    const benzene = parseSmiles('c1ccccc1');
    const analysis = analyzeMolecule(benzene);
    expect(analysis.rings.length).toBe(1);
    expect(analysis.rings[0].size).toBe(6);
    expect(analysis.rings[0].isAromatic).toBe(true);
  });

  it('determines bond types by delta chi (H2O vs NaCl)', () => {
    const h2o = parseSmiles('O');
    const h2oAnalysis = analyzeMolecule(h2o);
    // O-H delta chi = 3.44 - 2.20 = 1.24 -> covalent-polar
    expect(h2oAnalysis.bonds[0].type).toBe('covalent-polar');

    const nacl = parseSmiles('[Na+].[Cl-]');
    const naclAnalysis = analyzeMolecule(nacl);
    // Ions in separate components -> ionic
    expect(naclAnalysis.bonds.length).toBe(0); // non-covalent bond or implicit ionic bond
  });

  it('identifies functional groups: ethanol CCO has OH', () => {
    const ethanol = parseSmiles('CCO');
    const analysis = analyzeMolecule(ethanol);
    expect(analysis.functionalGroups.some(g => g.type === 'OH')).toBe(true);
  });

  it('produces a deterministic DFS traversal order starting from index 0', () => {
    const ethanol = parseSmiles('CCO');
    const analysis = analyzeMolecule(ethanol);
    expect(analysis.traversalOrder.length).toBe(ethanol.atoms.length);
    expect(new Set(analysis.traversalOrder).size).toBe(ethanol.atoms.length);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test test/chem/analysis.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/chem/analysis.ts`**
Implement cycle detection (SSSR / chordless cycles), functional group subgraph matching, bond polarity calculation, and DFS graph traversal.

- [ ] **Step 4: Run test to verify it passes**
Run: `npm test test/chem/analysis.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/chem/analysis.ts test/chem/analysis.test.ts
git commit -m "feat(chem): add cycle detection, functional group extraction, and bond classification"
```

---

### Task 6: Bjorklund Euclidean Rhythm Generator

**Files:**
- Create: `src/rhythm/euclid.ts`
- Create: `test/rhythm/euclid.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export interface EuclideanResult {
    readonly steps: number;
    readonly hits: number;
    readonly pattern: readonly boolean[]; // true = hit, false = rest
    readonly velocityScale: number;      // 1.0 or boosted when k > n
  }
  export function generateEuclidean(k: number, n: number, rotation?: number): EuclideanResult;
  ```

- [ ] **Step 1: Write failing test for Euclidean generator**
In `test/rhythm/euclid.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { generateEuclidean } from '../../src/rhythm/euclid';

describe('generateEuclidean', () => {
  it('generates silent pattern for k=0', () => {
    const res = generateEuclidean(0, 16);
    expect(res.pattern.every(v => v === false)).toBe(true);
    expect(res.velocityScale).toBe(1.0);
  });

  it('generates E(1, 16) with rotation 0 and rotation 8', () => {
    const res0 = generateEuclidean(1, 16, 0);
    expect(res0.pattern[0]).toBe(true);
    expect(res0.pattern.filter(Boolean).length).toBe(1);

    const res8 = generateEuclidean(1, 16, 8);
    expect(res8.pattern[8]).toBe(true);
    expect(res8.pattern[0]).toBe(false);
  });

  it('generates classic Tresillo E(3, 8)', () => {
    const res = generateEuclidean(3, 8);
    // [x, ., ., x, ., ., x, .]
    expect(res.pattern).toEqual([true, false, false, true, false, false, true, false]);
  });

  it('handles overflow k > n by saturating hits and boosting velocity', () => {
    const res = generateEuclidean(24, 16);
    expect(res.pattern.every(v => v === true)).toBe(true);
    expect(res.velocityScale).toBeCloseTo(1.5, 2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test test/rhythm/euclid.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement Bjorklund's algorithm in `src/rhythm/euclid.ts`**
Handle division of intervals, recursive concatenation, cyclic rotation, and overflow velocity boosting.

- [ ] **Step 4: Run test to verify it passes**
Run: `npm test test/rhythm/euclid.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/rhythm/euclid.ts test/rhythm/euclid.test.ts
git commit -m "feat(rhythm): implement Bjorklund Euclidean rhythm generator with overflow scaling"
```

---

### Task 7: Rhythm IR Data Types & Assembler

**Files:**
- Create: `src/rhythm/ir.ts`
- Create: `test/rhythm/ir.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export const PPQ = 96; // Pulses Per Quarter note
  export type Articulation = 'normal' | 'ghost' | 'flam' | 'roll' | 'fill';
  export interface RhythmEvent {
    readonly tick: number;
    readonly velocity: number; // 0..1
    readonly durationTicks: number;
    readonly articulation: Articulation;
    readonly atomIndex?: number;
  }
  export interface Track {
    readonly voice: string;
    readonly cycleTicks: number;
    readonly events: readonly RhythmEvent[];
  }
  export interface Pattern {
    readonly timeSignature: readonly [number, number];
    readonly bars: number;
    readonly tracks: readonly Track[];
  }
  export function createPattern(bars: number, tracks: Track[], timeSig?: [number, number]): Pattern;
  ```

- [ ] **Step 1: Write failing test for Rhythm IR helper utilities**
In `test/rhythm/ir.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { createPattern, PPQ } from '../../src/rhythm/ir';

describe('Rhythm IR', () => {
  it('creates a validated pattern with tracks and calculated cycle bounds', () => {
    const pat = createPattern(1, [
      {
        voice: 'proton',
        cycleTicks: 16 * (PPQ / 4),
        events: [{ tick: 0, velocity: 0.9, durationTicks: 12, articulation: 'normal', atomIndex: 0 }]
      }
    ]);
    expect(pat.bars).toBe(1);
    expect(pat.timeSignature).toEqual([4, 4]);
    expect(pat.tracks.length).toBe(1);
    expect(pat.tracks[0].events[0].tick).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test test/rhythm/ir.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/rhythm/ir.ts`**
Export types, constants (`PPQ`), and validation/helper functions.

- [ ] **Step 4: Run test to verify it passes**
Run: `npm test test/rhythm/ir.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/rhythm/ir.ts test/rhythm/ir.test.ts
git commit -m "feat(rhythm): define Rhythm IR data structures and constants"
```

---

### Task 8: Modulation Matrix & Routing Engine

**Files:**
- Create: `src/rhythm/modmatrix.ts`
- Create: `test/rhythm/modmatrix.test.ts`

**Interfaces:**
- Consumes: `AtomConfig` from `src/chem/atom.ts`
- Produces:
  ```typescript
  export type ModSource =
    | 'protons' | 'neutrons' | 'electrons' | 'electronsInShell'
    | 'shellCount' | 'period' | 'group' | 'valenceElectrons'
    | 'typicalValence' | 'electronegativity' | 'atomicMass' | 'ionizationEnergy';

  export type ModDest = 'hits' | 'steps' | 'rotation' | 'velocity';

  export interface ModRoute {
    readonly voice: string; // 'proton', 'neutron', 'electron.s{i}', etc.
    readonly source: ModSource;
    readonly dest: ModDest;
    readonly shellIndex?: number;
    readonly transform?: (val: number) => number;
  }

  export interface ModulationMatrix {
    readonly routes: readonly ModRoute[];
  }

  export const DEFAULT_MOD_MATRIX: ModulationMatrix;
  export function evaluateRoute(route: ModRoute, atom: AtomConfig): number;
  ```

- [ ] **Step 1: Write failing test for modulation routing**
In `test/rhythm/modmatrix.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { createAtom } from '../../src/chem/atom';
import { DEFAULT_MOD_MATRIX, evaluateRoute, ModRoute } from '../../src/rhythm/modmatrix';

describe('Modulation Matrix', () => {
  it('evaluates proton hits = Z for Gold (Z=79)', () => {
    const au = createAtom('Au');
    const route: ModRoute = { voice: 'proton', source: 'protons', dest: 'hits' };
    expect(evaluateRoute(route, au)).toBe(79);
  });

  it('evaluates neutron hits for Tritium (A=3, Z=1 -> 2)', () => {
    const t = createAtom('H', 3);
    const route: ModRoute = { voice: 'neutron', source: 'neutrons', dest: 'hits' };
    expect(evaluateRoute(route, t)).toBe(2);
  });

  it('evaluates electron shell hit count for specific shellIndex', () => {
    const na = createAtom('Na'); // [2, 8, 1]
    const routeS2: ModRoute = { voice: 'electron.s2', source: 'electronsInShell', dest: 'hits', shellIndex: 1 };
    expect(evaluateRoute(routeS2, na)).toBe(8);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test test/rhythm/modmatrix.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/rhythm/modmatrix.ts`**
Implement data extraction functions for all `ModSource` types, custom transforms, and declare `DEFAULT_MOD_MATRIX`.

- [ ] **Step 4: Run test to verify it passes**
Run: `npm test test/rhythm/modmatrix.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/rhythm/modmatrix.ts test/rhythm/modmatrix.test.ts
git commit -m "feat(rhythm): implement customizable modulation matrix and route evaluation"
```

---

### Task 9: Atom Pattern Generator & Shell Polyrhythms

**Files:**
- Create: `src/rhythm/atom-pattern.ts`
- Create: `test/rhythm/atom-pattern.test.ts`

**Interfaces:**
- Consumes: `AtomConfig`, `ModulationMatrix`, `generateEuclidean`, `RhythmEvent`, `Track`
- Produces:
  ```typescript
  export const SHELL_GRID_STEPS = [16, 12, 20, 24, 28, 32, 36] as const;
  export function buildAtomPattern(
    atom: AtomConfig,
    matrix?: ModulationMatrix,
    atomIndex?: number,
    segmentTicks?: number
  ): Track[];
  ```

- [ ] **Step 1: Write failing test for atom pattern generation**
In `test/rhythm/atom-pattern.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { createAtom } from '../../src/chem/atom';
import { buildAtomPattern } from '../../src/rhythm/atom-pattern';

describe('buildAtomPattern', () => {
  it('builds Protium (1p, 0n, 1e): kick on beat 1, snare on backbeat, silent hat', () => {
    const h = createAtom('H');
    const tracks = buildAtomPattern(h);

    const kick = tracks.find(t => t.voice === 'proton')!;
    expect(kick.events.length).toBe(1);
    expect(kick.events[0].tick).toBe(0);

    const hat = tracks.find(t => t.voice === 'neutron')!;
    expect(hat.events.length).toBe(0);

    const snare = tracks.find(t => t.voice === 'electron.s1')!;
    expect(snare.events.length).toBe(1);
    expect(snare.events[0].tick).toBe(tracks[0].cycleTicks / 2);
  });

  it('builds Tritium: hat now plays 2 hits', () => {
    const t = createAtom('H', 3);
    const tracks = buildAtomPattern(t);
    const hat = tracks.find(t => t.voice === 'neutron')!;
    expect(hat.events.length).toBe(2);
  });

  it('creates polymetric tracks for multi-shell atoms (e.g. Carbon)', () => {
    const c = createAtom('C'); // shells [2, 4]
    const tracks = buildAtomPattern(c);
    const s1 = tracks.find(t => t.voice === 'electron.s1')!;
    const s2 = tracks.find(t => t.voice === 'electron.s2')!;
    expect(s1).toBeDefined();
    expect(s2).toBeDefined();
    expect(s1.cycleTicks).not.toBe(s2.cycleTicks); // 16 vs 12 subdivision grid
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test test/rhythm/atom-pattern.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/rhythm/atom-pattern.ts`**
Map proton, neutron, and electron shell tracks to Euclidean generators with specified shell grids, rotations, and velocity scalers.

- [ ] **Step 4: Run test to verify it passes**
Run: `npm test test/rhythm/atom-pattern.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/rhythm/atom-pattern.ts test/rhythm/atom-pattern.test.ts
git commit -m "feat(rhythm): build multi-track atom patterns with electron shell polyrhythms"
```

---

### Task 10: Motifs & Structural Patterns (Rings, Functional Groups)

**Files:**
- Create: `src/rhythm/motifs.ts`
- Create: `test/rhythm/motifs.test.ts`

**Interfaces:**
- Consumes: `MolecularAnalysis` from `src/chem/analysis.ts`
- Produces:
  ```typescript
  export function buildMotifTracks(analysis: MolecularAnalysis, totalBars: number): Track[];
  ```

- [ ] **Step 1: Write failing test for structural motifs**
In `test/rhythm/motifs.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { parseSmiles } from '../../src/chem/smiles';
import { analyzeMolecule } from '../../src/chem/analysis';
import { buildMotifTracks } from '../../src/rhythm/motifs';

describe('buildMotifTracks', () => {
  it('generates 6/8 polymetric track with accents on 1 and 4 for benzene ring', () => {
    const benzene = parseSmiles('c1ccccc1');
    const analysis = analyzeMolecule(benzene);
    const tracks = buildMotifTracks(analysis, 1);

    const ringTrack = tracks.find(t => t.voice === 'motif.ring6');
    expect(ringTrack).toBeDefined();
    // 6 pulses
    expect(ringTrack!.events.length).toBe(6);
    // accents on 1 and 4
    expect(ringTrack!.events[0].velocity).toBe(1.0);
    expect(ringTrack!.events[3].velocity).toBe(1.0);
  });

  it('generates motif for OH group in ethanol', () => {
    const ethanol = parseSmiles('CCO');
    const analysis = analyzeMolecule(ethanol);
    const tracks = buildMotifTracks(analysis, 1);

    const groupTrack = tracks.find(t => t.voice === 'motif.group');
    expect(groupTrack).toBeDefined();
    expect(groupTrack!.events.length).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test test/rhythm/motifs.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/rhythm/motifs.ts`**
Generate polymetric ring tracks ($r/8$) with primary and secondary accent distributions, and group motive triggers.

- [ ] **Step 4: Run test to verify it passes**
Run: `npm test test/rhythm/motifs.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/rhythm/motifs.ts test/rhythm/motifs.test.ts
git commit -m "feat(rhythm): generate polymetric ring tracks and functional group motifs"
```

---

### Task 11: Excitation Engine & Temperature Model

**Files:**
- Create: `src/rhythm/excitation.ts`
- Create: `test/rhythm/excitation.test.ts`

**Interfaces:**
- Consumes: `AtomConfig`, `Track`, `RhythmEvent`
- Produces:
  ```typescript
  export function calculateBpm(baseBpm: number, temperature: number): number;
  export function calculateIonizationThreshold(ie1: number): number;
  export function isAtomExcited(temperature: number, ie1: number): boolean;
  export function applyExcitationToAtom(
    atom: AtomConfig,
    tracks: Track[],
    temperature: number,
    currentBar: number
  ): Track[];
  ```

- [ ] **Step 1: Write failing test for excitation engine**
In `test/rhythm/excitation.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { createAtom } from '../../src/chem/atom';
import { buildAtomPattern } from '../../src/rhythm/atom-pattern';
import {
  calculateBpm,
  calculateIonizationThreshold,
  isAtomExcited,
  applyExcitationToAtom
} from '../../src/rhythm/excitation';

describe('Excitation Engine', () => {
  it('increases BPM linearly with temperature T in [0..100]', () => {
    expect(calculateBpm(120, 0)).toBe(120);
    expect(calculateBpm(120, 50)).toBe(180);
    expect(calculateBpm(120, 100)).toBe(240);
  });

  it('determines excitation thresholds for alkali metals (Na) vs noble gases (He)', () => {
    const na = createAtom('Na'); // IE1 ~ 5.14 eV -> low threshold
    const he = createAtom('He'); // IE1 ~ 24.59 eV -> > 100 threshold

    const naThresh = calculateIonizationThreshold(na.element.ionizationEnergy1);
    const heThresh = calculateIonizationThreshold(he.element.ionizationEnergy1);

    expect(naThresh).toBeLessThan(20);
    expect(heThresh).toBeGreaterThan(100);
    expect(isAtomExcited(30, na.element.ionizationEnergy1)).toBe(true);
    expect(isAtomExcited(30, he.element.ionizationEnergy1)).toBe(false);
  });

  it('promotes valence electron and inserts fill on bar 4 when excited', () => {
    const na = createAtom('Na');
    const baseTracks = buildAtomPattern(na);
    const excitedTracks = applyExcitationToAtom(na, baseTracks, 50, 4);

    // New outer shell track created for promoted electron
    const promotedTrack = excitedTracks.find(t => t.voice === 'electron.s4');
    expect(promotedTrack).toBeDefined();
    expect(promotedTrack!.events.some(e => e.articulation === 'fill')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test test/rhythm/excitation.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/rhythm/excitation.ts`**
Calculate threshold, test excitation condition, promote valence electron to $N+1$, and double electron density with `articulation: 'fill'` on the 4th phrase bar.

- [ ] **Step 4: Run test to verify it passes**
Run: `npm test test/rhythm/excitation.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/rhythm/excitation.ts test/rhythm/excitation.test.ts
git commit -m "feat(rhythm): implement temperature-dependent excitation and drum fills"
```

---

### Task 12: Molecule Pattern Generator & Musical Form

**Files:**
- Create: `src/rhythm/molecule-pattern.ts`
- Create: `src/rhythm/form.ts`
- Create: `test/rhythm/molecule-pattern.test.ts`

**Interfaces:**
- Consumes: `Molecule`, `MolecularAnalysis`, `ModulationMatrix`, `Pattern`
- Produces:
  ```typescript
  export type PlaybackMode = 'sequential' | 'overlay';
  export type FormMode = 'direct' | 'assembly';
  export interface MoleculePatternOptions {
    readonly mode?: PlaybackMode;
    readonly atomsPerBar?: number;
    readonly matrix?: ModulationMatrix;
    readonly temperature?: number;
  }
  export function buildMoleculePattern(mol: Molecule, options?: MoleculePatternOptions): Pattern;
  export function buildFormSequence(mol: Molecule, formMode: FormMode, options?: MoleculePatternOptions): Pattern[];
  ```

- [ ] **Step 1: Write failing test for Molecule Pattern & Form**
In `test/rhythm/molecule-pattern.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { parseSmiles } from '../../src/chem/smiles';
import { buildMoleculePattern } from '../../src/rhythm/molecule-pattern';

describe('buildMoleculePattern', () => {
  it('builds H2 in sequential mode: 1 bar with H1 in segment 1 and H2 in segment 2', () => {
    const h2 = parseSmiles('[H][H]');
    const pat = buildMoleculePattern(h2, { mode: 'sequential', atomsPerBar: 2 });
    expect(pat.bars).toBe(1);

    const kick = pat.tracks.find(t => t.voice === 'proton')!;
    // 2 kick hits: one at step 0 (H1), one at step 8 (H2)
    expect(kick.events.length).toBe(2);
    expect(kick.events[0].tick).toBe(0);
    expect(kick.events[1].tick).toBe(pat.tracks[0].cycleTicks / 2);
  });

  it('adds bond articulation at segment boundary', () => {
    const o2 = parseSmiles('O=O');
    const pat = buildMoleculePattern(o2, { mode: 'sequential', atomsPerBar: 2 });
    const bondTrack = pat.tracks.find(t => t.voice === 'bond')!;
    expect(bondTrack).toBeDefined();
    // Double bond produces flam
    expect(bondTrack.events.some(e => e.articulation === 'flam')).toBe(true);
  });

  it('builds in overlay mode: all atoms play concurrently on 1 bar', () => {
    const h2 = parseSmiles('[H][H]');
    const pat = buildMoleculePattern(h2, { mode: 'overlay' });
    expect(pat.bars).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test test/rhythm/molecule-pattern.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/rhythm/molecule-pattern.ts` and `src/rhythm/form.ts`**
Implement sequential subdivision partitioning, bond articulations (flam for double, roll for triple, shift for ionic), overlay aggregation, and intro/assembly sequence arrangement.

- [ ] **Step 4: Run test to verify it passes**
Run: `npm test test/rhythm/molecule-pattern.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/rhythm/molecule-pattern.ts src/rhythm/form.ts test/rhythm/molecule-pattern.test.ts
git commit -m "feat(rhythm): implement sequential and overlay molecular pattern builders and form sequence"
```

---

### Task 13: Strudel & MIDI Exporters

**Files:**
- Create: `src/export/strudel.ts`
- Create: `src/export/midi.ts`
- Create: `test/export/export.test.ts`

**Interfaces:**
- Consumes: `Pattern`, `Track`, `RhythmEvent`
- Produces:
  ```typescript
  export function exportToStrudel(pattern: Pattern, voiceMap?: Record<string, string>): string;
  export function exportToMidi(pattern: Pattern, bpm: number, voiceMap?: Record<string, number>): Uint8Array;
  ```

- [ ] **Step 1: Write failing test for Strudel and MIDI export**
In `test/export/export.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { parseSmiles } from '../../src/chem/smiles';
import { buildMoleculePattern } from '../../src/rhythm/molecule-pattern';
import { exportToStrudel } from '../../src/export/strudel';
import { exportToMidi } from '../../src/export/midi';

describe('Exporters', () => {
  it('exports valid Strudel mini-notation stack', () => {
    const h2 = parseSmiles('[H][H]');
    const pat = buildMoleculePattern(h2);
    const code = exportToStrudel(pat);

    expect(code).toContain('stack(');
    expect(code).toContain('s("bd');
  });

  it('generates valid Standard MIDI File bytes (MThd, MTrk headers)', () => {
    const h2 = parseSmiles('[H][H]');
    const pat = buildMoleculePattern(h2);
    const bytes = exportToMidi(pat, 120);

    // MThd header check
    expect(bytes[0]).toBe(0x4D); // 'M'
    expect(bytes[1]).toBe(0x54); // 'T'
    expect(bytes[2]).toBe(0x68); // 'h'
    expect(bytes[3]).toBe(0x64); // 'd'
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test test/export/export.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/export/strudel.ts` and `src/export/midi.ts`**
Generate Strudel `stack(...)` with `.slow(...)` polymetric tags and `.gain(...)` values; generate SMF Type 1 binary byte arrays with variable-length quantity deltas and noteOn/noteOff events on drum channel 10.

- [ ] **Step 4: Run test to verify it passes**
Run: `npm test test/export/export.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/export/strudel.ts src/export/midi.ts test/export/export.test.ts
git commit -m "feat(export): implement Strudel mini-notation and SMF Type 1 binary MIDI exporters"
```

---

### Task 14: Web Audio Drum Synthesizer & Look-Ahead Scheduler

**Files:**
- Create: `src/audio/synth.ts`
- Create: `src/audio/scheduler.ts`
- Create: `test/audio/audio.test.ts`

**Interfaces:**
- Consumes: `Pattern`, `RhythmEvent`, `Track`
- Produces:
  ```typescript
  export type SynthVoiceName = 'kick' | 'snare' | 'hat' | 'clap' | 'rim';
  export interface DrumSynth {
    trigger(voice: SynthVoiceName, time: number, velocity: number, articulation?: string): void;
  }
  export function createDrumSynth(ctx: AudioContext): DrumSynth;
  export class AudioScheduler {
    constructor(ctx: AudioContext, synth: DrumSynth);
    setPattern(pattern: Pattern, bpm: number): void;
    start(onStep?: (atomIndex?: number, trackIndex?: number, step?: number) => void): void;
    stop(): void;
    setBpm(bpm: number): void;
    readonly isPlaying: boolean;
  }
  ```

- [ ] **Step 1: Write unit tests for audio scheduler logic and synth event queues**
In `test/audio/audio.test.ts`:
Verify tick-to-time conversion, lookahead scheduling math, and event dispatch calculation without requiring native sound cards.

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test test/audio/audio.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement Drum Synth and Scheduler**
In `src/audio/synth.ts`, implement kick (pitch sweep sine), snare (highpass noise + body osc), hat (bandpass metallic noise), clap (multi-trigger burst noise), and rim (narrow bandpass ping). In `src/audio/scheduler.ts`, implement a 25ms timer scanning a 100ms lookahead window using `AudioContext.currentTime`.

- [ ] **Step 4: Run test to verify it passes**
Run: `npm test test/audio/audio.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/audio/synth.ts src/audio/scheduler.ts test/audio/audio.test.ts
git commit -m "feat(audio): implement procedural drum synthesizer and look-ahead scheduler"
```

---

### Task 15: IndexedDB Storage for Recipes and Presets

**Files:**
- Create: `src/storage/db.ts`
- Create: `test/storage/db.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export interface SavedRecipe {
    readonly id: string;
    readonly name: string;
    readonly matrix: ModulationMatrix;
    readonly voiceMap: Record<string, string>;
  }
  export function saveRecipe(recipe: SavedRecipe): Promise<void>;
  export function loadRecipes(): Promise<SavedRecipe[]>;
  export function deleteRecipe(id: string): Promise<void>;
  ```

- [ ] **Step 1: Write failing test for IndexedDB wrapper**
In `test/storage/db.test.ts`:
Test storing, retrieving, and deleting recipe records using in-memory or fake IndexedDB.

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test test/storage/db.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/storage/db.ts`**
Wrap IndexedDB with graceful fallback if storage is blocked (e.g. incognito mode warning).

- [ ] **Step 4: Run test to verify it passes**
Run: `npm test test/storage/db.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/storage/db.ts test/storage/db.test.ts
git commit -m "feat(storage): implement IndexedDB persistence for user modulation recipes"
```

---

### Task 16: SVG Molecular Visualizer with Data Labels & Sequencer Grid

**Files:**
- Create: `src/viz/layout.ts`
- Create: `src/viz/molecule-svg.ts`
- Create: `src/viz/sequencer-grid.ts`
- Create: `test/viz/viz.test.ts`

**Interfaces:**
- Consumes: `Molecule`, `MolecularAnalysis`, `Pattern`
- Produces:
  ```typescript
  export interface Point2D { x: number; y: number; }
  export function computeMoleculeLayout(mol: Molecule, analysis: MolecularAnalysis): Point2D[];
  export class MoleculeSvgView {
    constructor(container: HTMLElement);
    render(mol: Molecule, analysis: MolecularAnalysis): void;
    highlightAtom(atomIndex: number | null): void;
    setExcited(atomIndex: number, excited: boolean): void;
  }
  export class SequencerGridView {
    constructor(container: HTMLElement);
    render(pattern: Pattern): void;
    updatePlayhead(tick: number): void;
  }
  ```

- [ ] **Step 1: Write failing test for layout algorithm**
In `test/viz/viz.test.ts`:
Verify that benzene ring layout produces 6 equidistant hexagonal coordinates and that diatomic molecules have non-overlapping positions.

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test test/viz/viz.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement layout, SVG renderer, and Sequencer Grid**
- In `src/viz/layout.ts`: deterministic force-directed + polygon ring layout.
- In `src/viz/molecule-svg.ts`: SVG nodes for atoms showing element symbol, subscript $p/n/e$ label, Lewis valence dots, bonds with order lines and Δχ tooltip, and animated glow on active/excited atoms.
- In `src/viz/sequencer-grid.ts`: Multi-track grid with step cells and cursor.

- [ ] **Step 4: Run test to verify it passes**
Run: `npm test test/viz/viz.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/viz/layout.ts src/viz/molecule-svg.ts src/viz/sequencer-grid.ts test/viz/viz.test.ts
git commit -m "feat(viz): implement 2D SVG molecular visualizer with p/n/e labels and sequencer grid"
```

---

### Task 17: Presets Library & Application UI Assembly

**Files:**
- Create: `src/chem/presets.ts`
- Create: `src/ui/app.ts`
- Create: `src/style.css`
- Modify: `src/main.ts`
- Modify: `index.html`

**Interfaces:**
- Integrates: all previous modules into a single responsive view.

- [ ] **Step 1: Create presets catalog in `src/chem/presets.ts`**
Include: H, D, T, H₂, O₂, N₂, H₂O, CO₂, CH₄, NH₃, NaCl, Ethanol, Acetic Acid, Cyclopentane, Benzene, Pyridine, Caffeine.

- [ ] **Step 2: Build UI layout and styles in `src/style.css`**
Modern dark mode palette, modular grid:
- Top: Transport bar (Play/Stop, base BPM, Temperature slider, Mode toggles, Strudel/MIDI export buttons).
- Left: Preset selector + SMILES input + Isotope selector.
- Center: SVG Molecular visualization with $p/n/e$ labels, and Sequencer grid below it.
- Right: Modulation matrix matrix routing editor + voice remapping + recipe save/load.

- [ ] **Step 3: Connect controllers and event listeners in `src/ui/app.ts`**
Wire up audio context unlock, live temperature slider updating BPM and triggering excitation fills, SMILES parse errors, and Strudel clipboard copy.

- [ ] **Step 4: Build project and verify zero compile errors**
Run: `npm run build && npm test`
Expected: All tests pass, build succeeds.

- [ ] **Step 5: Commit**
```bash
git add src/chem/presets.ts src/ui/app.ts src/style.css src/main.ts index.html
git commit -m "feat(ui): assemble complete single-page application with dark mode and controls"
```

---

### Task 18: Verification & Single-File Bundle Audit

**Files:**
- Audit: `dist/index.html`

- [ ] **Step 1: Run complete test suite**
Run: `npm test`
Expected: All unit tests pass.

- [ ] **Step 2: Run production single-file build**
Run: `npm run build`
Expected: Single file `dist/index.html` produced.

- [ ] **Step 3: Verify single-file standalone execution**
Check that `dist/index.html` contains inlined JavaScript and CSS, has no relative external network asset requests, and runs correctly.

- [ ] **Step 4: Final verification commit**
```bash
git add .
git commit -m "release: v1.0.0 atomic-rhythm single-file application"
```
