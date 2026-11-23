"use client";

import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { analyseUploadedRainfall, parseRainfallRows, type UploadedRainfallAnalysis } from "@/features/hydrology/domain/rainfall-upload";

type Props = { onApply: (analysis: UploadedRainfallAnalysis, fileName: string) => void };

export default function RainfallUploadPanel({ onApply }: Props) {
  const [rows, setRows] = useState<unknown[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [dateColumn, setDateColumn] = useState("0");
  const [rainfallColumn, setRainfallColumn] = useState("1");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<{ records: ReturnType<typeof parseRainfallRows>["records"]; errors: string[] } | null>(null);
  const [analysis, setAnalysis] = useState<UploadedRainfallAnalysis | null>(null);

  const maxMonthly = useMemo(() => Math.max(1, ...(analysis?.monthlyRainfall.map((item) => item.rainfallMm ?? 0) ?? [])), [analysis]);

  async function handleFile(file?: File) {
    if (!file) return;
    setError(""); setAnalysis(null); setPreview(null);
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
      setError("Choose an Excel (.xlsx/.xls) or CSV file."); return;
    }
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: null });
      if (data.length < 2 || !Array.isArray(data[0])) throw new Error("The first worksheet must contain a header row and daily rainfall records.");
      const names = data[0].map((value, index) => String(value ?? `Column ${index + 1}`));
      setRows(data); setHeaders(names); setFileName(file.name);
      const dateGuess = names.findIndex((name) => /date|day|time/i.test(name));
      const rainGuess = names.findIndex((name) => /rain|precip|ppt/i.test(name));
      setDateColumn(String(dateGuess >= 0 ? dateGuess : 0));
      setRainfallColumn(String(rainGuess >= 0 ? rainGuess : (names.length > 1 ? 1 : 0)));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not read this rainfall file.");
    }
  }

  function validateAndApply() {
    try {
      const parsed = parseRainfallRows(rows, Number(dateColumn), Number(rainfallColumn));
      setPreview({ records: parsed.records, errors: parsed.errors });
      if (parsed.errors.length) {
        setError(`Found ${parsed.errors.length} invalid or duplicate row(s). Correct the source file before applying it.`);
        setAnalysis(null); return;
      }
      const result = analyseUploadedRainfall(parsed.records);
      setAnalysis(result); setError("");
      onApply(result, fileName);
    } catch (cause) {
      setAnalysis(null);
      setError(cause instanceof Error ? cause.message : "Rainfall analysis failed.");
    }
  }

  return (
    <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4" aria-label="Upload rainfall dataset">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Upload daily rainfall data</h3>
          <p className="mt-1 text-xs text-slate-600">Use .xlsx, .xls or .csv with one date column and one daily rainfall column in mm/day.</p>
        </div>
        <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">EXCEL / CSV</span>
      </div>
      <input type="file" accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" onChange={(event) => void handleFile(event.target.files?.[0])} className="mt-3 block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-700 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-blue-800" />
      {headers.length > 0 && (
        <>
          <p className="mt-2 text-xs font-medium text-slate-700">File: {fileName} · {Math.max(0, rows.length - 1)} data rows</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-700">Date column
              <select value={dateColumn} onChange={(event) => setDateColumn(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm">
                {headers.map((header, index) => <option key={index} value={index}>{header}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-700">Rainfall column (mm/day)
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
            <p className="mb-2 text-xs font-bold text-slate-800">Mean monthly rainfall (mm)</p>
            <div className="grid grid-cols-6 items-end gap-2 sm:grid-cols-12">
              {analysis.monthlyRainfall.map((item) => <div key={item.monthNumber} className="min-w-0 text-center"><div className="flex h-24 items-end justify-center rounded bg-slate-50"><div title={item.rainfallMm === null ? "Insufficient coverage" : `${item.rainfallMm.toFixed(1)} mm`} className="w-full rounded-t bg-blue-600" style={{ height: item.rainfallMm === null ? "0%" : `${Math.max(3, item.rainfallMm / maxMonthly * 100)}%` }} /></div><span className="mt-1 block text-[10px] text-slate-500">{item.month}</span></div>)}
            </div>
          </div>
          <p className="text-[11px] leading-5 text-slate-500">Daily rainfall below 1 mm/day is classified as dry. Annual CDD requires at least 90% daily coverage; at least 80% of years in the uploaded period must be valid for the 90th-percentile estimate. Missing days are not treated as dry.</p>
          {analysis.dryPeriod.status === "ready" ? <p className="text-xs font-semibold text-emerald-700">Uploaded dataset applied. Design dry period: {analysis.dryPeriod.valueDays} days (nearest-rank 90th percentile).</p> : <p className="text-xs text-amber-800">{analysis.dryPeriod.message}</p>}
        </div>
      )}
    </section>
  );
}
