# Business Specification: Lô Tô Online

> Nguồn: `idea/raw-idea.md` · Nhật ký quyết định: `idea/_qa-log.md` (Q-001..Q-029) · Cập nhật: 2026-11-18 (bổ sung từ Phase 2: Q-030..Q-041; Phase 3: Q-046, Q-048, Q-051, Q-052)

## 1. Tổng quan
- **Vấn đề cần giải quyết:** Nhóm bạn bè/gia đình muốn chơi lô tô cùng nhau khi không ngồi chung một chỗ, vẫn giữ được không khí rao lô tô truyền thống.
- **Mục tiêu sản phẩm:** Phòng chơi lô tô online riêng tư: vào nhanh bằng link mời, vé lô tô truyền thống, quay số tự động có giọng rao lô tô, báo Kinh và chúc mừng người thắng.
- **Phạm vi (in-scope):**
  - Đăng nhập bằng Google.
  - Tạo phòng (tối đa 16 người, sống 8 giờ), mời bằng link qua Messenger/Telegram/Zalo...
  - Bộ vé 16 vé (8 cặp màu), lấy/bỏ vé, host tạo lại bộ vé.
  - Ván chơi: bắt đầu, tạm dừng, nhịp quay, quay số ngẫu nhiên kèm tiếng rao và câu nối, dò số (Tự dò/Auto), báo Kinh, đồng thắng, chúc mừng.
  - Host kick player; rời phòng (trừ host), chat trong phòng, lịch sử ván, bật/tắt tiếng.
  - Kho tiếng rao làm sẵn bằng AI (đội phát triển chuẩn bị ngoài ứng dụng).
- **Ngoài phạm vi (out-of-scope):**
  - Tiền thật, đặt cược, giá vé, điểm thưởng, bảng xếp hạng (Q-019).
  - Sảnh phòng công khai, tìm phòng (Q-022).
  - Màn quản trị trong ứng dụng; tạo tiếng rao real-time (Q-018).
  - Đăng nhập bằng cách khác ngoài Google; xóa tài khoản.
  - Lưu diễn biến chi tiết của ván (dãy số đã rao, kinh hụt) sau khi ván kết thúc (cập nhật từ Phase 2 – Q-031).
  - Thông báo ngoài ứng dụng (push), đa ngôn ngữ (Q-030).

## 2. Glossary
| Thuật ngữ | Định nghĩa |
|---|---|
| Phòng | Không gian chơi riêng của một nhóm, tối đa 16 thành viên, tồn tại 8 giờ. |
| Host | Thành viên giữ quyền điều khiển phòng; mặc định là người tạo phòng. |
| Player | Thành viên của phòng (host cũng là player). |
| Link mời | Đường link host tạo để mời người khác vào phòng, hạn 8 giờ. |
| Ván | Một lần chơi trong phòng, từ khi host bấm Bắt đầu tới khi có người thắng hoặc rao hết số. |
| Bộ vé | 16 vé của phòng, gồm 8 cặp màu. |
| Cặp vé | Hai vé cùng màu, không trùng số, gộp lại đủ đúng các số 1–90. |
| Vé | Tấm vé lô tô 9 hàng × 9 cột, mỗi hàng 5 số và 4 ô trống. |
| Rao số | Hệ thống công bố một số ngẫu nhiên kèm câu rao. |
| Câu nối | Câu rao vui phát xen giữa các số. |
| Nhịp quay | Số giây giữa hai lần rao số (3–15, mặc định 5). |
| Tự dò | Mode mặc định: player tự đánh dấu số trên vé. |
| Auto | Mode hệ thống tự đánh dấu số đã rao trên vé; player vẫn tự bấm Kinh. |
| Kinh | Báo thắng: vé có một hàng đủ 5 số đều đã được rao. |
| Kinh hụt | Báo Kinh sai; cả phòng được thông báo, không bị phạt. |
| Cửa sổ đồng kinh | 5 giây sau lượt Kinh đúng đầu tiên; mọi lượt Kinh đúng trong thời gian này đều thắng. |
| Thu hồi vé | Host trả vé của một thành viên đang offline về bộ vé. |
| Kick | Host đưa một thành viên ra khỏi phòng và chặn họ vào lại. |
| Kho tiếng rao | Bộ audio giọng rao làm sẵn: rao 90 số, câu nối, chúc mừng, kinh hụt. |

