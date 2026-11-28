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
  faqs: { question: string; answer: string }[];
}> = {
  coordinates: {
    eyebrow: "Coordinate conversion guide",
    title: "Understand your coordinates before converting them",
    intro: "Coordinate conversion changes how a location is represented. A reliable result depends on identifying the source coordinate reference system, datum, axis order, units and (for UTM) zone and hemisphere.",
    guide: "/learn/coordinate-systems-and-coordinate-conversion",
    guideLabel: "Read the coordinate systems guide",
    faqs: [
      { question: "Can I convert coordinates without knowing the source CRS?", answer: "You can change coordinate notation only when the source values and reference system are known. A coordinate pair alone cannot reliably identify its datum or projection." },
      { question: "Are WGS 84 and Arc 1960 interchangeable?", answer: "No. They are different datums. Use the correct source datum and an appropriate transformation method for the project." },
      { question: "How do I check a converted coordinate?", answer: "Plot a sample in a GIS using a trusted reference layer and confirm the expected location, axis order, UTM zone and hemisphere." }
    ],
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
    faqs: [
      { question: "Should I measure in degrees or metres?", answer: "For many local linear measurements, a suitable projected CRS with metre units is more practical. Select a CRS appropriate to the study area and task." },
      { question: "How many square metres are in a hectare?", answer: "One hectare equals 10,000 square metres." },
      { question: "Can I use this result for cadastral or construction approval?", answer: "Use the approved survey method and applicable standards for high-consequence work. An online calculator is not a certified survey." }
    ],
    sections: [
      { title: "Prepare your coordinates", body: "Enter points in the supported format and keep their labels in the intended order. For a line or boundary, check that vertices describe the correct path and that no points have been accidentally omitted or duplicated. Review the plotted geometry before accepting the result." },
      { title: "Use an appropriate CRS", body: "Geographic coordinates are expressed in degrees, while projected systems commonly use metres. Select a suitable CRS for the study area and measurement purpose. Confirm the datum, zone, units and area of use; assigning a CRS is not the same as transforming coordinates." },
      { title: "Report sensible precision", body: "Choose units that make the result easy to interpret: metres or kilometres for distance, and square metres, hectares or square kilometres for area. One hectare equals 10,000 square metres. Do not report more decimal places than the source data and method can support." },
      { title: "Verify important measurements", body: "Compare a sample with an independent GIS or survey calculation. For cadastral, construction or other high-consequence work, use the approved survey procedure and applicable standards. This calculator supports preliminary checks and routine measurements; it is not a certified survey." }
    ]
  },
  water: {
    eyebrow: "Water storage planning guide",
    title: "Plan storage with rainfall records and transparent design assumptions",
    intro: "The Water Storage Calculator now combines site-based NASA POWER rainfall estimates with uploaded daily rainfall analysis. Use the rainfall record to review annual totals, long-term monthly climatology and dry-period evidence before applying demand, catchment and storage assumptions. Results remain preliminary planning estimates.",
    guide: "/learn/water-storage-sizing-rainwater-and-borehole",
    guideLabel: "Read the water storage sizing guide",
    faqs: [
      { question: "Which rainfall files can I upload?", answer: "Upload an Excel (.xlsx or .xls) or CSV file with daily rainfall in mm/day. The file can contain one Date/Datetime/Timestamp column, or separate YEAR, MONTH and DAY columns. Select the rainfall series column containing daily values in mm/day." },
      { question: "What rainfall summaries are available?", answer: "After validation, the calculator reports the record period, valid annual totals and mean annual rainfall, long-term mean monthly rainfall climatology, annual rainfall totals and a daily rainfall time series. Monthly climatology is calculated from valid monthly totals across years." },
      { question: "Can I download the rainfall charts?", answer: "Yes. The uploaded-data analysis provides PNG downloads for the monthly climatology graph, annual rainfall totals graph and daily rainfall time-series graph." },
      { question: "How is the design dry period estimated?", answer: "CDD analysis classifies daily rainfall below 1 mm/day as dry. A year needs at least 90% daily coverage, and at least 80% of years in the uploaded period must be valid for the nearest-rank 90th-percentile estimate. Missing days are not treated as dry. If coverage is insufficient, enter a verified dry-period value manually; the calculator does not invent one." },
      { question: "Does selecting a map point use a rain-gauge observation?", answer: "No. NASA POWER provides gridded climate estimates for a grid cell, not a local rain-gauge measurement. The selected grid coordinates and record period are shown so you can assess spatial representativeness. You can also enter a verified annual rainfall value manually." },
      { question: "What are the upload and usage limits?", answer: "A rainfall file can be up to 10 MB and contain up to 50,000 daily records. Guests can complete 2 successful bulk CSV/Excel analyses per rolling 24 hours; registered Free users can complete 5. Active Premium users have unlimited bulk analyses. A complete uploaded dataset counts as one analysis, regardless of its number of rows. Single-point NASA POWER retrievals and manual single-point rainfall inputs are not charged against the bulk-file quota." },
      { question: "Does the calculator run a complete rainfall-runoff simulation?", answer: "No. Rainwater sizing uses annual rainfall and dry-period demand; it is not a daily storage-routing, rainfall-runoff or catchment-discharge model. Use a suitable hydrological model and site-specific design data for detailed watershed or engineering design." }
    ],
    sections: [
      { title: "Prepare daily rainfall data", body: "Use the first worksheet of an Excel workbook or a CSV file. Include a header row and daily rainfall values in mm/day. The date can be stored in one Date column or in three separate columns named YEAR, MONTH and DAY. Choose the correct rainfall series column (for example, Rainfall_1 or Rainfall_2), inspect the preview, and validate the records before applying the dataset.", bullets: ["Accepted formats: .xlsx, .xls and .csv.", "Maximum file size: 10 MB; maximum: 50,000 daily records.", "Check date completeness, duplicate dates, non-negative rainfall values and the selected station column."] },
      { title: "Interpret rainfall summaries and charts", body: "The analysis presents the record period, number of valid annual totals and mean annual rainfall. Monthly climatology is the mean of valid monthly rainfall totals for each calendar month across the available years. The yearly view shows annual rainfall totals, while the daily time series retains the sequence of daily observations. Use the PNG export controls to save the monthly, yearly and daily graphs for reporting.", bullets: ["Monthly graph: mean monthly rainfall in mm/month.", "Yearly graph: annual rainfall totals in mm/year.", "Daily graph: rainfall time series in mm/day, with the 1 mm/day dry threshold."] },
      { title: "Apply the CDD design dry-period result carefully", body: "The current method treats daily rainfall below 1 mm/day as dry. Annual maximum consecutive dry days are assessed only where annual daily coverage is at least 90%; at least 80% of years must be valid to calculate the nearest-rank 90th percentile. Missing observations are not classified as dry. Spells crossing calendar-year boundaries follow the implemented convention, while boundary- or gap-censored spells are excluded from valid annual maxima. If the dataset does not meet the coverage criteria, provide a verified dry-period value from an appropriate source or study.", bullets: ["The 90th percentile is the calculator's selected design statistic, not an ETCCDI requirement.", "Do not interpret an unavailable estimate as zero days.", "Review the record period and data gaps before accepting the result."] },
      { title: "Use NASA POWER point rainfall with awareness of scale", body: "Selecting a site requests daily precipitation from NASA POWER for the selected location and reports the corresponding grid point and record period. Gridded precipitation is a climate estimate and can differ from a local rain gauge, especially where terrain or rainfall varies over short distances. For design, compare it with local rain-gauge observations and other suitable ground measurements where available. If needed, enter a verified annual rainfall value manually." },
      { title: "Understand quota and analysis limits", body: "Bulk Excel/CSV rainfall analysis is subject to a per-tool rolling 24-hour quota: guests can complete 2 successful analyses and registered Free users can complete 5. Active Premium accounts have unlimited bulk analyses. One uploaded dataset is one analysis, regardless of row count. Single-point NASA POWER requests and manual single-point rainfall inputs do not consume this bulk-file quota. Invalid files are rejected before an analysis is reserved; the upload size and daily-record limits still apply." },
      { title: "Keep the storage calculation in context", body: "The rainwater storage estimate uses annual rainfall, catchment area, runoff coefficient, collection efficiency, daily demand, design dry period and safety allowance. It does not route the uploaded daily series through a time-step storage model. Borehole, irrigation and tank-dimension modes retain their own input assumptions; ETo and effective rainfall for irrigation remain manual inputs. Confirm source sustainability, demand, water quality, structural requirements and applicable engineering standards before final design." }
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
      <section className="mt-8">
        <h3 className="text-xl font-bold text-slate-950">Frequently asked questions</h3>
        <div className="mt-4 divide-y divide-slate-200 rounded-xl border border-slate-200">
          {item.faqs.map((faq) => (
            <details key={faq.question} className="group p-4">
              <summary className="cursor-pointer list-none font-semibold text-slate-900 marker:hidden">
                <span className="flex items-center justify-between gap-4">{faq.question}<span className="text-blue-700 transition group-open:rotate-45">+</span></span>
              </summary>
              <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-700">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>
      {variant === "water" && (
        <section className="mt-8">
          <h3 className="text-xl font-bold text-slate-950">Resources &amp; supporting documents</h3>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">Use the original data-provider and technical references below when preparing rainfall inputs or reviewing design assumptions. These links are external references; they are not generated reports or a substitute for project-specific engineering documentation.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <a href="https://power.larc.nasa.gov/" target="_blank" rel="noreferrer" className="rounded-xl border border-slate-200 p-4 transition hover:border-blue-300 hover:bg-blue-50/40">
              <strong className="block text-sm text-slate-900">NASA POWER Data Access</strong>
              <span className="mt-1 block text-xs leading-5 text-slate-600">Gridded meteorological and solar data. Review spatial resolution, temporal coverage, parameter definitions and data limitations.</span>
            </a>
            <a href="https://power.larc.nasa.gov/docs/" target="_blank" rel="noreferrer" className="rounded-xl border border-slate-200 p-4 transition hover:border-blue-300 hover:bg-blue-50/40">
              <strong className="block text-sm text-slate-900">NASA POWER Documentation</strong>
              <span className="mt-1 block text-xs leading-5 text-slate-600">API, parameter and methodology documentation for understanding the gridded climate data.</span>
            </a>
            <a href="https://www.fao.org/4/x0490e/x0490e00.htm" target="_blank" rel="noreferrer" className="rounded-xl border border-slate-200 p-4 transition hover:border-blue-300 hover:bg-blue-50/40">
              <strong className="block text-sm text-slate-900">FAO Irrigation and Drainage Paper 56</strong>
              <span className="mt-1 block text-xs leading-5 text-slate-600">Reference for crop evapotranspiration and irrigation water-requirement concepts. Irrigation climate inputs in this calculator remain manual.</span>
            </a>
          </div>
        </section>
      )}

      <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-6">
        <p className="max-w-2xl text-sm leading-6 text-slate-600">For detailed examples, practical checks and limitations, see the full YAJU Learning Center guide.</p>
        <Link href={item.guide} className="inline-flex items-center rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800">{item.guideLabel}</Link>
      </div>
    </section>
  );
}
