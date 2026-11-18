# Supporting (draft)

> Nguồn: `idea/business.md`, `idea/_qa-log.md` (Q-030..Q-034) · Cập nhật: 2026-11-18

## 1. Nghiệp vụ phụ trợ (Supporting)
| ID | Tên | Loại | Kích hoạt bởi | Người nhận / tác động | Ghi chú | Trong MVP? | Q-ref |
|---|---|---|---|---|---|---|---|
| SUP-01 | Thông báo trong phòng (real-time) | notification (in-app) | BIZ-03 (người vào), BIZ-04 (bộ vé mới), BIZ-05 (lấy/bỏ vé), BIZ-06 (trạng thái ván, chờ host), BIZ-08 (kinh hụt, người thắng), BIZ-10 (kick, đổi host), BIZ-11 (người rời), BIZ-12 (tin nhắn), BIZ-14 (cảnh báo 15 phút, đóng phòng), BIZ-16 (đổi tên/ảnh) | Mọi thành viên đang trong phòng; riêng người bị kick nhận thông báo cá nhân | Hiển thị ngay khi sự kiện xảy ra, không cần tải lại | Có | Bắt buộc |
| SUP-02 | Phát tiếng rao | audio | BIZ-07 (rao số, câu nối), BIZ-08 (kinh hụt, chúc mừng) | Thành viên đang bật tiếng | Lấy từ kho tiếng rao (ENT-09); mỗi số nhiều câu thì chọn ngẫu nhiên; thiếu câu thì chỉ hiển thị số (BR-26) | Có | Bắt buộc |
| SUP-03 | Hẹn giờ | scheduler | BIZ-07 (mỗi N giây), BIZ-08 (cửa sổ đồng kinh 5 giây), BIZ-14 (còn 15 phút, đến hạn 8 giờ), BIZ-03 (link hết hạn 8 giờ) | Ván, phòng, link mời | Phải chính xác theo giây cho nhịp quay và cửa sổ đồng kinh | Có | Bắt buộc |
| SUP-04 | Theo dõi online/offline | presence | Mọi thành viên kết nối/mất kết nối | BIZ-06 (host offline thì tạm dừng ván), BIZ-04 (thu hồi vé người offline), BIZ-10 (không chuyển host cho người offline) | Danh sách thành viên hiển thị trạng thái online/offline | Có | Bắt buộc |
| SUP-05 | Phiên đăng nhập | auth | BIZ-01 | Người dùng | Giữ đăng nhập giữa các lần mở; đăng xuất; sau đăng nhập quay về đúng link mời đang mở | Có | Bắt buộc |
| SUP-06 | Chia sẻ link mời | share | BIZ-03 | Host; người nhận link trên Messenger/Telegram/Zalo | Nút chia sẻ của thiết bị + copy link; khi dán link vào ứng dụng chat hiện thẻ xem trước (tên phòng, tên host, ảnh) | Có | Q-030 |
| SUP-07 | Chống spam chat | rate limit | BIZ-12 | Người gửi | Tối đa 5 tin / 10 giây / người; vượt thì báo "gửi chậm lại" (BR-23) | Có | Q-030 |
| SUP-08 | Lưu ảnh đại diện | file | BIZ-16 | Người dùng | Ảnh tải lên JPG/PNG ≤ 5 MB; bộ avatar có sẵn | Có | Q-032 |
| SUP-09 | Thống kê vận hành | report | Tổng hợp hằng ngày từ BIZ-01, BIZ-02, BIZ-03, BIZ-06, BIZ-08 | Đội phát triển (ACT-07), xem ngoài ứng dụng | Người dùng mới/ngày, người chơi hoạt động/ngày, số phòng/ngày, số ván/ngày, số người trung bình/phòng | Có | Q-033 |
| SUP-10 | Hiệu ứng vé mode Auto | UX feedback | BIZ-07 | Player để mode Auto | Số vừa rao có trên vé thì nổi bật (nhấp nháy/rung); hàng còn thiếu 1 số đánh dấu "chờ" (BR-20) | Có | Q-034 |
| SUP-11 | Nhật ký diễn biến ván | audit | BIZ-07, BIZ-08 | — | Chỉ lưu người thắng mỗi ván (BIZ-13) | Ngoài phạm vi | Q-030, Q-031 |
| SUP-12 | Thông báo ngoài ứng dụng (push) | notification (push) | BIZ-06 | — | | Ngoài phạm vi | Q-030 |
| SUP-13 | Đa ngôn ngữ | i18n | — | — | Chỉ tiếng Việt | Ngoài phạm vi | Q-030 |
| SUP-14 | Thanh toán / điểm thưởng | payment | — | — | Giải trí thuần | Ngoài phạm vi | Q-019 |
