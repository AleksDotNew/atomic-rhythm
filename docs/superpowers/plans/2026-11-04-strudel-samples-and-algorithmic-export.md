# Strudel Samples & Algorithmic Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Strudel-style declarative `samples(...)` loader (GitHub shorthand, directory URLs, dictionary maps), expand Atoms/Bar up to 32/64 supporting $1/1 \dots 1/32$ note durations, and replace verbose Strudel export with compact algorithmic mini-notation (Euclidean patterns, repetition, rest compression).

**Architecture:**
1. Universal sample loader `samples(...)` in `src/audio/samples.ts` resolving `github:owner/repo`, direct HTTP directories, and `Record<string, string>` dictionaries.
2. Precision rhythm timing in `src/rhythm/molecule-pattern.ts` removing the 8-atom cap, preventing tick rounding drift, and supporting durations from whole notes ($1/1$) down to $1/32$ notes.
3. Algorithmic Strudel exporter in `src/export/strudel.ts` generating native Euclidean expressions (`bd(k, n)`), run-length pause compression (`~!N`), and prepending active `samples(...)` declarations.
4. UI controls in `src/ui/app.ts` and `src/style.css` for custom samples input and expanded Atoms/Bar slider/number input up to 32/64.

**Tech Stack:** TypeScript, Web Audio API, Vitest, Vite singlefile production bundle.

## Global Constraints
- Preserve 1:1 token alignment with Strudel (`bd`, `sd`, `hh`, `oh`, `cr`, `cp`, `rim`).
- Fully test-driven development: every task must include unit tests and pass 100%.
- Maintain documentation integrity and preserve existing comments.
- Production build `dist/index.html` must compile cleanly without errors.

---

### Task 1: Universal Declarative `samples(...)` Loader

**Files:**
- Modify: `src/audio/samples.ts`
- Test: `test/audio/samples.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type SamplesInput =
    | string // 'github:tidalcycles/dirt-samples' or 'https://strudel.cc/sounds/drummachines/'
    | Record<string, string>; // { kick: 'https://.../bd.wav', snare: '...' }

  export function resolveSampleUrl(input: string, filename: string): string;

  export function samples(
    ctx: AudioContext,
    spec: SamplesInput,
    name?: string
  ): Promise<SampleBank>;
  ```
- Handles aliases: `bd` $\to$ `kick`, `sd` $\to$ `snare`, `hh` $\to$ `hat`, `oh` $\to$ `openhat`, `cr` $\to$ `crash`, `cp` $\to$ `clap`, `rim` $\to$ `rim`.

- [x] **Step 1: Write unit tests for `samples(...)`**
  - Test resolving GitHub shorthand: `github:tidalcycles/dirt-samples` $\to$ `https://raw.githubusercontent.com/tidalcycles/dirt-samples/master/...`
  - Test resolving direct directory URL with trailing slash.
  - Test loading from dictionary object `{ bd: 'http://.../1.wav', sd: 'http://.../2.wav' }`.
- [x] **Step 2: Run test to confirm failure**
  - Run `npx vitest run test/audio/samples.test.ts`.
- [x] **Step 3: Implement `resolveSampleUrl` and `samples` in `src/audio/samples.ts`**
- [x] **Step 4: Run tests and verify they pass**
  - Run `npx vitest run test/audio/samples.test.ts`.
- [x] **Step 5: Commit changes**
  - `git commit -m "feat(audio): declarative samples loader supporting GitHub shorthand, directory URLs, and dictionaries"`

---

### Task 2: Atoms/Bar Expansion & Precise Variable Durations ($1/1 \dots 1/32$)

**Files:**
- Modify: `src/rhythm/molecule-pattern.ts`
- Test: `test/rhythm/molecule-pattern.test.ts`

**Interfaces:**
- `MoleculePatternOptions.atomsPerBar`: unrestricted positive integer (1 to 64).
- Tick calculation:
  ```ts
  const segmentStartTick = Math.round((seqIdx * oneBarTicks) / atomsPerBar);
  const nextSegmentStartTick = Math.round(((seqIdx + 1) * oneBarTicks) / atomsPerBar);
  const segmentDuration = nextSegmentStartTick - segmentStartTick;
  ```
- Ensures zero cumulative rounding drift across any number of bars and supports rapid $1/32$ ticks (12 ticks) when atomsPerBar = 32.

