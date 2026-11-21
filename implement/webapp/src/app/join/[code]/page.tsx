import type { Metadata } from "next";
import { redirect, unstable_rethrow } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { AppError } from "@/core/server/action";
import { now } from "@/core/server/clock";
import { getSessionUid } from "@/core/server/session";
import { t } from "@/core/shared/i18n/vi";
import { JoinError, JoinScreen, JoinSkeleton } from "@/features/invite/client";
import { getInvite } from "@/features/invite/server/queries/get-invite.query";
import { formatInviteExpiry } from "@/features/invite/shared/domain/format-invite-expiry";
import type { InvitePreview } from "@/features/invite/shared/types";
import { JoinHeader } from "./join-header";

const OG_IMAGE_PATH = "/og/invite.png";

function appUrl(): URL {
  try {
    return new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");
  } catch {
    return new URL("http://localhost:3000");
  }
}

/** Thẻ xem trước chung — không lộ tên phòng khi link hỏng / đã đóng / đầy. */
function genericMetadata(): Metadata {
  return { metadataBase: appUrl(), title: t("app.name") };
}

/**
 * Open Graph cho crawler (không cookie, SUP-06). Chạy ở request time (dữ liệu phòng là runtime);
 * trang có phần dynamic trong <Suspense> nên Next stream/chặn metadata đúng cách (cacheComponents).
 */
export async function generateMetadata({ params }: PageProps<"/join/[code]">): Promise<Metadata> {
  const { code } = await params;
  let preview: InvitePreview;
  try {
    preview = await getInvite(code);
  } catch (error) {
    unstable_rethrow(error);
    return genericMetadata();
  }
  if (preview.status !== "valid") return genericMetadata();

  const title = t("join.inviteTitle", { host: preview.room.hostName });
  const description = preview.room.name;
  const base = appUrl();
  return {
    metadataBase: base,
    title,
    description,
    openGraph: {
      type: "website",
      locale: "vi_VN",
      siteName: t("app.name"),
      title,
      description,
      url: `/join/${code}`,
      images: [{ url: OG_IMAGE_PATH, width: 1200, height: 630, alt: t("app.name") }],
    },
    twitter: { card: "summary_large_image", title, description, images: [OG_IMAGE_PATH] },
  };
}

// SCR-03. Đọc phiên / dữ liệu phòng là dữ liệu theo request ⇒ nằm trong <Suspense> (cacheComponents).
export default function JoinPage({ params }: PageProps<"/join/[code]">) {
  return (
    <>
      <JoinHeader />
      <Suspense fallback={<JoinSkeleton />}>
        <InviteGate params={params} />
      </Suspense>
    </>
  );
}

async function InviteGate({ params }: { params: Promise<{ code: string }> }) {
  await connection();
  const { code } = await params;
  const uid = await getSessionUid();
  const signedIn = uid !== null;

  let preview: InvitePreview | null = null;
  let loadFailed = false;
  try {
    preview = await getInvite(code, uid);
  } catch (error) {
    unstable_rethrow(error);
    if (!(error instanceof AppError && error.code === "INVITE_INVALID")) loadFailed = true;
  }

  if (loadFailed) return <JoinError variant="load" signedIn={signedIn} />;
  if (!preview) return <JoinError variant="invalid" signedIn={signedIn} />;

  // FLOW-03 A1: đã là thành viên → thẳng vào phòng (redirect ngoài try/catch).
  if (preview.viewer?.inThisRoom) redirect("/room");

  if (preview.status === "expired" || preview.status === "closed") return <JoinError variant="invalid" signedIn={signedIn} />;
  if (preview.status === "full") return <JoinError variant="full" signedIn={signedIn} />;
  if (preview.viewer?.blocked) return <JoinError variant="blocked" signedIn={signedIn} />;

  return (
    <JoinScreen
      code={code}
      hostName={preview.room.hostName}
      hostPhotoUrl={preview.room.hostPhotoUrl}
      roomName={preview.room.name}
      expiresLabel={formatInviteExpiry(new Date(preview.room.expiresAt), now())}
      signedIn={signedIn}
      otherRoomId={preview.viewer?.currentRoomId ?? null}
    />
  );
}
