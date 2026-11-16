# Strudel Syntax & Live Coding Cheatsheet

A concise technical reference for Strudel (TidalCycles dialect for JavaScript / Web Audio).

---

## 1. Core Structure & Tempo

```javascript
// Set Tempo: BPM to CPS (Cycles Per Second). In 4/4 meter, 1 cycle = 1 bar = 4 beats:
setcps(140 / 60 / 4)

// Load sample bank (Dirt samples):
samples('github:tidalcycles/dirt-samples')

// Stack: layers multiple patterns simultaneously in parallel:
stack(
  s("bd*4"),
  s("~ hh ~ hh"),
  s("~ sd ~ sd")
)
```

---

## 2. Mini-Notation Rhythmic Syntax

| Syntax | Name | Example | Explanation |
|---|---|---|---|
| ` ` (space) | Sequence | `"bd sd"` | Divides the cycle equally: 1st half `bd`, 2nd half `sd`. |
| `~` | Rest (Silence) | `"bd ~ sd ~"` | Silence for that subdivision. |
| `[a b]` | Sub-division | `"bd [hh hh] sd ~"` | Groups `hh hh` into the space of one step. |
| `*N` | Multiply / Speed up | `"hh*8"` | Repeats 8 times within its allotted step/cycle. |
| `/N` | Divide / Slow down | `"bd/2"` | Plays over 2 cycles (half speed). |
| `!N` | Repeat / Replicate | `"bd!3 ~"` | Equivalent to `"bd bd bd ~"`. |
| `@N` | Weight / Elongate | `"bd@3 sd"` | `bd` takes 3/4 of the duration, `sd` takes 1/4. |
| `<a b c>` | Alternation (Cycle-by-cycle) | `"<bd sd cp>"` | Bar 1: `bd`, Bar 2: `sd`, Bar 3: `cp`. |
| `(k, n, r)` | Euclidean Bjorklund | `"bd(3,8)"` | 3 equidistant pulses across 8 steps (Tresillo). Optional `r` is rotation. |
| `[a, b]` | Polyrhythm / Parallel | `"[bd*4, hh*6]"` | Plays 4 against 6 simultaneously in the same duration. |
| `[a b]%c` | Polymeter / Step-locked | `"[bd hh sd]%5"` | Steps advance on a grid of 5, shifting phase every bar. |
| `?` | Probability | `"hh?"` | 50% chance of triggering. `"hh?0.8"` = 80% chance. |
| `|` | Random choice | `"bd [sd|cp]"` | Randomly picks either `sd` or `cp` on that step. |
| `:` | Sample index | `"bd:2"` | Uses the 3rd sample in the `bd` directory. |

---

## 3. Melody, Harmony, Scales & Chords

### Note & Scale Mapping
```javascript
// Explicit note names with octave:
note("c3 e3 g3 b3")

// Scale degrees (0-indexed) within a named scale:
n("0 2 4 6 7 9 11").scale("c:minor")

// Supported scales:
// "c:major", "c:minor", "c:dorian", "c:phrygian", "c:lydian", "c:mixolydian", "c:locrian",
// "c:hungarianMinor", "c:doubleHarmonic", "c:diminished", "c:wholeTone", "c:chromatic"

// Chords:
note("<c'min7 f'7 bb'maj7 eb'maj7>")
n("<[0,2,4,6] [1,3,5,7]>").scale("d:dorian")

// Chord voicings / arpeggiation:
note("c'min9").arp("0 1 2 3 4 3 2 1")
```

---

## 4. Synthesis & Sound Design Parameters

### Oscillators & Tone Generation
* `sound("saw" | "sine" | "square" | "triangle")` or short `s(...)`
* `freq(440)` or `note("a4")`
* `fm(2)`: Frequency Modulation index
* `fmf(3.5)`: FM multiplier ratio

### Filter & Dynamics
* `.lpf(800)`: Low-Pass Filter cutoff in Hz (or pattern: `.lpf("<400 800 1600 3200>")`)
* `.lpq(4)`: Filter resonance / Q-factor (0..20)
* `.hpf(200)`: High-Pass Filter cutoff in Hz (cleans sub rumble from non-bass tracks)
* `.bpf(1200)`: Band-Pass Filter

### ADSR Amplitude Envelope
* `.attack(0.01)`: Attack time in seconds
* `.decay(0.15)`: Decay time
* `.sustain(0.4)`: Sustain level (0..1)
* `.release(0.3)`: Release time
* `.legato(0.8)`: Note duration factor relative to step length (prevents tail overlap)

### Saturation, Distortion & Bitcrush
* `.distort(0.4)`: Overdrive / saturation (0..1)
* `.crush(6)`: Bit-depth reduction (e.g. 4..8 bits for lofi/industrial grit)
* `.coarse(4)`: Sample rate downsampling

### Space, Stereo & Delay
* `.pan(0.5)`: Stereo pan (0.0 = Left, 0.5 = Center, 1.0 = Right)
* `.jux(rev)`: Dual-mono stereo spread (left ear original, right ear reversed)
* `.room(0.5)`: Reverb send amount
* `.size(0.8)`: Reverb room size
* `.delay(0.4)`: Delay wet amount
* `.delaytime(3/16)`: Delay time in fractions of a cycle (e.g. dotted 8th note = `3/16`)
* `.delayfeedback(0.6)`: Delay feedback tail

---

## 5. Mix Engineering & Headroom Rules (Preventing "Звуковая Каша")

1. **Gain Staging Hierarchy:**
   * Never leave everything at default 1.0.
   * Kick (`bd`): `gain(0.95)`
   * Snare / Clap (`sd`, `cp`): `gain(0.75 - 0.85)`
   * Closed Hat (`hh`): `gain(0.45 - 0.55)`
   * Open Hat (`oh`): `gain(0.6 - 0.7)`
   * Bassline: `gain(0.8 - 0.85)`
   * Percussion / Rimshots: `gain(0.55 - 0.65)`
   * Ambient Pads / Synths: `gain(0.4 - 0.6)`

2. **Frequency Slotting:**
   * Put `.hpf(120)` on hats, claps, snares, and guitars/synths to remove bass clash with the kick.
   * Put `.lpf(180)` on dedicated sub-bass so it doesn't mask mid-range instruments.

3. **Decay & Overlap Control:**
   * On fast notes (`*16` or 16th-note arps), always specify `.decay(0.08).legato(0.6)` so tails don't pile up into a wall of mud.
