# Idea Map (draft)

## Tóm tắt ý tưởng
Game lô tô online chơi theo phòng: user đăng nhập bằng Google, tạo phòng, mời bạn bè qua link (Messenger/Telegram/Zalo). Host tổ chức ván chơi với bộ 16 vé (8 cặp màu), người chơi lấy tối đa 2 vé; hệ thống quay số ngẫu nhiên kèm tiếng rao lô tô (rao từng số, câu nối giữa các số, chúc mừng người thắng) do AI tạo.

## Actors
| ID | Tên chuẩn | Tên gốc trong raw idea | Ghi chú |
|---|---|---|---|
| ACT-01 | Người dùng (User) | user | Đã đăng nhập, chưa ở vai trò nào trong phòng |
| ACT-02 | Host (chủ phòng) | host của room | User tạo phòng; vừa quản lý vừa có thể chơi? [?] |
| ACT-03 | Người chơi (Player) | player | Thành viên trong phòng, có hoặc không có vé |
| ACT-04 | Khách được mời | user nhận được link invite | Chưa đăng nhập / chưa có tài khoản; sau khi đăng nhập trở thành ACT-03 |
| ACT-05 | Hệ thống quay số / rao | "có hệ thống để tạo tiếng rao" | Actor hệ thống: quay số, phát tiếng rao |
| ACT-06 | Google | sign-in/up thông qua google | Hệ thống ngoài xác thực |

## Entities
| ID | Tên | Thuộc tính đã nhắc | Ghi chú |
|---|---|---|---|
| ENT-01 | Tài khoản người dùng | đăng nhập Google | |
| ENT-02 | Phòng (Room) | host, tối đa 16 người | |
| ENT-03 | Thành viên phòng | user, vai trò (host/player) | Quan hệ user–room |
| ENT-04 | Link mời | thuộc phòng | Hạn dùng/giới hạn lượt? [?] |
| ENT-05 | Ván game | thuộc phòng, chỉ 1 ván diễn ra tại 1 thời điểm | |
| ENT-06 | Bộ vé | 16 vé, 8 cặp màu, ngẫu nhiên, tạo lại được | Bộ vé gắn với phòng hay với ván? [?] |
| ENT-07 | Vé | màu, thuộc bộ vé, người giữ | Cấu trúc số trên vé [?] |
| ENT-08 | Lượt quay số | số đã ra, thứ tự | |
| ENT-09 | Tiếng rao | audio cho từng số, câu nối, câu chúc mừng | Kho audio |

## Actions
| # | Action | Actor | Entity | Câu gốc |
|---|---|---|---|---|
| 1 | Đăng ký/đăng nhập bằng Google | ACT-01, ACT-04 | ENT-01 | "user có thể sign-in/up thông qua google" |
| 2 | Tạo phòng | ACT-01 | ENT-02 | "user sau khi loged in có thể tạo room" |
| 3 | Tạo link mời | ACT-02 | ENT-04 | "tạo link mời và gửi cho user khác" |
| 4 | Chia sẻ link qua Messenger/Telegram/Zalo | ACT-02 | ENT-04 | "thông qua các kênh như messenger, telegram, zalo" |
| 5 | Mở link mời → đăng nhập/đăng ký → vào phòng | ACT-04 | ENT-04, ENT-03 | "user nhận được link invite có thể sign-in or sign-up" |
| 6 | Tạo ván game | ACT-02 | ENT-05 | "host của room có thể tạo game" |
| 7 | Tạo mới bộ vé | ACT-02 | ENT-06 | "host có thể tạo lại bộ vé mới" |
| 8 | Lấy vé | ACT-03 | ENT-07 | "player trong room có thể lấy vé" |
| 9 | Bỏ vé | ACT-03 | ENT-07 | "or bỏ vé" |
| 10 | Chờ trong phòng khi không có vé | ACT-03 | ENT-03 | "người không có vé vẫn có thể ở lại trong room" |
| 11 | Bắt đầu game | ACT-02 | ENT-05 | "host có nhiệm vụ: bắt đầu game" |
| 12 | Kick người chơi | ACT-02 | ENT-03 | "kick người chơi" |
| 13 | Quay số ngẫu nhiên + rao | ACT-05 | ENT-08, ENT-09 | "tạo tiếng rao cho từng con số ngẫu nhiên" |
| 14 | Rao câu nối giữa các số | ACT-05 | ENT-09 | "tiếng rao để nối giữa các con số" |
| 15 | Chúc mừng người chiến thắng | ACT-05 | ENT-05, ENT-09 | "tiếng chúc mừng người chiến thắng" |
| 16 | Chuẩn bị kho tiếng rao bằng AI | (đội vận hành?) | ENT-09 | "sử dụng AI để biến đổi audio thành các short audio giọng rao lô tô" |

## Nhóm nghiệp vụ sơ bộ
| ID | Tên | Actions | Lý do gộp/tách |
|---|---|---|---|
| BIZ-01 | Đăng ký / đăng nhập | 1 | Cửa vào duy nhất, chỉ qua Google |
| BIZ-02 | Tạo & quản lý phòng | 2, 12 | Cùng entity Phòng/Thành viên, do host làm |
| BIZ-03 | Mời & tham gia phòng | 3, 4, 5 | Hành trình riêng: tạo link → chia sẻ → khách vào phòng |
| BIZ-04 | Quản lý bộ vé | 7 | Có rule riêng (chỉ tạo lại khi mọi player đã bỏ vé) |
| BIZ-05 | Lấy / bỏ vé | 8, 9, 10 | Hành động của player, rule tối đa 2 vé, hết vé thì chờ |
| BIZ-06 | Tổ chức ván game | 6, 11 | Host tạo & bắt đầu ván, 1 ván/phòng tại 1 thời điểm |
| BIZ-07 | Quay số & rao | 13, 14 | Diễn biến trong ván, do hệ thống thực hiện |
| BIZ-08 | Xác định & chúc mừng người thắng | 15 | Kết thúc ván; cách xác định thắng chưa rõ |
| BIZ-09 | Chuẩn bị kho tiếng rao (AI) | 16 | Nghiệp vụ nội dung, chạy trước/ngoài ván chơi |

