import assert from "node:assert/strict";
import test from "node:test";
import { analyseUploadedRainfall, parseRainfallRows } from "../../features/hydrology/domain/rainfall-upload";

test("parses ISO and day-first dates, rejects duplicate dates and negative rainfall", () => {
  const parsed = parseRainfallRows([
    ["Date", "Rainfall"],
    ["01/01/2001", 0],
    ["2001-01-02", 2.5],
    ["01/01/2001", 1],
    ["03/01/2001", -1],
  ], 0, 1);
  assert.equal(parsed.records.length, 2);
  assert.equal(parsed.records[0].date, "2001-01-01");
  assert.equal(parsed.duplicateDates.length, 1);
  assert.equal(parsed.errors.length, 2);
});

test("analyses complete annual daily rainfall and computes a dry-period statistic", () => {
  const records: Array<{ date: string; rainfallMm: number }> = [];
  for (let time = Date.UTC(2001, 0, 1); time < Date.UTC(2002, 0, 1); time += 86_400_000) {
    records.push({ date: new Date(time).toISOString().slice(0, 10), rainfallMm: 5 });
  }
  const result = analyseUploadedRainfall(records);
  assert.equal(result.startYear, 2001);
  assert.equal(result.endYear, 2001);
  assert.equal(result.validAnnualTotals, 1);
  assert.equal(result.annualRainfallMm, 365 * 5);
  assert.equal(result.monthlyRainfall.length, 12);
  assert.equal(result.dryPeriod.status, "ready");
  assert.equal(result.dryPeriod.valueDays, 0);
});

test("does not calculate annual rainfall from a year with less than 90 percent coverage", () => {
  const records: Array<{ date: string; rainfallMm: number }> = [];
  for (let time = Date.UTC(2001, 0, 1); time < Date.UTC(2001, 2, 1); time += 86_400_000) {
    records.push({ date: new Date(time).toISOString().slice(0, 10), rainfallMm: 1 });
  }
  assert.throws(() => analyseUploadedRainfall(records), /90% daily rainfall coverage/);
});
