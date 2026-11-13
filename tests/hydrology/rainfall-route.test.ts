import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "../../app/api/climate/rainfall/route";

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

test("rainfall route requests the supported daily PRECTOTCORR point series and aggregates monthly totals", async () => {
  const originalFetch = globalThis.fetch;
  const requestedUrls: URL[] = [];
  const dailyValues: Record<string, number> = {};

  // Synthetic complete daily data: 0.1 x calendar-month number mm/day
  // for every day in every year of the 2001–2022 climate period.
  for (let year = 2001; year <= 2022; year += 1) {
    for (let month = 1; month <= 12; month += 1) {
      for (let day = 1; day <= daysInMonth(year, month); day += 1) {
        const key = `${year}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}`;
        dailyValues[key] = month / 10;
      }
    }
  }

  dailyValues["20220331"] = -999; // NASA POWER header fill value must not be treated as rainfall.

  globalThis.fetch = async (input) => {
    requestedUrls.push(new URL(String(input)));
    return new Response(JSON.stringify({
      header: { fill_value: -999 },
      parameters: {
        PRECTOTCORR: {
          units: "mm/day",
          longname: "Bias-corrected precipitation",
        },
      },
      properties: { parameter: { PRECTOTCORR: dailyValues } },
      geometry: { coordinates: [35.666, -7.817, 1721.47] },
      messages: [],
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  try {
    const response = await GET(
      new Request("https://yaju-tools.test/api/climate/rainfall?latitude=-7.81713&longitude=35.66582")
    );
    const body = await response.json() as {
      source: string;
      parameter: string;
      timeStandard: string;
      startYear: number;
      endYear: number;
      annualRainfallMm: number;
      dryPeriod: {
        status: "ready" | "insufficient-data";
        valueDays: number | null;
        thresholdMmPerDay: number;
        percentile: number;
        percentileMethod: "nearest-rank";
        validYears: number;
        requiredValidYears: number;
      };
      dryPeriodMethod: string;
      monthlyRainfall: Array<{
        monthNumber: number;
        rainfallMm: number;
        sampleYears: number;
      }>;
      requestedCoordinates: { latitude: number; longitude: number };
      dataCoordinates: { latitude: number; longitude: number };
    };

    assert.equal(response.status, 200);
    assert.equal(requestedUrls.length, 1);
    assert.equal(requestedUrls[0]?.pathname, "/api/temporal/daily/point");
    assert.equal(requestedUrls[0]?.searchParams.get("parameters"), "PRECTOTCORR");
    assert.equal(requestedUrls[0]?.searchParams.get("community"), "AG");
    assert.equal(requestedUrls[0]?.searchParams.get("start"), "20010101");
    assert.equal(requestedUrls[0]?.searchParams.get("end"), "20221231");
    assert.equal(requestedUrls[0]?.searchParams.get("time-standard"), "UTC");
    assert.equal(body.source, "NASA POWER Daily API");
    assert.equal(body.parameter, "PRECTOTCORR");
    assert.equal(body.timeStandard, "UTC");
    assert.equal(body.startYear, 2001);
    assert.equal(body.endYear, 2022);
    assert.equal(body.dryPeriod.status, "ready");
    assert.equal(body.dryPeriod.thresholdMmPerDay, 1);
    assert.equal(body.dryPeriod.percentile, 90);
    assert.equal(body.dryPeriod.percentileMethod, "nearest-rank");
    assert.equal(body.dryPeriod.validYears, 20);
    assert.equal(body.dryPeriod.requiredValidYears, 18);
    assert.equal(body.dryPeriod.valueDays, 273);
    assert.match(body.dryPeriodMethod, /calculator design choice/);
    assert.equal(body.monthlyRainfall.length, 12);
    assert.equal(body.monthlyRainfall[0].rainfallMm, 3.1);
    assert.equal(body.monthlyRainfall[0].sampleYears, 22);

    const februaryMeanDays = Array.from({ length: 22 }, (_, index) =>
      daysInMonth(2001 + index, 2)
    ).reduce((sum, days) => sum + days, 0) / 22;
    assert.equal(
      body.monthlyRainfall[1].rainfallMm,
      Math.round((0.2 * februaryMeanDays) * 10) / 10
    );

    const expectedAnnual = body.monthlyRainfall.reduce(
      (sum, month) => sum + month.rainfallMm,
      0
    );
    assert.equal(body.annualRainfallMm, Math.round(expectedAnnual * 10) / 10);
    assert.equal(body.requestedCoordinates.latitude, -7.81713);
    assert.equal(body.requestedCoordinates.longitude, 35.66582);
    assert.equal(body.dataCoordinates.latitude, -7.817);
    assert.equal(body.dataCoordinates.longitude, 35.666);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rainfall route rejects invalid point coordinates without calling NASA POWER", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    return new Response(null, { status: 200 });
  };

  try {
    const response = await GET(
      new Request("https://yaju-tools.test/api/climate/rainfall?latitude=91&longitude=35")
    );
    assert.equal(response.status, 400);
    assert.equal(fetchCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rainfall route surfaces NASA POWER validation messages instead of a generic failure", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(
    JSON.stringify({ messages: ["Invalid parameter or temporal level."] }),
    { status: 422, headers: { "Content-Type": "application/json" } }
  );

  try {
    const response = await GET(
      new Request("https://yaju-tools.test/api/climate/rainfall?latitude=-7.8&longitude=35.6")
    );
    const body = await response.json() as { error: string; providerStatus: number };
    assert.equal(response.status, 502);
    assert.equal(body.providerStatus, 422);
    assert.match(body.error, /Invalid parameter or temporal level/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rainfall route rejects poor daily coverage instead of reporting incomplete monthly totals", async () => {
  const originalFetch = globalThis.fetch;
  const partialDailyValues = {
    "20010101": 2.5,
    "20010102": 0,
    "20010103": -999,
  };
  globalThis.fetch = async () => new Response(JSON.stringify({
    parameters: { PRECTOTCORR: { units: "mm/day", fill_value: -999 } },
    properties: { parameter: { PRECTOTCORR: partialDailyValues } },
    geometry: { coordinates: [35.6, -7.8] },
  }), { status: 200, headers: { "Content-Type": "application/json" } });

  try {
    const response = await GET(
      new Request("https://yaju-tools.test/api/climate/rainfall?latitude=-7.8&longitude=35.6")
    );
    const body = await response.json() as { error: string; missingMonths: unknown[] };
    assert.equal(response.status, 502);
    assert.match(body.error, /incomplete daily rainfall coverage/);
    assert.equal(body.missingMonths.length, 12);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
