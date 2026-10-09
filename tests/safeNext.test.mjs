// ?next= после входа не должен уводить на чужой сайт (src/lib/safeNext.ts).
// Запуск: npm test.
import assert from "node:assert/strict";
import { test } from "node:test";

import { safeNextPath } from "../src/lib/safeNext.ts";

test("внутренние пути сохраняются вместе с query и hash", () => {
  assert.equal(safeNextPath("/account"), "/account");
  assert.equal(safeNextPath("/schedule?class_key=beginner"), "/schedule?class_key=beginner");
  assert.equal(safeNextPath("/account/payments#last"), "/account/payments#last");
});

test("ссылки на другой origin отклоняются", () => {
  for (const value of [
    "//evil.com",
    "/\\evil.com", // ?next=/%5Cevil.com — браузер читает \ как /
    "/\\/evil.com",
    "\\\\evil.com",
    "https://evil.com",
    "javascript:alert(1)",
    "evil.com",
    "",
  ]) {
    assert.equal(safeNextPath(value), undefined, JSON.stringify(value));
  }
});

test("не строка — нет пути", () => {
  assert.equal(safeNextPath(undefined), undefined);
  assert.equal(safeNextPath(null), undefined);
});

test("управляющие символы не дают выйти за origin", () => {
  assert.equal(safeNextPath("/\tevil.com"), "/evil.com");
});
