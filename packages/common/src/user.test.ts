import { type } from "arktype";
import { describe, expect, it } from "vitest";
import { getUserInput, userProfile, userRole } from "@common/user.ts";

describe("userRole", () => {
  it.each(["admin", "planter", "pruner"])("accepts %s", (role) => {
    expect(userRole(role) instanceof type.errors).toBe(false);
  });

  it("rejects an unknown role", () => {
    expect(userRole("guest") instanceof type.errors).toBe(true);
  });
});

describe("userProfile", () => {
  it("accepts a complete profile", () => {
    const result = userProfile({
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
    });
    expect(result instanceof type.errors).toBe(false);
  });

  it.each(["firstName", "lastName"])(
    "rejects a whitespace-only %s",
    (field) => {
      const result = userProfile({
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@example.com",
        [field]: "   ",
      });
      expect(result instanceof type.errors).toBe(true);
    },
  );

  it("trims surrounding whitespace from names", () => {
    const result = userProfile({
      firstName: " Jane ",
      lastName: " Doe ",
      email: "jane@example.com",
    });
    expect(result).toEqual({
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
    });
  });

  it("rejects a bad email", () => {
    const result = userProfile({
      firstName: "Jane",
      lastName: "Doe",
      email: "not-an-email",
    });
    expect(result instanceof type.errors).toBe(true);
  });
});

describe("getUserInput", () => {
  it("accepts a uid", () => {
    expect(getUserInput({ uid: "abc123" }) instanceof type.errors).toBe(false);
  });

  it("rejects an empty uid", () => {
    expect(getUserInput({ uid: "" }) instanceof type.errors).toBe(true);
  });
});
