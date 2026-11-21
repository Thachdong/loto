import { JoinSkeleton } from "@/features/invite/client";
import { JoinHeader } from "./join-header";

export default function Loading() {
  return (
    <>
      <JoinHeader />
      <JoinSkeleton />
    </>
  );
}
