import { Pattern, PPQ } from '../rhythm/ir';

export const TRACK_VOICE_COLORS: Record<string, string> = {
  proton: '#38bdf8',
  kick: '#38bdf8',
  neutron: '#f59e0b',
  hat: '#f59e0b',
  snare: '#ec4899',
  clap: '#a855f7',
  rim: '#10b981',
  bond: '#f97316',
};

export function getVoiceColor(voice: string): string {
  if (TRACK_VOICE_COLORS[voice]) return TRACK_VOICE_COLORS[voice];
  if (voice.startsWith('electron.')) return '#ec4899';
  if (voice.startsWith('motif.')) return '#10b981';
  return '#38bdf8';
}

export function formatVoiceLabel(voice: string): string {
  if (voice === 'proton') return 'Proton (Kick)';
  if (voice === 'neutron') return 'Neutron (Hat)';
  if (voice.startsWith('electron.')) return `Electron (${voice.replace('electron.', '')})`;
  if (voice === 'bond') return 'Bond (Flam/Roll)';
  if (voice.startsWith('motif.')) return `Motif (${voice.replace('motif.', '')})`;
  return voice.charAt(0).toUpperCase() + voice.slice(1);
}

export class SequencerGridView {
  private container: HTMLElement;
  private pattern: Pattern | null = null;
  private stepElements: HTMLElement[][] = [];
  private headerStepElements: HTMLElement[] = [];
  private stepBarInfo: { barIndex: number; localStep: number; isBarStart: boolean; isBarEnd: boolean }[] = [];
  private currentlyHighlightedAtoms: number[] | null = null;
  public onStepClick?: (atomIndex: number) => void;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  render(pattern: Pattern): void {
    this.pattern = pattern;
    this.container.innerHTML = '';
    this.stepElements = [];
    this.headerStepElements = [];
    this.stepBarInfo = [];

    const wrapper = document.createElement('div');
    wrapper.className = 'sequencer-wrapper';
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.gap = '6px';
    wrapper.style.padding = '10px 12px 10px 0';
    wrapper.style.background = '#0f172a';
    wrapper.style.borderRadius = '8px';
    wrapper.style.border = '1px solid #1e293b';
    wrapper.style.overflowX = 'auto';
    wrapper.style.maxWidth = '100%';
    wrapper.style.boxSizing = 'border-box';

    const stepTicks = PPQ / 4; // 24 ticks (16th note)
    const barStepCounts: number[] = pattern.barTicks && pattern.barTicks.length > 0
      ? pattern.barTicks.map(t => Math.max(1, Math.round(t / stepTicks)))
      : Array.from({ length: pattern.bars }, () => 16);
    const maxSteps = barStepCounts.reduce((acc, c) => acc + c, 0);

    let curBar = 0;
    let curLocal = 0;
    for (let s = 0; s < maxSteps; s++) {
      const stepsInCurBar = barStepCounts[curBar] ?? 16;
      const isBarStart = curLocal === 0;
      const isBarEnd = curLocal === stepsInCurBar - 1;
      this.stepBarInfo.push({ barIndex: curBar, localStep: curLocal, isBarStart, isBarEnd });
      curLocal++;
      if (curLocal >= stepsInCurBar) {
        curBar++;
        curLocal = 0;
      }
    }

    // Header row showing Part / Bar markers
    const headerRow = document.createElement('div');
    headerRow.className = 'sequencer-header-row';
    headerRow.style.display = 'flex';
    headerRow.style.alignItems = 'center';
    headerRow.style.gap = '4px';
    headerRow.style.marginBottom = '2px';
    headerRow.style.minWidth = 'max-content';

    const headerLabel = document.createElement('span');
    headerLabel.className = 'seq-header-label';
    headerLabel.style.width = '132px';
    headerLabel.style.minWidth = '132px';
    headerLabel.style.paddingLeft = '12px';
    headerLabel.style.boxSizing = 'border-box';
    headerLabel.style.fontSize = '10px';
    headerLabel.style.fontWeight = 'bold';
    headerLabel.style.color = '#64748b';
    headerLabel.style.textTransform = 'uppercase';
    headerLabel.style.position = 'sticky';
    headerLabel.style.left = '0';
    headerLabel.style.background = '#0f172a';
    headerLabel.style.zIndex = '10';
    headerLabel.style.boxShadow = '4px 0 8px -2px rgba(0, 0, 0, 0.6)';
    headerLabel.textContent = 'Part / Step';
    headerRow.appendChild(headerLabel);

    for (let s = 0; s < maxSteps; s++) {
      const stepHeader = document.createElement('div');
      stepHeader.style.width = '16px';
      stepHeader.style.minWidth = '16px';
      stepHeader.style.fontSize = '9px';
      stepHeader.style.textAlign = 'center';
      stepHeader.style.fontFamily = 'monospace';
      stepHeader.style.transition = 'all 0.12s ease';

      const info = this.stepBarInfo[s];
      const isPartStart = info ? info.isBarStart : s % 16 === 0;
      const partNum = info ? info.barIndex + 1 : Math.floor(s / 16) + 1;
      const localStep = info ? info.localStep : s % 16;

      if (isPartStart) {
        stepHeader.textContent = `P${partNum}`;
        stepHeader.style.color = '#38bdf8';
        stepHeader.style.fontWeight = 'bold';
      } else if (localStep % 4 === 0) {
        stepHeader.textContent = `${Math.floor(localStep / 4) + 1}`;
        stepHeader.style.color = '#64748b';
      } else {
        stepHeader.textContent = '·';
        stepHeader.style.color = '#334155';
      }

      if (info?.isBarEnd || s % 16 === 15) {
        stepHeader.style.marginRight = '6px';
      }

      headerRow.appendChild(stepHeader);
      this.headerStepElements.push(stepHeader);
    }
    wrapper.appendChild(headerRow);

    // Track rows
    for (let tIdx = 0; tIdx < pattern.tracks.length; tIdx++) {
      const track = pattern.tracks[tIdx];
      const row = document.createElement('div');
      row.className = 'sequencer-row';
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.gap = '4px';
      row.style.minWidth = 'max-content';

      // Track voice label
      const label = document.createElement('span');
      label.className = 'track-label';
      label.textContent = formatVoiceLabel(track.voice);
      label.style.width = '132px';
      label.style.minWidth = '132px';
      label.style.paddingLeft = '12px';
      label.style.boxSizing = 'border-box';
      label.style.fontSize = '11px';
      label.style.fontWeight = '600';
      label.style.color = getVoiceColor(track.voice);
      label.style.textOverflow = 'ellipsis';
      label.style.overflow = 'hidden';
      label.style.whiteSpace = 'nowrap';
      label.style.position = 'sticky';
      label.style.left = '0';
      label.style.background = '#0f172a';
      label.style.zIndex = '10';
      label.style.boxShadow = '4px 0 8px -2px rgba(0, 0, 0, 0.6)';
      row.appendChild(label);

      // Steps container
      const stepsCount = maxSteps;
      const rowSteps: HTMLElement[] = [];

      // Map active hits with their atomIndex and articulation
      const hitsMap = new Map<number, { atomIndex?: number; articulation: string }>();
      for (const evt of track.events) {
        const s = Math.round(evt.tick / stepTicks);
        hitsMap.set(s, { atomIndex: evt.atomIndex, articulation: evt.articulation });
      }

      const voiceColor = getVoiceColor(track.voice);

      for (let s = 0; s < stepsCount; s++) {
        const step = document.createElement('div');
        step.className = 'seq-step';
        step.dataset.step = `${s}`;

        const hit = hitsMap.get(s);
        step.dataset.atomIndex = hit?.atomIndex !== undefined ? `${hit.atomIndex}` : '';
        const info = this.stepBarInfo[s];
        const partNum = info ? info.barIndex + 1 : Math.floor(s / 16) + 1;
        const localStep = info ? info.localStep : s % 16;
        step.dataset.part = `${partNum}`;

        const isDownbeat = localStep % 4 === 0;

        if (hit) {
          step.style.background = voiceColor;
          step.style.boxShadow = `0 0 5px ${voiceColor}66`;
          const atomLabel = hit.atomIndex !== undefined ? `Atom #${hit.atomIndex}` : '';
          const artLabel = hit.articulation !== 'normal' ? ` [${hit.articulation}]` : '';
          step.title = `Step ${s + 1}${artLabel} ${atomLabel}`.trim();

          if (hit.atomIndex !== undefined) {
            step.addEventListener('click', () => {
              this.onStepClick?.(hit.atomIndex!);
            });
          }
        } else {
          step.style.background = isDownbeat ? '#334155' : '#1e293b';
        }

        // Add visual gap at end of each part
        if (info?.isBarEnd || s % 16 === 15) {
          step.style.marginRight = '6px';
          step.style.borderRight = '1px solid #475569';
        }

        row.appendChild(step);
        rowSteps.push(step);
      }

      this.stepElements.push(rowSteps);
      wrapper.appendChild(row);
    }

    this.container.appendChild(wrapper);

    // Reapply highlight if present
    if (this.currentlyHighlightedAtoms && this.currentlyHighlightedAtoms.length > 0) {
      this.highlightAtoms(this.currentlyHighlightedAtoms);
    }
  }

