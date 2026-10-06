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

## Hành trình

Xem [JOURNEY.md](JOURNEY.md) để sửa ngày, gán 4 ảnh kỷ niệm và điều chỉnh
film helix. Section dùng cấu hình nhà trai/nhà gái sẵn có.

Bố cục bàn ký ức: `dist/memories-layout.js`; ảnh nền duy nhất: `table-complete.webp`.

## Nhạc cưới và tốc độ cuộn

`dist/wedding-music.js` chọn ngẫu nhiên một trong ba file người dùng cung cấp
trong `dist/audio/`: **Beautiful in White**, **Marry You**, **Ngày Đầu Tiên**.
Mỗi lần mở/tải lại trang hoặc quay lại từ back/forward cache sẽ chọn lại;
chuyển tab vẫn giữ bài đang nghe. Chọn ngẫu nhiên có thể trùng bài lần trước.
Nhạc lặp lại, âm lượng 32%, không có nút hay trình phát hiển thị. Website thử
phát ngay; nếu trình duyệt chặn âm thanh tự động, lần chạm/bấm hoặc nhấn phím
đầu tiên sẽ thử phát lại. Nhạc tạm dừng khi ẩn tab và tiếp tục khi quay lại.
Đổi danh sách file/âm lượng trong cấu hình `MUSIC`.

`dist/page-start.js` tắt khôi phục vị trí cuộn và bỏ hash ban đầu. `dist/motion.js`
đồng bộ GSAP về đầu trang khi mở/tải lại; khi quay lại từ bộ nhớ back/forward,
các scene được khởi tạo lại để giải phóng viewer/form cũ. Điều hướng nội trang
và khôi phục vị trí khi resize vẫn hoạt động bình thường.

`WHEEL_MULTIPLIER` trong `dist/motion.js` là `1.2`: mỗi lần lăn chuột di chuyển
thêm 20%, còn GSAP vẫn làm mượt. Không thay đổi khoảng pin, tốc độ cảm ứng,
trường nhập lời chúc hay thao tác trong trình xem ảnh.
