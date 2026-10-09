import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AccountNav } from "@/components/AccountNav";
import { ServiceUnavailableNotice } from "@/components/ServiceUnavailableNotice";
import { TelegramConnect } from "@/components/TelegramConnect";

const TELEGRAM_BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

// Личный кабинет не имеет смысла без сессии — читаем cookie на каждый
// запрос, поэтому не кэшируем.
export const dynamic = "force-dynamic";

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  // На /login — только если сессии действительно нет (401). При сбое
  // backend пользователь не "вышел из аккаунта".
  if (session.status === "anonymous") {
    redirect("/login");
  }
  const currentUser = session.status === "authenticated" ? session.user : null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-12">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-4xl font-bold tracking-tight">Личный кабинет</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Тот же аккаунт, что в Telegram-боте студии
          {TELEGRAM_BOT_USERNAME ? (
            <>
              {" "}
              <a
                href={`https://t.me/${TELEGRAM_BOT_USERNAME}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[var(--primary-text)] underline-offset-4 hover:underline"
              >
                @{TELEGRAM_BOT_USERNAME}
              </a>
            </>
          ) : null}
          : записи, баланс и обращения общие.
        </p>
      </div>
      <AccountNav />
      {currentUser === null ? (
        <ServiceUnavailableNotice />
      ) : currentUser.telegram_id === null ? (
        <section className="flex flex-col gap-4 rounded-[24px] glass-medium p-6">
          <div className="flex flex-col gap-2">
            <h2 className="font-heading text-xl font-bold tracking-tight">
              Привяжите Telegram
            </h2>
            <p className="text-base leading-relaxed text-[var(--text-secondary)]">
              Покупка абонементов, запись на занятия, баланс и обращения в
              поддержку работают только с привязанным Telegram — это общий
              профиль с ботом студии. Email и пароль ({currentUser.email})
              останутся для входа на сайт.
            </p>
            <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
              Если вы уже входили на сайт через Telegram, аккаунты
              объединятся — второго не будет.
            </p>
          </div>
          <div className="max-w-sm">
            <TelegramConnect purpose="link" />
          </div>
        </section>
      ) : (
        children
      )}
    </div>
  );
}
