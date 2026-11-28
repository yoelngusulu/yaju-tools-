"use client";

import Link from "next/link";
import proj4 from "proj4";
import { ArrowLeft, Clipboard, Compass, Download, RefreshCw, Upload } from "lucide-react";
import type { ChangeEvent } from "react";
import { useMemo, useState } from "react";
import { recordToolActivity } from "@/lib/tools/activity";

type Format = "decimal" | "dms" | "utm";
type Hemisphere = "N" | "S";
type Point = { latitude: number; longitude: number; label: string };

const EARTH_RADIUS_METERS = 6371008.8;
const CSV_MAX_FILE_SIZE = 5 * 1024 * 1024;
const WGS84 = "+proj=longlat +datum=WGS84 +no_defs";
const ACCEPTED_COLUMNS_MESSAGE =
  "CSV columns accepted: Latitude/Longitude, Lat/Lng, Easting/Northing, E/N, or X/Y.";

const formats = [
  { key: "decimal" as const, label: "Decimal", help: "Latitude, Longitude", placeholder: "Latitude, Longitude" },
  { key: "dms" as const, label: "DMS", help: "Latitude DMS, Longitude DMS", placeholder: "Lat DMS, Long DMS" },
  { key: "utm" as const, label: "UTM", help: "Easting, Northing", placeholder: "Easting, Northing" },
];

function toRad(value: number) {
  return (value * Math.PI) / 180;
}

function toDeg(value: number) {
  return (value * 180) / Math.PI;
}

function wrap360(value: number) {
  return ((value % 360) + 360) % 360;
}

function parseNum(value: string) {
  const number = Number(value.trim().replace(",", "."));
  return Number.isFinite(number) ? number : null;
}

function numbers(text: string) {
  return (text.match(/[-+]?\d+(?:[.,]\d+)?/g) || [])
    .map(parseNum)
    .filter((value): value is number => value !== null);
}

function validate(latitude: number, longitude: number, line: number) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return `Line ${line}: latitude and longitude must be valid numbers.`;
  }

  if (latitude < -90 || latitude > 90) {
    return `Line ${line}: latitude must be between -90 and 90.`;
  }

  if (longitude < -180 || longitude > 180) {
    return `Line ${line}: longitude must be between -180 and 180.`;
  }

  return null;
}

function parseDecimal(lineText: string, line: number) {
  const values = lineText
    .split(/[\s,;|]+/)
    .map(parseNum)
    .filter((value): value is number => value !== null);

  if (values.length < 2) {
    return { point: null, error: `Line ${line}: enter latitude and longitude.` };
  }

  const latitude = values[0];
  const longitude = values[1];
  const error = validate(latitude, longitude, line);
  return error ? { point: null, error } : { point: { latitude, longitude }, error: null };
}

function dmsValue(text: string, axis: "lat" | "lng", line: number) {
  const values = numbers(text);
  const direction = text.toUpperCase().match(axis === "lat" ? /[NS]/ : /[EW]/)?.[0] || null;

  if (values.length < 1) {
    return { value: null, error: `Line ${line}: missing ${axis === "lat" ? "latitude" : "longitude"} DMS values.` };
  }

  const degrees = values[0];
  const minutes = values[1] ?? 0;
  const seconds = values[2] ?? 0;

  if (minutes < 0 || minutes >= 60 || seconds < 0 || seconds >= 60) {
    return { value: null, error: `Line ${line}: DMS minutes and seconds must be between 0 and 59.` };
  }

  let decimal = Math.abs(degrees) + minutes / 60 + seconds / 3600;

  if (direction === "S" || direction === "W" || (!direction && degrees < 0)) {
    decimal = -decimal;
  }

  const error = axis === "lat" ? validate(decimal, 0, line) : validate(0, decimal, line);
  return error ? { value: null, error } : { value: decimal, error: null };
}

