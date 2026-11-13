export type AnnualMaximumCdd = {
  year: number;
  cddDays: number | null;
  validDays: number;
  expectedDays: number;
  coveragePercent: number;
  status:
    | "valid"
    | "insufficient-coverage"
    | "cross-year-spell-carried-forward"
    | "interrupted-by-missing-data"
    | "open-spell-at-period-end"
    | "left-censored-at-period-start";
};

export type DesignDryPeriodResult = {
  status: "ready" | "insufficient-data";
  valueDays: number | null;
  thresholdMmPerDay: number;
  percentile: number;
  percentileMethod: "nearest-rank";
  validYears: number;
  requiredValidYears: number;
  minimumAnnualCoveragePercent: number;
  annualMaximumCdd: AnnualMaximumCdd[];
  message: string | null;
};

type DryPeriodOptions = {
  startYear: number;
  endYear: number;
  fillValue?: number;
  thresholdMmPerDay?: number;
  minimumAnnualCoverageFraction?: number;
  minimumValidYearFraction?: number;
  percentile?: number;
};

type AnnualAccumulator = {
  validDays: number;
  dryDaysObserved: number;
  maximumCdd: number;
  censoredStatus: AnnualMaximumCdd["status"] | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function daysInYear(year: number) {
  return (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / DAY_MS;
}

function dateKey(timestamp: number) {
  const date = new Date(timestamp);
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("");
}

function markCensored(
  annual: Map<number, AnnualAccumulator>,
  fromYear: number,
  toYear: number,
  status: AnnualMaximumCdd["status"]
) {
  for (let year = fromYear; year <= toYear; year += 1) {
    const item = annual.get(year);
    if (item && item.censoredStatus === null) {
      item.censoredStatus = status;
    }
  }
}

/**
 * Calculates a design dry period from daily precipitation.
 *
 * A dry day is strictly below the configured threshold (1 mm/day by default).
 * A spell crossing a calendar year is assigned to the year of its final dry
 * day; earlier year(s) touched by that spell are not reported, following the
 * ETCCDI CDD convention. A spell interrupted by missing data is not treated as
 * a completed spell, and a spell still open at the end of the record is
 * right-censored rather than reported as a complete CDD.
 */
export function calculateDesignDryPeriod(
  dailyValues: Record<string, unknown>,
  options: DryPeriodOptions
): DesignDryPeriodResult {
  const {
    startYear,
    endYear,
    fillValue,
    thresholdMmPerDay = 1,
    minimumAnnualCoverageFraction = 0.9,
    minimumValidYearFraction = 0.8,
    percentile = 90,
  } = options;

  if (!Number.isInteger(startYear) || !Number.isInteger(endYear) || endYear < startYear) {
    throw new Error("Dry-period analysis requires a valid inclusive year range.");
  }
  if (!Number.isFinite(thresholdMmPerDay) || thresholdMmPerDay < 0) {
    throw new Error("The dry-day rainfall threshold must be a non-negative finite value.");
  }
  if (
    !Number.isFinite(minimumAnnualCoverageFraction) ||
    minimumAnnualCoverageFraction <= 0 ||
    minimumAnnualCoverageFraction > 1
  ) {
    throw new Error("Minimum annual data coverage must be greater than 0 and no more than 1.");
  }
  if (!Number.isFinite(minimumValidYearFraction) || minimumValidYearFraction <= 0 || minimumValidYearFraction > 1) {
    throw new Error("Minimum valid-year fraction must be greater than 0 and no more than 1.");
  }
  if (!Number.isFinite(percentile) || percentile <= 0 || percentile > 100) {
    throw new Error("The design percentile must be greater than 0 and no more than 100.");
  }

  const annual = new Map<number, AnnualAccumulator>();
  for (let year = startYear; year <= endYear; year += 1) {
    annual.set(year, {
      validDays: 0,
      dryDaysObserved: 0,
      maximumCdd: 0,
      censoredStatus: null,
    });
  }

  const observations = new Map<string, number>();
  for (const [key, rawValue] of Object.entries(dailyValues)) {
    if (!/^\d{8}$/.test(key) || rawValue === null || rawValue === undefined || rawValue === "") continue;

    const year = Number(key.slice(0, 4));
    const month = Number(key.slice(4, 6));
    const day = Number(key.slice(6, 8));
    const timestamp = Date.UTC(year, month - 1, day);
    const parsedDate = new Date(timestamp);

    if (
      year < startYear ||
      year > endYear ||
      parsedDate.getUTCFullYear() !== year ||
      parsedDate.getUTCMonth() + 1 !== month ||
      parsedDate.getUTCDate() !== day
    ) {
      continue;
    }

    const value = Number(rawValue);
    if (
      !Number.isFinite(value) ||
      value < 0 ||
      value >= 999 ||
      (fillValue !== undefined && value === fillValue)
    ) {
      continue;
    }

    observations.set(key, value);
  }

  let runLength = 0;
  let runStartYear = startYear;
  let runEndYear = startYear;

  const closeRun = (endingKnown: boolean) => {
    if (runLength === 0) return;

    if (!endingKnown) {
      markCensored(annual, runStartYear, runEndYear, "interrupted-by-missing-data");
    } else {
      if (runStartYear < runEndYear) {
        markCensored(
          annual,
          runStartYear,
          runEndYear - 1,
          "cross-year-spell-carried-forward"
        );
      }
      const endYearStats = annual.get(runEndYear);
      if (endYearStats) {
        endYearStats.maximumCdd = Math.max(endYearStats.maximumCdd, runLength);
      }
    }

    runLength = 0;
  };

  const firstTimestamp = Date.UTC(startYear, 0, 1);
  const finalTimestamp = Date.UTC(endYear + 1, 0, 1) - DAY_MS;

  for (let timestamp = firstTimestamp; timestamp <= finalTimestamp; timestamp += DAY_MS) {
    const year = new Date(timestamp).getUTCFullYear();
    const key = dateKey(timestamp);
    const rainfall = observations.get(key);
    const yearStats = annual.get(year);

    if (rainfall === undefined) {
      closeRun(false);
      continue;
    }

    if (yearStats) yearStats.validDays += 1;

    if (rainfall < thresholdMmPerDay) {
      if (yearStats) yearStats.dryDaysObserved += 1;
      if (runLength === 0) {
        runStartYear = year;
        if (timestamp === firstTimestamp) {
          markCensored(
            annual,
            year,
            year,
            "left-censored-at-period-start"
          );
        }
      }
      runLength += 1;
      runEndYear = year;
    } else {
      closeRun(true);
    }
  }

  // Do not report a spell that remains dry on the final day: its end is unknown.
  if (runLength > 0) {
    markCensored(annual, runStartYear, runEndYear, "open-spell-at-period-end");
  }

  const annualMaximumCdd: AnnualMaximumCdd[] = [];
  for (let year = startYear; year <= endYear; year += 1) {
    const item = annual.get(year)!;
    const expectedDays = daysInYear(year);
    const coverageFraction = item.validDays / expectedDays;
    const coveragePercent = Math.round(coverageFraction * 1000) / 10;

    if (coverageFraction < minimumAnnualCoverageFraction) {
      annualMaximumCdd.push({
        year,
        cddDays: null,
        validDays: item.validDays,
        expectedDays,
        coveragePercent,
        status: "insufficient-coverage",
      });
      continue;
    }

    if (item.censoredStatus !== null) {
      annualMaximumCdd.push({
        year,
        cddDays: null,
        validDays: item.validDays,
        expectedDays,
        coveragePercent,
        status: item.censoredStatus,
      });
      continue;
    }

    annualMaximumCdd.push({
      year,
      cddDays: item.dryDaysObserved === 0 ? 0 : item.maximumCdd,
      validDays: item.validDays,
      expectedDays,
      coveragePercent,
      status: "valid",
    });
  }

  const validValues = annualMaximumCdd
    .filter((item): item is AnnualMaximumCdd & { cddDays: number } => item.cddDays !== null)
    .map((item) => item.cddDays)
    .sort((a, b) => a - b);

  const totalYears = endYear - startYear + 1;
  const requiredValidYears = Math.ceil(totalYears * minimumValidYearFraction);
  const validYears = validValues.length;

  if (validYears < requiredValidYears) {
    return {
      status: "insufficient-data",
      valueDays: null,
      thresholdMmPerDay,
      percentile,
      percentileMethod: "nearest-rank",
      validYears,
      requiredValidYears,
      minimumAnnualCoveragePercent: minimumAnnualCoverageFraction * 100,
      annualMaximumCdd,
      message: `Only ${validYears} valid annual CDD values are available; at least ${requiredValidYears} are required. Enter a verified dry period manually.`,
    };
  }

  const nearestRank = Math.ceil((percentile / 100) * validValues.length);
  const valueDays = validValues[nearestRank - 1];

  return {
    status: "ready",
    valueDays,
    thresholdMmPerDay,
    percentile,
    percentileMethod: "nearest-rank",
    validYears,
    requiredValidYears,
    minimumAnnualCoveragePercent: minimumAnnualCoverageFraction * 100,
    annualMaximumCdd,
    message: null,
  };
}
