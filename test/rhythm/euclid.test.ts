import { describe, it, expect } from 'vitest';
import { generateEuclidean } from '../../src/rhythm/euclid';

describe('generateEuclidean', () => {
  it('generates silent pattern for k=0', () => {
    const res = generateEuclidean(0, 16);
    expect(res.pattern.every(v => v === false)).toBe(true);
    expect(res.velocityScale).toBe(1.0);
  });

  it('generates E(1, 16) with rotation 0 and rotation 8', () => {
    const res0 = generateEuclidean(1, 16, 0);
    expect(res0.pattern[0]).toBe(true);
    expect(res0.pattern.filter(Boolean).length).toBe(1);

    const res8 = generateEuclidean(1, 16, 8);
    expect(res8.pattern[8]).toBe(true);
    expect(res8.pattern[0]).toBe(false);
  });

  it('generates classic Tresillo E(3, 8)', () => {
    const res = generateEuclidean(3, 8);
    // [x, ., ., x, ., ., x, .]
    expect(res.pattern).toEqual([true, false, false, true, false, false, true, false]);
  });

  it('generates E(4, 16) four-on-the-floor', () => {
    const res = generateEuclidean(4, 16);
    expect(res.pattern).toEqual([
      true, false, false, false,
      true, false, false, false,
      true, false, false, false,
      true, false, false, false
    ]);
  });

  it('handles overflow k > n by saturating hits and boosting velocity', () => {
    const res = generateEuclidean(24, 16);
    expect(res.pattern.every(v => v === true)).toBe(true);
    expect(res.velocityScale).toBeCloseTo(1.5, 2);
  });
});
