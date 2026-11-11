<div align="center">
  <img src="assets/backgrounds/game-logo.png" alt="Logo Ma Sói" width="240">

  <h1>Ma Sói · Đêm bên lửa trại</h1>

  <p>Game Ma Sói online trên trình duyệt với khung cảnh làng pixel art, vai trò bí mật và những cuộc bỏ phiếu quanh lửa trại.</p>

  <p><strong>JavaScript · Node.js · PostgreSQL · 5–20 người chơi</strong></p>
</div>

## Giới thiệu

**Ma Sói · Đêm bên lửa trại** là dự án game web nhiều người chơi, lấy cảm hứng từ trò chơi Ma Sói. Người chơi tạo phòng, mời bạn bè bằng mã phòng và cùng trải qua các lượt ban đêm, thảo luận và bỏ phiếu ban ngày.

Backend điều khiển tiến trình ván đấu, chia vai và xác minh hành động. Giao diện kết hợp nhân vật pixel art 2.5D với tông màu tối, hiệu ứng kính mờ và bố cục thích ứng cho máy tính lẫn điện thoại.

Link : https://werewolf-2r41.onrender.com/

## Tính năng

- **Tài khoản:** đăng ký bằng username và mật khẩu, đăng nhập, đăng xuất và giữ phiên.
- **Phòng chơi:** tạo phòng có mã, tham gia bằng mã, sẵn sàng và chuyển quyền chủ phòng khi chủ phòng rời đi.
- **Tùy chỉnh ván đấu:** hỗ trợ 5–20 người, chọn số lượng vai và thêm bot để thử game.
- **Quản lý phòng:** chủ phòng có thể kick người chơi trong phòng chờ.
- **Tiến trình tự động:** đếm giờ, chuyển lượt, giải quyết kỹ năng và xác định phe thắng tại server.
- **Tương tác trực tiếp:** chọn nhân vật làm mục tiêu, xem vai cá nhân, theo dõi nhật ký và kết quả.
- **Chat:** chat dân làng khi thảo luận ban ngày và kênh riêng cho Sói còn sống.
- **Chơi lại:** biểu quyết hủy ván đang chơi; giữ mã phòng, bộ vai và bot khi quay về phòng chờ.
- **Hình ảnh:** 10 mẫu nhân vật, bối cảnh ngày/đêm và hình ảnh, video giới thiệu vai.

## Vai trò và luật chơi

| Vai trò | Phe | Khả năng / mục tiêu |
| --- | --- | --- |
| Dân làng | Dân | Thảo luận, suy luận và bỏ phiếu tìm Sói. |
| Ma sói | Sói | Bỏ phiếu chọn một nạn nhân mỗi đêm. |
| Tiên tri | Dân | Soi một người trong lượt của mình để xác định có phải Sói hay không. |
| Bảo vệ | Dân | Bảo vệ một người khỏi đòn tấn công của Sói trong đêm. |
| Phù thủy | Dân | Có một bình cứu và một bình độc cho cả ván; có thể dùng cả hai trong cùng đêm. |
| Thợ săn | Dân | Khi bị Sói giết hoặc treo cổ, được chọn bắn một người trước khi xét thắng. |
| Thằng ngu | Phe thứ ba | Thắng riêng ngay khi bị loại bằng bỏ phiếu. |

### Diễn biến một ván

1. Đăng nhập, tạo hoặc tham gia phòng bằng mã.
2. Chủ phòng chọn bộ vai; tất cả người chơi thật bấm **Sẵn sàng**. Bot tự động sẵn sàng.
3. Bắt đầu ván với **10 giây chuẩn bị**; lá bài vai tự mở trong 5 giây đầu.
4. Ban đêm lần lượt diễn ra các lượt **Bảo vệ (20 giây) → Sói (30 giây) → Tiên tri (20 giây) → Phù thủy (30 giây)**, sau đó công bố bình minh.
5. Ban ngày có **2 phút thảo luận và bỏ phiếu**. Khi tất cả người có quyền đã bỏ phiếu, thời gian còn lại được rút xuống tối đa 5 giây.
6. Lặp lại ngày và đêm cho đến khi có phe chiến thắng.

