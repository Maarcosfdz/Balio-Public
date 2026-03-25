import { AppIcon } from "./AppIcon";
import { getAssetIconUrl } from "./assetIconRegistry";
import {
  isAssetIconName,
  isAppIconName,
  normalizeIconBgColor,
  readEmojiFromIconName,
  resolveEntityIconName,
} from "./iconRegistry";
import { cn } from "@/lib/utils";

interface IconAvatarProps {
  iconName?: string | null;
  iconBgColor?: string | null;
  fallbackText?: string | null;
  className?: string;
  iconClassName?: string;
}

export function IconAvatar({
  iconName,
  iconBgColor,
  fallbackText,
  className,
  iconClassName,
}: IconAvatarProps) {
  const resolvedName = resolveEntityIconName(iconName, fallbackText);
  const emoji = readEmojiFromIconName(resolvedName);
  const bgColor = normalizeIconBgColor(iconBgColor);
  const assetIconUrl = isAssetIconName(resolvedName) ? getAssetIconUrl(resolvedName) : null;

  return (
    <div
      className={cn(
        assetIconUrl ? "overflow-hidden" : "flex items-center justify-center",
        "rounded-xl",
        className,
      )}
      style={assetIconUrl ? undefined : { backgroundColor: bgColor }}
    >
      {emoji ? (
        <span className={cn("select-none text-base leading-none", iconClassName)}>{emoji}</span>
      ) : assetIconUrl ? (
        <img
          src={assetIconUrl}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : isAppIconName(resolvedName) ? (
        <AppIcon name={resolvedName} className={cn("h-5 w-5 text-slate-700", iconClassName)} />
      ) : (
        <AppIcon name="generic" className={cn("h-5 w-5 text-slate-700", iconClassName)} />
      )}
    </div>
  );
}
