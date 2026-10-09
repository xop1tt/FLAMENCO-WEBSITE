import type { Metadata } from "next";
import { getAdminPayments } from "@/lib/admin";
import { isServiceFailure } from "@/lib/apiResult";
import { ServiceUnavailableNotice } from "@/components/ServiceUnavailableNotice";
import { Badge, EmptyState, formatAdminDateTime, formatRub } from "@/components/admin/AdminUi";

export const metadata: Metadata = {
  title: "Платежи",
};

const TONES: Record<string, "success" | "danger" | "neutral"> = {
  succeeded: "success",
  canceled: "danger",
  refunded: "danger",
};

export default async function AdminPaymentsPage() {
  const result = await getAdminPayments();
  if (!result.ok) {
    return isServiceFailure(result) ? <ServiceUnavailableNotice /> : <EmptyState>Нет доступа.</EmptyState>;
  }
  if (result.data.length === 0) {
    return <EmptyState>Платежей пока нет.</EmptyState>;
  }

  return (
    <div className="overflow-x-auto rounded-[24px] glass-medium">
      <table className="w-full min-w-[680px] text-left text-sm">
        <thead className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">
          <tr className="border-b border-[var(--border)]">
            <th className="px-4 py-3 font-medium">№</th>
            <th className="px-4 py-3 font-medium">Дата</th>
            <th className="px-4 py-3 font-medium">Участник</th>
            <th className="px-4 py-3 font-medium">Абонемент</th>
            <th className="px-4 py-3 font-medium">Сумма</th>
            <th className="px-4 py-3 font-medium">Статус</th>
          </tr>
        </thead>
        <tbody>
          {result.data.map((payment) => (
            <tr key={payment.id} className="border-b border-[var(--border)] last:border-0">
              <td className="px-4 py-3 text-[var(--text-secondary)]">{payment.id}</td>
              <td className="px-4 py-3 text-[var(--text-secondary)]">
                {formatAdminDateTime(payment.created_at)}
              </td>
              <td className="px-4 py-3">
                {payment.user_name ?? "—"}
                <span className="block text-xs text-[var(--text-secondary)]">
                  {payment.telegram_id}
                </span>
              </td>
              <td className="px-4 py-3">{payment.package_title}</td>
              <td className="px-4 py-3 font-medium">{formatRub(payment.amount_rub)}</td>
              <td className="px-4 py-3">
                <Badge tone={TONES[payment.status] ?? "neutral"}>{payment.status_label}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
