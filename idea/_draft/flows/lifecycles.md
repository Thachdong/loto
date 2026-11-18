### Vòng đời entity

#### ENT-02 Phòng
```mermaid
stateDiagram-v2
  [*] --> DangHoatDong: Tạo phòng (FLOW-02)
  DangHoatDong --> ChoDong: Đến hạn 8 giờ, ván đang chạy (FLOW-14)
  DangHoatDong --> DaDong: Đến hạn, ván chờ/treo (FLOW-14)
  DangHoatDong --> DaDong: Người cuối cùng rời (FLOW-11)
  ChoDong --> DaDong: Ván kết thúc (FLOW-14)
  DaDong --> [*]
```
| Trạng thái | → Trạng thái | Do FLOW/bước | Actor |
|---|---|---|---|
| — | Đang hoạt động | FLOW-02 bước 3 | ACT-01 |
| Đang hoạt động | Chờ đóng | FLOW-14 bước 4 | ACT-05 |
| Đang hoạt động | Đã đóng | FLOW-14 bước 3, A1, A2; FLOW-11 A2 | ACT-05 / ACT-02 |
| Chờ đóng | Đã đóng | FLOW-14 bước 4→5 | ACT-05 |

#### ENT-03 Thành viên phòng
```mermaid
stateDiagram-v2
  [*] --> TrongPhong: Tạo phòng / vào bằng link (FLOW-02, FLOW-03)
  TrongPhong --> DaRoi: Rời phòng (FLOW-11)
  TrongPhong --> BiKick: Host kick (FLOW-10)
  DaRoi --> [*]
  BiKick --> [*]
```
Ghi chú: Online/offline là thuộc tính song song (SUP-04), không phải trạng thái vòng đời. Vai trò Host ⇄ Player đổi qua FLOW-10 A1. Người Đã rời vào lại = lần tham gia mới (FLOW-03 A2).

| Trạng thái | → Trạng thái | Do FLOW/bước | Actor |
|---|---|---|---|
| — | Trong phòng | FLOW-02 bước 4; FLOW-03 bước 12 | ACT-01 / ACT-04 |
| Trong phòng | Đã rời | FLOW-11 bước 3 | ACT-03 |
| Trong phòng | Bị kick | FLOW-10 bước 3 | ACT-02 |
| Trong phòng | (kết thúc khi phòng đóng) | FLOW-14 bước 6; FLOW-11 A2 | ACT-05 |

#### ENT-04 Link mời
```mermaid
stateDiagram-v2
  [*] --> ConHieuLuc: Host bấm Mời (FLOW-03)
  ConHieuLuc --> HetHan: Quá 8 giờ / phòng đóng
  HetHan --> [*]
```
| Trạng thái | → Trạng thái | Do FLOW/bước | Actor |
|---|---|---|---|
| — | Còn hiệu lực | FLOW-03 bước 2 | ACT-02 |
| Còn hiệu lực | Hết hạn | SUP-03 (8 giờ); FLOW-14 bước 5; FLOW-11 A2 | ACT-05 |

