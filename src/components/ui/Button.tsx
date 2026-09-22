import clsx from "clsx";
import type { ButtonHTMLAttributes } from "react";

const VARIANTES = {
  primary: "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300",
  outline:
    "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:text-slate-400",
  ghost: "text-slate-600 hover:bg-slate-100 disabled:text-slate-300",
  danger: "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300",
} as const;

type Variante = keyof typeof VARIANTES;

export function Button({
  variante = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante }) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed",
        VARIANTES[variante],
        className
      )}
      {...props}
    />
  );
}
