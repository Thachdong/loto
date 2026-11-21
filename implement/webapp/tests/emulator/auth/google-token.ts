/**
 * Helper lấy ID token thật từ Auth emulator qua REST (không cần Google thật).
 * Host lấy từ `FIREBASE_AUTH_EMULATOR_HOST` do `firebase emulators:exec` đặt.
 */
import { PROJECT_ID } from "../helpers";

type TokenResult = { idToken: string; localId: string };

function authHost(): string {
  const host = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  if (!host) throw new Error("FIREBASE_AUTH_EMULATOR_HOST chưa đặt — chạy qua `npm test`.");
  return host;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`http://${authHost()}/identitytoolkit.googleapis.com/v1/${path}?key=fake-key`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} → ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

export type GoogleAccount = { email: string; name: string; photoUrl?: string; sub?: string };

/** Đăng nhập provider `google.com` (id_token giả dạng JSON — emulator chấp nhận). */
export async function googleIdToken({ email, name, photoUrl, sub }: GoogleAccount): Promise<TokenResult> {
  const claims = {
    sub: sub ?? `google-${email}`,
    email,
    name,
    ...(photoUrl ? { picture: photoUrl } : {}),
    email_verified: true,
  };
  const { idToken, localId } = await post<TokenResult>("accounts:signInWithIdp", {
    requestUri: "http://localhost",
    postBody: `id_token=${encodeURIComponent(JSON.stringify(claims))}&providerId=google.com`,
    returnSecureToken: true,
  });
  return { idToken, localId };
}

/** Đăng nhập ẩn danh (provider `anonymous`). */
export async function anonymousIdToken(): Promise<TokenResult> {
  const { idToken, localId } = await post<TokenResult>("accounts:signUp", { returnSecureToken: true });
  return { idToken, localId };
}

/** Đăng ký email/mật khẩu (provider `password`). */
export async function passwordIdToken(email: string): Promise<TokenResult> {
  const { idToken, localId } = await post<TokenResult>("accounts:signUp", {
    email,
    password: "secret-123",
    returnSecureToken: true,
  });
  return { idToken, localId };
}

async function emulatorDelete(host: string | undefined, path: string): Promise<void> {
  if (!host) throw new Error(`Thiếu host emulator cho ${path}`);
  const res = await fetch(`http://${host}${path}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`DELETE ${path} → ${res.status} ${await res.text()}`);
}

/** Xóa sạch Firestore + Auth emulator giữa các test. */
export async function clearFirestoreAndAuth(): Promise<void> {
  await emulatorDelete(
    process.env.FIRESTORE_EMULATOR_HOST,
    `/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
  );
  await emulatorDelete(authHost(), `/emulator/v1/projects/${PROJECT_ID}/accounts`);
}

export type CookieOptions = Record<string, unknown>;
export type CookieCall = { name: string; value: string; options?: CookieOptions };

/** Cookie store giả thay `cookies()` của `next/headers` (ngoài request Next không có cookies thật). */
export function createCookieStore() {
  const jar = new Map<string, string>();
  const sets: CookieCall[] = [];
  return {
    jar,
    sets,
    reset() {
      jar.clear();
      sets.length = 0;
    },
    get(name: string) {
      const value = jar.get(name);
      return value === undefined ? undefined : { name, value };
    },
    has(name: string) {
      return jar.has(name);
    },
    set(name: string, value: string, options?: CookieOptions) {
      jar.set(name, value);
      sets.push({ name, value, options });
    },
    delete(name: string) {
      jar.delete(name);
    },
  };
}
