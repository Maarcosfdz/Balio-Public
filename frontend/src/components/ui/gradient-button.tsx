import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type GradientButtonSize = "sm" | "md" | "lg";
export type GradientButtonIconVariant = "none" | "plus" | "other";
export type GradientButtonWeight = "normal" | "semibold";

interface GradientButtonClassOptions {
  size?: GradientButtonSize;
  iconVariant?: GradientButtonIconVariant;
  weight?: GradientButtonWeight;
  className?: string;
}

export function gradientButtonClass({
  size = "md",
  iconVariant = "none",
  weight = "semibold",
  className,
}: GradientButtonClassOptions = {}) {
  return cn(
    "app-gradient-btn",
    size === "sm" && "app-gradient-btn--sm",
    size === "lg" && "app-gradient-btn--lg",
    weight === "normal" && "app-gradient-btn--normal",
    iconVariant === "plus" && "app-gradient-btn--icon-plus",
    iconVariant === "other" && "app-gradient-btn--icon-other",
    className,
  );
}

export function gradientButtonIconClass(
  className?: string,
) {
  return cn("app-gradient-btn__icon", className);
}

export interface GradientButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: GradientButtonSize;
  iconVariant?: GradientButtonIconVariant;
  weight?: GradientButtonWeight;
  icon?: ReactNode;
  iconClassName?: string;
}

export function GradientButton({
  className,
  size = "md",
  iconVariant = "none",
  weight = "semibold",
  icon,
  iconClassName,
  children,
  ...props
}: GradientButtonProps) {
  return (
    <button
      className={gradientButtonClass({ size, iconVariant, weight, className })}
      {...props}
    >
      {icon ? (
        <span className={gradientButtonIconClass(iconClassName)} aria-hidden>
          {icon}
        </span>
      ) : null}
      {children}
    </button>
  );
}
