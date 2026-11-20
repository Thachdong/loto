import { seedAuth } from "./admin";

export type SeedUser = {
  uid: string;
  email: string;
  name: string;
  photoUrl?: string;
};

/**
 * Tạo user Auth emulator với provider `google.com` để hiện trong màn chọn tài khoản giả lập.
 * Idempotent: xóa user cũ cùng uid trước khi import.
 */
export async function seedUser({ uid, email, name, photoUrl }: SeedUser): Promise<void> {
  const auth = seedAuth();
  await auth.deleteUser(uid).catch(() => undefined);
  const result = await auth.importUsers([
    {
      uid,
      email,
      emailVerified: true,
      displayName: name,
      photoURL: photoUrl,
      providerData: [
        { uid: `google-${uid}`, providerId: "google.com", email, displayName: name, photoURL: photoUrl },
      ],
    },
  ]);
  if (result.failureCount > 0) {
    throw new Error(`seedUser ${uid}: ${result.errors.map((e) => e.error.message).join("; ")}`);
  }
}
