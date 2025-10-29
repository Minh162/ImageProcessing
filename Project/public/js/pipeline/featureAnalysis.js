/**
 * FEATURE ANALYSIS MODULE
 * Phân tích đặc trưng của các component để phát hiện vùng gãy
 */

// Connected Components Labeling (Two-pass with Union-Find)
export function connectedComponents(binary, width, height) {
  const labels = new Int32Array(width * height).fill(0);
  const parent = [];
  let nextLabel = 1;
  
  function find(a) {
    while (parent[a] !== a) {
      parent[a] = parent[parent[a]];
      a = parent[a];
    }
    return a;
  }
  
  function union(a, b) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  }
  
  // First pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (binary[i] === 0) continue;
      
      const neighbors = [];
      if (x > 0 && binary[i - 1]) neighbors.push(labels[i - 1]);
      if (y > 0 && binary[i - width]) neighbors.push(labels[i - width]);
      
      if (neighbors.length === 0) {
        parent[nextLabel] = nextLabel;
        labels[i] = nextLabel;
        nextLabel++;
      } else {
        const lbl = Math.min(...neighbors.filter(v => v > 0));
        labels[i] = lbl;
        for (const nb of neighbors) {
          if (nb && nb !== lbl) union(lbl, nb);
        }
      }
    }
  }
  
  // Second pass - relabel
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

// Tính diện tích của từng component
export function computeAreas(labels, nLabels) {
  const areas = new Array(nLabels + 1).fill(0);
  
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i];
    if (label > 0) areas[label]++;
  }
  
  return areas;
}

// Tính centroid (tâm khối) của từng component
export function computeCentroids(labels, nLabels, width, height) {
  const cx = new Array(nLabels + 1).fill(0);
  const cy = new Array(nLabels + 1).fill(0);
  const count = new Array(nLabels + 1).fill(0);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const label = labels[y * width + x];
      if (label > 0) {
        cx[label] += x;
        cy[label] += y;
        count[label]++;
      }
    }
  }
  
  const centroids = new Array(nLabels + 1);
  for (let i = 1; i <= nLabels; i++) {
    if (count[i] > 0) {
      centroids[i] = {
        x: cx[i] / count[i],
        y: cy[i] / count[i]
      };
    } else {
      centroids[i] = { x: 0, y: 0 };
    }
  }
  
  return centroids;
}

// Tính bounding box của từng component
export function computeBoundingBoxes(labels, nLabels, width, height) {
  const minX = new Array(nLabels + 1).fill(Infinity);
  const minY = new Array(nLabels + 1).fill(Infinity);
  const maxX = new Array(nLabels + 1).fill(-Infinity);
  const maxY = new Array(nLabels + 1).fill(-Infinity);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const label = labels[y * width + x];
      if (label > 0) {
        minX[label] = Math.min(minX[label], x);
        minY[label] = Math.min(minY[label], y);
        maxX[label] = Math.max(maxX[label], x);
        maxY[label] = Math.max(maxY[label], y);
      }
    }
  }
  
  const boxes = new Array(nLabels + 1);
  for (let i = 1; i <= nLabels; i++) {
    if (minX[i] !== Infinity) {
      boxes[i] = {
        x: minX[i],
        y: minY[i],
        width: maxX[i] - minX[i] + 1,
        height: maxY[i] - minY[i] + 1
      };
    } else {
      boxes[i] = { x: 0, y: 0, width: 0, height: 0 };
    }
  }
  
  return boxes;
}

// Tính perimeter (chu vi) của từng component
export function computePerimeters(labels, nLabels, width, height) {
  const perimeters = new Array(nLabels + 1).fill(0);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const label = labels[y * width + x];
      if (label === 0) continue;
      
      // Kiểm tra có phải boundary pixel không
      let isBoundary = false;
      for (let ky = -1; ky <= 1 && !isBoundary; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const ny = y + ky;
          const nx = x + kx;
          if (ny < 0 || ny >= height || nx < 0 || nx >= width) {
            isBoundary = true;
            break;
          }
          if (labels[ny * width + nx] !== label) {
            isBoundary = true;
            break;
          }
        }
      }
      
      if (isBoundary) perimeters[label]++;
    }
  }
  
  return perimeters;
}

