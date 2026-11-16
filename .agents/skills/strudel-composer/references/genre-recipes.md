# Strudel Genre Recipes & Architectural Blueprints

Production-ready archetypes across electronic, metal, prog, avant-garde, and classical music.

---

## 1. Berlin / Industrial Techno (135–150 BPM)

**Aesthetics:** Relentless four-on-the-floor kick, rolling sub rumble, syncopated offbeat hats, industrial metallic percussions, hypnotic modal synth hook.

```javascript
setcps(140 / 60 / 4)
samples('github:tidalcycles/dirt-samples')

stack(
  // 1. Kick: Four-on-the-floor
  s("bd*4")
    .gain(0.95),

  // 2. Sub Rumble (Filtered Reverb Kick tail)
  s("bd*16")
    .lpf(130).lpq(2)
    .gain(0.8)
    .pan(0.5),

  // 3. Offbeat Open Hat (Driving techno groove)
  s("[~ oh]*4")
    .gain(0.68)
    .hpf(1200),

  // 4. Closed Hats with 16th velocity modulation
  s("hh*16")
    .gain("<[0.3 0.6 0.4 0.7]*4>")
    .hpf(3000),

  // 5. Backbeat Industrial Clap on 2 and 4
  s("~ cp ~ cp")
    .room(0.3).size(0.5)
    .gain(0.75),

  // 6. Hypnotic Acid / FM Synth Ostinato (D Phrygian)
  s("saw")
    .note("<0 3 5 7 8 7 5 3>*2".scale("d2:phrygian"))
    .decay(0.12).sustain(0)
    .lpf("<350 700 1400 2800 1200 600>")
    .lpq(6)
    .distort(0.3)
    .gain(0.7)
)
```

---

## 2. IDM / Braindance (Aphex Twin, Autechre, Squarepusher)

**Aesthetics:** Micro-chopped drum breaks, probabilistic triggering (`?`), Euclidean polyrhythms, evolving microtonal FM melodies, unexpected syncopations.

```javascript
setcps(165 / 60 / 4)
samples('github:tidalcycles/dirt-samples')

stack(
  // 1. Algorithmic Micro-chopped Break
  s("bd(5,16,1)")
    .gain(0.9),

  s("<[~ sd] [~ sd:2 ~ sd:1] [~ sd:3] [sd*4]>")
    .gain(0.8)
    .distort(0.2),

  // 2. Sizzling Glitch Hats (Probabilistic micro-rolls)
  s("[hh*4 [hh*8]?0.4 hh*2 [hh*16]?0.2]")
    .pan("<0.2 0.8 0.4 0.6>")
    .gain(0.55),

  // 3. Generative Percussion (Odd meter rimshot pulse)
  s("rim(7,16)")
    .delay(0.25).delaytime(3/16).delayfeedback(0.5)
    .gain(0.6),

  // 4. Evolving Ambient FM Pad (Dorian #4 / Lydian)
  s("triangle")
    .note("<[c3,g3,d4] [eb3,bb3,f4] [f3,c4,g4] [g3,d4,a4]>")
    .attack(0.4).release(0.8)
    .lpf(1600).lpq(2)
    .room(0.8).size(0.9)
    .gain(0.5),

  // 5. Pointillistic Glass Lead
  s("sine")
    .n("0 7 12 14 17 19 24".scramble())
    .scale("c:lydian")
    .decay(0.08).sustain(0)
    .delay(0.4).delaytime(1/8)
    .jux(rev)
    .gain(0.5)
)
```

---

## 3. Djent & Math Metal (Meshuggah, Animals as Leaders)

**Aesthetics:** Metric modulation, massive polymeter (e.g. 23/16 or 17/16 guitar/kick ostinato chugging underneath a steady 4/4 china/crash cymbal pulse), herta triplets, palm-mute grit.