### Những quy tắc đáng chú ý

- Bộ vai phải có tổng số vai bằng số người, ít nhất một Sói và số Sói nhỏ hơn một nửa tổng số người. Mỗi vai đặc biệt tối đa một người.
- Vai không có trong bộ vai sẽ được bỏ qua lượt; vai có trong ván nhưng đã chết vẫn giữ thời gian lượt để tránh lộ thông tin.
- Phiếu ban ngày được giữ kín đến khi công bố. Hòa phiếu hoặc phiếu trắng dẫn đầu thì không loại ai. Vai của người khác chỉ công khai khi kết thúc ván.
- Sói chỉ chọn một nạn nhân mỗi đêm. Nếu các mục tiêu cùng có số phiếu cao nhất, server chọn ngẫu nhiên giữa chúng. Sói được chọn bản thân, nhưng không chọn Sói đồng đội.
- Bình độc xuyên bảo vệ và không bị bình cứu hóa giải. Thợ săn chết do độc hoặc rời ván sẽ không được bắn.
- **Dân thắng** khi không còn Sói. **Sói thắng** khi số Sói còn sống bằng hoặc vượt số người không thuộc Sói còn sống. Thằng ngu được tính trong nhóm không thuộc Sói khi xét điều kiện này.
- Biểu quyết chơi lại kéo dài 30 giây và cần quá nửa người chơi thật trong phòng đồng ý; người chết vẫn được biểu quyết, bot không được tính.

## Công nghệ

| Thành phần | Công nghệ |
| --- | --- |
| Giao diện | HTML, CSS, JavaScript thuần |
| Backend | Node.js, HTTP server tích hợp, ES Modules |
| Cơ sở dữ liệu | PostgreSQL, thư viện `pg` |
| Đồng bộ | HTTP polling, kiểm tra phiên bản dữ liệu để giảm nội dung truyền lại |
| Kiểm thử | Test runner tích hợp của Node.js (`node:test`) |
| Tài nguyên | PNG pixel art, video MP4 và font cục bộ |

## Cài đặt và chạy trên máy

### Yêu cầu

- **Node.js 24–26** và npm.
- **PostgreSQL** đang chạy để sử dụng tài khoản và phòng online.
- Trình duyệt hiện đại.

### 1. Cài thư viện

Mở terminal tại thư mục dự án:

```sh
npm ci
```

### 2. Chuẩn bị cơ sở dữ liệu

Tạo database có tên `werewolf` trong PostgreSQL, sau đó sao chép [.env.example](./.env.example) thành `.env`.

Trên PowerShell:

```powershell
Copy-Item .env.example .env
```

Điền thông tin kết nối của bạn:

```dotenv
PGHOST=127.0.0.1
PGPORT=5432
PGDATABASE=werewolf
PGUSER=postgres
PGPASSWORD=YOUR_POSTGRES_PASSWORD
PORT=3000
```

Server tự khởi tạo các bảng cần thiết khi kết nối thành công. Không đưa `.env` chứa mật khẩu lên GitHub; file này đã được loại trừ trong [.gitignore](./.gitignore).

### 3. Khởi động

```sh
npm start
```

Truy cập **http://127.0.0.1:3000**, đăng ký tài khoản rồi đăng nhập để tạo phòng.

> Trên Windows, nếu PowerShell chặn lệnh `npm`, dùng `npm.cmd ci`, `npm.cmd start` và `npm.cmd test`. Game cần chạy qua server Node.js để có API tài khoản và phòng chơi. Sau khi sửa backend, hãy khởi động lại server.

