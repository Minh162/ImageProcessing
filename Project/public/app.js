const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const chooseBtn = document.getElementById('chooseUploadBtn'); // added
const preview = document.getElementById('preview');
const resultImg = document.getElementById('result');
const optionSelect = document.getElementById('optionSelect');
const runBtn = document.getElementById('runBtn');

let uploadedFilename = null;

fileInput.addEventListener('change', (e) => {
  const f = e.target.files && e.target.files[0];
  if (f) uploadFile(f);
});

chooseBtn.addEventListener('click', () => {
  // mở file picker của input ẩn
  fileInput.click();
});

uploadBtn.addEventListener('click', () => {
  const f = fileInput.files && fileInput.files[0];
  if (!f) {
    alert('Chưa chọn file');
    return;
  }
  uploadFile(f);
});

async function uploadFile(file) {
  // disable the visible choose button while uploading
  if (chooseBtn) chooseBtn.disabled = true;
  const oldText = chooseBtn ? chooseBtn.textContent : (uploadBtn ? uploadBtn.textContent : 'Uploading...');
  if (chooseBtn) chooseBtn.textContent = 'Uploading...';
  if (!chooseBtn && uploadBtn) {
    uploadBtn.disabled = true;
    uploadBtn.textContent = 'Uploading...';
  }

  const fd = new FormData();
  fd.append('image', file);

  try {
    const res = await fetch('/upload', { method: 'POST', body: fd });
    if (!res.ok) throw new Error('Upload failed');
    const data = await res.json();
    // server nên trả { filename: '...', url: '...' }
    uploadedFilename = data.filename || null;
    const url = data.url || (uploadedFilename ? `/uploads/${uploadedFilename}` : null);
    if (url) {
      preview.src = url;
      resultImg.src = '';
    } else {
      alert('Upload hoàn tất nhưng server không trả về URL.');
    }
  } catch (err) {
    console.error(err);
    alert('Upload thất bại. Kiểm tra server.');
  } finally {
    if (chooseBtn) {
      chooseBtn.disabled = false;
      chooseBtn.textContent = oldText;
    }
    if (!chooseBtn && uploadBtn) {
      uploadBtn.disabled = false;
      uploadBtn.textContent = oldText;
    }
  }
}

// ---------------------- START: Client-side Option 1 pipeline (pure JS, no external libs) ----------------------
// The implementation below approximates your Python/OpenCV pipeline in JS:
// - grayscale -> CLAHE-like per-tile equalization -> median blur
// - Otsu threshold -> morphology (open/close) -> distance transform (approx)
// - connected components -> filter small components -> output mask

function imageDataFromImageElement(imgEl) {
  // Chuyển <img> thành ImageData để xử lý pixel thuần.
  // Dùng canvas tạm để lấy dữ liệu RGBA của ảnh.
  const canvas = document.createElement('canvas');
  canvas.width = imgEl.naturalWidth || imgEl.width;
  canvas.height = imgEl.naturalHeight || imgEl.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function putImageDataToDataURL(imageData) {
  // Chuyển ImageData thành dataURL (dùng để gán vào src của <img> cho hiển thị)
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d');
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL();
}

function rgbaToGrayUint8(imageData) {
  // Chuyển từ ảnh RGBA sang ảnh xám 8-bit (luminance). Đây là input chính cho các thuật toán
  // xử lý tiếp theo (CLAHE, lọc, threshold ...)
  const { data, width, height } = imageData;
  const gray = new Uint8ClampedArray(width * height);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    gray[p] = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) | 0;
  }
  return { gray, width, height };
}

