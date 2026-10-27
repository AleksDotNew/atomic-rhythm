import { describe, it, expect } from 'vitest';
import { createAtom } from '../../src/chem/atom';
import { DEFAULT_MOD_MATRIX, evaluateRoute, ModRoute } from '../../src/rhythm/modmatrix';

describe('Modulation Matrix', () => {
  it('evaluates proton hits = Z for Gold (Z=79)', () => {
    const au = createAtom('Au');
    const route: ModRoute = { voice: 'proton', source: 'protons', dest: 'hits' };
    expect(evaluateRoute(route, au)).toBe(79);
  });

  it('evaluates neutron hits for Tritium (A=3, Z=1 -> 2)', () => {
    const t = createAtom('H', 3);
    const route: ModRoute = { voice: 'neutron', source: 'neutrons', dest: 'hits' };
    expect(evaluateRoute(route, t)).toBe(2);
  });

  it('evaluates electron shell hit count for specific shellIndex', () => {
    const na = createAtom('Na'); // [2, 8, 1]
    const routeS2: ModRoute = { voice: 'electron.s2', source: 'electronsInShell', dest: 'hits', shellIndex: 1 };
    expect(evaluateRoute(routeS2, na)).toBe(8);
  });

  it('provides default modulation matrix with standard chemistry-to-rhythm mappings', () => {
    expect(DEFAULT_MOD_MATRIX.routes.length).toBeGreaterThan(0);
    const protonHits = DEFAULT_MOD_MATRIX.routes.find(r => r.voice === 'proton' && r.dest === 'hits');
    expect(protonHits?.source).toBe('protons');
  });
});
