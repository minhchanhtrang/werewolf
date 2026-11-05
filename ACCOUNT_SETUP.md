# Bật tài khoản Username + mật khẩu với PostgreSQL

Code đã có đăng ký, đăng nhập, giữ phiên 7 ngày, đăng xuất, phòng chờ và ván do server điều khiển. Người chơi không cần email. Chưa có quên mật khẩu hoặc triển khai Internet.

## 1. Tạo database trong pgAdmin

1. Mở **pgAdmin** và kết nối server PostgreSQL trên máy bằng mật khẩu đã đặt khi cài PostgreSQL.
2. Nhấp phải **Databases → Create → Database**.
3. Đặt tên database là **werewolf**, rồi **Save**.

Không cần tự tạo bảng. Khi kết nối thành công, server tự tạo bảng tài khoản, phiên và phòng chờ (`ww_users`, `ww_sessions`, `ww_rooms`, `ww_room_members`). Bảng bản lưu cũ `ww_saves` được giữ, không xóa dữ liệu đã có.

## 2. Tạo cấu hình riêng trên máy

Trong VS Code, sao chép [.env.example](./.env.example) thành file tên **.env** ở cùng thư mục với [server.mjs](./server.mjs).

Sửa nội dung `.env` theo máy bạn:

```dotenv
PGHOST=127.0.0.1
PGPORT=5432
PGDATABASE=werewolf
PGUSER=postgres
PGPASSWORD="MAT_KHAU_POSTGRES_CUA_BAN"
PORT=3000
```

Thay phần mật khẩu bằng mật khẩu của tài khoản PostgreSQL, không phải mật khẩu người chơi. Nếu mật khẩu chứa dấu nháy kép, dùng dấu nháy đơn bao ngoài. Không gửi nội dung `.env` vào chat hoặc đưa lên Git. [.gitignore](./.gitignore) đã loại file này.

Nếu bạn dùng cổng hoặc người dùng PostgreSQL khác, sửa `PGPORT` hoặc `PGUSER` tương ứng. Tài khoản database cần quyền tạo bảng trong database `werewolf`. Cấu hình trên dành cho thử trên máy cá nhân; khi triển khai thật, dùng tài khoản database riêng với quyền phù hợp.

## 3. Khởi động lại Node.js

Ở terminal đang chạy game, nhấn **Ctrl+C**. Tại thư mục dự án, chạy:

```powershell
npm.cmd start
```

Thư viện `pg` đã được cài cho workspace này. Nếu chuyển dự án sang máy khác, chạy `npm.cmd ci` trước.

Khi thành công, terminal sẽ có:

```text
Đã kết nối PostgreSQL và chuẩn bị bảng tài khoản.
Ma Sói đang chạy tại http://127.0.0.1:3000
```

Mở **Google Chrome** tại http://127.0.0.1:3000. Chức năng tài khoản cần server Node.js; Live Server chỉ phục vụ file tĩnh nên không có API đăng nhập.

## 4. Tạo tài khoản người chơi

1. Bấm **Chưa có tài khoản? Đăng ký**.
2. Nhập username gồm 3–24 ký tự: chữ không dấu, số hoặc `_`.
3. Nhập mật khẩu từ 1–4 ký tự, rồi nhập lại.
4. Bấm **Tạo tài khoản**.
5. Khi báo thành công, nhập mật khẩu và bấm **Đăng nhập**.

Username được chuẩn hóa về chữ thường: `Player01` và `player01` là cùng tên. Mật khẩu giữ nguyên phân biệt hoa/thường và khoảng trắng.

## 5. Tự kiểm tra

- Đăng ký hai lần cùng username: lần hai báo tên đã được dùng.
- Nhập sai mật khẩu: không đăng nhập được.
- Đăng nhập đúng rồi tải lại trang: vẫn còn phiên đăng nhập.
- Đăng xuất rồi tải lại trang: trở lại chế độ khách.
- Đóng/mở lại Node.js: tài khoản và phiên chưa hết hạn vẫn nằm trong PostgreSQL.

Khách có thể thử luật một máy trong mục riêng. Ván online cần đăng nhập; vai, phiếu và kỹ năng được server xác minh qua phiên đăng nhập.

## Phòng chờ online

1. Khởi động lại Node.js để tự tạo bảng phòng.
2. Đăng nhập, bấm **Tạo phòng**, sao chép mã phòng 6 ký tự.
3. Mở Chrome ẩn danh, đăng nhập bằng tài khoản khác, nhập mã rồi bấm **Vào phòng**.
4. Bấm **Sẵn sàng**. Danh sách và trạng thái cập nhật tự động khoảng mỗi 2 giây.
5. Tải lại trang sẽ tự quay lại phòng sau khi kiểm tra phiên đăng nhập.

