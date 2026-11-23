"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Clipboard,
  ExternalLink,
  Map,
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";
import { recordToolActivity } from "@/lib/tools/activity";

type CrsRecord = {
  code: number;
  name: string;
  type: "Geographic" | "Projected";
  datum: string;
  projection: string;
  unit: string;
  area: string;
  scope: string;
  proj4: string;
  tags: string[];
};

const crsRecords: CrsRecord[] = [
  {
    code: 4326,
    name: "WGS 84",
    type: "Geographic",
    datum: "World Geodetic System 1984",
    projection: "Latitude / longitude",
    unit: "degree",
    area: "World",
    scope: "GPS, web mapping data exchange and global positioning.",
    proj4: "+proj=longlat +datum=WGS84 +no_defs +type=crs",
    tags: ["gps", "latitude", "longitude", "global"],
  },
  {
    code: 3857,
    name: "WGS 84 / Pseudo-Mercator",
    type: "Projected",
    datum: "World Geodetic System 1984",
    projection: "Popular Visualisation Pseudo Mercator",
    unit: "metre",
    area: "World between approximately 85 degrees south and 85 degrees north",
    scope: "Web maps and visualisation. Not recommended for precise field measurement.",
    proj4: "+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs +type=crs",
    tags: ["web mercator", "google maps", "openstreetmap", "global"],
  },
  {
    code: 32735,
    name: "WGS 84 / UTM zone 35S",
    type: "Projected",
    datum: "World Geodetic System 1984",
    projection: "Transverse Mercator, UTM zone 35 south",
    unit: "metre",
    area: "24 degrees E to 30 degrees E, southern hemisphere",
    scope: "Engineering survey, GIS and topographic mapping.",
    proj4: "+proj=utm +zone=35 +south +datum=WGS84 +units=m +no_defs +type=crs",
    tags: ["utm", "35s", "tanzania", "east africa"],
  },
  {
    code: 32736,
    name: "WGS 84 / UTM zone 36S",
    type: "Projected",
    datum: "World Geodetic System 1984",
    projection: "Transverse Mercator, UTM zone 36 south",
    unit: "metre",
    area: "30 degrees E to 36 degrees E, southern hemisphere",
    scope: "Engineering survey, GIS and topographic mapping.",
    proj4: "+proj=utm +zone=36 +south +datum=WGS84 +units=m +no_defs +type=crs",
    tags: ["utm", "36s", "tanzania", "east africa"],
  },
  {
    code: 32737,
    name: "WGS 84 / UTM zone 37S",
    type: "Projected",
    datum: "World Geodetic System 1984",
    projection: "Transverse Mercator, UTM zone 37 south",
    unit: "metre",
    area: "36 degrees E to 42 degrees E, southern hemisphere",
    scope: "Engineering survey, GIS and topographic mapping.",
    proj4: "+proj=utm +zone=37 +south +datum=WGS84 +units=m +no_defs +type=crs",
    tags: ["utm", "37s", "tanzania", "kenya", "east africa"],
  },
  {
    code: 4210,
    name: "Arc 1960",
    type: "Geographic",
    datum: "Arc 1960",
    projection: "Latitude / longitude",
    unit: "degree",
    area: "Kenya, Tanzania and Uganda",
    scope: "Legacy geodetic coordinates and mapping in East Africa.",
    proj4: "+proj=longlat +ellps=clrk80 +towgs84=-160,-6,-302,0,0,0,0 +no_defs +type=crs",
    tags: ["arc 1960", "legacy", "tanzania", "kenya", "uganda"],
  },
  {
    code: 21035,
    name: "Arc 1960 / UTM zone 35S",
    type: "Projected",
    datum: "Arc 1960",
    projection: "Transverse Mercator, UTM zone 35 south",
    unit: "metre",
    area: "Tanzania west of 30 degrees E; southern Uganda west of 30 degrees E",
    scope: "Legacy engineering survey and topographic mapping.",
    proj4: "+proj=utm +zone=35 +south +a=6378249.145 +rf=293.465 +towgs84=-160,-6,-302,0,0,0,0 +units=m +no_defs +type=crs",
    tags: ["arc 1960", "utm", "35s", "tanzania", "uganda"],
  },
  {
    code: 21036,
    name: "Arc 1960 / UTM zone 36S",
    type: "Projected",
    datum: "Arc 1960",
    projection: "Transverse Mercator, UTM zone 36 south",
    unit: "metre",
    area: "Tanzania from 30 degrees E to 36 degrees E; parts of Kenya and Uganda",
    scope: "Legacy engineering survey and topographic mapping.",
    proj4: "+proj=utm +zone=36 +south +a=6378249.145 +rf=293.465 +towgs84=-160,-6,-302,0,0,0,0 +units=m +no_defs +type=crs",
    tags: ["arc 1960", "utm", "36s", "tanzania", "kenya", "uganda"],
  },
  {
    code: 21037,
    name: "Arc 1960 / UTM zone 37S",
    type: "Projected",
    datum: "Arc 1960",
    projection: "Transverse Mercator, UTM zone 37 south",
    unit: "metre",
    area: "Tanzania east of 36 degrees E and southern Kenya east of 36 degrees E",
    scope: "Legacy engineering survey and topographic mapping.",
    proj4: "+proj=utm +zone=37 +south +a=6378249.145 +rf=293.465 +towgs84=-160,-6,-302,0,0,0,0 +units=m +no_defs +type=crs",
    tags: ["arc 1960", "utm", "37s", "tanzania", "kenya"],
  },
];

