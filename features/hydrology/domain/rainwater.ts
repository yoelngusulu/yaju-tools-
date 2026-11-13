import { rainfallAndAreaToCubicMetres } from "./units";
import {
  requireFiniteNumber,
  requireFiniteOutput,
  requireFraction,
  requireInteger,
  requireNonNegative,
} from "./validation";

export type RainwaterCatchmentInputs = {
  catchmentAreaM2: number;
  runoffCoefficient: number;
  collectionEfficiency: number;
};

export type AnnualRainwaterInputs = RainwaterCatchmentInputs & {
  rainfallMm: number;
};

export type AnnualRainwaterSizingInputs = AnnualRainwaterInputs & {
  people: number;
  demandLitresPerPersonPerDay: number;
  dryPeriodDays: number;
  safetyAllowancePercent: number;
};

export type AnnualRainwaterSizing = {
  annualInflowM3: number;
  dailyDemandLitres: number;
  dryPeriodDemandM3: number;
  recommendedStorageM3: number;
  annualInflowToStorageRatio: number | null;
};

export function calculateAnnualRainwaterYieldM3(
  inputs: AnnualRainwaterInputs
): number {
  const runoffCoefficient = requireFraction(
    inputs.runoffCoefficient,
    "Runoff coefficient"
  );
  const collectionEfficiency = requireFraction(
    inputs.collectionEfficiency,
    "Collection efficiency"
  );
  const grossRainVolumeM3 = rainfallAndAreaToCubicMetres(
    inputs.rainfallMm,
    inputs.catchmentAreaM2
  );

  return requireFiniteOutput(
    grossRainVolumeM3 * runoffCoefficient * collectionEfficiency,
    "Annual rainwater yield"
  );
}

export function calculateAnnualRainwaterSizing(
  inputs: AnnualRainwaterSizingInputs
): AnnualRainwaterSizing {
  requireInteger(inputs.people, "Number of users");
  requireNonNegative(
    inputs.demandLitresPerPersonPerDay,
    "Daily demand per person"
  );
  requireNonNegative(inputs.dryPeriodDays, "Dry period");
  requireNonNegative(inputs.safetyAllowancePercent, "Safety allowance");
  requireFiniteNumber(inputs.safetyAllowancePercent, "Safety allowance");

  const annualInflowM3 = calculateAnnualRainwaterYieldM3(inputs);
  const dailyDemandLitres =
    inputs.people * inputs.demandLitresPerPersonPerDay;
  const dryPeriodDemandM3 =
    (dailyDemandLitres * inputs.dryPeriodDays) / 1000;
  const recommendedStorageM3 =
    dryPeriodDemandM3 * (1 + inputs.safetyAllowancePercent / 100);

  return requireFiniteOutput({
    annualInflowM3,
    dailyDemandLitres,
    dryPeriodDemandM3,
    recommendedStorageM3,
    annualInflowToStorageRatio: recommendedStorageM3
      ? annualInflowM3 / recommendedStorageM3
      : null,
  }, "Annual rainwater sizing result");
}

export type MonthlyRainfallDemand = {
  month: string;
  rainfallMm: number;
  demandM3: number;
};

export type MonthlyRainwaterBalanceInputs = RainwaterCatchmentInputs & {
  tankCapacityM3: number;
  initialStorageM3?: number;
  months: MonthlyRainfallDemand[];
};

export type MonthlyRainwaterBalanceRow = {
  month: string;
  openingStorageM3: number;
  rainfallInflowM3: number;
  waterAvailableM3: number;
  overflowM3: number;
  waterSuppliedM3: number;
  unmetDemandM3: number;
  closingStorageM3: number;
};

/**
 * Monthly approximation. It adds each month's inflow before subtracting that
 * month's demand; it does not model daily rainfall timing or dry spells.
 */
export function calculateMonthlyRainwaterBalance(
  inputs: MonthlyRainwaterBalanceInputs
): MonthlyRainwaterBalanceRow[] {
  requireNonNegative(inputs.tankCapacityM3, "Tank capacity");
  const initialStorageM3 = requireNonNegative(
    inputs.initialStorageM3 ?? 0,
    "Initial storage"
  );

  if (initialStorageM3 > inputs.tankCapacityM3) {
    throw new RangeError("Initial storage cannot exceed tank capacity.");
  }

  let storageM3 = initialStorageM3;

  return requireFiniteOutput(inputs.months.map((monthInput) => {
    if (!monthInput.month.trim()) {
      throw new RangeError("Each month must have a label.");
    }

    requireNonNegative(monthInput.rainfallMm, `${monthInput.month} rainfall`);
    requireNonNegative(monthInput.demandM3, `${monthInput.month} demand`);

    const openingStorageM3 = storageM3;
    const rainfallInflowM3 = calculateAnnualRainwaterYieldM3({
      catchmentAreaM2: inputs.catchmentAreaM2,
      runoffCoefficient: inputs.runoffCoefficient,
      collectionEfficiency: inputs.collectionEfficiency,
      rainfallMm: monthInput.rainfallMm,
    });
    const waterAvailableM3 = openingStorageM3 + rainfallInflowM3;
    const overflowM3 = Math.max(0, waterAvailableM3 - inputs.tankCapacityM3);
    const availableAfterOverflowM3 = waterAvailableM3 - overflowM3;
    const waterSuppliedM3 = Math.min(
      availableAfterOverflowM3,
      monthInput.demandM3
    );
    const unmetDemandM3 = monthInput.demandM3 - waterSuppliedM3;
    storageM3 = availableAfterOverflowM3 - waterSuppliedM3;

    return {
      month: monthInput.month,
      openingStorageM3,
      rainfallInflowM3,
      waterAvailableM3,
      overflowM3,
      waterSuppliedM3,
      unmetDemandM3,
      closingStorageM3: storageM3,
    };
  }), "Monthly rainwater balance result");
}