function parseDms(lineText: string, line: number) {
  const semicolonParts = lineText.split(/[;|]/).map((part) => part.trim()).filter(Boolean);
  const commaParts = lineText.split(",").map((part) => part.trim()).filter(Boolean);
  const parts = semicolonParts.length >= 2 ? semicolonParts : commaParts.length === 2 ? commaParts : [];

  if (parts.length >= 2) {
    const latitude = dmsValue(parts[0], "lat", line);
    const longitude = dmsValue(parts[1], "lng", line);

    if (latitude.error || longitude.error) {
      return { point: null, error: latitude.error || longitude.error };
    }

    return { point: { latitude: latitude.value as number, longitude: longitude.value as number }, error: null };
  }

  const values = numbers(lineText);

  if (values.length < 6) {
    return { point: null, error: `Line ${line}: enter DMS as latitude degrees minutes seconds and longitude degrees minutes seconds.` };
  }

  const upper = lineText.toUpperCase();
  const latDir = upper.match(/[NS]/)?.[0] || "";
  const lngDir = upper.match(/[EW]/)?.[0] || "";
  const latitude = dmsValue(`${values[0]} ${values[1]} ${values[2]} ${latDir}`, "lat", line);
  const longitude = dmsValue(`${values[3]} ${values[4]} ${values[5]} ${lngDir}`, "lng", line);

  if (latitude.error || longitude.error) {
    return { point: null, error: latitude.error || longitude.error };
  }

  return { point: { latitude: latitude.value as number, longitude: longitude.value as number }, error: null };
}

function parseUtm(lineText: string, line: number, zone: number, hemisphere: Hemisphere) {
  const values = numbers(lineText);

  if (values.length < 2) {
    return { point: null, error: `Line ${line}: enter UTM easting and northing.` };
  }

  let easting = values[0];
  let northing = values[1];
  let activeZone = zone;
  let activeHemisphere = hemisphere;
  const leadingZone = lineText.trim().match(/^(\d{1,2})\s*([NS])?\b/i);

  if (values.length >= 3 && leadingZone && Number(leadingZone[1]) === values[0] && values[0] >= 1 && values[0] <= 60) {
    activeZone = Math.round(values[0]);
    easting = values[1];
    northing = values[2];

    if (leadingZone[2]) {
      activeHemisphere = leadingZone[2].toUpperCase() as Hemisphere;
    }
  } else if (values.length >= 3 && values[2] >= 1 && values[2] <= 60) {
    activeZone = Math.round(values[2]);
  }

  const zoneHemisphere = lineText.match(/\b([1-5]?\d|60)\s*([NS])\b/i);

  if (zoneHemisphere) {
    activeZone = Math.round(Number(zoneHemisphere[1]));
    activeHemisphere = zoneHemisphere[2].toUpperCase() as Hemisphere;
  }

  if (activeZone < 1 || activeZone > 60) {
    return { point: null, error: `Line ${line}: UTM zone must be between 1 and 60.` };
  }

  if (easting < 100000 || easting > 900000) {
    return { point: null, error: `Line ${line}: easting is outside the normal UTM range. Use easting, northing order.` };
  }

  if (northing < 0 || northing > 10000000) {
    return { point: null, error: `Line ${line}: northing is outside the normal UTM range.` };
  }

  try {
    const south = activeHemisphere === "S" ? " +south" : "";
    const source = `+proj=utm +zone=${activeZone}${south} +datum=WGS84 +units=m +no_defs`;
    const result = proj4(source, WGS84, [easting, northing]) as [number, number];
    const point = { longitude: result[0], latitude: result[1] };
    const error = validate(point.latitude, point.longitude, line);
    return error ? { point: null, error } : { point, error: null };
  } catch {
    return { point: null, error: `Line ${line}: unable to convert UTM coordinates.` };
  }
}

function parseCoordinates(text: string, format: Format, zone: number, hemisphere: Hemisphere) {
  const points: Point[] = [];
  const errors: string[] = [];
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  lines.forEach((lineText, index) => {
    const line = index + 1;
    const result =
      format === "dms"
        ? parseDms(lineText, line)
        : format === "utm"
          ? parseUtm(lineText, line, zone, hemisphere)
          : parseDecimal(lineText, line);

    if (result.error || !result.point) {
      errors.push(result.error || `Line ${line}: invalid coordinate.`);
      return;
    }

    points.push({ ...result.point, label: `Point ${points.length + 1}` });
  });

  return { points, errors };
}

function normalizeHeader(header: string) {
  return header.replace(/^\uFEFF/, "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findColumn(headers: string[], names: string[]) {
  const normalized = headers.map(normalizeHeader);

  for (const name of names) {
    const index = normalized.indexOf(normalizeHeader(name));

    if (index !== -1) {
      return index;
    }
  }

  return null;
}

function splitCsvLine(line: string, delimiter: string) {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      quoted = !quoted;
      continue;
    }

    if (character === delimiter && !quoted) {
      cells.push(cell.trim());
      cell = "";
      continue;
    }

    cell += character;
  }

  cells.push(cell.trim());
  return cells;
}

