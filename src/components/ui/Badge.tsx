import clsx from "clsx";
import type { HTMLAttributes } from "react";

const VARIANTES = {
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-red-200",
} as const;

type Variante = keyof typeof VARIANTES;

export function Badge({
  variante = "slate",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variante?: Variante }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
        VARIANTES[variante],
        className
      )}
      {...props}
    />
  );
}
