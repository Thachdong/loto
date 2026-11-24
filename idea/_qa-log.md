# Q&A Log

## Q-001 · idea-parse · 2026-11-17
- **Hỏi:** Vé lô tô có cấu trúc thế nào?
- **Trả lời:** Vé truyền thống 9 hàng × 9 cột, mỗi hàng 5 số + 4 ô trống, số từ 1–90 (cột 1: 1–9, cột 2: 10–19, ..., cột 9: 80–90).
- **Trạng thái:** ANSWERED
- **Ảnh hưởng:** ENT-07, BIZ-04

## Q-002 · idea-parse · 2026-11-17
- **Hỏi:** Người chơi thắng ván khi nào?
- **Trả lời:** Đủ 5 số trên một hàng ngang ("kinh") trước thì thắng, ván kết thúc.
- **Trạng thái:** ANSWERED
- **Ảnh hưởng:** BIZ-08

## Q-003 · idea-parse · 2026-11-17
- **Hỏi:** Ai dò số trên vé và báo thắng?
- **Trả lời:** Có 2 mode: tự dò (mặc định) hoặc auto. Số đã rao luôn hiển thị cho player xem.
- **Trạng thái:** ANSWERED
- **Ảnh hưởng:** BIZ-07, BIZ-08

## Q-004 · idea-parse · 2026-11-17
- **Hỏi:** Số được quay theo nhịp nào?
- **Trả lời:** Tự động mỗi N giây kèm tiếng rao; host tạm dừng/tiếp tục được.
- **Trạng thái:** ANSWERED
- **Ảnh hưởng:** BIZ-06, BIZ-07

## Q-005 · idea-parse · 2026-11-17
- **Hỏi:** Hai mode dò số: ai chọn, mode auto làm gì?
- **Trả lời:** Mỗi player tự chọn mode cho mình. Auto chỉ tự đánh dấu số trên vé; player vẫn phải tự bấm "Kinh".
- **Trạng thái:** ANSWERED
- **Ảnh hưởng:** BIZ-07, BIZ-08

## Q-006 · idea-parse · 2026-11-17
- **Hỏi:** Bấm Kinh sai (chưa đủ hàng) thì sao?
- **Trả lời:** Báo "kinh hụt" cho cả phòng, không phạt, chơi tiếp.
- **Trạng thái:** ANSWERED
- **Ảnh hưởng:** BIZ-08

## Q-007 · idea-parse · 2026-11-17
- **Hỏi:** Nhiều người cùng đủ hàng ở cùng một số?
- **Trả lời:** Đồng thắng.
- **Trạng thái:** ANSWERED
- **Ảnh hưởng:** BIZ-08

## Q-008 · idea-parse · 2026-11-17
- **Hỏi:** "Bộ 16 vé, 8 cặp màu" nghĩa là gì?
- **Trả lời:** 2 vé cùng màu có quan hệ số với nhau (chi tiết hỏi tiếp Q-009). Player lấy tự do, tối đa 2 vé, không bắt buộc theo cặp.
- **Trạng thái:** ANSWERED
- **Ảnh hưởng:** ENT-06, ENT-07, BIZ-04, BIZ-05

## Q-009 · idea-parse · 2026-11-17
- **Hỏi:** Hai vé cùng màu có quan hệ số thế nào?
- **Trả lời:** Bổ sung nhau: không trùng số, gộp lại đủ đúng 90 số (1–90).
- **Trạng thái:** ANSWERED
- **Ảnh hưởng:** ENT-06, ENT-07, BIZ-04

## Q-010 · idea-parse · 2026-11-17
- **Hỏi:** Khi có người bấm Kinh, quay số xử lý thế nào?
- **Trả lời:** Tạm dừng quay, kiểm tra ngay. Đúng thì kết thúc ván; sai thì báo kinh hụt rồi quay tiếp.
- **Trạng thái:** ANSWERED
- **Ảnh hưởng:** BIZ-07, BIZ-08

## Q-011 · idea-parse · 2026-11-17
- **Hỏi:** Vé đã đủ hàng từ số trước nhưng bấm Kinh trễ thì sao?
- **Trả lời:** Vẫn hợp lệ, miễn hàng đủ bằng các số đã rao.
- **Trạng thái:** ANSWERED
- **Ảnh hưởng:** BIZ-08

