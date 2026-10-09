"use client";

import { useActionState } from "react";
import { setCredentialsAction, type FormState } from "@/lib/authActions";
import { ERROR_NOTICE_CLASS, INPUT_CLASS, PRIMARY_BUTTON_CLASS } from "@/lib/glass";
import { Field } from "./EmailAuthForm";

const INITIAL: FormState = { error: null };

/** Email и пароль для аккаунта, созданного входом через Telegram. */
export function SetCredentialsForm() {
  const [state, action, pending] = useActionState(setCredentialsAction, INITIAL);
  return (
    <form action={action} className="flex flex-col gap-3">
      <Field label="Email" htmlFor="credentials-email">
        <input
          id="credentials-email"
          name="email"
          type="email"
          required
          maxLength={255}
          autoComplete="email"
          defaultValue={state.fields?.email}
          className={INPUT_CLASS}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Пароль" htmlFor="credentials-password">
          <input
            id="credentials-password"
            name="password"
            type="password"
            required
            minLength={8}
            maxLength={256}
            autoComplete="new-password"
            className={INPUT_CLASS}
          />
        </Field>
        <Field label="Пароль ещё раз" htmlFor="credentials-password-repeat">
          <input
            id="credentials-password-repeat"
            name="password_repeat"
            type="password"
            required
            minLength={8}
            maxLength={256}
            autoComplete="new-password"
            className={INPUT_CLASS}
          />
        </Field>
      </div>
      {state.error && (
        <p role="alert" className={ERROR_NOTICE_CLASS}>
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className={`${PRIMARY_BUTTON_CLASS} self-start px-5 py-2 text-sm disabled:opacity-60`}
      >
        {pending ? "Сохраняем…" : "Сохранить email и пароль"}
      </button>
    </form>
  );
}
