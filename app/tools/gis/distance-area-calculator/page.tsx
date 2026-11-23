"use client";

import Link from "next/link";
import ToolLearningContent from "@/components/ToolLearningContent";
import proj4 from "proj4";
import type {
  LayerGroup,
  Map as LeafletMap,
} from "leaflet";
import {
  ArrowLeft,
  Clipboard,
  Download,
  RefreshCw,
  Upload,
} from "lucide-react";
import type { ChangeEvent } from "react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { recordToolActivity } from "@/lib/tools/activity";

type MeasurementMode = "distance" | "area";
type InputFormat = "decimal" | "dms" | "utm";
type CrsType = "wgs84-utm" | "arc1960-utm" | "custom";
type UtmHemisphere = "N" | "S";
type CoordinateAxis = "lat" | "lng";

type CoordinatePoint = {
  latitude: number;
  longitude: number;
  label: string;
};

type ParsedCoordinates = {
  points: CoordinatePoint[];
  errors: string[];
};

type UtmOptions = {
  crs: CrsType;
  zone: number;
  hemisphere: UtmHemisphere;
  customProj4: string;
};

type CsvImportResult = {
  text: string;
  inputFormat: InputFormat;
  importedRows: number;
  errors: string[];
};

type CsvCoordinateColumns =
  | {
      inputFormat: "decimal";
      latitudeIndex: number;
      longitudeIndex: number;
    }
  | {
      inputFormat: "dms";
      latitudeTextIndex?: number;
      longitudeTextIndex?: number;
      latitudeDegreeIndex?: number;
      latitudeMinuteIndex?: number;
      latitudeSecondIndex?: number;
      latitudeDirectionIndex?: number | null;
      longitudeDegreeIndex?: number;
      longitudeMinuteIndex?: number;
      longitudeSecondIndex?: number;
      longitudeDirectionIndex?: number | null;
    }
  | {
      inputFormat: "utm";
      eastingIndex: number;
      northingIndex: number;
      zoneIndex?: number | null;
      hemisphereIndex?: number | null;
    };

const EARTH_RADIUS_METERS = 6371008.8;
const CSV_MAX_FILE_SIZE = 5 * 1024 * 1024;

const WGS84_GEOGRAPHIC =
  "+proj=longlat +datum=WGS84 +no_defs";

const ARC1960_GEOGRAPHIC =
  "+proj=longlat +ellps=clrk80 +towgs84=-160,-6,-302,0,0,0,0 +no_defs";

const DEFAULT_CUSTOM_PROJ4 =
  "+proj=utm +zone=37 +south +datum=WGS84 +units=m +no_defs";

const inputFormats: {
  key: InputFormat;
  label: string;
}[] = [
  { key: "decimal", label: "Decimal" },
  { key: "dms", label: "DMS" },
  { key: "utm", label: "UTM" },
];

const inputFormatDetails: Record<
  InputFormat,
  {
    description: string;
    placeholder: string;
  }
> = {
  decimal: {
    description: "One pair per line: latitude, longitude.",
    placeholder: "Latitude, Longitude",
  },
  dms: {
    description:
      "One point per line: latitude DMS, longitude DMS. Use N/S and E/W where needed.",
    placeholder: "Lat DMS, Long DMS",
  },
  utm: {
    description:
      "One point per line: easting, northing. Optional zone and N/S can also be included per line.",
    placeholder: "Easting, Northing",
  },
};

const crsOptions: {
  key: CrsType;
  label: string;
}[] = [
  { key: "wgs84-utm", label: "WGS84 / UTM" },
  { key: "arc1960-utm", label: "Arc 1960 / UTM" },
  { key: "custom", label: "Custom Proj4 definition" },
];

const CSV_DECIMAL_LATITUDE_ALIASES = [
  "latitude",
  "lat",
];

const CSV_DECIMAL_LONGITUDE_ALIASES = [
  "longitude",
  "lng",
  "lon",
  "long",
];

const CSV_UTM_EASTING_ALIASES = [
  "easting",
  "east",
  "e",
  "x",
  "east_x",
  "eastx",
  "utm_easting",
  "utmeasting",
];

const CSV_UTM_NORTHING_ALIASES = [
  "northing",
  "north",
  "n",
  "y",
  "north_y",
  "northy",
  "utm_northing",
  "utmnorthing",
];

const CSV_UTM_ZONE_ALIASES = [
  "zone",
  "utm_zone",
  "utmzone",
];

const CSV_UTM_HEMISPHERE_ALIASES = [
  "hemisphere",
  "hemi",
  "utm_hemisphere",
  "utmhemisphere",
  "utm_hemi",
  "utmhemi",
  "zone_hemisphere",
  "zonehemisphere",
  "zone_hemi",
  "zonehemi",
  "band",
  "utm_band",
  "utmband",
];

const CSV_DMS_LATITUDE_TEXT_ALIASES = [
  "latitude_dms",
  "lat_dms",
  "latdms",
  "latitudedms",
];

const CSV_DMS_LONGITUDE_TEXT_ALIASES = [
  "longitude_dms",
  "lng_dms",
  "lon_dms",
  "long_dms",
  "lngdms",
  "londms",
  "longdms",
  "longitudedms",
];

const CSV_DMS_LATITUDE_DEGREE_ALIASES = [
  "lat_deg",
  "latdeg",
  "lat_degree",
  "latdegree",
  "latitude_degree",
  "latitude_degrees",
  "latitude_deg",
];

const CSV_DMS_LATITUDE_MINUTE_ALIASES = [
  "lat_min",
  "latmin",
  "lat_minute",
  "latminute",
  "latitude_minute",
  "latitude_minutes",
  "latitude_min",
];

const CSV_DMS_LATITUDE_SECOND_ALIASES = [
  "lat_sec",
  "latsec",
  "lat_second",
  "latsecond",
  "latitude_second",
  "latitude_seconds",
  "latitude_sec",
];

const CSV_DMS_LATITUDE_DIRECTION_ALIASES = [
  "lat_dir",
  "latdir",
  "lat_direction",
  "latdirection",
  "latitude_direction",
  "latitude_dir",
];

const CSV_DMS_LONGITUDE_DEGREE_ALIASES = [
  "lng_deg",
  "lngdeg",
  "lon_deg",
  "londeg",
  "long_deg",
  "longdeg",
  "lng_degree",
  "longitude_degree",
  "longitude_degrees",
  "longitude_deg",
];

