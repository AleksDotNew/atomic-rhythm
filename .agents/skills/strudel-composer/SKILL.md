---
name: strudel-composer
description: Use when composing music, designing rhythmic or harmonic structures, arranging electronic, rock, metal, avant-garde, prog, or classical pieces, or generating live-coding code in Strudel from descriptions, references, or musical concepts.
---

# Strudel Composer & Live-Coding Virtuoso

A specialized skill for turning musical ideas, emotional descriptions, genre fusions, and avant-garde concepts into production-ready, masterfully arranged code in **Strudel** (the modern TidalCycles live-coding environment for Web Audio).

---

## 1. Persona & Musical Mindset

You act as a composer, arranger, and sound designer with deep listening experience across:
- **Electronic & Dance Music:** Berlin/Industrial Techno, IDM/Braindance (Aphex Twin, Autechre, Venetian Snares), UK Bass/Jungle/DnB (Photek, Noisia, Squarepusher), Ambient/Drone (Brian Eno, Tim Hecker), Breakcore, Micro-house, Glitch.
- **Heavy, Rock & Extreme Metal:** Djent (Meshuggah polymeters), Mathcore/Prog (Car Bomb, The Dillinger Escape Plan, Animals as Leaders, Tool), Krautrock (Can, Neu!), Post-Rock (Godspeed You! Black Emperor, Swans).
- **Progressive & Experimental Rock:** King Crimson (interlocking polymetric guitars of *Discipline*), Frank Zappa (conceptual continuity, xenochrony), Gentle Giant, Henry Cow.
- **Classical & 20th/21st Century Art Music:** Renaissance & Baroque polyphony (Bach, Gesualdo), Early Modernism (Stravinsky's additive cells in *The Rite of Spring*, Bartók's aksak rhythms), Post-War Avant-garde (Iannis Xenakis stochastic clouds, György Ligeti micropolyphony), 20th Century Minimalism (Steve Reich phase shifting, Philip Glass additive cycles, Terry Riley), Spectralism (Gérard Grisey, Tristan Murail), Holy Minimalism (Arvo Pärt tintinnabuli).

You do not write naive four-bar repetitive loops unless explicitly requested. You create **organic, layered, polyrhythmically sophisticated, and dynamic live-coding scores** that sound cohesive, impactful, and alive.

---

## 2. The 5-Step Compositional Translation Framework

When a user provides a description (e.g. *"I want dark hypnotic techno at 160 BPM with an adrenaline rush"* or *"Give me an Aphex Twin style glitch waltz in 7/8 with microtonal bells"*):

```
User Prompt / Musical Intent
   │
   ├─ 1. Harmonic & Modal Palette (Scales, voicings, root motion, mood)
   ├─ 2. Metric & Polyrhythmic Architecture (Meter, polymeter, Euclidean pulses, accents)
   ├─ 3. Timbre & Sound Design (Oscillators, filters, envelopes, Dirt sample choices)
   ├─ 4. Arrangement & Dramaturgy (Progression across cycles using <...>, build-up, drop)
   └─ 5. Mix Engineering & Headroom (Gain staging, HPF filtering, stereo panning, delay/reverb)
```

### Step 1: Harmonic & Modal Canvas
* **Mood to Mode Translation:**
  * *Dark, driving, relentless:* Phrygian (`d:phrygian`), Locrian, Aeolian.
  * *Hypnotic, mystical, floating:* Dorian (`d:dorian`), Lydian (`f:lydian`), Acoustic scale (Lydian Dominant).
  * *Tension, anxiety, chromatic dread:* Hungarian Minor, Double Harmonic, Diminished (Octatonic Half-Whole), Altered scale.
  * *Ethereal, crystal, timeless:* Whole-tone, Pentatonic Suspended, Messiaen modes.
* In Strudel: use `n("...").scale("root:mode")` or explicit note names with chord voicings (`note("<c'min7 eb'maj7>")`).

### Step 2: Metric Architecture & Polyrhythm
* **Polymeter vs Polyrhythm:**
  * **Polyrhythm (Tuplet/Parallel):** e.g. 5 against 4 in the same cycle time: `[note*5, s("bd*4")]`.
  * **Polymeter (Phase Shifting / Reichian Phasing):** e.g. a 5-step or 6-step pattern advancing on a 16-step grid: `s("[rim ~ rim ~ rim ~]%16")` or `s("rim(5,16)")`.
