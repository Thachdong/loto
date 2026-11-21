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
    joinHint: "Có mã phòng 6 ký tự từ bạn bè? Hoặc mở link mời bạn nhận được.",
    joinButton: "Vào phòng",
    joinDialogTitle: "Nhập mã phòng",
    joinCodeLabel: "Mã phòng",
    joinCodePlaceholder: "K7M2QX",
    joinSubmit: "Vào",
    joining: "Đang vào…",
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
    copyCode: "Copy mã",
    codeCopied: "Đã copy mã phòng",
    copied: "Đã copy link",
    copyFailed: "Không copy được, hãy chọn và copy link",
    ticketsButton: "Vé",
  },
  ticket: {
    title: "Chọn vé",
    counter: "Bạn giữ {mine}/2 vé · {held}/16 vé đã có chủ",
    soldOut: "Hết vé trống — chờ người khác bỏ vé ở ván sau",
    lockedBanner: "🔒 Ván đang chạy — chỉ lấy/bỏ vé khi ván chờ bắt đầu.",
    mine: "Bạn",
    empty: "Trống",
    lockedUntilEnd: "Khóa tới hết ván",
    partnerLine: "{holder} · cặp với vé {partner} ({partnerHolder})",
    take: "Lấy vé này",
    taking: "Đang lấy vé…",
    takeMax: "Tối đa 2 vé",
    takeTaken: "Đã có người lấy",
    takeRunning: "Ván đang chạy",
    release: "Bỏ vé",
    releasing: "Đang bỏ vé…",
    back: "Quay lại danh sách vé",
    renew: "Tạo bộ vé mới",
    renewing: "Đang tạo…",
    renewConfirmTitle: "Tạo bộ vé mới?",
    renewConfirmBody: "16 vé sẽ được sinh lại cho cả phòng.",
    cancel: "Hủy",
    create: "Tạo",
    stillHeldTitle: "Chưa tạo được bộ vé mới",
    stillHeldBody: "Còn người đang giữ vé. Hãy nhắc họ bỏ vé hoặc thu hồi vé của người offline.",
    stillHeldRemind: "Nhắc họ bỏ vé",
    online: "Online",
    offline: "Offline",
    reclaim: "Thu hồi",
    reclaiming: "Đang thu hồi…",
    close: "Đóng",
    loadError: "Không tải được bộ vé",
    retry: "Thử lại",
    holderAria: "Vé {label}, {holder}",
    err: {
      taken: "Vé đã có người lấy",
      limit: "Tối đa 2 vé",
      notWaitingTake: "Ván đã bắt đầu, không đổi vé được",
      notWaitingRenew: "Chỉ tạo bộ vé mới khi ván chờ bắt đầu",
      targetOnline: "Người này đang online, không thu hồi được",
      generic: "Có lỗi, thử lại",
    },
    color: {
      red: "Đỏ",
      orange: "Cam",
      yellow: "Vàng",
      green: "Lục",
      teal: "Ngọc",
      blue: "Lam",
      purple: "Tím",
      pink: "Hồng",
    },
    side: {
      a: "A",
      b: "B",
    },
  },
  join: {
    inviteTitle: "{host} mời bạn chơi lô tô",
    expires: "Link hết hạn lúc {time}",
    signInToJoin: "Đăng nhập để vào phòng",
    joinRoom: "Vào phòng",
    joining: "Đang vào phòng…",
    joinFailed: "Không vào được phòng, thử lại",
    errorTitleInvalid: "Link không còn hiệu lực",
    errorDescInvalid: "Link mời đã hết hạn hoặc phòng đã đóng. Hãy xin host link mới.",
    errorTitleFull: "Phòng đã đầy",
    errorDescFull: "Phòng này đã đủ 16 người.",
    errorTitleBlocked: "Bạn không thể vào phòng này",
    errorDescBlocked: "Host đã mời bạn ra khỏi phòng này.",
    errorTitleLoad: "Không tải được lời mời",
    errorDescLoad: "Kiểm tra kết nối rồi thử lại.",
    retry: "Thử lại",
    backHome: "Về trang chủ",
    otherRoomBody: "Bạn đang ở \"{name}\". Mỗi người chỉ ở 1 phòng — hãy rời phòng đó trước.",
    otherRoomClose: "Đóng",
    otherRoomGo: "Về phòng hiện tại",
  },
  event: {
    memberJoined: "{name} đã vào phòng",
    ticketSetRenewed: "Bộ vé mới đã được tạo",
    ticketsReclaimed: "Host đã thu hồi vé của {name}",
    ticketsReclaimedSelf: "Host đã thu hồi vé của bạn",
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
