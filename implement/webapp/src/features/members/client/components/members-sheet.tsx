"use client";

import { useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/core/client/ui/avatar";
import { Button } from "@/core/client/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/client/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/core/client/ui/sheet";
import { Skeleton } from "@/core/client/ui/skeleton";
import { t } from "@/core/shared/i18n/vi";
import { useMemberActions, type MemberActions } from "@/features/members/client/hooks/use-member-actions";
import { useRoomPresence, type RoomPresenceState } from "@/features/members/client/hooks/use-room-presence";
import { buildMemberRows, type MemberRow } from "@/features/members/shared/domain/member-rows";
import type { GameStatus, TicketId } from "@/features/room/shared/types";
import { TICKET_PALETTE } from "@/features/ticket/client";

type Props = {
  roomId: string;
  open: boolean;
  onClose: () => void;
  /** Khoảng đáy chừa cho thanh KINH + thanh nút dưới. */
  bottom: number;
  uid: string;
  hostUid: string;
  memberCount: number;
  gameStatus: GameStatus;
  /** Doc player ván hiện tại (uid → ticket_ids). */
  players: readonly { uid: string; ticketIds: readonly TicketId[] }[];
  /** Giờ server (ms) — tính "Offline · n phút". */
  nowMs: number;
  /** Tiêm khi test. */
  presence?: RoomPresenceState;
  actions?: MemberActions;
};

type Confirm = { op: "kick" | "reclaim"; row: MemberRow } | null;

const ticketLabel = (tk: MemberRow["tickets"][number]) =>
  t("members.ticket", { color: t(`ticket.color.${tk.color}`), side: t(tk.side === "a" ? "ticket.side.a" : "ticket.side.b") });

/** SCR-07 Người trong phòng (sheet trên SCR-04): online/vé; host kick / thu hồi vé người offline. */
export function MembersSheet(props: Props) {
  const { roomId, open, onClose, bottom, memberCount } = props;
  const livePresence = useRoomPresence(roomId, open && !props.presence);
  const liveActions = useMemberActions(roomId);
  const presence = props.presence ?? livePresence;
  const actions = props.actions ?? liveActions;
  const [confirm, setConfirm] = useState<Confirm>(null);

  const ticketsByUid = useMemo(() => Object.fromEntries(props.players.map((p) => [p.uid, p.ticketIds])), [props.players]);
  const rows = buildMemberRows(presence.entries, {
    hostUid: props.hostUid,
    myUid: props.uid,
    gameStatus: props.gameStatus,
    ticketsByUid,
    nowMs: props.nowMs,
  });

  async function submit() {
    if (!confirm) return;
    await actions.run(confirm.op, confirm.row.uid, confirm.row.displayName);
    setConfirm(null);
  }

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent side="bottom" data-testid="members-sheet" className="mx-auto h-[70dvh] max-w-[480px] gap-2 rounded-t-xl" style={{ bottom }}>
          <SheetHeader className="pb-0">
            <SheetTitle data-testid="members-title">{t("members.title", { count: memberCount })}</SheetTitle>
            <SheetDescription className="sr-only">{t("members.title", { count: memberCount })}</SheetDescription>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4">
            <MembersBody
              presence={presence}
              rows={rows}
              viewerIsHost={props.uid === props.hostUid}
              pending={actions.pending}
              onAsk={(op, row) => setConfirm({ op, row })}
            />
          </div>
        </SheetContent>
      </Sheet>
      <ConfirmDialog
        confirm={confirm}
        gameStatus={props.gameStatus}
        pending={actions.pending !== null}
        onCancel={() => setConfirm(null)}
        onConfirm={() => void submit()}
      />
    </>
  );
}

type BodyProps = {
  presence: RoomPresenceState;
  rows: MemberRow[];
  viewerIsHost: boolean;
  pending: string | null;
  onAsk: (op: "kick" | "reclaim", row: MemberRow) => void;
};

function MembersBody({ presence, rows, viewerIsHost, pending, onAsk }: BodyProps) {
  if (presence.status === "error" && rows.length === 0) {
    return (
      <div data-testid="members-error" className="flex flex-col items-center gap-2 py-8 text-center">
        <p className="text-sm">{t("members.error")}</p>
        <Button type="button" variant="outline" onClick={presence.retry}>
          {t("members.retry")}
        </Button>
      </div>
    );
  }
  if (presence.status === "loading" && rows.length === 0) {
    return (
      <div data-testid="members-loading" aria-busy="true" className="flex flex-col gap-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[72px] w-full rounded-lg" />
        ))}
      </div>
    );
  }
  const alone = rows.length === 1 && rows[0].isMe && rows[0].isHost;
  return (
    <>
      <ul className="flex flex-col divide-y">
        {rows.map((row) => (
          <MemberItem key={row.uid} row={row} pending={pending} onAsk={onAsk} />
        ))}
      </ul>
      {alone && viewerIsHost && (
        <p data-testid="members-invite-hint" className="py-4 text-center text-sm text-muted-foreground">
          {t("members.inviteHint")}
        </p>
      )}
    </>
  );
}

