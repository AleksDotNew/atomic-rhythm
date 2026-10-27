import { MolecularAnalysis } from '../chem/analysis';
import { Molecule } from '../chem/molecule';

export interface Point2D {
  x: number;
  y: number;
}

export function computeMoleculeLayout(
  mol: Molecule,
  analysis: MolecularAnalysis,
  width: number = 500,
  height: number = 320
): Point2D[] {
  const n = mol.atoms.length;
  if (n === 0) return [];
  if (n === 1) {
    return [{ x: width / 2, y: height / 2 }];
  }

  const coords: Point2D[] = new Array(n);
  const placed = new Set<number>();

  // Center of canvas
  const cx = width / 2;
  const cy = height / 2;

  // 1. Place primary ring if present
  if (analysis.rings.length > 0) {
    const primaryRing = analysis.rings[0];
    const rSize = primaryRing.size;
    const radius = 55;
    for (let i = 0; i < rSize; i++) {
      const atomIdx = primaryRing.atomIndices[i];
      const angle = (2 * Math.PI * i) / rSize - Math.PI / 2;
      coords[atomIdx] = {
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
      };
      placed.add(atomIdx);
    }
  }

  // 2. Initial placement for remaining atoms
  for (let i = 0; i < n; i++) {
    if (!placed.has(i)) {
      // Find bonded atom that is already placed
      const bond = mol.bonds.find(
        b => (b.atomA === i && placed.has(b.atomB)) || (b.atomB === i && placed.has(b.atomA))
      );
      if (bond) {
        const otherIdx = bond.atomA === i ? bond.atomB : bond.atomA;
        const otherPt = coords[otherIdx];
        const angle = (i * 1.37) % (2 * Math.PI);
        coords[i] = {
          x: otherPt.x + 45 * Math.cos(angle),
          y: otherPt.y + 45 * Math.sin(angle),
        };
      } else {
        // Disconnected or start of branch
        const angle = (2 * Math.PI * i) / n;
        coords[i] = {
          x: cx + 70 * Math.cos(angle),
          y: cy + 70 * Math.sin(angle),
        };
      }
      placed.add(i);
    }
  }

  // 3. Simple deterministic force-directed simulation (80 iterations)
  const BOND_LENGTH = 50;
  const K_REPULSION = 1800;
  const K_SPRING = 0.08;

  for (let iter = 0; iter < 80; iter++) {
    const fx = new Float32Array(n);
    const fy = new Float32Array(n);

    // Repulsion between all pairs
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = coords[i].x - coords[j].x;
        const dy = coords[i].y - coords[j].y;
        const distSq = Math.max(16, dx * dx + dy * dy);
        const dist = Math.sqrt(distSq);
        const force = K_REPULSION / distSq;
        const ux = dx / dist;
        const uy = dy / dist;

        fx[i] += ux * force;
        fy[i] += uy * force;
        fx[j] -= ux * force;
        fy[j] -= uy * force;
      }
    }

    // Spring attraction along bonds
    for (const b of mol.bonds) {
      const i = b.atomA;
      const j = b.atomB;
      const dx = coords[j].x - coords[i].x;
      const dy = coords[j].y - coords[i].y;
      const dist = Math.max(1, Math.hypot(dx, dy));
      const displacement = dist - BOND_LENGTH;
      const force = displacement * K_SPRING;
      const ux = dx / dist;
      const uy = dy / dist;

      fx[i] += ux * force;
      fy[i] += uy * force;
      fx[j] -= ux * force;
      fy[j] -= uy * force;
    }

    // Apply forces
    for (let i = 0; i < n; i++) {
      coords[i].x += fx[i];
      coords[i].y += fy[i];
    }
  }

  // 4. Center and normalize within canvas padding
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const pt of coords) {
    if (pt.x < minX) minX = pt.x;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.y > maxY) maxY = pt.y;
  }

  const molW = Math.max(1, maxX - minX);
  const molH = Math.max(1, maxY - minY);
  const pad = 40;
  const availW = width - 2 * pad;
  const availH = height - 2 * pad;
  const scale = Math.min(1.2, Math.min(availW / molW, availH / molH));

  const curCx = (minX + maxX) / 2;
  const curCy = (minY + maxY) / 2;

  return coords.map(pt => ({
    x: cx + (pt.x - curCx) * scale,
    y: cy + (pt.y - curCy) * scale,
  }));
}
