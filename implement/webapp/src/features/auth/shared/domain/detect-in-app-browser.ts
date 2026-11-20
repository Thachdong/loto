export type BrowserInfo = { inApp: boolean; android: boolean; mobile: boolean };

/** UA trình duyệt trong ứng dụng chat chặn đăng nhập Google (ADR-07, NFR-13). */
const IN_APP_PATTERNS: RegExp[] = [
  /Zalo/i,
  /FBAN|FBAV|FB_IAB|FBIOS/,
  /Messenger/i,
  /Telegram/i,
  /Instagram/i,
  /\bLine\//, // LINE app ("Line/13.x"); phân biệt hoa thường để không bắt nhầm chữ khác
];

export function detectInAppBrowser(ua: string): BrowserInfo {
  const value = ua ?? "";
  return {
    inApp: IN_APP_PATTERNS.some((re) => re.test(value)),
    android: /Android/i.test(value),
    mobile: /Android|iPhone|iPad|iPod|Mobile/i.test(value),
  };
}