## 3. Actors
| ID | Tên | Mô tả | Mục tiêu chính | Quyền/giới hạn |
|---|---|---|---|---|
| ACT-01 | Người dùng | Người đã đăng nhập bằng Google, chưa ở trong phòng nào | Tạo phòng hoặc vào phòng bạn bè để chơi | Chỉ ở tối đa 1 phòng tại 1 thời điểm; đang ở phòng thì không tạo phòng mới (Q-023) |
| ACT-02 | Host (chủ phòng) | Thành viên giữ quyền điều khiển phòng; mặc định là người tạo phòng | Tổ chức ván chơi cho nhóm | Chia sẻ link mời, bắt đầu/tạm dừng/tiếp tục ván, chỉnh nhịp quay, tạo lại bộ vé, kick player. Phòng chỉ có 1 host cố định, không chuyển quyền, host không rời phòng được (cập nhật từ Phase 3 – Q-048). Đồng thời chơi như Player (Q-024) |
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
  | Tên hiển thị | Mặc định lấy từ Google, user đổi được | Có | BR-27 (cập nhật từ Phase 2 – Q-032) |
  | Ảnh đại diện | Mặc định lấy từ Google; user tải ảnh lên hoặc chọn avatar có sẵn | Không | BR-27 (cập nhật từ Phase 2 – Q-032) |
  | Email Google | Định danh | Có | Duy nhất |
  | Phòng hiện tại | Phòng đang tham gia | Không | Tối đa 1 (Q-023) |
- **Vòng đời:** Không có trạng thái riêng.
- **Quan hệ:** 1 tài khoản có nhiều lần tham gia phòng (ENT-03) theo thời gian, nhưng chỉ 1 lần còn hiệu lực.
- **Ai được tạo / xem / sửa / xóa:** Hệ thống tạo khi đăng nhập lần đầu. Thành viên cùng phòng xem tên và ảnh. Chủ tài khoản sửa tên hiển thị và ảnh (BIZ-16). Không xóa trong MVP (cập nhật từ Phase 2 – Q-032).

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
- **Vòng đời:** `Đang hoạt động → Chờ đóng (hết 8h nhưng còn ván đang chạy) → Đã đóng`; `Đang hoạt động → Đã đóng` (hết 8h, ván chưa bắt đầu). Phòng chỉ đóng khi hết hạn (cập nhật từ Phase 3 – Q-048).
- **Quan hệ:** 1 phòng có 1–16 thành viên (ENT-03), 1 bộ vé hiện hành (ENT-06), nhiều link mời (ENT-04), nhiều ván (ENT-05) nhưng tối đa 1 ván chưa kết thúc, nhiều tin nhắn chat (ENT-10).
- **Ai được tạo / xem / sửa / xóa:** ACT-01 tạo (khi không ở phòng nào). Thành viên xem. Host sửa nhịp quay (tên phòng chỉ đặt khi tạo). Không xóa tay; hệ thống đóng khi hết hạn (BIZ-14) (cập nhật từ Phase 3 – Q-048). Phòng đã đóng không còn xem được, kể cả lịch sử ván (cập nhật từ Phase 2 – Q-039).

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
  | Dãy số đã rao | Theo thứ tự | — | Không trùng, trong 1–90; chỉ dùng trong lúc ván diễn ra, không lưu lại sau khi ván kết thúc (cập nhật từ Phase 2 – Q-031) |
  | Người thắng | Danh sách vé + người kinh đúng | Không | Có thể nhiều (Q-007, Q-013) |
  | Lý do tạm dừng | Host bấm / host out / đang kiểm tra Kinh | Không | |
  | Thời điểm bắt đầu, kết thúc | | | |
- **Vòng đời:** `Chờ bắt đầu → Đang quay ⇄ Tạm dừng → Đang chờ đồng kinh → Chờ host xác nhận → Kết thúc` (cập nhật từ Phase 2 – Q-035); `Chờ bắt đầu → Đã hủy` (phòng hết hạn khi ván chưa bắt đầu (cập nhật từ Phase 3 – Q-048)); `Đang quay → Kết thúc (không ai thắng)` khi rao hết 90 số (Q-024).
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
- **Vòng đời:** `Trống → Đang giữ → Trống` (bỏ vé, thu hồi, rời phòng, bị kick khi không có ván); `Đang giữ → Bị khóa → Trống` (rời/bị kick khi ván đang diễn ra, mở khóa khi ván kết thúc – cập nhật từ Phase 2, làm rõ BR-22). Không đổi người giữ khi ván đang chạy (Q-012).
- **Quan hệ:** thuộc 1 bộ vé; có 1 vé "cặp" cùng màu; 0–1 người giữ.
- **Ai được tạo / xem / sửa / xóa:** Hệ thống sinh. Mọi thành viên xem. Player lấy/bỏ. Người giữ đánh dấu ô.

> ~~ENT-08 Lượt quay số~~ (gộp vào ENT-05 "Dãy số đã rao")

### ENT-11 Lượt báo Kinh
> Chỉ lượt Kinh đúng (người thắng) được lưu lại sau khi ván kết thúc; kinh hụt chỉ thông báo trong lúc chơi (cập nhật từ Phase 2 – Q-031).

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

## 5. Businesses

### BIZ-01 Đăng nhập bằng Google
- **Mục tiêu:** Người dùng có danh tính để chơi, không cần tạo mật khẩu.
- **Actor:** ACT-01/ACT-04 (chính), ACT-06 Google (liên quan)
- **Trigger:** Mở ứng dụng khi chưa đăng nhập, hoặc mở link mời khi chưa đăng nhập.
- **Điều kiện trước:** Có tài khoản Google.
- **Input (business):**
  | Thông tin | Nguồn | Bắt buộc? |
  |---|---|---|
  | Xác nhận đăng nhập Google | Google | Có |
  | Link mời đang mở (nếu có) | Hệ thống | Không |
