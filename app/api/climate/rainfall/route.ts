import { calculateDesignDryPeriod } from "@/features/hydrology/domain/dry-period";

const NASA_POWER_BASE_URL = "https://power.larc.nasa.gov/api/temporal/daily/point";
const PARAMETER = "PRECTOTCORR";
const COMMUNITY = "AG";
const START_YEAR = 2001;
const END_YEAR = 2022;
const START_DATE = `${START_YEAR}0101`;
const END_DATE = `${END_YEAR}1231`;
const MIN_VALID_DAYS_FRACTION = 0.9;
const MIN_VALID_SAMPLE_YEARS = Math.ceil((END_YEAR - START_YEAR + 1) * 0.8);
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

type PowerPayload = {
  messages?: string[];
  header?: { title?: string; fill_value?: number };
  geometry?: { coordinates?: number[] };
  parameters?: Record<string, { units?: string; longname?: string; fill_value?: number }>;
  properties?: {
    parameter?: Record<string, Record<string, number>>;
  };
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

function providerMessages(payload: PowerPayload | null) {
  return (payload?.messages ?? [])
    .map((message) => message.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(" ");
}

export const runtime = "nodejs";
export const revalidate = 86_400;

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const latitude = validCoordinate(requestUrl.searchParams.get("latitude"), -90, 90);
  const longitude = validCoordinate(requestUrl.searchParams.get("longitude"), -180, 180);

  if (latitude === null || longitude === null) {
    return Response.json(
      { error: "Enter valid site latitude and longitude in WGS 84 decimal degrees." },
      { status: 400 }
    );
  }

  const query = new URLSearchParams({
    parameters: PARAMETER,
    community: COMMUNITY,
    longitude: longitude.toFixed(5),
    latitude: latitude.toFixed(5),
    start: START_DATE,
    end: END_DATE,
    format: "JSON",
    "time-standard": "UTC",
  });

  try {
    const upstream = await fetch(`${NASA_POWER_BASE_URL}?${query.toString()}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 604_800 },
      signal: AbortSignal.timeout(30_000),
    });

    const payload = await upstream.json().catch(() => null) as PowerPayload | null;

    if (!upstream.ok) {
      const detail = providerMessages(payload);
      const message = upstream.status === 429
        ? "NASA POWER is temporarily rate-limiting rainfall requests. Wait a little, then retry the selected point."
        : detail
          ? `NASA POWER rejected the rainfall request (${upstream.status}): ${detail}`
          : `NASA POWER could not return daily rainfall data (HTTP ${upstream.status}). Retry the point or enter rainfall manually.`;
      return Response.json(
        { error: message, providerStatus: upstream.status, providerMessages: detail || undefined },
        {
          status: upstream.status === 429 ? 503 : 502,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    const dailyValues = payload?.properties?.parameter?.[PARAMETER];
    if (!dailyValues || typeof dailyValues !== "object") {
      const detail = providerMessages(payload);
      return Response.json(
        {
          error: detail
            ? `NASA POWER returned no ${PARAMETER} daily series: ${detail}`
            : `NASA POWER returned no daily ${PARAMETER} rainfall series for this point.`,
        },
        { status: 502, headers: { "Cache-Control": "no-store" } }
      );
    }

    const unit = payload?.parameters?.[PARAMETER]?.units ?? "mm/day";
    if (!unit.toLowerCase().includes("mm/day")) {
      return Response.json(
        {
          error: `NASA POWER returned an unexpected daily rainfall unit (${unit}); conversion was stopped to avoid incorrect results.`,
        },
        { status: 502, headers: { "Cache-Control": "no-store" } }
      );
    }

    // Aggregate daily precipitation (mm/day) into calendar-month totals (mm),
    // then compute the mean total for each calendar month over 2001–2022.
    const monthlyByYear = new Map<number, Array<{ totalMm: number; validDays: number }>>();
    for (let year = START_YEAR; year <= END_YEAR; year += 1) {
      monthlyByYear.set(
        year,
        Array.from({ length: 12 }, () => ({ totalMm: 0, validDays: 0 }))
      );
    }

    const fillValue =
      payload?.header?.fill_value ?? payload?.parameters?.[PARAMETER]?.fill_value;
    for (const [dateKey, rawValue] of Object.entries(dailyValues)) {
      if (!/^\d{8}$/.test(dateKey)) continue;

      const year = Number(dateKey.slice(0, 4));
      const month = Number(dateKey.slice(4, 6));
      const day = Number(dateKey.slice(6, 8));
      const dailyRainfallMm = Number(rawValue);

      if (
        year < START_YEAR ||
        year > END_YEAR ||
        month < 1 ||
        month > 12 ||
        day < 1 ||
        day > daysInMonth(year, month) ||
        !Number.isFinite(dailyRainfallMm) ||
        dailyRainfallMm < 0 ||
        dailyRainfallMm >= 999 ||
        (fillValue !== undefined && dailyRainfallMm === fillValue)
      ) {
        continue;
      }

      const yearMonths = monthlyByYear.get(year);
      if (!yearMonths) continue;
      yearMonths[month - 1].totalMm += dailyRainfallMm;
      yearMonths[month - 1].validDays += 1;
    }

    const monthlyRainfall = MONTHS.map((monthName, monthIndex) => {
      const validMonthlyTotals: number[] = [];
      for (let year = START_YEAR; year <= END_YEAR; year += 1) {
        const monthly = monthlyByYear.get(year)?.[monthIndex];
        if (!monthly) continue;

        const expectedDays = daysInMonth(year, monthIndex + 1);
        if (monthly.validDays >= Math.ceil(expectedDays * MIN_VALID_DAYS_FRACTION)) {
          validMonthlyTotals.push(monthly.totalMm);
        }
      }

      if (validMonthlyTotals.length < MIN_VALID_SAMPLE_YEARS) {
        return {
          month: monthName,
          monthNumber: monthIndex + 1,
          rainfallMm: null,
          sampleYears: validMonthlyTotals.length,
        };
      }

      const meanMonthlyTotalMm =
        validMonthlyTotals.reduce((sum, total) => sum + total, 0) / validMonthlyTotals.length;

      return {
        month: monthName,
        monthNumber: monthIndex + 1,
        rainfallMm: Math.round(meanMonthlyTotalMm * 10) / 10,
        sampleYears: validMonthlyTotals.length,
      };
    });

    const dryPeriod = calculateDesignDryPeriod(dailyValues, {
      startYear: START_YEAR,
      endYear: END_YEAR,
      fillValue,
      thresholdMmPerDay: 1,
      minimumAnnualCoverageFraction: MIN_VALID_DAYS_FRACTION,
      minimumValidYearFraction: 0.8,
      percentile: 90,
    });

    const missingMonths = monthlyRainfall.filter((month) => month.rainfallMm === null);
    if (missingMonths.length > 0) {
      return Response.json(
        {
          error: `NASA POWER returned incomplete daily rainfall coverage for ${missingMonths.map((month) => month.month).join(", ")} at this point. Try another point or enter rainfall manually.`,
          missingMonths: missingMonths.map((month) => ({
            month: month.month,
            sampleYears: month.sampleYears,
          })),
        },
        { status: 502, headers: { "Cache-Control": "no-store" } }
      );
    }

    const completeMonths = monthlyRainfall as Array<{
      month: string;
      monthNumber: number;
      rainfallMm: number;
      sampleYears: number;
    }>;
    const annualRainfallMm =
      completeMonths.reduce((sum, month) => sum + month.rainfallMm, 0);
    const gridCoordinates = payload?.geometry?.coordinates;
    const gridLongitude =
      Array.isArray(gridCoordinates) && Number.isFinite(gridCoordinates[0])
        ? gridCoordinates[0]
        : longitude;
    const gridLatitude =
      Array.isArray(gridCoordinates) && Number.isFinite(gridCoordinates[1])
        ? gridCoordinates[1]
        : latitude;

    return Response.json(
      {
        source: "NASA POWER Daily API",
        parameter: PARAMETER,
        community: COMMUNITY,
        units: "mm/month",
        sourceUnits: unit,
        timeStandard: "UTC",
        startYear: START_YEAR,
        endYear: END_YEAR,
        annualRainfallMm: Math.round(annualRainfallMm * 10) / 10,
        monthlyRainfall: completeMonths,
        dryPeriod,
        dryPeriodMethod: "Annual maximum consecutive dry days (CDD) from daily precipitation below 1 mm/day; the design value is the nearest-rank 90th percentile of valid annual maxima. The 90th percentile is a calculator design choice, not an ETCCDI requirement.",
        requestedCoordinates: { latitude, longitude },
        dataCoordinates: { latitude: gridLatitude, longitude: gridLongitude },
        conversionNote: "Daily PRECTOTCORR rainfall (mm/day) summed to calendar-month totals (mm), then averaged for each calendar month over 2001–2022. Months with less than 90% daily coverage in a year are excluded; each reported monthly average requires at least 80% of the 22 years.",
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
          ? "NASA POWER took too long to return daily rainfall data for this point. Retry, or enter a verified annual rainfall value manually."
          : "Daily rainfall data could not be retrieved for this point. Check the connection and retry, or enter rainfall manually.",
      },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }
}
