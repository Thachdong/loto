### FLOW-11 Rời phòng (BIZ-11)
- **Actor:** ACT-03 Player (gồm host), ACT-05 Hệ thống · **Trigger:** Bấm "Rời phòng" · **Kết quả:** Người dùng không còn ở phòng; người cuối rời thì phòng đóng

```mermaid
flowchart TD
  subgraph P["ACT-03 Player / Host"]
    S1["Bấm Rời phòng, xác nhận"]
    T1["Chọn người nhận host<br/>(FLOW-10 A1)"]
  end
  subgraph H["Hệ thống"]
    S2{"Là host?"}
    S3{"Còn thành viên khác?"}
    S4["Thành viên → Đã rời"]
    S5{"Ván đang diễn ra?"}
    S6["Vé khóa tới hết ván<br/>BR-22"]
    S7["Vé về Trống"]
    S8["Báo cả phòng<br/>SUP-01"]
    C1["Hủy ván chưa kết thúc<br/>Phòng → Đã đóng<br/>link hết hiệu lực"]
    X1(["Về trang chủ"])
  end
  S1 --> S2
  S2 -- Không --> S4
  S2 -- Có --> S3
  S3 -- Có --> T1 --> S4
  S3 -- Không --> C1 --> X1
  S4 --> S5
  S5 -- Có --> S6 --> S8
  S5 -- Không --> S7 --> S8
  S8 --> X1
```

- **Happy path (player):**
  1. Player bấm "Rời phòng", xác nhận.
  2. Hệ thống kiểm tra vai trò: không phải host.
  3. Thành viên chuyển Đã rời.
  4. Vé: ván đang diễn ra thì khóa tới hết ván rồi về Trống; không thì về Trống ngay (BR-22).
  5. Cả phòng thấy "<tên> đã rời phòng" (SUP-01).
  6. Người rời về trang chủ, có thể tạo/vào phòng khác (BR-02).
- **Alternative paths:**
  - A1. Host rời khi còn thành viên khác: bắt buộc chọn người nhận host đang online trước (FLOW-10 A1), rồi tiếp bước 3 (BR-21).
  - A2. Người cuối cùng rời (host một mình): hủy ván chưa kết thúc, phòng Đã đóng, link mời hết hiệu lực (BR-21).
  - A3. Người đã rời muốn quay lại: dùng link còn hạn (FLOW-03 A2, BR-25).
- **Exceptions:**
  - E1. Host còn thành viên khác nhưng tất cả đang offline: không cho rời; báo "Chờ có thành viên online để chuyển host, hoặc kick các thành viên còn lại" (Q-038, BR-21).
- **Supporting kích hoạt:** SUP-01 tại bước 5; SUP-03 hủy hẹn giờ tại A2.
- **Business rules áp dụng:** BR-21 tại A1, A2; BR-22 bước 4; BR-02 bước 6; BR-25 tại A3.
