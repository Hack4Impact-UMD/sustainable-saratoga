import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  PHOTO_PREVIEW_COUNT,
  RecordPhotos,
} from "@frontend/components/records/RecordPhotos.tsx";

afterEach(cleanup);

const photos = Array.from({ length: 6 }, (_, i) => ({
  src: `/sample-photos/p${i}.svg`,
  caption: `Photo ${i + 1}`,
  takenAt: "2026-01-01",
}));

describe("RecordPhotos", () => {
  it("shows a preview and expands to every photo", () => {
    render(<RecordPhotos photos={photos} />);

    expect(screen.getAllByRole("img")).toHaveLength(PHOTO_PREVIEW_COUNT);
    fireEvent.click(screen.getByRole("button", { name: /View all 6 photos/ }));

    expect(screen.getAllByRole("img")).toHaveLength(photos.length);
    expect(
      screen.queryByRole("button", { name: /View all 6 photos/ }),
    ).not.toBeInTheDocument();
  });

  it("hides the button when nothing is hidden", () => {
    render(<RecordPhotos photos={photos.slice(0, 2)} />);
    expect(
      screen.queryByRole("button", { name: /View all 6 photos/ }),
    ).not.toBeInTheDocument();
  });

  it("shows a placeholder with no photos", () => {
    render(<RecordPhotos photos={[]} />);
    expect(screen.getByText("Not recorded")).toBeInTheDocument();
  });
});
