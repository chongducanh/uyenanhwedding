# Nhật Uyên & Đức Anh — Lễ vu quy

Website thiệp mời Lễ vu quy nhà gái, **thứ Bảy 24/10/2026**, với hiệu ứng cuộn bằng GSAP, album ảnh
WebP, bộ đếm ngược, lịch và bản đồ địa điểm.

- Làm lễ: **08:30**.
- Tiệc vu quy: **10:30**.
- Địa điểm: **Số 38, đường Trần Thủ Độ, Võ Xu, Đức Linh, Lâm Đồng**.
- [Google Maps](https://maps.app.goo.gl/XmaSB14kCQrHXiHcA).

## Chạy tại máy

Trang web tĩnh, không cần cài Node.js hay chạy bước build. Với Python 3:

```bash
python -m http.server 4173 --directory dist
```

Mở <http://localhost:4173>. Để triển khai trên dịch vụ static hosting, dùng
`dist` làm thư mục xuất bản và để trống lệnh build.

## Cấu trúc

- `dist/index.html`: nội dung, ảnh và các section.
- `dist/*.css`: giao diện desktop/mobile và các lớp ảnh nền.
- `dist/motion.js`: các timeline GSAP và hiệu ứng cuộn.
- `dist/*.js`: album, xem ảnh, đồng hồ và tương tác.
- `dist/images/`: ảnh WebP đã tối ưu và manifest kích thước.
- `dist/vendor/`: thư viện GSAP kèm giấy phép.
- `scripts/`: tạo lại ảnh WebP từ các bản gốc và bản chỉnh da.
- `ASSET_SOURCES.md`: nguồn ảnh và cách xuất ảnh.

Ảnh gốc và các bản chỉnh da không nằm trong repository. Website đã có đầy đủ
ảnh WebP để chạy; chỉ cần các bản gốc khi muốn xuất lại ảnh bằng script.
Các script xử lý ảnh cần Python 3 và Pillow (`python -m pip install Pillow`).

Ngày cưới và bộ đếm sử dụng múi giờ Việt Nam (`Asia/Ho_Chi_Minh`). Khi thiết bị
yêu cầu giảm chuyển động, website hiển thị bố cục tĩnh. Bản đồ Google Maps cần
kết nối Internet.

## Wedding Memories

Xem [WEDDING_MEMORIES.md](WEDDING_MEMORIES.md) cho cấu trúc camera, album lật trang,
callback lời chúc và bộ đồ họa WebP dành riêng cho từng lễ.