- **Output (business):** Lần đầu: tạo tài khoản (ENT-01) với tên, ảnh, email từ Google. Sau đăng nhập: nếu đang ở một phòng thì vào thẳng phòng đó; nếu đến từ link mời thì tiếp tục BIZ-03; còn lại về trang chủ (tạo phòng).
- **Điều kiện sau:** Người dùng đã đăng nhập.
- **Business rules:** BR-01
- **Ngoại lệ:** Người dùng hủy đăng nhập Google, quay lại màn đăng nhập. Google lỗi thì báo thử lại. Mở link trong ứng dụng chat không cho đăng nhập Google (Zalo/Messenger...) → hướng dẫn "Mở bằng trình duyệt", giữ nguyên link mời (cập nhật từ Phase 2 – Q-041).
- **Đăng xuất** (cập nhật từ Phase 3 – Q-052): đăng xuất = **thoát phòng**. Player → rời phòng (như BIZ-11). Host → **đóng phòng cho mọi người** (ván chờ bị hủy, mọi người về trang chủ). Khi ván đang diễn ra thì **không đăng xuất được** (nút bị khóa).
- **Entities liên quan:** ENT-01

### BIZ-02 Tạo phòng
- **Mục tiêu:** Host có phòng riêng để mời bạn chơi.
- **Actor:** ACT-01 (trở thành ACT-02)
- **Trigger:** Người dùng bấm "Tạo phòng".
- **Điều kiện trước:** Đã đăng nhập, không ở phòng nào (BR-02).
- **Input (business):**
  | Thông tin | Nguồn | Bắt buộc? |
  |---|---|---|
  | Tên phòng | Người dùng nhập | Không (mặc định "Phòng của <tên>") |
- **Output (business):** Phòng mới (ENT-02, Đang hoạt động, hết hạn sau 8 giờ); người tạo là thành viên vai trò Host (ENT-03); bộ vé 16 vé sinh ngẫu nhiên (ENT-06, ENT-07); ván đầu tiên ở trạng thái Chờ bắt đầu (ENT-05); nhịp quay mặc định 5 giây.
- **Điều kiện sau:** Host ở trong phòng, có thể tạo link mời.
- **Business rules:** BR-02, BR-04, BR-07, BR-08
- **Ngoại lệ:** Đang ở phòng khác thì từ chối, gợi ý quay lại phòng đó.
- **Entities liên quan:** ENT-02, ENT-03, ENT-05, ENT-06, ENT-07

### BIZ-03 Mời & tham gia phòng
- **Mục tiêu:** Host đưa bạn bè vào phòng qua Messenger/Telegram/Zalo...
- **Actor:** ACT-02 (tạo, chia sẻ link), ACT-04/ACT-01 (mở link, vào phòng)
- **Trigger:** Host bấm "Mời"; khách mở link.
- **Điều kiện trước:** Phòng đang hoạt động.
- **Input (business):**
  | Thông tin | Nguồn | Bắt buộc? |
  |---|---|---|
  | Yêu cầu tạo link | Host | Có |
  | Kênh chia sẻ | Host chọn (copy link / chia sẻ qua ứng dụng trên máy) | Không |
  | Link mời | Khách mở | Có |
  | Đăng nhập | BIZ-01 | Có |
- **Output (business):** Link mời (ENT-04) hết hạn sau 8 giờ. Khách hợp lệ trở thành thành viên Player (ENT-03); cả phòng thấy người mới vào. Nếu còn vé trống thì khách được lấy vé ở ván chờ; hết vé thì ở lại xem và chờ.
- **Điều kiện sau:** Khách ở trong phòng.
- **Business rules:** BR-02, BR-03, BR-05, BR-06, BR-25
- **Ngoại lệ:** Link hết hạn / phòng đã đóng → báo "Link không còn hiệu lực". Phòng đủ 16 → báo "Phòng đã đầy". Người bị kick → báo không được vào. Khách đang ở phòng khác → báo phải rời phòng đó trước. Khách đã là thành viên → vào thẳng phòng.
- **Entities liên quan:** ENT-02, ENT-03, ENT-04

### BIZ-04 Tạo lại bộ vé
- **Mục tiêu:** Host đổi sang bộ vé mới cho cả phòng.
- **Actor:** ACT-02
- **Trigger:** Host bấm "Tạo bộ vé mới".
- **Điều kiện trước:** Ván hiện tại ở trạng thái Chờ bắt đầu; không còn ai giữ vé (BR-12).
- **Input (business):**
  | Thông tin | Nguồn | Bắt buộc? |
  |---|---|---|
  | Yêu cầu tạo bộ mới | Host | Có |
  | Vé cần thu hồi của người offline | Host chọn | Không |
