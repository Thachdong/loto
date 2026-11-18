# Actors & Entities (draft)

> Nguồn: `idea/_draft/idea-map.md`, `idea/_qa-log.md` (Q-001..Q-023) · Cập nhật: 2026-11-17

## 3. Actors
| ID | Tên | Mô tả | Mục tiêu chính | Quyền/giới hạn |
|---|---|---|---|---|
| ACT-01 | Người dùng | Người đã đăng nhập bằng Google, chưa ở trong phòng nào | Tạo phòng hoặc vào phòng bạn bè để chơi | Chỉ ở tối đa 1 phòng tại 1 thời điểm; đang ở phòng thì không tạo phòng mới (Q-023) |
| ACT-02 | Host (chủ phòng) | Thành viên giữ quyền điều khiển phòng; mặc định là người tạo phòng | Tổ chức ván chơi cho nhóm | Tạo link mời, tạo ván, bắt đầu/tạm dừng/tiếp tục ván, chỉnh nhịp quay, tạo lại bộ vé, kick, chuyển quyền host (Q-017). Đồng thời chơi như Player (Q-024) |
| ACT-03 | Player (thành viên phòng) | Người dùng đang ở trong một phòng, có thể có 0–2 vé | Lấy vé, dò số, báo Kinh, giao lưu | Lấy/bỏ vé khi không có ván đang chạy; tối đa 2 vé; chat; tự rời phòng; chọn mode dò, bật/tắt tiếng (Q-005, Q-020) |
| ACT-04 | Khách được mời | Người mở link mời, chưa đăng nhập hoặc chưa có tài khoản | Vào phòng bạn bè nhanh nhất | Phải đăng nhập/đăng ký bằng Google trước khi vào phòng; sau đó trở thành ACT-03 |
| ACT-05 | Hệ thống | Tác nhân tự động của sản phẩm | Vận hành ván chơi công bằng | Sinh bộ vé, quay số ngẫu nhiên theo nhịp, phát tiếng rao, kiểm tra Kinh, xử lý hết hạn phòng/link |
| ACT-06 | Google | Dịch vụ xác thực bên ngoài | — | Xác nhận danh tính người dùng; là cách đăng nhập duy nhất |
| ACT-07 | Đội phát triển | Người làm sản phẩm, ngoài ứng dụng | Chuẩn bị kho tiếng rao | Tạo bộ audio rao bằng AI một lần rồi nạp vào sản phẩm; không có màn quản trị trong app (Q-018) |

Quan hệ giữa actors:
- ACT-04 → sau khi đăng nhập trở thành ACT-01 và vào phòng thành ACT-03.
- ACT-02 là một ACT-03 có thêm quyền host. Mỗi phòng có đúng 1 host tại một thời điểm. Quyền host chuyển được cho thành viên khác (Q-017).
- Một người chỉ ở một phòng tại một thời điểm, nên chỉ có một vai trò trong phòng đó.

## 4. Entities

### ENT-01 Tài khoản người dùng
- **Mô tả:** Danh tính người chơi, tạo tự động khi đăng nhập Google lần đầu.
- **Thuộc tính nghiệp vụ:**
  | Thuộc tính | Ý nghĩa | Bắt buộc? | Ràng buộc nghiệp vụ |
  |---|---|---|---|
  | Tên hiển thị | Tên lấy từ Google | Có | |
  | Ảnh đại diện | Lấy từ Google | Không | |
  | Email Google | Định danh | Có | Duy nhất |
  | Phòng hiện tại | Phòng đang tham gia | Không | Tối đa 1 (Q-023) |
- **Vòng đời:** Không có trạng thái riêng.
- **Quan hệ:** 1 tài khoản có nhiều lần tham gia phòng (ENT-03) theo thời gian, nhưng chỉ 1 lần còn hiệu lực.
- **Ai được tạo / xem / sửa / xóa:** Hệ thống tạo khi đăng nhập lần đầu. Thành viên cùng phòng xem tên và ảnh. Không sửa/xóa trong MVP (Q-024).

### ENT-02 Phòng
- **Mô tả:** Không gian chơi riêng của một nhóm, chỉ vào được bằng link mời (Q-022).
- **Thuộc tính nghiệp vụ:**
  | Thuộc tính | Ý nghĩa | Bắt buộc? | Ràng buộc nghiệp vụ |
  |---|---|---|---|
  | Tên phòng | Tên do host đặt | Không | Mặc định "Phòng của <tên host>" (Q-024) |
  | Host hiện tại | Người giữ quyền host | Có | Đúng 1 người, phải là thành viên đang trong phòng |
  | Thời điểm tạo | | Có | |
  | Thời điểm hết hạn | Tạo + 8 giờ | Có | Q-014 |
  | Nhịp quay | Số giây giữa 2 lần quay | Có | Host chỉnh; 3–15 giây, mặc định 5 giây (Q-024) |
  | Danh sách bị chặn | Người đã bị kick | Không | Q-015 |
