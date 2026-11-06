# Bản đồ mã nguồn

Luồng chính: trình duyệt tải index.html → auth.js quản lý đăng nhập → lobby.js quản lý sảnh/phòng → online-game.js hiển thị ván. Server nhận yêu cầu qua rooms.mjs; game.mjs quyết định luật và kết quả. Trình duyệt không quyết định vai hoặc người chết.

## Giao diện

| File | Chức năng |
| --- | --- |
| [index.html](./index.html) | Cấu trúc màn đăng nhập, sảnh, phòng chờ, game, lá bài, thông báo và chat. |
| [css/style.css](./css/style.css) | Màu sắc, bố cục, animation, khung chat và giao diện điện thoại. |
| [js/auth.js](./js/auth.js) | Đăng ký, đăng nhập, đăng xuất, phục hồi phiên và thông báo thay đổi tài khoản. |
| [js/lobby.js](./js/lobby.js) | Chuyển màn hình; tạo/vào/rời phòng; sẵn sàng; chọn bộ vai; bot; kick; chơi lại; gọi API và cập nhật định kỳ. |
| [js/online-game.js](./js/online-game.js) | Hiển thị ván online, đồng hồ/thanh thời gian, chọn mục tiêu, kỹ năng, kết quả và nhật ký. |
| [js/scene.js](./js/scene.js) | Vẽ nhân vật quanh lửa trại bằng DOM, chọn sprite, vị trí, trạng thái và xử lý nhấp nhân vật. |
| [js/rules.js](./js/rules.js) | Tên vai, giới hạn người, kiểm tra bộ vai và điều kiện sẵn sàng; bộ vai mặc định dùng cho hàm chia vai và kiểm thử. Dùng chung với backend. |
| [js/role-intro.js](./js/role-intro.js) | Tự mở/đóng lá bài đầu ván theo thời hạn server, không mở lại do polling. |
| [js/village-chat.js](./js/village-chat.js) | Hiển thị/gửi chat chung, cuộn tin nhắn, thu gọn trên điện thoại. |
| [js/wolf-chat.js](./js/wolf-chat.js) | Hiển thị/gửi chat riêng của phe Sói khi được server cho phép. |

## Máy chủ

| File | Chức năng |
| --- | --- |
| [server.mjs](./server.mjs) | Khởi động HTTP, kết nối CSDL, phân luồng API, phục vụ tài nguyên, cache/gzip và health check. |
| [backend/database.mjs](./backend/database.mjs) | Tạo pool PostgreSQL, chuẩn bị/cập nhật bảng và dọn các bảng tính năng cũ. |
| [backend/auth.mjs](./backend/auth.mjs) | API tài khoản, cookie/phiên, xác thực người dùng, giới hạn thử đăng nhập; tiện ích đọc JSON và trả phản hồi. |
| [backend/password.mjs](./backend/password.mjs) | Kiểm tra thông tin tài khoản, băm mật khẩu có salt và đối chiếu mật khẩu. |
| [backend/origin.mjs](./backend/origin.mjs) | Kiểm tra nguồn gửi yêu cầu có khớp địa chỉ game không. |
| [backend/rooms.mjs](./backend/rooms.mjs) | API phòng: thành viên, bot, bộ vai, sẵn sàng, bắt đầu, kick, hành động, chat và chơi lại; khóa giao dịch để đồng bộ. |
| [backend/roles.mjs](./backend/roles.mjs) | Xáo/chia vai và chỉ gửi thông tin vai mà người dùng được phép xem. |
| [backend/game.mjs](./backend/game.mjs) | Luật ván online: lượt đêm/ngày, kỹ năng, bot, phiếu trắng, loại người, điều kiện thắng, dữ liệu riêng từng người. |
| [backend/game-clock.mjs](./backend/game-clock.mjs) | Chạy đồng hồ server, chuyển giai đoạn hết giờ và định kỳ gọi dọn phòng. |
| [backend/game-storage.mjs](./backend/game-storage.mjs) | Ghi trạng thái ván đang chơi, giữ kết quả trong RAM 60 giây, theo dõi phòng hoạt động và dọn chat. |
| [backend/room-cleanup.mjs](./backend/room-cleanup.mjs) | Ghi nhận hoạt động kết nối; xóa phòng không có cập nhật trong 10 phút, kèm thành viên và dữ liệu tạm. |
| [backend/replay.mjs](./backend/replay.mjs) | Biểu quyết chơi lại, thời hạn, số phiếu và kết quả biểu quyết. |
| [backend/wolf-chat.mjs](./backend/wolf-chat.mjs) | Kiểm tra quyền chat Sói, giữ tối đa 30 tin trong RAM và xóa chat. |
| [backend/village-chat.mjs](./backend/village-chat.mjs) | Quyền đọc/gửi chat chung, giữ tối đa 50 tin trong RAM và xóa chat. |
| [backend/http-cache.mjs](./backend/http-cache.mjs) | Tạo ETag cho phòng và nén gzip phản hồi để giảm băng thông. |

