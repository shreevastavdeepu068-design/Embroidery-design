/* =========================================================
   EMBROIDERY AI — PRODUCTION STITCH ENGINE
   Version: 0.2.0

   PURPOSE
   ---------------------------------------------------------
   This is the core embroidery geometry/stitch layer.

   USER FLOW:

   User Account
        ↓
   Design Requirements
        ↓
   AI Design Request
        ↓
   Geometry Generation
        ↓
   Stitch Generation
        ↓
   Production Validation
        ↓
   Preview + Statistics
        ↓
   Payment / Generation Approval
        ↓
   Real Machine File Encoder
        ↓
   DST / EXP / PES / JEF etc.

   IMPORTANT
   ---------------------------------------------------------
   This browser engine DOES NOT pretend to generate a real
   production DST file.

   It generates structured embroidery stitch DATA.

   Real AI generation and machine-file encoding will later
   live behind a secure backend/API.
   ========================================================= */


/* =========================================================
   01. VERSION
   ========================================================= */

const EMBROIDERY_ENGINE_VERSION = "0.2.0";


/* =========================================================
   02. STITCH TYPES
   ========================================================= */

const StitchType = Object.freeze({

  RUNNING: "running",

  SATIN: "satin",

  FILL: "fill",

  JUMP: "jump",

  TRIM: "trim",

  COLOR_CHANGE: "color_change"

});


/* =========================================================
   03. ENGINE CONFIGURATION
   ========================================================= */

const EMBROIDERY_ENGINE_CONFIG = Object.freeze({

  maxStitchLength: 12,

  minStitchLength: 0.4,

  defaultStitchLength: 2.5,

  defaultDensity: 0.45,

  satinSpacing: 0.4,

  fillSpacing: 0.45,

  hoopMargin: 0.25,

  safeMargin: 0.25,

  machineSpeedSPM: 700,

  maxColors: 15,

  maxDesignDimensionInch: 30,

  supportedUnits: [
    "inch",
    "mm"
  ],

  supportedHoops: [
    "4x4",
    "5x7",
    "6x10",
    "8x12"
  ],

  supportedFabrics: [
    "cotton",
    "denim",
    "polyester",
    "silk",
    "linen",
    "jersey",
    "canvas"
  ],

  supportedGarments: [
    "kurti",
    "shirt",
    "tshirt",
    "jacket",
    "cap",
    "trouser",
    "dupatta",
    "general"
  ]

});


/* =========================================================
   04. HOOP DEFINITIONS
   ========================================================= */

const EMBROIDERY_HOOPS = Object.freeze({

  "4x4": {
    width: 4,
    height: 4,
    name: "4 × 4 inch"
  },

  "5x7": {
    width: 5,
    height: 7,
    name: "5 × 7 inch"
  },

  "6x10": {
    width: 6,
    height: 10,
    name: "6 × 10 inch"
  },

  "8x12": {
    width: 8,
    height: 12,
    name: "8 × 12 inch"
  }

});


/* =========================================================
   05. BASIC UTILITIES
   ========================================================= */

function clamp(value, min, max) {

  return Math.min(
    Math.max(value, min),
    max
  );

}


function lerp(a, b, amount) {

  return a + (b - a) * amount;

}


function distance(pointA, pointB) {

  const dx =
    pointB.x - pointA.x;

  const dy =
    pointB.y - pointA.y;

  return Math.sqrt(
    dx * dx + dy * dy
  );

}


function roundCoordinate(value) {

  return Math.round(
    Number(value) * 100
  ) / 100;

}


function safeNumber(value, fallback = 0) {

  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;

}


function createPoint(
  x,
  y,
  type = StitchType.RUNNING,
  options = {}
) {

  return {

    x: roundCoordinate(x),

    y: roundCoordinate(y),

    type,

    color:
      options.color || null,

    layer:
      options.layer || 0,

    objectId:
      options.objectId || null,

    index:
      null

  };

}


/* =========================================================
   06. UNIT CONVERSION
   ========================================================= */

function inchToMM(value) {

  return safeNumber(value) * 25.4;

}


function mmToInch(value) {

  return safeNumber(value) / 25.4;

}


function convertToInches(
  value,
  unit
) {

  if (unit === "mm") {

    return mmToInch(value);

  }

  return safeNumber(value);

}


/* =========================================================
   07. DESIGN ID
   ========================================================= */

