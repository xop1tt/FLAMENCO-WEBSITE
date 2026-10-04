// Ошибка API не должна выглядеть как пустые данные: проверяем
// классификацию ответов backend (src/lib/apiResult.ts).
// Запуск: npm test (node --test, без дополнительных зависимостей).
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  SERVICE_UNAVAILABLE_MESSAGE,
  isServiceFailure,
  requestJson,
} from "../src/lib/apiResult.ts";

const quiet = { error: console.error };
test.beforeEach(() => {
  console.error = () => {};
});
test.afterEach(() => {
  console.error = quiet.error;
});

function respond(status, body) {
  return async () =>
    new Response(typeof body === "string" ? body : JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
}

function failWith(error) {
  return async () => {
    throw error;
  };
}

test("пустой массив — успешный ответ, а не ошибка", async () => {
  const result = await requestJson("http://api/x", {}, respond(200, []));
  assert.deepEqual(result, { ok: true, data: [] });
  assert.equal(isServiceFailure(result), false);
});

test("401 — unauthorized (единственный повод вести на /login)", async () => {
  const result = await requestJson("http://api/x", {}, respond(401, { detail: "x" }));
  assert.deepEqual(result, { ok: false, error: "unauthorized", status: 401 });
  assert.equal(isServiceFailure(result), false);
});

test("500 — server_error, показывается «сервис недоступен»", async () => {
  const result = await requestJson("http://api/x", {}, respond(500, { detail: "x" }));
  assert.deepEqual(result, { ok: false, error: "server_error", status: 500 });
  assert.equal(isServiceFailure(result), true);
});

test("503 (БД недоступна) — unavailable", async () => {
  const result = await requestJson(
    "http://api/x",
    {},
    respond(503, { detail: "Database temporarily unavailable" }),
  );
  assert.deepEqual(result, { ok: false, error: "unavailable", status: 503 });
  assert.equal(isServiceFailure(result), true);
});

test("409 и прочие 4xx — client_error, не сбой сервиса", async () => {
  const result = await requestJson("http://api/x", {}, respond(409, { detail: "x" }));
  assert.equal(result.ok, false);
  assert.equal(result.error, "client_error");
  assert.equal(isServiceFailure(result), false);
});

test("API не запущен (ECONNREFUSED) — unavailable", async () => {
  const error = new TypeError("fetch failed", {
    cause: Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" }),
  });
  const result = await requestJson("http://api/x", {}, failWith(error));
  assert.deepEqual(result, { ok: false, error: "unavailable", status: null });
  assert.equal(isServiceFailure(result), true);
});

test("таймаут и прочие сетевые сбои — network_error", async () => {
  for (const error of [
    new DOMException("timed out", "TimeoutError"),
    new TypeError("fetch failed"),
  ]) {
    const result = await requestJson("http://api/x", {}, failWith(error));
    assert.deepEqual(result, { ok: false, error: "network_error", status: null });
    assert.equal(isServiceFailure(result), true);
  }
});

test("некорректный JSON в 200 — server_error, а не пустые данные", async () => {
  const result = await requestJson("http://api/x", {}, respond(200, "<html>"));
  assert.equal(result.ok, false);
  assert.equal(result.error, "server_error");
});

test("запрос получает таймаут, если свой signal не передан", async () => {
  let seen;
  await requestJson("http://api/x", { headers: { a: "b" } }, async (_url, init) => {
    seen = init;
    return new Response("[]", { status: 200 });
  });
  assert.ok(seen.signal instanceof AbortSignal);
  assert.deepEqual(seen.headers, { a: "b" });
});

test("текст сообщения о недоступности", () => {
  assert.equal(SERVICE_UNAVAILABLE_MESSAGE, "Сервис временно недоступен. Попробуйте ещё раз.");
});
