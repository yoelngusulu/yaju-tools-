"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Calculator, CloudRain, Droplets, Gauge, MapPinned, Sprout } from "lucide-react";
import { calculateIrrigationRequirement } from "@/features/hydrology/domain/irrigation";
import { calculateBoreholePumpSupply } from "@/features/hydrology/domain/pump";
import { calculateAnnualRainwaterSizing } from "@/features/hydrology/domain/rainwater";
import { calculateTankCapacity } from "@/features/hydrology/domain/tank";
import { cubicMetresToLitres } from "@/features/hydrology/domain/units";
import { parseFiniteInput } from "@/features/hydrology/domain/validation";
import { parseSiteCoordinates, type GeographicPoint } from "@/features/hydrology/domain/geometry";
import WaterStorageMapPreview from "@/components/WaterStorageMapPreview";

type Mode = "rainwater" | "pump" | "irrigation" | "dimensions";
type ResultRow = { id: string; label: string; value: string };
type Result = {
  primary: number;
  primaryLitres: number;
  primaryLabel: string;
  rows: ResultRow[];
  note?: string;
};
type Calculation =
  | { result: Result; error?: never; message?: never }
  | { result?: never; error: string; message?: never }
  | { result?: never; error?: never; message: string };

type MonthlyRainfall = {
  month: string;
  monthNumber: number;
  rainfallMm: number;
  sampleYears: number;
};

type RainfallData = {
  source: string;
  parameter: string;
  community: string;
  units: string;
  sourceUnits: string;
  startYear: number;
  endYear: number;
  annualRainfallMm: number;
  monthlyRainfall: MonthlyRainfall[];
  requestedCoordinates: GeographicPoint;
  dataCoordinates: GeographicPoint;
  conversionNote: string;
  retrievedAt: string;
};

const MODES = [
  { id: "rainwater" as const, label: "Rainwater Harvesting", icon: Droplets },
  { id: "pump" as const, label: "Borehole & Pump", icon: Gauge },
  { id: "irrigation" as const, label: "Irrigation Storage", icon: Sprout },
  { id: "dimensions" as const, label: "Tank Dimensions", icon: Calculator },
];

const fmt = (value: number, digits = 2) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(value);

const withPrimaryLitres = (
  result: Omit<Result, "primaryLitres">
): Result => ({
  ...result,
  primaryLitres: cubicMetresToLitres(result.primary),
});

