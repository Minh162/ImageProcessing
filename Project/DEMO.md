# 🎬 DEMO & TESTING INSTRUCTIONS

## 📍 Server đã chạy tại: http://localhost:3000

---

## 🧪 Test Case 1: Workflow cơ bản

### Mục tiêu: Test toàn bộ pipeline từ đầu đến cuối

**Các bước:**

1. **Upload ảnh**

   - Click "Chọn ảnh"
   - Chọn một ảnh X-quang bất kỳ
   - ✅ Kiểm tra: Ảnh hiển thị, Bước 1 xuất hiện

2. **Bước 1: Preprocessing**

   - Chọn "CLAHE"
   - Click "Xử lý"
   - ✅ Kiểm tra: Ảnh kết quả hiển thị, Bước 2 xuất hiện
   - 🎯 Kỳ vọng: Ảnh có tương phản tốt hơn

3. **Bước 2: Edge Detection**

   - Chọn "Otsu Thresholding"
   - Click "Xử lý"
   - ✅ Kiểm tra: Ảnh nhị phân đen trắng, Bước 3 xuất hiện
   - 🎯 Kỳ vọng: Xương trắng, nền đen

4. **Bước 3: Morphology**

   - Chọn "Closing"
   - Kernel size: 5
   - Iterations: 2
   - Click "Xử lý"
   - ✅ Kiểm tra: Ảnh được làm sạch, Bước 4 xuất hiện
   - 🎯 Kỳ vọng: Các lỗ nhỏ được lấp, vùng được nối

5. **Bước 4: Feature Analysis**

   - Chọn "Bounding Box Analysis"
   - Click "Phân tích"
   - ✅ Kiểm tra: Ảnh có các hộp xanh, bảng thống kê xuất hiện, Bước 5 xuất hiện
   - 🎯 Kỳ vọng: Mỗi component có hộp bao + label

6. **Bước 5: Heuristic**
   - Click "Tạo báo cáo đầy đủ"
   - ✅ Kiểm tra: Hiển thị:
     - Status box (xanh/đỏ)
     - Độ tin cậy %
     - Mức độ nghiêm trọng
     - Bảng metrics
     - Khuyến nghị
   - 🎯 Kỳ vọng: Báo cáo đầy đủ, dễ đọc

---

## 🧪 Test Case 2: Thử nghiệm các thuật toán

### Mục tiêu: So sánh các thuật toán khác nhau

**Preprocessing:**

1. Upload ảnh → Chọn "CLAHE" → Xem kết quả
2. Reset → Upload cùng ảnh → Chọn "Histogram" → So sánh
3. Reset → Upload cùng ảnh → Chọn "Median Blur" → So sánh

**Edge Detection:**

1. Preprocessing với CLAHE
2. Thử "Otsu" → Xem kết quả
3. Reset về sau preprocessing → Thử "Canny" → So sánh
4. Reset về sau preprocessing → Thử "Sobel" → So sánh

**Kỳ vọng:**

- Mỗi thuật toán cho kết quả khác nhau
- Có thể thấy rõ điểm mạnh/yếu của từng thuật toán

---

## 🧪 Test Case 3: Kiểm tra các chức năng phụ

### 3.1. Download kết quả

1. Hoàn thành pipeline đến bước nào đó
2. Click "💾 Tải xuống"
3. ✅ Kiểm tra: File PNG được download về máy

### 3.2. Xem lịch sử

1. Thực hiện vài bước xử lý
2. Click "📜 Xem lịch sử"
3. ✅ Kiểm tra: Panel hiện ra với timeline
4. 🎯 Kỳ vọng: Thấy tất cả các bước đã làm + thumbnail

### 3.3. Reset

1. Hoàn thành vài bước
2. Click "🔄 Bắt đầu lại"
3. Confirm
4. ✅ Kiểm tra:
   - Tất cả bước bị ẩn
   - Kết quả bị xóa
   - Có thể upload ảnh mới

---

## 🧪 Test Case 4: Edge Cases

### 4.1. Upload ảnh không phải X-quang

