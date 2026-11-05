# Strudel Algorithmic Pattern Compression & Dynamic Durations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Strudel exporter from generating multi-bar flat string sheets into concise, elegant, idiomatic Strudel live-coding code using periodic cycle folding, `<...>` cycle progressions, `[pat]*K` repetition compression, and mass/electronegativity-based dynamic note subdivisions ($1/1$ to $1/32$).

**Architecture:** 
1. `src/export/strudel.ts`:
   - Multi-bar cycle analysis: if an $N$-bar track is periodic every bar (16 steps), emit only 1 bar without `.slow(N)`.
   - Multi-cycle sequence folding: if an $N$-bar track differs across bars (e.g. downbeat crash or motif solo on bar 0), decompose into 1-bar chunks and format with Strudel cycle alternation `<bar0 bar1 ...>`.
   - Sub-pattern compression: detect repeating subsequences inside a bar and compress to `[sub]*K` (e.g. `[sd ~!2]*3`, `[rim ~]*6`).
2. `src/rhythm/atom-pattern.ts` & `src/rhythm/molecule-pattern.ts`:
   - Compute note durations and subdivisions ($1/1$ to $1/32$) based on atomic mass (heavier atoms sustain longer) and electronegativity (oxidizers get snappy transient / 1/32 subdivisions).
   - Reflect in Strudel notation (multipliers or subdivision brackets) and IR `RhythmEvent.durationTicks`.

**Tech Stack:** TypeScript, Vitest, Web Audio API, Strudel Mini-Notation.

**Spec:** User feedback on Strudel export readability, request for periodic/algorithmic patterns instead of sheets of rests, and note range from $1/1$ to $1/32$ based on mass and electronegativity.

## Global Constraints
- Strudel token mappings must remain 1:1 (`bd`, `sd`, `hh`, `oh`, `cr`, `cp`, `rim`).
- Strudel output must be valid Tidal/Strudel mini-notation syntax runnable in the Strudel REPL.
- Never output multi-bar identical repetitions across 96+ steps when a track is periodic.
- All existing tests in `test/` must pass.

---

### Task 1: Periodic Cycle Folding & Multi-Bar Alternation (`<...>`) in Strudel Export

**Files:**
- Modify: `src/export/strudel.ts`
- Test: `test/export/export.test.ts`

**Interfaces:**
- Consumes: `Pattern`, `Track`, `RhythmEvent` from `src/rhythm/ir.ts`.
- Produces: `exportToStrudel(pattern, options): string` with periodic folding.

- [ ] **Step 1: Write the failing tests for periodic folding and cycle alternation**
  In `test/export/export.test.ts`:
  - Test that Benzene (`c1ccccc1`) export:
    - Does NOT contain `.slow(6)` on periodic tracks like `bd`, `hh`, `sd`, `cp`.
    - Outputs 1-bar patterns like `bd(6,16)`, `hh(6,16)`, `~!15 cp`.
    - Outputs `<...>` cycle progression for sparse/downbeat tracks (like crash or ring motif), e.g. `<cr ~!5>` or `<cr ~ ~ ~ ~ ~>`.
    - Does NOT contain giant rest chains like `~!95` or `~!85` or repeated strings across 96 steps.

- [ ] **Step 2: Run test to make sure it fails**
  Run `npx vitest run test/export/export.test.ts` and confirm failure.

- [ ] **Step 3: Implement periodic cycle folding and `<...>` cycle progression**
  In `src/export/strudel.ts`:
  - For a track with $N > 1$ bars:
    - Slice `stepGrid` into $N$ bars of 16 steps each.
    - Check if all $N$ bars are identical:
      - If identical: emit `compactMiniNotation(bar0, token)` with NO `.slow()`.
    - If not identical:
      - Compact each bar into its mini-notation.
      - If only 1 bar has hits and others are all rests:
        - Represent rests as `~` (e.g. `<bar0 ~!5>` or `<bar0 ~ ~ ~ ~ ~>`).
      - In general, wrap non-identical bars in `<bar0 bar1 ...>`.

- [ ] **Step 4: Run tests and verify they pass**
  Run `npx vitest run test/export/export.test.ts`.

