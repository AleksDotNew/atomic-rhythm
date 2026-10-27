# Atomic Rhythm

Single-page web application for algorithmic rhythm generation derived from chemical and atomic structures.

## Overview

Atomic Rhythm maps physics and chemistry into polyrhythmic structures:
- **Protons ($Z$):** Kick drum (Bjorklund Euclidean rhythm)
- **Neutrons ($N = A - Z$):** Closed hi-hat
- **Electrons ($e = Z - \text{charge}$):** Snare / claps across quantum shells ($K, L, M, N...$), creating polymetric layers
- **Bonds:** Flam (double bond), Roll (triple bond), Aromatic accent, Ionic swing
- **Motifs:** Benzene 6/8 polyrhythm, functional groups (-OH, -NH₂, -COOH, C=O)
- **Thermodynamic Excitation:** Raising temperature accelerates BPM and excites valence electrons to higher shells, triggering musical drum fills
- **Outputs:** Real-time Web Audio drum synthesizer, Strudel mini-notation clipboard export, and Standard MIDI File (`.mid`) download.

## Running Locally

### Option 1: Standalone HTML (Zero Dependencies)
Simply open `dist/index.html` directly in any modern browser:
```bash
open dist/index.html
```
No web server, daemons, or internet connection required.

### Option 2: Development & Testing
```bash
# Run test suite (48 unit tests)
npm test

# Build single-file production bundle
npm run build
```

## Documentation & Skill
- [Design Spec](docs/superpowers/specs/2026-10-27-atomic-rhythm-design.md)
- [Implementation Plan](docs/superpowers/plans/2026-10-27-atomic-rhythm.md)
- [Agent Skill: Atomic Rhythm Mapping](.agents/skills/atomic-rhythm-mapping/SKILL.md)
