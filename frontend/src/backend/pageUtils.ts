export interface NormalizedPage<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
}

type AnyObject = Record<string, unknown>;

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

function getFiniteNumber(
  ...candidates: Array<unknown>
): number | null {
  for (const candidate of candidates) {
    const num = asFiniteNumber(candidate);
    if (num != null) return num;
  }
  return null;
}

function asObject(value: unknown): AnyObject {
  return value && typeof value === "object" ? (value as AnyObject) : {};
}

export function normalizePageResponse<T>(
  raw: unknown,
  fallbackPage = 0,
  fallbackSize = 20,
): NormalizedPage<T> {
  const data = asObject(raw);
  const pageMeta = asObject(data.page);

  const content = Array.isArray(data.content) ? (data.content as T[]) : [];

  const size = Math.max(
    1,
    Math.trunc(getFiniteNumber(data.size, pageMeta.size, fallbackSize) ?? fallbackSize),
  );

  const number = Math.max(
    0,
    Math.trunc(getFiniteNumber(data.number, pageMeta.number, fallbackPage) ?? fallbackPage),
  );

  const totalElementsRaw = getFiniteNumber(
    data.totalElements,
    pageMeta.totalElements,
    content.length,
  );
  const totalElements = Math.max(0, Math.trunc(totalElementsRaw ?? content.length));

  const derivedTotalPages = Math.max(1, Math.ceil(totalElements / size));
  const totalPagesRaw = getFiniteNumber(data.totalPages, pageMeta.totalPages, derivedTotalPages);
  const totalPages = Math.max(1, Math.trunc(totalPagesRaw ?? derivedTotalPages));

  return {
    content,
    totalPages,
    totalElements,
    number,
    size,
  };
}
