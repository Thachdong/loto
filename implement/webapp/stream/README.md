# Stream server tiếng rao (ADR-08)

Mỗi phòng một luồng MP3 liên tục. Client phát bằng `<audio>`, không tự tải clip.

- `GET /rooms/{roomId}/stream?token=<Firebase ID token>` trả `audio/mpeg` chunked, không kết thúc.
  - Lỗi `401`: token sai.
  - Lỗi `403`: user không ở phòng này (`users.current_room_id`).
- `GET /healthz` trả `{ ok, rooms }`.

## Chạy local

```bash
npm run emulators        # terminal 1
npm run stream           # terminal 2 — cổng 8787, đọc .env.local (emulator)
npm run dev              # terminal 3 — client dùng NEXT_PUBLIC_AUDIO_STREAM_URL
```

## Bộ giọng

Mỗi bộ giọng là một thư mục `public/audio/<id>/` gồm:

- `manifest.json`
- `silence.mp3`
- các clip MP3, cùng sample rate và số kênh trong một bộ

Thêm bộ mới:

1. Copy clip vào `public/audio/<id>/`.
2. Tạo `silence.mp3`:
   ```bash
   ffmpeg -f lavfi -i anullsrc=r=48000:cl=stereo -t 1 -c:a libmp3lame -b:a 128k silence.mp3
   ```
3. Viết `manifest.json` (xem `v1`).
4. Thêm `{ id, name }` vào `VOICE_PACKS` trong `src/features/room/shared/domain/voice-pack.ts`.
5. Cập nhật `enum` của `voicePack` trong `specs/api-contract.yml`.

## Deploy (Cloud Run)

```bash
docker build -f stream/Dockerfile -t loto-stream .
```

Env cần đặt:

- `GCLOUD_PROJECT`
- `STREAM_ALLOWED_ORIGINS` (domain web)

Quyền: service account cần đọc Firestore và verify ID token.

Cấu hình Cloud Run:

- `--timeout=3600` (kết nối dài)
- `--concurrency` cao, vì mỗi người nghe giữ 1 request
- `--min-instances=1`
- Giữ 1 instance (`--max-instances=1`) hoặc bật session affinity. Mỗi instance tự giữ luồng riêng, nên các instance khác nhau sẽ lệch nhịp nhẹ.
