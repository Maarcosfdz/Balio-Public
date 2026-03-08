import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";

export type ToastBannerTone = "success" | "warning" | "error" | "info";

interface ToastBannerProps {
  tone: ToastBannerTone;
  message: string;
  title?: string;
  onClose?: () => void;
  action?: {
    label: string;
    onClick: () => void;
    className?: string;
  };
}

const toneClasses: Record<ToastBannerTone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  error: "border-red-200 bg-red-50 text-red-800",
  info: "border-sky-200 bg-sky-50 text-sky-800",
};

const actionClasses: Record<ToastBannerTone, string> = {
  success: "bg-emerald-700 text-white hover:bg-emerald-800",
  warning: "bg-amber-700 text-white hover:bg-amber-800",
  error: "bg-red-700 text-white hover:bg-red-800",
  info: "bg-sky-700 text-white hover:bg-sky-800",
};

function ToneIcon({ tone }: { tone: ToastBannerTone }) {
  if (tone === "success") {
    return <CheckCircle2 className="h-5 w-5 shrink-0" />;
  }

  if (tone === "warning") {
    return <TriangleAlert className="h-5 w-5 shrink-0" />;
  }

  if (tone === "error") {
    return <TriangleAlert className="h-5 w-5 shrink-0" />;
  }

  return <Info className="h-5 w-5 shrink-0" />;
}

export function ToastBanner({ tone, title, message, onClose, action }: ToastBannerProps) {
  return (
    <div
      className={[
        "fixed bottom-6 right-6 z-[100] flex w-[min(92vw,28rem)] items-start gap-3 rounded-xl border px-4 py-3 shadow-lg",
        toneClasses[tone],
      ].join(" ")}
      role="status"
      aria-live="polite"
    >
      <ToneIcon tone={tone} />
      <div className="min-w-0 flex-1">
        {title ? <p className="text-sm font-semibold">{title}</p> : null}
        <p className="text-sm font-medium">{message}</p>
        {action ? (
          <button
            type="button"
            onClick={action.onClick}
            className={
              action.className
                ?? [
                  "mt-3 inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-medium transition",
                  actionClasses[tone],
                ].join(" ")
            }
          >
            {action.label}
          </button>
        ) : null}
      </div>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-0.5 transition hover:bg-black/10"
          aria-label="Close toast"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}