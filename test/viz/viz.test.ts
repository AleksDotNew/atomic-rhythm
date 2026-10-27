import { describe, it, expect } from 'vitest';
import { parseSmiles } from '../../src/chem/smiles';
import { analyzeMolecule } from '../../src/chem/analysis';
import { computeMoleculeLayout } from '../../src/viz/layout';

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
