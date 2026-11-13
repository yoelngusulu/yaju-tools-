import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateIrrigationRequirement,
} from "../../features/hydrology/domain/irrigation";
import {
  calculateBoreholePumpSupply,
} from "../../features/hydrology/domain/pump";
import {
  calculateAnnualRainwaterSizing,
  calculateAnnualRainwaterYieldM3,
  calculateMonthlyRainwaterBalance,
} from "../../features/hydrology/domain/rainwater";
import { calculateTankCapacity } from "../../features/hydrology/domain/tank";
import {
  cubicMetresToLitres,
  millimetresAndHectaresToCubicMetres,
  rainfallAndAreaToCubicMetres,
} from "../../features/hydrology/domain/units";
import {
  parseFiniteInput,
  requireFiniteOutput,
} from "../../features/hydrology/domain/validation";

function approximatelyEqual(actual: number, expected: number, tolerance = 1e-9) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`
  );
}

test("unit conversions preserve explicit area and volume units", () => {
  assert.equal(rainfallAndAreaToCubicMetres(1000, 100), 100);
  assert.equal(millimetresAndHectaresToCubicMetres(4, 1), 40);
  assert.equal(cubicMetresToLitres(6), 6000);
  assert.throws(() => rainfallAndAreaToCubicMetres(-1, 100), /zero or greater/);
  assert.throws(() => cubicMetresToLitres(Number.NaN), /finite number/);
  assert.throws(
    () => rainfallAndAreaToCubicMetres(1e308, 2),
    /outside the supported numeric range/
  );
  assert.throws(
    () => cubicMetresToLitres(1e308),
    /outside the supported numeric range/
  );
  assert.throws(() => parseFiniteInput("", "Rainfall"), /Rainfall is required/);
});

test("calculated outputs reject NaN and Infinity, including nested results", () => {
  assert.throws(
    () => requireFiniteOutput(Number.NaN, "Test result"),
    /Test result is outside the supported numeric range/
  );
  assert.throws(
    () => requireFiniteOutput(Number.POSITIVE_INFINITY, "Test result"),
    /Test result is outside the supported numeric range/
  );
  assert.throws(
    () => requireFiniteOutput({ rows: [{ volumeM3: Number.NaN }] }, "Test result"),
    /Test result rows 1 volumeM3 is outside the supported numeric range/
  );
});

test("annual rainwater yield applies runoff and collection efficiency separately", () => {
  const yieldM3 = calculateAnnualRainwaterYieldM3({
    rainfallMm: 1000,
    catchmentAreaM2: 100,
    runoffCoefficient: 0.8,
    collectionEfficiency: 0.9,
  });

  assert.equal(yieldM3, 72);
  assert.throws(
    () => calculateAnnualRainwaterYieldM3({
      rainfallMm: 1000,
      catchmentAreaM2: 100,
      runoffCoefficient: 1.01,
      collectionEfficiency: 0.9,
    }),
    /Runoff coefficient must be between 0 and 1/
  );
});

test("annual rainwater sizing retains dry-period demand and safety allowance", () => {
  const sizing = calculateAnnualRainwaterSizing({
    rainfallMm: 1000,
    catchmentAreaM2: 100,
    runoffCoefficient: 0.8,
    collectionEfficiency: 0.9,
    people: 2,
    demandLitresPerPersonPerDay: 20,
    dryPeriodDays: 10,
    safetyAllowancePercent: 25,
  });

  assert.equal(sizing.annualInflowM3, 72);
  assert.equal(sizing.dailyDemandLitres, 40);
  assert.equal(sizing.dryPeriodDemandM3, 0.4);
  assert.equal(sizing.recommendedStorageM3, 0.5);
  assert.equal(sizing.annualInflowToStorageRatio, 144);
  assert.throws(
    () => calculateAnnualRainwaterSizing({
      rainfallMm: 1000,
      catchmentAreaM2: 100,
      runoffCoefficient: 0.8,
      collectionEfficiency: 0.9,
      people: Number.POSITIVE_INFINITY,
      demandLitresPerPersonPerDay: 20,
      dryPeriodDays: 10,
      safetyAllowancePercent: 25,
    }),
    /Number of users must be a finite number/
  );
});

test("monthly rainwater balance caps storage and carries closing storage forward", () => {
  const rows = calculateMonthlyRainwaterBalance({
    catchmentAreaM2: 100,
    runoffCoefficient: 0.8,
    collectionEfficiency: 0.9,
    tankCapacityM3: 10,
    initialStorageM3: 8,
    months: [
      { month: "Month 1", rainfallMm: 100, demandM3: 6 },
      { month: "Month 2", rainfallMm: 0, demandM3: 6 },
    ],
  });

  assert.equal(rows[0].month, "Month 1");
  assert.equal(rows[0].openingStorageM3, 8);
  approximatelyEqual(rows[0].rainfallInflowM3, 7.2);
  approximatelyEqual(rows[0].waterAvailableM3, 15.2);
  approximatelyEqual(rows[0].overflowM3, 5.2);
  assert.equal(rows[0].waterSuppliedM3, 6);
  assert.equal(rows[0].unmetDemandM3, 0);
  assert.equal(rows[0].closingStorageM3, 4);
  assert.deepEqual(rows[1], {
    month: "Month 2",
    openingStorageM3: 4,
    rainfallInflowM3: 0,
    waterAvailableM3: 4,
    overflowM3: 0,
    waterSuppliedM3: 4,
    unmetDemandM3: 2,
    closingStorageM3: 0,
  });
  assert.ok(rows.every((row) => row.closingStorageM3 <= 10));
});

test("monthly balance handles an empty period and a completely dry period", () => {
  assert.deepEqual(
    calculateMonthlyRainwaterBalance({
      catchmentAreaM2: 1,
      runoffCoefficient: 0.8,
      collectionEfficiency: 0.9,
      tankCapacityM3: 1,
      months: [],
    }),
    []
  );

  const [dryMonth] = calculateMonthlyRainwaterBalance({
    catchmentAreaM2: 1,
    runoffCoefficient: 0.8,
    collectionEfficiency: 0.9,
    tankCapacityM3: 2,
    months: [{ month: "Dry", rainfallMm: 0, demandM3: 3 }],
  });

  assert.equal(dryMonth.rainfallInflowM3, 0);
  assert.equal(dryMonth.unmetDemandM3, 3);
  assert.equal(dryMonth.closingStorageM3, 0);
  assert.throws(
    () => calculateMonthlyRainwaterBalance({
      catchmentAreaM2: 1,
      runoffCoefficient: 0.8,
      collectionEfficiency: 0.9,
      tankCapacityM3: 1,
      initialStorageM3: 2,
      months: [],
    }),
    /Initial storage cannot exceed tank capacity/
  );
});

test("monthly balance rejects NaN generated by extremely large finite inputs", () => {
  assert.throws(
    () => calculateMonthlyRainwaterBalance({
      catchmentAreaM2: 1,
      runoffCoefficient: 1,
      collectionEfficiency: 1,
      tankCapacityM3: 1.797e308,
      initialStorageM3: 1.797e308,
      months: [{ month: "Extreme", rainfallMm: 1e308, demandM3: 0 }],
    }),
    /outside the supported numeric range/
  );
});

test("borehole production is limited by sustainable yield and actual pump discharge", () => {
  const result = calculateBoreholePumpSupply({
    sustainableYieldM3PerHour: 2,
    pumpRatedDischargeM3PerHour: 2.5,
    actualOperatingDischargeM3PerHour: 1.5,
    pumpingHoursPerDay: 4,
    dailyDemandM3: 8,
    reserveDays: 2,
  });

  assert.equal(result.limitingDischargeM3PerHour, 1.5);
  assert.equal(result.dailyProductionM3, 6);
  assert.equal(result.dailyDemandM3, 8);
  assert.equal(result.reserveRequirementM3, 16);
  assert.equal(result.dailyDeficitM3, 2);
  assert.equal(result.usesRatedDischargeEstimate, false);
});

test("borehole production falls back to a clearly marked pump-rating estimate", () => {
  const result = calculateBoreholePumpSupply({
    sustainableYieldM3PerHour: 2,
    pumpRatedDischargeM3PerHour: 1.5,
    pumpingHoursPerDay: 4,
    dailyDemandM3: 5,
    reserveDays: 1,
  });

  assert.equal(result.dailyProductionM3, 6);
  assert.equal(result.usesRatedDischargeEstimate, true);
  assert.throws(
    () => calculateBoreholePumpSupply({
      sustainableYieldM3PerHour: Number.NaN,
      pumpRatedDischargeM3PerHour: 1.5,
      pumpingHoursPerDay: 4,
      dailyDemandM3: 5,
      reserveDays: 1,
    }),
    /Sustainable borehole yield must be a finite number/
  );
});

test("pump rejects reserve and production overflow from finite inputs", () => {
  assert.throws(
    () => calculateBoreholePumpSupply({
      sustainableYieldM3PerHour: 1,
      pumpRatedDischargeM3PerHour: 1,
      pumpingHoursPerDay: 1,
      dailyDemandM3: 1e308,
      reserveDays: 2,
    }),
    /outside the supported numeric range/
  );
  assert.throws(
    () => calculateBoreholePumpSupply({
      sustainableYieldM3PerHour: 1e308,
      pumpRatedDischargeM3PerHour: 1e308,
      pumpingHoursPerDay: 24,
      dailyDemandM3: 1,
      reserveDays: 1,
    }),
    /outside the supported numeric range/
  );
});

test("pump accepts zero and 24 hours per day and rejects more than 24", () => {
  const inputs = {
    sustainableYieldM3PerHour: 2,
    pumpRatedDischargeM3PerHour: 3,
    dailyDemandM3: 8,
    reserveDays: 1,
  };

  const noPumping = calculateBoreholePumpSupply({
    ...inputs,
    pumpingHoursPerDay: 0,
  });
  assert.equal(noPumping.dailyProductionM3, 0);

  const fullDay = calculateBoreholePumpSupply({
    ...inputs,
    pumpingHoursPerDay: 24,
  });
  assert.equal(fullDay.dailyProductionM3, 48);

  assert.throws(
    () => calculateBoreholePumpSupply({
      ...inputs,
      pumpingHoursPerDay: 24.01,
    }),
    /Pumping hours per day cannot exceed 24 hours/
  );
});

test("irrigation uses ETc, effective rainfall, efficiency and hectare conversion", () => {
  const result = calculateIrrigationRequirement({
    etoMmPerDay: 5,
    cropCoefficient: 0.8,
    effectiveRainfallMmPerDay: 1,
    efficiencyPercent: 75,
    irrigatedAreaHa: 1,
    irrigationIntervalDays: 3,
  });

  assert.equal(result.cropEvapotranspirationMmPerDay, 4);
  assert.equal(result.netIrrigationMmPerDay, 3);
  assert.equal(result.grossIrrigationMmPerDay, 4);
  assert.equal(result.grossDemandM3PerDay, 40);
  assert.equal(result.intervalStorageM3, 120);
});

test("irrigation rejects zero, negative, over-100 and non-finite efficiencies", () => {
  for (const efficiencyPercent of [0, -1, 100.01, Number.NaN]) {
    assert.throws(
      () => calculateIrrigationRequirement({
        etoMmPerDay: 5,
        cropCoefficient: 0.8,
        effectiveRainfallMmPerDay: 1,
        efficiencyPercent,
        irrigatedAreaHa: 1,
        irrigationIntervalDays: 3,
      }),
      /Irrigation efficiency/
    );
  }
});

test("cylindrical tank reports gross, freeboard, dead and usable volumes", () => {
  const result = calculateTankCapacity({
    shape: "cylindrical",
    diameterM: 2,
    heightM: 3,
    freeboardHeightM: 0.3,
    deadStorageM3: 0.5,
  });

  approximatelyEqual(result.grossVolumeM3, Math.PI * 3);
  approximatelyEqual(result.freeboardVolumeM3, Math.PI * 0.3);
  approximatelyEqual(result.usableStorageM3, Math.PI * 2.7 - 0.5);
  approximatelyEqual(result.usableStorageLitres, (Math.PI * 2.7 - 0.5) * 1000);
  assert.ok(result.usableStorageM3 <= result.grossVolumeM3);
});

test("rectangular tank computes usable volume and rejects impossible deductions", () => {
  const result = calculateTankCapacity({
    shape: "rectangular",
    lengthM: 5,
    widthM: 4,
    heightM: 3,
    freeboardHeightM: 0.3,
    deadStorageM3: 0.5,
  });

  assert.equal(result.grossVolumeM3, 60);
  assert.equal(result.freeboardVolumeM3, 6);
  assert.equal(result.usableStorageM3, 53.5);
  assert.throws(
    () => calculateTankCapacity({
      shape: "cylindrical",
      diameterM: 2,
      heightM: 3,
      freeboardHeightM: 3.1,
      deadStorageM3: 0,
    }),
    /Freeboard height cannot exceed tank height/
  );
  assert.throws(
    () => calculateTankCapacity({
      shape: "rectangular",
      lengthM: 2,
      widthM: 2,
      heightM: 2,
      freeboardHeightM: 0.5,
      deadStorageM3: 10,
    }),
    /Dead storage cannot exceed/
  );
});