function parseCsv(text: string) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());

  if (lines.length < 2) {
    return { text: "", format: "decimal" as Format, count: 0, error: "CSV must include a header row and coordinate rows." };
  }

  const delimiter = [",", ";", "\t", "|"].reduce((best, candidate) =>
    (lines[0].split(candidate).length > lines[0].split(best).length ? candidate : best)
  );
  const headers = splitCsvLine(lines[0], delimiter);
  const rows = lines.slice(1).map((line) => splitCsvLine(line, delimiter));
  const easting = findColumn(headers, ["easting", "east", "e", "x", "east_x", "eastx", "utm_easting"]);
  const northing = findColumn(headers, ["northing", "north", "n", "y", "north_y", "northy", "utm_northing"]);

  if (easting !== null && northing !== null) {
    const zone = findColumn(headers, ["zone", "utm_zone", "utmzone"]);
    const hemi = findColumn(headers, ["hemisphere", "hemi", "utm_hemisphere", "band"]);
    const csvText = rows
      .map((row) => [row[easting], row[northing], zone !== null ? row[zone] : "", hemi !== null ? row[hemi] : ""].filter(Boolean).join(", "))
      .filter(Boolean)
      .join("\n");
    return { text: csvText, format: "utm" as Format, count: csvText ? csvText.split("\n").length : 0, error: csvText ? null : "No valid UTM rows were found." };
  }

  const lat = findColumn(headers, ["latitude", "lat"]);
  const lng = findColumn(headers, ["longitude", "lng", "lon", "long"]);

  if (lat !== null && lng !== null) {
    const hasDms = rows.some((row) => /[NSWE°º'"]/.test(`${row[lat]} ${row[lng]}`));
    const csvText = rows
      .map((row) => `${row[lat] || ""}${hasDms ? ";" : ","} ${row[lng] || ""}`)
      .filter((row) => row.trim() !== (hasDms ? ";" : ","))
      .join("\n");
    return { text: csvText, format: hasDms ? "dms" as Format : "decimal" as Format, count: csvText ? csvText.split("\n").length : 0, error: csvText ? null : "No valid coordinate rows were found." };
  }

  return {
    text: "",
    format: "decimal" as Format,
    count: 0,
    error: ACCEPTED_COLUMNS_MESSAGE,
  };
}

function distanceMeters(start: Point, end: Point) {
  const latDelta = toRad(end.latitude - start.latitude);
  const lngDelta = toRad(end.longitude - start.longitude);
  const a = Math.sin(latDelta / 2) ** 2 + Math.cos(toRad(start.latitude)) * Math.cos(toRad(end.latitude)) * Math.sin(lngDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function bearingDegrees(start: Point, end: Point) {
  const lat1 = toRad(start.latitude);
  const lat2 = toRad(end.latitude);
  const lngDelta = toRad(end.longitude - start.longitude);
  const y = Math.sin(lngDelta) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lngDelta);
  return wrap360(toDeg(Math.atan2(y, x)));
}

function direction(value: number) {
  const names = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return names[Math.round(value / 22.5) % 16];
}

function formatNumber(value: number, digits = 2) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(value);
}

function formatDistance(value: number) {
  return value < 1000 ? `${formatNumber(value, 2)} m` : `${formatNumber(value / 1000, 3)} km`;
}

function formatBearing(value: number) {
  return `${formatNumber(value, 2)} deg`;
}

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${formatNumber(bytes / 1024, 1)} KB` : `${formatNumber(bytes / (1024 * 1024), 2)} MB`;
}

function escapeCsv(value: unknown) {
  const text = String(value ?? "");
  return text.includes(",") || text.includes('"') || text.includes("\n") ? `"${text.replace(/"/g, '""')}"` : text;
}