- [ ] **Step 5: Commit changes**
  Commit with message `feat(export): periodic cycle folding and angle bracket cycle progression for Strudel`.

---

### Task 2: Sub-Pattern Repetition Compression (`[pat]*K`)

**Files:**
- Modify: `src/export/strudel.ts`
- Test: `test/export/export.test.ts`

**Interfaces:**
- Consumes: step arrays within a bar.
- Produces: `compactMiniNotation` capable of emitting `[pat]*K` (e.g. `[sd ~!2]*3`, `[rim ~]*6`).

- [ ] **Step 1: Write failing tests for sub-pattern repetition compression**
  In `test/export/export.test.ts`:
  - Test that an array containing `sd ~!2 sd ~!2 sd ~!2` compresses to `[sd ~!2]*3`.
  - Test that `rim ~ rim ~ rim ~ rim ~ rim ~ rim` compresses to `[rim ~]*6`.

- [ ] **Step 2: Run test to make sure it fails**
  Run `npx vitest run test/export/export.test.ts` and confirm failure.

- [ ] **Step 3: Implement sub-pattern detection and compression**
  In `src/export/strudel.ts`:
  - In `compactMiniNotation`:
    - After or alongside Euclidean matching and rest run-length compression, scan for repeated token tuples of length $L \in [2, 4, 8]$ that repeat $K \ge 2$ times.
    - Format as `[sub]*K`.

- [ ] **Step 4: Run tests and verify they pass**
  Run `npx vitest run test/export/export.test.ts`.

- [ ] **Step 5: Commit changes**
  Commit with message `feat(export): sub-pattern repetition compression in Strudel mini-notation`.

---

### Task 3: Note Durations & Subdivisions ($1/1$ to $1/32$) via Mass and Electronegativity

**Files:**
- Modify: `src/chem/atom.ts`, `src/rhythm/atom-pattern.ts`, `src/rhythm/molecule-pattern.ts`, `src/export/strudel.ts`
- Test: `test/rhythm/atom-pattern.test.ts`, `test/export/export.test.ts`

**Interfaces:**
- Consumes: `AtomConfig.electronegativity`, `AtomConfig.atomicMass`.
- Produces: dynamic `durationTicks` and rhythmic subdivision logic.

- [ ] **Step 1: Write failing tests for mass/electronegativity durations**
  In `test/rhythm/atom-pattern.test.ts`:
  - Heavy atoms (e.g. Lead, Iodine, Sulfur) produce longer note durations (up to whole / half notes).
  - High electronegativity / oxidizer atoms produce rapid subdivisions (1/32 notes or snappy gates).

- [ ] **Step 2: Run test to make sure it fails**
  Run `npx vitest run test/rhythm/atom-pattern.test.ts` and confirm failure.

- [ ] **Step 3: Implement dynamic durations in atom pattern generator**
  - Calculate duration in ticks based on normalized mass:
    - Mass < 10 (H, He, Li): 12 ticks (1/32 note)
    - Mass 10..40 (C, N, O, Na): 24 ticks (1/16 note)
    - Mass 40..100: 48 ticks (1/8 note)
    - Mass > 100: 96 ticks (1/4 note) to 192 ticks (1/2 note)
  - For high electronegativity ($\chi \ge 3.0$ like F, O, Cl, N):
    - Snappy transient, oxidizer priority, optional 1/32 subdivision for neutron/electron.

- [ ] **Step 4: Run tests and verify they pass**
  Run `npx vitest run`.

- [ ] **Step 5: Commit changes**
  Commit with message `feat(rhythm): dynamic note durations and subdivisions based on atomic mass and electronegativity`.

---

### Task 4: Full Verification, Documentation & Push

**Files:**
- Modify: `README.md` or docs if applicable
- Test: All test suites (`vitest`) and typecheck/build (`npm run build`)

- [ ] **Step 1: Run full test suite and build**
  Run `npm test` and `npm run build`.
- [ ] **Step 2: Inspect exported Strudel code for test molecules (H2, Methane, Benzene, Caffeine)**
  Ensure all exports are short, algorithmic, and free of flat monster strings.
- [ ] **Step 3: Commit and Push**
  Push to `origin/main`.
