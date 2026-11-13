"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Crosshair, MapPinned, PencilRuler, RotateCcw, Trash2 } from "lucide-react";
import {
  calculateSphericalPolygonAreaM2,
  type GeographicPoint,
} from "@/features/hydrology/domain/geometry";

type InteractionMode = "site" | "roof" | null;

type Props = {
  site: GeographicPoint | null;
  roofPolygon: GeographicPoint[];
  roofAreaM2: number | null;
  onSiteSelect: (point: GeographicPoint) => void;
  onRoofComplete: (areaM2: number, points: GeographicPoint[]) => void;
  onRoofClear: () => void;
};

export default function WaterStorageMapPreview({
  site,
  roofPolygon,
  roofAreaM2,
  onSiteSelect,
  onRoofComplete,
  onRoofClear,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const layerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const modeRef = useRef<InteractionMode>(null);
  const siteSelectRef = useRef(onSiteSelect);
  const [mapReady, setMapReady] = useState(false);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>(null);
  const [draftPoints, setDraftPoints] = useState<GeographicPoint[]>([]);
  const [mapError, setMapError] = useState<string | null>(null);

  siteSelectRef.current = onSiteSelect;

  const setMode = (mode: InteractionMode) => {
    modeRef.current = mode;
    setInteractionMode(mode);
  };

  useEffect(() => {
    let cancelled = false;

    async function initializeMap() {
      if (!containerRef.current) return;
      try {
        const L = await import("leaflet");
        if (cancelled || !containerRef.current) return;

        leafletRef.current = L;
        const map = L.map(containerRef.current, {
          scrollWheelZoom: true,
          doubleClickZoom: true,
        }).setView([-6.5, 35.5], 6);

        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
        }).addTo(map);

        const layers = L.layerGroup().addTo(map);
        map.on("click", (event) => {
          const point = {
            latitude: event.latlng.lat,
            longitude: event.latlng.lng,
          };
          if (modeRef.current === "site") {
            siteSelectRef.current(point);
            modeRef.current = null;
            setInteractionMode(null);
          } else if (modeRef.current === "roof") {
            setDraftPoints((current) => [...current, point]);
          }
        });

        mapRef.current = map;
        layerRef.current = layers;
        setMapReady(true);
        window.setTimeout(() => map.invalidateSize(), 0);
      } catch {
        if (!cancelled) {
          setMapError("The map could not be loaded. Check your internet connection and reload this page.");
        }
      }
    }

    void initializeMap();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
      leafletRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    if (interactionMode === "roof") map.doubleClickZoom.disable();
    else map.doubleClickZoom.enable();
  }, [interactionMode, mapReady]);

  useEffect(() => {
    const L = leafletRef.current;
    const layers = layerRef.current;
    if (!mapReady || !L || !layers) return;

    layers.clearLayers();

    if (site) {
      L.circleMarker([site.latitude, site.longitude], {
        radius: 8,
        color: "#ffffff",
        weight: 3,
        fillColor: "#2563eb",
        fillOpacity: 1,
      }).bindPopup("Selected project site").addTo(layers);
    }

    if (roofPolygon.length >= 3) {
      L.polygon(
        roofPolygon.map((point) => [point.latitude, point.longitude] as [number, number]),
        { color: "#0f766e", weight: 2, fillColor: "#14b8a6", fillOpacity: 0.22 }
      ).bindPopup("Roof footprint").addTo(layers);
    }

    if (draftPoints.length > 0) {
      draftPoints.forEach((point, index) => {
        L.circleMarker([point.latitude, point.longitude], {
          radius: 4,
          color: "#ffffff",
          weight: 2,
          fillColor: "#0f766e",
          fillOpacity: 1,
        }).bindTooltip(`Vertex ${index + 1}`).addTo(layers);
      });
      if (draftPoints.length > 1) {
        L.polyline(
          draftPoints.map((point) => [point.latitude, point.longitude] as [number, number]),
          { color: "#0f766e", weight: 2, dashArray: "5 5" }
        ).addTo(layers);
      }
    }
  }, [site, roofPolygon, draftPoints, mapReady]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    if (site) {
      mapRef.current.setView([site.latitude, site.longitude], Math.max(mapRef.current.getZoom(), 12), { animate: true });
    }
  }, [site, mapReady]);

  const finishRoof = () => {
    if (draftPoints.length < 3) return;
    try {
      const areaM2 = calculateSphericalPolygonAreaM2(draftPoints);
      onRoofComplete(areaM2, draftPoints);
      setDraftPoints([]);
      setMode(null);
      setMapError(null);
    } catch (error) {
      setMapError(error instanceof Error ? error.message : "The roof outline is invalid.");
    }
  };

  const cancelDrawing = () => {
    setDraftPoints([]);
    setMode(null);
    setMapError(null);
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.12em] text-slate-900">
            <MapPinned size={17} className="text-blue-600" />
            Map Preview
          </div>
          <p className="mt-1 text-xs text-slate-500">Choose the project site and outline the roof footprint</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {interactionMode === "site"
            ? "Click map to select site"
            : interactionMode === "roof"
              ? `${draftPoints.length} roof vertices`
              : site
                ? "Site selected"
                : "No site selected"}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-100 px-4 py-3">
        <button
          type="button"
          onClick={() => setMode(interactionMode === "site" ? null : "site")}
          aria-pressed={interactionMode === "site"}
          className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition ${interactionMode === "site" ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-blue-400"}`}
        >
          <Crosshair size={16} />
          Select site
        </button>
        <button
          type="button"
          onClick={() => {
            setMapError(null);
            setDraftPoints([]);
            setMode(interactionMode === "roof" ? null : "roof");
          }}
          aria-pressed={interactionMode === "roof"}
          className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition ${interactionMode === "roof" ? "border-teal-700 bg-teal-700 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-teal-500"}`}
        >
          <PencilRuler size={16} />
          Draw roof area
        </button>
        {interactionMode === "roof" && (
          <>
            <button
              type="button"
              onClick={finishRoof}
              disabled={draftPoints.length < 3}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Check size={16} />
              Finish outline
            </button>
            <button
              type="button"
              onClick={cancelDrawing}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
            >
              <RotateCcw size={15} />
              Cancel
            </button>
          </>
        )}
        {roofPolygon.length > 0 && interactionMode !== "roof" && (
          <button
            type="button"
            onClick={onRoofClear}
            className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
          >
            <Trash2 size={15} />
            Clear outline
          </button>
        )}
      </div>

      <div ref={containerRef} className="h-[430px] w-full bg-slate-100 md:h-[540px]" aria-label="Map to select site and draw roof footprint" />

      <div className="space-y-2 border-t border-slate-100 px-4 py-3 text-xs text-slate-600">
        {mapError && <p role="alert" className="rounded-lg bg-rose-50 p-2 text-rose-700">{mapError}</p>}
        {interactionMode === "site" && <p>Click once at the project site. Rainfall data will be requested for that location.</p>}
        {interactionMode === "roof" && <p>Click each roof corner in sequence, then choose “Finish outline”. Use at least three vertices. Double-click zoom is disabled while drawing.</p>}
        {site ? (
          <p className="font-medium text-slate-700">Selected site: {site.latitude.toFixed(5)}°, {site.longitude.toFixed(5)}°</p>
        ) : (
          <p>Select a site to retrieve rainfall. Rainfall can also be entered manually.</p>
        )}
        {roofAreaM2 !== null && roofAreaM2 > 0 && (
          <p className="font-semibold text-teal-800">Outlined roof plan area: {roofAreaM2.toLocaleString("en-US", { maximumFractionDigits: 1 })} m²</p>
        )}
        <p className="text-[11px] leading-5 text-slate-400">Map tiles © OpenStreetMap contributors. An internet connection is required to display the map.</p>
      </div>
    </section>
  );
}