- **Output (business):** Host có thể thu hồi vé của thành viên đang offline (vé về Trống). Bộ vé cũ chuyển Đã thay thế; bộ mới 16 vé được sinh; cả phòng thấy bộ vé mới.
- **Điều kiện sau:** Bộ vé mới hiện hành, mọi vé Trống.
- **Business rules:** BR-08, BR-12, BR-13
- **Ngoại lệ:** Còn người online giữ vé → từ chối, hiển thị ai đang giữ. Thu hồi vé người đang online → không cho phép.
- **Entities liên quan:** ENT-06, ENT-07, ENT-03

### BIZ-05 Lấy / bỏ vé
- **Mục tiêu:** Player chọn vé để chơi ván tới.
- **Actor:** ACT-03 (gồm host)
- **Trigger:** Player chọn một vé trống / bỏ vé đang giữ.
- **Điều kiện trước:** Ván hiện tại ở Chờ bắt đầu (BR-10).
- **Input (business):**
  | Thông tin | Nguồn | Bắt buộc? |
  |---|---|---|
  | Vé chọn (màu, vé số mấy trong cặp) | Player | Có |
- **Output (business):** Lấy: vé chuyển Đang giữ, gắn với player; cả phòng thấy vé đó đã có chủ. Bỏ: vé về Trống, người khác lấy được.
- **Điều kiện sau:** Player giữ 0–2 vé.
- **Business rules:** BR-09, BR-10, BR-11
- **Ngoại lệ:** Đã giữ 2 vé → từ chối. Hai người cùng chọn 1 vé → người đến trước được, người sau báo vé đã có chủ. Ván đang chạy → không cho lấy/bỏ. Hết vé → player ở lại xem, chờ ván sau.
- **Entities liên quan:** ENT-07, ENT-03

### BIZ-06 Điều khiển ván
- **Mục tiêu:** Host điều khiển nhịp chơi.
- **Actor:** ACT-02 (chính), ACT-05 (tạm dừng tự động)
- **Trigger:** Host bấm Bắt đầu / Tạm dừng / Tiếp tục / đổi nhịp quay.
- **Điều kiện trước:** Bắt đầu: ván Chờ bắt đầu, có ≥ 1 vé được giữ (BR-14), phòng chưa quá hạn. Tạm dừng/Tiếp tục: ván đang chạy.
- **Input (business):**
  | Thông tin | Nguồn | Bắt buộc? |
  |---|---|---|
  | Lệnh điều khiển | Host | Có |
  | Nhịp quay (giây/số) | Host | Khi đổi nhịp |
- **Output (business):** Bắt đầu: ván Đang quay, chốt các vé tham gia, khóa lấy/bỏ vé, BIZ-07 chạy. Tạm dừng/Tiếp tục: ván Tạm dừng ⇄ Đang quay, cả phòng thấy trạng thái. Đổi nhịp: áp dụng từ số kế tiếp. Host mất kết nối: ván vẫn chạy bình thường; nếu tới bước chờ host xác nhận mà host chưa quay lại thì ván đứng chờ — chấp nhận (cập nhật từ Phase 3 – Q-048).
- **Điều kiện sau:** Trạng thái ván cập nhật cho mọi người.
- **Business rules:** BR-07, BR-14, BR-15, BR-16
- **Ngoại lệ:** Không có vé nào được giữ → không cho bắt đầu. Phòng đang Chờ đóng → không cho bắt đầu ván mới.
- **Entities liên quan:** ENT-05, ENT-02

### BIZ-07 Quay số & rao
- **Mục tiêu:** Ra số ngẫu nhiên công bằng, có không khí lô tô.
- **Actor:** ACT-05 (chính), ACT-03 (nghe, xem)
- **Trigger:** Thời gian — mỗi N giây khi ván Đang quay. Khi host bấm Bắt đầu, hệ thống **rao ngay số đầu tiên**; các số sau: thiết bị của host báo hệ thống tới nhịp, nếu host không phản hồi thì lần lượt từng player (theo vé nhỏ nhất họ giữ, cách nhau 5 giây) báo thay; hệ thống tự chọn số, chỉ nhận một lần mỗi nhịp và từ chối báo sớm (cập nhật từ Phase 3 – Q-052).
- **Điều kiện trước:** Ván Đang quay, còn số chưa rao.
- **Input (business):**
  | Thông tin | Nguồn | Bắt buộc? |
  |---|---|---|
  | Các số đã rao | Hệ thống | Có |
  | Nhịp quay | Phòng | Có |
  | Kho tiếng rao | ENT-09 | Có |
- **Output (business):** Số mới (chưa rao, 1–90) thêm vào dãy số đã rao; mọi thành viên thấy số mới và toàn bộ số đã rao; phát câu rao cho số đó, xen câu nối giữa các số; vé của player để mode Auto được tự đánh dấu. Người tắt tiếng thì không nghe nhưng vẫn thấy số.
- **Điều kiện sau:** Dãy số đã rao tăng 1.
- **Business rules:** BR-15, BR-19, BR-20
- **Ngoại lệ:** Đã rao đủ 90 số mà không ai kinh đúng → ván Kết thúc không người thắng (BR-19). Đang có lượt Kinh chờ kiểm tra hoặc ván tạm dừng → không quay.
- **Entities liên quan:** ENT-05, ENT-09, ENT-07