```javascript
// Steady 4/4 quarter pulse on cymbals (120 BPM):
setcps(120 / 60 / 4)
samples('github:tidalcycles/dirt-samples')

stack(
  // 1. Timekeeper: Constant 4/4 China / Snare backbeat
  s("cr*4")
    .gain(0.7)
    .hpf(4000),

  s("~ sd ~ sd")
    .gain(0.85)
    .room(0.2),

  // 2. Meshuggah-style Polymetric Kick & Chug Bass (23/16 riff cycling over 4/4)
  // Riff: 3 + 3 + 3 + 3 + 3 + 3 + 5 = 23 sixteenths!
  s("[bd!3 ~!2 bd!3 ~!2 bd!3 ~!2 bd!3 ~!2 bd!5 ~!2]%23")
    .gain(0.95),

  // 3. Distorted Down-Tuned 8-String Guitar Chug (Drop E1 / F1)
  s("saw")
    .note("[f1!3 ~!2 f1!3 ~!2 f1!3 ~!2 f1!3 ~!2 gb1!2 f1!3 ~!2]%23")
    .decay(0.09).sustain(0.1).release(0.05)
    .distort(0.8)
    .lpf(2200).lpq(4)
    .gain(0.85)
    .pan(0.5),

  // 4. Ghost Snare / Ghost Ghost Ghost accents
  s("[~ [sd:2]?0.6 ~ [sd:2]?0.4]%23")
    .gain(0.5)
)
```

---

## 4. King Crimson / Math Rock Polymetric Phasing (Discipline Era)

**Aesthetics:** Two clean, interlocking guitars in differing meters (e.g. Guitar 1 in 5/8, Guitar 2 in 6/8 over 4/4 bass), Chapman stick ostinato, Steve Reich-style phasing.

```javascript
setcps(130 / 60 / 4)
samples('github:tidalcycles/dirt-samples')

stack(
  // 1. Guitar 1: Clean Adrian Belew 5/8 arpeggio (L-channel)
  s("sine")
    .n("0 2 4 7 9")
    .scale("a3:dorian")
    .decay(0.12).sustain(0)
    .pan(0.15)
    .delay(0.3).delaytime(3/16)
    .gain(0.65),

  // 2. Guitar 2: Robert Fripp 6/8 counterpoint (R-channel)
  s("sine")
    .n("7 4 2 11 9 7")
    .scale("a3:dorian")
    .decay(0.12).sustain(0)
    .pan(0.85)
    .delay(0.3).delaytime(2/16)
    .gain(0.65),

  // 3. Tony Levin Chapman Stick (Hypnotic driving 4/4 root foundation)
  s("triangle")
    .note("<a1 [a1 e2] [a1 d2] [a1 g2]>")
    .decay(0.2).sustain(0.4)
    .lpf(600)
    .gain(0.85)
    .pan(0.5),

  // 4. Bill Bruford Percussion (Yellow Shark woodblocks & slit drum)
  s("rim(5,16)")
    .pan("<0.3 0.7 0.4 0.6>")
    .gain(0.6),

  s("hh(7,16)")
    .gain(0.5)
)
```

---

## 5. Contemporary Art Music / Minimalism (Steve Reich, Philip Glass, Stravinsky)

**Aesthetics:** Additive rhythmic structures (Stravinsky *Rite of Spring*), canon by augmentation/diminution, phase shifting (Reich *Drumming* / *Music for 18 Musicians*), modal purity.

```javascript
setcps(120 / 60 / 4)
samples('github:tidalcycles/dirt-samples')

stack(
  // Voice A: Reference Pattern (6/8 African bell bell pattern)
  s("sine")
    .n("0 2 4 5 7 9 11 12")
    .scale("d4:major")
    .struct("1 0 1 1 0 1 0 1 1 0 1 0")
    .decay(0.15)
    .pan(0.2)
    .gain(0.7),

  // Voice B: Phasing Voice (gradually accelerates by 1.005x to shift phase)
  s("triangle")
    .n("0 2 4 5 7 9 11 12")
    .scale("d4:major")
    .struct("1 0 1 1 0 1 0 1 1 0 1 0")
    .fast(1.002)
    .decay(0.15)
    .pan(0.8)
    .gain(0.7),

  // Low Marimba Root Pulse
  s("sine")
    .note("<d2 a1 b1 g1>")
    .decay(0.3)
    .gain(0.8)
    .pan(0.5)
)
```