function createDesignId() {

  const randomPart =
    Math.random()
      .toString(36)
      .substring(2, 10);

  return `EMB-${Date.now()}-${randomPart}`;

}


/* =========================================================
   08. DESIGN MODEL
   ========================================================= */

function createEmbroideryDesign(
  options = {}
) {

  const width =
    safeNumber(
      options.width,
      4
    );

  const height =
    safeNumber(
      options.height,
      4
    );

  const unit =
    options.unit || "inch";


  const design = {

    id:
      options.id ||
      createDesignId(),

    status:
      "draft",

    version:
      1,


    /* -----------------------------------------
       PHYSICAL REQUIREMENTS
       ----------------------------------------- */

    width,

    height,

    unit,

    hoop:
      options.hoop || "5x7",

    fabric:
      options.fabric || "cotton",

    garment:
      options.garment || "general",


    /* -----------------------------------------
       THREAD SETTINGS
       ----------------------------------------- */

    colors:
      options.colors || "auto",

    threadPalette:
      Array.isArray(options.threadPalette)
        ? [...options.threadPalette]
        : [],

    density:
      safeNumber(
        options.density,
        EMBROIDERY_ENGINE_CONFIG.defaultDensity
      ),

    stitchLength:
      safeNumber(
        options.stitchLength,
        EMBROIDERY_ENGINE_CONFIG.defaultStitchLength
      ),


    /* -----------------------------------------
       USER CREATIVE REQUEST
       ----------------------------------------- */

    description:
      options.description || "",

    style:
      options.style || "production",

    placement:
      options.placement || "center",

    referenceImage:
      options.referenceImage || null,


    /* -----------------------------------------
       AI INFORMATION
       ----------------------------------------- */

    ai: {

      requested:
        Boolean(options.aiRequested),

      provider:
        options.aiProvider || null,

      model:
        options.aiModel || null,

      prompt:
        options.aiPrompt || "",

      confidence:
        null

    },


    /* -----------------------------------------
       PRODUCTION INFORMATION
       ----------------------------------------- */

    production: {

      machine:
        options.machine || null,

      machineFormat:
        options.machineFormat || "DST",

      speedSPM:
        safeNumber(
          options.speedSPM,
          EMBROIDERY_ENGINE_CONFIG.machineSpeedSPM
        ),

      backing:
        options.backing || "standard",

      threadType:
        options.threadType || "polyester",

      stabilization:
        options.stabilization || "standard"

    },


    /* -----------------------------------------
       PAYMENT / GENERATION STATE
       ----------------------------------------- */

    generation: {

      generationId:
        options.generationId || null,

      status:
        "not_started",

      price:
        safeNumber(
          options.price,
          0
        ),

      currency:
        options.currency || "INR",

      paymentRequired:
        Boolean(options.paymentRequired),

      paymentStatus:
        options.paymentStatus || "not_required"

    },


    /* -----------------------------------------
       ENGINE DATA
       ----------------------------------------- */

    layers: [],

    objects: [],

    stitches: [],


    /* -----------------------------------------
       VALIDATION
       ----------------------------------------- */

    validation: {

      valid: false,

      errors: [],

      warnings: []

    },


    /* -----------------------------------------
       STATISTICS
       ----------------------------------------- */

    statistics: {

      totalStitches: 0,

      runningStitches: 0,

      satinStitches: 0,

      fillStitches: 0,

      jumps: 0,

      trims: 0,

      colorChanges: 0,

      colors: 0,

      estimatedTimeMinutes: 0,

      estimatedTimeSeconds: 0

    },


    /* -----------------------------------------
       METADATA
       ----------------------------------------- */

    metadata: {

      createdAt:
        new Date().toISOString(),

      updatedAt:
        new Date().toISOString(),

      engine:
        "Embroidery AI Production Stitch Engine",

      engineVersion:
        EMBROIDERY_ENGINE_VERSION

    }

  };


  return design;

}


/* =========================================================
   09. HOOP HELPERS
   ========================================================= */

function getHoopDimensions(
  hoopName
) {

  return (
    EMBROIDERY_HOOPS[hoopName] ||
    null
  );

}


function formatHoopName(
  hoopName
) {

  const hoop =
    getHoopDimensions(
      hoopName
    );

  return hoop
    ? hoop.name
    : "Custom";

}


/* =========================================================
   10. SAFE EMBROIDERY AREA
   ========================================================= */

