import { describe, expect, it } from "vitest";
import { detectInAppBrowser } from "./detect-in-app-browser";

const UA = {
  zaloAndroid:
    "Mozilla/5.0 (Linux; Android 13; SM-A536E Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.6099.230 Mobile Safari/537.36 Zalo android/12100621 ZaloTheme/light ZaloLanguage/vi",
  fbanIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/445.0.0.35.117;FBBV/556348532;FBDV/iPhone14,5;FBMD/iPhone;FBSN/iOS;FBSV/17.2;FBSS/3;FBCR/;FBID/phone;FBLC/vi_VN;FBOP/5]",
  fbavAndroid:
    "Mozilla/5.0 (Linux; Android 14; Pixel 7 Build/UQ1A.240205.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/121.0.6167.143 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/450.0.0.42.109;]",
  messengerIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 LightSpeed [FBAN/MessengerLiteForiOS;FBAV/441.0.0.20.105;FBBV/553433046;FBDV/iPhone13,2;FBMD/iPhone;FBSN/iOS;FBSV/17.1;FBSS/3;FBCR/;FBID/phone;FBLC/vi;FBOP/0]",
  telegram:
    "Mozilla/5.0 (Linux; Android 12; M2101K6G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.6045.163 Mobile Safari/537.36 Telegram-Android/10.5.0 (Xiaomi M2101K6G; Android 12; SDK 31; AVERAGE)",
  instagram:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 312.0.0.32.112 (iPhone14,7; iOS 16_6; vi_VN; vi; scale=3.00; 1170x2532; 548339486)",
  line:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari Line/13.17.0",
  chromeAndroid:
    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
  safariIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
  chromeDesktop:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
};

describe("detectInAppBrowser (AC-17)", () => {
  it.each([
    ["Zalo Android", UA.zaloAndroid, true],
    ["FBAN iOS", UA.fbanIos, false],
    ["FBAV Android", UA.fbavAndroid, true],
    ["Messenger iOS", UA.messengerIos, false],
    ["Telegram Android", UA.telegram, true],
    ["Instagram iOS", UA.instagram, false],
    ["Line iOS", UA.line, false],
  ])("%s → inApp", (_name, ua, android) => {
    expect(detectInAppBrowser(ua)).toEqual({ inApp: true, android, mobile: true });
  });

  it("Chrome Android → not inApp, android", () => {
    expect(detectInAppBrowser(UA.chromeAndroid)).toEqual({ inApp: false, android: true, mobile: true });
  });

  it("Safari iOS → not inApp, not android", () => {
    expect(detectInAppBrowser(UA.safariIos)).toEqual({ inApp: false, android: false, mobile: true });
  });

  it("Chrome desktop → not inApp, not mobile", () => {
    expect(detectInAppBrowser(UA.chromeDesktop)).toEqual({ inApp: false, android: false, mobile: false });
  });

  it("does not match 'Line' without slash or as part of a word", () => {
    expect(detectInAppBrowser("Mozilla/5.0 Online Pipeline/1.0 Line").inApp).toBe(false);
  });

  it("empty UA", () => {
    expect(detectInAppBrowser("")).toEqual({ inApp: false, android: false, mobile: false });
  });
});
