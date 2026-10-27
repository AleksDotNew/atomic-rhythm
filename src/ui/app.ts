import { analyzeMolecule, MolecularAnalysis } from '../chem/analysis';
import { Molecule } from '../chem/molecule';
import { MoleculePreset, PRESETS } from '../chem/presets';
import { parseSmiles } from '../chem/smiles';
import { AudioScheduler } from '../audio/scheduler';
import { createDrumSynth, DrumSynth, SynthVoiceName } from '../audio/synth';
import { exportToMidi } from '../export/midi';
import { exportToStrudel } from '../export/strudel';
import { calculateBpm, isAtomExcited } from '../rhythm/excitation';
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
  private currentMatrix: ModulationMatrix = DEFAULT_MOD_MATRIX;

  private baseBpm: number = 120;
  private temperature: number = 0;
  private playbackMode: PlaybackMode = 'sequential';
  private formMode: FormMode = 'direct';
  private atomsPerBar: number = 2;

  private selectedAtomIndex: number = 0;
  private atomVoiceOverrides: Record<number, SynthVoiceName | 'default' | 'mute'> = {};

  private audioCtx: AudioContext | null = null;
  private drumSynth: DrumSynth | null = null;
  private scheduler: AudioScheduler | null = null;

  private svgView!: MoleculeSvgView;
  private seqView!: SequencerGridView;
  private rootElement!: HTMLElement;

  constructor() {
    // Default start with Benzene
    this.currentMolecule = parseSmiles('c1ccccc1');
    this.currentAnalysis = analyzeMolecule(this.currentMolecule);
    this.currentPattern = buildMoleculePattern(this.currentMolecule, {
      mode: this.playbackMode,
      atomsPerBar: this.atomsPerBar,
      matrix: this.currentMatrix,
      temperature: this.temperature,
      atomVoiceOverrides: this.atomVoiceOverrides,
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
            <label for="slider-temp">Temp: <span id="temp-val">0</span>°</label>
            <input type="range" id="slider-temp" min="0" max="100" value="0" />
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
            <label for="select-form">Form</label>
            <select id="select-form">
              <option value="direct">Direct Loop</option>
              <option value="assembly">Atom Assembly</option>
            </select>
          </div>

          <div class="control-group">
            <label for="input-apb">Atoms/Bar</label>
            <input type="number" id="input-apb" value="2" min="1" max="8" style="width: 50px;" />
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

          <h2 style="margin-top: 10px;">Modulation Matrix</h2>
          <div class="routes-list" id="routes-list"></div>

          <h2 style="margin-top: 10px;">Export</h2>
          <div class="export-actions">
            <button id="btn-export-strudel" class="btn-secondary">📋 Copy Strudel Code</button>
            <button id="btn-export-midi" class="btn-secondary">💾 Download MIDI (.mid)</button>
          </div>
        </section>
      </main>
    `;

    // Initialize views
    const svgContainer = root.querySelector('#svg-container') as HTMLElement;
    this.svgView = new MoleculeSvgView(svgContainer);
    this.svgView.onAtomClick = (atomIndex) => {
      this.selectedAtomIndex = atomIndex;
      this.renderAtomInspector(root);
      this.renderAtomPills(root);
    };

    const seqContainer = root.querySelector('#seq-container') as HTMLElement;
    this.seqView = new SequencerGridView(seqContainer);

    // Setup event listeners
    this.bindEvents(root);

    // Populate preset list
    this.renderPresets(root);

    // Populate routes list
    this.renderRoutes(root);

    // Render initial views
    this.updateAll();
  }

  private initAudio(): void {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
      this.drumSynth = createDrumSynth(this.audioCtx);
      this.scheduler = new AudioScheduler(this.audioCtx, this.drumSynth);
    }
  }

  private updateAll(): void {
    const effectiveBpm = calculateBpm(this.baseBpm, this.temperature);

    this.currentPattern = buildMoleculePattern(this.currentMolecule, {
      mode: this.playbackMode,
      atomsPerBar: this.atomsPerBar,
      matrix: this.currentMatrix,
      temperature: this.temperature,
      atomVoiceOverrides: this.atomVoiceOverrides,
    });

    // Render SVG with selection and badges
    this.svgView.selectedAtomIndex = this.selectedAtomIndex;
    this.svgView.render(
      this.currentMolecule,
      this.currentAnalysis,
      520,
      340,
      this.atomVoiceOverrides
    );

    // Check excitation for each atom
    for (let i = 0; i < this.currentMolecule.atoms.length; i++) {
      const a = this.currentMolecule.atoms[i];
      const excited = isAtomExcited(this.temperature, a.element.ionizationEnergy1);
      this.svgView.setExcited(i, excited);
    }

    // Render Sequencer Grid
    this.seqView.render(this.currentPattern);

    // Render Atom Inspector & Pills
    if (this.rootElement) {
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

      <div class="atom-voice-select-row">
        <label for="select-atom-voice">Assigned Instrument / Voice</label>
        <select id="select-atom-voice">
          <option value="default" ${currentVoice === 'default' ? 'selected' : ''}>Default (Kick/Hat/Snare)</option>
          <option value="kick" ${currentVoice === 'kick' ? 'selected' : ''}>Kick Drum (Бочка)</option>
          <option value="snare" ${currentVoice === 'snare' ? 'selected' : ''}>Snare Drum (Малый)</option>
          <option value="hat" ${currentVoice === 'hat' ? 'selected' : ''}>Closed Hi-Hat (Хэт)</option>
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
      });

      pillsContainer.appendChild(pill);
    }
  }

  private bindEvents(root: HTMLElement): void {
    const btnPlay = root.querySelector('#btn-play') as HTMLButtonElement;
    const inputBpm = root.querySelector('#input-bpm') as HTMLInputElement;
    const sliderTemp = root.querySelector('#slider-temp') as HTMLInputElement;
    const tempVal = root.querySelector('#temp-val') as HTMLElement;
    const effectiveBpmLabel = root.querySelector('#effective-bpm') as HTMLElement;
    const selectMode = root.querySelector('#select-mode') as HTMLSelectElement;
    const selectForm = root.querySelector('#select-form') as HTMLSelectElement;
    const inputApb = root.querySelector('#input-apb') as HTMLInputElement;
    const inputSmiles = root.querySelector('#input-smiles') as HTMLInputElement;
    const smilesError = root.querySelector('#smiles-error') as HTMLElement;
    const btnExportStrudel = root.querySelector('#btn-export-strudel') as HTMLButtonElement;
    const btnExportMidi = root.querySelector('#btn-export-midi') as HTMLButtonElement;

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
      this.temperature = parseInt(sliderTemp.value, 10);
      tempVal.textContent = `${this.temperature}`;
      const effectiveBpm = calculateBpm(this.baseBpm, this.temperature);
      effectiveBpmLabel.textContent = `(${effectiveBpm} bpm)`;
      this.updateAll();
    });

    // Mode change
    selectMode.addEventListener('change', () => {
      this.playbackMode = selectMode.value as PlaybackMode;
      this.updateAll();
    });

    // Form change
    selectForm.addEventListener('change', () => {
      this.formMode = selectForm.value as FormMode;
      this.updateAll();
    });

    // Atoms per bar
    inputApb.addEventListener('change', () => {
      this.atomsPerBar = Math.max(1, Math.min(8, parseInt(inputApb.value, 10) || 2));
      this.updateAll();
    });

    // SMILES input
    inputSmiles.addEventListener('input', () => {
      try {
        const mol = parseSmiles(inputSmiles.value);
        this.currentMolecule = mol;
        this.currentAnalysis = analyzeMolecule(mol);
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
      const code = exportToStrudel(this.currentPattern);
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
        this.atomVoiceOverrides = {};
        this.selectedAtomIndex = 0;
        this.updateAll();
      });

      list.appendChild(card);
    }
  }

  private renderRoutes(root: HTMLElement): void {
    const container = root.querySelector('#routes-list') as HTMLElement;
    container.innerHTML = '';

    for (let i = 0; i < this.currentMatrix.routes.length; i++) {
      const route = this.currentMatrix.routes[i];
      const row = document.createElement('div');
      row.className = 'route-row';
      row.innerHTML = `
        <span style="font-weight: 600; color: var(--accent-cyan); width: 85px;">${route.voice}</span>
        <span style="color: var(--text-muted); font-size: 0.75rem;">${route.dest}</span>
        <span style="color: var(--accent-amber); font-weight: 500;">${route.source}</span>
      `;
      container.appendChild(row);
    }
  }
}
