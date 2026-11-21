"use client";

import Link from "next/link";
import { AlertTriangle, ArrowLeft, CheckCircle2, Download, FileSpreadsheet, Info, Plus, Printer, RotateCcw, Scale, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import styles from "./AHPWorkbench.module.css";
import {
  buildPairwiseMatrix, calculateAHPWeights, hasCompleteJudgments,
  MAX_CRITERIA, MIN_CRITERIA, pairKey,
  type AHPResult, type PairwiseJudgments, type PreferenceDirection,
} from "@/lib/gis/ahp";

const INITIAL_CRITERIA = ["Criterion 1", "Criterion 2", "Criterion 3", "Criterion 4"];
const SAATY_OPTIONS = Array.from({ length: 8 }, (_, index) => index + 2);
const displayName = (name: string, index: number) => name.trim() || "Criterion " + String(index + 1);
const numberText = (value: number, digits = 4) => value.toFixed(digits);
const percentage = (value: number) => (value * 100).toFixed(2) + "%";
function matrixText(value: number | null) {
  if (value === null) return "—";
  if (Math.abs(value - 1) < 1e-10) return "1";
  if (value > 1) return Number.isInteger(value) ? String(value) : value.toFixed(3);
  const denominator = 1 / value;
  return Math.abs(denominator - Math.round(denominator)) < 1e-8 ? "1/" + String(Math.round(denominator)) : value.toFixed(3);
}
const fileBase = (name: string) => name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "yaju-ahp-analysis";
function downloadText(text: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url; link.download = name; document.body.appendChild(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const csvCell = (value: unknown) => '"' + String(value ?? "").replace(/"/g, '""') + '"';

function exportCsv(result: AHPResult, criteria: string[], title: string) {
  const ranked = result.weights.map((weight, index) => ({ weight, criterion: criteria[index] })).sort((a, b) => b.weight - a.weight);
  const rows = [
    ["Project", title], ["Method", "AHP principal right eigenvector"],
    ["Consistency Ratio", result.consistencyRatio],
    ["Consistency assessment", result.consistencyAccepted ? "Acceptable" : "Review judgments"], [],
    ["Rank", "Criterion", "Weight", "Weight (%)"],
    ...ranked.map((item, index) => [index + 1, item.criterion, item.weight, item.weight * 100]),
  ];
  downloadText("\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n"), fileBase(title) + "-ahp-weights.csv", "text/csv;charset=utf-8");
}

function exportWorkbook(result: AHPResult, criteria: string[], matrix: number[][], title: string, objective: string) {
  const workbook = XLSX.utils.book_new();
  const ranked = result.weights.map((weight, index) => ({ weight, criterion: criteria[index] }))
    .sort((a, b) => b.weight - a.weight)
    .map((item, index) => ({ Rank: index + 1, Criterion: item.criterion, Weight: item.weight, "Weight (%)": item.weight * 100 }));
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(ranked), "Criteria Weights");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["Criterion", ...criteria], ...matrix.map((row, index) => [criteria[index], ...row])]), "Pairwise Matrix");
  const summary = [
    ["YAJU AHP Analysis Summary", ""], ["Project", title], ["Decision objective", objective],
    ["Criteria count", criteria.length], ["Priority method", "Principal right eigenvector (power iteration)"],
    ["Maximum eigenvalue (lambda max)", result.lambdaMax], ["Consistency Index (CI)", result.consistencyIndex],
    ["Random Index (RI)", result.randomIndex], ["Consistency Ratio (CR)", result.consistencyRatio],
    ["Consistency Ratio (%)", result.consistencyRatio * 100],
    ["Consistency assessment", result.consistencyAccepted ? "Acceptable (CR <= 0.10)" : "Review pairwise judgments (CR > 0.10)"],
    ["Power iterations", result.iterations], ["RI reference", "Saaty (1980), matrix orders 1-15"],
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(summary), "AHP Summary");
  XLSX.writeFile(workbook, fileBase(title) + "-ahp-analysis.xlsx");
}

type Pair = { row: number; column: number };

