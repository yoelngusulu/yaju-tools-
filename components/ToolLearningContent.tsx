"use client";

import Link from "next/link";

type Variant = "coordinates" | "distance" | "water";

const content: Record<Variant, {
  eyebrow: string;
  title: string;
  intro: string;
  sections: { title: string; body: string; bullets?: string[] }[];
  guide: string;
  guideLabel: string;
}> = {
  coordinates: {
    eyebrow: "Coordinate conversion guide",
    title: "Understand your coordinates before converting them",
    intro: "Coordinate conversion changes how a location is represented. A reliable result depends on identifying the source coordinate reference system, datum, axis order, units and (for UTM) zone and hemisphere.",
    guide: "/learn/coordinate-systems-and-coordinate-conversion",
    guideLabel: "Read the coordinate systems guide",
    sections: [
      { title: "Choose the correct input format", body: "Decimal Degrees (DD) use decimal values for latitude and longitude. Degrees, Minutes, Seconds (DMS) split each angle into degrees, minutes and seconds. UTM uses eastings and northings in metres, together with a zone, hemisphere and datum. Select the format that matches your source data; do not infer it only from the number of digits.", bullets: ["Latitude is the north–south coordinate; longitude is east–west.", "South and west values are negative in signed decimal-degree notation.", "UTM coordinates require the correct zone and hemisphere."] },
      { title: "WGS 84 and Arc 1960", body: "The converter provides WGS 84 / UTM and Arc 1960 / UTM options, as well as a custom Proj4 definition. WGS 84 and Arc 1960 are different datums. If your source is Arc 1960, do not label it WGS 84 without applying an appropriate datum transformation. Use project-approved parameters for survey-grade work." },
      { title: "Bulk CSV and Excel conversion", body: "For a batch, use clear column headings and keep an unchanged copy of the source file. Review the preview, check rows marked as errors and confirm that identifiers remain attached to the correct coordinates. Test a few points independently before relying on the complete output." },
      { title: "Check the converted result", body: "Plot sample output coordinates in a GIS with a trusted reference layer. Confirm that points appear in the expected location, that latitude and longitude have not been swapped, and that the UTM zone and hemisphere are appropriate. A conversion cannot determine an unknown source CRS with certainty." }
    ]
  },
  distance: {
    eyebrow: "GIS measurement guide",
    title: "Get dependable distance and area measurements",
    intro: "A measurement is only as reliable as the geometry, coordinate reference system and measurement method behind it. Check these inputs before using a result in a map, report or engineering calculation.",
    guide: "/learn/measuring-distance-and-area-in-gis",
    guideLabel: "Read the distance and area guide",
    sections: [
      { title: "Prepare your coordinates", body: "Enter points in the supported format and keep their labels in the intended order. For a line or boundary, check that vertices describe the correct path and that no points have been accidentally omitted or duplicated. Review the plotted geometry before accepting the result." },
      { title: "Use an appropriate CRS", body: "Geographic coordinates are expressed in degrees, while projected systems commonly use metres. Select a suitable CRS for the study area and measurement purpose. Confirm the datum, zone, units and area of use; assigning a CRS is not the same as transforming coordinates." },
      { title: "Report sensible precision", body: "Choose units that make the result easy to interpret: metres or kilometres for distance, and square metres, hectares or square kilometres for area. One hectare equals 10,000 square metres. Do not report more decimal places than the source data and method can support." },
      { title: "Verify important measurements", body: "Compare a sample with an independent GIS or survey calculation. For cadastral, construction or other high-consequence work, use the approved survey procedure and applicable standards. This calculator supports preliminary checks and routine measurements; it is not a certified survey." }
    ]
  },
  water: {
    eyebrow: "Water storage planning guide",
    title: "Size water storage using realistic site inputs",
    intro: "Preliminary storage sizing combines demand, source reliability, rainfall, catchment area and operating assumptions. Annual rainfall alone does not show whether enough water will be available during a long dry period.",
    guide: "/learn/water-storage-sizing-rainwater-and-borehole",
    guideLabel: "Read the water storage sizing guide",
    sections: [
      { title: "Rainwater harvesting", body: "A simplified yield estimate uses rainfall depth, catchment area, runoff coefficient and collection efficiency. Keep units consistent: rainfall in metres multiplied by area in square metres gives cubic metres; multiply by 1,000 for litres. Select coefficients that reflect the actual roof or catchment surface and losses." },
      { title: "Dry-period storage and demand", body: "Consider daily demand and the timing of rainfall, not only the annual total. A monthly or daily water-balance assessment is more informative than annual yield alone when storage reliability matters. Test alternative demand and dry-period assumptions." },
      { title: "Borehole and tank dimensions", body: "Distinguish tested borehole yield from pump-rated and actual discharge. Pumping hours and recovery affect supply. For tanks, distinguish geometric capacity from usable storage after freeboard, dead storage and operating reserve." },
      { title: "Treat results as preliminary", body: "Automatically retrieved gridded rainfall may differ from a local gauge. Check the selected site, grid location, units, record period and source. Final design also requires water-quality, source sustainability, structural and engineering checks." }
    ]
  }
};

export default function ToolLearningContent({ variant }: { variant: Variant }) {
  const item = content[variant];
  return (
    <section className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">{item.eyebrow}</p>
      <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{item.title}</h2>
      <p className="mt-4 max-w-4xl leading-7 text-slate-700">{item.intro}</p>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {item.sections.map((section) => (
          <article key={section.title} className="rounded-xl bg-slate-50 p-5">
            <h3 className="text-lg font-semibold text-slate-900">{section.title}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-700">{section.body}</p>
            {section.bullets && <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700">{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}
          </article>
        ))}
      </div>
      <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-6">
        <p className="max-w-2xl text-sm leading-6 text-slate-600">For detailed examples, practical checks and limitations, see the full YAJU Learning Center guide.</p>
        <Link href={item.guide} className="inline-flex items-center rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800">{item.guideLabel}</Link>
      </div>
    </section>
  );
}
