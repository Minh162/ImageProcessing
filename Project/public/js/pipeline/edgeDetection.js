/**
 * EDGE DETECTION MODULE
 * Các thuật toán phát hiện biên và vùng nghi ngờ
 */

// Otsu Thresholding
// Tìm ngưỡng tối ưu để tách foreground/background
export function otsuThreshold(gray) {
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
  
  return { binary: bin, threshold };
}

// Canny Edge Detection
// Phát hiện biên chính xác với non-maximum suppression
export function cannyEdgeDetection(gray, width, height, lowThreshold = 50, highThreshold = 150) {
  // 1. Gaussian blur để giảm nhiễu
  const blurred = gaussianBlurForCanny(gray, width, height);
  
  // 2. Tính gradient (Sobel)
  const { magnitude, direction } = sobelGradient(blurred, width, height);
  
  // 3. Non-maximum suppression
  const suppressed = nonMaxSuppression(magnitude, direction, width, height);
  
  // 4. Double threshold và edge tracking
  const edges = doubleThreshold(suppressed, width, height, lowThreshold, highThreshold);
  
  return edges;
}

function gaussianBlurForCanny(gray, width, height) {
  const kernel = new Float32Array([
    2, 4, 5, 4, 2,
    4, 9, 12, 9, 4,
    5, 12, 15, 12, 5,
    4, 9, 12, 9, 4,
    2, 4, 5, 4, 2
  ]);
  const sum = kernel.reduce((a, b) => a + b, 0);
  for (let i = 0; i < kernel.length; i++) kernel[i] /= sum;
  
  const out = new Uint8ClampedArray(gray.length);
  const r = 2;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let val = 0;
      for (let ky = -r; ky <= r; ky++) {
        for (let kx = -r; kx <= r; kx++) {
          const py = Math.min(Math.max(y + ky, 0), height - 1);
          const px = Math.min(Math.max(x + kx, 0), width - 1);
          val += gray[py * width + px] * kernel[(ky + r) * 5 + (kx + r)];
        }
      }
      out[y * width + x] = val | 0;
    }
  }
  
  return out;
}

function sobelGradient(gray, width, height) {
  const Gx = new Float32Array(gray.length);
  const Gy = new Float32Array(gray.length);
  const magnitude = new Float32Array(gray.length);
  const direction = new Float32Array(gray.length);
  
  // Sobel kernels
  const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0, gy = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const val = gray[(y + ky) * width + (x + kx)];
          gx += val * sobelX[(ky + 1) * 3 + (kx + 1)];
          gy += val * sobelY[(ky + 1) * 3 + (kx + 1)];
        }
      }
      const idx = y * width + x;
      Gx[idx] = gx;
      Gy[idx] = gy;
      magnitude[idx] = Math.sqrt(gx * gx + gy * gy);
      direction[idx] = Math.atan2(gy, gx);
    }
  }
  
  return { magnitude, direction };
}

function nonMaxSuppression(magnitude, direction, width, height) {
  const suppressed = new Float32Array(magnitude.length);
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const angle = direction[idx] * 180 / Math.PI;
      const mag = magnitude[idx];
      
      let q = 255, r = 255;
      
      // Xác định hướng gradient (0, 45, 90, 135 độ)
      if ((angle >= -22.5 && angle < 22.5) || (angle >= 157.5 || angle < -157.5)) {
        q = magnitude[idx + 1];
        r = magnitude[idx - 1];
      } else if ((angle >= 22.5 && angle < 67.5) || (angle >= -157.5 && angle < -112.5)) {
        q = magnitude[(y - 1) * width + (x + 1)];
        r = magnitude[(y + 1) * width + (x - 1)];
      } else if ((angle >= 67.5 && angle < 112.5) || (angle >= -112.5 && angle < -67.5)) {
        q = magnitude[(y - 1) * width + x];
        r = magnitude[(y + 1) * width + x];
      } else {
        q = magnitude[(y - 1) * width + (x - 1)];
        r = magnitude[(y + 1) * width + (x + 1)];
      }
      
      if (mag >= q && mag >= r) {
        suppressed[idx] = mag;
      } else {
        suppressed[idx] = 0;
      }
    }
  }
  
  return suppressed;
}

