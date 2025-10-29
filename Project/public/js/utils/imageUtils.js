/**
 * IMAGE UTILITIES
 * Các hàm tiện ích để xử lý ảnh
 */

// Chuyển ImageElement thành ImageData
export function imageDataFromImageElement(imgEl) {
  const canvas = document.createElement('canvas');
  canvas.width = imgEl.naturalWidth || imgEl.width;
  canvas.height = imgEl.naturalHeight || imgEl.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

// Chuyển ImageData thành Data URL
export function putImageDataToDataURL(imageData) {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d');
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL();
}

// Chuyển grayscale array thành Data URL
export function grayToDataURL(gray, width, height) {
  const imageData = new ImageData(width, height);
  for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
    const v = gray[i];
    imageData.data[p] = v;
    imageData.data[p + 1] = v;
    imageData.data[p + 2] = v;
    imageData.data[p + 3] = 255;
  }
  return putImageDataToDataURL(imageData);
}

// Chuyển binary array thành Data URL
export function binaryToDataURL(binary, width, height) {
  return grayToDataURL(binary, width, height);
}

// Tạo overlay: ảnh gốc + mask màu
export function createOverlay(origImgEl, mask, width, height, color = [255, 0, 0, 140]) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  // Vẽ ảnh gốc
  ctx.drawImage(origImgEl, 0, 0, width, height);
  
  // Vẽ mask
  const imageData = ctx.getImageData(0, 0, width, height);
  for (let i = 0, p = 0; i < mask.length; i++, p += 4) {
    if (mask[i]) {
      imageData.data[p] = color[0];
      imageData.data[p + 1] = color[1];
      imageData.data[p + 2] = color[2];
      imageData.data[p + 3] = color[3];
    }
  }
  ctx.putImageData(imageData, 0, 0);
  
  return canvas.toDataURL();
}

// Vẽ components với màu khác nhau
export function drawComponents(origImgEl, labels, nLabels, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  ctx.drawImage(origImgEl, 0, 0, width, height);
  
  // Tạo màu ngẫu nhiên cho mỗi component
  const colors = [];
  for (let i = 0; i <= nLabels; i++) {
    colors.push([
      Math.floor(Math.random() * 255),
      Math.floor(Math.random() * 255),
      Math.floor(Math.random() * 255),
      140
    ]);
  }
  
  const imageData = ctx.getImageData(0, 0, width, height);
  for (let i = 0, p = 0; i < labels.length; i++, p += 4) {
    const label = labels[i];
    if (label > 0) {
      const color = colors[label];
      imageData.data[p] = color[0];
      imageData.data[p + 1] = color[1];
      imageData.data[p + 2] = color[2];
      imageData.data[p + 3] = color[3];
    }
  }
  ctx.putImageData(imageData, 0, 0);
  
  return canvas.toDataURL();
}

// Vẽ bounding boxes
export function drawBoundingBoxes(origImgEl, components, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  ctx.drawImage(origImgEl, 0, 0, width, height);
  ctx.lineWidth = Math.max(2, Math.round(Math.min(width, height) / 200));
  ctx.strokeStyle = 'rgba(0, 255, 0, 0.9)';
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.font = '12px sans-serif';
  
  for (const comp of components) {
    const box = comp.boundingBox;
    
    // Vẽ box
    ctx.strokeRect(box.x, box.y, box.width, box.height);
    
    // Vẽ label
    const labelBg = Math.min(120, box.width);
    ctx.fillRect(box.x, Math.max(0, box.y - 18), labelBg, 18);
    ctx.fillStyle = 'white';
    ctx.fillText(`#${comp.label} - ${comp.area}px`, box.x + 2, Math.max(12, box.y - 4));
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  }
  
  return canvas.toDataURL();
}

// Vẽ centroids
export function drawCentroids(origImgEl, components, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  ctx.drawImage(origImgEl, 0, 0, width, height);
  
  for (const comp of components) {
    const c = comp.centroid;
    
    // Vẽ dấu + tại centroid
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.9)';
    ctx.lineWidth = 2;
    const size = 10;
    ctx.beginPath();
    ctx.moveTo(c.x - size, c.y);
    ctx.lineTo(c.x + size, c.y);
    ctx.moveTo(c.x, c.y - size);
    ctx.lineTo(c.x, c.y + size);
    ctx.stroke();
    
    // Vẽ circle
    ctx.beginPath();
    ctx.arc(c.x, c.y, 5, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.fill();
    
    // Vẽ label
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 3;
    ctx.font = 'bold 12px sans-serif';
    const text = `#${comp.label}`;
    ctx.strokeText(text, c.x + 8, c.y - 8);
    ctx.fillText(text, c.x + 8, c.y - 8);
  }
  
  return canvas.toDataURL();
}

// Vẽ components với thông tin diện tích
export function drawComponentsWithAreas(origImgEl, components, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  ctx.drawImage(origImgEl, 0, 0, width, height);
  
  // Vẽ overlay cho mỗi component
  ctx.globalAlpha = 0.4;
  for (const comp of components) {
    const color = `hsl(${(comp.label * 137.5) % 360}, 70%, 50%)`;
    ctx.fillStyle = color;
    
    // Cần vẽ từng pixel của component (simplified - vẽ bounding box)
    const box = comp.boundingBox;
    ctx.fillRect(box.x, box.y, box.width, box.height);
  }
  ctx.globalAlpha = 1.0;
  
  // Vẽ thông tin
  ctx.font = 'bold 14px sans-serif';
  for (const comp of components) {
    const box = comp.boundingBox;
    const text = `Area: ${comp.area}`;
    
    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    const metrics = ctx.measureText(text);
    ctx.fillRect(box.x, box.y, metrics.width + 8, 20);
    
    // Text
    ctx.fillStyle = 'white';
    ctx.fillText(text, box.x + 4, box.y + 14);
  }
  
  return canvas.toDataURL();
}

// Download image
export function downloadImage(dataURL, filename = 'result.png') {
  const link = document.createElement('a');
  link.href = dataURL;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