## Q-012 · idea-parse · 2026-11-17
- **Hỏi:** Lấy/bỏ vé khi nào, vé có giữ qua ván không?
- **Trả lời:** Chỉ khi ván chưa bắt đầu (trong ván không đổi vé). Vé giữ qua các ván cho tới khi người đó bỏ.
- **Trạng thái:** ANSWERED
- **Ảnh hưởng:** BIZ-04, BIZ-05

## Q-013 · idea-parse · 2026-11-17
- **Hỏi:** Khi có 1 người kinh đúng, ai được tính đồng thắng?
- **Trả lời:** Sau kinh đúng đầu tiên, mở cửa sổ chờ ngắn (vd 5 giây); ai bấm Kinh đúng trong thời gian đó đều thắng.
- **Trạng thái:** ANSWERED
- **Ảnh hưởng:** BIZ-08

## Q-014 · idea-parse · 2026-11-17
- **Hỏi:** Phòng tồn tại bao lâu?
- **Trả lời:** Tối đa 8 giờ từ khi tạo. Hết 8 giờ thông báo hết hạn; nếu đang có ván thì đợi hết ván mới hết hạn.
- **Trạng thái:** ANSWERED
- **Ảnh hưởng:** ENT-02, BIZ-02

## Q-015 · idea-parse · 2026-11-17
- **Hỏi:** Người bị kick có vào lại được không?
- **Trả lời:** Bị chặn khỏi phòng đã kick. (Vé đang giữ: trả về bộ vé – Q-024)
- **Trạng thái:** ANSWERED
- **Ảnh hưởng:** BIZ-02, BIZ-05

## Q-016 · idea-parse · 2026-11-17
- **Hỏi:** Link mời có hạn? Phòng đủ 16 thì sao?
- **Trả lời:** Link có hạn 8 giờ. Phòng đủ 16 người thì không vào được nữa.
- **Trạng thái:** ANSWERED
- **Ảnh hưởng:** ENT-04, BIZ-03

## Q-017 · idea-parse · 2026-11-17
- **Hỏi:** Host thoát/mất kết nối giữa chừng thì sao?
- **Trả lời:** Host out thì ván tạm dừng. Host có thể chuyển quyền host cho thành viên khác.
- **Trạng thái:** ANSWERED
- **Ảnh hưởng:** BIZ-02, BIZ-06, BIZ-07

## Q-018 · idea-parse · 2026-11-17
- **Hỏi:** Kho tiếng rao chuẩn bị thế nào?
- **Trả lời:** Chuẩn bị sẵn một lần bằng AI (offline), đội phát triển nạp vào; app chỉ phát. Không có actor Admin.
- **Trạng thái:** ANSWERED
- **Ảnh hưởng:** BIZ-09, ENT-09

## Q-019 · idea-parse · 2026-11-17
- **Hỏi:** Có cược/giá vé/điểm thưởng không?
- **Trả lời:** Không, giải trí thuần.
- **Trạng thái:** ANSWERED
- **Ảnh hưởng:** Phạm vi

## Q-020 · idea-parse · 2026-11-17
- **Hỏi:** MVP cần thêm tính năng nào?
- **Trả lời:** Tất cả: chat trong phòng; lịch sử ván trong phòng; người chơi tự rời phòng; player bật/tắt tiếng rao, host chỉnh nhịp quay.
- **Trạng thái:** ANSWERED
- **Ảnh hưởng:** BIZ mới (chat, lịch sử ván, rời phòng, cài đặt âm thanh/nhịp quay)

## Q-021 · idea-parse · 2026-11-17
- **Hỏi:** Host out không quay lại thì ván treo xử lý thế nào?
- **Trả lời:** Chờ host. Phòng quá 8 giờ thì hủy ván đang treo và đóng phòng. (Phân biệt với Q-014: ván đang chạy bình thường thì đợi hết ván mới đóng phòng.)
- **Trạng thái:** ANSWERED
- **Ảnh hưởng:** BIZ-02, BIZ-06

## Q-022 · idea-parse · 2026-11-17
- **Hỏi:** Phòng vào bằng link hay có sảnh công khai?
- **Trả lời:** Chỉ bằng link mời.
- **Trạng thái:** ANSWERED
- **Ảnh hưởng:** BIZ-03