## Kiểm thử

Các file này không được tải vào trang game. Giữ lại để phát hiện lỗi sau khi sửa code.

| File | Kiểm tra |
| --- | --- |
| [backend/auth.test.mjs](./backend/auth.test.mjs) | Mật khẩu, API tài khoản, phiên, đầu vào và nguồn yêu cầu. |
| [backend/postgres.test.mjs](./backend/postgres.test.mjs) | Tài khoản/phiên với PostgreSQL thật. |
| [backend/rooms.test.mjs](./backend/rooms.test.mjs) | Vòng đời phòng, thành viên, bot, sẵn sàng, kick, reset và API. |
| [backend/game.test.mjs](./backend/game.test.mjs) | Luật chơi, kỹ năng, thời gian, bảo mật vai, bỏ phiếu và thắng/thua. |
| [backend/release.test.mjs](./backend/release.test.mjs) | Các tình huống luật và cấu hình nguồn HTTPS. |
| [backend/intro.test.mjs](./backend/intro.test.mjs) | Giai đoạn nhận vai và tự đóng lá bài. |
| [backend/replay.test.mjs](./backend/replay.test.mjs) | Biểu quyết chơi lại, đa số và hết giờ. |
| [backend/bandwidth-chat.test.mjs](./backend/bandwidth-chat.test.mjs) | Chat Sói, ETag và gzip. |
| [backend/village-chat.test.mjs](./backend/village-chat.test.mjs) | Quyền chat chung, giới hạn tin và cách ly dữ liệu các ván. |
| [backend/room-cleanup.test.mjs](./backend/room-cleanup.test.mjs) | Phòng bỏ hoang, heartbeat, khóa phòng, dọn chat/thành viên và giữ tài khoản. |

## Công cụ, cấu hình và tài liệu

| File/thư mục | Chức năng |
| --- | --- |
| [scripts/optimize-png.mjs](./scripts/optimize-png.mjs) | Công cụ chạy thủ công để nén PNG lossless; không chạy cùng server. |
| [package.json](./package.json) | Tên dự án, phiên bản Node, lệnh start/test và thư viện PostgreSQL. |
| [package-lock.json](./package-lock.json) | Khóa phiên bản thư viện để cài đặt nhất quán. |
| [.env.example](./.env.example) | Mẫu biến môi trường. |
| .env | Cấu hình riêng và bí mật kết nối trên máy; không đưa lên GitHub. |
| [.gitignore](./.gitignore) | Quy định file Git bỏ qua, gồm cấu hình bí mật và thư viện cài sẵn. |
| [README.md](./README.md) | Tổng quan dự án, cách chạy, luật và giới hạn hiện tại. |
| [ACCOUNT_SETUP.md](./ACCOUNT_SETUP.md) | Hướng dẫn cấu hình tài khoản/PostgreSQL. |
| [DEPLOY_FREE.md](./DEPLOY_FREE.md) | Hướng dẫn triển khai lên hosting miễn phí. |
| [CODE_MAP.md](./CODE_MAP.md) | Tài liệu chức năng file này. |
| [assets/ASSETS.md](./assets/ASSETS.md) | Ghi chú về tài nguyên hình ảnh. |
| [assets/backgrounds/](./assets/backgrounds/) | Nền, logo, favicon. |
| [assets/characters/](./assets/characters/) | Ảnh nhân vật gốc và bản dùng trong game. |
| [assets/effects/](./assets/effects/) | Ảnh hiệu ứng/lửa trại. |
| [assets/role/](./assets/role/) | Hình các lá bài vai. |
| node_modules/ | Thư viện do npm cài; không sửa thủ công hoặc push lên GitHub. |
| .git/ | Dữ liệu quản lý phiên bản Git. |

## Phần đã gỡ trong lần rà soát

- Bộ prototype một máy: app.js, data.js, state.js, snapshot.js và hai file kiểm thử game.test.js/snapshot.test.js trong js/. Luật online nằm ở backend/game.mjs.
- Panel prototype ẩn, script tải prototype, các khối CSS chỉ dành cho panel/nút/công cụ prototype.
- Hàm describeRoles không có nơi gọi; hai truy vấn phần tử HTML đã không còn tồn tại; kết nối trước đến Google Fonts không dùng.
- Ảnh gốc, migration CSDL và kiểm thử online được giữ lại. Không xóa selector dùng chung hoặc nhánh tương thích chỉ dựa trên việc không thấy nó xuất hiện trong HTML tĩnh.

## Xác minh

Sau khi dọn: chạy 42 kiểm thử thành công, gồm PostgreSQL thật. Kiểm tra import nội bộ và ID HTML được truy vấn trực tiếp. Đây chưa phải bằng chứng mọi nhánh giao diện và mọi tình huống khi chạy thực tế đều không có lỗi.