### BIZ-08 Dò số & báo Kinh
- **Mục tiêu:** Player dò vé và giành chiến thắng.
- **Actor:** ACT-03 (chính), ACT-05 (kiểm tra, chúc mừng), ACT-02 (xác nhận kết thúc ván – Q-035)
- **Trigger:** Player đánh dấu ô (mode Tự dò); player bấm "Kinh".
- **Điều kiện trước:** Ván Đang quay hoặc Đang chờ đồng kinh; player giữ vé tham gia ván và còn trong phòng.
- **Input (business):**
  | Thông tin | Nguồn | Bắt buộc? |
  |---|---|---|
  | Ô đánh dấu | Player (Tự dò) / hệ thống (Auto) | Không |
  | Vé báo Kinh | Player | Có |
- **Output (business):** Bấm Kinh: ván tạm dừng quay, hệ thống kiểm tra (ENT-11).
  - Hụt: cả phòng thấy "<tên> kinh hụt", phát tiếng kinh hụt, quay tiếp.
  - Đúng: mở cửa sổ đồng kinh 5 giây; hết cửa sổ thì ván chuyển Chờ host xác nhận; host thấy danh sách vé/hàng thắng và bấm "Xác nhận kết thúc ván" (cập nhật từ Phase 2 – Q-035). Ván Kết thúc; cả phòng thấy người thắng, vé thắng, hàng thắng; phát tiếng chúc mừng. Hệ thống tạo ván mới ở Chờ bắt đầu; vé vẫn thuộc người giữ.
- **Điều kiện sau:** Ván kết thúc hoặc tiếp tục quay.
- **Business rules:** BR-17, BR-18, BR-20, BR-07, BR-28
- **Ngoại lệ:** Bấm Kinh cho vé không thuộc mình hoặc vé không tham gia ván → từ chối. Nhiều người bấm cùng lúc → kiểm tra lần lượt, ai đúng đều thắng nếu trong cửa sổ đồng kinh. Bấm Kinh khi ván tạm dừng do host → (Q-029) vẫn nhận và kiểm tra.
- **Entities liên quan:** ENT-05, ENT-07, ENT-11, ENT-09

### BIZ-09 Chuẩn bị kho tiếng rao
- **Mục tiêu:** Có bộ giọng rao lô tô cho mọi số, câu nối, chúc mừng, kinh hụt.
- **Actor:** ACT-07
- **Trigger:** Trước khi phát hành; khi muốn đổi bộ tiếng.
- **Điều kiện trước:** Có nguồn audio mẫu.
- **Input (business):** Audio mẫu giọng rao; danh sách câu rao cho 90 số, câu nối, câu chúc mừng, câu kinh hụt.
- **Output (business):** Kho tiếng rao (ENT-09) đầy đủ, mỗi số ≥ 1 câu.
- **Business rules:** BR-26
- **Ngoại lệ:** Thiếu câu rao cho một số → (Q-029) chỉ hiển thị số, không phát tiếng.
- **Ghi chú:** Thực hiện ngoài ứng dụng, không có màn quản trị (Q-018).
- **Entities liên quan:** ENT-09

### BIZ-10 Kick player
> (cập nhật từ Phase 3 – Q-048: bỏ chuyển host; chỉ kick người đã lấy vé)
- **Mục tiêu:** Host giữ trật tự phòng.
- **Actor:** ACT-02
- **Trigger:** Host bấm Kick trên một player.
- **Điều kiện trước:** Người đích là player (đã lấy vé ở ván hiện tại), không phải chính host.
- **Input (business):**
  | Thông tin | Nguồn | Bắt buộc? |
  |---|---|---|
  | Player đích | Host chọn | Có |
- **Output (business):** Kick: thành viên chuyển Bị kick, thêm vào danh sách chặn, bị đưa ra khỏi phòng và thấy thông báo; vé trả về bộ (nếu ván đang chạy thì vé khóa tới hết ván); cả phòng thấy.
- **Điều kiện sau:** Người bị kick không còn ở phòng, không vào lại được.
- **Business rules:** BR-06, BR-22
- **Ngoại lệ:** Kick trong ván → được, vé khóa tới hết ván. Người chưa lấy vé → không có nút kick.
- **Entities liên quan:** ENT-03, ENT-02, ENT-07

### BIZ-11 Rời phòng
- **Mục tiêu:** Thành viên chủ động rời phòng để làm việc khác hoặc vào phòng khác.
- **Actor:** ACT-03 (trừ host – Q-048)
- **Trigger:** Bấm "Rời phòng".
- **Điều kiện trước:** Đang trong phòng, không phải host; ván không đang diễn ra (cập nhật từ Phase 3 – Q-052).
- **Input (business):** Xác nhận rời.
- **Output (business):** Thành viên Đã rời; vé trả về bộ (ván đang chạy thì khóa tới hết ván); cả phòng thấy.
- **Điều kiện sau:** Người dùng không còn ở phòng nào, có thể tạo/vào phòng khác.
- **Business rules:** BR-21, BR-22, BR-25
- **Ngoại lệ:** Host không có nút Rời phòng; host ở phòng tới khi phòng hết hạn (cập nhật từ Phase 3 – Q-048).
- **Entities liên quan:** ENT-03, ENT-07, ENT-02