## Q-023 · idea-parse · 2026-11-17
- **Hỏi:** Một user ở/tạo bao nhiêu phòng cùng lúc?
- **Trả lời:** Tối đa 1 phòng tại 1 thời điểm. Đang tham gia phòng thì không tạo phòng được (và (Q-024) không vào phòng khác được tới khi rời).
- **Trạng thái:** ANSWERED
- **Ảnh hưởng:** BIZ-02, BIZ-03

## Q-024 · biz-actor-entity · 2026-11-17
- **Hỏi:** Xác nhận 10 giả định về actor/entity.
- **Trả lời:** Đúng hết: (1) host cũng chơi, tính trong 16 người; (2) nhịp quay 3–15 giây, mặc định 5 giây; cửa sổ đồng kinh 5 giây; (3) offline giữ chỗ & vé; đã rời vào lại được bằng link còn hạn nếu phòng chưa đầy; (4) chỉ host tạo link; (5) bộ vé sinh khi tạo phòng; ván cần ≥ 1 vé được giữ mới bắt đầu; (6) rao hết 90 số không ai kinh thì ván kết thúc không người thắng; (7) bị kick/tự rời thì vé trả về bộ; rời giữa ván thì vé khóa tới hết ván; (8) chat ≤ 500 ký tự, không sửa/xóa, người vào sau xem toàn bộ; (9) mỗi số nhiều câu rao chọn ngẫu nhiên, có tiếng "kinh hụt"; (10) tên phòng mặc định "Phòng của <tên host>", phòng đã đóng vẫn xem lịch sử; tài khoản không sửa/xóa ở MVP.
- **Trạng thái:** ANSWERED
- **Ảnh hưởng:** ACT-02, ENT-01..ENT-11

## Q-025 · biz-capability · 2026-11-18
- **Hỏi:** Tạo ván và bắt đầu ván có là 2 bước riêng?
- **Trả lời:** Tạo phòng thì hệ thống tự tạo ván ở trạng thái chờ; đợi player vào, lấy vé; host bấm Bắt đầu. Ván kết thúc (sau kinh) thì host bấm Bắt đầu để chơi ván tiếp. Host không có thao tác "Tạo ván" riêng.
- **Trạng thái:** ANSWERED
- **Ảnh hưởng:** BIZ-02, BIZ-06, BIZ-08, BR-07

## Q-026 · biz-capability · 2026-11-18
- **Hỏi:** Host tự rời phòng thì sao?
- **Trả lời:** Bắt buộc chuyển host trước. Người cuối cùng rời thì phòng đóng.
- **Trạng thái:** ANSWERED
- **Ảnh hưởng:** BIZ-10, BIZ-11, BR-21

## Q-027 · biz-capability · 2026-11-18
- **Hỏi:** Player offline giữ vé chặn việc tạo lại bộ vé?
- **Trả lời:** Host được thu hồi vé của người đang offline (khi không có ván đang chạy).
- **Trạng thái:** ANSWERED
- **Ảnh hưởng:** BIZ-04, BR-13

## Q-028 · biz-capability · 2026-11-18
- **Hỏi:** Có báo trước khi phòng sắp hết hạn?
- **Trả lời:** Báo trước 15 phút (thông báo + đếm ngược). Đến hạn mà có ván đang diễn ra thì dời đóng phòng tới khi ván kết thúc.
- **Trạng thái:** ANSWERED
- **Ảnh hưởng:** BIZ-14, BR-04

## Q-029 · biz-capability · 2026-11-18
- **Hỏi:** Xác nhận danh sách BIZ-01..15 và 4 giả định.
- **Trả lời:** Đúng hết: (1) bấm Kinh khi host tạm dừng vẫn được kiểm tra; (2) số thiếu câu rao thì chỉ hiển thị số; (3) không chuyển host cho người offline; (4) host tạm dừng (vẫn online) lúc phòng đến hạn thì coi như ván đang chạy, chờ hết ván mới đóng.
- **Trạng thái:** ANSWERED
- **Ảnh hưởng:** BIZ-01..BIZ-15, BR-01..BR-26