function getSafeHoopArea(
  hoopName
) {

  const hoop =
    getHoopDimensions(
      hoopName
    );


  if (!hoop) {

    return null;

  }


  const margin =
    EMBROIDERY_ENGINE_CONFIG.hoopMargin;


  return {

    width:
      Math.max(
        0,
        hoop.width - margin * 2
      ),

    height:
      Math.max(
        0,
        hoop.height - margin * 2
      )

  };

}


/* =========================================================
   11. DESIGN SIZE VALIDATION
   ========================================================= */

function validateDesignSize(
  design
) {

  const errors = [];

  const warnings = [];


  const width =
    convertToInches(
      design.width,
      design.unit
    );

  const height =
    convertToInches(
      design.height,
      design.unit
    );


  if (
    !Number.isFinite(width) ||
    width <= 0
  ) {

    errors.push(
      "Design width must be greater than zero."
    );

  }


  if (
    !Number.isFinite(height) ||
    height <= 0
  ) {

    errors.push(
      "Design height must be greater than zero."
    );

  }


  if (
    width >
    EMBROIDERY_ENGINE_CONFIG.maxDesignDimensionInch ||
    height >
    EMBROIDERY_ENGINE_CONFIG.maxDesignDimensionInch
  ) {

    errors.push(
      "Design dimensions exceed the engine limit."
    );

  }


  const hoop =
    getHoopDimensions(
      design.hoop
    );


  if (!hoop) {

    warnings.push(
      "Custom hoop selected. Explicit machine hoop dimensions will be required."
    );

  } else {

    const safeArea =
      getSafeHoopArea(
        design.hoop
      );


    const fitsNormal =
      width <= safeArea.width &&
      height <= safeArea.height;


    const fitsRotated =
      width <= safeArea.height &&
      height <= safeArea.width;


    if (
      !fitsNormal &&
      !fitsRotated
    ) {

      errors.push(
        "Design exceeds the selected hoop's safe embroidery area."
      );

    }

  }


  return {

    valid:
      errors.length === 0,

    errors,

    warnings

  };

}


/* =========================================================
   12. RUNNING STITCH GENERATOR
   ========================================================= */

function generateRunningStitches(
  points,
  options = {}
) {

  const stitchLength =
    clamp(

      safeNumber(
        options.stitchLength,
        EMBROIDERY_ENGINE_CONFIG.defaultStitchLength
      ),

      EMBROIDERY_ENGINE_CONFIG.minStitchLength,

      EMBROIDERY_ENGINE_CONFIG.maxStitchLength

    );


  const color =
    options.color || null;

  const objectId =
    options.objectId || null;

  const layer =
    options.layer || 0;


  const stitches = [];


  if (
    !Array.isArray(points) ||
    points.length < 2
  ) {

    return stitches;

  }


  for (
    let segmentIndex = 0;
    segmentIndex <
    points.length - 1;
    segmentIndex++
  ) {

    const start =
      points[segmentIndex];

    const end =
      points[segmentIndex + 1];


    const length =
      distance(
        start,
        end
      );


    if (length <= 0) {
      continue;
    }


    const steps =
      Math.max(
        1,
        Math.ceil(
          length / stitchLength
        )
      );


    for (
      let step = 0;
      step < steps;
      step++
    ) {

      const amount =
        step / steps;


      stitches.push(

        createPoint(

          lerp(
            start.x,
            end.x,
            amount
          ),

          lerp(
            start.y,
            end.y,
            amount
          ),

          StitchType.RUNNING,

          {
            color,
            layer,
            objectId
          }

        )

      );

    }

  }


  const last =
    points[
      points.length - 1
    ];


  stitches.push(

    createPoint(

      last.x,

      last.y,

      StitchType.RUNNING,

      {
        color,
        layer,
        objectId
      }

    )

  );


  return stitches;

}


/* =========================================================
   13. SATIN STITCH GENERATOR
   ========================================================= */

