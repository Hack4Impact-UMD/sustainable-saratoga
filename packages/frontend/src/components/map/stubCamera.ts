import type {
  MapCamera,
  PanToCall,
} from "@frontend/components/map/useMapCamera.ts";

let lastPanTo: PanToCall | undefined;

export const stubCamera: MapCamera = {
  panTo: (pos, zoom) => {
    lastPanTo = { pos, zoom };
  },
};

export function lastStubPanTo(): PanToCall | undefined {
  return lastPanTo;
}

export function resetStubCamera() {
  lastPanTo = undefined;
}