## Q-030 · biz-supporting · 2026-11-18
- **Hỏi:** Ngoài 5 chức năng phụ trợ bắt buộc (thông báo trong phòng, phát tiếng rao, hẹn giờ, online/offline, phiên đăng nhập), MVP cần thêm gì?
- **Trả lời:** Có: chia sẻ link tiện lợi (nút chia sẻ + thẻ xem trước khi dán link); thống kê cho đội vận hành; chống spam chat (tối đa 5 tin/10 giây); hiệu ứng khi số trúng vé; tên/ảnh tùy chỉnh. Không: nhật ký diễn biến ván, push ngoài ứng dụng, đa ngôn ngữ.
- **Trạng thái:** ANSWERED
- **Ảnh hưởng:** SUP-01..SUP-10, BIZ-12, BIZ-13, BIZ-16 (mới)

## Q-031 · biz-supporting · 2026-11-18
- **Hỏi:** Lịch sử ván lưu những gì?
- **Trả lời:** Chỉ ghi người kinh: mỗi ván lưu số thứ tự, thời gian, người thắng (tên, màu vé) hoặc "không ai thắng"/"đã hủy". Không lưu dãy số đã rao, không lưu kinh hụt.
- **Trạng thái:** ANSWERED
- **Ảnh hưởng:** BIZ-13, ENT-05, ENT-11 (cập nhật Phase 1)

## Q-032 · biz-supporting · 2026-11-18
- **Hỏi:** Tên/ảnh tùy chỉnh áp dụng thế nào?
- **Trả lời:** Sửa trong hồ sơ, dùng cho mọi phòng. Mặc định lấy từ Google; đổi tên hiển thị và ảnh đại diện (upload hoặc chọn avatar có sẵn). Thay thế điểm "tài khoản không sửa ở MVP" của Q-024.
- **Trạng thái:** ANSWERED
- **Ảnh hưởng:** ENT-01, BIZ-16 (mới), BR-27 (mới)

## Q-033 · biz-supporting · 2026-11-18
- **Hỏi:** Thống kê cho đội vận hành cần chỉ số nào?
- **Trả lời:** Người dùng mới & hoạt động theo ngày; số phòng, số ván, số người trung bình/phòng theo ngày. Xem ngoài ứng dụng.
- **Trạng thái:** ANSWERED
- **Ảnh hưởng:** SUP-09

## Q-034 · biz-supporting · 2026-11-18
- **Hỏi:** Hiệu ứng khi số trúng vé áp dụng thế nào?
- **Trả lời:** Chỉ mode Auto: số vừa rao có trên vé thì nổi bật; hàng còn thiếu 1 số được tô "chờ". Mode Tự dò không gợi ý.
- **Trạng thái:** ANSWERED
- **Ảnh hưởng:** BR-20, BIZ-07, SUP-10

## Q-035 · flow-detail · 2026-11-18
- **Hỏi:** Host xác nhận Kinh trước khi kết thúc ván: hệ thống còn tự kiểm tra không, host xác nhận lúc nào?
- **Trả lời:** Hệ thống vẫn kiểm tra; kinh hụt tự báo. Kinh đúng → hết cửa sổ đồng kinh 5 giây → ván chờ host xác nhận; host thấy vé/hàng thắng và bấm "Xác nhận kết thúc ván".
- **Trạng thái:** ANSWERED
- **Ảnh hưởng:** BIZ-08, ENT-05, BR-28 (mới), FLOW-08

## Q-036 · flow-detail · 2026-11-18
- **Hỏi:** Host có bác bỏ được lượt Kinh hệ thống xác định đúng không?
- **Trả lời:** Không, host chỉ xác nhận.
- **Trạng thái:** ANSWERED
- **Ảnh hưởng:** BR-28

## Q-037 · flow-detail · 2026-11-18
- **Hỏi:** Host offline hoặc chính host kinh lúc cần xác nhận?
- **Trả lời:** Host offline thì chờ host quay lại. Host tự kinh thì vẫn tự bấm xác nhận.
- **Trạng thái:** ANSWERED
- **Ảnh hưởng:** BR-28, BIZ-14

## Q-038 · flow-detail · 2026-11-18
- **Hỏi:** Host muốn rời phòng nhưng mọi thành viên khác đều offline?
- **Trả lời:** Không cho rời. Host phải chờ có người online để chuyển host, hoặc kick hết những người còn lại.
- **Trạng thái:** ANSWERED
- **Ảnh hưởng:** BIZ-11, BR-21, FLOW-11

## Q-039 · flow-detail · 2026-11-18
- **Hỏi:** Phòng đã đóng xem lịch sử ván từ đâu?
- **Trả lời:** Không cần. Lịch sử ván chỉ xem khi phòng còn mở. Thay thế điểm "phòng đã đóng vẫn xem lịch sử" của Q-024.
- **Trạng thái:** ANSWERED
- **Ảnh hưởng:** BIZ-13, ENT-02, FLOW-13