function generateSatinStitches(
  centerLine,
  width,
  options = {}
) {

  const stitches = [];


  if (
    !Array.isArray(centerLine) ||
    centerLine.length < 2
  ) {

    return stitches;

  }


  const satinWidth =
    Math.max(
      0.5,
      safeNumber(
        width,
        2
      )
    );


  const spacing =
    Math.max(
      0.3,
      safeNumber(
        options.spacing,
        EMBROIDERY_ENGINE_CONFIG.satinSpacing
      )
    );


  const color =
    options.color || null;

  const objectId =
    options.objectId || null;

  const layer =
    options.layer || 0;


  for (
    let i = 0;
    i < centerLine.length - 1;
    i++
  ) {

    const a =
      centerLine[i];

    const b =
      centerLine[i + 1];


    const dx =
      b.x - a.x;

    const dy =
      b.y - a.y;


    const length =
      Math.sqrt(
        dx * dx +
        dy * dy
      );


    if (length <= 0) {
      continue;
    }


    const normalX =
      -dy / length;

    const normalY =
      dx / length;


    const rows =
      Math.max(
        2,
        Math.ceil(
          satinWidth /
          spacing
        )
      );


    for (
      let row = 0;
      row < rows;
      row++
    ) {

      const ratio =
        row /
        Math.max(
          1,
          rows - 1
        );


      const offset =
        (ratio - 0.5) *
        satinWidth;


      const startX =
        a.x +
        normalX * offset;

      const startY =
        a.y +
        normalY * offset;


      const endX =
        b.x +
        normalX * offset;

      const endY =
        b.y +
        normalY * offset;


      if (row % 2 === 0) {

        stitches.push(

          createPoint(
            startX,
            startY,
            StitchType.SATIN,
            {
              color,
              layer,
              objectId
            }
          )

        );

        stitches.push(

          createPoint(
            endX,
            endY,
            StitchType.SATIN,
            {
              color,
              layer,
              objectId
            }
          )

        );

      } else {

        stitches.push(

          createPoint(
            endX,
            endY,
            StitchType.SATIN,
            {
              color,
              layer,
              objectId
            }
          )

        );

        stitches.push(

          createPoint(
            startX,
            startY,
            StitchType.SATIN,
            {
              color,
              layer,
              objectId
            }
          )

        );

      }

    }

  }


  return stitches;

}


/* =========================================================
   14. RECTANGLE FILL
   ========================================================= */

function generateRectangleFill(
  x,
  y,
  width,
  height,
  options = {}
) {

  const stitches = [];


  const spacing =
    Math.max(
      0.5,
      safeNumber(
        options.spacing,
        EMBROIDERY_ENGINE_CONFIG.fillSpacing
      )
    );


  const color =
    options.color || null;

  const objectId =
    options.objectId || null;

  const layer =
    options.layer || 0;


  const rows =
    Math.max(
      1,
      Math.ceil(
        height / spacing
      )
    );


  for (
    let row = 0;
    row <= rows;
    row++
  ) {

    const currentY =
      Math.min(
        y +
        row * spacing,

        y + height
      );


    if (row % 2 === 0) {

      stitches.push(

        createPoint(
          x,
          currentY,
          StitchType.FILL,
          {
            color,
            layer,
            objectId
          }
        )

      );

      stitches.push(

        createPoint(
          x + width,
          currentY,
          StitchType.FILL,
          {
            color,
            layer,
            objectId
          }
        )

      );

    } else {

      stitches.push(

        createPoint(
          x + width,
          currentY,
          StitchType.FILL,
          {
            color,
            layer,
            objectId
          }
        )

      );

      stitches.push(

        createPoint(
          x,
          currentY,
          StitchType.FILL,
          {
            color,
            layer,
            objectId
          }
        )

      );

    }

  }


  return stitches;

}


/* =========================================================
   15. JUMP / TRIM / COLOR CHANGE
   ========================================================= */

function createJump(
  x,
  y,
  options = {}
) {

  return createPoint(

    x,
    y,

    StitchType.JUMP,

    options

  );

}


function createTrim(
  x,
  y,
  options = {}
) {

  return createPoint(

    x,
    y,

    StitchType.TRIM,

    options

  );

}


function createColorChange(
  x,
  y,
  color,
  options = {}
) {

  return createPoint(

    x,
    y,

    StitchType.COLOR_CHANGE,

    {
      ...options,
      color
    }

  );

}


/* =========================================================
   16. STITCH INDEXING
   ========================================================= */

function assignStitchIndexes(
  stitches
) {

  if (!Array.isArray(stitches)) {

    return [];

  }


  return stitches.map(
    (stitch, index) => ({

      ...stitch,

      index

    })
  );

}


/* =========================================================
   17. STITCH VALIDATION
   ========================================================= */

