/**
 * PIPELINE CONTROLLER
 * Quản lý toàn bộ luồng xử lý pipeline và state
 */

import * as Preprocessing from './preprocessing.js';
import * as EdgeDetection from './edgeDetection.js';
import * as Morphology from './morphology.js';
import * as FeatureAnalysis from './featureAnalysis.js';
import * as Heuristic from './heuristic.js';
import * as ImageUtils from '../utils/imageUtils.js';

export class PipelineController {
  constructor() {
    this.state = {
      currentStep: 0,
      originalImage: null,
      results: []
    };
    
    this.steps = [
      {
        name: 'preprocessing',
        title: 'Bước 1: Tiền xử lý',
        algorithms: [
          { value: 'clahe', label: 'CLAHE (Adaptive Histogram)' },
          { value: 'histogram', label: 'Histogram Equalization' },
          { value: 'median', label: 'Median Blur' },
          { value: 'gaussian', label: 'Gaussian Blur' },
          { value: 'bilateral', label: 'Bilateral Filter' }
        ]
      },
      {
        name: 'edgeDetection',
        title: 'Bước 2: Phát hiện biên',
        algorithms: [
          { value: 'otsu', label: 'Otsu Thresholding' },
          { value: 'canny', label: 'Canny Edge Detection' },
          { value: 'sobel', label: 'Sobel Edge Detection' },
          { value: 'watershed', label: 'Watershed Segmentation' }
        ]
      },
      {
        name: 'morphology',
        title: 'Bước 3: Xử lý hình thái học',
        algorithms: [
          { value: 'erosion', label: 'Erosion' },
          { value: 'dilation', label: 'Dilation' },
          { value: 'opening', label: 'Opening (Erosion → Dilation)' },
          { value: 'closing', label: 'Closing (Dilation → Erosion)' }
        ]
      },
      {
        name: 'featureAnalysis',
        title: 'Bước 4: Phân tích đặc trưng',
        algorithms: [
          { value: 'components', label: 'Connected Components' },
          { value: 'area', label: 'Area Analysis' },
          { value: 'centroid', label: 'Centroid Analysis' },
          { value: 'bbox', label: 'Bounding Box Analysis' }
        ]
      },
      {
        name: 'heuristic',
        title: 'Bước 5: Phân tích Heuristic',
        algorithms: [
          { value: 'fracture', label: 'Fracture Detection' },
          { value: 'severity', label: 'Severity Classification' },
          { value: 'report', label: 'Generate Report' }
        ]
      }
    ];
  }
  
  // Khởi tạo với ảnh gốc
  initialize(imageElement) {
    this.state.originalImage = imageElement;
    this.state.currentStep = 0;
    this.state.results = [];
    
    // Chuyển sang grayscale ngay từ đầu
    const imageData = ImageUtils.imageDataFromImageElement(imageElement);
    const grayData = Preprocessing.rgbaToGrayUint8(imageData);
    
    this.state.results.push({
      step: 0,
      name: 'original',
      data: grayData,
      imageUrl: null
    });
    
    return this.steps;
  }
  
  // Xử lý bước tiền xử lý
  processPreprocessing(algorithm, params = {}) {
    const lastResult = this.getLastResult();
    const { gray, width, height } = lastResult.data;
    
    let processed;
    
    switch (algorithm) {
      case 'clahe':
        processed = Preprocessing.applyCLAHE(gray, width, height, params.tileSize || 64);
        break;
      case 'histogram':
        processed = Preprocessing.histogramEqualization(gray, width, height);
        break;
      case 'median':
        processed = Preprocessing.medianBlur(gray, width, height, params.radius || 2);
        break;
      case 'gaussian':
        processed = Preprocessing.gaussianBlur(gray, width, height, params.radius || 2, params.sigma || 1.0);
        break;
      case 'bilateral':
        processed = Preprocessing.bilateralFilter(gray, width, height, params.radius || 2, params.sigmaSpace || 2.0, params.sigmaColor || 50);
        break;
      default:
        throw new Error(`Unknown preprocessing algorithm: ${algorithm}`);
    }
    
    const result = {
      step: 1,
      name: 'preprocessing',
      algorithm,
      data: { gray: processed, width, height },
      imageUrl: ImageUtils.grayToDataURL(processed, width, height)
    };
    
    this.state.results.push(result);
    this.state.currentStep = 1;
    
    return result;
  }
  
