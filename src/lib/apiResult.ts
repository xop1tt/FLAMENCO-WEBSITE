/**
 * Результат запроса к backend API, в котором ошибка не выглядит как пустые
 * данные.
 *
 * Раньше любой сбой превращался в `null`/`[]`: при упавшем API сайт писал
 * «Предстоящих занятий пока нет» или отправлял на /login. Теперь страница
 * видит, что именно произошло:
 *
 * - `ok: true` — успешный ответ (в том числе пустой массив);
 * - `unauthorized` — 401, сессии нет или она недействительна → /login;
 * - `client_error` — прочие 4xx (например, 409 «привяжите Telegram»);
 * - `server_error` — 500 и прочие 5xx;
 * - `unavailable` — 502/503/504 или API не принимает соединения;
 * - `network_error` — таймаут и прочие сетевые сбои.
 *
 * Модуль без зависимостей от Next.js — его проверяют `node --test`
 * (tests/apiResult.test.mjs).
 */

export const SERVICE_UNAVAILABLE_MESSAGE =
  "Сервис временно недоступен. Попробуйте ещё раз.";

export type ApiErrorKind =
  | "unauthorized"
  | "client_error"
  | "server_error"
  | "unavailable"
  | "network_error";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiErrorKind; status: number | null };

const REQUEST_TIMEOUT_MS = 10_000;

// Коды ошибок Node (undici), означающие «API не запущен / не принимает».
const UNREACHABLE_CODES = new Set(["ECONNREFUSED", "EHOSTUNREACH", "ENETUNREACH"]);

export function classifyStatus(status: number): ApiErrorKind {
  if (status === 401) return "unauthorized";
  if (status === 502 || status === 503 || status === 504) return "unavailable";
  if (status >= 500) return "server_error";
  return "client_error";
}

export function classifyFetchError(error: unknown): ApiErrorKind {
  const cause = (error as { cause?: { code?: unknown } } | null)?.cause;
  if (cause && typeof cause.code === "string" && UNREACHABLE_CODES.has(cause.code)) {
    return "unavailable";
  }
  return "network_error";
}

/** Сбой сервиса (5xx, недоступен, сеть) — показываем «временно недоступен». */
export function isServiceFailure(
  result: ApiResult<unknown>,
): result is { ok: false; error: ApiErrorKind; status: number | null } {
  return (
    !result.ok &&
    (result.error === "server_error" ||
      result.error === "unavailable" ||
      result.error === "network_error")
  );
}

export async function requestJson<T>(
  url: string,
  init: RequestInit = {},
  fetchImpl: typeof fetch = fetch,
): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetchImpl(url, {
      ...init,
      signal: init.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    console.error(`API request errored: ${url}`, error);
    return { ok: false, error: classifyFetchError(error), status: null };
  }
  if (!response.ok) {
    if (response.status !== 401) {
      console.error(`API request failed: ${url} -> ${response.status}`);
    }
    return { ok: false, error: classifyStatus(response.status), status: response.status };
  }
  try {
    return { ok: true, data: (await response.json()) as T };
  } catch (error) {
    console.error(`API response is not JSON: ${url}`, error);
    return { ok: false, error: "server_error", status: response.status };
  }
}