const CSV_DMS_LONGITUDE_MINUTE_ALIASES = [
  "lng_min",
  "lngmin",
  "lon_min",
  "lonmin",
  "long_min",
  "longmin",
  "lng_minute",
  "longitude_minute",
  "longitude_minutes",
  "longitude_min",
];

const CSV_DMS_LONGITUDE_SECOND_ALIASES = [
  "lng_sec",
  "lngsec",
  "lon_sec",
  "lonsec",
  "long_sec",
  "longsec",
  "lng_second",
  "longitude_second",
  "longitude_seconds",
  "longitude_sec",
];

const CSV_DMS_LONGITUDE_DIRECTION_ALIASES = [
  "lng_dir",
  "lngdir",
  "lon_dir",
  "londir",
  "long_dir",
  "longdir",
  "lng_direction",
  "londirection",
  "longdirection",
  "longitude_direction",
  "longitude_dir",
];

const CSV_ACCEPTED_COLUMNS_MESSAGE =
  "CSV columns accepted: Decimal uses Latitude/Lat and Longitude/Lng/Lon/Long. UTM uses Easting/E/X and Northing/N/Y, with optional Zone and Hemisphere/Hemi. DMS uses Latitude DMS/Longitude DMS text, or LatDeg/LatMin/LatSec/LatDir plus LngDeg/LngMin/LngSec/LngDir.";

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function parseNumericToken(token: string) {
  const normalized = token.trim().replace(",", ".");

  if (!/^[-+]?\d+(?:\.\d+)?$/.test(normalized)) {
    return null;
  }

  const value = Number(normalized);

  return Number.isFinite(value) ? value : null;
}

function extractNumbers(text: string) {
  return (text.match(/[-+]?\d+(?:[.,]\d+)?/g) || [])
    .map(parseNumericToken)
    .filter((value): value is number => value !== null);
}

function validateDecimalPoint(
  latitude: number,
  longitude: number,
  lineNumber: number
) {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return `Line ${lineNumber}: latitude and longitude must be valid numbers.`;
  }

  if (latitude < -90 || latitude > 90) {
    return `Line ${lineNumber}: latitude must be between -90 and 90.`;
  }

  if (longitude < -180 || longitude > 180) {
    return `Line ${lineNumber}: longitude must be between -180 and 180.`;
  }

  return null;
}

function parseDecimalLine(line: string, lineNumber: number) {
  const values = line
    .split(/[\s,;|]+/)
    .map(parseNumericToken)
    .filter((value): value is number => value !== null);

  if (values.length < 2) {
    return {
      error: `Line ${lineNumber}: enter latitude and longitude.`,
      point: null,
    };
  }

  const latitude = values[0];
  const longitude = values[1];
  const error = validateDecimalPoint(latitude, longitude, lineNumber);

  if (error) {
    return { error, point: null };
  }

  return {
    error: null,
    point: { latitude, longitude },
  };
}

function getDmsDirection(text: string, axis: CoordinateAxis) {
  const match = text
    .toUpperCase()
    .match(axis === "lat" ? /[NS]/ : /[EW]/);

  return match ? match[0] : null;
}

function dmsComponentsToDecimal(
  degrees: number,
  minutes: number,
  seconds: number,
  direction: string | null
) {
  const absoluteDegrees = Math.abs(degrees);
  let decimal =
    absoluteDegrees + minutes / 60 + seconds / 3600;

  if (direction === "S" || direction === "W") {
    decimal = -decimal;
  } else if (!direction && degrees < 0) {
    decimal = -decimal;
  }

  return decimal;
}

function parseDmsCoordinateFromText(
  text: string,
  axis: CoordinateAxis,
  lineNumber: number
) {
  const numbers = extractNumbers(text);

  if (numbers.length < 1) {
    return {
      error: `Line ${lineNumber}: missing ${axis === "lat" ? "latitude" : "longitude"} DMS values.`,
      value: null,
    };
  }

  const degrees = numbers[0];
  const minutes = numbers[1] ?? 0;
  const seconds = numbers[2] ?? 0;

  if (minutes < 0 || minutes >= 60 || seconds < 0 || seconds >= 60) {
    return {
      error: `Line ${lineNumber}: DMS minutes and seconds must be between 0 and 59.`,
      value: null,
    };
  }

  const direction = getDmsDirection(text, axis);
  const value = dmsComponentsToDecimal(
    degrees,
    minutes,
    seconds,
    direction
  );
  const validationError =
    axis === "lat"
      ? validateDecimalPoint(value, 0, lineNumber)
      : validateDecimalPoint(0, value, lineNumber);

  if (validationError) {
    return {
      error: validationError,
      value: null,
    };
  }

  return {
    error: null,
    value,
  };
}

function parseDmsCoordinateFromValues(
  values: number[],
  startIndex: number,
  axis: CoordinateAxis,
  direction: string | null,
  lineNumber: number
) {
  const degrees = values[startIndex];
  const minutes = values[startIndex + 1];
  const seconds = values[startIndex + 2];

  if (
    degrees === undefined ||
    minutes === undefined ||
    seconds === undefined
  ) {
    return {
      error: `Line ${lineNumber}: enter degrees, minutes and seconds for both latitude and longitude.`,
      value: null,
    };
  }

  if (minutes < 0 || minutes >= 60 || seconds < 0 || seconds >= 60) {
    return {
      error: `Line ${lineNumber}: DMS minutes and seconds must be between 0 and 59.`,
      value: null,
    };
  }

  const value = dmsComponentsToDecimal(
    degrees,
    minutes,
    seconds,
    direction
  );
  const validationError =
    axis === "lat"
      ? validateDecimalPoint(value, 0, lineNumber)
      : validateDecimalPoint(0, value, lineNumber);

  if (validationError) {
    return {
      error: validationError,
      value: null,
    };
  }

  return {
    error: null,
    value,
  };
}

