import { type } from "arktype";
import { describe, expect, it } from "vitest";
import { validateForm } from "@common/validation.ts";

const schema = type({
  email: "string.email",
  password: "string > 0",
});

describe("validateForm", () => {
  it("returns the data for valid input", () => {
    const values = { email: "jane@example.com", password: "password123" };
    expect(validateForm(schema, values)).toEqual({ ok: true, data: values });
  });

  it("returns an error for each invalid field", () => {
    const result = validateForm(schema, { email: "bad-email", password: "" });
    // toEqual ignores an undefined formError, so this also checks there is none
    expect(result).toEqual({
      ok: false,
      errors: {
        email: expect.any(String),
        password: expect.any(String),
      },
    });
  });

  it("returns an error for a missing field", () => {
    const result = validateForm(schema, { email: "jane@example.com" });
    expect(result).toMatchObject({
      ok: false,
      errors: { password: expect.any(String) },
    });
  });

  it.each([null, undefined, "not an object", 42])(
    "returns a form-level error for non-object input %s",
    (input) => {
      const result = validateForm(schema, input);
      expect(result).toEqual({
        ok: false,
        errors: {},
        formError: expect.any(String),
      });
    },
  );
});
