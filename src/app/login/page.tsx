import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { safeNextPath } from "@/lib/safeNext";
import { EmailAuthForm } from "@/components/EmailAuthForm";
import { TelegramConnect } from "@/components/TelegramConnect";

export const metadata: Metadata = {
  title: "Вход",
};

// Сессия читается из cookie на каждый запрос — страницу нельзя кэшировать.
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ next?: string }>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const { next } = await searchParams;
  const currentUser = await getCurrentUser();
  if (currentUser) {
    redirect("/account");
  }
  const safeNext = safeNextPath(next);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="font-heading text-4xl font-bold tracking-tight">Вход</h1>
        <p className="text-base leading-relaxed text-[var(--text-secondary)]">
          По email и паролю или через Telegram — это один и тот же аккаунт.
        </p>
      </div>

      <section className="flex flex-col gap-4 rounded-[28px] glass-medium p-6">
        <EmailAuthForm mode="login" next={safeNext} />
        <p className="text-center text-sm text-[var(--text-secondary)]">
          Нет аккаунта?{" "}
          <Link
            href={safeNext ? `/register?next=${encodeURIComponent(safeNext)}` : "/register"}
            className="font-medium text-[var(--primary-text)] underline-offset-4 hover:underline"
          >
            Зарегистрироваться
          </Link>
        </p>
      </section>

      <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
        <span className="h-px flex-1 bg-[var(--border)]" />
        или
        <span className="h-px flex-1 bg-[var(--border)]" />
      </div>

      <section className="flex flex-col gap-3 rounded-[28px] glass-medium p-6">
        <TelegramConnect purpose="login" next={safeNext} />
        <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
          Если Telegram уже привязан к аккаунту с email, откроется тот же
          аккаунт — второй не создаётся.
        </p>
      </section>
    </div>
  );
}
