import { Timestamp } from "firebase-admin/firestore";
import { seedDatabase, seedFirestore } from "../lib/admin";
import { seedRoom } from "../lib/seed-room";
import { seedUser } from "../lib/seed-user";
import { seedUserDoc } from "../lib/seed-user-doc";

const AN = { uid: "u_ch_an", email: "an.chat@example.com", name: "Host An" };
const BINH = { uid: "u_ch_binh", email: "binh.chat@example.com", name: "Bình" };
const CHI = { uid: "u_ch_chi", email: "chi.chat@example.com", name: "Chi" };
const HOUR = 60 * 60 * 1000;
const ROOM = "r_chat";
export const CHAT_HISTORY_COUNT = 120;

/**
 * T-008 `chat-history` (alias `t008`): host An + Bình (giữ Đỏ A) + Chi, ván 1 `waiting`, 120 tin cách nhau 1 phút
 * (tin cuối = 1 phút trước) để thử phân trang 50/50/20. Chi chưa vào phòng — vào bằng mã `CHT234` hoặc link mời.
 */
export async function chatHistory(): Promise<void> {
  for (const p of [AN, BINH, CHI]) {
    await seedUser({ uid: p.uid, email: p.email, name: p.name });
    await seedUserDoc({
      uid: p.uid,
      email: p.email,
      googleName: p.name,
      displayName: p.name,
      profileCustomized: false,
      currentRoomId: p === CHI ? null : ROOM,
    });
  }
  const now = Date.now();
  const expiresAt = new Date(now + 8 * HOUR);
  const createdAt = new Date(expiresAt.getTime() - 8 * HOUR);
  await seedRoom({
    roomId: ROOM,
    hostUid: AN.uid,
    members: [AN.uid, BINH.uid],
    name: "Phòng chat",
    joinCode: "CHT234",
    inviteCode: "CHATINVITE00000000000",
    rngSeed: 81,
    createdAt,
    expiresAt,
    drawIntervalSec: 5,
    gameStatus: "waiting",
    players: [{ uid: BINH.uid, displayName: BINH.name, ticketIds: ["red_a"] }],
    playerCount: 0,
  });
  const db = seedFirestore();
  const expireAt = Timestamp.fromDate(new Date(createdAt.getTime() + 31 * 24 * HOUR));
  const batch = db.batch();
  for (let i = 1; i <= CHAT_HISTORY_COUNT; i++) {
    const sender = i % 2 ? AN : BINH;
    batch.set(db.doc(`rooms/${ROOM}/messages/m${String(i).padStart(3, "0")}`), {
      sender_uid: sender.uid,
      sender_name: sender.name,
      sender_photo_url: null,
      text: `Tin số ${i}`,
      created_at: Timestamp.fromDate(new Date(now - (CHAT_HISTORY_COUNT - i + 1) * 60_000)),
      expire_at: expireAt,
    });
  }
  await batch.commit();
  const node = (p: typeof AN) => ({ online: true, display_name: p.name, photo_url: null, at: now });
  await seedDatabase().ref(`presence/${ROOM}`).set({ [AN.uid]: node(AN), [BINH.uid]: node(BINH) });
  console.log(`[chat-history] roomId=${ROOM} (120 tin; Chi chưa vào phòng — mã CHT234)`);
  for (const p of [AN, BINH, CHI]) console.log(`  ${p.name}: uid=${p.uid} email=${p.email}`);
}
