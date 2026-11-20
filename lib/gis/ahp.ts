export type PreferenceDirection = "left" | "right" | "equal";
export type PairwiseJudgment = { preference: PreferenceDirection; intensity: number };
export type PairwiseJudgments = Record<string, PairwiseJudgment | undefined>;
export type AHPResult = {
  weights: number[];
  lambdaMax: number;
  consistencyIndex: number;
  randomIndex: number;
  consistencyRatio: number;
  consistencyAccepted: boolean;
  iterations: number;
};

export const MIN_CRITERIA = 2;
export const MAX_CRITERIA = 15;
export const CONSISTENCY_THRESHOLD = 0.1;

// Saaty's classic Random Index series (1980), matrix orders 1–15.
export const RANDOM_INDEX: Readonly<Record<number, number>> = {
  1: 0, 2: 0, 3: 0.58, 4: 0.9, 5: 1.12, 6: 1.24, 7: 1.32, 8: 1.41,
  9: 1.45, 10: 1.49, 11: 1.51, 12: 1.48, 13: 1.56, 14: 1.57, 15: 1.59,
};

export function pairKey(row: number, column: number): string {
  if (row >= column) throw new Error("Pair keys require row to be less than column.");
  return String(row) + "-" + String(column);
}

export function hasCompleteJudgments(criteriaCount: number, judgments: PairwiseJudgments): boolean {
  if (!Number.isInteger(criteriaCount) || criteriaCount < MIN_CRITERIA || criteriaCount > MAX_CRITERIA) return false;
  for (let row = 0; row < criteriaCount; row += 1) {
    for (let column = row + 1; column < criteriaCount; column += 1) {
      if (!judgments[pairKey(row, column)]) return false;
    }
  }
  return true;
}

/** Builds a reciprocal matrix. Missing comparisons remain null, never assumed equal. */
export function buildPairwiseMatrix(criteriaCount: number, judgments: PairwiseJudgments): Array<Array<number | null>> {
  if (!Number.isInteger(criteriaCount) || criteriaCount < MIN_CRITERIA || criteriaCount > MAX_CRITERIA) {
    throw new Error("AHP supports between 2 and 15 criteria.");
  }
  const matrix: Array<Array<number | null>> = Array.from({ length: criteriaCount }, () => Array<number | null>(criteriaCount).fill(null));
  for (let row = 0; row < criteriaCount; row += 1) {
    matrix[row][row] = 1;
    for (let column = row + 1; column < criteriaCount; column += 1) {
      const judgment = judgments[pairKey(row, column)];
      if (!judgment) continue;
      if (!["left", "right", "equal"].includes(judgment.preference)) throw new Error("Pairwise comparison preference is invalid.");
      const intensity = judgment.preference === "equal" ? 1 : judgment.intensity;
      if (!Number.isInteger(intensity) || intensity < 1 || intensity > 9) {
        throw new Error("Pairwise comparison intensity must be an integer from 1 to 9.");
      }
      const value = judgment.preference === "equal" ? 1 : judgment.preference === "left" ? intensity : 1 / intensity;
      matrix[row][column] = value;
      matrix[column][row] = 1 / value;
    }
  }
  return matrix;
}

function validateMatrix(matrix: number[][]): number {
  if (!Array.isArray(matrix)) throw new Error("A pairwise comparison matrix is required.");
  const size = matrix.length;
  if (size < MIN_CRITERIA || size > MAX_CRITERIA || matrix.some((row) => !Array.isArray(row) || row.length !== size)) {
    throw new Error("The matrix must be square and contain between 2 and 15 criteria.");
  }
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      const value = matrix[row][column];
      if (!Number.isFinite(value) || value <= 0) throw new Error("All matrix entries must be finite positive numbers.");
      if (row === column && Math.abs(value - 1) > 1e-8) throw new Error("Every diagonal matrix entry must equal 1.");
      if (row !== column && Math.abs(value * matrix[column][row] - 1) > 1e-7) {
        throw new Error("The matrix must be reciprocal: a(i,j) × a(j,i) = 1.");
      }
    }
  }
  return size;
}

/** Calculates the principal right eigenvector with power iteration, then CI and CR. */
export function calculateAHPWeights(matrix: number[][]): AHPResult {
  const size = validateMatrix(matrix);
  let weights = Array<number>(size).fill(1 / size);
  let iterations = 0;
  let converged = false;

  for (let iteration = 1; iteration <= 10000; iteration += 1) {
    const multiplied = matrix.map((row) => row.reduce((sum, value, index) => sum + value * weights[index], 0));
    const total = multiplied.reduce((sum, value) => sum + value, 0);
    if (!Number.isFinite(total) || total <= 0) throw new Error("AHP eigenvector iteration failed to normalize.");
    const next = multiplied.map((value) => value / total);
    const difference = Math.max(...next.map((value, index) => Math.abs(value - weights[index])));
    weights = next;
    iterations = iteration;
    if (difference < 1e-12) { converged = true; break; }
  }

  if (!converged) throw new Error("AHP eigenvector calculation did not converge.");
  const multiplied = matrix.map((row) => row.reduce((sum, value, index) => sum + value * weights[index], 0));
  const lambdaMax = multiplied.reduce((sum, value, index) => sum + value / weights[index], 0) / size;
  const consistencyIndex = Math.max(0, (lambdaMax - size) / (size - 1));
  const randomIndex = RANDOM_INDEX[size];
  const consistencyRatio = size === 2 || randomIndex === 0 ? 0 : consistencyIndex / randomIndex;

  return {
    weights, lambdaMax, consistencyIndex, randomIndex, consistencyRatio,
    consistencyAccepted: consistencyRatio <= CONSISTENCY_THRESHOLD, iterations,
  };
}
