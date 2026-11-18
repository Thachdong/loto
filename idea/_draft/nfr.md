## 4. Non-Functional Requirements
> Nguồn: Q-040 (quy mô ≤ 50 phòng, web trên điện thoại là chính, xóa dữ liệu phòng đóng sau 30 ngày). Toàn bộ giá trị được xác nhận ở Q-041.

| ID | Nhóm | Yêu cầu | Chỉ số đo được | Ưu tiên | Áp dụng cho | Q-ref |
|---|---|---|---|---|---|---|
| NFR-01 | Performance | Số mới hiển thị gần như cùng lúc cho mọi thành viên | Lệch giữa các thành viên ≤ 1 giây (P95) | Must | BIZ-07, SUP-01 | |
| NFR-02 | Performance | Sự kiện trong phòng (vào/rời, lấy/bỏ vé, chat, trạng thái ván) tới mọi người nhanh | ≤ 1 giây (P95) | Must | SUP-01 | |
| NFR-03 | Performance | Kết quả bấm Kinh (đúng/hụt) | Hiển thị ≤ 1 giây sau khi bấm (P95) | Must | BIZ-08 | |
| NFR-04 | Performance | Mở phòng từ link trên điện thoại 4G | Dùng được ≤ 3 giây (P75) | Should | BIZ-03 | |
| NFR-05 | Performance | Tiếng rao khớp với số | Bắt đầu phát ≤ 0,5 giây sau khi số hiển thị | Should | SUP-02 | |
| NFR-06 | Scalability | Chịu tải giờ cao điểm | 50 phòng × 16 người = 800 người đồng thời; mở rộng tới 500 phòng không phải làm lại | Must | Toàn hệ thống | Q-040 |
| NFR-07 | Availability | Hệ thống luôn sẵn sàng; mất mạng ngắn không mất ván | Uptime ≥ 99% / tháng; mất kết nối ≤ 30 giây thì tự kết nối lại và khôi phục đúng phòng, vé, số đã rao, ô đã đánh dấu | Must | Toàn hệ thống, SUP-04 | |
| NFR-08 | Fairness | Công bằng, không gian lận | Số quay và kết quả Kinh do hệ thống quyết định, người chơi không đoán trước hoặc can thiệp được; không ai thấy trước số sắp rao | Must | BIZ-07, BIZ-08 | |
| NFR-09 | Security | Kiểm soát quyền | Chỉ đăng nhập Google; mọi thao tác host (bắt đầu, kick, thu hồi, xác nhận) bị từ chối nếu người làm không phải host; link mời không đoán được | Must | Toàn hệ thống | |
| NFR-10 | Privacy / Compliance | Bảo vệ dữ liệu cá nhân theo NĐ 13/2023 | Chỉ thu tên, ảnh, email; email không hiển thị cho người khác; có trang chính sách quyền riêng tư; yêu cầu xóa tài khoản xử lý ≤ 30 ngày | Should | ENT-01 | |
| NFR-11 | Data retention | Lưu trữ có thời hạn | Dữ liệu phòng đã đóng (thành viên, chat, lịch sử ván, vé) xóa sau 30 ngày; số liệu thống kê tổng hợp giữ lâu dài | Must | ENT-02..ENT-11, SUP-09 | Q-040 |
| NFR-12 | Usability | Mobile-first, chơi bằng một tay | Màn hình từ 360px; vé 9×9 đọc được không cần zoom; vùng bấm ≥ 44px; nút Kinh luôn trong tầm thấy khi đang ván | Must | Toàn hệ thống | Q-040 |
| NFR-13 | Compatibility | Mở được từ ứng dụng chat | Chrome Android, Safari iOS (2 bản mới nhất); trình duyệt trong Zalo/Messenger/Telegram. Nơi không hỗ trợ đăng nhập Google thì hướng dẫn "Mở bằng trình duyệt" | Must | BIZ-01, BIZ-03 | |
| NFR-14 | Usability | Âm thanh trên điện thoại | Trình duyệt chặn tự phát tiếng nên khi vào phòng có một lần chạm "Bật tiếng"; sau đó rao tự động | Must | SUP-02 | |
| NFR-15 | Usability | Màn hình không tự tắt khi đang chơi | Giữ màn hình sáng khi ván Đang quay (nếu thiết bị hỗ trợ) | Could | BIZ-07 | |
| NFR-16 | i18n | Ngôn ngữ, múi giờ | Tiếng Việt; giờ GMT+7 | Must | Toàn hệ thống | Q-030 |
| NFR-17 | Observability | Theo dõi vận hành | Ghi lỗi hệ thống; cảnh báo khi tỉ lệ mất kết nối hoặc lỗi > 5% trong 5 phút; thống kê ngày (SUP-09) | Should | Toàn hệ thống | Q-033 |