function MemberItem({ row, pending, onAsk }: { row: MemberRow; pending: string | null; onAsk: BodyProps["onAsk"] }) {
  const status = row.online
    ? t("members.online")
    : row.offlineMinutes === null
      ? t("members.offline")
      : t("members.offlineFor", { n: row.offlineMinutes });
  return (
    <li data-testid={`member-row-${row.uid}`} data-online={row.online} className="flex min-h-[72px] items-center gap-3 py-2">
      <div className="relative shrink-0">
        <Avatar className="size-10">
          {row.photoUrl && <AvatarImage src={row.photoUrl} alt="" />}
          <AvatarFallback>{row.initial}</AvatarFallback>
        </Avatar>
        <span
          aria-hidden="true"
          data-testid={`member-dot-${row.uid}`}
          className={`absolute right-0 bottom-0 size-3 rounded-full border-2 border-background ${row.online ? "bg-green-500" : "bg-gray-400"}`}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate font-medium">{row.displayName}</span>
          {row.isHost && (
            <span data-testid={`member-host-${row.uid}`} className="shrink-0 rounded bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
              {t("members.host")}
            </span>
          )}
          {row.isMe && <span className="shrink-0 text-xs text-muted-foreground">{t("members.me")}</span>}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span data-testid={`member-status-${row.uid}`}>{status}</span>
          <span aria-hidden="true">·</span>
          {row.tickets.length === 0 ? (
            <span data-testid={`member-noticket-${row.uid}`}>{t("members.noTicket")}</span>
          ) : (
            row.tickets.map((tk) => (
              <span
                key={tk.id}
                data-testid={`member-ticket-${row.uid}-${tk.id}`}
                className="rounded px-1.5 py-0.5 text-[11px] font-semibold"
                style={{ backgroundColor: TICKET_PALETTE[tk.color]?.base, color: TICKET_PALETTE[tk.color]?.onBase }}
              >
                {ticketLabel(tk)}
              </span>
            ))
          )}
        </div>
      </div>
      {(row.canKick || row.canReclaim) && (
        <div className="flex shrink-0 flex-col gap-1">
          {row.canReclaim && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              data-testid={`btn-reclaim-${row.uid}`}
              disabled={pending !== null}
              className="h-8 px-2 text-xs"
              onClick={() => onAsk("reclaim", row)}
            >
              {t("members.reclaim")}
            </Button>
          )}
          {row.canKick && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              data-testid={`btn-kick-${row.uid}`}
              disabled={pending !== null}
              className="h-8 px-2 text-xs text-destructive"
              onClick={() => onAsk("kick", row)}
            >
              {t("members.kick")}
            </Button>
          )}
        </div>
      )}
    </li>
  );
}

type DialogProps = { confirm: Confirm; gameStatus: GameStatus; pending: boolean; onCancel: () => void; onConfirm: () => void };

function ConfirmDialog({ confirm, gameStatus, pending, onCancel, onConfirm }: DialogProps) {
  const row = confirm?.row;
  const name = row?.displayName ?? "";
  const kick = confirm?.op === "kick";
  const live = gameStatus !== "waiting" && gameStatus !== "finished" && gameStatus !== "cancelled";
  return (
    <Dialog open={confirm !== null} onOpenChange={(next) => !next && !pending && onCancel()}>
      <DialogContent showCloseButton={false} data-testid={kick ? "kick-dialog" : "reclaim-dialog"}>
        <DialogHeader>
          <DialogTitle>{kick ? t("members.kickTitle", { name }) : t("members.reclaimTitle", { name })}</DialogTitle>
          <DialogDescription>
            {kick
              ? `${t("members.kickBody", { name })}${live ? ` ${t("members.kickBodyRunning", { name })}` : ""}`
              : t("members.reclaimBody", { name, tickets: (row?.tickets ?? []).map(ticketLabel).join(", ") })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-row gap-2">
          <Button type="button" variant="outline" data-testid="btn-member-cancel" disabled={pending} className="h-11 flex-1 text-base" onClick={onCancel}>
            {t("members.cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            data-testid="btn-member-confirm"
            disabled={pending}
            className="h-11 flex-1 text-base"
            onClick={onConfirm}
          >
            {kick ? t("members.kickConfirm") : t("members.reclaimConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
