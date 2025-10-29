# 🚀 QUICK START GUIDE

## Chạy dự án trong 3 bước:

### 1. Cài đặt dependencies

```bash
npm install
```

### 2. Khởi động server

```bash
npm start
```

### 3. Mở trình duyệt

```
http://localhost:3000
```

---

## 📱 Cách sử dụng nhanh:

### Bước 1: Upload ảnh

- Click nút **"Chọn ảnh"**
- Chọn file ảnh X-quang (.jpg, .png)
- Ảnh sẽ xuất hiện và pipeline được kích hoạt

### Bước 2-5: Xử lý

Mỗi bước:

1. Chọn thuật toán từ dropdown
2. Click nút **"Xử lý"** hoặc **"Phân tích"**
3. Xem kết quả
4. Tự động chuyển sang bước tiếp theo

### Bước cuối: Kết quả

- Click **"Tạo báo cáo đầy đủ"**
- Xem:
  - ✅/⚠️ Có gãy hay không
  - % Độ tin cậy
  - 📊 Mức độ nghiêm trọng
  - 🩺 Khuyến nghị

---

## 🎯 Quy trình đề xuất:

```
1. Preprocessing     → Chọn: CLAHE
2. Edge Detection    → Chọn: Otsu
3. Morphology        → Chọn: Closing (kernel=5)
4. Feature Analysis  → Chọn: Bounding Box
5. Heuristic         → Click: Tạo báo cáo đầy đủ
```

---

## 🎨 Các chức năng khác:

- 🔄 **Bắt đầu lại**: Reset về ban đầu
- 💾 **Tải xuống**: Download ảnh kết quả
- 📜 **Xem lịch sử**: Xem timeline các bước đã thực hiện

---

## 🔧 Thử nghiệm thuật toán:

Bạn có thể thử các thuật toán khác nhau:

### Preprocessing:

- CLAHE - Tốt cho ảnh tương phản thấp
- Histogram - Tốt cho ảnh tối
- Median - Tốt cho ảnh nhiễu
- Gaussian - Tốt cho ảnh nhiễu Gaussian
- Bilateral - Tốt khi cần giữ cạnh

### Edge Detection:

- Otsu - Tự động, đơn giản
- Canny - Chính xác, phát hiện biên tốt
- Sobel - Nhanh, đơn giản
- Watershed - Tốt cho phân vùng

### Morphology:

- Erosion - Loại nhiễu nhỏ
- Dilation - Nối các vùng gần
- Opening - Loại nhiễu + giữ shape
- Closing - Lấp lỗ + nối vùng

---

## ⚡ Tips:

1. **Ảnh tốt = Kết quả tốt**: Dùng ảnh X-quang rõ nét, tương phản cao
2. **Thử nghiệm**: Thử các thuật toán khác nhau để so sánh
3. **Lịch sử**: Xem lịch sử để biết thuật toán nào cho kết quả tốt nhất
4. **Download**: Lưu lại kết quả mỗi bước để so sánh

---

## ❓ FAQ:

**Q: Port 3000 đã được sử dụng?**  
A: Dừng process Node.js cũ:

```powershell
Stop-Process -Name "node" -Force
```

**Q: Ảnh không hiển thị?**  
A: Kiểm tra folder `uploads/` đã tồn tại chưa

**Q: Lỗi module?**  
A: Chạy lại `npm install`

---

**Version:** 2.0.0  
**Ready to use!** ✅