// Simple CLAHE-like per-tile equalization (no clipping for simplicity)
// CLAHE-like: cân bằng histogram cục bộ theo ô (tile) để tăng tương phản cục bộ
// - Input: ảnh xám
// - Output: ảnh xám đã cân bằng cục bộ
function claheSimple(gray, w, h, tileSize = 64) {
  const out = new Uint8ClampedArray(gray.length);
  const tilesX = Math.max(1, Math.ceil(w / tileSize));
  const tilesY = Math.max(1, Math.ceil(h / tileSize));
  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      const x0 = tx * tileSize;
      const y0 = ty * tileSize;
      const x1 = Math.min(w, x0 + tileSize);
      const y1 = Math.min(h, y0 + tileSize);
      const hist = new Uint32Array(256);
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          hist[gray[y * w + x]]++;
        }
      }
      const area = (x1 - x0) * (y1 - y0);
      let sum = 0;
      const cdf = new Uint8ClampedArray(256);
      for (let i = 0; i < 256; i++) {
        sum += hist[i];
        cdf[i] = ((sum / area) * 255) | 0;
      }
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          out[y * w + x] = cdf[gray[y * w + x]];
        }
      }
    }
  }
  return out;
}

// median blur (square window)
// Median blur: lọc trung vị để loại nhiễu muối-giấy (salt-and-pepper)
// - Giữ cạnh tốt hơn so với gaussian blur trong một số trường hợp
function medianBlur(gray, w, h, radius = 2) {
  const out = new Uint8ClampedArray(gray.length);
  const size = radius * 2 + 1;
  const tmp = new Uint8ClampedArray(size * size);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let idx = 0;
      for (let yy = Math.max(0, y - radius); yy <= Math.min(h - 1, y + radius); yy++) {
        for (let xx = Math.max(0, x - radius); xx <= Math.min(w - 1, x + radius); xx++) {
          tmp[idx++] = gray[yy * w + xx];
        }
      }
      tmp.slice(0, idx).sort((a, b) => a - b);
      out[y * w + x] = tmp[(idx / 2) | 0];
    }
  }
  return out;
}

function otsuThreshold(gray) {
  // Otsu: tìm ngưỡng tối ưu tách hai lớp (foreground/background) bằng cách tối đa hóa
  // phương sai giữa các lớp. Trả về ảnh nhị phân và ngưỡng.
  const hist = new Uint32Array(256);
  const n = gray.length;
  for (let i = 0; i < n; i++) hist[gray[i]]++;
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];
  let sumB = 0, wB = 0, wF = 0;
  let varMax = 0, threshold = 0;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    wF = n - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const varBetween = wB * wF * (mB - mF) * (mB - mF);
    if (varBetween > varMax) {
      varMax = varBetween;
      threshold = t;
    }
  }
  const bin = new Uint8ClampedArray(n);
  for (let i = 0; i < n; i++) bin[i] = gray[i] > threshold ? 255 : 0;
  return { bin, threshold };
}

function dilateBinary(bin, w, h, ksize = 3, iterations = 1) {
  // Dilation nhị phân: mở rộng vùng foreground (pixel 255) bằng kernel vuông
  // Dùng để nối các vùng gần nhau (khi cần connect) hoặc tăng sure background
  let src = bin;
  const out = new Uint8ClampedArray(bin.length);
  for (let it = 0; it < iterations; it++) {
    out.fill(0);
    const r = (ksize - 1) / 2 | 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let any = 0;
        for (let yy = Math.max(0, y - r); yy <= Math.min(h - 1, y + r) && !any; yy++) {
          for (let xx = Math.max(0, x - r); xx <= Math.min(w - 1, x + r); xx++) {
            if (src[yy * w + xx] === 255) { any = 1; break; }
          }
        }
        out[y * w + x] = any ? 255 : 0;
      }
    }
    src = out.slice();
  }
  return src;
}