## Suy luận [ASSUMED]
- [ASSUMED] Người chơi cần thấy vé của mình và đánh dấu số đã ra (thủ công hoặc tự động).
- [ASSUMED] Cần cách "kinh/báo thắng" — người chơi hô thắng hoặc hệ thống tự phát hiện.
- [ASSUMED] Người chơi xem được danh sách thành viên trong phòng, ai đang giữ vé nào.
- [ASSUMED] Người chơi có thể tự rời phòng; user xem danh sách phòng mình đã tham gia.
- [ASSUMED] Host đồng thời có thể lấy vé và chơi như player.
- [ASSUMED] Cần kết thúc ván (khi có người thắng) để bắt đầu ván mới.
- [ASSUMED] Không dùng tiền thật (chơi giải trí).

## Gaps
| # | Topic | Ref | Câu hỏi | Gợi ý đáp án | Vì sao cần |
|---|---|---|---|---|---|
| 1 | Luật chơi | ENT-07 | Cấu trúc vé lô tô thế nào? | (a) Vé truyền thống 9 cột × 9 hàng, mỗi hàng 5 số, số 1–90; (b) 3 hàng × 9 cột; (c) khác | Quyết định cách sinh vé, cách xác định thắng |
| 2 | Luật chơi | BIZ-08 | Điều kiện thắng? | (a) Đủ 5 số 1 hàng ngang (kinh); (b) Kín cả vé; (c) Nhiều giải | Kết thúc ván |
| 3 | Luật chơi | BIZ-07/08 | Đánh dấu số & báo thắng do ai? | (a) Hệ thống tự dò & tự báo; (b) Người chơi tự dò, bấm "Kinh", hệ thống kiểm tra; (c) Host xác nhận | Trải nghiệm & chống gian lận |
| 4 | Luật chơi | BIZ-07 | Nhịp quay số? | (a) Tự động mỗi N giây; (b) Host bấm từng số; (c) Cả hai, host tạm dừng được | Vai trò host trong ván |
| 5 | Luật chơi | BIZ-08 | Nhiều người cùng kinh 1 số? | (a) Đồng thắng; (b) Ai báo trước thắng | |
| 6 | Bộ vé | ENT-06 | "8 cặp màu" nghĩa là gì? | (a) 2 vé cùng màu là 1 cặp, gợi ý 1 người lấy 1 cặp; (b) chỉ để phân biệt | Rule lấy vé |
| 7 | Bộ vé | BIZ-04/05 | Lấy/bỏ vé được khi nào? | (a) Chỉ khi ván chưa bắt đầu; (b) Bất kỳ lúc nào | Rule |
| 8 | Bộ vé | BIZ-04 | Bộ vé giữ nguyên qua nhiều ván? Người giữ vé giữ tiếp ván sau? | (a) Giữ nguyên, vé đi theo người; (b) Mỗi ván reset | Rule "chờ người khác bỏ vé ở ván sau" |
| 9 | Phòng | ENT-02 | Phòng tồn tại bao lâu, host đóng/xóa phòng được không? Host rời thì sao? | (a) Phòng vĩnh viễn đến khi host xóa; (b) Tự đóng khi không ai online; (c) Chuyển host | Vòng đời phòng |
| 10 | Phòng | BIZ-02 | Người bị kick có vào lại được không? | (a) Được nếu có link; (b) Bị chặn | |
| 11 | Phòng | BIZ-02 | 1 user tham gia/tạo được nhiều phòng? | (a) Không giới hạn; (b) Giới hạn | |
| 12 | Mời | ENT-04 | Link mời có hạn/giới hạn lượt? Phòng đủ 16 người thì sao? | (a) Link vĩnh viễn, đủ 16 báo full; (b) Có hạn N giờ | |
| 13 | Mời | BIZ-03 | Phòng công khai (tìm được) hay chỉ vào bằng link? | (a) Chỉ link; (b) Có sảnh phòng công khai | |
| 14 | Âm thanh | BIZ-09 | Kho tiếng rao chuẩn bị 1 lần (offline) hay sinh real-time? Ai quản lý? | (a) Chuẩn bị sẵn, admin upload; (b) Sinh real-time mỗi ván | Có cần actor Admin |
| 15 | Âm thanh | BIZ-07 | Có nhiều giọng rao để chọn? | (a) 1 giọng; (b) Host chọn giọng | |
| 16 | Tiền | — | Có đặt cược / giá vé / điểm thưởng? | (a) Không, giải trí thuần; (b) Điểm ảo; (c) Tiền thật | Pháp lý, nghiệp vụ thanh toán |
| 17 | Tương tác | — | Có chat / lịch sử ván / bảng xếp hạng? | (a) Không ở MVP; (b) Có chat; (c) Có lịch sử & thống kê | Phạm vi MVP |