### BIZ-12 Chat trong phòng
- **Mục tiêu:** Thành viên giao lưu trong lúc chơi.
- **Actor:** ACT-03
- **Trigger:** Gửi tin nhắn.
- **Điều kiện trước:** Đang trong phòng, phòng chưa đóng.
- **Input (business):** Nội dung (text/emoji) – bắt buộc.
- **Output (business):** Tin nhắn (ENT-10) hiện cho mọi thành viên kèm tên, ảnh, thời điểm. Người vào sau xem được toàn bộ tin cũ.
- **Business rules:** BR-23
- **Ngoại lệ:** Rỗng hoặc > 500 ký tự → không gửi được.
- **Entities liên quan:** ENT-10

### BIZ-13 Xem lịch sử ván
- **Mục tiêu:** Thành viên xem lại các ván đã chơi trong phòng.
- **Actor:** ACT-03
- **Trigger:** Mở "Lịch sử ván".
- **Điều kiện trước:** Đang là thành viên của phòng; phòng chưa đóng (cập nhật từ Phase 2 – Q-039).
- **Input (business):** Phòng; ván chọn xem chi tiết.
- **Output (business):** Danh sách ván: số thứ tự, thời gian bắt đầu/kết thúc, kết quả — người thắng (tên, màu vé) / không ai thắng / đã hủy. Không có diễn biến chi tiết (cập nhật từ Phase 2 – Q-031).
- **Business rules:** —
- **Ngoại lệ:** Chưa có ván kết thúc → hiển thị trống.
- **Entities liên quan:** ENT-05, ENT-11, ENT-07

### BIZ-14 Hết hạn & đóng phòng
- **Mục tiêu:** Phòng tự kết thúc sau 8 giờ.
- **Actor:** ACT-05 (chính), ACT-03 (nhận thông báo)
- **Trigger:** Thời gian — còn 15 phút (thiết bị tự hiện cảnh báo); đến hạn (thiết bị đang mở phòng báo hệ thống, hoặc hệ thống phát hiện ở lần thao tác kế tiếp); ván đang chạy kết thúc khi phòng ở Chờ đóng (cập nhật từ Phase 3 – Q-051).
- **Điều kiện trước:** Phòng Đang hoạt động / Chờ đóng.
- **Input (business):** Thời điểm hết hạn, trạng thái ván hiện tại.
- **Output (business):** Còn 15 phút: cả phòng thấy cảnh báo và đếm ngược. Đến hạn: nếu ván đang chạy bình thường → phòng Chờ đóng, đợi ván kết thúc rồi đóng; nếu ván Chờ bắt đầu → hủy ván, phòng Đã đóng ngay. Phòng đang Chờ đóng mà ván tới bước Chờ host xác nhận → ván tự Kết thúc với người thắng đã xác định, không cần host (Q-042, Q-048). Đóng phòng: mọi thành viên thấy "Phòng đã hết hạn", được đưa về trang chủ; link mời hết hiệu lực; mọi người được tạo/vào phòng khác.
- **Điều kiện sau:** Phòng Đã đóng, không còn xem được (Q-039).
- **Business rules:** BR-04, BR-05
- **Ngoại lệ:** Ván tạm dừng do host bấm (host vẫn online) lúc đến hạn → (Q-029) coi như ván đang chạy, phòng Chờ đóng.
- **Entities liên quan:** ENT-02, ENT-05, ENT-04, ENT-03

### BIZ-15 Cài đặt cá nhân trong phòng
- **Mục tiêu:** Player chọn cách chơi hợp với mình.
- **Actor:** ACT-03
- **Trigger:** Đổi mode dò số / bật-tắt tiếng.
- **Điều kiện trước:** Đang trong phòng.
- **Input (business):** Mode dò (Tự dò / Auto); Tiếng rao (Bật / Tắt).
- **Output (business):** Áp dụng ngay cho người đó. Chuyển sang Auto trong ván: mọi số đã rao trên vé được tự đánh dấu.
- **Business rules:** BR-20
- **Ngoại lệ:** —
- **Entities liên quan:** ENT-03

### BIZ-16 Cập nhật hồ sơ cá nhân
> (cập nhật từ Phase 2 – Q-032)
- **Mục tiêu:** Người dùng hiển thị với tên/ảnh mình muốn ở mọi phòng.
- **Actor:** ACT-01 / ACT-03
- **Trigger:** Mở hồ sơ, đổi tên hoặc ảnh.
- **Điều kiện trước:** Đã đăng nhập.
- **Input (business):**
  | Thông tin | Nguồn | Bắt buộc? |
  |---|---|---|
  | Tên hiển thị mới | Người dùng nhập | Không |
  | Ảnh đại diện mới (tải lên hoặc chọn avatar có sẵn) | Người dùng | Không |
