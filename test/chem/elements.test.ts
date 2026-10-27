import { describe, it, expect } from 'vitest';
import { getElement, ELEMENTS } from '../../src/chem/elements';

describe('elements database', () => {
  it('contains 118 elements', () => {
    expect(ELEMENTS.length).toBe(118);
  });

  it('retrieves hydrogen by symbol and Z=1', () => {
    const h = getElement('H');
    expect(h.z).toBe(1);
    expect(h.name).toBe('Hydrogen');
    expect(h.mostAbundantA).toBe(1);
    expect(h.electronegativity).toBeCloseTo(2.20, 2);
    expect(getElement(1)).toBe(h);
  });

  it('retrieves carbon, oxygen, gold, and uranium with correct attributes', () => {
    const c = getElement('C');
    expect(c.z).toBe(6);
    expect(c.mostAbundantA).toBe(12);
    expect(c.group).toBe(14);
    expect(c.block).toBe('p');

    const u = getElement('U');
    expect(u.z).toBe(92);
    expect(u.mostAbundantA).toBe(238);
    expect(u.block).toBe('f');
  });

  it('throws for unknown symbol or invalid Z', () => {
    expect(() => getElement('Xz')).toThrow();
    expect(() => getElement(0)).toThrow();
    expect(() => getElement(119)).toThrow();
  });
});
