"use client";

import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { analyseUploadedRainfall, parseRainfallRows, type UploadedRainfallAnalysis } from "@/features/hydrology/domain/rainfall-upload";

type Props = { onApply: (analysis: UploadedRainfallAnalysis, fileName: string) => void };

function downloadChartPng(fileName: string, svgMarkup: string, width: number, height: number) {
  const svgBlob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
  const objectUrl = URL.createObjectURL(svgBlob);
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      URL.revokeObjectURL(objectUrl);
      return;
    }
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    URL.revokeObjectURL(objectUrl);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const pngUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = pngUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(pngUrl);
    }, "image/png");
  };
  image.onerror = () => URL.revokeObjectURL(objectUrl);
  image.src = objectUrl;
}

type RainfallChartPoint = { label: string; rainfallMm: number; sampleYears?: number };

function getRainfallAxisScale(maxValue: number) {
  const raw = Math.max(1, maxValue);
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
  const fraction = raw / magnitude;
  const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  const axisMax = niceFraction * magnitude;
  const step = axisMax / 5;
  return { axisMax, ticks: Array.from({ length: 6 }, (_, index) => Number((step * index).toFixed(6))) };
}

function buildRainfallChartSvg(data: RainfallChartPoint[], title: string, unit: string, width: number, height: number) {
  const left = 82, right = 24, top = 54, bottom = 64;
  const plotWidth = width - left - right, plotHeight = height - top - bottom;
  const { axisMax, ticks } = getRainfallAxisScale(Math.max(0, ...data.map((item) => item.rainfallMm)));
  const slot = plotWidth / Math.max(1, data.length);
  const grid = ticks.map((tick) => {
    const y = top + plotHeight - (tick / axisMax) * plotHeight;
    return `<line x1="${left}" y1="${y}" x2="${width-right}" y2="${y}" stroke="#e2e8f0"/><text x="${left-12}" y="${y+4}" text-anchor="end" font-size="12" fill="#475569">${Number.isInteger(tick) ? tick : tick.toFixed(1)}</text>`;
  }).join("");
  const bars = data.map((item, index) => {
    const barHeight = item.rainfallMm / axisMax * plotHeight;
    const x = left + index * slot + slot * 0.16;
    const y = top + plotHeight - barHeight;
    const barWidth = Math.max(1, slot * 0.68);
    return `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="#2563eb"><title>${item.label}: ${item.rainfallMm.toFixed(1)} ${unit}</title></rect><text x="${x + barWidth/2}" y="${height-30}" text-anchor="middle" font-size="${data.length > 20 ? 9 : 12}" fill="#334155">${item.label}</text>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="white"/><text x="${left}" y="26" font-size="17" font-weight="bold" fill="#0f172a">${title}</text>${grid}<line x1="${left}" y1="${top+plotHeight}" x2="${width-right}" y2="${top+plotHeight}" stroke="#64748b"/>${bars}<text x="22" y="${top+plotHeight/2}" transform="rotate(-90 22 ${top+plotHeight/2})" text-anchor="middle" font-size="13" fill="#334155">Rainfall (${unit})</text></svg>`;
}

export default function RainfallUploadPanel({ onApply }: Props) {
  const [rows, setRows] = useState<unknown[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [dateMode, setDateMode] = useState<"single" | "components">("single");
  const [dateColumn, setDateColumn] = useState("0");
  const [yearColumn, setYearColumn] = useState("0");
  const [monthColumn, setMonthColumn] = useState("1");
  const [dayColumn, setDayColumn] = useState("2");
  const [rainfallColumn, setRainfallColumn] = useState("");
  const [chartPeriod, setChartPeriod] = useState<"monthly" | "yearly">("monthly");
  const [selectedYear, setSelectedYear] = useState("");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<{ records: ReturnType<typeof parseRainfallRows>["records"]; errors: string[] } | null>(null);
  const [analysis, setAnalysis] = useState<UploadedRainfallAnalysis | null>(null);

  const annualChartData = useMemo(() => {
    if (!analysis) return [];
    const totals = new Map<number, number>();
    for (const record of analysis.records) {
      const year = Number(record.date.slice(0, 4));
      totals.set(year, (totals.get(year) ?? 0) + record.rainfallMm);
    }
    return [...totals.entries()].sort((a, b) => a[0] - b[0]).map(([year, rainfallMm]) => ({ label: String(year), rainfallMm }));
  }, [analysis]);
  const monthlyChartData = useMemo(() => {
    if (!analysis) return [];
    return analysis.monthlyRainfall.map((item) => ({
      label: item.month,
      rainfallMm: item.rainfallMm ?? 0,
      sampleYears: item.sampleYears,
    }));
  }, [analysis]);
  const activeChartData = chartPeriod === "yearly" ? annualChartData : monthlyChartData;
  const chartScale = getRainfallAxisScale(Math.max(0, ...activeChartData.map((item) => item.rainfallMm)));
  const chartMax = chartScale.axisMax;
  const chartTitle = chartPeriod === "monthly"
    ? `Mean monthly rainfall - ${analysis?.startYear} to ${analysis?.endYear}`
    : "Annual rainfall totals";
  const dailyChart = useMemo(() => {
    if (!analysis) return { path: "", max: 1, thresholdY: 190 };
    const max = Math.max(1, ...analysis.records.map((item) => item.rainfallMm));
    const path = analysis.records.map((item, index) => {
      const x = analysis.records.length < 2 ? 0 : (index / (analysis.records.length - 1)) * 1000;
      const y = 190 - (item.rainfallMm / max) * 170;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(" ");
    return { path, max, thresholdY: 190 - (1 / max) * 170 };
  }, [analysis]);

  async function handleFile(file?: File) {
    if (!file) return;
    setError(""); setAnalysis(null); setPreview(null);
    if (file.size > 10 * 1024 * 1024) {
      setError("The uploaded rainfall file must be 10 MB or smaller. Split larger datasets into separate files.");
      return;
    }
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
      setError("Choose an Excel (.xlsx/.xls) or CSV file."); return;
    }
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: null });
      if (data.length < 2 || !Array.isArray(data[0])) throw new Error("The first worksheet must contain a header row and daily rainfall records.");
      if (data.length - 1 > 50_000) {
        throw new Error("The uploaded dataset exceeds the 50,000 daily-record limit. Split the dataset into smaller date ranges.");
      }
      const names = data[0].map((value, index) => String(value ?? `Column ${index + 1}`));
      setRows(data); setHeaders(names); setFileName(file.name);
      const yearGuess = names.findIndex((name) => /^year$/i.test(name.trim()));
      const monthGuess = names.findIndex((name) => /^month$/i.test(name.trim()));
      const dayGuess = names.findIndex((name) => /^day$/i.test(name.trim()));
      const dateGuess = names.findIndex((name) => /^(date|datetime|timestamp)$/i.test(name.trim()));
      const rainGuess = names.findIndex((name) => /rain|precip|ppt|nduta|station|gauge/i.test(name));
      const hasDateParts = yearGuess >= 0 && monthGuess >= 0 && dayGuess >= 0;
      setDateMode(hasDateParts ? "components" : "single");
      setYearColumn(String(yearGuess >= 0 ? yearGuess : 0));
      setMonthColumn(String(monthGuess >= 0 ? monthGuess : 1));
      setDayColumn(String(dayGuess >= 0 ? dayGuess : 2));
      setDateColumn(String(dateGuess >= 0 ? dateGuess : 0));
      const fallbackRain = names.findIndex((_, index) => ![yearGuess, monthGuess, dayGuess, dateGuess].includes(index));
      setRainfallColumn(String(rainGuess >= 0 ? rainGuess : fallbackRain >= 0 ? fallbackRain : ""));
      setSelectedYear(""); setChartPeriod("monthly");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not read this rainfall file.");
    }
  }

  async function validateAndApply() {
    let reservationId: number | null = null;
    try {
      const dateColumns = dateMode === "components"
        ? { yearColumn: Number(yearColumn), monthColumn: Number(monthColumn), dayColumn: Number(dayColumn) }
        : Number(dateColumn);
      if (rainfallColumn === "" || !Number.isInteger(Number(rainfallColumn)) || Number(rainfallColumn) < 0) {
        throw new Error("No rainfall station column was detected. Upload the complete TMA file containing daily rainfall values (mm/day), or select the station rainfall column.");
      }

      const parsed = parseRainfallRows(rows, dateColumns, Number(rainfallColumn));
      setPreview({ records: parsed.records, errors: parsed.errors });
      if (parsed.errors.length) {
        setError(`Found ${parsed.errors.length} invalid or duplicate row(s). Correct the source file before applying it.`);
        setAnalysis(null);
        return;
      }

      if (parsed.records.length < 2) {
        throw new Error("Upload at least two valid daily rainfall records for bulk analysis.");
      }

      const quotaResponse = await fetch("/api/tools/water-storage-csv-usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reserve" }),
      });
      const quotaPayload = await quotaResponse.json().catch(() => ({}));
      if (!quotaResponse.ok) {
        throw new Error(quotaPayload.error || "Rainfall CSV usage could not be verified.");
      }
      reservationId = Number.isSafeInteger(quotaPayload.reservationId)
        ? quotaPayload.reservationId
        : null;

      const result = analyseUploadedRainfall(parsed.records);
      setAnalysis(result);
      setSelectedYear(String(result.endYear));
      setError("");
      onApply(result, fileName);
    } catch (cause) {
      if (reservationId !== null) {
        await fetch("/api/tools/water-storage-csv-usage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "release", reservationId }),
        }).catch(() => undefined);
      }
      setAnalysis(null);
      setError(cause instanceof Error ? cause.message : "Rainfall analysis failed.");
    }
  }

  return (
    <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4" aria-label="Upload rainfall dataset">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Upload daily rainfall data</h3>
          <p className="mt-1 text-xs text-slate-600">Use .xlsx, .xls or .csv. Supports a Date column or TMA YEAR, MONTH, DAY columns plus station rainfall columns in mm/day. Maximum file size: 10 MB; maximum 50,000 daily records.</p>
        </div>
        <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">EXCEL / CSV</span>
      </div>
      <input type="file" accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" onChange={(event) => void handleFile(event.target.files?.[0])} className="mt-3 block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-700 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-blue-800" />
      {headers.length > 0 && (
        <>
          <p className="mt-2 text-xs font-medium text-slate-700">File: {fileName} · {Math.max(0, rows.length - 1)} data rows</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-700">Date format
              <select value={dateMode} onChange={(event) => setDateMode(event.target.value as "single" | "components")} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm">
                <option value="single">Single Date column</option><option value="components">TMA YEAR / MONTH / DAY</option>
              </select>
            </label>
            {dateMode === "single" ? (
              <label className="text-xs font-semibold text-slate-700">Date column
                <select value={dateColumn} onChange={(event) => setDateColumn(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm">
                  {headers.map((header, index) => <option key={index} value={index}>{header}</option>)}
                </select>
              </label>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {([{label:"YEAR",value:yearColumn,set:setYearColumn},{label:"MONTH",value:monthColumn,set:setMonthColumn},{label:"DAY",value:dayColumn,set:setDayColumn}] as const).map((item) => (
                  <label key={item.label} className="text-xs font-semibold text-slate-700">{item.label}
                    <select value={item.value} onChange={(event) => item.set(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm">
                      {headers.map((header, index) => <option key={index} value={index}>{header}</option>)}
                    </select>
                  </label>
                ))}
              </div>
            )}
            <label className="text-xs font-semibold text-slate-700">Rainfall station column (mm/day)
              <select value={rainfallColumn} onChange={(event) => setRainfallColumn(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm">
                {headers.map((header, index) => <option key={index} value={index}>{header}</option>)}
              </select>
            </label>
          </div>
          <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50"><tr>{headers.map((header, index) => <th key={index} className="px-2 py-2 font-semibold text-slate-600">{header}</th>)}</tr></thead>
              <tbody>{rows.slice(1, 7).map((row, index) => <tr key={index} className="border-t border-slate-100">{headers.map((_, col) => <td key={col} className="px-2 py-2 text-slate-700">{String(row[col] ?? "—")}</td>)}</tr>)}</tbody>
            </table>
          </div>
          <button type="button" onClick={validateAndApply} className="mt-3 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800">Validate and use uploaded data</button>
        </>
      )}
      {error && <p role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{error}</p>}
      {preview?.errors.length ? <ul className="mt-2 max-h-28 list-disc overflow-auto pl-5 text-[11px] text-rose-700">{preview.errors.slice(0, 10).map((item, index) => <li key={index}>{item}</li>)}</ul> : null}
      {analysis && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-lg bg-slate-50 p-2"><p className="text-[10px] text-slate-500">Record period</p><strong className="text-sm">{analysis.startYear}–{analysis.endYear}</strong></div>
            <div className="rounded-lg bg-slate-50 p-2"><p className="text-[10px] text-slate-500">Valid years</p><strong className="text-sm">{analysis.validAnnualTotals}</strong></div>
            <div className="rounded-lg bg-slate-50 p-2"><p className="text-[10px] text-slate-500">Mean annual rainfall</p><strong className="text-sm">{analysis.annualRainfallMm.toFixed(1)} mm</strong></div>
            <div className="rounded-lg bg-slate-50 p-2"><p className="text-[10px] text-slate-500">Design dry period</p><strong className="text-sm">{analysis.dryPeriod.valueDays === null ? "Unavailable" : `${analysis.dryPeriod.valueDays} days`}</strong></div>
          </div>
          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-bold text-slate-800">Rainfall aggregation and graph</p>
              <div className="flex items-center gap-2">
                <select aria-label="Rainfall graph period" value={chartPeriod} onChange={(event) => setChartPeriod(event.target.value as "monthly" | "yearly")} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700">
                  <option value="monthly">Monthly</option><option value="yearly">Yearly</option>
                </select>
                {chartPeriod === "monthly" && <span className="text-[10px] text-slate-500">Long-term monthly mean</span>}
              </div>
            </div>
            <p className="mb-2 text-[10px] text-slate-500">{chartPeriod === "monthly" ? `Mean monthly rainfall, ${analysis.startYear}–${analysis.endYear} (mm/month; average of valid monthly totals across years)` : "Annual rainfall totals (mm/year)"}</p>
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-2">
              <svg viewBox={`0 0 ${chartPeriod === "yearly" ? Math.max(900, activeChartData.length * 48) : 1000} 440`} role="img" aria-label={`${chartTitle}, rainfall in millimetres`} className="h-64 min-w-[620px] w-full">
                {(() => {
                  const width = chartPeriod === "yearly" ? Math.max(900, activeChartData.length * 48) : 1000;
                  const height = 440, left = 82, right = 24, top = 54, bottom = 64;
                  const plotWidth = width - left - right, plotHeight = height - top - bottom;
                  const slot = plotWidth / Math.max(1, activeChartData.length);
                  return (
                    <>
                      {chartScale.ticks.map((tick) => {
                        const y = top + plotHeight - (tick / chartMax) * plotHeight;
                        return <g key={tick}><line x1={left} y1={y} x2={width-right} y2={y} stroke="#e2e8f0"/><text x={left-12} y={y+4} textAnchor="end" fontSize="12" fill="#475569">{Number.isInteger(tick) ? tick : tick.toFixed(1)}</text></g>;
                      })}
                      <line x1={left} y1={top+plotHeight} x2={width-right} y2={top+plotHeight} stroke="#64748b"/>
                      {activeChartData.map((item,index) => {
                        const barHeight = item.rainfallMm / chartMax * plotHeight;
                        const x = left + index * slot + slot * 0.16;
                        const y = top + plotHeight - barHeight;
                        const barWidth = Math.max(1, slot * 0.68);
                        return <g key={item.label}><rect x={x} y={y} width={barWidth} height={barHeight} fill="#2563eb"><title>{item.label}: {item.rainfallMm.toFixed(1)} mm</title></rect><text x={x+barWidth/2} y={height-30} textAnchor="middle" fontSize={activeChartData.length>20?9:12} fill="#334155">{item.label}</text></g>;
                      })}
                      <text x="22" y={top+plotHeight/2} transform={`rotate(-90 22 ${top+plotHeight/2})`} textAnchor="middle" fontSize="13" fill="#334155">Rainfall (mm{chartPeriod === "monthly" ? "/month" : "/year"})</text>
                    </>
                  );
                })()}
              </svg>
            </div>
            <button type="button" onClick={() => {
              const width = chartPeriod === "yearly" ? Math.max(1400, activeChartData.length * 56) : 1400;
              const height = 620;
              const title = chartPeriod === "monthly"
                ? `Mean monthly rainfall - ${analysis.startYear} to ${analysis.endYear} (mm/month)`
                : "Annual rainfall totals (mm/year)";
              const svg = buildRainfallChartSvg(activeChartData, title, chartPeriod === "monthly" ? "mm/month" : "mm/year", width, height);
              downloadChartPng(chartPeriod === "monthly" ? "mean-monthly-rainfall-climatology.png" : "annual-rainfall-totals.png", svg, width, height);
            }} className="mt-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50">Download {chartPeriod} graph (PNG)</button>
          </div>
          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-bold text-slate-800">Daily rainfall time series (mm/day)</p>
              <span className="text-[10px] text-slate-500">{analysis.records.length.toLocaleString()} observations · red dashed line = 1 mm/day dry threshold</span>
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-2">
              <svg viewBox="0 0 1000 210" role="img" aria-label="Daily rainfall time series with 1 millimetre per day dry threshold" className="h-44 min-w-[620px] w-full">
                <line x1="0" y1={dailyChart.thresholdY} x2="1000" y2={dailyChart.thresholdY} stroke="#dc2626" strokeDasharray="7 5" strokeWidth="2" />
                <line x1="0" y1="190" x2="1000" y2="190" stroke="#94a3b8" />
                <path d={dailyChart.path} fill="none" stroke="#2563eb" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
                <text x="6" y="14" fontSize="11" fill="#475569">{dailyChart.max.toFixed(1)} mm/day</text>
                <text x="6" y="205" fontSize="11" fill="#475569">{analysis.records[0]?.date}</text>
                <text x="994" y="205" textAnchor="end" fontSize="11" fill="#475569">{analysis.records.at(-1)?.date}</text>
              </svg>
              <button type="button" onClick={() => {
                const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="420" viewBox="0 0 1000 210"><rect width="100%" height="100%" fill="white"/><line x1="0" y1="${dailyChart.thresholdY}" x2="1000" y2="${dailyChart.thresholdY}" stroke="#dc2626" stroke-dasharray="7 5" stroke-width="2"/><line x1="0" y1="190" x2="1000" y2="190" stroke="#94a3b8"/><path d="${dailyChart.path}" fill="none" stroke="#2563eb" stroke-width="1.4"/><text x="6" y="14" font-size="11" fill="#475569">${dailyChart.max.toFixed(1)} mm/day</text><text x="6" y="205" font-size="11" fill="#475569">${analysis.records[0]?.date ?? ""}</text><text x="994" y="205" text-anchor="end" font-size="11" fill="#475569">${analysis.records.at(-1)?.date ?? ""}</text></svg>`;
                downloadChartPng("daily-rainfall-time-series.png", svg, 2000, 420);
              }} className="mt-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50">Download daily graph (PNG)</button>
            </div>
          </div>
          <p className="text-[11px] leading-5 text-slate-500">Daily rainfall below 1 mm/day is classified as dry. Annual CDD requires at least 90% daily coverage; at least 80% of years in the uploaded period must be valid for the 90th-percentile estimate. Missing days are not treated as dry. Spells crossing year boundaries follow the existing CDD convention; boundary- or gap-censored spells are excluded from valid annual maxima.</p>
          {analysis.dryPeriod.status === "ready" ? <p className="text-xs font-semibold text-emerald-700">Uploaded dataset applied. Design dry period: {analysis.dryPeriod.valueDays} days (nearest-rank 90th percentile).</p> : <p className="text-xs text-amber-800">{analysis.dryPeriod.message}</p>}
        </div>
      )}
    </section>
  );
}
