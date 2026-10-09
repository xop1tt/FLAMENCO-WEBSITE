import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { NavLink } from "@/components/NavLink";
import { ServiceUnavailableNotice } from "@/components/ServiceUnavailableNotice";

export const metadata: Metadata = {
  title: { default: "Админка", template: "%s — Админка" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const ADMIN_LINKS = [
  { href: "/admin", label: "Сводка" },
  { href: "/admin/schedule", label: "Расписание" },
  { href: "/admin/users", label: "Участники" },
  { href: "/admin/payments", label: "Платежи" },
  { href: "/admin/support", label: "Поддержка" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (session.status === "anonymous") {
    redirect("/login?next=/admin");
  }
  if (session.status === "unavailable") {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <ServiceUnavailableNotice />
      </div>
    );
  }
  // Не администратору раздел «не существует». Это только интерфейс:
  // каждый /api/admin/* сам отвечает 403.
  if (!session.user.is_admin) {
    notFound();
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-12">
      <div className="flex flex-col gap-2">
        <span className="eyebrow">Mirada Studio</span>
        <h1 className="font-heading text-4xl font-bold tracking-tight">Админка</h1>
      </div>
      <nav className="flex flex-wrap gap-1">
        {ADMIN_LINKS.map((link) => (
          <NavLink key={link.href} href={link.href}>
            {link.label}
          </NavLink>
        ))}
      </nav>
      {session.user.telegram_id === null && (
        <p className="rounded-2xl glass-subtle px-4 py-3 text-sm leading-relaxed text-[var(--text-secondary)]">
          Смотреть сводку и показатели можно и так, а чтобы менять расписание и
          отвечать в поддержку,{" "}
          <Link
            href="/account"
            className="font-medium text-[var(--primary-text)] underline-offset-4 hover:underline"
          >
            привяжите Telegram
          </Link>
          : действия администратора записываются в журнал по Telegram ID, как в
          админке бота.
        </p>
      )}
      {children}
    </div>
  );
}