export default function EpsgCrsFinder() {
  const [query, setQuery] = useState("");
  const [selectedCode, setSelectedCode] = useState(32737);
  const [copied, setCopied] = useState<string | null>(null);

  const normalizedQuery = query.trim().toLowerCase().replace(/^epsg\s*:?\s*/, "");

  const filteredRecords = useMemo(() => {
    if (!normalizedQuery) {
      return crsRecords;
    }

    return crsRecords.filter((record) => {
      const searchable = [
        record.code,
        record.name,
        record.type,
        record.datum,
        record.area,
        ...record.tags,
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(normalizedQuery);
    });
  }, [normalizedQuery]);

  const selected =
    crsRecords.find((record) => record.code === selectedCode) ?? crsRecords[0];

  async function copyValue(label: string, value: string) {
    await navigator.clipboard.writeText(value);
    void recordToolActivity("epsg-crs-finder", { operation: "copy" }).catch((error) => console.error("Unable to record CRS activity:", error));
    setCopied(label);
    window.setTimeout(() => setCopied(null), 1800);
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <Link
          href="/tools/gis"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-blue-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
        >
          <ArrowLeft size={16} />
          Back to Field Tools
        </Link>

        <header className="mt-8 max-w-3xl">
          <p className="text-sm font-bold uppercase text-blue-600">YAJU Field Tools</p>
          <h1 className="mt-3 text-3xl font-bold text-gray-950 sm:text-4xl">
            EPSG / CRS Finder
          </h1>
          <p className="mt-4 text-base leading-7 text-gray-600 sm:text-lg">
            Find common coordinate reference systems used in Tanzania and East Africa,
            inspect their coverage, and copy a definition for GIS or fieldwork.
          </p>
        </header>

        <section className="mt-8">
          <label htmlFor="crs-search" className="text-sm font-semibold text-gray-800">
            Search by EPSG code, CRS name or area
          </label>
          <div className="relative mt-2 max-w-2xl">
            <Search
              size={20}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              id="crs-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Example: 32737, Arc 1960, Tanzania or UTM 36S"
              className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-12 pr-4 text-sm text-gray-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <section aria-label="CRS search results">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold text-gray-950">Coordinate systems</h2>
              <span className="text-sm text-gray-500">{filteredRecords.length} found</span>
            </div>

            <div className="space-y-3">
              {filteredRecords.map((record) => {
                const active = record.code === selected.code;

                return (
                  <button
                    key={record.code}
                    type="button"
                    onClick={() => {
                      setSelectedCode(record.code);
                      void recordToolActivity("epsg-crs-finder", { operation: "select" }).catch((error) => console.error("Unable to record CRS activity:", error));
                    }}
                    className={`w-full rounded-lg border p-4 text-left transition ${
                      active
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 bg-white hover:border-blue-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-bold text-gray-950">{record.name}</p>
                        <p className="mt-1 text-sm text-gray-600">{record.area}</p>
                      </div>
                      <span className="shrink-0 rounded-md bg-gray-900 px-2.5 py-1 font-mono text-xs font-semibold text-white">
                        EPSG:{record.code}
                      </span>
                    </div>
                  </button>
                );
              })}

              {filteredRecords.length === 0 && (
                <div className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-sm leading-6 text-gray-600">
                  This CRS is not in the focused East Africa list yet. Check the code
                  in the official EPSG record or try a broader term such as WGS 84,
                  Arc 1960 or UTM.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-mono text-sm font-bold text-blue-600">
                  EPSG:{selected.code}
                </p>
                <h2 className="mt-2 text-2xl font-bold text-gray-950">{selected.name}</h2>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Map size={22} />
              </div>
            </div>

            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              {[
                ["Type", selected.type],
                ["Unit", selected.unit],
                ["Datum", selected.datum],
                ["Projection", selected.projection],
              ].map(([label, value]) => (
                <div key={label} className="border-t border-gray-100 pt-3">
                  <dt className="text-xs font-bold uppercase text-gray-500">{label}</dt>
                  <dd className="mt-1 text-sm font-semibold text-gray-900">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-6 border-t border-gray-100 pt-4">
              <p className="text-xs font-bold uppercase text-gray-500">Area of use</p>
              <p className="mt-2 text-sm leading-6 text-gray-700">{selected.area}</p>
            </div>

            <div className="mt-4">
              <p className="text-xs font-bold uppercase text-gray-500">Best used for</p>
              <p className="mt-2 text-sm leading-6 text-gray-700">{selected.scope}</p>
            </div>

            {selected.code === 3857 && (
              <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                Web Mercator is designed for web display. Use a suitable local projected
                CRS when accurate distance or area measurement matters.
              </p>
            )}

            <div className="mt-6">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase text-gray-500">PROJ definition</p>
                <button
                  type="button"
                  onClick={() => copyValue("proj4", selected.proj4)}
                  className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-200"
                >
                  {copied === "proj4" ? <Check size={15} /> : <Clipboard size={15} />}
                  {copied === "proj4" ? "Copied" : "Copy"}
                </button>
              </div>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-gray-950 p-4 text-xs leading-6 text-gray-100">
                {selected.proj4}
              </pre>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => copyValue("epsg", `EPSG:${selected.code}`)}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                {copied === "epsg" ? <Check size={16} /> : <Clipboard size={16} />}
                {copied === "epsg" ? "EPSG copied" : "Copy EPSG code"}
              </button>
              <Link
                href="/tools/coordinates-converter"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 transition hover:border-blue-300 hover:text-blue-700"
              >
                Open Coordinates Converter
              </Link>
              <a
                href={`https://epsg.io/${selected.code}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 transition hover:border-blue-300 hover:text-blue-700"
              >
                Official record
                <ExternalLink size={16} />
              </a>
            </div>
          </section>
        </div>

        <p className="mt-8 max-w-3xl text-xs leading-5 text-gray-500">
          CRS selection affects measurement accuracy. Confirm the datum, zone and area
          of use supplied with your survey or source dataset before transforming
          coordinates.
        </p>
      </div>
    </main>
  );
}
