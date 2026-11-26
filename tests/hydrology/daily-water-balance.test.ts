import assert from "node:assert/strict";
import test from "node:test";
import { calculateDailyRainwaterBalance } from "../../features/hydrology/domain/daily-water-balance";

test("daily YAS applies inflow, spillage, then demand and carries storage forward", () => {
  const result = calculateDailyRainwaterBalance({
    records: [
      { date: "2024-01-01", rainfallMm: 100 },
      { date: "2024-01-02", rainfallMm: 0 },
    ],
    catchmentAreaM2: 100,
    runoffCoefficient: 0.8,
    collectionEfficiency: 0.9,
    dailyDemandM3: 2,
    tankCapacityM3: 5,
  });

  assert.equal(result.rows[0].rainfallInflowM3, 7.2);
  assert.equal(result.rows[0].overflowM3, 2.2);
  assert.equal(result.rows[0].waterSuppliedM3, 2);
  assert.equal(result.rows[0].closingStorageM3, 3);
  assert.equal(result.rows[1].waterSuppliedM3, 2);
  assert.equal(result.rows[1].unmetDemandM3, 0);
  assert.equal(result.rows[1].closingStorageM3, 1);
  assert.equal(result.totalRainfallInflowM3, 7.2);
  assert.equal(result.totalOverflowM3, 2.2);
  assert.equal(result.totalWaterSuppliedM3, 4);
  assert.equal(result.totalUnmetDemandM3, 0);
  assert.equal(result.volumetricReliabilityPercent, 100);
  assert.equal(result.timeReliabilityPercent, 100);
});

test("daily YAS reports volumetric and time reliability when demand is unmet", () => {
  const result = calculateDailyRainwaterBalance({
    records: [
      { date: "2024-01-01", rainfallMm: 100 },
      { date: "2024-01-02", rainfallMm: 0 },
    ],
    catchmentAreaM2: 100,
    runoffCoefficient: 0.8,
    collectionEfficiency: 0.9,
    dailyDemandM3: 4,
    tankCapacityM3: 5,
  });

  assert.equal(result.totalDemandM3, 8);
  assert.equal(result.totalWaterSuppliedM3, 5);
  assert.equal(result.totalUnmetDemandM3, 3);
  assert.equal(result.volumetricReliabilityPercent, 62.5);
  assert.equal(result.timeReliabilityPercent, 50);
  assert.equal(result.fullySuppliedDemandDays, 1);
});

test("daily YAS rejects gaps, duplicate dates and invalid rainfall", () => {
  const base = {
    catchmentAreaM2: 100,
    runoffCoefficient: 0.8,
    collectionEfficiency: 0.9,
    dailyDemandM3: 1,
    tankCapacityM3: 5,
  };

  assert.throws(() => calculateDailyRainwaterBalance({
    ...base,
    records: [
      { date: "2024-01-01", rainfallMm: 0 },
      { date: "2024-01-03", rainfallMm: 0 },
    ],
  }), /continuous with no missing calendar days/);

  assert.throws(() => calculateDailyRainwaterBalance({
    ...base,
    records: [
      { date: "2024-01-01", rainfallMm: 0 },
      { date: "2024-01-01", rainfallMm: 0 },
    ],
  }), /Duplicate daily rainfall date/);

  assert.throws(() => calculateDailyRainwaterBalance({
    ...base,
    records: [{ date: "2024-01-01", rainfallMm: -1 }],
  }), /Rainfall on 2024-01-01 must be zero or greater/);
});

test("daily YAS validates storage capacity, initial storage and coefficients", () => {
  const base = {
    records: [{ date: "2024-01-01", rainfallMm: 0 }],
    catchmentAreaM2: 100,
    runoffCoefficient: 0.8,
    collectionEfficiency: 0.9,
    dailyDemandM3: 1,
    tankCapacityM3: 5,
  };

  assert.throws(() => calculateDailyRainwaterBalance({
    ...base, initialStorageM3: 6,
  }), /Initial storage cannot exceed tank capacity/);
  assert.throws(() => calculateDailyRainwaterBalance({
    ...base, runoffCoefficient: 1.1,
  }), /Runoff coefficient must be between 0 and 1/);
  assert.throws(() => calculateDailyRainwaterBalance({
    ...base, tankCapacityM3: 0,
  }), /Tank capacity must be greater than zero/);
});
