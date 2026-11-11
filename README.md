<div align="center">
  <img src="assets/backgrounds/game-logo.png" alt="Logo Ma Sói" width="240">

  <h1>Ma Sói · Đêm định mệnh</h1>

  <p>Game Ma Sói online trên trình duyệt với ngôi làng pixel art, vai trò bí mật và những cuộc bỏ phiếu quanh lửa trại.</p>

  <p><strong>JavaScript · Node.js · PostgreSQL · 5–20 người chơi</strong></p>
</div>

## Giới thiệu

**Ma Sói · Đêm định mệnh** là game web nhiều người chơi, lấy cảm hứng từ trò chơi Ma Sói. Người chơi tạo phòng, mời bạn bè bằng mã phòng, nhận vai bí mật rồi cùng trải qua các lượt ban đêm, thảo luận và bỏ phiếu ban ngày.

Backend điều khiển tiến trình ván đấu, chia vai, xác minh hành động và xác định kết quả. Giao diện có nhân vật pixel art, bối cảnh ngày/đêm và bố cục thích ứng cho máy tính lẫn điện thoại.

[Mở trò chơi](https://werewolf-2r41.onrender.com/)

## Tính năng hiện tại

- **Tài khoản:** đăng ký bằng tên đăng nhập và mật khẩu, đăng nhập, đăng xuất và giữ phiên.
- **Phòng chơi:** tạo hoặc vào phòng bằng mã; hỗ trợ 5–20 người tính cả bot.
- **Bắt đầu ngay:** không có bước Sẵn sàng. Chủ phòng lưu bộ vai hợp lệ rồi bấm **Vào game** để cả phòng bắt đầu.
- **Quản lý phòng:** chủ phòng có thể kick người trong phòng chờ, thêm **1 bot** hoặc xóa **1 bot** mỗi lần bấm. Khi chủ phòng rời đi, quyền chủ phòng được chuyển cho người còn lại.
- **Chat phòng chờ:** khung chat bên trái để trao đổi trước khi vào ván.
- **Tiến trình tự động:** đồng hồ, chuyển lượt, giải quyết kỹ năng và xác định phe thắng chạy tại server.
- **Bảng phiếu bên phải:** liệt kê số phiếu đã xác nhận của từng người chơi, sắp xếp người nhiều phiếu lên trước và cập nhật khi đổi phiếu. Không hiển thị phiếu trên nhân vật.
- **Xem vai và bộ bài:** xem riêng vai của mình; nút **Bộ bài** cạnh **Xem vai** liệt kê các vai và số lượng được chia lúc bắt đầu ván, không tiết lộ ai giữ vai nào.
- **Chat trong ván:** chat dân làng và kênh riêng cho Sói, dùng chung tiêu đề **Chat** và màu sắc.
- **Điện thoại:** chat phòng chờ và chat trong ván có nút **Thu gọn / Mở chat**. Trên máy tính, chat luôn mở.
- **Tự rời phòng:** gửi yêu cầu rời phòng khi đóng hoặc rời trang; có cơ chế dọn người mất kết nối.
- **Chơi lại:** biểu quyết hủy ván đang chơi và quay về phòng chờ, giữ mã phòng, bộ vai và bot.
- **Góp ý & Cảm ơn:** icon trái tim ở góc dưới trái trang chính mở hướng dẫn gửi góp ý, thông tin liên hệ và lời cảm ơn.
- **Hình ảnh:** 10 mẫu nhân vật, bối cảnh ngày/đêm, hình ảnh và video giới thiệu vai.

## Cách chơi

1. Đăng nhập, tạo phòng hoặc nhập mã để tham gia phòng của bạn bè.
2. Chủ phòng chọn số lượng từng vai, bảo đảm tổng bằng số người trong phòng, rồi bấm **Lưu bộ vai**.
3. Khi có ít nhất **5 người** và bộ vai hợp lệ, chủ phòng bấm **Vào game**. Mọi người vào ván ngay, không cần bấm Sẵn sàng.
4. Ván bắt đầu với **10 giây chuẩn bị**; thẻ vai tự mở trong 5 giây đầu. Có thể xem lại bằng nút **Xem vai**.
5. Ban đêm lần lượt diễn ra các lượt **Bảo vệ (20 giây) → Sói (30 giây) → Tiên tri (20 giây) → Phù thủy (30 giây)**, sau đó công bố bình minh.
6. Ban ngày có **2 phút thảo luận và bỏ phiếu**. Chọn nhân vật rồi xác nhận, hoặc chọn **Phiếu trắng**. Số phiếu hiện trên nhân vật là phiếu đã gửi, không phải mục tiêu đang chọn thử.
7. Khi tất cả người có quyền đã bỏ phiếu, thời gian còn lại được rút xuống tối đa 5 giây. Lặp lại ngày và đêm cho đến khi có phe thắng.

Sau khi thêm, xóa bot hoặc thay đổi số người, chủ phòng cần kiểm tra và lưu lại bộ vai nếu tổng số vai không còn khớp.

### Chat và quyền riêng tư

- **Phòng chờ:** tất cả thành viên trong phòng có thể gửi tin nhắn.
- **Chat dân làng:** người còn sống được gửi khi thảo luận ban ngày. Người đã chết và người chơi trong các lượt khác chỉ đọc.
- **Chat Sói:** chỉ Sói còn sống được dùng khi còn ít nhất hai Sói sống. Bấm đúp tiêu đề **Chat** trên máy tính hoặc chạm hai lần trên điện thoại để chuyển qua lại giữa hai kênh.
- Cả hai kênh đều có tiêu đề **Chat** và cùng màu. Ô nhập của kênh Sói ghi **Nhắn riêng cho Sói…** để người chơi nhận biết kênh đang mở. Chỉ người có quyền dùng chat Sói thấy ghi chú hướng dẫn đổi kênh.
- Khi chuyển cửa sổ hoặc ẩn tab, kênh đang xem trở về chat dân. Thu gọn chat Sói trên điện thoại cũng đưa kênh về chat dân; lần mở tiếp theo không tự mở chat Sói.
- Thu gọn chỉ ẩn giao diện; tin nhắn vẫn được đồng bộ khi người chơi còn trong phòng.

### Rời trang và mất kết nối

- Khi đóng tab hoặc điều hướng khỏi trang, trình duyệt báo rời trang qua API `/disconnect`, tách biệt với lệnh `/leave` của nút Rời phòng. Server chờ **10 giây** để phân biệt đóng trang với tải lại. Script ở đầu trang gọi `/reconnect` để hủy yêu cầu rời trước khi giao diện game tải xong: **refresh giữ nguyên phòng, vai và trạng thái trong ván** nếu kết nối lại trong thời gian chờ.
- Đóng web mà không kết nối lại sẽ tự rời phòng sau khoảng **10–12 giây**. Nút **Rời phòng** vẫn có hiệu lực ngay. Phiên đăng nhập tài khoản được giữ.
- Nếu trình duyệt bị tắt đột ngột hoặc mất mạng khiến thông báo không gửi được, server loại thành viên sau khoảng **2 phút** không nhận cập nhật.
- Rời phòng trong ván đang chơi khiến người đó bị loại. Nếu là chủ phòng, quyền quản lý chuyển cho người còn lại; không còn người thật thì phòng được xóa.
- Chuyển sang tab khác không gửi yêu cầu rời phòng ngay. Trình duyệt vẫn cần tiếp tục đồng bộ; nếu hệ điều hành đóng băng tab quá lâu, cơ chế mất kết nối vẫn có thể áp dụng.

## Vai trò và luật chơi

| Vai trò | Phe | Khả năng / mục tiêu |
| --- | --- | --- |
| Dân làng | Dân | Thảo luận, suy luận và bỏ phiếu tìm Sói. |
| Ma sói | Sói | Cùng đồng đội chọn một nạn nhân mỗi đêm. |
| Tiên tri | Dân | Soi một người trong lượt của mình để xác định có phải Sói hay không. |
| Bảo vệ | Dân | Bảo vệ một người khỏi đòn tấn công của Sói; được tự bảo vệ nhưng không chọn cùng người hai đêm liên tiếp. |
| Phù thủy | Dân | Có một bình cứu và một bình độc cho cả ván; có thể dùng cả hai trong cùng đêm. Bình cứu không tiết lộ danh tính nạn nhân. |
| Thợ săn | Dân | Khi bị Sói giết hoặc treo cổ, được chọn bắn một người trước khi xét thắng. |
| Thằng ngu | Phe thứ ba | Thắng riêng ngay khi bị loại bằng bỏ phiếu. |

### Những quy tắc đáng chú ý

- Tổng số vai phải bằng số người, có ít nhất một Sói và số Sói nhỏ hơn một nửa tổng số người. Mỗi vai đặc biệt tối đa một người.
- Vai không có trong bộ bài được bỏ qua lượt. Vai có trong ván nhưng đã chết vẫn giữ thời gian lượt để tránh lộ thông tin.
- Trong lượt bỏ phiếu, mọi người thấy **tổng phiếu trên từng mục tiêu**; danh tính người bỏ phiếu được giữ kín cho đến lúc công bố. Hòa phiếu hoặc phiếu trắng dẫn đầu thì không loại ai. Vai của người khác chỉ công khai khi ván kết thúc.
- Sói chỉ chọn một nạn nhân mỗi đêm. Nếu các mục tiêu cùng có số phiếu cao nhất, server chọn ngẫu nhiên giữa chúng. Sói được chọn bản thân nhưng không chọn Sói đồng đội.
- Bình độc xuyên Bảo vệ và không bị bình cứu hóa giải. Thợ săn chết do độc hoặc rời ván không được bắn.
- **Dân thắng** khi không còn Sói. **Sói thắng** khi số Sói còn sống bằng hoặc vượt số người không thuộc Sói còn sống. Thằng ngu được tính trong nhóm không thuộc Sói khi xét điều kiện này.
- Biểu quyết chơi lại kéo dài 30 giây và cần quá nửa người chơi thật trong phòng đồng ý; người chết vẫn được biểu quyết, bot không được tính. Về phòng chờ xong, chủ phòng có thể bắt đầu lại khi bộ vai hợp lệ.

## Công nghệ

| Thành phần | Công nghệ |
| --- | --- |
| Giao diện | HTML, CSS, JavaScript thuần |
| Backend | Node.js, HTTP server tích hợp, ES Modules |
| Cơ sở dữ liệu | PostgreSQL, thư viện `pg` |
| Đồng bộ | HTTP polling, ETag để giảm nội dung truyền lại |
| Kiểm thử | Test runner tích hợp của Node.js (`node:test`) |
| Tài nguyên | PNG pixel art, video MP4, SVG và font cục bộ |

## Cài đặt và chạy trên máy

### Yêu cầu

- **Node.js 24–26** và npm, theo [package.json](./package.json).
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

Server tự khởi tạo bảng và bổ sung các cột cần thiết khi kết nối thành công, gồm dữ liệu chat phòng chờ và thời điểm cập nhật của thành viên. Không đưa `.env` chứa mật khẩu lên GitHub; file này đã được loại trừ trong [.gitignore](./.gitignore).

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
├── index.html          # Giao diện chính, About và các hộp thoại
├── server.mjs          # HTTP server, API và phục vụ tài nguyên tĩnh
├── .env.example        # Mẫu cấu hình môi trường
└── package.json        # Thư viện và lệnh chạy
```

## Kiểm thử

Chạy bộ kiểm thử:

```sh
npm test
```

Để chạy cả các ca tích hợp PostgreSQL với cấu hình trong `.env`:

```sh
node --env-file=.env --test --test-concurrency=1
```

Chạy tuần tự các ca tích hợp để tránh tranh chấp khóa khi nhiều bài kiểm thử cùng khởi tạo schema. Các ca PostgreSQL tạo tài khoản/phòng tạm và dọn lại sau khi chạy; chúng được bỏ qua khi thiếu biến kết nối tương ứng. Nên dùng database riêng cho kiểm thử vì có các ca kiểm tra dọn phòng hết hạn.

Bộ kiểm thử bao phủ tài khoản, quản lý phòng, bắt đầu không cần sẵn sàng, thêm/xóa từng bot, luật vai, tổng phiếu, các kênh chat và xử lý người mất kết nối. Các thay đổi giao diện nên được kiểm tra thêm trên máy tính và điện thoại.

## Dữ liệu và đồng bộ

- Tài khoản và phiên đăng nhập được lưu trong PostgreSQL.
- Phòng lưu cấu hình bộ vai, thành viên, thời điểm cập nhật gần nhất và yêu cầu rời trang đang chờ. Server kiểm tra người rời/mất kết nối khoảng 2 giây một lần; việc dọn phòng không hoạt động quá 10 phút chạy định kỳ khoảng 30 giây.
- Trạng thái ván đang chơi được ghi tạm để đồng bộ và phục hồi. Khi kết thúc, dữ liệu ván được dọn khỏi cơ sở dữ liệu; kết quả chỉ giữ trong RAM 60 giây.
- **Chat phòng chờ:** lưu tối đa 50 tin trong PostgreSQL theo phòng; được xóa khi bắt đầu ván hoặc khi phòng bị xóa.
- **Chat dân làng / chat Sói:** giữ lần lượt tối đa 50 / 30 tin trong RAM theo ván; không lưu lịch sử chat trong ván vào cơ sở dữ liệu. Tin nhắn được dọn khi ván kết thúc hoặc bị hủy và không phục hồi sau khi server khởi động lại.
- Tài nguyên tĩnh dùng ETag và kiểm tra lại phiên bản; JSON/code hỗ trợ gzip. Poll giảm tần suất khi ẩn tab hoặc ở sảnh.
