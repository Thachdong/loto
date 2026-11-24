---
task: T-008
title: Chat trong phòng (SCR-06)
written_from_commit: 6eb6822
last_run: null
summary: null
---

# Test case QC · T-008 Chat (SCR-06)

## 0. Môi trường
- Như `backlog/testcases/T-006-game-room.md` mục 0 (emulators, dev server, đăng nhập emulator, 375×812).
- Seed `room-members` (`t009`) cho TC-01..07: An (host), Bình, Dũng online. Seed `chat-history` (`t008`, phòng `r_chat`, mã `CHT234`): Host An + Bình trong phòng, 120 tin "Tin số 1..120", Chi (`chi.chat@example.com`) chưa vào phòng.
- Chữ: "Chat" · "Nhập tin nhắn…" · "Gửi" · "Đang gửi…" · "Gửi thất bại · Gửi lại" · "Đang tải tin cũ hơn…" · "Chưa có tin nhắn. Chào cả phòng một câu nhé!" · "Không tải được tin nhắn" + "Thử lại" · "Bạn gửi quá nhanh, thử lại sau vài giây." · "Không thể gửi tin trong phòng này" · bộ đếm "{n}/500".
- `data-testid`: `tab-chat`, `chat-badge`, `chat-sheet`, `chat-list`, `chat-msg-{id}` (`data-mine`), `chat-pending-{tmpId}` (`data-status`), `btn-chat-resend-{tmpId}`, `chat-input`, `chat-counter` (`data-over`), `btn-chat-send`, `chat-rate-error`, `chat-blocked`, `chat-empty`, `chat-loading`, `chat-loading-older`, `chat-error`.

## 1. Ma trận phủ
| AC | TC / test tự động |
|---|---|
| AC-1 | TC-T008-01 · `send-message.test.ts`, `chat-sheet.test.tsx` |
| AC-2 | TC-T008-06 · `seed-scenarios.test.ts` (phân trang 50/50/20) |
| AC-3 | TC-T008-03 |
| AC-4, AC-5, AC-6 | TC-T008-04 · `message-rules.test.ts`, `send-message.test.ts`, `chat-sheet.test.tsx` |
| AC-7 | TC-T008-05 · `send-message.test.ts`, `chat-sheet.test.tsx` |
| AC-8 | TC-T008-07 · `send-message.test.ts`, `chat-sheet.test.tsx` |
| AC-9 | `rooms-rules.test.ts` (automated) |
| AC-10 | TC-T008-01 bước 1 · `chat-sheet.test.tsx` |
| AC-11 | TC-T008-08 · `chat-sheet.test.tsx` |
| AC-12 | TC-T008-02 · `chat-hooks.test.ts`, `room-screen.test.tsx` |
| AC-13 | kiểm ở T-011 |

## 3. Test case

### TC-T008-01 · Gửi và nhận tin
| Ưu tiên | Loại | Phủ | Chạy bằng |
|---|---|---|---|
| P0 | happy | AC-1, AC-10 | manual |

**Tiền điều kiện:** `npm run seed -- reset && npm run seed -- room-members`; P1 = An, P2 = Bình mở `/room`.

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1, P2 | Bấm "Chat" | "Chưa có tin nhắn. Chào cả phòng một câu nhé!" | ui |
| 2 | P1 | Nhập "  Chào cả nhà 😆  " → "Gửi" | Bubble phải mờ "Đang gửi…" rồi bình thường, ô nhập trống | ui |
| 3 | P2 | Quan sát | ≤ 1 giây bubble trái: chữ cái "A", "An · HH:mm" (giờ VN), "Chào cả nhà 😆" | ui |
| 4 | Emulator UI | `rooms/r_members/messages` | 1 doc, `text` đã trim, `sender_name = An`, có `expire_at` | emulator |

**Kết quả:** ⬜

