/**
 * `public/audio/manifest.json` `[ASSUMED]` (ADR-08): mỗi loại có nhiều biến thể (đường dẫn clip).
 * Thiếu số/loại → không có clip (Q-029, BR-26): chỉ hiện số, không phát.
 */
export type AudioManifest = {
  /** key = số "1".."90" → các biến thể câu rao. */
  numbers?: Record<string, readonly string[]>;
  /** Câu nối xen giữa các số. */
  connectors?: readonly string[];
  /** Tiếng kinh hụt (`claims_rejected`). */
  miss?: readonly string[];
  /** Tiếng "KINH!" ngắn (`claim_submitted`). */
  kinh?: readonly string[];
  /** Tiếng chúc mừng khi ván `finished`. */
  congrats?: readonly string[];
};

export type ClipKind = "number" | "connector" | "miss" | "kinh" | "congrats";

const KIND_KEY = { connector: "connectors", miss: "miss", kinh: "kinh", congrats: "congrats" } as const;

/** Chọn ngẫu nhiên 1 clip (`rng` ∈ [0,1) tiêm vào để test); thiếu → `null`. */
export function selectClip(
  manifest: AudioManifest | null | undefined,
  kind: ClipKind,
  n: number | null = null,
  rng: () => number = Math.random,
): string | null {
  if (!manifest) return null;
  const list = kind === "number" ? (n === null ? undefined : manifest.numbers?.[String(n)]) : manifest[KIND_KEY[kind]];
  if (!list || list.length === 0) return null;
  const index = Math.min(list.length - 1, Math.max(0, Math.floor(rng() * list.length)));
  return list[index] ?? null;
}
