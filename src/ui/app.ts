import { analyzeMolecule, MolecularAnalysis, computeOrderedSequence, OrderStrategy } from '../chem/analysis';
import { Molecule } from '../chem/molecule';
import { MoleculePreset, PRESETS } from '../chem/presets';
import { parseSmiles } from '../chem/smiles';
import { AudioScheduler } from '../audio/scheduler';
import { createDrumSynth, DrumSynth, SynthVoiceName } from '../audio/synth';
import { createSampleBank, SampleBank, samples } from '../audio/samples';
import { exportToMidi } from '../export/midi';
import { exportToStrudel } from '../export/strudel';
import { isAtomExcited } from '../rhythm/excitation';
import {
  calculateBpm,
  getPhaseState,
  sliderToTemperature,
  temperatureToSlider,
  formatTemperature,
} from '../rhythm/temperature';
import { computeAtomPans, formatPanLabel } from '../rhythm/panning';
import { computeMoleculeLayout } from '../viz/layout';
import { Pattern } from '../rhythm/ir';
import { DEFAULT_MOD_MATRIX, ModulationMatrix, ModRoute, ModSource, ModDest } from '../rhythm/modmatrix';
import { buildMoleculePattern, FormMode, PlaybackMode } from '../rhythm/molecule-pattern';
import { buildFormSequence } from '../rhythm/form';
import { loadRecipes, saveRecipe, SavedRecipe } from '../storage/db';
import { MoleculeSvgView, VOICE_BADGES, ELEMENT_COLORS } from '../viz/molecule-svg';
import { SequencerGridView } from '../viz/sequencer-grid';

export class App {
  private currentMolecule: Molecule;
  private currentAnalysis: MolecularAnalysis;
  private currentPattern: Pattern;
  private currentMatrix: ModulationMatrix = {
    routes: DEFAULT_MOD_MATRIX.routes.map(r => ({ ...r })),
  };

  private baseBpm: number = 120;
  private temperature: number = 0;
  private playbackMode: PlaybackMode = 'sequential';
  private formMode: FormMode = 'direct';
  private atomsPerBar: number = 2;
  private orderStrategy: OrderStrategy = 'structural';
  private customOrder: number[] = [];
  private atomPans: number[] = [];

  private selectedAtomIndex: number = 0;
  private atomVoiceOverrides: Record<number, SynthVoiceName | 'default' | 'mute'> = {};

  private audioCtx: AudioContext | null = null;
  private drumSynth: DrumSynth | null = null;
  private scheduler: AudioScheduler | null = null;
  private activeSampleBank: SampleBank | null = null;
  private activeSamplesSpec: string | null = null;

  private svgView!: MoleculeSvgView;
  private seqView!: SequencerGridView;
  private rootElement!: HTMLElement;

  constructor() {
    // Default start with Benzene
    this.currentMolecule = parseSmiles('c1ccccc1');
    this.currentAnalysis = analyzeMolecule(this.currentMolecule);
    this.customOrder = this.currentMolecule.atoms.map((_, idx) => idx);
    const coords = computeMoleculeLayout(this.currentMolecule, this.currentAnalysis, 520, 340);
    this.atomPans = computeAtomPans(coords);
    this.currentPattern = buildMoleculePattern(this.currentMolecule, {
      mode: this.playbackMode,
      atomsPerBar: this.atomsPerBar,
      matrix: this.currentMatrix,
      temperature: this.temperature,
      atomVoiceOverrides: this.atomVoiceOverrides,
      orderStrategy: this.orderStrategy,
      customOrder: this.customOrder,
      atomPans: this.atomPans,
    });
  }

