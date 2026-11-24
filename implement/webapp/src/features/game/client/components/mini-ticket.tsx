import { cn } from "@/core/shared/utils";

type Props = {
  /** 81 ô (9×9), 0 = ô trống. */
  grid: readonly number[];
  called: ReadonlySet<number>;
  /** Hàng thắng (0..8) → viền xanh; null = không có. */
  winRow: number | null;
  className?: string;
};

/** SCR-09 #4: vé thu nhỏ kiểu vé giấy — ô đã rao tô đậm, hàng thắng viền xanh. */
export function MiniTicket({ grid, called, winRow, className }: Props) {
  const rows = Array.from({ length: 9 }, (_, r) => grid.slice(r * 9, r * 9 + 9));
  return (
    <div
      data-testid="mini-ticket"
      data-row-win={winRow ?? ""}
      className={cn("mx-auto grid w-full max-w-[260px] gap-px rounded border border-stone-400 bg-stone-300 p-px", className)}
    >
      {rows.map((row, r) => (
        <div
          key={r}
          data-row={r}
          className={cn("grid grid-cols-9 gap-px", r === winRow && "rounded-sm outline outline-2 outline-emerald-600")}
        >
          {row.map((n, c) => (
            <span
              key={c}
              data-called={n !== 0 && called.has(n) ? "true" : undefined}
              className={cn(
                "flex h-4 items-center justify-center text-[10px] leading-none tabular-nums",
                n === 0 ? "bg-stone-100" : called.has(n) ? "bg-amber-400 font-bold text-stone-950" : "bg-white text-stone-700",
              )}
            >
              {n === 0 ? "" : n}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

/** 5 số của hàng `row` → "a · b · c · d · e". */
export function rowNumbersText(grid: readonly number[], row: number): string {
  return grid
    .slice(row * 9, row * 9 + 9)
    .filter((n) => n !== 0)
    .join(" · ");
}
