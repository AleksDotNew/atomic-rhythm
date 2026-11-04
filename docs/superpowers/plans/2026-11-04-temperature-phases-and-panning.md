# Non-Linear Temperature, Phase Transitions & 2D Spatial Panning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a thermodynamic non-linear temperature engine ($-273.15^\circ\text{C} \dots +5000^\circ\text{C}$) with universal phase transitions (Solid, Liquid, Gas, Plasma), non-linear BPM scaling, and a 2D spatial stereo panning engine mapped to molecular graph coordinates.

**Architecture:** 
1. New `temperature.ts` module calculating non-linear BPM ($1 \dots 360\,\text{BPM}$), phase states, and bi-directional slider power-law scaling.
2. New `panning.ts` module mapping 2D layout coordinates to stereo pan ($\text{pan} \in [-0.85, +0.85]$) with low-frequency kick centering.
3. IR update (`RhythmEvent.pan`) + Web Audio `StereoPannerNode` in `DrumSynth` and `AudioScheduler`.
4. Strudel export update with `.pan(...)`.
5. UI updates in `App`: top-bar temperature slider ($-273^\circ\text{C} \dots +5000^\circ\text{C}$), phase status badge, and Atom Inspector pan display.

**Tech Stack:** TypeScript, Web Audio API (`StereoPannerNode`), Vitest, CSS Grid/Flexbox, Vite.

**Spec:** `docs/superpowers/specs/2026-11-04-temperature-phases-and-panning-design.md`

## Global Constraints
- Temperature range: $[-273.15, +5000]^\circ\text{C}$, center at $0^\circ\text{C}$.
- At $-273.15^\circ\text{C}$: BPM = 1. At $0^\circ\text{C}$: BPM = 120. At $+5000^\circ\text{C}$: BPM = 360.
- Phase states: Solid ($T < -10^\circ\text{C}$), Liquid ($-10^\circ\text{C} \le T < +150^\circ\text{C}$), Gas ($+150^\circ\text{C} \le T < +2500^\circ\text{C}$), Plasma ($T \ge +2500^\circ\text{C}$).
- Pan range: $[-0.85, +0.85]$. Kick voice centered with scale factor $\times 0.25$.
- All existing 16 Vitest test suites (60 tests) must continue passing.

---

### Task 1: Thermodynamic Temperature & Phase Transitions Engine

**Files:**
- Create: `src/rhythm/temperature.ts`
- Test: `test/rhythm/temperature.test.ts`
- Modify: `src/rhythm/excitation.ts`

**Interfaces:**
- Produces:
  ```ts
  export type PhaseState = 'solid' | 'liquid' | 'gas' | 'plasma';
  export function calculateBpm(baseBpm: number, temperature: number): number;
  export function getPhaseState(temperature: number): PhaseState;
  export function sliderToTemperature(sliderNorm: number): number; // sliderNorm in [-1, 1] -> Celsius
  export function temperatureToSlider(temperature: number): number; // Celsius -> sliderNorm in [-1, 1]
  export function formatTemperature(temperature: number): string;
  ```

- [ ] **Step 1: Write the failing unit tests for temperature calculation**

Create `test/rhythm/temperature.test.ts` testing:
- BPM at absolute zero ($-273.15^\circ\text{C}$) is 1
- BPM at $0^\circ\text{C}$ is 120 (given base 120)
- BPM at $100^\circ\text{C}$ is around 154
- BPM at $+5000^\circ\text{C}$ is 360
- Phase state transitions: $-200^\circ\text{C}$ -> solid, $20^\circ\text{C}$ -> liquid, $500^\circ\text{C}$ -> gas, $3500^\circ\text{C}$ -> plasma
- Slider conversions round-trip correctly for $0$, $-273.15$, $100$, $5000$.

- [ ] **Step 2: Run test to confirm failure**

Run `npm test test/rhythm/temperature.test.ts` and verify it fails (module not found).

- [ ] **Step 3: Implement `src/rhythm/temperature.ts`**

Implement formulas:
- Sub-zero: $K = T + 273.15$, $\text{BPM} = \max(1, \operatorname{round}(1 + (baseBpm - 1) \cdot (K / 273.15)^{0.65}))$
- Super-zero: $\text{BPM} = \operatorname{round}(baseBpm + (baseBpm \cdot 2) \cdot \sqrt{\min(5000, T) / 5000})$
- Phase thresholds: $<-10^\circ\text{C}$ solid, $<150^\circ\text{C}$ liquid, $<2500^\circ\text{C}$ gas, else plasma
- Slider mappings: $u < 0 \implies T = u \cdot 273.15$; $u \ge 0 \implies T = 5000 \cdot u^3$
- Re-export `calculateBpm` in `excitation.ts` for backward compatibility.

