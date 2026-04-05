import { ASSET_ICON_OPTIONS } from "./assetIconRegistry";
import { suggestIconFromText } from "./iconRegistry";

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function scoreAssetMatch(text: string, option: { name: string; label: string }): number {
  if (!text) return 0;

  const label = normalize(option.label);
  const key = normalize(option.name.replace(/^asset:/, "").replace(/[-_]/g, " "));

  if (!label && !key) return 0;
  if (text === label || text === key) return 100;
  if (label.startsWith(text) || key.startsWith(text)) return 90;
  if (label.includes(text) || key.includes(text)) return 80;

  const tokens = text.split(" ").filter((token) => token.length >= 3);
  if (tokens.length === 0) return 0;

  let score = 0;
  for (const token of tokens) {
    if (label.includes(token)) score += 12;
    if (key.includes(token)) score += 10;
  }

  return score;
}

export function suggestAssetIconFromText(text?: string | null): string | null {
  const normalizedText = normalize(text ?? "");
  if (!normalizedText) return null;

  let bestName: string | null = null;
  let bestScore = 0;

  for (const option of ASSET_ICON_OPTIONS) {
    const score = scoreAssetMatch(normalizedText, option);
    if (score > bestScore) {
      bestScore = score;
      bestName = option.name;
    }
  }

  // Avoid weak matches to unrelated assets.
  return bestScore >= 80 ? bestName : null;
}

export function suggestIconNameFromText(text?: string | null): string {
  return suggestAssetIconFromText(text) ?? suggestIconFromText(text);
}
