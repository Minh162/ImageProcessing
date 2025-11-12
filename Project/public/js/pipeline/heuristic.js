/**
 * HEURISTIC ANALYSIS MODULE
 * Phân tích heuristic để đưa ra kết luận cuối cùng về gãy xương
 */

// Phân tích mask để phát hiện gãy xương
export function analyzeFracture(components, width, height, options = {}) {
  const {
    minSignificantArea = Math.max(50, Math.round(width * height * 0.0003))
  } = options;
  
  // Tính tổng diện tích mask
  const totalMaskArea = components.reduce((sum, comp) => sum + comp.area, 0);
  const imageArea = width * height;
  const maskPct = totalMaskArea / imageArea;
  
  // Nếu không có component nào
  if (components.length === 0) {
    return {
      fracture: false,
      confidence: 95,
      reason: 'Không phát hiện vùng bất thường',
      details: { 
        nComponents: 0,
        maskPct: 0
      }
    };
  }
  
  // Lọc components có ý nghĩa (loại bỏ nhiễu nhỏ)
  let significant = components.filter(comp => comp.area >= minSignificantArea);
  
  if (significant.length === 0) {
    // Nếu không tìm thấy component nào theo ngưỡng bình thường,
    // thử ngưỡng lỏng hơn (relaxed) để bắt các components nhỏ như khớp.
    const relaxedMin = Math.max(20, Math.floor(minSignificantArea / 2));
    const relaxed = components.filter(comp => comp.area >= relaxedMin);
    if (relaxed.length === 0) {
      return {
        fracture: false,
        confidence: 90,
        reason: 'Chỉ phát hiện nhiễu nhỏ, không có vùng bất thường đáng kể',
        details: {
          nComponents: components.length,
          nSignificant: 0,
          maskPct,
          minSignificantArea
        }
      };
    } else {
      // Sử dụng danh sách relaxed như significant
      significant = relaxed;
    }
  }
  
  // Sắp xếp theo diện tích giảm dần
  significant.sort((a, b) => b.area - a.area);
  
  const largest = significant[0].area;
  const second = significant[1] ? significant[1].area : 0;
  const third = significant[2] ? significant[2].area : 0;
  const sumSig = significant.reduce((sum, comp) => sum + comp.area, 0);
  
  // Tính các chỉ số quan trọng
  const secondRatio = largest > 0 ? second / largest : 0;
  const fragRatio = largest > 0 ? (sumSig - largest) / largest : 0;
  
  // Phân tích khoảng cách giữa các components
  const largestCentroid = significant[0].centroid;
  const distances = significant.slice(1).map(comp => {
    return Math.hypot(
      comp.centroid.x - largestCentroid.x,
      comp.centroid.y - largestCentroid.y
    );
  });
  
  // Tính đường chéo ảnh để chuẩn hóa khoảng cách
  const imageDiag = Math.hypot(width, height);
  const normalizedDistances = distances.map(d => d / imageDiag);
  
  // Kiểm tra có fragments phân tán không
  const hasDistantFragments = normalizedDistances.some(d => d > 0.15);
  
  // Tính tỉ lệ components chạm viền (có thể là artifacts)
  const borderComponents = significant.filter(comp => comp.touchesBorder);
  const borderRatio = significant.length > 0 ? borderComponents.length / significant.length : 0;
  
  // --- New check: aligned components within ~1mm spacing likely represent
  // anatomical joint alignment (not fracture). This check is now non-blocking:
  // it only records alignment info and will not prematurely return 'no fracture'.
  // Allow caller to pass pxPerMm (pixels per millimeter). Default fallback is 3 px/mm.
  const pxPerMm = options.pxPerMm || 3;
  let alignmentDetected = false;
  let alignmentDetails = null;
  
  // LOGIC PHÁT HIỆN GÃY XƯƠNG
  let fracture = false;
  let confidence = 0;
  let reason = '';
  
  // Check for alignment (colinearity) if we have multiple significant components
  try {
    if (significant.length >= 2) {
      // Build array of centroids
      const pts = significant.map(c => [c.centroid.x, c.centroid.y]);
      // Compute mean
      const mean = pts.reduce((s, p) => [s[0] + p[0], s[1] + p[1]], [0, 0]).map(v => v / pts.length);
      // Compute covariance 2x2
      let Sxx = 0, Sxy = 0, Syy = 0;
      for (const p of pts) {
        const dx = p[0] - mean[0];
        const dy = p[1] - mean[1];
        Sxx += dx * dx;
        Sxy += dx * dy;
        Syy += dy * dy;
      }
      // Principal axis (largest eigenvector of covariance)
      const trace = Sxx + Syy;
      const det = Sxx * Syy - Sxy * Sxy;
      const lambda = trace / 2 + Math.sqrt(Math.max(0, (trace * trace) / 4 - det));
      // eigenvector for lambda: (Sxy, lambda - Sxx) or (lambda - Syy, Sxy)
      let ux = Sxy, uy = lambda - Sxx;
      if (Math.abs(ux) < 1e-6 && Math.abs(uy) < 1e-6) {
        ux = lambda - Syy; uy = Sxy;
      }
      const norm = Math.hypot(ux, uy) || 1;
      ux /= norm; uy /= norm;

      // Project points onto axis and compute perpendicular distances
      const projections = pts.map(p => ((p[0] - mean[0]) * ux + (p[1] - mean[1]) * uy));
      const perpDists = pts.map((p, i) => {
        const along = projections[i];
        const projX = mean[0] + along * ux;
        const projY = mean[1] + along * uy;
        return Math.hypot(p[0] - projX, p[1] - projY);
      });

      const imageDiag2 = Math.hypot(width, height);
      const maxPerp = Math.max(...perpDists);

      // Sort projections to compute adjacent gaps
      const sortedProj = projections.slice().sort((a, b) => a - b);
      const gaps = [];
      for (let i = 1; i < sortedProj.length; i++) gaps.push(Math.abs(sortedProj[i] - sortedProj[i - 1]));
      const medianGap = gaps.length > 0 ? gaps.sort((a, b) => a - b)[Math.floor(gaps.length / 2)] : 0;

      // Conditions: centroids lie close to a line (max perp < 0.5% diag) and gaps <= 1mm
      const colinearThreshold = 0.005 * imageDiag2; // 0.5% of diag
      const mmThresholdPx = 1 * pxPerMm; // 1mm in pixels

      if (maxPerp <= colinearThreshold && medianGap <= Math.max(mmThresholdPx, 1)) {
        alignmentDetected = true;
        alignmentDetails = {
          nSignificant: significant.length,
          maxPerp: Math.round(maxPerp),
          medianGapPx: Math.round(medianGap),
          pxPerMm
        };
      }
    }
  } catch (err) {
    // ignore errors in alignment check
  }
  
  // Trường hợp 1: Có nhiều components đáng kể (>= 2)
  if (significant.length >= 2) {
    if (secondRatio >= 0.15) {
      fracture = true;
      confidence = Math.min(95, 60 + Math.round(secondRatio * 100));
      reason = `Phát hiện ${significant.length} mảnh rời, mảnh thứ 2 chiếm ${Math.round(secondRatio * 100)}% mảnh lớn nhất`;
    }
    // Nhiều mảnh vỡ nhỏ
    else if (significant.length >= 3 && fragRatio >= 0.3) {
      fracture = true;
      confidence = Math.min(90, 50 + Math.round(fragRatio * 80));
      reason = `Phát hiện ${significant.length} mảnh vỡ phân tán`;
    }
    // Có fragments ở xa
    else if (hasDistantFragments) {
      fracture = true;
      confidence = 75;
      reason = 'Phát hiện mảnh vỡ phân tán xa nhau';
    }
    // Nhiều components nhưng không rõ ràng
    else {
      fracture = true;
      confidence = 65;
      reason = `Có dấu hiệu bất thường với ${significant.length} vùng riêng biệt`;
    }
  }
  // Trường hợp 2: Chỉ có 1 component lớn
  else {
    // Kiểm tra hình dạng bất thường
    const comp = significant[0];
    const isElongated = comp.aspectRatio > 5; // Rất dài và mỏng
    const isIrregular = comp.circularity < 0.3; // Hình dạng không đều
    const isLargeArea = maskPct > 0.05; // Vùng bất thường lớn
    
    if (isElongated || (isIrregular && isLargeArea)) {
      fracture = true;
      confidence = 70;
      reason = 'Phát hiện vùng bất thường với hình dạng đáng ngờ';
    } else {
      fracture = false;
      confidence = 80;
      reason = 'Chỉ có 1 vùng đồng nhất, không có dấu hiệu gãy rõ ràng';
    }
  }
  
  // Điều chỉnh confidence dựa trên tỉ lệ chạm viền
  if (fracture && borderRatio > 0.7) {
    confidence = Math.max(40, confidence - 15);
    reason += ' (độ tin cậy giảm do nhiều vùng chạm viền)';
  }
  
  // If alignment was detected, adjust messaging/confidence but do not veto
  if (alignmentDetected) {
    if (fracture) {
      // reduce confidence slightly when alignment suggests anatomical structures
      confidence = Math.max(30, confidence - 15);
      reason += ' (các vùng có xu hướng thẳng hàng; cân nhắc đặc trưng giải phẫu)';
    } else {
      // add a note explaining alignment
      reason += ` (Lưu ý: ${alignmentDetails.nSignificant} vùng thẳng hàng; khoảng cách trung vị ~${alignmentDetails.medianGapPx}px)`;
    }
  }
  
  return {
    fracture,
    confidence,
    reason,
    details: {
      nComponents: components.length,
      nSignificant: significant.length,
      largestArea: largest,
      secondArea: second,
      thirdArea: third,
      secondRatio: Math.round(secondRatio * 100) / 100,
      fragRatio: Math.round(fragRatio * 100) / 100,
      maskPct: Math.round(maskPct * 10000) / 100,
      borderRatio: Math.round(borderRatio * 100) / 100,
      hasDistantFragments,
      maxDistance: normalizedDistances.length > 0 ? Math.round(Math.max(...normalizedDistances) * 100) / 100 : 0
      ,
      alignmentDetected,
      alignmentDetails
    }
  };
}