- [ ] **Step 4: Run tests and verify they pass**

Run `npm test` and ensure all tests pass.

- [ ] **Step 5: Commit changes**

Commit with message `feat(chem): thermodynamic non-linear temperature and phase transition engine`.

---

### Task 2: 2D Spatial Stereo Panning Engine

**Files:**
- Create: `src/rhythm/panning.ts`
- Test: `test/rhythm/panning.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export function computeAtomPans(coords: readonly { x: number; y: number }[]): number[];
  export function adjustPanForVoice(pan: number, voice: string): number;
  export function formatPanLabel(pan: number): string; // e.g. "L 42%", "Center", "R 60%"
  ```

- [ ] **Step 1: Write the failing unit tests for panning**

Create `test/rhythm/panning.test.ts` testing:
- Monatomic molecule (1 atom or all coords equal) returns `pan = 0.0`
- Diatomic horizontal bond returns symmetric pans: left atom negative, right atom positive
- Ring or chain returns pans distributed in $[-0.85, 0.85]$
- `adjustPanForVoice` with voice `'kick'` scales pan by $0.25$
- `formatPanLabel`: negative -> `L X%`, near zero -> `Center`, positive -> `R X%`

- [ ] **Step 2: Run test to confirm failure**

Run `npm test test/rhythm/panning.test.ts` and confirm failure.

- [ ] **Step 3: Implement `src/rhythm/panning.ts`**

Implement `computeAtomPans`, `adjustPanForVoice`, and `formatPanLabel`.

- [ ] **Step 4: Run tests and verify they pass**

Run `npm test` and confirm all tests pass.

- [ ] **Step 5: Commit changes**

Commit with message `feat(audio): 2D molecular spatial stereo panning engine`.

---

### Task 3: IR & Pattern Integration with Panning

**Files:**
- Modify: `src/rhythm/ir.ts`
- Modify: `src/rhythm/molecule-pattern.ts`
- Test: `test/rhythm/molecule-pattern.test.ts`

**Interfaces:**
- Modifies `RhythmEvent`:
  ```ts
  export interface RhythmEvent {
    readonly tick: number;
    readonly velocity: number;
    readonly durationTicks: number;
    readonly articulation: Articulation;
    readonly atomIndex?: number;
    readonly pan?: number; // stereo pan -1..1
  }
  ```
- Modifies `buildMoleculePattern` options:
  ```ts
  export interface MoleculePatternOptions {
    // ...
    readonly atomPans?: readonly number[];
  }
  ```

- [ ] **Step 1: Write test for pattern pan assignment**

Add test in `test/rhythm/molecule-pattern.test.ts` ensuring events receive `pan` according to `atomPans` and voice type.

- [ ] **Step 2: Run test to confirm failure**

Run `npm test test/rhythm/molecule-pattern.test.ts`.

- [ ] **Step 3: Implement `pan` field in `ir.ts` and populate in `buildMoleculePattern`**

Pass `atomPans` when generating atom and bond tracks.

- [ ] **Step 4: Run tests and verify they pass**

Run `npm test` and verify full suite passes.

- [ ] **Step 5: Commit changes**

Commit with message `feat(rhythm): attach spatial panning to rhythm events in pattern generator`.

---

### Task 4: Web Audio StereoPannerNode Synthesis & Scheduler

**Files:**
- Modify: `src/audio/synth.ts`
- Modify: `src/audio/scheduler.ts`
- Test: `test/audio/audio.test.ts`

**Interfaces:**
- Modifies `DrumSynth.trigger`:
  ```ts
  export interface DrumSynth {
    trigger(voice: SynthVoiceName, time: number, velocity: number, articulation?: string, pan?: number): void;
  }
  ```
- Scheduler extracts `evt.pan` and forwards it to `drumSynth.trigger`.

- [ ] **Step 1: Write tests for synth and scheduler pan handling**

Add test cases in `test/audio/audio.test.ts` checking `trigger` accepts pan parameter and creates/connects `StereoPannerNode` if available.

- [ ] **Step 2: Run test to confirm failure**

