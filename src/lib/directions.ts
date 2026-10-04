/**
 * Направления занятий для сайта.
 *
 * Название, описание и уровень приходят с backend (`GET /api/classes`,
 * источник истины — `flamenco-studio-bot/src/flamenco_bot/class_catalog.py`, тот же каталог,
 * которым пользуется бот), поэтому на сайте и в боте текст одинаковый.
 */

import { getClasses } from "./api";

export type Direction = {
  key: string;
  label: string;
  description: string;
  level: string;
};

// При недоступном API — пустой список: направления лишь подписи и фильтры,
// а саму ошибку страница показывает по результату расписания.
export async function getDirections(): Promise<Direction[]> {
  const result = await getClasses();
  if (!result.ok) {
    return [];
  }
  return result.data.map((item) => ({
    key: item.key,
    label: item.label,
    description: item.description,
    level: item.level,
  }));
}