  mount(root: HTMLElement): void {
    this.rootElement = root;
    root.innerHTML = `
      <header class="transport-bar">
        <div class="brand">
          <div class="brand-icon"></div>
          <h1>Atomic Rhythm</h1>
        </div>

        <div class="transport-controls">
          <button id="btn-play" class="btn-primary">▶ Play</button>

          <div class="control-group">
            <label for="input-bpm">BPM</label>
            <input type="number" id="input-bpm" value="120" min="40" max="300" style="width: 65px;" />
          </div>

          <div class="control-group">
            <label for="slider-temp">Temp: <span id="temp-val">0°C</span></label>
            <input type="range" id="slider-temp" min="-1000" max="1000" value="0" step="1" />
            <span id="phase-badge" class="phase-badge phase-liquid">💧 Liquid</span>
            <span id="effective-bpm" style="font-size: 0.8rem; color: var(--accent-cyan);">(120 bpm)</span>
          </div>

          <div class="control-group">
            <label for="select-mode">Mode</label>
            <select id="select-mode">
              <option value="sequential">Sequential (5-Part / Cycle)</option>
              <option value="overlay">Overlay (Simultaneous)</option>
            </select>
          </div>

          <div class="control-group">
            <label for="select-order-strategy">Sequence</label>
            <select id="select-order-strategy">
              <option value="structural">Structural (Ring Cycle)</option>
              <option value="bondWeight">Bond Weight Priority</option>
              <option value="mass">Atomic Mass (Z)</option>
              <option value="electronegativity">Electronegativity (Oxidizer Priority)</option>
              <option value="custom">Custom Order</option>
            </select>
          </div>

          <div class="control-group">
            <label for="select-form">Form</label>
            <select id="select-form">
              <option value="direct">Direct Loop</option>
              <option value="assembly">Atom Assembly</option>
            </select>
          </div>

          <div class="control-group">
            <label for="input-apb">Atoms/Bar <span id="apb-subdivision" style="color: var(--accent-cyan); font-size: 0.72rem; margin-left: 2px;">(1/2)</span></label>
            <input type="number" id="input-apb" value="2" min="1" max="64" style="width: 55px;" />
            <button id="btn-fit-bars" class="btn-xs" style="margin-left: 4px;" title="Fit all molecule atoms into 1 bar">Fit 1 Bar</button>
          </div>

          <div class="control-group">
            <label for="select-soundbank">Bank</label>
            <select id="select-soundbank">
              <option value="procedural">Procedural Synth</option>
              <option value="strudel-dirt">Strudel Dirt (CDN)</option>
              <option value="custom">Custom samples(...) URL...</option>
              <option value="local">Load Audio Files...</option>
            </select>
            <span id="soundbank-status" class="bank-badge bank-badge-synth" title="Active audio soundbank. Click to view loaded samples." style="cursor: pointer;">Synth</span>
            <input type="file" id="input-sample-files" multiple accept="audio/*" style="display: none;" />
          </div>
        </div>
      </header>

      <main class="dashboard">
        <!-- Left Panel: Presets & SMILES Input -->
        <section class="panel">
          <h2>Chemical Input</h2>

          <div class="input-block">
            <label for="input-smiles">SMILES Formula</label>
            <input type="text" id="input-smiles" value="c1ccccc1" placeholder="e.g. C1CCCC1, CCO, [H][H]" />
            <div id="smiles-error" class="status-error" style="display: none;"></div>
          </div>

          <div class="input-block">
            <label>Presets</label>
            <div class="preset-list" id="preset-list"></div>
          </div>
        </section>

        <!-- Center Stage: SVG Molecular Visualization & Sequencer Grid -->
        <section class="stage-panel">
          <div class="svg-container" id="svg-container"></div>
          <div class="sequencer-container" id="seq-container"></div>
        </section>

        <!-- Right Panel: Atom Instrument Manager, Modulation Matrix & Export -->
        <section class="panel">
          <h2>Atom Instruments</h2>
          <div id="atom-inspector" class="atom-inspector-card"></div>
          <div class="atom-pills-container" id="atom-pills"></div>
          <div class="atom-quick-actions">
            <button id="btn-quick-h-hat" class="btn-xs">All H → Hat</button>
            <button id="btn-quick-c-kick" class="btn-xs">All C → Kick</button>
            <button id="btn-quick-reset" class="btn-xs">Reset All</button>
          </div>

          <div class="mod-header-row">
            <h2>Modulation Matrix</h2>
            <div class="mod-header-btns">
              <button id="btn-add-route" class="btn-xs" title="Add modulation route">+ Route</button>
              <button id="btn-reset-matrix" class="btn-xs" title="Reset routes to default">↺ Reset</button>
            </div>
          </div>
          <div class="routes-list" id="routes-list"></div>

          <h2 style="margin-top: 10px;">Export</h2>
          <div class="export-actions">
            <button id="btn-export-strudel" class="btn-secondary">📋 Copy Strudel Code</button>
            <button id="btn-export-midi" class="btn-secondary">💾 Download MIDI (.mid)</button>
          </div>
        </section>
      </main>

      <dialog id="modal-soundbank" class="soundbank-modal">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Soundbank Manager</h3>
            <button id="btn-close-soundbank-modal" class="btn-xs">✕</button>
          </div>
          <div class="modal-body">
            <div class="soundbank-summary">
              <span>Active Bank: <b id="modal-bank-name" style="color: var(--accent-cyan);">Procedural Synth</b></span>
            </div>
            <h4 style="margin: 12px 0 6px 0; font-size: 0.82rem; color: var(--text-muted); text-transform: uppercase;">Loaded Voice Samples (Strudel / Dirt)</h4>
            <div id="modal-samples-list" class="samples-status-grid"></div>

            <div class="input-block" style="margin-top: 14px;">
              <label for="input-custom-spec">Load via samples(...) URL or GitHub repository:</label>
              <input type="text" id="input-custom-spec" placeholder="github:tidalcycles/dirt-samples" value="github:tidalcycles/dirt-samples" />
              <div class="modal-actions" style="margin-top: 8px; display: flex; gap: 8px;">
                <button id="btn-load-custom-spec" class="btn-primary btn-xs">Load Strudel Samples</button>
                <button id="btn-load-dirt-preset" class="btn-secondary btn-xs">Strudel Dirt Preset</button>
              </div>
            </div>
          </div>
        </div>
      </dialog>
    `;

    // Initialize views
    const svgContainer = root.querySelector('#svg-container') as HTMLElement;
    this.svgView = new MoleculeSvgView(svgContainer);
    this.svgView.onAtomClick = (atomIndex) => {
      this.selectedAtomIndex = atomIndex;
      this.renderAtomInspector(root);
      this.renderAtomPills(root);
      this.seqView.highlightAtoms([atomIndex]);
    };

    this.svgView.onRingClick = (atomIndices) => {
      if (atomIndices.length > 0) {
        this.selectedAtomIndex = atomIndices[0];
        this.svgView.selectAtom(atomIndices[0]);
        this.renderAtomInspector(root);
        this.renderAtomPills(root);
      }
      this.seqView.highlightAtoms(Array.from(atomIndices));
    };

    this.svgView.onBondClick = (atomA, atomB) => {
      this.selectedAtomIndex = atomA;
      this.svgView.selectAtom(atomA);
      this.renderAtomInspector(root);
      this.renderAtomPills(root);
      this.seqView.highlightAtoms([atomA, atomB]);
    };

    const seqContainer = root.querySelector('#seq-container') as HTMLElement;
    this.seqView = new SequencerGridView(seqContainer);
    this.seqView.onStepClick = (atomIndex) => {
      this.selectedAtomIndex = atomIndex;
      this.svgView.selectAtom(atomIndex);
      this.renderAtomInspector(root);
      this.renderAtomPills(root);
      this.seqView.highlightAtoms([atomIndex]);
    };

    // Setup event listeners
    this.bindEvents(root);

    // Populate preset list
    this.renderPresets(root);

    // Populate routes list
    this.renderRoutes(root);

    // Window resize handler for responsive SVG layout
    window.addEventListener('resize', () => {
      const svgBox = this.rootElement?.querySelector('#svg-container') as HTMLElement | null;
      if (svgBox && this.currentMolecule) {
        const w = svgBox.clientWidth > 100 ? svgBox.clientWidth : 520;
        const h = svgBox.clientHeight > 100 ? svgBox.clientHeight : 340;
        const computedOrder = computeOrderedSequence(
          this.currentMolecule,
          this.currentAnalysis,
          this.orderStrategy,
          this.customOrder
        );
        this.svgView.render(
          this.currentMolecule,
          this.currentAnalysis,
          w,
          h,
          this.atomVoiceOverrides,
          computedOrder
        );
      }
    });

    // Render initial views
    this.updateAll();
  }

