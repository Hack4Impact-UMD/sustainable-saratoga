import { type } from "arktype";
import { describe, expect, it } from "vitest";
import { createUserInput, loginInput, signUpInput } from "@common/auth.ts";
import { validateForm } from "@common/validation.ts";

const validSignUp = {
  firstName: "Jane",
  lastName: "Doe",
  email: "jane@example.com",
  password: "password123",
  confirmPassword: "password123",
};

describe("loginInput", () => {
  it("accepts a valid email and password", () => {
    const result = loginInput({
      email: "jane@example.com",
      password: "password123",
    });
    expect(result instanceof type.errors).toBe(false);
  });

  it("rejects a bad email and an empty password", () => {
    const result = loginInput({ email: "jane@doe", password: "" });
    expect(result instanceof type.errors).toBe(true);
  });
});

describe("signUpInput", () => {
  it("accepts matching passwords", () => {
    expect(signUpInput(validSignUp) instanceof type.errors).toBe(false);
  });

  it("rejects passwords that do not match", () => {
    const result = signUpInput({
      ...validSignUp,
      confirmPassword: "123password",
    });
    expect(result instanceof type.errors).toBe(true);
  });

  it("reports a password mismatch on confirmPassword", () => {
    const result = validateForm(signUpInput, {
      ...validSignUp,
      confirmPassword: "123password",
    });
    expect(result).toMatchObject({
      ok: false,
      errors: { confirmPassword: "Passwords do not match" },
    });
  });

  it("rejects a password with no number", () => {
    const result = signUpInput({
      ...validSignUp,
      password: "passwordonly",
      confirmPassword: "passwordonly",
    });
    expect(result instanceof type.errors).toBe(true);
  });

  it("rejects an empty first name", () => {
    const result = signUpInput({ ...validSignUp, firstName: "" });
    expect(result instanceof type.errors).toBe(true);
  });
});

describe("createUserInput", () => {
  it("accepts a first and last name", () => {
    const result = createUserInput({ firstName: "Jane", lastName: "Doe" });
    expect(result instanceof type.errors).toBe(false);
  });

  it("rejects an empty first name", () => {
    const result = createUserInput({ firstName: "", lastName: "Doe" });
    expect(result instanceof type.errors).toBe(true);
  });
});