function erodeBinary(bin, w, h, ksize = 3, iterations = 1) {
  // Erosion nhị phân: co vùng foreground (pixel 255), loại bỏ nhiễu nhỏ
  // Kết hợp erosion + dilation để thực hiện opening/closing
  let src = bin;
  const out = new Uint8ClampedArray(bin.length);
  for (let it = 0; it < iterations; it++) {
    out.fill(0);
    const r = (ksize - 1) / 2 | 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let all = 1;
        for (let yy = Math.max(0, y - r); yy <= Math.min(h - 1, y + r) && all; yy++) {
          for (let xx = Math.max(0, x - r); xx <= Math.min(w - 1, x + r); xx++) {
            if (src[yy * w + xx] === 0) { all = 0; break; }
          }
        }
        out[y * w + x] = all ? 255 : 0;
      }
    }
    src = out.slice();
  }
  return src;
}

function distanceTransform(bin, w, h) {
  // Distance transform (approx): tính khoảng cách từ mỗi pixel foreground đến biên
  // Đây là bước để tìm "sure foreground" bằng cách lấy các pixel có khoảng cách lớn
  // (pixel ở giữa vùng) > threshold.
  const INF = 1e8;
  const dist = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) dist[i] = bin[i] === 0 ? 0 : INF;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (dist[i] === 0) continue;
      let v = dist[i];
      if (x > 0) v = Math.min(v, dist[i - 1] + 1);
      if (y > 0) v = Math.min(v, dist[i - w] + 1);
      if (x > 0 && y > 0) v = Math.min(v, dist[i - w - 1] + Math.SQRT2);
      dist[i] = v;
    }
  }
  for (let y = h - 1; y >= 0; y--) {
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x;
      let v = dist[i];
      if (x + 1 < w) v = Math.min(v, dist[i + 1] + 1);
      if (y + 1 < h) v = Math.min(v, dist[i + w] + 1);
      if (x + 1 < w && y + 1 < h) v = Math.min(v, dist[i + w + 1] + Math.SQRT2);
      dist[i] = v;
    }
  }
  return dist;
}

function connectedComponentsLabel(bin, w, h) {
  // Connected Components Labeling (two-pass with union-find)
  // - Trả về mảng labels và số nhãn (nLabels)
  // - Dùng để tính diện tích, centroid, bounding-box của từng component
  const labels = new Int32Array(w * h).fill(0);
  const parent = [];
  let nextLabel = 1;
  function find(a) { while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; } return a; }
  function union(a, b) { const ra = find(a), rb = find(b); if (ra !== rb) parent[rb] = ra; }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (bin[i] === 0) continue;
      const neighbors = [];
      if (x > 0 && bin[i - 1]) neighbors.push(labels[i - 1]);
      if (y > 0 && bin[i - w]) neighbors.push(labels[i - w]);
      if (neighbors.length === 0) {
        parent[nextLabel] = nextLabel;
        labels[i] = nextLabel;
        nextLabel++;
      } else {
        const lbl = Math.min(...neighbors.filter(v => v > 0));
        labels[i] = lbl;
        for (const nb of neighbors) if (nb && nb !== lbl) union(lbl, nb);
      }
    }
  }
  const map = new Int32Array(nextLabel);
  let newId = 1;
  for (let i = 1; i < nextLabel; i++) {
    if (parent[i] === undefined) continue;
    const r = find(i);
    if (!map[r]) map[r] = newId++;
    map[i] = map[r];
  }
  for (let i = 0; i < labels.length; i++) {
    if (labels[i] > 0) labels[i] = map[labels[i]] || 0;
  }
  return { labels, nLabels: newId - 1 };
}

function maskToImageData(mask, w, h) {
  // Chuyển mask nhị phân (0/255) thành ImageData để vẽ hoặc đổi sang dataURL
  const id = new ImageData(w, h);
  for (let i = 0, p = 0; i < mask.length; i++, p += 4) {
    const v = mask[i];
    id.data[p] = v; id.data[p + 1] = v; id.data[p + 2] = v; id.data[p + 3] = 255;
  }
  return id;
}
// Create an overlay dataURL: draw original image then paint mask as translucent color
function makeOverlayDataUrlFromMask(origImgEl, mask, w, h, color = [255, 0, 0, 140]) {
  // Tạo overlay: vẽ ảnh gốc, sau đó tô màu (translucent) cho các pixel mask
  // Dùng để người dùng quan sát vùng được phát hiện chồng lên ảnh thật
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(origImgEl, 0, 0, w, h);
  const id = ctx.getImageData(0, 0, w, h);
  for (let i = 0, p = 0; i < mask.length; i++, p += 4) {
    if (mask[i]) {
      id.data[p] = color[0];
      id.data[p + 1] = color[1];
      id.data[p + 2] = color[2];
      id.data[p + 3] = color[3];
    }
  }
  ctx.putImageData(id, 0, 0);
  return canvas.toDataURL();
}

