import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MapLegend } from "@frontend/components/map/MapLegend.tsx";

afterEach(cleanup);

describe("MapLegend", () => {
  it("starts collapsed", () => {
    render(<MapLegend />);

    expect(
      screen.getByRole("button", { name: /^Legend$/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Legend" })).not.toBeInTheDocument();
  });

  it("expands to show every status", () => {
    render(<MapLegend />);

    fireEvent.click(screen.getByRole("button", { name: /^Legend$/ }));

    expect(screen.getByRole("heading", { name: "Legend" })).toBeInTheDocument();
    expect(screen.getByText("Requested")).toBeInTheDocument();
    expect(screen.getByText("Possible")).toBeInTheDocument();
    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(screen.getByText("Planted")).toBeInTheDocument();
  });

  it("collapses from the expanded view", () => {
    render(<MapLegend />);

    fireEvent.click(screen.getByRole("button", { name: /^Legend$/ }));
    fireEvent.click(screen.getByRole("button", { name: "Collapse legend" }));

    expect(
      screen.getByRole("button", { name: /^Legend$/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Legend" })).not.toBeInTheDocument();
  });
});
