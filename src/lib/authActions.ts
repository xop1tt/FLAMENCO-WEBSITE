"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SERVICE_UNAVAILABLE_MESSAGE } from "./apiResult";
import {
  API_BASE_URL,
  CONNECT_COOKIE_NAME,
  adoptSessionCookie,
  backendHeaders,
  errorDetail,
  readSetCookie,
  storeCookie,
} from "./backend";
import { safeNextPath } from "./safeNext";

/**
 * Вход и регистрация на сайте: по email/паролю и через Telegram-бота
 * (deep link t.me/<бот>?start=…, подтверждение кнопкой в боте).
 *
 * Один человек — один аккаунт: Telegram, привязанный к аккаунту с email,
 * при входе через бота открывает тот же аккаунт; аккаунт, созданный только
 * через Telegram, при привязке к аккаунту с email объединяется с ним
 * (backend: `_link_telegram_in_transaction`).
 */

// fields — введённые значения (кроме паролей): React 19 сбрасывает форму
// после action, и без них после ошибки пришлось бы вводить email заново.
export type FormState = { error: string | null; fields?: Record<string, string> };

// Только внутренние пути — чтобы ?next= нельзя было использовать для
// перенаправления на чужой сайт (см. safeNextPath).
function safeNext(value: FormDataEntryValue | null): string {
  return safeNextPath(value) ?? "/account";
}

async function post(path: string, body: unknown, cookie?: string): Promise<Response | null> {
  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: await backendHeaders({
        "Content-Type": "application/json",
        ...(cookie ? { cookie } : {}),
      }),
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
  } catch (error) {
    console.error(`Auth request failed: ${path}`, error);
    return null;
  }
}

function failure(response: Response | null, detail: string | null, fallback: string): FormState {
  if (response === null || response.status >= 500) {
    return { error: SERVICE_UNAVAILABLE_MESSAGE };
  }
  if (response.status === 429) {
    return { error: "Слишком много попыток. Подождите минуту и попробуйте снова." };
  }
  return { error: detail ?? fallback };
}

export async function loginAction(_: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fields = { email };
  if (!email || !password) {
    return { error: "Введите email и пароль", fields };
  }
  const response = await post("/api/auth/login", { email, password });
  if (!response?.ok) {
    return {
      ...failure(
        response,
        response?.status === 401 ? "Неверный email или пароль" : null,
        "Не удалось войти. Попробуйте ещё раз.",
      ),
      fields,
    };
  }
  await adoptSessionCookie(response);
  redirect(safeNext(formData.get("next")));
}

export async function registerAction(_: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordRepeat = String(formData.get("password_repeat") ?? "");
  const displayName = String(formData.get("display_name") ?? "").trim();
  const fields = { email, display_name: displayName };
  if (!email || !password || !displayName) {
    return { error: "Заполните все поля", fields };
  }
  if (password !== passwordRepeat) {
    return { error: "Пароли не совпадают", fields };
  }
  const response = await post("/api/auth/register", {
    email,
    password,
    display_name: displayName,
  });
  if (!response?.ok) {
    const detail = response ? await errorDetail(response) : null;
    return {
      ...failure(
        response,
        response?.status === 409
          ? "Этот email уже зарегистрирован — войдите по нему."
          : detail,
        "Не удалось зарегистрироваться. Попробуйте ещё раз.",
      ),
      fields,
    };
  }
  await adoptSessionCookie(response);
  redirect(safeNext(formData.get("next")));
}

/** Email и пароль для аккаунта, созданного входом через Telegram. */
export async function setCredentialsAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fields = { email };
  if (password !== String(formData.get("password_repeat") ?? "")) {
    return { error: "Пароли не совпадают", fields };
  }
  const response = await post("/api/auth/me/credentials", { email, password });
  if (response?.status === 401) {
    redirect("/login");
  }
  if (!response?.ok) {
    const detail = response ? await errorDetail(response) : null;
    return { ...failure(response, detail, "Не удалось сохранить email и пароль."), fields };
  }
  redirect("/account?credentials=1");
}

// ---------- вход и привязка через Telegram-бота ----------

export type ConnectStart =
  | { ok: true; deepLink: string; pollIntervalMs: number }
  | { ok: false; error: string };

export async function startTelegramConnectAction(
  purpose: "login" | "link",
): Promise<ConnectStart> {
  const response = await post("/api/auth/telegram/connect", { purpose });
  if (!response?.ok) {
    const detail = response ? await errorDetail(response) : null;
    const state = failure(
      response,
      response?.status === 401 ? "Сначала войдите в аккаунт" : detail,
      "Не удалось начать вход через Telegram.",
    );
    return { ok: false, error: state.error ?? SERVICE_UNAVAILABLE_MESSAGE };
  }
  const secret = readSetCookie(response, CONNECT_COOKIE_NAME);
  if (!secret) {
    return { ok: false, error: SERVICE_UNAVAILABLE_MESSAGE };
  }
  await storeCookie(CONNECT_COOKIE_NAME, secret);
  const body = (await response.json()) as {
    deep_link: string;
    poll_interval_seconds?: number;
  };
  return {
    ok: true,
    deepLink: body.deep_link,
    pollIntervalMs: Math.max(1, body.poll_interval_seconds ?? 2) * 1000,
  };
}

export type ConnectStatus =
  | "pending"
  | "completed"
  | "rejected"
  | "expired"
  | "used"
  | "unknown"
  | "unavailable";

export async function pollTelegramConnectAction(): Promise<ConnectStatus> {
  const cookieStore = await cookies();
  const secret = cookieStore.get(CONNECT_COOKIE_NAME);
  if (!secret) {
    return "unknown";
  }
  const response = await post(
    "/api/auth/telegram/connect/complete",
    undefined,
    `${CONNECT_COOKIE_NAME}=${secret.value}`,
  );
  if (response === null || response.status >= 500) {
    return "unavailable";
  }
  if (!response.ok) {
    cookieStore.delete(CONNECT_COOKIE_NAME);
    return "unknown";
  }
  const body = (await response.json()) as { status: ConnectStatus };
  if (body.status !== "pending") {
    cookieStore.delete(CONNECT_COOKIE_NAME);
  }
  if (body.status === "completed") {
    await adoptSessionCookie(response);
  }
  return body.status;
}
