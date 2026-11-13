import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useCurrentPosition } from "@frontend/lib/useCurrentPosition.ts";

const originalGeolocation = navigator.geolocation;

afterEach(() => {
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: originalGeolocation,
  });
});

describe("useCurrentPosition", () => {
  it("starts idle without a position", () => {
    const { result } = renderHook(() => useCurrentPosition());

    expect(result.current.status).toBe("idle");
    expect(result.current.position).toBeNull();
  });

  it("returns the current coordinates after a successful request", () => {
    const getCurrentPosition = vi.fn<
      typeof navigator.geolocation.getCurrentPosition
    >((success) => {
      success({
        coords: { latitude: 43.0831, longitude: -73.7846 },
      } as GeolocationPosition);
    });
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition },
    });

    const { result } = renderHook(() => useCurrentPosition());

    act(() => result.current.locate());

    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("success");
    expect(result.current.position).toEqual({
      lat: 43.0831,
      lng: -73.7846,
    });
  });

  it("reports denied permission without throwing", () => {
    const getCurrentPosition = vi.fn<
      typeof navigator.geolocation.getCurrentPosition
    >((_success, failure) => {
      failure?.({
        code: 1,
        message: "Permission denied",
      } as GeolocationPositionError);
    });
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition },
    });

    const { result } = renderHook(() => useCurrentPosition());

    act(() => result.current.locate());

    expect(result.current.status).toBe("denied");
    expect(result.current.position).toBeNull();
  });

  it("reports other geolocation failures as errors", () => {
    const getCurrentPosition = vi.fn<
      typeof navigator.geolocation.getCurrentPosition
    >((_success, failure) => {
      failure?.({
        code: 2,
        message: "Position unavailable",
      } as GeolocationPositionError);
    });
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition },
    });

    const { result } = renderHook(() => useCurrentPosition());

    act(() => result.current.locate());

    expect(result.current.status).toBe("error");
    expect(result.current.position).toBeNull();
  });

  it("reports an unsupported browser as an error", () => {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: undefined,
    });

    const { result } = renderHook(() => useCurrentPosition());

    act(() => result.current.locate());

    expect(result.current.status).toBe("error");
    expect(result.current.position).toBeNull();
  });

  it("reports synchronous geolocation failures as errors", () => {
    const getCurrentPosition = vi.fn<() => void>(() => {
      throw new Error("Geolocation unavailable");
    });
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition },
    });

    const { result } = renderHook(() => useCurrentPosition());

    act(() => result.current.locate());

    expect(result.current.status).toBe("error");
  });
});
