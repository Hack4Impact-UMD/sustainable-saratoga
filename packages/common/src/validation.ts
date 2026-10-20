import { type } from "arktype";
import type { Type } from "arktype";

export function validateForm<T extends object>(
  schema: Type<T>,
  values: unknown,
):
  | { ok: true; data: T }
  | { ok: false; errors: FieldErrors<T>; formError?: string } {
  const result = schema(values);

  // successful validation then returns the data
  if (!(result instanceof type.errors)) {
    return { ok: true, data: result as T };
  }

  // failed validation then collects the errors
  const errors: FieldErrors<T> = {};
  let formError: string | undefined;
  for (const error of result) {
    const field = error.path[0];
    if (typeof field !== "string") {
      // no field to attach to (e.g. the input is null), so keep it as a form-level error
      formError ??= error.message;
    } else if (!errors[field as keyof T & string]) {
      errors[field as keyof T & string] = error.message;
    }
  }

  return formError === undefined
    ? { ok: false, errors }
    : { ok: false, errors, formError };
}

export type FieldErrors<T> = Partial<Record<keyof T & string, string>>;