## Q-040 · nfr-define · 2026-11-18
- **Hỏi:** Xác nhận flow tổng thể; quy mô, nền tảng, thời gian lưu dữ liệu?
- **Trả lời:** Flow tổng thể đúng. Quy mô ≤ 50 phòng (~800 người) cùng lúc giờ cao điểm. Web trên điện thoại là chính (mở link là chơi, không cài app). Dữ liệu phòng đã đóng xóa sau 30 ngày.
- **Trạng thái:** ANSWERED
- **Ảnh hưởng:** NFR-06, NFR-11, NFR-12, NFR-13

## Q-041 · nfr-define · 2026-11-18
- **Hỏi:** Xác nhận 17 NFR và các giá trị đề xuất.
- **Trả lời:** Đồng ý toàn bộ, gồm hướng dẫn "Mở bằng trình duyệt" khi ứng dụng chat chặn đăng nhập Google và chạm "Bật tiếng" một lần khi vào phòng.
- **Trạng thái:** ANSWERED
- **Ảnh hưởng:** NFR-01..NFR-17, BIZ-01

## Q-042 · biz-flow · 2026-11-18
- **Hỏi:** Chốt Phase 2 cùng 4 giả định còn lại?
- **Trả lời:** Đồng ý chuyển Phase 3, chốt cả 4: tên hiển thị 2–30 ký tự, ảnh JPG/PNG ≤ 5 MB; lúc chờ host xác nhận không nhận thêm Kinh, không quay số; phòng đến hạn khi ván chờ xác nhận mà host offline thì ván tự kết thúc với người thắng đã xác định rồi đóng phòng; đổi bộ tiếng rao áp dụng từ số kế tiếp.
- **Trạng thái:** ANSWERED
- **Ảnh hưởng:** BR-27, BR-28, BR-04, FLOW-08, FLOW-09, FLOW-14

## Q-043 · tech-stack-select · 2026-11-18
- **Hỏi:** Kỹ năng team, hạ tầng/ngân sách, ưu tiên?
- **Trả lời:** TypeScript/Node.js; Firebase như dự án buddio; cân bằng giữa ra nhanh và mở rộng.
- **Trạng thái:** ANSWERED
- **Ảnh hưởng:** specs/tech-stack.md, ADR-01..ADR-04

## Q-044 · tech-stack-select · 2026-11-18
- **Hỏi:** Cách chạy vòng quay số trên Firebase?
- **Trả lời:** Phương án A: Cloud Tasks hẹn từng tick, gọi task queue function; toàn bộ serverless.
- **Trạng thái:** ANSWERED
- **Ảnh hưởng:** ADR-05

## Q-045 · db-design · 2026-11-18
- **Hỏi:** ERD 12 collection đã ổn chưa?
- **Trả lời:** Cần sửa: DB đơn giản nhất có thể — `room → tickets + messages + games`; `game → players + called_numbers + messages`; `player → ticket`. Áp dụng: bỏ collection members/invites/ticket_sets/secret/events; thành viên = players của ván hiện tại; link mời là field của room (một link hiệu lực mỗi lúc, bấm Mời khi còn hạn trả link cũ); số rao chọn ngẫu nhiên lúc tick.
- **Trạng thái:** ANSWERED
- **Ảnh hưởng:** specs/database-design.md, specs/database.md, ADR-05, ADR-06, ADR-09, ADR-10, FLOW-03 A4

## Q-046 · db-design · 2026-11-18
- **Hỏi:** Mô hình dữ liệu theo action; người giữ vé lưu ở đâu; player out; mã mời.
- **Trả lời:**
  - Tạo phòng: room (host = người tạo) + game `waiting` + mã mời + 16 vé ngẫu nhiên. Mã mời tạo cùng phòng, hết hạn cùng phòng (8 giờ); nút Mời chỉ hiện link.
  - Vào phòng: user gửi mã lên server để chứng minh quyền vào phòng. Player của ván **chỉ được tạo khi host Bắt đầu** từ những người đã chọn vé.
  - Lấy/bỏ vé: gán/bỏ ticket cho thành viên (người giữ chỉ lưu phía thành viên, không lưu ở doc vé – A1).
  - Rao số: chỉ cập nhật `room.called_numbers`. Bấm Kinh: lúc đó mới so vé với `called_numbers`.
  - Chat thuộc phòng, không thuộc ván.
  - Kết thúc ván: ghi tên những người kinh vào game.
  - Player out: không đổi gì ở ván; vé còn trống thì người khác lấy được (vé của người out trống cho ván sau).
  - Host tạo bộ vé mới: cập nhật 16 vé của phòng.