#### ENT-05 Ván
```mermaid
stateDiagram-v2
  [*] --> ChoBatDau: Tạo phòng / ván trước kết thúc
  ChoBatDau --> DangQuay: Host bấm Bắt đầu (FLOW-06)
  DangQuay --> TamDung: Host tạm dừng / host offline / đang kiểm tra Kinh
  TamDung --> DangQuay: Host tiếp tục / kinh hụt
  DangQuay --> ChoDongKinh: Kinh đúng đầu tiên (FLOW-08)
  TamDung --> ChoDongKinh: Kinh đúng khi đang tạm dừng
  ChoDongKinh --> ChoXacNhan: Hết 5 giây
  ChoXacNhan --> KetThuc: Host xác nhận (BR-28)
  DangQuay --> KetThuc: Rao hết 90 số (BR-19)
  ChoXacNhan --> KetThuc: Phòng đến hạn, host offline
  ChoBatDau --> DaHuy: Phòng đến hạn / người cuối rời
  TamDung --> DaHuy: Phòng đến hạn khi treo vì host offline
  DangQuay --> DaHuy: Người cuối rời
  KetThuc --> [*]
  DaHuy --> [*]
```
| Trạng thái | → Trạng thái | Do FLOW/bước | Actor |
|---|---|---|---|
| — | Chờ bắt đầu | FLOW-02 bước 6; FLOW-08 bước 9; FLOW-07 E3 | ACT-05 |
| Chờ bắt đầu | Đang quay | FLOW-06 bước 3 | ACT-02 |
| Đang quay | Tạm dừng | FLOW-06 A1, A4; FLOW-08 bước 4 | ACT-02 / ACT-05 |
| Tạm dừng | Đang quay | FLOW-06 A2; FLOW-08 E3 | ACT-02 / ACT-05 |
| Đang quay / Tạm dừng | Đang chờ đồng kinh | FLOW-08 bước 6, A1 | ACT-05 |
| Đang chờ đồng kinh | Chờ host xác nhận | FLOW-08 bước 7 | ACT-05 |
| Chờ host xác nhận | Kết thúc | FLOW-08 bước 7b; FLOW-14 A2 | ACT-02 / ACT-05 |
| Đang quay | Kết thúc (không người thắng) | FLOW-07 E2 | ACT-05 |
| Chờ bắt đầu / Tạm dừng / Đang quay | Đã hủy | FLOW-14 bước 3, A1; FLOW-11 A2 | ACT-05 |

#### ENT-06 Bộ vé
```mermaid
stateDiagram-v2
  [*] --> HienHanh: Tạo phòng / host tạo bộ mới
  HienHanh --> DaThayThe: Host tạo bộ mới (FLOW-04)
  DaThayThe --> [*]
```
| Trạng thái | → Trạng thái | Do FLOW/bước | Actor |
|---|---|---|---|
| — | Hiện hành | FLOW-02 bước 5; FLOW-04 bước 4 | ACT-05 |
| Hiện hành | Đã thay thế | FLOW-04 bước 4 | ACT-02 |

#### ENT-07 Vé
```mermaid
stateDiagram-v2
  [*] --> Trong: Sinh bộ vé
  Trong --> DangGiu: Player lấy vé (FLOW-05)
  DangGiu --> Trong: Bỏ vé / thu hồi / rời, kick khi không có ván
  DangGiu --> BiKhoa: Rời / kick khi ván đang diễn ra
  BiKhoa --> Trong: Ván kết thúc
```
| Trạng thái | → Trạng thái | Do FLOW/bước | Actor |
|---|---|---|---|
| — | Trống | FLOW-02 bước 5; FLOW-04 bước 4 | ACT-05 |
| Trống | Đang giữ | FLOW-05 bước 5 | ACT-03 |
| Đang giữ | Trống | FLOW-05 A1; FLOW-04 A1, A2; FLOW-10 bước 4; FLOW-11 bước 4 | ACT-03 / ACT-02 |
| Đang giữ | Bị khóa | FLOW-10 bước 4; FLOW-11 bước 4 (ván đang diễn ra) | ACT-02 / ACT-03 |
| Bị khóa | Trống | FLOW-08 bước 7b; FLOW-07 E2 | ACT-05 |

Ghi chú: trạng thái "Bị khóa" làm rõ BR-22 (vé của người rời/bị kick giữa ván) – bổ sung so với vòng đời ở business.md.

#### ENT-11 Lượt báo Kinh
```mermaid
stateDiagram-v2
  [*] --> DangKiemTra: Player bấm Kinh
  DangKiemTra --> Dung: Hàng đủ 5 số đã rao
  DangKiemTra --> Hut: Không đủ
  Dung --> [*]
  Hut --> [*]
```
| Trạng thái | → Trạng thái | Do FLOW/bước | Actor |
|---|---|---|---|
| — | Đang kiểm tra | FLOW-08 bước 2 | ACT-03 |
| Đang kiểm tra | Đúng | FLOW-08 bước 5–6, A2 | ACT-05 |
| Đang kiểm tra | Hụt | FLOW-08 E2 | ACT-05 |