function parseDmsLine(line: string, lineNumber: number) {
  const semicolonParts = line
    .split(/[;|]/)
    .map((part) => part.trim())
    .filter(Boolean);

  const commaParts = line
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const coordinateParts =
    semicolonParts.length >= 2
      ? semicolonParts
      : commaParts.length >= 2
        ? commaParts
        : [];

  if (coordinateParts.length >= 2) {
    const latitudeResult = parseDmsCoordinateFromText(
      coordinateParts[0],
      "lat",
      lineNumber
    );
    const longitudeResult = parseDmsCoordinateFromText(
      coordinateParts[1],
      "lng",
      lineNumber
    );

    if (latitudeResult.error || longitudeResult.error) {
      return {
        error: latitudeResult.error || longitudeResult.error,
        point: null,
      };
    }

    return {
      error: null,
      point: {
        latitude: latitudeResult.value as number,
        longitude: longitudeResult.value as number,
      },
    };
  }

  const values = extractNumbers(line);

  if (values.length < 6) {
    return {
      error: `Line ${lineNumber}: enter DMS as latitude degrees minutes seconds and longitude degrees minutes seconds.`,
      point: null,
    };
  }

  const uppercaseLine = line.toUpperCase();
  const latitudeDirection =
    uppercaseLine.match(/[NS]/)?.[0] || null;
  const longitudeDirection =
    uppercaseLine.match(/[EW]/)?.[0] || null;

  const latitudeResult = parseDmsCoordinateFromValues(
    values,
    0,
    "lat",
    latitudeDirection,
    lineNumber
  );
  const longitudeResult = parseDmsCoordinateFromValues(
    values,
    3,
    "lng",
    longitudeDirection,
    lineNumber
  );

  if (latitudeResult.error || longitudeResult.error) {
    return {
      error: latitudeResult.error || longitudeResult.error,
      point: null,
    };
  }

  return {
    error: null,
    point: {
      latitude: latitudeResult.value as number,
      longitude: longitudeResult.value as number,
    },
  };
}

function normalizeUtmZone(value: unknown, fallback = 37) {
  const parsed =
    typeof value === "number"
      ? value
      : parseNumericToken(String(value ?? ""));

  if (parsed === null || parsed < 1 || parsed > 60) {
    return fallback;
  }

  return Math.round(parsed);
}

function getUtmZoneError(value: string) {
  const parsed = parseNumericToken(value);

  if (parsed === null || parsed < 1 || parsed > 60) {
    return "UTM zone must be between 1 and 60.";
  }

  return null;
}

function normalizeHemisphere(value: unknown): UtmHemisphere {
  const text = String(value || "").trim().toUpperCase();

  return text.startsWith("N") ? "N" : "S";
}

function getGeographicProjection(crs: CrsType) {
  return crs === "arc1960-utm"
    ? ARC1960_GEOGRAPHIC
    : WGS84_GEOGRAPHIC;
}

function getUtmProjection(
  crs: CrsType,
  zone: number,
  hemisphere: UtmHemisphere,
  customProj4: string
) {
  if (crs === "custom") {
    return customProj4.trim();
  }

  const south = hemisphere === "S" ? " +south" : "";

  if (crs === "arc1960-utm") {
    return `+proj=utm +zone=${zone}${south} +ellps=clrk80 +towgs84=-160,-6,-302,0,0,0,0 +units=m +no_defs`;
  }

  return `+proj=utm +zone=${zone}${south} +datum=WGS84 +units=m +no_defs`;
}

function utmToDecimal(
  easting: number,
  northing: number,
  options: UtmOptions
) {
  const sourceProjection = getUtmProjection(
    options.crs,
    options.zone,
    options.hemisphere,
    options.customProj4
  );
  const targetProjection = getGeographicProjection(options.crs);

  const result = proj4(sourceProjection, targetProjection, [
    easting,
    northing,
  ]) as [number, number];

  return {
    longitude: result[0],
    latitude: result[1],
  };
}

function validateUtmInput(
  easting: number,
  northing: number,
  zone: number,
  lineNumber: number
) {
  if (
    !Number.isFinite(easting) ||
    !Number.isFinite(northing)
  ) {
    return `Line ${lineNumber}: easting and northing must be valid numbers.`;
  }

  if (zone < 1 || zone > 60) {
    return `Line ${lineNumber}: UTM zone must be between 1 and 60.`;
  }

  if (easting < 100000 || easting > 900000) {
    return `Line ${lineNumber}: easting is outside the normal UTM range. Use easting, northing order.`;
  }

  if (northing < 0 || northing > 10000000) {
    return `Line ${lineNumber}: northing is outside the normal UTM range. Check hemisphere or coordinate order.`;
  }

  return null;
}

function parseUtmLine(
  line: string,
  lineNumber: number,
  options: UtmOptions
) {
  const values = extractNumbers(line);

  if (values.length < 2) {
    return {
      error: `Line ${lineNumber}: enter UTM easting and northing.`,
      point: null,
    };
  }

  const leadingZoneMatch = line
    .trim()
    .match(/^(\d{1,2})\s*([NS])?\b/i);
  const startsWithZone =
    values.length >= 3 &&
    leadingZoneMatch &&
    Number(leadingZoneMatch[1]) === values[0] &&
    values[0] >= 1 &&
    values[0] <= 60;

  let zone = options.zone;
  let hemisphere = options.hemisphere;
  let easting = values[0];
  let northing = values[1];

  if (startsWithZone) {
    zone = normalizeUtmZone(values[0], options.zone);
    easting = values[1];
    northing = values[2];

    if (leadingZoneMatch[2]) {
      hemisphere = normalizeHemisphere(leadingZoneMatch[2]);
    }
  } else if (
    values.length >= 3 &&
    values[2] >= 1 &&
    values[2] <= 60
  ) {
    zone = normalizeUtmZone(values[2], options.zone);
  }

  const zoneHemisphereMatch = line.match(
    /\b([1-5]?\d|60)\s*([NS])\b/i
  );
  const explicitHemisphere = line.match(/\b([NS])\b/i);

  if (zoneHemisphereMatch) {
    zone = normalizeUtmZone(zoneHemisphereMatch[1], zone);
    hemisphere = normalizeHemisphere(zoneHemisphereMatch[2]);
  } else if (explicitHemisphere) {
    hemisphere = normalizeHemisphere(explicitHemisphere[1]);
  }

  const utmError = validateUtmInput(
    easting,
    northing,
    zone,
    lineNumber
  );

  if (utmError) {
    return { error: utmError, point: null };
  }

  try {
    const point = utmToDecimal(easting, northing, {
      ...options,
      zone,
      hemisphere,
    });
    const coordinateError = validateDecimalPoint(
      point.latitude,
      point.longitude,
      lineNumber
    );

    if (coordinateError) {
      return { error: coordinateError, point: null };
    }

    return {
      error: null,
      point,
    };
  } catch {
    return {
      error: `Line ${lineNumber}: unable to convert UTM coordinates. Check CRS, zone and hemisphere.`,
      point: null,
    };
  }
}

