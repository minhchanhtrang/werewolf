# Đưa Ma Sói lên mạng miễn phí

Hướng dẫn kiểm tra ngày 05/11/2026. Dùng **Render Free** chạy Node.js và **Neon Free** lưu tài khoản PostgreSQL. Đây là bản chơi thử với bạn bè, chưa phải dịch vụ thương mại đã được kiểm định tải/bảo mật.

## 1. Đưa dự án lên GitHub

Tạo tài khoản GitHub và một repository trống tên `werewolf` (có thể chọn Private). Không thêm README tự động.

Mở terminal tại thư mục dự án rồi chạy từng dòng:

```powershell
git init
git add .
git status --short
```

Danh sách phải có mã nguồn và thư mục `assets`, **không có `.env` hoặc `node_modules`**. File [.gitignore](./.gitignore) đã loại chúng. Nếu thấy `.env`, dừng trước khi commit.

```powershell
git commit -m "Prepare Werewolf beta"
git branch -M main
git remote add origin https://github.com/TEN_GITHUB_CUA_BAN/werewolf.git
git push -u origin main
```

Thay `TEN_GITHUB_CUA_BAN` bằng tên tài khoản thật. Git có thể yêu cầu đăng nhập GitHub hoặc cấu hình tên/email tác giả ở lần đầu. Không gửi mật khẩu PostgreSQL lên GitHub.

## 2. Tạo PostgreSQL trên Neon

1. Đăng nhập [Neon](https://console.neon.tech/) và tạo project `werewolf` ở gói Free.
2. Trong project, mở **Connect**. Chọn database và role được tạo sẵn; copy **connection string** PostgreSQL, có phần SSL như `sslmode=require`.
3. Giữ chuỗi này riêng để nhập vào Render. Không dán vào mã nguồn, GitHub hoặc tin nhắn công khai.

Ví dụ hình dạng, không dùng nguyên chuỗi này:

```text
postgresql://USER:PASSWORD@HOST/neondb?sslmode=require
```

Ứng dụng tự tạo bảng khi khởi động. CSDL cloud mới sẽ chưa có tài khoản trên máy bạn; mọi người đăng ký lại trên web. Xem [cách kết nối Neon](https://neon.com/docs/connect/connect-from-any-app).

## 3. Tạo Web Service trên Render

Vào [Render Dashboard](https://dashboard.render.com/) → **New → Web Service** → kết nối GitHub và chọn repository `werewolf`.

Điền:

| Mục | Giá trị |
|---|---|
| Language / Runtime | Node |
| Branch | main |
| Build Command | `npm ci --omit=dev` |
| Start Command | `npm start` |
| Instance Type | **Free** |
| Health Check Path | `/healthz` |

Chỉ tạo **một Web Service, một instance**. Kết quả trận nằm tạm trong RAM nên cấu hình hiện tại không dành cho nhiều instance chạy song song. Chọn vùng gần người chơi và gần CSDL nếu có thể.

Trong **Environment**, thêm:

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `HOST` | `0.0.0.0` |
| `DATABASE_URL` | Chuỗi kết nối vừa copy từ Neon |

Không đặt `PORT=3000`; dùng cổng Render cấp tự động. Node.js được giới hạn phiên bản tương thích trong [package.json](./package.json). Không nhập các biến PGHOST/PGUSER/PGPASSWORD của máy cá nhân.

Code tự dùng `RENDER_EXTERNAL_URL` để kiểm tra nguồn yêu cầu HTTPS. Nếu dùng tên miền riêng, thêm `APP_ORIGIN=https://ten-mien-cua-ban` (chỉ origin, không thêm đường dẫn).

Bấm **Deploy Web Service**. Khi thành công, Render cung cấp link dạng `https://ten-game.onrender.com`. Xem [hướng dẫn Node của Render](https://render.com/docs/deploy-node-express-app), [quy định cổng](https://render.com/docs/web-services#port-binding) và [biến URL tự động](https://render.com/docs/environment-variables#render_external_url).

## 4. Kiểm tra bằng hai thiết bị

1. Mở link HTTPS; đăng ký và đăng nhập.
2. Tạo phòng rồi gửi link web và mã phòng cho bạn bè.
3. Thiết bị thứ hai đăng ký tài khoản khác và nhập mã.
4. Có ít nhất 5 người sẵn sàng là chơi được. Có thể thêm từng bot để thử khi thiếu người.
5. Kiểm tra bắt đầu Đêm 1, các kỹ năng, bỏ phiếu, kết quả và trở về phòng chờ.

Bạn bè chỉ cần trình duyệt. Không cần cài Node.js, PostgreSQL hay giữ máy bạn bật.

## 5. Giới hạn cần biết

- Render Free ngủ sau 15 phút không có truy cập; mở lại có thể chờ khoảng một phút. Có hạn mức sử dụng và dịch vụ có thể khởi động lại. Đừng dùng công cụ ping giữ thức. Đọc [giới hạn Render Free](https://render.com/docs/free).
- Neon Free có hạn mức compute và lưu trữ. Kiểm tra [bảng giá Neon](https://neon.com/pricing) và mục Usage; chọn Free, không tự nâng cấp sang gói trả phí.
- Không dùng Render Postgres Free cho tài khoản cần giữ lâu: database gói đó hết hạn sau 30 ngày. Hướng dẫn này dùng Neon.
- Ván đang chơi được ghi tạm để đồng bộ/phục hồi. Khi hết trận, trạng thái ván và nhật ký được dọn khỏi CSDL; màn kết quả chỉ còn trong RAM 60 giây. Nếu dịch vụ restart trong khoảng này, màn kết quả có thể mất.
- Mật khẩu hiện vẫn **1–4 ký tự theo yêu cầu trước đó**. Chỉ nên dùng tài khoản thử, không dùng mật khẩu quan trọng hoặc mở đăng ký công khai rộng rãi trước khi nâng yêu cầu mật khẩu.
- Chưa có kết bạn/tìm bạn. Không có chat trong game; người chơi tự dùng kênh nói chuyện bên ngoài.

## Khi deploy lỗi

| Hiện tượng | Kiểm tra |
|---|---|
| Database connection failed | `DATABASE_URL` đúng chuỗi Neon và còn tham số SSL |
| Không mở được cổng | `HOST=0.0.0.0`, không ghi đè `PORT` của Render |
| Đăng nhập báo nguồn không hợp lệ | Dùng đúng link HTTPS; `APP_ORIGIN` nếu có phải trùng domain đang mở |
| Có web nhưng API lỗi | Phải là **Web Service**, không phải Static Site |
| Người chơi cũ trên máy không đăng nhập được | Cloud dùng CSDL mới; đăng ký lại trên link cloud |
| Sửa code không thấy thay đổi | Push lên GitHub, chờ Render deploy xong rồi Ctrl + F5 |

Kiểm tra log Render khi lỗi; không chia sẻ chuỗi `DATABASE_URL` hay mật khẩu trong ảnh chụp log.
