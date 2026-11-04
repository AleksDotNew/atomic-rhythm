# Design Specification: Non-Linear Temperature, Phase Transitions & 2D Spatial Panning

**Date:** 2026-11-04  
**Status:** Approved  
**Author:** Pair programming session (Antigravity & User)

---

## 1. Overview & Goals

Atomic Rhythm maps molecular chemistry into algorithmic rhythmic patterns. This specification establishes two major physical-to-musical enhancements:
1. **Thermodynamic Non-Linear Temperature & Phase Transition Engine:**
   - Physical temperature range: from absolute zero ($-273.15^\circ\text{C}$ / $0\,\text{K}$) to extreme plasma ($+5000^\circ\text{C}$).
   - Symmetric-power non-linear UI slider centered at $0^\circ\text{C}$ ($273.15\,\text{K}$).
   - Aggregate phase states: **Solid**, **Liquid**, **Gas**, **Plasma** with live status indicator.
   - Non-linear tempo calculation reflecting kinetic thermal velocity ($v \propto \sqrt{T}$):
     - At $-273.15^\circ\text{C}$: $1\,\text{BPM}$ (cryogenic stasis).
     - At $0^\circ\text{C}$: $120\,\text{BPM}$ (ambient liquid baseline).
     - At $+5000^\circ\text{C}$: $360\,\text{BPM}$ (fully ionized plasma limit).
   - Phase-dependent rhythmic micro-dynamics (rigid timing in solids, velocity jitter in gases, ionization cascades in plasma).
2. **2D Spatial Stereo Panning Engine:**
   - Extraction of normalized horizontal coordinates $X$ from the 2D molecular force-directed graph.
   - Automatic pan assignment $\text{pan} \in [-0.85, +0.85]$: left atoms sound left, right atoms sound right, central rings sound center.
   - Low-frequency kick anchor (kick pan scaled to $\times 0.25$ to preserve sub-bass center focus).
   - Web Audio `StereoPannerNode` support in `DrumSynth` and `AudioScheduler`.
   - Pan serialization in IR (`RhythmEvent.pan`) and Strudel export (`.pan(...)`).
   - Pan readout in Atom Inspector (`Pan: L 45%`, `Pan: Center`, `Pan: R 60%`).

---

## 2. Mathematical & Algorithmic Formulation

### 2.1 Temperature & BPM Formula
Temperature $T \in [-273.15, 5000]^\circ\text{C}$.

1. **Sub-zero to Absolute Zero ($T \le 0^\circ\text{C}$):**
   Let $K = T + 273.15 \in [0, 273.15]$.
   $$\text{BPM}(T) = \max\left(1, \operatorname{round}\left(1 + 119 \cdot \left(\frac{K}{273.15}\right)^{0.65}\right)\right)$$
2. **Super-zero to Plasma ($T > 0^\circ\text{C}$):**
   $$\text{BPM}(T) = \operatorname{round}\left(120 + 240 \cdot \sqrt{\frac{\min(5000, T)}{5000}}\right)$$

### 2.2 Phase State Classification
Given temperature $T^\circ\text{C}$:
- **Solid (❄️):** $T < -10^\circ\text{C}$
- **Liquid (💧):** $-10^\circ\text{C} \le T < +150^\circ\text{C}$
- **Gas (💨):** $+150^\circ\text{C} \le T < +2500^\circ\text{C}$
- **Plasma (⚡):** $T \ge +2500^\circ\text{C}$

### 2.3 Slider Non-Linear Mapping
Normalized slider value $u \in [-1.0, +1.0]$:
- $u = 0 \iff T = 0^\circ\text{C}$
- For $u < 0$: $T = u \cdot 273.15$
- For $u > 0$: $T = 5000 \cdot u^3$
Inverse mapping ($T \to u$):
- If $T \le 0$: $u = T / 273.15$
- If $T > 0$: $u = \sqrt[3]{T / 5000}$

### 2.4 2D Spatial Stereo Panning
For each atom $i$ with layout coordinate $x_i$:
1. $x_{\min} = \min_{j}(x_j)$, $x_{\max} = \max_{j}(x_j)$
2. If $x_{\max} - x_{\min} < 10^{-3}$: $\text{pan}_i = 0.0$
3. Else:
   $$x_{\text{center}} = \frac{x_{\min} + x_{\max}}{2}, \quad x_{\text{span}} = \frac{x_{\max} - x_{\min}}{2}$$
   $$\text{rawPan}_i = \frac{x_i - x_{\text{center}}}{x_{\text{span}}} \cdot 0.85$$
   $$\text{pan}_i = \max(-0.85, \min(0.85, \text{rawPan}_i))$$
4. Voice adjustment:
   - If voice is `'kick'`, $\text{pan} = \text{pan}_i \cdot 0.25$

---

## 3. Audio & Synthesis Integration

1. `src/audio/synth.ts`:
   - `trigger(voice: SynthVoiceName, time: number, velocity: number, articulation?: string, pan?: number): void`
   - Every voice creates a `StereoPannerNode` connected to `ctx.destination`.
2. `src/audio/scheduler.ts`:
   - Reads `evt.pan` from `RhythmEvent` and forwards it to `synth.trigger(...)`.
3. `src/export/strudel.ts`:
   - Emits `.pan(...)` in mini-notation or track-level modifiers.

---

## 4. UI & Controls

1. Header transport:
   - Slider range $-1000 \dots +1000$ mapped to $u \in [-1, 1]$.
   - Temperature readout: e.g. `-196°C`, `0°C`, `+100°C`, `+5000°C`.
   - Phase badge: `❄️ Solid`, `💧 Liquid`, `💨 Gas`, `⚡ Plasma` with corresponding color styling.
2. Atom Inspector:
   - Displays `Pan: L 40%`, `Pan: Center`, or `Pan: R 55%`.