// Draw bounding boxes for components and return dataURL
function makeBoxesDataUrl(origImgEl, labels, nLabels, w, h) {
  // Vẽ bounding boxes quanh các component (kèm nhãn diện tích)
  // Giúp debug: biết component nào lớn/nhỏ và vị trí của chúng
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(origImgEl, 0, 0, w, h);
  ctx.lineWidth = Math.max(2, Math.round(Math.min(w, h) / 200));
  const xs = new Array(nLabels + 1).fill(Infinity);
  const ys = new Array(nLabels + 1).fill(Infinity);
  const xM = new Array(nLabels + 1).fill(-Infinity);
  const yM = new Array(nLabels + 1).fill(-Infinity);
  const areas = new Array(nLabels + 1).fill(0);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const L = labels[i];
      if (L > 0) {
        areas[L]++; xs[L] = Math.min(xs[L], x); ys[L] = Math.min(ys[L], y);
        xM[L] = Math.max(xM[L], x); yM[L] = Math.max(yM[L], y);
      }
    }
  }
  for (let L = 1; L <= nLabels; L++) {
    if (areas[L] === 0) continue;
    const bx = xs[L], by = ys[L], bw = xM[L] - bx + 1, bh = yM[L] - by + 1;
    ctx.strokeStyle = 'rgba(0,255,0,0.9)';
    ctx.strokeRect(bx, by, bw, bh);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(bx, Math.max(0, by - 18), Math.min(120, bw), 18);
    ctx.fillStyle = 'white';
    ctx.font = '12px sans-serif';
    ctx.fillText(`${areas[L]} px`, bx + 2, Math.max(12, by - 4));
  }
  return canvas.toDataURL();
}

