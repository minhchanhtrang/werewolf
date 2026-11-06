# Ma Sói · Đêm bên lửa trại

## Quản lý người chơi

Chat dân làng nằm dưới khung làng, tối đa 50 tin trong RAM. Người còn sống được gửi khi thảo luận ban ngày; người chết và ban đêm chỉ đọc. Giới hạn 300 ký tự/tin, không cần chờ giữa hai tin ở cả chat chung và chat Sói. Tin được xóa khi kết thúc/chơi lại/rời hết phòng; không lưu vào CSDL. Trên điện thoại có nút Mở chat để tiết kiệm chỗ.

Chủ phòng có nút Kick cạnh người chơi thật, chỉ trong phòng chờ. Khi đang chơi hoặc xem kết quả không thể kick. Cần xác nhận trước khi kick; người bị kick trở về sảnh. Không thể kick bản thân hoặc người thuộc phòng khác. Kick không cấm tham gia lại bằng mã phòng.

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
- Chủ phòng lưu bộ vai tùy chọn trước khi bắt đầu: tổng vai bằng số người, 5–20 người; ít nhất 1 Sói và ít Sói hơn phe Dân. Vai đặc biệt tối đa 1 mỗi loại. Lưu hoặc thay đổi bộ vai giữ nguyên trạng thái sẵn sàng của mọi người.
- Khi vào ván có 10 giây chuẩn bị; lá bài vai tự mở trong 5 giây đầu rồi tự đóng. Sau đó bắt đầu Đêm 1: Bảo vệ 20 giây → Sói 30 giây → Tiên tri 20 giây → Phù thủy 30 giây → bình minh. Vai không có trong bộ vai sẽ bỏ qua lượt và log; vai có trong ván nhưng đã chết vẫn chạy đủ lượt để tránh lộ vai. Hành động có thể sửa đến hết lượt, riêng soi và dùng bình chỉ một lần. Nút Xem vai vẫn dùng được sau khi bài tự đóng.
- Thảo luận/bỏ phiếu 2 phút; tất cả người có quyền đã bỏ phiếu (kể cả phiếu trắng) thì rút còn tối đa 5 giây. Nhấp nhân vật để chọn trực tiếp.
- Sói có bảng mục tiêu riêng; chỉ một nạn nhân mỗi đêm, hòa thì chọn ngẫu nhiên đều giữa các mục tiêu đồng hạng cao nhất.
- Trong ván, chủ phòng có thể đề nghị chơi lại. Biểu quyết 30 giây, cần quá nửa người thật trong phòng đồng ý (chủ phòng tự đồng ý, người đã chết vẫn được vote, bot không tính). Đủ phiếu sẽ hủy ván, xóa dữ liệu ván và chat, giữ mã phòng/bộ vai/bot, hủy sẵn sàng. Thiếu phiếu thì chơi tiếp. Rời phòng sẽ rút người đó khỏi biểu quyết. Sau khi kết thúc ván, chủ phòng vẫn có thể đưa cả phòng về ngay.
- Phù thủy có một bình cứu và một bình độc cho cả ván, được dùng cả hai cùng đêm. Nạn nhân chỉ chết sau lượt Phù thủy; thông báo cứu không nêu tên. Độc xuyên bảo vệ và không bị bình cứu hóa giải.
- Thợ săn bị Sói giết/treo cổ được bắn một người trong 20 giây trước khi xét thắng. Trúng độc, tự sát hay rời ván không được bắn.
- Thằng ngu thuộc phe thứ ba: bị bỏ phiếu loại sẽ thắng riêng ngay lập tức. Hòa phiếu hay chết vì Sói, độc, đạn không thắng. Khi xét thắng thông thường của Sói, vai này vẫn được tính là một người không thuộc Sói còn sống.
- Sói được chọn chính mình làm nạn nhân trong lượt săn, không có nút chết tức thì. Phiếu này tính chung với phiếu của các Sói khác; có thể được Bảo vệ/Phù thủy cứu như nạn nhân khác. Không chọn Sói đồng đội.
- Nhấp nhân vật sẽ viền sáng mục tiêu và đồng bộ ô chọn; bấm nút hành động để xác nhận. Bộ vai chỉ áp dụng cho ván mới; khi nâng cấp hãy về phòng chờ rồi bắt đầu lại.
- Phòng chờ: mã phòng/công cụ bên trái; nút sẵn sàng và vào game ở trên, tiếp theo là lá bài chọn số lượng và danh sách người tham gia. Thợ săn và Thằng ngu đã có ảnh vai riêng. Nhãn phe Dân màu xanh, Sói màu đỏ, phe thứ ba màu tím.
- Phiếu giữ kín đến khi công bố; phiếu trắng dẫn đầu hoặc hòa thì không loại ai. Vai của người khác chỉ công khai khi kết thúc.
- Ngoại hình ngẫu nhiên và đồng bộ suốt ván; có 10 mẫu nhân vật.
- Nhật ký đọc tại nút Nhật ký. Chat nhỏ góc dưới trái chỉ dành cho Sói còn sống khi còn ít nhất 2 Sói sống; tối đa 30 tin trong RAM, xóa khi hết ván. Chưa có tính năng kết bạn.
- Dân thắng khi hết Sói. Sói thắng khi số Sói sống bằng hoặc vượt số người phe Dân sống.

## Dữ liệu

Tài khoản và phiên đăng nhập được giữ trong PostgreSQL. Dữ liệu ván đang chơi được ghi tạm để đồng bộ và phục hồi. Khi kết thúc, dữ liệu ván được dọn khỏi CSDL; kết quả chỉ giữ trong RAM 60 giây. Không có chức năng lưu ván hay lưu lịch sử lâu dài. Bảng save/chat cũ được bỏ khi khởi động.

Bản online do backend điều khiển; bộ prototype một máy cũ đã được gỡ. Xem [CODE_MAP.md](./CODE_MAP.md) để biết chức năng từng file.

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
