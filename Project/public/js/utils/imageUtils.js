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

// Vẽ kết quả SVM Analysis
export function drawSVMResults(origImgEl, svmResults, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  // Vẽ ảnh gốc
  ctx.drawImage(origImgEl, 0, 0, width, height);
  
  if (svmResults.totalComponents === 0) {
    // Nếu không có components, hiển thị thông báo
    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(width/2 - 100, height/2 - 20, 200, 40);
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText('No components detected', width/2, height/2 + 5);
    return canvas.toDataURL();
  }
  
  const { fractureComponents, normalComponents, overallAssessment } = svmResults;
  
  // Vẽ fracture components (màu đỏ)
  ctx.globalAlpha = 0.6;
  for (const comp of fractureComponents) {
    // Màu đỏ với độ đậm nhạt theo probability
    const intensity = Math.round(comp.probability * 255);
    ctx.fillStyle = `rgba(255, ${255 - intensity}, ${255 - intensity}, 0.7)`;
    
    // Vẽ circle tại centroid
    ctx.beginPath();
    ctx.arc(comp.centroid.x, comp.centroid.y, Math.sqrt(comp.area / Math.PI), 0, 2 * Math.PI);
    ctx.fill();
    
    // Vẽ border
    ctx.strokeStyle = `rgba(255, 0, 0, ${comp.probability})`;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  
  // Vẽ normal components (màu xanh lá)
  for (const comp of normalComponents) {
    // Màu xanh lá nhạt
    const intensity = Math.round((1 - comp.probability) * 150);
    ctx.fillStyle = `rgba(${255 - intensity}, 255, ${255 - intensity}, 0.3)`;
    
    // Vẽ circle tại centroid (nhỏ hơn)
    ctx.beginPath();
    ctx.arc(comp.centroid.x, comp.centroid.y, Math.sqrt(comp.area / Math.PI) * 0.7, 0, 2 * Math.PI);
    ctx.fill();
    
    // Vẽ border
    ctx.strokeStyle = `rgba(0, 255, 0, ${1 - comp.probability})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  
  ctx.globalAlpha = 1.0;
  
  // Vẽ labels và probabilities
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  
  // Fracture components
  for (const comp of fractureComponents) {
    const text = `F: ${(comp.probability * 100).toFixed(1)}%`;
    const x = comp.centroid.x + 10;
    const y = comp.centroid.y - 5;
    
    // Background
    ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
    const metrics = ctx.measureText(text);
    ctx.fillRect(x - 2, y - 12, metrics.width + 4, 16);
    
    // Text
    ctx.fillStyle = 'white';
    ctx.fillText(text, x, y);
  }
  
  // Normal components
  for (const comp of normalComponents) {
    const text = `N: ${((1 - comp.probability) * 100).toFixed(1)}%`;
    const x = comp.centroid.x + 10;
    const y = comp.centroid.y - 5;
    
    // Background
    ctx.fillStyle = 'rgba(0, 150, 0, 0.8)';
    const metrics = ctx.measureText(text);
    ctx.fillRect(x - 2, y - 12, metrics.width + 4, 16);
    
    // Text
    ctx.fillStyle = 'white';
    ctx.fillText(text, x, y);
  }
  
  // Vẽ legend và overall assessment
  const legendY = 20;
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'left';
  
  // Legend background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(10, 10, 280, 80);
  
  // Legend text
  ctx.fillStyle = 'white';
  ctx.fillText('SVM Analysis Results', 15, 25);
  
  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#ff6666';
  ctx.fillText('● Fracture-like components', 15, 45);
  ctx.fillStyle = '#66ff66';
  ctx.fillText('● Normal components', 15, 60);
  
  // Overall assessment
  const assessment = overallAssessment.hasFracture ? 'FRACTURE DETECTED' : 'NO FRACTURE';
  const assessmentColor = overallAssessment.hasFracture ? '#ff3333' : '#33ff33';
  ctx.fillStyle = assessmentColor;
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText(`${assessment} (${overallAssessment.confidence}%)`, 15, 80);
  
  return canvas.toDataURL();
}

// Vẽ kết quả SVM Analysis trên binary mask đã xử lý
export function drawSVMResultsOnProcessedImage(binary, svmResults, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  // Tạo ảnh nền từ binary mask (hiển thị là grayscale)
  const imageData = new ImageData(width, height);
  for (let i = 0, p = 0; i < binary.length; i++, p += 4) {
    const v = binary[i];
    imageData.data[p] = v;     // R
    imageData.data[p + 1] = v; // G
    imageData.data[p + 2] = v; // B
    imageData.data[p + 3] = 255; // A
  }
  ctx.putImageData(imageData, 0, 0);
  
  if (svmResults.totalComponents === 0) {
    // Nếu không có components, hiển thị thông báo
    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = 'rgba(255, 0, 0, 0.9)';
    ctx.fillRect(width/2 - 100, height/2 - 20, 200, 40);
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText('No components detected', width/2, height/2 + 5);
    return canvas.toDataURL();
  }
  
  const { fractureComponents, normalComponents, overallAssessment } = svmResults;
  
  // Vẽ fracture components (màu đỏ) - nổi bật hơn trên nền binary
  ctx.globalAlpha = 0.8;
  for (const comp of fractureComponents) {
    // Màu đỏ sáng cho fracture components
    ctx.fillStyle = `rgba(255, 0, 0, ${comp.probability * 0.8})`;
    
    // Vẽ circle tại centroid
    ctx.beginPath();
    ctx.arc(comp.centroid.x, comp.centroid.y, Math.sqrt(comp.area / Math.PI), 0, 2 * Math.PI);
    ctx.fill();
    
    // Vẽ border đậm hơn
    ctx.strokeStyle = `rgba(255, 0, 0, ${comp.probability})`;
    ctx.lineWidth = 4;
    ctx.stroke();
  }
  
  // Vẽ normal components (màu xanh lá)
  for (const comp of normalComponents) {
    // Màu xanh nhạt cho normal components
    ctx.fillStyle = `rgba(0, 255, 0, ${(1 - comp.probability) * 0.4})`;
    
    // Vẽ circle tại centroid (nhỏ hơn)
    ctx.beginPath();
    ctx.arc(comp.centroid.x, comp.centroid.y, Math.sqrt(comp.area / Math.PI) * 0.6, 0, 2 * Math.PI);
    ctx.fill();
    
    // Vẽ border
    ctx.strokeStyle = `rgba(0, 255, 0, ${1 - comp.probability})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  
  ctx.globalAlpha = 1.0;
  
  // Vẽ labels và probabilities với nền tương phản
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'left';
  
  // Fracture components
  for (const comp of fractureComponents) {
    const text = `F: ${(comp.probability * 100).toFixed(1)}%`;
    const x = comp.centroid.x + 8;
    const y = comp.centroid.y - 8;
    
    // Background với viền
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    const metrics = ctx.measureText(text);
    ctx.fillRect(x - 2, y - 12, metrics.width + 4, 16);
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 2, y - 12, metrics.width + 4, 16);
    
    // Text
    ctx.fillStyle = 'red';
    ctx.fillText(text, x, y);
  }
  
  // Normal components
  for (const comp of normalComponents) {
    const text = `N: ${((1 - comp.probability) * 100).toFixed(1)}%`;
    const x = comp.centroid.x + 8;
    const y = comp.centroid.y - 8;
    
    // Background với viền
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    const metrics = ctx.measureText(text);
    ctx.fillRect(x - 2, y - 12, metrics.width + 4, 16);
    ctx.strokeStyle = 'rgba(0, 150, 0, 0.8)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 2, y - 12, metrics.width + 4, 16);
    
    // Text
    ctx.fillStyle = 'green';
    ctx.fillText(text, x, y);
  }
  
  // Vẽ legend và overall assessment
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'left';
  
  // Legend background với viền
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.fillRect(10, 10, 300, 85);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, 300, 85);
  
  // Legend text
  ctx.fillStyle = 'black';
  ctx.fillText('SVM Analysis on Processed Image', 15, 30);
  
  ctx.font = '12px sans-serif';
  ctx.fillStyle = 'red';
  ctx.fillText('● Fracture-like components', 15, 50);
  ctx.fillStyle = 'green';
  ctx.fillText('● Normal components', 15, 65);
  
  // Overall assessment
  const assessment = overallAssessment.hasFracture ? 'FRACTURE DETECTED' : 'NO FRACTURE';
  const assessmentColor = overallAssessment.hasFracture ? 'red' : 'green';
  ctx.fillStyle = assessmentColor;
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText(`${assessment} (${overallAssessment.confidence}%)`, 15, 85);
  
  return canvas.toDataURL();
}