Run `npm test test/audio/audio.test.ts`.

- [ ] **Step 3: Implement `StereoPannerNode` in `synth.ts` and `scheduler.ts`**

In each voice synthesizer:
- If `ctx.createStereoPanner` is available, create `pannerNode = ctx.createStereoPanner()`
- Set `pannerNode.pan.setValueAtTime(pan ?? 0, time)`
- Connect `voiceGain -> pannerNode -> ctx.destination`
In `AudioScheduler.scheduleEvent`:
- Pass `evt.pan` to `this.synth.trigger(voice, noteTime, vel, evt.articulation, evt.pan)`.

- [ ] **Step 4: Run tests and verify they pass**

Run `npm test` to verify audio suite.

- [ ] **Step 5: Commit changes**

Commit with message `feat(audio): Web Audio StereoPannerNode integration in DrumSynth and Scheduler`.

---

### Task 5: Strudel Export with Panning

**Files:**
- Modify: `src/export/strudel.ts`
- Test: `test/export/export.test.ts`

**Interfaces:**
- `exportToStrudel(pattern: Pattern): string`
  Emits `.pan(...)` on tracks when events contain non-zero pan.

- [ ] **Step 1: Write test for Strudel export with pan**

Test that exported Strudel code contains `.pan(...)` modifier when events have stereo panning.

- [ ] **Step 2: Run test to confirm failure**

Run `npm test test/export/export.test.ts`.

- [ ] **Step 3: Implement pan export in `strudel.ts`**

Average track pan or per-cycle pan emitted cleanly in Strudel notation.

- [ ] **Step 4: Run tests and verify they pass**

Run `npm test` and verify export tests pass.

- [ ] **Step 5: Commit changes**

Commit with message `feat(export): include stereo panning modifiers in Strudel code generator`.

---

### Task 6: UI Controls, Temperature Slider, Phase Badge & Atom Inspector

**Files:**
- Modify: `src/ui/app.ts`
- Modify: `src/style.css`
- Modify: `index.html`
- Test: `test/ui/app.test.ts`

**Interfaces:**
- Top transport bar:
  - Slider `#slider-temp` with `min="-1000" max="1000" value="0" step="1"`
  - Temperature value `#temp-val` showing formatted value (e.g. `0°C`, `-196°C`, `+100°C`, `+5000°C`)
  - Phase badge `#phase-badge` with state classes (`phase-solid`, `phase-liquid`, `phase-gas`, `phase-plasma`)
  - Effective BPM display `#effective-bpm-val`
- Atom Inspector:
  - Displays computed spatial pan `Pan: L 34%` / `Pan: Center` / `Pan: R 50%`

- [ ] **Step 1: Write UI tests for non-linear slider and phase badge**

Add tests in `test/ui/app.test.ts` verifying:
- Slider moves change temperature non-linearly
- Phase badge updates to `Solid`, `Liquid`, `Gas`, `Plasma`
- Atom Inspector shows spatial pan info for selected atom

- [ ] **Step 2: Run test to confirm failure**

Run `npm test test/ui/app.test.ts`.

- [ ] **Step 3: Implement UI updates in `app.ts` and `style.css`**

- Connect slider events via `sliderToTemperature`
- Update `#phase-badge` content and CSS class
- Update Atom Inspector to show `Pan: ...`
- Feed computed `atomPans` into `buildMoleculePattern`

- [ ] **Step 4: Run tests and verify they pass**

Run `npm test` and verify all tests pass.

- [ ] **Step 5: Commit changes**

Commit with message `feat(ui): non-linear temperature slider with phase transition badge and atom pan inspector`.

---

### Task 7: Full System Verification & Production Build

**Files:**
- All touched files
- Production build: `dist/index.html`

- [ ] **Step 1: Run complete test suite**

Execute `npm test` and verify 100% pass across all test files.

- [ ] **Step 2: Run production build**

Execute `npm run build` and ensure bundle compiles without warnings or errors.

- [ ] **Step 3: Verification of edge cases**

Test molecules:
- Monatomic: `[P]` (Phosphorus), `[Fe]` (Iron)
- Diatomic: `[H][H]`, `O=O`
- Ring: `c1ccccc1` (Benzene)
- Complex: `CN1C=NC2=C1C(=O)N(C(=O)N2C)C` (Caffeine)
Check that panning and temperature ranges operate smoothly across all presets.

- [ ] **Step 4: Final commit and summary**

Commit any final updates.
