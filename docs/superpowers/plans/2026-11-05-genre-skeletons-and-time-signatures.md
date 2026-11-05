# Genre Skeletons and Time Signature Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement genre rhythmic skeletons (Drum & Bass, Techno, Hip-Hop, Raw Physics) and a time signature engine (fixed meters: 4/4, 3/4, 6/8, 7/8, 5/4 plus molecular ring-adaptive meter: 5-rings $\to$ 5/8, 6-rings $\to$ 6/8, chains $\to$ 4/4).

**Architecture:** 
1. `src/rhythm/time-signature.ts`: Computes step counts, tick lengths, and adaptive meter resolution from molecular topology.
2. `src/rhythm/genre-skeletons.ts`: Quantizes core anchors (kick, snare, hats) according to genre rules while driving syncopation, ghost notes, and fills from atomic data ($Z$, $N$, $e^-$, bonds).
3. `src/rhythm/molecule-pattern.ts`: Integrates variable bar lengths and genre skeletons into `Pattern`.
4. `src/export/`: Strudel polymorphic cycle export with `setcps`, and MIDI time signature meta events (`0xFF 0x58`).
5. `src/ui/app.ts`: UI selectors for Genre and Time Signature with auto-BPM adaptation.

**Tech Stack:** TypeScript, Web Audio API, MIDI standard format 1, Strudel mini-notation, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-05-genre-skeletons-and-time-signatures-design.md`

## Global Constraints
- All 1:1 token mappings (`bd`, `sd`, `hh`, `oh`, `cr`, `cp`, `rim`) must remain consistent.
- Raw physics mode (`raw`) must preserve 100% backward compatibility with existing tests.
- All existing tests in `test/` must continue to pass.

---

### Task 1: Time Signature Engine & IR Extension

**Files:**
- Create: `src/rhythm/time-signature.ts`
- Modify: `src/rhythm/ir.ts`
- Test: `test/rhythm/time-signature.test.ts`

**Interfaces:**
- Produces:
  - `type TimeSignatureOption = '4/4' | '3/4' | '6/8' | '7/8' | '5/8' | '5/4' | 'adaptive'`
  - `interface MeterInfo { readonly numerator: number; readonly denominator: number; readonly steps: number; readonly ticks: number; }`
  - `function getMeterInfo(ts: [number, number]): MeterInfo`
  - `function resolveBarMeters(mol: Molecule, analysis: MolecularAnalysis, option: TimeSignatureOption): MeterInfo[]`
  - Extended `Pattern`: `readonly timeSignatures?: readonly (readonly [number, number])[]`, `readonly barTicks?: readonly number[]`

- [ ] **Step 1: Write the failing tests for Time Signature calculations & Adaptive Resolution**
  Test in `test/rhythm/time-signature.test.ts`:
  - 4/4: 16 steps, 384 ticks; 3/4: 12 steps, 288 ticks; 6/8: 12 steps, 288 ticks; 5/8: 10 steps, 240 ticks; 7/8: 14 steps, 336 ticks; 5/4: 20 steps, 480 ticks.
  - Adaptive resolution on Caffeine: 6-ring $\to$ 6/8, 5-ring $\to$ 5/8, linear chains $\to$ 4/4.

- [ ] **Step 2: Run test to make sure it fails**
  Run `npx vitest run test/rhythm/time-signature.test.ts` and confirm failure.

- [ ] **Step 3: Implement `src/rhythm/time-signature.ts` and update `src/rhythm/ir.ts`**
  Implement meter calculations and adaptive resolution.

- [ ] **Step 4: Run tests and verify they pass**
  Run `npx vitest run test/rhythm/time-signature.test.ts`.

- [ ] **Step 5: Commit changes**
  Commit with message `feat(rhythm): time signature engine and adaptive ring meter resolution`.

---

### Task 2: Genre Skeletons Engine (DnB, Techno, Hip-Hop, Raw)

**Files:**
- Create: `src/rhythm/genre-skeletons.ts`
- Test: `test/rhythm/genre-skeletons.test.ts`

**Interfaces:**
- Produces:
  - `type GenreSkeletonId = 'raw' | 'dnb' | 'techno' | 'hiphop'`
  - `const GENRE_DEFAULT_BPM: Record<GenreSkeletonId, number>`
  - `function applyGenreSkeleton(tracks: Track[], atom: AtomConfig, genre: GenreSkeletonId, meter: MeterInfo, barIndex: number): Track[]`

- [ ] **Step 1: Write failing tests for genre skeletons**
  Test in `test/rhythm/genre-skeletons.test.ts`:
  - DnB: Snare hits on steps 4 & 12 in 16-step grid; Kick hits on step 0 and step 10/11 (max 3 hits per bar); Hats play 16th rolling pattern.
  - Techno: Four-on-the-floor kick on steps 0, 4, 8, 12; Openhat on offbeats (steps 2, 6, 10, 14); Clap on 4 & 12.
  - Hip-Hop: Kick on step 0 and syncopated step 10; Snare on step 8 (halftime) or steps 4 & 12.
  - Raw: Unmodified Euclidean tracks.

- [ ] **Step 2: Run test to make sure it fails**
  Run `npx vitest run test/rhythm/genre-skeletons.test.ts` and confirm failure.

- [ ] **Step 3: Implement `src/rhythm/genre-skeletons.ts`**
  Implement the four genre skeleton transformers.

- [ ] **Step 4: Run tests and verify they pass**
  Run `npx vitest run test/rhythm/genre-skeletons.test.ts`.

- [ ] **Step 5: Commit changes**
  Commit with message `feat(rhythm): genre skeletons for DnB, Techno, Hip-Hop, and Raw Physics`.

---

### Task 3: Integration into `buildMoleculePattern`

**Files:**
- Modify: `src/rhythm/molecule-pattern.ts`
- Test: `test/rhythm/molecule-pattern.test.ts`

**Interfaces:**
- Consumes: `time-signature.ts`, `genre-skeletons.ts`.
- Updates `MoleculePatternOptions`:
  - `genre?: GenreSkeletonId` (default `'raw'`)
  - `timeSignatureOption?: TimeSignatureOption` (default `'4/4'`)

- [ ] **Step 1: Write failing tests in `test/rhythm/molecule-pattern.test.ts`**
  - Verify `genre: 'dnb'` on Caffeine generates DnB snare backbeats on steps 4 & 12 and caps kicks.
  - Verify `timeSignatureOption: 'adaptive'` generates variable bar lengths matching molecular rings.

- [ ] **Step 2: Run tests to make sure they fail**
  Run `npx vitest run test/rhythm/molecule-pattern.test.ts`.

- [ ] **Step 3: Update `buildMoleculePattern`**
  Integrate per-bar time signature resolution, dynamic bar tick offsets, and genre skeleton application.

- [ ] **Step 4: Run tests and verify they pass**
  Run `npx vitest run test/rhythm/molecule-pattern.test.ts`.

- [ ] **Step 5: Commit changes**
  Commit with message `feat(rhythm): integrate genre skeletons and adaptive time signatures into molecule pattern generator`.

---

### Task 4: Exporters Update (Strudel & MIDI)

**Files:**
- Modify: `src/export/strudel.ts`
- Modify: `src/export/midi.ts`
- Test: `test/export/export.test.ts`

- [ ] **Step 1: Write failing tests in `test/export/export.test.ts`**
  - Test that Strudel export outputs `setcps(BPM/60/4)` and handles variable meter bars in `<...>`.
  - Test that MIDI export writes Time Signature Meta Events (0xFF 0x58 0x04) when time signatures change.

- [ ] **Step 2: Run tests to verify failure**
  Run `npx vitest run test/export/export.test.ts`.

- [ ] **Step 3: Implement exporter updates**
  Update `exportToStrudel` and `exportToMidi`.

- [ ] **Step 4: Run tests and verify they pass**
  Run `npx vitest run test/export/export.test.ts`.

- [ ] **Step 5: Commit changes**
  Commit with message `feat(export): support variable time signatures in Strudel and MIDI exporters`.

---

### Task 5: UI Controls & Auto-BPM Adaptation

**Files:**
- Modify: `index.html`
- Modify: `src/ui/app.ts`
- Modify: `src/style.css`
- Test: `test/ui/app.test.ts`

- [x] **Step 1: Add genre and time signature dropdowns to UI**
  Add `<select id="genre-select">` and `<select id="meter-select">` to the Control Panel.
- [x] **Step 2: Wire up state and Auto-BPM adjustment in `app.ts`**
  When genre changes to DnB $\to$ BPM sets to 174; Techno $\to$ 128; Hip-Hop $\to$ 90; Raw $\to$ 120.
  Trigger pattern rebuild and sequencer update.
- [x] **Step 3: Run UI tests and verify**
  Run `npx vitest run test/ui/app.test.ts`.
- [x] **Step 4: Commit changes**
  Commit with message `feat(ui): genre skeleton selector, time signature dropdown, and auto-BPM adaptation`.

---

### Task 6: Full Verification, Production Build & Push

- [x] **Step 1: Run complete test suite**
  Run `npx vitest run`.
- [x] **Step 2: Run production bundle build**
  Run `npm run build`.
- [x] **Step 3: Commit and Push**
  Push to `origin/main`.
