### FLOW-03 Mời & tham gia phòng (BIZ-03)
- **Actor:** ACT-02 Host, ACT-04 Khách / ACT-01 Người dùng, ACT-05 Hệ thống · **Trigger:** Host bấm "Mời"; khách mở link mời · **Kết quả:** Khách trở thành Player trong phòng

```mermaid
flowchart TD
  subgraph HO["ACT-02 Host"]
    S1["Bấm Mời"]
    S3["Chia sẻ link qua Messenger/Telegram/Zalo<br/>hoặc copy link<br/>SUP-06"]
  end
  subgraph K["ACT-04 Khách"]
    S4["Mở link mời"]
    S6["Đăng nhập Google<br/>(FLOW-01)"]
    S12["Vào phòng, xem bộ vé<br/>lấy vé nếu còn (FLOW-05)"]
  end
  subgraph H["Hệ thống"]
    S2["Tạo link mời hạn 8 giờ<br/>BR-05"]
    S5{"Đã đăng nhập?"}
    S7{"Link còn hiệu lực<br/>& phòng chưa đóng?<br/>BR-05"}
    S8{"Đã là thành viên?"}
    S9{"Bị kick?<br/>BR-06"}
    S10{"Đang ở phòng khác?<br/>BR-02"}
    S11{"Phòng < 16 người?<br/>BR-03"}
    S13["Thêm thành viên Player<br/>Báo cả phòng có người mới<br/>SUP-01"]
    E1(["Báo link không còn hiệu lực"])
    E2(["Báo không được vào phòng"])
    E3(["Báo phải rời phòng hiện tại trước"])
    E4(["Báo phòng đã đầy"])
    A1(["Vào thẳng phòng"])
  end
  S1 --> S2 --> S3 --> S4 --> S5
  S5 -- Chưa --> S6 --> S7
  S5 -- Rồi --> S7
  S7 -- Không --> E1
  S7 -- Có --> S8
  S8 -- Có --> A1
  S8 -- Không --> S9
  S9 -- Có --> E2
  S9 -- Không --> S10
  S10 -- Có --> E3
  S10 -- Không --> S11
  S11 -- Không --> E4
  S11 -- Có --> S13 --> S12
```

- **Happy path:**
  1. Host bấm "Mời".
  2. Hệ thống hiện link mời đã tạo sẵn cùng phòng, hết hạn cùng phòng (BR-05, cập nhật từ Phase 3 – Q-046).
  3. Host chia sẻ link bằng nút chia sẻ của thiết bị hoặc copy link; khi dán vào ứng dụng chat, link hiện thẻ xem trước gồm tên phòng, tên host, ảnh (SUP-06).
  4. Khách mở link.
  5. Hệ thống kiểm tra khách đã đăng nhập chưa.
  6. Chưa đăng nhập thì khách đăng nhập Google (FLOW-01); xong quay lại đúng link (SUP-05).
  7. Hệ thống kiểm tra link còn hiệu lực và phòng chưa đóng (BR-05).
  8. Kiểm tra khách chưa phải thành viên đang trong phòng.
  9. Kiểm tra khách không bị kick khỏi phòng này (BR-06).
  10. Kiểm tra khách không đang ở phòng khác (BR-02).
  11. Kiểm tra phòng còn dưới 16 người (BR-03).
  12. Thêm khách làm thành viên Player; cả phòng thấy "<tên> đã vào phòng" (SUP-01).
  13. Khách xem phòng, bộ vé, danh sách thành viên, chat; lấy vé nếu ván đang Chờ bắt đầu và còn vé (FLOW-05). Hết vé thì ở lại xem.
- **Alternative paths:**
  - A1. Khách đã là thành viên đang trong phòng (vd mở lại link): vào thẳng phòng, không thêm mới.
  - A2. Khách từng tự rời phòng: được vào lại như thành viên mới, không được trả vé cũ (BR-25).
  - A3. Khách vào khi ván đang chạy: xem ván, nghe rao, chat; không lấy vé tới khi ván kết thúc (BR-10).
  - A4. Host bấm "Mời" lần nữa: luôn hiện cùng một link, tạo sẵn lúc tạo phòng và hết hạn cùng phòng (cập nhật từ Phase 3 – Q-046).
- **Exceptions:**
  - E1. Link hết hạn hoặc phòng đã đóng: báo "Link không còn hiệu lực", đưa về trang chủ.
  - E2. Khách bị kick khỏi phòng: báo "Bạn không thể vào phòng này".
  - E3. Khách đang ở phòng khác: báo phải rời phòng hiện tại, có nút về phòng hiện tại.
  - E4. Phòng đủ 16 người: báo "Phòng đã đầy".
  - E5. Khách hủy đăng nhập Google: dừng, link vẫn mở lại được.
- **Supporting kích hoạt:** SUP-03 tại bước 2 (hẹn giờ hết hạn link); SUP-06 tại bước 3; SUP-05 tại bước 6; SUP-01 tại bước 12.
- **Business rules áp dụng:** BR-05 bước 2, 7; BR-06 bước 9; BR-02 bước 10; BR-03 bước 11; BR-10 tại A3; BR-25 tại A2.