export default function BearingAzimuthCalculatorPage() {
  const [format, setFormat] = useState<Format>("decimal");
  const [coordinateText, setCoordinateText] = useState("");
  const [utmZone, setUtmZone] = useState("37");
  const [hemisphere, setHemisphere] = useState<Hemisphere>("S");
  const [fileMessage, setFileMessage] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [copyLabel, setCopyLabel] = useState("Copy Summary");

  const activeFormat = formats.find((item) => item.key === format) || formats[0];
  const zone = Math.round(Number(utmZone));
  const zoneError = format === "utm" && (!Number.isFinite(zone) || zone < 1 || zone > 60) ? "UTM zone must be between 1 and 60." : null;
  const parsed = useMemo(
    () => zoneError ? { points: [], errors: [zoneError] } : parseCoordinates(coordinateText, format, zone, hemisphere),
    [coordinateText, format, hemisphere, zone, zoneError]
  );
  const points = parsed.points;
  const segments = useMemo(
    () => points.slice(1).map((point, index) => {
      const from = points[index];
      const initial = bearingDegrees(from, point);
      return {
        from,
        to: point,
        distance: distanceMeters(from, point),
        initial,
        final: wrap360(bearingDegrees(point, from) + 180),
        reverse: wrap360(initial + 180),
      };
    }),
    [points]
  );
  const totalDistance = segments.reduce((total, item) => total + item.distance, 0);
  const firstSegment = segments[0];
  const hasResult = segments.length > 0 && parsed.errors.length === 0;
  const status = parsed.errors.length ? "Fix coordinate errors first." : hasResult ? "Bearing and azimuth results are ready." : "Enter at least two points.";

  const summary = useMemo(() => {
    const lines = [`Input format: ${activeFormat.label}`, `Points: ${points.length}`, `Segments: ${segments.length}`];

    if (segments.length > 0) {
      lines.push(`Total distance: ${formatDistance(totalDistance)}`);
      segments.forEach((segment, index) => {
        lines.push(`Segment ${index + 1}: ${segment.from.label} to ${segment.to.label}`);
        lines.push(`Initial azimuth: ${formatBearing(segment.initial)} ${direction(segment.initial)}`);
        lines.push(`Final bearing: ${formatBearing(segment.final)}`);
        lines.push(`Reverse bearing: ${formatBearing(segment.reverse)}`);
        lines.push(`Distance: ${formatDistance(segment.distance)}`);
      });
    }

    return lines;
  }, [activeFormat.label, points.length, segments, totalDistance]);

  async function handleCsvUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    setFileMessage(null);
    setFileError(null);

    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith(".csv") && !["text/csv", "text/plain", "application/vnd.ms-excel", ""].includes(file.type)) {
      setFileError("Upload a valid CSV file.");
      return;
    }

    if (file.size > CSV_MAX_FILE_SIZE) {
      setFileError(`CSV file is too large. Maximum size is ${formatSize(CSV_MAX_FILE_SIZE)}.`);
      return;
    }

    try {
      const result = parseCsv(await file.text());

      if (!result.text) {
        setFileError(result.error || ACCEPTED_COLUMNS_MESSAGE);
        return;
      }

      setFormat(result.format);
      setCoordinateText(result.text);
      setFileMessage(`Imported ${result.count} rows from ${file.name} as ${formats.find((item) => item.key === result.format)?.label || result.format}.`);
    } catch {
      setFileError("Unable to read the CSV file.");
    }
  }

  async function copySummary() {
    await navigator.clipboard.writeText(summary.join("\n"));
    void recordToolActivity("distance-area-bearing", { operation: "copy" }).catch((error) => console.error("Unable to record bearing activity:", error));
    setCopyLabel("Copied");
    window.setTimeout(() => setCopyLabel("Copy Summary"), 1500);
  }

  function downloadCsv() {
    const rows = [
      ["Segment", "From", "To", "Distance", "Initial Azimuth", "Direction", "Final Bearing", "Reverse Bearing"],
      ...segments.map((segment, index) => [
        String(index + 1),
        segment.from.label,
        segment.to.label,
        formatDistance(segment.distance),
        formatBearing(segment.initial),
        direction(segment.initial),
        formatBearing(segment.final),
        formatBearing(segment.reverse),
      ]),
    ];
    const blob = new Blob([rows.map((row) => row.map(escapeCsv).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "docmaster-bearing-azimuth.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    void recordToolActivity("distance-area-bearing", { operation: "export" }).catch((error) => console.error("Unable to record bearing activity:", error));
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/tools/gis" className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-blue-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50">
          <ArrowLeft size={16} />
          Back to GIS Tools
        </Link>

        <section className="mt-8 rounded-lg border border-gray-200 bg-white p-5 shadow-sm sm:p-6 lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold uppercase text-blue-700">
                <Compass size={14} />
                GIS Utility
              </p>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl">Bearing / Azimuth Calculator</h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600">
                Calculate initial bearing, final bearing, reverse bearing and distance from Decimal, DMS, UTM or CSV coordinate points.
              </p>
            </div>
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              <p className="font-semibold">Input format</p>
              <p className="mt-1">{activeFormat.help}</p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <div className="space-y-5">
              <div>
                <p className="text-sm font-semibold text-gray-800">Coordinate input type</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {formats.map((item) => (
                    <button key={item.key} type="button" onClick={() => setFormat(item.key)} className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${format === item.key ? "border-blue-600 bg-blue-600 text-white" : "border-gray-200 bg-white text-gray-700 hover:bg-blue-50"}`}>
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {format === "utm" && (
                <div className="grid gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-semibold text-gray-800">UTM Zone</span>
                    <input value={utmZone} onChange={(event) => setUtmZone(event.target.value)} className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500" />
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-gray-800">Hemisphere</span>
                    <select value={hemisphere} onChange={(event) => setHemisphere(event.target.value as Hemisphere)} className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500">
                      <option value="S">S</option>
                      <option value="N">N</option>
                    </select>
                  </label>
                </div>
              )}

              <div className="rounded-lg border border-dashed border-blue-200 bg-blue-50/50 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-bold text-gray-900">CSV bulk upload</p>
                    <p className="mt-1 text-sm leading-6 text-gray-600">Supports Latitude/Longitude, DMS text, and UTM columns like N/E or Easting/Northing.</p>
                  </div>
                  <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700">
                    <Upload size={16} />
                    Upload CSV
                    <input type="file" accept=".csv,text/csv" onChange={handleCsvUpload} className="sr-only" />
                  </label>
                </div>
                {fileMessage && <p className="mt-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{fileMessage}</p>}
                {fileError && <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{fileError}</p>}
              </div>

              <label className="block">
                <span className="text-sm font-semibold text-gray-800">Coordinates</span>
                <textarea value={coordinateText} onChange={(event) => setCoordinateText(event.target.value)} rows={9} spellCheck={false} placeholder={activeFormat.placeholder} className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 font-mono text-sm outline-none focus:border-blue-500" />
              </label>

              <button type="button" onClick={() => { setCoordinateText(""); setFileMessage(null); setFileError(null); }} className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-200">
                <RefreshCw size={16} />
                Clear
              </button>

              {parsed.errors.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  <p className="font-semibold">Coordinate errors</p>
                  <ul className="mt-2 space-y-1">{parsed.errors.map((error) => <li key={error}>{error}</li>)}</ul>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-semibold text-gray-500">Status</p>
                <p className="mt-1 font-semibold text-gray-900">{status}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"><p className="text-sm font-semibold text-gray-500">Points</p><p className="mt-2 text-3xl font-bold text-gray-950">{points.length}</p></div>
                <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"><p className="text-sm font-semibold text-gray-500">Segments</p><p className="mt-2 text-3xl font-bold text-gray-950">{segments.length}</p></div>
                <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"><p className="text-sm font-semibold text-gray-500">Total Distance</p><p className="mt-2 text-2xl font-bold text-gray-950">{segments.length ? formatDistance(totalDistance) : "-"}</p></div>
                <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"><p className="text-sm font-semibold text-gray-500">First Azimuth</p><p className="mt-2 text-2xl font-bold text-gray-950">{firstSegment ? formatBearing(firstSegment.initial) : "-"}</p>{firstSegment && <p className="mt-1 text-sm font-semibold text-blue-600">{direction(firstSegment.initial)}</p>}</div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={copySummary} disabled={!hasResult} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"><Clipboard size={16} />{copyLabel}</button>
                <button type="button" onClick={downloadCsv} disabled={!hasResult} className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"><Download size={16} />Download CSV</button>
              </div>
            </div>
          </div>

          {segments.length > 0 && (
            <div className="mt-8 overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-700"><tr><th className="px-4 py-3 font-semibold">Segment</th><th className="px-4 py-3 font-semibold">From</th><th className="px-4 py-3 font-semibold">To</th><th className="px-4 py-3 font-semibold">Distance</th><th className="px-4 py-3 font-semibold">Initial Azimuth</th><th className="px-4 py-3 font-semibold">Direction</th><th className="px-4 py-3 font-semibold">Final Bearing</th><th className="px-4 py-3 font-semibold">Reverse Bearing</th></tr></thead>
                <tbody className="divide-y divide-gray-100 bg-white text-gray-700">
                  {segments.map((segment, index) => <tr key={`${segment.from.label}-${segment.to.label}`}><td className="px-4 py-3 font-medium text-gray-900">{index + 1}</td><td className="px-4 py-3">{segment.from.label}</td><td className="px-4 py-3">{segment.to.label}</td><td className="px-4 py-3">{formatDistance(segment.distance)}</td><td className="px-4 py-3">{formatBearing(segment.initial)}</td><td className="px-4 py-3 font-semibold text-blue-600">{direction(segment.initial)}</td><td className="px-4 py-3">{formatBearing(segment.final)}</td><td className="px-4 py-3">{formatBearing(segment.reverse)}</td></tr>)}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
