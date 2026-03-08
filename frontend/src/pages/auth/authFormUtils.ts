import axios from "axios";

interface ApiFieldError {
  field?: string;
  fieldName?: string;
  message?: string;
}

interface ApiErrorPayload {
  code?: string;
  message?: string;
  name?: string;
  key?: string;
  fieldErrors?: ApiFieldError[];
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function hasStrongPassword(value: string): boolean {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/.test(value);
}

export function getApiErrorPayload(error: unknown): ApiErrorPayload | null {
  if (!axios.isAxiosError(error)) {
    return null;
  }

  const data = error.response?.data;
  if (!data || typeof data !== "object") {
    return null;
  }

  return data as ApiErrorPayload;
}

export function mapBackendFieldErrors(
  fieldErrors: ApiFieldError[] | undefined
): Record<string, string> {
  if (!fieldErrors?.length) {
    return {};
  }

  return fieldErrors.reduce<Record<string, string>>((acc, item) => {
    const field = item.fieldName ?? item.field;
    if (field && item.message) {
      acc[field] = item.message;
    }
    return acc;
  }, {});
}
