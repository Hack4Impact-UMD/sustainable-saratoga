import { RouterProvider } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { router } from "@frontend/router.tsx";
import { useAuth } from "@frontend/lib/useAuth.ts";

/**
 * Reads the auth state from context and hands it to the router, so loaders and
 * `beforeLoad` guards see the signed-in user. Must render inside `AuthProvider`.
 */
export function App() {
  const auth = useAuth();
  const wasAuthed = useRef(auth.isAuthed);

  // Re-run the guards after sign-out so the current page can't stay on screen.
  // Runs here because the router only has the new auth state after this render.
  useEffect(() => {
    if (wasAuthed.current && !auth.isAuthed) void router.invalidate();
    wasAuthed.current = auth.isAuthed;
  }, [auth.isAuthed]);

  // Firebase restores a saved session asynchronously after a page load. Until
  // it has, guards would treat a signed-in user as signed out and redirect.
  if (auth.isPending) return null;

  return <RouterProvider router={router} context={{ auth }} />;
}
