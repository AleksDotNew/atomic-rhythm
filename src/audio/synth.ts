import type { SampleBank } from './samples';

export type SynthVoiceName = 'kick' | 'snare' | 'hat' | 'clap' | 'rim' | 'openhat' | 'crash';

export interface DrumSynth {
  trigger(voice: SynthVoiceName, time: number, velocity: number, articulation?: string, pan?: number): void;
  setSampleBank(bank: SampleBank | null): void;
  getSampleBank(): SampleBank | null;
}

export function createDrumSynth(ctx: AudioContext): DrumSynth {
  // Pre-generate 1-second white noise buffer for snare, hat, clap
  const sampleRate = ctx.sampleRate;
  const noiseBuffer = ctx.createBuffer(1, sampleRate, sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < sampleRate; i++) {
    output[i] = Math.random() * 2 - 1;
  }

  const routeAudio = (node: AudioNode, pan?: number) => {
    if (typeof ctx.createStereoPanner === 'function') {
      const panner = ctx.createStereoPanner();
      const clampedPan = Math.max(-1, Math.min(1, pan ?? 0));
      panner.pan.setValueAtTime(clampedPan, ctx.currentTime);
      node.connect(panner);
      panner.connect(ctx.destination);
    } else {
      node.connect(ctx.destination);
    }
  };

  const playKick = (time: number, velocity: number, pan?: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.1);

    gain.gain.setValueAtTime(velocity, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.28);

    osc.connect(gain);
    routeAudio(gain, pan);

    osc.start(time);
    osc.stop(time + 0.3);
  };

  const playSnare = (time: number, velocity: number, pan?: number) => {
    // Noise component
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.setValueAtTime(800, time);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(velocity * 0.8, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    routeAudio(noiseGain, pan);

    // Body tone
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, time);
    osc.frequency.exponentialRampToValueAtTime(80, time + 0.1);

    oscGain.gain.setValueAtTime(velocity * 0.6, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

    osc.connect(oscGain);
    routeAudio(oscGain, pan);

    noise.start(time);
    noise.stop(time + 0.22);
    osc.start(time);
    osc.stop(time + 0.2);
  };

  let activeOpenHatGain: GainNode | null = null;
  let activeSampleBank: SampleBank | null = null;

  const playSample = (buffer: AudioBuffer, time: number, velocity: number, pan?: number, isOpenHat: boolean = false) => {
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(velocity, time);
    source.connect(gain);
    routeAudio(gain, pan);
    if (isOpenHat) {
      activeOpenHatGain = gain;
    }
    source.start(time);
  };

  const playHat = (time: number, velocity: number, pan?: number) => {
    // Choke open hat if currently sustaining
    if (activeOpenHatGain) {
      try {
        activeOpenHatGain.gain.cancelScheduledValues(time);
        activeOpenHatGain.gain.setValueAtTime(0.001, time);
      } catch {
        // Safe fallback
      }
      activeOpenHatGain = null;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(7500, time);
    filter.Q.setValueAtTime(3, time);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(velocity * 0.7, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    noise.connect(filter);
    filter.connect(gain);
    routeAudio(gain, pan);

    noise.start(time);
    noise.stop(time + 0.06);
  };

  const playOpenHat = (time: number, velocity: number, pan?: number) => {
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(6800, time);
    filter.Q.setValueAtTime(2.5, time);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(velocity * 0.75, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.42);

    noise.connect(filter);
    filter.connect(gain);
    routeAudio(gain, pan);

    activeOpenHatGain = gain;
    noise.start(time);
    noise.stop(time + 0.45);
  };

  const playCrash = (time: number, velocity: number, pan?: number) => {
    // 1. Noise wash component
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.setValueAtTime(4500, time);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(velocity * 0.6, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 1.4);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    routeAudio(noiseGain, pan);

    noise.start(time);
    noise.stop(time + 1.45);

    // 2. Inharmonic metallic multi-sine bank (6 detuned frequencies)
    const freqs = [420, 595, 840, 1190, 1680, 2380];
    for (const f of freqs) {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, time);

      oscGain.gain.setValueAtTime((velocity * 0.22) / freqs.length, time);
      oscGain.gain.exponentialRampToValueAtTime(0.001, time + 1.6);

      osc.connect(oscGain);
      routeAudio(oscGain, pan);

      osc.start(time);
      osc.stop(time + 1.65);
    }
  };

  const playClap = (time: number, velocity: number, pan?: number) => {
    // Multi-burst clap
    const bursts = [0, 0.011, 0.024];
    for (const offset of bursts) {
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, time + offset);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(velocity * 0.6, time + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, time + offset + 0.03);

      noise.connect(filter);
      filter.connect(gain);
      routeAudio(gain, pan);

      noise.start(time + offset);
      noise.stop(time + offset + 0.04);
    }
    // Tail
    const tail = ctx.createBufferSource();
    tail.buffer = noiseBuffer;
    const tailFilter = ctx.createBiquadFilter();
    tailFilter.type = 'bandpass';
    tailFilter.frequency.setValueAtTime(1000, time + 0.03);
    const tailGain = ctx.createGain();
    tailGain.gain.setValueAtTime(velocity * 0.7, time + 0.03);
    tailGain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
    tail.connect(tailFilter);
    tailFilter.connect(tailGain);
    routeAudio(tailGain, pan);
    tail.start(time + 0.03);
    tail.stop(time + 0.22);
  };

  const playRim = (time: number, velocity: number, pan?: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1600, time);

    gain.gain.setValueAtTime(velocity * 0.9, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

    osc.connect(gain);
    routeAudio(gain, pan);

    osc.start(time);
    osc.stop(time + 0.05);
  };

  return {
    setSampleBank(bank: SampleBank | null) {
      activeSampleBank = bank;
    },
    getSampleBank(): SampleBank | null {
      return activeSampleBank;
    },
    trigger(voice: SynthVoiceName, time: number, velocity: number, articulation: string = 'normal', pan?: number) {
      const v = Math.max(0.01, Math.min(1.0, velocity));
      const t = Math.max(ctx.currentTime, time);

      if (articulation === 'flam') {
        const graceTime = Math.max(ctx.currentTime, t - 0.018);
        this.trigger(voice, graceTime, v * 0.5, 'normal', pan);
      }

      if (voice === 'hat' && activeOpenHatGain) {
        try {
          activeOpenHatGain.gain.cancelScheduledValues(t);
          activeOpenHatGain.gain.setValueAtTime(0.001, t);
        } catch {
          // Safe fallback
        }
        activeOpenHatGain = null;
      }

      if (activeSampleBank && activeSampleBank.hasVoice(voice)) {
        const sampleBuf = activeSampleBank.getBuffer(voice);
        if (sampleBuf) {
          playSample(sampleBuf, t, v, pan, voice === 'openhat');
          return;
        }
      }

      switch (voice) {
        case 'kick':
          playKick(t, v, pan);
          break;
        case 'snare':
          playSnare(t, v, pan);
          break;
        case 'hat':
          playHat(t, v, pan);
          break;
        case 'clap':
          playClap(t, v, pan);
          break;
        case 'rim':
          playRim(t, v, pan);
          break;
        case 'openhat':
          playOpenHat(t, v, pan);
          break;
        case 'crash':
          playCrash(t, v, pan);
          break;
      }
    },
  };
}
