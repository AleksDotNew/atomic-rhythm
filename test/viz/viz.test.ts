import { describe, it, expect } from 'vitest';
import { parseSmiles } from '../../src/chem/smiles';
import { analyzeMolecule } from '../../src/chem/analysis';
import { computeMoleculeLayout } from '../../src/viz/layout';
import { MoleculeSvgView } from '../../src/viz/molecule-svg';

describe('Molecular 2D layout', () => {
  it('computes 2D coordinates for diatomic molecule without overlap', () => {
    const h2 = parseSmiles('[H][H]');
    const analysis = analyzeMolecule(h2);
    const coords = computeMoleculeLayout(h2, analysis);

    expect(coords.length).toBe(2);
    const dist = Math.hypot(coords[0].x - coords[1].x, coords[0].y - coords[1].y);
    expect(dist).toBeGreaterThan(30);
  });

  it('lays out 6-membered ring in regular polygon arrangement', () => {
    const benzene = parseSmiles('c1ccccc1');
    const analysis = analyzeMolecule(benzene);
    const coords = computeMoleculeLayout(benzene, analysis);

    expect(coords.length).toBe(benzene.atoms.length);
    // Ring carbons (first 6 atoms) should all have distinct positions
    const ringCoords = coords.slice(0, 6);
    for (let i = 0; i < 6; i++) {
      for (let j = i + 1; j < 6; j++) {
        const d = Math.hypot(ringCoords[i].x - ringCoords[j].x, ringCoords[i].y - ringCoords[j].y);
        expect(d).toBeGreaterThan(25);
      }
    }
  });
});

describe('MoleculeSvgView rendering', () => {
  // @vitest-environment happy-dom
  it('renders SVG with scaled atom radii and sequence order badges', () => {
    const container = document.createElement('div');
    const view = new MoleculeSvgView(container);
    const mol = parseSmiles('C1CCCC1');
    const analysis = analyzeMolecule(mol);

    const customOrder = [4, 3, 2, 1, 0];
    view.render(mol, analysis, 520, 340, undefined, customOrder);

    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();

    // Check atom nodes
    const atom0 = container.querySelector('#atom-node-0');
    expect(atom0).toBeTruthy();

    // Carbon (atom 0) has weight = 6.0 (4 + 0.5 * 4), radius = 14 + min(8, 6 * 0.9) = 19.4
    const circle = atom0?.querySelector('circle:nth-of-type(3)') as SVGCircleElement | null;
    expect(circle).toBeTruthy();
    expect(parseFloat(circle?.getAttribute('r') || '0')).toBeGreaterThan(18);

    // Order badge for atom 0: in customOrder [4, 3, 2, 1, 0], atom 0 is at index 4, so badge is #5
    const textElements = Array.from(atom0?.querySelectorAll('text') || []);
    const orderBadge = textElements.find(t => t.textContent === '#5');
    expect(orderBadge).toBeTruthy();
  });
});

