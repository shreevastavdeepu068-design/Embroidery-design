/* EmbroideryStitchEngine — lightweight frontend stitch generator
   Produces stitch geometry compatible with the application controller.

   - build(options) -> Promise resolving to { success, design, stitches, statistics, validation }
   - Coordinates are in the same units as options.unit ("inch" or "mm")

   This implementation is intentionally simple and deterministic, designed to
   provide realistic preview geometry for the UI while preserving the
   architecture for a future AI/production encoder.
*/

(function (global) {
  const EmbroideryStitchEngine = {
    version: "0.1.0",

    async build(options) {
      // Basic input sanitization
      const width = Number(options.width) || 4;
      const height = Number(options.height) || 4;
      const unit = options.unit || "inch";
      const hoop = options.hoop || "5x7";
      const fabric = options.fabric || "cotton";
      const garment = options.garment || "unknown";
      const colorsOpt = options.colors || "auto";
      const pref = options.stitchPreference || "auto";
      const description = (options.description || "").toLowerCase();

      // Unit helpers
      const toInches = (v) => (unit === "mm" ? v / 25.4 : v);
      const fromInches = (v) => (unit === "mm" ? v * 25.4 : v);

      // Determine target color count
      let colorCount = 3;
      if (colorsOpt === "auto") {
        if (description.includes("logo") || description.includes("text")) colorCount = 2;
        else if (description.includes("flower") || description.includes("floral")) colorCount = 4;
        else colorCount = 3;
      } else {
        const n = parseInt(colorsOpt, 10);
        if (Number.isFinite(n) && n > 0) colorCount = n;
      }

      // Choose stitch mode
      let mode = pref;
      if (mode === "auto") {
        if (description.includes("outline") || description.includes("line") || description.includes("text")) mode = "running";
        else if (description.includes("satin")) mode = "satin";
        else mode = "fill";
      }

      // Simple primitive selection based on description
      let primitive = "shape"; // shape | text | logo
      if (description.includes("text") || description.includes("word") || description.includes("letter")) primitive = "text";
      if (description.includes("logo")) primitive = "logo";
      if (description.includes("flower") || description.includes("leaf") || description.includes("petal")) primitive = "flower";

      // Generate normalized paths in design units (unit as provided)
      // We'll generate one or more continuous stroke groups; between groups we'll insert jumps/trims.

      const stitches = [];
      const groups = [];

      // Helper to add a continuous polyline as stitches (type 'stitch')
      function addPolyline(points, color) {
        // If current pen is elsewhere, add a jump to first point
        if (stitches.length > 0) {
          const last = stitches[stitches.length - 1];
          const currX = last.x;
          const currY = last.y;
          // Insert a jump only if distance significant
          const dx = points[0][0] - currX;
          const dy = points[0][1] - currY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 0.01) {
            stitches.push({ x: points[0][0], y: points[0][1], type: "jump" });
          }
        }

        // Emit stitches along the polyline
        for (let i = 0; i < points.length; i++) {
          stitches.push({ x: points[i][0], y: points[i][1], type: "stitch", color });
        }
      }

      // Basic shape generators
      function rectangleOutline(w, h, inset = 0.1, resolution = 0.05, color = "#111111") {
        const pts = [];
        const left = inset;
        const top = inset;
        const right = w - inset;
        const bottom = h - inset;
        // Walk the rectangle perimeter with steps
        const perim = 2 * (w + h - 4 * inset);
        const step = resolution;
        const steps = Math.max(4, Math.floor(perim / step));
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          // map t around perimeter
          const seg = t * perim;
          if (seg <= (right - left)) {
            pts.push([left + seg, top]);
          } else if (seg <= (right - left) + (bottom - top)) {
            pts.push([right, top + (seg - (right - left))]);
          } else if (seg <= (right - left) * 2 + (bottom - top)) {
            pts.push([right - (seg - ((right - left) + (bottom - top))), bottom]);
          } else {
            pts.push([left, bottom - (seg - ((right - left) * 2 + (bottom - top)))]);
          }
        }
        return pts;
      }

      function rectFill(w, h, spacing = 0.08, color = "#111111") {
        // horizontal zigzag rows across height
        const rows = [];
        let y = spacing / 2;
        let down = true;
        while (y < h - spacing / 2) {
          if (down) {
            rows.push([[0 + spacing / 2, y], [w - spacing / 2, y]]);
          } else {
            rows.push([[w - spacing / 2, y], [0 + spacing / 2, y]]);
          }
          down = !down;
          y += spacing;
        }
        return rows;
      }

      function circlePath(cx, cy, r, resolution = 0.05) {
        const pts = [];
        const steps = Math.max(12, Math.floor((2 * Math.PI * r) / resolution));
        for (let i = 0; i <= steps; i++) {
          const a = (i / steps) * Math.PI * 2;
          pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
        }
        return pts;
      }

      function starPath(cx, cy, rOuter, rInner, points = 5) {
        const pts = [];
        for (let i = 0; i < points * 2; i++) {
          const r = i % 2 === 0 ? rOuter : rInner;
          const a = (i / (points * 2)) * Math.PI * 2;
          pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
        }
        pts.push(pts[0]);
        return pts;
      }

      // Convert preferred spacing depending on fabric and stitch type
      function stitchSpacingForType(type) {
        // inches
        if (type === "running") return 0.05; // 0.05in (approx 1.27mm)
        if (type === "satin") return 0.06; // close satin spacing
        return 0.08; // fill stitch spacing
      }

      // Create actual geometry
      const pad = Math.min(width, height) * 0.08;
      const w = width - pad * 2;
      const h = height - pad * 2;
      const originX = pad;
      const originY = pad;

      // Colors palette (simple, deterministic)
      const palette = ["#2E86AB", "#F29E4C", "#E94F37", "#8F44AD", "#65E69A", "#C7FF2F", "#111111"]
        .slice(0, Math.max(1, colorCount));

      // Helper to push group with color changes
      function emitGroup(paths, colorIndex) {
        const color = palette[colorIndex % palette.length];
        // Insert color change entry
        stitches.push({ x: paths[0][0][0], y: paths[0][0][1], type: "color_change", color });
        for (const seg of paths) {
          addPolyline(seg, color);
          // add a small trim after each segment
          stitches.push({ x: seg[seg.length - 1][0], y: seg[seg.length - 1][1], type: "trim" });
        }
      }

      // Build different primitives
      if (primitive === "text" || primitive === "logo") {
        // Simplified: create a few stroked letter-like lines across the design
        const left = originX;
        const top = originY + h * 0.2;
        const spacing = w / 6;
        const letterHeight = h * 0.6;
        const basePaths = [];
        for (let i = 0; i < 5; i++) {
          const x = left + i * spacing;
          const pts = [[x, top], [x + spacing * 0.6, top + letterHeight * 0.5], [x, top + letterHeight]];
          basePaths.push(pts);
        }
        emitGroup(basePaths, 0);
      } else if (primitive === "flower") {
        // central circle + petals (star-like)
        const cx = originX + w / 2;
        const cy = originY + h / 2;
        const r = Math.min(w, h) * 0.18;
        const petals = [];
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const p1 = [cx + Math.cos(a) * r * 0.5, cy + Math.sin(a) * r * 0.5];
          const p2 = [cx + Math.cos(a) * r * 1.6, cy + Math.sin(a) * r * 1.6];
          const p3 = [cx + Math.cos(a + 0.3) * r * 0.7, cy + Math.sin(a + 0.3) * r * 0.7];
          petals.push([p1, p2, p3, p1]);
        }
        emitGroup(petals, 0);
        // center circle
        emitGroup([circlePath(cx, cy, r * 0.5, 0.02)], 1);
      } else {
        // default shape: rectangle border + fill depending on mode
        const outline = rectangleOutline(w, h, 0.06, stitchSpacingForType(mode));
        emitGroup([outline], 0);

        if (mode === "running") {
          // add a second offset outline to simulate decorative running
          const inner = rectangleOutline(w * 0.85, h * 0.85, 0.06 + Math.min(w, h) * 0.05, stitchSpacingForType(mode));
          // shift inner to center
          const offsetInner = inner.map((p) => [p[0] + originX + (w - w * 0.85) / 2, p[1] + originY + (h - h * 0.85) / 2]);
          emitGroup([offsetInner], 1);
        } else if (mode === "satin") {
          // Generate satin runs across the shorter dimension
          const spacing = stitchSpacingForType("satin");
          const runs = [];
          const isHorizontal = w >= h;
          if (isHorizontal) {
            const rows = rectFill(w, h, spacing);
            for (const r of rows) {
              // shift to origin
              runs.push(r.map((p) => [p[0] + originX, p[1] + originY]));
            }
          } else {
            // vertical runs
            const cols = rectFill(h, w, spacing);
            for (const r of cols) {
              runs.push(r.map((p) => [p[1] + originX, p[0] + originY]));
            }
          }
          // Emit runs possibly split across colors
          let ci = 1;
          const chunk = Math.max(1, Math.floor(runs.length / Math.max(1, palette.length - 1)));
          for (let i = 0; i < runs.length; i += chunk) {
            const segs = runs.slice(i, i + chunk);
            emitGroup(segs, ci);
            ci = (ci + 1) % palette.length;
          }
        } else {
          // fill stitch (zig-zag)
          const spacing = stitchSpacingForType("fill");
          const rows = rectFill(w, h, spacing);
          const runs = rows.map((r) => r.map((p) => [p[0] + originX, p[1] + originY]));
          emitGroup(runs, 1);
        }
      }

      // Normalize coordinates so they are expressed in the passed unit (they already are)

      // Compute statistics
      let totalStitches = 0;
      let jumps = 0;
      let trims = 0;
      let colorsUsed = new Set();
      for (const s of stitches) {
        if (!s.type || s.type === "stitch") totalStitches++;
        if (s.type === "jump") jumps++;
        if (s.type === "trim") trims++;
        if (s.color) colorsUsed.add(s.color);
      }

      const spm = 1200; // stitches per minute estimation
      const estimatedTimeMinutes = totalStitches / spm;

      const result = {
        success: true,
        design: {
          width,
          height,
          unit,
          hoop,
          fabric,
          garment
        },
        stitches,
        statistics: {
          totalStitches,
          colors: Math.max(1, colorsUsed.size),
          estimatedTimeMinutes,
          jumps: jumps + trims
        },
        validation: {
          // Very basic validation
          size: {
            valid: true,
            errors: []
          }
        }
      };

      // Slight async delay to simulate processing
      await new Promise((r) => setTimeout(r, 120));

      return result;
    }
  };

  // Expose globally
  global.EmbroideryStitchEngine = EmbroideryStitchEngine;
})(window);
