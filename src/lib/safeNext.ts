/**
 * Путь для перенаправления после входа (`?next=`) — только внутри сайта,
 * чтобы ссылку на /login нельзя было использовать для перехода на чужой сайт.
 *
 * Проверки `startsWith("/") && !startsWith("//")` недостаточно: браузер
 * читает `\` как `/`, и `/\evil.com` (`?next=/%5Cevil.com`) ведёт на
 * https://evil.com. Поэтому путь разбирается так же, как его разберёт
 * браузер, и принимается, только если origin не изменился.
 */
export function safeNextPath(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.startsWith("/")) {
    return undefined;
  }
  const base = "http://flamenco.invalid";
  let url: URL;
  try {
    url = new URL(value, base);
  } catch {
    return undefined;
  }
  if (url.origin !== base) {
    return undefined;
  }
  return `${url.pathname}${url.search}${url.hash}`;
}