function validateStitchLengths(
  stitches,
  options = {}
) {

  const errors = [];

  const warnings = [];


  if (!Array.isArray(stitches)) {

    return {

      valid: false,

      errors: [
        "Stitch data is not an array."
      ],

      warnings

    };

  }


  const maxLength =
    safeNumber(
      options.maxStitchLength,
      EMBROIDERY_ENGINE_CONFIG.maxStitchLength
    );


  const minLength =
    safeNumber(
      options.minStitchLength,
      EMBROIDERY_ENGINE_CONFIG.minStitchLength
    );


  for (
    let i = 1;
    i < stitches.length;
    i++
  ) {

    const previous =
      stitches[i - 1];

    const current =
      stitches[i];


    if (
      previous.type === StitchType.JUMP ||
      current.type === StitchType.JUMP ||
      previous.type === StitchType.TRIM ||
      current.type === StitchType.TRIM ||
      previous.type === StitchType.COLOR_CHANGE ||
      current.type === StitchType.COLOR_CHANGE
    ) {

      continue;

    }


    const length =
      distance(
        previous,
        current
      );


    if (length > maxLength) {

      warnings.push({

        index: i,

        type:
          "long_stitch",

        length:
          roundCoordinate(length),

        message:
          "Long stitch detected."

      });

    }


    if (
      length < minLength &&
      length > 0
    ) {

      warnings.push({

        index: i,

        type:
          "short_stitch",

        length:
          roundCoordinate(length),

        message:
          "Very short stitch detected."

      });

    }

  }


  return {

    valid:
      errors.length === 0,

    errors,

    warnings

  };

}


/* =========================================================
   18. COLOR VALIDATION
   ========================================================= */

function validateColors(
  stitches
) {

  const colors =
    new Set();


  if (!Array.isArray(stitches)) {

    return {

      valid: false,

      colors: 0,

      errors: [
        "Invalid stitch data."
      ]

    };

  }


  stitches.forEach(
    (stitch) => {

      if (
        stitch.color &&
        stitch.type !== StitchType.JUMP &&
        stitch.type !== StitchType.TRIM
      ) {

        colors.add(
          stitch.color
        );

      }

    }
  );


  const errors = [];


  if (
    colors.size >
    EMBROIDERY_ENGINE_CONFIG.maxColors
  ) {

    errors.push(
      `Design contains too many thread colors. Maximum supported is ${EMBROIDERY_ENGINE_CONFIG.maxColors}.`
    );

  }


  return {

    valid:
      errors.length === 0,

    colors:
      colors.size,

    errors

  };

}


/* =========================================================
   19. STITCH STATISTICS
   ========================================================= */

function calculateStitchStatistics(
  stitches,
  options = {}
) {

  const stats = {

    totalStitches: 0,

    runningStitches: 0,

    satinStitches: 0,

    fillStitches: 0,

    jumps: 0,

    trims: 0,

    colorChanges: 0,

    colors: 0,

    estimatedTimeMinutes: 0,

    estimatedTimeSeconds: 0

  };


  if (!Array.isArray(stitches)) {

    return stats;

  }


  const colorSet =
    new Set();


  stitches.forEach(
    (stitch) => {

      switch (stitch.type) {

        case StitchType.RUNNING:

          stats.runningStitches++;

          break;


        case StitchType.SATIN:

          stats.satinStitches++;

          break;


        case StitchType.FILL:

          stats.fillStitches++;

          break;


        case StitchType.JUMP:

          stats.jumps++;

          break;


        case StitchType.TRIM:

          stats.trims++;

          break;


        case StitchType.COLOR_CHANGE:

          stats.colorChanges++;

          break;

      }


      if (
        stitch.color &&
        stitch.type !== StitchType.JUMP &&
        stitch.type !== StitchType.TRIM
      ) {

        colorSet.add(
          stitch.color
        );

      }

    }
  );


  stats.totalStitches =
    stats.runningStitches +
    stats.satinStitches +
    stats.fillStitches;


  stats.colors =
    colorSet.size;


  const speed =
    safeNumber(
      options.speedSPM,
      EMBROIDERY_ENGINE_CONFIG.machineSpeedSPM
    );


  stats.estimatedTimeMinutes =
    speed > 0
      ? stats.totalStitches / speed
      : 0;


  stats.estimatedTimeSeconds =
    Math.round(
      stats.estimatedTimeMinutes * 60
    );


  return stats;

}


/* =========================================================
   20. CENTER STITCHES
   ========================================================= */

