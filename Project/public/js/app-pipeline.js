/**
 * MAIN APPLICATION - PIPELINE VERSION
 * Quản lý UI và tương tác người dùng cho phiên bản pipeline
 */

import { PipelineController } from './pipeline/pipelineController.js';
import * as ImageUtils from './utils/imageUtils.js';

// Global state
let pipeline = null;
let uploadedImage = null;

// DOM Elements
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const originalImg = document.getElementById('originalImg');
const pipelineSteps = document.getElementById('pipelineSteps');
const actionPanel = document.getElementById('actionPanel');
const resetBtn = document.getElementById('resetBtn');
const downloadBtn = document.getElementById('downloadBtn');
const viewHistoryBtn = document.getElementById('viewHistoryBtn');
const historyPanel = document.getElementById('historyPanel');
const historyList = document.getElementById('historyList');

// Step elements
const stepPanels = {
  1: document.getElementById('step1'),
  2: document.getElementById('step2'),
  3: document.getElementById('step3'),
  4: document.getElementById('step4'),
  5: document.getElementById('step5')
};

// Algorithm selects
const algoSelects = {
  preprocessing: document.getElementById('preprocessingAlgo'),
  edgeDetection: document.getElementById('edgeDetectionAlgo'),
  morphology: document.getElementById('morphologyAlgo'),
  featureAnalysis: document.getElementById('featureAnalysisAlgo')
};

// Result images
const resultImages = {
  1: document.getElementById('result1'),
  2: document.getElementById('result2'),
  3: document.getElementById('result3'),
  4: document.getElementById('result4'),
  5: document.getElementById('result5')
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
});

function setupEventListeners() {
  uploadBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', handleFileUpload);
  resetBtn.addEventListener('click', resetPipeline);
  downloadBtn.addEventListener('click', downloadResults);
  viewHistoryBtn.addEventListener('click', toggleHistory);
  
  // Process buttons
  document.querySelectorAll('.btn-process').forEach(btn => {
    btn.addEventListener('click', handleProcessClick);
  });
}

async function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  try {
    // Load image
    const dataURL = await readFileAsDataURL(file);
    originalImg.src = dataURL;
    
    // Wait for image to load
    await new Promise((resolve) => {
      originalImg.onload = resolve;
    });
    
    uploadedImage = originalImg;
    
    // Initialize pipeline
    pipeline = new PipelineController();
    pipeline.initialize(uploadedImage);
    
    // Show pipeline steps
    pipelineSteps.style.display = 'block';
    actionPanel.style.display = 'flex';
    stepPanels[1].style.display = 'block';
    
    // Show and update progress tracker
    const progressTracker = document.getElementById('progressTracker');
    progressTracker.style.display = 'flex';
    updateProgressTracker(1);
    
    // Mark step 1 as active
    stepPanels[1].classList.remove('step-incomplete');
    stepPanels[1].classList.add('step-active');
    
    showNotification('✅ Ảnh đã được tải lên! Bắt đầu với Bước 1: Tiền xử lý', 'success');
    
  } catch (error) {
    console.error('Upload error:', error);
    showNotification('❌ Lỗi khi tải ảnh: ' + error.message, 'error');
  }
}

function handleProcessClick(e) {
  const btn = e.target;
  const step = btn.dataset.step;
  const algo = btn.dataset.algo;
  
  if (step === 'heuristic') {
    // Heuristic có button riêng cho từng thuật toán
    processHeuristicStep(algo);
  } else {
    processStep(step);
  }
}

async function processStep(stepName) {
  try {
    const select = algoSelects[stepName];
    const algorithm = select?.value;
    
    if (!algorithm) {
      showNotification('⚠️ Vui lòng chọn thuật toán!', 'warning');
      return;
    }
    
    showNotification('⏳ Đang xử lý...', 'info');
    
    // Get parameters if needed
    let params = {};
    if (stepName === 'morphology') {
      params = {
        kernelSize: parseInt(document.getElementById('kernelSize').value),
        iterations: parseInt(document.getElementById('iterations').value)
      };
    }
    
    // Process
    const result = pipeline.process(stepName, algorithm, params);
    
    // Display result
    const stepNum = getStepNumber(stepName);
    if (result.imageUrl) {
      resultImages[stepNum].src = result.imageUrl;
      resultImages[stepNum].style.display = 'block';
      
      // Show result container
      const resultContainer = document.getElementById(`resultContainer${stepNum}`);
      if (resultContainer) {
        resultContainer.style.display = 'block';
      }
    }
    
    // Show feature stats if applicable
    if (stepName === 'featureAnalysis' && result.data.analysis) {
      displayFeatureStats(result.data.analysis);
      
      // Tự động chạy Bước 5 (Heuristic & Report) sau khi hoàn thành Bước 4
      setTimeout(() => {
        autoRunHeuristicAnalysis();
      }, 500);
    }
    
    // Mark step as complete
    markStepComplete(stepNum);
    
    // Show next step (chỉ hiển thị, không cần tương tác)
    showNextStep(stepNum);
    
    // Update progress tracker
    updateProgressTracker(stepNum + 1);
    
    showNotification(`✅ Bước ${stepNum} hoàn thành! ${stepNum < 5 ? 'Tiếp tục bước tiếp theo bên dưới.' : ''}`, 'success');
    
    // Update history
    updateHistory(result);
    
  } catch (error) {
    console.error('Process error:', error);
    showNotification('❌ Lỗi xử lý: ' + error.message, 'error');
  }
}