function doubleThreshold(suppressed, width, height, lowThreshold, highThreshold) {
  const edges = new Uint8ClampedArray(suppressed.length);
  const strong = 255;
  const weak = 128;
  
  // Phân loại pixel: strong, weak, non-edge
  for (let i = 0; i < suppressed.length; i++) {
    if (suppressed[i] >= highThreshold) {
      edges[i] = strong;
    } else if (suppressed[i] >= lowThreshold) {
      edges[i] = weak;
    } else {
      edges[i] = 0;
    }
  }
  
  // Edge tracking by hysteresis: nối weak edges với strong edges
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      if (edges[idx] === weak) {
        let hasStrongNeighbor = false;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            if (edges[(y + ky) * width + (x + kx)] === strong) {
              hasStrongNeighbor = true;
              break;
            }
          }
          if (hasStrongNeighbor) break;
        }
        edges[idx] = hasStrongNeighbor ? strong : 0;
      }
    }
  }
  
  return edges;
}

// Sobel Edge Detection
// Phát hiện biên đơn giản bằng Sobel operator
export function sobelEdgeDetection(gray, width, height, threshold = 100) {
  const { magnitude } = sobelGradient(gray, width, height);
  
  const edges = new Uint8ClampedArray(magnitude.length);
  for (let i = 0; i < magnitude.length; i++) {
    edges[i] = magnitude[i] > threshold ? 255 : 0;
  }
  
  return edges;
}

// Watershed Segmentation (simplified marker-based)
// Phân vùng ảnh dựa trên watershed transform
export function watershedSegmentation(gray, width, height) {
  // 1. Tính gradient magnitude
  const { magnitude } = sobelGradient(gray, width, height);
  
  // 2. Tìm local minima làm markers
  const markers = findLocalMinima(magnitude, width, height);
  
  // 3. Watershed flooding (simplified - priority queue based)
  const labels = watershedFlood(magnitude, markers, width, height);
  
  // 4. Tạo binary edge map từ watershed boundaries
  const edges = new Uint8ClampedArray(gray.length);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const label = labels[idx];
      
      // Kiểm tra xem có phải boundary không
      let isBoundary = false;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          if (labels[(y + ky) * width + (x + kx)] !== label && labels[(y + ky) * width + (x + kx)] > 0) {
            isBoundary = true;
            break;
          }
        }
        if (isBoundary) break;
      }
      
      edges[idx] = isBoundary ? 255 : 0;
    }
  }
  
  return edges;
}

function findLocalMinima(magnitude, width, height) {
  const markers = new Int32Array(magnitude.length);
  let markerID = 1;
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const val = magnitude[idx];
      
      let isMinimum = true;
      for (let ky = -1; ky <= 1 && isMinimum; ky++) {
        for (let kx = -1; kx <= 1 && isMinimum; kx++) {
          if (kx === 0 && ky === 0) continue;
          if (magnitude[(y + ky) * width + (x + kx)] < val) {
            isMinimum = false;
          }
        }
      }
      
      if (isMinimum && val < 50) { // Chỉ lấy minima với giá trị thấp
        markers[idx] = markerID++;
      }
    }
  }
  
  return markers;
}

function watershedFlood(magnitude, markers, width, height) {
  const labels = new Int32Array(markers);
  const visited = new Uint8Array(magnitude.length);
  
  // Priority queue (simplified - sử dụng array và sort)
  const queue = [];
  
  // Thêm tất cả marker pixels vào queue
  for (let i = 0; i < markers.length; i++) {
    if (markers[i] > 0) {
      queue.push({ idx: i, priority: magnitude[i] });
      visited[i] = 1;
    }
  }
  
  // Process queue
  while (queue.length > 0) {
    queue.sort((a, b) => a.priority - b.priority);
    const { idx } = queue.shift();
    
    const y = Math.floor(idx / width);
    const x = idx % width;
    const label = labels[idx];
    
    // Kiểm tra các neighbor
    for (let ky = -1; ky <= 1; ky++) {
      for (let kx = -1; kx <= 1; kx++) {
        if (kx === 0 && ky === 0) continue;
        
        const ny = y + ky;
        const nx = x + kx;
        if (ny < 0 || ny >= height || nx < 0 || nx >= width) continue;
        
        const nidx = ny * width + nx;
        if (!visited[nidx]) {
          visited[nidx] = 1;
          labels[nidx] = label;
          queue.push({ idx: nidx, priority: magnitude[nidx] });
        }
      }
    }
  }
  
  return labels;
}
