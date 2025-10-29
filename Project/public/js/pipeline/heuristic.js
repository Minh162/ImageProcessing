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
  const significant = components.filter(comp => comp.area >= minSignificantArea);
  
  if (significant.length === 0) {
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
  
  // LOGIC PHÁT HIỆN GÃY XƯƠNG
  let fracture = false;
  let confidence = 0;
  let reason = '';
  
  // Trường hợp 1: Có nhiều components đáng kể (>= 2)
  if (significant.length >= 2) {
    // Gãy xương rõ ràng: có ít nhất 2 mảnh lớn
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
  const report = {
    summary: {
      hasFracture: result.fracture,
      confidence: result.confidence,
      severity: severityInfo.severity,
      description: severityInfo.description
    },
    metrics: result.details,
    components: components.map(comp => ({
      label: comp.label,
      area: comp.area,
      centroid: comp.centroid,
      boundingBox: comp.boundingBox,
      aspectRatio: comp.aspectRatio.toFixed(2),
      circularity: comp.circularity.toFixed(3),
      touchesBorder: comp.touchesBorder
    })),
    recommendation: generateRecommendation(result, severityInfo)
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
