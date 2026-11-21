import "server-only";

import { AppError } from "@/core/server/action";
import type { InvitePreview } from "@/features/invite/shared/types";

/**
 * api-contract › getInvite (`x-transport: ssr`): hàm đọc thuần cho `page.tsx` và `generateMetadata`,
 * không ghi DB. Mã sai định dạng / không tồn tại → `AppError('INVITE_INVALID')`.
 */
export async function getInvite(code: string, viewerUid?: string | null): Promise<InvitePreview> {
  // TODO(S3): implement.
  void code;
  void viewerUid;
  throw new AppError("INTERNAL_ERROR");
}
