# Businesses (draft)

> Nguồn: `idea/_draft/actors-entities.md`, `idea/_qa-log.md` (Q-001..Q-028) · Cập nhật: 2026-11-18

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
- **Ngoại lệ:** Người dùng hủy đăng nhập Google, quay lại màn đăng nhập. Google lỗi thì báo thử lại.
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
- **Trigger:** Host bấm Bắt đầu / Tạm dừng / Tiếp tục / đổi nhịp quay; host mất kết nối.
- **Điều kiện trước:** Bắt đầu: ván Chờ bắt đầu, có ≥ 1 vé được giữ (BR-14), phòng chưa quá hạn. Tạm dừng/Tiếp tục: ván đang chạy.
- **Input (business):**
  | Thông tin | Nguồn | Bắt buộc? |
  |---|---|---|
  | Lệnh điều khiển | Host | Có |
  | Nhịp quay (giây/số) | Host | Khi đổi nhịp |
- **Output (business):** Bắt đầu: ván Đang quay, chốt các vé tham gia, khóa lấy/bỏ vé, BIZ-07 chạy. Tạm dừng/Tiếp tục: ván Tạm dừng ⇄ Đang quay, cả phòng thấy trạng thái. Đổi nhịp: áp dụng từ số kế tiếp. Host mất kết nối: ván tự Tạm dừng, cả phòng thấy "Đang chờ host"; host quay lại thì host bấm Tiếp tục.
- **Điều kiện sau:** Trạng thái ván cập nhật cho mọi người.
- **Business rules:** BR-07, BR-14, BR-15, BR-16
- **Ngoại lệ:** Không có vé nào được giữ → không cho bắt đầu. Phòng đang Chờ đóng → không cho bắt đầu ván mới.
- **Entities liên quan:** ENT-05, ENT-02

### BIZ-07 Quay số & rao
- **Mục tiêu:** Ra số ngẫu nhiên công bằng, có không khí lô tô.
- **Actor:** ACT-05 (chính), ACT-03 (nghe, xem)
- **Trigger:** Thời gian — mỗi N giây khi ván Đang quay.
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
- **Actor:** ACT-03 (chính), ACT-05 (kiểm tra, chúc mừng)
- **Trigger:** Player đánh dấu ô (mode Tự dò); player bấm "Kinh".
- **Điều kiện trước:** Ván Đang quay hoặc Đang chờ đồng kinh; player giữ vé tham gia ván và còn trong phòng.
- **Input (business):**
  | Thông tin | Nguồn | Bắt buộc? |
  |---|---|---|
  | Ô đánh dấu | Player (Tự dò) / hệ thống (Auto) | Không |
  | Vé báo Kinh | Player | Có |
- **Output (business):** Bấm Kinh: ván tạm dừng quay, hệ thống kiểm tra (ENT-11).
  - Hụt: cả phòng thấy "<tên> kinh hụt", phát tiếng kinh hụt, quay tiếp.
  - Đúng: mở cửa sổ đồng kinh 5 giây; hết cửa sổ thì ván Kết thúc với danh sách người thắng; cả phòng thấy người thắng, vé thắng, hàng thắng; phát tiếng chúc mừng. Hệ thống tạo ván mới ở Chờ bắt đầu; vé vẫn thuộc người giữ.
- **Điều kiện sau:** Ván kết thúc hoặc tiếp tục quay.
- **Business rules:** BR-17, BR-18, BR-20, BR-07
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

### BIZ-10 Quản lý thành viên
- **Mục tiêu:** Host giữ trật tự phòng, giao quyền điều khiển.
- **Actor:** ACT-02
- **Trigger:** Host bấm Kick / Chuyển host trên một thành viên.
- **Điều kiện trước:** Thành viên đích đang trong phòng, không phải chính host.
- **Input (business):**
  | Thông tin | Nguồn | Bắt buộc? |
  |---|---|---|
  | Thành viên đích | Host chọn | Có |
  | Hành động (kick / chuyển host) | Host | Có |
