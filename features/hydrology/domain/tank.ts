import { cubicMetresToLitres } from "./units";
import {
  requireFiniteOutput,
  requireNonNegative,
  requirePositive,
} from "./validation";

export type TankCapacityInputs =
  | {
      shape: "cylindrical";
      diameterM: number;
      heightM: number;
      freeboardHeightM: number;
      deadStorageM3: number;
    }
  | {
      shape: "rectangular";
      lengthM: number;
      widthM: number;
      heightM: number;
      freeboardHeightM: number;
      deadStorageM3: number;
    };

export type TankCapacityResult = {
  shape: TankCapacityInputs["shape"];
  grossVolumeM3: number;
  freeboardVolumeM3: number;
  volumeBelowFreeboardM3: number;
  deadStorageM3: number;
  usableStorageM3: number;
  usableStorageLitres: number;
};

export function calculateTankCapacity(
  inputs: TankCapacityInputs
): TankCapacityResult {
  requirePositive(inputs.heightM, "Tank height");
  requireNonNegative(inputs.freeboardHeightM, "Freeboard height");
  requireNonNegative(inputs.deadStorageM3, "Dead storage");

  if (inputs.freeboardHeightM > inputs.heightM) {
    throw new RangeError("Freeboard height cannot exceed tank height.");
  }

  let grossVolumeM3: number;
  let freeboardVolumeM3: number;

  if (inputs.shape === "cylindrical") {
    requirePositive(inputs.diameterM, "Tank diameter");
    const baseAreaM2 = Math.PI * (inputs.diameterM / 2) ** 2;
    grossVolumeM3 = baseAreaM2 * inputs.heightM;
    freeboardVolumeM3 = baseAreaM2 * inputs.freeboardHeightM;
  } else {
    requirePositive(inputs.lengthM, "Tank length");
    requirePositive(inputs.widthM, "Tank width");
    const baseAreaM2 = inputs.lengthM * inputs.widthM;
    grossVolumeM3 = baseAreaM2 * inputs.heightM;
    freeboardVolumeM3 = baseAreaM2 * inputs.freeboardHeightM;
  }

  const volumeBelowFreeboardM3 = grossVolumeM3 - freeboardVolumeM3;

  if (inputs.deadStorageM3 > volumeBelowFreeboardM3) {
    throw new RangeError(
      "Dead storage cannot exceed the volume below the freeboard."
    );
  }

  const usableStorageM3 = volumeBelowFreeboardM3 - inputs.deadStorageM3;

  return requireFiniteOutput({
    shape: inputs.shape,
    grossVolumeM3,
    freeboardVolumeM3,
    volumeBelowFreeboardM3,
    deadStorageM3: inputs.deadStorageM3,
    usableStorageM3,
    usableStorageLitres: cubicMetresToLitres(usableStorageM3),
  }, "Tank capacity result");
}
