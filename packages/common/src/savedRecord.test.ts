import { type } from "arktype";
import { describe, expect, it } from "vitest";
import {
  createTreeRecordInput,
  treeAddress,
  treeDocument,
  updateTreeRecordInput,
} from "@common/record.ts";

const minimalInput = {
  address: " 62 Phila St ",
  city: "Saratoga Springs",
  state: "NY",
  lat: 43.079,
  lng: -73.784,
  status: "requested",
};

describe("saved record schemas", () => {
  it("accepts the minimum create fields and trims the address", () => {
    expect(createTreeRecordInput.assert(minimalInput)).toEqual({
      ...minimalInput,
      address: "62 Phila St",
    });
    expect(
      createTreeRecordInput({ ...minimalInput, status: "possible" }),
    ).not.toBeInstanceOf(type.errors);
    expect(
      treeAddress({ address: "", city: "Saratoga Springs", state: "NY" }),
    ).toBeInstanceOf(type.errors);
  });

  it.each(["address", "city", "state", "status", "lat", "lng"] as const)(
    "requires %s on create",
    (key) => {
      const input: Partial<typeof minimalInput> = { ...minimalInput };
      delete input[key];
      expect(createTreeRecordInput(input)).toBeInstanceOf(type.errors);
    },
  );

  it.each([
    { address: "  " },
    { status: "approved" },
    { lat: 91 },
    { lng: -181 },
    { lat: NaN },
    { origin: "requested" },
    { treeNumber: 42 },
    { id: "7A21-6495" },
    { healthChecks: [] },
    { recordInformation: { createdBy: "spoofed" } },
    { siteAssessment: { energyDirection: "North" } },
    { responsibleMemberUid: "not/a/uid" },
  ])("rejects invalid or unmanaged fields %j", (patch) => {
    expect(createTreeRecordInput({ ...minimalInput, ...patch })).toBeInstanceOf(
      type.errors,
    );
  });

  it("accepts and normalizes optional captions with a 60-character limit", () => {
    const photo = { src: "/tree-photo.png", takenAt: "2026-11-23" };
    const result = createTreeRecordInput.assert({
      ...minimalInput,
      photos: [
        photo,
        { ...photo, caption: "  " },
        { ...photo, caption: " View from street " },
        { ...photo, caption: "a".repeat(60) },
      ],
    });
    expect(result.photos?.map(({ caption }) => caption)).toEqual([
      "Untitled photo",
      "Untitled photo",
      "View from street",
      "a".repeat(60),
    ]);
    expect(
      createTreeRecordInput({
        ...minimalInput,
        photos: [{ ...photo, caption: "a".repeat(61) }],
      }),
    ).toBeInstanceOf(type.errors);
  });

  it("validates patches and protects saved record fields", () => {
    const id = "7A21-6495";
    const changes = {
      responsibleMemberUid: null,
      siteAssessment: { nextSteps: null },
    };
    expect(updateTreeRecordInput.assert({ id, changes })).toEqual({
      id,
      changes,
    });
    expect(
      updateTreeRecordInput({ id, changes: { lat: undefined } }),
    ).toBeInstanceOf(type.errors);
    expect(
      updateTreeRecordInput({ id, changes: { treeCount: 99 } }),
    ).toBeInstanceOf(type.errors);
    expect(
      updateTreeRecordInput({
        id,
        changes: { siteAssessment: { unexpected: "x" } },
      }),
    ).toBeInstanceOf(type.errors);

    const timestamp = "2026-11-23T15:00:00.000Z";
    const record = {
      ...minimalInput,
      id,
      addressKey: "a".repeat(64),
      treeNumber: 1,
      origin: "requested",
      responsibleMemberUid: null,
      photos: [],
      recordInformation: {
        createdAt: timestamp,
        createdBy: "volunteer",
        lastEditedAt: timestamp,
        lastEditedBy: "admin",
      },
    };
    expect(treeDocument.assert(record)).toMatchObject({
      id,
      status: "requested",
    });
    expect(treeDocument({ ...record, status: "possible" })).toBeInstanceOf(
      type.errors,
    );
    expect(treeDocument({ ...record, healthChecks: [] })).toBeInstanceOf(
      type.errors,
    );
  });
});
