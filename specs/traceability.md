# Traceability Matrix

> Nguồn: `idea/business.md`, `idea/business-flows.md`, `specs/*` · Quyết định mới nhất: Q-058 · Cập nhật: 2026-11-19

## 1. BIZ → toàn bộ artifact
| BIZ | FLOW | SUP | ENT | TBL | operationId | SCR | Trạng thái |
|---|---|---|---|---|---|---|---|
| BIZ-01 Đăng nhập Google | FLOW-01 | SUP-05, SUP-09 | ENT-01 | TBL-01 | createSession, deleteCurrentSession (đăng xuất = rời phòng; host = đóng phòng; không chặn giữa ván – Q-052, Q-057) | SCR-01, SCR-02, SCR-10 | ✅ |
| BIZ-02 Tạo phòng | FLOW-02 | SUP-03, SUP-09 | ENT-02, ENT-04, ENT-05, ENT-06, ENT-07 | TBL-01, TBL-02, TBL-03, TBL-05 | createRoom | SCR-02 | ✅ |
| BIZ-03 Mời & tham gia | FLOW-03 | SUP-05, SUP-06, SUP-01 | ENT-02, ENT-04 | TBL-01, TBL-02 | getInvite, joinRoom (`inviteCode` / `roomCode` – Q-056) | SCR-03, SCR-02 (nhập mã), SCR-04 (Mời) | ✅ |
| BIZ-04 Tạo lại bộ vé | FLOW-04 | SUP-01, SUP-04 | ENT-06, ENT-07 | TBL-02, TBL-03, TBL-06, TBL-08 | renewTicketSet, reclaimPlayerTickets | SCR-05, SCR-07 | ✅ |
| BIZ-05 Lấy / bỏ vé | FLOW-05 | SUP-01 | ENT-07, ENT-03 | TBL-03, TBL-06 | takeTicket, releaseTicket | SCR-05 | ✅ |
| BIZ-06 Điều khiển ván | FLOW-06 | SUP-01, SUP-03 | ENT-05 | TBL-02, TBL-05, TBL-06 | startGame, pauseGame, resumeGame, updateRoom | SCR-04, SCR-11 | ✅ |
| BIZ-07 Quay số & rao | FLOW-07 | SUP-02, SUP-03, SUP-10 | ENT-05, ENT-09 | TBL-02 (`called_numbers`), TBL-05 | startGame (số đầu), drawNumber (host + player dự phòng – Q-052) | SCR-04 | ✅ |
| BIZ-08 Dò số & báo Kinh | FLOW-08 | SUP-01, SUP-02, SUP-03 | ENT-05, ENT-07, ENT-11 | TBL-02, TBL-03, TBL-05, TBL-06 | createClaim, rejectClaims, confirmGame (Q-055; bỏ closeClaimWindow) | SCR-04, SCR-09 | ✅ |
| BIZ-09 Kho tiếng rao | FLOW-09 | SUP-02 | ENT-09 | — (file tĩnh + stream server, ADR-08) | — (ngoài ứng dụng) | — (Q-018) | ✅ |
| BIZ-10 Kick player | FLOW-10 | SUP-01 | ENT-03 | TBL-01, TBL-02, TBL-06, TBL-08 | kickPlayer | SCR-07 | ✅ |
| BIZ-11 Rời phòng | FLOW-11 | SUP-01 | ENT-03 | TBL-01, TBL-02, TBL-06, TBL-08 | leaveRoom (player rời; host rời = đóng phòng – Q-057) | SCR-04 | ✅ |
| BIZ-12 Chat | FLOW-12 | SUP-01, SUP-07 | ENT-10 | TBL-01 (`chat_recent_at`), TBL-04 | sendMessage | SCR-06 | ✅ |
| BIZ-13 Lịch sử ván | FLOW-13 | — | ENT-05 | TBL-05, TBL-06 | — (realtime đọc `games`); dữ liệu ghi bởi confirmGame | SCR-08 | ✅ |
| BIZ-14 Hết hạn & đóng phòng | FLOW-14 | SUP-01, SUP-03 | ENT-02, ENT-04, ENT-05 | TBL-01, TBL-02, TBL-05, TBL-08 | expireRoom + lazy expiry ở mọi thao tác (Q-051) | SCR-04, SCR-02 | ✅ |
| BIZ-15 Cài đặt cá nhân | FLOW-15 | SUP-02, SUP-10 | ENT-03 | — (localStorage, Q-047) | — (client) | SCR-11 | ✅ |
| BIZ-16 Hồ sơ cá nhân | FLOW-16 | SUP-08, SUP-01 | ENT-01 | TBL-01, TBL-06 | updateProfile, resetProfile | SCR-10 | ✅ |
| SUP-09 Thống kê | — | SUP-09 | — | TBL-07 | — (task `aggregateDailyStats`) | — (console) | ✅ |
| SUP-04 Online/offline | — | SUP-04 | — | TBL-08 | — (client ghi RTDB) | SCR-07 | ✅ |

