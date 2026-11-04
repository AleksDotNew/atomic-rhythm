import { describe, it, expect, vi } from 'vitest';
import { createSampleBank, STRUDEL_VOICE_SAMPLE_PATHS } from '../../src/audio/samples';
import { createDrumSynth } from '../../src/audio/synth';

describe('SampleBank Engine', () => {
  it('maps SynthVoiceName to standard Strudel dirt sample paths', () => {
    expect(STRUDEL_VOICE_SAMPLE_PATHS['kick']).toBe('bd/0.wav');
    expect(STRUDEL_VOICE_SAMPLE_PATHS['snare']).toBe('sd/0.wav');
    expect(STRUDEL_VOICE_SAMPLE_PATHS['hat']).toBe('hh/0.wav');
    expect(STRUDEL_VOICE_SAMPLE_PATHS['openhat']).toBe('oh/0.wav');
    expect(STRUDEL_VOICE_SAMPLE_PATHS['crash']).toBe('cr/0.wav');
    expect(STRUDEL_VOICE_SAMPLE_PATHS['clap']).toBe('cp/0.wav');
    expect(STRUDEL_VOICE_SAMPLE_PATHS['rim']).toBe('rim/0.wav');
  });

  it('loads and stores samples and allows retrieval by voice name', () => {
    const mockCtx = {
      sampleRate: 44100,
      decodeAudioData: vi.fn().mockImplementation((buf: ArrayBuffer) => {
        return Promise.resolve({ duration: 0.5, length: 22050 } as AudioBuffer);
      }),
    } as unknown as AudioContext;

    const bank = createSampleBank(mockCtx, 'Custom Bank');
    expect(bank.hasVoice('kick')).toBe(false);

    const mockBuffer = { duration: 0.4 } as AudioBuffer;
    bank.setSample('kick', mockBuffer);

    expect(bank.hasVoice('kick')).toBe(true);
    expect(bank.getBuffer('kick')).toBe(mockBuffer);

    bank.clear();
    expect(bank.hasVoice('kick')).toBe(false);
  });

  it('integrates with DrumSynth: plays sample buffer if present, otherwise falls back to synth', () => {
    const bufferPlayed: string[] = [];
    const oscStarted: string[] = [];

    const mockBuffer = { duration: 0.5 } as AudioBuffer;

    const mockCtx = {
      sampleRate: 44100,
      currentTime: 0,
      destination: {},
      createBuffer: () => ({ getChannelData: () => new Float32Array(44100) }),
      createBufferSource: () => {
        let buf: AudioBuffer | null = null;
        return {
          set buffer(b: AudioBuffer | null) {
            buf = b;
          },
          get buffer() {
            return buf;
          },
          connect: () => {},
          start: () => {
            if (buf === mockBuffer) {
              bufferPlayed.push('sample');
            }
          },
          stop: () => {},
        };
      },
      createOscillator: () => ({
        type: 'sine',
        frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
        connect: () => {},
        start: () => {
          oscStarted.push('osc');
        },
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
      createStereoPanner: () => ({
        pan: { setValueAtTime: () => {} },
        connect: () => {},
      }),
    } as unknown as AudioContext;

    const synth = createDrumSynth(mockCtx);
    const bank = createSampleBank(mockCtx);

    // Provide sample only for 'kick'
    bank.setSample('kick', mockBuffer);
    synth.setSampleBank(bank);

    // Trigger kick -> should play sample from bank
    synth.trigger('kick', 0.1, 0.8, 'normal', 0.0);
    expect(bufferPlayed).toContain('sample');
    expect(oscStarted).toHaveLength(0);

    // Trigger rim -> no sample in bank, should fall back to procedural osc
    synth.trigger('rim', 0.2, 0.8, 'normal', 0.0);
    expect(oscStarted).toContain('osc');
  });
});
