import {
  requireFiniteOutput,
  requireFraction,
  requireNonNegative,
  requirePositive,
} from "./validation";

export type DailyRainfallInput = {
  date: string;
  rainfallMm: number;
};

export type DailyRainwaterBalanceInputs = {
  records: DailyRainfallInput[];
  catchmentAreaM2: number;
  runoffCoefficient: number;
  collectionEfficiency: number;
  dailyDemandM3: number;
  tankCapacityM3: number;
  initialStorageM3?: number;
};

export type DailyRainwaterBalanceRow = {
  date: string;
  openingStorageM3: number;
  rainfallInflowM3: number;
  waterAvailableM3: number;
  overflowM3: number;
  waterSuppliedM3: number;
  unmetDemandM3: number;
  closingStorageM3: number;
};

export type DailyRainwaterBalanceResult = {
  rows: DailyRainwaterBalanceRow[];
  totalRainfallInflowM3: number;
  totalDemandM3: number;
  totalWaterSuppliedM3: number;
  totalUnmetDemandM3: number;
  totalOverflowM3: number;
  volumetricReliabilityPercent: number | null;
  timeReliabilityPercent: number | null;
  demandDays: number;
  fullySuppliedDemandDays: number;
  finalStorageM3: number;
};

/**
 * Daily Yield After Spillage (YAS) simulation.
 *
 * For each day, inflow enters the tank first, excess above tank capacity
 * spills, and demand is then supplied from the remaining stored water.
 * The supplied rainfall series must contain one valid record for every
 * consecutive calendar day; missing days are never silently treated as dry.
 */
export function calculateDailyRainwaterBalance(
  inputs: DailyRainwaterBalanceInputs
): DailyRainwaterBalanceResult {
  requirePositive(inputs.catchmentAreaM2, "Catchment area");
  requireFraction(inputs.runoffCoefficient, "Runoff coefficient");
  requireFraction(inputs.collectionEfficiency, "Collection efficiency");
  requireNonNegative(inputs.dailyDemandM3, "Daily demand");
  requirePositive(inputs.tankCapacityM3, "Tank capacity");

  const initialStorageM3 = requireNonNegative(
    inputs.initialStorageM3 ?? 0,
    "Initial storage"
  );
  if (initialStorageM3 > inputs.tankCapacityM3) {
    throw new RangeError("Initial storage cannot exceed tank capacity.");
  }
  if (inputs.records.length === 0) {
    throw new RangeError("At least one daily rainfall record is required.");
  }

  const records = [...inputs.records].sort((a, b) => a.date.localeCompare(b.date));
  let previousTimestamp: number | null = null;
  for (const record of records) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(record.date)) {
      throw new RangeError(`Invalid daily rainfall date: ${record.date}.`);
    }
    const timestamp = Date.parse(`${record.date}T00:00:00.000Z`);
    if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== record.date) {
      throw new RangeError(`Invalid daily rainfall date: ${record.date}.`);
    }
    if (previousTimestamp !== null && timestamp - previousTimestamp !== 86_400_000) {
      throw new RangeError(
        timestamp === previousTimestamp
          ? `Duplicate daily rainfall date: ${record.date}.`
          : "Daily rainfall records must be continuous with no missing calendar days."
      );
    }
    requireNonNegative(record.rainfallMm, `Rainfall on ${record.date}`);
    previousTimestamp = timestamp;
  }

  let storageM3 = initialStorageM3;
  let totalRainfallInflowM3 = 0;
  let totalDemandM3 = 0;
  let totalWaterSuppliedM3 = 0;
  let totalUnmetDemandM3 = 0;
  let totalOverflowM3 = 0;
  let demandDays = 0;
  let fullySuppliedDemandDays = 0;

  const rows = records.map((record): DailyRainwaterBalanceRow => {
    const openingStorageM3 = storageM3;
    const rainfallInflowM3 =
      (record.rainfallMm * inputs.catchmentAreaM2 *
        inputs.runoffCoefficient * inputs.collectionEfficiency) / 1000;
    const waterAvailableM3 = openingStorageM3 + rainfallInflowM3;
    const overflowM3 = Math.max(0, waterAvailableM3 - inputs.tankCapacityM3);
    const availableAfterSpillageM3 = waterAvailableM3 - overflowM3;
    const waterSuppliedM3 = Math.min(availableAfterSpillageM3, inputs.dailyDemandM3);
    const unmetDemandM3 = inputs.dailyDemandM3 - waterSuppliedM3;
    storageM3 = availableAfterSpillageM3 - waterSuppliedM3;

    totalRainfallInflowM3 += rainfallInflowM3;
    totalDemandM3 += inputs.dailyDemandM3;
    totalWaterSuppliedM3 += waterSuppliedM3;
    totalUnmetDemandM3 += unmetDemandM3;
    totalOverflowM3 += overflowM3;
    if (inputs.dailyDemandM3 > 0) {
      demandDays += 1;
      if (unmetDemandM3 <= 1e-9) fullySuppliedDemandDays += 1;
    }

    return {
      date: record.date,
      openingStorageM3,
      rainfallInflowM3,
      waterAvailableM3,
      overflowM3,
      waterSuppliedM3,
      unmetDemandM3,
      closingStorageM3: storageM3,
    };
  });

  const result: DailyRainwaterBalanceResult = {
    rows,
    totalRainfallInflowM3,
    totalDemandM3,
    totalWaterSuppliedM3,
    totalUnmetDemandM3,
    totalOverflowM3,
    volumetricReliabilityPercent: totalDemandM3 > 0
      ? (totalWaterSuppliedM3 / totalDemandM3) * 100
      : null,
    timeReliabilityPercent: demandDays > 0
      ? (fullySuppliedDemandDays / demandDays) * 100
      : null,
    demandDays,
    fullySuppliedDemandDays,
    finalStorageM3: storageM3,
  };

  return requireFiniteOutput(result, "Daily rainwater balance result");
}