// Tính aspect ratio của bounding box
export function computeAspectRatios(boxes) {
  return boxes.map(box => {
    if (!box || box.height === 0) return 0;
    return box.width / box.height;
  });
}

// Tính extent (tỉ lệ diện tích component / diện tích bounding box)
export function computeExtents(areas, boxes) {
  return areas.map((area, i) => {
    const box = boxes[i];
    if (!box || box.width === 0 || box.height === 0) return 0;
    return area / (box.width * box.height);
  });
}

// Tính solidity (tỉ lệ diện tích component / diện tích convex hull)
// Simplified: sử dụng bounding box thay vì convex hull thực sự
export function computeSolidities(areas, boxes) {
  return computeExtents(areas, boxes);
}

// Tính circularity (độ tròn) = 4π × Area / Perimeter²
export function computeCircularities(areas, perimeters) {
  return areas.map((area, i) => {
    const p = perimeters[i];
    if (p === 0) return 0;
    return (4 * Math.PI * area) / (p * p);
  });
}

// Kiểm tra component có chạm viền ảnh không
export function checkBorderTouching(labels, nLabels, width, height) {
  const touchesBorder = new Array(nLabels + 1).fill(false);
  
  // Kiểm tra cạnh trên và dưới
  for (let x = 0; x < width; x++) {
    const topLabel = labels[x];
    const bottomLabel = labels[(height - 1) * width + x];
    if (topLabel > 0) touchesBorder[topLabel] = true;
    if (bottomLabel > 0) touchesBorder[bottomLabel] = true;
  }
  
  // Kiểm tra cạnh trái và phải
  for (let y = 0; y < height; y++) {
    const leftLabel = labels[y * width];
    const rightLabel = labels[y * width + (width - 1)];
    if (leftLabel > 0) touchesBorder[leftLabel] = true;
    if (rightLabel > 0) touchesBorder[rightLabel] = true;
  }
  
  return touchesBorder;
}

// Tổng hợp tất cả các đặc trưng
export function analyzeComponents(binary, width, height) {
  const { labels, nLabels } = connectedComponents(binary, width, height);
  
  if (nLabels === 0) {
    return {
      nComponents: 0,
      components: []
    };
  }
  
  const areas = computeAreas(labels, nLabels);
  const centroids = computeCentroids(labels, nLabels, width, height);
  const boxes = computeBoundingBoxes(labels, nLabels, width, height);
  const perimeters = computePerimeters(labels, nLabels, width, height);
  const aspectRatios = computeAspectRatios(boxes);
  const extents = computeExtents(areas, boxes);
  const circularities = computeCircularities(areas, perimeters);
  const touchesBorder = checkBorderTouching(labels, nLabels, width, height);
  
  const components = [];
  for (let i = 1; i <= nLabels; i++) {
    components.push({
      label: i,
      area: areas[i],
      centroid: centroids[i],
      boundingBox: boxes[i],
      perimeter: perimeters[i],
      aspectRatio: aspectRatios[i],
      extent: extents[i],
      circularity: circularities[i],
      touchesBorder: touchesBorder[i]
    });
  }
  
  return {
    nComponents: nLabels,
    components,
    labels
  };
}

// Lọc components theo tiêu chí
export function filterComponents(components, criteria = {}) {
  const {
    minArea = 0,
    maxArea = Infinity,
    minAspectRatio = 0,
    maxAspectRatio = Infinity,
    excludeBorderTouching = false
  } = criteria;
  
  return components.filter(comp => {
    if (comp.area < minArea || comp.area > maxArea) return false;
    if (comp.aspectRatio < minAspectRatio || comp.aspectRatio > maxAspectRatio) return false;
    if (excludeBorderTouching && comp.touchesBorder) return false;
    return true;
  });
}

// Tính khoảng cách giữa các centroids
export function computeDistanceMatrix(centroids) {
  const n = centroids.length;
  const distances = Array(n).fill(null).map(() => Array(n).fill(0));
  
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const ci = centroids[i];
      const cj = centroids[j];
      if (ci && cj) {
        const dist = Math.sqrt((ci.x - cj.x) ** 2 + (ci.y - cj.y) ** 2);
        distances[i][j] = dist;
        distances[j][i] = dist;
      }
    }
  }
  
  return distances;
}
