import { requireFiniteOutput, requireNonNegative } from "./validation";

export function rainfallAndAreaToCubicMetres(
  rainfallMm: number,
  areaM2: number
): number {
  requireNonNegative(rainfallMm, "Rainfall");
  requireNonNegative(areaM2, "Area");

  return requireFiniteOutput((rainfallMm * areaM2) / 1000, "Rainfall volume");
}

export function cubicMetresToLitres(volumeM3: number): number {
  requireNonNegative(volumeM3, "Volume");
  return requireFiniteOutput(volumeM3 * 1000, "Volume in litres");
}

export function millimetresAndHectaresToCubicMetres(
  depthMm: number,
  areaHa: number
): number {
  requireNonNegative(depthMm, "Water depth");
  requireNonNegative(areaHa, "Area");

  return requireFiniteOutput(depthMm * areaHa * 10, "Water volume");
}
