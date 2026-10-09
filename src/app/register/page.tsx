import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { safeNextPath } from "@/lib/safeNext";
import { EmailAuthForm } from "@/components/EmailAuthForm";

export const metadata: Metadata = {
  title: "Регистрация",
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ next?: string }>;

export default async function RegisterPage({ searchParams }: { searchParams: SearchParams }) {
  const { next } = await searchParams;
  const currentUser = await getCurrentUser();
  if (currentUser) {
    redirect("/account");
  }
  const safeNext = safeNextPath(next);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="font-heading text-4xl font-bold tracking-tight">Регистрация</h1>
        <p className="text-base leading-relaxed text-[var(--text-secondary)]">
          Для покупки абонементов и записи на занятия после регистрации
          понадобится привязать Telegram — так баланс и записи будут общими
          с ботом студии.
        </p>
      </div>
      <section className="flex flex-col gap-4 rounded-[28px] glass-medium p-6">
        <EmailAuthForm mode="register" next={safeNext} />
        <p className="text-center text-sm text-[var(--text-secondary)]">
          Уже есть аккаунт?{" "}
          <Link
            href={safeNext ? `/login?next=${encodeURIComponent(safeNext)}` : "/login"}
            className="font-medium text-[var(--primary-text)] underline-offset-4 hover:underline"
          >
            Войти
          </Link>
        </p>
      </section>
      <p className="text-center text-xs leading-relaxed text-[var(--text-secondary)]">
        Уже пользуетесь ботом студии? Можно сразу{" "}
        <Link
          href="/login"
          className="font-medium text-[var(--primary-text)] underline-offset-4 hover:underline"
        >
          войти через Telegram
        </Link>{" "}
        и потом задать email и пароль в личном кабинете.
      </p>
    </div>
  );
}
