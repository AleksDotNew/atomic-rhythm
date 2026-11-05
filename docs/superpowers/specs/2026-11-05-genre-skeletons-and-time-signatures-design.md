# Genre Skeletons and Time Signature Engine Design Document

## 1. Overview & Motivation
Atomic Rhythm translates chemical molecules into polyrhythmic patterns. When mapping raw atomic numbers $Z$, neutrons $N$, and electrons directly into Euclidean patterns, high atomic numbers (e.g. Carbon $Z=6$, Nitrogen $Z=7$, Oxygen $Z=8$) generate 6–8 kick drum hits per 4/4 bar. At 174 BPM (Drum & Bass tempo), this produces excessive low-frequency density and destroys the genre's backbeat foundation.

This subsystem introduces:
1. **Genre Skeletons:** Metric anchors that preserve genre identity (DnB backbeats, Techno four-on-the-floor, Hip-hop boom-bap) while mapping molecular physics (isotopes, valence, bonds, rings, mass) to syncopation, ghost notes, and polyrhythmic fills.
2. **Variable Time Signatures:** Fixed meters (`4/4`, `3/4`, `6/8`, `7/8`, `5/4`) and an **Adaptive Meter Mode** where bar time signatures are dynamically driven by molecular ring topology (5-rings $\to$ 5/8, 6-rings $\to$ 6/8, linear chains $\to$ 4/4).

## 2. Architecture & Components

```
Chemical Graph (atoms, bonds, rings)
   ↓
[Time Signature Resolver]
   ├── Global Fixed: 4/4, 3/4, 6/8, 7/8, 5/4
   └── Adaptive Mode: 5-ring → 5/8, 6-ring → 6/8, chain → 4/4
   ↓
[Genre Skeleton Engine]
   ├── Raw Physics: Direct Euclidean E(k, n)
   ├── Drum & Bass: 174 BPM, snare on beats 2 & 4, kick on beat 1 + Z syncopation, rolling 16th hats
   ├── Techno: 128 BPM, four-on-the-floor kick, offbeat open hat, claps on 2 & 4
   └── Hip-Hop: 90 BPM, boom-bap kick, snare on beat 3 / 2 & 4, trap rolls
   ↓
Rhythm IR (Pattern with variable bar ticks, timeSignatures array)
   ↓
Synth / Scheduler / UI Canvas / Exporters (Strudel & MIDI)
```

### 2.1 File Organization
- `src/rhythm/genre-skeletons.ts`:
  - Definition of `GenreSkeletonId`: `'raw' | 'dnb' | 'techno' | 'hiphop'`
  - Implementation of genre skeleton functions and default BPM mappings.
- `src/rhythm/time-signature.ts`:
  - Meter definitions: `[numerator, denominator]`
  - Step counts, bar ticks (`PPQ = 96`), and accent patterns.
  - Adaptive meter resolution from molecular analysis.
- `src/rhythm/ir.ts`:
  - Extension of `Pattern` interface:
    - `timeSignature: readonly [number, number]` (primary meter)
    - `timeSignatures?: readonly (readonly [number, number])[]` (per-bar meters)
    - `barTicks?: readonly number[]` (per-bar durations in ticks)
- `src/rhythm/molecule-pattern.ts`:
  - Support `genre: GenreSkeletonId` and `meterOption: TimeSignatureOption` in `MoleculePatternOptions`.
- `src/export/strudel.ts` & `src/export/midi.ts`:
  - Polyrhythmic / variable meter Strudel output.
  - MIDI Time Signature meta events (FF 58 04 nn dd cc bb).
- `src/ui/app.ts` & `index.html`:
  - Style dropdown: `[ Raw Physics | Drum & Bass | Techno | Hip-Hop ]`
  - Time Signature dropdown: `[ 4/4 | 3/4 | 6/8 | 7/8 | 5/4 | Adaptive (Rings) ]`

## 3. Genre Skeletons Specification

