import { type } from "arktype";
import { describe, expect, it } from "vitest";
import {
  getUserInput,
  userProfile,
  userRole,
  volunteerTypes,
} from "@common/user.ts";

const volunteer = {
  firstName: "Jane",
  lastName: "Doe",
  email: "jane@example.com",
  role: "volunteer",
  volunteerTypes: ["planter"],
};

describe("userRole", () => {
  it.each(["admin", "volunteer"])("accepts %s", (role) => {
    expect(userRole(role) instanceof type.errors).toBe(false);
  });

  it.each(["planter", "guest"])("rejects %s", (role) => {
    expect(userRole(role) instanceof type.errors).toBe(true);
  });
});

describe("volunteerTypes", () => {
  it.each([[["planter"]], [["pruner"]], [["planter", "pruner"]]])(
    "accepts %j",
    (types) => {
      expect(volunteerTypes(types) instanceof type.errors).toBe(false);
    },
  );

  it.each([[[]], [["admin"]], [["planter", "planter"]], ["planter"]])(
    "rejects %j",
    (types) => {
      expect(volunteerTypes(types) instanceof type.errors).toBe(true);
    },
  );
});

describe("userProfile", () => {
  it("accepts a volunteer with volunteer types", () => {
    expect(userProfile(volunteer) instanceof type.errors).toBe(false);
  });

  it("accepts an admin without volunteer types", () => {
    const { volunteerTypes: _, ...rest } = volunteer;
    const result = userProfile({ ...rest, role: "admin" });
    expect(result instanceof type.errors).toBe(false);
  });

  it("rejects a volunteer without volunteer types", () => {
    const { volunteerTypes: _, ...rest } = volunteer;
    expect(userProfile(rest) instanceof type.errors).toBe(true);
  });

  it("rejects an admin with volunteer types", () => {
    const result = userProfile({ ...volunteer, role: "admin" });
    expect(result instanceof type.errors).toBe(true);
  });

  it.each(["firstName", "lastName"])(
    "rejects a whitespace-only %s",
    (field) => {
      const result = userProfile({ ...volunteer, [field]: "   " });
      expect(result instanceof type.errors).toBe(true);
    },
  );

  it("trims surrounding whitespace from names", () => {
    const result = userProfile({
      ...volunteer,
      firstName: " Jane ",
      lastName: " Doe ",
    });
    expect(result).toEqual(volunteer);
  });

  it("rejects a bad email", () => {
    const result = userProfile({ ...volunteer, email: "not-an-email" });
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