- **Trạng thái:** ANSWERED
- **Ảnh hưởng:** specs/database-design.md, specs/database.md, ADR-05, ADR-06, ADR-09, BIZ-03, BIZ-05, BR-05, BR-22

## Q-047 · db-design · 2026-11-18
- **Hỏi:** Thành viên phòng lưu thế nào; khi nào tạo player?
- **Trả lời:** User chỉ cần invite code để vào phòng (không lưu danh sách thành viên – vào phòng = `users.current_room_id`). Chỉ khi user lấy vé mới tạo player cho ván. Host Bắt đầu → kiểm lại, player không có vé bị xóa. Đồng ý `rooms.last_event` cho thông báo; mode dò/tiếng/ô đánh dấu lưu localStorage.
- **Trạng thái:** ANSWERED
- **Ảnh hưởng:** specs/database-design.md, specs/database.md, ADR-06

## Q-048 · db-design · 2026-11-18
- **Hỏi:** Bỏ chuyển host thì host rời phòng ra sao; host mất mạng thì sao?
- **Trả lời:** Phòng chỉ có 1 host cố định; bỏ chuyển quyền host; host chỉ kick được player (người đã lấy vé). Host không có nút rời phòng — phòng chỉ đóng khi hết 8 giờ. Host mất mạng thì ván vẫn chạy bình thường; chấp nhận ván không kết thúc được vì không có host chốt kết quả. Thay thế Q-017 (chuyển host), Q-021 (ván treo vì host out), Q-026, Q-038.
- **Trạng thái:** ANSWERED
- **Ảnh hưởng:** BR-04, BR-16, BR-21, ~~BR-24~~, BIZ-06, BIZ-10, BIZ-11, BIZ-14, FLOW-06, FLOW-08, FLOW-10, FLOW-11, FLOW-14, ADR-06, TBL-02, TBL-05

## Q-049 · ui-screen-design · 2026-11-18
- **Hỏi:** Player giữ 2 vé cần thấy 2 vé cùng lúc để dò: xếp dọc (ô 38×28) hay xếp ngang (ô 19×60)?
- **Trả lời:** Chọn A – xếp dọc. Vé thiết kế giống vé giấy (khung màu, 3 khối 3 hàng, ô trống tô màu vé). SCR-03 bỏ "x/16 người trong phòng", chỉ giữ "Link hết hạn lúc …".
- **Trạng thái:** ANSWERED
- **Ảnh hưởng:** SCR-03, SCR-04, SCR-05, SCR-09

