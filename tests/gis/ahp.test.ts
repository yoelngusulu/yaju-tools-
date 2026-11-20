import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPairwiseMatrix, calculateAHPWeights, hasCompleteJudgments,
  pairKey, RANDOM_INDEX, type PairwiseJudgments,
} from "../../lib/gis/ahp";

test("builds reciprocal values from pairwise judgments", () => {
  const judgments: PairwiseJudgments = {
    [pairKey(0, 1)]: { preference: "left", intensity: 3 },
    [pairKey(0, 2)]: { preference: "right", intensity: 5 },
    [pairKey(1, 2)]: { preference: "equal", intensity: 1 },
  };
  assert.deepEqual(buildPairwiseMatrix(3, judgments), [[1, 3, 1 / 5], [1 / 3, 1, 1], [5, 1, 1]]);
});

test("leaves missing comparisons blank instead of assuming equality", () => {
  const judgments = { [pairKey(0, 1)]: { preference: "equal" as const, intensity: 1 } };
  const matrix = buildPairwiseMatrix(3, judgments);
  assert.equal(matrix[0][2], null);
  assert.equal(matrix[2][0], null);
  assert.equal(hasCompleteJudgments(3, judgments), false);
});

test("returns normalized equal weights for a fully consistent matrix", () => {
  const result = calculateAHPWeights([[1, 1, 1, 1], [1, 1, 1, 1], [1, 1, 1, 1], [1, 1, 1, 1]]);
  assert.ok(result.weights.every((weight) => Math.abs(weight - 0.25) < 1e-10));
  assert.ok(Math.abs(result.weights.reduce((sum, weight) => sum + weight, 0) - 1) < 1e-10);
  assert.ok(Math.abs(result.lambdaMax - 4) < 1e-10);
  assert.ok(result.consistencyRatio < 1e-10);
  assert.equal(result.consistencyAccepted, true);
});

test("calculates priorities using the principal eigenvector", () => {
  const result = calculateAHPWeights([[1, 3, 5], [1 / 3, 1, 2], [1 / 5, 1 / 2, 1]]);
  assert.ok(Math.abs(result.weights.reduce((sum, weight) => sum + weight, 0) - 1) < 1e-10);
  assert.ok(result.weights[0] > result.weights[1]);
  assert.ok(result.weights[1] > result.weights[2]);
  assert.ok(result.consistencyRatio <= 0.1);
  assert.equal(result.consistencyAccepted, true);
});

test("flags an inconsistent judgment matrix", () => {
  const result = calculateAHPWeights([[1, 9, 1 / 9], [1 / 9, 1, 9], [9, 1 / 9, 1]]);
  assert.ok(result.consistencyRatio > 0.1);
  assert.equal(result.consistencyAccepted, false);
});

test("uses Saaty's classic Random Index values through 15 criteria", () => {
  assert.equal(RANDOM_INDEX[3], 0.58);
  assert.equal(RANDOM_INDEX[10], 1.49);
  assert.equal(RANDOM_INDEX[11], 1.51);
  assert.equal(RANDOM_INDEX[12], 1.48);
  assert.equal(RANDOM_INDEX[13], 1.56);
  assert.equal(RANDOM_INDEX[14], 1.57);
  assert.equal(RANDOM_INDEX[15], 1.59);
});

test("rejects non-reciprocal matrices and invalid intensities", () => {
  assert.throws(() => calculateAHPWeights([[1, 3, 5], [1 / 3, 1, 2], [1 / 4, 1 / 2, 1]]), /reciprocal/);
  assert.throws(() => buildPairwiseMatrix(2, { [pairKey(0, 1)]: { preference: "left", intensity: 1 } }), /from 2 to 9/);
  assert.throws(() => buildPairwiseMatrix(2, { [pairKey(0, 1)]: { preference: "left", intensity: 10 } }), /from 2 to 9/);
});

test("rejects unsupported matrix sizes", () => {
  assert.throws(() => calculateAHPWeights([[1]]), /between 2 and 15/);
});
