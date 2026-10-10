import { cookies, headers } from "next/headers";

/**
 * Общие помощники для запросов сервера Next.js к backend API (server
 * actions и серверные компоненты). Только для серверного кода.
 *
 * Вход, регистрация и вход через бота идут через server actions, а не из
 * браузера через rewrite: cookie сессии ставит сам сайт (`cookies().set`),
 * поэтому флаг `Secure` зависит от окружения — в production (HTTPS) он
 * включён, а на `npm run dev` (http://localhost) выключен, иначе часть
 * браузеров не сохранила бы cookie и вход на localhost не работал бы.
 */

export const API_BASE_URL = process.env.API_BASE_URL ?? "http://127.0.0.1:8000";
export const SESSION_COOKIE_NAME = "session";
// Секрет браузера для входа через бота (см. backend routers/auth.py).
export const CONNECT_COOKIE_NAME = "tg_connect";

const SECURE_COOKIES = process.env.NODE_ENV === "production";

// Netlify → Render: адрес сервера сайта у backend заранее неизвестен, поэтому
// IP посетителя (заголовок Netlify `x-nf-client-connection-ip`, клиент его
// подделать не может) передаётся вместе с общим секретом — backend
// принимает его только с верным FRONTEND_PROXY_SECRET. Только сервер.
const FRONTEND_PROXY_SECRET = process.env.FRONTEND_PROXY_SECRET?.trim() ?? "";

/** Cookie сессии и IP клиента — чтобы rate limit входа на backend считал
 * попытки по посетителю, а не по серверу сайта (X-Forwarded-For пишет
 * edge-прокси; backend доверяет ему только от адреса сайта). */
export async function backendHeaders(
  extra: Record<string, string> = {},
): Promise<Record<string, string>> {
  const [cookieStore, incoming] = await Promise.all([cookies(), headers()]);
  const result: Record<string, string> = { ...extra };
  const session = cookieStore.get(SESSION_COOKIE_NAME);
  const cookieParts = session ? [`${SESSION_COOKIE_NAME}=${session.value}`] : [];
  if (extra.cookie) {
    cookieParts.push(extra.cookie);
  }
  if (cookieParts.length > 0) {
    result.cookie = cookieParts.join("; ");
  }
  const forwardedFor = incoming.get("x-forwarded-for");
  if (forwardedFor) {
    result["x-forwarded-for"] = forwardedFor;
  }
  const visitorIp = incoming.get("x-nf-client-connection-ip");
  if (FRONTEND_PROXY_SECRET && visitorIp) {
    result["x-flamenco-frontend-secret"] = FRONTEND_PROXY_SECRET;
    result["x-flamenco-client-ip"] = visitorIp;
  }
  return result;
}

export type BackendCookie = { value: string; maxAge: number | undefined };

/** Значение cookie `name` из Set-Cookie ответа backend. */
export function readSetCookie(response: Response, name: string): BackendCookie | null {
  for (const header of response.headers.getSetCookie()) {
    const [pair, ...attributes] = header.split(";");
    const separator = pair.indexOf("=");
    if (separator < 0 || pair.slice(0, separator).trim() !== name) {
      continue;
    }
    let value = pair.slice(separator + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    const maxAgeAttribute = attributes
      .map((attribute) => attribute.trim().split("="))
      .find(([key]) => key.toLowerCase() === "max-age");
    const maxAge = maxAgeAttribute ? Number(maxAgeAttribute[1]) : undefined;
    return { value, maxAge: Number.isFinite(maxAge) ? maxAge : undefined };
  }
  return null;
}

export async function storeCookie(name: string, cookie: BackendCookie): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(name, cookie.value, {
    httpOnly: true,
    secure: SECURE_COOKIES,
    sameSite: "lax",
    path: "/",
    maxAge: cookie.maxAge,
  });
}

/** Переносит cookie сессии из ответа backend в браузер. */
export async function adoptSessionCookie(response: Response): Promise<boolean> {
  const session = readSetCookie(response, SESSION_COOKIE_NAME);
  if (!session) {
    return false;
  }
  await storeCookie(SESSION_COOKIE_NAME, session);
  return true;
}

/** `detail` из ответа backend (он уже сформулирован для пользователя). */
export async function errorDetail(response: Response): Promise<string | null> {
  try {
    const body = (await response.json()) as { detail?: unknown };
    if (typeof body.detail === "string" && body.detail) {
      return body.detail;
    }
    // 422 валидации FastAPI: [{ msg: "..." }, ...]
    if (Array.isArray(body.detail) && body.detail.length > 0) {
      return "Проверьте правильность заполнения полей";
    }
  } catch {
    // не JSON
  }
  return null;
}