- **Vòng đời:** `Đang hoạt động → Chờ đóng (hết 8h nhưng còn ván đang chạy) → Đã đóng`; `Đang hoạt động → Đã đóng` (hết 8h, không có ván chạy hoặc ván đang treo vì host out – Q-021; hoặc người cuối cùng rời phòng – Q-026).
- **Quan hệ:** 1 phòng có 1–16 thành viên (ENT-03), 1 bộ vé hiện hành (ENT-06), nhiều link mời (ENT-04), nhiều ván (ENT-05) nhưng tối đa 1 ván chưa kết thúc, nhiều tin nhắn chat (ENT-10).
- **Ai được tạo / xem / sửa / xóa:** ACT-01 tạo (khi không ở phòng nào). Thành viên xem. Host sửa nhịp quay (tên phòng chỉ đặt khi tạo). Không xóa tay; hệ thống đóng khi hết hạn (BIZ-14) hoặc khi người cuối cùng rời (BIZ-11). Phòng đã đóng chỉ còn để tra lịch sử (Q-024).

### ENT-03 Thành viên phòng
- **Mô tả:** Việc một người dùng có mặt trong một phòng.
- **Thuộc tính nghiệp vụ:**
  | Thuộc tính | Ý nghĩa | Bắt buộc? | Ràng buộc nghiệp vụ |
  |---|---|---|---|
  | Người dùng | | Có | |
  | Vai trò | Host / Player | Có | Đúng 1 host mỗi phòng |
  | Thời điểm vào | | Có | Dùng sắp thứ tự |
  | Online/offline | Đang kết nối hay không | Có | Offline vẫn giữ chỗ và vé (Q-024) |
  | Mode dò số | Tự dò / Auto | Có | Mặc định Tự dò (Q-003, Q-005) |
  | Tiếng rao | Bật / Tắt | Có | Mặc định Bật (Q-020) |
- **Vòng đời:** `Trong phòng → Đã rời | Bị kick`. Đã rời có thể vào lại bằng link còn hạn nếu phòng chưa đầy (Q-024). Bị kick thì bị chặn khỏi phòng đó (Q-015).
- **Quan hệ:** thuộc 1 phòng, 1 người dùng; giữ 0–2 vé (ENT-07).
- **Ai được tạo / xem / sửa / xóa:** Hệ thống tạo khi người dùng vào bằng link hoặc tạo phòng. Mọi thành viên xem danh sách. Người đó tự sửa mode dò/tiếng rao; host đổi vai trò khi chuyển quyền. Kết thúc bằng rời phòng (tự làm) hoặc kick (host).

### ENT-04 Link mời
- **Mô tả:** Đường link host tạo để gửi qua Messenger/Telegram/Zalo...
- **Thuộc tính nghiệp vụ:**
  | Thuộc tính | Ý nghĩa | Bắt buộc? | Ràng buộc nghiệp vụ |
  |---|---|---|---|
  | Phòng | | Có | |
  | Người tạo | Host lúc tạo | Có | |
  | Thời điểm hết hạn | Tạo + 8 giờ | Có | Q-016; không vượt quá khi phòng đóng |
- **Vòng đời:** `Còn hiệu lực → Hết hạn` (quá 8 giờ hoặc phòng đóng).
- **Quan hệ:** 1 phòng có nhiều link.
- **Ai được tạo / xem / sửa / xóa:** Chỉ host tạo (Q-024). Không sửa/xóa; tự hết hạn.

### ENT-05 Ván
- **Mô tả:** Một lần chơi trong phòng; hệ thống tự tạo ở trạng thái Chờ bắt đầu (khi tạo phòng và khi ván trước kết thúc – Q-025), host bấm Bắt đầu để chơi.
- **Thuộc tính nghiệp vụ:**
  | Thuộc tính | Ý nghĩa | Bắt buộc? | Ràng buộc nghiệp vụ |
  |---|---|---|---|
  | Số thứ tự ván trong phòng | | Có | |
  | Các vé tham gia | Vé đang có người giữ lúc bắt đầu | Có | ≥ 1 vé (Q-024) |
  | Dãy số đã rao | Theo thứ tự | — | Không trùng, trong 1–90 |
  | Người thắng | Danh sách vé + người kinh đúng | Không | Có thể nhiều (Q-007, Q-013) |
  | Lý do tạm dừng | Host bấm / host out / đang kiểm tra Kinh | Không | |
  | Thời điểm bắt đầu, kết thúc | | | |
- **Vòng đời:** `Chờ bắt đầu → Đang quay ⇄ Tạm dừng → Đang chờ đồng kinh → Kết thúc`; `Chờ bắt đầu | Tạm dừng → Đã hủy` (phòng hết hạn khi ván chờ hoặc treo – Q-021; người cuối cùng rời phòng – Q-026); `Đang quay → Kết thúc (không ai thắng)` khi rao hết 90 số (Q-024).
- **Quan hệ:** thuộc 1 phòng; dùng bộ vé hiện hành; có nhiều lượt báo Kinh (ENT-11).
- **Ai được tạo / xem / sửa / xóa:** Host tạo/bắt đầu/tạm dừng/tiếp tục. Hệ thống quay số, kết thúc, hủy. Thành viên xem trực tiếp và xem lại trong lịch sử ván (Q-020). Không xóa.

