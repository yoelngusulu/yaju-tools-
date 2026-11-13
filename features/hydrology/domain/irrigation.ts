import { millimetresAndHectaresToCubicMetres } from "./units";
import {
  requireNonNegative,
  requireFiniteOutput,
  requirePercentage,
  requirePositive,
} from "./validation";

export type IrrigationInputs = {
  etoMmPerDay: number;
  cropCoefficient: number;
  effectiveRainfallMmPerDay: number;
  efficiencyPercent: number;
  irrigatedAreaHa: number;
  irrigationIntervalDays: number;
};

export type IrrigationResult = {
  etoMmPerDay: number;
  cropEvapotranspirationMmPerDay: number;
  netIrrigationMmPerDay: number;
  grossIrrigationMmPerDay: number;
  grossDemandM3PerDay: number;
  intervalStorageM3: number;
};

export function calculateIrrigationRequirement(
  inputs: IrrigationInputs
): IrrigationResult {
  requireNonNegative(inputs.etoMmPerDay, "Reference evapotranspiration (ETo)");
  requireNonNegative(inputs.cropCoefficient, "Crop coefficient (Kc)");
  requireNonNegative(
    inputs.effectiveRainfallMmPerDay,
    "Effective rainfall"
  );
  requirePercentage(inputs.efficiencyPercent, "Irrigation efficiency");
  requirePositive(inputs.irrigatedAreaHa, "Irrigated area");
  requirePositive(inputs.irrigationIntervalDays, "Irrigation interval");

  const cropEvapotranspirationMmPerDay =
    inputs.etoMmPerDay * inputs.cropCoefficient;
  const netIrrigationMmPerDay = Math.max(
    0,
    cropEvapotranspirationMmPerDay - inputs.effectiveRainfallMmPerDay
  );
  const grossIrrigationMmPerDay =
    netIrrigationMmPerDay / (inputs.efficiencyPercent / 100);
  const grossDemandM3PerDay = millimetresAndHectaresToCubicMetres(
    grossIrrigationMmPerDay,
    inputs.irrigatedAreaHa
  );

  return requireFiniteOutput({
    etoMmPerDay: inputs.etoMmPerDay,
    cropEvapotranspirationMmPerDay,
    netIrrigationMmPerDay,
    grossIrrigationMmPerDay,
    grossDemandM3PerDay,
    intervalStorageM3:
      grossDemandM3PerDay * inputs.irrigationIntervalDays,
  }, "Irrigation calculation result");
}
