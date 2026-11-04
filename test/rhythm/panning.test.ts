import { describe, it, expect } from 'vitest';
import {
  computeAtomPans,
  adjustPanForVoice,
  formatPanLabel,
} from '../../src/rhythm/panning';

describe('2D Spatial Stereo Panning', () => {
  it('assigns center pan (0.0) to monatomic molecule or identical coordinates', () => {
    expect(computeAtomPans([])).toEqual([]);
    expect(computeAtomPans([{ x: 100, y: 100 }])).toEqual([0]);
    expect(computeAtomPans([{ x: 50, y: 50 }, { x: 50, y: 50 }])).toEqual([0, 0]);
  });

  it('computes symmetric stereo pans for diatomic horizontal layout', () => {
    const coords = [
      { x: 100, y: 200 }, // Left atom
      { x: 300, y: 200 }, // Right atom
    ];
    const pans = computeAtomPans(coords);
    expect(pans.length).toBe(2);
    expect(pans[0]).toBeCloseTo(-0.85, 2);
    expect(pans[1]).toBeCloseTo(0.85, 2);
  });

  it('distributes stereo pans proportionally for multi-atom layouts within [-0.85, 0.85]', () => {
    const coords = [
      { x: 0, y: 0 },   // Min X -> -0.85
      { x: 50, y: 20 },  // Center X -> 0.0
      { x: 100, y: 10 }, // Max X -> +0.85
    ];
    const pans = computeAtomPans(coords);
    expect(pans[0]).toBeCloseTo(-0.85, 2);
    expect(pans[1]).toBeCloseTo(0.0, 2);
    expect(pans[2]).toBeCloseTo(0.85, 2);
  });

  it('adjusts pan for low-frequency kick voice to preserve bass center focus', () => {
    const widePanLeft = -0.8;
    const widePanRight = 0.8;

    // Kick is scaled down by 0.25
    expect(adjustPanForVoice(widePanLeft, 'kick')).toBeCloseTo(-0.2, 2);
    expect(adjustPanForVoice(widePanRight, 'kick')).toBeCloseTo(0.2, 2);

    // Other voices (hat, snare, clap, rim) keep full spatial pan
    expect(adjustPanForVoice(widePanLeft, 'hat')).toBeCloseTo(-0.8, 2);
    expect(adjustPanForVoice(widePanRight, 'snare')).toBeCloseTo(0.8, 2);
  });

  it('formats pan values into readable human-friendly UI labels', () => {
    expect(formatPanLabel(0)).toBe('Center');
    expect(formatPanLabel(0.02)).toBe('Center');
    expect(formatPanLabel(-0.02)).toBe('Center');

    expect(formatPanLabel(-0.5)).toBe('L 50%');
    expect(formatPanLabel(-0.85)).toBe('L 85%');
    expect(formatPanLabel(0.42)).toBe('R 42%');
    expect(formatPanLabel(0.85)).toBe('R 85%');
  });
});
