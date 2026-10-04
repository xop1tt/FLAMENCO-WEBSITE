import { SERVICE_UNAVAILABLE_MESSAGE } from "@/lib/apiResult";

// Показывается вместо данных, если backend не ответил или ответил 5xx —
// чтобы сбой не выглядел как «записей нет» или «каталог пуст».
export function ServiceUnavailableNotice() {
  return (
    <div
      role="alert"
      className="glass-medium flex flex-col items-start gap-3 rounded-[24px] p-6"
    >
      <p className="text-[var(--text-secondary)]">{SERVICE_UNAVAILABLE_MESSAGE}</p>
    </div>
  );
}