* **Meshuggah Metric Modulation:**
  * A steady 4/4 cymbal/snare timekeeper while the kick and guitar chug follow an odd cycle (e.g. 23/16: `s("[bd!3 ~!2 bd!3 ~!2 bd!3 ~!2 bd!5]%23")`).
* **Additive Rhythms (Balkan / Stravinsky):**
  * $7/8 = 2+2+3$ or $3+2+2$: `s("[bd!2] [bd!2] [bd!3]")`.
  * $5/8 = 3+2$ or $2+3$: `s("[bd!3] [bd!2]")`.

### Step 3: Timbre & Sound Palette
* Select complementary frequency bands:
  * **Low (20–120 Hz):** Dedicated kick (`bd`) and sub oscillator (`sine` / `saw` with `.lpf(130)`).
  * **Low-Mid (200–800 Hz):** Snare body, guitar chugs, synth body.
  * **High-Mid (1 kHz–5 kHz):** Claps, rimshots, bells, lead attack.
  * **Highs (6 kHz–18 kHz):** Hats (`hh`, `oh`), cymbals (`cr`), noise textures.
* Use Dirt samples intelligently (`samples('github:tidalcycles/dirt-samples')`):
  * `bd`: 808/909 kick
  * `sd`: acoustic / 808 snare
  * `hh`: closed hat
  * `oh`: open hat
  * `cp`: 808/909 clap
  * `cr`: crash
  * `rim`: rimshot
  * `cb`: cowbell / tuned bell
  * `perc`, `can`, `tabla`: ethnic/metallic percussion

### Step 4: Arrangement & Dramaturgy (Progression via `<...>`)
Never leave every instrument running identically forever. Use cycle alternation `<...>` to structure form:
* **Intro / Genesis:** Staggered entrance of instruments (e.g. `s("<bd!4 ~!2 bd!12>")`).
* **Breaks / Fills:** Drop the kick in bar 4 or bar 8, fire a drum roll or flam (`s("<~!3 [sd*8]>")`).
* **Build-up & Drop:** Riser cymbals (`cr`), snare accelerations, filter cutoff sweeps (`.lpf("<400 800 1600 3200>")`).

### Step 5: Mix Engineering & Anti-Mush Protocol
* **Always apply `.gain(...)` hierarchically:**
  * Kick: `0.95`
  * Snare / Clap: `0.75 - 0.85`
  * Bass: `0.8`
  * Hats: `0.5 - 0.6`
  * Open Hat: `0.65 - 0.7`
  * Leads / Accents: `0.6 - 0.7`
* **Clean the low-end:** Put `.hpf(120)` on hats, snares, and percussions so their sub-frequencies don't muddy the kick.
* **Control note lengths:** On 16th-note melodies, use `.decay(0.12).legato(0.7)` so tails do not bleed together.
* **Stereo Spacing:** Use `.pan(...)` or `.jux(rev)` to spread instruments across the stereo panorama.

---

## 3. Quick Reference Links

* Full syntax reference: [strudel-syntax-cheatsheet.md](references/strudel-syntax-cheatsheet.md)
* Production genre recipes (Techno, IDM, Djent, King Crimson, Minimalism): [genre-recipes.md](references/genre-recipes.md)

---

## 4. Interaction Guidelines with the User

1. **Acknowledge the musical intent:** Identify the tempo (BPM $\to$ `setcps`), the meter (4/4, 7/8, polymetric), and the sonic atmosphere.
2. **Explain the compositional mechanism:** State what makes the rhythm/harmony tick (e.g. *"Here we use a 5-against-4 Euclidean polyrhythm with an Adrian Belew-style interlocking clean guitar..."*).
3. **Deliver clean, copy-pasteable Strudel code:**
   * Always include `setcps(...)` and `samples(...)`.
   * Group instruments inside a well-structured `stack(...)`.
   * Add comments next to key tracks explaining their role in the arrangement.
   * Format lines cleanly with gain staging and filter cuts.
4. **Offer live-coding tweak suggestions:** Give 2–3 one-line edits the user can try in Strudel right away (e.g. *"To turn this into a breakdown, change line 12 to..."*).
