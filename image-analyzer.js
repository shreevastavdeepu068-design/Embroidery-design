/*
 image-analyzer.js
 Local browser-based artwork analysis for Embroidery-design
 - Provides window.ImageAnalyzer.analyze(file) -> Promise<artworkAnalysis>
 - Uses canvas to sample pixels, detect transparency, estimate dominant colors,
   simple background separation, approximate connected regions on a downscaled bitmap,
   bounding box, and edge preview.

 This implementation is intentionally local and NOT an AI model.
*/

(function (global) {
  const MAX_PIXELS = 8000 * 8000; // safety upper bound
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB preferable limit for mobile
  const MAX_DIMENSION = 8192; // avoid extremely large bitmaps
  const DOWN_SCALE = 256; // size for region analysis and quantization

  function createImageFromFile(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(new Error('Image load failed'));
      };
      img.src = url;
    });
  }

  function drawToCanvas(img, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    return canvas;
  }

  function getImageData(img) {
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    const canvas = drawToCanvas(img, width, height);
    const ctx = canvas.getContext('2d');
    try {
      const data = ctx.getImageData(0, 0, width, height);
      return { data, canvas };
    } catch (err) {
      throw new Error('Unable to access image pixel data (CORS or unsupported format)');
    }
  }

  function sampleDownscaleCanvas(img, maxSide) {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    const scale = Math.min(1, maxSide / Math.max(w, h));
    const targetW = Math.max(1, Math.floor(w * scale));
    const targetH = Math.max(1, Math.floor(h * scale));
    const canvas = drawToCanvas(img, targetW, targetH);
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, targetW, targetH);
    return { canvas, imageData, width: targetW, height: targetH };
  }

  function rgbaToHex(r, g, b, a) {
    const toHex = (n) => n.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}${a < 255 ? toHex(a) : ''}`;
  }

  function computeAlphaStats(imageData) {
    const data = imageData.data;
    let total = 0;
    let transparent = 0;
    for (let i = 0; i < data.length; i += 4) {
      total++;
      const a = data[i + 3];
      if (a < 255) transparent++;
    }
    return {
      totalPixels: total,
      transparentPixels: transparent,
      transparencyPct: (transparent / Math.max(1, total)) * 100,
      hasAlpha: transparent > 0
    };
  }

  function quantizeColors(imageData, maxColors = 6) {
    // Simple color bucketing into reduced bins to approximate dominant colors.
    const data = imageData.data;
    const counts = new Map();
    const total = Math.floor(data.length / 4);
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      // Ignore fully transparent pixels
      if (a === 0) continue;
      // Reduce colors into 5-bit per channel (32 levels)
      const rr = (r >> 3) & 31;
      const gg = (g >> 3) & 31;
      const bb = (b >> 3) & 31;
      const key = (rr << 10) | (gg << 5) | bb;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const items = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    const colors = items.slice(0, maxColors).map(([key, count]) => {
      const rr = (key >> 10) & 31;
      const gg = (key >> 5) & 31;
      const bb = key & 31;
      // Expand back to 0-255 range by centering the bucket
      const r = Math.round((rr * 8) + 4);
      const g = Math.round((gg * 8) + 4);
      const b = Math.round((bb * 8) + 4);
      return { r, g, b, hex: rgbaToHex(r, g, b, 255), count };
    });
    const sum = colors.reduce((s, c) => s + c.count, 0);
    return colors.map((c) => ({ ...c, percentage: (c.count / Math.max(1, sum)) * 100 }));
  }

  function estimateBackgroundColor(edgeImageData) {
    // Sample a ring around the edges and take median color
    const data = edgeImageData.data;
    const w = edgeImageData.width;
    const h = edgeImageData.height;
    const samples = [];
    // top and bottom rows
    for (let x = 0; x < w; x++) {
      const ti = (x + 0 * w) * 4;
      samples.push([data[ti], data[ti + 1], data[ti + 2]]);
      const bi = (x + (h - 1) * w) * 4;
      samples.push([data[bi], data[bi + 1], data[bi + 2]]);
    }
    // left and right cols
    for (let y = 1; y < h - 1; y++) {
      const li = (0 + y * w) * 4;
      samples.push([data[li], data[li + 1], data[li + 2]]);
      const ri = ((w - 1) + y * w) * 4;
      samples.push([data[ri], data[ri + 1], data[ri + 2]]);
    }
    const median = [0, 0, 0].map((_, channel) => {
      const arr = samples.map((s) => s[channel]).sort((a, b) => a - b);
      return arr[Math.floor(arr.length / 2)] || 0;
    });
    return { r: median[0], g: median[1], b: median[2], hex: rgbaToHex(median[0], median[1], median[2], 255) };
  }

  function simpleSobel(imageData) {
    // Compute grayscale sobel on a small imageData
    const w = imageData.width;
    const h = imageData.height;
    const src = imageData.data;
    const out = new Uint8ClampedArray(w * h * 4);
    function grayAt(x, y) {
      const i = (x + y * w) * 4;
      return 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
    }
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const gx = -grayAt(x - 1, y - 1) - 2 * grayAt(x - 1, y) - grayAt(x - 1, y + 1)
                 + grayAt(x + 1, y - 1) + 2 * grayAt(x + 1, y) + grayAt(x + 1, y + 1);
        const gy = -grayAt(x - 1, y - 1) - 2 * grayAt(x, y - 1) - grayAt(x + 1, y - 1)
                 + grayAt(x - 1, y + 1) + 2 * grayAt(x, y + 1) + grayAt(x + 1, y + 1);
        const mag = Math.min(255, Math.hypot(gx, gy));
        const idx = (x + y * w) * 4;
        out[idx] = out[idx + 1] = out[idx + 2] = mag;
        out[idx + 3] = 255;
      }
    }
    return new ImageData(out, w, h);
  }

  function connectedComponents(binaryArray, width, height) {
    // binaryArray is Uint8Array length width*height with 1 for foreground
    const label = new Int32Array(width * height);
    let nextLabel = 1;
    const equivalences = {};
    function idx(x, y) { return x + y * width; }
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = idx(x, y);
        if (!binaryArray[i]) continue;
        const neighbors = [];
        if (x > 0 && binaryArray[idx(x - 1, y)]) neighbors.push(label[idx(x - 1, y)]);
        if (y > 0 && binaryArray[idx(x, y - 1)]) neighbors.push(label[idx(x, y - 1)]);
        if (neighbors.length === 0) {
          label[i] = nextLabel;
          equivalences[nextLabel] = new Set([nextLabel]);
          nextLabel++;
        } else {
          const minLabel = Math.min(...neighbors.filter(Boolean));
          label[i] = minLabel;
          neighbors.forEach((n) => {
            if (!n) return;
            equivalences[minLabel].add(n);
            if (!equivalences[n]) equivalences[n] = new Set([n]);
            equivalences[n].add(minLabel);
          });
        }
      }
    }
    // Flatten equivalences
    const mapping = {};
    Object.keys(equivalences).forEach((k) => {
      const set = equivalences[k];
      const rep = Math.min(...Array.from(set));
      set.forEach((v) => { mapping[v] = rep; });
    });
    // Remap labels
    const regions = new Map();
    for (let i = 0; i < label.length; i++) {
      if (!label[i]) continue;
      const mapped = mapping[label[i]] || label[i];
      label[i] = mapped;
      if (!regions.has(mapped)) regions.set(mapped, []);
      regions.get(mapped).push(i);
    }
    return { label, regions };
  }

  function computeRegionsFromMask(mask, width, height, imageData) {
    const { regions } = connectedComponents(mask, width, height);
    const regionSummaries = [];
    regions.forEach((pixels, id) => {
      // bounding box and mean color
      let minX = width, minY = height, maxX = 0, maxY = 0;
      let r = 0, g = 0, b = 0, a = 0;
      pixels.forEach((pIdx) => {
        const x = pIdx % width;
        const y = Math.floor(pIdx / width);
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
        const di = pIdx * 4;
        r += imageData.data[di];
        g += imageData.data[di + 1];
        b += imageData.data[di + 2];
        a += imageData.data[di + 3];
      });
      const area = pixels.length;
      const meanColor = {
        r: Math.round(r / area),
        g: Math.round(g / area),
        b: Math.round(b / area),
        a: Math.round(a / area)
      };
      regionSummaries.push({ id, boundingBox: { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 }, areaPx: area, meanColor, centroid: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 } });
    });
    // Sort by area descending
    regionSummaries.sort((a, b) => b.areaPx - a.areaPx);
    return regionSummaries;
  }

  async function analyze(file, options = {}) {
    const analysis = {
      source: file.name || 'file',
      width: null,
      height: null,
      aspectRatio: null,
      hasAlpha: false,
      transparencyPct: 0,
      dominantColors: [],
      colorPaletteCount: 0,
      regionsCount: 0,
      regions: [],
      boundingBox: null,
      edgesDataURL: null,
      thumbnailDataURL: null,
      aspect: null,
      confidence: 0,
      analysisStatus: 'pending',
      errorMessage: null
    };

    if (!file || !file.type || !file.name) {
      analysis.analysisStatus = 'invalid';
      analysis.errorMessage = 'No file provided';
      return analysis;
    }

    if (file.size > MAX_FILE_SIZE) {
      analysis.analysisStatus = 'too-large';
      analysis.errorMessage = `File size exceeds ${Math.round(MAX_FILE_SIZE / (1024 * 1024))}MB`;
      return analysis;
    }

    let img;
    try {
      img = await createImageFromFile(file);
    } catch (err) {
      analysis.analysisStatus = 'invalid';
      analysis.errorMessage = err.message;
      return analysis;
    }

    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    analysis.width = width;
    analysis.height = height;
    analysis.aspectRatio = width / height;
    analysis.aspect = width > height ? 'landscape' : (width < height ? 'portrait' : 'square');

    if (width > MAX_DIMENSION || height > MAX_DIMENSION || width * height > MAX_PIXELS) {
      analysis.analysisStatus = 'too-large';
      analysis.errorMessage = 'Image dimensions too large for in-browser analysis.';
      return analysis;
    }

    // Full size pixel read to check alpha if reasonable size, otherwise sample down
    let primarySample = null;
    try {
      if (width * height <= 2000 * 2000) {
        primarySample = getImageData(img);
      } else {
        primarySample = sampleDownscaleCanvas(img, Math.min(DOWN_SCALE, Math.max(width, height)));
        // primarySample.imageData is where pixels are
      }
    } catch (err) {
      analysis.analysisStatus = 'failed';
      analysis.errorMessage = err.message;
      return analysis;
    }

    const sampleImageData = primarySample.data ? primarySample.data : primarySample.imageData;
    const sampleCanvas = primarySample.canvas;

    const alphaStats = computeAlphaStats(sampleImageData);
    analysis.hasAlpha = alphaStats.hasAlpha;
    analysis.transparencyPct = alphaStats.transparencyPct;

    // Create a small thumbnail
    try {
      const thumbScale = Math.min(1, 200 / Math.max(width, height));
      const thumbW = Math.max(1, Math.floor(width * thumbScale));
      const thumbH = Math.max(1, Math.floor(height * thumbScale));
      const thumbCanvas = drawToCanvas(img, thumbW, thumbH);
      analysis.thumbnailDataURL = thumbCanvas.toDataURL('image/png');
    } catch (err) {
      // ignore thumbnail errors
    }

    // Dominant colors from the downscaled sample (use sampleImageData)
    try {
      const dominantColors = quantizeColors(sampleImageData, 8);
      analysis.dominantColors = dominantColors;
      analysis.colorPaletteCount = dominantColors.length;
    } catch (err) {
      // ignore color errors
    }

    // Estimate background color from edges
    let bgColor = null;
    try {
      const edgeSample = sampleDownscaleCanvas(img, Math.min(DOWN_SCALE, Math.max(width, height)));
      bgColor = estimateBackgroundColor(edgeSample.imageData);
      analysis.backgroundColor = bgColor;
    } catch (err) {
      // ignore
    }

    // Compute edge map for visualization
    try {
      const edgeSample = sampleDownscaleCanvas(img, Math.min(DOWN_SCALE, Math.max(width, height)));
      const sobel = simpleSobel(edgeSample.imageData);
      const ctx = edgeSample.canvas.getContext('2d');
      ctx.putImageData(sobel, 0, 0);
      analysis.edgesDataURL = edgeSample.canvas.toDataURL('image/png');
    } catch (err) {
      // ignore
    }

    // Foreground mask heuristic: if alpha exists use alpha, otherwise compare to bgColor
    try {
      const maskSample = sampleDownscaleCanvas(img, Math.min(DOWN_SCALE, Math.max(width, height)));
      const { imageData, width: sw, height: sh } = maskSample;
      const mask = new Uint8Array(sw * sh);
      for (let y = 0; y < sh; y++) {
        for (let x = 0; x < sw; x++) {
          const i = (x + y * sw) * 4;
          const r = imageData.data[i];
          const g = imageData.data[i + 1];
          const b = imageData.data[i + 2];
          const a = imageData.data[i + 3];
          let foreground = false;
          if (analysis.hasAlpha) {
            foreground = a > 16; // tiny threshold
          } else if (bgColor) {
            const dr = Math.abs(r - bgColor.r);
            const dg = Math.abs(g - bgColor.g);
            const db = Math.abs(b - bgColor.b);
            const diff = (dr + dg + db) / 3;
            foreground = diff > 24; // threshold to detect foreground from background
          } else {
            // fallback to luminance variance
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            foreground = Math.abs(lum - 128) > 32;
          }
          mask[x + y * sw] = foreground ? 1 : 0;
        }
      }
      // Connected components
      const regions = computeRegionsFromMask(mask, sw, sh, imageData);
      analysis.regions = regions.map((r) => ({ ...r, boundingBox: { x: Math.round(r.boundingBox.x * (width / sw)), y: Math.round(r.boundingBox.y * (height / sh)), w: Math.round(r.boundingBox.w * (width / sw)), h: Math.round(r.boundingBox.h * (height / sh)) } }));
      analysis.regionsCount = analysis.regions.length;
      if (analysis.regions.length > 0) {
        // approximate bounding box of largest region
        const main = analysis.regions[0];
        analysis.boundingBox = main.boundingBox;
      }
    } catch (err) {
      // ignore region errors
    }

    analysis.confidence = 0.7; // heuristic for now
    analysis.analysisStatus = (analysis.regionsCount === 0 && analysis.transparencyPct > 99) ? 'empty' : 'ok';
    if (analysis.analysisStatus === 'empty') {
      analysis.errorMessage = 'Image appears empty or fully transparent.';
    }
    return analysis;
  }

  global.ImageAnalyzer = {
    analyze: analyze
  };
})(window);