  // Xử lý bước phát hiện biên
  processEdgeDetection(algorithm, params = {}) {
    const lastResult = this.getLastResult();
    const { gray, width, height } = lastResult.data;
    
    let edges;
    
    switch (algorithm) {
      case 'otsu':
        const otsuResult = EdgeDetection.otsuThreshold(gray);
        edges = otsuResult.binary;
        break;
      case 'canny':
        edges = EdgeDetection.cannyEdgeDetection(
          gray, width, height,
          params.lowThreshold || 50,
          params.highThreshold || 150
        );
        break;
      case 'sobel':
        edges = EdgeDetection.sobelEdgeDetection(gray, width, height, params.threshold || 100);
        break;
      case 'watershed':
        edges = EdgeDetection.watershedSegmentation(gray, width, height);
        break;
      default:
        throw new Error(`Unknown edge detection algorithm: ${algorithm}`);
    }
    
    const result = {
      step: 2,
      name: 'edgeDetection',
      algorithm,
      data: { binary: edges, width, height },
      imageUrl: ImageUtils.binaryToDataURL(edges, width, height)
    };
    
    this.state.results.push(result);
    this.state.currentStep = 2;
    
    return result;
  }
  
  // Xử lý bước morphology
  processMorphology(algorithm, params = {}) {
    const lastResult = this.getLastResult();
    const { binary, width, height } = lastResult.data;
    
  let processed;
  // Enforce fixed kernel size and iterations per user request
  const kernelSize = 5;
  const iterations = 2;
    // If the incoming binary is very sparse (likely an edge map like Canny),
    // opening (erosion->dilation) with a large kernel may remove all edges.
    // In that case, do a small pre-dilation to thicken edges before morphology.
    const fgCount = binary.reduce((s, v) => s + (v === 255 ? 1 : 0), 0);
    const maskPct = fgCount / (width * height);
    let binForMorph = binary;
    if (maskPct < 0.01) {
      // small thicken step: kernel 3, 1 iteration
      binForMorph = Morphology.dilation(binary, width, height, 3, 1);
    }
    
    switch (algorithm) {
      case 'erosion':
        processed = Morphology.erosion(binForMorph, width, height, kernelSize, iterations);
        break;
      case 'dilation':
        processed = Morphology.dilation(binForMorph, width, height, kernelSize, iterations);
        break;
      case 'opening':
        processed = Morphology.opening(binForMorph, width, height, kernelSize, iterations);
        break;
      case 'closing':
        processed = Morphology.closing(binForMorph, width, height, kernelSize, iterations);
        break;
      default:
        throw new Error(`Unknown morphology algorithm: ${algorithm}`);
    }
    
    const result = {
      step: 3,
      name: 'morphology',
      algorithm,
      data: { binary: processed, width, height },
      imageUrl: ImageUtils.binaryToDataURL(processed, width, height)
    };
    
    this.state.results.push(result);
    this.state.currentStep = 3;
    
    return result;
  }
  
