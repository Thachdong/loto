/** Hiển thị giờ theo GMT+7 (NFR-16). Dữ liệu lưu UTC. */
export type TimePattern = "HH:mm" | "dd/MM HH:mm";

const TIME_ZONE = "Asia/Ho_Chi_Minh";

const formatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function formatTimeVN(date: Date | number, pattern: TimePattern): string {
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );
  const time = `${parts.hour}:${parts.minute}`;
  return pattern === "HH:mm" ? time : `${parts.day}/${parts.month} ${time}`;
}
