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
};

export class MoleculeSvgView {
  private container: HTMLElement;
  private svg: SVGSVGElement | null = null;
  private atomGroups: SVGGElement[] = [];
  private coords: Point2D[] = [];

  constructor(container: HTMLElement) {
    this.container = container;
  }

  render(mol: Molecule, analysis: MolecularAnalysis, width: number = 520, height: number = 340): void {
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

    // Layer 1: Ring Motifs Highlights
    for (const ring of analysis.rings) {
      if (ring.isAromatic && ring.size === 6) {
        // Compute center of ring
        let rx = 0, ry = 0;
        for (const idx of ring.atomIndices) {
          rx += this.coords[idx].x;
          ry += this.coords[idx].y;
        }
        rx /= ring.size;
        ry /= ring.size;

        const ringCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        ringCircle.setAttribute('cx', rx.toFixed(1));
        ringCircle.setAttribute('cy', ry.toFixed(1));
        ringCircle.setAttribute('r', '28');
        ringCircle.setAttribute('fill', 'rgba(56, 189, 248, 0.08)');
        ringCircle.setAttribute('stroke', '#38bdf8');
        ringCircle.setAttribute('stroke-width', '1.5');
        ringCircle.setAttribute('stroke-dasharray', '4 4');
        svg.appendChild(ringCircle);

        const ringLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        ringLabel.setAttribute('x', rx.toFixed(1));
        ringLabel.setAttribute('y', (ry + 3).toFixed(1));
        ringLabel.setAttribute('text-anchor', 'middle');
        ringLabel.setAttribute('fill', '#38bdf8');
        ringLabel.setAttribute('font-size', '10px');
        ringLabel.setAttribute('font-weight', 'bold');
        ringLabel.textContent = '6/8';
        svg.appendChild(ringLabel);
      }
    }

    // Layer 2: Bonds
    for (const ab of analysis.bonds) {
      const p1 = this.coords[ab.bond.atomA];
      const p2 = this.coords[ab.bond.atomB];
      if (!p1 || !p2) continue;

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      title.textContent = `Bond: order ${ab.bond.order}, type: ${ab.type}, Δχ: ${ab.deltaChi.toFixed(2)}`;
      g.appendChild(title);

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

    // Layer 3: Atoms with p/n/e labels and Lewis dots
    for (let i = 0; i < mol.atoms.length; i++) {
      const atom = mol.atoms[i];
      const pt = this.coords[i];
      if (!pt) continue;

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('id', `atom-node-${i}`);
      g.style.cursor = 'pointer';

      // Outer glow container (hidden by default)
      const glow = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      glow.setAttribute('cx', pt.x.toFixed(1));
      glow.setAttribute('cy', pt.y.toFixed(1));
      glow.setAttribute('r', '26');
      glow.setAttribute('fill', 'none');
      glow.setAttribute('stroke', '#38bdf8');
      glow.setAttribute('stroke-width', '3');
      glow.setAttribute('opacity', '0');
      glow.setAttribute('class', 'atom-glow');
      g.appendChild(glow);

      // Main Atom Circle
      const baseColor = ELEMENT_COLORS[atom.element.symbol] || '#94a3b8';
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', pt.x.toFixed(1));
      circle.setAttribute('cy', pt.y.toFixed(1));
      circle.setAttribute('r', '17');
      circle.setAttribute('fill', '#1e293b');
      circle.setAttribute('stroke', baseColor);
      circle.setAttribute('stroke-width', '2.5');
      g.appendChild(circle);

      // Symbol
      const sym = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      sym.setAttribute('x', pt.x.toFixed(1));
      sym.setAttribute('y', (pt.y - 1).toFixed(1));
      sym.setAttribute('text-anchor', 'middle');
      sym.setAttribute('dominant-baseline', 'central');
      sym.setAttribute('fill', baseColor);
      sym.setAttribute('font-size', '13px');
      sym.setAttribute('font-weight', 'bold');
      sym.setAttribute('font-family', 'system-ui, sans-serif');
      sym.textContent = atom.element.symbol;
      g.appendChild(sym);

      // Subscript p/n/e label
      const sub = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      sub.setAttribute('x', pt.x.toFixed(1));
      sub.setAttribute('y', (pt.y + 24).toFixed(1));
      sub.setAttribute('text-anchor', 'middle');
      sub.setAttribute('fill', '#94a3b8');
      sub.setAttribute('font-size', '9px');
      sub.setAttribute('font-family', 'monospace');
      sub.textContent = `${atom.protons}p ${atom.neutrons}n ${atom.electrons}e`;
      g.appendChild(sub);

      // Lewis valence dots around atom circle
      const vDots = Math.min(8, atom.valenceElectrons);
      for (let d = 0; d < vDots; d++) {
        const dotAngle = (2 * Math.PI * d) / vDots;
        const dotR = 20.5;
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
        chg.setAttribute('x', (pt.x + 14).toFixed(1));
        chg.setAttribute('y', (pt.y - 12).toFixed(1));
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