  private initAudio(): void {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
      this.drumSynth = createDrumSynth(this.audioCtx);
      if (this.activeSampleBank) {
        this.drumSynth.setSampleBank(this.activeSampleBank);
      }
      this.scheduler = new AudioScheduler(this.audioCtx, this.drumSynth);
    }
  }

  private updateAll(): void {
    const effectiveBpm = calculateBpm(this.baseBpm, this.temperature);

    const computedOrder = computeOrderedSequence(
      this.currentMolecule,
      this.currentAnalysis,
      this.orderStrategy,
      this.customOrder
    );

    const svgBox = this.rootElement?.querySelector('#svg-container') as HTMLElement | null;
    const svgWidth = svgBox && svgBox.clientWidth > 100 ? svgBox.clientWidth : 520;
    const svgHeight = svgBox && svgBox.clientHeight > 100 ? svgBox.clientHeight : 340;

    const coords = computeMoleculeLayout(this.currentMolecule, this.currentAnalysis, svgWidth, svgHeight);
    this.atomPans = computeAtomPans(coords);

    this.currentPattern = buildMoleculePattern(this.currentMolecule, {
      mode: this.playbackMode,
      atomsPerBar: this.atomsPerBar,
      matrix: this.currentMatrix,
      temperature: this.temperature,
      atomVoiceOverrides: this.atomVoiceOverrides,
      orderStrategy: this.orderStrategy,
      customOrder: this.customOrder,
      atomPans: this.atomPans,
    });

    this.svgView.selectedAtomIndex = this.selectedAtomIndex;
    this.svgView.render(
      this.currentMolecule,
      this.currentAnalysis,
      svgWidth,
      svgHeight,
      this.atomVoiceOverrides,
      computedOrder
    );

    // Check excitation for each atom
    for (let i = 0; i < this.currentMolecule.atoms.length; i++) {
      const a = this.currentMolecule.atoms[i];
      const excited = isAtomExcited(this.temperature, a.element.ionizationEnergy1);
      this.svgView.setExcited(i, excited);
    }

    // Render Sequencer Grid
    this.seqView.render(this.currentPattern);
    if (this.selectedAtomIndex !== null) {
      this.seqView.highlightAtoms([this.selectedAtomIndex]);
    }

    // Render Atom Inspector & Pills and update top bar indicators
    if (this.rootElement) {
      const tempVal = this.rootElement.querySelector('#temp-val');
      if (tempVal) tempVal.textContent = formatTemperature(this.temperature);

      const phase = getPhaseState(this.temperature);
      const phaseBadge = this.rootElement.querySelector('#phase-badge');
      if (phaseBadge) {
        phaseBadge.className = `phase-badge phase-${phase}`;
        const phaseLabel = phase === 'solid' ? '❄️ Solid' : phase === 'liquid' ? '💧 Liquid' : phase === 'gas' ? '💨 Gas' : '⚡ Plasma';
        phaseBadge.textContent = phaseLabel;
      }

      const effectiveBpmLabel = this.rootElement.querySelector('#effective-bpm');
      if (effectiveBpmLabel) {
        effectiveBpmLabel.textContent = `(${effectiveBpm} bpm)`;
      }

      this.renderAtomInspector(this.rootElement);
      this.renderAtomPills(this.rootElement);
    }

    // Update scheduler if running
    if (this.scheduler) {
      this.scheduler.setPattern(this.currentPattern, effectiveBpm);
    }
  }

  private renderAtomInspector(root: HTMLElement): void {
    const inspector = root.querySelector('#atom-inspector') as HTMLElement;
    if (!inspector) return;

    if (this.selectedAtomIndex >= this.currentMolecule.atoms.length) {
      this.selectedAtomIndex = 0;
    }

    const atom = this.currentMolecule.atoms[this.selectedAtomIndex];
    if (!atom) {
      inspector.innerHTML = `<div style="color: var(--text-muted); font-size: 0.8rem;">No atom selected</div>`;
      return;
    }

    const computedOrder = computeOrderedSequence(
      this.currentMolecule,
      this.currentAnalysis,
      this.orderStrategy,
      this.customOrder
    );
    const orderIdx = computedOrder.indexOf(this.selectedAtomIndex);
    const orderRank = orderIdx >= 0 ? orderIdx + 1 : this.selectedAtomIndex + 1;
    const bondCount = this.currentAnalysis.atomBondCounts?.[this.selectedAtomIndex] ?? 0;
    const bondWeight = this.currentAnalysis.atomBondWeights?.[this.selectedAtomIndex] ?? 1;

    const currentVoice = this.atomVoiceOverrides[this.selectedAtomIndex] || 'default';
    const color = ELEMENT_COLORS[atom.element.symbol] || '#94a3b8';

    inspector.innerHTML = `
      <div class="atom-card-header">
        <div class="atom-card-title">
          <span class="atom-symbol-badge" style="border-color: ${color}; color: ${color};">${atom.element.symbol}</span>
          <span>Atom #${this.selectedAtomIndex} ${atom.element.name}</span>
        </div>
        <div class="atom-props">${atom.protons}p ${atom.neutrons}n ${atom.electrons}e</div>
      </div>

      <div class="atom-bond-info">
        <span>Bonds: <b style="color: var(--accent-cyan);">${bondCount}</b></span>
        <span>Weight: <b style="color: var(--accent-amber);">${bondWeight.toFixed(1)}</b></span>
        <span>Valence: <b>${atom.typicalValence}</b></span>
        <span>Step: <b style="color: var(--accent-amber);">#${orderRank}/${this.currentMolecule.atoms.length}</b></span>
        <span>Pan: <b style="color: var(--accent-cyan);">${formatPanLabel(this.atomPans[this.selectedAtomIndex] ?? 0)}</b></span>
      </div>

      <div class="atom-reorder-row">
        <button id="btn-atom-earlier" class="btn-xs" ${orderIdx <= 0 ? 'disabled' : ''}>↑ Play Earlier</button>
        <button id="btn-atom-later" class="btn-xs" ${orderIdx >= computedOrder.length - 1 ? 'disabled' : ''}>↓ Play Later</button>
      </div>

      <div class="atom-voice-select-row" style="margin-top: 6px;">
        <label for="select-atom-voice">Assigned Instrument / Voice</label>
        <select id="select-atom-voice">
          <option value="default" ${currentVoice === 'default' ? 'selected' : ''}>Default (Kick/Hat/Snare)</option>
          <option value="kick" ${currentVoice === 'kick' ? 'selected' : ''}>Kick Drum (Бочка)</option>
          <option value="snare" ${currentVoice === 'snare' ? 'selected' : ''}>Snare Drum (Малый)</option>
          <option value="hat" ${currentVoice === 'hat' ? 'selected' : ''}>Closed Hi-Hat (Хэт)</option>
          <option value="openhat" ${currentVoice === 'openhat' ? 'selected' : ''}>Open Hi-Hat (Открытый хэт)</option>
          <option value="crash" ${currentVoice === 'crash' ? 'selected' : ''}>Crash Cymbal (Крэш)</option>
          <option value="clap" ${currentVoice === 'clap' ? 'selected' : ''}>Hand Clap (Хлопок)</option>
          <option value="rim" ${currentVoice === 'rim' ? 'selected' : ''}>Rimshot (Римшот)</option>
          <option value="mute" ${currentVoice === 'mute' ? 'selected' : ''}>Mute (Заглушить)</option>
        </select>
      </div>
    `;

    const select = inspector.querySelector('#select-atom-voice') as HTMLSelectElement;
    select.addEventListener('change', () => {
      const val = select.value as SynthVoiceName | 'default' | 'mute';
      this.atomVoiceOverrides[this.selectedAtomIndex] = val;
      this.updateAll();
    });

    const btnEarlier = inspector.querySelector('#btn-atom-earlier') as HTMLButtonElement | null;
    const btnLater = inspector.querySelector('#btn-atom-later') as HTMLButtonElement | null;

    if (btnEarlier) {
      btnEarlier.addEventListener('click', () => {
        if (this.orderStrategy !== 'custom') {
          this.customOrder = [...computedOrder];
          this.orderStrategy = 'custom';
          const sel = root.querySelector('#select-order-strategy') as HTMLSelectElement | null;
          if (sel) sel.value = 'custom';
        }
        const idx = this.customOrder.indexOf(this.selectedAtomIndex);
        if (idx > 0) {
          const tmp = this.customOrder[idx - 1];
          this.customOrder[idx - 1] = this.customOrder[idx];
          this.customOrder[idx] = tmp;
          this.updateAll();
        }
      });
    }

    if (btnLater) {
      btnLater.addEventListener('click', () => {
        if (this.orderStrategy !== 'custom') {
          this.customOrder = [...computedOrder];
          this.orderStrategy = 'custom';
          const sel = root.querySelector('#select-order-strategy') as HTMLSelectElement | null;
          if (sel) sel.value = 'custom';
        }
        const idx = this.customOrder.indexOf(this.selectedAtomIndex);
        if (idx >= 0 && idx < this.customOrder.length - 1) {
          const tmp = this.customOrder[idx + 1];
          this.customOrder[idx + 1] = this.customOrder[idx];
          this.customOrder[idx] = tmp;
          this.updateAll();
        }
      });
    }
  }

  private renderAtomPills(root: HTMLElement): void {
    const pillsContainer = root.querySelector('#atom-pills') as HTMLElement;
    if (!pillsContainer) return;

    pillsContainer.innerHTML = '';

    for (let i = 0; i < this.currentMolecule.atoms.length; i++) {
      const a = this.currentMolecule.atoms[i];
      const pill = document.createElement('div');
      const isSelected = i === this.selectedAtomIndex;
      pill.className = `atom-pill ${isSelected ? 'active' : ''}`;

      const color = ELEMENT_COLORS[a.element.symbol] || '#94a3b8';
      const overrideVoice = this.atomVoiceOverrides[i];
      let badgeHtml = '';
      if (overrideVoice && overrideVoice !== 'default') {
        const b = VOICE_BADGES[overrideVoice];
        badgeHtml = `<span class="badge" style="background: ${b?.color || '#38bdf8'};">${b?.label || overrideVoice.slice(0, 2).toUpperCase()}</span>`;
      }

      pill.innerHTML = `
        <span style="color: ${color}; font-weight: bold;">${a.element.symbol}${i}</span>
        ${badgeHtml}
      `;

      pill.addEventListener('click', () => {
        this.selectedAtomIndex = i;
        this.svgView.selectAtom(i);
        this.renderAtomInspector(root);
        this.renderAtomPills(root);
        this.seqView.highlightAtoms([i]);
      });

      pillsContainer.appendChild(pill);
    }
  }

  private renderSoundbankModal(root: HTMLElement): void {
    const modalBankName = root.querySelector('#modal-bank-name') as HTMLElement | null;
    const samplesList = root.querySelector('#modal-samples-list') as HTMLElement | null;
    if (modalBankName) {
      modalBankName.textContent = this.activeSampleBank ? this.activeSampleBank.name : 'Procedural Synth (Default)';
    }
    if (samplesList) {
      const allVoices: { voice: SynthVoiceName; label: string }[] = [
        { voice: 'kick', label: 'Kick (bd)' },
        { voice: 'snare', label: 'Snare (sd)' },
        { voice: 'hat', label: 'Closed Hat (hh)' },
        { voice: 'openhat', label: 'Open Hat (oh)' },
        { voice: 'crash', label: 'Crash (cr)' },
        { voice: 'clap', label: 'Clap (cp)' },
        { voice: 'rim', label: 'Rimshot (rim)' },
      ];

      samplesList.innerHTML = allVoices
        .map(({ voice, label }) => {
          const hasSample = this.activeSampleBank?.hasVoice(voice);
          const buf = this.activeSampleBank?.getBuffer(voice);
          const durationStr = buf ? ` (${buf.duration.toFixed(2)}s)` : '';
          return `
            <div class="sample-slot ${hasSample ? 'slot-loaded' : 'slot-procedural'}">
              <span class="slot-name">${label}</span>
              <span class="slot-status">${hasSample ? `✅ Sample${durationStr}` : '⚡ Procedural'}</span>
            </div>
          `;
        })
        .join('');
    }
  }

  private bindEvents(root: HTMLElement): void {
    const btnPlay = root.querySelector('#btn-play') as HTMLButtonElement;
    const inputBpm = root.querySelector('#input-bpm') as HTMLInputElement;
    const sliderTemp = root.querySelector('#slider-temp') as HTMLInputElement;
    const tempVal = root.querySelector('#temp-val') as HTMLElement;
    const effectiveBpmLabel = root.querySelector('#effective-bpm') as HTMLElement;
    const selectMode = root.querySelector('#select-mode') as HTMLSelectElement;
    const selectOrderStrategy = root.querySelector('#select-order-strategy') as HTMLSelectElement;
    const selectForm = root.querySelector('#select-form') as HTMLSelectElement;
    const inputApb = root.querySelector('#input-apb') as HTMLInputElement;
    const inputSmiles = root.querySelector('#input-smiles') as HTMLInputElement;
    const smilesError = root.querySelector('#smiles-error') as HTMLElement;
    const btnExportStrudel = root.querySelector('#btn-export-strudel') as HTMLButtonElement;
    const btnExportMidi = root.querySelector('#btn-export-midi') as HTMLButtonElement;

    // Soundbank controls
    const selectSoundbank = root.querySelector('#select-soundbank') as HTMLSelectElement | null;
    const soundbankStatus = root.querySelector('#soundbank-status') as HTMLElement | null;
    const inputSampleFiles = root.querySelector('#input-sample-files') as HTMLInputElement | null;
    const modalSoundbank = root.querySelector('#modal-soundbank') as HTMLDialogElement | null;
    const btnCloseModal = root.querySelector('#btn-close-soundbank-modal') as HTMLButtonElement | null;
    const btnLoadCustomSpec = root.querySelector('#btn-load-custom-spec') as HTMLButtonElement | null;
    const btnLoadDirtPreset = root.querySelector('#btn-load-dirt-preset') as HTMLButtonElement | null;
    const inputCustomSpec = root.querySelector('#input-custom-spec') as HTMLInputElement | null;

    const openSoundbankModal = () => {
      this.renderSoundbankModal(root);
      try {
        modalSoundbank?.showModal();
      } catch {
        if (modalSoundbank) modalSoundbank.style.display = 'block';
      }
    };

    const closeSoundbankModal = () => {
      try {
        modalSoundbank?.close();
      } catch {
        if (modalSoundbank) modalSoundbank.style.display = 'none';
      }
    };

    soundbankStatus?.addEventListener('click', () => {
      openSoundbankModal();
    });

    btnCloseModal?.addEventListener('click', () => {
      closeSoundbankModal();
    });

    const loadSpec = async (specVal: string) => {
      this.initAudio();
      if (!this.audioCtx) return;
      if (soundbankStatus) {
        soundbankStatus.textContent = 'Loading...';
        soundbankStatus.className = 'bank-badge bank-badge-loading';
      }
      try {
        const bank = await samples(this.audioCtx, specVal);
        this.activeSampleBank = bank;
        this.activeSamplesSpec = specVal;
        this.drumSynth?.setSampleBank(bank);
        if (soundbankStatus) {
          const loadedCount = (['kick', 'snare', 'hat', 'openhat', 'crash', 'clap', 'rim'] as SynthVoiceName[])
            .filter(v => bank.hasVoice(v)).length;
          soundbankStatus.textContent = `Samples (${loadedCount}/7)`;
          soundbankStatus.className = 'bank-badge bank-badge-loaded';
        }
        if (selectSoundbank) {
          selectSoundbank.value = 'custom';
        }
        this.renderSoundbankModal(root);
      } catch {
        if (soundbankStatus) {
          soundbankStatus.textContent = 'Load Failed';
          soundbankStatus.className = 'bank-badge bank-badge-error';
        }
      }
    };

    btnLoadCustomSpec?.addEventListener('click', () => {
      const spec = inputCustomSpec?.value.trim() || 'github:tidalcycles/dirt-samples';
      loadSpec(spec);
    });

    btnLoadDirtPreset?.addEventListener('click', () => {
      if (inputCustomSpec) inputCustomSpec.value = 'github:tidalcycles/dirt-samples';
      loadSpec('github:tidalcycles/dirt-samples');
    });

    selectSoundbank?.addEventListener('change', async () => {
      const mode = selectSoundbank.value;
      this.initAudio();

      if (mode === 'procedural') {
        this.activeSamplesSpec = null;
        this.activeSampleBank = null;
        this.drumSynth?.setSampleBank(null);
        if (soundbankStatus) {
          soundbankStatus.textContent = 'Synth';
          soundbankStatus.className = 'bank-badge bank-badge-synth';
        }
      } else if (mode === 'strudel-dirt') {
        if (!this.audioCtx) return;
        if (soundbankStatus) {
          soundbankStatus.textContent = 'Loading...';
          soundbankStatus.className = 'bank-badge bank-badge-loading';
        }
        try {
          const bank = createSampleBank(this.audioCtx, 'Strudel Dirt');
          const result = await bank.loadFromUrl();
          this.activeSampleBank = bank;
          this.activeSamplesSpec = 'github:tidalcycles/dirt-samples';
          this.drumSynth?.setSampleBank(bank);
          if (soundbankStatus) {
            soundbankStatus.textContent = `Strudel (${result.loaded}/7)`;
            soundbankStatus.className = 'bank-badge bank-badge-loaded';
          }
        } catch {
          if (soundbankStatus) {
            soundbankStatus.textContent = 'Load Failed';
            soundbankStatus.className = 'bank-badge bank-badge-error';
          }
        }
      } else if (mode === 'custom') {
        openSoundbankModal();
      } else if (mode === 'local') {
        inputSampleFiles?.click();
      }
    });

    inputSampleFiles?.addEventListener('change', async () => {
      const files = inputSampleFiles.files;
      if (files && files.length > 0) {
        this.initAudio();
        if (!this.audioCtx) return;
        if (soundbankStatus) {
          soundbankStatus.textContent = 'Decoding...';
          soundbankStatus.className = 'bank-badge bank-badge-loading';
        }
        try {
          const bank = createSampleBank(this.audioCtx, 'Local Samples');
          const count = await bank.loadLocalFiles(files);
          this.activeSampleBank = bank;
          this.activeSamplesSpec = 'local';
          this.drumSynth?.setSampleBank(bank);
          if (soundbankStatus) {
            soundbankStatus.textContent = `Local (${count})`;
            soundbankStatus.className = 'bank-badge bank-badge-loaded';
          }
        } catch {
          if (soundbankStatus) {
            soundbankStatus.textContent = 'Error';
            soundbankStatus.className = 'bank-badge bank-badge-error';
          }
        }
      } else {
        if (selectSoundbank) {
          selectSoundbank.value = this.activeSampleBank
            ? this.activeSampleBank.name === 'Strudel Dirt'
              ? 'strudel-dirt'
              : this.activeSampleBank.name === 'Local Samples'
              ? 'local'
              : 'custom'
            : 'procedural';
        }
      }
    });

    // Interactive Modulation Matrix header buttons
    const btnAddRoute = root.querySelector('#btn-add-route') as HTMLButtonElement | null;
    const btnResetMatrix = root.querySelector('#btn-reset-matrix') as HTMLButtonElement | null;

    btnAddRoute?.addEventListener('click', () => {
      this.currentMatrix.routes.push({
        voice: 'kick',
        dest: 'velocity',
        source: 'bondWeight',
      });
      this.renderRoutes(root);
      this.updateAll();
    });

    btnResetMatrix?.addEventListener('click', () => {
      this.currentMatrix = {
        routes: DEFAULT_MOD_MATRIX.routes.map(r => ({ ...r })),
      };
      this.renderRoutes(root);
      this.updateAll();
    });

    // Quick atom voice action buttons
    const btnQuickHHat = root.querySelector('#btn-quick-h-hat') as HTMLButtonElement;
    const btnQuickCKick = root.querySelector('#btn-quick-c-kick') as HTMLButtonElement;
    const btnQuickReset = root.querySelector('#btn-quick-reset') as HTMLButtonElement;

    btnQuickHHat?.addEventListener('click', () => {
      for (let i = 0; i < this.currentMolecule.atoms.length; i++) {
        if (this.currentMolecule.atoms[i].element.symbol === 'H') {
          this.atomVoiceOverrides[i] = 'hat';
        }
      }
      this.updateAll();
    });

    btnQuickCKick?.addEventListener('click', () => {
      for (let i = 0; i < this.currentMolecule.atoms.length; i++) {
        if (this.currentMolecule.atoms[i].element.symbol === 'C') {
          this.atomVoiceOverrides[i] = 'kick';
        }
      }
      this.updateAll();
    });

    btnQuickReset?.addEventListener('click', () => {
      this.atomVoiceOverrides = {};
      this.updateAll();
    });

    // Transport Play/Stop
    btnPlay.addEventListener('click', () => {
      this.initAudio();
      if (!this.scheduler) return;

      if (this.scheduler.isPlaying) {
        this.scheduler.stop();
        btnPlay.textContent = '▶ Play';
        btnPlay.classList.remove('btn-active');
        this.svgView.highlightAtom(null);
      } else {
        const effectiveBpm = calculateBpm(this.baseBpm, this.temperature);
        this.scheduler.setPattern(this.currentPattern, effectiveBpm);
        this.scheduler.start((atomIndex, voice, tick) => {
          if (atomIndex !== undefined) {
            this.svgView.highlightAtom(atomIndex);
          }
          if (tick !== undefined) {
            this.seqView.updatePlayhead(tick);
          }
        });
        btnPlay.textContent = '■ Stop';
        btnPlay.classList.add('btn-active');
      }
    });

    // BPM change
    inputBpm.addEventListener('change', () => {
      this.baseBpm = Math.max(40, Math.min(300, parseInt(inputBpm.value, 10) || 120));
      const effectiveBpm = calculateBpm(this.baseBpm, this.temperature);
      effectiveBpmLabel.textContent = `(${effectiveBpm} bpm)`;
      if (this.scheduler) {
        this.scheduler.setBpm(effectiveBpm);
      }
    });

    // Temperature slider
    sliderTemp.addEventListener('input', () => {
      const sliderVal = parseInt(sliderTemp.value, 10);
      const u = sliderVal / 1000;
      this.temperature = sliderToTemperature(u);
      this.updateAll();
    });

    // Mode change
    selectMode.addEventListener('change', () => {
      this.playbackMode = selectMode.value as PlaybackMode;
      this.updateAll();
    });

    // Sequence Order Strategy change
    selectOrderStrategy?.addEventListener('change', () => {
      this.orderStrategy = selectOrderStrategy.value as OrderStrategy;
      if (this.orderStrategy === 'custom' && this.customOrder.length !== this.currentMolecule.atoms.length) {
        this.customOrder = this.currentMolecule.atoms.map((_, idx) => idx);
      }
      this.updateAll();
    });

    // Form change
    selectForm.addEventListener('change', () => {
      this.formMode = selectForm.value as FormMode;
      this.updateAll();
    });

    // Atoms per bar & Fit 1 Bar
    const apbSubdivision = root.querySelector('#apb-subdivision') as HTMLElement | null;
    const btnFitBars = root.querySelector('#btn-fit-bars') as HTMLButtonElement | null;

    const formatSubdivision = (apb: number): string => {
      if (apb === 1) return '(1/1)';
      if (apb === 2) return '(1/2)';
      if (apb === 4) return '(1/4)';
      if (apb === 8) return '(1/8)';
      if (apb === 16) return '(1/16)';
      if (apb === 32) return '(1/32)';
      if (apb === 64) return '(1/64)';
      return `(~${Math.round(384 / apb)}t)`;
    };

    btnFitBars?.addEventListener('click', () => {
      const count = Math.max(1, Math.min(64, this.currentMolecule.atoms.length));
      this.atomsPerBar = count;
      inputApb.value = String(count);
      if (apbSubdivision) {
        apbSubdivision.textContent = formatSubdivision(count);
      }
      this.updateAll();
    });

    inputApb.addEventListener('change', () => {
      this.atomsPerBar = Math.max(1, Math.min(64, parseInt(inputApb.value, 10) || 2));
      if (apbSubdivision) {
        apbSubdivision.textContent = formatSubdivision(this.atomsPerBar);
      }
      this.updateAll();
    });

    // SMILES input
    inputSmiles.addEventListener('input', () => {
      try {
        const mol = parseSmiles(inputSmiles.value);
        this.currentMolecule = mol;
        this.currentAnalysis = analyzeMolecule(mol);
        this.customOrder = mol.atoms.map((_, idx) => idx);
        this.atomVoiceOverrides = {};
        this.selectedAtomIndex = 0;
        smilesError.style.display = 'none';
        this.updateAll();
      } catch (err) {
        smilesError.textContent = (err as Error).message;
        smilesError.style.display = 'block';
      }
    });

    // Strudel Export
    btnExportStrudel.addEventListener('click', async () => {
      const code = exportToStrudel(this.currentPattern, {
        samplesDeclaration: this.activeSamplesSpec && this.activeSamplesSpec !== 'local'
          ? `samples('${this.activeSamplesSpec}')`
          : undefined,
        compact: true,
      });
      try {
        await navigator.clipboard.writeText(code);
        const originalText = btnExportStrudel.textContent;
        btnExportStrudel.textContent = '✓ Copied!';
        setTimeout(() => {
          btnExportStrudel.textContent = originalText;
        }, 1500);
      } catch {
        alert(code);
      }
    });

    // MIDI Export
    btnExportMidi.addEventListener('click', () => {
      const effectiveBpm = calculateBpm(this.baseBpm, this.temperature);
      const bytes = exportToMidi(this.currentPattern, effectiveBpm);
      const blob = new Blob([bytes], { type: 'audio/midi' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `atomic-rhythm-${this.currentMolecule.name || 'molecule'}.mid`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  private renderPresets(root: HTMLElement): void {
    const list = root.querySelector('#preset-list') as HTMLElement;
    list.innerHTML = '';

    for (const preset of PRESETS) {
      const card = document.createElement('div');
      card.className = `preset-card ${preset.smiles === 'c1ccccc1' ? 'active' : ''}`;
      card.innerHTML = `
        <div class="preset-name">${preset.name}</div>
        <div class="preset-desc">${preset.description}</div>
      `;

      card.addEventListener('click', () => {
        root.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');

        const inputSmiles = root.querySelector('#input-smiles') as HTMLInputElement;
        inputSmiles.value = preset.smiles;

        this.currentMolecule = parseSmiles(preset.smiles, preset.name);
        this.currentAnalysis = analyzeMolecule(this.currentMolecule);
        this.customOrder = this.currentMolecule.atoms.map((_, idx) => idx);
        this.atomVoiceOverrides = {};
        this.selectedAtomIndex = 0;
        this.updateAll();
      });

      list.appendChild(card);
    }
  }

  private renderRoutes(root: HTMLElement): void {
    const container = root.querySelector('#routes-list') as HTMLElement;
    if (!container) return;
    container.innerHTML = '';

    const VOICES = [
      { value: 'kick', label: 'Kick' },
      { value: 'snare', label: 'Snare' },
      { value: 'hat', label: 'Hat' },
      { value: 'clap', label: 'Clap' },
      { value: 'rim', label: 'Rim' },
      { value: 'proton', label: 'Proton' },
      { value: 'neutron', label: 'Neutron' },
      { value: 'electron.s1', label: 'Electr s1' },
      { value: 'electron.s2', label: 'Electr s2' },
      { value: 'electron.s3', label: 'Electr s3' },
    ];

    const DESTS: { value: ModDest; label: string }[] = [
      { value: 'hits', label: 'hits' },
      { value: 'velocity', label: 'velocity' },
      { value: 'rotation', label: 'rotation' },
      { value: 'steps', label: 'steps' },
    ];

    const SOURCES: { value: ModSource; label: string }[] = [
      { value: 'bondWeight', label: 'Вес связи (W)' },
      { value: 'bondCount', label: 'Связи (Bonds)' },
      { value: 'typicalValence', label: 'Валентность' },
      { value: 'valenceElectrons', label: 'Вал. e⁻' },
      { value: 'protons', label: 'Протоны (Z)' },
      { value: 'neutrons', label: 'Нейтроны (N)' },
      { value: 'electrons', label: 'Все e⁻' },
      { value: 'electronegativity', label: 'Электроотр.' },
      { value: 'atomicMass', label: 'Масса' },
      { value: 'ionizationEnergy', label: 'Ионизация' },
    ];

    for (let i = 0; i < this.currentMatrix.routes.length; i++) {
      const route = this.currentMatrix.routes[i];
      const row = document.createElement('div');
      row.className = 'route-row-interactive';

      const voiceOpts = VOICES.map(v => `<option value="${v.value}" ${route.voice === v.value ? 'selected' : ''}>${v.label}</option>`).join('');
      const destOpts = DESTS.map(d => `<option value="${d.value}" ${route.dest === d.value ? 'selected' : ''}>${d.label}</option>`).join('');
      const srcOpts = SOURCES.map(s => `<option value="${s.value}" ${route.source === s.value ? 'selected' : ''}>${s.label}</option>`).join('');

      row.innerHTML = `
        <select class="mod-select voice-sel" title="Voice / Track">${voiceOpts}</select>
        <select class="mod-select dest-sel" title="Destination Target">${destOpts}</select>
        <span class="mod-arrow">←</span>
        <select class="mod-select src-sel" title="Modulation Source">${srcOpts}</select>
        <button class="btn-del-route" title="Remove route">✕</button>
      `;

      const voiceSel = row.querySelector('.voice-sel') as HTMLSelectElement;
      voiceSel.addEventListener('change', () => {
        route.voice = voiceSel.value;
        this.updateAll();
      });

      const destSel = row.querySelector('.dest-sel') as HTMLSelectElement;
      destSel.addEventListener('change', () => {
        route.dest = destSel.value as ModDest;
        this.updateAll();
      });

      const srcSel = row.querySelector('.src-sel') as HTMLSelectElement;
      srcSel.addEventListener('change', () => {
        route.source = srcSel.value as ModSource;
        this.updateAll();
      });

      const btnDel = row.querySelector('.btn-del-route') as HTMLButtonElement;
      btnDel.addEventListener('click', () => {
        this.currentMatrix.routes.splice(i, 1);
        this.renderRoutes(root);
        this.updateAll();
      });

      container.appendChild(row);
    }
  }
}
