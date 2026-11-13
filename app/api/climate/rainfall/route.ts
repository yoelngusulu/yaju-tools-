const NASA_POWER_BASE_URL = "https://power.larc.nasa.gov/api/temporal/monthly/point";
// PRECTOTCORR is available for monthly time series in the AG community.
const PARAMETER = "PRECTOTCORR";
const COMMUNITY = "AG";
const START_YEAR = 2001;
const END_YEAR = 2022;
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

type PowerPayload = {
  geometry?: { coordinates?: number[] };
  parameters?: Record<string, { units?: string; longname?: string }>;
  properties?: { parameter?: Record<string, Record<string, number>> };
};

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function validCoordinate(value: string | null, min: number, max: number) {
  if (value === null || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max
    ? parsed
    : null;
}

export const runtime = "nodejs";
export const revalidate = 86_400;

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const latitude = validCoordinate(requestUrl.searchParams.get("latitude"), -90, 90);
  const longitude = validCoordinate(requestUrl.searchParams.get("longitude"), -180, 180);

  if (latitude === null || longitude === null) {
    return Response.json(
      { error: "Enter valid site latitude and longitude in decimal degrees." },
      { status: 400 }
    );
  }

  const query = new URLSearchParams({
    parameters: PARAMETER,
    community: COMMUNITY,
    latitude: latitude.toFixed(5),
    longitude: longitude.toFixed(5),
    start: String(START_YEAR),
    end: String(END_YEAR),
    format: "JSON",
  });

  try {
    const upstream = await fetch(`${NASA_POWER_BASE_URL}?${query.toString()}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 604_800 },
      signal: AbortSignal.timeout(20_000),
    });

    if (!upstream.ok) {
      return Response.json(
        {
          error: upstream.status === 429
            ? "NASA POWER is temporarily rate-limiting requests. Try again shortly or enter rainfall manually."
            : "NASA POWER could not return rainfall data for this location. You can enter a known rainfall value manually.",
          providerStatus: upstream.status,
        },
        { status: upstream.status === 429 ? 503 : 502, headers: { "Cache-Control": "no-store" } }
      );
    }

    const payload = (await upstream.json()) as PowerPayload;
    const parameterValues = payload.properties?.parameter?.[PARAMETER];
    if (!parameterValues || typeof parameterValues !== "object") {
      return Response.json(
        { error: "NASA POWER returned no monthly rainfall series for this location." },
        { status: 502, headers: { "Cache-Control": "no-store" } }
      );
    }

    const unit = payload.parameters?.[PARAMETER]?.units ?? "mm/day";
    if (!unit.toLowerCase().includes("mm/day")) {
      return Response.json(
        { error: `NASA POWER returned an unexpected rainfall unit (${unit}); no conversion was applied.` },
        { status: 502, headers: { "Cache-Control": "no-store" } }
      );
    }

    const monthlySamples = Array.from({ length: 12 }, () => [] as number[]);
    for (const [key, rawValue] of Object.entries(parameterValues)) {
      if (!/^\d{6}$/.test(key)) continue;
      const year = Number(key.slice(0, 4));
      const month = Number(key.slice(4, 6));
      const dailyMeanMm = Number(rawValue);
      if (
        year < START_YEAR ||
        year > END_YEAR ||
        month < 1 ||
        month > 12 ||
        !Number.isFinite(dailyMeanMm) ||
        dailyMeanMm < 0 ||
        dailyMeanMm >= 999
      ) continue;

      // Monthly API aggregate is expressed as mean daily precipitation (mm/day).
      // Convert each year's monthly mean to accumulated monthly depth before
      // averaging the same calendar month across the chosen climatology period.
      monthlySamples[month - 1].push(dailyMeanMm * daysInMonth(year, month));
    }

    const monthlyRainfall = monthlySamples.map((samples, index) => {
      if (samples.length === 0) return null;
      const average = samples.reduce((sum, value) => sum + value, 0) / samples.length;
      return {
        month: MONTHS[index],
        monthNumber: index + 1,
        rainfallMm: Math.round(average * 10) / 10,
        sampleYears: samples.length,
      };
    });

    if (monthlyRainfall.some((month) => month === null)) {
      return Response.json(
        { error: "NASA POWER returned an incomplete monthly rainfall series. Try another site or enter rainfall manually." },
        { status: 502, headers: { "Cache-Control": "no-store" } }
      );
    }

    const months = monthlyRainfall as NonNullable<(typeof monthlyRainfall)[number]>[];
    const annualRainfallMm = months.reduce((sum, month) => sum + month.rainfallMm, 0);
    const gridCoordinates = payload.geometry?.coordinates;
    const gridLongitude = Array.isArray(gridCoordinates) && Number.isFinite(gridCoordinates[0])
      ? gridCoordinates[0]
      : longitude;
    const gridLatitude = Array.isArray(gridCoordinates) && Number.isFinite(gridCoordinates[1])
      ? gridCoordinates[1]
      : latitude;

    return Response.json(
      {
        source: "NASA POWER",
        parameter: PARAMETER,
        community: COMMUNITY,
        units: "mm/month",
        sourceUnits: unit,
        startYear: START_YEAR,
        endYear: END_YEAR,
        annualRainfallMm: Math.round(annualRainfallMm * 10) / 10,
        monthlyRainfall: months,
        requestedCoordinates: { latitude, longitude },
        dataCoordinates: { latitude: gridLatitude, longitude: gridLongitude },
        conversionNote: "Monthly mean daily precipitation (mm/day) multiplied by actual days in each month, then averaged for each calendar month over 2001–2022.",
        retrievedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
        },
      }
    );
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    return Response.json(
      {
        error: timedOut
          ? "NASA POWER took too long to respond. Try again or enter rainfall manually."
          : "Rainfall data could not be retrieved. Check the connection and try again, or enter rainfall manually.",
      },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }
}
