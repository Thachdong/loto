import { readFile } from "node:fs/promises";
import path from "node:path";
import { selectClip, type AudioManifest, type ClipKind } from "../src/features/game/shared/domain/select-clip";
import { parseMp3, type Mp3Frame } from "./mp3";

export type PackManifest = AudioManifest & { version: string; silence: string };

export type Clip = { path: string; frames: Mp3Frame[] };

/**
 * Bộ giọng trên đĩa (`<audioDir>/<packId>/`): đọc manifest + cache frame từng clip.
 * Thiếu clip / file lỗi → `null` (Q-029: chỉ hiện số).
 */
export class VoicePack {
  private readonly cache = new Map<string, Promise<Clip | null>>();

  private constructor(
    readonly id: string,
    private readonly dir: string,
    readonly manifest: PackManifest,
    readonly silence: Mp3Frame[],
  ) {}

  static async load(audioDir: string, id: string): Promise<VoicePack> {
    const dir = path.join(audioDir, id);
    const manifest = JSON.parse(await readFile(path.join(dir, "manifest.json"), "utf8")) as PackManifest;
    const silence = parseMp3(await readFile(path.join(dir, manifest.silence)));
    if (silence.length === 0) throw new Error(`pack ${id}: silence.mp3 rỗng`);
    return new VoicePack(id, dir, manifest, silence);
  }

  clip(kind: ClipKind, n: number | null, rng: () => number = Math.random): Promise<Clip | null> {
    const file = selectClip(this.manifest, kind, n, rng);
    if (!file) return Promise.resolve(null);
    let pending = this.cache.get(file);
    if (!pending) {
      pending = readFile(path.join(this.dir, file))
        .then((buf) => ({ path: file, frames: parseMp3(buf) }))
        .catch(() => null);
      this.cache.set(file, pending);
    }
    return pending;
  }
}

/** Cache bộ giọng theo id (nạp 1 lần / process). */
export class PackRegistry {
  private readonly packs = new Map<string, Promise<VoicePack>>();

  constructor(private readonly audioDir: string) {}

  get(id: string): Promise<VoicePack> {
    let pending = this.packs.get(id);
    if (!pending) {
      pending = VoicePack.load(this.audioDir, id);
      pending.catch(() => this.packs.delete(id));
      this.packs.set(id, pending);
    }
    return pending;
  }
}
