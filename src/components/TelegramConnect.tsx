"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  pollTelegramConnectAction,
  startTelegramConnectAction,
  type ConnectStatus,
} from "@/lib/authActions";
import { SERVICE_UNAVAILABLE_MESSAGE } from "@/lib/apiResult";
import { ERROR_NOTICE_CLASS, GLASS_BUTTON_CLASS, PRIMARY_BUTTON_CLASS } from "@/lib/glass";

/**
 * Вход или привязка Telegram через бота студии: сайт получает ссылку
 * t.me/<бот>?start=…, пользователь подтверждает действие кнопкой в боте,
 * а страница опрашивает backend, пока подтверждение не придёт. Работает на
 * любом адресе сайта (в отличие от Telegram Login Widget, которому нужен
 * домен, привязанный к боту через @BotFather).
 */

const FINAL_MESSAGES: Partial<Record<ConnectStatus, string>> = {
  rejected: "Запрос отклонён в боте — причина в сообщении от бота.",
  expired: "Ссылка устарела. Попробуйте ещё раз.",
  used: "Этот запрос уже использован. Попробуйте ещё раз.",
  unknown: "Запрос не найден. Попробуйте ещё раз.",
};

// Ссылка действительна ограниченное время (backend: TELEGRAM_CONNECT_TTL) —
// дольше опрашивать нет смысла.
const MAX_POLL_MS = 11 * 60 * 1000;

export function TelegramConnect({
  purpose,
  next = "/account",
}: {
  purpose: "login" | "link";
  next?: string;
}) {
  const router = useRouter();
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, startTransition] = useTransition();
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (pollTimer.current) clearTimeout(pollTimer.current);
  }, []);

  function stopPolling() {
    if (pollTimer.current) clearTimeout(pollTimer.current);
    pollTimer.current = null;
  }

  function poll(intervalMs: number, deadline: number) {
    pollTimer.current = setTimeout(async () => {
      const status = await pollTelegramConnectAction();
      if (status === "completed") {
        stopPolling();
        if (purpose === "login") {
          router.push(next);
        }
        router.refresh();
        return;
      }
      if (status === "pending" || status === "unavailable") {
        if (Date.now() < deadline) {
          poll(intervalMs, deadline);
        } else {
          setDeepLink(null);
          setError(FINAL_MESSAGES.expired ?? null);
        }
        return;
      }
      stopPolling();
      setDeepLink(null);
      setError(FINAL_MESSAGES[status] ?? SERVICE_UNAVAILABLE_MESSAGE);
    }, intervalMs);
  }

  function start() {
    setError(null);
    stopPolling();
    startTransition(async () => {
      const result = await startTelegramConnectAction(purpose);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDeepLink(result.deepLink);
      window.open(result.deepLink, "_blank", "noopener,noreferrer");
      poll(result.pollIntervalMs, Date.now() + MAX_POLL_MS);
    });
  }

  const actionLabel = purpose === "login" ? "Войти через Telegram" : "Привязать Telegram";

  return (
    <div className="flex flex-col items-stretch gap-3">
      {deepLink ? (
        <div className="flex flex-col gap-3 text-left">
          <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
            Откройте бота студии и нажмите «Подтвердить». Эта страница обновится
            сама.
          </p>
          <a
            href={deepLink}
            target="_blank"
            rel="noopener noreferrer"
            className={`${PRIMARY_BUTTON_CLASS} px-5 py-2.5 text-center text-base`}
          >
            Открыть бота в Telegram
          </a>
          <p className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[var(--primary)]" />
            Ждём подтверждения в боте…
          </p>
          <button
            type="button"
            onClick={() => {
              stopPolling();
              setDeepLink(null);
            }}
            className="self-start text-xs font-medium text-[var(--primary-text)] underline-offset-4 hover:underline"
          >
            Отмена
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={start}
          disabled={starting}
          className={`${GLASS_BUTTON_CLASS} px-5 py-2.5 text-base disabled:opacity-60`}
        >
          {starting ? "Готовим ссылку…" : actionLabel}
        </button>
      )}
      {error && (
        <p role="alert" className={ERROR_NOTICE_CLASS}>
          {error}
        </p>
      )}
    </div>
  );
}
