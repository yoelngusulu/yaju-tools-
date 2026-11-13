"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Calculator, Droplets, Gauge, Sprout } from "lucide-react";
import { calculateIrrigationRequirement } from "@/features/hydrology/domain/irrigation";
import { calculateBoreholePumpSupply } from "@/features/hydrology/domain/pump";
import { calculateAnnualRainwaterSizing } from "@/features/hydrology/domain/rainwater";
import { calculateTankCapacity } from "@/features/hydrology/domain/tank";
import { cubicMetresToLitres } from "@/features/hydrology/domain/units";
import { parseFiniteInput } from "@/features/hydrology/domain/validation";

type Mode = "rainwater" | "pump" | "irrigation" | "dimensions";
type ResultRow = { id: string; label: string; value: string };
type Result = {
  primary: number;
  primaryLitres: number;
  primaryLabel: string;
  rows: ResultRow[];
  note?: string;
};
type Calculation = { result: Result; error?: never } | { result?: never; error: string };

const withPrimaryLitres = (
  result: Omit<Result, "primaryLitres">
): Result => ({
  ...result,
  primaryLitres: cubicMetresToLitres(result.primary),
});

const fmt = (value: number, digits = 2) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(value);

export default function WaterStorageCalculatorPage() {
  const [mode, setMode] = useState<Mode>("rainwater");
  const [roofArea, setRoofArea] = useState("100");
  const [rainfall, setRainfall] = useState("800");
  const [runoff, setRunoff] = useState("0.85");
  const [collectionEfficiency, setCollectionEfficiency] = useState("");
  const [people, setPeople] = useState("5");
  const [demand, setDemand] = useState("25");
  const [dryDays, setDryDays] = useState("120");
  const [safety, setSafety] = useState("20");
  const [boreholeYield, setBoreholeYield] = useState("");
  const [pumpRatedDischarge, setPumpRatedDischarge] = useState("4.5");
  const [actualDischarge, setActualDischarge] = useState("");
  const [pumpHours, setPumpHours] = useState("8");
  const [pumpDemand, setPumpDemand] = useState("30");
  const [reserveDays, setReserveDays] = useState("1");
  const [area, setArea] = useState("1");
  const [eto, setEto] = useState("5");
  const [kc, setKc] = useState("1.0");
  const [effectiveRain, setEffectiveRain] = useState("1");
  const [efficiency, setEfficiency] = useState("80");
  const [interval, setInterval] = useState("3");
  const [shape, setShape] = useState<"cylindrical" | "rectangular">("cylindrical");
  const [diameter, setDiameter] = useState("4");
  const [height, setHeight] = useState("3");
  const [length, setLength] = useState("5");
  const [width, setWidth] = useState("4");
  const [freeboardHeight, setFreeboardHeight] = useState("");
  const [deadStorage, setDeadStorage] = useState("");

  const calculation = useMemo<Calculation>(() => {
    try {
      const value = (input: string, label: string) =>
        parseFiniteInput(input, label);

      if (mode === "rainwater") {
        const result = calculateAnnualRainwaterSizing({
          rainfallMm: value(rainfall, "Annual rainfall"),
          catchmentAreaM2: value(roofArea, "Catchment / roof area"),
          runoffCoefficient: value(runoff, "Runoff coefficient"),
          collectionEfficiency: value(collectionEfficiency, "Collection efficiency") / 100,
          people: value(people, "Number of users"),
          demandLitresPerPersonPerDay: value(demand, "Water demand per person"),
          dryPeriodDays: value(dryDays, "Dry period"),
          safetyAllowancePercent: value(safety, "Storage safety allowance"),
        });

        return {
          result: withPrimaryLitres({
            primary: result.recommendedStorageM3,
            primaryLabel: "Recommended storage estimate",
            rows: [
              { id: "annual-harvest", label: "Annual harvest potential", value: `${fmt(result.annualInflowM3)} m³` },
              { id: "daily-demand", label: "Daily demand", value: `${fmt(result.dailyDemandLitres, 0)} L/day` },
              { id: "dry-period-demand", label: "Dry-period demand", value: `${fmt(result.dryPeriodDemandM3)} m³` },
              {
                id: "annual-inflow-storage-ratio",
                label: "Annual inflow / storage ratio",
                value: result.annualInflowToStorageRatio === null
                  ? "—"
                  : `${fmt(result.annualInflowToStorageRatio)}×`,
              },
            ],
            note: "Annual yield is a potential estimate; storage sizing uses the entered dry-period demand and safety allowance, not a daily rainfall simulation.",
          }),
        };
      }

      if (mode === "pump") {
        const actualOperatingDischargeM3PerHour = actualDischarge.trim()
          ? value(actualDischarge, "Actual operating discharge")
          : undefined;
        const result = calculateBoreholePumpSupply({
          sustainableYieldM3PerHour: value(boreholeYield, "Measured sustainable borehole yield"),
          pumpRatedDischargeM3PerHour: value(pumpRatedDischarge, "Pump-rated discharge"),
          actualOperatingDischargeM3PerHour,
          pumpingHoursPerDay: value(pumpHours, "Pumping hours per day"),
          dailyDemandM3: value(pumpDemand, "Daily water demand"),
          reserveDays: value(reserveDays, "Reserve storage days"),
        });

        return {
          result: withPrimaryLitres({
            primary: result.reserveRequirementM3,
            primaryLabel: "Reserve storage requirement",
            rows: [
              { id: "limiting-discharge", label: "Limiting discharge", value: `${fmt(result.limitingDischargeM3PerHour)} m³/hour` },
              { id: "daily-production", label: "Estimated daily production", value: `${fmt(result.dailyProductionM3)} m³/day` },
              { id: "daily-demand", label: "Daily demand", value: `${fmt(result.dailyDemandM3)} m³/day` },
              { id: "daily-deficit", label: "Daily supply deficit", value: `${fmt(result.dailyDeficitM3)} m³/day` },
            ],
            note: result.usesRatedDischargeEstimate
              ? "Production uses the pump-rated discharge as an estimate because actual operating discharge was not entered. Sustainable borehole yield remains a separate limiting input."
              : "Production is limited by measured sustainable borehole yield, pump rating, and entered actual operating discharge.",
          }),
        };
      }

      if (mode === "irrigation") {
        const result = calculateIrrigationRequirement({
          etoMmPerDay: value(eto, "Reference ET (ETo)"),
          cropCoefficient: value(kc, "Crop coefficient (Kc)"),
          effectiveRainfallMmPerDay: value(effectiveRain, "Effective rainfall"),
          efficiencyPercent: value(efficiency, "Irrigation efficiency"),
          irrigatedAreaHa: value(area, "Irrigated area"),
          irrigationIntervalDays: value(interval, "Irrigation interval"),
        });

        return {
          result: withPrimaryLitres({
            primary: result.intervalStorageM3,
            primaryLabel: "Irrigation-cycle storage",
            rows: [
              { id: "reference-et", label: "Reference ET (ETo)", value: `${fmt(result.etoMmPerDay)} mm/day` },
              { id: "crop-et", label: "Crop ET (ETc)", value: `${fmt(result.cropEvapotranspirationMmPerDay)} mm/day` },
              { id: "net-irrigation", label: "Net irrigation depth", value: `${fmt(result.netIrrigationMmPerDay)} mm/day` },
              { id: "gross-irrigation", label: "Gross irrigation depth", value: `${fmt(result.grossIrrigationMmPerDay)} mm/day` },
              { id: "gross-demand", label: "Gross water demand", value: `${fmt(result.grossDemandM3PerDay)} m³/day` },
            ],
            note: "ETo and effective rainfall are manual inputs. This calculation does not fetch climate data or simulate soil-water storage.",
          }),
        };
      }

      const tankInputs = {
        heightM: value(height, "Tank height"),
        freeboardHeightM: value(freeboardHeight, "Freeboard height"),
        deadStorageM3: value(deadStorage, "Dead storage"),
      };
      const result =
        shape === "cylindrical"
          ? calculateTankCapacity({
              ...tankInputs,
              shape,
              diameterM: value(diameter, "Tank diameter"),
            })
          : calculateTankCapacity({
              ...tankInputs,
              shape,
              lengthM: value(length, "Tank length"),
              widthM: value(width, "Tank width"),
            });

      return {
        result: withPrimaryLitres({
          primary: result.usableStorageM3,
          primaryLabel: "Usable storage capacity",
          rows: [
            { id: "gross-volume", label: "Gross geometric volume", value: `${fmt(result.grossVolumeM3)} m³` },
            { id: "freeboard-volume", label: "Freeboard volume", value: `${fmt(result.freeboardVolumeM3)} m³` },
            { id: "below-freeboard", label: "Volume below freeboard", value: `${fmt(result.volumeBelowFreeboardM3)} m³` },
            { id: "dead-storage", label: "Dead storage", value: `${fmt(result.deadStorageM3)} m³` },
            { id: "usable-storage-m3", label: "Usable storage", value: `${fmt(result.usableStorageM3)} m³` },
            { id: "usable-storage-litres", label: "Usable storage", value: `${fmt(result.usableStorageLitres, 0)} litres` },
            { id: "tank-type", label: "Tank type", value: shape === "cylindrical" ? "Cylindrical" : "Rectangular" },
          ],
        }),
      };
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : "Check the entered values and try again.",
      };
    }
  }, [
    mode,
    roofArea,
    rainfall,
    runoff,
    collectionEfficiency,
    people,
    demand,
    dryDays,
    safety,
    boreholeYield,
    pumpRatedDischarge,
    actualDischarge,
    pumpHours,
    pumpDemand,
    reserveDays,
    area,
    eto,
    kc,
    effectiveRain,
    efficiency,
    interval,
    shape,
    diameter,
    height,
    length,
    width,
    freeboardHeight,
    deadStorage,
  ]);

  const modes = [
    { id: "rainwater" as const, label: "Rainwater Harvesting", icon: Droplets },
    { id: "pump" as const, label: "Borehole & Pump", icon: Gauge },
    { id: "irrigation" as const, label: "Irrigation Storage", icon: Sprout },
    { id: "dimensions" as const, label: "Tank Dimensions", icon: Calculator },
  ];

  const field = (
    label: string,
    value: string,
    setter: (value: string) => void,
    unit: string,
    step = "any",
    min = "0",
    max?: string
  ) => (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-gray-700">{label}</span>
      <div className="flex overflow-hidden rounded-xl border border-gray-200 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => setter(event.target.value)}
          className="min-w-0 flex-1 px-4 py-3 outline-none"
        />
        <span className="flex items-center border-l border-gray-200 bg-gray-50 px-3 text-sm text-gray-500">
          {unit}
        </span>
      </div>
    </label>
  );

  return (
    <main className="min-h-screen bg-gray-50 px-5 py-12">
      <div className="mx-auto max-w-6xl">
        <Link href="/tools/gis" className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-blue-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50">
          <ArrowLeft size={16} />Back to YAJU Field Tools
        </Link>
        <div className="mt-5 max-w-4xl">
          <p className="text-sm font-bold uppercase tracking-wider text-blue-600">YAJU Field Tools</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-gray-950 md:text-5xl">Water Storage & Tank Sizing Calculator</h1>
          <p className="mt-4 text-lg leading-8 text-gray-600">Estimate storage for rainwater harvesting, borehole and pumping systems, irrigation demand, or calculate physical tank capacity.</p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {modes.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => setMode(id)} className={`flex items-center gap-3 rounded-xl border p-4 text-left font-semibold transition ${mode === id ? "border-blue-600 bg-blue-600 text-white shadow-sm" : "border-gray-200 bg-white text-gray-700 hover:border-blue-300"}`}>
              <Icon size={20} /> {label}
            </button>
          ))}
        </div>

        <div className="mt-7 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-xl font-bold text-gray-900">Design inputs</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              {mode === "rainwater" && <>
                {field("Catchment / roof area", roofArea, setRoofArea, "m²")}
                {field("Annual rainfall", rainfall, setRainfall, "mm")}
                {field("Runoff coefficient", runoff, setRunoff, "0–1", "any", "0", "1")}
                {field("Collection efficiency", collectionEfficiency, setCollectionEfficiency, "%", "any", "0", "100")}
                {field("Number of users", people, setPeople, "people", "1")}
                {field("Water demand per person", demand, setDemand, "L/p/d")}
                {field("Dry period", dryDays, setDryDays, "days", "1")}
                {field("Storage safety allowance", safety, setSafety, "%")}
              </>}
              {mode === "pump" && <>
                {field("Measured sustainable borehole yield", boreholeYield, setBoreholeYield, "m³/hr")}
                {field("Pump-rated discharge", pumpRatedDischarge, setPumpRatedDischarge, "m³/hr")}
                {field("Actual operating discharge (optional)", actualDischarge, setActualDischarge, "m³/hr")}
                {field("Pumping hours per day", pumpHours, setPumpHours, "hr/day", "any", "0", "24")}
                {field("Daily water demand", pumpDemand, setPumpDemand, "m³/day")}
                {field("Reserve storage", reserveDays, setReserveDays, "days")}
              </>}
              {mode === "irrigation" && <>
                {field("Irrigated area", area, setArea, "ha")}
                {field("Reference ET (ETo)", eto, setEto, "mm/day")}
                {field("Crop coefficient (Kc)", kc, setKc, "Kc")}
                {field("Effective rainfall", effectiveRain, setEffectiveRain, "mm/day")}
                {field("Irrigation efficiency", efficiency, setEfficiency, "%", "any", "0.01", "100")}
                {field("Irrigation interval", interval, setInterval, "days", "1", "0.01")}
              </>}
              {mode === "dimensions" && <>
                <label className="block sm:col-span-2">
                  <span className="mb-2 block text-sm font-semibold text-gray-700">Tank shape</span>
                  <select value={shape} onChange={(event) => setShape(event.target.value as "cylindrical" | "rectangular")} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-blue-500">
                    <option value="cylindrical">Cylindrical</option>
                    <option value="rectangular">Rectangular</option>
                  </select>
                </label>
                {shape === "cylindrical"
                  ? field("Diameter", diameter, setDiameter, "m", "any", "0.01")
                  : <>{field("Length", length, setLength, "m", "any", "0.01")}{field("Width", width, setWidth, "m", "any", "0.01")}</>}
                {field("Tank height", height, setHeight, "m", "any", "0.01")}
                {field("Freeboard height", freeboardHeight, setFreeboardHeight, "m")}
                {field("Dead storage", deadStorage, setDeadStorage, "m³")}
              </>}
            </div>
            {mode === "rainwater" && (
              <p className="mt-5 text-sm leading-6 text-gray-600">
                Runoff coefficient estimates the share of rainfall that runs off the catchment. Collection efficiency accounts for conveyance and storage losses after runoff. Keep the two factors separate and avoid counting the same loss in both.
              </p>
            )}
          </section>

          <aside className="rounded-2xl bg-blue-600 p-6 text-white shadow-sm md:p-8" aria-live="polite">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-100">Calculated result</p>
            {calculation.error ? (
              <p role="alert" className="mt-5 rounded-lg bg-white/10 p-4 text-sm leading-6">
                Check your inputs: {calculation.error}
              </p>
            ) : calculation.result ? (
              <>
                <p className="mt-5 text-sm text-blue-100">{calculation.result.primaryLabel}</p>
                <div className="mt-1 text-4xl font-bold">{fmt(calculation.result.primary)} m³</div>
                <div className="mt-1 text-blue-100">{fmt(calculation.result.primaryLitres, 0)} litres</div>
                <div className="mt-7 space-y-3 border-t border-white/20 pt-5">
                  {calculation.result.rows.map(({ id, label, value }) => (
                    <div key={id} className="flex items-start justify-between gap-4 text-sm">
                      <span className="text-blue-100">{label}</span>
                      <strong className="text-right">{value}</strong>
                    </div>
                  ))}
                </div>
                {calculation.result.note && <p className="mt-5 border-t border-white/20 pt-4 text-sm leading-6 text-blue-100">{calculation.result.note}</p>}
              </>
            ) : null}
          </aside>
        </div>

        <section className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
          <strong>Engineering note:</strong> This calculator provides preliminary sizing estimates. The rainwater storage balance is a monthly approximation when used with monthly values and does not model within-month dry spells. Final tank and water-supply design should use site-specific rainfall, demand, measured source yield, operating pattern, crop and hydraulic data and should be checked against applicable engineering standards.
        </section>
      </div>
    </main>
  );
}
