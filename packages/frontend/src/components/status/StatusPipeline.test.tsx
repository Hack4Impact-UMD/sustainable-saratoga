import { recordPipelineState } from "@repo/common";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { StatusPipeline } from "@frontend/components/status/StatusPipeline.tsx";

afterEach(cleanup);

describe("StatusPipeline", () => {
  it.each([
    ["requested", "requested", ["Requested", "Approved", "Planted"]],
    ["possible", "possible", ["Possible", "Approved", "Planted"]],
  ] as const)("shows %s pipeline", (origin, status, labels) => {
    render(
      <StatusPipeline {...recordPipelineState.assert({ origin, status })} />,
    );

    const pipeline = screen.getByTestId("status-pipeline");
    expect(within(pipeline).getAllByRole("listitem")).toHaveLength(3);
    for (const label of labels) {
      expect(within(pipeline).getByText(label)).toBeInTheDocument();
    }
    for (const step of [origin, "approved", "planted"]) {
      expect(
        within(pipeline).getByRole("img", {
          name: `${step} status${step === status ? ", selected" : ""}`,
        }),
      ).toBeInTheDocument();
    }
    expect(
      within(pipeline).getByRole("listitem", { current: "step" }),
    ).toHaveAttribute("data-state", "current");
  });

  it.each([
    ["requested", "approved", ["complete", "current", "upcoming"]],
    ["possible", "approved", ["complete", "current", "upcoming"]],
    ["requested", "planted", ["complete", "complete", "current"]],
    ["possible", "planted", ["complete", "complete", "current"]],
  ] as const)("marks %s → %s step states", (origin, status, states) => {
    render(
      <StatusPipeline {...recordPipelineState.assert({ origin, status })} />,
    );

    expect(
      within(screen.getByTestId("status-pipeline"))
        .getAllByRole("listitem")
        .map((step) => step.getAttribute("data-state")),
    ).toEqual(states);
    expect(screen.getAllByRole("img")).toHaveLength(3);
    const current = screen.getByRole("listitem", { current: "step" });
    expect(
      within(current).getByRole("img", { name: `${status} status, selected` }),
    ).toBeInTheDocument();
    expect(
      within(current).getByText(status === "approved" ? "Approved" : "Planted"),
    ).toHaveClass("font-bold");
  });
  it.each([
    ["requested", "possible"],
    ["possible", "requested"],
  ])("rejects incompatible %s origin with %s status", (origin, status) => {
    const props = { origin, status } as unknown as Parameters<
      typeof StatusPipeline
    >[0];
    expect(() => render(<StatusPipeline {...props} />)).toThrow(
      /status must be/,
    );
  });
});
