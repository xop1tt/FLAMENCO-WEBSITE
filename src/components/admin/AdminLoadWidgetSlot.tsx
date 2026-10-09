import { getCurrentUser } from "@/lib/auth";
import { AdminLoadWidget } from "./AdminLoadWidget";

// Окно нагрузки попадает в разметку только администраторам — обычные
// посетители не получают даже его клиентский код. Данные всё равно
// защищает backend (403 на /api/admin/metrics).
export async function AdminLoadWidgetSlot() {
  const user = await getCurrentUser();
  return user?.is_admin ? <AdminLoadWidget /> : null;
}
