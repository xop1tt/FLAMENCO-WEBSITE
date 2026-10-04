import { cookies } from "next/headers";
import { requestJson, type ApiResult } from "./apiResult";

/**
 * Личный кабинет (Stage 5): профиль, баланс, мои занятия, поддержка.
 * Все данные — с backend (`flamenco-studio-bot/src/flamenco_bot/api`), сессия передаётся тем же
 * способом, что и в `lib/auth.ts`: cookie пересылается напрямую backend'у,
 * а не через rewrite (это серверные компоненты, не браузер).
 */

const API_BASE_URL = process.env.API_BASE_URL ?? "http://127.0.0.1:8000";
const SESSION_COOKIE_NAME = "session";

async function fetchWithSession<T>(path: string): Promise<ApiResult<T>> {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE_NAME);
  if (!session) {
    return { ok: false, error: "unauthorized", status: null };
  }
  return requestJson<T>(`${API_BASE_URL}${path}`, {
    headers: { cookie: `${SESSION_COOKIE_NAME}=${session.value}` },
    cache: "no-store",
  });
}

export type Profile = {
  telegram_id: number;
  user_name: string;
  phone: string | null;
  lesson_credits: number;
  registered_at: string;
  is_admin: boolean;
};

export type UserBooking = {
  id: number;
  slot_id: number;
  class_key: string;
  class_label: string;
  starts_at: string;
  booking_status: string;
  slot_status: string;
  cancellable_until: string;
};

export type SupportTicket = {
  id: number;
  status: string;
  created_at: string;
  updated_at: string;
  last_message: string;
};

export type PaymentHistoryItem = {
  id: number;
  package_key: string;
  package_title: string;
  lessons: number;
  amount_minor: number;
  status: string;
  created_at: string;
};

// Ошибка — `ApiResult` с причиной, а не `null`/`[]`: пустой список и
// "не удалось загрузить" страница показывает по-разному.
export function getProfile(): Promise<ApiResult<Profile>> {
  return fetchWithSession<Profile>("/api/users/me/profile");
}

export function getMyBookings(): Promise<ApiResult<UserBooking[]>> {
  return fetchWithSession<UserBooking[]>("/api/bookings/me");
}

export function getMySupportTickets(): Promise<ApiResult<SupportTicket[]>> {
  return fetchWithSession<SupportTicket[]>("/api/support/me");
}

export function getMyPayments(): Promise<ApiResult<PaymentHistoryItem[]>> {
  return fetchWithSession<PaymentHistoryItem[]>("/api/payments/me");
}

/**
 * Занятия, на которые пользователь уже записан (подтверждённые записи) —
 * чтобы в расписании показывать «Вы записаны» вместо кнопки «Записаться».
 * Без сессии или при сбое API — пустой набор: тогда остаётся обычная
 * кнопка, а повторную запись backend всё равно обработает идемпотентно.
 */
export async function getMyBookedSlotIds(): Promise<Set<number>> {
  const result = await getMyBookings();
  if (!result.ok) {
    return new Set();
  }
  return new Set(
    result.data
      .filter((booking) => booking.booking_status === "confirmed")
      .map((booking) => booking.slot_id),
  );
}
