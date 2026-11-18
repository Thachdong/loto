## 2. Flow tổng thể (Overview)
Hành trình end-to-end: người dùng đăng nhập Google → tạo phòng (thành host) → mời bạn qua link → bạn bè đăng nhập và vào phòng → mọi người lấy vé → host bắt đầu ván → hệ thống quay số và rao → player dò vé, bấm Kinh → hết cửa sổ đồng kinh, host xác nhận → ván kết thúc, ván mới chờ bắt đầu → lặp lại tới khi phòng hết hạn 8 giờ hoặc mọi người rời.

```mermaid
flowchart LR
  subgraph TK["Tài khoản"]
    F01["FLOW-01 Đăng nhập"]
    F16["FLOW-16 Hồ sơ"]
  end
  subgraph PH["Phòng"]
    F02["FLOW-02 Tạo phòng"]
    F03["FLOW-03 Mời & tham gia"]
    F10["FLOW-10 Quản lý thành viên"]
    F11["FLOW-11 Rời phòng"]
    F12["FLOW-12 Chat"]
    F14["FLOW-14 Hết hạn phòng"]
  end
  subgraph VE["Vé"]
    F04["FLOW-04 Tạo lại bộ vé"]
    F05["FLOW-05 Lấy/bỏ vé"]
  end
  subgraph VAN["Ván chơi"]
    F06["FLOW-06 Điều khiển ván"]
    F07["FLOW-07 Quay số & rao"]
    F08["FLOW-08 Dò số & Kinh"]
    F13["FLOW-13 Lịch sử ván"]
    F15["FLOW-15 Cài đặt cá nhân"]
  end
  F09["FLOW-09 Kho tiếng rao<br/>(ngoài ứng dụng)"]

  F01 -->|chưa ở phòng| F02
  F01 -->|đến từ link mời| F03
  F01 -.->|tùy chọn| F16
  F02 -->|host bấm Mời| F03
  F03 -->|vào phòng| F05
  F02 -->|host lấy vé| F05
  F05 -->|có ≥ 1 vé được giữ| F06
  F04 -->|bộ vé mới| F05
  F06 -->|bắt đầu / tiếp tục| F07
  F07 -->|số mới| F08
  F08 -->|kinh hụt| F07
  F08 -->|host xác nhận: ván mới chờ| F05
  F07 -->|hết 90 số: ván mới chờ| F05
  F08 -->|ván kết thúc| F13
  F09 -->|kho tiếng| F07
  F15 -.->|mode, tiếng| F07
  F10 -->|chuyển host| F11
  F11 -->|người cuối rời: đóng| F14
  F14 -->|đóng phòng| F01
  F11 -->|về trang chủ| F02

  S01[["SUP-01 Thông báo trong phòng"]]
  S02[["SUP-02 Tiếng rao"]]
  S03[["SUP-03 Hẹn giờ"]]
  S04[["SUP-04 Online/offline"]]
  S05[["SUP-05 Phiên đăng nhập"]]
  S06[["SUP-06 Chia sẻ link"]]
  S07[["SUP-07 Chống spam"]]
  S08[["SUP-08 Ảnh đại diện"]]
  S09[["SUP-09 Thống kê"]]
  S10[["SUP-10 Hiệu ứng Auto"]]
  F01 -.-> S05
  F03 -.-> S06
  F07 -.-> S02
  F08 -.-> S02
  F07 -.-> S03
  F14 -.-> S03
  F06 -.-> S04
  F12 -.-> S07
  F16 -.-> S08
  F07 -.-> S10
  PH -.-> S01
  VAN -.-> S01
  F02 -.-> S09
```