async function processHeuristicStep(algorithm) {
  try {
    showNotification('⏳ Đang phân tích...', 'info');
    
    // Xử lý tuần tự: fracture -> severity -> report
    let result;
    
    if (algorithm === 'fracture') {
      result = pipeline.process('heuristic', 'fracture');
      displayFractureResult(result.data.heuristic);
    } else if (algorithm === 'severity') {
      // Cần có kết quả fracture trước
      const lastResult = pipeline.getLastResult();
      if (!lastResult.data.heuristic) {
        // Tự động chạy fracture trước
        result = pipeline.process('heuristic', 'fracture');
      }
      result = pipeline.process('heuristic', 'severity');
      displaySeverityResult(result.data.severity);
    } else if (algorithm === 'report') {
      // Cần có kết quả fracture và severity trước
      const lastResult = pipeline.getLastResult();
      if (!lastResult.data.heuristic) {
        pipeline.process('heuristic', 'fracture');
      }
      if (!lastResult.data.severity) {
        pipeline.process('heuristic', 'severity');
      }
      result = pipeline.process('heuristic', 'report');
      displayFullReport(result.data.report);
    }
    
    showNotification(`✅ Phân tích hoàn thành!`, 'success');
    updateHistory(result);
    
  } catch (error) {
    console.error('Heuristic error:', error);
    showNotification('❌ Lỗi phân tích: ' + error.message, 'error');
  }
}

// Tự động chạy toàn bộ phân tích Heuristic sau Bước 4
function autoRunHeuristicAnalysis() {
  try {
    showNotification('⏳ Đang tạo báo cáo tự động...', 'info');
    
    // Chạy tuần tự: Phát hiện gãy xương -> Phân loại mức độ -> Tạo báo cáo
    pipeline.process('heuristic', 'fracture');
    pipeline.process('heuristic', 'severity');
    const reportResult = pipeline.process('heuristic', 'report');
    
    // Hiển thị báo cáo đầy đủ
    displayFullReport(reportResult.data.report);
    
    // Mark step 5 as complete
    markStepComplete(5);
    updateProgressTracker(5);
    
    showNotification('✅ Báo cáo hoàn chỉnh đã được tạo!', 'success');
    updateHistory(reportResult);
    
  } catch (error) {
    console.error('Auto heuristic error:', error);
    showNotification('❌ Lỗi tạo báo cáo: ' + error.message, 'error');
  }
}


function displayFeatureStats(analysis) {
  const statsDiv = document.getElementById('featureStats');
  const comps = analysis.components;
  
  let html = '<h3>📈 Thống kê Components</h3>';
  html += `<p><strong>Tổng số components:</strong> ${comps.length}</p>`;
  
  if (comps.length > 0) {
    html += '<table class="stats-table">';
    html += '<tr><th>Label</th><th>Diện tích</th><th>Centroid</th><th>Aspect Ratio</th><th>Circularity</th></tr>';
    
    comps.slice(0, 10).forEach(comp => {
      html += `<tr>
        <td>#${comp.label}</td>
        <td>${comp.area} px</td>
        <td>(${comp.centroid.x.toFixed(1)}, ${comp.centroid.y.toFixed(1)})</td>
        <td>${comp.aspectRatio.toFixed(2)}</td>
        <td>${comp.circularity.toFixed(3)}</td>
      </tr>`;
    });
    
    html += '</table>';
    
    if (comps.length > 10) {
      html += `<p><em>... và ${comps.length - 10} components khác</em></p>`;
    }
  }
  
  statsDiv.innerHTML = html;
  statsDiv.style.display = 'block';
}

