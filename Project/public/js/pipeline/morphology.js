/**
 * MORPHOLOGY MODULE
 * Các phép xử lý hình thái học để làm sạch và cải thiện mask nhị phân
 */

// Erosion - Co vùng foreground
export function erosion(binary, width, height, kernelSize = 3, iterations = 1) {
  let src = binary;
  const out = new Uint8ClampedArray(binary.length);
  
  for (let it = 0; it < iterations; it++) {
    out.fill(0);
    const r = Math.floor((kernelSize - 1) / 2);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let all = 1;
        
        for (let ky = -r; ky <= r && all; ky++) {
          for (let kx = -r; kx <= r; kx++) {
            const py = y + ky;
            const px = x + kx;
            
            if (py < 0 || py >= height || px < 0 || px >= width) continue;
            
            if (src[py * width + px] === 0) {
              all = 0;
              break;
            }
          }
        }
        
        out[y * width + x] = all ? 255 : 0;
      }
    }
    
    src = out.slice();
  }
  
  return src;
}

// Dilation - Mở rộng vùng foreground
export function dilation(binary, width, height, kernelSize = 3, iterations = 1) {
  let src = binary;
  const out = new Uint8ClampedArray(binary.length);
  
  for (let it = 0; it < iterations; it++) {
    out.fill(0);
    const r = Math.floor((kernelSize - 1) / 2);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let any = 0;
        
        for (let ky = -r; ky <= r && !any; ky++) {
          for (let kx = -r; kx <= r; kx++) {
            const py = y + ky;
            const px = x + kx;
            
            if (py < 0 || py >= height || px < 0 || px >= width) continue;
            
            if (src[py * width + px] === 255) {
              any = 1;
              break;
            }
          }
        }
        
        out[y * width + x] = any ? 255 : 0;
      }
    }
    
    src = out.slice();
  }
  
  return src;
}

// Opening - Erosion sau đó Dilation (loại bỏ nhiễu nhỏ)
export function opening(binary, width, height, kernelSize = 3, iterations = 1) {
  let result = erosion(binary, width, height, kernelSize, iterations);
  result = dilation(result, width, height, kernelSize, iterations);
  return result;
}

// Closing - Dilation sau đó Erosion (lấp đầy lỗ hổng)
export function closing(binary, width, height, kernelSize = 3, iterations = 1) {
  let result = dilation(binary, width, height, kernelSize, iterations);
  result = erosion(result, width, height, kernelSize, iterations);
  return result;
}

// Morphological Gradient - Dilation - Erosion (phát hiện biên)
export function morphologicalGradient(binary, width, height, kernelSize = 3) {
  const dilated = dilation(binary, width, height, kernelSize, 1);
  const eroded = erosion(binary, width, height, kernelSize, 1);
  
  const gradient = new Uint8ClampedArray(binary.length);
  for (let i = 0; i < binary.length; i++) {
    gradient[i] = dilated[i] - eroded[i];
  }
  
  return gradient;
}

// Top Hat - Original - Opening (phát hiện các điểm sáng nhỏ)
export function topHat(binary, width, height, kernelSize = 3) {
  const opened = opening(binary, width, height, kernelSize, 1);
  
  const result = new Uint8ClampedArray(binary.length);
  for (let i = 0; i < binary.length; i++) {
    result[i] = Math.max(0, binary[i] - opened[i]);
  }
  
  return result;
}

// Black Hat - Closing - Original (phát hiện các điểm tối nhỏ)
export function blackHat(binary, width, height, kernelSize = 3) {
  const closed = closing(binary, width, height, kernelSize, 1);
  
  const result = new Uint8ClampedArray(binary.length);
  for (let i = 0; i < binary.length; i++) {
    result[i] = Math.max(0, closed[i] - binary[i]);
  }
  
  return result;
}

// Distance Transform - Tính khoảng cách từ mỗi pixel đến biên gần nhất
export function distanceTransform(binary, width, height) {
  const INF = 1e8;
  const dist = new Float32Array(width * height);
  
  // Initialize
  for (let i = 0; i < width * height; i++) {
    dist[i] = binary[i] === 0 ? 0 : INF;
  }
  
  // Forward pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (dist[i] === 0) continue;
      
      let v = dist[i];
      if (x > 0) v = Math.min(v, dist[i - 1] + 1);
      if (y > 0) v = Math.min(v, dist[i - width] + 1);
      if (x > 0 && y > 0) v = Math.min(v, dist[i - width - 1] + Math.SQRT2);
      if (x < width - 1 && y > 0) v = Math.min(v, dist[i - width + 1] + Math.SQRT2);
      dist[i] = v;
    }
  }
  
  // Backward pass
  for (let y = height - 1; y >= 0; y--) {
    for (let x = width - 1; x >= 0; x--) {
      const i = y * width + x;
      let v = dist[i];
      
      if (x < width - 1) v = Math.min(v, dist[i + 1] + 1);
      if (y < height - 1) v = Math.min(v, dist[i + width] + 1);
      if (x < width - 1 && y < height - 1) v = Math.min(v, dist[i + width + 1] + Math.SQRT2);
      if (x > 0 && y < height - 1) v = Math.min(v, dist[i + width - 1] + Math.SQRT2);
      dist[i] = v;
    }
  }
  
  return dist;
}

// Skeletonization - Tạo bộ xương của shape
export function skeletonize(binary, width, height, maxIterations = 100) {
  let skel = binary.slice();
  let prevCount = -1;
  
  for (let iter = 0; iter < maxIterations; iter++) {
    const markers = new Uint8ClampedArray(skel.length);
    
    // Tìm pixels có thể xóa (không phá vỡ connectivity)
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        if (skel[idx] === 0) continue;
        
        // Đếm số neighbors
        const neighbors = [
          skel[(y-1)*width + (x-1)], skel[(y-1)*width + x], skel[(y-1)*width + (x+1)],
          skel[y*width + (x-1)],                              skel[y*width + (x+1)],
          skel[(y+1)*width + (x-1)], skel[(y+1)*width + x], skel[(y+1)*width + (x+1)]
        ];
        
        const count = neighbors.filter(n => n === 255).length;
        
        // Đếm số transitions từ 0->255
        let transitions = 0;
        for (let i = 0; i < 8; i++) {
          if (neighbors[i] === 0 && neighbors[(i+1)%8] === 255) {
            transitions++;
          }
        }
        
        // Điều kiện xóa pixel
        if (count >= 2 && count <= 6 && transitions === 1) {
          // Thêm điều kiện để giữ connectivity
          const hasTop = neighbors[1] === 255;
          const hasRight = neighbors[4] === 255;
          const hasBottom = neighbors[6] === 255;
          const hasLeft = neighbors[3] === 255;
          
          if (!(hasTop && hasRight) || !(hasBottom && hasLeft)) {
            markers[idx] = 1;
          }
        }
      }
    }
    
    // Xóa marked pixels
    let count = 0;
    for (let i = 0; i < skel.length; i++) {
      if (markers[i]) {
        skel[i] = 0;
      }
      if (skel[i] === 255) count++;
    }
    
    // Kiểm tra convergence
    if (count === prevCount) break;
    prevCount = count;
  }
  
  return skel;
}
