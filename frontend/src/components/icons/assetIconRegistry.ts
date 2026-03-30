import { ASSET_ICON_PREFIX } from "./iconRegistry";

const assetModules = import.meta.glob("/src/assets/icons/**/*.{png,jpg,jpeg,webp,svg}", {
  eager: true,
  import: "default",
}) as Record<string, string>;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const usedKeys = new Set<string>();
const rawAssetOptions = Object.entries(assetModules)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, url], index) => {
    const fileName = path.split("/").pop() ?? `asset-${index + 1}.png`;
    const stem = fileName.replace(/\.[^/.]+$/, "");
    const baseSlug = slugify(stem) || `asset-${index + 1}`;
    let key = `${ASSET_ICON_PREFIX}${baseSlug}`;
    let counter = 1;
    while (usedKeys.has(key)) {
      counter += 1;
      key = `${ASSET_ICON_PREFIX}${baseSlug}-${counter}`;
    }
    usedKeys.add(key);
    return {
      name: key,
      label: `Asset ${index + 1}`,
      url,
    };
  });

export const ASSET_ICON_OPTIONS: Array<{ name: string; label: string; url: string }> = rawAssetOptions;

const ASSET_ICON_URL_MAP = Object.fromEntries(
  ASSET_ICON_OPTIONS.map((option) => [option.name, option.url]),
) as Record<string, string>;

export function getAssetIconUrl(iconName?: string | null): string | null {
  if (!iconName) return null;
  return ASSET_ICON_URL_MAP[iconName] ?? null;
}
