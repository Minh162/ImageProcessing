/**
 * PREPROCESSING MODULE
 * Các thuật toán tiền xử lý ảnh để cải thiện chất lượng trước khi phát hiện biên
 */

// Chuyển ảnh màu sang grayscale
export function rgbaToGrayUint8(imageData) {
  const { data, width, height } = imageData;
  const gray = new Uint8ClampedArray(width * height);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    gray[p] = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) | 0;
  }
  return { gray, width, height };
}

// CLAHE (Contrast Limited Adaptive Histogram Equalization)
// Cân bằng histogram cục bộ theo từng tile để tăng tương phản
export function applyCLAHE(gray, width, height, tileSize = 64) {
  const out = new Uint8ClampedArray(gray.length);
  const tilesX = Math.max(1, Math.ceil(width / tileSize));
  const tilesY = Math.max(1, Math.ceil(height / tileSize));
  
  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      const x0 = tx * tileSize;
      const y0 = ty * tileSize;
      const x1 = Math.min(width, x0 + tileSize);
      const y1 = Math.min(height, y0 + tileSize);
      
      // Tính histogram cho tile
      const hist = new Uint32Array(256);
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          hist[gray[y * width + x]]++;
        }
      }
      
      // Tính CDF (Cumulative Distribution Function) và cân bằng
      const area = (x1 - x0) * (y1 - y0);
      let sum = 0;
      const cdf = new Uint8ClampedArray(256);
      for (let i = 0; i < 256; i++) {
        sum += hist[i];
        cdf[i] = ((sum / area) * 255) | 0;
      }
      
      // Apply equalization
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          out[y * width + x] = cdf[gray[y * width + x]];
        }
      }
    }
  }
  return out;
}

// Histogram Equalization (global)
// Cân bằng histogram toàn cục để tăng tương phản
export function histogramEqualization(gray, width, height) {
  const hist = new Uint32Array(256);
  const n = gray.length;
  
  // Tính histogram
  for (let i = 0; i < n; i++) {
    hist[gray[i]]++;
  }
  
  // Tính CDF
  let sum = 0;
  const cdf = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i++) {
    sum += hist[i];
    cdf[i] = ((sum / n) * 255) | 0;
  }
  
  // Apply equalization
  const out = new Uint8ClampedArray(n);
  for (let i = 0; i < n; i++) {
    out[i] = cdf[gray[i]];
  }
  
  return out;
}

// Median Blur
// Lọc trung vị để loại bỏ nhiễu muối tiêu (salt-and-pepper)
export function medianBlur(gray, width, height, radius = 2) {
  const out = new Uint8ClampedArray(gray.length);
  const size = radius * 2 + 1;
  const tmp = new Uint8ClampedArray(size * size);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let idx = 0;
      for (let yy = Math.max(0, y - radius); yy <= Math.min(height - 1, y + radius); yy++) {
        for (let xx = Math.max(0, x - radius); xx <= Math.min(width - 1, x + radius); xx++) {
          tmp[idx++] = gray[yy * width + xx];
        }
      }
      tmp.slice(0, idx).sort((a, b) => a - b);
      out[y * width + x] = tmp[(idx / 2) | 0];
    }
  }
  return out;
}

// Gaussian Blur
// Lọc Gaussian để làm mượt ảnh
export function gaussianBlur(gray, width, height, radius = 2, sigma = 1.0) {
  // Tạo kernel Gaussian
  const size = radius * 2 + 1;
  const kernel = new Float32Array(size * size);
  let sum = 0;
  
  for (let y = -radius; y <= radius; y++) {
    for (let x = -radius; x <= radius; x++) {
      const g = Math.exp(-(x * x + y * y) / (2 * sigma * sigma));
      kernel[(y + radius) * size + (x + radius)] = g;
      sum += g;
    }
  }
  
  // Normalize kernel
  for (let i = 0; i < kernel.length; i++) {
    kernel[i] /= sum;
  }
  
  // Apply convolution
  const out = new Uint8ClampedArray(gray.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let val = 0;
      for (let ky = -radius; ky <= radius; ky++) {
        for (let kx = -radius; kx <= radius; kx++) {
          const py = Math.min(Math.max(y + ky, 0), height - 1);
          const px = Math.min(Math.max(x + kx, 0), width - 1);
          val += gray[py * width + px] * kernel[(ky + radius) * size + (kx + radius)];
        }
      }
      out[y * width + x] = Math.min(255, Math.max(0, val)) | 0;
    }
  }
  
  return out;
}

// Bilateral Filter (approximation)
// Lọc bilateral giữ cạnh tốt hơn Gaussian
export function bilateralFilter(gray, width, height, radius = 2, sigmaSpace = 2.0, sigmaColor = 50) {
  const out = new Uint8ClampedArray(gray.length);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const centerVal = gray[y * width + x];
      let sum = 0;
      let normSum = 0;
      
      for (let ky = -radius; ky <= radius; ky++) {
        for (let kx = -radius; kx <= radius; kx++) {
          const py = Math.min(Math.max(y + ky, 0), height - 1);
          const px = Math.min(Math.max(x + kx, 0), width - 1);
          const val = gray[py * width + px];
          
          // Spatial weight
          const spatialDist = kx * kx + ky * ky;
          const spatialWeight = Math.exp(-spatialDist / (2 * sigmaSpace * sigmaSpace));
          
          // Color weight
          const colorDist = Math.abs(val - centerVal);
          const colorWeight = Math.exp(-colorDist * colorDist / (2 * sigmaColor * sigmaColor));
          
          const weight = spatialWeight * colorWeight;
          sum += val * weight;
          normSum += weight;
        }
      }
      
      out[y * width + x] = (sum / normSum) | 0;
    }
  }
  
  return out;
}
