import "server-only";

import v1 from "../../../../../public/audio/v1/manifest.json";
import { FALLBACK_CALL_MS } from "@/features/game/shared/domain/call-timing";
import { selectClip, type AudioManifest } from "@/features/game/shared/domain/select-clip";
import type { PendingCallDoc } from "@/features/room/db/room.doc";
import { voicePackOf, type VoicePackId } from "@/features/room/shared/domain/voice-pack";

type TimedManifest = AudioManifest & { durations?: Record<string, number> };

/** Manifest các bộ giọng (đóng gói lúc build; `durations` sinh bằng `npm run audio:manifest`). */
const MANIFESTS: Record<VoicePackId, TimedManifest> = { v1 };

export type PlannedCall = { number: number; clip: string | null; durationMs: number };

/** Chọn clip cho số `n` theo bộ giọng của phòng + độ dài clip (thiếu → `FALLBACK_CALL_MS`, stream im — Q-029). */
export function planCall(pack: string, n: number, rng: () => number = Math.random): PlannedCall {
  const manifest = MANIFESTS[voicePackOf(pack)];
  const clip = selectClip(manifest, "number", n, rng);
  const durationMs = clip ? (manifest.durations?.[clip] ?? FALLBACK_CALL_MS) : FALLBACK_CALL_MS;
  return { number: n, clip, durationMs };
}

export function pendingCallDoc(call: PlannedCall, gameId: string): PendingCallDoc {
  return { number: call.number, clip: call.clip, duration_ms: call.durationMs, game_id: gameId };
}
