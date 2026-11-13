import { requireFiniteOutput, requirePositive } from "./validation";

export type GeographicPoint = {
  latitude: number;
  longitude: number;
};

const EARTH_MEAN_RADIUS_M = 6_371_008.8;

/**
 * Spherical polygon area for small WGS 84 footprints in decimal degrees.
 * Use measured/projected survey data for cadastral or construction set-out work.
 */
export function calculateSphericalPolygonAreaM2(
  points: readonly GeographicPoint[]
): number {
  if (points.length < 3) {
    throw new RangeError("A polygon needs at least three vertices.");
  }

  points.forEach((point, index) => {
    if (
      !Number.isFinite(point.latitude) ||
      point.latitude < -90 ||
      point.latitude > 90 ||
      !Number.isFinite(point.longitude) ||
      point.longitude < -180 ||
      point.longitude > 180
    ) {
      throw new RangeError(`Polygon vertex ${index + 1} must have valid WGS 84 coordinates.`);
    }
  });

  let sum = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    const latitude1 = (current.latitude * Math.PI) / 180;
    const latitude2 = (next.latitude * Math.PI) / 180;
    let longitudeDelta = ((next.longitude - current.longitude) * Math.PI) / 180;

    if (longitudeDelta > Math.PI) longitudeDelta -= 2 * Math.PI;
    if (longitudeDelta < -Math.PI) longitudeDelta += 2 * Math.PI;

    sum += longitudeDelta * (2 + Math.sin(latitude1) + Math.sin(latitude2));
  }

  const areaM2 = (Math.abs(sum) * EARTH_MEAN_RADIUS_M ** 2) / 2;
  requirePositive(areaM2, "Polygon area");
  return requireFiniteOutput(areaM2, "Polygon area");
}


export type SiteCoordinates = GeographicPoint & {
  elevationM: number | null;
};

/**
 * Parse map-compatible site coordinates: X=longitude, Y=latitude (WGS 84),
 * and optional Z=elevation in metres.
 */
export function parseSiteCoordinates(
  x: string,
  y: string,
  z: string
): SiteCoordinates {
  if (!x.trim()) throw new RangeError("X (longitude) is required.");
  if (!y.trim()) throw new RangeError("Y (latitude) is required.");

  const longitude = Number(x);
  const latitude = Number(y);
  const elevationM = z.trim() ? Number(z) : null;

  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new RangeError("X (longitude) must be between -180 and 180 degrees.");
  }
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new RangeError("Y (latitude) must be between -90 and 90 degrees.");
  }
  if (elevationM !== null && !Number.isFinite(elevationM)) {
    throw new RangeError("Z (elevation) must be a finite number of metres.");
  }

  return { longitude, latitude, elevationM };
}
