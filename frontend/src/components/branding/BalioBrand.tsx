import { cn } from "@/lib/utils";

interface BalioBrandProps {
  className?: string;
  logoClassName?: string;
  textClassName?: string;
}

export default function BalioBrand({
  className,
  logoClassName,
  textClassName,
}: BalioBrandProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <img
        src="/logo.png"
        alt="Balio"
        className={cn("h-8 w-auto object-contain", logoClassName)}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
      <span className={cn("text-xl font-bold tracking-tight", textClassName)}>
        Balio
      </span>
    </div>
  );
}
