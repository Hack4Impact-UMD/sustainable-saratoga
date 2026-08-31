import { type } from "arktype";
import { describe, expect, it } from "vitest";
import { addNoteInput, helloInput } from "@common/schemas.ts";

describe("shared schemas", () => {
  it("accepts a valid payload", () => {
    expect(helloInput({ name: "world" })).toEqual({ name: "world" });
  });

  it("rejects an empty name", () => {
    expect(helloInput({ name: "" })).toBeInstanceOf(type.errors);
  });

  it("rejects a note over the length limit", () => {
    expect(addNoteInput({ text: "x".repeat(281) })).toBeInstanceOf(type.errors);
  });
});