function parseCoordinateText(
  text: string,
  inputFormat: InputFormat,
  utmOptions: UtmOptions
): ParsedCoordinates {
  const points: CoordinatePoint[] = [];
  const errors: string[] = [];
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (
    lines.length > 0 &&
    inputFormat === "utm" &&
    utmOptions.crs === "custom" &&
    !utmOptions.customProj4.trim()
  ) {
    return {
      points,
      errors: [
        "Enter a custom Proj4 definition before converting UTM coordinates.",
      ],
    };
  }

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const result =
      inputFormat === "dms"
        ? parseDmsLine(line, lineNumber)
        : inputFormat === "utm"
          ? parseUtmLine(line, lineNumber, utmOptions)
          : parseDecimalLine(line, lineNumber);

    if (result.error || !result.point) {
      errors.push(result.error || `Line ${lineNumber}: invalid coordinate.`);
      return;
    }

    points.push({
      ...result.point,
      label: `Point ${points.length + 1}`,
    });
  });

  return { points, errors };
}

function normalizeCsvHeader(header: string) {
  return header
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function findCsvColumn(headers: string[], aliases: string[]) {
  const normalizedHeaders = headers.map(normalizeCsvHeader);

  for (const alias of aliases) {
    const index = normalizedHeaders.indexOf(normalizeCsvHeader(alias));

    if (index !== -1) {
      return index;
    }
  }

  return null;
}

function detectDelimitedRows(text: string) {
  const delimiters = [",", ";", "\t", "|"];
  const firstDataLine =
    text
      .split(/\r?\n/)
      .find((line) => line.trim().length > 0) || "";

  const delimiter = delimiters.reduce(
    (bestDelimiter, candidate) => {
      const bestCount = countDelimiterOutsideQuotes(
        firstDataLine,
        bestDelimiter
      );
      const candidateCount = countDelimiterOutsideQuotes(
        firstDataLine,
        candidate
      );

      return candidateCount > bestCount ? candidate : bestDelimiter;
    },
    ","
  );

  return parseDelimitedRows(text, delimiter);
}

function countDelimiterOutsideQuotes(text: string, delimiter: string) {
  let count = 0;
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (character === '"') {
      if (inQuotes && text[index + 1] === '"') {
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (character === delimiter && !inQuotes) {
      count += 1;
    }
  }

  return count;
}

function parseDelimitedRows(text: string, delimiter: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (character === '"') {
      if (inQuotes && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === delimiter && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !inQuotes) {
      if (character === "\r" && text[index + 1] === "\n") {
        index += 1;
      }

      row.push(cell);

      if (!isBlankCsvRow(row)) {
        rows.push(row);
      }

      row = [];
      cell = "";
      continue;
    }

    cell += character;
  }

  row.push(cell);

  if (!isBlankCsvRow(row)) {
    rows.push(row);
  }

  return rows;
}

function isBlankCsvRow(row: string[]) {
  return row.every((cell) => !cell.trim());
}

function getCsvValue(row: string[], index?: number | null) {
  if (index === undefined || index === null) {
    return "";
  }

  return String(row[index] ?? "").trim();
}

function looksLikeDmsValue(value: string) {
  const text = value.trim();

  if (!text) {
    return false;
  }

  return (
    /[°º'"]/.test(text) ||
    /\b[NSWE]\b/i.test(text) ||
    extractNumbers(text).length >= 2
  );
}

function csvLatLngLooksLikeDms(
  rows: string[][],
  latitudeIndex: number,
  longitudeIndex: number
) {
  return rows.slice(0, 6).some((row) => {
    const latitude = getCsvValue(row, latitudeIndex);
    const longitude = getCsvValue(row, longitudeIndex);

    return looksLikeDmsValue(latitude) || looksLikeDmsValue(longitude);
  });
}

function detectCsvCoordinateColumns(
  headers: string[],
  rows: string[][]
): CsvCoordinateColumns | null {
  const eastingIndex = findCsvColumn(headers, CSV_UTM_EASTING_ALIASES);
  const northingIndex = findCsvColumn(headers, CSV_UTM_NORTHING_ALIASES);

  if (eastingIndex !== null && northingIndex !== null) {
    return {
      inputFormat: "utm",
      eastingIndex,
      northingIndex,
      zoneIndex: findCsvColumn(headers, CSV_UTM_ZONE_ALIASES),
      hemisphereIndex: findCsvColumn(
        headers,
        CSV_UTM_HEMISPHERE_ALIASES
      ),
    };
  }

  const latitudeTextIndex = findCsvColumn(
    headers,
    CSV_DMS_LATITUDE_TEXT_ALIASES
  );
  const longitudeTextIndex = findCsvColumn(
    headers,
    CSV_DMS_LONGITUDE_TEXT_ALIASES
  );

  if (latitudeTextIndex !== null && longitudeTextIndex !== null) {
    return {
      inputFormat: "dms",
      latitudeTextIndex,
      longitudeTextIndex,
    };
  }

  const latitudeDegreeIndex = findCsvColumn(
    headers,
    CSV_DMS_LATITUDE_DEGREE_ALIASES
  );
  const latitudeMinuteIndex = findCsvColumn(
    headers,
    CSV_DMS_LATITUDE_MINUTE_ALIASES
  );
  const latitudeSecondIndex = findCsvColumn(
    headers,
    CSV_DMS_LATITUDE_SECOND_ALIASES
  );
  const longitudeDegreeIndex = findCsvColumn(
    headers,
    CSV_DMS_LONGITUDE_DEGREE_ALIASES
  );
  const longitudeMinuteIndex = findCsvColumn(
    headers,
    CSV_DMS_LONGITUDE_MINUTE_ALIASES
  );
  const longitudeSecondIndex = findCsvColumn(
    headers,
    CSV_DMS_LONGITUDE_SECOND_ALIASES
  );

  if (
    latitudeDegreeIndex !== null &&
    latitudeMinuteIndex !== null &&
    latitudeSecondIndex !== null &&
    longitudeDegreeIndex !== null &&
    longitudeMinuteIndex !== null &&
    longitudeSecondIndex !== null
  ) {
    return {
      inputFormat: "dms",
      latitudeDegreeIndex,
      latitudeMinuteIndex,
      latitudeSecondIndex,
      latitudeDirectionIndex: findCsvColumn(
        headers,
        CSV_DMS_LATITUDE_DIRECTION_ALIASES
      ),
      longitudeDegreeIndex,
      longitudeMinuteIndex,
      longitudeSecondIndex,
      longitudeDirectionIndex: findCsvColumn(
        headers,
        CSV_DMS_LONGITUDE_DIRECTION_ALIASES
      ),
    };
  }

  const latitudeIndex = findCsvColumn(
    headers,
    CSV_DECIMAL_LATITUDE_ALIASES
  );
  const longitudeIndex = findCsvColumn(
    headers,
    CSV_DECIMAL_LONGITUDE_ALIASES
  );

  if (latitudeIndex !== null && longitudeIndex !== null) {
    if (csvLatLngLooksLikeDms(rows, latitudeIndex, longitudeIndex)) {
      return {
        inputFormat: "dms",
        latitudeTextIndex: latitudeIndex,
        longitudeTextIndex: longitudeIndex,
      };
    }

    return {
      inputFormat: "decimal",
      latitudeIndex,
      longitudeIndex,
    };
  }

  return null;
}

function buildCsvLine(
  row: string[],
  columns: CsvCoordinateColumns
) {
  if (columns.inputFormat === "decimal") {
    const latitude = getCsvValue(row, columns.latitudeIndex);
    const longitude = getCsvValue(row, columns.longitudeIndex);

    if (!latitude || !longitude) {
      return null;
    }

    return `${latitude}, ${longitude}`;
  }

  if (columns.inputFormat === "utm") {
    const easting = getCsvValue(row, columns.eastingIndex);
    const northing = getCsvValue(row, columns.northingIndex);
    const zone = getCsvValue(row, columns.zoneIndex);
    const hemisphere = getCsvValue(row, columns.hemisphereIndex);

    if (!easting || !northing) {
      return null;
    }

    return [easting, northing, zone, hemisphere]
      .filter(Boolean)
      .join(", ");
  }

  if (
    columns.latitudeTextIndex !== undefined &&
    columns.longitudeTextIndex !== undefined
  ) {
    const latitude = getCsvValue(row, columns.latitudeTextIndex);
    const longitude = getCsvValue(row, columns.longitudeTextIndex);

    if (!latitude || !longitude) {
      return null;
    }

    return `${latitude}; ${longitude}`;
  }

  const latitudeValues = [
    getCsvValue(row, columns.latitudeDegreeIndex),
    getCsvValue(row, columns.latitudeMinuteIndex),
    getCsvValue(row, columns.latitudeSecondIndex),
    getCsvValue(row, columns.latitudeDirectionIndex),
  ].filter(Boolean);
  const longitudeValues = [
    getCsvValue(row, columns.longitudeDegreeIndex),
    getCsvValue(row, columns.longitudeMinuteIndex),
    getCsvValue(row, columns.longitudeSecondIndex),
    getCsvValue(row, columns.longitudeDirectionIndex),
  ].filter(Boolean);

  if (latitudeValues.length < 3 || longitudeValues.length < 3) {
    return null;
  }

  return `${latitudeValues.join(" ")}; ${longitudeValues.join(" ")}`;
}

function importCoordinatesFromCsv(text: string): CsvImportResult {
  const rows = detectDelimitedRows(text);

  if (rows.length < 2) {
    return {
      text: "",
      inputFormat: "decimal",
      importedRows: 0,
      errors: [
        `CSV must include a header row and at least one coordinate row. ${CSV_ACCEPTED_COLUMNS_MESSAGE}`,
      ],
    };
  }

  const headers = rows[0];
  const dataRows = rows.slice(1).filter((row) => !isBlankCsvRow(row));
  const columns = detectCsvCoordinateColumns(headers, dataRows);

  if (!columns) {
    return {
      text: "",
      inputFormat: "decimal",
      importedRows: 0,
      errors: [CSV_ACCEPTED_COLUMNS_MESSAGE],
    };
  }

  const lines: string[] = [];
  const errors: string[] = [];

  dataRows.forEach((row, index) => {
    const line = buildCsvLine(row, columns);

    if (!line) {
      errors.push(
        `CSV row ${index + 2}: missing required coordinate values.`
      );
      return;
    }

    lines.push(line);
  });

  if (lines.length === 0) {
    return {
      text: "",
      inputFormat: columns.inputFormat,
      importedRows: 0,
      errors: [
        `No valid coordinate rows were found. ${CSV_ACCEPTED_COLUMNS_MESSAGE}`,
      ],
    };
  }

  const limitedErrors =
    errors.length > 5
      ? [
          ...errors.slice(0, 5),
          `${errors.length - 5} more CSV rows were skipped.`,
        ]
      : errors;

  return {
    text: lines.join("\n"),
    inputFormat: columns.inputFormat,
    importedRows: lines.length,
    errors: limitedErrors,
  };
}

function calculateDistanceMeters(
  start: CoordinatePoint,
  end: CoordinatePoint
) {
  const latitudeDelta = toRadians(end.latitude - start.latitude);
  const longitudeDelta = toRadians(end.longitude - start.longitude);
  const startLatitude = toRadians(start.latitude);
  const endLatitude = toRadians(end.latitude);

  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitude) *
      Math.cos(endLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return (
    2 *
    EARTH_RADIUS_METERS *
    Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  );
}

function toDegrees(value: number) {
  return (value * 180) / Math.PI;
}

function wrapDegrees(value: number) {
  return ((value % 360) + 360) % 360;
}

function calculateBearingDegrees(
  start: CoordinatePoint,
  end: CoordinatePoint
) {
  const startLatitude = toRadians(start.latitude);
  const endLatitude = toRadians(end.latitude);
  const longitudeDelta = toRadians(end.longitude - start.longitude);
  const y = Math.sin(longitudeDelta) * Math.cos(endLatitude);
  const x =
    Math.cos(startLatitude) * Math.sin(endLatitude) -
    Math.sin(startLatitude) *
      Math.cos(endLatitude) *
      Math.cos(longitudeDelta);

  return wrapDegrees(toDegrees(Math.atan2(y, x)));
}

function getCompassDirection(value: number) {
  const directions = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];

  return directions[Math.round(value / 22.5) % 16];
}

function calculateAreaSquareMeters(points: CoordinatePoint[]) {
  if (points.length < 3) {
    return 0;
  }

  let total = 0;

  points.forEach((point, index) => {
    const nextPoint = points[(index + 1) % points.length];
    total +=
      toRadians(nextPoint.longitude - point.longitude) *
      (2 +
        Math.sin(toRadians(point.latitude)) +
        Math.sin(toRadians(nextPoint.latitude)));
  });

  return Math.abs((total * EARTH_RADIUS_METERS ** 2) / 2);
}

function formatNumber(value: number, maximumFractionDigits = 2) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
  }).format(value);
}

