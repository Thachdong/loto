1. user -> sign-in -> home page -> tạo room -> copy link, code
2. user -> click link -> vào room -> chọn ticket -> thành player -> play game
3. user đang ở home -> tìm room -> nhập code -> vào room -> chọn ticket -> thành player -> play game
4. host/user đang trong room -> chat
5. host start game -> server trả số random đầu tiên -> sau x giây -> host tự request số tiếp theo
6. game đang diễn ra -> host mất mạng/thoát webapp -> sau x giây từ lúc server trả về con số trước đó -> chờ thêm 5s -> player có màu ... sẽ tự request số tiếp theo -> game diễn ra cho đến có người bấm "kinh" -> game sẽ treo -> player tự giải tán
7. host/player đang chơi game -> mong muốn ra khỏi room -> hiển thị dialog cảnh báo đang chơi -> xác nhận out room -> vé đang chơi tự động bị huỷ
8. host/player đang chơi game -> mong muốn logout -> hiển thị dialog cảnh báo đang chơi -> xác nhận logout -> vé đang chơi tự động bị huỷ
9. host/player bị disconnected -> quay lại game -> tiếp tục game bình thường -> player/host phải tự check các số đã ra
10. player bị disconnected -> game kết thúc -> vé của player offline trả
11. player chơi game -> player bấm kinh (không hợp lệ) -> thông báo cho toàn bộ player + host -> pause game -> host reject -> game lại tiếp tục
12. player chơi game -> player bấm kinh (hợp lệ) -> thông báo cho toàn bộ player + host -> pause game -> host approved -> game kết thúc -> player có thể bỏ vé, lấy lại vé mới, out room ...