### ENT-06 Bộ vé
- **Mô tả:** 16 vé của phòng, chia 8 cặp màu; hai vé cùng màu bổ sung nhau phủ đủ đúng 90 số (Q-008, Q-009).
- **Thuộc tính nghiệp vụ:**
  | Thuộc tính | Ý nghĩa | Bắt buộc? | Ràng buộc nghiệp vụ |
  |---|---|---|---|
  | 16 vé | | Có | 8 màu × 2 vé |
  | Thời điểm tạo | | Có | |
- **Vòng đời:** `Hiện hành → Đã thay thế` (khi host tạo bộ mới).
- **Quan hệ:** 1 phòng có nhiều bộ vé theo thời gian, đúng 1 bộ hiện hành. Bộ vé giữ qua nhiều ván (Q-012).
- **Ai được tạo / xem / sửa / xóa:** Hệ thống sinh ngẫu nhiên khi tạo phòng (Q-024). Host yêu cầu tạo lại khi không ai giữ vé và không có ván đang chạy. Thành viên xem toàn bộ vé để chọn.

### ENT-07 Vé
- **Mô tả:** Tấm vé lô tô truyền thống 9 hàng × 9 cột (Q-001).
- **Thuộc tính nghiệp vụ:**
  | Thuộc tính | Ý nghĩa | Bắt buộc? | Ràng buộc nghiệp vụ |
  |---|---|---|---|
  | Màu | 1 trong 8 màu | Có | Đúng 2 vé mỗi màu |
  | Lưới số | 9 hàng × 9 cột | Có | Mỗi hàng 5 số + 4 ô trống; cột 1: 1–9, cột 2: 10–19, ..., cột 9: 80–90; 45 số/vé không trùng |
  | Người giữ | | Không | Mỗi người tối đa 2 vé |
  | Ô đã đánh dấu | Theo người giữ trong ván | Không | Mode auto tự đánh dấu (Q-005) |
- **Vòng đời:** `Trống → Đang giữ → Trống` (bỏ vé, rời phòng, bị kick). Không đổi người giữ khi ván đang chạy (Q-012).
- **Quan hệ:** thuộc 1 bộ vé; có 1 vé "cặp" cùng màu; 0–1 người giữ.
- **Ai được tạo / xem / sửa / xóa:** Hệ thống sinh. Mọi thành viên xem. Player lấy/bỏ. Người giữ đánh dấu ô.

> ~~ENT-08 Lượt quay số~~ (gộp vào ENT-05 "Dãy số đã rao")

### ENT-11 Lượt báo Kinh
- **Mô tả:** Mỗi lần người chơi bấm "Kinh" cho một vé.
- **Thuộc tính nghiệp vụ:**
  | Thuộc tính | Ý nghĩa | Bắt buộc? | Ràng buộc nghiệp vụ |
  |---|---|---|---|
  | Ván, vé, người báo | | Có | Chỉ người giữ vé |
  | Thời điểm | | Có | |
  | Kết quả | Kinh đúng / Kinh hụt | Có | Đúng khi có 1 hàng đủ 5 số đều đã rao (kể cả rao từ trước – Q-011) |
- **Vòng đời:** `Đang kiểm tra → Đúng | Hụt`.
- **Quan hệ:** thuộc 1 ván.
- **Ai được tạo / xem / sửa / xóa:** Player tạo; hệ thống kết luận; cả phòng thấy kết quả (Q-006).

### ENT-09 Tiếng rao
- **Mô tả:** Kho audio giọng rao lô tô làm sẵn bằng AI (Q-018).
- **Thuộc tính nghiệp vụ:**
  | Thuộc tính | Ý nghĩa | Bắt buộc? | Ràng buộc nghiệp vụ |
  |---|---|---|---|
  | Loại | Rao số / Câu nối / Chúc mừng / Kinh hụt (Q-024) | Có | |
  | Số áp dụng | 1–90 với loại rao số | Với rao số | Mỗi số ≥ 1 câu rao; nhiều câu thì chọn ngẫu nhiên (Q-024) |
- **Vòng đời:** Không có.
- **Quan hệ:** độc lập, dùng chung mọi phòng.
- **Ai được tạo / xem / sửa / xóa:** ACT-07 nạp ngoài ứng dụng. Thành viên chỉ nghe.

### ENT-10 Tin nhắn chat
- **Mô tả:** Tin nhắn text/emoji trong phòng (Q-020).
- **Thuộc tính nghiệp vụ:**
  | Thuộc tính | Ý nghĩa | Bắt buộc? | Ràng buộc nghiệp vụ |
  |---|---|---|---|
  | Người gửi, nội dung, thời điểm | | Có | Nội dung không rỗng, tối đa 500 ký tự (Q-024) |
- **Vòng đời:** Không có.
- **Quan hệ:** thuộc 1 phòng.
- **Ai được tạo / xem / sửa / xóa:** Thành viên đang trong phòng gửi; mọi thành viên xem toàn bộ tin từ đầu phòng (Q-024). Không sửa/xóa (Q-024).
