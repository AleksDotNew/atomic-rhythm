export interface EuclideanResult {
  readonly steps: number;
  readonly hits: number;
  readonly pattern: readonly boolean[]; // true = hit, false = rest
  readonly velocityScale: number;      // 1.0 or boosted when k > n
}

export function generateEuclidean(k: number, n: number, rotation: number = 0): EuclideanResult {
  if (n <= 0) {
    return { steps: 0, hits: 0, pattern: [], velocityScale: 1.0 };
  }

  // Underflow: no hits
  if (k <= 0) {
    return {
      steps: n,
      hits: 0,
      pattern: new Array(n).fill(false),
      velocityScale: 1.0,
    };
  }

  // Overflow: saturate hits and boost velocity
  if (k >= n) {
    const velocityScale = 1.0 + (k - n) / n;
    return {
      steps: n,
      hits: n,
      pattern: new Array(n).fill(true),
      velocityScale,
    };
  }

  // Standard Bjorklund algorithm
  let sequences: number[][] = [];
  for (let i = 0; i < k; i++) {
    sequences.push([1]);
  }
  let remainders: number[][] = [];
  for (let i = 0; i < n - k; i++) {
    remainders.push([0]);
  }

  while (remainders.length > 1) {
    const minLen = Math.min(sequences.length, remainders.length);
    const newSeq: number[][] = [];

    for (let i = 0; i < minLen; i++) {
      newSeq.push([...sequences[i], ...remainders[i]]);
    }

    if (sequences.length > minLen) {
      // Remainder sequences become the extra from sequences
      remainders = sequences.slice(minLen);
    } else {
      // Remainder sequences become the extra from remainders
      remainders = remainders.slice(minLen);
    }

    sequences = newSeq;
  }

  // Concatenate sequences and any remaining remainders
  const flattened: boolean[] = [];
  for (const seq of sequences) {
    for (const val of seq) {
      flattened.push(val === 1);
    }
  }
  for (const rem of remainders) {
    for (const val of rem) {
      flattened.push(val === 1);
    }
  }

  // Apply rotation
  const normRot = ((rotation % n) + n) % n;
  let finalPattern = flattened;
  if (normRot > 0) {
    finalPattern = [
      ...flattened.slice(flattened.length - normRot),
      ...flattened.slice(0, flattened.length - normRot),
    ];
  }

  return {
    steps: n,
    hits: k,
    pattern: finalPattern,
    velocityScale: 1.0,
  };
}
