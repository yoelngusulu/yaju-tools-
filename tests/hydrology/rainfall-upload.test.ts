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


test("parses TMA YEAR, MONTH and DAY columns with a selected station rainfall column", () => {
  const parsed = parseRainfallRows([
    ["YEAR", "MONTH", "DAY", "Nduta_1", "Nduta_2"],
    [2001, 1, 1, 0, 0],
    [2001, 1, 2, 15.5, 9.4],
    [2001, 1, 3, 3.4, 2.6],
  ], { yearColumn: 0, monthColumn: 1, dayColumn: 2 }, 3);
  assert.equal(parsed.errors.length, 0);
  assert.deepEqual(parsed.records.map((record) => record.date), ["2001-01-01", "2001-01-02", "2001-01-03"]);
  assert.deepEqual(parsed.records.map((record) => record.rainfallMm), [0, 15.5, 3.4]);
});

test("rejects invalid calendar dates in split TMA date columns", () => {
  const parsed = parseRainfallRows([
    ["YEAR", "MONTH", "DAY", "Nduta_1"],
    [2001, 2, 29, 4],
  ], { yearColumn: 0, monthColumn: 1, dayColumn: 2 }, 3);
  assert.equal(parsed.records.length, 0);
  assert.match(parsed.errors[0], /invalid or missing date/);
});
