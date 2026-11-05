import { MolecularAnalysis } from '../chem/analysis';
import { Molecule } from '../chem/molecule';
import { computeMoleculeLayout, Point2D } from './layout';

export const ELEMENT_COLORS: Record<string, string> = {
  H: '#e2e8f0',
  C: '#38bdf8',
  N: '#818cf8',
  O: '#f87171',
  F: '#4ade80',
  P: '#fb923c',
  S: '#facc15',
  Cl: '#34d399',
  Br: '#c084fc',
  I: '#e879f9',
  Na: '#fbbf24',
  He: '#a5f3fc',
  Fe: '#f59e0b',
  Cu: '#f97316',
  Ca: '#a3e635',
  Mg: '#22c55e',
  K: '#c084fc',
  Mn: '#d946ef',
  Si: '#94a3b8',
  Au: '#eab308',
};

export const VOICE_BADGES: Record<string, { label: string; color: string }> = {
  kick: { label: 'BD', color: '#38bdf8' },
  snare: { label: 'SD', color: '#ec4899' },
  hat: { label: 'HH', color: '#f59e0b' },
  clap: { label: 'CP', color: '#a855f7' },
  rim: { label: 'RM', color: '#10b981' },
  mute: { label: 'MUT', color: '#ef4444' },
};

export class MoleculeSvgView {
  private container: HTMLElement;
  private svg: SVGSVGElement | null = null;
  private atomGroups: SVGGElement[] = [];
  private coords: Point2D[] = [];
  public selectedAtomIndex: number | null = 0;
  public onAtomClick?: (atomIndex: number) => void;
  public onRingClick?: (atomIndices: readonly number[]) => void;
  public onBondClick?: (atomA: number, atomB: number) => void;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  render(
    mol: Molecule,
    analysis: MolecularAnalysis,
    width: number = 520,
    height: number = 340,
    voiceOverrides?: Record<number, string>,
    currentOrder?: readonly number[]
  ): void {
    this.container.innerHTML = '';
    this.atomGroups = [];

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.style.overflow = 'visible';
    svg.style.borderRadius = '12px';
    svg.style.background = 'radial-gradient(circle at center, #1e293b 0%, #0f172a 100%)';
    this.svg = svg;

    this.coords = computeMoleculeLayout(mol, analysis, width, height);

    // Layer 1: Ring Motifs Highlights (Interactive)
    for (const ring of analysis.rings) {
      if (ring.size >= 3) {
        let rx = 0, ry = 0;
        for (const idx of ring.atomIndices) {
          rx += this.coords[idx]?.x || 0;
          ry += this.coords[idx]?.y || 0;
        }
        rx /= ring.size;
        ry /= ring.size;

        const ringG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        ringG.style.cursor = 'pointer';
        ringG.setAttribute('class', 'ring-motif-group');

        const ringTitle = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        ringTitle.textContent = `Ring motif (${ring.size} atoms: ${ring.atomIndices.map(idx => mol.atoms[idx]?.element.symbol + idx).join(', ')})`;
        ringG.appendChild(ringTitle);

        const ringCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        ringCircle.setAttribute('cx', rx.toFixed(1));
        ringCircle.setAttribute('cy', ry.toFixed(1));
        ringCircle.setAttribute('r', ring.size === 5 ? '32' : '28');
        ringCircle.setAttribute('fill', ring.isAromatic ? 'rgba(56, 189, 248, 0.08)' : 'rgba(245, 158, 11, 0.06)');
        ringCircle.setAttribute('stroke', ring.isAromatic ? '#38bdf8' : '#f59e0b');
        ringCircle.setAttribute('stroke-width', '1.5');
        ringCircle.setAttribute('stroke-dasharray', '4 4');
        ringG.appendChild(ringCircle);

        const ringLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        ringLabel.setAttribute('x', rx.toFixed(1));
        ringLabel.setAttribute('y', (ry + 3).toFixed(1));
        ringLabel.setAttribute('text-anchor', 'middle');
        ringLabel.setAttribute('fill', ring.isAromatic ? '#38bdf8' : '#f59e0b');
        ringLabel.setAttribute('font-size', '10px');
        ringLabel.setAttribute('font-weight', 'bold');
        ringLabel.textContent = ring.size === 5 ? '5-Part' : ring.isAromatic ? '6/8' : `${ring.size}-Ring`;
        ringG.appendChild(ringLabel);

        ringG.addEventListener('click', (e) => {
          e.stopPropagation();
          this.onRingClick?.(ring.atomIndices);
        });

        svg.appendChild(ringG);
      }
    }

    // Layer 2: Bonds (Interactive)
    for (const ab of analysis.bonds) {
      const p1 = this.coords[ab.bond.atomA];
      const p2 = this.coords[ab.bond.atomB];
      if (!p1 || !p2) continue;

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.style.cursor = 'pointer';
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      title.textContent = `Bond: order ${ab.bond.order}, type: ${ab.type}, Δχ: ${ab.deltaChi.toFixed(2)}`;
      g.appendChild(title);

      g.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectAtom(ab.bond.atomA);
        this.onBondClick?.(ab.bond.atomA, ab.bond.atomB);
      });

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.hypot(dx, dy) || 1;
      const perpX = (-dy / len) * 3;
      const perpY = (dx / len) * 3;

