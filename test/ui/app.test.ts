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

    // Reorder buttons exist
    const btnEarlier = root.querySelector('#btn-atom-earlier');
    const btnLater = root.querySelector('#btn-atom-later');
    expect(btnEarlier).toBeTruthy();
    expect(btnLater).toBeTruthy();
  });

  // @vitest-environment happy-dom
  it('reorders atom sequence on button click and updates custom mode', () => {
    const root = document.createElement('div');
    const app = new App();
    app.mount(root);

    const seqSelect = root.querySelector('#select-order-strategy') as HTMLSelectElement;
    expect(seqSelect.value).toBe('structural');

    const btnLater = root.querySelector('#btn-atom-later') as HTMLButtonElement;
    btnLater.click();

    expect(seqSelect.value).toBe('custom');
  });
});
