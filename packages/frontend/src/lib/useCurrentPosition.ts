import { useCallback, useRef, useState } from "react";

export type LocationStatus =
  | "idle"
  | "requesting"
  | "success"
  | "denied"
  | "error";

export interface CurrentPosition {
  lat: number;
  lng: number;
}

export interface UseCurrentPositionResult {
  locate: () => void;
  status: LocationStatus;
  position: CurrentPosition | null;
  accuracyMeters: number | null;
}

const PERMISSION_DENIED = 1;

export function useCurrentPosition(): UseCurrentPositionResult {
  const [status, setStatus] = useState<LocationStatus>("idle");
  const [position, setPosition] = useState<CurrentPosition | null>(null);
  const [accuracyMeters, setAccuracyMeters] = useState<number | null>(null);
  const requestId = useRef(0);

  const locate = useCallback(() => {
    const request = ++requestId.current;
    if (!navigator.geolocation) {
      setStatus("error");
      return;
    }

    setStatus("requesting");
    setAccuracyMeters(null);

    const uiTimeout = window.setTimeout(() => {
      if (requestId.current === request) setStatus("error");
    }, 15_000);
    const finish = (
      nextStatus: "success" | "denied" | "error",
      nextPosition?: CurrentPosition,
      nextAccuracyMeters?: number,
    ) => {
      if (requestId.current !== request) return;
      window.clearTimeout(uiTimeout);
      if (nextPosition !== undefined) {
        setPosition(nextPosition);
        setAccuracyMeters(nextAccuracyMeters ?? null);
      }
      setStatus(nextStatus);
    };

    try {
      // The browser Geolocation API exposes callbacks rather than a promise.
      // oxlint-disable promise/prefer-await-to-callbacks
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          finish(
            "success",
            { lat: coords.latitude, lng: coords.longitude },
            coords.accuracy,
          );
        },
        (error) => {
          finish(error.code === PERMISSION_DENIED ? "denied" : "error");
        },
        { timeout: 15_000 },
      );
    } catch {
      finish("error");
    }
  }, []);

  return { locate, status, position, accuracyMeters };
}
