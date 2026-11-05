import { describe, it, expect } from 'vitest';
import { App } from '../../src/ui/app';

describe('App interactive UI and Modulation Matrix', () => {
  // @vitest-environment happy-dom
  it('mounts and renders transport controls, SVG view, and interactive matrix', () => {
    const root = document.createElement('div');
    const app = new App();
    app.mount(root);

    // Sequence selector
    const seqSelect = root.querySelector('#select-order-strategy') as HTMLSelectElement | null;
    expect(seqSelect).toBeTruthy();
    expect(seqSelect?.value).toBe('structural');

    // Matrix rows
    const matrixRows = root.querySelectorAll('.route-row-interactive');
    expect(matrixRows.length).toBeGreaterThan(0);

    // Add route button
    const btnAdd = root.querySelector('#btn-add-route') as HTMLButtonElement | null;
    expect(btnAdd).toBeTruthy();
    btnAdd?.click();

    const updatedRows = root.querySelectorAll('.route-row-interactive');
    expect(updatedRows.length).toBe(matrixRows.length + 1);

    // Atom Inspector info
    const inspector = root.querySelector('#atom-inspector');
    expect(inspector?.textContent).toContain('Bonds:');
    expect(inspector?.textContent).toContain('Weight:');
    expect(inspector?.textContent).toContain('Valence:');
    expect(inspector?.textContent).toContain('Pan:');

    // Reorder buttons exist
    const btnEarlier = root.querySelector('#btn-atom-earlier');
    const btnLater = root.querySelector('#btn-atom-later');
    expect(btnEarlier).toBeTruthy();
    expect(btnLater).toBeTruthy();
  });

  // @vitest-environment happy-dom
  it('highlights corresponding sequencer parts and steps when clicking an atom in SVG', () => {
    const root = document.createElement('div');
    const app = new App();
    app.mount(root);

    // Atom node #0 in Benzene
    const atom0Node = root.querySelector('#atom-node-0') as SVGGElement | null;
    expect(atom0Node).toBeTruthy();
    atom0Node?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    // Sequencer should now have active highlighted steps and active part headers
    const activeSteps = root.querySelectorAll('.seq-step.step-highlight-active');
    expect(activeSteps.length).toBeGreaterThan(0);

    const activeHeaders = root.querySelectorAll('.seq-part-header-active');
    expect(activeHeaders.length).toBeGreaterThan(0);
  });

  // @vitest-environment happy-dom
  it('highlights all ring parts when clicking on a ring motif in SVG', () => {
    const root = document.createElement('div');
    const app = new App();
    app.mount(root);

    const ringGroup = root.querySelector('.ring-motif-group') as SVGGElement | null;
    expect(ringGroup).toBeTruthy();
    ringGroup?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    const activeSteps = root.querySelectorAll('.seq-step.step-highlight-active');
    expect(activeSteps.length).toBeGreaterThan(0);
  });

  // @vitest-environment happy-dom
  it('selects atom when clicking on a sequencer step', () => {
    const root = document.createElement('div');
    const app = new App();
    app.mount(root);

    // Find a step with data-atom-index
    const stepWithAtom = root.querySelector('.seq-step[data-atom-index="1"]') as HTMLElement | null;
    if (stepWithAtom) {
      stepWithAtom.click();
      const inspector = root.querySelector('#atom-inspector');
      expect(inspector?.textContent).toContain('Atom #1');
    }
  });

  // @vitest-environment happy-dom
  it('updates temperature non-linearly and reflects phase state on the phase badge', () => {
    const root = document.createElement('div');
    const app = new App();
    app.mount(root);

    const slider = root.querySelector('#slider-temp') as HTMLInputElement | null;
    const tempVal = root.querySelector('#temp-val') as HTMLElement | null;
    const phaseBadge = root.querySelector('#phase-badge') as HTMLElement | null;
    const bpmVal = root.querySelector('#effective-bpm') as HTMLElement | null;

    expect(slider).toBeTruthy();
    expect(tempVal?.textContent).toContain('0°C');
    expect(phaseBadge?.textContent).toContain('Liquid');
    expect(bpmVal?.textContent).toContain('120');

    // Slide down to cryo
    slider!.value = '-1000'; // -273.15°C
    slider!.dispatchEvent(new Event('input'));
    expect(tempVal?.textContent).toContain('-273°C');
    expect(phaseBadge?.textContent).toContain('Solid');
    expect(bpmVal?.textContent).toContain('1 bpm');

    // Slide up to plasma
    slider!.value = '1000'; // 5000°C
    slider!.dispatchEvent(new Event('input'));
    expect(tempVal?.textContent).toContain('+5000°C');
    expect(phaseBadge?.textContent).toContain('Plasma');
    expect(bpmVal?.textContent).toContain('360 bpm');
  });

  // @vitest-environment happy-dom
  it('renders soundbank selector with procedural, strudel CDN, and local options, and crash/openhat in inspector', () => {
    const root = document.createElement('div');
    const app = new App();
    app.mount(root);

    // Soundbank selector
    const bankSelect = root.querySelector('#select-soundbank') as HTMLSelectElement | null;
    expect(bankSelect).toBeTruthy();
    expect(bankSelect?.value).toBe('procedural');

    const options = Array.from(bankSelect?.querySelectorAll('option') || []).map(o => o.value);
    expect(options).toContain('procedural');
    expect(options).toContain('strudel-dirt');
    expect(options).toContain('custom');
    expect(options).toContain('local');

    // Status badge
    const statusBadge = root.querySelector('#soundbank-status');
    expect(statusBadge?.textContent).toContain('Synth');

    // Soundbank manager modal and samples list
    const modal = root.querySelector('#modal-soundbank');
    expect(modal).toBeTruthy();
    const samplesList = root.querySelector('#modal-samples-list');
    expect(samplesList).toBeTruthy();

    // Atoms per bar supports expanded range (up to 64) and Fit 1 Bar button exists
    const inputApb = root.querySelector('#input-apb') as HTMLInputElement | null;
    expect(inputApb).toBeTruthy();
    expect(inputApb?.max).toBe('64');

    const btnFit = root.querySelector('#btn-fit-bars') as HTMLButtonElement | null;
    expect(btnFit).toBeTruthy();
    btnFit?.click();
    // In Benzene (12 atoms: 6 C + 6 H), Fit 1 Bar sets atomsPerBar to 12
    expect(inputApb?.value).toBe('12');

    // Sequence selector contains electronegativity (oxidizer priority)
    const seqSelect = root.querySelector('#select-order-strategy') as HTMLSelectElement | null;
    const seqOptions = Array.from(seqSelect?.querySelectorAll('option') || []).map(o => o.value);
    expect(seqOptions).toContain('electronegativity');

    // File input
    const fileInput = root.querySelector('#input-sample-files') as HTMLInputElement | null;
    expect(fileInput).toBeTruthy();
    expect(fileInput?.type).toBe('file');

    // Atom Inspector voice select options include crash and openhat
    const voiceSelect = root.querySelector('#select-atom-voice') as HTMLSelectElement | null;
    expect(voiceSelect).toBeTruthy();
    const voiceOptions = Array.from(voiceSelect?.querySelectorAll('option') || []).map(o => o.value);
    expect(voiceOptions).toContain('crash');
    expect(voiceOptions).toContain('openhat');
  });

  // @vitest-environment happy-dom
  it('controls genre skeletons, auto-adapts BPM, and supports time signatures', () => {
    const root = document.createElement('div');
    const app = new App();
    app.mount(root);

    const genreSelect = root.querySelector('#select-genre') as HTMLSelectElement | null;
    const meterSelect = root.querySelector('#select-meter') as HTMLSelectElement | null;
    const inputBpm = root.querySelector('#input-bpm') as HTMLInputElement | null;
    const effectiveBpmLabel = root.querySelector('#effective-bpm') as HTMLElement | null;

    expect(genreSelect).toBeTruthy();
    expect(meterSelect).toBeTruthy();
    expect(inputBpm).toBeTruthy();

    expect(genreSelect?.value).toBe('raw');
    expect(meterSelect?.value).toBe('4/4');
    expect(inputBpm?.value).toBe('120');

    // Switch to Drum & Bass
    genreSelect!.value = 'dnb';
    genreSelect!.dispatchEvent(new Event('change'));

    expect(inputBpm?.value).toBe('174');
    expect(effectiveBpmLabel?.textContent).toContain('174 bpm');

    // Switch to Techno
    genreSelect!.value = 'techno';
    genreSelect!.dispatchEvent(new Event('change'));

    expect(inputBpm?.value).toBe('128');
    expect(effectiveBpmLabel?.textContent).toContain('128 bpm');

    // Switch to Hip-Hop
    genreSelect!.value = 'hiphop';
    genreSelect!.dispatchEvent(new Event('change'));

    expect(inputBpm?.value).toBe('90');
    expect(effectiveBpmLabel?.textContent).toContain('90 bpm');

    // Switch Time Signature to 7/8
    meterSelect!.value = '7/8';
    meterSelect!.dispatchEvent(new Event('change'));

    // Sequencer headers should render steps for 7/8
    const steps = root.querySelectorAll('.seq-step');
    expect(steps.length).toBeGreaterThan(0);

    // Switch Time Signature to Adaptive
    meterSelect!.value = 'adaptive';
    meterSelect!.dispatchEvent(new Event('change'));
    expect(meterSelect?.value).toBe('adaptive');
  });

  // @vitest-environment happy-dom
  it('renders rich preset collection with categories and filters correctly', () => {
    const root = document.createElement('div');
    const app = new App();
    app.mount(root);

    // Filter buttons exist
    const filters = root.querySelectorAll('.preset-filter');
    expect(filters.length).toBe(5); // all, atom, inorganic, organic, bio

    // Initial list has all presets (66 presets)
    const initialCards = root.querySelectorAll('.preset-card');
    expect(initialCards.length).toBe(66);

    // Filter to inorganic
    const inorgFilter = root.querySelector('.preset-filter[data-cat="inorganic"]') as HTMLButtonElement | null;
    expect(inorgFilter).toBeTruthy();
    inorgFilter?.click();

    const inorgCards = root.querySelectorAll('.preset-card');
    expect(inorgCards.length).toBe(23); // 23 inorganic presets
    expect(inorgCards[0].textContent).toContain('INORGANIC');

    // Click Sulfuric acid preset card
    const h2so4Card = Array.from(inorgCards).find(c => c.textContent?.includes('Sulfuric Acid')) as HTMLElement | null;
    expect(h2so4Card).toBeTruthy();
    h2so4Card?.click();

    const inputSmiles = root.querySelector('#input-smiles') as HTMLInputElement | null;
    expect(inputSmiles?.value).toBe('OS(=O)(=O)O');

    // Filter to bio
    const bioFilter = root.querySelector('.preset-filter[data-cat="bio"]') as HTMLButtonElement | null;
    bioFilter?.click();
    const bioCards = root.querySelectorAll('.preset-card');
    expect(bioCards.length).toBe(17);

    // Click Aspirin
    const aspirinCard = Array.from(bioCards).find(c => c.textContent?.includes('Aspirin')) as HTMLElement | null;
    expect(aspirinCard).toBeTruthy();
    aspirinCard?.click();
    expect(inputSmiles?.value).toBe('CC(=O)Oc1ccccc1C(=O)O');

    // Click Adrenaline from MolDraw guide
    const adrenalineCard = Array.from(bioCards).find(c => c.textContent?.includes('Adrenaline')) as HTMLElement | null;
    expect(adrenalineCard).toBeTruthy();
    adrenalineCard?.click();
    expect(inputSmiles?.value).toContain('CNC[C@@H]');
  });

  // @vitest-environment happy-dom
  it('switches motif modes (loop, span, once) via UI selector', () => {
    const root = document.createElement('div');
    const app = new App();
    app.mount(root);

    const selectMotif = root.querySelector('#select-motif-mode') as HTMLSelectElement | null;
    expect(selectMotif).toBeTruthy();
    expect(selectMotif?.value).toBe('loop');

    // Default Benzene in sequential structural mode has 6 bars.
    // In loop mode, motif.ring6 has hits across multiple bars in the sequencer grid.
    const stepsInLoop = root.querySelectorAll('.seq-step[data-voice="motif.ring6"][data-hit="true"]');
    // At least 48 pulses in loop mode
    expect(stepsInLoop.length).toBeGreaterThan(6);

    // Switch to 'once' mode
    selectMotif!.value = 'once';
    selectMotif!.dispatchEvent(new Event('change'));

    // In once mode, motif.ring6 only has 6 pulses (in bar 1)
    const stepsInOnce = root.querySelectorAll('.seq-step[data-voice="motif.ring6"][data-hit="true"]');
    expect(stepsInOnce.length).toBe(6);

    // Switch to 'span' mode
    selectMotif!.value = 'span';
    selectMotif!.dispatchEvent(new Event('change'));

    const stepsInSpan = root.querySelectorAll('.seq-step[data-voice="motif.ring6"][data-hit="true"]');
    expect(stepsInSpan.length).toBeGreaterThan(6);
  });
});