### 3.1 Drum & Bass (`dnb`, 174 BPM)
- **Snare (`sd`):**
  - Rigid backbeat on beats 2 and 4 (steps 4 and 12 in 16-step grid).
  - External shell electrons mapped to ghost notes ($v \in [0.35, 0.5]$) on steps 7, 14, 15.
  - Double bonds ($=$) trigger snare flams/rushes.
- **Kick (`bd`):**
  - Beat 1 (step 0): anchor hit ($v = 1.0$).
  - Second syncopated hit: step is modulated by $Z$:
    - Even $Z$: step 10 (classic two-step).
    - Odd $Z$: step 11 (rolling syncopation).
    - $Z \ge 8$ (Oxygen/heavier): optional ghost kick on step 14.
  - Capped at max 2–3 kicks per bar.
- **Hats (`hh`):**
  - Continuous 16th-note rolling groove (`hh*16`), velocity modulated by neutron count.
  - Open hat on offbeats.

### 3.2 Techno (`techno`, 128 BPM)
- **Kick (`bd`):** Four-on-the-floor on steps 0, 4, 8, 12 ($v = 1.0$).
- **Clap / Snare (`cp`):** Layered on steps 4 and 12.
- **Open Hat (`oh`):** Offbeats on steps 2, 6, 10, 14.
- **Closed Hat / Percussion:** Driven by $Z, N, e^-$ in the 16th-note pockets.

### 3.3 Hip-Hop (`hiphop`, 90 BPM)
- **Kick (`bd`):** Heavy downbeat on step 0, syncopated kick on step 10 or 11.
- **Snare (`sd`):** Heavy backbeat on step 8 (halftime) or steps 4 & 12.
- **Hats (`hh`):** Relaxed eighth notes with electron-driven 32nd-note trap rolls.

### 3.4 Raw Physics (`raw`, 120 BPM)
- Preserves the original Euclidean Bjorklund algorithm across all tracks without genre quantization.

## 4. Time Signature Engine Specification

| Time Signature | Sixteenth Steps | Bar Ticks (PPQ=96) | Accent Grid |
|---|---|---|---|
| `4/4` | 16 | 384 | 4 quarter beats (steps 0, 4, 8, 12) |
| `3/4` | 12 | 288 | 3 quarter beats (steps 0, 4, 8) |
| `6/8` | 12 | 288 | 2 dotted quarter beats (steps 0, 6) |
| `5/8` | 10 | 240 | 3+2 or 2+3 beats (steps 0, 6 or 0, 4) |
| `7/8` | 14 | 336 | 2+2+3 or 3+2+2 (steps 0, 4, 8) |
| `5/4` | 20 | 480 | 5 quarter beats (steps 0, 4, 8, 12, 16) |

### Adaptive Meter Resolution
When `meterOption = 'adaptive'`:
For each structural unit / bar $b$ corresponding to an atom:
- If atom belongs to a 5-membered ring $\to$ `[5, 8]` (10 steps).
- If atom belongs to a 6-membered ring $\to$ `[6, 8]` (12 steps).
- If atom belongs to a 7-membered ring $\to$ `[7, 8]` (14 steps).
- Otherwise $\to$ `[4, 4]` (16 steps).

## 5. Verification & Testing Strategy
- Unit tests for each genre skeleton:
  - DnB kick count $\le 3$, snare on steps 4 and 12.
  - Techno kick on 0, 4, 8, 12.
  - Hip-Hop kick and snare anchors.
- Unit tests for time signatures:
  - Bar ticks and step counts for 3/4, 6/8, 7/8, 5/8, 5/4.
  - Adaptive resolution for fused rings (Caffeine: 6-ring $\to$ 6/8, 5-ring $\to$ 5/8).
- Export tests:
  - Strudel export produces valid code with correct cycle divisions.
  - MIDI export produces valid SMF with time signature meta events.
- UI tests for dropdown switching and BPM update.

