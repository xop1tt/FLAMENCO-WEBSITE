"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { SERVICE_UNAVAILABLE_MESSAGE } from "@/lib/apiResult";
// Поля виджета совпадают с `TelegramAuthRequest` на backend
// (`flamenco-studio-bot/src/flamenco_bot/api/schemas.py`) — подпись (`hash`)
// проверяется там, фронтенд ей не доверяет и ничего сам не проверяет.
import { telegramWidgetLoginAction, type TelegramWidgetUser } from "@/lib/authActions";

type TelegramAuthCallback = (user: TelegramWidgetUser) => void;

// Виджет вызывает колбэк по имени из глобальной области (`window`), а не
// через проп/событие React — так работает его встраиваемый скрипт.
// Индексация через `Record` вместо расширения `interface Window`, чтобы не
// заявлять произвольные строковые свойства глобально для всего приложения.
function getWindowCallbacks(): Record<string, TelegramAuthCallback | undefined> {
  return window as unknown as Record<string, TelegramAuthCallback | undefined>;
}

const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

export function TelegramLoginWidget() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // Отдельное имя колбэка на каждый экземпляр виджета — на случай, если
  // страница когда-нибудь отрендерит его дважды.
  const reactId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const callbackName = `onTelegramAuth_${reactId}`;

  useEffect(() => {
    getWindowCallbacks()[callbackName] = async (user: TelegramWidgetUser) => {
      setError(null);
      setPending(true);
      try {
        const { error: loginError } = await telegramWidgetLoginAction(user);
        if (loginError) {
          setError(loginError);
          setPending(false);
          return;
        }
        router.push("/");
        router.refresh();
      } catch {
        setError(SERVICE_UNAVAILABLE_MESSAGE);
        setPending(false);
      }
    };

    const container = document.getElementById(`telegram-login-${reactId}`);
    if (container && BOT_USERNAME) {
      const script = document.createElement("script");
      script.src = "https://telegram.org/js/telegram-widget.js?22";
      script.async = true;
      script.setAttribute("data-telegram-login", BOT_USERNAME);
      script.setAttribute("data-size", "large");
      script.setAttribute("data-onauth", `${callbackName}(user)`);
      script.setAttribute("data-request-access", "write");
      container.appendChild(script);
    }

    return () => {
      delete getWindowCallbacks()[callbackName];
    };
  }, [callbackName, reactId, router]);

  if (!BOT_USERNAME) {
    return (
      <p className="text-sm text-[var(--text-secondary)]">
        Вход через Telegram не настроен: не задан
        NEXT_PUBLIC_TELEGRAM_BOT_USERNAME.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div id={`telegram-login-${reactId}`} />
      {pending && (
        <p className="text-sm text-[var(--text-secondary)]">Входим…</p>
      )}
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
    </div>
  );
}
