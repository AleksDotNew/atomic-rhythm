export type SynthVoiceName = 'kick' | 'snare' | 'hat' | 'clap' | 'rim';

export interface DrumSynth {
  trigger(voice: SynthVoiceName, time: number, velocity: number, articulation?: string, pan?: number): void;
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

  const playHat = (time: number, velocity: number, pan?: number) => {
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
    trigger(voice: SynthVoiceName, time: number, velocity: number, articulation: string = 'normal', pan?: number) {
      const v = Math.max(0.01, Math.min(1.0, velocity));
      const t = Math.max(ctx.currentTime, time);

      if (articulation === 'flam') {
        const graceTime = Math.max(ctx.currentTime, t - 0.018);
        this.trigger(voice, graceTime, v * 0.5, 'normal', pan);
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
      }
    },
  };
}
