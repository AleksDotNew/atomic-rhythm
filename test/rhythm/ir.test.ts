import { describe, it, expect } from 'vitest';
import { createPattern, PPQ } from '../../src/rhythm/ir';

describe('Rhythm IR', () => {
  it('creates a validated pattern with tracks and calculated cycle bounds', () => {
    const pat = createPattern(1, [
      {
        voice: 'proton',
        cycleTicks: 16 * (PPQ / 4),
        events: [{ tick: 0, velocity: 0.9, durationTicks: 12, articulation: 'normal', atomIndex: 0 }]
      }
    ]);
    expect(pat.bars).toBe(1);
    expect(pat.timeSignature).toEqual([4, 4]);
    expect(pat.tracks.length).toBe(1);
    expect(pat.tracks[0].events[0].tick).toBe(0);
  });
});