      const strokeColor = ab.type === 'ionic' ? '#f59e0b' : '#64748b';

      if (ab.bond.order === 1) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', p1.x.toFixed(1));
        line.setAttribute('y1', p1.y.toFixed(1));
        line.setAttribute('x2', p2.x.toFixed(1));
        line.setAttribute('y2', p2.y.toFixed(1));
        line.setAttribute('stroke', strokeColor);
        line.setAttribute('stroke-width', '2.5');
        g.appendChild(line);
      } else if (ab.bond.order === 2) {
        for (const mul of [-1, 1]) {
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', (p1.x + perpX * mul).toFixed(1));
          line.setAttribute('y1', (p1.y + perpY * mul).toFixed(1));
          line.setAttribute('x2', (p2.x + perpX * mul).toFixed(1));
          line.setAttribute('y2', (p2.y + perpY * mul).toFixed(1));
          line.setAttribute('stroke', strokeColor);
          line.setAttribute('stroke-width', '2');
          g.appendChild(line);
        }
      } else if (ab.bond.order === 3) {
        for (const mul of [-1.5, 0, 1.5]) {
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', (p1.x + perpX * mul).toFixed(1));
          line.setAttribute('y1', (p1.y + perpY * mul).toFixed(1));
          line.setAttribute('x2', (p2.x + perpX * mul).toFixed(1));
          line.setAttribute('y2', (p2.y + perpY * mul).toFixed(1));
          line.setAttribute('stroke', strokeColor);
          line.setAttribute('stroke-width', '1.8');
          g.appendChild(line);
        }
      }

      svg.appendChild(g);
    }

    // Layer 3: Atoms with p/n/e labels, selection, badges, Lewis dots, and order tags
    for (let i = 0; i < mol.atoms.length; i++) {
      const atom = mol.atoms[i];
      const pt = this.coords[i];
      if (!pt) continue;

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('id', `atom-node-${i}`);
      g.style.cursor = 'pointer';

      // Tooltip with bond weight and count
      const bondWeight = analysis.atomBondWeights?.[i] ?? 1;
      const bondCount = analysis.atomBondCounts?.[i] ?? 0;
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      title.textContent = `Atom #${i}: ${atom.element.name} (${atom.element.symbol})\nBonds: ${bondCount} (Weight: ${bondWeight.toFixed(1)})\nValence: ${atom.typicalValence}\nElectrons: ${atom.electrons} (Valence: ${atom.valenceElectrons})`;
      g.appendChild(title);

      // Node radius scaled by bond weight (more bonds/valence = visually heavier)
      const radius = 14 + Math.min(8, bondWeight * 0.9);

      // Click to select atom
      g.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectAtom(i);
        this.onAtomClick?.(i);
      });

      // Playback Glow ring (hidden by default)
      const glow = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      glow.setAttribute('cx', pt.x.toFixed(1));
      glow.setAttribute('cy', pt.y.toFixed(1));
      glow.setAttribute('r', (radius + 9).toFixed(1));
      glow.setAttribute('fill', 'none');
      glow.setAttribute('stroke', '#38bdf8');
      glow.setAttribute('stroke-width', '3');
      glow.setAttribute('opacity', '0');
      glow.setAttribute('class', 'atom-glow');
      g.appendChild(glow);

      // Persistent Selection ring
      const selRing = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      selRing.setAttribute('cx', pt.x.toFixed(1));
      selRing.setAttribute('cy', pt.y.toFixed(1));
      selRing.setAttribute('r', (radius + 5).toFixed(1));
      selRing.setAttribute('fill', 'none');
      selRing.setAttribute('stroke', '#f59e0b');
      selRing.setAttribute('stroke-width', '2');
      selRing.setAttribute('opacity', this.selectedAtomIndex === i ? '1' : '0');
      selRing.setAttribute('class', 'atom-selected-ring');
      g.appendChild(selRing);

      // Main Atom Circle
      const baseColor = ELEMENT_COLORS[atom.element.symbol] || '#94a3b8';
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', pt.x.toFixed(1));
      circle.setAttribute('cy', pt.y.toFixed(1));
      circle.setAttribute('r', radius.toFixed(1));
      circle.setAttribute('fill', '#1e293b');
      circle.setAttribute('stroke', baseColor);
      circle.setAttribute('stroke-width', bondWeight >= 4 ? '3' : '2.2');
      g.appendChild(circle);

      // Symbol
      const sym = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      sym.setAttribute('x', pt.x.toFixed(1));
      sym.setAttribute('y', (pt.y - 1).toFixed(1));
      sym.setAttribute('text-anchor', 'middle');
      sym.setAttribute('dominant-baseline', 'central');
      sym.setAttribute('fill', baseColor);
      sym.setAttribute('font-size', radius >= 18 ? '13px' : '12px');
      sym.setAttribute('font-weight', 'bold');
      sym.setAttribute('font-family', 'system-ui, sans-serif');
      sym.textContent = atom.element.symbol;
      g.appendChild(sym);

      // Subscript p/n/e label
      const sub = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      sub.setAttribute('x', pt.x.toFixed(1));
      sub.setAttribute('y', (pt.y + radius + 11).toFixed(1));
      sub.setAttribute('text-anchor', 'middle');
      sub.setAttribute('fill', '#94a3b8');
      sub.setAttribute('font-size', '9px');
      sub.setAttribute('font-family', 'monospace');
      sub.textContent = `${atom.protons}p ${atom.neutrons}n ${atom.electrons}e`;
      g.appendChild(sub);

      // Instrument Voice Badge if overridden
      const overrideVoice = voiceOverrides?.[i];
      if (overrideVoice && overrideVoice !== 'default') {
        const badgeInfo = VOICE_BADGES[overrideVoice] || { label: overrideVoice.slice(0, 3).toUpperCase(), color: '#38bdf8' };
        const badgeBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        badgeBg.setAttribute('x', (pt.x - 14).toFixed(1));
        badgeBg.setAttribute('y', (pt.y - radius - 10).toFixed(1));
        badgeBg.setAttribute('width', '28');
        badgeBg.setAttribute('height', '12');
        badgeBg.setAttribute('rx', '3');
        badgeBg.setAttribute('fill', badgeInfo.color);
        badgeBg.setAttribute('opacity', '0.9');
        g.appendChild(badgeBg);

        const badgeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        badgeText.setAttribute('x', pt.x.toFixed(1));
        badgeText.setAttribute('y', (pt.y - radius - 1).toFixed(1));
        badgeText.setAttribute('text-anchor', 'middle');
        badgeText.setAttribute('fill', '#0f172a');
        badgeText.setAttribute('font-size', '8px');
        badgeText.setAttribute('font-weight', 'bold');
        badgeText.setAttribute('font-family', 'sans-serif');
        badgeText.textContent = badgeInfo.label;
        g.appendChild(badgeText);
      }

      // Order Rank Badge (#1, #2, ...)
      if (currentOrder && currentOrder.length > 0) {
        const orderRank = currentOrder.indexOf(i) + 1;
        if (orderRank > 0) {
          const badgeWidth = orderRank >= 10 ? 20 : 16;
          const orderBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          orderBg.setAttribute('x', (pt.x - radius - badgeWidth + 2).toFixed(1));
          orderBg.setAttribute('y', (pt.y - radius - 4).toFixed(1));
          orderBg.setAttribute('width', `${badgeWidth}`);
          orderBg.setAttribute('height', '13');
          orderBg.setAttribute('rx', '3');
          orderBg.setAttribute('fill', '#0f172a');
          orderBg.setAttribute('stroke', '#f59e0b');
          orderBg.setAttribute('stroke-width', '1');
          g.appendChild(orderBg);

          const orderText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          orderText.setAttribute('x', (pt.x - radius - badgeWidth / 2 + 2).toFixed(1));
          orderText.setAttribute('y', (pt.y - radius + 5.5).toFixed(1));
          orderText.setAttribute('text-anchor', 'middle');
          orderText.setAttribute('fill', '#f59e0b');
          orderText.setAttribute('font-size', '8px');
          orderText.setAttribute('font-weight', 'bold');
          orderText.setAttribute('font-family', 'monospace');
          orderText.textContent = `#${orderRank}`;
          g.appendChild(orderText);
        }
      }

      // Lewis valence dots around atom circle
      const vDots = Math.min(8, atom.valenceElectrons);
      for (let d = 0; d < vDots; d++) {
        const dotAngle = (2 * Math.PI * d) / vDots;
        const dotR = radius + 3.5;
        const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dot.setAttribute('cx', (pt.x + dotR * Math.cos(dotAngle)).toFixed(1));
        dot.setAttribute('cy', (pt.y + dotR * Math.sin(dotAngle)).toFixed(1));
        dot.setAttribute('r', '1.5');
        dot.setAttribute('fill', '#f59e0b');
        g.appendChild(dot);
      }

      // Charge label if non-zero
      if (atom.charge !== 0) {
        const chg = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        chg.setAttribute('x', (pt.x + radius - 2).toFixed(1));
        chg.setAttribute('y', (pt.y - radius + 2).toFixed(1));
        chg.setAttribute('fill', atom.charge > 0 ? '#38bdf8' : '#f87171');
        chg.setAttribute('font-size', '10px');
        chg.setAttribute('font-weight', 'bold');
        chg.textContent = atom.charge > 0 ? (atom.charge === 1 ? '+' : `+${atom.charge}`) : (atom.charge === -1 ? '−' : `${atom.charge}`);
        g.appendChild(chg);
      }

      svg.appendChild(g);
      this.atomGroups.push(g);
    }

    this.container.appendChild(svg);
  }

  selectAtom(atomIndex: number | null): void {
    this.selectedAtomIndex = atomIndex;
    for (let i = 0; i < this.atomGroups.length; i++) {
      const g = this.atomGroups[i];
      const selRing = g.querySelector('.atom-selected-ring') as SVGCircleElement | null;
      if (!selRing) continue;
      selRing.setAttribute('opacity', i === atomIndex ? '1' : '0');
    }
  }

  highlightAtom(atomIndex: number | null): void {
    for (let i = 0; i < this.atomGroups.length; i++) {
      const g = this.atomGroups[i];
      const glow = g.querySelector('.atom-glow') as SVGCircleElement | null;
      if (!glow) continue;
      if (i === atomIndex) {
        glow.setAttribute('opacity', '1');
        glow.setAttribute('stroke', '#38bdf8');
        glow.setAttribute('r', '27');
      } else {
        glow.setAttribute('opacity', '0');
      }
    }
  }

  setExcited(atomIndex: number, excited: boolean): void {
    const g = this.atomGroups[atomIndex];
    if (!g) return;
    let excRing = g.querySelector('.excited-shell') as SVGCircleElement | null;
    if (excited) {
      if (!excRing) {
        const pt = this.coords[atomIndex];
        if (!pt) return;
        excRing = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        excRing.setAttribute('cx', pt.x.toFixed(1));
        excRing.setAttribute('cy', pt.y.toFixed(1));
        excRing.setAttribute('r', '32');
        excRing.setAttribute('fill', 'none');
        excRing.setAttribute('stroke', '#ec4899');
        excRing.setAttribute('stroke-width', '2');
        excRing.setAttribute('stroke-dasharray', '3 3');
        excRing.setAttribute('class', 'excited-shell');
        g.appendChild(excRing);
      }
    } else if (excRing) {
      excRing.remove();
    }
  }
}
