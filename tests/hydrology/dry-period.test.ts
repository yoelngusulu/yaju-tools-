import assert from "node:assert/strict";
import test from "node:test";
import { calculateDesignDryPeriod } from "../../features/hydrology/domain/dry-period";

const DAY_MS = 86_400_000;

function key(timestamp: number) {
  const date = new Date(timestamp);
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}`;
}

function completeSeries(startYear: number, endYear: number, rainfall = 5) {
  const values: Record<string, number> = {};
  for (let timestamp = Date.UTC(startYear, 0, 1);
    timestamp < Date.UTC(endYear + 1, 0, 1);
    timestamp += DAY_MS) {
    values[key(timestamp)] = rainfall;
  }
  return values;
}

test("all-wet complete years return zero consecutive dry days", () => {
  const result = calculateDesignDryPeriod(completeSeries(2001, 2022), {
    startYear: 2001,
    endYear: 2022,
  });

  assert.equal(result.status, "ready");
  assert.equal(result.valueDays, 0);
  assert.equal(result.validYears, 22);
  assert.ok(result.annualMaximumCdd.every((item) => item.cddDays === 0));
});

test("all-dry period is rejected because the opening and ending spells are censored", () => {
  const result = calculateDesignDryPeriod(completeSeries(2001, 2022, 0), {
    startYear: 2001,
    endYear: 2022,
  });

  assert.equal(result.status, "insufficient-data");
  assert.equal(result.valueDays, null);
  assert.equal(result.annualMaximumCdd[0].status, "left-censored-at-period-start");
  assert.equal(result.annualMaximumCdd.at(-1)?.status, "open-spell-at-period-end");
});

test("rainfall below 1 mm/day is dry, while exactly 1 mm/day is wet", () => {
  const values = completeSeries(2001, 2022);
  values["20010102"] = 0.999;
  values["20010103"] = 1;
  values["20010104"] = 0.5;
  values["20010105"] = 1.2;

  const result = calculateDesignDryPeriod(values, {
    startYear: 2001,
    endYear: 2022,
  });

  assert.equal(result.annualMaximumCdd[0].cddDays, 1);
});

test("a dry spell crossing December and January is continuous and attributed to its ending year", () => {
  const values = completeSeries(2001, 2022);
  for (let day = 28; day <= 31; day += 1) values[`200112${day}`] = 0;
  for (let day = 1; day <= 5; day += 1) values[`2002010${day}`] = 0;
  values["20020106"] = 5;

  const result = calculateDesignDryPeriod(values, {
    startYear: 2001,
    endYear: 2022,
  });

  assert.equal(result.annualMaximumCdd[0].status, "cross-year-spell-carried-forward");
  assert.equal(result.annualMaximumCdd[0].cddDays, null);
  assert.equal(result.annualMaximumCdd[1].cddDays, 9);
});

test("a missing day does not count as dry and censors an active dry spell", () => {
  const values = completeSeries(2001, 2022);
  values["20010102"] = 0;
  values["20010103"] = 0;
  values["20010104"] = -999;
  values["20010105"] = 0;
  values["20010106"] = 0;
  values["20010107"] = 5;

  const result = calculateDesignDryPeriod(values, {
    startYear: 2001,
    endYear: 2022,
    fillValue: -999,
  });

  assert.equal(result.annualMaximumCdd[0].status, "interrupted-by-missing-data");
  assert.equal(result.annualMaximumCdd[0].cddDays, null);
});

test("a dry spell beginning immediately after a missing day is censored", () => {
  const values = completeSeries(2001, 2022);
  values["20010102"] = -999;
  values["20010103"] = 0;
  values["20010104"] = 0;
  values["20010105"] = 5;

  const result = calculateDesignDryPeriod(values, {
    startYear: 2001,
    endYear: 2022,
    fillValue: -999,
  });

  assert.equal(result.annualMaximumCdd[0].status, "interrupted-by-missing-data");
  assert.equal(result.annualMaximumCdd[0].cddDays, null);
});

test("a dry spell still open at the end of the record is not reported as complete", () => {
  const values = completeSeries(2001, 2022);
  for (let day = 26; day <= 31; day += 1) values[`202212${day}`] = 0;

  const result = calculateDesignDryPeriod(values, {
    startYear: 2001,
    endYear: 2022,
  });

  assert.equal(result.annualMaximumCdd.at(-1)?.status, "open-spell-at-period-end");
  assert.equal(result.annualMaximumCdd.at(-1)?.cddDays, null);
});

test("years below the minimum daily coverage are excluded", () => {
  const values = completeSeries(2001, 2022);
  for (let dayOffset = 0; dayOffset < 40; dayOffset += 1) {
    delete values[key(Date.UTC(2001, 0, 1 + dayOffset))];
  }

  const result = calculateDesignDryPeriod(values, {
    startYear: 2001,
    endYear: 2022,
  });

  assert.equal(result.annualMaximumCdd[0].status, "insufficient-coverage");
  assert.equal(result.annualMaximumCdd[0].cddDays, null);
  assert.equal(result.validYears, 21);
});

test("nearest-rank 90th percentile selects the 20th value from 22 annual maxima", () => {
  const values = completeSeries(2001, 2022);
  for (let year = 2001; year <= 2022; year += 1) {
    const runLength = year - 2000;
    for (let day = 2; day <= runLength + 1; day += 1) {
      values[`${year}${String(1).padStart(2, "0")}${String(day).padStart(2, "0")}`] = 0.5;
    }
  }

  const result = calculateDesignDryPeriod(values, {
    startYear: 2001,
    endYear: 2022,
  });

  assert.equal(result.status, "ready");
  assert.equal(result.percentileMethod, "nearest-rank");
  assert.equal(result.valueDays, 20);
  assert.equal(result.validYears, 22);
});

test("NASA POWER invalid and fill values are ignored rather than treated as rainfall", () => {
  const values = completeSeries(2001, 2022);
  values["20010102"] = -999;
  values["20010103"] = 999;
  values["20010104"] = Number.NaN;

  const result = calculateDesignDryPeriod(values, {
    startYear: 2001,
    endYear: 2022,
    fillValue: -999,
  });

  assert.equal(result.annualMaximumCdd[0].status, "valid");
  assert.equal(result.annualMaximumCdd[0].cddDays, 0);
  assert.equal(result.annualMaximumCdd[0].validDays, 362);
});

test("the design period is withheld when fewer than 80 percent of annual records are valid", () => {
  const values = completeSeries(2001, 2022);
  for (let year = 2001; year <= 2005; year += 1) {
    for (let day = 2; day <= 4; day += 1) {
      values[`${year}010${day}`] = 0;
    }
    values[`${year}0105`] = -999;
  }
  // The active dry spells are interrupted, making five annual records invalid.
  const result = calculateDesignDryPeriod(values, {
    startYear: 2001,
    endYear: 2022,
    fillValue: -999,
  });

  assert.equal(result.status, "insufficient-data");
  assert.equal(result.validYears, 17);
  assert.equal(result.requiredValidYears, 18);
});

test("leap-year coverage uses 366 expected days", () => {
  const values = completeSeries(2000, 2022);
  for (let day = 1; day <= 34; day += 1) {
    delete values[`200002${String(day).padStart(2, "0")}`];
  }
  const result = calculateDesignDryPeriod(values, {
    startYear: 2000,
    endYear: 2022,
  });

  const leapYear = result.annualMaximumCdd.find((item) => item.year === 2000);
  assert.equal(leapYear?.expectedDays, 366);
  assert.ok(leapYear!.coveragePercent < 100);
});
