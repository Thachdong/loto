// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ChatMessage, ChatMessagesState } from "@/features/chat/client/hooks/use-chat-messages";
import { useSendMessage } from "@/features/chat/client/hooks/use-send-message";
import { ChatSheet } from "./chat-sheet";

vi.mock("@/features/chat/server/actions/send-message.action", () => ({ sendMessageAction: vi.fn() }));
vi.mock("@/core/client/firebase", () => ({ getClientAuth: vi.fn(), getClientFirestore: vi.fn() }));

const AT = new Date(Date.UTC(2026, 10, 24, 2, 5)); // 09:05 GMT+7
const msg = (id: string, senderUid: string, text: string): ChatMessage => ({ id, senderUid, senderName: senderUid === "u_a" ? "Host An" : "Bình", senderPhotoUrl: null, text, createdAt: AT });
const chatOf = (messages: ChatMessage[], over: Partial<ChatMessagesState> = {}): ChatMessagesState => ({
  status: "ready",
  messages,
  hasMore: false,
  loadingOlder: false,
  loadOlder: vi.fn(async () => {}),
  retry: vi.fn(),
  ...over,
});

type Send = Parameters<typeof useSendMessage>[1];

function Harness({ chat, send }: { chat: ChatMessagesState; send: NonNullable<Send> }) {
  const sender = useSendMessage("r1", send);
  return <ChatSheet roomId="r1" uid="u_b" open onClose={vi.fn()} bottom={0} chat={chat} sender={sender} coarsePointer={false} />;
}

const ok = (text: string) => ({ ok: true as const, data: { id: "m_new", senderUid: "u_b", senderName: "Bình", senderPhotoUrl: null, text, createdAt: AT.toISOString() } });
const err = (code: string) => ({ ok: false as const, error: { code, message: "" } }) as never;

