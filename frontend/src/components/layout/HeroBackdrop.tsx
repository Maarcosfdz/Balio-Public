import { cn } from "@/lib/utils";

interface HeroBackdropProps {
  className?: string;
  blurred?: boolean;
}

export default function HeroBackdrop({
  className,
  blurred = false,
}: HeroBackdropProps) {
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

      <div className="absolute -right-16 top-20 hidden h-80 w-[32rem] rounded-3xl border border-white/60 bg-white/70 shadow-2xl lg:block">
        <div className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <div className="h-3 w-24 rounded-full bg-muted" />
            <div className="h-6 w-6 rounded-full bg-primary/20" />
          </div>
          <div className="rounded-xl bg-primary/10 p-4">
            <div className="mb-1 h-2 w-16 rounded-full bg-muted" />
            <div className="h-7 w-28 rounded-full bg-sky-200" />
          </div>
          {["w-3/4", "w-2/3", "w-4/5"].map((line, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-muted" />
              <div className={cn("h-2.5 rounded-full bg-muted", line)} />
              <div className="ml-auto h-2.5 w-12 rounded-full bg-emerald-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
