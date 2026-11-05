# Ma Sói · Đêm bên lửa trại

Game web pixel art 2.5D dùng JavaScript, Node.js và PostgreSQL.

## Chạy trên máy

Cần Node.js 24–26 và PostgreSQL. Cấu hình theo [ACCOUNT_SETUP.md](./ACCOUNT_SETUP.md), dùng [.env.example](./.env.example) làm mẫu. Không đưa file .env lên GitHub.

```powershell
npm.cmd ci
npm.cmd start
```

Mở http://127.0.0.1:3000 (hoặc PORT trong cấu hình). Sau khi sửa backend, dừng server bằng Ctrl + C rồi chạy lại; Ctrl + F5 chỉ tải lại giao diện.

## Luồng hiện tại

- Đăng nhập → sảnh → tạo phòng có mã hoặc nhập mã → phòng chờ → game.
- Mỗi phòng 5–20 người, bắt đầu khi có ít nhất 5 người và tất cả người thật sẵn sàng.
- Mỗi lần bấm thêm bot chỉ thêm một bot; bot sẵn sàng tự động.
- Vai chia theo số người lúc bắt đầu: Sói, Tiên tri, Phù thủy, Bảo vệ từ 7 người, còn lại là Dân.
- Ván bắt đầu Đêm 1. Lượt Sói/Tiên tri/Bảo vệ 30 giây, Phù thủy 20 giây, sau đó bình minh và bỏ phiếu 30 giây.
- Phù thủy có một bình cứu và một bình độc cho cả ván, tối đa một bình mỗi đêm; tự cứu được, độc xuyên bảo vệ.
- Phiếu giữ kín đến khi công bố; hòa không loại. Vai của người khác chỉ công khai khi kết thúc.
- Ngoại hình ngẫu nhiên và đồng bộ suốt ván; có 10 mẫu nhân vật.
- Nhật ký đọc tại nút Nhật ký. Chat nhỏ góc dưới trái chỉ dành cho Sói còn sống khi còn ít nhất 2 Sói sống; tối đa 30 tin trong RAM, xóa khi hết ván. Chưa có tính năng kết bạn.
- Dân thắng khi hết Sói. Sói thắng khi số Sói sống bằng hoặc vượt số người phe Dân sống.

## Dữ liệu

Tài khoản và phiên đăng nhập được giữ trong PostgreSQL. Dữ liệu ván đang chơi được ghi tạm để đồng bộ và phục hồi. Khi kết thúc, dữ liệu ván được dọn khỏi CSDL; kết quả chỉ giữ trong RAM 60 giây. Không có chức năng lưu ván hay lưu lịch sử lâu dài. Bảng save/chat cũ được bỏ khi khởi động.

Bộ prototype một máy cũ được giữ trong mã nguồn để tham khảo và kiểm tra luật, đang ẩn trên giao diện; ván online do backend điều khiển.

Ảnh/HTML/CSS/JS dùng ETag và cache kiểm tra lại phiên bản. API phòng chỉ gửi lại dữ liệu khi nội dung thay đổi, không tính thay đổi đồng hồ vào phiên bản; JSON/code hỗ trợ gzip. Poll giảm tần suất khi ẩn tab hoặc ở sảnh. Chat Sói không ghi vào CSDL.

Nén PNG lossless (không đổi pixel hoặc metadata): `node scripts/optimize-png.mjs`.

## Kiểm tra

```powershell
npm.cmd test
```

Để chạy cả kiểm tra PostgreSQL trên cấu hình máy hiện tại:

```powershell
node --env-file=.env --test --test-concurrency=1
```

Các ca PostgreSQL tạo tài khoản/phòng tạm và dọn lại sau khi chạy.

## Đưa lên mạng

Xem [DEPLOY_FREE.md](./DEPLOY_FREE.md): Render Free + Neon Free, cấu hình HTTPS, biến môi trường và từng bước đưa mã lên GitHub.

Đây là bản thử nghiệm cho bạn bè. Mật khẩu 1–4 ký tự đang giữ theo yêu cầu trước đó; chưa phù hợp tài khoản quan trọng hoặc đăng ký công khai rộng rãi. Chưa kiểm định tải lớn, chưa có hệ thống bạn bè, chưa hỗ trợ nhiều instance song song.