## 2. NFR → nơi đáp ứng
| NFR | Đáp ứng ở (ADR / index / API / UI) | Trạng thái |
|---|---|---|
| NFR-01 Số mới đồng bộ ≤ 1s | ADR-04 (Firestore `asia-southeast1` + listener), ADR-05 (client điều nhịp, server chọn số), TBL-02 `called_numbers` | ✅ |
| NFR-02 Sự kiện phòng ≤ 1s | ADR-03, `rooms.last_event` + listener (SUP-01) | ✅ |
| NFR-03 Kết quả Kinh ≤ 1s | createClaim kiểm đồng bộ trong transaction, O(81); gợi ý đúng/hụt hiện ngay, host chốt sau (Q-055) | ✅ |
| NFR-04 Mở phòng từ link ≤ 3s | ADR-02 SSR `/join/{code}`, getInvite | ✅ |
| NFR-05 Tiếng rao ≤ 0,5s | ADR-08 stream server (trễ ~0,5–2s do đệm `<audio>` — chấp nhận) | ⚠ |
| NFR-06 800 người đồng thời, mở rộng 500 phòng | ADR-05 không còn hẹn giờ server; dữ liệu gom theo phòng | ✅ |
| NFR-07 Uptime 99%, khôi phục khi mất mạng | Firestore SLA, listener tự nối lại; ô đánh dấu ở localStorage; ADR-13 backup | ✅ |
| NFR-08 Công bằng | ADR-05 server chọn số bằng `crypto.randomInt` và từ chối gọi sớm (`DRAW_TOO_EARLY`); ADR-14 sinh vé ở server; Kinh kiểm ở server | ✅ |
| NFR-09 Kiểm soát quyền | ADR-03 ghi qua server; `x-roles`; rules đọc theo `users.current_room_id`; mã mời 128-bit | ✅ |
| NFR-10 Privacy NĐ 13/2023 | TBL-01 email không lộ; ADR-04 ghi chú chuyển dữ liệu; SCR-01 ghi chú dữ liệu Google | ✅ |
| NFR-11 Xóa dữ liệu phòng 30 ngày | ADR-10 TTL `expire_at` (31 ngày) | ✅ |
| NFR-12 Mobile-first, vùng bấm | wireframe mục 5; SCR-04 bố cục 1 vé / 2 vé (Q-049). Ô vé 2 vé cao 28px < 44px — chấp nhận để thấy đủ 2 vé | ⚠️ chấp nhận (Q-049) |
| NFR-13 Mở từ app chat | ADR-07 nhận diện in-app browser; SCR-01 trạng thái "Mở bằng trình duyệt" | ✅ |
| NFR-14 Chạm "Bật tiếng" | ADR-08; SCR-04.A1 | ✅ |
| NFR-15 Giữ màn hình sáng | tech-stack mục 5 (Wake Lock API) — quan trọng hơn sau Q-051 vì timer client điều nhịp | ✅ |
| NFR-16 Tiếng Việt, GMT+7 | ADR-02 từ điển tiếng Việt; hiển thị giờ GMT+7 | ✅ |
| NFR-17 Observability | ADR-13 alert lỗi > 5%/5 phút, trễ tick; ADR-11 thống kê | ✅ |