Để thử nhiều người trên cùng máy, dùng các hồ sơ trình duyệt khác nhau hoặc cửa sổ thường kết hợp cửa sổ ẩn danh. Có thể thêm bot trong phòng chờ để đạt số người tối thiểu.

## Cấu trúc dự án

```text
WereWolf/
├── assets/             # Hình nền, nhân vật, hiệu ứng, ảnh/video vai và font
├── backend/            # Tài khoản, PostgreSQL, phòng, luật ván và kiểm thử
├── css/
│   └── style.css       # Giao diện, hiệu ứng và bố cục responsive
├── js/                 # Tài khoản, sảnh, cảnh game, chat và hiển thị vai
├── scripts/            # Công cụ tối ưu tài nguyên
├── index.html          # Giao diện chính
├── server.mjs          # HTTP server, API và phục vụ tài nguyên tĩnh
├── .env.example        # Mẫu cấu hình môi trường
└── package.json        # Thư viện và lệnh chạy
```

Xem [CODE_MAP.md](./CODE_MAP.md) để tìm hiểu chức năng từng module.

## Kiểm thử

Chạy bộ kiểm thử:

```sh
npm test
```

Để chạy cả các ca tích hợp PostgreSQL với cấu hình trong `.env`:

```sh
node --env-file=.env --test --test-concurrency=1
```

Các ca PostgreSQL tạo tài khoản/phòng tạm và dọn lại sau khi chạy. Các ca này được bỏ qua khi thiếu biến kết nối tương ứng.

## Dữ liệu và đồng bộ

- Tài khoản và phiên đăng nhập được lưu trong PostgreSQL.
- Trạng thái ván đang chơi được ghi tạm để đồng bộ và phục hồi. Khi kết thúc, dữ liệu ván được dọn khỏi cơ sở dữ liệu; kết quả chỉ giữ trong RAM 60 giây.
- Chat dân làng giữ tối đa 50 tin, chat Sói tối đa 30 tin trong RAM; không lưu lịch sử chat vào cơ sở dữ liệu.
- Chat dân làng chỉ cho người còn sống gửi trong giai đoạn thảo luận ban ngày. Chat Sói dành cho Sói còn sống khi còn ít nhất hai Sói sống.
- Tài nguyên tĩnh dùng ETag và kiểm tra lại phiên bản; JSON/code hỗ trợ gzip. Poll giảm tần suất khi ẩn tab hoặc ở sảnh.

## Triển khai

Hướng dẫn triển khai bằng **Render + Neon** nằm trong [DEPLOY_FREE.md](./DEPLOY_FREE.md).

Các biến môi trường chính khi triển khai:

| Biến | Mục đích |
| --- | --- |
| `DATABASE_URL` | Chuỗi kết nối PostgreSQL, dùng thay nhóm biến `PG*`. |
| `NODE_ENV` | Đặt thành `production`. |
| `HOST` | Thường đặt `0.0.0.0` trên hosting. |
| `PORT` | Cổng HTTP do môi trường hosting cung cấp. |
| `APP_ORIGIN` | Địa chỉ HTTPS công khai của game. |

Ở chế độ production, server yêu cầu kết nối PostgreSQL thành công và origin hợp lệ (`APP_ORIGIN` hoặc `RENDER_EXTERNAL_URL`).

## Giới hạn hiện tại

- Mật khẩu tài khoản hiện chỉ dài **1–4 ký tự**. Đây là giới hạn của bản thử nghiệm, chưa phù hợp để mở đăng ký công khai hoặc dùng cho tài khoản quan trọng.
- Chưa có quên mật khẩu, kết bạn hay lịch sử ván lâu dài.
- Chưa kiểm định tải lớn và chưa hỗ trợ chạy nhiều instance server song song.
- Repository hiện chưa kèm giấy phép sử dụng. Cần xác định quyền sử dụng mã nguồn, hình ảnh, video và font trước khi phân phối lại.