function displayFractureResult(heuristic) {
  const resultsDiv = document.getElementById('heuristicResults');
  
  let html = '<div class="heuristic-result">';
  html += `<h3>🔍 Kết quả phát hiện gãy xương</h3>`;
  
  const statusClass = heuristic.fracture ? 'fracture-positive' : 'fracture-negative';
  const statusIcon = heuristic.fracture ? '⚠️' : '✅';
  const statusText = heuristic.fracture ? 'CÓ DẤU HIỆU GÃY XƯƠNG' : 'KHÔNG PHÁT HIỆN GÃY XƯƠNG';
  
  html += `<div class="status-box ${statusClass}">`;
  html += `<div class="status-icon">${statusIcon}</div>`;
  html += `<div class="status-text">${statusText}</div>`;
  html += `<div class="confidence">Độ tin cậy: ${heuristic.confidence}%</div>`;
  html += `</div>`;
  
  html += `<div class="details">`;
  html += `<h4>Chi tiết:</h4>`;
  html += `<ul>`;
  html += `<li>Số components: ${heuristic.details.nComponents}</li>`;
  html += `<li>Số components đáng kể: ${heuristic.details.nSignificant}</li>`;
  html += `<li>Diện tích lớn nhất: ${heuristic.details.largestArea} px</li>`;
  html += `<li>Tỷ lệ mask: ${(heuristic.details.maskPct * 100).toFixed(2)}%</li>`;
  html += `<li>Fragment ratio: ${heuristic.details.fragRatio.toFixed(3)}</li>`;
  html += `</ul>`;
  html += `</div>`;
  
  html += '</div>';
  
  resultsDiv.innerHTML = html;
  resultsDiv.style.display = 'block';
}

function displaySeverityResult(severity) {
  const resultsDiv = document.getElementById('heuristicResults');
  
  let html = resultsDiv.innerHTML || '';
  html += '<div class="severity-result">';
  html += `<h3>📊 Mức độ nghiêm trọng</h3>`;
  
  const severityClass = `severity-${severity.severity}`;
  let severityIcon = '🟢';
  if (severity.severity === 'moderate') severityIcon = '🟡';
  if (severity.severity === 'complex') severityIcon = '🔴';
  
  html += `<div class="severity-box ${severityClass}">`;
  html += `<div class="severity-icon">${severityIcon}</div>`;
  html += `<div class="severity-text">${severity.description}</div>`;
  html += `</div>`;
  
  html += '</div>';
  
  resultsDiv.innerHTML = html;
}

function displayFullReport(report) {
  const resultsDiv = document.getElementById('heuristicResults');
  
  let html = '<div class="full-report">';
  html += `<h3>📋 Báo cáo đầy đủ</h3>`;
  
  // Summary
  html += `<div class="report-section">`;
  html += `<h4>Tóm tắt:</h4>`;
  html += `<ul>`;
  html += `<li><strong>Có gãy xương:</strong> ${report.summary.hasFracture ? 'Có' : 'Không'}</li>`;
  html += `<li><strong>Độ tin cậy:</strong> ${report.summary.confidence}%</li>`;
  html += `<li><strong>Mức độ:</strong> ${report.summary.description}</li>`;
  html += `</ul>`;
  html += `</div>`;
  
  // Metrics
  html += `<div class="report-section">`;
  html += `<h4>Các chỉ số:</h4>`;
  html += `<table class="metrics-table">`;
  html += `<tr><td>Số components</td><td>${report.metrics.nComponents}</td></tr>`;
  html += `<tr><td>Components đáng kể</td><td>${report.metrics.nSignificant}</td></tr>`;
  html += `<tr><td>Components hiệu dụng</td><td>${report.metrics.nEffective}</td></tr>`;
  html += `<tr><td>Diện tích lớn nhất</td><td>${report.metrics.largestArea} px</td></tr>`;
  html += `<tr><td>Tỷ lệ mask</td><td>${(report.metrics.maskPct * 100).toFixed(2)}%</td></tr>`;
  html += `</table>`;
  html += `</div>`;
  
  // Recommendation
  html += `<div class="report-section recommendation">`;
  html += `<h4>🩺 Khuyến nghị:</h4>`;
  html += `<p>${report.recommendation}</p>`;
  html += `</div>`;
  
  html += '</div>';
  
  resultsDiv.innerHTML = html;
}

function getStepNumber(stepName) {
  const mapping = {
    preprocessing: 1,
    edgeDetection: 2,
    morphology: 3,
    featureAnalysis: 4,
    heuristic: 5
  };
  return mapping[stepName];
}