- **Output (business):** Kick: thành viên chuyển Bị kick, thêm vào danh sách chặn, bị đưa ra khỏi phòng và thấy thông báo; vé trả về bộ (nếu ván đang chạy thì vé khóa tới hết ván); cả phòng thấy. Chuyển host: người nhận thành Host, host cũ thành Player; cả phòng thấy.
- **Điều kiện sau:** Danh sách thành viên/host cập nhật.
- **Business rules:** BR-06, BR-22, BR-24
- **Ngoại lệ:** Kick trong ván → được, vé khóa tới hết ván. Chuyển host cho người offline → (Q-029) không cho phép.
- **Entities liên quan:** ENT-03, ENT-02, ENT-07

### BIZ-11 Rời phòng
- **Mục tiêu:** Thành viên chủ động rời phòng để làm việc khác hoặc vào phòng khác.
- **Actor:** ACT-03 (gồm host)
- **Trigger:** Bấm "Rời phòng".
- **Điều kiện trước:** Đang trong phòng. Host: đã chuyển host hoặc là người cuối cùng.
- **Input (business):** Xác nhận rời.
- **Output (business):** Thành viên Đã rời; vé trả về bộ (ván đang chạy thì khóa tới hết ván); cả phòng thấy. Người cuối cùng rời → phòng Đã đóng, ván chưa kết thúc bị hủy.
- **Điều kiện sau:** Người dùng không còn ở phòng nào, có thể tạo/vào phòng khác.
- **Business rules:** BR-21, BR-22, BR-25
- **Ngoại lệ:** Host còn thành viên khác mà chưa chuyển host → yêu cầu chọn người nhận host trước.
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
- **Điều kiện trước:** Là thành viên (hoặc từng là thành viên) của phòng.
- **Input (business):** Phòng; ván chọn xem chi tiết.
- **Output (business):** Danh sách ván: số thứ tự, thời gian, kết quả (người thắng / không ai thắng / đã hủy). Chi tiết: dãy số đã rao theo thứ tự, người tham gia và vé, các lượt Kinh (đúng/hụt), vé và hàng thắng.
- **Business rules:** —
- **Ngoại lệ:** Chưa có ván kết thúc → hiển thị trống.
- **Entities liên quan:** ENT-05, ENT-11, ENT-07

### BIZ-14 Hết hạn & đóng phòng
- **Mục tiêu:** Phòng tự kết thúc sau 8 giờ.
- **Actor:** ACT-05 (chính), ACT-03 (nhận thông báo)
- **Trigger:** Thời gian — còn 15 phút; đến hạn; ván đang chạy kết thúc khi phòng ở Chờ đóng.
- **Điều kiện trước:** Phòng Đang hoạt động / Chờ đóng.
- **Input (business):** Thời điểm hết hạn, trạng thái ván hiện tại.
- **Output (business):** Còn 15 phút: cả phòng thấy cảnh báo và đếm ngược. Đến hạn: nếu ván đang chạy bình thường → phòng Chờ đóng, đợi ván kết thúc rồi đóng; nếu ván Chờ bắt đầu hoặc đang treo vì host offline → hủy ván, phòng Đã đóng ngay. Đóng phòng: mọi thành viên thấy "Phòng đã hết hạn", được đưa về trang chủ; link mời hết hiệu lực; mọi người được tạo/vào phòng khác.
- **Điều kiện sau:** Phòng Đã đóng, chỉ còn xem lịch sử.
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

