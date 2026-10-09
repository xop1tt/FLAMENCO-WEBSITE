"use client";

import { useActionState } from "react";
import { loginAction, registerAction, type FormState } from "@/lib/authActions";
import { ERROR_NOTICE_CLASS, INPUT_CLASS, PRIMARY_BUTTON_CLASS } from "@/lib/glass";

const INITIAL: FormState = { error: null };

export function EmailAuthForm({
  mode,
  next,
}: {
  mode: "login" | "register";
  next?: string;
}) {
  const [state, action, pending] = useActionState(
    mode === "login" ? loginAction : registerAction,
    INITIAL,
  );

  return (
    <form action={action} className="flex flex-col gap-3 text-left">
      {next && <input type="hidden" name="next" value={next} />}
      {mode === "register" && (
        <Field label="Имя" htmlFor="display_name">
          <input
            id="display_name"
            name="display_name"
            required
            maxLength={100}
            autoComplete="name"
            defaultValue={state.fields?.display_name}
            className={INPUT_CLASS}
          />
        </Field>
      )}
      <Field label="Email" htmlFor="email">
        <input
          id="email"
          name="email"
          type="email"
          required
          maxLength={255}
          autoComplete="email"
          defaultValue={state.fields?.email}
          className={INPUT_CLASS}
        />
      </Field>
      <Field label="Пароль" htmlFor="password">
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={mode === "register" ? 8 : 1}
          maxLength={256}
          autoComplete={mode === "register" ? "new-password" : "current-password"}
          className={INPUT_CLASS}
        />
      </Field>
      {mode === "register" && (
        <>
          <Field label="Пароль ещё раз" htmlFor="password_repeat">
            <input
              id="password_repeat"
              name="password_repeat"
              type="password"
              required
              minLength={8}
              maxLength={256}
              autoComplete="new-password"
              className={INPUT_CLASS}
            />
          </Field>
          <p className="text-xs text-[var(--text-secondary)]">Минимум 8 символов.</p>
        </>
      )}
      {state.error && (
        <p role="alert" className={ERROR_NOTICE_CLASS}>
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className={`${PRIMARY_BUTTON_CLASS} mt-1 px-5 py-2.5 text-base disabled:opacity-60`}
      >
        {pending
          ? mode === "login"
            ? "Входим…"
            : "Создаём аккаунт…"
          : mode === "login"
            ? "Войти"
            : "Зарегистрироваться"}
      </button>
    </form>
  );
}

export function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}