// Improved analysis: adaptive minArea and stricter thresholds to reduce false positives
function analyzeMaskForFracture(mask, w, h) {
  // Hàm phân tích mask và đưa ra quyết định có/không gãy xương dựa trên heuristic.
  // Các bước chính:
  // - tính phần trăm mask trên toàn ảnh (maskPct) để loại trường hợp quá nhỏ/khổng lồ
  // - gán nhãn component, tính diện tích từng component
  // - chọn các component "significant" (đủ lớn) rồi so sánh largest vs second, fragRatio
  // - bổ sung kiểm tra khoảng cách centroid để phát hiện mảnh nhỏ tách rời
  // Trả về object chi tiết để hiển thị (fracture, confidence, nComponents, ...)
  const bin = new Uint8ClampedArray(mask.length);
  let totalMask = 0;
  for (let i = 0; i < mask.length; i++) { bin[i] = mask[i] ? 1 : 0; if (bin[i]) totalMask++; }
  const imageArea = w * h;
  const maskPct = totalMask / imageArea;

  // Quick sanity checks: extremely small or very large masks -> likely not fracture
  // stricter: ignore tiny masks (<0.2%) and very large masks (>20%)
  if (maskPct < 0.002 || maskPct > 0.20) {
    return { fracture: false, confidence: 4, nComponents: 0, largestArea: 0, maskPct };
  }

  const cc = connectedComponentsLabel(bin, w, h);
  const labels = cc.labels;
  const n = cc.nLabels;
  if (n === 0) return { fracture: false, confidence: 0, nComponents: 0, largestArea: 0, maskPct };

  const areas = new Array(n + 1).fill(0);
  for (let i = 0; i < labels.length; i++) { const L = labels[i]; if (L > 0) areas[L]++; }

  // Adaptive minimum significant area: 0.5% of image or at least 2500px (stricter)
  const minArea = Math.max(2500, Math.round(imageArea * 0.005));
  const significant = [];
  for (let L = 1; L <= n; L++) if (areas[L] >= minArea) significant.push({ label: L, area: areas[L] });

  if (significant.length === 0) {
    // No sufficiently large components: probably noise / segmentation of bone outlines
    return { fracture: false, confidence: 6, nComponents: n, largestArea: Math.max(...areas), maskPct, minArea };
  }

  significant.sort((a, b) => b.area - a.area);
  const largest = significant[0].area;
  const second = significant[1] ? significant[1].area : 0;
  const sumSig = significant.reduce((s, it) => s + it.area, 0);
  const fragRatio = (sumSig - largest) / largest;
  const secondRatio = largest > 0 ? second / largest : 0;

  // Additional analysis: look at all components (including those smaller than minArea)
  // to detect isolated fragments far from the main bone.
  const compsAll = [];
  const xs = new Array(n + 1).fill(Infinity);
  const ys = new Array(n + 1).fill(Infinity);
  const xM = new Array(n + 1).fill(-Infinity);
  const yM = new Array(n + 1).fill(-Infinity);
  const cx = new Array(n + 1).fill(0);
  const cy = new Array(n + 1).fill(0);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const L = labels[i];
      if (L > 0) {
        cx[L] += x; cy[L] += y;
        xs[L] = Math.min(xs[L], x); ys[L] = Math.min(ys[L], y);
        xM[L] = Math.max(xM[L], x); yM[L] = Math.max(yM[L], y);
      }
    }
  }
  for (let L = 1; L <= n; L++) {
    if (areas[L] === 0) continue;
    const a = areas[L];
    const centroidX = cx[L] / a;
    const centroidY = cy[L] / a;
    const bw = xM[L] - xs[L] + 1;
    const bh = yM[L] - ys[L] + 1;
    const touchesBorder = (xs[L] === 0 || ys[L] === 0 || xM[L] === w - 1 || yM[L] === h - 1);
    compsAll.push({ label: L, area: a, centroid: [centroidX, centroidY], bbox: [xs[L], ys[L], bw, bh], touchesBorder });
  }

  // bounding box of mask (approx bone extents)
  let minX = w, minY = h, maxX = 0, maxY = 0;
  for (const c of compsAll) {
    minX = Math.min(minX, c.bbox[0]); minY = Math.min(minY, c.bbox[1]);
    maxX = Math.max(maxX, c.bbox[0] + c.bbox[2] - 1); maxY = Math.max(maxY, c.bbox[1] + c.bbox[3] - 1);
  }
  const diag = Math.hypot(maxX - minX + 1, maxY - minY + 1) || Math.max(w, h);

  // centroid distance between largest and other components
  const largestCentroid = compsAll.find(c => c.area === largest)?.centroid || null;
  let anyFarSmall = false;
  if (largestCentroid) {
    for (const c of compsAll) {
      if (c.area >= Math.round(minArea * 0.2) && c.area < minArea) {
        const d = Math.hypot(c.centroid[0] - largestCentroid[0], c.centroid[1] - largestCentroid[1]);
        // if a not-too-tiny fragment sits far from main bone (>=18% diag), mark it
        if (d / diag >= 0.18) { anyFarSmall = true; break; }
      }
    }
  }

  // Compute how much of the significant mass touches image border (background artifacts often touch borders)
  let sigBorderArea = 0;
  for (const c of compsAll) {
    if (c.area >= minArea && c.touchesBorder) sigBorderArea += c.area;
  }
  const borderFraction = sumSig > 0 ? sigBorderArea / sumSig : 0;

  // Note: For hand/wrist X-rays, bones naturally extend to image borders (fingers, forearm).
  // Only reject if borderFraction is VERY high (>90%) AND maskPct is also very small (<2%)
  // indicating this is likely pure background noise rather than actual bone structures.
  if (borderFraction >= 0.90 && maskPct < 0.02) {
    return { fracture: false, confidence: 8, nComponents: n, nSignificant: significant.length, largestArea: largest, secondArea: second, maskPct, minArea, borderFraction };
  }

  // Also compute counts excluding border-touching components (effective significant components)
  const nonBorderSignificant = significant.filter(s => {
    const comp = compsAll.find(c => c.label === s.label);
    return comp && !comp.touchesBorder;
  });
  const effectiveCount = nonBorderSignificant.length;
  const effectiveLargest = nonBorderSignificant[0] ? nonBorderSignificant[0].area : largest;
  const effectiveSecond = nonBorderSignificant[1] ? nonBorderSignificant[1].area : 0;
  const effectiveSum = nonBorderSignificant.reduce((s, it) => s + it.area, 0);
  const effectiveFragRatio = effectiveLargest > 0 ? (effectiveSum - effectiveLargest) / effectiveLargest : 0;

  // Decision: require evidence among non-border significant components where possible.
  const fracture = (
    (effectiveCount >= 2 && (effectiveSecond / effectiveLargest) >= 0.5) ||
    (effectiveFragRatio >= 0.6 && effectiveCount >= 2) ||
    anyFarSmall
  );

  // Confidence: combine metrics (scaled)
  let score = 0;
  // Use effective ratios (non-border) when available to compute score
  const useSecondRatio = effectiveLargest > 0 ? (effectiveSecond / effectiveLargest) : secondRatio;
  const useFragRatio = effectiveLargest > 0 ? effectiveFragRatio : fragRatio;
  score += Math.min(1, useSecondRatio * 1.2);
  score += Math.min(1, useFragRatio);
  score += Math.min(1, (significant.length - 1) / 5);
  score = Math.min(1, score / 2.2);
  const confidence = Math.round(score * 100);

  return {
    fracture,
  // If borderFraction is non-zero reduce confidence slightly
  confidence: fracture ? Math.max(Math.round(confidence * (1 - Math.min(borderFraction, 0.25))), 10) : Math.max(100 - confidence, 5),
    nComponents: n,
    nSignificant: significant.length,
    largestArea: largest,
    secondArea: second,
    maskPct,
    minArea
  };
}

