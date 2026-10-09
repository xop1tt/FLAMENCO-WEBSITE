import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/account";
import { getCurrentUser } from "@/lib/auth";
import { SetCredentialsForm } from "@/components/SetCredentialsForm";
import { isServiceFailure } from "@/lib/apiResult";
import { ServiceUnavailableNotice } from "@/components/ServiceUnavailableNotice";
import Link from "next/link";
import { lessonsCount } from "@/lib/format";
import {
  GLASS_BUTTON_CLASS,
  PRIMARY_BUTTON_CLASS,
  SUCCESS_NOTICE_CLASS,
} from "@/lib/glass";

export const metadata: Metadata = {
  title: "Профиль",
};

type SearchParams = Promise<{ credentials?: string }>;

export default async function AccountProfilePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { credentials } = await searchParams;
  const [result, currentUser] = await Promise.all([getProfile(), getCurrentUser()]);

  if (!result.ok && result.error === "unauthorized") {
    redirect("/login");
  }
  if (isServiceFailure(result)) {
    return <ServiceUnavailableNotice />;
  }
  if (!result.ok) {
    return (
      <p className="text-[var(--text-secondary)]">
        Не удалось загрузить профиль. Попробуйте обновить страницу позже.
      </p>
    );
  }
  const profile = result.data;

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-[24px] glass-medium p-6">
        <h2 className="mb-4 font-heading text-xl font-bold tracking-tight">Профиль</h2>
        <dl className="flex flex-col gap-3">
          <Row label="Имя" value={profile.user_name} />
          <Row label="Телефон" value={profile.phone ?? "не указан"} />
        </dl>
        <p className="mt-4 text-sm text-[var(--text-secondary)]">
          Имя и телефон меняются в Telegram-боте студии: «👤 Профиль».
        </p>
      </section>

      <section className="flex flex-col gap-4 rounded-[24px] glass-medium p-6">
        <h2 className="font-heading text-xl font-bold tracking-tight">Вход на сайт</h2>
        {credentials === "1" && (
          <p className={SUCCESS_NOTICE_CLASS}>
            Email и пароль сохранены — теперь можно входить и по ним.
          </p>
        )}
        <dl className="flex flex-col gap-3">
          <Row label="Telegram" value="привязан ✓" />
          {currentUser?.email && <Row label="Email" value={currentUser.email} />}
        </dl>
        {currentUser && !currentUser.email && (
          <div className="flex flex-col gap-3">
            <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
              Задайте email и пароль, чтобы входить на сайт и без Telegram.
              Это тот же аккаунт — баланс и записи общие.
            </p>
            <SetCredentialsForm />
          </div>
        )}
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-[24px] glass-medium p-6">
        <div>
          <h2 className="mb-1 font-heading text-xl font-bold tracking-tight">Баланс</h2>
          <p className="text-2xl font-bold text-[var(--primary-text)]">
            {lessonsCount(profile.lesson_credits)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/schedule" className={`${PRIMARY_BUTTON_CLASS} px-5 py-2 text-sm`}>
            Записаться
          </Link>
          <Link href="/packages" className={`${GLASS_BUTTON_CLASS} px-5 py-2 text-sm`}>
            Абонементы
          </Link>
        </div>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
      <dt className="w-40 shrink-0 font-medium">{label}</dt>
      <dd className="text-[var(--text-secondary)]">{value}</dd>
    </div>
  );
}
