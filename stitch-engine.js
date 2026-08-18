/* =========================================================
   EMBROIDERY AI — STITCH ENGINE
   Core embroidery geometry and stitch generation layer

   IMPORTANT:
   This module generates embroidery stitch DATA.
   It does NOT pretend to create a DST file.

   Flow:
   Design parameters
        ↓
   Geometry
        ↓
   Stitch generation
        ↓
   Validation
        ↓
   DST encoder (later)
   ========================================================= */


/* =========================================================
   01. ENGINE CONSTANTS
   ========================================================= */

const StitchType = Object.freeze({

  RUNNING: "running",

  SATIN: "satin",

  FILL: "fill",

  JUMP: "jump",

  TRIM: "trim",

  COLOR_CHANGE: "color_change"

});


const DEFAULT_ENGINE_CONFIG = Object.freeze({

  maxStitchLength: 12,

  minStitchLength: 0.4,

  defaultStitchLength: 2.5,

  defaultDensity: 0.45,

  satinDensity: 0.4,

  fillDensity: 0.45,

  hoopMargin: 2,

  coordinateScale: 10

});


/* =========================================================
   02. BASIC UTILITIES
   ========================================================= */

function clamp(value, min, max) {

  return Math.min(
    Math.max(value, min),
    max
  );

}


function lerp(a, b, amount) {

  return a +
    (b - a) * amount;

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
    value * 100
  ) / 100;

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

    color: options.color || null,

    layer: options.layer || 0,

    index: null

  };

}


/* =========================================================
   03. EMBROIDERY DESIGN MODEL
   ========================================================= */

function createEmbroideryDesign(options = {}) {

  const design = {

    width:
      Number(options.width) || 4,

    height:
      Number(options.height) || 4,

    unit:
      options.unit || "inch",

    hoop:
      options.hoop || "5x7",

    fabric:
      options.fabric || "cotton",

    garment:
      options.garment || "general",

    colors:
      options.colors || 1,

    density:
      Number(options.density) ||
      DEFAULT_ENGINE_CONFIG.defaultDensity,

    stitchLength:
      Number(options.stitchLength) ||
      DEFAULT_ENGINE_CONFIG.defaultStitchLength,

    layers: [],

    stitches: [],

    metadata: {

      createdAt:
        new Date().toISOString(),

      engine:
        "Embroidery AI Stitch Engine",

      engineVersion:
        "0.1.0"

    }

  };


  return design;

}


/* =========================================================
   04. HOOP DEFINITIONS
   ========================================================= */

const EMBROIDERY_HOOPS = Object.freeze({

  "4x4": {

    width: 4,

    height: 4

  },

  "5x7": {

    width: 5,

    height: 7

  },

  "6x10": {

    width: 6,

    height: 10

  },

  "8x12": {

    width: 8,

    height: 12

  }

});


function getHoopDimensions(hoopName) {

  return (
    EMBROIDERY_HOOPS[hoopName] ||
    null
  );

}


/* =========================================================
   05. HOOP VALIDATION
   ========================================================= */

function validateDesignSize(design) {

  const errors = [];

  const warnings = [];

  const hoop =
    getHoopDimensions(
      design.hoop
    );


  if (!hoop) {

    warnings.push(
      "Custom hoop requires explicit hoop dimensions."
    );

  } else {

    const margin =
      DEFAULT_ENGINE_CONFIG.hoopMargin;


    const availableWidth =
      hoop.width - margin;

    const availableHeight =
      hoop.height - margin;


    const fitsNormal =
      design.width <= availableWidth &&
      design.height <= availableHeight;


    const fitsRotated =
      design.width <= availableHeight &&
      design.height <= availableWidth;


    if (
      !fitsNormal &&
      !fitsRotated
    ) {

      errors.push(
        "Design exceeds the selected hoop's safe embroidery area."
      );

    }

  }


  if (design.width <= 0) {

    errors.push(
      "Design width must be greater than zero."
    );

  }


  if (design.height <= 0) {

    errors.push(
      "Design height must be greater than zero."
    );

  }


  return {

    valid:
      errors.length === 0,

    errors,

    warnings

  };

}


/* =========================================================
   06. RUNNING STITCH GENERATOR
   ========================================================= */

/*
   Converts a path into evenly spaced running stitches.

   points:
   [
     { x: 0, y: 0 },
     { x: 10, y: 10 },
     ...
   ]
*/

function generateRunningSt