Một tài khoản chỉ ở một phòng, tối đa 10 tài khoản mỗi phòng. Đóng trang hoặc đăng xuất vẫn giữ chỗ; muốn nhường chỗ hãy bấm **Rời phòng**. Chủ phòng rời thì người vào sớm nhất tiếp quản, người cuối rời sẽ đóng phòng. Trạng thái này được giữ trong PostgreSQL khi khởi động lại Node.js.

Hai tab Chrome thường dùng chung cookie, nên thử hai người cần Chrome thường và Chrome ẩn danh hoặc hai hồ sơ trình duyệt khác nhau.

Đã bỏ Lưu ván/Tiếp tục ván khỏi giao diện và tắt API lưu thủ công. Server hiện chỉ mở trên máy này, chưa triển khai Internet.

### Chơi thử khi chỉ có 2 người

1. Hai tài khoản vào cùng phòng; chủ phòng bấm **Điền bot cho đủ 10**.
2. Cả hai người thật bấm **Sẵn sàng**; bot tự sẵn sàng.
3. Chủ phòng bấm **Bắt đầu ván**; mỗi người chỉ thấy vai riêng của mình.
4. Bỏ phiếu cho người khác trong 30 giây; bot tự vote sau khoảng 3 giây.
5. Sau công bố 8 giây, dùng kỹ năng theo vai trong đêm 30 giây. Sói không tấn công đồng đội, Tiên tri soi một lần, Bảo vệ không chọn cùng người hai đêm liền. Dân không cần thao tác ban đêm.
6. Server tự công bố bình minh, mở vòng sau và kết thúc khi có phe thắng.
7. F5 để kiểm tra trở lại đúng ván; chủ phòng bấm **Kết thúc ván / Về phòng chờ** để chơi ván mới.

Chủ phòng có thể **Xóa bot** lúc chờ để nhường chỗ cho người thật. Bot tự chơi bằng lựa chọn đơn giản, không phải AI suy luận. Rời ván bị loại, người khác tiếp tục chơi; F5 hoặc đóng trang chỉ ngắt kết nối và vẫn giữ nhân vật. Đồng hồ không tạm dừng. Trạng thái nằm trong PostgreSQL, không cần bấm lưu.

### Trò chuyện

Dùng khung **Trò chuyện** trong phòng. Nhãn phía trên luôn ghi kênh đang gửi. Ban ngày người sống gửi chat chung; ban đêm Sói sống gửi kênh riêng, phe Dân chờ sáng. Người đã bị loại gửi kênh người chết, người sống không đọc được. Kết thúc ván, mọi người lại gửi chat chung. Bot không chat.

Tin tối đa 300 ký tự, mỗi tài khoản một tin trong 2 giây; hiển thị 50 tin gần nhất được phép xem. Tin tự cập nhật khoảng mỗi 2 giây. Server tự tạo bảng `ww_room_messages` khi khởi động lại, không cần tự chạy SQL. Nếu đổi pha đúng lúc gửi, kiểm tra lại nhãn kênh trước khi gửi tiếp; bản nháp của các kênh được giữ riêng trong trang hiện tại.

## Khi có lỗi

- **Chưa kết nối tài khoản:** kiểm tra `.env`, database và khởi động lại Node.js. Không chỉ tải lại Chrome.
- **28P01:** username hoặc mật khẩu PostgreSQL không đúng.
- **3D000:** database chưa tồn tại hoặc `PGDATABASE` chưa đúng.
- **ECONNREFUSED:** PostgreSQL chưa chạy hoặc host/cổng chưa đúng.
- **42501:** tài khoản PostgreSQL thiếu quyền tạo bảng.
- **EADDRINUSE:** cổng game đang bị server khác chiếm; dừng server cũ hoặc đổi `PORT` rồi mở URL tương ứng.
- **Quá nhiều lần thử:** đợi 15 phút trước khi thử tiếp. Giới hạn hiện theo địa chỉ máy, dùng chung cho các tab.

## Kiểm tra tự động

```powershell
npm.cmd test
```

Bộ kiểm tra mặc định dùng luật game và kho dữ liệu giả. Để chạy thêm kiểm tra PostgreSQL thật sau khi cấu hình `.env`:

```powershell
node --env-file=.env --test
```

Kiểm tra tạo tài khoản/phòng thử riêng và xóa chúng sau khi chạy; không sử dụng tài khoản chơi của bạn. Bộ kiểm tra gồm quyền hành động, phiếu kín, kỹ năng đêm, bot, thắng/thua, khôi phục ván và giới hạn phòng.

## Cách lưu mật khẩu và phiên

Server băm mật khẩu bằng scrypt kèm salt ngẫu nhiên; truy vấn dùng tham số. Token phiên ngẫu nhiên nằm trong cookie HttpOnly/SameSite, database chỉ lưu hash token. Không lưu mật khẩu người chơi trong localStorage. Server chỉ mở trên loopback để thử cục bộ; triển khai lên mạng cần HTTPS và cấu hình cookie Secure.

Tham khảo: [Node.js crypto](https://nodejs.org/api/crypto.html), [node-postgres parameterized queries](https://node-postgres.com/features/queries).