export default function WaterStorageCalculatorPage() {
  const [mode, setMode] = useState<Mode>("rainwater");
  const [site, setSite] = useState<GeographicPoint | null>(null);
  const [coordinateX, setCoordinateX] = useState("");
  const [coordinateY, setCoordinateY] = useState("");
  const [coordinateZ, setCoordinateZ] = useState("");
  const [coordinateError, setCoordinateError] = useState<string | null>(null);
  const [catchmentPolygon, setCatchmentPolygon] = useState<GeographicPoint[]>([]);
  const [catchmentArea, setCatchmentArea] = useState("100");
  const [catchmentAreaSource, setCatchmentAreaSource] = useState<"manual" | "map">("manual");

  const [rainfall, setRainfall] = useState("");
  const [rainfallMode, setRainfallMode] = useState<"automatic" | "manual">("automatic");
  const [rainfallData, setRainfallData] = useState<RainfallData | null>(null);
  const [rainfallLoading, setRainfallLoading] = useState(false);
  const [rainfallError, setRainfallError] = useState<string | null>(null);
  const [runoff, setRunoff] = useState("0.85");
  const [collectionEfficiency, setCollectionEfficiency] = useState("90");
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

  useEffect(() => {
    if (!site || rainfallMode !== "automatic") {
      setRainfallLoading(false);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    async function loadRainfall() {
      setRainfallLoading(true);
      setRainfallError(null);
      try {
        const query = new URLSearchParams({
          latitude: String(site!.latitude),
          longitude: String(site!.longitude),
        });
        const response = await fetch(`/api/climate/rainfall?${query.toString()}`, {
          signal: controller.signal,
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || "Rainfall data could not be retrieved.");
        }
        if (cancelled) return;
        const data = payload as RainfallData;
        setRainfallData(data);
        setRainfall(String(data.annualRainfallMm));
        setRainfallError(null);
      } catch (error) {
        if (cancelled || (error instanceof Error && error.name === "AbortError")) return;
        setRainfallError(
          error instanceof Error
            ? error.message
            : "Rainfall data could not be retrieved. Enter a known annual rainfall value manually."
        );
      } finally {
        if (!cancelled) setRainfallLoading(false);
      }
    }

    void loadRainfall();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [site, rainfallMode]);

  const calculation = useMemo<Calculation>(() => {
    try {
      const value = (input: string, label: string) => parseFiniteInput(input, label);

      if (mode === "rainwater") {
        if (!rainfall.trim()) {
          return {
            message: "Select a site on the map to retrieve rainfall, or enter annual rainfall manually.",
          };
        }
        const result = calculateAnnualRainwaterSizing({
          rainfallMm: value(rainfall, "Annual rainfall"),
          catchmentAreaM2: value(catchmentArea, "Catchment area"),
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
              { id: "annual-harvest", label: "Annual harvest potential", value: `${fmt(result.annualInflowM3)} m³/year` },
              { id: "daily-demand", label: "Daily demand", value: `${fmt(result.dailyDemandLitres, 0)} L/day` },
              { id: "dry-period-demand", label: "Dry-period demand", value: `${fmt(result.dryPeriodDemandM3)} m³` },
              {
                id: "annual-inflow-storage-ratio",
                label: "Annual inflow / storage ratio",
                value: result.annualInflowToStorageRatio === null ? "—" : `${fmt(result.annualInflowToStorageRatio)}×`,
              },
            ],
            note: "Annual harvest is a potential estimate. Recommended storage is based on entered dry-period demand and safety allowance, not a daily rainfall simulation.",
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
              ? "Production uses pump-rated discharge as an estimate because actual operating discharge was not entered. Sustainable borehole yield remains a separate limiting input."
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
            note: "ETo and effective rainfall are manual inputs. Irrigation climate-data integration is not included in this update.",
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
          ? calculateTankCapacity({ ...tankInputs, shape, diameterM: value(diameter, "Tank diameter") })
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
            { id: "tank-type", label: "Tank type", value: shape === "cylindrical" ? "Vertical cylindrical tank" : "Rectangular tank" },
          ],
        }),
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Check the entered values and try again.",
      };
    }
  }, [
    mode, catchmentArea, rainfall, runoff, collectionEfficiency, people, demand, dryDays,
    safety, boreholeYield, pumpRatedDischarge, actualDischarge, pumpHours, pumpDemand,
    reserveDays, area, eto, kc, effectiveRain, efficiency, interval, shape, diameter,
    height, length, width, freeboardHeight, deadStorage,
  ]);

  const field = (
    label: string,
    value: string,
    setter: (value: string) => void,
    unit: string,
    options?: { step?: string; min?: string; max?: string; hint?: string }
  ) => (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-sm font-semibold text-slate-800">{label}</span>
      <div className="flex min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
        <input
          type="number"
          min={options?.min ?? "0"}
          max={options?.max}
          step={options?.step ?? "any"}
          value={value}
          onChange={(event) => setter(event.target.value)}
          className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm text-slate-900 outline-none"
        />
        <span className="flex shrink-0 items-center border-l border-slate-200 bg-slate-50 px-3 text-xs text-slate-500">{unit}</span>
      </div>
      {options?.hint && <span className="mt-1 block text-xs leading-5 text-slate-500">{options.hint}</span>}
    </label>
  );

  const selectSite = (point: GeographicPoint) => {
    setSite(point);
    setCoordinateX(String(point.longitude));
    setCoordinateY(String(point.latitude));
    setCoordinateError(null);
    setRainfall("");
    setRainfallMode("automatic");
    setRainfallData(null);
    setRainfallError(null);
  };

  const applyCoordinates = () => {
    try {
      const coordinates = parseSiteCoordinates(coordinateX, coordinateY, coordinateZ);
      setCoordinateError(null);
      selectSite({ latitude: coordinates.latitude, longitude: coordinates.longitude });
    } catch (error) {
      setCoordinateError(error instanceof Error ? error.message : "Enter valid X, Y, and Z coordinates.");
    }
  };

  const calculatedResult = calculation.result;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        <Link
          href="/tools/gis"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
        >
          <ArrowLeft size={16} />
          Back to GIS Tools
        </Link>

        <header className="mt-6 border-b border-slate-200 pb-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">YAJU Hydrology Tools</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">WATER STORAGE CALCULATOR</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
            Estimate rainwater harvesting, borehole supply, irrigation storage and tank capacity.
            Select a project site to load a rainfall estimate, or enter your own verified value.
          </p>
        </header>

        <nav className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Calculator mode">
          {MODES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              aria-pressed={mode === id}
              className={`flex min-h-14 items-center justify-center gap-2 rounded-xl border px-3 py-3 text-left text-sm font-semibold transition ${mode === id
                ? "border-blue-700 bg-blue-700 text-white shadow-sm"
                : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50"}`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(370px,0.92fr)_minmax(520px,1.08fr)]">
          <section className="min-w-0 space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">Design parameters</h2>
                  <p className="mt-1 text-xs text-slate-500">Enter or confirm the values used in the calculation.</p>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Inputs</span>
              </div>

              <section className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4" aria-labelledby="site-coordinate-heading">
                <div className="mb-3">
                  <h3 id="site-coordinate-heading" className="text-sm font-bold text-slate-900">Site coordinates (X, Y, Z)</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    X is longitude and Y is latitude in WGS 84 decimal degrees. Z is optional elevation in metres. Its vertical datum is not specified, and current calculations use X/Y only.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {field("X — Longitude", coordinateX, setCoordinateX, "°", { min: "-180", max: "180", hint: "West is negative; east is positive." })}
                  {field("Y — Latitude", coordinateY, setCoordinateY, "°", { min: "-90", max: "90", hint: "South is negative; north is positive." })}
                  {field("Z — Elevation (optional)", coordinateZ, setCoordinateZ, "m", { min: "-12000", hint: "Enter elevation in metres if known." })}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={applyCoordinates}
                    className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
                  >
                    Use site coordinates
                  </button>
                  {site && (
                    <span className="text-xs text-slate-600">
                      Map site: X {site.longitude.toFixed(5)}°, Y {site.latitude.toFixed(5)}°
                    </span>
                  )}
                </div>
                {coordinateError && <p role="alert" className="mt-2 text-sm text-rose-700">{coordinateError}</p>}
              </section>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {mode === "rainwater" && (
                  <>
                    {field("Catchment area (roof or land polygon)", catchmentArea, (value) => {
                      setCatchmentArea(value);
                      setCatchmentAreaSource("manual");
                    }, "m²", {
                      min: "0.01",
                      hint: catchmentAreaSource === "map"
                        ? "Calculated from the polygon drawn on the map. You can edit this value."
                        : "Enter the catchment area manually, or draw its boundary polygon on the map.",
                    })}
                    {field("Annual rainfall", rainfall, (value) => {
                      setRainfall(value);
                      setRainfallMode("manual");
                    }, "mm/year", {
                      hint: rainfallMode === "automatic"
                        ? "Filled from NASA POWER after a site is selected. Editable at any time."
                        : "Manual value. Use a verified annual total for the project location.",
                    })}
                    {field("Runoff coefficient", runoff, setRunoff, "0–1", {
                      min: "0",
                      max: "1",
                      hint: "Represents the share of rainfall converted to catchment runoff. Adjust for catchment surface type and condition.",
                    })}
                    {field("Collection efficiency", collectionEfficiency, setCollectionEfficiency, "%", {
                      min: "0.01",
                      max: "100",
                      hint: "Editable 90% planning assumption for conveyance and first-flush/storage losses. Avoid double-counting losses in the runoff coefficient.",
                    })}
                    {field("Number of users", people, setPeople, "people", { step: "1", min: "0" })}
                    {field("Daily water demand per person", demand, setDemand, "L/person/day")}
                    {field("Dry period", dryDays, setDryDays, "days", { step: "1" })}
                    {field("Storage safety allowance", safety, setSafety, "%")}
                  </>
                )}

                {mode === "pump" && (
                  <>
                    {field("Measured sustainable borehole yield", boreholeYield, setBoreholeYield, "m³/hour")}
                    {field("Pump-rated discharge", pumpRatedDischarge, setPumpRatedDischarge, "m³/hour")}
                    {field("Actual operating discharge (optional)", actualDischarge, setActualDischarge, "m³/hour")}
                    {field("Pumping hours per day", pumpHours, setPumpHours, "hours/day", { min: "0", max: "24" })}
                    {field("Daily water demand", pumpDemand, setPumpDemand, "m³/day")}
                    {field("Reserve storage period", reserveDays, setReserveDays, "days")}
                  </>
                )}

                {mode === "irrigation" && (
                  <>
                    {field("Irrigated area", area, setArea, "ha", { min: "0.01" })}
                    {field("Reference evapotranspiration (ETo)", eto, setEto, "mm/day")}
                    {field("Crop coefficient (Kc)", kc, setKc, "Kc")}
                    {field("Effective rainfall", effectiveRain, setEffectiveRain, "mm/day")}
                    {field("Irrigation efficiency", efficiency, setEfficiency, "%", { min: "0.01", max: "100" })}
                    {field("Irrigation interval", interval, setInterval, "days", { min: "0.01" })}
                  </>
                )}

                {mode === "dimensions" && (
                  <>
                    <label className="block sm:col-span-2">
                      <span className="mb-1.5 block text-sm font-semibold text-slate-800">Tank geometry</span>
                      <select
                        value={shape}
                        onChange={(event) => setShape(event.target.value as "cylindrical" | "rectangular")}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="cylindrical">Vertical cylindrical tank</option>
                        <option value="rectangular">Rectangular tank</option>
                      </select>
                    </label>
                    {shape === "cylindrical"
                      ? field("Tank diameter", diameter, setDiameter, "m", { min: "0.01" })
                      : <>
                          {field("Tank length", length, setLength, "m", { min: "0.01" })}
                          {field("Tank width", width, setWidth, "m", { min: "0.01" })}
                        </>}
                    {field("Tank height", height, setHeight, "m", { min: "0.01" })}
                    {field("Freeboard height", freeboardHeight, setFreeboardHeight, "m")}
                    {field("Dead storage", deadStorage, setDeadStorage, "m³")}
                  </>
                )}
              </div>

              {mode === "rainwater" && (
                <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-xs leading-5 text-blue-950">
                  <div className="flex items-center gap-2 font-semibold">
                    <CloudRain size={15} />
                    Rainfall data
                    {rainfallLoading && <span className="font-normal text-blue-700">Loading estimate…</span>}
                    {!rainfallLoading && rainfallData && rainfallMode === "automatic" && (
                      <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-green-700">AUTO</span>
                    )}
                    {rainfallMode === "manual" && (
                      <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600">MANUAL</span>
                    )}
                  </div>
                  {rainfallError && <p role="alert" className="mt-2 text-rose-700">{rainfallError}</p>}
                  {!site && !rainfallData && (
                    <p className="mt-2">Choose a site on the map to request a rainfall estimate. You can still enter annual rainfall manually.</p>
                  )}
                  {rainfallData && (
                    <>
                      <p className="mt-2">
                        {rainfallData.source}, {rainfallData.parameter}; monthly climate reference {rainfallData.startYear}–{rainfallData.endYear}.
                        Selected grid: {rainfallData.dataCoordinates.latitude.toFixed(3)}°, {rainfallData.dataCoordinates.longitude.toFixed(3)}°.
                      </p>
                      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {rainfallData.monthlyRainfall.map((month) => (
                          <div key={month.monthNumber} className="rounded-lg border border-blue-100 bg-white px-2 py-2">
                            <div className="text-[10px] font-semibold text-slate-500">{month.month}</div>
                            <div className="mt-0.5 text-sm font-bold tabular-nums text-slate-900">{fmt(month.rainfallMm, 1)}</div>
                            <div className="text-[10px] text-slate-500">mm/month</div>
                          </div>
                        ))}
                      </div>
                      {rainfallMode === "manual" && (
                        <p className="mt-2 text-slate-600">NASA POWER values remain visible as a reference; your manually entered annual rainfall is used.</p>
                      )}
                      <p className="mt-2 text-[11px] text-slate-600">
                        Gridded estimate, not a rain-gauge observation. Retrieved {new Date(rainfallData.retrievedAt).toLocaleDateString("en-GB")}.
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-live="polite">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">Calculated results</h2>
                  <p className="mt-1 text-xs text-slate-500">Results update automatically when parameters change.</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Live calculation</span>
              </div>

              {calculation.message ? (
                <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                  {calculation.message}
                </p>
              ) : calculation.error ? (
                <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-800">
                  Check your inputs: {calculation.error}
                </p>
              ) : calculatedResult ? (
                <>
                  <p className="mt-5 text-sm font-medium text-slate-600">{calculatedResult.primaryLabel}</p>
                  <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-4xl font-extrabold tracking-tight text-blue-700">{fmt(calculatedResult.primary)} m³</span>
                    <span className="text-sm font-semibold text-slate-500">{fmt(calculatedResult.primaryLitres, 0)} litres</span>
                  </div>
                  <div className="mt-5 divide-y divide-slate-100 border-y border-slate-100">
                    {calculatedResult.rows.map(({ id, label, value }) => (
                      <div key={id} className="flex items-start justify-between gap-4 py-3 text-sm">
                        <span className="text-slate-600">{label}</span>
                        <strong className="text-right text-slate-900">{value}</strong>
                      </div>
                    ))}
                  </div>
                  {calculatedResult.note && <p className="mt-4 text-xs leading-5 text-slate-500">{calculatedResult.note}</p>}
                </>
              ) : null}
            </section>
          </section>

          <aside className="min-w-0 xl:sticky xl:top-24">
            <WaterStorageMapPreview
              site={site}
              catchmentPolygon={catchmentPolygon}
              catchmentAreaM2={catchmentAreaSource === "map" ? Number(catchmentArea) : null}
              onSiteSelect={selectSite}
              onCatchmentComplete={(areaM2, points) => {
                setCatchmentPolygon(points);
                setCatchmentArea(String(Number(areaM2.toFixed(1))));
                setCatchmentAreaSource("map");
              }}
              onCatchmentClear={() => {
                setCatchmentPolygon([]);
                setCatchmentAreaSource("manual");
              }}
            />

            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-xs leading-5 text-slate-600">
              <div className="flex items-center gap-2 font-semibold text-slate-800">
                <MapPinned size={15} className="text-blue-600" />
                Site and catchment summary
              </div>
              {site ? (
                <p className="mt-2">
                  Site coordinates: {site.latitude.toFixed(5)}°, {site.longitude.toFixed(5)}°.
                  {rainfallData && <> Rainfall grid point: {rainfallData.dataCoordinates.latitude.toFixed(3)}°, {rainfallData.dataCoordinates.longitude.toFixed(3)}°.</>}
                </p>
              ) : (
                <p className="mt-2">No site selected. Select “Select site” above the map, then click the project location.</p>
              )}
              <p className="mt-2">
                Catchment area: {catchmentAreaSource === "map" ? "map polygon" : "manual input"}; {catchmentArea || "not entered"} m²
                {catchmentAreaSource === "map" && Number(catchmentArea) > 0 && (
                  <> ({fmt(Number(catchmentArea) / 10_000, 4)} ha; {fmt(Number(catchmentArea) / 1_000_000, 6)} km²)</>
                )}.
              </p>
            </div>
          </aside>
        </div>

        <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-950 sm:p-5">
          <strong>Engineering and data note:</strong> This calculator provides preliminary sizing estimates. NASA POWER rainfall is a gridded climate estimate and may differ from a local rain gauge. The mapped polygon is measured as a horizontal planimetric area from its geographic vertices. For sloping roofs, this is plan area, not true roof surface area. For larger or cadastral catchments, confirm the boundary and use suitable projected survey measurements. For a natural watershed, this polygon area is only a geometric measurement; this calculator does not estimate calibrated outlet discharge. Use an appropriate rainfall-runoff model and site-specific hydrological parameters for watershed design. Rainwater sizing here uses annual rainfall and dry-period demand, not a daily rainfall-runoff simulation. Confirm site-specific inputs and applicable engineering standards before final design.
        </section>
      </div>
    </main>
  );
}
