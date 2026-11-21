/**
 * Từ điển chữ giao diện tiếng Việt (NFR-16).
 * Mọi chữ hiển thị cho người dùng lấy từ đây qua `t(key, params)`.
 * Tham số trong chuỗi viết dạng `{name}`.
 */
export const vi = {
  app: {
    name: "Lô Tô Online",
    tagline: "Chơi lô tô cùng bạn bè, mọi lúc mọi nơi",
    description: "Chơi lô tô online cùng bạn bè",
  },
  common: {
    loading: "Đang tải…",
    offline: "Mất kết nối – đang thử lại…",
  },
  account: {
    logo: "LÔ TÔ",
    menu: "Tài khoản",
    signOut: "Đăng xuất",
    signingOut: "Đang đăng xuất…",
  },
  login: {
    signInWithGoogle: "Đăng nhập với Google",
    signingIn: "Đang đăng nhập…",
    error: "Đăng nhập không thành công, thử lại.",
    inviteBanner: "Bạn được mời vào một phòng lô tô. Đăng nhập để vào phòng.",
    dataNote: "Chúng tôi chỉ dùng tên, ảnh đại diện và email Google của bạn.",
    inApp: {
      title: "Ứng dụng này không cho đăng nhập Google",
      step1: "Bấm nút ⋯ ở góc màn hình",
      step2: "Chọn \"Mở bằng trình duyệt\"",
      openChrome: "Mở bằng Chrome",
      copyLink: "Copy link",
      copied: "Đã copy link",
      copyManual: "Chọn và copy link bên dưới",
    },
  },
  home: {
    greeting: "Xin chào, {name}",
    createTitle: "Tạo phòng mới",
    roomNameLabel: "Tên phòng",
    roomNamePlaceholder: "Phòng của {name}",
    roomNameCounter: "{count}/50",
    roomNameInvalid: "Tên phòng từ 1 đến 50 ký tự",
    createRoom: "Tạo phòng",
    creating: "Đang tạo phòng…",
    createFailed: "Không tạo được phòng, thử lại",
    alreadyInRoom: "Bạn đang ở phòng {name}",
    joinTitle: "Vào phòng",
    joinHint: "Muốn vào phòng bạn bè? Mở link mời bạn nhận được.",
    currentTitle: "Bạn đang ở phòng",
    currentSummary: "Ván {game} · {status} · {members} người",
    backToRoom: "Về phòng",
  },
  room: {
    gameLine: "Ván {game} · {status}",
    members: "{count} người",
    roomCode: "Mã phòng",
    inviteLink: "Link mời",
    copyLink: "Copy link",
    copied: "Đã copy link",
    copyFailed: "Không copy được, hãy chọn và copy link",
  },
  gameStatus: {
    waiting: "Chờ bắt đầu",
    running: "Đang quay",
    paused: "Tạm dừng",
    awaiting_confirm: "Chờ host duyệt",
    finished: "Đã kết thúc",
    cancelled: "Đã hủy",
  },
  leaveReason: {
    kicked: "Bạn đã bị mời ra khỏi phòng \"{name}\".",
    expired: "Phòng \"{name}\" đã hết hạn.",
    host_left: "Host đã đóng phòng \"{name}\".",
    left: "Bạn đã rời phòng \"{name}\".",
    unknown: "Bạn không còn ở trong phòng.",
    dismiss: "Đóng",
  },
  error: {
    VALIDATION_FAILED: "Dữ liệu gửi lên không hợp lệ",
    GOOGLE_TOKEN_INVALID: "Đăng nhập Google không hợp lệ, vui lòng thử lại",
    UNAUTHENTICATED: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại",
    NOT_ROOM_MEMBER: "Bạn không còn ở phòng này",
    NOT_ROOM_HOST: "Chỉ host được thực hiện thao tác này",
    BLOCKED_FROM_ROOM: "Bạn không thể vào phòng này",
    NOT_TICKET_HOLDER: "Vé này không phải của bạn trong ván này",
    INVITE_INVALID: "Link mời không tồn tại",
    TICKET_NOT_FOUND: "Không tìm thấy vé",
    PLAYER_NOT_FOUND: "Người chơi không còn trong ván này",
    ALREADY_IN_ROOM: "Bạn đang ở một phòng khác, hãy rời phòng đó trước",
    INVITE_EXPIRED: "Link không còn hiệu lực",
    ROOM_FULL: "Phòng đã đầy",
    ROOM_CODE_INVALID: "Mã phòng không đúng hoặc đã hết hạn",
    DRAW_TOO_EARLY: "Chưa tới lượt quay số tiếp theo",
    ROOM_NOT_EXPIRED: "Phòng chưa hết hạn",
    ROOM_CLOSING: "Phòng sắp đóng, không thể bắt đầu ván mới",
    GAME_STALE: "Ván này đã cũ, vui lòng tải lại",
    GAME_NOT_WAITING: "Ván không còn ở trạng thái chờ bắt đầu",
    GAME_NOT_RUNNING: "Ván không đang quay số",
    GAME_NOT_PAUSED: "Ván không đang tạm dừng",
    GAME_NOT_AWAITING_CONFIRM: "Ván không ở trạng thái chờ host duyệt",
    CLAIMS_CLOSED: "Ván đã kết thúc, không nhận thêm Kinh",
    TICKET_ALREADY_CLAIMED: "Vé này đã báo Kinh, đang chờ host duyệt",
    CLAIM_HAS_WIN: "Có vé kinh đúng — hãy xác nhận kết thúc ván",
    NO_WINNING_CLAIM: "Chưa có vé kinh đúng để kết thúc ván",
    TICKET_TAKEN: "Vé đã có người giữ",
    TICKET_NOT_HELD: "Bạn không giữ vé này",
    TICKETS_STILL_HELD: "Còn người đang giữ vé",
    TARGET_ONLINE: "Người này đang online, không thể thu hồi vé",
    NO_TICKETS_HELD: "Chưa có ai lấy vé, chưa thể bắt đầu",
    TICKET_LIMIT_REACHED: "Mỗi người giữ tối đa 2 vé",
    CANNOT_TARGET_SELF: "Bạn không thể thực hiện thao tác này với chính mình",
    ROOM_NAME_INVALID: "Tên phòng phải từ 1 đến 50 ký tự",
    DRAW_INTERVAL_INVALID: "Nhịp quay phải từ 3 đến 15 giây",
    DISPLAY_NAME_INVALID: "Tên hiển thị phải từ 2 đến 30 ký tự",
    AVATAR_INVALID: "Ảnh đại diện không hợp lệ",
    MESSAGE_EMPTY: "Tin nhắn không được để trống",
    MESSAGE_TOO_LONG: "Tin nhắn tối đa 500 ký tự",
    RATE_LIMITED: "Bạn gửi quá nhanh, chờ một chút nhé",
    INTERNAL_ERROR: "Có lỗi xảy ra, vui lòng thử lại",
  },
} as const;

type Dict = typeof vi;

type Leaves<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string
    ? `${P}${K}`
    : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];

export type I18nKey = Leaves<Dict>;
export type I18nParams = Record<string, string | number>;

/** Lấy chữ theo key dạng `a.b.c`, thay `{param}`. Key không tồn tại → trả lại chính key. */
export function t(key: I18nKey, params?: I18nParams): string {
  const value = key
    .split(".")
    .reduce<unknown>(
      (node, part) =>
        node && typeof node === "object" ? (node as Record<string, unknown>)[part] : undefined,
      vi,
    );
  if (typeof value !== "string") return key;
  return interpolate(value, params);
}

/** Thay `{name}` bằng `params.name`; placeholder không có tham số giữ nguyên. */
export function interpolate(template: string, params?: I18nParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.hasOwn(params, name) ? String(params[name]) : match,
  );
}
