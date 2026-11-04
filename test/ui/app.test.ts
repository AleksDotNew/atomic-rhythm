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
});