export default function AHPWorkbench() {
  const [projectName, setProjectName] = useState("New GIS AHP Analysis");
  const [objective, setObjective] = useState("");
  const [criteria, setCriteria] = useState<string[]>(INITIAL_CRITERIA);
  const [judgments, setJudgments] = useState<PairwiseJudgments>({});

  const pairs = useMemo<Pair[]>(() => {
    const output: Pair[] = [];
    for (let row = 0; row < criteria.length; row += 1) for (let column = row + 1; column < criteria.length; column += 1) output.push({ row, column });
    return output;
  }, [criteria.length]);
  const completed = pairs.filter((pair) => Boolean(judgments[pairKey(pair.row, pair.column)])).length;
  const complete = hasCompleteJudgments(criteria.length, judgments);
  const matrix = useMemo(() => buildPairwiseMatrix(criteria.length, judgments), [criteria.length, judgments]);
  const namesValid = criteria.every((name) => name.trim().length > 0) &&
    new Set(criteria.map((name) => name.trim().toLowerCase())).size === criteria.length;

  const calculation = useMemo(() => {
    if (!complete || !namesValid) return { result: null as AHPResult | null, error: null as string | null };
    try { return { result: calculateAHPWeights(matrix as number[][]), error: null as string | null }; }
    catch (error) { return { result: null as AHPResult | null, error: error instanceof Error ? error.message : "Unable to calculate AHP weights." }; }
  }, [complete, namesValid, matrix]);
  const result = calculation.result;
  const progress = pairs.length ? completed / pairs.length * 100 : 0;
  const ranked = result ? result.weights.map((weight, index) => ({ weight, name: criteria[index], index })).sort((a, b) => b.weight - a.weight) : [];

  function saveJudgment(row: number, column: number, preference: PreferenceDirection, intensity: number) {
    setJudgments((current) => ({ ...current, [pairKey(row, column)]: { preference, intensity: preference === "equal" ? 1 : intensity } }));
  }
  function addCriterion() {
    if (criteria.length >= MAX_CRITERIA) return;
    setCriteria((current) => current.concat("Criterion " + String(current.length + 1)));
    setJudgments({});
  }
  function removeCriterion() {
    if (criteria.length <= MIN_CRITERIA) return;
    setCriteria((current) => current.slice(0, -1));
    setJudgments({});
  }

  return (
    <main className={`${styles.workbench} min-h-screen bg-slate-50 pb-16`}>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/tools/gis" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm hover:bg-blue-50"><ArrowLeft size={16} /> Back to GIS Tools</Link>
        <header className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.15em] text-blue-700"><Scale size={17} /> YAJU Field Tools · GIS & Spatial Analysis</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">AHP Criteria Weighting Calculator</h1>
            <p className="mt-4 text-base leading-7 text-slate-600">Determine relative GIS criterion importance using Saaty pairwise comparisons, principal-eigenvector weights and a transparent consistency assessment.</p>
          </div>
          <span className="w-fit rounded-full border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800">2–15 criteria</span>
        </header>

        <section className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-900">Analysis setup</h2><p className="mt-1 text-sm text-slate-500">Define the study and its criteria.</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Step 1</span></div>
            <div className="mt-5 grid gap-4">
              <label className="block"><span className="text-sm font-semibold text-slate-700">Analysis / project name</span><input value={projectName} onChange={(event) => setProjectName(event.target.value)} maxLength={120} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="e.g. Groundwater Potential Mapping" /></label>
              <label className="block"><span className="text-sm font-semibold text-slate-700">Decision objective <span className="font-normal text-slate-400">(optional)</span></span><textarea value={objective} onChange={(event) => setObjective(event.target.value)} rows={2} maxLength={500} className="mt-2 w-full resize-y rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="What is this GIS multi-criteria analysis intended to assess?" /></label>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold text-slate-900">Criteria ({criteria.length}/{MAX_CRITERIA})</h3><p className="mt-1 text-xs text-slate-500">Use the names and definitions applied in your study.</p></div><div className="flex gap-2">
              <button type="button" onClick={removeCriterion} disabled={criteria.length <= MIN_CRITERIA} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"><Trash2 size={14} /> Remove last</button>
              <button type="button" onClick={addCriterion} disabled={criteria.length >= MAX_CRITERIA} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40"><Plus size={14} /> Add criterion</button>
            </div></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">{criteria.map((name, index) => <label key={index} className="block"><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Criterion {index + 1}</span><input value={name} onChange={(event) => setCriteria((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} maxLength={80} aria-label={"Criterion " + String(index + 1) + " name"} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>)}</div>
            {!namesValid && <p className="mt-3 text-sm text-amber-700" role="alert">Enter a unique, non-empty name for every criterion.</p>}
            <p className="mt-3 text-xs leading-5 text-slate-500">Adding or removing a criterion clears comparisons to prevent old judgments being assigned to a different criterion.</p>
          </div>

          <aside className="rounded-2xl border border-blue-100 bg-blue-50/70 p-5 sm:p-6">
            <div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm"><Info size={20} /></div><div><h2 className="font-bold text-slate-900">How AHP works</h2><p className="mt-1 text-sm leading-6 text-slate-600">Compare criteria two at a time. YAJU creates the reciprocal matrix and derives normalized priority weights.</p></div></div>
            <div className="mt-5 rounded-xl border border-blue-100 bg-white p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Saaty comparison scale</p><div className="mt-3 grid grid-cols-3 gap-2 text-center">{[["1", "Equal"], ["3", "Moderate"], ["5", "Strong"], ["7", "Very strong"], ["9", "Extreme"], ["2, 4, 6, 8", "Intermediate"]].map(([value, label]) => <div key={value} className="rounded-lg bg-slate-50 px-2 py-2"><p className="font-bold text-blue-700">{value}</p><p className="mt-0.5 text-[10px] leading-4 text-slate-500">{label}</p></div>)}</div><p className="mt-3 text-xs leading-5 text-slate-500">A value of 3 in one direction automatically becomes 1/3 in the reverse direction.</p></div>
            <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-600"><CheckCircle2 size={15} className="mt-0.5 shrink-0 text-blue-700" /> Weights are normalized to sum to 1 (100%).</p>
            <p className="mt-2 flex items-start gap-2 text-xs leading-5 text-slate-600"><CheckCircle2 size={15} className="mt-0.5 shrink-0 text-blue-700" /> CR ≤ 0.10 is the conventional consistency guideline.</p>
          </aside>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2"><h2 className="text-lg font-bold text-slate-900">Pairwise comparisons</h2><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Step 2</span></div><p className="mt-1 text-sm text-slate-500">Select which criterion is more important and by how much.</p></div><button type="button" onClick={() => setJudgments({})} disabled={completed === 0} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"><RotateCcw size={14} /> Reset comparisons</button></div>
          <div className="mt-5"><div className="flex justify-between text-xs font-semibold text-slate-500"><span>{completed} of {pairs.length} comparisons completed</span><span>{Math.round(progress)}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: String(progress) + "%" }} /></div></div>
          <div className="mt-5 grid gap-3 xl:grid-cols-2">{pairs.map(({ row, column }) => {
            const key = pairKey(row, column); const judgment = judgments[key]; const preference = judgment?.preference ?? ""; const intensity = judgment?.intensity ?? 3;
            const left = displayName(criteria[row], row); const right = displayName(criteria[column], column);
            return <div key={key} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Comparison {row + 1}.{column + 1}</p>{judgment && <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">{preference === "equal" ? "Equal importance" : (preference === "left" ? left : right) + " preferred"}</span>}</div>
              <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] sm:items-center">
                <div className="min-w-0"><p className="font-semibold leading-5 text-slate-900">{left}</p><p className="my-1 text-xs text-slate-400">compared with</p><p className="font-semibold leading-5 text-slate-900">{right}</p></div>
                <div className="grid gap-2"><label><span className="sr-only">Which criterion is more important?</span><select value={preference} onChange={(event) => { const value = event.target.value as PreferenceDirection | ""; if (value) saveJudgment(row, column, value, value === "equal" ? 1 : 3); }} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"><option value="" disabled>Select relative importance</option><option value="left">{left} is more important</option><option value="equal">Both are equally important</option><option value="right">{right} is more important</option></select></label>
                  <label><span className="sr-only">Saaty importance intensity</span><select value={String(intensity)} disabled={!judgment || preference === "equal"} onChange={(event) => saveJudgment(row, column, preference as PreferenceDirection, Number(event.target.value))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400">{SAATY_OPTIONS.map((value) => <option key={value} value={String(value)}>{value} — {value === 1 ? "Equal" : [2, 4, 6, 8].includes(value) ? "Intermediate intensity" : value === 3 ? "Moderate" : value === 5 ? "Strong" : value === 7 ? "Very strong" : "Extreme"}</option>)}</select></label></div>
              </div>
              {judgment && preference !== "equal" && <p className="mt-3 text-xs text-slate-500">Matrix value: {matrixText(preference === "left" ? intensity : 1 / intensity)}; reciprocal value: {matrixText(preference === "left" ? 1 / intensity : intensity)}.</p>}
            </div>;
          })}</div>
        </section>



        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2"><h2 className="text-lg font-bold text-slate-900">AHP priorities and decision matrix</h2><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Step 3</span></div><p className="mt-1 text-sm text-slate-500">Review consistency, ranked criterion weights, and reciprocal judgments.</p></div>
            {result && <div className="flex flex-wrap gap-2 print:hidden"><button type="button" onClick={() => exportCsv(result, criteria, projectName)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Download size={14} /> CSV weights</button><button type="button" onClick={() => exportWorkbook(result, criteria, matrix as number[][], projectName, objective)} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"><FileSpreadsheet size={14} /> Excel report</button><button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Printer size={14} /> Print / PDF</button></div>}
          </div>
          {!complete && <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900"><AlertTriangle size={18} className="mt-0.5 shrink-0" /><div><p className="font-semibold">Complete the pairwise comparisons to calculate weights.</p><p className="mt-1 text-sm leading-6">{pairs.length - completed} comparison{pairs.length - completed === 1 ? "" : "s"} remaining. No missing comparison will be assumed equal.</p></div></div>}
          {complete && !namesValid && <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Correct the criterion names before exporting results.</div>}
          {calculation.error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">{calculation.error}</div>}
          {result && <>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Maximum eigenvalue</p><p className="mt-2 text-2xl font-bold tabular-nums text-slate-950">{numberText(result.lambdaMax)}</p><p className="mt-1 text-xs text-slate-500">λ max</p></div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Consistency index</p><p className="mt-2 text-2xl font-bold tabular-nums text-slate-950">{numberText(result.consistencyIndex)}</p><p className="mt-1 text-xs text-slate-500">CI</p></div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Random index</p><p className="mt-2 text-2xl font-bold tabular-nums text-slate-950">{numberText(result.randomIndex, 2)}</p><p className="mt-1 text-xs text-slate-500">RI · Saaty (1980)</p></div>
              <div className={"rounded-xl border p-4 " + (result.consistencyAccepted ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50")}><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Consistency ratio</p><p className="mt-2 text-2xl font-bold tabular-nums text-slate-950">{percentage(result.consistencyRatio)}</p><p className="mt-1 text-xs text-slate-600">CR = CI / RI</p></div>
            </div>
            <div className={"mt-4 flex items-start gap-3 rounded-xl border p-4 " + (result.consistencyAccepted ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900")}>
              {result.consistencyAccepted ? <CheckCircle2 size={19} className="mt-0.5 shrink-0" /> : <AlertTriangle size={19} className="mt-0.5 shrink-0" />}
              <div><p className="font-semibold">{result.consistencyAccepted ? "Consistency is within the conventional threshold" : "Review the pairwise judgments"}</p><p className="mt-1 text-sm leading-6">{result.consistencyAccepted ? "CR is at or below 0.10. The priority weights can be used as AHP criterion weights, subject to your research method and justification." : "CR is above 0.10. Revisit judgments that may conflict with one another. YAJU does not automatically change the values you entered."}</p>{criteria.length === 2 && <p className="mt-1 text-xs leading-5">For a two-criterion reciprocal matrix, CR is zero by definition; this does not replace methodological review.</p>}</div>
            </div>

          </>}
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="min-w-0 rounded-xl border border-slate-200 p-4 sm:p-5">
              <h3 className="font-bold text-slate-900">AHP priorities</h3>
              <p className="mt-1 text-xs text-slate-500">Ranked normalized criterion weights. The total is 100%.</p>
              {result ? <div className="mt-4 overflow-x-auto"><table className="min-w-full text-sm">
                <thead><tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500"><th className="py-2 pr-3">Rank</th><th className="py-2 pr-3">Criterion</th><th className="min-w-40 py-2 pl-3 text-right">Priority</th></tr></thead>
                <tbody>{ranked.map((item, index) => <tr key={item.index} className="border-b border-slate-100 last:border-0">
                  <td className="py-2.5 pr-3 text-slate-500">{index + 1}</td>
                  <td className="py-2.5 pr-3 font-medium text-slate-800">{item.name}</td>
                  <td className="py-2.5 pl-3"><div className="flex items-baseline justify-between gap-2"><span className="font-bold tabular-nums text-slate-900">{percentage(item.weight)}</span><span className="text-xs tabular-nums text-slate-500">{numberText(item.weight, 6)}</span></div><div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: String(item.weight * 100) + "%" }} /></div></td>
                </tr>)}</tbody>
                <tfoot><tr className="border-t border-slate-200"><td colSpan={2} className="py-2.5 pr-3 font-semibold text-slate-700">Total</td><td className="py-2.5 pl-3 text-right font-bold tabular-nums text-slate-900">{percentage(result.weights.reduce((sum, weight) => sum + weight, 0))}</td></tr></tfoot>
              </table></div> : <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">Priorities appear when all pairwise comparisons are complete and the criterion names are valid.</p>}
            </div>
            <div className="min-w-0 rounded-xl border border-slate-200 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-bold text-slate-900">Decision matrix</h3><p className="mt-1 text-xs text-slate-500">Reciprocal values used to calculate the priorities.</p></div><span className="text-xs font-medium text-slate-500">Rows ÷ columns</span></div>
              <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200"><table className="min-w-full border-collapse text-sm"><thead className="bg-slate-50"><tr><th className="sticky left-0 z-10 min-w-36 border-b border-r border-slate-200 bg-slate-50 px-3 py-3 text-left text-xs font-bold text-slate-600">Criteria</th>{criteria.map((name, index) => <th key={index} className="min-w-32 border-b border-slate-200 px-3 py-3 text-center text-xs font-bold text-slate-700">{displayName(name, index)}</th>)}</tr></thead><tbody>{criteria.map((name, row) => <tr key={row} className="odd:bg-white even:bg-slate-50/60"><th className="sticky left-0 z-10 border-r border-slate-200 bg-inherit px-3 py-3 text-left text-xs font-semibold text-slate-700">{displayName(name, row)}</th>{criteria.map((_, column) => { const value = matrix[row][column]; return <td key={column} className={"border-b border-slate-100 px-3 py-3 text-center font-mono text-sm " + (row === column ? "bg-slate-100 font-bold text-slate-500" : value === null ? "text-slate-300" : "font-semibold text-blue-800")}>{matrixText(value)}</td>; })}</tr>)}</tbody></table></div>
              <p className="mt-3 text-xs leading-5 text-slate-500">A dash indicates a comparison not yet entered. Weights are withheld until every unique pair has been judged.</p>
            </div>
          </div>
          {result &&             <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4"><h3 className="font-semibold text-slate-900">Calculation method</h3><p className="mt-2 text-sm leading-6 text-slate-600">YAJU estimates the principal right eigenvector by power iteration, normalizes the priority vector so weights sum to 1, estimates λ max from A × w, then calculates CI = (λ max − n) / (n − 1) and CR = CI / RI.</p><p className="mt-2 text-xs leading-5 text-slate-500">Random Index values use the classic Saaty (1980) series for matrix orders 1–15. CR ≤ 0.10 is a conventional guideline, not proof that selected criteria or their ratings are scientifically appropriate.</p></div>}
        </section>

        <section className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/70 p-5 sm:p-6"><h2 className="font-bold text-slate-900">Using AHP weights in GIS</h2><p className="mt-2 text-sm leading-6 text-slate-600">This calculator produces criterion weights only. It does not reclassify raster layers or create a suitability map. After standardizing criterion rasters to a comparable scale, apply the weights in a GIS weighted overlay or weighted linear combination workflow.</p><div className="mt-3 overflow-x-auto rounded-xl border border-blue-100 bg-white px-4 py-3 text-center font-mono text-sm font-semibold text-blue-900">Suitability Index = Σ (criterion weight × standardized criterion value)</div></section>
        <footer className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 text-xs leading-5 text-slate-500"><p className="font-semibold text-slate-700">Research note</p><p className="mt-1">AHP results depend on the criteria selected, their definitions, scale direction and decision-maker judgments. Document the rationale and data sources for your criteria, and review the results for the specific study.</p></footer>
      </div>
    </main>
  );
}