function centerStitches(
  stitches,
  designWidth,
  designHeight
) {

  if (
    !Array.isArray(stitches) ||
    stitches.length === 0
  ) {

    return [];

  }


  const centerX =
    safeNumber(
      designWidth
    ) / 2;

  const centerY =
    safeNumber(
      designHeight
    ) / 2;


  const validStitches =
    stitches.filter(
      (stitch) =>
        Number.isFinite(stitch.x) &&
        Number.isFinite(stitch.y)
    );


  if (!validStitches.length) {

    return [];

  }


  const xs =
    validStitches.map(
      stitch => stitch.x
    );


  const ys =
    validStitches.map(
      stitch => stitch.y
    );


  const minX =
    Math.min(...xs);

  const maxX =
    Math.max(...xs);

  const minY =
    Math.min(...ys);

  const maxY =
    Math.max(...ys);


  const currentCenterX =
    (minX + maxX) / 2;

  const currentCenterY =
    (minY + maxY) / 2;


  const offsetX =
    centerX -
    currentCenterX;

  const offsetY =
    centerY -
    currentCenterY;


  return stitches.map(
    stitch => ({

      ...stitch,

      x:
        roundCoordinate(
          stitch.x + offsetX
        ),

      y:
        roundCoordinate(
          stitch.y + offsetY
        )

    })
  );

}


/* =========================================================
   21. SIMPLE TEST GEOMETRY
   ========================================================= */

function createTestOutline(
  width,
  height,
  margin = 0.5
) {

  const safeWidth =
    Math.max(
      0.5,
      width - margin * 2
    );


  const safeHeight =
    Math.max(
      0.5,
      height - margin * 2
    );


  return [

    {
      x: margin,
      y: margin
    },

    {
      x:
        margin +
        safeWidth,

      y: margin
    },

    {
      x:
        margin +
        safeWidth,

      y:
        margin +
        safeHeight
    },

    {
      x: margin,

      y:
        margin +
        safeHeight
    },

    {
      x: margin,
      y: margin
    }

  ];

}


/* =========================================================
   22. PRODUCTION PREFLIGHT
   ========================================================= */

function runProductionPreflight(
  design,
  stitches
) {

  const size =
    validateDesignSize(
      design
    );


  const stitch =
    validateStitchLengths(
      stitches
    );


  const color =
    validateColors(
      stitches
    );


  const errors = [

    ...size.errors,

    ...stitch.errors,

    ...color.errors

  ];


  const warnings = [

    ...size.warnings,

    ...stitch.warnings

  ];


  return {

    valid:
      errors.length === 0,

    errors,

    warnings,

    size,

    stitch,

    color

  };

}


/* =========================================================
   23. BUILD BASIC EMBROIDERY DESIGN
   ========================================================= */

function buildEmbroideryDesign(
  options = {}
) {

  const design =
    createEmbroideryDesign(
      options
    );


  const sizeValidation =
    validateDesignSize(
      design
    );


  if (!sizeValidation.valid) {

    design.validation = {

      valid: false,

      errors:
        sizeValidation.errors,

      warnings:
        sizeValidation.warnings

    };


    return {

      success: false,

      design,

      stitches: [],

      validation:
        design.validation,

      statistics:
        calculateStitchStatistics([])

    };

  }


  /*
   -----------------------------------------
   INTERNAL TEST GEOMETRY

   This is intentionally NOT an AI design.

   It allows the complete engine pipeline
   to be tested before the AI backend is
   connected.
   -----------------------------------------
  */


  const width =
    convertToInches(
      design.width,
      design.unit
    );


  const height =
    convertToInches(
      design.height,
      design.unit
    );


  const outline =
    createTestOutline(
      width,
      height
    );


  let stitches =
    generateRunningStitches(

      outline,

      {

        stitchLength:
          design.stitchLength,

        color:
          design.threadPalette[0] ||
          "#000000",

        objectId:
          "outline-001",

        layer:
          0

      }

    );


  stitches =
    centerStitches(
      stitches,
      width,
      height
    );


  stitches =
    assignStitchIndexes(
      stitches
    );


  const validation =
    runProductionPreflight(
      design,
      stitches
    );


  const statistics =
    calculateStitchStatistics(
      stitches,
      {
        speedSPM:
          design.production.speedSPM
      }
    );


  design.stitches =
    stitches;


  design.statistics =
    statistics;


  design.validation = {

    valid:
      validation.valid,

    errors:
      validation.errors,

    warnings:
      validation.warnings

  };


  design.layers = [

    {

      id:
        "layer-001",

      type:
        "running",

      name:
        "Outline",

      stitchCount:
        stitches.length

    }

  ];


  design.objects = [

    {

      id:
        "outline-001",

      type:
        "running",

      name:
        "Test Outline",

      stitchCount:
        stitches.length

    }

  ];


  design.status =
    validation.valid
      ? "validated"
      : "needs_review";


  design.metadata.updatedAt =
    new Date().toISOString();


  return {

    success:
      validation.valid,

    design,

    stitches,

    validation,

    statistics

  };

}


