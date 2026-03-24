import type { SVGProps } from "react";
import { APP_ICON_REGISTRY, type AppIconName } from "./iconRegistry";

interface AppIconProps extends SVGProps<SVGSVGElement> {
  name: AppIconName;
}

export function AppIcon({ name, ...props }: AppIconProps) {
  const Icon = APP_ICON_REGISTRY[name] ?? APP_ICON_REGISTRY.generic;
  return <Icon {...props} />;
}

