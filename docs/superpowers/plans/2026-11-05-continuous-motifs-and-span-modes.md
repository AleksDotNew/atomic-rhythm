# Continuous Structural Motifs & Active Span Modes Implementation Plan

## Goal
Extend the structural motif engine (`motif.ring*`, `motif.group`) so that motifs no longer terminate after bar 1 in multi-bar molecules (e.g. Serotonin, Caffeine, Cholesterol, ATP). Support 3 configurable motif playback modes:
1. `loop` (Continuous Loop / Ostinato, default): motifs loop continuously across `totalTicks` with natural polymetric phasing.
2. `span` (Ring Active Span): ring motifs loop only during the bars where their atoms are active; functional groups trigger at their atom bars.
3. `once` (Intro Only): single cycle at tick 0 (legacy behavior).

---

## Tasks

### Task 1: Core Motif Extension in `src/rhythm/motifs.ts`
- Define `MotifMode = 'loop' | 'span' | 'once'`.
- Define `MotifOptions`: `mode?: MotifMode`, `totalTicks?: number`, `totalBars?: number`, `ringActiveSpans?: Map<number, { startTick: number; endTick: number }>`, `groupActiveTicks?: number[]`.
- In `buildMotifTracks`:
  - When `mode === 'loop'`: repeat ring base events with period `cycleTicks = r * 48` up to `totalTicks`. Repeat functional groups every 2 bars (768 ticks, or every bar if totalBars <= 2).
  - When `mode === 'span'`: tile ring events within `[startTick, endTick]`.
  - When `mode === 'once'`: single cycle (legacy).
- Add unit tests in `test/rhythm/motifs.test.ts`.

### Task 2: Molecule Pattern Generator Integration in `src/rhythm/molecule-pattern.ts`
- Extend `MoleculePatternOptions` with `motifMode?: MotifMode`.
- In structural sequential mode, calculate active bar spans for each ring and functional group.
- In ordered sequence mode (bondWeight, mass, custom), calculate active bar spans similarly.
- Pass `totalTicks: fullCycleTicks`, `totalBars`, `mode: options.motifMode ?? 'loop'`, and active spans to `buildMotifTracks`.
- Add unit tests in `test/rhythm/molecule-pattern.test.ts`.

### Task 3: UI Controls in `src/ui/app.ts` & Styling
- Add `#select-motif-mode` dropdown to `.transport-controls`:
  - `loop`: Continuous Loop (Default)
  - `span`: Ring Active Span
  - `once`: Intro Only
- Wire event listener to update `this.currentMotifMode` and call `this.updateAll()`.
- Add UI unit tests in `test/ui/app.test.ts`.

### Task 4: Verification, Build & Push
- Run full test suite (`npx vitest run`).
- Run production singlefile build (`npm run build`).
- Commit and push to `origin/main`.