  // Xử lý bước phân tích đặc trưng
  processFeatureAnalysis(algorithm, params = {}) {
    const lastResult = this.getLastResult();
    const { binary, width, height } = lastResult.data;
    
    const analysis = FeatureAnalysis.analyzeComponents(binary, width, height);
    
    // Lọc components nếu cần
  // Use a more permissive default minArea so small joints/components are kept
  const minArea = params.minArea || Math.max(20, Math.round(width * height * 0.00005));
    const filtered = FeatureAnalysis.filterComponents(analysis.components, {
      minArea,
      excludeBorderTouching: params.excludeBorderTouching || false
    });
    
    // Tạo visualization
    let imageUrl;
    switch (algorithm) {
      case 'components':
        imageUrl = ImageUtils.drawComponents(this.state.originalImage, analysis.labels, analysis.nComponents, width, height);
        break;
      case 'area':
        imageUrl = ImageUtils.drawComponentsWithAreas(this.state.originalImage, filtered, width, height);
        break;
      case 'centroid':
        imageUrl = ImageUtils.drawCentroids(this.state.originalImage, filtered, width, height);
        break;
      case 'bbox':
        imageUrl = ImageUtils.drawBoundingBoxes(this.state.originalImage, filtered, width, height);
        break;
      default:
        imageUrl = ImageUtils.binaryToDataURL(binary, width, height);
    }
    
    const result = {
      step: 4,
      name: 'featureAnalysis',
      algorithm,
      data: { 
        binary, 
        width, 
        height,
        analysis: {
          nComponents: analysis.nComponents,
          components: filtered,
          allComponents: analysis.components,
          labels: analysis.labels
        }
      },
      imageUrl
    };
    
    this.state.results.push(result);
    this.state.currentStep = 4;
    
    return result;
  }
  
  // Xử lý bước heuristic
  processHeuristic(algorithm, params = {}) {
    const lastResult = this.getLastResult();
    const { analysis, width, height } = lastResult.data;
    
    let result;
    
    switch (algorithm) {
      case 'fracture':
        const fractureResult = Heuristic.analyzeFracture(analysis.components, width, height, params);
        result = {
          step: 5,
          name: 'heuristic',
          algorithm: 'fracture',
          data: {
            ...lastResult.data,
            heuristic: fractureResult
          },
          imageUrl: lastResult.imageUrl
        };
        break;
        
      case 'severity':
        const prevHeuristic = lastResult.data.heuristic;
        if (!prevHeuristic) {
          throw new Error('Need fracture analysis first');
        }
        const severity = Heuristic.classifySeverity(prevHeuristic, analysis.components);
        result = {
          step: 5,
          name: 'heuristic',
          algorithm: 'severity',
          data: {
            ...lastResult.data,
            severity
          },
          imageUrl: lastResult.imageUrl
        };
        break;
        
      case 'report':
        // Ensure fracture and severity analyses exist; if not, run them here
        let current = this.getLastResult();
        if (!current.data.heuristic) {
          // run fracture analysis
          this.processHeuristic('fracture', params);
          current = this.getLastResult();
        }
        if (!current.data.severity) {
          // run severity analysis (requires fracture present)
          this.processHeuristic('severity', params);
          current = this.getLastResult();
        }
        const h = current.data.heuristic;
        const s = current.data.severity;
        const report = Heuristic.generateReport(h, analysis.components, s);
        result = {
          step: 5,
          name: 'heuristic',
          algorithm: 'report',
          data: {
            ...lastResult.data,
            report
          },
          imageUrl: lastResult.imageUrl
        };
        break;
        
      default:
        throw new Error(`Unknown heuristic algorithm: ${algorithm}`);
    }
    
    this.state.results.push(result);
    this.state.currentStep = 5;
    
    return result;
  }
  
  // Xử lý bất kỳ bước nào
  process(stepName, algorithm, params = {}) {
    switch (stepName) {
      case 'preprocessing':
        return this.processPreprocessing(algorithm, params);
      case 'edgeDetection':
        return this.processEdgeDetection(algorithm, params);
      case 'morphology':
        return this.processMorphology(algorithm, params);
      case 'featureAnalysis':
        return this.processFeatureAnalysis(algorithm, params);
      case 'heuristic':
        return this.processHeuristic(algorithm, params);
      default:
        throw new Error(`Unknown step: ${stepName}`);
    }
  }
  
  // Lấy kết quả cuối cùng
  getLastResult() {
    return this.state.results[this.state.results.length - 1];
  }
  
  // Lấy tất cả kết quả
  getAllResults() {
    return this.state.results;
  }
  
  // Lấy bước hiện tại
  getCurrentStep() {
    return this.state.currentStep;
  }
  
  // Lấy danh sách các bước
  getSteps() {
    return this.steps;
  }
  
  // Reset pipeline
  reset() {
    this.state = {
      currentStep: 0,
      originalImage: null,
      results: []
    };
  }
}
