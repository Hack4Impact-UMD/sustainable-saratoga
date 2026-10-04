import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UpdatePrompt } from "@frontend/components/UpdatePrompt.tsx";

const sw = vi.hoisted(() => ({
  needRefresh: false,
  setNeedRefresh: vi.fn<(value: boolean) => void>(),
  updateServiceWorker: vi.fn<() => Promise<void>>(() => Promise.resolve()),
}));

// Aliased to a stub in vitest.config.ts; the real module only exists inside
// the Vite build.
vi.mock("virtual:pwa-register/react", () => ({
  useRegisterSW: () => ({
    needRefresh: [sw.needRefresh, sw.setNeedRefresh],
    offlineReady: [false, vi.fn<(value: boolean) => void>()],
    updateServiceWorker: sw.updateServiceWorker,
  }),
}));

describe("UpdatePrompt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders nothing until an update is waiting", () => {
    sw.needRefresh = false;
    render(<UpdatePrompt />);

    expect(screen.queryByTestId("update-prompt")).not.toBeInTheDocument();
  });

  it("reloads only when the user accepts", () => {
    sw.needRefresh = true;
    render(<UpdatePrompt />);

    expect(sw.updateServiceWorker).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("update-reload"));
    expect(sw.updateServiceWorker).toHaveBeenCalledOnce();
  });

  it("can be dismissed", () => {
    sw.needRefresh = true;
    render(<UpdatePrompt />);

    fireEvent.click(screen.getByText("Later"));
    expect(sw.setNeedRefresh).toHaveBeenCalledWith(false);
  });
});
