import { parseReturnTo } from "./parse-return-to";

/** Điều hướng sau đăng nhập (SCR-01.A1): `returnTo` hợp lệ → SCR-03; đang ở phòng → `/room`; còn lại → `/`. */
export function postLoginPath(opts: { returnTo: string | null; currentRoomId: string | null }): string {
  const returnTo = parseReturnTo(opts.returnTo);
  if (returnTo) return returnTo;
  if (opts.currentRoomId) return "/room";
  return "/";
}
