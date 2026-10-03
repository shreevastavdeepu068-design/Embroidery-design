/*
 stitch-planner.js
 Deterministic stitch planning layer for analyzed image regions
 
 Converts image regions -> stitch planning decisions
 Produces intermediate stitch plans with type, bounds, color, stitch parameters
 
 This is preview geometry planning, not production digitizing.
 All coordinates remain in design units (inches/mm as specified).
*/

(function (global) {
  
  /* CONFIGURATION */
  const STITCH_PLANNING = {
    // Minimum and maximum region dimensions (in inches, will scale to mm if needed)
    minRegionSizeInch: 0.1,
    maxRegionSizeInch: 30,
    
    // Aspect ratio thresholds
    minAspectForLine: 0.1,     // width/height < 0.1 or > 10 = line-like
    minAspectForSatin: 0.3,    // between 0.3 and 3.3 = satin candidate
    
    // Default stitch parameters (preview/planning only)
    defaultStitchLength: 2.5,  // mm equivalent
    defaultDensity: 0.45,      // 0-1 scale
    defaultUnderlay: false,
    defaultPullCompensation: 1.0,
    
    // Stitch type spacing (design units, inches)
    runningStitchSpacing: 0.05,
    satinStitchSpacing: 0.06,
    fillStitchSpacing: 0.08,
    
    // Safety thresholds
    minValidAreaPx: 10,        // Regions smaller than this are skipped
    maxDensity: 0.8,
    maxStitchLength: 12
  };

  /*
   UTILITY: Convert inches to design units
  */
  function convertToDesignUnits(inches, unit) {
    if (unit === 'mm') {
      return inches * 25.4;
    }
    return inches;
  }

  /*
   UTILITY: Convert design units to inches for calculations
  */
  function convertToInches(value, unit) {
    if (unit === 'mm') {
      return value / 25.4;
    }
    return value;
  }

  /*
   UTILITY: Clamp value between min and max
  */
  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  /*
   UTILITY: Calculate aspect ratio (width / height)
  */
  function getAspectRatio(width, height) {
    if (height === 0) return 0;
    return width / height;
  }

  /*
   UTILITY: Validate region bounds
   Returns true if region is valid and can be planned
  */
  function isValidRegion(region, designWidth, designHeight, unit) {
    if (!region || !region.boundingBox) {
      return false;
    }

    const bbox = region.boundingBox;
    
    // Check for zero/negative dimensions
    if (bbox.w <= 0 || bbox.h <= 0) {
      return false;
    }

    // Check if region is within design area
    if (bbox.x < 0 || bbox.y < 0 ||
        bbox.x + bbox.w > designWidth ||
        bbox.y + bbox.h > designHeight) {
      return false;
    }

    // Check minimum size in inches
    const widthInches = convertToInches(bbox.w, unit);
    const heightInches = convertToInches(bbox.h, unit);
    const minSize = STITCH_PLANNING.minRegionSizeInch;

    if (widthInches < minSize && heightInches < minSize) {
      return false;
    }

    // Check for NaN or invalid numbers
    if (!Number.isFinite(bbox.x) || !Number.isFinite(bbox.y) ||
        !Number.isFinite(bbox.w) || !Number.isFinite(bbox.h)) {
      return false;
    }

    return true;
  }

  /*
   STITCH TYPE SELECTION
   Deterministic rules based on region dimensions and aspect ratio
  */
  function selectStitchType(region, designWidth, designHeight, unit) {
    const bbox = region.boundingBox;
    const width = bbox.w;
    const height = bbox.h;

    // Convert to inches for threshold comparison
    const widthInches = convertToInches(width, unit);
    const heightInches = convertToInches(height, unit);
    const aspectRatio = getAspectRatio(width, height);
    const inverseAspect = getAspectRatio(height, width);

    // Rule 1: Very narrow/line-like regions -> running stitch
    const minAspect = Math.min(aspectRatio, inverseAspect);
    if (minAspect < STITCH_PLANNING.minAspectForLine) {
      return "running";
    }

    // Rule 2: Narrow elongated regions -> satin stitch
    if (minAspect >= STITCH_PLANNING.minAspectForLine &&
        minAspect <= STITCH_PLANNING.minAspectForSatin) {
      return "satin";
    }

    // Rule 3: Larger filled regions -> fill stitch
    const area = widthInches * heightInches;
    if (area > 0.5) {
      return "fill";
    }

    // Rule 4: Default to running stitch for small/medium regions
    return "running";
  }

  /*
   STITCH DIRECTION SELECTION
   Based on region aspect ratio
  */
  function selectStitchDirection(region, unit) {
    const bbox = region.boundingBox;
    const aspectRatio = getAspectRatio(bbox.w, bbox.h);

    // Horizontal regions -> horizontal stitch direction
    if (aspectRatio > 1.5) {
      return "horizontal";
    }

    // Vertical regions -> vertical stitch direction
    if (aspectRatio < 0.67) {
      return "vertical";
    }

    // Square/balanced regions -> default to horizontal
    return "horizontal";
  }

  /*
   DENSITY SELECTION
   Based on region size and stitch type
  */
  function selectDensity(stitchType, region, unit) {
    const bbox = region.boundingBox;
    const widthInches = convertToInches(bbox.w, unit);
    const heightInches = convertToInches(bbox.h, unit);
    const area = widthInches * heightInches;

    let baseDensity = STITCH_PLANNING.defaultDensity;

    // Adjust density based on stitch type
    if (stitchType === "running") {
      baseDensity = 0.4;  // Looser for running stitch
    } else if (stitchType === "satin") {
      baseDensity = 0.5;  // Medium for satin
    } else if (stitchType === "fill") {
      baseDensity = 0.6;  // Tighter for fill
    }

    // Reduce density for very large regions (avoid excessive stitching)
    if (area > 3.0) {
      baseDensity *= 0.8;
    }

    return clamp(baseDensity, 0.2, STITCH_PLANNING.maxDensity);
  }

  /*
   STITCH LENGTH SELECTION
   Based on region size and stitch type
  */
  function selectStitchLength(stitchType, region, unit) {
    const bbox = region.boundingBox;
    const widthInches = convertToInches(bbox.w, unit);

    // Base stitch length from type
    let stitchLength = STITCH_PLANNING.defaultStitchLength;

    if (stitchType === "running") {
      stitchLength = 1.27;  // ~0.05 inches
    } else if (stitchType === "satin") {
      stitchLength = 1.52;  // ~0.06 inches
    } else if (stitchType === "fill") {
      stitchLength = 2.0;   // ~0.08 inches
    }

    // Scale stitch length based on region width
    if (widthInches < 0.5) {
      stitchLength *= 0.7;
    } else if (widthInches > 2.0) {
      stitchLength *= 1.2;
    }

    return clamp(stitchLength, 0.8, STITCH_PLANNING.maxStitchLength);
  }

  /*
   COLOR CONVERSION
   From region mean color to embroidery color
  */
  function selectThreadColor(region) {
    // Use region's mean color if available
    if (region.meanColor) {
      const { r, g, b } = region.meanColor;
      // Return hex color
      const toHex = (n) => n.toString(16).padStart(2, '0');
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    // Default fallback
    return "#000000";
  }

  /*
   PLAN SINGLE REGION
   Convert analyzed region to stitch plan entry
  */
  function planRegion(region, designWidth, designHeight, unit) {
    if (!isValidRegion(region, designWidth, designHeight, unit)) {
      return null;
    }

    const bbox = region.boundingBox;
    const stitchType = selectStitchType(region, designWidth, designHeight, unit);
    const stitchDirection = selectStitchDirection(region, unit);
    const density = selectDensity(stitchType, region, unit);
    const stitchLength = selectStitchLength(stitchType, region, unit);
    const threadColor = selectThreadColor(region);
    const confidence = region.confidence || 0.7;

    return {
      // Region identification
      type: stitchType,
      bounds: {
        x: bbox.x,
        y: bbox.y,
        width: bbox.w,
        height: bbox.h
      },

      // Appearance
      color: threadColor,
      confidence: confidence,

      // Stitch parameters (preview/planning only)
      stitchDirection: stitchDirection,
      density: density,
      stitchLength: stitchLength,
      underlay: STITCH_PLANNING.defaultUnderlay,
      pullCompensation: STITCH_PLANNING.defaultPullCompensation,

      // Metadata
      sourceRegion: region.id
    };
  }

  /*
   GENERATE STITCH PLAN FROM REGIONS
   Main entry point
  */
  function generateStitchPlan(regions, designWidth, designHeight, unit, options = {}) {
    // Input validation
    if (!Array.isArray(regions)) {
      return {
        success: false,
        error: 'Regions must be an array',
        regions: []
      };
    }

    if (!Number.isFinite(designWidth) || designWidth <= 0) {
      return {
        success: false,
        error: 'Invalid design width',
        regions: []
      };
    }

    if (!Number.isFinite(designHeight) || designHeight <= 0) {
      return {
        success: false,
        error: 'Invalid design height',
        regions: []
      };
    }

    if (unit !== 'inch' && unit !== 'mm') {
      return {
        success: false,
        error: 'Unit must be "inch" or "mm"',
        regions: []
      };
    }

    // Plan each region
    const plannedRegions = [];
    const skippedCount = { invalid: 0, tooSmall: 0, outOfBounds: 0 };

    regions.forEach((region, idx) => {
      const planned = planRegion(region, designWidth, designHeight, unit);
      
      if (planned) {
        plannedRegions.push(planned);
      } else {
        // Track why region was skipped
        if (!region || !region.boundingBox) {
          skippedCount.invalid++;
        } else {
          const bbox = region.boundingBox;
          const widthInches = convertToInches(bbox.w, unit);
          const heightInches = convertToInches(bbox.h, unit);
          const minSize = STITCH_PLANNING.minRegionSizeInch;

          if (widthInches < minSize && heightInches < minSize) {
            skippedCount.tooSmall++;
          } else {
            skippedCount.outOfBounds++;
          }
        }
      }
    });

    return {
      success: true,
      regions: plannedRegions,
      stats: {
        total: regions.length,
        planned: plannedRegions.length,
        skipped: skippedCount
      },
      metadata: {
        designWidth: designWidth,
        designHeight: designHeight,
        unit: unit,
        timestamp: new Date().toISOString()
      }
    };
  }

  /*
   PUBLIC API
  */
  global.StitchPlanner = {
    generateStitchPlan: generateStitchPlan,
    config: STITCH_PLANNING
  };

})(window);
