---
name: atomic-rhythm-mapping
description: Use when generating, analyzing, extending, or testing rhythmic patterns and musical motifs derived from chemical structures, atoms, molecules, electron shells, or bonds.
---

# Atomic Rhythm Mapping

Reference specification and algorithm guide for converting chemical data into rhythmic structures.

## Overview

The Atomic Rhythm engine translates atomic and molecular physics into multi-track polyrhythmic patterns.
The core pipeline follows three decoupled stages:

```
Chemical Graph (atoms, bonds, isotopes, shells, rings)
   ↓
Rhythm IR (abstract tracks, events, ticks, velocities, articulations)
   ↓
Instrument / Output Mapping (Web Audio synth voices, MIDI notes, Strudel sounds)
```

## Core Chemical-to-Rhythm Invariants

### 1. Fundamental Particle Mapping (Default Voice Assignment)

| Particle / Feature | Default Drum Voice | GM MIDI Note | Strudel Token | Default Grid |
|---|---|---|---|---|
| **Protons ($Z$)** | Kick | 36 (`bd`) | `bd` | 16 steps (or bar segment) |
| **Neutrons ($N = A - Z$)** | Closed Hat | 42 (`hh`) | `hh` | 16 steps (or bar segment) |
| **Electrons ($e = Z - \text{charge}$)** | Snare | 38 (`sd`) | `sd` | Per shell grid ($S_i$) |
| **Bonds** | Clap | 39 (`cp`) | `cp` | Boundary step |
| **Motifs (Rings/Groups)** | Perc / Rim | 37 (`rim`) | `rim` | Motif-specific grid |

### 2. Euclidean Pattern Generation $E(k, n, \text{rotation})$

Hits $k$ are distributed across $n$ steps using Bjorklund's algorithm.

- **Underflow ($k = 0$):** Track is silent (empty pattern).
- **Normal ($0 < k \le n$):** $k$ equidistant pulses over $n$ steps.
- **Overflow ($k > n$):** Fill all $n$ steps ($k' = n$). The excess $(k - n)$ scales velocity:
  $$\text{velocity} = \min\left(1.0, \text{baseVelocity} \times \left(1 + \frac{k - n}{n}\right)\right)$$
- **Rotation:** Offsets the starting step (e.g., rotation = $n/2$ places hits on offbeats/backbeats).

### 3. Electron Shell Polyrhythms

Electrons are grouped by principal quantum level $n \in \{1..7\}$ (s-block, p-block, etc.):
- Shell 1 ($K$): 16 steps
- Shell 2 ($L$): 12 steps
- Shell 3 ($M$): 20 steps
- Shell 4 ($N$): 24 steps
- Shell 5 ($O$): 28 steps
- Shell 6 ($P$): 32 steps
- Shell 7 ($Q$): 36 steps

Each occupied shell plays as an independent polymetric layer with cycle length $S_i$.

### 4. Molecular Assembly Modes

- **Sequential Mode (Default):**
  - Molecular graph traversed via DFS order.
  - Given $\text{atomsPerBar}$ (default 2), each atom receives a subdivision segment: $\text{segmentSteps} = 16 / \text{atomsPerBar}$.
  - Total bars = $\lceil \text{atoms} / \text{atomsPerBar} \rceil$.
  - Example: $\text{H}_2$ with $\text{atomsPerBar}=2$ fits in 1 bar (steps 0..7: H1, steps 8..15: H2).
- **Overlay Mode:**
  - All atoms overlay their tracks onto the shared grid. Coinciding hits take $\max(\text{velocity})$.

### 5. Bond Articulations

Bonds trigger at the segment transition between adjacent atoms:
- **Single (-):** Single hit on step 0 of next atom's segment.
- **Double (=):** `flam` (grace note -15ms before beat, 50% velocity).
- **Triple (#):** `roll` (3 rapid hits across final 2 subdivision ticks).
- **Aromatic (:):** Standard hit (0.5 velocity), while the ring motif handles the rhythmic superstructure.
- **Ionic (.):** Microtiming swing / 1-step phase shift on target atom.

### 6. Structural Motifs (Rings and Functional Groups)

- **Aromatic 6-ring (Benzene):**
  - Triggers a 6/8 polymetric track against the 4/4 master bar.
  - 6 eighth-note pulses with primary accents on beats 1 and 4 ($\text{velocity} = 1.0$).
- **5-membered ring (e.g. Cyclopentane):**
  - 5/8 track with $E(3, 5)$ rhythm.
- **Functional Groups:**
  - `OH`: 2-hit accent figure at phrase boundary.
  - `NH2`: 3-hit triplet accent.
  - `COOH`: 4-hit punctuation.

### 7. Temperature and Excitation Engine

- **Temperature $T \in [0..100]$:**
  $$\text{BPM} = \text{baseBPM} \times (1 + T / 100)$$
- **Atom Ionization Threshold:**
  $$\text{threshold} = 100 \times \frac{\text{IE}_1 - 3.5}{20.0 - 3.5}$$
- **Excitation Event:** When $T \ge \text{threshold}$:
  - One valence electron transitions to shell $N + 1$ (migrating hits to that shell's track).
  - On the final bar of each 4-bar phrase, the atom triggers a fill (`articulation: 'fill'`) doubling electron hit density.
- **Relaxation:** When $T < \text{threshold}$, electron drops back to ground state on next phrase boundary.

## Export Formats

### Strudel Mini-Notation
```javascript
stack(
  s("bd ~ ~ ~ bd ~ ~ ~").slow(1),
  s("~ ~ sd ~ ~ ~ sd ~").slow(12/16),
  s("hh*8").gain(0.8)
)
```

### Standard MIDI File (SMF Type 1)
- PPQ: 96
- Drum channel: 10 (0-indexed 9)
- Loop expansion: LCM of active track cycle lengths (capped at 64 bars).
