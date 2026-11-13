import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "../../app/api/climate/rainfall/route";

test("rainfall route requests monthly corrected precipitation and returns a complete estimate", async () => {
  const originalFetch = globalThis.fetch;
  const requestedUrls: URL[] = [];
  const monthlyValues: Record<string, number> = {};
  for (let month = 1; month <= 12; month += 1) {
    monthlyValues[`2001${String(month).padStart(2, "0")}`] = month;
  }

  globalThis.fetch = async (input) => {
    requestedUrls.push(new URL(String(input)));
    return new Response(JSON.stringify({
      parameters: { PRECTOTCORR: { units: "mm/day", longname: "Corrected precipitation" } },
      properties: { parameter: { PRECTOTCORR: monthlyValues } },
      geometry: { coordinates: [35.666, -7.817, 1721.47] },
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  try {
    const response = await GET(
      new Request("https://yaju-tools.test/api/climate/rainfall?latitude=-7.81713&longitude=35.66582")
    );
    const body = await response.json() as {
      annualRainfallMm: number;
      monthlyRainfall: Array<{ monthNumber: number; rainfallMm: number }>;
    };

    assert.equal(response.status, 200);
    assert.equal(requestedUrls[0]?.searchParams.get("parameters"), "PRECTOTCORR");
    assert.equal(requestedUrls[0]?.searchParams.get("community"), "AG");
    assert.equal(body.monthlyRainfall.length, 12);
    assert.equal(body.annualRainfallMm, 2382);
    assert.equal(body.monthlyRainfall[1].rainfallMm, 56);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rainfall route rejects invalid coordinates before calling NASA POWER", async () => {
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
