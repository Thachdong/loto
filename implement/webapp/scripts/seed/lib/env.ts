/** Biến môi trường emulator mà seed bắt buộc phải có (Q-053: seed chỉ chạy trên emulator). */
export const REQUIRED_EMULATOR_VARS = ["FIRESTORE_EMULATOR_HOST", "FIREBASE_AUTH_EMULATOR_HOST"] as const;

export function projectId(): string {
  return process.env.GCLOUD_PROJECT ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "demo-loto";
}

/** Lỗi khi môi trường không phải emulator, hoặc null khi an toàn để seed. */
export function emulatorGuardError(): string | null {
  const missing = REQUIRED_EMULATOR_VARS.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    return `Chỉ chạy seed trên emulator — thiếu biến ${missing.join(", ")}`;
  }
  if (!projectId().startsWith("demo-")) {
    return `Chỉ chạy seed trên emulator — project "${projectId()}" không phải project demo-*`;
  }
  return null;
}
