# 🦴 Bone Fracture Detection - Pipeline Analysis System

Hệ thống phân tích phát hiện gãy xương trên ảnh X-quang với quy trình pipeline chi tiết.

## ✨ Tính năng

### Pipeline 5 bước xử lý:

1. **🔧 Tiền xử lý (Preprocessing)**

   - CLAHE (Contrast Limited Adaptive Histogram Equalization)
   - Histogram Equalization
   - Median Blur
   - Gaussian Blur
   - Bilateral Filter

2. **🔍 Phát hiện biên (Edge Detection)**

   - Otsu Thresholding
   - Canny Edge Detection
   - Sobel Edge Detection
   - Watershed Segmentation

3. **⚙️ Xử lý hình thái học (Morphology)**

   - Erosion (Co vùng)
   - Dilation (Mở rộng vùng)
   - Opening (Erosion → Dilation)
   - Closing (Dilation → Erosion)

4. **📊 Phân tích đặc trưng (Feature Analysis)**

   - Connected Components
   - Area Analysis
   - Centroid Analysis
   - Bounding Box Analysis

5. **🎯 Phân tích Heuristic**
   - Fracture Detection
   - Severity Classification
   - Full Report Generation

## 📁 Cấu trúc dự án

```
Project/
├── public/
│   ├── index-pipeline.html      # Giao diện pipeline mới
│   ├── index.html               # Giao diện cũ (legacy)
│   ├── styles-pipeline.css      # CSS cho pipeline
│   ├── js/
│   │   ├── app-pipeline.js      # Logic chính
│   │   ├── pipeline/
│   │   │   ├── pipelineController.js
│   │   │   ├── preprocessing.js
│   │   │   ├── edgeDetection.js
│   │   │   ├── morphology.js
│   │   │   ├── featureAnalysis.js
│   │   │   └── heuristic.js
│   │   └── utils/
│   │       └── imageUtils.js
├── server.js
├── package.json
└── README.md
```

## 🚀 Cài đặt và chạy

### Yêu cầu

- Node.js 14+
- npm hoặc yarn

### Các bước

1. Cài đặt dependencies:

```bash
npm install
```

2. Chạy server:

```bash
npm start
```

3. Mở trình duyệt tại: `http://localhost:3000`

## 📖 Hướng dẫn sử dụng

### Bước 1: Upload ảnh X-quang

- Click nút "Chọn ảnh" để upload ảnh X-quang
- Ảnh sẽ được hiển thị và pipeline sẽ được kích hoạt

### Bước 2-5: Xử lý từng bước

Mỗi bước bạn có thể:

- Chọn thuật toán từ dropdown
- Điều chỉnh tham số (nếu có)
- Click "Xử lý" để thực thi
- Xem kết quả ngay lập tức
- Chuyển sang bước tiếp theo

### Bước cuối: Xem kết quả

- Phát hiện gãy xương: Có/Không + Độ tin cậy
- Phân loại mức độ: Simple/Moderate/Complex
- Báo cáo đầy đủ: Metrics + Khuyến nghị

### Các chức năng khác:

- **🔄 Bắt đầu lại**: Reset toàn bộ pipeline
- **💾 Tải xuống**: Download kết quả hiện tại
- **📜 Xem lịch sử**: Xem toàn bộ các bước đã thực hiện

## 🎨 Ví dụ sử dụng

```javascript
// Khởi tạo pipeline
const pipeline = new PipelineController();
pipeline.initialize(imageElement);

// Bước 1: Preprocessing
const result1 = pipeline.process("preprocessing", "clahe", { tileSize: 64 });

// Bước 2: Edge Detection
const result2 = pipeline.process("edgeDetection", "otsu");

// Bước 3: Morphology
const result3 = pipeline.process("morphology", "closing", {
  kernelSize: 5,
  iterations: 2,
});

// Bước 4: Feature Analysis
const result4 = pipeline.process("featureAnalysis", "components");

// Bước 5: Heuristic
const result5 = pipeline.process("heuristic", "fracture");
const report = pipeline.process("heuristic", "report");
```

## 🔧 Tùy chỉnh

### Thêm thuật toán mới

1. Thêm vào module tương ứng (vd: `preprocessing.js`):

```javascript
export function myNewAlgorithm(gray, width, height, params) {
  // Implementation
  return processed;
}
```

2. Cập nhật `pipelineController.js`:

```javascript
case 'myNewAlgo':
  processed = Preprocessing.myNewAlgorithm(gray, width, height, params);
  break;
```

3. Thêm vào HTML:

```html
<option value="myNewAlgo">My New Algorithm</option>
```

## 📊 Kết quả mẫu

### Không có gãy xương

- Confidence: 95%
- Components: 1-2
- Status: ✅ KHÔNG PHÁT HIỆN GÃY XƯƠNG

### Có gãy xương đơn giản

- Confidence: 75%
- Components: 2-3
- Status: ⚠️ CÓ DẤU HIỆU GÃY XƯƠNG (Simple)

### Có gãy xương phức tạp

- Confidence: 85%
- Components: 4+
- Status: 🔴 CÓ DẤU HIỆU GÃY XƯƠNG (Complex)

## ⚠️ Lưu ý

- Đây là công cụ hỗ trợ, KHÔNG thay thế chẩn đoán y tế
- Luôn tham khảo ý kiến bác sĩ chuyên khoa
- Kết quả phụ thuộc vào chất lượng ảnh X-quang
- Thuật toán được tối ưu cho X-quang xương tay/chân

## 🛠️ Technologies

- **Frontend**: Vanilla JavaScript (ES6 Modules)
- **Backend**: Node.js + Express
- **Image Processing**: Pure JavaScript (no external CV libraries)
- **UI**: HTML5 + CSS3

## 📝 License

MIT License - Dự án học tập

## 👨‍💻 Tác giả

Student Project - Image Processing & Computer Vision

---

**Phiên bản**: 2.0.0 (Pipeline)  
**Cập nhật**: 2025

Ứng dụng nhỏ cho phép upload ảnh, chọn option xử lý, và xem kết quả. Thiết kế để bạn thay thế các thuật toán xử lý ảnh bên phía server.

Yêu cầu

- Node.js (14+)

Chạy (Windows PowerShell):

```powershell
cd "c:\Users\Admin\Desktop\Image Process\Project"
npm install
npm start

# Sau đó mở trình duyệt: http://localhost:3000
```

Thay thuật toán

- Server: `server.js` — hàm xử lý ảnh nằm trong endpoint POST /process. Hiện có các option mẫu: `grayscale`, `invert`, `blur`, `edge`.

Uploads

- Các file được lưu tạm trong thư mục `uploads/` (tự động tạo khi chạy).
