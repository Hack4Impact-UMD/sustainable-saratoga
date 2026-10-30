import { useCallback, useState } from "react";

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
}

const PERMISSION_DENIED = 1;

export function useCurrentPosition(): UseCurrentPositionResult {
  const [status, setStatus] = useState<LocationStatus>("idle");
  const [position, setPosition] = useState<CurrentPosition | null>(null);

  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus("error");
      return;
    }

    setStatus("requesting");
    try {
      // The browser Geolocation API exposes callbacks rather than a promise.
      // oxlint-disable promise/prefer-await-to-callbacks
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          setPosition({ lat: coords.latitude, lng: coords.longitude });
          setStatus("success");
        },
        (error) => {
          setStatus(error.code === PERMISSION_DENIED ? "denied" : "error");
        },
      );
      // oxlint-enable promise/prefer-await-to-callbacks
    } catch {
      setStatus("error");
    }
  }, []);

  return { locate, status, position };
}