### TC-T008-02 · Badge chưa đọc
| P0 | happy | AC-12 | manual |
|---|---|---|---|

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P2 | Đóng sheet Chat | — | ui |
| 2 | P1 | Gửi 3 tin | Nút "Chat" của P2 có badge "3" | ui |
| 3 | P2 | Mở Chat, đóng lại | Badge mất; tải lại trang vẫn không có badge | ui |

**Kết quả:** ⬜

### TC-T008-03 · Chat khi ván đang chạy
| P1 | luồng thay thế | AC-3 | manual |
|---|---|---|---|

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P1 | Bấm "Bắt đầu" | Ván chạy | ui |
| 2 | P2 | Mở Chat, gửi "Sắp kinh rồi" | Gửi được; thanh KINH vẫn hiện dưới sheet và bấm được | ui |

**Kết quả:** ⬜

### TC-T008-04 · Độ dài tin
| P1 | biên | AC-4, AC-5, AC-6 | manual |
|---|---|---|---|

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P2 | Gõ 3 dấu cách | "Gửi" khóa | ui |
| 2 | P2 | Dán 449 ký tự | Chưa có bộ đếm | ui |
| 3 | P2 | Dán thành 500 ký tự | "500/500" (không đỏ), "Gửi" bấm được → tin hiện ở P1 | ui |
| 4 | P2 | Dán 501 ký tự | "501/500" đỏ, "Gửi" khóa | ui |

**Kết quả:** ⬜

### TC-T008-05 · Gửi quá nhanh
| P0 | lỗi | AC-7 | manual |
|---|---|---|---|

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P2 | Gửi nhanh "1".."6" (Enter trên máy tính) trong < 10 giây | Tin 1–5 hiện; sau "6" dòng đỏ "Bạn gửi quá nhanh, thử lại sau vài giây.", ô nhập còn "6"; P1 chỉ thấy 5 tin | ui |
| 2 | P2 | Chờ ~10 giây → "Gửi" | "6" gửi được, dòng lỗi mất | ui |

**Kết quả:** ⬜

### TC-T008-06 · Tin cũ + phân trang
| P1 | happy | AC-2 | manual |
|---|---|---|---|

**Tiền điều kiện:** `npm run seed -- reset && npm run seed -- chat-history`.

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P3 | Đăng nhập Chi, nhập mã `CHT234` → vào phòng → "Chat" | Thấy "Tin số 71".."Tin số 120", đang ở cuối | ui |
| 2 | P3 | Cuộn lên đầu | "Đang tải tin cũ hơn…" rồi thêm "Tin số 21".."70", vị trí cuộn không nhảy | ui |
| 3 | P3 | Cuộn lên đầu lần nữa | Thêm "Tin số 1".."20"; cuộn lên tiếp không tải nữa | ui |

**Kết quả:** ⬜

### TC-T008-07 · Không còn trong phòng
| P1 | phân quyền | AC-8 | manual |
|---|---|---|---|

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P2 | Seed `room-members`; Bình mở Chat ở tab 1 | — | ui |
| 2 | P1 | "Người" → Kick Bình (hoặc Bình rời ở tab 2) | — | ui |
| 3 | P2 | Nếu tab 1 còn ở phòng, bấm "Gửi" | "Không thể gửi tin trong phòng này" (hoặc đã về trang chủ); không có doc mới | ui |

**Kết quả:** ⬜

### TC-T008-08 · Mất mạng khi gửi
| P1 | mất kết nối | AC-11 | manual |
|---|---|---|---|

| # | Profile | Thao tác | Kết quả mong đợi | Cách kiểm |
|---|---|---|---|---|
| 1 | P2 | DevTools → Offline, gửi "mất mạng" | Bubble "Gửi thất bại · Gửi lại" | ui |
| 2 | P2 | Bật mạng, bấm "Gửi lại" | Tin gửi thành công, P1 thấy đúng 1 tin | ui |

**Kết quả:** ⬜
