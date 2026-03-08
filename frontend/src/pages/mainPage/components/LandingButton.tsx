import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LandingButtonProps = Omit<React.ComponentProps<typeof Button>, "variant" | "size"> & {
  intent?: "primary" | "secondary";
  size?: "sm" | "md" | "lg";
};

export default function LandingButton({
  intent = "primary",
  size = "md",
  className,
  ...props
}: LandingButtonProps) {
  const styles =
    intent === "primary"
      ? "bg-gradient-to-r from-blue-600 to-emerald-500 text-white hover:opacity-90"
      : "bg-white text-slate-900 border border-slate-300 hover:bg-slate-100";

  const sizeClasses =
    size === "sm"
      ? "px-3 py-1.5 text-sm rounded-md"
      : size === "lg"
      ? "px-5 py-3 text-lg rounded-xl"
      : "px-4 py-2 text-base rounded-lg";

  return (
    <Button
      className={cn("transition-all", sizeClasses, styles, className)}
      {...props}
    />
  );
}