// Phân loại mức độ nghiêm trọng của gãy xương
export function classifySeverity(result, components) {
  if (!result.fracture) {
    return {
      severity: 'none',
      level: 0,
      description: 'Không phát hiện gãy xương'
    };
  }
  
  const { nSignificant, secondRatio, fragRatio } = result.details;
  
  // Gãy phức tạp: nhiều mảnh vỡ (>= 4) hoặc nhiều mảnh nhỏ
  if (nSignificant >= 4 || (nSignificant >= 3 && fragRatio >= 0.8)) {
    return {
      severity: 'complex',
      level: 3,
      description: 'Gãy phức tạp - Nhiều mảnh vỡ',
      detail: `Phát hiện ${nSignificant} mảnh riêng biệt`
    };
  }
  
  // Gãy vừa phải: 3 mảnh hoặc 2 mảnh với tỉ lệ thấp
  if (nSignificant === 3 || (nSignificant === 2 && secondRatio < 0.4)) {
    return {
      severity: 'moderate',
      level: 2,
      description: 'Gãy vừa phải - Có nứt hoặc gãy một phần',
      detail: `Phát hiện ${nSignificant} vùng bất thường`
    };
  }
  
  // Gãy đơn giản: 2 mảnh lớn rõ ràng
  if (nSignificant === 2 && secondRatio >= 0.4) {
    return {
      severity: 'simple',
      level: 1,
      description: 'Gãy đơn giản - 2 mảnh chính',
      detail: `Mảnh thứ 2 chiếm ${Math.round(secondRatio * 100)}% mảnh lớn nhất`
    };
  }
  
  // Trường hợp còn lại: gãy nhẹ hoặc nghi ngờ
  return {
    severity: 'mild',
    level: 1,
    description: 'Nghi ngờ có gãy - Cần kiểm tra thêm',
    detail: 'Có dấu hiệu bất thường nhưng không rõ ràng'
  };
}

