// Контракт отображения времени: сайт показывает время в поясе студии.
// Те же контрольные точки проверяет backend (TELEGRAM-BOT,
// tests/unit/test_studio_time.py) — один и тот же момент из PostgreSQL
// выглядит одинаково на сайте и в Telegram-боте.
import assert from "node:assert/strict";
import { test } from "node:test";

delete process.env.STUDIO_TIMEZONE;
const { formatClassDateTime } = await import("../src/lib/format.ts");

const NOW = new Date("2026-10-01T09:00:00Z");

const CONTRACT = [
  ["2026-10-08T16:00:00Z", "Чт 08.10 · 19:00"],
  // Переход через полночь: в UTC ещё четверг, у студии уже пятница.
  ["2026-10-08T22:30:00Z", "Пт 09.10 · 01:30"],
  // Переход через год: дата студии уже в следующем году — год показывается.
  ["2026-12-31T21:30:00Z", "Пт 01.01.2027 · 00:30"],
];

for (const [iso, expected] of CONTRACT) {
  test(`по умолчанию Europe/Moscow: ${iso} → ${expected}`, () => {
    assert.equal(formatClassDateTime(iso, NOW), expected);
  });
}

test("срок отмены (за 24 часа) — в поясе студии", () => {
  // Начало 08.10 16:00 UTC → срок 07.10 16:00 UTC → 19:00 по Москве.
  assert.equal(formatClassDateTime("2026-10-07T16:00:00Z", NOW), "Ср 07.10 · 19:00");
});

test("STUDIO_TIMEZONE задаёт пояс; правила — из tz database, не фиксированный сдвиг", async () => {
  process.env.STUDIO_TIMEZONE = "Europe/Berlin";
  const berlin = await import("../src/lib/format.ts?berlin");
  assert.equal(berlin.formatClassDateTime("2026-07-01T16:00:00Z", NOW), "Ср 01.07 · 18:00");
  assert.equal(berlin.formatClassDateTime("2026-01-15T16:00:00Z", NOW), "Чт 15.01 · 17:00");
  delete process.env.STUDIO_TIMEZONE;
});
