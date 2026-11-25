/**
 * Bộ giọng rao (ADR-08 sửa đổi): mỗi bộ là thư mục `public/audio/<id>/` có `manifest.json` + `silence.mp3`.
 * Host chọn khi tạo phòng / ở Cài đặt; stream server đọc `rooms.voice_pack` để phát.
 * Thuần TS, không import — stream server (`stream/`) dùng chung file này.
 */
export const VOICE_PACKS = [{ id: "v1", name: "Miền Tây" }] as const;

export type VoicePackId = (typeof VOICE_PACKS)[number]["id"];

export const DEFAULT_VOICE_PACK: VoicePackId = "v1";

export function isVoicePack(value: unknown): value is VoicePackId {
  return typeof value === "string" && VOICE_PACKS.some((p) => p.id === value);
}

/** Field lạ / thiếu (phòng cũ) → bộ mặc định. */
export function voicePackOf(value: unknown): VoicePackId {
  return isVoicePack(value) ? value : DEFAULT_VOICE_PACK;
}

/** Lựa chọn cho UI chọn giọng rao. */
export const VOICE_PACK_OPTIONS = VOICE_PACKS.map((p) => ({ value: p.id as VoicePackId, label: p.name }));
