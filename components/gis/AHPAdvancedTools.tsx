"use client";

import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Download, FileDown, FileUp, FolderOpen, Save, SlidersHorizontal } from "lucide-react";
import {
  buildPairwiseMatrix,
  calculateAHPWeights,
  pairKey,
  type AHPResult,
  type PairwiseJudgments,
} from "@/lib/gis/ahp";

type Props = {
  projectName: string;
  objective: string;
  criteria: string[];
  judgments: PairwiseJudgments;
  matrix: Array<Array<number | null>>;
  result: AHPResult | null;
  onLoad: (data: { projectName: string; objective: string; criteria: string[]; judgments: PairwiseJudgments }) => void;
};

type ProjectFile = {
  schema: "yaju-ahp-project";
  version: 1;
  savedAt: string;
  projectName: string;
  objective: string;
  criteria: string[];
  judgments: PairwiseJudgments;
};

const SAATY_VALUES = [1 / 9, 1 / 8, 1 / 7, 1 / 6, 1 / 5, 1 / 4, 1 / 3, 1 / 2, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const safeBase = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "criterion";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function adjacentSaatyValues(value: number) {
  const index = SAATY_VALUES.findIndex((candidate) => Math.abs(candidate - value) < 1e-8);
  return [SAATY_VALUES[Math.max(0, index - 1)], SAATY_VALUES[Math.min(SAATY_VALUES.length - 1, index + 1)]]
    .filter((candidate, candidateIndex, values) => Math.abs(candidate - value) > 1e-8 && values.indexOf(candidate) === candidateIndex);
}

function parseMatrixSheet(sheet: XLSX.WorkSheet) {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, blankrows: false });
  if (rows.length < 3) throw new Error("The Pairwise Matrix sheet must contain a header row and at least two criteria.");
  const headers = rows[0].slice(1).map((value) => String(value ?? "").trim());
  if (headers.length < 2 || headers.some((name) => !name)) throw new Error("The first row must contain criterion names after the first cell.");
  const names = headers;
  const matrix = rows.slice(1, names.length + 1).map((row, index) => {
    if (String(row[0] ?? "").trim().toLowerCase() !== names[index].toLowerCase()) {
      throw new Error("Row labels must match the criterion names and appear in the same order as the column headings.");
    }
    return row.slice(1, names.length + 1).map((value) => {
      const number = typeof value === "number" ? value : Number(String(value ?? "").trim());
      if (!Number.isFinite(number) || number <= 0) throw new Error("Every matrix cell must contain a positive numeric value.");
      return number;
    });
  });
  if (matrix.length !== names.length || matrix.some((row) => row.length !== names.length)) throw new Error("The imported matrix must be square.");
  for (let i = 0; i < names.length; i += 1) {
    if (Math.abs(matrix[i][i] - 1) > 1e-8) throw new Error("All diagonal values must equal 1.");
    for (let j = i + 1; j < names.length; j += 1) {
      if (Math.abs(matrix[i][j] * matrix[j][i] - 1) > 1e-7) throw new Error("The imported matrix is not reciprocal.");
    }
  }
  return { names, matrix };
}

