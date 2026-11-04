import { describe, it, expect } from 'vitest';
import { parseSmiles } from '../../src/chem/smiles';
import { buildMoleculePattern } from '../../src/rhythm/molecule-pattern';
import { ticksToSeconds, getEventsInWindow, resolveSynthVoice } from '../../src/audio/scheduler';
import { createDrumSynth } from '../../src/audio/synth';
import { PPQ } from '../../src/rhythm/ir';

describe('Audio Scheduler logic', () => {
  it('converts ticks to seconds correctly at 120 BPM', () => {
    // At 120 BPM: 1 beat = 0.5s = PPQ ticks (96)
    // 1 tick = 0.5 / 96 seconds
    const sec96 = ticksToSeconds(96, 120);
    expect(sec96).toBeCloseTo(0.5, 4);

    const sec192 = ticksToSeconds(192, 120);
    expect(sec192).toBeCloseTo(1.0, 4);
  });

  it('filters events scheduled within lookahead window [startTick, endTick)', () => {
    const h2 = parseSmiles('[H][H]');
    const pat = buildMoleculePattern(h2);
    // H2 in sequential mode: kick on tick 0 and tick 192
    const window1 = getEventsInWindow(pat, 0, 100);
    expect(window1.some(e => e.voice === 'proton' && e.tick === 0)).toBe(true);
    expect(window1.some(e => e.voice === 'proton' && e.tick === 192)).toBe(false);

    const window2 = getEventsInWindow(pat, 150, 250);
    expect(window2.some(e => e.voice === 'proton' && e.tick === 192)).toBe(true);
  });

  it('resolves voice strings to procedural synth voice names', () => {
    expect(resolveSynthVoice('proton')).toBe('kick');
    expect(resolveSynthVoice('neutron')).toBe('hat');
    expect(resolveSynthVoice('electron.s1')).toBe('snare');
    expect(resolveSynthVoice('bond')).toBe('clap');
    expect(resolveSynthVoice('motif.ring6')).toBe('rim');
  });

  it('triggers synth with stereo pan parameter routing through StereoPannerNode', () => {
    const createdNodes: string[] = [];
    let pannedValue = 0;

    const mockCtx = {
      sampleRate: 44100,
      currentTime: 0,
      destination: {},
      createBuffer: () => ({ getChannelData: () => new Float32Array(44100) }),
      createOscillator: () => ({
        type: 'sine',
        frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
        connect: () => {},
        start: () => {},
        stop: () => {},
      }),
      createGain: () => ({
        gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
        connect: () => {},
      }),
      createBiquadFilter: () => ({
        type: 'bandpass',
        frequency: { setValueAtTime: () => {} },
        Q: { setValueAtTime: () => {} },
        connect: () => {},
      }),
      createBufferSource: () => ({
        buffer: null,
        connect: () => {},
        start: () => {},
        stop: () => {},
      }),
      createStereoPanner: () => {
        createdNodes.push('StereoPannerNode');
        return {
          pan: {
            setValueAtTime: (val: number) => {
              pannedValue = val;
            },
          },
          connect: () => {},
        };
      },
    } as unknown as AudioContext;

    const synth = createDrumSynth(mockCtx);

    synth.trigger('hat', 0.1, 0.8, 'normal', 0.65);
    expect(createdNodes).toContain('StereoPannerNode');
    expect(pannedValue).toBeCloseTo(0.65, 2);
  });
});
