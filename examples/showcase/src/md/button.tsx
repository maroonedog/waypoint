import type { ButtonHTMLAttributes, ReactElement, ReactNode } from "react";

type Tone = "filled" | "tonal" | "outlined" | "text";

const TONES: Readonly<Record<Tone, string>> = {
  filled: "bg-primary text-on-primary shadow-e1 disabled:bg-on-surface/12 disabled:text-on-surface/38 disabled:shadow-none",
  tonal: "bg-secondary-container text-on-secondary-container",
  outlined: "border border-outline text-primary",
  text: "text-primary",
};

export interface MdButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly tone?: Tone;
  readonly icon?: string;
  readonly children: ReactNode;
}

export function MdButton({
  tone = "filled",
  icon,
  children,
  className,
  ...rest
}: MdButtonProps): ReactElement {
  return (
    <button
      {...rest}
      className={
        "state-layer relative inline-flex items-center justify-center gap-2 " +
        "overflow-hidden rounded-xl px-6 py-2.5 text-sm font-medium " +
        "transition-shadow disabled:cursor-not-allowed " +
        TONES[tone] +
        (className === undefined ? "" : " " + className)
      }
    >
      {icon === undefined ? null : (
        <span aria-hidden className="material-symbols-rounded text-[18px]">
          {icon}
        </span>
      )}
      {children}
    </button>
  );
}