async function processOption1Client() {
  if (!preview.src) { alert('Chưa có ảnh preview để xử lý.'); return; }
  runBtn.disabled = true;
  const old = runBtn.textContent;
  runBtn.textContent = 'Processing (client)...';
  try {
    // 1) Lấy ImageData từ ảnh preview
    const imageData = imageDataFromImageElement(preview);
    const { gray, width, height } = rgbaToGrayUint8(imageData);

    // 2) Tăng tương phản cục bộ (CLAHE-like) để xương nổi bật hơn
    const clahe = claheSimple(gray, width, height, Math.max(32, Math.floor(Math.min(width, height) / 8)));

    // 3) Làm mượt bằng median filter để giảm nhiễu trước khi threshold
    const den = medianBlur(clahe, width, height, 2);

    // 4) Ngưỡng hóa tự động (Otsu) để chuyển sang nhị phân
    const { bin } = otsuThreshold(den);

    // 5) Morphological open/close để loại nhiễu nhỏ và nối các vùng mong muốn
    let cleaned = erodeBinary(bin, width, height, 5, 1);
    cleaned = dilateBinary(cleaned, width, height, 5, 1);
    cleaned = dilateBinary(cleaned, width, height, 5, 1);
    cleaned = erodeBinary(cleaned, width, height, 5, 1);
  // NOTE: cleaned has bone regions as 255. We need inv such that
  // foreground for distanceTransform corresponds to bone pixels (255).
  // Previously this was inverted (bone -> 0) which caused the distance
  // transform to compute distances for background and produced background
  // 'sureFg' regions. That produced masks on the background (border)
  // instead of bones. Fix: make inv[i] = cleaned[i] ? 255 : 0
  const inv = new Uint8ClampedArray(cleaned.length);
  for (let i = 0; i < cleaned.length; i++) inv[i] = cleaned[i] ? 255 : 0;
    const dist = distanceTransform(inv, width, height);
    let maxd = 0;
    for (let i = 0; i < dist.length; i++) if (dist[i] > maxd) maxd = dist[i];
    const sureFg = new Uint8ClampedArray(dist.length);
    // Giảm threshold để giữ nhiều vùng xương hơn (0.4 -> 0.25)
    const thr = 0.25 * maxd;
    for (let i = 0; i < dist.length; i++) sureFg[i] = dist[i] >= thr ? 255 : 0;
    const sureBg = dilateBinary(cleaned, width, height, 5, 3);
    const unknown = new Uint8ClampedArray(cleaned.length);
    for (let i = 0; i < cleaned.length; i++) unknown[i] = (sureBg[i] === 255 && sureFg[i] === 0) ? 255 : 0;
    const cc = connectedComponentsLabel(sureFg, width, height);
    const labels = cc.labels;
    const counts = new Int32Array(cc.nLabels + 1);
    for (let i = 0; i < labels.length; i++) if (labels[i] > 0) counts[labels[i]]++;
    const outMask = new Uint8ClampedArray(labels.length);
    // Tăng minArea để loại bỏ nhiều mảnh nhỏ nhiễu/biên hơn (200 -> 800)
    const minArea = 800;
    for (let i = 0; i < labels.length; i++) {
      const lab = labels[i];
      if (lab > 0 && counts[lab] >= minArea) outMask[i] = 255;
      else outMask[i] = 0;
    }
    // Before analysis, apply morphological closing to merge nearby fragments
    let closedMask = outMask.slice();
  // Giảm closing để tránh nối quá mức các mảnh gãy tách rời (k=7,it=2 -> k=5,it=1)
  closedMask = dilateBinary(closedMask, width, height, 5, 1);
  closedMask = erodeBinary(closedMask, width, height, 5, 1);

    // Create visualization but filter out small/noisy components so overlay isn't scattered
    const ccOut = connectedComponentsLabel(closedMask, width, height);
    const areas = new Int32Array(ccOut.nLabels + 1);
    for (let i = 0; i < ccOut.labels.length; i++) {
      const L = ccOut.labels[i]; if (L > 0) areas[L]++;
    }
  // display threshold: lower to show smaller real fragments (0.05% or 100px minimum)
  const displayMinArea = Math.max(100, Math.round((width * height) * 0.0005));
    // build relabel map and filtered labels
    const map = new Int32Array(ccOut.nLabels + 1);
    let newId = 0;
    for (let L = 1; L <= ccOut.nLabels; L++) {
      if (areas[L] >= displayMinArea) map[L] = ++newId;
    }
    const filteredLabels = new Int32Array(ccOut.labels.length);
    for (let i = 0; i < ccOut.labels.length; i++) {
      const L = ccOut.labels[i]; filteredLabels[i] = L > 0 ? map[L] : 0;
    }
    // create filtered mask (only significant components kept) for visualization
    const filteredMask = new Uint8ClampedArray(filteredLabels.length);
    for (let i = 0; i < filteredLabels.length; i++) filteredMask[i] = filteredLabels[i] ? 255 : 0;
    const outId = maskToImageData(filteredMask, width, height);
    const maskUrl = putImageDataToDataURL(outId);
    const overlayUrl = makeOverlayDataUrlFromMask(preview, filteredMask, width, height);
    const boxesUrl = makeBoxesDataUrl(preview, filteredLabels, newId, width, height);
    // default view: overlay
    resultImg.src = overlayUrl;
    // setup view controls
    const showOverlayBtn = document.getElementById('showOverlayBtn');
    const showMaskBtn = document.getElementById('showMaskBtn');
    const showBoxesBtn = document.getElementById('showBoxesBtn');
    const showRawBtn = document.getElementById('showRawBtn');
    // prepare raw overlay from un-closed mask for debugging (shows original fragments)
    const rawMaskUrl = putImageDataToDataURL(maskToImageData(outMask, width, height));
    const rawOverlayUrl = makeOverlayDataUrlFromMask(preview, outMask, width, height);

    if (showOverlayBtn && showMaskBtn && showBoxesBtn && showRawBtn) {
      showOverlayBtn.style.display = '';
      showMaskBtn.style.display = '';
      showBoxesBtn.style.display = '';
      showRawBtn.style.display = '';
      showOverlayBtn.onclick = () => { resultImg.src = overlayUrl; };
      showMaskBtn.onclick = () => { resultImg.src = maskUrl; };
      showBoxesBtn.onclick = () => { resultImg.src = boxesUrl; };
      // raw shows the pre-closing segmentation (good for debugging missed fragments)
      showRawBtn.onclick = () => { resultImg.src = rawOverlayUrl; };
    }
    // analyze mask to decide fracture or not
    try {
        const analysis = analyzeMaskForFracture(closedMask, width, height);
      const conclusionEl = document.getElementById('conclusionText');
      // Enforce user rule: if confidence < 50% always report NO fracture
      if (typeof analysis.confidence === 'number' && analysis.confidence < 50) {
        conclusionEl.textContent = `Phát hiện: Không có dấu hiệu gãy xương — confidence ≈ ${analysis.confidence}% (components=${analysis.nComponents}, largest=${analysis.largestArea}, mask=${(analysis.maskPct*100).toFixed(2)}%)`;
        conclusionEl.style.color = '#1a7f1a';
      } else if (analysis.fracture) {
        conclusionEl.textContent = `Phát hiện: Có dấu hiệu gãy xương — confidence ≈ ${analysis.confidence}% (components=${analysis.nComponents}, largest=${analysis.largestArea}, mask=${(analysis.maskPct*100).toFixed(2)}%)`;
        conclusionEl.style.color = '#b22222';
      } else {
        conclusionEl.textContent = `Phát hiện: Không có dấu hiệu gãy xương — confidence ≈ ${analysis.confidence}% (components=${analysis.nComponents}, largest=${analysis.largestArea}, mask=${(analysis.maskPct*100).toFixed(2)}%)`;
        conclusionEl.style.color = '#1a7f1a';
      }
    } catch (err) {
      console.warn('Analysis failed', err);
    }
  } catch (err) {
    console.error('Client Option1 error:', err);
    alert('Xử lý client thất bại. Kiểm tra console để biết chi tiết.');
  } finally {
    runBtn.disabled = false;
    runBtn.textContent = old;
  }
}
// ---------------------- END: Client-side Option 1 pipeline ----------------------

runBtn.addEventListener('click', async () => {
  if (!uploadedFilename) {
    alert('Bạn cần upload ảnh trước khi chạy xử lý.');
    return;
  }
  const option = optionSelect.value;
  if (!option || option === 'none') {
    alert('Chọn option xử lý.');
    return;
  }

  // If Option 1, run client-side pipeline
  if (option === 'Option 1') {
    await processOption1Client();
    return;
  }

  runBtn.disabled = true;
  const oldText = runBtn.textContent;
  runBtn.textContent = 'Processing...';

  try {
    const res = await fetch('/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: uploadedFilename, option })
    });
    if (!res.ok) throw new Error('Process failed');
    const data = await res.json();
    const resultUrl = data.url || (data.filename ? `/uploads/${data.filename}` : null);
    if (resultUrl) {
      resultImg.src = resultUrl;
    } else {
      alert('Server không trả về kết quả.');
    }
  } catch (err) {
    console.error(err);
    alert('Xử lý thất bại. Kiểm tra server.');
  } finally {
    runBtn.disabled = false;
    runBtn.textContent = oldText;
  }
});