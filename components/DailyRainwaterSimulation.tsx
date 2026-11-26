"use client";

import { useMemo, useState } from "react";
import { calculateDailyRainwaterBalance } from "@/features/hydrology/domain/daily-water-balance";
import type { DailyRainfallRecord } from "@/features/hydrology/domain/rainfall-upload";

type Props = {
  records: DailyRainfallRecord[];
  catchmentAreaM2: number;
  runoffCoefficient: number;
  collectionEfficiency: number;
  dailyDemandM3: number;
};

const format = (value: number) => new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
}).format(value);

export default function DailyRainwaterSimulation({
  records,
  catchmentAreaM2,
  runoffCoefficient,
  collectionEfficiency,
  dailyDemandM3,
}: Props) {
  const [capacity, setCapacity] = useState("5");
  const [initialStorage, setInitialStorage] = useState("0");
  const result = useMemo(() => {
    const tankCapacityM3 = Number(capacity);
    const initialStorageM3 = Number(initialStorage);
    if (!Number.isFinite(tankCapacityM3) || !Number.isFinite(initialStorageM3) ||
        tankCapacityM3 <= 0 || initialStorageM3 < 0 || initialStorageM3 > tankCapacityM3) {
      return { error: "Enter a positive tank capacity and an initial storage between zero and tank capacity." } as const;
    }
    try {
      return { data: calculateDailyRainwaterBalance({
        records,
        catchmentAreaM2,
        runoffCoefficient,
        collectionEfficiency,
        dailyDemandM3,
        tankCapacityM3,
        initialStorageM3,
      }) } as const;
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Daily simulation could not be calculated." } as const;
    }
  }, [records, catchmentAreaM2, runoffCoefficient, collectionEfficiency, dailyDemandM3, capacity, initialStorage]);

  return (
    <section className="mt-4 rounded-2xl border border-sky-200 bg-sky-50/60 p-4" aria-label="Daily rainwater storage simulation">
      <div>
        <h3 className="text-sm font-bold text-slate-950">Daily storage performance simulation</h3>
        <p className="mt-1 text-xs leading-5 text-slate-600">
          Daily Yield After Spillage (YAS): rainfall inflow is added, overflow is removed, then demand is supplied from the remaining tank storage. The uploaded daily record is used in chronological order.
        </p>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-slate-700">
          Simulation tank capacity (m³)
          <input type="number" min="0.01" step="any" value={capacity} onChange={(event) => setCapacity(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" />
        </label>
        <label className="text-xs font-semibold text-slate-700">
          Initial tank storage (m³)
          <input type="number" min="0" step="any" value={initialStorage} onChange={(event) => setInitialStorage(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" />
        </label>
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        Daily demand: {format(dailyDemandM3)} m³/day · Records: {records.length.toLocaleString("en-US")} · Catchment: {format(catchmentAreaM2)} m²
      </p>
      {"error" in result ? (
        <p role="alert" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">{result.error}</p>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              ["Volumetric reliability", result.data.volumetricReliabilityPercent],
              ["Time reliability", result.data.timeReliabilityPercent],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-lg border border-sky-100 bg-white p-3">
                <div className="text-[11px] text-slate-500">{label}</div>
                <div className="mt-1 text-lg font-bold text-slate-900">{value === null ? "—" : `${format(Number(value))}%`}</div>
              </div>
            ))}
            {[
              ["Total inflow", result.data.totalRainfallInflowM3, "m³"],
              ["Water supplied", result.data.totalWaterSuppliedM3, "m³"],
              ["Unmet demand", result.data.totalUnmetDemandM3, "m³"],
              ["Overflow", result.data.totalOverflowM3, "m³"],
              ["Final storage", result.data.finalStorageM3, "m³"],
            ].map(([label, value, unit]) => (
              <div key={String(label)} className="rounded-lg border border-sky-100 bg-white p-3">
                <div className="text-[11px] text-slate-500">{label}</div>
                <div className="mt-1 text-lg font-bold text-slate-900">{format(Number(value))} <span className="text-xs font-medium">{unit}</span></div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-5 text-slate-600">
            Time reliability is the percentage of demand days fully supplied. Volumetric reliability is total supplied volume divided by total demand. Results represent this observed rainfall sequence and the entered constant daily demand; they are not a future guarantee.
          </p>
        </>
      )}
    </section>
  );
}
