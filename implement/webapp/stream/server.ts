/**
 * Stream server tiếng rao (ADR-08 sửa đổi): mỗi phòng một luồng MP3 liên tục, client phát bằng `<audio>`.
 * Chạy riêng khỏi Next.js (cần process sống lâu): `npm run stream` (dev) / container Cloud Run (prod).
 *
 * GET /rooms/:roomId/stream?token=<Firebase ID token> → audio/mpeg (chunked, không kết thúc).
 * GET /healthz → 200.
 */
import http from "node:http";
import path from "node:path";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import type { Sink } from "./broadcaster";
import { StreamHub } from "./hub";
import { PackRegistry } from "./pack";
import { roomStateFromDoc } from "./room-state";

const PORT = Number(process.env.PORT ?? process.env.STREAM_PORT ?? 8787);
const AUDIO_DIR = path.resolve(process.env.AUDIO_DIR ?? path.join(__dirname, "..", "public", "audio"));
const ALLOWED_ORIGINS = (process.env.STREAM_ALLOWED_ORIGINS ?? "http://localhost:3000").split(",").map((s) => s.trim());
const TICK_MS = 25;

if (getApps().length === 0) initializeApp({ projectId: process.env.GCLOUD_PROJECT });
const db = getFirestore();
const auth = getAuth();
const packs = new PackRegistry(AUDIO_DIR);

function log(payload: Record<string, unknown>) {
  console.log(JSON.stringify({ svc: "stream", ...payload }));
}

const hub = new StreamHub({
  loadPack: (id) => packs.get(id),
  log,
  watchRoom: (roomId, onState, onGone) =>
    db.doc(`rooms/${roomId}`).onSnapshot(
      (snap) => {
        const data = snap.data();
        if (!data || data.status === "closed") onGone();
        else onState(roomStateFromDoc(data));
      },
      (error) => {
        log({ op: "watch_failed", roomId, message: error.message });
        onGone();
      },
    ),
});

setInterval(() => hub.tick(), TICK_MS).unref();

function cors(req: http.IncomingMessage, res: http.ServerResponse) {
  const origin = req.headers.origin;
  if (origin && (ALLOWED_ORIGINS.includes("*") || ALLOWED_ORIGINS.includes(origin))) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
}

/** Chỉ thành viên đang ở phòng (`users.current_room_id`) được nghe. */
async function authorize(token: string | null, roomId: string): Promise<number> {
  if (!token) return 401;
  let uid: string;
  try {
    uid = (await auth.verifyIdToken(token)).uid;
  } catch {
    return 401;
  }
  const user = await db.doc(`users/${uid}`).get();
  return user.get("current_room_id") === roomId ? 200 : 403;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  cors(req, res);
  if (req.method === "OPTIONS") {
    res.writeHead(204).end();
    return;
  }
  if (url.pathname === "/healthz") {
    res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ ok: true, rooms: hub.roomCount }));
    return;
  }
  const match = /^\/rooms\/([A-Za-z0-9_-]{1,128})\/stream$/.exec(url.pathname);
  if (req.method !== "GET" || !match) {
    res.writeHead(404).end();
    return;
  }
  const roomId = match[1]!;
  const status = await authorize(url.searchParams.get("token"), roomId).catch(() => 500);
  if (status !== 200) {
    res.writeHead(status).end();
    log({ op: "reject", roomId, status });
    return;
  }

  res.writeHead(200, {
    "Content-Type": "audio/mpeg",
    "Cache-Control": "no-cache, no-store",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();
  req.socket.setNoDelay(true);

  const sink: Sink = {
    write: (chunk) => void res.write(chunk),
    close: () => res.end(),
    backlog: () => res.writableLength,
  };
  const leave = hub.join(roomId, sink);
  log({ op: "join", roomId });
  res.on("close", () => {
    leave();
    log({ op: "leave", roomId });
  });
});

server.listen(PORT, () => log({ op: "listen", port: PORT, audioDir: AUDIO_DIR }));

function shutdown() {
  hub.stopAll();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