function formatDistance(value: number) {
  if (value < 1000) {
    return `${formatNumber(value, 2)} m`;
  }

  return `${formatNumber(value / 1000, 3)} km`;
}

function formatBearing(value: number) {
  return `${formatNumber(value, 2)} deg`;
}

function formatBearingWithDirection(value: number) {
  return `${formatBearing(value)} - ${getCompassDirection(value)}`;
}

function formatArea(value: number) {
  if (value < 1000000) {
    return `${formatNumber(value, 2)} sq m`;
  }

  return `${formatNumber(value / 1000000, 4)} sq km`;
}

function formatCoordinate(value: number) {
  return value.toFixed(6);
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${formatNumber(bytes / 1024, 1)} KB`;
  }

  return `${formatNumber(bytes / (1024 * 1024), 2)} MB`;
}

function getInputFormatLabel(inputFormat: InputFormat) {
  return (
    inputFormats.find((format) => format.key === inputFormat)?.label ||
    inputFormat
  );
}

function escapeCsv(value: unknown) {
  const text = String(value ?? "");

  if (
    text.includes(",") ||
    text.includes('"') ||
    text.includes("\n")
  ) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function MapPreview({
  points,
  mode,
}: {
  points: CoordinatePoint[];
  mode: MeasurementMode;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadMap() {
      if (!containerRef.current) {
        return;
      }

      try {
        const L = await import("leaflet");

        if (cancelled || !containerRef.current) {
          return;
        }

        if (!mapRef.current) {
          mapRef.current = L.map(containerRef.current, {
            scrollWheelZoom: false,
          }).setView([-6.7924, 39.2083], 6);

          L.tileLayer(
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            {
              maxZoom: 19,
              attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            }
          ).addTo(mapRef.current);
        }

        const map = mapRef.current;

        if (!map) {
          return;
        }

        layerRef.current?.remove();

        const group = L.layerGroup();
        const latLngs = points.map(
          (point) =>
            [point.latitude, point.longitude] as [number, number]
        );

        if (latLngs.length > 1) {
          if (mode === "area" && latLngs.length > 2) {
            L.polygon(latLngs, {
              color: "#1d4ed8",
              fillColor: "#2563eb",
              fillOpacity: 0.16,
              weight: 3,
            }).addTo(group);
          } else {
            L.polyline(latLngs, {
              color: "#1d4ed8",
              weight: 4,
            }).addTo(group);
          }
        }

        points.forEach((point) => {
          L.circleMarker([point.latitude, point.longitude], {
            radius: 7,
            color: "#1d4ed8",
            fillColor: "#2563eb",
            fillOpacity: 0.9,
            weight: 2,
          })
            .bindPopup(
              `<strong>${escapeHtml(point.label)}</strong><br/>Lat: ${formatCoordinate(
                point.latitude
              )}<br/>Lng: ${formatCoordinate(point.longitude)}`
            )
            .addTo(group);
        });

        group.addTo(map);
        layerRef.current = group;

        if (latLngs.length === 0) {
          map.setView([-6.7924, 39.2083], 6);
        } else if (latLngs.length === 1) {
          map.setView(latLngs[0], 13);
        } else {
          const bounds = L.latLngBounds(latLngs);
          map.fitBounds(bounds.pad(0.22), {
            maxZoom: 13,
          });
        }

        window.setTimeout(() => {
          map.invalidateSize();
        }, 60);

        setMapError(null);
      } catch {
        setMapError("Map preview could not be loaded.");
      }
    }

    void loadMap();

    return () => {
      cancelled = true;
    };
  }, [points, mode]);

  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div className="relative isolate z-0 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
        <div>
          <h2 className="text-base font-bold text-gray-900">
            Map Preview
          </h2>
          <p className="text-sm text-gray-600">
            Visual check for the coordinate points and measurement path.
          </p>
        </div>

        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
          {points.length} point{points.length === 1 ? "" : "s"}
        </span>
      </div>

      <div
        ref={containerRef}
        className="relative z-0 h-[360px] w-full bg-slate-100"
      />

      {points.length === 0 && (
        <p className="border-t border-gray-200 px-4 py-3 text-sm text-gray-600">
          Enter valid coordinates or upload a CSV file to show them on the map.
        </p>
      )}

      {mapError && (
        <p className="border-t border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {mapError}
        </p>
      )}
    </div>
  );
}

export default function DistanceAreaCalculatorPage() {
  const [mode, setMode] = useState<MeasurementMode>("distance");
  const [inputFormat, setInputFormat] =
    useState<InputFormat>("decimal");
  const [coordinateText, setCoordinateText] = useState("");
  const [utmCrs, setUtmCrs] = useState<CrsType>("wgs84-utm");
  const [utmZone, setUtmZone] = useState("37");
  const [utmHemisphere, setUtmHemisphere] =
    useState<UtmHemisphere>("S");
  const [customProj4, setCustomProj4] =
    useState(DEFAULT_CUSTOM_PROJ4);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [csvImportMessage, setCsvImportMessage] = useState<string | null>(
    null
  );
  const [csvImportError, setCsvImportError] = useState<string | null>(
    null
  );
  const [copyLabel, setCopyLabel] = useState("Copy Summary");

  const activeInputFormat = inputFormatDetails[inputFormat];
  const utmZoneError =
    inputFormat === "utm" ? getUtmZoneError(utmZone) : null;
  const normalizedUtmZone = normalizeUtmZone(utmZone, 37);

  const parsed = useMemo(() => {
    if (utmZoneError) {
      return {
        points: [],
        errors: [utmZoneError],
      };
    }

    return parseCoordinateText(coordinateText, inputFormat, {
      crs: utmCrs,
      zone: normalizedUtmZone,
      hemisphere: utmHemisphere,
      customProj4,
    });
  }, [
    coordinateText,
    customProj4,
    inputFormat,
    normalizedUtmZone,
    utmCrs,
    utmHemisphere,
    utmZoneError,
  ]);

  const points = parsed.points;

  const distanceSegments = useMemo(
    () =>
      points.slice(1).map((point, index) => {
        const from = points[index];
        const initialBearing = calculateBearingDegrees(from, point);

        return {
          from,
          to: point,
          distanceMeters: calculateDistanceMeters(from, point),
          initialBearing,
          finalBearing: wrapDegrees(
            calculateBearingDegrees(point, from) + 180
          ),
          reverseBearing: wrapDegrees(initialBearing + 180),
        };
      }),
    [points]
  );

  const totalDistanceMeters = distanceSegments.reduce(
    (total, segment) => total + segment.distanceMeters,
    0
  );

  const areaSquareMeters = useMemo(
    () => calculateAreaSquareMeters(points),
    [points]
  );

  const hasEnoughPoints =
    mode === "distance" ? points.length >= 2 : points.length >= 3;

  const statusMessage = parsed.errors.length
    ? "Fix the coordinate errors before using the result."
    : hasEnoughPoints
      ? "Measurement preview is ready."
      : mode === "distance"
        ? "Enter at least two points for distance."
        : "Enter at least three points for area.";

  const summaryLines = useMemo(() => {
    const lines = [
      `Mode: ${mode === "distance" ? "Distance" : "Area"}`,
      `Input format: ${getInputFormatLabel(inputFormat)}`,
      `Points: ${points.length}`,
    ];

    if (points.length >= 2) {
      lines.push(`Total distance: ${formatDistance(totalDistanceMeters)}`);

      distanceSegments.forEach((segment, index) => {
        lines.push(
          `Segment ${index + 1}: initial ${formatBearingWithDirection(segment.initialBearing)}; final ${formatBearingWithDirection(segment.finalBearing)}; reverse ${formatBearingWithDirection(segment.reverseBearing)}`
        );
      });
    }

    if (mode === "area" && points.length >= 3) {
      lines.push(`Area: ${formatArea(areaSquareMeters)}`);
      lines.push(
        `Area hectares: ${formatNumber(areaSquareMeters / 10000, 4)} ha`
      );
    }

    return lines;
  }, [
    areaSquareMeters,
    distanceSegments,
    inputFormat,
    mode,
    points.length,
    totalDistanceMeters,
  ]);

  async function handleCsvUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setCsvFileName(null);
    setCsvImportMessage(null);
    setCsvImportError(null);

    const lowerFileName = file.name.toLowerCase();
    const isCsvFile =
      lowerFileName.endsWith(".csv") ||
      file.type === "text/csv" ||
      file.type === "application/csv" ||
      file.type === "application/vnd.ms-excel" ||
      file.type === "text/plain";

    if (!isCsvFile) {
      setCsvImportError("Upload a valid CSV file.");
      return;
    }

    if (file.size > CSV_MAX_FILE_SIZE) {
      setCsvImportError(
        `CSV file is too large. Maximum size is ${formatFileSize(
          CSV_MAX_FILE_SIZE
        )}.`
      );
      return;
    }

    try {
      const text = await file.text();
      const result = importCoordinatesFromCsv(text);

      if (!result.text) {
        setCsvImportError(result.errors.join(" "));
        return;
      }

      setInputFormat(result.inputFormat);
      setCoordinateText(result.text);
      setCsvFileName(file.name);
      setCsvImportMessage(
        `Imported ${result.importedRows} coordinate row${
          result.importedRows === 1 ? "" : "s"
        } from ${file.name} as ${getInputFormatLabel(
          result.inputFormat
        )}.`
      );

      if (result.errors.length > 0) {
        setCsvImportError(result.errors.join(" "));
      }
    } catch {
      setCsvImportError("Unable to read the CSV file.");
    }
  }

  async function copySummary() {
    await navigator.clipboard.writeText(summaryLines.join("\n"));
    void recordToolActivity("distance-area-bearing", { operation: "copy" }).catch((error) => console.error("Unable to record measurement activity:", error));
    setCopyLabel("Copied");

    window.setTimeout(() => {
      setCopyLabel("Copy Summary");
    }, 1500);
  }

  function clearCoordinates() {
    setCoordinateText("");
    setCsvFileName(null);
    setCsvImportMessage(null);
    setCsvImportError(null);
  }

  function downloadCsv() {
    const rows: string[][] = [
      ["Metric", "Value"],
      ["Mode", mode],
      ["Input format", getInputFormatLabel(inputFormat)],
      ["Point count", String(points.length)],
      ["Total distance", formatDistance(totalDistanceMeters)],
    ];

    if (mode === "area" && points.length >= 3) {
      rows.push(["Area", formatArea(areaSquareMeters)]);
      rows.push([
        "Area hectares",
        `${formatNumber(areaSquareMeters / 10000, 4)} ha`,
      ]);
    }

    rows.push([]);
    rows.push(["Point", "Latitude", "Longitude"]);

    points.forEach((point) => {
      rows.push([
        point.label,
        formatCoordinate(point.latitude),
        formatCoordinate(point.longitude),
      ]);
    });

    if (distanceSegments.length > 0) {
      rows.push([]);
      rows.push([
        "Segment",
        "From",
        "To",
        "Distance",
        "Initial azimuth",
        "Direction",
        "Final bearing",
        "Final direction",
        "Reverse bearing",
        "Reverse direction",
      ]);

      distanceSegments.forEach((segment, index) => {
        rows.push([
          String(index + 1),
          segment.from.label,
          segment.to.label,
          formatDistance(segment.distanceMeters),
          formatBearing(segment.initialBearing),
          getCompassDirection(segment.initialBearing),
          formatBearing(segment.finalBearing),
          getCompassDirection(segment.finalBearing),
          formatBearing(segment.reverseBearing),
          getCompassDirection(segment.reverseBearing),
        ]);
      });
    }

    const csv = rows
      .map((row) => row.map(escapeCsv).join(","))
      .join("\n");
    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "yaju-field-measurement.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    void recordToolActivity("distance-area-bearing", { operation: "export" }).catch((error) => console.error("Unable to record measurement activity:", error));
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/tools/gis"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-blue-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
        >
          <ArrowLeft size={16} />
          Back to YAJU Field Tools
        </Link>

        <section className="mt-8 rounded-lg border border-gray-200 bg-white p-5 shadow-sm sm:p-6 lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl">
                Distance, Area & Bearing Calculator
              </h1>

              <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600">
                Measure distance, bearings, perimeter and approximate polygon area from
                Decimal, DMS, UTM or CSV coordinate points.
              </p>
            </div>

            <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              <p className="font-semibold">Input format</p>
              <p className="mt-1">{activeInputFormat.description}</p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="space-y-5">
              <div className="space-y-3">
                <div className="inline-flex rounded-lg bg-gray-100 p-1">
                  {([
                    ["distance", "Distance"],
                    ["area", "Area"],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setMode(value)}
                      className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                        mode === value
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-gray-700 hover:bg-white"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    Coordinate input type
                  </p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    {inputFormats.map((format) => (
                      <button
                        key={format.key}
                        type="button"
                        onClick={() => setInputFormat(format.key)}
                        className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                          inputFormat === format.key
                            ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                            : "border-gray-200 bg-white text-gray-700 hover:border-blue-200 hover:bg-blue-50"
                        }`}
                      >
                        {format.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {inputFormat === "utm" && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <label className="block">
                      <span className="text-sm font-semibold text-gray-800">
                        Source CRS
                      </span>
                      <select
                        value={utmCrs}
                        onChange={(event) =>
                          setUtmCrs(event.target.value as CrsType)
                        }
                        className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      >
                        {crsOptions.map((option) => (
                          <option key={option.key} value={option.key}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-sm font-semibold text-gray-800">
                        UTM Zone
                      </span>
                      <input
                        value={utmZone}
                        onChange={(event) => setUtmZone(event.target.value)}
                        className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </label>

                    <label className="block">
                      <span className="text-sm font-semibold text-gray-800">
                        Hemisphere
                      </span>
                      <select
                        value={utmHemisphere}
                        onChange={(event) =>
                          setUtmHemisphere(
                            event.target.value as UtmHemisphere
                          )
                        }
                        className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="S">S</option>
                        <option value="N">N</option>
                      </select>
                    </label>

                    <div className="rounded-lg bg-white px-4 py-3 text-sm text-gray-600">
                      Rows can also include a zone or hemisphere. If omitted,
                      the settings here are used.
                    </div>
                  </div>

                  {utmCrs === "custom" && (
                    <label className="mt-4 block">
                      <span className="text-sm font-semibold text-gray-800">
                        Custom Proj4
                      </span>
                      <textarea
                        value={customProj4}
                        onChange={(event) =>
                          setCustomProj4(event.target.value)
                        }
                        rows={3}
                        className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 font-mono text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </label>
                  )}
                </div>
              )}

              <div className="rounded-lg border border-dashed border-blue-200 bg-blue-50/50 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      CSV bulk upload
                    </p>
                    <p className="mt-1 text-sm leading-6 text-gray-600">
                      Supports Decimal, DMS and UTM columns. UTM accepts
                      Easting/E/X with Northing/N/Y.
                    </p>
                  </div>

                  <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700">
                    <Upload size={16} />
                    Upload CSV
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={handleCsvUpload}
                      className="sr-only"
                    />
                  </label>
                </div>

                {csvFileName && (
                  <p className="mt-3 text-xs font-semibold text-blue-700">
                    Loaded: {csvFileName}
                  </p>
                )}

                {csvImportMessage && (
                  <p className="mt-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                    {csvImportMessage}
                  </p>
                )}

                {csvImportError && (
                  <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    {csvImportError}
                  </p>
                )}
              </div>

              <label className="block">
                <span className="text-sm font-semibold text-gray-800">
                  Coordinates
                </span>

                <textarea
                  value={coordinateText}
                  onChange={(event) => {
                    setCoordinateText(event.target.value);
                    setCsvImportMessage(null);
                    setCsvImportError(null);
                  }}
                  rows={8}
                  spellCheck={false}
                  placeholder={activeInputFormat.placeholder}
                  className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 font-mono text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={clearCoordinates}
                  className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-200"
                >
                  <RefreshCw size={16} />
                  Clear
                </button>
              </div>

              {parsed.errors.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  <p className="font-semibold">Coordinate errors</p>
                  <ul className="mt-2 space-y-1">
                    {parsed.errors.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-semibold text-gray-500">
                  Status
                </p>
                <p className="mt-1 font-semibold text-gray-900">
                  {statusMessage}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                  <p className="text-sm font-semibold text-gray-500">
                    Points
                  </p>
                  <p className="mt-2 text-3xl font-bold text-gray-950">
                    {points.length}
                  </p>
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                  <p className="text-sm font-semibold text-gray-500">
                    Distance
                  </p>
                  <p className="mt-2 text-2xl font-bold text-gray-950">
                    {points.length >= 2
                      ? formatDistance(totalDistanceMeters)
                      : "-"}
                  </p>
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                  <p className="text-sm font-semibold text-gray-500">
                    First Azimuth
                  </p>
                  <p className="mt-2 text-2xl font-bold text-gray-950">
                    {distanceSegments[0]
                      ? formatBearingWithDirection(
                          distanceSegments[0].initialBearing
                        )
                      : "-"}
                  </p>
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:col-span-3">
                  <p className="text-sm font-semibold text-gray-500">
                    Area
                  </p>
                  <p className="mt-2 text-2xl font-bold text-gray-950">
                    {mode === "area" && points.length >= 3
                      ? formatArea(areaSquareMeters)
                      : "-"}
                  </p>
                  {mode === "area" && points.length >= 3 && (
                    <p className="mt-1 text-sm text-gray-600">
                      {formatNumber(areaSquareMeters / 10000, 4)} hectares
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={copySummary}
                  disabled={!hasEnoughPoints || parsed.errors.length > 0}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Clipboard size={16} />
                  {copyLabel}
                </button>

                <button
                  type="button"
                  onClick={downloadCsv}
                  disabled={!hasEnoughPoints || parsed.errors.length > 0}
                  className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download size={16} />
                  Download CSV
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <MapPreview points={points} mode={mode} />
          </div>

          {points.length > 0 && (
            <div className="mt-8 overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Point</th>
                    <th className="px-4 py-3 font-semibold">Latitude</th>
                    <th className="px-4 py-3 font-semibold">Longitude</th>
                    <th className="px-4 py-3 font-semibold">Next segment</th>
                    <th className="px-4 py-3 font-semibold">Initial azimuth</th>
                    <th className="px-4 py-3 font-semibold">Final bearing</th>
                    <th className="px-4 py-3 font-semibold">Reverse bearing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white text-gray-700">
                  {points.map((point, index) => {
                    const segment = distanceSegments[index];

                    return (
                      <tr key={`${point.label}-${index}`}>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {point.label}
                        </td>
                        <td className="px-4 py-3">
                          {formatCoordinate(point.latitude)}
                        </td>
                        <td className="px-4 py-3">
                          {formatCoordinate(point.longitude)}
                        </td>
                        <td className="px-4 py-3">
                          {segment
                            ? formatDistance(segment.distanceMeters)
                            : "-"}
                        </td>
                        <td className="px-4 py-3">
                          {segment
                            ? formatBearingWithDirection(
                                segment.initialBearing
                              )
                            : "-"}
                        </td>
                        <td className="px-4 py-3">
                          {segment
                            ? formatBearingWithDirection(
                                segment.finalBearing
                              )
                            : "-"}
                        </td>
                        <td className="px-4 py-3">
                          {segment
                            ? formatBearingWithDirection(
                                segment.reverseBearing
                              )
                            : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <ToolLearningContent variant="distance" />
      </div>
    </main>
  );
}
