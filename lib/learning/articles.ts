export type LearningArticle = {
  slug: string;
  title: string;
  category: string;
  summary: string;
  readTime: string;
  sections: {
    heading: string;
    paragraphs: string[];
    bullets?: string[];
  }[];
  toolHref?: string;
  toolLabel?: string;
};

export const learningArticles: LearningArticle[] = [
  {
    slug: "coordinate-systems-and-coordinate-conversion",
    title: "Coordinate Systems and Coordinate Conversion: A Practical GIS Guide",
    category: "GIS & Mapping",
    summary: "Understand latitude and longitude, Decimal Degrees, DMS, UTM, datums and the checks that help prevent coordinate errors in GIS and surveying work.",
    readTime: "8 min read",
    toolHref: "/tools/coordinates-converter",
    toolLabel: "Open Coordinate Converter",
    sections: [
      {
        heading: "Why coordinate reference systems matter",
        paragraphs: [
          "A coordinate is only meaningful when its reference system is known. The same location can be represented by angular latitude and longitude or by projected eastings and northings. A GIS may display both correctly when the coordinate reference system (CRS) is defined, but assigning the wrong CRS can shift features, distort measurements or place data in the wrong part of the world.",
          "Before converting coordinates, identify the source datum, projection, units, UTM zone and hemisphere. Do not assume that a file is WGS 84 simply because its coordinates look familiar. Check the survey notes, metadata, map marginalia or the software settings used to create the data."
        ]
      },
      {
        heading: "Decimal Degrees and Degrees, Minutes, Seconds",
        paragraphs: [
          "Decimal Degrees (DD) express an angle as one decimal value. Degrees, Minutes, Seconds (DMS) split the same angle into degrees, minutes and seconds. One degree contains 60 minutes and one minute contains 60 seconds. To convert DMS to decimal degrees, use: DD = degrees + minutes/60 + seconds/3600. Apply a negative sign for south latitude or west longitude.",
          "For example, 6 degrees 30 minutes south is -6.5 degrees latitude. The direction is essential: omitting S or W can reverse the location across the equator or prime meridian. When entering DMS, confirm that minutes and seconds are each less than 60 and that latitude and longitude are not swapped."
        ],
        bullets: [
          "Latitude ranges from 90° south to 90° north.",
          "Longitude ranges from 180° west to 180° east.",
          "Use a consistent decimal separator and retain enough precision for the scale of the survey."
        ]
      },
      {
        heading: "Understanding UTM coordinates",
        paragraphs: [
          "The Universal Transverse Mercator (UTM) system divides most of the world into 6-degree longitude zones. Coordinates are expressed in metres as easting and northing within a particular zone and hemisphere. A UTM pair is incomplete without its zone, hemisphere and datum.",
          "Tanzania spans more than one UTM zone. A project near a zone boundary should use the CRS specified by the survey or project standard rather than selecting a zone only because it is commonly used nearby. For multi-zone datasets, consider whether a suitable local projected CRS or a documented transformation is required."
        ]
      },
      {
        heading: "WGS 84, Arc 1960 and datum transformations",
        paragraphs: [
          "WGS 84 and Arc 1960 are different geodetic datums. Converting between them is not merely changing the coordinate display from degrees to metres; it may require a datum transformation. The transformation parameters available in software can vary in accuracy and suitability by location.",
          "For engineering, cadastral or control-survey work, use transformation parameters approved for the project and jurisdiction. A generic transformation can be useful for preliminary mapping, but it should not replace an authoritative survey control framework. Record the source CRS, target CRS and transformation method in the deliverable metadata."
        ]
      },
      {
        heading: "A reliable coordinate-conversion workflow",
        paragraphs: [
          "Start with a small sample whose location can be independently checked. Confirm the input format, axis order, signs, datum, UTM zone and hemisphere. Convert the sample, plot it against a trusted reference layer and check that it falls in the expected area. Only then process the full dataset.",
          "For CSV or Excel conversion, keep the original file unchanged and work on a copy. Check column headers, missing values, duplicate point identifiers and rows reported as errors. Review a selection of converted records in a GIS before using them for analysis or setting out."
        ],
        bullets: [
          "Keep an untouched copy of the source coordinates.",
          "Document the source and output CRS, including EPSG code where known.",
          "Check a few points against reliable control or reference data.",
          "Do not treat a successful conversion message as proof that the source CRS was correctly identified."
        ]
      },
      {
        heading: "Common mistakes and limitations",
        paragraphs: [
          "Frequent errors include swapping latitude and longitude, confusing easting with northing, choosing the wrong UTM zone, omitting the hemisphere, mixing metres and degrees, and assigning a CRS instead of transforming coordinates. These errors can produce plausible-looking numbers while placing data incorrectly.",
          "An online converter can help with format conversion and preliminary checks, but it cannot determine the true source CRS from an arbitrary pair of numbers with certainty. The person preparing the data remains responsible for confirming its reference system and suitability for the intended accuracy."
        ]
      }
    ]
  },
  {
    slug: "measuring-distance-and-area-in-gis",
    title: "Measuring Distance and Area in GIS: Inputs, CRS and Quality Checks",
    category: "GIS & Mapping",
    summary: "A practical guide to measuring lines and polygons, choosing a suitable projected CRS and checking results before reporting them.",
    readTime: "7 min read",
    toolHref: "/tools/gis/distance-area-calculator",
    toolLabel: "Open Distance & Area Calculator",
    sections: [
      {
        heading: "What a GIS measurement represents",
        paragraphs: [
          "Distance describes the length between locations or along a defined path. Area describes the two-dimensional extent enclosed by a boundary. The result depends on the geometry supplied, the coordinate reference system, the measurement method and the units reported.",
          "A straight-line distance between two points is not the same as road distance, river-channel length or a surveyed traverse. Similarly, the area enclosed by a digitised polygon is only as reliable as the boundary and coordinate data used to create it."
        ]
      },
      {
        heading: "Choose the coordinate reference system deliberately",
        paragraphs: [
          "Geographic coordinates are angular values in degrees. They are useful for storing and exchanging locations, but degrees are not uniform linear units on the ground. For many local engineering and mapping measurements, a suitable projected CRS with metre units is more practical.",
          "Select a CRS appropriate to the study area and measurement purpose. Check its datum, projection, zone, units and area of use. Avoid measuring a local site using an unsuitable projection or a dataset whose CRS has only been guessed. If a project crosses projection zones, consult the project specification before choosing a measurement approach."
        ]
      },
      {
        heading: "Preparing point and polygon data",
        paragraphs: [
          "For point-to-point measurements, verify the order and identity of each coordinate pair. For a line or boundary, confirm that vertices are in the intended sequence and that the polygon closes without unintended self-intersections. Remove accidental duplicate points, but do not simplify a surveyed boundary without documenting the change.",
          "When importing CSV data, include clear field names such as Point_ID, Latitude and Longitude, or Easting and Northing with Zone and Hemisphere. Keep units and CRS information alongside the dataset so that the measurements can be reproduced."
        ],
        bullets: [
          "Check for missing or non-numeric coordinate values.",
          "Confirm that all vertices belong to the same intended CRS.",
          "Inspect the geometry on a map before accepting the calculated result.",
          "Retain the original input and a record of any corrections."
        ]
      },
      {
        heading: "Interpreting distance and area results",
        paragraphs: [
          "Report distance with an appropriate unit such as metres or kilometres, and area as square metres, hectares or square kilometres. One hectare is 10,000 square metres. Avoid reporting more decimal places than the input accuracy and method justify.",
          "For example, a mapped area of 25,000 square metres is 2.5 hectares. This unit conversion does not improve the accuracy of the original boundary. A polygon digitised from a coarse image should not be reported with the same confidence as a boundary established by a suitable survey."
        ]
      },
      {
        heading: "Quality assurance before using a measurement",
        paragraphs: [
          "Compare a sample measurement with an independent GIS or survey calculation. Check whether the expected geometry is being measured: horizontal planimetric area, ground distance, slope distance or another quantity. These are not interchangeable. Terrain, projection scale and the method used can affect comparisons.",
          "For land administration, construction set-out, infrastructure design or other high-consequence work, use the project-approved survey method and applicable standards. An online calculator is useful for preliminary checks and routine calculations, but it is not a substitute for a certified survey or engineering review."
        ]
      },
      {
        heading: "Common sources of error",
        paragraphs: [
          "Typical problems include mixing coordinate systems, entering longitude where latitude is expected, using a polygon with vertices in the wrong order, measuring a boundary that is not closed, and confusing square metres with hectares. Another common issue is assuming that a visually aligned map proves the underlying coordinates are correct.",
          "Save the measurement method, CRS, source dataset and units with the result. That small amount of documentation makes later review and repeat calculation much easier."
        ]
      }
    ]
  },
  {
    slug: "water-storage-sizing-rainwater-and-borehole",
    title: "Water Storage Sizing: Rainwater Harvesting, Demand and Borehole Supply",
    category: "Hydrology & Water",
    summary: "Understand the main inputs behind preliminary tank sizing, rainwater yield, dry-period storage and borehole supply calculations.",
    readTime: "9 min read",
    toolHref: "/tools/gis/water-storage-calculator",
    toolLabel: "Open Water Storage Calculator",
    sections: [
      {
        heading: "Start with the purpose and demand",
        paragraphs: [
          "A storage calculation should begin with the intended use of the water and the demand pattern. Domestic supply, livestock watering, irrigation and operational use have different daily requirements and reliability expectations. Identify the users, demand per user, operating days and any seasonal changes before selecting a tank volume.",
          "A preliminary storage estimate is not a complete water-supply design. Source reliability, water quality, pumping arrangements, distribution losses, treatment, environmental constraints and the required level of service must also be considered."
        ]
      },
      {
        heading: "Estimating rainwater harvesting yield",
        paragraphs: [
          "A simplified annual rainwater yield estimate can be expressed as: harvested volume = rainfall depth × catchment area × runoff coefficient × collection efficiency. Use rainfall in metres and area in square metres to obtain cubic metres. Multiply cubic metres by 1,000 to convert to litres.",
          "The runoff coefficient represents the proportion of rainfall expected to become runoff from the catchment surface. It varies with material, slope, condition and rainfall characteristics. Collection efficiency accounts for losses such as first-flush diversion, leakage, splash and conveyance losses. These factors should be selected from a documented design basis rather than treated as universal constants."
        ],
        bullets: [
          "1 millimetre of rainfall over 1 square metre equals 1 litre before losses.",
          "Check that rainfall and catchment area use compatible units.",
          "Use a catchment area that represents the actual contributing surface."
        ]
      },
      {
        heading: "Annual yield is not the same as reliable supply",
        paragraphs: [
          "An annual rainfall total can suggest how much water may be collected over a year, but it does not show when the water arrives. Two locations with the same annual rainfall can have very different monthly distributions and dry-season risks. A tank sized only from annual totals may be inadequate during a long dry spell.",
          "For a more useful preliminary assessment, review monthly rainfall, seasonal demand and the length of the dry period. Where daily rainfall records are available, a time-step water-balance model can assess storage behaviour more directly by tracking inflows, demand, overflow and the remaining stored volume through time."
        ]
      },
      {
        heading: "Borehole yield and pump supply",
        paragraphs: [
          "Borehole storage calculations should distinguish the tested borehole yield from the pump's rated discharge and the actual operating discharge. A pump cannot sustainably deliver more water than the source can provide under the approved operating conditions. Pumping hours, recovery, drawdown, water quality and the aquifer's response should be considered.",
          "Use a properly conducted pumping test and a documented operating regime when planning a real supply. A calculator can help compare demand with an entered discharge and operating time, but it cannot establish the sustainable yield of a borehole."
        ]
      },
      {
        heading: "Tank dimensions and usable storage",
        paragraphs: [
          "Geometric tank volume is not always equal to usable storage. Freeboard, dead storage, sediment allowance, outlet level and operational reserve can reduce the volume available to users. For a cylindrical tank, the ideal geometric volume is based on its internal radius and water depth; for a rectangular tank it is based on internal length, width and water depth.",
          "Use internal dimensions rather than external dimensions and distinguish total geometric capacity from effective operating volume. Confirm structural design, foundation conditions, access, overflow routing and safety requirements separately."
        ]
      },
      {
        heading: "Prepare and analyse daily rainfall records",
        paragraphs: [
          "The Water Storage Calculator accepts daily rainfall records from an Excel workbook (.xlsx or .xls) or a CSV file. The date may be provided in a single Date, Datetime or Timestamp column, or as separate YEAR, MONTH and DAY columns. Select the rainfall series column that contains daily values in millimetres per day (mm/day), review the preview and validate the dates and values before applying the dataset.",
          "The uploaded-data analysis summarises the record period, valid annual totals and mean annual rainfall. It also provides long-term mean monthly rainfall climatology, annual rainfall totals and a daily rainfall time series. The monthly climatology represents the mean of valid monthly rainfall totals for each calendar month across the available years. PNG downloads are available for the monthly climatology, annual totals and daily time-series charts."
        ],
        bullets: [
          "Accepted formats: .xlsx, .xls and .csv; maximum file size: 10 MB.",
          "The upload supports up to 50,000 daily records.",
          "Check date completeness, duplicate dates, non-negative rainfall values, units and the selected rainfall series.",
          "One uploaded dataset counts as one bulk analysis, regardless of its number of rows."
        ]
      },
      {
        heading: "Interpret the consecutive dry-day estimate",
        paragraphs: [
          "The calculator's consecutive dry-day (CDD) method classifies a day with rainfall below 1 mm/day as dry. An annual maximum is considered valid only when that year has at least 90% daily coverage, and at least 80% of years in the uploaded record must be valid before the nearest-rank 90th-percentile estimate is reported. Missing observations are not treated as dry days.",
          "If the record does not meet the coverage requirements, the calculator does not invent a result; provide a verified dry-period value from an appropriate source or study. Review the record period and data gaps before using a dry-period estimate in a storage design."
        ],
        bullets: [
          "The 90th percentile is the calculator's selected design statistic, not an ETCCDI requirement.",
          "An unavailable estimate must not be interpreted as zero dry days.",
          "Use a documented manual value when the uploaded record is insufficient."
        ]
      },
      {
        heading: "Understand the rainfall upload limits",
        paragraphs: [
          "Bulk Excel and CSV rainfall analysis has a dedicated usage quota. Free accounts can complete two successful bulk analyses in each rolling 24-hour period, while active Premium accounts have unlimited bulk analyses. A complete uploaded dataset counts as one analysis, irrespective of row count.",
          "Single-point NASA POWER rainfall retrievals and manual single-point rainfall inputs do not consume the bulk-file quota. Invalid files are rejected before a quota reservation is made; the file-size and daily-record limits still apply."
        ]
      },
      {
        heading: "Using gridded rainfall data responsibly",
        paragraphs: [
          "Gridded climate products provide estimated rainfall values for grid cells and can be useful where ground observations are limited. They are not identical to measurements from a local rain gauge. Grid resolution, missing data, terrain, distance from the selected point and the product's temporal coverage can influence the result.",
          "When a calculator retrieves rainfall automatically, check the selected site, the returned grid location, units, record period and data source. Where possible, compare the result with quality-controlled local rain-gauge observations. Record the source and retrieval date so the estimate can be reviewed later."
        ]
      },
      {
        heading: "Design checks and limitations",
        paragraphs: [
          "Before adopting a storage volume, test more than one demand and rainfall scenario. Consider a dry year, increased demand, reduced collection efficiency and operational downtime. Confirm water quality and treatment requirements, safe overflow disposal and applicable local standards.",
          "The YAJU calculator is intended for preliminary sizing and planning. It does not replace a detailed hydrological assessment, borehole pumping test, water-quality investigation, structural design or professional engineering approval. Use site-specific evidence and qualified review for final design decisions."
        ]
      }
    ]
  },
  {
    slug: "preparing-pdf-files-for-work-and-sharing",
    title: "Preparing PDF Files for Work: Merge, Split, Compress and Convert",
    category: "Documents & Productivity",
    summary: "Choose the right PDF workflow, protect source files and check converted documents before sharing or archiving them.",
    readTime: "6 min read",
    toolHref: "/tools/pdf",
    toolLabel: "Explore PDF Tools",
    sections: [
      {
        heading: "Choose the operation that matches the task",
        paragraphs: [
          "PDF workflows often involve a small set of distinct tasks. Merge combines multiple documents into one file. Split separates pages or page ranges. Compression reduces file size for easier storage or sharing. Conversion changes a document into another format, such as Word, Excel or PowerPoint, when the content and layout can be represented in the target format.",
          "Selecting the correct operation first helps avoid unnecessary conversions. If the goal is simply to send a smaller document, compressing the PDF may be more suitable than converting it to images and rebuilding it."
        ]
      },
      {
        heading: "Prepare and protect the original files",
        paragraphs: [
          "Keep an untouched copy of important source documents. Check page orientation, page order, file names and whether the PDFs open correctly before processing. For a merged report, arrange files in the intended order and confirm that appendices, signatures and attachments are included.",
          "Do not upload confidential or sensitive documents unless you are comfortable with the service's published data handling practices and the task is permitted by your organisation. Follow workplace rules for personal data, financial records, medical information and protected project documents."
        ]
      },
      {
        heading: "Understand the limits of conversion",
        paragraphs: [
          "A PDF may contain selectable text, scanned page images, vector drawings, tables or a mixture of these. Converting a scanned document to an editable format may require optical character recognition (OCR). Even when text is extracted, complex tables, equations, columns and page layouts may not convert perfectly.",
          "Always review the output rather than assuming that a successful download means the conversion is accurate. Check page count, missing characters, table alignment, images, hyperlinks and page breaks. For spreadsheets, verify numeric values and formulas separately."
        ]
      },
      {
        heading: "Compress without losing important information",
        paragraphs: [
          "Compression can reduce the size of embedded images or remove redundant data. Stronger image compression may reduce visual quality, especially for maps, engineering drawings, signatures and scanned evidence. Choose a balance between file size and legibility.",
          "After compression, zoom in on fine text, linework and annotations. If the document is intended for printing or formal submission, compare the compressed file with the original and follow the recipient's file-size and quality requirements."
        ]
      },
      {
        heading: "A final document quality check",
        paragraphs: [
          "Before sharing, open the processed file on a separate viewer or device. Confirm that it is not password-locked unexpectedly, that all pages are present and that the file name is clear. If the document will be used as a formal record, retain the original and note the processing step.",
          "Online utilities are useful for routine file preparation. They do not replace document control, records management, legal review or an organisation's approved handling process."
        ]
      }
    ]
  }
  ,{
    slug: "rainfall-data-dry-periods-and-water-balance",
    title: "Rainfall Data, Dry Periods and Water-Balance Assessment",
    category: "Hydrology & Water",
    summary: "Learn how to review rainfall records, identify dry periods and interpret a simple storage water balance without confusing estimates with design decisions.",
    readTime: "8 min read",
    toolHref: "/tools/gis/water-storage-calculator",
    toolLabel: "Open Water Storage Calculator",
    sections: [
      { heading: "Start with a fit-for-purpose rainfall record", paragraphs: [
        "Rainfall analysis begins with the purpose of the assessment and the time step required. Daily data can support dry-spell analysis and a daily storage balance, while monthly totals are useful for seasonal summaries. Annual totals alone can hide the timing and duration of rainfall deficits.",
        "Record the station or gridded product name, coordinates, units, observation period and retrieval date. Check whether the series represents a point gauge, an interpolated surface or a modelled grid cell; these sources have different spatial meaning and uncertainty."
      ]},
      { heading: "Check completeness and consistency", paragraphs: [
        "Inspect the date sequence for missing days, duplicate dates, impossible values and changes in reporting units. Distinguish a true zero-rainfall day from a missing observation. A missing value must not automatically be treated as zero because doing so can create an artificial dry spell.",
        "Compare totals and seasonal patterns with nearby stations or another trusted source where possible. Large differences may reflect real local variability, gauge exposure, data processing or an error that needs investigation."
      ], bullets: ["Confirm that dates are continuous and unique.", "Count missing observations by month and year.", "Check units and documented changes in station location or instrument.", "Keep the raw series unchanged and document quality-control decisions."]},
      { heading: "Define dry periods transparently", paragraphs: [
        "A dry period is not a universal fixed number of days. Define the threshold used in the analysis, such as consecutive days below a specified daily rainfall amount, and state whether trace rainfall interrupts the sequence. The threshold should suit the purpose and data resolution.",
        "For a water-supply assessment, a meteorological dry spell is only one part of the problem. Catchment response, soil moisture, runoff losses, groundwater contribution, demand and storage capacity influence whether a rainfall deficit becomes a supply shortage."
      ]},
      { heading: "Understand a simple storage water balance", paragraphs: [
        "A basic time-step balance updates storage using previous storage plus inflow, minus demand and losses. The result is constrained by usable tank capacity: excess water may overflow, while a negative balance indicates unmet demand or a required supplementary source.",
        "For rainwater harvesting, inflow can be estimated from rainfall depth, contributing roof area, runoff coefficient and collection efficiency. Use consistent units: one millimetre of rain over one square metre represents one litre before losses."
      ], bullets: ["Track storage at the same time step as rainfall and demand.", "Apply usable capacity, not only geometric volume.", "Represent overflow and unmet demand explicitly.", "Test alternative demand, rainfall and efficiency assumptions."]},
      { heading: "Interpret results and communicate limitations", paragraphs: [
        "Useful outputs include minimum storage, overflow volume, number of shortage days and the longest period of unmet demand. Review more than one year and consider dry-year conditions rather than relying on a single average year.",
        "A simple water balance is a planning aid, not a complete hydrological or water-supply design. It does not establish source sustainability, water quality, structural adequacy or regulatory compliance. Final decisions require site-specific data, documented assumptions and appropriate professional review."
      ]}
    ]
  }
  ,{
    slug: "ahp-in-gis-pairwise-comparisons-and-priority-weights",
    title: "AHP in GIS: Pairwise Comparisons, Priority Weights and Consistency",
    category: "GIS & Mapping",
    summary: "Learn how the Analytic Hierarchy Process turns documented pairwise judgments into normalized GIS criterion weights, and how to review consistency before a weighted overlay.",
    readTime: "7 min read",
    toolHref: "/tools/gis/ahp-calculator",
    toolLabel: "Open the free AHP Calculator",
    sections: [
      {
        heading: "What AHP contributes to a GIS analysis",
        paragraphs: [
          "The Analytic Hierarchy Process (AHP) is a structured way to express the relative importance of decision criteria. In a GIS suitability study, criteria might include slope, distance to roads, land cover or access to water. AHP helps derive a weight for each criterion from pairwise judgments; it does not choose appropriate criteria or validate the underlying spatial data.",
          "Define the decision objective, each criterion and its measurement direction before comparing them. For example, decide whether higher or lower values represent greater suitability, and document why each criterion belongs in the analysis."
        ]
      },
      {
        heading: "Make pairwise comparisons with the Saaty scale",
        paragraphs: [
          "Compare each unique pair of criteria and state which one matters more with respect to the decision objective. The classic Saaty scale uses 1 for equal importance, 3 for moderate, 5 for strong, 7 for very strong and 9 for extreme importance; 2, 4, 6 and 8 express intermediate judgments. A value in one direction implies its reciprocal in the opposite direction.",
          "For n criteria, the number of unique comparisons is n × (n − 1) / 2. Make judgments using the same objective and scale throughout. Record the rationale and evidence behind important comparisons instead of treating the scale as a measurement of certainty."
        ],
        bullets: [
          "Compare criteria two at a time, always relative to the same objective.",
          "Use reciprocal values so that a judgment of 5 in one direction becomes 1/5 in the reverse direction.",
          "Avoid assigning importance from inconsistent definitions or different study objectives."
        ]
      },
      {
        heading: "Understand the priority vector and consistency ratio",
        paragraphs: [
          "The pairwise judgments form a reciprocal comparison matrix. A principal-eigenvector method estimates a priority for each criterion, and the priorities are normalized so that they sum to 1, or 100 percent. These weights describe relative importance within the specified set of criteria.",
          "A consistency ratio (CR) checks how coherent the comparisons are with one another. A CR at or below 0.10 is a commonly used guideline, not proof that the criteria, data or judgments are scientifically appropriate. If the ratio is higher, review the comparisons that may conflict and document any revisions."
        ]
      },
      {
        heading: "Apply weights to standardized GIS layers",
        paragraphs: [
          "Before combining raster criteria, convert them to comparable suitability scales with consistent direction. Then a weighted linear combination can be written as Suitability Index = Σ(weight × standardized criterion value). Confirm that each raster uses the intended extent, resolution, alignment, NoData treatment and reclassification scheme.",
          "The AHP weights alone do not reclassify rasters or produce a suitability map. Test how the output changes under plausible alternative judgments, review the map against local knowledge and independent evidence, and explain assumptions in the study report."
        ],
        bullets: [
          "Standardize all criterion layers before applying weights.",
          "Check whether larger standardized values consistently mean more suitable.",
          "Keep the comparison rationale, data sources and processing choices with the analysis.",
          "Review sensitivity to changes in criteria and pairwise judgments."
        ]
      },
      {
        heading: "Use the calculator and keep the workflow transparent",
        paragraphs: [
          "The YAJU AHP Criteria Weighting Calculator supports 2 to 15 criteria, calculates reciprocal comparisons and principal-eigenvector priorities, and reports λ max, the consistency index and the consistency ratio. Results can be exported as CSV or Excel, or printed to PDF for review and documentation.",
          "The calculator is free to use. It returns criterion weights only; the analyst remains responsible for selecting suitable data, checking assumptions and carrying out the GIS overlay in appropriate software. For consequential planning or engineering decisions, obtain relevant expert review."
        ]
      }
    ]
  }
];