export default function AHPAdvancedTools({ projectName, objective, criteria, judgments, matrix, result, onLoad }: Props) {
  const [message, setMessage] = useState("");
  const [layerNames, setLayerNames] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const sensitivity = useMemo(() => {
    if (!result || matrix.some((row) => row.some((value) => value === null))) return null;
    const baseline = result.weights;
    const minimum = [...baseline];
    const maximum = [...baseline];
    let scenarios = 0;
    for (let row = 0; row < criteria.length; row += 1) {
      for (let column = row + 1; column < criteria.length; column += 1) {
        const original = matrix[row][column] as number;
        for (const alternative of adjacentSaatyValues(original)) {
          const changed = matrix.map((line) => line.map((value) => value as number));
          changed[row][column] = alternative;
          changed[column][row] = 1 / alternative;
          const next = calculateAHPWeights(changed);
          next.weights.forEach((weight, index) => {
            minimum[index] = Math.min(minimum[index], weight);
            maximum[index] = Math.max(maximum[index], weight);
          });
          scenarios += 1;
        }
      }
    }
    return { minimum, maximum, scenarios };
  }, [criteria.length, matrix, result]);

  async function importWorkbook(file?: File) {
    if (!file) return;
    setBusy(true);
    setMessage("");
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheet = workbook.Sheets["Pairwise Matrix"];
      if (!sheet) throw new Error('Workbook must contain a sheet named "Pairwise Matrix".');
      const parsed = parseMatrixSheet(sheet);
      const count = parsed.names.length;
      if (count < 2 || count > 15) throw new Error("YAJU supports between 2 and 15 criteria.");
      const imported: PairwiseJudgments = {};
      for (let row = 0; row < count; row += 1) {
        for (let column = row + 1; column < count; column += 1) {
          const value = parsed.matrix[row][column];
          const magnitude = value >= 1 ? value : 1 / value;
          if (Math.abs(magnitude - Math.round(magnitude)) > 1e-7 || magnitude < 1 || magnitude > 9) {
            throw new Error("Saaty matrix values must be 1, 2–9 or their reciprocals.");
          }
          imported[pairKey(row, column)] = {
            preference: Math.abs(value - 1) < 1e-8 ? "equal" : value > 1 ? "left" : "right",
            intensity: Math.round(magnitude),
          };
        }
      }
      onLoad({ projectName: file.name.replace(/\.(xlsx|xls)$/i, "") || projectName, objective, criteria: parsed.names, judgments: imported });
      setMessage("Excel matrix imported. Review the consistency ratio and all criterion labels before using the weights.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to import this workbook.");
    } finally {
      setBusy(false);
    }
  }

  function saveProject() {
    const payload: ProjectFile = { schema: "yaju-ahp-project", version: 1, savedAt: new Date().toISOString(), projectName, objective, criteria, judgments };
    downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }), safeBase(projectName) + ".yaju-ahp.json");
    setMessage("Project file prepared. Keep the .yaju-ahp.json file to reopen this analysis later.");
  }

  async function loadProject(file?: File) {
    if (!file) return;
    setBusy(true);
    setMessage("");
    try {
      const payload = JSON.parse(await file.text()) as Partial<ProjectFile>;
      if (payload.schema !== "yaju-ahp-project" || payload.version !== 1 || !Array.isArray(payload.criteria) || !payload.judgments || typeof payload.judgments !== "object") {
        throw new Error("This is not a supported YAJU AHP project file.");
      }
      if (payload.criteria.length < 2 || payload.criteria.length > 15 || payload.criteria.some((name) => typeof name !== "string" || !name.trim()) || new Set(payload.criteria.map((name) => name.trim().toLowerCase())).size !== payload.criteria.length) {
        throw new Error("Project criteria must contain 2–15 unique, non-empty names.");
      }
      const expected = (payload.criteria.length * (payload.criteria.length - 1)) / 2;
      const entries = Object.entries(payload.judgments);
      const expectedKeys = new Set<string>();
      for (let row = 0; row < payload.criteria.length; row += 1) {
        for (let column = row + 1; column < payload.criteria.length; column += 1) expectedKeys.add(pairKey(row, column));
      }
      if (entries.length !== expected || entries.some(([key, judgment]) => !expectedKeys.has(key) || !judgment || !["left", "right", "equal"].includes(judgment.preference) || (judgment.preference === "equal" ? judgment.intensity !== 1 : !Number.isInteger(judgment.intensity) || judgment.intensity < 2 || judgment.intensity > 9))) {
        throw new Error("Project comparison data is incomplete or invalid.");
      }
      const checkedMatrix = buildPairwiseMatrix(payload.criteria.length, payload.judgments);
      calculateAHPWeights(checkedMatrix as number[][]);
      onLoad({
        projectName: typeof payload.projectName === "string" ? payload.projectName : "Imported AHP Analysis",
        objective: typeof payload.objective === "string" ? payload.objective : "",
        criteria: payload.criteria,
        judgments: payload.judgments,
      });
      setMessage("Project loaded. Check the calculated weights and consistency assessment.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load this project file.");
    } finally {
      setBusy(false);
    }
  }

  function exportGISExpressions() {
    if (!result) return;
    const names = criteria.map((name, index) => (layerNames[index] || safeBase(name)).trim());
    if (names.some((name) => !name)) {
      setMessage("Enter a raster layer name for each criterion.");
      return;
    }
    const arc = result.weights.map((weight, index) => `Raster("${names[index]}") * ${weight.toFixed(8)}`);
    const qgis = result.weights.map((weight, index) => `"${names[index]}@1" * ${weight.toFixed(8)}`);
    const arcExpression = arc.join(" +\n");
    const qgisExpression = qgis.join(" +\n");
    const report = [
      "YAJU AHP — GIS weighted overlay expressions",
      "Project: " + projectName,
      "Objective: " + objective,
      "Consistency ratio: " + result.consistencyRatio.toFixed(6),
      "Consistency status: " + (result.consistencyAccepted ? "Within conventional CR <= 0.10 guideline" : "Review judgments: CR > 0.10"),
      "",
      "IMPORTANT: These expressions assume all input rasters have already been standardized to a common suitability scale, aligned to the same CRS, cell size, extent and snap raster. Confirm that all criteria use a consistent benefit/cost direction before overlay.",
      "",
      "ARCGIS PRO — Raster Calculator (Map Algebra)",
      arcExpression,
      "",
      "QGIS — Raster Calculator",
      qgisExpression,
      "",
      "Criterion weights:",
      ...result.weights.map((weight, index) => `${criteria[index]}: ${weight.toFixed(8)} (${(weight * 100).toFixed(4)}%)`),
    ].join("\n");
    downloadBlob(new Blob([report], { type: "text/plain;charset=utf-8" }), safeBase(projectName) + "-gis-weighted-overlay.txt");
    setMessage("ArcGIS Pro and QGIS expressions exported. Standardize and align all rasters before running the overlay.");
  }

  const ranking = result ? result.weights.map((weight, index) => ({ name: criteria[index], weight, low: sensitivity?.minimum[index] ?? weight, high: sensitivity?.maximum[index] ?? weight })).sort((a, b) => b.weight - a.weight) : [];

  return (
    <section className="mt-6 grid gap-5 lg:grid-cols-2 print:hidden">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-2"><Save size={18} className="text-blue-700" /><h2 className="text-lg font-bold text-slate-900">Save, reopen and import</h2></div>
        <p className="mt-1 text-sm leading-6 text-slate-600">Keep the complete criteria and comparison judgments in a portable project file, or import a completed reciprocal matrix from Excel.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={saveProject} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2.5 text-xs font-semibold text-white hover:bg-blue-700"><Save size={14} /> Save project</button>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"><FolderOpen size={14} /> Open project<input type="file" accept=".json,.yaju-ahp.json,application/json" className="sr-only" disabled={busy} onChange={(event) => { void loadProject(event.target.files?.[0]); event.currentTarget.value = ""; }} /></label>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"><FileUp size={14} /> Import Excel matrix<input type="file" accept=".xlsx,.xls" className="sr-only" disabled={busy} onChange={(event) => { void importWorkbook(event.target.files?.[0]); event.currentTarget.value = ""; }} /></label>
        </div>
        <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">Excel format: use a worksheet named <strong>Pairwise Matrix</strong>. Put criterion names across row 1 (starting in column B) and repeat those names down column A. Enter a complete reciprocal matrix with 1 on the diagonal and Saaty values 2–9 or their reciprocals elsewhere.</p>
        {message && <p className="mt-3 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-900" role="status">{message}</p>}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-2"><SlidersHorizontal size={18} className="text-blue-700" /><h2 className="text-lg font-bold text-slate-900">Sensitivity analysis</h2></div>
        <p className="mt-1 text-sm leading-6 text-slate-600">One-at-a-time test: each pairwise judgment is shifted to its adjacent Saaty scale value while all other judgments remain unchanged.</p>
        {!result || !sensitivity ? <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Complete all comparisons to run sensitivity analysis.</p> : <>
          <p className="mt-3 text-xs text-slate-500">Tested {sensitivity.scenarios} alternative judgment scenarios. Ranges below are not confidence intervals.</p>
          <div className="mt-3 space-y-3">{ranking.map((item) => <div key={item.name}><div className="flex items-center justify-between gap-2 text-xs"><span className="font-semibold text-slate-700">{item.name}</span><span className="tabular-nums text-slate-600">{(item.weight * 100).toFixed(2)}% · range {(item.low * 100).toFixed(2)}–{(item.high * 100).toFixed(2)}%</span></div><div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: (item.weight * 100) + "%" }} /></div></div>)}</div>
        </>}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:col-span-2 sm:p-6">
        <div className="flex items-center gap-2"><FileDown size={18} className="text-blue-700" /><h2 className="text-lg font-bold text-slate-900">GIS weighted-overlay integration</h2></div>
        <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-600">Map each criterion to its raster layer and export weighted-sum expressions for ArcGIS Pro and QGIS. This generates the calculation expression; it does not process or validate raster data inside YAJU.</p>
        {result ? <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{criteria.map((criterion, index) => <label key={index} className="block"><span className="text-xs font-semibold text-slate-600">{criterion} · {(result.weights[index] * 100).toFixed(2)}%</span><input value={layerNames[index] ?? safeBase(criterion)} onChange={(event) => setLayerNames((current) => { const next = [...current]; next[index] = event.target.value; return next; })} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Raster layer name" /></label>)}</div>
          <button type="button" onClick={exportGISExpressions} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700"><Download size={14} /> Export ArcGIS Pro + QGIS expressions</button>
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"><strong>Before overlay:</strong> standardize rasters to a common scale (for example 1–5 or 0–1), ensure matching CRS, cell size, extent and snap raster, and confirm all layers have a consistent suitability direction. The output is a weighted linear combination, not a substitute for raster reclassification or data-quality checks.</div>
        </> : <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-500">Complete the AHP comparisons to generate GIS expressions.</p>}
      </div>
    </section>
  );
}