- **Output (business):** Tài khoản (ENT-01) cập nhật tên/ảnh; nếu đang ở phòng, thành viên khác thấy tên/ảnh mới. Có thể khôi phục về tên/ảnh Google.
- **Điều kiện sau:** Tên/ảnh mới dùng ở mọi phòng.
- **Business rules:** BR-27
- **Ngoại lệ:** Tên rỗng hoặc quá dài → không lưu. Ảnh sai định dạng hoặc quá lớn → báo lỗi, giữ ảnh cũ.
- **Entities liên quan:** ENT-01

## 6. Business Rules
| ID | Nội dung | Áp dụng cho |
|---|---|---|
| BR-01 | Chỉ đăng nhập/đăng ký bằng Google. | BIZ-01 |
| BR-02 | Mỗi người chỉ ở tối đa 1 phòng tại một thời điểm; đang ở phòng thì không tạo/vào phòng khác (Q-023). | BIZ-02, BIZ-03 |
| BR-03 | Phòng tối đa 16 thành viên, kể cả host (Q-024). | BIZ-03 |
| BR-04 | Phòng hết hạn sau 8 giờ kể từ khi tạo; cảnh báo trước 15 phút. Đến hạn mà ván đang chạy thì dời đóng tới khi ván kết thúc; ván chưa bắt đầu thì hủy ván và đóng ngay; phòng Chờ đóng mà ván tới bước chờ host xác nhận thì ván tự kết thúc (Q-014, Q-028, Q-042, Q-048). | BIZ-14, BIZ-06 |
| BR-05 | Link mời tạo sẵn cùng lúc tạo phòng, chỉ host thấy nút chia sẻ; link hết hạn khi phòng đóng (tối đa 8 giờ) (Q-016, Q-024; cập nhật từ Phase 3 – Q-046). | BIZ-03, BIZ-14 |
| BR-06 | Người bị kick bị chặn vào lại phòng đó (Q-015). | BIZ-03, BIZ-10 |
| BR-07 | Mỗi phòng tối đa 1 ván chưa kết thúc. Ván ở Chờ bắt đầu được tạo tự động khi tạo phòng và khi ván trước kết thúc (Q-025). | BIZ-02, BIZ-06, BIZ-08 |
| BR-08 | Bộ vé có 16 vé, 8 màu × 2 vé. Vé 9 hàng × 9 cột, mỗi hàng 5 số + 4 ô trống; cột 1: 1–9, cột 2: 10–19, ..., cột 9: 80–90. Hai vé cùng màu không trùng số và gộp lại đủ đúng 1–90 (Q-001, Q-008, Q-009). | BIZ-02, BIZ-04 |
| BR-09 | Mỗi người giữ tối đa 2 vé, tự do chọn (không bắt buộc theo cặp); mỗi vé tối đa 1 người giữ (Q-008). | BIZ-05 |
| BR-10 | Chỉ lấy/bỏ vé khi ván hiện tại ở Chờ bắt đầu (Q-012). | BIZ-05 |
| BR-11 | Vé thuộc người giữ qua các ván, tới khi người đó bỏ, rời phòng, bị kick hoặc bị thu hồi (Q-012). | BIZ-05, BIZ-08 |
| BR-12 | Chỉ tạo lại bộ vé khi ván ở Chờ bắt đầu và không còn ai giữ vé. | BIZ-04 |
| BR-13 | Host được thu hồi vé của thành viên đang offline khi ván ở Chờ bắt đầu (Q-027). | BIZ-04 |
| BR-14 | Chỉ bắt đầu ván khi có ≥ 1 vé được giữ và phòng chưa đến hạn đóng (Q-024). | BIZ-06 |
| BR-15 | Khi ván Đang quay, mỗi N giây rao 1 số ngẫu nhiên chưa rao trong 1–90. N do host chỉnh trong 3–15, mặc định 5, áp dụng từ số kế tiếp (Q-004, Q-024). | BIZ-06, BIZ-07 |
| BR-16 | Ván tạm dừng khi: host bấm tạm dừng; đang kiểm tra Kinh/cửa sổ đồng kinh/chờ host xác nhận. Host mất kết nối không làm tạm dừng ván (Q-010, Q-035, Q-048). | BIZ-06, BIZ-08 |
| BR-17 | Kinh đúng khi vé có ít nhất 1 hàng đủ 5 số đều đã rao, kể cả rao từ trước. Kinh sai = "kinh hụt": báo cả phòng, không phạt (Q-002, Q-006, Q-011). | BIZ-08 |
| BR-18 | Sau kinh đúng đầu tiên, mở cửa sổ 5 giây; mọi lượt kinh đúng trong cửa sổ đều đồng thắng (Q-007, Q-013, Q-024). | BIZ-08 |
| BR-19 | Rao hết 90 số mà không ai kinh đúng thì ván kết thúc không người thắng (Q-024). | BIZ-07 |
| BR-20 | Mỗi player tự chọn mode: Tự dò (mặc định, tự đánh dấu) hoặc Auto (hệ thống tự đánh dấu); cả hai đều phải tự bấm Kinh. Các số đã rao luôn hiển thị cho mọi người. Riêng mode Auto: số vừa rao có trên vé được làm nổi bật, hàng còn thiếu 1 số được đánh dấu "chờ"; mode Tự dò không gợi ý (Q-003, Q-005, Q-034). | BIZ-07, BIZ-08, BIZ-15 |
| BR-21 | Mỗi phòng có đúng 1 host cố định là người tạo; không chuyển quyền host. Host không có nút rời phòng; host **đăng xuất = đóng phòng** cho mọi người. Player đăng xuất = rời phòng. Khi ván đang diễn ra **không ai đăng xuất hoặc rời phòng được** (Q-048, Q-051, Q-052). | BIZ-01, BIZ-11, BIZ-14 |
| BR-22 | Rời phòng/bị kick/bị thu hồi: vé trả về bộ. Nếu ván đang chạy, vé bị khóa (không ai kinh được) tới hết ván rồi mới trống (Q-024). | BIZ-10, BIZ-11 |
| BR-23 | Tin nhắn chat 1–500 ký tự, không sửa/xóa; người vào sau xem được toàn bộ (Q-024). Mỗi người gửi tối đa 5 tin trong 10 giây (cập nhật từ Phase 2 – Q-030). | BIZ-12 |
| ~~BR-24~~ | (đã loại – Q-048) Chuyển quyền host. Thay bằng: host chỉ kick được player (người đã lấy vé ở ván hiện tại). | BIZ-10 |
| BR-25 | Người đã tự rời (không bị kick) vào lại được bằng link còn hạn nếu phòng chưa đầy; vào lại không được trả vé cũ (Q-024). | BIZ-03, BIZ-11 |
| BR-26 | Kho tiếng rao phải có ≥ 1 câu cho mỗi số 1–90, có câu nối, chúc mừng, kinh hụt; mỗi số nhiều câu thì chọn ngẫu nhiên (Q-018, Q-024). | BIZ-07, BIZ-09 |
| BR-28 | Ván chỉ Kết thúc khi host bấm xác nhận, sau khi hết cửa sổ đồng kinh. Host không bác bỏ được lượt Kinh hệ thống đã xác định đúng; host tự kinh thì vẫn tự xác nhận; host offline thì ván chờ host (chấp nhận ván không kết thúc được – Q-048), trừ khi phòng đã quá hạn (BR-04). Trong lúc chờ xác nhận không nhận thêm lượt Kinh và không quay số (cập nhật từ Phase 2 – Q-035, Q-036, Q-037). | BIZ-08, BIZ-14 |
| BR-27 | Tên hiển thị 2–30 ký tự; ảnh đại diện là ảnh JPG/PNG tối đa 5 MB hoặc avatar có sẵn (Q-032). | BIZ-16 |

