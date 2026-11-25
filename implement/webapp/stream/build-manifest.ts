/**
 * Ghi `durations` (ms, theo frame MP3) vào `public/audio/<pack>/manifest.json` — server dùng để hẹn giờ hiện số
 * đúng lúc clip rao gần hết (ADR-05 sửa đổi). Chạy lại mỗi khi thêm/đổi clip:
 *   npm run audio:manifest -- v1
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseMp3, totalDurationMs } from "./mp3";

const audioDir = path.join(__dirname, "..", "public", "audio");
const packs = process.argv.slice(2);
if (packs.length === 0) throw new Error("Cần id bộ giọng, VD: npm run audio:manifest -- v1");

for (const pack of packs) {
  const file = path.join(audioDir, pack, "manifest.json");
  const manifest = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
  const lists = [manifest.numbers, manifest.connectors, manifest.kinh, manifest.miss, manifest.congrats];
  const clips = new Set<string>();
  for (const list of lists) {
    if (Array.isArray(list)) list.forEach((c) => clips.add(String(c)));
    else if (list && typeof list === "object") Object.values(list).forEach((v) => (v as string[]).forEach((c) => clips.add(c)));
  }
  const durations: Record<string, number> = {};
  for (const clip of [...clips].sort()) {
    durations[clip] = Math.round(totalDurationMs(parseMp3(readFileSync(path.join(audioDir, pack, clip)))));
  }
  writeFileSync(file, JSON.stringify({ ...manifest, durations }, null, 2) + "\n");
  console.log(`${pack}: ${Object.keys(durations).length} clip`);
}