## Q-050 · tech-spec · 2026-11-18
- **Hỏi:** Xác nhận các giả định từ api-contract và ui-screen-design.
- **Trả lời:** (1a) Bị kick/phòng đóng lúc offline → chỉ báo câu chung "Bạn không còn ở trong phòng", không thêm field DB. Đồng ý: link SCR-11 → SCR-10; thêm SCR-05.A4 thu hồi vé trong dialog tạo bộ vé mới; đăng xuất không rời phòng; hết 90 số không ai thắng thì ván tự kết thúc; nhiều hàng đủ thì ghi hàng có chỉ số nhỏ nhất; Tự dò cho đánh dấu cả số chưa rao; 2 vé bấm KINH hiện chọn vé; nút "Rời" ở header; chat tải 50 tin/lần; người giữ vé đã rời nhận biết qua presence. Các [ASSUMED] còn lại trong api-contract và scr-*.md được chấp nhận.
- **Trạng thái:** ANSWERED
- **Ảnh hưởng:** specs/api-contract.yml, specs/ui-ux/*.md, wireframe.md

## Q-051 · tech-spec · 2026-11-18
- **Hỏi:** Đổi logic đăng xuất; chuyển hẹn giờ xuống client.
- **Trả lời:** Đăng xuất = rời phòng (player). Host không được đăng xuất khi phòng còn mở (tạo phòng mới dễ nên chấp nhận). Chuyển **mọi** việc hẹn giờ xuống client, bỏ Cloud Tasks: host + 2 player dự phòng gọi API định kỳ xin rao số kế (`drawNumber`); client gọi `closeClaimWindow` khi hết 5 giây đồng kinh; client cảnh báo 15 phút từ `expires_at` và gọi `expireRoom` khi hết hạn; server lazy expiry ở mọi thao tác. Chỉ giữ cron thống kê ngày.
- **Trạng thái:** ANSWERED
- **Ảnh hưởng:** BIZ-01, BIZ-07, BIZ-14, BR-21, SUP-03, FLOW-01, FLOW-07, FLOW-14, ADR-05, api-contract (drawNumber, closeClaimWindow, expireRoom, deleteCurrentSession), TBL-02, TBL-05, wireframe SCR-04.A10/A11, SCR-09.A2, SCR-10.A4

## Q-052 · tech-spec · 2026-11-18
- **Hỏi:** Đối chiếu feature chính (final.md): host/player logout, khóa logout khi ván chạy, logic rao số và dự phòng.
- **Trả lời:** Host/player đăng xuất = thoát phòng; host đăng xuất (khi ván chờ) → **đóng phòng** cho mọi người. Ván đang diễn ra → khóa cả nút đăng xuất và nút Rời phòng. Bắt đầu ván → server **rao ngay số đầu tiên**. Các số sau host gọi API sau N giây; host rớt mạng → player giữ vé nhỏ nhất (thứ tự cố định Đỏ A → Hồng B, trừ host) gọi thay ở +5 giây, người kế ở +10 giây… tới player cuối. Server chống gọi sớm/gọi trùng bằng `games.next_call_at` (user gọi là `next_route_at`) + `seq`. Thay thế phần tương ứng của Q-048, Q-051.
- **Trạng thái:** ANSWERED
- **Ảnh hưởng:** BR-21, BIZ-01, BIZ-07, BIZ-11, FLOW-01, FLOW-07, FLOW-11, ADR-05, api-contract (deleteCurrentSession, leaveRoom, startGame, drawNumber), TBL-02, wireframe, SCR-04, SCR-10

## Q-053 · backlog-plan · 2026-11-19
- **Hỏi:** Thiết lập backlog: cách chia task, công cụ test, năng lực, môi trường.
- **Trả lời:** Waterfall cho 1 dev + AI, **đúng 1 task / màn** (không tách màn to, chấp nhận point > 8 cho màn lớn), cộng task nền và task vận hành không thuộc màn. Test: **AI tự mở Chrome chạy kịch bản test** trên localhost (Claude in Chrome) thay cho Playwright; giữ unit test Vitest + Emulator cho logic thuần (sinh vé, kiểm Kinh, rule). Không chia thời gian. Xong khi chạy được ở **local + emulator**.
- **Trạng thái:** ANSWERED
- **Ảnh hưởng:** backlog/backlog.md (Thiết lập), mọi task

## Q-054 · backlog-slice · 2026-11-19
- **Hỏi:** Duyệt danh sách 13 task (T-001 nền, T-002..T-012 theo màn, T-013 vận hành), thứ tự waterfall, 79 point.
- **Trả lời:** Đồng ý, viết chi tiết task.
- **Trạng thái:** ANSWERED
- **Ảnh hưởng:** backlog/backlog.md, backlog/_draft/slices.md

## Q-055 · idea-to-specs · 2026-11-19
- **Hỏi:** Đối chiếu `specs/actions.md` (action 11–12 và yêu cầu bỏ cửa sổ đồng kinh 5 giây): host duyệt lượt Kinh thế nào?
- **Trả lời:** Bỏ cửa sổ đồng kinh 5 giây. **Mọi** lượt Kinh (đúng hay hụt) đều dừng ván, cả phòng được báo, ván chuyển **Chờ host duyệt**. Hệ thống tự kiểm từng vé và hiện gợi ý đúng/hụt kèm hàng thắng. Trong lúc chờ host duyệt, player khác **vẫn Kinh được bất cứ lúc nào**. Có ≥ 1 vé đúng → host chỉ bấm được "Xác nhận kết thúc ván" (người thắng = mọi vé đúng). Mọi vé đều hụt → host chỉ bấm được "Bác bỏ", ván quay tiếp. Host không làm trái kết quả hệ thống. Thay thế BR-18 và phần cửa sổ đồng kinh trong Q-007, Q-013, Q-024, Q-035, Q-042, Q-051.
- **Trạng thái:** ANSWERED
- **Ảnh hưởng:** BR-16, ~~BR-18~~, BR-28, BIZ-07, BIZ-08, FLOW-07, FLOW-08, ENT-05, ENT-11, SUP-03, ADR-05, TBL-02, api-contract (createClaim, ~~closeClaimWindow~~, confirmGameEnd, rejectClaims), SCR-04, SCR-09

## Q-056 · idea-to-specs · 2026-11-19
- **Hỏi:** Action 1 và 3 cần copy mã phòng và nhập mã ở Home; specs hiện chỉ cho vào bằng link (mã 22 ký tự).
- **Trả lời:** Hai cách vào phòng: (1) **link mời** — dùng được cho cả người đã có và chưa có tài khoản; (2) **mã phòng** 6 ký tự (chữ in hoa + số, bỏ O/0/I/1) — cho người đã có tài khoản: ở Home bấm "Vào phòng" → nhập mã → vào thẳng phòng, kiểm tra như vào bằng link. Sheet Mời có "Copy link" và "Copy mã". Giữ link 22 ký tự. Mã hết hạn cùng phòng. Thay thế Q-022 (chỉ vào bằng link).
- **Trạng thái:** ANSWERED
- **Ảnh hưởng:** BR-05, BR-30, BIZ-03, FLOW-03, ENT-04, TBL-02, api-contract (joinRoom), SCR-02, SCR-04

## Q-057 · idea-to-specs · 2026-11-19
- **Hỏi:** Action 7–8 (bản sửa): rời phòng / đăng xuất khi ván đang diễn ra; host rời giữa ván thì sao?
- **Trả lời:** Không khóa nút nữa. Ván đang diễn ra → hiện dialog cảnh báo "đang chơi"; xác nhận thì **vé đang chơi bị hủy** khỏi ván (bị khóa, không Kinh được, trả về bộ khi ván kết thúc – BR-22). Player: rời phòng. Host: rời phòng hoặc đăng xuất = **đóng phòng ngay** — ván bị hủy (không ai thắng), mọi người về trang chủ. Host có nút Rời phòng (= đóng phòng). Giải quyết action 6 "player tự giải tán" khi ván treo do host offline. Thay thế phần khóa nút trong Q-052 và "host không có nút rời phòng" trong Q-048.
- **Trạng thái:** ANSWERED
- **Ảnh hưởng:** BR-21, BR-22, BIZ-01, BIZ-11, BIZ-14, FLOW-01, FLOW-11, FLOW-14, ENT-05, api-contract (leaveRoom, deleteCurrentSession), SCR-04, SCR-10

## Q-058 · idea-to-specs · 2026-11-19
- **Hỏi:** Action 10 (mới): player mất kết nối, ván kết thúc thì vé của họ ra sao?
- **Trả lời:** Khi ván kết thúc (có người thắng, hết 90 số hoặc bị hủy), vé của mọi player đang **offline** tự trả về bộ vé; player vẫn là thành viên phòng, quay lại thì lấy vé mới. [ASSUMED] Offline = không có kết nối tại thời điểm ván kết thúc (theo trạng thái online/offline của phòng). Bổ sung cho BR-11, BR-13.
- **Trạng thái:** ANSWERED
- **Ảnh hưởng:** BR-11, BR-29, BIZ-08, FLOW-07, FLOW-08, ENT-07, api-contract (confirmGameEnd, drawNumber), SCR-05, SCR-07

## Q-059 · implement · 2026-11-24
- **Hỏi:** Host một mình (có vé) vẫn bắt đầu được ván — có cần số người chơi tối thiểu?
- **Trả lời:** Cần **≥ 2 người giữ vé** (đếm người khác nhau có vé trong ván, host có vé cũng tính) mới bắt đầu được. Không thêm mã lỗi mới: dùng lại `NO_TICKETS_HELD` (422) với câu "Cần ít nhất 2 người lấy vé".
- **Trạng thái:** ANSWERED
- **Ảnh hưởng:** BR-14, ENT (Ván › Các vé tham gia), FLOW-05→06, FLOW-06 E1, api-contract (startGame, NO_TICKETS_HELD), SCR-04 #9 / A4
