import { calculateDesignDryPeriod, type DesignDryPeriodResult } from "./dry-period";

export type DailyRainfallRecord = { date: string; rainfallMm: number };
export type UploadedRainfallAnalysis = {
  startYear: number;
  endYear: number;
  annualRainfallMm: number;
  monthlyRainfall: Array<{ month: string; monthNumber: number; rainfallMm: number | null; sampleYears: number }>;
  dryPeriod: DesignDryPeriodResult;
  records: DailyRainfallRecord[];
  validAnnualTotals: number;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_MS = 86_400_000;

function parseDate(value: unknown): string | null {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(Date.UTC(1899, 11, 30) + Math.round(value) * DAY_MS);
    return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : null;
  }
  if (typeof value !== "string" || !value.trim()) return null;
  const raw = value.trim();
  let match = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (match) {
    const [, y, m, d] = match;
    const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
    return date.getUTCFullYear() === Number(y) && date.getUTCMonth() + 1 === Number(m) && date.getUTCDate() === Number(d)
      ? date.toISOString().slice(0, 10) : null;
  }
  // Local hydrology datasets commonly use DD/MM/YYYY or DD-MM-YYYY.
  match = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (match) {
    const [, d, m, y] = match;
    const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
    return date.getUTCFullYear() === Number(y) && date.getUTCMonth() + 1 === Number(m) && date.getUTCDate() === Number(d)
      ? date.toISOString().slice(0, 10) : null;
  }
  return null;
}

export function parseRainfallRows(
  rows: unknown[][],
  dateColumn: number,
  rainfallColumn: number
): { records: DailyRainfallRecord[]; errors: string[]; duplicateDates: string[] } {
  const records: DailyRainfallRecord[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  const duplicateDates: string[] = [];
  rows.slice(1).forEach((row, index) => {
    const date = parseDate(row[dateColumn]);
    const rawRainfall = row[rainfallColumn];
    if ((rawRainfall === null || rawRainfall === undefined || rawRainfall === "") && !date) return;
    if (!date) {
      errors.push(`Row ${index + 2}: invalid or missing date.`);
      return;
    }
    if (seen.has(date)) {
      duplicateDates.push(date);
      errors.push(`Row ${index + 2}: duplicate date ${date}.`);
      return;
    }
    seen.add(date);
    const rainfallMm = typeof rawRainfall === "number" ? rawRainfall : Number(String(rawRainfall ?? "").trim());
    if (rawRainfall === null || rawRainfall === undefined || String(rawRainfall).trim() === "" || !Number.isFinite(rainfallMm) || rainfallMm < 0) {
      errors.push(`Row ${index + 2}: rainfall must be a non-negative number in mm/day.`);
      return;
    }
    records.push({ date, rainfallMm });
  });
  records.sort((a, b) => a.date.localeCompare(b.date));
  return { records, errors, duplicateDates };
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function analyseUploadedRainfall(records: DailyRainfallRecord[]): UploadedRainfallAnalysis {
  if (records.length < 2) throw new Error("Upload at least two valid daily rainfall records.");
  const ordered = [...records].sort((a, b) => a.date.localeCompare(b.date));
  const startYear = Number(ordered[0].date.slice(0, 4));
  const endYear = Number(ordered[ordered.length - 1].date.slice(0, 4));
  const dailyValues: Record<string, number> = {};
  const annual = new Map<number, { total: number; valid: number }>();
  const monthly = new Map<string, { total: number; valid: number }>();
  for (let year = startYear; year <= endYear; year++) annual.set(year, { total: 0, valid: 0 });
  for (const record of ordered) {
    const [year, month, day] = record.date.split("-").map(Number);
    const key = `${year}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}`;
    dailyValues[key] = record.rainfallMm;
    const yearStats = annual.get(year)!;
    yearStats.total += record.rainfallMm;
    yearStats.valid += 1;
    const monthKey = `${year}-${month}`;
    const monthStats = monthly.get(monthKey) ?? { total: 0, valid: 0 };
    monthStats.total += record.rainfallMm;
    monthStats.valid += 1;
    monthly.set(monthKey, monthStats);
  }
  const validAnnualTotals = [...annual.entries()]
    .filter(([year, item]) => item.valid / ((Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / DAY_MS) >= 0.9);
  if (!validAnnualTotals.length) {
    throw new Error("No calendar year has at least 90% daily rainfall coverage. Check the date range and missing records.");
  }
  const annualRainfallMm = validAnnualTotals.reduce((sum, [, item]) => sum + item.total, 0) / validAnnualTotals.length;
  const monthlyRainfall = MONTHS.map((monthName, index) => {
    const monthNumber = index + 1;
    const values: number[] = [];
    for (let year = startYear; year <= endYear; year++) {
      const item = monthly.get(`${year}-${monthNumber}`);
      if (item && item.valid >= Math.ceil(daysInMonth(year, monthNumber) * 0.9)) values.push(item.total);
    }
    return {
      month: monthName,
      monthNumber,
      rainfallMm: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null,
      sampleYears: values.length,
    };
  });
  const dryPeriod = calculateDesignDryPeriod(dailyValues, {
    startYear, endYear, thresholdMmPerDay: 1,
    minimumAnnualCoverageFraction: 0.9,
    minimumValidYearFraction: 0.8,
    percentile: 90,
  });
  return {
    startYear, endYear, annualRainfallMm,
    monthlyRainfall, dryPeriod, records: ordered,
    validAnnualTotals: validAnnualTotals.length,
  };
}