## 6. Business Rules
| ID | Nội dung | Áp dụng cho |
|---|---|---|
| BR-01 | Chỉ đăng nhập/đăng ký bằng Google. | BIZ-01 |
| BR-02 | Mỗi người chỉ ở tối đa 1 phòng tại một thời điểm; đang ở phòng thì không tạo/vào phòng khác (Q-023). | BIZ-02, BIZ-03 |
| BR-03 | Phòng tối đa 16 thành viên, kể cả host (Q-024). | BIZ-03 |
| BR-04 | Phòng hết hạn sau 8 giờ kể từ khi tạo; cảnh báo trước 15 phút. Đến hạn mà ván đang chạy thì dời đóng tới khi ván kết thúc; ván chờ hoặc treo vì host offline thì hủy ván và đóng ngay (Q-014, Q-021, Q-028). | BIZ-14, BIZ-06 |
| BR-05 | Chỉ host tạo link mời; link hết hạn sau 8 giờ hoặc khi phòng đóng (Q-016, Q-024). | BIZ-03, BIZ-14 |
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
| BR-16 | Ván tạm dừng khi: host bấm tạm dừng; host mất kết nối (chờ host quay lại); đang kiểm tra Kinh/cửa sổ đồng kinh (Q-010, Q-017). | BIZ-06, BIZ-08 |
| BR-17 | Kinh đúng khi vé có ít nhất 1 hàng đủ 5 số đều đã rao, kể cả rao từ trước. Kinh sai = "kinh hụt": báo cả phòng, không phạt (Q-002, Q-006, Q-011). | BIZ-08 |
| BR-18 | Sau kinh đúng đầu tiên, mở cửa sổ 5 giây; mọi lượt kinh đúng trong cửa sổ đều đồng thắng (Q-007, Q-013, Q-024). | BIZ-08 |
| BR-19 | Rao hết 90 số mà không ai kinh đúng thì ván kết thúc không người thắng (Q-024). | BIZ-07 |
| BR-20 | Mỗi player tự chọn mode: Tự dò (mặc định, tự đánh dấu) hoặc Auto (hệ thống tự đánh dấu); cả hai đều phải tự bấm Kinh. Các số đã rao luôn hiển thị cho mọi người (Q-003, Q-005). | BIZ-07, BIZ-08, BIZ-15 |
| BR-21 | Host muốn rời phòng phải chuyển host trước; người cuối cùng rời thì phòng đóng (Q-026). | BIZ-11 |
| BR-22 | Rời phòng/bị kick/bị thu hồi: vé trả về bộ. Nếu ván đang chạy, vé bị khóa (không ai kinh được) tới hết ván rồi mới trống (Q-024). | BIZ-10, BIZ-11 |
| BR-23 | Tin nhắn chat 1–500 ký tự, không sửa/xóa; người vào sau xem được toàn bộ (Q-024). | BIZ-12 |
| BR-24 | Chỉ host hiện tại chuyển host, cho thành viên đang trong phòng (Q-017). | BIZ-10 |
| BR-25 | Người đã tự rời (không bị kick) vào lại được bằng link còn hạn nếu phòng chưa đầy; vào lại không được trả vé cũ (Q-024). | BIZ-03, BIZ-11 |
| BR-26 | Kho tiếng rao phải có ≥ 1 câu cho mỗi số 1–90, có câu nối, chúc mừng, kinh hụt; mỗi số nhiều câu thì chọn ngẫu nhiên (Q-018, Q-024). | BIZ-07, BIZ-09 |

## 7. Ma trận Actor × Business
| | BIZ-01 | BIZ-02 | BIZ-03 | BIZ-04 | BIZ-05 | BIZ-06 | BIZ-07 | BIZ-08 | BIZ-09 | BIZ-10 | BIZ-11 | BIZ-12 | BIZ-13 | BIZ-14 | BIZ-15 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ACT-01 Người dùng | ✔ | ✔ | ✔ vào | | | | | | | | | | | | |
| ACT-02 Host | | | ✔ mời | ✔ | ✔ | ✔ | 👁 | ✔ | | ✔ | ✔ | ✔ | 👁 | 👁 | ✔ |
| ACT-03 Player | | | 👁 | 👁 | ✔ | 👁 | 👁 | ✔ | | 👁 | ✔ | ✔ | 👁 | 👁 | ✔ |
| ACT-04 Khách | ✔ | | ✔ vào | | | | | | | | | | | | |
| ACT-05 Hệ thống | | ✔ sinh vé | | ✔ sinh vé | | ✔ tự dừng | ✔ | ✔ kiểm tra | | | | | | ✔ | |
| ACT-06 Google | ✔ | | | | | | | | | | | | | | |
| ACT-07 Đội phát triển | | | | | | | | | ✔ | | | | | | |