- Upload ảnh thường (portrait, landscape, etc.)
- 🎯 Kỳ vọng: Vẫn chạy được nhưng kết quả không chính xác
- ✅ Không crash

### 4.2. Không chọn thuật toán

- Bỏ qua dropdown, click "Xử lý" trực tiếp
- 🎯 Kỳ vọng: Hiển thị warning "Vui lòng chọn thuật toán"

### 4.3. Chạy Heuristic mà chưa có Feature Analysis

- 🎯 Kỳ vọng: Tự động chạy các bước thiếu hoặc hiện lỗi rõ ràng

### 4.4. Upload ảnh rất lớn (> 5MB)

- 🎯 Kỳ vọng: Có thể chậm nhưng vẫn chạy được

---

## 🧪 Test Case 5: UI/UX

### 5.1. Responsive

- Resize browser window
- ✅ Kiểm tra: Layout vẫn đẹp, không bị vỡ

### 5.2. Notifications

- Mỗi hành động phải có notification
- ✅ Kiểm tra:
  - Upload → Success (xanh)
  - Xử lý → Info (xanh dương) → Success (xanh)
  - Không chọn algo → Warning (vàng)
  - Lỗi → Error (đỏ)

### 5.3. Smooth scrolling

- Sau mỗi bước xử lý, tự động scroll đến bước tiếp theo
- ✅ Kiểm tra: Smooth, không giật

---

## 📊 Kết quả mong đợi

### Với ảnh KHÔNG có gãy xương:

```
✅ KHÔNG PHÁT HIỆN GÃY XƯƠNG
Confidence: 85-95%
Components: 1-2
Severity: None
Khuyến nghị: "Không phát hiện dấu hiệu..."
```

### Với ảnh CÓ gãy xương đơn giản:

```
⚠️ CÓ DẤU HIỆU GÃY XƯƠNG
Confidence: 70-85%
Components: 2-3
Severity: Simple
Khuyến nghị: "Phát hiện gãy xương đơn giản..."
```

### Với ảnh CÓ gãy xương phức tạp:

```
🔴 CÓ DẤU HIỆU GÃY XƯƠNG
Confidence: 75-90%
Components: 4+
Severity: Complex
Khuyến nghị: "CẦN ĐẾN BÁC SĨ NGAY LẬP TỨC!"
```

---

## 🐛 Báo cáo lỗi

Nếu gặp lỗi, kiểm tra:

1. **Console log** (F12 → Console)

   - Có thông báo lỗi gì không?
   - Copy error message

2. **Network tab** (F12 → Network)

   - Upload có thành công không?
   - Status code là gì?

3. **File path**
   - File có tồn tại không?
   - Path có đúng không?

---

## ✅ Checklist hoàn chỉnh

- [ ] Server chạy thành công
- [ ] Upload ảnh thành công
- [ ] Bước 1: Preprocessing - tất cả 5 thuật toán
- [ ] Bước 2: Edge Detection - tất cả 4 thuật toán
- [ ] Bước 3: Morphology - tất cả 4 thuật toán
- [ ] Bước 4: Feature Analysis - tất cả 4 phương thức
- [ ] Bước 5: Heuristic - 3 phân tích
- [ ] Download kết quả hoạt động
- [ ] Lịch sử hoạt động
- [ ] Reset hoạt động
- [ ] Notifications hiển thị đúng
- [ ] UI responsive
- [ ] Không có lỗi trong console

---

## 🎯 Performance Benchmarks

### Thời gian xử lý (ảnh 1000x1000px):

| Bước | Thuật toán | Thời gian |
| ---- | ---------- | --------- |
| 1    | CLAHE      | ~500ms    |
| 1    | Histogram  | ~100ms    |
| 1    | Median     | ~2000ms   |
| 2    | Otsu       | ~50ms     |
| 2    | Canny      | ~800ms    |
| 3    | Morphology | ~500ms    |
| 4    | Feature    | ~300ms    |
| 5    | Heuristic  | ~100ms    |

**Tổng pipeline:** ~3-5 giây (phụ thuộc thuật toán)

---

**Happy Testing!** 🎉