- [x] **Step 1: Write unit tests for expanded atomsPerBar (16, 24, 32) and zero drift**
  - Test `atomsPerBar: 16` distributes 16 atoms across 1 bar at 24 ticks each ($1/16$).
  - Test `atomsPerBar: 32` distributes 32 atoms across 1 bar at 12 ticks each ($1/32$).
  - Test non-power-of-2 `atomsPerBar: 5` has exact total cycle alignment without drift.
- [x] **Step 2: Run test to confirm failure**
  - Run `npx vitest run test/rhythm/molecule-pattern.test.ts`.
- [x] **Step 3: Implement precise tick scheduling in `src/rhythm/molecule-pattern.ts`**
- [x] **Step 4: Run tests and verify they pass**
  - Run `npx vitest run test/rhythm/molecule-pattern.test.ts`.
- [x] **Step 5: Commit changes**
  - `git commit -m "feat(rhythm): precision timing for expanded atomsPerBar supporting 1/1 to 1/32 durations"`

---

### Task 3: Algorithmic & Compact Strudel Mini-Notation Exporter

**Files:**
- Modify: `src/export/strudel.ts`
- Test: `test/export/export.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface StrudelExportOptions {
    readonly samplesDeclaration?: string; // e.g. "samples('github:tidalcycles/dirt-samples')"
    readonly compact?: boolean; // default: true
    readonly voiceMap?: Record<string, string>;
  }

  export function exportToStrudel(
    pattern: Pattern,
    options?: StrudelExportOptions | Record<string, string>
  ): string;
  ```
- Algorithmic features:
  1. Euclidean compression: detect Bjorklund patterns and format as `s("bd(k, n)")`.
  2. Run-length pause compression: replace 3+ consecutive `~` with `~!3` (e.g. `bd ~!7 bd ~!7`).
  3. Prepend `samples(...)` declaration if specified or if custom samplebank is active.

- [x] **Step 1: Write unit tests for algorithmic Strudel export**
  - Test run-length pause compression: `~!7` instead of 7 tildes.
  - Test Euclidean pattern formatting: `bd(3,8)` for 3 hits evenly spaced in 8 steps.
  - Test inclusion of `samples(...)` header when options.samplesDeclaration is provided.
- [x] **Step 2: Run test to confirm failure**
  - Run `npx vitest run test/export/export.test.ts`.
- [x] **Step 3: Implement algorithmic compression and samples header in `src/export/strudel.ts`**
- [x] **Step 4: Run tests and verify they pass**
  - Run `npx vitest run test/export/export.test.ts`.
- [x] **Step 5: Commit changes**
  - `git commit -m "feat(export): compact algorithmic Strudel exporter with Euclidean syntax and rest compression"`

---

### Task 4: UI Controls for Custom Samples Modal, Sample List, Electronegativity & Expanded Atoms/Bar

**Files:**
- Modify: `src/chem/analysis.ts`
- Modify: `src/ui/app.ts`
- Modify: `src/style.css`
- Test: `test/chem/analysis.test.ts`
- Test: `test/ui/app.test.ts`

**Interfaces:**
- `input-apb`: expanded `min="1" max="64"` with `#apb-note-subdivision` badge (`1/1`, `1/2`, `1/4`, `1/8`, `1/16`, `1/32`) and `#btn-fit-bars` button.
- `OrderStrategy`: add `'electronegativity'` for oxidizer priority sequencing.
- `select-soundbank`:
  - Add `<option value="custom">Custom samples(...) URL...</option>`
  - Soundbank Manager modal `#modal-soundbank`:
    - Shows loaded state for all 7 voices (kick, snare, hat, openhat, crash, clap, rim).
    - Text input for custom GitHub repo shorthand or URL.
    - Strudel Dirt preset button.
- Active sample declaration forwarded to `exportToStrudel` on copy/export.

- [x] **Step 1: Write unit tests for electronegativity ordering and UI controls**
- [x] **Step 2: Run tests to confirm failure**
- [x] **Step 3: Implement electronegativity ordering, Soundbank Manager modal with sample list, and expanded Atoms/Bar**
- [x] **Step 4: Run tests and verify they pass**
- [x] **Step 5: Commit changes**

---

### Task 5: Full System Verification, Build & Push

- [x] **Step 1: Run complete test suite (`npm test`)**
  - Verify all 19+ test files pass 100%.
- [x] **Step 2: Run production build (`npm run build`)**
  - Verify singlefile bundle `dist/index.html` builds without errors.
- [x] **Step 3: Push to origin main (`git push origin main`)**