// Tạo báo cáo chi tiết
export function generateReport(result, components, severityInfo) {
  // Generate a minimal report: only summary and components.
  // Metrics and recommendation intentionally omitted per UI request.
  const report = {
    summary: {
      hasFracture: result.fracture,
      confidence: result.confidence,
      severity: severityInfo.severity,
      description: severityInfo.description
    },
    components: components.map(comp => ({
      label: comp.label,
      area: comp.area,
      centroid: comp.centroid,
      boundingBox: comp.boundingBox,
      aspectRatio: comp.aspectRatio.toFixed(2),
      circularity: comp.circularity.toFixed(3),
      touchesBorder: comp.touchesBorder
    }))
  };
  
  return report;
}

function generateRecommendation(result, severityInfo) {
  if (!result.fracture) {
    return 'Không phát hiện dấu hiệu gãy xương rõ ràng. Nếu có triệu chứng, nên kiểm tra thêm với bác sĩ.';
  }
  
  switch (severityInfo.severity) {
    case 'simple':
      return 'Phát hiện gãy xương đơn giản. Cần đến bác sĩ để xác định và điều trị thích hợp.';
    case 'moderate':
      return 'Phát hiện dấu hiệu gãy xương. Nên đến bác sĩ ngay để kiểm tra chi tiết.';
    case 'complex':
      return 'Phát hiện gãy xương phức tạp với nhiều mảnh vỡ. CẦN ĐẾN BÁC SĨ NGAY LẬP TỨC!';
    default:
      return 'Cần kiểm tra thêm với bác sĩ chuyên khoa.';
  }
}

// Phân tích xu hướng (trend analysis) - so sánh với kết quả trước
export function analyzeTrend(currentResult, previousResults = []) {
  if (previousResults.length === 0) {
    return {
      trend: 'new',
      message: 'Đây là kết quả phân tích đầu tiên'
    };
  }
  
  const currentConf = currentResult.confidence;
  const avgPrevConf = previousResults.reduce((sum, r) => sum + r.confidence, 0) / previousResults.length;
  
  if (Math.abs(currentConf - avgPrevConf) < 10) {
    return {
      trend: 'stable',
      message: 'Kết quả ổn định so với lần trước'
    };
  }
  
  if (currentConf > avgPrevConf) {
    return {
      trend: 'improving' ,
      message: 'Độ tin cậy tăng so với lần trước'
    };
  }
  
  return {
    trend: 'declining',
    message: 'Độ tin cậy giảm so với lần trước'
  };
}
