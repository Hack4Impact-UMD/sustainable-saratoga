import { type } from "arktype";
import type { Type } from "arktype";

// types come from the schema's output (S["infer"]) so transforms like trim are reflected
export function validateForm<S extends Type<object>>(
  schema: S,
  values: unknown,
):
  | { ok: true; data: S["infer"] }
  | { ok: false; errors: FieldErrors<S["infer"]>; formError?: string } {
  type T = S["infer"];
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