## 7. Ma trận Actor × Business
| | BIZ-01 | BIZ-02 | BIZ-03 | BIZ-04 | BIZ-05 | BIZ-06 | BIZ-07 | BIZ-08 | BIZ-09 | BIZ-10 | BIZ-11 | BIZ-12 | BIZ-13 | BIZ-14 | BIZ-15 | BIZ-16 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ACT-01 Người dùng | ✔ | ✔ | ✔ vào | | | | | | | | | | | | | ✔ |
| ACT-02 Host | | | ✔ mời | ✔ | ✔ | ✔ | 👁 | ✔ xác nhận | | ✔ kick | | ✔ | 👁 | 👁 | ✔ | ✔ |
| ACT-03 Player | | | 👁 | 👁 | ✔ | 👁 | 👁 | ✔ | | 👁 | ✔ | ✔ | 👁 | 👁 | ✔ | ✔ |
| ACT-04 Khách | ✔ | | ✔ vào | | | | | | | | | | | | | |
| ACT-05 Hệ thống | | ✔ sinh vé | | ✔ sinh vé | | ✔ tự dừng | ✔ | ✔ kiểm tra | | | | | | ✔ | | |
| ACT-06 Google | ✔ | | | | | | | | | | | | | | | |
| ACT-07 Đội phát triển | | | | | | | | | ✔ | | | | | | | |

## 8. Giả định & Câu hỏi mở
| Loại | Nội dung | Ref |
|---|---|---|
| ĐÃ CHỐT (Q-042) | Tên hiển thị 2–30 ký tự; ảnh JPG/PNG ≤ 5 MB. | BR-27 |
| ĐÃ CHỐT (Q-042) | Trong lúc chờ host xác nhận: không nhận thêm Kinh, không quay số. | BR-28 |
| ĐÃ CHỐT (Q-042, Q-048) | Phòng quá hạn 8 giờ mà ván ở/tới bước Chờ host xác nhận: ván tự Kết thúc với người thắng đã xác định, rồi đóng phòng. | BR-04, BR-28 |
| — | Các giả định khác đã được user xác nhận (Q-024, Q-029). | Q-024, Q-029 |
