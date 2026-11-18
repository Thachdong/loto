### FLOW-14 Hết hạn & đóng phòng (BIZ-14)
- **Actor:** ACT-05 Hệ thống (chính), ACT-03 (nhận thông báo) · **Trigger:** Thời gian (còn 15 phút; đến hạn 8 giờ); ván kết thúc khi phòng Chờ đóng · **Kết quả:** Phòng Đã đóng

```mermaid
flowchart TD
  subgraph H["Hệ thống"]
    W1["Còn 15 phút<br/>SUP-03"]
    W2["Báo cả phòng + đếm ngược<br/>SUP-01"]
    S1["Đến hạn 8 giờ<br/>SUP-03"]
    S2{"Trạng thái ván?<br/>BR-04"}
    S3["Phòng → Chờ đóng<br/>khóa bắt đầu ván mới"]
    S4["Chờ ván kết thúc<br/>(FLOW-08 / FLOW-07 E2)"]
    S5["Hủy ván chưa bắt đầu / đang treo"]
    S5b["Kết thúc ván với<br/>người thắng đã xác định"]
    S6["Phòng → Đã đóng<br/>link mời hết hiệu lực"]
    S7["Báo 'Phòng đã hết hạn'<br/>đưa mọi người về trang chủ<br/>SUP-01"]
  end
  W1 --> W2
  S1 --> S2
  S2 -- "Đang quay / tạm dừng do host (host online)" --> S3 --> S4 --> S6
  S2 -- "Chờ bắt đầu / treo vì host offline" --> S5 --> S6
  S2 -- "Chờ host xác nhận, host offline" --> S5b --> S6
  S6 --> S7
```

- **Happy path:**
  1. Còn 15 phút: cả phòng thấy cảnh báo và đếm ngược (SUP-03, SUP-01).
  2. Đến hạn 8 giờ: hệ thống xem trạng thái ván (BR-04).
  3. Ván ở Chờ bắt đầu: hủy ván, sang bước 5.
  4. Ván Đang quay hoặc Tạm dừng do host (host vẫn online): phòng Chờ đóng, không cho bắt đầu ván mới; khi ván kết thúc thì sang bước 5 (Q-028, Q-029).
  5. Phòng Đã đóng; mọi link mời hết hiệu lực; hủy hẹn giờ còn lại.
  6. Mọi thành viên thấy "Phòng đã hết hạn", được đưa về trang chủ, có thể tạo/vào phòng khác (BR-02).
- **Alternative paths:**
  - A1. Ván treo vì host offline (Tạm dừng – chờ host) lúc đến hạn: hủy ván, đóng ngay (Q-021).
  - A2. Ván Chờ host xác nhận mà host offline lúc đến hạn: ván Kết thúc với người thắng đã xác định, lưu lịch sử, rồi đóng phòng (Q-042, BR-28).
  - A3. Phòng đóng sớm do người cuối cùng rời (FLOW-11 A2).
- **Exceptions:**
  - E1. Thành viên offline lúc đóng: khi mở lại ứng dụng thấy thông báo phòng đã hết hạn.
- **Supporting kích hoạt:** SUP-03 bước 1, 2; SUP-01 bước 1, 6.
- **Business rules áp dụng:** BR-04 bước 2–4; BR-05 bước 5; BR-28 tại A2.