describe("ChatSheet", () => {
  afterEach(cleanup);

  it("AC-1: others left with name + HH:mm GMT+7, mine right", () => {
    render(<Harness chat={chatOf([msg("m1", "u_a", "Chào cả nhà 😆"), msg("m2", "u_b", "Hi")])} send={vi.fn()} />);
    const other = screen.getByTestId("chat-msg-m1");
    expect(other).toHaveAttribute("data-mine", "false");
    expect(other).toHaveTextContent("Host An");
    expect(other).toHaveTextContent("09:05");
    expect(other).toHaveTextContent("Chào cả nhà 😆");
    expect(screen.getByTestId("chat-msg-m2")).toHaveAttribute("data-mine", "true");
  });

  it("AC-10 empty, loading skeleton, error + Thử lại", async () => {
    render(<Harness chat={chatOf([])} send={vi.fn()} />);
    expect(screen.getByTestId("chat-empty")).toHaveTextContent("Chưa có tin nhắn. Chào cả phòng một câu nhé!");
    cleanup();
    render(<Harness chat={chatOf([], { status: "loading" })} send={vi.fn()} />);
    expect(screen.getByTestId("chat-loading")).toBeInTheDocument();
    cleanup();
    const retry = vi.fn();
    render(<Harness chat={chatOf([], { status: "error", retry })} send={vi.fn()} />);
    expect(screen.getByTestId("chat-error")).toHaveTextContent("Không tải được tin nhắn");
    await userEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(retry).toHaveBeenCalled();
  });

  it("AC-4/5/6: Gửi locked when blank; counter from 450, 500 ok, 501 red + locked", async () => {
    render(<Harness chat={chatOf([])} send={vi.fn()} />);
    const input = screen.getByTestId("chat-input");
    const sendBtn = screen.getByTestId("btn-chat-send");
    await userEvent.type(input, "   ");
    expect(sendBtn).toBeDisabled();
    await userEvent.clear(input);
    await userEvent.click(input);
    await userEvent.paste("a".repeat(449));
    expect(screen.queryByTestId("chat-counter")).not.toBeInTheDocument();
    await userEvent.paste("a".repeat(51));
    expect(screen.getByTestId("chat-counter")).toHaveTextContent("500/500");
    expect(screen.getByTestId("chat-counter")).toHaveAttribute("data-over", "false");
    expect(sendBtn).toBeEnabled();
    await userEvent.paste("a");
    expect(screen.getByTestId("chat-counter")).toHaveTextContent("501/500");
    expect(screen.getByTestId("chat-counter")).toHaveAttribute("data-over", "true");
    expect(sendBtn).toBeDisabled();
  });

  it("AC-1 optimistic: Gửi → input cleared, pending 'Đang gửi…', trimmed text sent; Enter sends on desktop", async () => {
    let resolve: (v: unknown) => void = () => {};
    const send = vi.fn(() => new Promise((r) => (resolve = r))) as never;
    render(<Harness chat={chatOf([])} send={send} />);
    await userEvent.type(screen.getByTestId("chat-input"), "  Xin chào  {Enter}");
    expect(send).toHaveBeenCalledWith({ roomId: "r1", text: "Xin chào" });
    expect(screen.getByTestId("chat-input")).toHaveValue("");
    expect(screen.getByTestId("chat-pending-tmp-1")).toHaveTextContent("Đang gửi…");
    await act(async () => resolve(ok("Xin chào")));
  });

  it("AC-7: RATE_LIMITED → bubble removed, text restored, error line; next success hides it", async () => {
    const send = vi.fn().mockResolvedValueOnce(err("RATE_LIMITED")).mockResolvedValueOnce(ok("6"));
    render(<Harness chat={chatOf([])} send={send} />);
    await userEvent.type(screen.getByTestId("chat-input"), "6");
    await userEvent.click(screen.getByTestId("btn-chat-send"));
    expect(await screen.findByTestId("chat-rate-error")).toHaveTextContent("Bạn gửi quá nhanh, thử lại sau vài giây.");
    expect(screen.getByTestId("chat-input")).toHaveValue("6");
    expect(screen.queryByTestId(/^chat-pending-/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByTestId("btn-chat-send"));
    await vi.waitFor(() => expect(screen.queryByTestId("chat-rate-error")).not.toBeInTheDocument());
  });

  it("AC-8: NOT_ROOM_MEMBER → input replaced by 'Không thể gửi tin trong phòng này'", async () => {
    render(<Harness chat={chatOf([])} send={vi.fn().mockResolvedValue(err("NOT_ROOM_MEMBER"))} />);
    await userEvent.type(screen.getByTestId("chat-input"), "hi");
    await userEvent.click(screen.getByTestId("btn-chat-send"));
    expect(await screen.findByTestId("chat-blocked")).toHaveTextContent("Không thể gửi tin trong phòng này");
    expect(screen.queryByTestId("chat-input")).not.toBeInTheDocument();
  });

  it("AC-11: network error → 'Gửi thất bại · Gửi lại'; resend succeeds", async () => {
    const send = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(ok("mất mạng"));
    render(<Harness chat={chatOf([])} send={send} />);
    await userEvent.type(screen.getByTestId("chat-input"), "mất mạng");
    await userEvent.click(screen.getByTestId("btn-chat-send"));
    const resend = await screen.findByTestId("btn-chat-resend-tmp-1");
    expect(resend).toHaveTextContent("Gửi thất bại · Gửi lại");
    await userEvent.click(resend);
    expect(send).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenLastCalledWith({ roomId: "r1", text: "mất mạng" });
    await vi.waitFor(() => expect(screen.getByTestId("chat-pending-tmp-1")).toHaveAttribute("data-status", "sent"));
  });

  it("AC-2: loading older indicator", () => {
    render(<Harness chat={chatOf([msg("m1", "u_a", "x")], { loadingOlder: true, hasMore: true })} send={vi.fn()} />);
    expect(screen.getByTestId("chat-loading-older")).toHaveTextContent("Đang tải tin cũ hơn…");
  });
});