function showNextStep(currentStepNum) {
  if (currentStepNum < 5) {
    const nextStep = stepPanels[currentStepNum + 1];
    nextStep.style.display = 'block';
    nextStep.classList.remove('step-incomplete');
    nextStep.classList.add('step-active');
    nextStep.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function markStepComplete(stepNum) {
  const stepPanel = stepPanels[stepNum];
  stepPanel.classList.remove('step-active', 'step-incomplete');
  stepPanel.classList.add('step-complete');
  
  // Update status badge
  const statusBadge = document.getElementById(`status${stepNum}`);
  if (statusBadge) {
    statusBadge.textContent = '✅ Hoàn thành';
    statusBadge.classList.add('complete');
  }
}

function updateProgressTracker(activeStep) {
  const progressSteps = document.querySelectorAll('.progress-step');
  const progressLines = document.querySelectorAll('.progress-line');
  
  progressSteps.forEach((step, index) => {
    const stepNumber = index + 1;
    step.classList.remove('active', 'complete');
    
    if (stepNumber < activeStep) {
      step.classList.add('complete');
      // Update circle to show checkmark
      const circle = step.querySelector('.progress-circle');
      circle.textContent = '';
    } else if (stepNumber === activeStep) {
      step.classList.add('active');
      const circle = step.querySelector('.progress-circle');
      circle.textContent = stepNumber;
    } else {
      const circle = step.querySelector('.progress-circle');
      circle.textContent = stepNumber;
    }
  });
  
  // Update progress lines
  progressLines.forEach((line, index) => {
    if (index < activeStep - 1) {
      line.classList.add('complete');
    } else {
      line.classList.remove('complete');
    }
  });
}

function updateHistory(result) {
  const historyItem = document.createElement('div');
  historyItem.className = 'history-item';
  
  const timestamp = new Date().toLocaleTimeString('vi-VN');
  historyItem.innerHTML = `
    <div class="history-timestamp">${timestamp}</div>
    <div class="history-step">Bước ${result.step}: ${result.name}</div>
    <div class="history-algo">${result.algorithm || 'N/A'}</div>
    ${result.imageUrl ? `<img src="${result.imageUrl}" class="history-thumb">` : ''}
  `;
  
  historyList.insertBefore(historyItem, historyList.firstChild);
}

function toggleHistory() {
  historyPanel.style.display = historyPanel.style.display === 'none' ? 'block' : 'none';
}

function resetPipeline() {
  if (!confirm('Bạn có chắc muốn bắt đầu lại? Tất cả kết quả sẽ bị xóa.')) {
    return;
  }
  
  // Reset pipeline
  if (pipeline) {
    pipeline.reset();
  }
  pipeline = null;
  uploadedImage = null;
  
  // Reset UI
  pipelineSteps.style.display = 'none';
  actionPanel.style.display = 'none';
  historyPanel.style.display = 'none';
  originalImg.src = '';
  
  // Hide progress tracker
  const progressTracker = document.getElementById('progressTracker');
  progressTracker.style.display = 'none';
  
  // Hide all steps
  Object.values(stepPanels).forEach(panel => {
    panel.style.display = 'none';
    panel.classList.remove('step-active', 'step-complete');
    panel.classList.add('step-incomplete');
  });
  
  // Clear results
  Object.values(resultImages).forEach(img => {
    img.src = '';
    img.style.display = 'none';
  });
  
  // Hide result containers
  for (let i = 1; i <= 5; i++) {
    const container = document.getElementById(`resultContainer${i}`);
    if (container) container.style.display = 'none';
  }
  
  // Reset status badges
  for (let i = 1; i <= 5; i++) {
    const statusBadge = document.getElementById(`status${i}`);
    if (statusBadge) {
      statusBadge.textContent = 'Chưa hoàn thành';
      statusBadge.classList.remove('complete');
    }
  }
  
  // Reset selects
  Object.values(algoSelects).forEach(select => {
    if (select) select.value = '';
  });
  
  // Clear stats and results
  document.getElementById('featureStats').innerHTML = '';
  document.getElementById('heuristicResults').innerHTML = '';
  
  // Clear history
  historyList.innerHTML = '';
  
  fileInput.value = '';
  
  showNotification('🔄 Đã reset! Vui lòng upload ảnh mới.', 'info');
}

function downloadResults() {
  const lastResult = pipeline?.getLastResult();
  if (!lastResult || !lastResult.imageUrl) {
    showNotification('⚠️ Chưa có kết quả để tải xuống!', 'warning');
    return;
  }
  
  const filename = `fracture-analysis-step${lastResult.step}-${Date.now()}.png`;
  ImageUtils.downloadImage(lastResult.imageUrl, filename);
  showNotification('💾 Đang tải xuống...', 'success');
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function showNotification(message, type = 'info') {
  // Tạo hoặc lấy notification element
  let notif = document.getElementById('notification');
  if (!notif) {
    notif = document.createElement('div');
    notif.id = 'notification';
    document.body.appendChild(notif);
  }
  
  notif.className = `notification notification-${type}`;
  notif.textContent = message;
  notif.style.display = 'block';
  
  setTimeout(() => {
    notif.style.display = 'none';
  }, 3000);
}