/* =========================================================
   24. AI DESIGN REQUEST MODEL
   ========================================================= */

/*
   This does NOT call an AI service directly.

   It creates a safe request object which the future
   backend can send to an AI/embroidery generation
   service.

   IMPORTANT:
   API keys should NEVER be placed in this browser file.
*/

function createAIDesignRequest(
  design
) {

  return {

    requestId:
      `AI-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 8)}`,

    designId:
      design.id,

    prompt:
      design.description,

    style:
      design.style,

    width:
      design.width,

    height:
      design.height,

    unit:
      design.unit,

    hoop:
      design.hoop,

    fabric:
      design.fabric,

    garment:
      design.garment,

    colors:
      design.colors,

    threadPalette:
      design.threadPalette,

    stitchPreference:
      design.stitchPreference ||
      "auto",

    placement:
      design.placement,

    referenceImage:
      design.referenceImage,

    production: {

      machine:
        design.production.machine,

      format:
        design.production.machineFormat,

      backing:
        design.production.backing,

      threadType:
        design.production.threadType,

      stabilization:
        design.production.stabilization

    },

    engineVersion:
      EMBROIDERY_ENGINE_VERSION,

    createdAt:
      new Date().toISOString()

  };

}


/* =========================================================
   25. DESIGN EDIT MODEL
   ========================================================= */

/*
   AI design banne ke baad user parameters edit
   kar sakta hai.

   Example:

   EmbroideryStitchEngine.editDesign(
      design,
      {
        width: 3.5,
        density: 0.5
      }
   );
*/

function editDesign(
  design,
  changes = {}
) {

  if (!design) {

    return null;

  }


  const editableFields = [

    "width",

    "height",

    "unit",

    "hoop",

    "fabric",

    "garment",

    "colors",

    "density",

    "stitchLength",

    "description",

    "style",

    "placement",

    "threadPalette"

  ];


  editableFields.forEach(
    field => {

      if (
        Object.prototype.hasOwnProperty.call(
          changes,
          field
        )
      ) {

        design[field] =
          changes[field];

      }

    }
  );


  design.version =
    safeNumber(
      design.version,
      1
    ) + 1;


  design.status =
    "edited";


  design.metadata.updatedAt =
    new Date().toISOString();


  return design;

}


/* =========================================================
   26. GENERATION / PAYMENT MODEL
   ========================================================= */

/*
   Payment system yahan directly implement nahi kiya gaya.

   Secure payment verification backend/Supabase/Razorpay
   side par hogi.

   Yeh object future integration ke liye hai.
*/

function createGenerationRequest(
  design,
  options = {}
) {

  return {

    generationId:
      design.generation.generationId ||
      `GEN-${Date.now()}`,

    designId:
      design.id,

    userId:
      options.userId || null,

    price:
      safeNumber(
        options.price,
        499
      ),

    currency:
      options.currency || "INR",

    paymentRequired:
      options.paymentRequired !== false,

    paymentStatus:
      "pending",

    status:
      "awaiting_payment",

    createdAt:
      new Date().toISOString()

  };

}


/* =========================================================
   27. BACKEND PAYLOAD
   ========================================================= */

/*
   Supabase/backend integration ke liye sanitized
   payload.

   Isme secret/API key nahi jayegi.
*/

function createBackendPayload(
  design
) {

  return {

    design_id:
      design.id,

    status:
      design.status,

    version:
      design.version,

    width:
      design.width,

    height:
      design.height,

    unit:
      design.unit,

    hoop:
      design.hoop,

    fabric:
      design.fabric,

    garment:
      design.garment,

    description:
      design.description,

    style:
      design.style,

    placement:
      design.placement,

    thread_palette:
      design.threadPalette,

    generation:
      {

        generation_id:
          design.generation.generationId,

        price:
          design.generation.price,

        currency:
          design.generation.currency,

        payment_required:
          design.generation.paymentRequired,

        payment_status:
          design.generation.paymentStatus

      },

    statistics:
      design.statistics,

    validation:
      design.validation,

    metadata:
      design.metadata

  };

}


