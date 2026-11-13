import { requireFiniteOutput, requireNonNegative } from "./validation";

export type BoreholePumpInputs = {
  sustainableYieldM3PerHour: number;
  pumpRatedDischargeM3PerHour: number;
  actualOperatingDischargeM3PerHour?: number;
  pumpingHoursPerDay: number;
  dailyDemandM3: number;
  reserveDays: number;
};

export type BoreholePumpResult = {
  limitingDischargeM3PerHour: number;
  dailyProductionM3: number;
  dailyDemandM3: number;
  reserveRequirementM3: number;
  dailyDeficitM3: number;
  usesRatedDischargeEstimate: boolean;
};

export function calculateBoreholePumpSupply(
  inputs: BoreholePumpInputs
): BoreholePumpResult {
  requireNonNegative(inputs.sustainableYieldM3PerHour, "Sustainable borehole yield");
  requireNonNegative(
    inputs.pumpRatedDischargeM3PerHour,
    "Pump-rated discharge"
  );
  requireNonNegative(inputs.pumpingHoursPerDay, "Pumping hours per day");
  if (inputs.pumpingHoursPerDay > 24) {
    throw new RangeError("Pumping hours per day cannot exceed 24 hours.");
  }
  requireNonNegative(inputs.dailyDemandM3, "Daily demand");
  requireNonNegative(inputs.reserveDays, "Reserve days");

  if (inputs.actualOperatingDischargeM3PerHour !== undefined) {
    requireNonNegative(
      inputs.actualOperatingDischargeM3PerHour,
      "Actual operating discharge"
    );
  }

  const usesRatedDischargeEstimate =
    inputs.actualOperatingDischargeM3PerHour === undefined;
  const operatingDischargeM3PerHour =
    inputs.actualOperatingDischargeM3PerHour ??
    inputs.pumpRatedDischargeM3PerHour;
  const limitingDischargeM3PerHour = Math.min(
    inputs.sustainableYieldM3PerHour,
    inputs.pumpRatedDischargeM3PerHour,
    operatingDischargeM3PerHour
  );
  const dailyProductionM3 =
    limitingDischargeM3PerHour * inputs.pumpingHoursPerDay;

  return requireFiniteOutput({
    limitingDischargeM3PerHour,
    dailyProductionM3,
    dailyDemandM3: inputs.dailyDemandM3,
    reserveRequirementM3: inputs.dailyDemandM3 * inputs.reserveDays,
    dailyDeficitM3: Math.max(0, inputs.dailyDemandM3 - dailyProductionM3),
    usesRatedDischargeEstimate,
  }, "Borehole pump calculation result");
}