  highlightAtom(atomIndex: number | null): void {
    this.highlightAtoms(atomIndex !== null ? [atomIndex] : null);
  }

  highlightAtoms(atomIndices: number[] | null): void {
    this.currentlyHighlightedAtoms = atomIndices;
    if (!this.pattern) return;
    const stepTicks = PPQ / 4; // 24 ticks

    if (!atomIndices || atomIndices.length === 0) {
      for (const headerEl of this.headerStepElements) {
        headerEl.classList.remove('seq-part-header-active');
      }
      for (let t = 0; t < this.stepElements.length; t++) {
        for (let s = 0; s < this.stepElements[t].length; s++) {
          const el = this.stepElements[t][s];
          el.classList.remove('step-highlight-active', 'step-part-column', 'step-dimmed');
        }
      }
      return;
    }

    const atomSet = new Set(atomIndices);
    const targetSteps = new Set<number>();
    const targetParts = new Set<number>();

    for (const track of this.pattern.tracks) {
      for (const evt of track.events) {
        if (evt.atomIndex !== undefined && atomSet.has(evt.atomIndex)) {
          const s = Math.round(evt.tick / stepTicks);
          targetSteps.add(s);
          const partNum = (this.stepBarInfo[s]?.barIndex ?? Math.floor(s / 16)) + 1;
          targetParts.add(partNum);
        }
      }
    }

    for (let s = 0; s < this.headerStepElements.length; s++) {
      const headerEl = this.headerStepElements[s];
      const partNum = (this.stepBarInfo[s]?.barIndex ?? Math.floor(s / 16)) + 1;
      if (targetParts.has(partNum)) {
        headerEl.classList.add('seq-part-header-active');
      } else {
        headerEl.classList.remove('seq-part-header-active');
      }
    }

    for (let t = 0; t < this.stepElements.length; t++) {
      for (let s = 0; s < this.stepElements[t].length; s++) {
        const el = this.stepElements[t][s];
        const stepAtomIdxStr = el.dataset.atomIndex;
        const partNum = (this.stepBarInfo[s]?.barIndex ?? Math.floor(s / 16)) + 1;

        el.classList.remove('step-highlight-active', 'step-part-column', 'step-dimmed');

        if (stepAtomIdxStr !== undefined && stepAtomIdxStr !== '') {
          const hitAtomIdx = parseInt(stepAtomIdxStr, 10);
          if (atomSet.has(hitAtomIdx)) {
            el.classList.add('step-highlight-active');
          } else {
            el.classList.add('step-dimmed');
          }
        } else {
          // Empty cell in matching part
          if (targetParts.has(partNum)) {
            el.classList.add('step-part-column');
          } else {
            el.classList.add('step-dimmed');
          }
        }
      }
    }
  }

  updatePlayhead(currentTick: number): void {
    if (!this.pattern) return;
    const stepTicks = PPQ / 4; // 24 ticks
    const totalTicks = this.pattern.totalTicks || (this.pattern.bars * 384);
    const normalizedTick = currentTick % totalTicks;
    const currentStep = Math.min(this.headerStepElements.length - 1, Math.max(0, Math.floor(normalizedTick / stepTicks)));

    for (let tIdx = 0; tIdx < this.stepElements.length; tIdx++) {
      const steps = this.stepElements[tIdx];
      if (!steps) continue;

      for (let s = 0; s < steps.length; s++) {
        const el = steps[s];
        if (s === currentStep) {
          el.classList.add('seq-playhead-active');
        } else {
          el.classList.remove('seq-playhead-active');
        }
      }
    }
  }
}