| Từ | Đến | Loại | Điều kiện |
|---|---|---|---|
| FLOW-01 | FLOW-02 | kích hoạt | Đăng nhập xong, không ở phòng nào, không đến từ link mời |
| FLOW-01 | FLOW-03 | kích hoạt | Đến từ link mời |
| FLOW-01 | FLOW-16 | tùy chọn | Người dùng mở hồ sơ |
| FLOW-02 | FLOW-03 | kích hoạt | Host bấm Mời |
| FLOW-02 / FLOW-03 | FLOW-05 | kích hoạt | Vào phòng, ván Chờ bắt đầu, còn vé |
| FLOW-04 | FLOW-05 | kích hoạt | Bộ vé mới, mọi vé trống |
| FLOW-05 | FLOW-06 | tiên quyết | Có ≥ 1 vé được giữ (BR-14) |
| FLOW-06 | FLOW-07 | kích hoạt | Host bấm Bắt đầu/Tiếp tục |
| FLOW-07 | FLOW-08 | kích hoạt | Có số mới, player dò vé |
| FLOW-08 | FLOW-07 | kích hoạt | Kinh hụt → quay tiếp |
| FLOW-08 | FLOW-05 | kích hoạt | Host xác nhận, ván mới Chờ bắt đầu |
| FLOW-07 | FLOW-05 | kích hoạt | Hết 90 số không ai kinh, ván mới Chờ bắt đầu |
| FLOW-08 / FLOW-07 | FLOW-13 | kích hoạt | Ván Kết thúc được ghi lịch sử |
| FLOW-09 | FLOW-07, FLOW-08 | tiên quyết | Kho tiếng rao đã nạp |
| FLOW-15 | FLOW-07, FLOW-08 | song song | Mode dò, bật/tắt tiếng áp dụng ngay |
| FLOW-12 | — | song song | Chat bất kỳ lúc nào khi phòng chưa đóng |
| FLOW-10 | FLOW-11 | tiên quyết | Host muốn rời khi còn người khác: chuyển host trước |
| FLOW-11 | FLOW-14 | kích hoạt | Người cuối cùng rời → đóng phòng |
| FLOW-14 | FLOW-01 / trang chủ | kích hoạt | Phòng đóng, mọi người về trang chủ |
| FLOW-11 | FLOW-02 / FLOW-03 | tùy chọn | Đã rời, có thể tạo/vào phòng khác |

### Hành trình theo actor
- **Host (ACT-02):** FLOW-01 Đăng nhập → FLOW-02 Tạo phòng → FLOW-03 Mời → FLOW-05 Lấy vé → FLOW-06 Bắt đầu → (FLOW-07 ⇄ FLOW-08) → FLOW-08 Xác nhận kết thúc → FLOW-06 Bắt đầu ván tiếp… → [FLOW-04 Tạo lại bộ vé] → [FLOW-10 Kick/chuyển host] → FLOW-11 Rời / FLOW-14 Hết hạn.
- **Khách → Player (ACT-04 → ACT-03):** Nhận link → FLOW-01 Đăng nhập → FLOW-03 Vào phòng → FLOW-05 Lấy vé (hoặc chờ nếu hết vé) → FLOW-15 Chọn mode/tiếng → FLOW-07 Nghe rao → FLOW-08 Dò & Kinh → FLOW-13 Xem lịch sử → FLOW-12 Chat (suốt quá trình) → FLOW-11 Rời / FLOW-14 Hết hạn.
- **Hệ thống (ACT-05):** FLOW-02 sinh vé & ván → FLOW-07 quay số → FLOW-08 kiểm tra Kinh → FLOW-14 hết hạn.
- **Đội phát triển (ACT-07):** FLOW-09 (trước phát hành).

### Kiểm tra
- Điểm bắt đầu: FLOW-01, FLOW-09. Không có FLOW mồ côi.
- Vòng lặp chính FLOW-05 → FLOW-06 → FLOW-07 ⇄ FLOW-08 → FLOW-05 có điểm thoát: FLOW-14 (hết hạn 8 giờ) và FLOW-11 (rời phòng). Không phải vòng lặp vô hạn.
- FLOW-13, FLOW-12, FLOW-16 là kết thúc tự nhiên (xem/gửi/sửa).
