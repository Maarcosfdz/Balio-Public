import { cn } from "@/lib/utils";
interface HeroBackdropProps {
  className?: string;
  blurred?: boolean;
}

// Simple decorative backdrop with blurred colorful blobs.
export default function HeroBackdrop({ className, blurred = false }: HeroBackdropProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        blurred && "blur-[4px] scale-[1.02]",
        className
      )}
      aria-hidden
    >
      <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-sky-300/40 blur-3xl" />
      <div className="absolute right-0 top-24 h-80 w-80 rounded-full bg-emerald-300/35 blur-3xl" />
      <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-blue-300/30 blur-3xl" />
    </div>
  );
}