/* =========================================================
   28. EXPORTABLE DESIGN DATA
   ========================================================= */

/*
   Yeh JSON design project save/load ke kaam aayega.

   Real DST/PES/EXP export alag encoder se hoga.
*/

function serializeDesign(
  design
) {

  if (!design) {

    return null;

  }


  return JSON.stringify(
    design,
    null,
    2
  );

}


function deserializeDesign(
  json
) {

  try {

    const design =
      typeof json === "string"
        ? JSON.parse(json)
        : json;


    if (!design) {

      return null;

    }


    return design;

  } catch (error) {

    console.error(
      "Could not load embroidery design.",
      error
    );

    return null;

  }

}


/* =========================================================
   29. MACHINE EXPORT PLACEHOLDER
   ========================================================= */

/*
   IMPORTANT:

   Real machine file encoding must be implemented
   separately.

   Supported future targets:

   DST
   PES
   JEF
   EXP
   VP3
   XXX
*/

function prepareMachineExport(
  design,
  format = "DST"
) {

  const supported =
    [
      "DST",
      "PES",
      "JEF",
      "EXP",
      "VP3",
      "XXX"
    ];


  const normalized =
    String(format)
      .toUpperCase();


  if (
    !supported.includes(
      normalized
    )
  ) {

    throw new Error(
      `Unsupported machine format: ${format}`
    );

  }


  if (
    !design ||
    !Array.isArray(
      design.stitches
    ) ||
    !design.stitches.length
  ) {

    throw new Error(
      "No stitch data available for export."
    );

  }


  return {

    ready:
      false,

    format:
      normalized,

    designId:
      design.id,

    stitchCount:
      design.statistics.totalStitches,

    message:
      "Machine encoder is not connected yet."

  };

}


/* =========================================================
   30. ENGINE HEALTH CHECK
   ========================================================= */

function healthCheck() {

  return {

    engine:
      "Embroidery AI Production Stitch Engine",

    version:
      EMBROIDERY_ENGINE_VERSION,

    browser:
      typeof window !== "undefined",

    stitchGeneration:
      true,

    validation:
      true,

    statistics:
      true,

    aiBackend:
      "not_connected",

    supabase:
      "not_connected",

    payment:
      "backend_required",

    machineEncoder:
      "not_connected",

    productionStatus:
      "development"

  };

}


/* =========================================================
   31. PUBLIC ENGINE API
   ========================================================= */

const EmbroideryStitchEngine =
  Object.freeze({

    version:
      EMBROIDERY_ENGINE_VERSION,


    StitchType,


    config:
      EMBROIDERY_ENGINE_CONFIG,


    hoops:
      EMBROIDERY_HOOPS,


    createDesign:
      createEmbroideryDesign,


    editDesign,


    generateRunning:
      generateRunningStitches,


    generateSatin:
      generateSatinStitches,


    generateFill:
      generateRectangleFill,


    createJump,


    createTrim,


    createColorChange,


    validateSize:
      validateDesignSize,


    validateStitches:
      validateStitchLengths,


    validateColors,


    preflight:
      runProductionPreflight,


    statistics:
      calculateStitchStatistics,


    center:
      centerStitches,


    build:
      buildEmbroideryDesign,


    createAIRequest:
      createAIDesignRequest,


    createGenerationRequest,


    createBackendPayload,


    serialize:
      serializeDesign,


    deserialize:
      deserializeDesign,


    prepareMachineExport,


    health:
      healthCheck,


    hoop:
      getHoopDimensions,


    safeHoopArea:
      getSafeHoopArea,


    formatHoop:
      formatHoopName

  });


/* =========================================================
   32. GLOBAL BROWSER ACCESS
   ========================================================= */

if (
  typeof window !== "undefined"
) {

  window.EmbroideryStitchEngine =
    EmbroideryStitchEngine;

}


/* =========================================================
   33. DEVELOPMENT INFORMATION
   ========================================================= */

console.info(
  `Embroidery AI Stitch Engine v${EMBROIDERY_ENGINE_VERSION} loaded.`
);

console.info(
  "Production pipeline ready: geometry → stitches → validation → statistics."
);

console.info(
  "AI, Supabase, payment and machine-file encoder remain backend modules."
);


/* =========================================================
   END OF STITCH ENGINE
   ========================================================= */
