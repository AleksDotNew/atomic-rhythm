import { Pattern, PPQ } from '../rhythm/ir';

export class SequencerGridView {
  private container: HTMLElement;
  private pattern: Pattern | null = null;
  private stepElements: HTMLElement[][] = [];

  constructor(container: HTMLElement) {
    this.container = container;
  }

  render(pattern: Pattern): void {
    this.pattern = pattern;
    this.container.innerHTML = '';
    this.stepElements = [];

    const wrapper = document.createElement('div');
    wrapper.className = 'sequencer-wrapper';
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.gap = '6px';
    wrapper.style.padding = '12px';
    wrapper.style.background = '#0f172a';
    wrapper.style.borderRadius = '8px';
    wrapper.style.border = '1px solid #1e293b';

    const stepTicks = PPQ / 4; // 24 ticks (16th note)

    for (let tIdx = 0; tIdx < pattern.tracks.length; tIdx++) {
      const track = pattern.tracks[tIdx];
      const row = document.createElement('div');
      row.className = 'sequencer-row';
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.gap = '4px';

      // Track voice label
      const label = document.createElement('span');
      label.className = 'track-label';
      label.textContent = track.voice;
      label.style.width = '100px';
      label.style.fontSize = '11px';
      label.style.fontWeight = '600';
      label.style.color = '#94a3b8';
      label.style.textOverflow = 'ellipsis';
      label.style.overflow = 'hidden';
      label.style.whiteSpace = 'nowrap';
      row.appendChild(label);

      // Steps container
      const stepsCount = Math.max(1, Math.round(track.cycleTicks / stepTicks));
      const rowSteps: HTMLElement[] = [];

      const activeTicks = new Set(track.events.map(e => Math.round(e.tick / stepTicks)));

      for (let s = 0; s < stepsCount; s++) {
        const step = document.createElement('div');
        step.className = 'seq-step';
        step.dataset.step = `${s}`;
        step.style.width = '18px';
        step.style.height = '18px';
        step.style.borderRadius = '3px';
        step.style.transition = 'all 0.08s ease';

        const isHit = activeTicks.has(s);
        const isDownbeat = s % 4 === 0;

        if (isHit) {
          step.style.background = '#38bdf8';
          step.style.boxShadow = '0 0 4px rgba(56, 189, 248, 0.4)';
        } else {
          step.style.background = isDownbeat ? '#334155' : '#1e293b';
        }

        row.appendChild(step);
        rowSteps.push(step);
      }

      this.stepElements.push(rowSteps);
      wrapper.appendChild(row);
    }

    this.container.appendChild(wrapper);
  }

  updatePlayhead(currentTick: number): void {
    if (!this.pattern) return;
    const stepTicks = PPQ / 4; // 24 ticks

    for (let tIdx = 0; tIdx < this.pattern.tracks.length; tIdx++) {
      const track = this.pattern.tracks[tIdx];
      const steps = this.stepElements[tIdx];
      if (!steps || steps.length === 0) continue;

      const trackTick = currentTick % track.cycleTicks;
      const currentStep = Math.floor(trackTick / stepTicks) % steps.length;

      for (let s = 0; s < steps.length; s++) {
        const el = steps[s];
        if (s === currentStep) {
          el.style.transform = 'scale(1.2)';
          el.style.border = '1px solid #ffffff';
        } else {
          el.style.transform = 'scale(1)';
          el.style.border = 'none';
        }
      }
    }
  }
}