## 3. Kết quả kiểm tra tự động
| Mã | Kết quả |
|---|---|
| X1 BIZ có FLOW / SCR / operation | Đạt. BIZ-07, BIZ-14 do client gọi khi tới giờ (Q-051); BIZ-09 ngoài ứng dụng; BIZ-13, BIZ-15 chỉ đọc realtime/client — đúng thiết kế |
| X2 ENT có TBL; SUP có giải pháp | Đạt (ENT-09 file tĩnh; ENT-03 gộp vào `current_room_id` + `players` theo Q-047) |
| X3 Không orphan | Đạt: 23/23 operation có `x-business` (sau Q-055: −closeClaimWindow, +rejectClaims); mọi TBL, SCR truy về BIZ/SUP |
| X4 operationId trong wireframe tồn tại | Đạt: 0 lệch; 23/23 operation đều được dùng (joinRoom dùng ở SCR-02.A4 và SCR-03.A1) |
| X5 Field màn ↔ schema | Đạt sau khi đồng bộ 4 operationId và 12 mã lỗi từ ui-screen-design về api-contract |
| X6 Field API ↔ cột DB | Đạt. Field không có cột là ID, input hoặc giá trị tính (vd `viewer`, `isNewUser`, `alreadyMember`, `nextGameId`, `inviteUrl`) |
| X7 Enum trạng thái | Đạt: trạng thái ván (6 giá trị sau Q-055, bỏ `claim_window`) và phòng (`active/closing/closed`) khớp DB ↔ API ↔ vòng đời |
| X8 `x-roles` ↔ ma trận | Đạt: thao tác host chỉ ACT-02; `leaveRoom` ACT-03 + ACT-02 (host rời = đóng phòng – BR-21, Q-057) |
| X9 Validation | Đạt: tên 2–30, tên phòng 1–50, chat 1–500, nhịp 5/10/15, ảnh ≤ 5 MB, 5 tin/10 giây khớp UI ↔ API ↔ DB ↔ BR |
| X10 NFR | Đạt, NFR-12 chấp nhận ngoại lệ (Q-049) |
| X11 Link file | Đạt: không có link hỏng |
| X12 YAML / XML | Đạt: YAML parse, mọi `$ref` tồn tại; 11 file drawio XML hợp lệ. Chưa chạy được Redocly lint (bị chặn quyền) |

## 4. Vấn đề phát hiện
| # | Loại | Mô tả | File | Đề xuất | Skill xử lý |
|---|---|---|---|---|---|
| 1 | — (đã sửa) | ui-screen-design và api-contract đặt khác tên 4 operation (`deleteSession`, `regenerateTickets`, `reclaimTickets`, `confirmGameEnd`) và 12 mã lỗi | `specs/ui-ux/scr-*.md`, `drawio/scr-03-join.drawio` | Đã đổi theo api-contract | ui-screen-design |
| 2 | — (đã sửa) | Thiếu điều hướng SCR-11 → SCR-10 và thao tác SCR-05.A4 | `wireframe.md` | Đã thêm (Q-050) | ui-screen-map |
| 3 | Ghi chú | Trang "Đang quay – player (Auto, 2 vé)" của SCR-04 vẫn dùng bố cục cuộn cũ để minh họa hiệu ứng Auto; bố cục thật khi giữ 2 vé là trang "bố cục chuẩn 2 vé" | `drawio/scr-04-room.drawio` | Đã ghi chú trên trang; vẽ lại nếu muốn | ui-screen-design |
| 5 | — (đã sửa) | Q-051: bỏ Cloud Tasks; thêm `drawNumber`, `closeClaimWindow`, `expireRoom`; đăng xuất = rời phòng (host bị chặn); thêm SCR-04.A10/A11, SCR-09.A2, SCR-10.A4 | `api-contract.yml`, `tech-stack.md` ADR-05, `database*.md`, `wireframe.md`, `scr-04/09/10/02` | Đã cập nhật đồng bộ | api-contract, ui-screen-design |
| 6 | — (đã sửa) | Đối chiếu `specs/actions.md` (Q-055..Q-058): bỏ cửa sổ đồng kinh, mọi Kinh chờ host duyệt (`rejectClaims`, `games.claims`); mã phòng 6 ký tự (`join_code`, SCR-02.A4); rời/đăng xuất giữa ván được, host rời = đóng phòng; trả vé người offline khi ván kết thúc | business.md, business-flows.md, `api-contract.yml`, `database*.md`, `tech-stack.md`, `wireframe.md`, `scr-02/04/09/10` | Đã cập nhật đồng bộ. Drawio SCR-02/04/09 chưa vẽ lại (xem #7) | api-contract, ui-screen-design |
| 7 | Ghi chú | Drawio chưa cập nhật theo Q-055..Q-057: SCR-09 (trang thẻ đồng kinh → Chờ host duyệt, nút Bác bỏ), SCR-02 (card Vào phòng + dialog nhập mã), SCR-04 (Sheet Mời có mã phòng, nút Rời của host, dialog cảnh báo đang chơi) | `drawio/scr-02-home.drawio`, `scr-04-room.drawio`, `scr-09-result.drawio` | Vẽ lại bằng ui-screen-design | ui-screen-design |
| 4 | Ghi chú | Chưa lint OpenAPI bằng Redocly | `api-contract.yml` | Chạy `npx @redocly/cli lint specs/api-contract.yml` khi có quyền | api-contract |

**Kết luận: PASS** — không còn MISSING / MISMATCH.
